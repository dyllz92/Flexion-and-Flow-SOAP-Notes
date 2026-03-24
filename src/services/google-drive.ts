import type { DriveUploadResult } from "../types/index.js";

export interface DriveFileEntry {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

/** Default timeout for Google API calls (30 seconds) */
const API_TIMEOUT_MS = 30000;

/**
 * Fetch with timeout wrapper for Google API calls
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * List files in a Google Drive folder
 */
export async function listDriveFiles(
  accessToken: string,
  folderId: string,
  mimeFilter?: string,
): Promise<DriveFileEntry[]> {
  const files: DriveFileEntry[] = [];
  let pageToken: string | undefined;
  const q = mimeFilter
    ? `'${folderId}' in parents and mimeType='${mimeFilter}' and trashed=false`
    : `'${folderId}' in parents and trashed=false`;

  do {
    const params = new URLSearchParams({
      q,
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink)",
      pageSize: "100",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);

    try {
      const res = await fetchWithTimeout(
        `https://www.googleapis.com/drive/v3/files?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) {
        console.error("Drive list error:", await res.text());
        break;
      }
      const data: any = await res.json();
      files.push(...(data.files || []));
      pageToken = data.nextPageToken;
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error("Drive list timeout");
      } else {
        console.error("Drive list error:", error);
      }
      break;
    }
  } while (pageToken);

  return files;
}

/**
 * Download file content as Buffer from Google Drive
 */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string,
): Promise<Buffer | null> {
  try {
    // Longer timeout for downloads (60 seconds)
    const res = await fetchWithTimeout(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      60000
    );
    if (!res.ok) {
      console.error("Drive download error:", await res.text());
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("Drive download timeout");
    } else {
      console.error("Drive download error:", error);
    }
    return null;
  }
}

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

    // Longer timeout for uploads (60 seconds)
    const res = await fetchWithTimeout(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
      60000
    );
    if (!res.ok) {
      console.error("Drive upload error:", await res.text());
      return null;
    }
    return (await res.json()) as DriveUploadResult;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("Drive upload timeout");
    } else {
      console.error("Failed to upload to Google Drive:", error);
    }
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
    const res = await fetchWithTimeout(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      },
      15000 // 15 second timeout for token refresh
    );
    if (!res.ok) {
      console.error("Token refresh error:", await res.text());
      return null;
    }
    const data: any = await res.json();
    return data.access_token || null;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("Token refresh timeout");
    } else {
      console.error("Failed to refresh Google token:", error);
    }
    return null;
  }
}
