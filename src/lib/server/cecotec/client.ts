import { constants, publicEncrypt } from "node:crypto";
import {
  CECOTEC_BASE_URL,
  CECOTEC_PUBLIC_KEY,
  COMMON_HEADERS,
  MODEL_CODE,
  OAUTH_BASIC_AUTH,
} from "./constants";
import type {
  CecotecAuthResult,
  CecotecIngredient,
  CecotecRecipe,
  CecotecRecipeInput,
  CecotecRecipeStep,
} from "./types";
import {
  authResponseSchema,
  createRecipeResponseDataSchema,
  listRecipesResponseDataSchema,
  parseCecotecEnvelope,
  uploadImageResponseDataSchema,
} from "./types";

export class CecotecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CecotecError";
  }
}

function authHeaders(token: string): Record<string, string> {
  return {
    ...COMMON_HEADERS,
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    "blade-auth": `bearer ${token}`,
  };
}

function buildRecipeBody(
  recipe: CecotecRecipeInput,
  recipeId?: string,
  number?: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    language: recipe.language,
    modleCode: MODEL_CODE,
    appOrDevice: 1,
    sourceType: 1,
    defaultName: recipe.name,
    serviceSize: recipe.servings,
    cookingTime: recipe.cookingTime,
    recipeStatus: 1,
    recipeDeviceParameterDtos: recipe.steps,
    ingredientsRelationVosList: recipe.ingredients ?? [],
    recipeCategoryIds: [],
    recipeTagIds: [],
  };
  if (recipe.imageUrl) {
    body.landscapeImageUrl = recipe.imageUrl;
  }
  if (recipeId) {
    body.id = recipeId;
    body.recipeId = recipeId;
  }
  if (number) {
    body.number = number;
  }
  return body;
}

export function encryptPassword(password: string): string {
  const encrypted = publicEncrypt(
    {
      key: CECOTEC_PUBLIC_KEY,
      padding: constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(password, "utf-8"),
  );
  return encrypted.toString("base64");
}

export async function authenticate(
  email: string,
  password: string,
): Promise<CecotecAuthResult> {
  const url = `${CECOTEC_BASE_URL}/api/blade-auth/oauth/token`;
  const body = new URLSearchParams({
    grant_type: "password",
    username: email,
    password: encryptPassword(password),
    code: "en",
    languageCode: "en",
    loginType: "0",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...COMMON_HEADERS,
      authorization: OAUTH_BASIC_AUTH,
      "blade-auth": "bearer null",
      "content-type": "application/x-www-form-urlencoded;charset=utf-8",
      "user-type": "iOS",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new CecotecError(`Authentication failed: HTTP ${response.status}`);
  }

  const raw = await response.json();
  const parsed = authResponseSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = (raw as Record<string, unknown>).msg;
    throw new CecotecError(
      typeof msg === "string"
        ? msg
        : "Authentication failed: unexpected response shape",
    );
  }

  return {
    accessToken: parsed.data.access_token,
    refreshToken: parsed.data.refresh_token,
    userId: parsed.data.user_id,
  };
}

export async function createRecipe(
  token: string,
  recipe: CecotecRecipeInput,
): Promise<{ recipeId: string; number: string }> {
  const body = buildRecipeBody(recipe);

  const addResponse = await fetch(
    `${CECOTEC_BASE_URL}/api/blade-cook/recipe/createRecipeApp/add`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  );

  if (!addResponse.ok) {
    throw new CecotecError(`Create recipe failed: HTTP ${addResponse.status}`);
  }

  const addRaw = await addResponse.json();
  let envelopeData: unknown;
  try {
    envelopeData = parseCecotecEnvelope(addRaw);
  } catch (e) {
    throw new CecotecError(
      e instanceof Error ? e.message : "Create recipe failed",
    );
  }

  const result = createRecipeResponseDataSchema.parse(envelopeData);

  // Publish: the add endpoint saves as a hidden draft; update with
  // recipeStatus=1 makes it visible in the user's recipe list.
  const updateBody = buildRecipeBody(
    recipe,
    String(result.recipeId),
    String(result.number),
  );
  const updateResponse = await fetch(
    `${CECOTEC_BASE_URL}/api/blade-cook/recipe/createRecipeApp/update`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(updateBody),
    },
  );

  if (!updateResponse.ok) {
    throw new CecotecError(
      `Publish recipe failed: HTTP ${updateResponse.status}`,
    );
  }

  const updateRaw = await updateResponse.json();
  try {
    parseCecotecEnvelope(updateRaw);
  } catch (e) {
    throw new CecotecError(
      e instanceof Error ? e.message : "Publish recipe failed",
    );
  }

  return { recipeId: result.recipeId, number: result.number };
}

export async function listRecipes(
  token: string,
  userId: string,
): Promise<CecotecRecipe[]> {
  const params = new URLSearchParams({
    userId,
    current: "1",
    size: "50",
    modleCode: MODEL_CODE,
    appOrDevice: "1",
    sourceType: "1",
  });

  const response = await fetch(
    `${CECOTEC_BASE_URL}/api/blade-cook/recipe/createRecipeApp/selectPage?${params}`,
    {
      headers: {
        ...COMMON_HEADERS,
        authorization: `Bearer ${token}`,
        "blade-auth": `bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new CecotecError(`List recipes failed: HTTP ${response.status}`);
  }

  const raw = await response.json();
  let envelopeData: unknown;
  try {
    envelopeData = parseCecotecEnvelope(raw);
  } catch (e) {
    throw new CecotecError(
      e instanceof Error ? e.message : "List recipes failed",
    );
  }

  return listRecipesResponseDataSchema.parse(envelopeData).records;
}

export async function deleteRecipe(
  token: string,
  recipeId: string,
): Promise<void> {
  const response = await fetch(
    `${CECOTEC_BASE_URL}/api/blade-cook/recipe/createRecipeApp/deleteRecipe`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ recipeIds: [recipeId] }),
    },
  );

  if (!response.ok) {
    throw new CecotecError(`Delete recipe failed: HTTP ${response.status}`);
  }

  const raw = await response.json();
  try {
    parseCecotecEnvelope(raw);
  } catch (e) {
    throw new CecotecError(
      e instanceof Error ? e.message : "Delete recipe failed",
    );
  }
}

export async function uploadImage(
  token: string,
  file: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([file.buffer as ArrayBuffer], { type: mimeType }),
    filename,
  );

  const response = await fetch(
    `${CECOTEC_BASE_URL}/api/blade-resource/oss/endpoint/put-file`,
    {
      method: "POST",
      headers: {
        ...COMMON_HEADERS,
        authorization: `Bearer ${token}`,
        "blade-auth": `bearer ${token}`,
      },
      body: form,
    },
  );

  if (!response.ok) {
    throw new CecotecError(`Image upload failed: HTTP ${response.status}`);
  }

  const raw = await response.json();
  let envelopeData: unknown;
  try {
    envelopeData = parseCecotecEnvelope(raw);
  } catch (e) {
    throw new CecotecError(
      e instanceof Error ? e.message : "Image upload failed",
    );
  }

  return uploadImageResponseDataSchema.parse(envelopeData).link;
}

export type {
  CecotecAuthResult,
  CecotecIngredient,
  CecotecRecipe,
  CecotecRecipeInput,
  CecotecRecipeStep,
};
