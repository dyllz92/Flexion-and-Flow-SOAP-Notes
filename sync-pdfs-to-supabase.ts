import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const BUCKET = "soap-notes-pdfs";
const PDF_FOLDER = path.join(import.meta.dirname, "pdfs");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncPdfs() {
  if (!fs.existsSync(PDF_FOLDER)) {
    console.error(`Folder not found: ${PDF_FOLDER}`);
    console.error('Create a "pdfs" folder in the project root and add your PDF files.');
    process.exit(1);
  }

  const files = fs.readdirSync(PDF_FOLDER).filter((f) => f.toLowerCase().endsWith(".pdf"));

  if (files.length === 0) {
    console.log("No PDF files found in pdfs/ folder.");
    return;
  }

  console.log(`Found ${files.length} PDF(s) to upload...\n`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(PDF_FOLDER, file);
    const buffer = fs.readFileSync(filePath);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(file, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      console.error(`  ✗ ${file} — ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ ${file}`);
      success++;
    }
  }

  console.log(`\nDone: ${success} uploaded, ${failed} failed.`);
}

syncPdfs();
