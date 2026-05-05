import { and, asc, eq } from "drizzle-orm";
import { lookupIngredientId, lookupUnitId } from "$lib/server/cecotec/catalog";
import {
  authenticate,
  CecotecError,
  createRecipe,
  deleteRecipe,
  updateRecipe,
  uploadImage,
} from "$lib/server/cecotec/client";
import type {
  CecotecIngredient,
  CecotecRecipeInput,
  CecotecRecipeStep,
} from "$lib/server/cecotec/types";
import { decrypt } from "$lib/server/crypto";
import { db } from "$lib/server/db";
import {
  cecotecCredentials,
  recipe,
  recipeIngredient,
  recipeStep,
} from "$lib/server/db/schema";

export interface SyncResult {
  recipeId: string;
  status: "synced" | "error";
  error?: string;
}

export function transformRecipeForCecotec(
  recipeData: {
    name: string;
    servings: string;
    cookingTime: number;
    language: string;
  },
  steps: Array<{
    sortOrder: number;
    description: string;
    operationType: number;
    totalTime: number;
    speed: string;
    temperature: number;
    power: number;
  }>,
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
    cecotecIngredientId: string | null;
    cecotecUnitId: string | null;
  }>,
  imageUrl?: string,
): CecotecRecipeInput {
  // Resolve each ingredient to its Cecotec IDs.
  // Use the stored cecotecIngredientId/cecotecUnitId if available, otherwise
  // look up by name/unit in the bundled catalog.
  const resolvedIngredients: CecotecIngredient[] = ingredients
    .map((ing) => {
      const foodIngredientsId =
        ing.cecotecIngredientId ||
        lookupIngredientId(ing.name, recipeData.language);
      const unitId = ing.cecotecUnitId || lookupUnitId(ing.unit);
      if (!foodIngredientsId || !unitId) return null;
      return {
        foodIngredientsId,
        unitId,
        amount: ing.amount,
        code: recipeData.language === "ca" ? "es" : recipeData.language,
      };
    })
    .filter((x): x is CecotecIngredient => x !== null);

  const mappedSteps: CecotecRecipeStep[] = steps.map((step) => ({
    stepDesc: step.description,
    operationType: step.operationType,
    singleTotalTime: step.totalTime,
    cookSteps: [
      {
        time: step.totalTime,
        power: step.power,
        speed: step.speed,
        temperature: step.temperature,
        accessoriesType: -1,
        reel: "",
      },
    ],
    accessoriesList: [],
    recipeFoodIngredients: [],
    introduceUrl: "",
    introduceUrls: [],
    videoUrl: "",
  }));

  return {
    name: recipeData.name,
    servings: recipeData.servings,
    cookingTime: recipeData.cookingTime,
    language: recipeData.language,
    imageUrl,
    steps: mappedSteps,
    ingredients: resolvedIngredients,
  };
}

async function fetchAndUploadImage(
  token: string,
  imageUrl: string,
): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new CecotecError(`Failed to fetch image: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const mimeType = contentType.split(";")[0].trim();
  const filename = imageUrl.split("/").pop()?.split("?")[0] ?? "image.jpg";
  return uploadImage(token, buffer, filename, mimeType);
}

export async function syncRecipe(recipeId: string): Promise<SyncResult> {
  const [recipeRow] = await db
    .select()
    .from(recipe)
    .where(eq(recipe.id, recipeId));

  if (!recipeRow) {
    return { recipeId, status: "error", error: `Recipe ${recipeId} not found` };
  }

  const [steps, ingredients, credentialsRows] = await Promise.all([
    db
      .select()
      .from(recipeStep)
      .where(eq(recipeStep.recipeId, recipeId))
      .orderBy(asc(recipeStep.sortOrder)),
    db
      .select()
      .from(recipeIngredient)
      .where(eq(recipeIngredient.recipeId, recipeId))
      .orderBy(asc(recipeIngredient.sortOrder)),
    db
      .select()
      .from(cecotecCredentials)
      .where(eq(cecotecCredentials.userId, recipeRow.userId)),
  ]);

  const creds = credentialsRows[0];
  if (!creds) {
    const errorMsg = "No Cecotec credentials configured";
    await db
      .update(recipe)
      .set({ syncStatus: "error", syncError: errorMsg })
      .where(eq(recipe.id, recipeId));
    return { recipeId, status: "error", error: errorMsg };
  }

  try {
    const decryptedPassword = decrypt(creds.encryptedPassword);
    const { accessToken } = await authenticate(creds.email, decryptedPassword);

    let cecotecImageUrl: string | undefined;
    if (recipeRow.imageUrl) {
      cecotecImageUrl = await fetchAndUploadImage(
        accessToken,
        recipeRow.imageUrl,
      );
    }

    const cecotecInput = transformRecipeForCecotec(
      {
        name: recipeRow.name,
        servings: recipeRow.servings,
        cookingTime: recipeRow.cookingTime,
        language: recipeRow.language,
      },
      steps,
      ingredients,
      cecotecImageUrl,
    );

    let cecotecRecipeId: string;
    let cecotecNumber: string;

    if (recipeRow.cecotecRecipeId && recipeRow.cecotecNumber) {
      // Update-in-place (primary strategy, verified in issue #9).
      // Fall back to delete+recreate if update fails.
      try {
        await updateRecipe(
          accessToken,
          recipeRow.cecotecRecipeId,
          recipeRow.cecotecNumber,
          cecotecInput,
        );
        cecotecRecipeId = recipeRow.cecotecRecipeId;
        cecotecNumber = recipeRow.cecotecNumber;
      } catch {
        await deleteRecipe(accessToken, recipeRow.cecotecRecipeId);
        const result = await createRecipe(accessToken, cecotecInput);
        cecotecRecipeId = result.recipeId;
        cecotecNumber = result.number;
      }
    } else {
      const result = await createRecipe(accessToken, cecotecInput);
      cecotecRecipeId = result.recipeId;
      cecotecNumber = result.number;
    }

    await db
      .update(recipe)
      .set({
        syncStatus: "synced",
        syncError: null,
        cecotecRecipeId,
        cecotecNumber,
        syncedAt: new Date(),
      })
      .where(eq(recipe.id, recipeId));

    return { recipeId, status: "synced" };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown sync error";
    await db
      .update(recipe)
      .set({ syncStatus: "error", syncError: errorMessage })
      .where(eq(recipe.id, recipeId));
    return { recipeId, status: "error", error: errorMessage };
  }
}

export async function syncAllPending(userId: string): Promise<SyncResult[]> {
  const pendingRecipes = await db
    .select({ id: recipe.id })
    .from(recipe)
    .where(and(eq(recipe.userId, userId), eq(recipe.syncStatus, "pending")));

  const settled = await Promise.allSettled(
    pendingRecipes.map((r) => syncRecipe(r.id)),
  );

  return settled.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      recipeId: pendingRecipes[i].id,
      status: "error" as const,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : "Unknown error",
    };
  });
}
