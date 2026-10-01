import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Шифрование секретов интеграций (AES-256-GCM).
 * Формат: v1.<iv>.<authTag>.<ciphertext> (base64url).
 */
const VERSION = "v1";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptJson(value: unknown, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptJson<T = unknown>(payload: string, secret: string): T {
  const [version, iv, tag, ciphertext] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error("Неизвестный формат зашифрованных данных");
  }
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

/** Показываем только хвост секрета: sk-ant-…a1b2 */
export function maskSecret(value: string): string {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
