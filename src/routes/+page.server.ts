import { fail, redirect } from "@sveltejs/kit";
import { count, desc, eq, inArray } from "drizzle-orm";
import { auth } from "$lib/server/auth";
import { db } from "$lib/server/db";
import { cecotecCredentials, recipe, recipeStep } from "$lib/server/db/schema";
import type { Actions, PageServerLoad } from "./$types";

const RECENT_RECIPES_LIMIT = 3;

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    return {
      user: null,
      recentRecipes: [],
      recipeCount: 0,
      hasCecotecCredentials: false,
    };
  }

  const userId = locals.user.id;

  const [recentRecipeRows, [{ recipeCount }], credentials] = await Promise.all([
    db
      .select()
      .from(recipe)
      .where(eq(recipe.userId, userId))
      .orderBy(desc(recipe.createdAt))
      .limit(RECENT_RECIPES_LIMIT),
    db
      .select({ recipeCount: count() })
      .from(recipe)
      .where(eq(recipe.userId, userId)),
    db
      .select({ id: cecotecCredentials.id })
      .from(cecotecCredentials)
      .where(eq(cecotecCredentials.userId, userId)),
  ]);

  const stepCountRows = recentRecipeRows.length
    ? await db
        .select({
          recipeId: recipeStep.recipeId,
          count: count(),
        })
        .from(recipeStep)
        .where(
          inArray(
            recipeStep.recipeId,
            recentRecipeRows.map((r) => r.id),
          ),
        )
        .groupBy(recipeStep.recipeId)
    : [];
  const stepCounts: Record<string, number> = {};
  for (const row of stepCountRows) {
    stepCounts[row.recipeId] = row.count;
  }

  return {
    user: locals.user,
    recentRecipes: recentRecipeRows.map((r) => ({
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
    recipeCount,
    hasCecotecCredentials: credentials.length > 0,
  };
};

export const actions: Actions = {
  signin: async ({ request }) => {
    const formData = await request.formData();
    const email = (formData.get("email") || "").toString().trim();
    const password = (formData.get("password") || "").toString();
    const errors: Record<string, string> = {};

    if (!/^[\w-.+]+@([\w-]+\.)+[\w-]{2,8}$/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }
    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, email });
    }

    const response = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });
    if (!response.ok) {
      return fail(400, {
        email,
        message: "Invalid email or password.",
      });
    }

    redirect(303, "/");
  },

  signout: async ({ request }) => {
    await auth.api.signOut({
      headers: request.headers,
    });
    redirect(303, "/");
  },
};
