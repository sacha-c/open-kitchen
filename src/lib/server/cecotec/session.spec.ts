import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthenticate = vi.fn();
const mockDecrypt = vi.fn((_ciphertext: string): string => "decrypted-pass");
const mockSelect = vi.fn();

vi.mock("$env/static/private", () => ({
  CECOTEC_ENCRYPTION_KEY: "a".repeat(64),
  DATABASE_URL: "postgres://localhost/test",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:5173",
}));

vi.mock("$lib/server/cecotec/client", () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
  CecotecError: class CecotecError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CecotecError";
    }
  },
}));

vi.mock("$lib/server/crypto", () => ({
  decrypt: (ciphertext: string) => mockDecrypt(ciphertext),
}));

function buildSelectChain(finalValue: unknown) {
  return {
    from: () => ({
      where: () => Promise.resolve(finalValue),
    }),
  };
}

vi.mock("$lib/server/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

const { getAuthenticatedCecotecSession } = await import("./session");

describe("getAuthenticatedCecotecSession", () => {
  beforeEach(() => {
    mockAuthenticate.mockReset();
    mockDecrypt.mockClear();
    mockSelect.mockReset();
  });

  it("returns null when no credentials are linked", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const result = await getAuthenticatedCecotecSession("user-1");

    expect(result).toBeNull();
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it("decrypts the password and authenticates when credentials exist", async () => {
    mockSelect.mockReturnValue(
      buildSelectChain([
        { email: "cec@example.com", encryptedPassword: "iv:tag:enc" },
      ]),
    );
    mockAuthenticate.mockResolvedValue({
      accessToken: "tok",
      refreshToken: "ref",
      userId: "uid",
    });

    const result = await getAuthenticatedCecotecSession("user-1");

    expect(mockDecrypt).toHaveBeenCalledWith("iv:tag:enc");
    expect(mockAuthenticate).toHaveBeenCalledWith(
      "cec@example.com",
      "decrypted-pass",
    );
    expect(result).toEqual({ accessToken: "tok", email: "cec@example.com" });
  });

  it("propagates CecotecError from a failed authentication", async () => {
    const { CecotecError } = await import("$lib/server/cecotec/client");
    mockSelect.mockReturnValue(
      buildSelectChain([
        { email: "cec@example.com", encryptedPassword: "iv:tag:enc" },
      ]),
    );
    mockAuthenticate.mockRejectedValue(new CecotecError("Session expired"));

    await expect(
      getAuthenticatedCecotecSession("user-1"),
    ).rejects.toBeInstanceOf(CecotecError);
  });
});
