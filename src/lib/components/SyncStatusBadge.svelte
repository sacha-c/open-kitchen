<script lang="ts">
  interface Props {
    status: string;
    syncedAt?: Date | null;
    syncError?: string | null;
  }

  let { status, syncedAt, syncError }: Props = $props();

  let badgeClass = $derived(
    status === "synced"
      ? "badge-success"
      : status === "error"
        ? "badge-error"
        : "badge-warning",
  );

  let label = $derived(
    status === "synced" ? "Synced" : status === "error" ? "Error" : "Pending",
  );
</script>

<div class="inline-flex items-center gap-1">
  <span class="badge badge-sm {badgeClass}">{label}</span>
  {#if status === "synced" && syncedAt}
    <span class="text-base-content/50 text-xs">
      {syncedAt.toLocaleDateString()}
    </span>
  {/if}
  {#if status === "error" && syncError}
    <div class="tooltip tooltip-error" data-tip={syncError}>
      <button
        class="btn btn-circle btn-ghost btn-xs"
        type="button"
        aria-label="Sync error details"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="h-4 w-4 stroke-current"
          aria-hidden="true"
          role="img"
        >
          <title>Error info</title>
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
