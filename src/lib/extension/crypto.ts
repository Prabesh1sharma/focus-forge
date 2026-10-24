import crypto from "crypto";

/**
 * Computes SHA-256 hex digest of a string.
 */
export function hashSha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Characters for pairing code — excluding visually ambiguous characters (0, O, 1, I, L).
 */
const PAIRING_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Generates an uppercase 6-character single-use pairing code.
 */
export function generatePairingCode(): string {
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += PAIRING_CHARS[bytes[i] % PAIRING_CHARS.length];
  }
  return code;
}

/**
 * Generates a scoped revocable extension credential.
 * Format: ff_ext_<64-character-hex>
 */
export function generateExtensionToken(): string {
  return `ff_ext_${crypto.randomBytes(32).toString("hex")}`;
}
