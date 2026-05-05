import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — registered before importing the module under test
// ---------------------------------------------------------------------------

const mockAuthenticate = vi.fn();
const mockCreateRecipe = vi.fn();
const mockUpdateRecipe = vi.fn();
const mockDeleteRecipe = vi.fn();
const mockUploadImage = vi.fn();
const mockDecrypt = vi.fn((_s: string) => "decrypted-password");
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock("$env/static/private", () => ({
  CECOTEC_ENCRYPTION_KEY: "a".repeat(64),
  DATABASE_URL: "postgres://localhost/test",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:5173",
}));

vi.mock("$lib/server/cecotec/client", () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
  createRecipe: (...args: unknown[]) => mockCreateRecipe(...args),
  updateRecipe: (...args: unknown[]) => mockUpdateRecipe(...args),
  deleteRecipe: (...args: unknown[]) => mockDeleteRecipe(...args),
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
  CecotecError: class CecotecError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CecotecError";
    }
  },
}));

vi.mock("$lib/server/crypto", () => ({
  decrypt: (s: string) => mockDecrypt(s),
}));

vi.mock("$lib/server/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

// ---------------------------------------------------------------------------
// Chain builders for Drizzle mock
// ---------------------------------------------------------------------------

/** select().from().where() → resolves with value */
function chain(value: unknown) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve(value)),
    })),
  };
}

/** select().from().where().orderBy() → resolves with value */
function chainWithOrderBy(value: unknown) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => Promise.resolve(value)),
      })),
    })),
  };
}

/** select().from().where(and()) → resolves with value (for syncAllPending) */
function chainWithAnd(value: unknown) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve(value)),
    })),
  };
}

