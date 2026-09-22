import { CecotecError } from "$lib/server/cecotec/client";
import type { CecotecRecipeDetail } from "$lib/server/cecotec/types";
import { speedEnum } from "$lib/server/db/schema";

type Speed = (typeof speedEnum.enumValues)[number];

// Cecotec's cookStep.speed is documented as "0"-"10" but isn't validated at
// the API boundary; fall back to "0" for anything outside our enum.
function toValidSpeed(speed: string): Speed {
  return (speedEnum.enumValues as readonly string[]).includes(speed)
    ? (speed as Speed)
    : "0";
}

export interface ImportedRecipeStep {
  sortOrder: number;
  description: string;
  operationType: number;
  totalTime: number;
  speed: Speed;
  temperature: number;
  power: number;
}

export interface ImportedRecipeIngredient {
  sortOrder: number;
  name: string;
  amount: string;
  unit: string;
  cecotecIngredientId: string;
  cecotecUnitId: string;
}

export interface ImportedRecipe {
  name: string;
  servings: string;
  cookingTime: number;
  imageUrl: string | null;
  steps: ImportedRecipeStep[];
  ingredients: ImportedRecipeIngredient[];
}

// Maps a Cecotec catalog recipe's detail response into the shape used to
// insert a local recipe/recipeStep/recipeIngredient row. This is the inverse
// of transformRecipeForCecotec in sync/engine.ts, but the detail endpoint
// uses different field names than the write side (see AGENTS.md).
export function mapCatalogDetailToImportedRecipe(
  detail: CecotecRecipeDetail,
  preferredLocale: string,
): ImportedRecipe {
  const relation =
    detail.multiLanguageRelations.find((r) => r.code === preferredLocale) ??
    detail.multiLanguageRelations[0];

  if (!relation) {
    throw new CecotecError("Recipe has no translation data available");
  }

  return {
    name: relation.name || detail.defaultName,
    servings: detail.serviceSize,
    cookingTime: Math.round(detail.cookingTime),
    imageUrl: detail.landscapeImageUrl ?? null,
    steps: relation.recipeDeviceParameterDtos.map((step, index) => {
      const cookStep = step.cookSteps[0];
      return {
        sortOrder: index,
        description: step.stepDesc,
        operationType: step.operationType,
        totalTime: Math.round(step.singleTotalTime),
        speed: toValidSpeed(cookStep?.speed ?? "0"),
        temperature: cookStep?.temperature ?? 0,
        power: cookStep?.power ?? 0,
      };
    }),
    ingredients: (relation.ingredientsRelationVosList ?? []).map(
      (ing, index) => ({
        sortOrder: index,
        name: ing.foodIngredient,
        amount: ing.amount,
        unit: ing.unit,
        cecotecIngredientId: ing.ingredientId,
        cecotecUnitId: ing.unitId,
      }),
    ),
  };
}
