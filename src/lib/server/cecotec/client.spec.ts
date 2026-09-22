import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticate,
  CecotecError,
  createRecipe,
  deleteRecipe,
  encryptPassword,
  getDevices,
  getRecipeDetail,
  listCatalogCategories,
  listPublicCatalog,
  listRecipes,
  updateRecipe,
  uploadImage,
} from "./client";
import type { CecotecRecipeInput } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const successEnvelope = (data: unknown) => ({ code: "200", data });
const errorEnvelope = (msg: string) => ({ code: "400", msg, data: null });

const minimalRecipe: CecotecRecipeInput = {
  name: "Test soup",
  cookingTime: 120,
  servings: "2",
  language: "en",
  steps: [
    {
      stepDesc: "Mix",
      operationType: 2,
      singleTotalTime: 120,
      cookSteps: [
        {
          time: 120,
          power: 2,
          speed: "3",
          temperature: 80,
          accessoriesType: -1,
          reel: "",
        },
      ],
      accessoriesList: [],
      recipeFoodIngredients: [],
      introduceUrl: "",
      introduceUrls: [],
      videoUrl: "",
    },
  ],
};

// ---------------------------------------------------------------------------
// encryptPassword
// ---------------------------------------------------------------------------

describe("encryptPassword", () => {
  it("returns a non-empty base64 string", () => {
    const result = encryptPassword("mypassword");
    expect(result).toBeTruthy();
    // RSA-1024 encrypted output is always 128 bytes = 172 base64 chars (with padding)
    expect(Buffer.from(result, "base64").length).toBe(128);
  });

  it("produces different output on each call (PKCS1 v1.5 is randomised)", () => {
    const a = encryptPassword("same");
    const b = encryptPassword("same");
    // They should almost never be identical due to PKCS1 v1.5 random padding
    // (running both in the same tick makes collision astronomically unlikely)
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// authenticate
// ---------------------------------------------------------------------------

describe("authenticate", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", undefined);
  });

  it("returns auth result on success", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        access_token: "tok123",
        refresh_token: "ref456",
        user_id: "uid789",
      }),
    );

    const result = await authenticate("user@example.com", "password");
    expect(result.accessToken).toBe("tok123");
    expect(result.refreshToken).toBe("ref456");
    expect(result.userId).toBe("uid789");
  });

  it("posts to the correct URL", async () => {
    const spy = mockFetch({
      access_token: "t",
      refresh_token: "r",
      user_id: "u",
    });
    vi.stubGlobal("fetch", spy);

    await authenticate("a@b.com", "pass");

    const [url] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/blade-auth/oauth/token");
  });

  it("includes required headers", async () => {
    const spy = mockFetch({
      access_token: "t",
      refresh_token: "r",
      user_id: "u",
    });
    vi.stubGlobal("fetch", spy);

    await authenticate("a@b.com", "pass");

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["cloud-kit-app-type"]).toBe("android");
    expect(headers["cloud-kit-cur-app-version"]).toBe("1.9.9");
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 401));
    await expect(authenticate("a@b.com", "bad")).rejects.toBeInstanceOf(
      CecotecError,
    );
  });

  it("throws CecotecError when response shape is invalid", async () => {
    vi.stubGlobal("fetch", mockFetch({ msg: "Invalid credentials" }));
    await expect(authenticate("a@b.com", "bad")).rejects.toBeInstanceOf(
      CecotecError,
    );
  });

  it("encodes body as form-urlencoded", async () => {
    const spy = mockFetch({
      access_token: "t",
      refresh_token: "r",
      user_id: "u",
    });
    vi.stubGlobal("fetch", spy);

    await authenticate("user@example.com", "pass");

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(init.body).toContain("grant_type=password");
    expect(init.body).toContain("username=user%40example.com");
  });
});

// ---------------------------------------------------------------------------
// createRecipe
// ---------------------------------------------------------------------------