function makeUpdateChain() {
  return {
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const recipeRow = {
  id: "recipe-1",
  userId: "user-1",
  name: "Soup",
  servings: "2",
  cookingTime: 300,
  language: "en",
  imageUrl: null,
  cecotecRecipeId: null,
  cecotecNumber: null,
  syncStatus: "pending",
  syncError: null,
  syncedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const recipeRowWithCecotec = {
  ...recipeRow,
  cecotecRecipeId: "cec-rid-1",
  cecotecNumber: "cec-num-1",
};

const step = {
  id: "step-1",
  recipeId: "recipe-1",
  sortOrder: 0,
  description: "Mix everything",
  operationType: 2,
  totalTime: 120,
  speed: "3",
  temperature: 80,
  power: 2,
  imageUrl: null,
  videoUrl: null,
};

const ingredient = {
  id: "ing-1",
  recipeId: "recipe-1",
  sortOrder: 0,
  name: "Butter",
  amount: "50",
  unit: "g",
  cecotecIngredientId: "cec-ing-1",
  cecotecUnitId: "cec-unit-1",
};

const creds = {
  id: "cred-1",
  userId: "user-1",
  email: "user@example.com",
  encryptedPassword: "enc:pass:word",
  cecotecUserId: "cec-user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { transformRecipeForCecotec, syncRecipe, syncAllPending } = await import(
  "./engine"
);

// ---------------------------------------------------------------------------
// transformRecipeForCecotec
// ---------------------------------------------------------------------------

describe("transformRecipeForCecotec", () => {
  it("maps recipe metadata fields correctly", () => {
    const result = transformRecipeForCecotec(
      { name: "Soup", servings: "4", cookingTime: 600, language: "es" },
      [],
      [],
    );
    expect(result.name).toBe("Soup");
    expect(result.servings).toBe("4");
    expect(result.cookingTime).toBe(600);
    expect(result.language).toBe("es");
  });

  it("includes imageUrl when provided", () => {
    const result = transformRecipeForCecotec(
      { name: "X", servings: "2", cookingTime: 60, language: "en" },
      [],
      [],
      "https://cdn.example.com/img.jpg",
    );
    expect(result.imageUrl).toBe("https://cdn.example.com/img.jpg");
  });

  it("maps steps to Cecotec format", () => {
    const result = transformRecipeForCecotec(
      { name: "X", servings: "2", cookingTime: 60, language: "en" },
      [
        {
          sortOrder: 0,
          description: "Boil water",
          operationType: 2,
          totalTime: 120,
          speed: "3",
          temperature: 100,
          power: 4,
        },
      ],
      [],
    );
    const s = result.steps[0];
    expect(s.stepDesc).toBe("Boil water");
    expect(s.operationType).toBe(2);
    expect(s.singleTotalTime).toBe(120);
    expect(s.cookSteps[0].time).toBe(120);
    expect(s.cookSteps[0].speed).toBe("3");
    expect(s.cookSteps[0].temperature).toBe(100);
    expect(s.cookSteps[0].power).toBe(4);
    expect(s.cookSteps[0].accessoriesType).toBe(-1);
  });

  it("maps ingredients with cecotec IDs", () => {
    const result = transformRecipeForCecotec(
      { name: "X", servings: "2", cookingTime: 60, language: "en" },
      [],
      [
        {
          name: "Flour",
          amount: "100",
          unit: "g",
          cecotecIngredientId: "ing-id",
          cecotecUnitId: "unit-id",
        },
      ],
    );
    expect(result.ingredients?.[0].ingredientId).toBe("ing-id");
    expect(result.ingredients?.[0].foodIngredient).toBe("Flour");
    expect(result.ingredients?.[0].unitId).toBe("unit-id");
    expect(result.ingredients?.[0].unit).toBe("g");
    expect(result.ingredients?.[0].amount).toBe("100");
  });

  it("defaults null cecotec IDs to empty string", () => {
    const result = transformRecipeForCecotec(
      { name: "X", servings: "2", cookingTime: 60, language: "en" },
      [],
      [
        {
          name: "Salt",
          amount: "1",
          unit: "tsp",
          cecotecIngredientId: null,
          cecotecUnitId: null,
        },
      ],
    );
    expect(result.ingredients?.[0].ingredientId).toBe("");
    expect(result.ingredients?.[0].unitId).toBe("");
  });
});

// ---------------------------------------------------------------------------
// syncRecipe
// ---------------------------------------------------------------------------

describe("syncRecipe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ accessToken: "tok123" });
    mockCreateRecipe.mockResolvedValue({ recipeId: "new-id", number: "99" });
    mockUpdate.mockReturnValue(makeUpdateChain());
  });

  it("creates a new recipe when cecotecRecipeId is absent", async () => {
    mockSelect
      .mockReturnValueOnce(chain([recipeRow]))
      .mockReturnValueOnce(chainWithOrderBy([step]))
      .mockReturnValueOnce(chainWithOrderBy([ingredient]))
      .mockReturnValueOnce(chain([creds]));

    const result = await syncRecipe("recipe-1");

    expect(mockCreateRecipe).toHaveBeenCalledOnce();
    expect(result.status).toBe("synced");
    expect(result.recipeId).toBe("recipe-1");
    const setCall = (
      mockUpdate.mock.results[0].value as ReturnType<typeof makeUpdateChain>
    ).set;
    const setArg = (setCall as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArg.syncStatus).toBe("synced");
    expect(setArg.cecotecRecipeId).toBe("new-id");
    expect(setArg.cecotecNumber).toBe("99");
  });

  it("updates in-place when cecotecRecipeId is present", async () => {
    mockSelect
      .mockReturnValueOnce(chain([recipeRowWithCecotec]))
      .mockReturnValueOnce(chainWithOrderBy([step]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chain([creds]));

    await syncRecipe("recipe-1");

    expect(mockUpdateRecipe).toHaveBeenCalledOnce();
    expect(mockCreateRecipe).not.toHaveBeenCalled();
    const [token, rid, num] = mockUpdateRecipe.mock.calls[0] as [
      string,
      string,
      string,
      unknown,
    ];
    expect(token).toBe("tok123");
    expect(rid).toBe("cec-rid-1");
    expect(num).toBe("cec-num-1");
  });

  it("falls back to delete+recreate when update fails", async () => {
    mockUpdateRecipe.mockRejectedValueOnce(new Error("update failed"));
    mockDeleteRecipe.mockResolvedValueOnce(undefined);
    mockCreateRecipe.mockResolvedValue({ recipeId: "new-id2", number: "77" });

    mockSelect
      .mockReturnValueOnce(chain([recipeRowWithCecotec]))
      .mockReturnValueOnce(chainWithOrderBy([step]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chain([creds]));

    const result = await syncRecipe("recipe-1");

    expect(mockDeleteRecipe).toHaveBeenCalledOnce();
    expect(mockCreateRecipe).toHaveBeenCalledOnce();
    expect(result.status).toBe("synced");
  });

  it("marks recipe as error when no credentials are configured", async () => {
    mockSelect
      .mockReturnValueOnce(chain([recipeRow]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chain([]));

    const result = await syncRecipe("recipe-1");

    expect(result.status).toBe("error");
    expect(result.error).toContain("No Cecotec credentials");
    const setCall = (
      mockUpdate.mock.results[0].value as ReturnType<typeof makeUpdateChain>
    ).set;
    const setArg = (setCall as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArg.syncStatus).toBe("error");
  });

  it("marks recipe as error on auth failure", async () => {
    mockAuthenticate.mockRejectedValueOnce(new Error("Auth failed"));

    mockSelect
      .mockReturnValueOnce(chain([recipeRow]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chain([creds]));

    const result = await syncRecipe("recipe-1");

    expect(result.status).toBe("error");
    expect(result.error).toContain("Auth failed");
  });

  it("marks recipe as error on create failure", async () => {
    mockCreateRecipe.mockRejectedValueOnce(new Error("Create failed"));

    mockSelect
      .mockReturnValueOnce(chain([recipeRow]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chain([creds]));

    const result = await syncRecipe("recipe-1");

    expect(result.status).toBe("error");
    expect(result.error).toBe("Create failed");
    const setCall = (
      mockUpdate.mock.results[0].value as ReturnType<typeof makeUpdateChain>
    ).set;
    const setArg = (setCall as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(setArg.syncStatus).toBe("error");
    expect(setArg.syncError).toBe("Create failed");
  });

  it("marks recipe as error on image upload failure", async () => {
    const recipeWithImage = {
      ...recipeRow,
      imageUrl: "https://example.com/img.jpg",
    };
    mockUploadImage.mockRejectedValueOnce(new Error("Upload failed"));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => "image/jpeg" },
      }),
    );

    mockSelect
      .mockReturnValueOnce(chain([recipeWithImage]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chain([creds]));

    const result = await syncRecipe("recipe-1");

    expect(result.status).toBe("error");
    expect(result.error).toBe("Upload failed");
  });

  it("returns error result when recipe is not found (no DB update)", async () => {
    mockSelect.mockReturnValueOnce(chain([]));

    const result = await syncRecipe("nonexistent");

    expect(result.status).toBe("error");
    expect(result.error).toContain("nonexistent");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("passes decrypted password to authenticate", async () => {
    mockDecrypt.mockReturnValueOnce("plain-pass");

    mockSelect
      .mockReturnValueOnce(chain([recipeRow]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chain([creds]));

    await syncRecipe("recipe-1");

    expect(mockAuthenticate).toHaveBeenCalledWith(
      "user@example.com",
      "plain-pass",
    );
  });
});

// ---------------------------------------------------------------------------
// syncAllPending
// ---------------------------------------------------------------------------

describe("syncAllPending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ accessToken: "tok123" });
    mockCreateRecipe.mockResolvedValue({ recipeId: "new-id", number: "99" });
    mockUpdate.mockReturnValue(makeUpdateChain());
  });

  it("returns empty array when no pending recipes", async () => {
    mockSelect.mockReturnValueOnce(chainWithAnd([]));

    const results = await syncAllPending("user-1");

    expect(results).toHaveLength(0);
  });

  it("syncs all pending recipes and returns results", async () => {
    const row2 = { ...recipeRow, id: "recipe-2" };

    // Both syncRecipe calls start synchronously (via .map()), so both recipe
    // lookups happen before either first await resolves.
    mockSelect
      // syncAllPending pending-recipes query
      .mockReturnValueOnce(
        chainWithAnd([{ id: "recipe-1" }, { id: "recipe-2" }]),
      )
      // r1 recipe lookup (synchronous inside map)
      .mockReturnValueOnce(chain([recipeRow]))
      // r2 recipe lookup (synchronous inside map, right after r1)
      .mockReturnValueOnce(chain([row2]))
      // r1 Promise.all: steps, ingredients, creds
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chain([creds]))
      // r2 Promise.all: steps, ingredients, creds
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chain([creds]));

    const results = await syncAllPending("user-1");

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("synced");
    expect(results[1].status).toBe("synced");
  });

  it("syncs remaining recipes independently when one fails", async () => {
    const row2 = { ...recipeRow, id: "recipe-2" };

    // Both recipe lookups happen synchronously via .map() before any await.
    mockSelect
      // syncAllPending pending-recipes query
      .mockReturnValueOnce(
        chainWithAnd([{ id: "recipe-1" }, { id: "recipe-2" }]),
      )
      // r1 recipe lookup
      .mockReturnValueOnce(chain([recipeRow]))
      // r2 recipe lookup
      .mockReturnValueOnce(chain([row2]))
      // r1 Promise.all: steps, ingredients, creds (no creds → error)
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chain([]))
      // r2 Promise.all: steps, ingredients, creds
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chainWithOrderBy([]))
      .mockReturnValueOnce(chain([creds]));

    const results = await syncAllPending("user-1");

    expect(results).toHaveLength(2);
    const r1 = results.find((r) => r.recipeId === "recipe-1");
    const r2 = results.find((r) => r.recipeId === "recipe-2");
    expect(r1?.status).toBe("error");
    expect(r2?.status).toBe("synced");
  });
});
