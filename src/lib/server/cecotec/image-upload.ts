import { eq } from "drizzle-orm";
import {
  getImageValidationError,
  MAX_IMAGE_SIZE,
} from "$lib/image-upload-policy";
import * as m from "$lib/paraglide/messages";
import { authenticate, uploadImage } from "$lib/server/cecotec/client";
import { decrypt } from "$lib/server/crypto";
import { db } from "$lib/server/db";
import { cecotecCredentials } from "$lib/server/db/schema";

export { MAX_IMAGE_SIZE };

const IMAGE_EXTENSIONS = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export class ImageUploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export function validateImage(file: File): void {
  const validationError = getImageValidationError(file);
  if (validationError) {
    throw new ImageUploadError(validationError, 400);
  }
}

export async function uploadRecipeImage(
  userId: string,
  file: File,
): Promise<string> {
  validateImage(file);

  const [credentials] = await db
    .select()
    .from(cecotecCredentials)
    .where(eq(cecotecCredentials.userId, userId));

  if (!credentials) {
    throw new ImageUploadError(m.error_connect_cecotec_before_upload(), 400);
  }

  const password = decrypt(credentials.encryptedPassword);
  const { accessToken } = await authenticate(credentials.email, password);
  const extension =
    IMAGE_EXTENSIONS[file.type as keyof typeof IMAGE_EXTENSIONS];
  const filename = `${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  return uploadImage(accessToken, buffer, filename, file.type);
}
