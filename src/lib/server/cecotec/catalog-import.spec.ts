import { describe, expect, it } from "vitest";
import { CecotecError } from "$lib/server/cecotec/client";
import type { CecotecRecipeDetail } from "$lib/server/cecotec/types";
import { mapCatalogDetailToImportedRecipe } from "./catalog-import";

function buildDetail(
  overrides: Partial<CecotecRecipeDetail> = {},
): CecotecRecipeDetail {
  return {
    id: "2086775324330119169",
    number: "85037",
    defaultName: "Summer cannelloni",
    serviceSize: "5",
    cookingTime: 1701,
    landscapeImageUrl: "https://x/soup.jpg",
    multiLanguageRelations: [
      {
        code: "en",
        name: "Summer cannelloni",
        recipeDeviceParameterDtos: [
          {
            stepDesc: "Put the blades in place.",
            operationType: 1,
            singleTotalTime: 0,
            cookSteps: [
              {
                time: 0,
                power: 0,
                speed: "0",
                temperature: 0,
                accessoriesType: -1,
                reel: "",
              },
            ],
          },
          {
            stepDesc: "Cook everything.",
            operationType: 2,
            singleTotalTime: 1701,
            cookSteps: [
              {
                time: 1701,
                power: 5,
                speed: "3",
                temperature: 100,
                accessoriesType: -1,
                reel: "",
              },
            ],
          },
        ],
        ingredientsRelationVosList: [
          {
            ingredientId: "1473608053080961025",
            foodIngredient: "Carrot",
            unitId: "1468065253094465538",
            unit: "g",
            amount: "100",
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("mapCatalogDetailToImportedRecipe", () => {
  it("maps top-level fields", () => {
    const result = mapCatalogDetailToImportedRecipe(buildDetail(), "en");

    expect(result.name).toBe("Summer cannelloni");
    expect(result.servings).toBe("5");
    expect(result.cookingTime).toBe(1701);
    expect(result.imageUrl).toBe("https://x/soup.jpg");
  });

  it("rounds fractional cookingTime and step totalTime", () => {
    const detail = buildDetail({ cookingTime: 1701.4 });
    detail.multiLanguageRelations[0].recipeDeviceParameterDtos[0].singleTotalTime = 59.6;

    const result = mapCatalogDetailToImportedRecipe(detail, "en");

    expect(result.cookingTime).toBe(1701);
    expect(result.steps[0].totalTime).toBe(60);
  });

  it("maps steps using the single cookSteps[0] entry", () => {
    const result = mapCatalogDetailToImportedRecipe(buildDetail(), "en");

    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]).toMatchObject({
      sortOrder: 0,
      description: "Put the blades in place.",
      operationType: 1,
      speed: "0",
      temperature: 0,
      power: 0,
    });
    expect(result.steps[1]).toMatchObject({
      sortOrder: 1,
      description: "Cook everything.",
      operationType: 2,
      speed: "3",
      temperature: 100,
      power: 5,
    });
  });

  it("maps ingredients, renaming fields to the local shape", () => {
    const result = mapCatalogDetailToImportedRecipe(buildDetail(), "en");

    expect(result.ingredients).toEqual([
      {
        sortOrder: 0,
        name: "Carrot",
        amount: "100",
        unit: "g",
        cecotecIngredientId: "1473608053080961025",
        cecotecUnitId: "1468065253094465538",
      },
    ]);
  });

  it("returns an empty ingredients array when ingredientsRelationVosList is absent", () => {
    const detail = buildDetail();
    detail.multiLanguageRelations[0].ingredientsRelationVosList = undefined;

    const result = mapCatalogDetailToImportedRecipe(detail, "en");

    expect(result.ingredients).toEqual([]);
  });

  it("prefers the relation matching the requested locale", () => {
    const detail = buildDetail({
      multiLanguageRelations: [
        {
          code: "es",
          name: "Canelones de verano",
          recipeDeviceParameterDtos: [],
          ingredientsRelationVosList: [],
        },
        {
          code: "en",
          name: "Summer cannelloni (EN)",
          recipeDeviceParameterDtos: [],
          ingredientsRelationVosList: [],
        },
      ],
    });

    const result = mapCatalogDetailToImportedRecipe(detail, "en");

    expect(result.name).toBe("Summer cannelloni (EN)");
  });

  it("falls back to the first relation when the requested locale is absent", () => {
    const detail = buildDetail({
      multiLanguageRelations: [
        {
          code: "pl",
          name: "Polish name",
          recipeDeviceParameterDtos: [],
          ingredientsRelationVosList: [],
        },
      ],
    });

    const result = mapCatalogDetailToImportedRecipe(detail, "en");

    expect(result.name).toBe("Polish name");
  });

  it("throws CecotecError when there are no translations at all", () => {
    const detail = buildDetail({ multiLanguageRelations: [] });

    expect(() => mapCatalogDetailToImportedRecipe(detail, "en")).toThrow(
      CecotecError,
    );
  });
});
