<script lang="ts">
  import * as m from "$lib/paraglide/messages";

  interface Props {
    status: string;
    syncedAt?: Date | null;
    syncError?: string | null;
    syncing?: boolean;
    /** Renders just the pill, without the date/error affordances — for overlaying on imagery. */
    compact?: boolean;
  }

  let {
    status,
    syncedAt,
    syncError,
    syncing = false,
    compact = false,
  }: Props = $props();

  let badgeClass = $derived(
    syncing
      ? "badge-info"
      : status === "synced"
        ? "badge-success"
        : status === "error"
          ? "badge-error"
          : "badge-warning",
  );

  let label = $derived(
    syncing
      ? m.sync_syncing()
      : status === "synced"
        ? m.sync_synced()
        : status === "error"
          ? m.sync_error()
          : m.sync_pending(),
  );
</script>

<div class="inline-flex items-center gap-1">
  {#if syncing}
    <span class="loading loading-spinner loading-xs text-info"></span>
  {/if}
  <span class="badge badge-sm {badgeClass} {compact ? 'shadow-sm' : ''}"
    >{label}</span
  >
  {#if !compact && !syncing && status === "synced" && syncedAt}
    <span class="text-base-content/50 text-xs">
      {syncedAt.toLocaleDateString()}
    </span>
  {/if}
  {#if !compact && !syncing && status === "error" && syncError}
    <div class="tooltip tooltip-error" data-tip={syncError}>
      <button
        class="btn btn-circle btn-ghost btn-xs"
        type="button"
        aria-label={m.sync_error_details_aria()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="h-4 w-4 stroke-current"
          aria-hidden="true"
          role="img"
        >
          <title>{m.sync_error_icon_title()}</title>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </div>
  {/if}
</div>
