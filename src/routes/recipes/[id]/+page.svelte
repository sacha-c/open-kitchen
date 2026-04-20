<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import SyncStatusBadge from "$lib/components/SyncStatusBadge.svelte";
  import { formatCookingTime } from "$lib/format-cooking-time";
  import {
    getStepTypeBadgeClass,
    getStepTypeLabel,
  } from "$lib/step-operation-type";

  let { data } = $props();

  let showDeleteModal = $state(false);
  let deleting = $state(false);
</script>

<svelte:head> <title>{data.recipe.name} — OpenKitchen</title> </svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8">
  <!-- Header -->
  <div class="mb-6 flex items-start justify-between gap-4">
    <div>
      <a
        href={resolve("/recipes")}
        class="text-base-content/60 mb-2 inline-flex items-center gap-1 text-sm hover:underline"
      >
        ← My Recipes
      </a>
      <h1 class="mt-1 text-3xl font-bold">{data.recipe.name}</h1>
    </div>
    <div class="flex shrink-0 gap-2">
      <a
        href={resolve(`/recipes/${data.recipe.id}/edit`)}
        class="btn btn-outline btn-sm"
      >
        Edit
      </a>
      <button
        class="btn btn-error btn-sm"
        type="button"
        onclick={() => (showDeleteModal = true)}
      >
        Delete
      </button>
      {#if data.hasCecotecCredentials}
        <form method="POST" action="?/sync" use:enhance>
          <button class="btn btn-primary btn-sm" type="submit">Sync Now</button>
        </form>
      {/if}
    </div>
  </div>

  <!-- Image + metadata card -->
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
      <div
        class="bg-base-200 flex h-48 items-center justify-center rounded-t-2xl"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="text-base-content/20 h-16 w-16"
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
    <div class="card-body gap-4">
      <div class="flex flex-wrap gap-4 text-sm">
        <span class="flex items-center gap-1" title="Servings">
          <span class="text-base-content/60">Servings</span>
          <span class="font-medium">{data.recipe.servings}</span>
        </span>
        <span class="flex items-center gap-1" title="Total cooking time">
          <span class="text-base-content/60">Time</span>
          <span class="font-medium"
            >{formatCookingTime(data.recipe.cookingTime)}</span
          >
        </span>
        <span class="flex items-center gap-1" title="Language">
          <span class="text-base-content/60">Language</span>
          <span class="badge badge-ghost badge-sm font-medium uppercase"
            >{data.recipe.language}</span
          >
        </span>
      </div>
      <div>
        <SyncStatusBadge
          status={data.recipe.syncStatus}
          syncedAt={data.recipe.syncedAt ? new Date(data.recipe.syncedAt) : null}
          syncError={data.recipe.syncError}
        />
      </div>
    </div>
  </div>

  <!-- Ingredients -->
  {#if data.ingredients.length > 0}
    <div class="card bg-base-100 mb-6 shadow-md">
      <div class="card-body">
        <h2 class="card-title mb-2 text-xl">Ingredients</h2>
        <ul class="divide-base-200 divide-y">
          {#each data.ingredients as ingredient (ingredient.id)}
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
  {/if}

  <!-- Steps -->
  {#if data.steps.length > 0}
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <h2 class="card-title mb-4 text-xl">Steps</h2>
        <ol class="space-y-4">
          {#each data.steps as step, index (step.id)}
            <li class="flex gap-4">
              <div
                class="bg-primary text-primary-content flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              >
                {index + 1}
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
                        <span class="text-base-content/60">Time</span>
                        <span class="font-medium"
                          >{formatCookingTime(step.totalTime)}</span
                        >
                      </span>
                    {/if}
                    {#if step.speed !== "0"}
                      <span class="flex items-center gap-1">
                        <span class="text-base-content/60">Speed</span>
                        <span class="font-medium">{step.speed}</span>
                      </span>
                    {/if}
                    {#if step.temperature > 0}
                      <span class="flex items-center gap-1">
                        <span class="text-base-content/60">Temp</span>
                        <span class="font-medium">{step.temperature}°C</span>
                      </span>
                    {/if}
                    {#if step.power > 0}
                      <span class="flex items-center gap-1">
                        <span class="text-base-content/60">Power</span>
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
</div>

<!-- Delete confirmation modal -->
{#if showDeleteModal}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="text-lg font-bold">Delete Recipe</h3>
      <p class="py-4">
        Are you sure you want to delete <strong>{data.recipe.name}</strong>?
        This action cannot be undone.
      </p>
      <div class="modal-action">
        <button
          class="btn btn-ghost"
          type="button"
          onclick={() => (showDeleteModal = false)}
          disabled={deleting}
        >
          Cancel
        </button>
        <form
          method="POST"
          action="?/delete"
          use:enhance={() => {
            deleting = true;
            return async ({ update }) => {
              await update();
              deleting = false;
            };
          }}
        >
          <button class="btn btn-error" type="submit" disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </form>
      </div>
    </div>
    <button
      class="modal-backdrop"
      type="button"
      aria-label="Close modal"
      onclick={() => (showDeleteModal = false)}
    ></button>
  </div>
{/if}
