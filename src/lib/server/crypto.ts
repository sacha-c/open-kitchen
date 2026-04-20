import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { CECOTEC_ENCRYPTION_KEY } from "$env/static/private";

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a colon-delimited string: `iv:authTag:ciphertext` (all hex-encoded).
 * The key must be a 64-character hex string (32 bytes).
 */
export function encrypt(plaintext: string): string {
  const key = Buffer.from(CECOTEC_ENCRYPTION_KEY, "hex");
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a ciphertext produced by `encrypt`.
 */
export function decrypt(ciphertext: string): string {
  const key = Buffer.from(CECOTEC_ENCRYPTION_KEY, "hex");
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf-8",
  );
}
