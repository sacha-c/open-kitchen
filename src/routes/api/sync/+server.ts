import { error, json } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import { recipe } from "$lib/server/db/schema";
import { syncAllPending, syncRecipe } from "$lib/server/sync/engine";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.session || !locals.user) {
    error(401, "Unauthorized");
  }

  const userId = locals.user.id;
  const body = (await request.json().catch(() => ({}))) as {
    recipeId?: string;
  };
  const { recipeId } = body;

  if (recipeId) {
    const [recipeRow] = await db
      .select({ id: recipe.id })
      .from(recipe)
      .where(and(eq(recipe.id, recipeId), eq(recipe.userId, userId)));

    if (!recipeRow) {
      error(403, "Recipe not found");
    }

    const result = await syncRecipe(recipeId);
    return json({ success: result.status === "synced", results: [result] });
  }

  const results = await syncAllPending(userId);
  return json({
    success: results.every((r) => r.status === "synced"),
    results,
  });
};
