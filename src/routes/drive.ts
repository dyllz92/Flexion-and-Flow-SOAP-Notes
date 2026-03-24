import { Hono } from "hono";
import type {
  SessionRecord,
  DriveUploadResult,
  ClientRecord,
} from "../types/index.js";
import {
  ENV,
  kv,
  getClient,
  saveClient,
  saveSession,
  db,
} from "../database/index.js";
import { createHmac } from "node:crypto";
import { secureCompare } from "../middleware/auth.js";
import {
  refreshGoogleToken,
  listDriveFiles,
  downloadDriveFile,
} from "../services/google-drive.js";
import {
  uploadPdfToSupabase,
  listSupabasePdfs,
  getSupabasePdfUrl,
} from "../services/supabase-storage.js";
import { PDFParse } from "pdf-parse";
import fs from "node:fs";
import path from "node:path";

const drive = new Hono();

function isSupabaseBackupConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function driveSyncDisabledResponse(c: any) {
  return c.json(
    {
      error: "Google Drive sync is disabled",
      enabled: false,
      connected: false,
    },
    503,
  );
}

function ensureDriveSyncEnabled(c: any): Response | null {
  if (!ENV.GOOGLE_DRIVE_SYNC_ENABLED) {
    return driveSyncDisabledResponse(c);
  }

  return null;
}

/**
 * GET /api/drive/auth — Start Google Drive OAuth flow
 */
drive.get("/auth", (c) => {
  const disabledResponse = ensureDriveSyncEnabled(c);
  if (disabledResponse) {
    return disabledResponse;
  }

  const clientId = ENV.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: "Google OAuth not configured" }, 500);
  }

  const acct = c.req.query("account") || "";
  const origin = new URL(c.req.url).origin;
  const redirectUri = ENV.GOOGLE_REDIRECT_URI || `${origin}/api/drive/callback`;
  const stateData = Buffer.from(
    JSON.stringify({ account: acct, origin }),
  ).toString("base64");
  const stateSignature = createHmac("sha256", ENV.SESSION_SECRET)
    .update(stateData)
    .digest("hex");
  const state = `${stateData}.${stateSignature}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

/**
 * GET /api/drive/callback — OAuth callback handler
 */
drive.get("/callback", async (c) => {
  const disabledResponse = ensureDriveSyncEnabled(c);
  if (disabledResponse) {
    return disabledResponse;
  }

  const code = c.req.query("code");
  const stateRaw = c.req.query("state");

  if (!code) {
    return c.html("<p>Error: no code returned from Google.</p>", 400);
  }

  let accountNumber = "";
  let origin = "";

  try {
    const [stateData, stateSignature] = (stateRaw || "").split(".");
    if (!stateData || !stateSignature) {
      return c.html("<p>Error: invalid OAuth state.</p>", 400);
    }
    const expectedSig = createHmac("sha256", ENV.SESSION_SECRET)
      .update(stateData)
      .digest("hex");
    if (!secureCompare(stateSignature, expectedSig)) {
      return c.html("<p>Error: OAuth state signature mismatch.</p>", 400);
    }
    const parsed = JSON.parse(Buffer.from(stateData, "base64").toString());
    accountNumber = parsed.account || "";
    origin = parsed.origin || "";
  } catch (error) {
    console.error("Failed to parse OAuth state:", error);
    return c.html("<p>Error: invalid OAuth state.</p>", 400);
  }

  const redirectUri =
    ENV.GOOGLE_REDIRECT_URI ||
    `${new URL(c.req.url).origin}/api/drive/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: ENV.GOOGLE_CLIENT_ID,
        client_secret: ENV.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Token exchange error:", errorText);
      return c.html("<p>Error exchanging code. Please try again.</p>", 400);
    }

    const tokens: any = await tokenRes.json();
    const refreshToken = tokens.refresh_token;

    // Store refresh token for specific client if account number provided
    if (accountNumber && refreshToken) {
      const client = getClient(accountNumber);
      if (client) {
        client.driveToken = refreshToken;
        client.updatedAt = new Date().toISOString();
        saveClient(client);
      }
    }

    // Also store global refresh token
    if (refreshToken) {
      kv.put("global_drive_refresh_token", refreshToken);
    }

    const safeAccount = JSON.stringify(accountNumber);
    if (!origin) {
      return c.html("<p>Error: missing origin in OAuth state.</p>", 400);
    }
    const safeOrigin = JSON.stringify(origin);
    return c.html(`<!DOCTYPE html><html><body>
      <p style="font-family:sans-serif;padding:20px;">✅ Google Drive connected! You can close this tab.</p>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'DRIVE_AUTH_SUCCESS', account: ${safeAccount} }, ${safeOrigin});
          setTimeout(() => window.close(), 1500);
        }
      </script>
    </body></html>`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return c.html("<p>Error completing OAuth flow. Please try again.</p>", 500);
  }
});