describe("createRecipe", () => {
  it("makes two POST calls (add + publish update) and preserves large IDs", async () => {
    const spy = vi
      .fn()
      // First call: /add — returns a large recipeId that would be corrupted by JSON.parse
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            '{"code":"200","data":{"recipeId":2065088550414004226,"number":42}}',
          ),
      })
      // Second call: /update (publish)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(successEnvelope({})),
      });

    vi.stubGlobal("fetch", spy);

    const result = await createRecipe("token", minimalRecipe, "MamboTouch");
    expect(spy).toHaveBeenCalledTimes(2);

    const addUrl = spy.mock.calls[0][0] as string;
    const updateUrl = spy.mock.calls[1][0] as string;
    expect(addUrl).toContain("/add");
    expect(updateUrl).toContain("/update");

    // The 18-digit recipeId must be preserved exactly (no floating-point rounding)
    expect(result.recipeId).toBe("2065088550414004226");
    expect(result.number).toBe("42");
  });

  it("throws CecotecError when add returns API error", async () => {
    const mockErrorPayload = errorEnvelope("Recipe not allowed");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockErrorPayload)),
        json: () => Promise.resolve(mockErrorPayload),
      }),
    );

    await expect(
      createRecipe("token", minimalRecipe, "MamboTouch"),
    ).rejects.toBeInstanceOf(CecotecError);
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 500));
    await expect(
      createRecipe("token", minimalRecipe, "MamboTouch"),
    ).rejects.toBeInstanceOf(CecotecError);
  });
});

// ---------------------------------------------------------------------------
// listRecipes
// ---------------------------------------------------------------------------

describe("listRecipes", () => {
  it("returns parsed recipes array", async () => {
    const records = [
      {
        id: "1",
        recipeId: "1",
        number: "42",
        defaultName: "Soup",
        serviceSize: "2",
        cookingTime: 300,
        language: "en",
      },
    ];
    vi.stubGlobal("fetch", mockFetch(successEnvelope({ records })));

    const result = await listRecipes("token", "user1", "MamboTouch");
    expect(result).toHaveLength(1);
    expect(result[0].defaultName).toBe("Soup");
  });

  it("includes userId and modleCode as query params", async () => {
    const spy = mockFetch(successEnvelope({ records: [] }));
    vi.stubGlobal("fetch", spy);

    await listRecipes("token", "uid42", "MamboTouch");

    const [url] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("userId=uid42");
    expect(url).toContain("modleCode=MamboTouch");
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 403));
    await expect(
      listRecipes("token", "uid", "MamboTouch"),
    ).rejects.toBeInstanceOf(CecotecError);
  });

  it("throws CecotecError on API-level error", async () => {
    vi.stubGlobal("fetch", mockFetch(errorEnvelope("Not found")));
    await expect(
      listRecipes("token", "uid", "MamboTouch"),
    ).rejects.toBeInstanceOf(CecotecError);
  });
});

// ---------------------------------------------------------------------------
// deleteRecipe
// ---------------------------------------------------------------------------

describe("deleteRecipe", () => {
  it("sends PUT with correct body", async () => {
    const spy = mockFetch(successEnvelope({}));
    vi.stubGlobal("fetch", spy);

    await deleteRecipe("token", "recipe123");

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/deleteRecipe");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({
      recipeIds: ["recipe123"],
    });
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 500));
    await expect(deleteRecipe("token", "r1")).rejects.toBeInstanceOf(
      CecotecError,
    );
  });

  it("throws CecotecError on API-level error", async () => {
    vi.stubGlobal("fetch", mockFetch(errorEnvelope("Not found")));
    await expect(deleteRecipe("token", "r1")).rejects.toBeInstanceOf(
      CecotecError,
    );
  });
});

// ---------------------------------------------------------------------------
// uploadImage
// ---------------------------------------------------------------------------

describe("uploadImage", () => {
  it("returns the CDN link from the response", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(successEnvelope({ link: "https://cdn.example.com/img.jpg" })),
    );

    const url = await uploadImage(
      "token",
      Buffer.from("imgdata"),
      "photo.jpg",
      "image/jpeg",
    );
    expect(url).toBe("https://cdn.example.com/img.jpg");
  });

  it("posts to the correct endpoint", async () => {
    const spy = mockFetch(
      successEnvelope({ link: "https://cdn.example.com/x" }),
    );
    vi.stubGlobal("fetch", spy);

    await uploadImage("token", Buffer.from("data"), "f.png", "image/png");

    const [url] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/blade-resource/oss/endpoint/put-file");
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 413));
    await expect(
      uploadImage("token", Buffer.from("data"), "f.jpg", "image/jpeg"),
    ).rejects.toBeInstanceOf(CecotecError);
  });

  it("throws CecotecError on API-level error", async () => {
    vi.stubGlobal("fetch", mockFetch(errorEnvelope("File too large")));
    await expect(
      uploadImage("token", Buffer.from("data"), "f.jpg", "image/jpeg"),
    ).rejects.toBeInstanceOf(CecotecError);
  });
});

// ---------------------------------------------------------------------------
// updateRecipe
// ---------------------------------------------------------------------------

