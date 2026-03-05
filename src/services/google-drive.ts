import type { DriveUploadResult } from "../types/index.js";

/**
 * Upload file to Google Drive
 */
export async function uploadToDrive(
  accessToken: string,
  folderId: string,
  filename: string,
  content: string,
  mimeType: string,
): Promise<DriveUploadResult | null> {
  try {
    const metadata = {
      name: filename,
      parents: folderId ? [folderId] : [],
    };
    const boundary = "-------boundary";
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n` +
      content +
      `\r\n--${boundary}--`;

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as DriveUploadResult;
  } catch (error) {
    console.error("Failed to upload to Google Drive:", error);
    return null;
  }
}

/**
 * Refresh Google access token using refresh token
 */
export async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data.access_token || null;
  } catch (error) {
    console.error("Failed to refresh Google token:", error);
    return null;
  }
}
