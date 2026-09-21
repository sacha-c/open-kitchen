<script lang="ts">
  import SyncStatusBadge from "$lib/components/SyncStatusBadge.svelte";
  import { formatCookingTime } from "$lib/format-cooking-time";

  let { data } = $props();
</script>

<svelte:head> <title>My Recipes — OpenKitchen</title> </svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-8">
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
          class="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
        >
          <figure class="bg-base-200 relative aspect-4/3 overflow-hidden">
            {#if recipe.imageUrl}
              <img
                src={recipe.imageUrl}
                alt={recipe.name}
                class="h-full w-full object-cover"
              >
            {:else}
              <img
                src="/recipe-placeholder.svg"
                alt=""
                aria-hidden="true"
                class="h-full w-full object-cover opacity-60"
              >
            {/if}
            <div class="absolute top-3 right-3">
              <SyncStatusBadge
                status={recipe.syncStatus}
                syncError={recipe.syncError}
                compact
              />
            </div>
          </figure>
          <div class="card-body gap-2 p-4">
            <h2 class="card-title text-lg">{recipe.name}</h2>
            <div class="text-base-content/50 flex flex-wrap gap-4 text-sm">
              <span class="inline-flex items-center gap-1" title="Cooking time">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-4 w-4"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8.25" />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 7.5v4.5l3 1.5"
                  />
                </svg>
                {formatCookingTime(recipe.cookingTime)}
              </span>
              <span class="inline-flex items-center gap-1" title="Servings">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-4 w-4"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8.25" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {recipe.servings}
              </span>
              <span class="inline-flex items-center gap-1" title="Steps">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M4.5 6.75h.008v.008H4.5V6.75zm0 5.25h.008v.008H4.5V12zm0 5.25h.008v.008H4.5v-5.25z"
                  />
                </svg>
                {`${recipe.stepCount} steps`}
              </span>
            </div>
            {#if recipe.syncedAt}
              <p class="text-base-content/40 text-xs">
                Updated {new Date(recipe.syncedAt).toLocaleDateString()}
              </p>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
