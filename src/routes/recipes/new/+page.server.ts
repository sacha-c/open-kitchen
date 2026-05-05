import { fail, redirect } from "@sveltejs/kit";
import { getLocale } from "$lib/paraglide/runtime";
import {
  calculateCookingTime,
  parseFormDataToRecipe,
  recipeFormSchema,
} from "$lib/recipe-validation";
import {
  getIngredientCatalog,
  getUnitCatalog,
} from "$lib/server/cecotec/catalog";
import { db } from "$lib/server/db";
import { recipe, recipeIngredient, recipeStep } from "$lib/server/db/schema";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.session) {
    redirect(303, "/");
  }

  const locale = getLocale();
  // Cecotec catalog has no Catalan translations — fall back to Spanish
  const lang: "en" | "es" = locale === "en" ? "en" : "es";

  const ingredients = getIngredientCatalog().map((e) => ({
    id: e.id,
    name: (e[lang] || e.en || e.es) as string,
  }));

  const units = getUnitCatalog();

  return { ingredients, units };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.session || !locals.user) {
      redirect(303, "/");
    }

    const formData = await request.formData();
    const raw = parseFormDataToRecipe(formData);
    const result = recipeFormSchema.safeParse(raw);

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
    const recipeId = crypto.randomUUID();
    const userId = locals.user.id;
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.insert(recipe).values({
        id: recipeId,
        userId,
        name: data.name,
        servings: data.servings,
        cookingTime,
        language: data.language,
        syncStatus: "pending",
        createdAt: now,
        updatedAt: now,
      });
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
