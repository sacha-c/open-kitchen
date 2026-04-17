import { z } from "zod";

export const ingredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required").max(200),
  amount: z.string().min(1, "Amount is required"),
  unit: z.string().min(1, "Unit is required"),
});

export const stepSchema = z
  .object({
    description: z
      .string()
      .min(1, "Step description is required")
      .max(1000, "Description must be 1000 characters or less"),
    operationType: z.coerce
      .number()
      .int()
      .refine((v) => v === 0 || v === 1 || v === 2, {
        message: "Invalid step type",
      }),
    time: z.coerce.number().int().min(0).max(5400).default(0),
    speed: z.string().default("0"),
    temperature: z.coerce.number().int().min(0).max(200).default(0),
    power: z.coerce.number().int().min(0).max(10).default(0),
  })
  .superRefine((step, ctx) => {
    if (step.operationType === 2) {
      if (step.time < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cooking time must be at least 1 second",
          path: ["time"],
        });
      }
    }
  });

export const recipeFormSchema = z.object({
  name: z
    .string()
    .min(1, "Recipe name is required")
    .max(200, "Name must be 200 characters or less"),
  servings: z.string().min(1, "Servings is required"),
  language: z.enum(["en", "es", "ca"]),
  ingredients: z.array(ingredientSchema),
  steps: z.array(stepSchema).min(1, "At least one step is required"),
});

export type RecipeFormData = z.infer<typeof recipeFormSchema>;
export type IngredientFormData = z.infer<typeof ingredientSchema>;
export type StepFormData = z.infer<typeof stepSchema>;

export function calculateCookingTime(
  steps: Pick<StepFormData, "time">[],
): number {
  return steps.reduce((total, step) => total + (step.time || 0), 0);
}

/**
 * Parse flat form data (from FormData) into the nested structure expected by recipeFormSchema.
 */
export function parseFormDataToRecipe(formData: FormData): unknown {
  const name = formData.get("name")?.toString() ?? "";
  const servings = formData.get("servings")?.toString() ?? "";
  const language = formData.get("language")?.toString() ?? "";

  const ingredients: Record<string, string>[] = [];
  const steps: Record<string, string>[] = [];

  // Parse ingredients: ingredients[0].name, ingredients[0].amount, etc.
  let i = 0;
  while (formData.has(`ingredients[${i}].name`)) {
    ingredients.push({
      name: formData.get(`ingredients[${i}].name`)?.toString() ?? "",
      amount: formData.get(`ingredients[${i}].amount`)?.toString() ?? "",
      unit: formData.get(`ingredients[${i}].unit`)?.toString() ?? "",
    });
    i++;
  }

  // Parse steps: steps[0].description, steps[0].operationType, etc.
  let j = 0;
  while (formData.has(`steps[${j}].description`)) {
    steps.push({
      description: formData.get(`steps[${j}].description`)?.toString() ?? "",
      operationType:
        formData.get(`steps[${j}].operationType`)?.toString() ?? "0",
      time: formData.get(`steps[${j}].time`)?.toString() ?? "0",
      speed: formData.get(`steps[${j}].speed`)?.toString() ?? "0",
      temperature: formData.get(`steps[${j}].temperature`)?.toString() ?? "0",
      power: formData.get(`steps[${j}].power`)?.toString() ?? "0",
    });
    j++;
  }

  return { name, servings, language, ingredients, steps };
}
