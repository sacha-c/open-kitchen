import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — set up before importing the module under test
// ---------------------------------------------------------------------------

const mockAuthenticate = vi.fn();
const mockListCatalogCategories = vi.fn();
const mockListPublicCatalog = vi.fn();
const mockDecrypt = vi.fn((_ciphertext: string): string => "decrypted-pass");
const mockSelect = vi.fn();
const mockGetLocale = vi.fn((): string => "en");

vi.mock("$env/static/private", () => ({
  CECOTEC_ENCRYPTION_KEY: "a".repeat(64),
  DATABASE_URL: "postgres://localhost/test",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:5173",
}));

vi.mock("$lib/paraglide/runtime", () => ({
  getLocale: () => mockGetLocale(),
}));

vi.mock("$lib/server/cecotec/client", () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
  listCatalogCategories: (...args: unknown[]) =>
    mockListCatalogCategories(...args),
  listPublicCatalog: (...args: unknown[]) => mockListPublicCatalog(...args),
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLocals(userId = "user-123") {
  return {
    session: { id: "sess-1" },
    user: { id: userId, name: "Test User", email: "test@example.com" },
  };
}

const { load } = await import("./+page.server");

// ---------------------------------------------------------------------------
// load
// ---------------------------------------------------------------------------

describe("load", () => {
  beforeEach(() => {
    mockAuthenticate.mockReset();
    mockListCatalogCategories.mockReset();
    mockListPublicCatalog.mockReset();
    mockDecrypt.mockClear();
    mockSelect.mockReset();
    mockGetLocale.mockReturnValue("en");
  });

  it("redirects unauthenticated users", async () => {
    const locals = { session: null, user: null };
    await expect(
      load({
        locals,
        url: new URL("http://localhost/recipes/cecotec"),
      } as never),
    ).rejects.toMatchObject({ status: 303, location: "/" });
  });

  it("returns an empty state when no Cecotec credentials are linked", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const result = (await load({
      locals: makeLocals(),
      url: new URL("http://localhost/recipes/cecotec"),
    } as never)) as Record<string, unknown>;

    expect(result.linked).toBe(false);
    expect(result.recipes).toEqual([]);
    expect(result.categories).toEqual([]);
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it("fetches categories and catalog when credentials are linked", async () => {
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
    mockListCatalogCategories.mockResolvedValue([
      { id: "1", recipeCategoryName: "Soups" },
    ]);
    mockListPublicCatalog.mockResolvedValue({
      records: [
        {
          id: "100",
          number: "42",
          defaultName: "Tomato Soup",
          landscapeImageUrl: "https://x/soup.jpg",
          cookingTime: 900,
          views: 10,
          starAvg: "4.5",
        },
      ],
      total: 1,
      pages: 1,
      size: 20,
      current: 1,
    });

    const result = (await load({
      locals: makeLocals(),
      url: new URL("http://localhost/recipes/cecotec"),
    } as never)) as Record<string, unknown>;

    expect(result.linked).toBe(true);
    expect(result.error).toBeNull();
    expect(mockDecrypt).toHaveBeenCalledWith("iv:tag:enc");
    expect(result.categories).toEqual([{ id: "1", name: "Soups" }]);
    expect(result.recipes).toMatchObject([{ name: "Tomato Soup" }]);
    expect(result.totalPages).toBe(1);
  });

  it("maps the ca locale to es when calling the catalog endpoints", async () => {
    mockGetLocale.mockReturnValue("ca");
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
    mockListCatalogCategories.mockResolvedValue([]);
    mockListPublicCatalog.mockResolvedValue({
      records: [],
      total: 0,
      pages: 0,
      size: 20,
      current: 1,
    });

    await load({
      locals: makeLocals(),
      url: new URL("http://localhost/recipes/cecotec"),
    } as never);

    expect(mockListCatalogCategories).toHaveBeenCalledWith("tok", "es");
    expect(mockListPublicCatalog).toHaveBeenCalledWith(
      "tok",
      expect.objectContaining({ code: "es" }),
    );
  });

  it("returns a page-level error instead of crashing on a Cecotec API error", async () => {
    const { CecotecError } = await import("$lib/server/cecotec/client");
    mockSelect.mockReturnValue(
      buildSelectChain([
        { email: "cec@example.com", encryptedPassword: "iv:tag:enc" },
      ]),
    );
    mockAuthenticate.mockRejectedValue(new CecotecError("Session expired"));

    const result = (await load({
      locals: makeLocals(),
      url: new URL("http://localhost/recipes/cecotec"),
    } as never)) as Record<string, unknown>;

    expect(result.linked).toBe(true);
    expect(result.error).toBe("Session expired");
    expect(result.recipes).toEqual([]);
  });

  it("passes the category and page query params through to the catalog call", async () => {
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
    mockListCatalogCategories.mockResolvedValue([]);
    mockListPublicCatalog.mockResolvedValue({
      records: [],
      total: 0,
      pages: 3,
      size: 20,
      current: 2,
    });

    await load({
      locals: makeLocals(),
      url: new URL("http://localhost/recipes/cecotec?category=cat-1&page=2"),
    } as never);

    expect(mockListPublicCatalog).toHaveBeenCalledWith(
      "tok",
      expect.objectContaining({ categoryId: "cat-1", currentPageNo: 2 }),
    );
  });
});
