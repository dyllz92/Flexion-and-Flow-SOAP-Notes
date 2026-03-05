import { Hono } from "hono";
import type { SessionRecord, DriveUploadResult } from "../types/index.js";
import {
  ENV,
  kv,
  getClient,
  saveClient,
  saveSession,
  db,
} from "../database/index.js";
import { refreshGoogleToken } from "../services/google-drive.js";

const drive = new Hono();

/**
 * GET /api/drive/auth — Start Google Drive OAuth flow
 */
drive.get("/auth", (c) => {
  const clientId = ENV.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: "Google OAuth not configured" }, 500);
  }

  const acct = c.req.query("account") || "";
  const origin = new URL(c.req.url).origin;
  const redirectUri = ENV.GOOGLE_REDIRECT_URI || `${origin}/api/drive/callback`;
  const state = Buffer.from(JSON.stringify({ account: acct, origin })).toString(
    "base64",
  );

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
  const code = c.req.query("code");
  const stateRaw = c.req.query("state");

  if (!code) {
    return c.html("<p>Error: no code returned from Google.</p>", 400);
  }

  let accountNumber = "";
  let origin = "";

  try {
    const parsed = JSON.parse(Buffer.from(stateRaw || "", "base64").toString());
    accountNumber = parsed.account || "";
    origin = parsed.origin || "";
  } catch (error) {
    console.error("Failed to parse OAuth state:", error);
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

    return c.html(`<!DOCTYPE html><html><body>
      <p style="font-family:sans-serif;padding:20px;">✅ Google Drive connected! You can close this tab.</p>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'DRIVE_AUTH_SUCCESS', account: '${accountNumber}' }, '${origin}');
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
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
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

    const refreshToken = kv.get("global_drive_refresh_token");
    if (!refreshToken) {
      return c.json({ error: "Google Drive not connected." }, 400);
    }

    const accessToken = await refreshGoogleToken(
      refreshToken,
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
    );

    if (!accessToken) {
      return c.json({ error: "Could not refresh Google token" }, 400);
    }

    const result = await uploadBase64PDFToDrive(
      accessToken,
      ENV.GOOGLE_DRIVE_FOLDER_ID,
      body.filename,
      body.pdfBase64,
    );

    if (!result) {
      return c.json({ error: "Drive upload failed" }, 500);
    }

    // Update session with drive link
    if (body.sessionId) {
      const row = db
        .prepare("SELECT data FROM sessions WHERE session_id = ?")
        .get(body.sessionId) as { data: string } | undefined;

      if (row) {
        const session: SessionRecord = JSON.parse(row.data);
        session.pdfDriveFileId = result.id;
        session.pdfDriveUrl = result.webViewLink;
        saveSession(session);
      }
    }

    return c.json({
      success: true,
      fileId: result.id,
      url: result.webViewLink,
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
  const token = kv.get("global_drive_refresh_token");
  return c.json({ connected: !!token });
});

export default drive;
