export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_IMAGE_SIZE_LABEL = "5 MB";

export const ACCEPTED_IMAGE_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(",");

export function getImageValidationError(file: {
  size: number;
  type: string;
}): string | null {
  if (!ACCEPTED_IMAGE_TYPES.some((type) => type === file.type)) {
    return "Only JPEG, PNG, GIF, and WebP images are supported.";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return `Images must be ${MAX_IMAGE_SIZE_LABEL} or smaller.`;
  }

  return null;
}
