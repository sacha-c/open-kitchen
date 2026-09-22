<script lang="ts">
  import { resolve } from "$app/paths";
  import { formatCookingTime } from "$lib/format-cooking-time";

  let { data } = $props();

  function categoryHref(categoryId: string | null): string {
    const params = new URLSearchParams();
    if (categoryId) params.set("category", categoryId);
    if (data.search) params.set("search", data.search);
    const query = params.toString();
    return query
      ? `${resolve("/recipes/cecotec")}?${query}`
      : resolve("/recipes/cecotec");
  }

  function pageHref(page: number): string {
    const params = new URLSearchParams();
    if (data.selectedCategoryId)
      params.set("category", data.selectedCategoryId);
    if (data.search) params.set("search", data.search);
    params.set("page", String(page));
    return `${resolve("/recipes/cecotec")}?${params.toString()}`;
  }

  function detailHref(recipe: { id: string; number: string }): string {
    return `${resolve(`/recipes/cecotec/${recipe.id}`)}?number=${recipe.number}`;
  }
</script>

<svelte:head> <title>Cecotec Recipes — OpenKitchen</title> </svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-8">
  <div class="mb-8 flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-3xl font-bold">Cecotec Recipes</h1>
  </div>

  {#if !data.linked}
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
        <title>No Cecotec account linked</title>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
        />
      </svg>
      <h2 class="text-base-content/60 mb-2 text-xl font-semibold">
        No Cecotec account linked
      </h2>
      <p class="text-base-content/40 mb-6">
        Link your Cecotec account to browse and import recipes from the official
        catalog.
      </p>
      <a href={resolve("/profile")} class="btn btn-primary"
        >Link Cecotec Account</a
      >
    </div>
  {:else if data.error}
    <div role="alert" class="alert alert-error mb-6">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="h-6 w-6 shrink-0"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <span>{data.error}</span>
    </div>
  {:else}
    <form method="GET" class="mb-6 flex gap-2">
      {#if data.selectedCategoryId}
        <input type="hidden" name="category" value={data.selectedCategoryId}>
      {/if}
      <label class="input grow">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="text-base-content/40 h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="search"
          name="search"
          value={data.search ?? ""}
          placeholder="Search recipes…"
          aria-label="Search Cecotec recipes"
        >
      </label>
      <button type="submit" class="btn btn-primary">Search</button>
    </form>

    {#if data.categories.length > 0}
      <div class="mb-6 flex flex-wrap gap-2">
        <a
          href={categoryHref(null)}
          class="btn btn-sm {data.selectedCategoryId ? 'btn-outline' : 'btn-primary'}"
        >
          All
        </a>
        {#each data.categories as category (category.id)}
          <a
            href={categoryHref(category.id)}
            class="btn btn-sm {data.selectedCategoryId === category.id ? 'btn-primary' : 'btn-outline'}"
          >
            {category.name}
          </a>
        {/each}
      </div>
    {/if}

    {#if data.recipes.length === 0}
      <div class="flex flex-col items-center justify-center py-24 text-center">
        <h2 class="text-base-content/60 mb-2 text-xl font-semibold">
          No recipes found
        </h2>
        <p class="text-base-content/40">
          Try a different search{data.categories.length > 0
            ? " or category"
            : ""}.
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.recipes as recipe (recipe.id)}
          <a
            href={detailHref(recipe)}
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
              {#if recipe.importedRecipeId}
                <div class="absolute top-3 right-3">
                  <span class="badge badge-success badge-sm">Imported</span>
                </div>
              {/if}
            </figure>
            <div class="card-body gap-2 p-4">
              <h2 class="card-title text-lg">{recipe.name}</h2>
              <div class="text-base-content/50 flex flex-wrap gap-4 text-sm">
                <span
                  class="inline-flex items-center gap-1"
                  title="Cooking time"
                >
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
                {#if recipe.starAvg}
                  <span class="inline-flex items-center gap-1" title="Rating">
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
                        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 21.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                      />
                    </svg>
                    {recipe.starAvg}
                  </span>
                {/if}
                {#if recipe.views != null}
                  <span class="inline-flex items-center gap-1" title="Views">
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
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {recipe.views}
                  </span>
                {/if}
              </div>
            </div>
          </a>
        {/each}
      </div>

      {#if data.totalPages > 1}
        <div class="mt-8 flex items-center justify-center gap-2">
          <a
            href={pageHref(data.page - 1)}
            class="btn btn-sm"
            class:btn-disabled={data.page <= 1}
            aria-disabled={data.page <= 1}
          >
            Previous
          </a>
          <span class="text-base-content/60 text-sm">
            Page {data.page} of {data.totalPages}
          </span>
          <a
            href={pageHref(data.page + 1)}
            class="btn btn-sm"
            class:btn-disabled={data.page >= data.totalPages}
            aria-disabled={data.page >= data.totalPages}
          >
            Next
          </a>
        </div>
      {/if}
    {/if}
  {/if}
</div>
