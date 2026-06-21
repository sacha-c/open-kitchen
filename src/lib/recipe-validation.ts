import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { recipe, recipeIngredient, recipeStep } from "$lib/server/db/schema";

export const ingredientSchema = createInsertSchema(recipeIngredient, {
  name: (schema) => schema.min(1, "Ingredient name is required"),
  amount: (schema) => schema.min(1, "Amount is required"),
  unit: (schema) => schema.min(1, "Unit is required"),
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

export const stepSchema = createInsertSchema(recipeStep, {
  description: (schema) => schema.min(1, "Step description is required"),
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
          message: "Cooking time must be at least 1 second",
          path: ["totalTime"],
        });
      }
    }
  });

export const recipeFormSchema = createInsertSchema(recipe, {
  name: (schema) => schema.min(1, "Recipe name is required"),
  servings: (schema) => schema.min(1, "Servings is required"),
})
  .pick({
    name: true,
    servings: true,
    language: true,
  })
  .extend({
    ingredients: z.array(ingredientSchema),
    steps: z.array(stepSchema),
  });

export type RecipeFormData = z.infer<typeof recipeFormSchema>;
export type IngredientFormData = z.infer<typeof ingredientSchema>;
export type StepFormData = z.infer<typeof stepSchema>;

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

  return { name, servings, language, ingredients, steps };
}
