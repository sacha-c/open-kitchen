import { fail, redirect } from "@sveltejs/kit";
import {
  calculateCookingTime,
  parseFormDataToRecipe,
  recipeFormSchema,
} from "$lib/recipe-validation";
import { db } from "$lib/server/db";
import { recipe, recipeIngredient, recipeStep } from "$lib/server/db/schema";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.session) {
    redirect(303, "/");
  }
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
    const now = new Date();

    await db.batch([
      db.insert(recipe).values({
        id: recipeId,
        userId: locals.user.id,
        name: data.name,
        servings: data.servings,
        cookingTime,
        language: data.language,
        syncStatus: "pending",
        createdAt: now,
        updatedAt: now,
      }),
      ...data.ingredients.map((ing, index) =>
        db.insert(recipeIngredient).values({
          id: crypto.randomUUID(),
          recipeId,
          sortOrder: index,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
        }),
      ),
      ...data.steps.map((step, index) =>
        db.insert(recipeStep).values({
          id: crypto.randomUUID(),
          recipeId,
          sortOrder: index,
          description: step.description,
          operationType: step.operationType,
          totalTime: step.time,
          speed: String(step.speed),
          temperature: step.temperature,
          power: step.power,
        }),
      ),
    ]);

    redirect(303, `/recipes/${recipeId}`);
  },
};