describe("updateRecipe", () => {
  it("posts to the /update endpoint with recipeId and number in body", async () => {
    const spy = mockFetch(successEnvelope({}));
    vi.stubGlobal("fetch", spy);

    await updateRecipe("token", "rid-1", "num-42", minimalRecipe, "MamboTouch");

    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/update");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.id).toBe("rid-1");
    expect(body.number).toBe("num-42");
    expect(body.modleCode).toBe("MamboTouch");
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 500));
    await expect(
      updateRecipe("token", "r1", "1", minimalRecipe, "MamboTouch"),
    ).rejects.toBeInstanceOf(CecotecError);
  });

  it("throws CecotecError on API-level error", async () => {
    vi.stubGlobal("fetch", mockFetch(errorEnvelope("Recipe not found")));
    await expect(
      updateRecipe("token", "r1", "1", minimalRecipe, "MamboTouch"),
    ).rejects.toBeInstanceOf(CecotecError);
  });
});

// ---------------------------------------------------------------------------
// getDevices
// ---------------------------------------------------------------------------

describe("getDevices", () => {
  it("returns the list of linked devices", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        successEnvelope([
          { modleName: "MamboTouch", sn: "sn123", isOnline: 1 },
        ]),
      ),
    );

    const devices = await getDevices("token");
    expect(devices).toHaveLength(1);
    expect(devices[0].modleName).toBe("MamboTouch");
    expect(devices[0].sn).toBe("sn123");
  });

  it("calls the deviceBaseInfo endpoint", async () => {
    const spy = mockFetch(successEnvelope([]));
    vi.stubGlobal("fetch", spy);

    await getDevices("tok");

    const [url] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/blade-device/device/deviceBaseInfo");
  });

  it("uses Basic auth in Authorization header but bearer token in blade-auth", async () => {
    const spy = mockFetch(successEnvelope([]));
    vi.stubGlobal("fetch", spy);

    await getDevices("mytoken");

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toContain("Basic");
    expect(headers["blade-auth"]).toBe("bearer mytoken");
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 401));
    await expect(getDevices("token")).rejects.toBeInstanceOf(CecotecError);
  });

  it("throws CecotecError on API-level error", async () => {
    vi.stubGlobal("fetch", mockFetch(errorEnvelope("Unauthorized")));
    await expect(getDevices("token")).rejects.toBeInstanceOf(CecotecError);
  });
});

// ---------------------------------------------------------------------------
// listCatalogCategories
// ---------------------------------------------------------------------------

describe("listCatalogCategories", () => {
  it("returns parsed categories", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        successEnvelope([
          { id: "1", recipeCategoryName: "Soups", imageUrl: "https://x/1" },
        ]),
      ),
    );

    const categories = await listCatalogCategories("token", "en");
    expect(categories).toHaveLength(1);
    expect(categories[0].recipeCategoryName).toBe("Soups");
  });

  it("calls the top/categorys endpoint with sourceType and code", async () => {
    const spy = mockFetch(successEnvelope([]));
    vi.stubGlobal("fetch", spy);

    await listCatalogCategories("token", "es");

    const [url] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(
      "/api/blade-cook/kitCloud/category/app/top/categorys",
    );
    expect(url).toContain("sourceType=1");
    expect(url).toContain("code=es");
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 500));
    await expect(listCatalogCategories("token", "en")).rejects.toBeInstanceOf(
      CecotecError,
    );
  });

  it("throws CecotecError on API-level error", async () => {
    vi.stubGlobal("fetch", mockFetch(errorEnvelope("Not found")));
    await expect(listCatalogCategories("token", "en")).rejects.toBeInstanceOf(
      CecotecError,
    );
  });
});

// ---------------------------------------------------------------------------
// listPublicCatalog
// ---------------------------------------------------------------------------

