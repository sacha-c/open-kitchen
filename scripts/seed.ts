import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import { reset, seed } from "drizzle-seed";
import postgres from "postgres";
import {
  account,
  recipe,
  recipeIngredient,
  recipeStep,
  session,
  user,
  verification,
} from "../src/lib/server/db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is not set");
}

const seedSchema = {
  user,
  session,
  account,
  verification,
  recipe,
  recipeStep,
  recipeIngredient,
};

const client = postgres(process.env.DATABASE_URL);
const db = drizzle({ client, schema: seedSchema });

const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema: seedSchema }),
  emailAndPassword: { enabled: true },
});

async function main() {
  console.log("Resetting database...");
  await reset(db, seedSchema);

  console.log("Seeding database...");
  await seed(db, seedSchema, { count: 5, seed: 42 }).refine((funcs) => ({
    user: {
      columns: {
        name: funcs.fullName(),
        email: funcs.email(),
        emailVerified: funcs.default({ defaultValue: true }),
        image: funcs.default({ defaultValue: null }),
      },
    },
    recipe: {
      columns: {
        name: funcs.valuesFromArray({
          values: [
            "Chicken Tikka Masala",
            "Classic Risotto",
            "Banana Bread",
            "Thai Green Curry",
            "Beef Stew",
            "Chocolate Mousse",
            "Gazpacho",
            "Pasta Carbonara",
            "Vegetable Stir-Fry",
            "French Onion Soup",
          ],
        }),
        servings: funcs.valuesFromArray({
          values: ["2", "4", "6", "8"],
        }),
        cookingTime: funcs.int({ minValue: 300, maxValue: 7200 }),
        language: funcs.valuesFromArray({
          values: ["en", "es", "ca"],
        }),
        imageUrl: funcs.default({ defaultValue: null }),
        cecotecRecipeId: funcs.default({ defaultValue: null }),
        cecotecNumber: funcs.default({ defaultValue: null }),
        syncStatus: funcs.valuesFromArray({
          values: ["pending", "synced", "error"],
        }),
        syncError: funcs.default({ defaultValue: null }),
        syncedAt: funcs.default({ defaultValue: null }),
      },
    },
    recipeStep: {
      count: 20,
      columns: {
        description: funcs.loremIpsum({ sentencesCount: 1 }),
        operationType: funcs.int({ minValue: 0, maxValue: 2 }),
        totalTime: funcs.int({ minValue: 30, maxValue: 600 }),
        speed: funcs.valuesFromArray({
          values: ["0", "1", "2", "3", "4", "5"],
        }),
        temperature: funcs.int({ minValue: 0, maxValue: 200 }),
        power: funcs.int({ minValue: 0, maxValue: 10 }),
        imageUrl: funcs.default({ defaultValue: null }),
        videoUrl: funcs.default({ defaultValue: null }),
      },
    },
    recipeIngredient: {
      count: 25,
      columns: {
        name: funcs.valuesFromArray({
          values: [
            "Chicken breast",
            "Onion",
            "Garlic",
            "Olive oil",
            "Salt",
            "Black pepper",
            "Rice",
            "Tomato",
            "Butter",
            "Flour",
            "Sugar",
            "Egg",
            "Milk",
            "Cream",
            "Parmesan",
            "Basil",
            "Carrot",
            "Potato",
            "Minced beef",
            "Coconut milk",
          ],
        }),
        amount: funcs.valuesFromArray({
          values: [
            "100",
            "200",
            "250",
            "500",
            "1",
            "2",
            "3",
            "50",
            "150",
            "300",
          ],
        }),
        unit: funcs.valuesFromArray({
          values: ["g", "ml", "tsp", "l", "kg", "un"],
        }),
        // Leave cecotec IDs null — the sync engine will resolve them via
        // catalog lookup by name at sync time. Storing random IDs here
        // would misalign names and IDs since drizzle-seed picks each
        // column independently.
        cecotecIngredientId: funcs.default({ defaultValue: null }),
        cecotecUnitId: funcs.default({ defaultValue: null }),
      },
    },
    // Skip auth-related tables
    session: { count: 0 },
    account: { count: 0 },
    verification: { count: 0 },
  }));

  console.log("Creating test user...");
  const testUser = await auth.api.signUpEmail({
    body: {
      email: "test@open-kitchen.com",
      password: "test1234",
      name: "OpenKitchen Tester",
    },
  });

  if (!testUser?.user?.id) {
    throw new Error("Failed to create test user");
  }

  // Reassign all seeded recipes to the test user so they're visible after login
  const { ne } = await import("drizzle-orm");
  await db
    .update(recipe)
    .set({ userId: testUser.user.id })
    .where(ne(recipe.userId, testUser.user.id));

  console.log("Seeding complete!");
  console.log("Test user: test@open-kitchen.com / test1234");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
