import { describe, expect, it, vi } from "vitest";

// A valid 32-byte (64 hex char) AES key for tests
const TEST_KEY = "a".repeat(64);

vi.mock("$env/static/private", () => ({
  CECOTEC_ENCRYPTION_KEY: TEST_KEY,
}));

// Import after mock is set up
const { encrypt, decrypt } = await import("./crypto");

describe("encrypt / decrypt", () => {
  it("round-trips plaintext correctly", () => {
    const plaintext = "my-secret-password";
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("produces different ciphertexts for the same input (random IV)", () => {
    const a = encrypt("password");
    const b = encrypt("password");
    expect(a).not.toBe(b);
  });

  it("returns a colon-delimited hex string with three parts", () => {
    const parts = encrypt("test").split(":");
    expect(parts).toHaveLength(3);
    // iv (12 bytes = 24 hex chars), authTag (16 bytes = 32 hex chars), ciphertext
    expect(parts[0]).toHaveLength(24);
    expect(parts[1]).toHaveLength(32);
  });

  it("round-trips unicode characters", () => {
    const plaintext = "contraseña_üñícödé";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("throws when ciphertext is tampered with", () => {
    const ct = encrypt("secret");
    const tampered = `${ct.slice(0, -4)}ffff`;
    expect(() => decrypt(tampered)).toThrow();
  });
});
