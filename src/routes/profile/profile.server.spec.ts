import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — set up before importing the module under test
// ---------------------------------------------------------------------------

const mockAuthenticate = vi.fn();
const mockEncrypt = vi.fn(
  (_plaintext: string): string => "encrypted:password:value",
);
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

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
  encrypt: (plaintext: string) => mockEncrypt(plaintext),
}));

// Drizzle mock: builds a minimal chainable that resolves with finalValue when awaited.
// Each method in the chain returns the next step; the terminal step returns a Promise.
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
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(data: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

function makeLocals(userId = "user-123") {
  return {
    session: { id: "sess-1" },
    user: { id: userId, name: "Test User", email: "test@example.com" },
  };
}

// Import after all mocks are registered
const { actions, load } = await import("./+page.server");

// ---------------------------------------------------------------------------
// load
// ---------------------------------------------------------------------------

describe("load", () => {
  it("redirects unauthenticated users", async () => {
    const locals = { session: null, user: null };
    await expect(
      load({
        locals,
        params: {},
        url: new URL("http://localhost/profile"),
      } as never),
    ).rejects.toMatchObject({ status: 303, location: "/" });
  });

  it("returns user info and no credentials when not linked", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const result = (await load({
      locals: makeLocals(),
      params: {},
      url: new URL("http://localhost/profile"),
    } as never)) as Record<string, unknown>;

    expect(result.user).toMatchObject({ name: "Test User" });
    expect(result.cecotecLinked).toBe(false);
    expect(result.cecotecEmail).toBeNull();
  });

  it("returns linked status when credentials exist", async () => {
    mockSelect.mockReturnValue(
      buildSelectChain([{ email: "cecotec@example.com" }]),
    );

    const result = (await load({
      locals: makeLocals(),
      params: {},
      url: new URL("http://localhost/profile"),
    } as never)) as Record<string, unknown>;

    expect(result.cecotecLinked).toBe(true);
    expect(result.cecotecEmail).toBe("cecotec@example.com");
  });
});

// ---------------------------------------------------------------------------
// actions.save
// ---------------------------------------------------------------------------

describe("actions.save", () => {
  beforeEach(() => {
    mockAuthenticate.mockReset();
    mockEncrypt.mockReset();
    mockInsert.mockReset();
    mockSelect.mockReset();
  });

  it("returns 400 when email is empty", async () => {
    const result = await actions.save({
      request: makeRequest({ email: "", password: "pass" }),
      locals: makeLocals(),
    } as never);

    expect(result).toMatchObject({ status: 400 });
    const data = result as { data: { errors: Record<string, string> } };
    expect(data.data.errors.email).toBeDefined();
  });

  it("returns 400 when email is invalid", async () => {
    const result = await actions.save({
      request: makeRequest({ email: "not-an-email", password: "pass" }),
      locals: makeLocals(),
    } as never);

    expect(result).toMatchObject({ status: 400 });
    const data = result as { data: { errors: Record<string, string> } };
    expect(data.data.errors.email).toBeDefined();
  });

  it("returns 400 when password is empty", async () => {
    const result = await actions.save({
      request: makeRequest({ email: "user@example.com", password: "" }),
      locals: makeLocals(),
    } as never);

    expect(result).toMatchObject({ status: 400 });
    const data = result as { data: { errors: Record<string, string> } };
    expect(data.data.errors.password).toBeDefined();
  });

  it("returns user-friendly error on invalid Cecotec credentials", async () => {
    const { CecotecError } = await import("$lib/server/cecotec/client");
    mockAuthenticate.mockRejectedValue(new CecotecError("Invalid credentials"));

    const result = await actions.save({
      request: makeRequest({ email: "u@example.com", password: "wrong" }),
      locals: makeLocals(),
    } as never);

    expect(result).toMatchObject({ status: 400 });
    const data = result as { data: { message: string } };
    expect(data.data.message).toContain("Invalid Cecotec credentials");
  });

  it("does NOT save credentials on Cecotec auth failure", async () => {
    const { CecotecError } = await import("$lib/server/cecotec/client");
    mockAuthenticate.mockRejectedValue(new CecotecError("Bad creds"));

    await actions.save({
      request: makeRequest({ email: "u@example.com", password: "wrong" }),
      locals: makeLocals(),
    } as never);

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("encrypts the password and upserts on success", async () => {
    mockAuthenticate.mockResolvedValue({
      accessToken: "tok",
      refreshToken: "ref",
      userId: "cec-uid",
    });
    mockEncrypt.mockReturnValue("iv:tag:enc");

    const insertChain = {
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    };
    mockInsert.mockReturnValue(insertChain);

    const result = await actions.save({
      request: makeRequest({ email: "u@example.com", password: "correct" }),
      locals: makeLocals(),
    } as never);

    expect(mockEncrypt).toHaveBeenCalledWith("correct");
    expect(mockInsert).toHaveBeenCalled();
    expect(result).toMatchObject({ success: true });
  });

  it("redirects unauthenticated users", async () => {
    await expect(
      actions.save({
        request: makeRequest({ email: "u@example.com", password: "p" }),
        locals: { session: null, user: null },
      } as never),
    ).rejects.toMatchObject({ status: 303 });
  });
});

// ---------------------------------------------------------------------------
// actions.disconnect
// ---------------------------------------------------------------------------

describe("actions.disconnect", () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it("deletes credentials and returns disconnected: true", async () => {
    const deleteChain = { where: vi.fn().mockResolvedValue(undefined) };
    mockDelete.mockReturnValue(deleteChain);

    const result = await actions.disconnect({ locals: makeLocals() } as never);

    expect(mockDelete).toHaveBeenCalled();
    expect(result).toMatchObject({ disconnected: true });
  });

  it("redirects unauthenticated users", async () => {
    await expect(
      actions.disconnect({ locals: { session: null, user: null } } as never),
    ).rejects.toMatchObject({ status: 303 });
  });
});