/**
 * Helper: upload base64-encoded PDF to Drive
 */
async function uploadBase64PDFToDrive(
  accessToken: string,
  folderId: string,
  filename: string,
  base64: string,
): Promise<DriveUploadResult | null> {
  try {
    const bytes = Buffer.from(base64, "base64");
    const metadata = JSON.stringify({
      name: filename,
      mimeType: "application/pdf",
      parents: folderId ? [folderId] : [],
    });

    const boundary = "ff_boundary_xyz";
    const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
    const filePart = `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`;
    const endPart = `\r\n--${boundary}--`;

    const combined = Buffer.concat([
      Buffer.from(metaPart),
      Buffer.from(filePart),
      bytes,
      Buffer.from(endPart),
    ]);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: combined,
      },
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Drive upload failed:", errorText);
      return null;
    }

    return (await res.json()) as DriveUploadResult;
  } catch (error) {
    console.error("Drive upload error:", error);
    return null;
  }
}

/**
 * POST /api/drive/upload-pdf — Upload PDF to Google Drive
 */
drive.post("/upload-pdf", async (c) => {
  try {
    const body = (await c.req.json()) as {
      sessionId: string;
      accountNumber: string;
      filename: string;
      pdfBase64: string;
    };

    const pdfBuffer = Buffer.from(body.pdfBase64, "base64");
    let supabaseUrl: string | null = null;
    let driveResult: DriveUploadResult | null = null;

    if (isSupabaseBackupConfigured()) {
      supabaseUrl = await uploadPdfToSupabase(body.filename, pdfBuffer);
      if (supabaseUrl) {
        console.log("Supabase PDF uploaded:", supabaseUrl);
      }
    }

    if (ENV.GOOGLE_DRIVE_SYNC_ENABLED) {
      const refreshToken = kv.get("global_drive_refresh_token");
      if (!refreshToken) {
        if (supabaseUrl) {
          return c.json({
            success: true,
            backupOnly: true,
            driveEnabled: true,
            supabaseUrl,
          });
        }
        return c.json({ error: "Google Drive not connected." }, 400);
      }

      const accessToken = await refreshGoogleToken(
        refreshToken,
        ENV.GOOGLE_CLIENT_ID,
        ENV.GOOGLE_CLIENT_SECRET,
      );

      if (!accessToken) {
        if (supabaseUrl) {
          return c.json({
            success: true,
            backupOnly: true,
            driveEnabled: true,
            supabaseUrl,
          });
        }
        return c.json({ error: "Could not refresh Google token" }, 400);
      }

      driveResult = await uploadBase64PDFToDrive(
        accessToken,
        ENV.GOOGLE_DRIVE_FOLDER_ID,
        body.filename,
        body.pdfBase64,
      );

      if (!driveResult && !supabaseUrl) {
        return c.json({ error: "Drive upload failed" }, 500);
      }
    }

    if (!ENV.GOOGLE_DRIVE_SYNC_ENABLED && !supabaseUrl) {
      return c.json({ error: "PDF backup is not configured" }, 503);
    }

    // Update session with drive link
    if (body.sessionId && driveResult) {
      const row = db
        .prepare("SELECT data FROM sessions WHERE session_id = ?")
        .get(body.sessionId) as { data: string } | undefined;

      if (row) {
        const session: SessionRecord = JSON.parse(row.data);
        session.pdfDriveFileId = driveResult.id;
        session.pdfDriveUrl = driveResult.webViewLink;
        saveSession(session);
      }
    }

    return c.json({
      success: true,
      backupOnly: !driveResult,
      driveEnabled: ENV.GOOGLE_DRIVE_SYNC_ENABLED,
      fileId: driveResult?.id || null,
      url: driveResult?.webViewLink || null,
      supabaseUrl,
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    return c.json({ error: "Failed to upload PDF" }, 500);
  }
});

/**
 * GET /api/drive/status — Check Google Drive connection status
 */
drive.get("/status", (c) => {
  if (!ENV.GOOGLE_DRIVE_SYNC_ENABLED) {
    return c.json({
      enabled: false,
      connected: false,
      backupEnabled: isSupabaseBackupConfigured(),
    });
  }

  const token = kv.get("global_drive_refresh_token");
  return c.json({
    enabled: true,
    connected: !!token,
    backupEnabled: isSupabaseBackupConfigured(),
  });
});

/**
 * GET /api/drive/files — List recent PDF files from the Drive folder
 */
drive.get("/files", async (c) => {
  const disabledResponse = ensureDriveSyncEnabled(c);
  if (disabledResponse) {
    return disabledResponse;
  }

  try {
    const refreshToken = kv.get("global_drive_refresh_token");
    if (!refreshToken) {
      return c.json({ error: "Google Drive not connected", files: [] }, 401);
    }
    const accessToken = await refreshGoogleToken(
      refreshToken,
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
    );
    if (!accessToken) {
      return c.json({ error: "Could not refresh token", files: [] }, 401);
    }
    const folderId = ENV.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      return c.json({ error: "No Drive folder configured", files: [] }, 400);
    }
    const allFiles = await listDriveFiles(
      accessToken,
      folderId,
      "application/pdf",
    );
    // Sort by most recently modified, return up to 20
    allFiles.sort(
      (a, b) =>
        new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime(),
    );
    const recent = allFiles.slice(0, 20);
    return c.json({ files: recent });
  } catch (error) {
    console.error("Drive files list error:", error);
    return c.json({ error: "Failed to list Drive files", files: [] }, 500);
  }
});

/**
 * GET /api/drive/extract-text/:fileId — Download a Drive PDF and return extracted text
 */
drive.get("/extract-text/:fileId", async (c) => {
  const disabledResponse = ensureDriveSyncEnabled(c);
  if (disabledResponse) {
    return disabledResponse;
  }

  try {
    const fileId = c.req.param("fileId");
    if (!fileId || fileId.includes("..")) {
      return c.json({ error: "Invalid file ID" }, 400);
    }
    const refreshToken = kv.get("global_drive_refresh_token");
    if (!refreshToken) {
      return c.json({ error: "Google Drive not connected" }, 401);
    }
    const accessToken = await refreshGoogleToken(
      refreshToken,
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
    );
    if (!accessToken) {
      return c.json({ error: "Could not refresh token" }, 401);
    }
    const buffer = await downloadDriveFile(accessToken, fileId);
    if (!buffer) {
      return c.json({ error: "Failed to download file" }, 500);
    }
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    await parser.destroy();
    return c.json({
      text: textResult.text,
      pageCount: textResult.pages.length,
    });
  } catch (error) {
    console.error("Drive extract-text error:", error);
    return c.json({ error: "Failed to extract text from PDF" }, 500);
  }
});

/**
 * POST /api/drive/sync-pdfs — Download PDFs from Drive, parse text, store as JSON
 */
drive.post("/sync-pdfs", async (c) => {
  const disabledResponse = ensureDriveSyncEnabled(c);
  if (disabledResponse) {
    return disabledResponse;
  }

  try {
    const refreshToken = kv.get("global_drive_refresh_token");
    if (!refreshToken) {
      return c.json({ error: "Google Drive not connected" }, 401);
    }

    const accessToken = await refreshGoogleToken(
      refreshToken,
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
    );
    if (!accessToken) {
      return c.json({ error: "Could not refresh Google token" }, 401);
    }

    const folderId = ENV.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      return c.json({ error: "No Drive folder configured" }, 400);
    }

    // List all PDFs in the folder
    const pdfFiles = await listDriveFiles(
      accessToken,
      folderId,
      "application/pdf",
    );
    if (pdfFiles.length === 0) {
      return c.json({
        success: true,
        message: "No PDF files found",
        synced: 0,
      });
    }

    // Prepare output directory
    const outDir = path.join(ENV.DATA_DIR, "drive-pdfs");
    fs.mkdirSync(outDir, { recursive: true });

    // Load all clients for matching
    const allClients: ClientRecord[] = db
      .prepare("SELECT data FROM clients")
      .all()
      .map((row: any) => JSON.parse(row.data));

    const results: Array<{
      fileId: string;
      fileName: string;
      matchedClient: string | null;
      jsonPath: string;
    }> = [];

    for (const file of pdfFiles) {
      try {
        const buffer = await downloadDriveFile(accessToken, file.id);
        if (!buffer) {
          throw new Error("Failed to download file");
        }
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const textResult = await parser.getText();
        await parser.destroy();

        const extractedData = {
          sourceFileId: file.id,
          sourceFileName: file.name,
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime,
          syncedAt: new Date().toISOString(),
          pageCount: textResult.pages.length,
          text: textResult.text,
          matchedAccountNumber: null as string | null,
          matchedClientName: null as string | null,
        };

        // Try to match to a client by account number or name in filename
        const fileNameLower = file.name.toLowerCase();
        for (const client of allClients) {
          if (fileNameLower.includes(client.accountNumber.toLowerCase())) {
            extractedData.matchedAccountNumber = client.accountNumber;
            extractedData.matchedClientName = `${client.firstName} ${client.lastName}`;
            break;
          }
          const fullName =
            `${client.firstName} ${client.lastName}`.toLowerCase();
          if (fullName.length > 2 && fileNameLower.includes(fullName)) {
            extractedData.matchedAccountNumber = client.accountNumber;
            extractedData.matchedClientName = `${client.firstName} ${client.lastName}`;
            break;
          }
        }

        // Write JSON file — sanitize filename
        const safeName = file.name
          .replace(/\.pdf$/i, "")
          .replace(/[^a-zA-Z0-9_\-]/g, "_");
        const jsonFileName = `${safeName}_${file.id.slice(0, 8)}.json`;
        const jsonPath = path.join(outDir, jsonFileName);
        fs.writeFileSync(jsonPath, JSON.stringify(extractedData, null, 2));

        results.push({
          fileId: file.id,
          fileName: file.name,
          matchedClient: extractedData.matchedClientName,
          jsonPath: jsonFileName,
        });
      } catch (fileErr) {
        console.error(`Failed to process PDF ${file.name}:`, fileErr);
        results.push({
          fileId: file.id,
          fileName: file.name,
          matchedClient: null,
          jsonPath: `ERROR: ${fileErr instanceof Error ? fileErr.message : "Unknown error"}`,
        });
      }
    }

    return c.json({
      success: true,
      synced: results.filter((r) => !r.jsonPath.startsWith("ERROR")).length,
      errors: results.filter((r) => r.jsonPath.startsWith("ERROR")).length,
      total: pdfFiles.length,
      results,
    });
  } catch (error) {
    console.error("Drive sync error:", error);
    return c.json({ error: "Failed to sync PDFs from Drive" }, 500);
  }
});

