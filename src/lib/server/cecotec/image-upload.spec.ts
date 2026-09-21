import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthenticate = vi.fn();
const mockUploadImage = vi.fn();
const mockDecrypt = vi.fn((_ciphertext: string) => "plain-password");
const mockSelect = vi.fn();

vi.mock("$lib/server/cecotec/client", () => ({
  authenticate: (...args: unknown[]) => mockAuthenticate(...args),
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
}));

vi.mock("$lib/server/crypto", () => ({
  decrypt: (ciphertext: string) => mockDecrypt(ciphertext),
}));

vi.mock("$lib/server/db", () => ({
  db: { select: (...args: unknown[]) => mockSelect(...args) },
}));

function selectChain(value: unknown) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve(value)),
    })),
  };
}

const { MAX_IMAGE_SIZE, ImageUploadError, uploadRecipeImage, validateImage } =
  await import("./image-upload");

describe("validateImage", () => {
  it("rejects unsupported file types", () => {
    const file = new File(["text"], "notes.txt", { type: "text/plain" });

    expect(() => validateImage(file)).toThrow(ImageUploadError);
  });

  it("rejects files larger than 5 MB", () => {
    const file = new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], "large.jpg", {
      type: "image/jpeg",
    });

    expect(() => validateImage(file)).toThrow("5 MB or smaller");
  });

  it("accepts a supported image at the 5 MB limit", () => {
    const file = new File([new Uint8Array(MAX_IMAGE_SIZE)], "recipe.webp", {
      type: "image/webp",
    });

    expect(() => validateImage(file)).not.toThrow();
  });
});

describe("uploadRecipeImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue({ accessToken: "access-token" });
    mockUploadImage.mockResolvedValue(
      "https://file.cecotecapps.net/uploaded.jpg",
    );
  });

  it("uploads directly to Cecotec with a unique matching extension", async () => {
    mockSelect.mockReturnValue(
      selectChain([
        {
          email: "cook@example.com",
          encryptedPassword: "encrypted-password",
        },
      ]),
    );
    const file = new File(["image-data"], "original.png", {
      type: "image/png",
    });

    const url = await uploadRecipeImage("user-1", file);

    expect(mockDecrypt).toHaveBeenCalledWith("encrypted-password");
    expect(mockAuthenticate).toHaveBeenCalledWith(
      "cook@example.com",
      "plain-password",
    );
    expect(mockUploadImage).toHaveBeenCalledWith(
      "access-token",
      expect.any(Buffer),
      expect.stringMatching(/^[0-9a-f-]+\.png$/),
      "image/png",
    );
    expect(url).toBe("https://file.cecotecapps.net/uploaded.jpg");
  });

  it("requires linked Cecotec credentials", async () => {
    mockSelect.mockReturnValue(selectChain([]));
    const file = new File(["image-data"], "recipe.webp", {
      type: "image/webp",
    });

    await expect(uploadRecipeImage("user-1", file)).rejects.toThrow(
      "Connect your Cecotec account",
    );
    expect(mockUploadImage).not.toHaveBeenCalled();
  });
});