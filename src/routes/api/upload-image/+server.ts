import { json } from "@sveltejs/kit";
import * as m from "$lib/paraglide/messages";
import { CecotecError } from "$lib/server/cecotec/client";
import {
  ImageUploadError,
  uploadRecipeImage,
} from "$lib/server/cecotec/image-upload";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.session || !locals.user) {
    return json({ error: m.error_unauthorized() }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return json({ error: m.error_image_file_required() }, { status: 400 });
  }

  try {
    const url = await uploadRecipeImage(locals.user.id, file);
    return json({ url });
  } catch (error) {
    if (error instanceof ImageUploadError) {
      return json({ error: error.message }, { status: error.status });
    }
    if (error instanceof CecotecError) {
      return json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
};
