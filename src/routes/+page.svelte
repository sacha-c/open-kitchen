<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import RecipeCard from "$lib/components/RecipeCard.svelte";
  import type { SubmitFunction } from "./$types.js";

  interface FormResult {
    email?: string;
    message?: string;
    errors?: Record<string, string>;
  }

  interface RecentRecipe {
    id: string;
    name: string;
    servings: string;
    cookingTime: number;
    imageUrl: string | null;
    syncStatus: string;
    syncError: string | null;
    syncedAt: string | null;
    stepCount: number;
  }

  let {
    data,
    form,
  }: {
    data: {
      user: { name: string; email: string } | null;
      recentRecipes: RecentRecipe[];
      recipeCount: number;
      hasCecotecCredentials: boolean;
    };
    form: FormResult | null;
  } = $props();
  let loading = $state(false);

  const handleSubmit: SubmitFunction = () => {
    loading = true;
    return async ({ update }) => {
      await update();
      loading = false;
    };
  };

  let firstName = $derived(data.user?.name.split(" ")[0] ?? "");
</script>

<svelte:head> <title>OpenKitchen</title> </svelte:head>

{#if data.user}
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-8">
    <h1 class="mb-8 text-3xl font-bold">Welcome, {firstName}!</h1>

    <div class="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <a
        href={resolve("/recipes/new")}
        class="card bg-base-100 border-primary border-t-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <div class="card-body flex-row items-center gap-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="text-primary h-8 w-8 shrink-0"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          <div>
            <h2 class="card-title text-lg">Create New Recipe</h2>
            <p class="text-base-content/60 text-sm">
              Start a new recipe from scratch.
            </p>
          </div>
        </div>
      </a>

      <a
        href={resolve("/recipes")}
        class="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
      >
        <div class="card-body flex-row items-center gap-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="text-base-content/40 h-8 w-8 shrink-0"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
          <div>
            <h2 class="card-title text-lg">My Recipes</h2>
            <p class="text-base-content/60 text-sm">
              {`${data.recipeCount} ${data.recipeCount === 1 ? "recipe" : "recipes"} saved.`}
            </p>
          </div>
        </div>
      </a>

      {#if data.hasCecotecCredentials}
        <a
          href={resolve("/recipes/cecotec")}
          class="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
        >
          <div class="card-body flex-row items-center gap-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="text-base-content/40 h-8 w-8 shrink-0"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-19.5 0v6a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25v-6m-19.5 0h19.5M8.25 9.75V4.5a2.25 2.25 0 012.25-2.25h3a2.25 2.25 0 012.25 2.25v5.25"
              />
            </svg>
            <div>
              <h2 class="card-title text-lg">Cecotec Recipes</h2>
              <p class="text-base-content/60 text-sm">
                Browse and import recipes from the Cecotec catalog.
              </p>
            </div>
          </div>
        </a>
      {:else}
        <a
          href={resolve("/profile")}
          class="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
        >
          <div class="card-body flex-row items-center gap-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="text-base-content/40 h-8 w-8 shrink-0"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
            <div>
              <h2 class="card-title text-lg">Connect Cecotec Account</h2>
              <p class="text-base-content/60 text-sm">
                Sync your recipes to your Cecotec device.
              </p>
            </div>
          </div>
        </a>
      {/if}
    </div>

    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-2xl font-bold">Recently Added</h2>
      {#if data.recentRecipes.length > 0}
        <a
          href={resolve("/recipes")}
          class="text-primary text-sm font-medium hover:underline"
        >
          View all →
        </a>
      {/if}
    </div>

    {#if data.recentRecipes.length === 0}
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body items-center py-12 text-center">
          <p class="text-base-content/60 mb-2">
            You haven't created any recipes yet.
          </p>
          <a href={resolve("/recipes/new")} class="btn btn-primary btn-sm">
            Create your first recipe
          </a>
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.recentRecipes as recipe (recipe.id)}
          <RecipeCard {recipe} />
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <div class="flex min-h-screen items-center justify-center px-4">
    <div class="card bg-base-100 w-full max-w-sm shadow-xl">
      <div class="card-body">
        <h1 class="card-title text-2xl font-bold">
          <img src="/logo.png" alt="" class="h-8 w-8">
          OpenKitchen
        </h1>
        <p class="text-base-content/60 text-sm">Sign in to your account</p>

        {#if form?.message}
          <div class="alert alert-error mt-2"><span>{form.message}</span></div>
        {/if}

        <form
          method="POST"
          action="?/signin"
          use:enhance={handleSubmit}
          autocomplete="on"
          class="mt-4 flex flex-col gap-4"
        >
          <div class="form-control">
            <label class="label" for="email">Email</label>
            <input
              id="email"
              name="email"
              class="input w-full"
              type="email"
              placeholder="you@example.com"
              value={form?.email ?? ""}
              autocomplete="email"
              required
              aria-invalid={form?.errors?.email ? "true" : "false"}
              aria-describedby={form?.errors?.email ? "email-error" : undefined}
            >
            {#if form?.errors?.email}
              <label class="label" for="email">
                <span id="email-error" class="label-text-alt text-error">
                  {form.errors.email}
                </span>
              </label>
            {/if}
          </div>

          <div class="form-control">
            <label class="label" for="password">Password</label>
            <input
              id="password"
              name="password"
              class="input w-full"
              type="password"
              placeholder="Your password"
              autocomplete="current-password"
              required
              minlength={6}
              aria-invalid={form?.errors?.password ? "true" : "false"}
              aria-describedby={form?.errors?.password ? "password-error" : undefined}
            >
            {#if form?.errors?.password}
              <label class="label" for="password">
                <span id="password-error" class="label-text-alt text-error">
                  {form.errors.password}
                </span>
              </label>
            {/if}
          </div>

          <button
            class="btn btn-primary mt-2 w-full"
            type="submit"
            disabled={loading}
          >
            {#if loading}
              <span class="loading loading-spinner loading-sm"></span>
            {:else}
              Sign In
            {/if}
          </button>
        </form>

        <div class="divider text-xs">OR</div>

        <a href="/signup" class="btn btn-ghost btn-sm">
          Don't have an account? Sign up
        </a>
      </div>
    </div>
  </div>
{/if}
