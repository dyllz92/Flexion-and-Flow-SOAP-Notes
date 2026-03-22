import { createClient } from "@supabase/supabase-js";

const BUCKET = "soap-notes-pdfs";

// Initialize Supabase client (lazy — only when env vars are set)
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Upload a PDF buffer to Supabase Storage and return the public URL.
 */
export async function uploadPdfToSupabase(
  filePath: string,
  pdfBuffer: Buffer,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn("Supabase not configured — skipping PDF upload");
    return null;
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);
  return publicUrlData?.publicUrl || null;
}

/**
 * List all PDF files in the Supabase Storage bucket.
 */
export async function listSupabasePdfs(): Promise<
  Array<{ name: string; url: string; createdAt: string }>
> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.storage.from(BUCKET).list("", {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    console.error("Supabase list error:", error);
    return [];
  }

  return (data || [])
    .filter((f) => f.name.endsWith(".pdf"))
    .map((f) => {
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(f.name);
      return {
        name: f.name,
        url: urlData?.publicUrl || "",
        createdAt: f.created_at || "",
      };
    });
}

/**
 * Get a signed URL for a private PDF (valid for 1 hour).
 */
export async function getSupabasePdfUrl(
  filePath: string,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600);

  if (error) {
    console.error("Supabase signed URL error:", error);
    return null;
  }

  return data?.signedUrl || null;
}