/**
 * GET /api/drive/synced-data — List all synced PDF JSON files
 */
drive.get("/synced-data", (c) => {
  const outDir = path.join(ENV.DATA_DIR, "drive-pdfs");
  if (!fs.existsSync(outDir)) {
    return c.json({ files: [] });
  }
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".json"));
  const data = files.map((f) => {
    const content = JSON.parse(fs.readFileSync(path.join(outDir, f), "utf-8"));
    return {
      fileName: f,
      sourceFileName: content.sourceFileName,
      matchedClient: content.matchedClientName,
      syncedAt: content.syncedAt,
      pageCount: content.pageCount,
    };
  });
  return c.json({ files: data });
});

/**
 * GET /api/drive/synced-data/:filename — Get specific synced PDF JSON
 */
drive.get("/synced-data/:filename", (c) => {
  const filename = c.req.param("filename");
  // Prevent path traversal
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return c.json({ error: "Invalid filename" }, 400);
  }
  const filePath = path.join(ENV.DATA_DIR, "drive-pdfs", filename);
  if (!fs.existsSync(filePath)) {
    return c.json({ error: "File not found" }, 404);
  }
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return c.json(content);
});

/**
 * GET /api/drive/supabase-files — List PDFs stored in Supabase Storage
 */
drive.get("/supabase-files", async (c) => {
  try {
    const files = await listSupabasePdfs();
    return c.json({ files });
  } catch (error) {
    console.error("Supabase files list error:", error);
    return c.json({ error: "Failed to list Supabase files", files: [] }, 500);
  }
});

/**
 * GET /api/drive/supabase-file-url/:filename — Get a signed URL for a Supabase PDF
 */
drive.get("/supabase-file-url/:filename", async (c) => {
  const filename = c.req.param("filename");
  if (
    !filename ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return c.json({ error: "Invalid filename" }, 400);
  }
  try {
    const url = await getSupabasePdfUrl(filename);
    if (!url)
      return c.json(
        { error: "File not found or Supabase not configured" },
        404,
      );
    return c.json({ url });
  } catch (error) {
    console.error("Supabase file URL error:", error);
    return c.json({ error: "Failed to get file URL" }, 500);
  }
});

export default drive;
