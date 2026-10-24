import { describe, it, expect } from "vitest";
import {
  generatePairingCode,
  generateExtensionToken,
  hashSha256,
} from "@/lib/extension/crypto";

describe("Extension Security & Crypto", () => {
  it("generates 6-character uppercase unambiguous pairing codes", () => {
    const code = generatePairingCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);

    // Verify randomness: 100 codes generated should not have duplicates
    const set = new Set();
    for (let i = 0; i < 100; i++) {
      set.add(generatePairingCode());
    }
    expect(set.size).toBe(100);
  });

  it("produces deterministic SHA-256 hashes", () => {
    const hash1 = hashSha256("test-code-123");
    const hash2 = hashSha256("test-code-123");
    const diff = hashSha256("test-code-124");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(diff);
    expect(hash1).toHaveLength(64);
  });

  it("generates unique extension tokens with ff_ext_ prefix", () => {
    const token = generateExtensionToken();
    expect(token.startsWith("ff_ext_")).toBe(true);
    expect(token.length).toBeGreaterThan(60);

    const token2 = generateExtensionToken();
    expect(token).not.toBe(token2);
  });
});
