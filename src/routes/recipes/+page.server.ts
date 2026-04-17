import { redirect } from "@sveltejs/kit";
import { count, desc, eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import { recipe, recipeStep } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.session) {
    redirect(303, "/");
  }

  const userId = locals.user?.id;
  if (!userId) {
    redirect(303, "/");
  }

  const recipes = await db
    .select()
    .from(recipe)
    .where(eq(recipe.userId, userId))
    .orderBy(desc(recipe.createdAt));

  const stepCountRows = await db
    .select({
      recipeId: recipeStep.recipeId,
      count: count(),
    })
    .from(recipeStep)
    .groupBy(recipeStep.recipeId);

  const stepCounts: Record<string, number> = {};
  for (const row of stepCountRows) {
    stepCounts[row.recipeId] = row.count;
  }

  return {
    recipes: recipes.map((r) => ({
      id: r.id,
      name: r.name,
      servings: r.servings,
      cookingTime: r.cookingTime,
      imageUrl: r.imageUrl,
      syncStatus: r.syncStatus,
      syncError: r.syncError,
      syncedAt: r.syncedAt?.toISOString() ?? null,
      stepCount: stepCounts[r.id] ?? 0,
    })),
  };
};