describe("listPublicCatalog", () => {
  function mockTextFetch(body: unknown, status = 200) {
    return vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  }

  it("returns parsed catalog page, preserving large IDs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        // A raw JSON string with an 18-digit id that JSON.parse would round
        // if not for the client's "wrap large numbers in quotes" workaround.
        text: () =>
          Promise.resolve(
            '{"code":"200","data":{"records":[{"id":2065088550414004226,"number":42,"defaultName":"Tomato Soup","landscapeImageUrl":"https://x/soup.jpg","cookingTime":900,"views":120,"starAvg":4.5}],"total":1,"pages":1,"size":20,"current":1}}',
          ),
      }),
    );

    const result = await listPublicCatalog("token", { code: "en" });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe("2065088550414004226");
    expect(result.records[0].defaultName).toBe("Tomato Soup");
    expect(result.total).toBe(1);
  });

  it("builds query params from options", async () => {
    const spy = mockTextFetch({
      code: "200",
      data: { records: [], total: 0, pages: 0, size: 20, current: 1 },
    });
    vi.stubGlobal("fetch", spy);

    await listPublicCatalog("token", {
      code: "es",
      categoryId: "cat-1",
      currentPageNo: 2,
      pageSize: 10,
    });

    const [url] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(
      "/api/blade-cook/kitCloud/front/recipe/app/page/compatible/list",
    );
    expect(url).toContain("code=es");
    expect(url).toContain("categoryIds=cat-1");
    expect(url).toContain("currentPageNo=2");
    expect(url).toContain("pageSize=10");
  });

  it("defaults categoryIds to empty and page/size to 1/20", async () => {
    const spy = mockTextFetch({
      code: "200",
      data: { records: [], total: 0, pages: 0, size: 20, current: 1 },
    });
    vi.stubGlobal("fetch", spy);

    await listPublicCatalog("token", { code: "en" });

    const [url] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("categoryIds=");
    expect(url).toContain("currentPageNo=1");
    expect(url).toContain("pageSize=20");
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockTextFetch({}, 500));
    await expect(
      listPublicCatalog("token", { code: "en" }),
    ).rejects.toBeInstanceOf(CecotecError);
  });

  it("throws CecotecError on API-level error", async () => {
    vi.stubGlobal("fetch", mockTextFetch(errorEnvelope("Not found")));
    await expect(
      listPublicCatalog("token", { code: "en" }),
    ).rejects.toBeInstanceOf(CecotecError);
  });
});

// ---------------------------------------------------------------------------
// getRecipeDetail
// ---------------------------------------------------------------------------

describe("getRecipeDetail", () => {
  function mockTextFetch(body: unknown, status = 200) {
    return vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  }

  // Trimmed down version of a real detail response (ids/number are quoted
  // strings on the wire for this endpoint, unlike the /add endpoint).
  const realisticDetail = {
    code: "200",
    data: {
      id: "2086775324330119169",
      number: "85037",
      defaultName: "Summer cannelloni",
      serviceSize: "5",
      cookingTime: 1701.0,
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
    },
  };

  it("returns parsed recipe detail, preserving large IDs", async () => {
    vi.stubGlobal("fetch", mockTextFetch(realisticDetail));

    const result = await getRecipeDetail(
      "token",
      "2086775324330119169",
      "85037",
      "en",
    );

    expect(result.id).toBe("2086775324330119169");
    expect(result.number).toBe("85037");
    expect(result.defaultName).toBe("Summer cannelloni");
    expect(result.serviceSize).toBe("5");
    expect(result.cookingTime).toBe(1701);
    expect(result.multiLanguageRelations).toHaveLength(1);
    expect(
      result.multiLanguageRelations[0].recipeDeviceParameterDtos,
    ).toHaveLength(1);
    expect(
      result.multiLanguageRelations[0].ingredientsRelationVosList?.[0]
        .foodIngredient,
    ).toBe("Carrot");
  });

  it("parses recipes with no ingredients (ingredientsRelationVosList absent)", async () => {
    const noIngredients = structuredClone(realisticDetail);
    const { ingredientsRelationVosList: _omit, ...relationWithoutIngredients } =
      noIngredients.data.multiLanguageRelations[0];
    noIngredients.data.multiLanguageRelations[0] =
      relationWithoutIngredients as (typeof noIngredients.data.multiLanguageRelations)[0];
    vi.stubGlobal("fetch", mockTextFetch(noIngredients));

    const result = await getRecipeDetail(
      "token",
      "2086775324330119169",
      "85037",
      "en",
    );

    expect(
      result.multiLanguageRelations[0].ingredientsRelationVosList,
    ).toBeUndefined();
  });

  it("builds query params from id, number and code", async () => {
    const spy = mockTextFetch(realisticDetail);
    vi.stubGlobal("fetch", spy);

    await getRecipeDetail("token", "100", "42", "es");

    const [url] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(
      "/api/blade-cook/kitCloud/front/user/recipe/app/detail",
    );
    expect(url).toContain("id=100");
    expect(url).toContain("number=42");
    expect(url).toContain("code=es");
    expect(url).toContain("selectedLanguage=es");
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockTextFetch({}, 500));
    await expect(
      getRecipeDetail("token", "100", "42", "en"),
    ).rejects.toBeInstanceOf(CecotecError);
  });

  it("throws CecotecError on API-level error", async () => {
    vi.stubGlobal("fetch", mockTextFetch(errorEnvelope("Not found")));
    await expect(
      getRecipeDetail("token", "100", "42", "en"),
    ).rejects.toBeInstanceOf(CecotecError);
  });
});
