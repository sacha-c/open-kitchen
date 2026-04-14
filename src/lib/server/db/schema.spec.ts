import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  cecotecCredentials,
  recipe,
  recipeIngredient,
  recipeStep,
} from "./schema";

describe("schema tables exist", () => {
  it("exports cecotecCredentials table", () => {
    expect(cecotecCredentials).toBeDefined();
  });

  it("exports recipe table", () => {
    expect(recipe).toBeDefined();
  });

  it("exports recipeStep table", () => {
    expect(recipeStep).toBeDefined();
  });

  it("exports recipeIngredient table", () => {
    expect(recipeIngredient).toBeDefined();
  });
});

describe("cecotecCredentials columns", () => {
  it("has all required columns", () => {
    expect(cecotecCredentials.id).toBeDefined();
    expect(cecotecCredentials.userId).toBeDefined();
    expect(cecotecCredentials.email).toBeDefined();
    expect(cecotecCredentials.encryptedPassword).toBeDefined();
    expect(cecotecCredentials.cecotecUserId).toBeDefined();
    expect(cecotecCredentials.createdAt).toBeDefined();
    expect(cecotecCredentials.updatedAt).toBeDefined();
  });

  it("id is the primary key", () => {
    expect(cecotecCredentials.id.primary).toBe(true);
  });

  it("encryptedPassword is not nullable", () => {
    expect(cecotecCredentials.encryptedPassword.notNull).toBe(true);
  });

  it("cecotecUserId is nullable", () => {
    expect(cecotecCredentials.cecotecUserId.notNull).toBeFalsy();
  });

  it("userId FK references user with cascade delete", () => {
    const { foreignKeys } = getTableConfig(cecotecCredentials);
    const fk = foreignKeys.find((f) =>
      f.reference().columns.some((c) => c.name === "user_id"),
    );
    expect(fk).toBeDefined();
    expect(fk?.onDelete).toBe("cascade");
    expect(fk?.reference().foreignColumns[0].name).toBe("id");
  });
});

describe("recipe columns", () => {
  it("has all required columns", () => {
    expect(recipe.id).toBeDefined();
    expect(recipe.userId).toBeDefined();
    expect(recipe.name).toBeDefined();
    expect(recipe.servings).toBeDefined();
    expect(recipe.cookingTime).toBeDefined();
    expect(recipe.language).toBeDefined();
    expect(recipe.imageUrl).toBeDefined();
    expect(recipe.cecotecRecipeId).toBeDefined();
    expect(recipe.cecotecNumber).toBeDefined();
    expect(recipe.syncStatus).toBeDefined();
    expect(recipe.syncError).toBeDefined();
    expect(recipe.syncedAt).toBeDefined();
    expect(recipe.createdAt).toBeDefined();
    expect(recipe.updatedAt).toBeDefined();
  });

  it("syncStatus defaults to 'pending'", () => {
    expect(recipe.syncStatus.default).toBe("pending");
  });

  it("servings defaults to '2'", () => {
    expect(recipe.servings.default).toBe("2");
  });

  it("language defaults to 'en'", () => {
    expect(recipe.language.default).toBe("en");
  });

  it("syncedAt is nullable", () => {
    expect(recipe.syncedAt.notNull).toBeFalsy();
  });

  it("userId FK references user with cascade delete", () => {
    const { foreignKeys } = getTableConfig(recipe);
    const fk = foreignKeys.find((f) =>
      f.reference().columns.some((c) => c.name === "user_id"),
    );
    expect(fk).toBeDefined();
    expect(fk?.onDelete).toBe("cascade");
    expect(fk?.reference().foreignColumns[0].name).toBe("id");
  });
});

describe("recipeStep columns", () => {
  it("has all required columns", () => {
    expect(recipeStep.id).toBeDefined();
    expect(recipeStep.recipeId).toBeDefined();
    expect(recipeStep.sortOrder).toBeDefined();
    expect(recipeStep.description).toBeDefined();
    expect(recipeStep.operationType).toBeDefined();
    expect(recipeStep.totalTime).toBeDefined();
    expect(recipeStep.speed).toBeDefined();
    expect(recipeStep.temperature).toBeDefined();
    expect(recipeStep.power).toBeDefined();
    expect(recipeStep.imageUrl).toBeDefined();
    expect(recipeStep.videoUrl).toBeDefined();
  });

  it("totalTime defaults to 0", () => {
    expect(recipeStep.totalTime.default).toBe(0);
  });

  it("speed defaults to '0'", () => {
    expect(recipeStep.speed.default).toBe("0");
  });

  it("temperature defaults to 0", () => {
    expect(recipeStep.temperature.default).toBe(0);
  });

  it("power defaults to 0", () => {
    expect(recipeStep.power.default).toBe(0);
  });

  it("imageUrl and videoUrl are nullable", () => {
    expect(recipeStep.imageUrl.notNull).toBeFalsy();
    expect(recipeStep.videoUrl.notNull).toBeFalsy();
  });

  it("recipeId FK references recipe with cascade delete", () => {
    const { foreignKeys } = getTableConfig(recipeStep);
    const fk = foreignKeys.find((f) =>
      f.reference().columns.some((c) => c.name === "recipe_id"),
    );
    expect(fk).toBeDefined();
    expect(fk?.onDelete).toBe("cascade");
    expect(fk?.reference().foreignColumns[0].name).toBe("id");
  });
});

describe("recipeIngredient columns", () => {
  it("has all required columns", () => {
    expect(recipeIngredient.id).toBeDefined();
    expect(recipeIngredient.recipeId).toBeDefined();
    expect(recipeIngredient.sortOrder).toBeDefined();
    expect(recipeIngredient.name).toBeDefined();
    expect(recipeIngredient.amount).toBeDefined();
    expect(recipeIngredient.unit).toBeDefined();
    expect(recipeIngredient.cecotecIngredientId).toBeDefined();
    expect(recipeIngredient.cecotecUnitId).toBeDefined();
  });

  it("cecotecIngredientId and cecotecUnitId are nullable", () => {
    expect(recipeIngredient.cecotecIngredientId.notNull).toBeFalsy();
    expect(recipeIngredient.cecotecUnitId.notNull).toBeFalsy();
  });

  it("name, amount, unit are not nullable", () => {
    expect(recipeIngredient.name.notNull).toBe(true);
    expect(recipeIngredient.amount.notNull).toBe(true);
    expect(recipeIngredient.unit.notNull).toBe(true);
  });

  it("recipeId FK references recipe with cascade delete", () => {
    const { foreignKeys } = getTableConfig(recipeIngredient);
    const fk = foreignKeys.find((f) =>
      f.reference().columns.some((c) => c.name === "recipe_id"),
    );
    expect(fk).toBeDefined();
    expect(fk?.onDelete).toBe("cascade");
    expect(fk?.reference().foreignColumns[0].name).toBe("id");
  });
});
