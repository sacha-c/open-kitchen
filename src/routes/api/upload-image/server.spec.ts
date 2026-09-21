import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUploadRecipeImage = vi.fn<
  (userId: string, file: File) => Promise<string>
>();

vi.mock("$lib/server/cecotec/image-upload", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("$lib/server/cecotec/image-upload")
  >();
  return {
    ...actual,
    uploadRecipeImage: (userId: string, file: File) =>
      mockUploadRecipeImage(userId, file),
  };
});

const { CecotecError } = await import("$lib/server/cecotec/client");
const { ImageUploadError } = await import("$lib/server/cecotec/image-upload");
const { POST } = await import("./+server");

function requestWith(file?: File): Request {
  const formData = new FormData();
  if (file) formData.set("file", file);
  return new Request("http://localhost/api/upload-image", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/upload-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    const response = (await POST({
      locals: { session: null, user: null },
      request: requestWith(),
    } as never)) as Response;

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("requires a file field", async () => {
    const response = (await POST({
      locals: { session: {}, user: { id: "user-1" } },
      request: requestWith(),
    } as never)) as Response;

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "An image file is required.",
    });
  });

  it("returns the Cecotec CDN URL", async () => {
    mockUploadRecipeImage.mockResolvedValue(
      "https://file.cecotecapps.net/recipe.jpg",
    );
    const file = new File(["image"], "recipe.jpg", { type: "image/jpeg" });

    const response = (await POST({
      locals: { session: {}, user: { id: "user-1" } },
      request: requestWith(file),
    } as never)) as Response;

    expect(mockUploadRecipeImage).toHaveBeenCalledWith("user-1", expect.any(File));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://file.cecotecapps.net/recipe.jpg",
    });
  });

  it("returns image validation errors", async () => {
    mockUploadRecipeImage.mockRejectedValue(
      new ImageUploadError("Images must be 5 MB or smaller.", 400),
    );

    const response = (await POST({
      locals: { session: {}, user: { id: "user-1" } },
      request: requestWith(
        new File(["image"], "recipe.jpg", { type: "image/jpeg" }),
      ),
    } as never)) as Response;

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Images must be 5 MB or smaller.",
    });
  });

  it("returns Cecotec upload errors", async () => {
    mockUploadRecipeImage.mockRejectedValue(
      new CecotecError("Image upload failed: HTTP 413"),
    );

    const response = (await POST({
      locals: { session: {}, user: { id: "user-1" } },
      request: requestWith(
        new File(["image"], "recipe.jpg", { type: "image/jpeg" }),
      ),
    } as never)) as Response;

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Image upload failed: HTTP 413",
    });
  });
});