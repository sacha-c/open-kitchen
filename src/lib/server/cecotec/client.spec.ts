import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticate,
  CecotecError,
  createRecipe,
  deleteRecipe,
  encryptPassword,
  listRecipes,
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
  it("makes two POST calls (add + update)", async () => {
    const spy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(successEnvelope({ recipeId: "r1", number: "42" })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(successEnvelope({})),
      });
    vi.stubGlobal("fetch", spy);

    const result = await createRecipe("token", minimalRecipe);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.recipeId).toBe("r1");
    expect(result.number).toBe("42");
  });

  it("first call goes to /add, second to /update", async () => {
    const spy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(successEnvelope({ recipeId: "r1", number: "1" })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(successEnvelope({})),
      });
    vi.stubGlobal("fetch", spy);

    await createRecipe("token", minimalRecipe);

    const firstUrl = spy.mock.calls[0][0] as string;
    const secondUrl = spy.mock.calls[1][0] as string;
    expect(firstUrl).toContain("/add");
    expect(secondUrl).toContain("/update");
  });

  it("throws CecotecError when add returns API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(errorEnvelope("Recipe not allowed")),
      }),
    );

    await expect(createRecipe("token", minimalRecipe)).rejects.toBeInstanceOf(
      CecotecError,
    );
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 500));
    await expect(createRecipe("token", minimalRecipe)).rejects.toBeInstanceOf(
      CecotecError,
    );
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

    const result = await listRecipes("token", "user1");
    expect(result).toHaveLength(1);
    expect(result[0].defaultName).toBe("Soup");
  });

  it("includes userId and modleCode as query params", async () => {
    const spy = mockFetch(successEnvelope({ records: [] }));
    vi.stubGlobal("fetch", spy);

    await listRecipes("token", "uid42");

    const [url] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("userId=uid42");
    expect(url).toContain("modleCode=MamboTouch");
  });

  it("throws CecotecError on HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 403));
    await expect(listRecipes("token", "uid")).rejects.toBeInstanceOf(
      CecotecError,
    );
  });

  it("throws CecotecError on API-level error", async () => {
    vi.stubGlobal("fetch", mockFetch(errorEnvelope("Not found")));
    await expect(listRecipes("token", "uid")).rejects.toBeInstanceOf(
      CecotecError,
    );
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
