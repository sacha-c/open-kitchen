<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import SyncStatusBadge from "$lib/components/SyncStatusBadge.svelte";
  import { formatCookingTime } from "$lib/format-cooking-time";
  import * as m from "$lib/paraglide/messages";
  import {
    getStepTypeBadgeClass,
    getStepTypeLabel,
  } from "$lib/step-operation-type";

  let { data } = $props();

  let showDeleteModal = $state(false);
  let deleting = $state(false);
  let syncing = $state(false);
</script>

<svelte:head>
  <title>{m.recipe_detail_page_title({ name: data.recipe.name })}</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8 sm:px-8">
  <!-- Header -->
  <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div>
      <a
        href={resolve("/recipes")}
        class="text-base-content/60 mb-2 inline-flex items-center gap-1 text-sm hover:underline"
      >
        {m.recipe_detail_back_link()}
      </a>
      <h1 class="mt-1 text-3xl font-bold">{data.recipe.name}</h1>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <a
        href={resolve(`/recipes/${data.recipe.id}/edit`)}
        class="btn btn-square btn-ghost"
        aria-label={m.recipe_detail_edit_aria()}
        title={m.recipe_detail_edit_aria()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="h-5 w-5"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
          />
        </svg>
      </a>
      <button
        class="btn btn-square btn-ghost text-error"
        type="button"
        aria-label={m.recipe_detail_delete_aria()}
        title={m.recipe_detail_delete_aria()}
        onclick={() => (showDeleteModal = true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="h-5 w-5"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
      </button>
      {#if data.hasCecotecCredentials}
        <form
          method="POST"
          action="?/sync"
          use:enhance={() => {
            syncing = true;
            return async ({ update }) => {
              await update();
              syncing = false;
            };
          }}
        >
          <button class="btn btn-primary" type="submit" disabled={syncing}>
            {#if syncing}
              <span class="loading loading-spinner loading-xs"></span>
              {m.sync_syncing()}
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
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              {m.recipe_detail_sync_now()}
            {/if}
          </button>
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
        <span class="flex items-center gap-1" title={m.language_label()}>
          <span class="text-base-content/60">{m.language_label()}</span>
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
          {syncing}
        />
      </div>
    </div>
  </div>

  <!-- Ingredients -->
  {#if data.ingredients.length > 0}
    <div class="card bg-base-100 mb-6 shadow-md">
      <div class="card-body">
        <h2 class="card-title mb-2 text-xl">{m.label_ingredients_heading()}</h2>
        <ul class="divide-base-300 divide-y">
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
        <h2 class="card-title mb-4 text-xl">{m.label_steps_heading()}</h2>
        <ol class="space-y-4">
          {#each data.steps as step, index (step.id)}
            <li class="flex gap-4">
              <div
                class="bg-base-200 text-base-content flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
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
</div>

<!-- Delete confirmation modal -->
{#if showDeleteModal}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="text-lg font-bold">{m.recipe_detail_delete_modal_title()}</h3>
      <p class="py-4">
        {m.recipe_detail_delete_modal_body({ name: data.recipe.name })}
      </p>
      <div class="modal-action">
        <button
          class="btn btn-ghost"
          type="button"
          onclick={() => (showDeleteModal = false)}
          disabled={deleting}
        >
          {m.common_cancel()}
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
            {deleting ? m.recipe_detail_deleting() : m.common_delete()}
          </button>
        </form>
      </div>
    </div>
    <button
      class="modal-backdrop"
      type="button"
      aria-label={m.recipe_detail_close_modal_aria()}
      onclick={() => (showDeleteModal = false)}
    ></button>
  </div>
{/if}
