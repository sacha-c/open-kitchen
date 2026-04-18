import { expect, test } from "@playwright/test";

const TEST_USER = {
  email: "test@open-kitchen.com",
  password: "test1234",
  name: "OpenKitchen Tester",
};

async function signIn(
  page: import("@playwright/test").Page,
  email = TEST_USER.email,
  password = TEST_USER.password,
) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForSelector(`text=${TEST_USER.name}`);
}

test.describe("Recipe list page", () => {
  test("redirects unauthenticated user to home", async ({ page }) => {
    await page.goto("/recipes");
    await page.waitForURL("/");
    await expect(
      page.getByRole("heading", { name: "OpenKitchen" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  });

  test("displays recipe cards when recipes exist", async ({ page }) => {
    await signIn(page);
    await page.getByRole("link", { name: "My Recipes" }).click();
    await page.waitForURL("/recipes");

    await expect(
      page.getByRole("heading", { name: "My Recipes" }),
    ).toBeVisible();

    // Should have recipe cards
    const cards = page.locator(".card");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("each card shows name, servings, cooking time, step count, and sync status", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/recipes");

    // Check the first card has all expected elements
    const firstCard = page.locator(".card").first();

    // Recipe name (h2 inside card)
    await expect(firstCard.locator("h2")).toBeVisible();
    const name = await firstCard.locator("h2").textContent();
    expect(name?.length).toBeGreaterThan(0);

    // Servings
    await expect(firstCard.locator('[title="Servings"]')).toBeVisible();

    // Cooking time
    await expect(firstCard.locator('[title="Cooking time"]')).toBeVisible();

    // Step count
    await expect(firstCard.locator('[title="Steps"]')).toBeVisible();
    const stepsText = await firstCard.locator('[title="Steps"]').textContent();
    expect(stepsText).toMatch(/\d+ steps/);

    // Sync status badge
    await expect(firstCard.locator(".badge")).toBeVisible();
    const badgeText = await firstCard.locator(".badge").textContent();
    expect(["Pending", "Synced", "Error"]).toContain(badgeText?.trim());
  });

  test("clicking a card navigates to the recipe detail page", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/recipes");

    const firstCard = page.locator(".card").first();
    const href = await firstCard.getAttribute("href");
    expect(href).toMatch(/^\/recipes\/.+/);

    await firstCard.click();
    await page.waitForURL(/\/recipes\/.+/);
    expect(page.url()).toMatch(/\/recipes\/.+/);
  });

  test("'New Recipe' button navigates to /recipes/new", async ({ page }) => {
    await signIn(page);
    await page.goto("/recipes");

    const newRecipeLink = page.getByRole("link", { name: "+ New Recipe" });
    await expect(newRecipeLink).toBeVisible();
    await newRecipeLink.click();
    await page.waitForURL("/recipes/new");
  });

  test("navigation bar shows 'My Recipes' link when authenticated", async ({
    page,
  }) => {
    await signIn(page);

    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "My Recipes" })).toBeVisible();
    await expect(nav.getByText(TEST_USER.name)).toBeVisible();
  });
});
