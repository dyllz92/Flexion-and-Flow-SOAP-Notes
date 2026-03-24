import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Encryption utilities for sensitive data at rest
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * Derive encryption key from password/secret using scrypt
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Get encryption secret from environment or generate a warning
 */
function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    console.warn(
      "WARNING: No ENCRYPTION_SECRET set. Using fallback - tokens will not be portable across restarts!"
    );
    // Use a deterministic fallback based on data directory for development
    return `fallback-dev-secret-${process.env.DATA_DIR || "default"}`;
  }
  return secret;
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
  return combined.toString("base64");
}

/**
 * Decrypt a string value
 * Expects base64-encoded string from encrypt()
 */
export function decrypt(encryptedData: string): string | null {
  if (!encryptedData) return null;
  
  try {
    const secret = getEncryptionSecret();
    const combined = Buffer.from(encryptedData, "base64");
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    const key = deriveKey(secret, salt);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}

/**
 * Check if a value appears to be encrypted (base64 with correct length)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  try {
    const decoded = Buffer.from(value, "base64");
    // Minimum length: salt + iv + authTag + at least 1 byte of data
    return decoded.length > SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
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
  
  // Try to decrypt
  const decrypted = decrypt(value);
  if (decrypted !== null) {
    return decrypted;
  }
  
  // If decryption failed, assume it's not encrypted (legacy data)
  return value;
}
