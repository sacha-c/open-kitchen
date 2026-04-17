<script lang="ts">
  import SyncStatusBadge from "$lib/components/SyncStatusBadge.svelte";
  import { formatCookingTime } from "$lib/format-cooking-time";

  let { data } = $props();
</script>

<svelte:head> <title>My Recipes — OpenKitchen</title> </svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8">
  <div class="mb-8 flex items-center justify-between">
    <h1 class="text-3xl font-bold">My Recipes</h1>
    <a href="/recipes/new" class="btn btn-primary">+ New Recipe</a>
  </div>

  {#if data.recipes.length === 0}
    <div class="flex flex-col items-center justify-center py-24 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="text-base-content/30 mb-4 h-16 w-16"
        aria-hidden="true"
        role="img"
      >
        <title>No recipes</title>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
      <h2 class="text-base-content/60 mb-2 text-xl font-semibold">
        No recipes yet
      </h2>
      <p class="text-base-content/40 mb-6">
        Create your first recipe to get started.
      </p>
      <a href="/recipes/new" class="btn btn-primary">Create Recipe</a>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.recipes as recipe (recipe.id)}
        <a
          href="/recipes/{recipe.id}"
          class="card bg-base-100 shadow-md transition-shadow hover:shadow-lg"
        >
          <figure class="bg-base-200 h-48">
            {#if recipe.imageUrl}
              <img
                src={recipe.imageUrl}
                alt={recipe.name}
                class="h-full w-full object-cover"
              >
            {:else}
              <div class="flex h-full w-full items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="text-base-content/20 h-12 w-12"
                  aria-hidden="true"
                  role="img"
                >
                  <title>No image</title>
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                  />
                </svg>
              </div>
            {/if}
          </figure>
          <div class="card-body gap-3 p-4">
            <h2 class="card-title text-lg">{recipe.name}</h2>
            <div class="text-base-content/60 flex flex-wrap gap-3 text-sm">
              <span title="Servings">🍽 {recipe.servings}</span>
              <span title="Cooking time">
                ⏱ {formatCookingTime(recipe.cookingTime)}
              </span>
              <span title="Steps">📋 {recipe.stepCount} steps</span>
            </div>
            <div class="card-actions mt-1">
              <SyncStatusBadge
                status={recipe.syncStatus}
                syncedAt={recipe.syncedAt
                  ? new Date(recipe.syncedAt)
                  : null}
                syncError={recipe.syncError}
              />
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
