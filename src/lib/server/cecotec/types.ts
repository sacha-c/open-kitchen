import { z } from "zod";

// =============================================================================
// Input types (used when calling the API)
// =============================================================================

export const cecotecCookStepSchema = z.object({
  time: z.number(),
  power: z.number(),
  speed: z.string(),
  temperature: z.number(),
  accessoriesType: z.number(),
  reel: z.string(),
});

export const cecotecRecipeStepSchema = z.object({
  stepDesc: z.string(),
  operationType: z.number(),
  singleTotalTime: z.number(),
  cookSteps: z.array(cecotecCookStepSchema),
  accessoriesList: z.array(z.unknown()),
  recipeFoodIngredients: z.array(z.unknown()),
  introduceUrl: z.string(),
  introduceUrls: z.array(z.string()),
  videoUrl: z.string(),
});

// Format used by the official app: recipeFoodIngredientsDetailDtos
export const cecotecIngredientSchema = z.object({
  foodIngredientsId: z.string(),
  unitId: z.string(),
  amount: z.string(),
  code: z.string().default("en"),
});

export const cecotecRecipeInputSchema = z.object({
  name: z.string(),
  steps: z.array(cecotecRecipeStepSchema),
  cookingTime: z.number(),
  servings: z.string(),
  language: z.string(),
  ingredients: z.array(cecotecIngredientSchema).optional(),
  imageUrl: z.string().optional(),
});

// =============================================================================
// API response schemas (parsed at the network boundary)
// =============================================================================

// The Cecotec API wraps all responses in this envelope.
// code is either the string "200" or the number 200 on success.
const cecotecEnvelopeSchema = z.object({
  code: z.union([z.string(), z.number()]),
  msg: z.string().optional(),
  data: z.unknown(),
});

export const authResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user_id: z.string(),
});

export const createRecipeResponseDataSchema = z.object({
  recipeId: z.union([z.string(), z.number()]).transform(String),
  number: z.union([z.string(), z.number()]).transform(String),
});

export const cecotecRecipeSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  recipeId: z.union([z.string(), z.number()]).transform(String).optional(),
  number: z.union([z.string(), z.number()]).transform(String),
  defaultName: z.string(),
  serviceSize: z.string(),
  cookingTime: z.number(),
  language: z.string(),
  landscapeImageUrl: z.string().optional(),
});

export const listRecipesResponseDataSchema = z.object({
  records: z.array(cecotecRecipeSchema),
});

export const uploadImageResponseDataSchema = z.object({
  link: z.string(),
});

// Device linked to the user's Cecotec account.
// modleName is the model code used in recipe payloads (e.g. "MamboTouch").
export const cecotecDeviceSchema = z.object({
  modleName: z.string(),
  sn: z.string(),
  isOnline: z.number().optional(),
});

export const devicesResponseSchema = z.array(cecotecDeviceSchema);

// A recipe card from the public catalog listing.
// serviceSize is intentionally absent: the listing endpoint never populates it
// (only the detail endpoint does).
export const cecotecCatalogRecipeSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  number: z.union([z.string(), z.number()]).transform(String),
  defaultName: z.string(),
  landscapeImageUrl: z.string().optional(),
  cookingTime: z.number(),
  views: z.number().optional(),
  starAvg: z.union([z.string(), z.number()]).optional(),
  recipeCategoryIds: z
    .array(z.union([z.string(), z.number()]).transform(String))
    .optional(),
  recipeCategoryNames: z.array(z.string()).optional(),
});

export const catalogListResponseDataSchema = z.object({
  records: z.array(cecotecCatalogRecipeSchema),
  total: z.number(),
  pages: z.number(),
  size: z.number(),
  current: z.number(),
});

export const cecotecCategorySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  recipeCategoryName: z.string(),
  imageUrl: z.string().optional(),
});

export const categoriesResponseDataSchema = z.array(cecotecCategorySchema);

// Detail-endpoint shapes: the field names here differ from the write-side
// (creation) shapes above (e.g. ingredients use ingredientId/foodIngredient
// instead of foodIngredientsId/code), since this is what the API returns
// when reading a recipe back, not what it accepts when creating one.
export const cecotecDetailIngredientSchema = z.object({
  ingredientId: z.string(),
  foodIngredient: z.string(),
  unitId: z.string(),
  unit: z.string(),
  amount: z.string(),
});

export const cecotecDetailStepSchema = z.object({
  stepDesc: z.string(),
  operationType: z.number(),
  singleTotalTime: z.number(),
  cookSteps: z.array(cecotecCookStepSchema),
});

export const cecotecMultiLanguageRelationSchema = z.object({
  code: z.string(),
  name: z.string(),
  recipeDeviceParameterDtos: z.array(cecotecDetailStepSchema),
  ingredientsRelationVosList: z.array(cecotecDetailIngredientSchema).optional(),
});

export const recipeDetailResponseDataSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  number: z.union([z.string(), z.number()]).transform(String),
  defaultName: z.string(),
  serviceSize: z.string(),
  cookingTime: z.number(),
  landscapeImageUrl: z.string().optional(),
  multiLanguageRelations: z.array(cecotecMultiLanguageRelationSchema),
});

// =============================================================================
// Inferred TypeScript types
// =============================================================================

export type CecotecCookStep = z.infer<typeof cecotecCookStepSchema>;
export type CecotecRecipeStep = z.infer<typeof cecotecRecipeStepSchema>;
export type CecotecIngredient = z.infer<typeof cecotecIngredientSchema>;
export type CecotecRecipeInput = z.infer<typeof cecotecRecipeInputSchema>;
export type CecotecRecipe = z.infer<typeof cecotecRecipeSchema>;
export type CecotecDevice = z.infer<typeof cecotecDeviceSchema>;
export type CecotecCatalogRecipe = z.infer<typeof cecotecCatalogRecipeSchema>;
export type CecotecCatalogListResult = z.infer<
  typeof catalogListResponseDataSchema
>;
export type CecotecCategory = z.infer<typeof cecotecCategorySchema>;
export type CecotecDetailIngredient = z.infer<
  typeof cecotecDetailIngredientSchema
>;
export type CecotecDetailStep = z.infer<typeof cecotecDetailStepSchema>;
export type CecotecMultiLanguageRelation = z.infer<
  typeof cecotecMultiLanguageRelationSchema
>;
export type CecotecRecipeDetail = z.infer<
  typeof recipeDetailResponseDataSchema
>;

export interface CecotecAuthResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

// Helper: parse the common Cecotec envelope and throw on API-level errors.
export function parseCecotecEnvelope(raw: unknown): unknown {
  const envelope = cecotecEnvelopeSchema.parse(raw);
  if (envelope.code !== "200" && envelope.code !== 200) {
    throw new Error(envelope.msg ?? "Cecotec API error");
  }
  return envelope.data;
}
