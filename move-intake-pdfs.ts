import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const SOURCE = "soap-notes-pdfs";
const DEST = "intake-form-pdfs";

async function moveIntakePdfs() {
  const { data: files, error } = await supabase.storage
    .from(SOURCE)
    .list("", { limit: 200 });
  if (error) {
    console.error("List error:", error);
    return;
  }

  const intakeFiles = (files || []).filter((f) => f.name.startsWith("Intake_"));
  if (intakeFiles.length === 0) {
    console.log("No intake PDFs found.");
    return;
  }

  console.log(`Moving ${intakeFiles.length} intake PDF(s)...\n`);

  for (const file of intakeFiles) {
    // Download from source bucket
    const { data: blob, error: dlErr } = await supabase.storage
      .from(SOURCE)
      .download(file.name);
    if (dlErr || !blob) {
      console.error(`  ✗ Download ${file.name}:`, dlErr);
      continue;
    }

    const buffer = Buffer.from(await blob.arrayBuffer());

    // Upload to destination bucket
    const { error: upErr } = await supabase.storage
      .from(DEST)
      .upload(file.name, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) {
      console.error(`  ✗ Upload ${file.name}:`, upErr);
      continue;
    }

    // Delete from source bucket
    const { error: delErr } = await supabase.storage
      .from(SOURCE)
      .remove([file.name]);
    if (delErr) {
      console.error(`  ✗ Delete ${file.name}:`, delErr);
      continue;
    }

    console.log(`  ✓ ${file.name}`);
  }

  console.log("\nDone.");
}

moveIntakePdfs();
