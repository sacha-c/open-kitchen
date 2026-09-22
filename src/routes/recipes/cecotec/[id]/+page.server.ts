import { error, fail, redirect } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { getLocale } from "$lib/paraglide/runtime";
import { mapCatalogDetailToImportedRecipe } from "$lib/server/cecotec/catalog-import";
import { CecotecError, getRecipeDetail } from "$lib/server/cecotec/client";
import { getAuthenticatedCecotecSession } from "$lib/server/cecotec/session";
import { db } from "$lib/server/db";
import { recipe, recipeIngredient, recipeStep } from "$lib/server/db/schema";
import type { Actions, PageServerLoad } from "./$types";

function resolveLocale(): "en" | "es" {
  // Cecotec's catalog only has en/es content; ca falls back to es (same
  // mapping used elsewhere for Cecotec calls, e.g. transformRecipeForCecotec).
  return getLocale() === "en" ? "en" : "es";
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
  if (!locals.session || !locals.user) {
    redirect(303, "/");
  }

  const number = url.searchParams.get("number");
  if (!number) {
    error(400, "Missing recipe number");
  }

  const session = await getAuthenticatedCecotecSession(locals.user.id);
  if (!session) {
    redirect(303, "/recipes/cecotec");
  }

  const [existing] = await db
    .select({ id: recipe.id })
    .from(recipe)
    .where(
      and(
        eq(recipe.userId, locals.user.id),
        eq(recipe.importedFromCecotecNumber, number),
      ),
    );

  try {
    const locale = resolveLocale();
    const detail = await getRecipeDetail(
      session.accessToken,
      params.id,
      number,
      locale,
    );
    const mapped = mapCatalogDetailToImportedRecipe(detail, locale);

    return {
      error: null,
      number,
      importedRecipeId: existing?.id ?? null,
      recipe: {
        id: params.id,
        name: mapped.name,
        servings: mapped.servings,
        cookingTime: mapped.cookingTime,
        imageUrl: mapped.imageUrl,
        steps: mapped.steps,
        ingredients: mapped.ingredients,
      },
    };
  } catch (e) {
    if (e instanceof CecotecError) {
      return {
        error: e.message,
        number,
        importedRecipeId: existing?.id ?? null,
        recipe: null,
      };
    }
    throw e;
  }
};

export const actions: Actions = {
  import: async ({ request, params, locals }) => {
    if (!locals.session || !locals.user) {
      redirect(303, "/");
    }

    const formData = await request.formData();
    const number = formData.get("number")?.toString();
    if (!number) {
      return fail(400, { message: "Missing recipe number" });
    }

    const userId = locals.user.id;

    const [existing] = await db
      .select({ id: recipe.id })
      .from(recipe)
      .where(
        and(
          eq(recipe.userId, userId),
          eq(recipe.importedFromCecotecNumber, number),
        ),
      );

    if (existing) {
      redirect(303, `/recipes/${existing.id}`);
    }

    try {
      const session = await getAuthenticatedCecotecSession(userId);
      if (!session) {
        return fail(400, {
          message: "Connect your Cecotec account before importing recipes.",
        });
      }

      const locale = resolveLocale();
      const detail = await getRecipeDetail(
        session.accessToken,
        params.id,
        number,
        locale,
      );
      const mapped = mapCatalogDetailToImportedRecipe(detail, locale);

      const recipeId = crypto.randomUUID();
      const now = new Date();

      // syncStatus starts "pending", same as a manually-created recipe:
      // "Sync Now" will publish it as a brand new recipe under the user's
      // own account. We deliberately don't set cecotecRecipeId/cecotecNumber
      // to the catalog's id/number — those identify Cecotec's own catalog
      // entry, not anything owned by this user, so treating them as this
      // row's Cecotec identity broke sync (updateRecipe silently no-ops
      // against a recipe you don't own). importedFromCecotecNumber tracks
      // provenance separately and is never touched by the sync engine.
      await db.transaction(async (tx) => {
        await tx.insert(recipe).values({
          id: recipeId,
          userId,
          name: mapped.name,
          servings: mapped.servings,
          cookingTime: mapped.cookingTime,
          language: locale,
          imageUrl: mapped.imageUrl,
          importedFromCecotecNumber: number,
          syncStatus: "pending",
          createdAt: now,
          updatedAt: now,
        });
        await Promise.all([
          ...mapped.steps.map((step) =>
            tx
              .insert(recipeStep)
              .values({ id: crypto.randomUUID(), recipeId, ...step }),
          ),
          ...mapped.ingredients.map((ingredient) =>
            tx
              .insert(recipeIngredient)
              .values({ id: crypto.randomUUID(), recipeId, ...ingredient }),
          ),
        ]);
      });

      redirect(303, `/recipes/${recipeId}`);
    } catch (e) {
      if (e instanceof CecotecError) {
        return fail(400, { message: e.message });
      }
      throw e;
    }
  },
};
