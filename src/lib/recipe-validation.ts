import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import * as m from "$lib/paraglide/messages";
import { recipe, recipeIngredient, recipeStep } from "$lib/server/db/schema";

export function createIngredientSchema() {
  return createInsertSchema(recipeIngredient, {
    name: (schema) => schema.min(1, m.error_ingredient_name_required()),
    amount: (schema) => schema.min(1, m.error_amount_required()),
    unit: (schema) => schema.min(1, m.error_unit_required()),
  })
    .pick({
      name: true,
      amount: true,
      unit: true,
    })
    .extend({
      cecotecIngredientId: z.string().nullish(),
      cecotecUnitId: z.string().nullish(),
    });
}

export function createStepSchema() {
  return createInsertSchema(recipeStep, {
    description: (schema) => schema.min(1, m.error_step_description_required()),
    operationType: (schema) => schema.min(0).max(2),
    totalTime: (schema) => schema.min(0).max(5400),
    temperature: (schema) => schema.min(0).max(200),
    power: (schema) => schema.min(0).max(10),
  })
    .pick({
      description: true,
      operationType: true,
      totalTime: true,
      speed: true,
      temperature: true,
      power: true,
    })
    .superRefine((step, ctx) => {
      if (step.operationType === 2) {
        if (step.totalTime < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: m.error_cooking_time_min(),
            path: ["totalTime"],
          });
        }
      }
    });
}

export function createRecipeFormSchema() {
  return createInsertSchema(recipe, {
    name: (schema) => schema.min(1, m.error_recipe_name_required()),
    servings: (schema) => schema.min(1, m.error_servings_required()),
  })
    .pick({
      name: true,
      servings: true,
      language: true,
    })
    .extend({
      imageUrl: z.url(m.error_image_url_invalid()).nullable(),
      ingredients: z.array(createIngredientSchema()),
      steps: z.array(createStepSchema()),
    });
}

export type RecipeFormData = z.infer<ReturnType<typeof createRecipeFormSchema>>;
export type IngredientFormData = z.infer<ReturnType<typeof createIngredientSchema>>;
export type StepFormData = z.infer<ReturnType<typeof createStepSchema>>;

export function calculateCookingTime(
  steps: Pick<StepFormData, "totalTime">[],
): number {
  return steps.reduce((total, step) => total + (step.totalTime || 0), 0);
}

/**
 * Parse flat form data (from FormData) into the nested structure expected by recipeFormSchema.
 */
export function parseFormDataToRecipe(formData: FormData): unknown {
  const name = formData.get("name")?.toString() ?? "";
  const servings = formData.get("servings")?.toString() ?? "";
  const language = formData.get("language")?.toString() ?? "";
  const imageUrl = formData.get("imageUrl")?.toString() || null;

  const ingredients: Record<string, string | null>[] = [];
  const steps: Record<string, string | number>[] = [];

  // Parse ingredients: ingredients[0].name, ingredients[0].amount, etc.
  let i = 0;
  while (formData.has(`ingredients[${i}].name`)) {
    ingredients.push({
      name: formData.get(`ingredients[${i}].name`)?.toString() ?? "",
      amount: formData.get(`ingredients[${i}].amount`)?.toString() ?? "",
      unit: formData.get(`ingredients[${i}].unit`)?.toString() ?? "",
      cecotecIngredientId:
        formData.get(`ingredients[${i}].cecotecIngredientId`)?.toString() ||
        null,
      cecotecUnitId:
        formData.get(`ingredients[${i}].cecotecUnitId`)?.toString() || null,
    });
    i++;
  }

  // Parse steps: steps[0].description, steps[0].operationType, etc.
  let j = 0;
  while (formData.has(`steps[${j}].description`)) {
    steps.push({
      description: formData.get(`steps[${j}].description`)?.toString() ?? "",
      operationType: Number(formData.get(`steps[${j}].operationType`)) || 0,
      totalTime: Number(formData.get(`steps[${j}].totalTime`)) || 0,
      speed: formData.get(`steps[${j}].speed`)?.toString() ?? "0",
      temperature: Number(formData.get(`steps[${j}].temperature`)) || 0,
      power: Number(formData.get(`steps[${j}].power`)) || 0,
    });
    j++;
  }

  return { name, servings, language, imageUrl, ingredients, steps };
}
