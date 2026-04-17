import { describe, expect, it } from "vitest";
import {
  calculateCookingTime,
  parseFormDataToRecipe,
  recipeFormSchema,
} from "$lib/recipe-validation";

describe("recipeFormSchema", () => {
  const validRecipe = {
    name: "Test Recipe",
    servings: "4",
    language: "en" as const,
    ingredients: [{ name: "Butter", amount: "50", unit: "g" }],
    steps: [
      {
        description: "Mix everything",
        operationType: 1,
        time: 0,
        speed: "0",
        temperature: 0,
        power: 0,
      },
    ],
  };

  it("accepts a valid recipe", () => {
    const result = recipeFormSchema.safeParse(validRecipe);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = recipeFormSchema.safeParse({ ...validRecipe, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find((i) =>
        i.path.includes("name"),
      );
      expect(nameError).toBeDefined();
    }
  });

  it("rejects name longer than 200 chars", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      name: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty servings", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      servings: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid language", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      language: "fr",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid languages", () => {
    for (const lang of ["en", "es", "ca"]) {
      const result = recipeFormSchema.safeParse({
        ...validRecipe,
        language: lang,
      });
      expect(result.success).toBe(true);
    }
  });

  it("requires at least one step", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      steps: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const stepsError = result.error.issues.find((i) => i.path[0] === "steps");
      expect(stepsError).toBeDefined();
    }
  });

  it("allows empty ingredients array", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      ingredients: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects step description longer than 1000 chars", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      steps: [
        {
          description: "a".repeat(1001),
          operationType: 1,
          time: 0,
          speed: "0",
          temperature: 0,
          power: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid operationType", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      steps: [
        {
          description: "Do something",
          operationType: 5,
          time: 0,
          speed: "0",
          temperature: 0,
          power: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("requires time >= 1 for cooking steps (operationType 2)", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      steps: [
        {
          description: "Cook",
          operationType: 2,
          time: 0,
          speed: "5",
          temperature: 100,
          power: 5,
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const timeError = result.error.issues.find((i) =>
        i.path.includes("time"),
      );
      expect(timeError).toBeDefined();
    }
  });

  it("accepts time = 0 for non-cooking steps", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      steps: [
        {
          description: "Manual step",
          operationType: 0,
          time: 0,
          speed: "0",
          temperature: 0,
          power: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects cooking time > 5400", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      steps: [
        {
          description: "Cook forever",
          operationType: 2,
          time: 5401,
          speed: "5",
          temperature: 100,
          power: 5,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects temperature > 200", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      steps: [
        {
          description: "Cook",
          operationType: 2,
          time: 60,
          speed: "5",
          temperature: 201,
          power: 5,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects power > 10", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      steps: [
        {
          description: "Cook",
          operationType: 2,
          time: 60,
          speed: "5",
          temperature: 100,
          power: 11,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects ingredient with empty name", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      ingredients: [{ name: "", amount: "50", unit: "g" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects ingredient with empty amount", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      ingredients: [{ name: "Butter", amount: "", unit: "g" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects ingredient with empty unit", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      ingredients: [{ name: "Butter", amount: "50", unit: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("coerces string numbers for step fields", () => {
    const result = recipeFormSchema.safeParse({
      ...validRecipe,
      steps: [
        {
          description: "Cook",
          operationType: "2",
          time: "60",
          speed: "5",
          temperature: "100",
          power: "5",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps[0].operationType).toBe(2);
      expect(result.data.steps[0].time).toBe(60);
      expect(result.data.steps[0].temperature).toBe(100);
      expect(result.data.steps[0].power).toBe(5);
    }
  });
});

describe("calculateCookingTime", () => {
  it("sums up all step times", () => {
    const steps = [
      {
        description: "a",
        operationType: 2,
        time: 60,
        speed: "5",
        temperature: 100,
        power: 5,
      },
      {
        description: "b",
        operationType: 1,
        time: 30,
        speed: "0",
        temperature: 0,
        power: 0,
      },
      {
        description: "c",
        operationType: 2,
        time: 120,
        speed: "3",
        temperature: 80,
        power: 3,
      },
    ];
    expect(calculateCookingTime(steps)).toBe(210);
  });

  it("returns 0 for empty steps", () => {
    expect(calculateCookingTime([])).toBe(0);
  });

  it("handles steps with time = 0", () => {
    const steps = [
      {
        description: "a",
        operationType: 0,
        time: 0,
        speed: "0",
        temperature: 0,
        power: 0,
      },
    ];
    expect(calculateCookingTime(steps)).toBe(0);
  });
});

describe("parseFormDataToRecipe", () => {
  it("parses flat form data into nested structure", () => {
    const fd = new FormData();
    fd.set("name", "My Recipe");
    fd.set("servings", "4");
    fd.set("language", "es");
    fd.set("ingredients[0].name", "Butter");
    fd.set("ingredients[0].amount", "50");
    fd.set("ingredients[0].unit", "g");
    fd.set("ingredients[1].name", "Flour");
    fd.set("ingredients[1].amount", "200");
    fd.set("ingredients[1].unit", "g");
    fd.set("steps[0].description", "Mix well");
    fd.set("steps[0].operationType", "1");
    fd.set("steps[0].time", "0");
    fd.set("steps[0].speed", "0");
    fd.set("steps[0].temperature", "0");
    fd.set("steps[0].power", "0");

    const result = parseFormDataToRecipe(fd);
    expect(result).toEqual({
      name: "My Recipe",
      servings: "4",
      language: "es",
      ingredients: [
        { name: "Butter", amount: "50", unit: "g" },
        { name: "Flour", amount: "200", unit: "g" },
      ],
      steps: [
        {
          description: "Mix well",
          operationType: "1",
          time: "0",
          speed: "0",
          temperature: "0",
          power: "0",
        },
      ],
    });
  });

  it("returns empty arrays when no ingredients or steps", () => {
    const fd = new FormData();
    fd.set("name", "Empty");
    fd.set("servings", "1");
    fd.set("language", "en");

    const result = parseFormDataToRecipe(fd) as Record<string, unknown>;
    expect(result.ingredients).toEqual([]);
    expect(result.steps).toEqual([]);
  });

  it("handles missing fields with empty strings", () => {
    const fd = new FormData();
    const result = parseFormDataToRecipe(fd) as Record<string, unknown>;
    expect(result.name).toBe("");
    expect(result.servings).toBe("");
    expect(result.language).toBe("");
  });
});
