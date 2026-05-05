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
        cecotecIngredientId: funcs.valuesFromArray({
          values: [
            "1473608032428208130", // Chicken breast
            "1473607867130687490", // Onion
            "1473607869659852802", // Garlic
            "1473607870851035137", // Olive oil
            "1473607860998615042", // Salt
            "1473608897893478401", // Black pepper
            "1473607994301984770", // Rice
            "1473608279825035265", // Tomato
            "1473607917542027265", // Butter
            "1473607890086113281", // Flour
            "1473607894062313473", // Sugar
            "1473607878086209538", // Egg
            "1473607895492571138", // Milk
            "1473608367704092673", // Cream
            "1473608145355649025", // Parmesan
            "1473608313534656514", // Basil
            "1473608053080961025", // Carrot
            "1473608175537860610", // Potato
            "1473609065833410561", // Minced beef
            "1473609025387737090", // Coconut milk
          ],
        }),
        cecotecUnitId: funcs.valuesFromArray({
          values: [
            "1468065253094465538", // g
            "1468065253094465539", // ml
            "1485486059386785793", // tsp
            "1468065253094465540", // l
            "1468065253094465541", // kg
            "1485486188151918593", // un
          ],
        }),
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
