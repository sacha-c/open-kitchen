import { error, fail, redirect } from "@sveltejs/kit";
import { and, asc, eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import {
  cecotecCredentials,
  recipe,
  recipeIngredient,
  recipeStep,
} from "$lib/server/db/schema";
import type { Actions, PageServerLoad } from "./$types";

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
    error(404, "Recipe not found");
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
    })),
    hasCecotecCredentials: credentials.length > 0,
  };
};

export const actions: Actions = {
  delete: async ({ locals, params }) => {
    if (!locals.session || !locals.user) {
      redirect(303, "/");
    }

    const userId = locals.user.id;
    const recipeId = params.id;

    const [recipeRow] = await db
      .select()
      .from(recipe)
      .where(eq(recipe.id, recipeId));

    if (!recipeRow || recipeRow.userId !== userId) {
      return fail(404, { message: "Recipe not found" });
    }

    await db.delete(recipe).where(eq(recipe.id, recipeId));

    redirect(303, "/recipes");
  },
};
