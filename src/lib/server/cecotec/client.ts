import { constants, publicEncrypt } from "node:crypto";
import {
  CECOTEC_BASE_URL,
  CECOTEC_PUBLIC_KEY,
  COMMON_HEADERS,
  OAUTH_BASIC_AUTH,
} from "./constants";
import type {
  CecotecAuthResult,
  CecotecDevice,
  CecotecIngredient,
  CecotecRecipe,
  CecotecRecipeInput,
  CecotecRecipeStep,
} from "./types";
import {
  authResponseSchema,
  createRecipeResponseDataSchema,
  devicesResponseSchema,
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
  modelCode: string,
  recipeId?: string,
  number?: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    id: recipeId ?? "",
    languageCode: recipe.language,
    modleCode: modelCode,
    appOrDevice: 1,
    sourceType: 1,
    isFeeder: 0,
    challengeLevel: 0,
    allergens: [],
    categoryIds: [],
    defaultName: recipe.name,
    serviceSize: recipe.servings,
    cookingTime: recipe.cookingTime,
    recipeStatus: "1",
    recipeDeviceParameterDtos: recipe.steps,
    recipeFoodIngredientsDetailDtos: recipe.ingredients ?? [],
    landscapeImageUrl: recipe.imageUrl ?? "",
  };
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

async function parseCecotecResponse(response: Response): Promise<unknown> {
  const rawText = await response.text();

  // 🚨 THE HOLY GRAIL: Find any unquoted 15+ digit number and wrap it in quotes
  // This turns {"recipeId": 2065088550414004226} into {"recipeId": "2065088550414004226"}
  const safeJsonText = rawText.replace(/:(\s*)(\d{15,})/g, ':$1"$2"');

  return JSON.parse(safeJsonText);
}

export async function createRecipe(
  token: string,
  recipe: CecotecRecipeInput,
  modelCode: string,
): Promise<{ recipeId: string; number: string }> {
  const body = buildRecipeBody(recipe, modelCode);

  const response = await fetch(
    `${CECOTEC_BASE_URL}/api/blade-cook/recipe/createRecipeApp/add`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new CecotecError(`Creation failed: HTTP ${response.status}`);
  }

  try {
    const cleanRawObject = await parseCecotecResponse(response);
    const envelope = parseCecotecEnvelope(cleanRawObject);
    const result = createRecipeResponseDataSchema.parse(envelope);

    // 💡 Return directly from inside the try block so 'result' is within scope
    return {
      recipeId: String(result.recipeId),
      number: String(result.number),
    };
  } catch (err) {
    if (err instanceof CecotecError) {
      throw err;
    }
    throw new CecotecError(
      err instanceof Error ? err.message : "Creation failed",
    );
  }
}

export async function listRecipes(
  token: string,
  userId: string,
  modelCode: string,
): Promise<CecotecRecipe[]> {
  const params = new URLSearchParams({
    userId,
    current: "1",
    size: "50",
    modleCode: modelCode,
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

export async function updateRecipe(
  token: string,
  recipeId: string,
  number: string,
  recipe: CecotecRecipeInput,
  modelCode: string,
): Promise<void> {
  // 1. Force back to draft state to register the changes
  const body = buildRecipeBody(recipe, modelCode, recipeId, number);

  const response = await fetch(
    `${CECOTEC_BASE_URL}/api/blade-cook/recipe/createRecipeApp/update`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new CecotecError(
      `Update (publish phase) failed: HTTP ${response.status}`,
    );
  }

  const responseBodyRaw = await response.json();
  try {
    parseCecotecEnvelope(responseBodyRaw);
  } catch (e) {
    throw new CecotecError(
      e instanceof Error ? e.message : "Update (publish phase) failed",
    );
  }
}

export async function getDevices(token: string): Promise<CecotecDevice[]> {
  const params = new URLSearchParams({
    sourceType: "1",
    code: "en",
  });

  // This endpoint uses Basic auth in Authorization but bearer token in blade-auth
  const response = await fetch(
    `${CECOTEC_BASE_URL}/api/blade-device/device/deviceBaseInfo?${params}`,
    {
      headers: {
        ...COMMON_HEADERS,
        authorization: OAUTH_BASIC_AUTH,
        "blade-auth": `bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new CecotecError(`Get devices failed: HTTP ${response.status}`);
  }

  const raw = await response.json();
  let envelopeData: unknown;
  try {
    envelopeData = parseCecotecEnvelope(raw);
  } catch (e) {
    throw new CecotecError(
      e instanceof Error ? e.message : "Get devices failed",
    );
  }

  return devicesResponseSchema.parse(envelopeData);
}

export type {
  CecotecAuthResult,
  CecotecDevice,
  CecotecIngredient,
  CecotecRecipe,
  CecotecRecipeInput,
  CecotecRecipeStep,
};
