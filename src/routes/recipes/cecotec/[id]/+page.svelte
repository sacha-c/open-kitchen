<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import { formatCookingTime } from "$lib/format-cooking-time";
  import * as m from "$lib/paraglide/messages";
  import {
    getStepTypeBadgeClass,
    getStepTypeLabel,
  } from "$lib/step-operation-type";

  let { data, form } = $props();

  let importing = $state(false);
</script>

<svelte:head>
  <title>
    {m.recipe_detail_page_title({
      name: data.recipe?.name ?? m.cecotec_detail_fallback_name(),
    })}
  </title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8 sm:px-8">
  <a
    href={resolve("/recipes/cecotec")}
    class="text-base-content/60 mb-4 inline-flex items-center gap-1 text-sm hover:underline"
  >
    {m.cecotec_detail_back_link()}
  </a>

  {#if form?.message}
    <div role="alert" class="alert alert-error mt-4 mb-2">
      <span>{form.message}</span>
    </div>
  {/if}

  {#if data.error}
    <div role="alert" class="alert alert-error mt-4">
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
  {:else if data.recipe}
    <div class="mt-2 mb-6 flex flex-wrap items-start justify-between gap-4">
      <h1 class="text-3xl font-bold">{data.recipe.name}</h1>
      {#if data.importedRecipeId}
        <a
          href={resolve(`/recipes/${data.importedRecipeId}`)}
          class="btn btn-outline shrink-0"
        >
          {m.cecotec_already_imported_link()}
        </a>
      {:else}
        <form
          method="POST"
          action="?/import"
          use:enhance={() => {
          importing = true;
          return async ({ update }) => {
            await update();
            importing = false;
          };
        }}
        >
          <input type="hidden" name="number" value={data.number}>
          <button
            class="btn btn-primary shrink-0"
            type="submit"
            disabled={importing}
          >
            {#if importing}
              <span class="loading loading-spinner loading-xs"></span>
              {m.cecotec_importing()}
            {:else}
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
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              {m.cecotec_import_cta()}
            {/if}
          </button>
        </form>
      {/if}
    </div>

    <div class="card bg-base-100 mb-6 shadow-md">
      {#if data.recipe.imageUrl}
        <figure class="h-64 w-full overflow-hidden rounded-t-2xl">
          <img
            src={data.recipe.imageUrl}
            alt={data.recipe.name}
            class="h-full w-full object-cover"
          >
        </figure>
      {:else}
        <figure class="h-48 w-full overflow-hidden rounded-t-2xl">
          <img
            src="/recipe-placeholder.svg"
            alt=""
            aria-hidden="true"
            class="h-full w-full object-cover"
          >
        </figure>
      {/if}
      <div class="card-body gap-4">
        <div class="flex flex-wrap gap-4 text-sm">
          <span class="flex items-center gap-1" title={m.label_servings()}>
            <span class="text-base-content/60">{m.label_servings()}</span>
            <span class="font-medium">{data.recipe.servings}</span>
          </span>
          <span
            class="flex items-center gap-1"
            title={m.label_total_cooking_time_title()}
          >
            <span class="text-base-content/60">{m.label_time()}</span>
            <span class="font-medium"
              >{formatCookingTime(data.recipe.cookingTime)}</span
            >
          </span>
        </div>
      </div>
    </div>

    {#if data.recipe.ingredients.length > 0}
      <div class="card bg-base-100 mb-6 shadow-md">
        <div class="card-body">
          <h2 class="card-title mb-2 text-xl">
            {m.label_ingredients_heading()}
          </h2>
          <ul class="divide-base-300 divide-y">
            {#each data.recipe.ingredients as ingredient (ingredient.sortOrder)}
              <li class="flex items-center gap-2 py-2">
                <span class="font-medium"
                  >{ingredient.amount}{ingredient.unit}</span
                >
                <span class="text-base-content/80">{ingredient.name}</span>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    {:else}
      <div class="card bg-base-100 mb-6 shadow-md">
        <div class="card-body">
          <h2 class="card-title mb-2 text-xl">
            {m.label_ingredients_heading()}
          </h2>
          <p class="text-base-content/60">{m.cecotec_no_ingredient_data()}</p>
        </div>
      </div>
    {/if}

    {#if data.recipe.steps.length > 0}
      <div class="card bg-base-100 shadow-md">
        <div class="card-body">
          <h2 class="card-title mb-4 text-xl">{m.label_steps_heading()}</h2>
          <ol class="space-y-4">
            {#each data.recipe.steps as step (step.sortOrder)}
              <li class="flex gap-4">
                <div
                  class="bg-base-200 text-base-content flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                >
                  {step.sortOrder + 1}
                </div>
                <div class="flex-1">
                  <div class="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      class="badge badge-sm {getStepTypeBadgeClass(step.operationType)}"
                    >
                      {getStepTypeLabel(step.operationType)}
                    </span>
                  </div>
                  <p class="text-base-content/90 mb-2">{step.description}</p>
                  {#if step.operationType === 2}
                    <div
                      class="bg-base-200 flex flex-wrap gap-4 rounded-lg px-4 py-2 text-sm"
                    >
                      {#if step.totalTime > 0}
                        <span class="flex items-center gap-1">
                          <span class="text-base-content/60"
                            >{m.label_time()}</span
                          >
                          <span class="font-medium"
                            >{formatCookingTime(step.totalTime)}</span
                          >
                        </span>
                      {/if}
                      {#if step.speed !== "0"}
                        <span class="flex items-center gap-1">
                          <span class="text-base-content/60"
                            >{m.label_speed()}</span
                          >
                          <span class="font-medium">{step.speed}</span>
                        </span>
                      {/if}
                      {#if step.temperature > 0}
                        <span class="flex items-center gap-1">
                          <span class="text-base-content/60"
                            >{m.label_temp_short()}</span
                          >
                          <span class="font-medium">{step.temperature}°C</span>
                        </span>
                      {/if}
                      {#if step.power > 0}
                        <span class="flex items-center gap-1">
                          <span class="text-base-content/60"
                            >{m.label_power()}</span
                          >
                          <span class="font-medium">{step.power}</span>
                        </span>
                      {/if}
                    </div>
                  {/if}
                </div>
              </li>
            {/each}
          </ol>
        </div>
      </div>
    {/if}
  {/if}
</div>
