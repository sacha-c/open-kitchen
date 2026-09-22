<script lang="ts">
  import SyncStatusBadge from "$lib/components/SyncStatusBadge.svelte";
  import { formatCookingTime } from "$lib/format-cooking-time";
  import * as m from "$lib/paraglide/messages";

  interface Props {
    recipe: {
      id: string;
      name: string;
      servings: string;
      cookingTime: number;
      imageUrl: string | null;
      syncStatus: string;
      syncError: string | null;
      syncedAt: string | null;
      stepCount: number;
    };
  }

  let { recipe }: Props = $props();
</script>

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
      <span
        class="inline-flex items-center gap-1"
        title={m.card_cooking_time_title()}
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
      <span class="inline-flex items-center gap-1" title={m.label_servings()}>
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
      <span
        class="inline-flex items-center gap-1"
        title={m.label_steps_heading()}
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
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M4.5 6.75h.008v.008H4.5V6.75zm0 5.25h.008v.008H4.5V12zm0 5.25h.008v.008H4.5v-5.25z"
          />
        </svg>
        {recipe.stepCount === 1
          ? m.card_steps_count_one({ count: recipe.stepCount })
          : m.card_steps_count_other({ count: recipe.stepCount })}
      </span>
    </div>
    {#if recipe.syncedAt}
      <p class="text-base-content/40 text-xs">
        {m.card_updated_prefix({
          date: new Date(recipe.syncedAt).toLocaleDateString(),
        })}
      </p>
    {/if}
  </div>
</a>
