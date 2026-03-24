import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Encryption utilities for sensitive data at rest
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ENCRYPTION_PREFIX = "enc:v1:";
const MIN_ENCRYPTED_LENGTH = SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1;

export type StoredSecretReadResult =
  | {
      kind: "plaintext";
      value: string;
      storage: "plaintext";
    }
  | {
      kind: "decrypted";
      value: string;
      storage: "prefixed" | "legacy";
    }
  | {
      kind: "invalid-encrypted";
      value: null;
      storage: "prefixed" | "legacy";
    };

/**
 * Derive encryption key from password/secret using scrypt
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Get encryption secret from environment or exit in production
 */
function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "CRITICAL: ENCRYPTION_SECRET environment variable required in production!",
      );
      process.exit(1);
    }
    console.warn(
      "WARNING: No ENCRYPTION_SECRET set. Using fallback - tokens will not be portable across restarts!",
    );
    // Use a deterministic fallback based on data directory for development only
    return `fallback-dev-secret-${process.env.DATA_DIR || "default"}`;
  }
  return secret;
}

function decodeBase64Strict(value: string): Buffer | null {
  if (!value || value.length % 4 !== 0) {
    return null;
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64");
    if (decoded.toString("base64") !== value) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function parseEncryptedPayload(
  value: string,
): { combined: Buffer; storage: "prefixed" | "legacy" } | null {
  if (!value) {
    return null;
  }

  const storage = value.startsWith(ENCRYPTION_PREFIX) ? "prefixed" : "legacy";
  const encoded =
    storage === "prefixed" ? value.slice(ENCRYPTION_PREFIX.length) : value;
  const combined = decodeBase64Strict(encoded);

  if (!combined || combined.length < MIN_ENCRYPTED_LENGTH) {
    return null;
  }

  return { combined, storage };
}

function decryptCombinedPayload(combined: Buffer): string {
  const secret = getEncryptionSecret();

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const ciphertext = combined.subarray(
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );

  const key = deriveKey(secret, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Encrypt a string value
 * Returns base64-encoded string: salt:iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";

  const secret = getEncryptionSecret();
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine: salt + iv + authTag + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return `${ENCRYPTION_PREFIX}${combined.toString("base64")}`;
}

/**
 * Decrypt a string value
 * Expects base64-encoded string from encrypt()
 */
export function decrypt(encryptedData: string): string | null {
  if (!encryptedData) return null;

  try {
    const payload = parseEncryptedPayload(encryptedData);
    if (!payload) {
      return null;
    }
    return decryptCombinedPayload(payload.combined);
  } catch {
    return null;
  }
}

export function readStoredSecret(value: string): StoredSecretReadResult {
  if (!value) {
    return { kind: "plaintext", value: "", storage: "plaintext" };
  }

  const payload = parseEncryptedPayload(value);
  if (!payload) {
    return { kind: "plaintext", value, storage: "plaintext" };
  }

  try {
    return {
      kind: "decrypted",
      value: decryptCombinedPayload(payload.combined),
      storage: payload.storage,
    };
  } catch {
    return {
      kind: "invalid-encrypted",
      value: null,
      storage: payload.storage,
    };
  }
}

/**
 * Check if a value appears to be encrypted (base64 with correct length)
 */
export function isEncrypted(value: string): boolean {
  return parseEncryptedPayload(value) !== null;
}

/**
 * Encrypt if not already encrypted, otherwise return as-is
 */
export function ensureEncrypted(value: string): string {
  if (!value) return "";
  if (isEncrypted(value)) return value;
  return encrypt(value);
}

/**
 * Safely decrypt - returns original value if decryption fails
 * (handles migration from unencrypted to encrypted)
 */
export function safeDecrypt(value: string): string {
  if (!value) return "";

  const result = readStoredSecret(value);
  if (result.kind === "decrypted") {
    return result.value;
  }

  return result.kind === "plaintext" ? result.value : value;
}
