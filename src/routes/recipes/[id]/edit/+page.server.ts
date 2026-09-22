import { type Actions, error, fail, redirect } from "@sveltejs/kit";
import { and, asc, eq } from "drizzle-orm";
import * as m from "$lib/paraglide/messages";
import { getLocale } from "$lib/paraglide/runtime";
import {
  calculateCookingTime,
  createRecipeFormSchema,
  parseFormDataToRecipe,
} from "$lib/recipe-validation";
import {
  getIngredientCatalog,
  getUnitCatalog,
} from "$lib/server/cecotec/catalog";
import { db } from "$lib/server/db";
import {
  cecotecCredentials,
  recipe,
  recipeIngredient,
  recipeStep,
} from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.session || !locals.user) {
    redirect(303, "/");
  }

  const userId = locals.user.id;
  const recipeId = params.id;

  const [recipeRow] = await db
    .select()
    .from(recipe)
    .where(and(eq(recipe.id, recipeId), eq(recipe.userId, userId)));

  if (!recipeRow) {
    error(404, m.error_recipe_not_found());
  }

  const [steps, ingredients, credentials] = await Promise.all([
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
      .where(eq(cecotecCredentials.userId, userId)),
  ]);
  const locale = getLocale();
  const lang: "en" | "es" = locale === "en" ? "en" : "es";

  const allIngredients = getIngredientCatalog().map((e) => ({
    id: e.id,
    name: (e[lang] || e.en || e.es) as string,
  }));

  const units = getUnitCatalog();

  return {
    recipe: {
      id: recipeRow.id,
      name: recipeRow.name,
      servings: recipeRow.servings,
      cookingTime: recipeRow.cookingTime,
      language: recipeRow.language,
      imageUrl: recipeRow.imageUrl,
      syncStatus: recipeRow.syncStatus,
      syncError: recipeRow.syncError,
      syncedAt: recipeRow.syncedAt?.toISOString() ?? null,
    },
    steps: steps.map((s) => ({
      id: s.id,
      sortOrder: s.sortOrder,
      description: s.description,
      operationType: s.operationType,
      totalTime: s.totalTime,
      speed: s.speed,
      temperature: s.temperature,
      power: s.power,
    })),
    ingredients: ingredients.map((i) => ({
      id: i.id,
      sortOrder: i.sortOrder,
      name: i.name,
      amount: i.amount,
      unit: i.unit,
      cecotecIngredientId: i.cecotecIngredientId,
      cecotecUnitId: i.cecotecUnitId,
    })),
    hasCecotecCredentials: credentials.length > 0,
    allIngredients,
    units,
  };
};
export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    if (!locals.session || !locals.user) {
      redirect(303, "/");
    }

    const recipeId = params.id;
    if (!recipeId) {
      error(400, m.error_missing_recipe_id());
    }

    const userId = locals.user.id;

    // Verify ownership before processing
    const [existing] = await db
      .select({ id: recipe.id })
      .from(recipe)
      .where(and(eq(recipe.id, recipeId), eq(recipe.userId, userId)));

    if (!existing) {
      error(404, m.error_recipe_not_found());
    }

    const formData = await request.formData();
    const raw = parseFormDataToRecipe(formData);
    const result = createRecipeFormSchema().safeParse(raw);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      return fail(400, {
        errors: fieldErrors,
        values: raw as Record<string, unknown>,
      });
    }

    const data = result.data;
    const cookingTime = calculateCookingTime(data.steps);
    const now = new Date();

    await db.transaction(async (tx) => {
      // 1. Update the main recipe data
      await tx
        .update(recipe)
        .set({
          name: data.name,
          servings: data.servings,
          cookingTime,
          language: data.language,
          imageUrl: data.imageUrl,
          syncStatus: "pending", // Resetting to pending since it was edited
          updatedAt: now,
        })
        .where(eq(recipe.id, recipeId));

      // 2. Clear out the old ingredients and steps
      await tx
        .delete(recipeIngredient)
        .where(eq(recipeIngredient.recipeId, recipeId));
      await tx.delete(recipeStep).where(eq(recipeStep.recipeId, recipeId));

      // 3. Insert the newly submitted ingredients and steps
      await Promise.all([
        ...data.ingredients.map((ing, index) =>
          tx.insert(recipeIngredient).values({
            id: crypto.randomUUID(),
            recipeId,
            sortOrder: index,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            cecotecIngredientId: ing.cecotecIngredientId ?? null,
            cecotecUnitId: ing.cecotecUnitId ?? null,
          }),
        ),
        ...data.steps.map((step, index) =>
          tx.insert(recipeStep).values({
            id: crypto.randomUUID(),
            recipeId,
            sortOrder: index,
            description: step.description,
            operationType: step.operationType,
            totalTime: step.totalTime,
            speed: step.speed,
            temperature: step.temperature,
            power: step.power,
          }),
        ),
      ]);
    });

    redirect(303, `/recipes/${recipeId}`);
  },
};
