import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — set up before importing the module under test
// ---------------------------------------------------------------------------

const mockGetAuthenticatedCecotecSession = vi.fn();
const mockListCatalogCategories = vi.fn();
const mockListPublicCatalog = vi.fn();
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

vi.mock("$lib/server/cecotec/session", () => ({
  getAuthenticatedCecotecSession: (...args: unknown[]) =>
    mockGetAuthenticatedCecotecSession(...args),
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
    mockGetAuthenticatedCecotecSession.mockReset();
    mockListCatalogCategories.mockReset();
    mockListPublicCatalog.mockReset();
    mockSelect.mockReset();
    mockSelect.mockReturnValue(buildSelectChain([]));
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
    mockGetAuthenticatedCecotecSession.mockResolvedValue(null);

    const result = (await load({
      locals: makeLocals(),
      url: new URL("http://localhost/recipes/cecotec"),
    } as never)) as Record<string, unknown>;

    expect(result.linked).toBe(false);
    expect(result.recipes).toEqual([]);
    expect(result.categories).toEqual([]);
    expect(mockListPublicCatalog).not.toHaveBeenCalled();
  });

  it("fetches categories and catalog when credentials are linked", async () => {
    mockGetAuthenticatedCecotecSession.mockResolvedValue({
      accessToken: "tok",
      email: "cec@example.com",
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
    expect(result.categories).toEqual([{ id: "1", name: "Soups" }]);
    expect(result.recipes).toMatchObject([
      { name: "Tomato Soup", importedRecipeId: null },
    ]);
    expect(result.totalPages).toBe(1);
  });

  it("marks a recipe as already imported when a matching local recipe exists", async () => {
    mockGetAuthenticatedCecotecSession.mockResolvedValue({
      accessToken: "tok",
      email: "cec@example.com",
    });
    mockListCatalogCategories.mockResolvedValue([]);
    mockListPublicCatalog.mockResolvedValue({
      records: [
        {
          id: "100",
          number: "42",
          defaultName: "Tomato Soup",
          cookingTime: 900,
        },
        { id: "200", number: "43", defaultName: "Pasta", cookingTime: 600 },
      ],
      total: 2,
      pages: 1,
      size: 20,
      current: 1,
    });
    mockSelect.mockReturnValue(
      buildSelectChain([
        { id: "local-recipe-1", importedFromCecotecNumber: "42" },
      ]),
    );

    const result = (await load({
      locals: makeLocals(),
      url: new URL("http://localhost/recipes/cecotec"),
    } as never)) as Record<string, unknown>;

    expect(result.recipes).toMatchObject([
      { number: "42", importedRecipeId: "local-recipe-1" },
      { number: "43", importedRecipeId: null },
    ]);
  });

  it("keeps only the most-viewed entry among near-duplicate recipes (same name/image/cookingTime)", async () => {
    mockGetAuthenticatedCecotecSession.mockResolvedValue({
      accessToken: "tok",
      email: "cec@example.com",
    });
    mockListCatalogCategories.mockResolvedValue([]);
    mockListPublicCatalog.mockResolvedValue({
      records: [
        {
          id: "100",
          number: "42",
          defaultName: "Cheesecake donuts",
          landscapeImageUrl: "https://x/img.jpg",
          cookingTime: 60,
          views: 79,
          starAvg: 0,
        },
        {
          id: "200",
          number: "43",
          defaultName: "Cheesecake donuts",
          landscapeImageUrl: "https://x/img.jpg",
          cookingTime: 60,
          views: 823,
          starAvg: 4.75,
        },
        { id: "300", number: "44", defaultName: "Pasta", cookingTime: 600 },
      ],
      total: 3,
      pages: 1,
      size: 20,
      current: 1,
    });

    const result = (await load({
      locals: makeLocals(),
      url: new URL("http://localhost/recipes/cecotec"),
    } as never)) as Record<string, unknown>;

    expect(result.recipes).toHaveLength(2);
    expect(result.recipes).toMatchObject([
      { number: "43", views: 823 },
      { number: "44", name: "Pasta" },
    ]);
  });

  it("treats recipes with different names/images/cookingTime as distinct, not duplicates", async () => {
    mockGetAuthenticatedCecotecSession.mockResolvedValue({
      accessToken: "tok",
      email: "cec@example.com",
    });
    mockListCatalogCategories.mockResolvedValue([]);
    mockListPublicCatalog.mockResolvedValue({
      records: [
        {
          id: "100",
          number: "42",
          defaultName: "Summer cannelloni",
          landscapeImageUrl: "https://x/img.jpg",
          cookingTime: 1701,
          views: 815,
        },
        {
          id: "200",
          number: "43",
          defaultName: "Summer cannelloni",
          landscapeImageUrl: "https://x/img.jpg",
          cookingTime: 1750,
          views: 79,
        },
      ],
      total: 2,
      pages: 1,
      size: 20,
      current: 1,
    });

    const result = (await load({
      locals: makeLocals(),
      url: new URL("http://localhost/recipes/cecotec"),
    } as never)) as Record<string, unknown>;

    expect(result.recipes).toHaveLength(2);
  });

  it("maps the ca locale to es when calling the catalog endpoints", async () => {
    mockGetLocale.mockReturnValue("ca");
    mockGetAuthenticatedCecotecSession.mockResolvedValue({
      accessToken: "tok",
      email: "cec@example.com",
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
    mockGetAuthenticatedCecotecSession.mockRejectedValue(
      new CecotecError("Session expired"),
    );

    const result = (await load({
      locals: makeLocals(),
      url: new URL("http://localhost/recipes/cecotec"),
    } as never)) as Record<string, unknown>;

    expect(result.linked).toBe(true);
    expect(result.error).toBe("Session expired");
    expect(result.recipes).toEqual([]);
  });

  it("passes the category and page query params through to the catalog call", async () => {
    mockGetAuthenticatedCecotecSession.mockResolvedValue({
      accessToken: "tok",
      email: "cec@example.com",
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
