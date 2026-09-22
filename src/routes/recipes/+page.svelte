<script lang="ts">
  import RecipeCard from "$lib/components/RecipeCard.svelte";
  import * as m from "$lib/paraglide/messages";

  let { data } = $props();
</script>

<svelte:head> <title>{m.recipes_page_title()}</title> </svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-8">
  <div class="mb-8 flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-3xl font-bold">{m.nav_my_recipes()}</h1>
    <a href="/recipes/new" class="btn btn-primary">{m.recipes_new_button()}</a>
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
        <title>{m.recipes_empty_icon_title()}</title>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
      <h2 class="text-base-content/60 mb-2 text-xl font-semibold">
        {m.recipes_empty_heading()}
      </h2>
      <p class="text-base-content/40 mb-6">
        {m.recipes_empty_desc()}
      </p>
      <a href="/recipes/new" class="btn btn-primary">{m.label_create_recipe()}</a>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.recipes as recipe (recipe.id)}
        <RecipeCard {recipe} />
      {/each}
    </div>
  {/if}
</div>
