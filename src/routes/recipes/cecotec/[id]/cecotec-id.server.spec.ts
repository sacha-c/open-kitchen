import { beforeEach, describe, expect, it, vi } from "vitest";
import { recipe, recipeIngredient, recipeStep } from "$lib/server/db/schema";

// ---------------------------------------------------------------------------
// Mocks — set up before importing the module under test
// ---------------------------------------------------------------------------

const mockGetAuthenticatedCecotecSession = vi.fn();
const mockGetRecipeDetail = vi.fn();
const mockSelect = vi.fn();
const mockGetLocale = vi.fn((): string => "en");

vi.mock("$env/static/private", () => ({
  CECOTEC_ENCRYPTION_KEY: "a".repeat(64),
  DATABASE_URL: "postgres://localhost/test",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:5173",
}));

vi.mock("$lib/paraglide/runtime", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLocale: () => mockGetLocale(),
}));

vi.mock("$lib/server/cecotec/client", () => ({
  getRecipeDetail: (...args: unknown[]) => mockGetRecipeDetail(...args),
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

interface InsertCall {
  table: unknown;
  payload: Record<string, unknown>;
}

let insertCalls: InsertCall[];

function makeTx() {
  return {
    insert: (table: unknown) => ({
      values: (payload: Record<string, unknown>) => {
        insertCalls.push({ table, payload });
        return Promise.resolve(undefined);
      },
    }),
  };
}

vi.mock("$lib/server/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    transaction: async (cb: (tx: ReturnType<typeof makeTx>) => Promise<void>) =>
      cb(makeTx()),
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

const realisticDetail = {
  id: "2086775324330119169",
  number: "85037",
  defaultName: "Summer cannelloni",
  serviceSize: "5",
  cookingTime: 1701,
  landscapeImageUrl: "https://x/soup.jpg",
  multiLanguageRelations: [
    {
      code: "en",
      name: "Summer cannelloni",
      recipeDeviceParameterDtos: [
        {
          stepDesc: "Put the blades in place.",
          operationType: 1,
          singleTotalTime: 0,
          cookSteps: [
            {
              time: 0,
              power: 0,
              speed: "0",
              temperature: 0,
              accessoriesType: -1,
              reel: "",
            },
          ],
        },
      ],
      ingredientsRelationVosList: [
        {
          ingredientId: "1473608053080961025",
          foodIngredient: "Carrot",
          unitId: "1468065253094465538",
          unit: "g",
          amount: "100",
        },
      ],
    },
  ],
};

const { load, actions } = await import("./+page.server");

beforeEach(() => {
  mockGetAuthenticatedCecotecSession.mockReset();
  mockGetRecipeDetail.mockReset();
  mockSelect.mockReset();
  mockSelect.mockReturnValue(buildSelectChain([]));
  mockGetLocale.mockReturnValue("en");
  insertCalls = [];
});

// ---------------------------------------------------------------------------
// load
// ---------------------------------------------------------------------------

describe("load", () => {
  it("redirects unauthenticated users", async () => {
    await expect(
      load({
        locals: { session: null, user: null },
        params: { id: "100" },
        url: new URL("http://localhost/recipes/cecotec/100?number=42"),
      } as never),
    ).rejects.toMatchObject({ status: 303, location: "/" });
  });

  it("errors when the number query param is missing", async () => {
    await expect(
      load({
        locals: makeLocals(),
        params: { id: "100" },
        url: new URL("http://localhost/recipes/cecotec/100"),
      } as never),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("redirects to the catalog listing when no Cecotec account is linked", async () => {
    mockGetAuthenticatedCecotecSession.mockResolvedValue(null);

    await expect(
      load({
        locals: makeLocals(),
        params: { id: "100" },
        url: new URL("http://localhost/recipes/cecotec/100?number=42"),
      } as never),
    ).rejects.toMatchObject({ status: 303, location: "/recipes/cecotec" });
  });

  it("returns the mapped recipe detail with importedRecipeId null when never imported", async () => {
    mockGetAuthenticatedCecotecSession.mockResolvedValue({
      accessToken: "tok",
      email: "cec@example.com",
    });
    mockGetRecipeDetail.mockResolvedValue(realisticDetail);

    const result = (await load({
      locals: makeLocals(),
      params: { id: "2086775324330119169" },
      url: new URL(
        "http://localhost/recipes/cecotec/2086775324330119169?number=85037",
      ),
    } as never)) as Record<string, unknown>;

    expect(result.error).toBeNull();
    expect(result.importedRecipeId).toBeNull();
    expect(result.recipe).toMatchObject({ name: "Summer cannelloni" });
  });

  it("returns importedRecipeId when a local recipe already has this importedFromCecotecNumber", async () => {
    mockGetAuthenticatedCecotecSession.mockResolvedValue({
      accessToken: "tok",
      email: "cec@example.com",
    });
    mockGetRecipeDetail.mockResolvedValue(realisticDetail);
    mockSelect.mockReturnValue(buildSelectChain([{ id: "local-recipe-1" }]));

    const result = (await load({
      locals: makeLocals(),
      params: { id: "2086775324330119169" },
      url: new URL(
        "http://localhost/recipes/cecotec/2086775324330119169?number=85037",
      ),
    } as never)) as Record<string, unknown>;

    expect(result.importedRecipeId).toBe("local-recipe-1");
  });

  it("returns a page-level error instead of crashing on a Cecotec API error", async () => {
    const { CecotecError } = await import("$lib/server/cecotec/client");
    mockGetAuthenticatedCecotecSession.mockResolvedValue({
      accessToken: "tok",
      email: "cec@example.com",
    });
    mockGetRecipeDetail.mockRejectedValue(new CecotecError("Recipe not found"));

    const result = (await load({
      locals: makeLocals(),
      params: { id: "100" },
      url: new URL("http://localhost/recipes/cecotec/100?number=42"),
    } as never)) as Record<string, unknown>;

    expect(result.error).toBe("Recipe not found");
    expect(result.recipe).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// actions.import
// ---------------------------------------------------------------------------

describe("actions.import", () => {
  it("redirects unauthenticated users", async () => {
    await expect(
      actions.import({
        locals: { session: null, user: null },
        params: { id: "100" },
        request: { formData: async () => new FormData() },
      } as never),
    ).rejects.toMatchObject({ status: 303 });
  });

  it("fails when the number field is missing", async () => {
    const result = await actions.import({
      locals: makeLocals(),
      params: { id: "100" },
      request: { formData: async () => new FormData() },
    } as never);

    expect(result).toMatchObject({ status: 400 });
  });

  it("redirects to the existing recipe instead of re-importing a duplicate", async () => {
    mockSelect.mockReturnValue(buildSelectChain([{ id: "local-recipe-1" }]));
    const formData = new FormData();
    formData.set("number", "85037");

    await expect(
      actions.import({
        locals: makeLocals(),
        params: { id: "2086775324330119169" },
        request: { formData: async () => formData },
      } as never),
    ).rejects.toMatchObject({
      status: 303,
      location: "/recipes/local-recipe-1",
    });

    expect(mockGetRecipeDetail).not.toHaveBeenCalled();
  });

  it("fails with a message when no Cecotec account is linked", async () => {
    mockGetAuthenticatedCecotecSession.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("number", "85037");

    const result = await actions.import({
      locals: makeLocals(),
      params: { id: "2086775324330119169" },
      request: { formData: async () => formData },
    } as never);

    expect(result).toMatchObject({ status: 400 });
  });

  it("fails with the Cecotec error message when fetching detail fails", async () => {
    const { CecotecError } = await import("$lib/server/cecotec/client");
    mockGetAuthenticatedCecotecSession.mockResolvedValue({
      accessToken: "tok",
      email: "cec@example.com",
    });
    mockGetRecipeDetail.mockRejectedValue(new CecotecError("Session expired"));
    const formData = new FormData();
    formData.set("number", "85037");

    const result = await actions.import({
      locals: makeLocals(),
      params: { id: "2086775324330119169" },
      request: { formData: async () => formData },
    } as never);

    expect(result).toMatchObject({
      status: 400,
      data: { message: "Session expired" },
    });
  });

  it("creates a plain independent recipe copy: pending status, no cecotecRecipeId/cecotecNumber, tracks provenance separately", async () => {
    mockGetAuthenticatedCecotecSession.mockResolvedValue({
      accessToken: "tok",
      email: "cec@example.com",
    });
    mockGetRecipeDetail.mockResolvedValue(realisticDetail);
    const formData = new FormData();
    formData.set("number", "85037");

    await expect(
      actions.import({
        locals: makeLocals("user-123"),
        params: { id: "2086775324330119169" },
        request: { formData: async () => formData },
      } as never),
    ).rejects.toMatchObject({ status: 303 });

    const recipeInsert = insertCalls.find((c) => c.table === recipe);
    expect(recipeInsert).toBeDefined();
    expect(recipeInsert?.payload).toMatchObject({
      userId: "user-123",
      name: "Summer cannelloni",
      syncStatus: "pending",
      importedFromCecotecNumber: "85037",
    });
    expect(recipeInsert?.payload.cecotecRecipeId).toBeUndefined();
    expect(recipeInsert?.payload.cecotecNumber).toBeUndefined();
    expect(recipeInsert?.payload.syncedAt).toBeUndefined();

    const stepInsert = insertCalls.find((c) => c.table === recipeStep);
    expect(stepInsert?.payload).toMatchObject({
      description: "Put the blades in place.",
    });

    const ingredientInsert = insertCalls.find(
      (c) => c.table === recipeIngredient,
    );
    expect(ingredientInsert?.payload).toMatchObject({ name: "Carrot" });
  });
});
