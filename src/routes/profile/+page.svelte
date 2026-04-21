<script lang="ts">
  import { enhance } from "$app/forms";
  import type { PageData } from "./$types.js";

  interface SaveResult {
    success?: boolean;
    disconnected?: boolean;
    cecotecEmail?: string;
    email?: string;
    message?: string;
    errors?: Record<string, string>;
  }

  let { data, form }: { data: PageData; form: SaveResult | null } = $props();

  let loading = $state(false);

  // Reflect linked state from the latest form result, falling back to server data
  let linked = $derived(
    form?.success ? true : form?.disconnected ? false : data.cecotecLinked,
  );
  let linkedEmail = $derived(
    form?.success
      ? (form.cecotecEmail ?? null)
      : form?.disconnected
        ? null
        : data.cecotecEmail,
  );

  function handleSubmit() {
    loading = true;
    return async ({
      update,
    }: {
      update: (opts?: { reset?: boolean }) => Promise<void>;
    }) => {
      await update({ reset: false });
      loading = false;
    };
  }
</script>

<svelte:head><title>OpenKitchen — Profile</title></svelte:head>

<div class="mx-auto max-w-2xl px-4 py-10">
  <!-- Account Info -->
  <div class="card bg-base-100 mb-6 shadow-sm">
    <div class="card-body">
      <h1 class="card-title text-2xl font-bold">Profile</h1>

      <div class="mt-4 flex flex-col gap-3">
        <div class="form-control">
          <label class="label" for="profile-name">Name</label>
          <input
            id="profile-name"
            class="input input-bordered w-full"
            type="text"
            value={data.user.name}
            disabled
          >
        </div>
        <div class="form-control">
          <label class="label" for="profile-email">Email</label>
          <input
            id="profile-email"
            class="input input-bordered w-full"
            type="email"
            value={data.user.email}
            disabled
          >
        </div>
      </div>
    </div>
  </div>

  <!-- Cecotec Account -->
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body">
      <div class="flex items-center justify-between">
        <h2 class="card-title text-xl">Cecotec Account</h2>
        {#if linked}
          <span class="badge badge-success gap-1">Linked ✓</span>
        {:else}
          <span class="badge badge-neutral">Not linked</span>
        {/if}
      </div>

      {#if linked && linkedEmail}
        <p class="text-base-content/60 text-sm">
          Connected as <strong>{linkedEmail}</strong>
        </p>
      {/if}

      {#if form?.message}
        <div class="alert alert-error mt-2"><span>{form.message}</span></div>
      {/if}

      {#if form?.success}
        <div class="alert alert-success mt-2">
          <span>Cecotec account linked successfully.</span>
        </div>
      {/if}

      {#if form?.disconnected}
        <div class="alert alert-info mt-2">
          <span>Cecotec account disconnected.</span>
        </div>
      {/if}

      <!-- Save & Verify form -->
      <form
        method="POST"
        action="?/save"
        use:enhance={handleSubmit}
        class="mt-2 flex flex-col gap-5"
      >
        <div class="form-control">
          <label class="label" for="cecotec-email">Cecotec Email</label>
          <input
            id="cecotec-email"
            name="email"
            class="input input-bordered w-full"
            class:input-error={form?.errors?.email}
            type="email"
            placeholder="your@cecotec-account.com"
            value={form?.email ?? data.cecotecEmail ?? ""}
            autocomplete="off"
            required
            aria-invalid={form?.errors?.email ? "true" : "false"}
            aria-describedby={form?.errors?.email ? "cecotec-email-error" : undefined}
          >
          {#if form?.errors?.email}
            <label class="label" for="cecotec-email">
              <span id="cecotec-email-error" class="label-text-alt text-error">
                {form.errors.email}
              </span>
            </label>
          {/if}
        </div>

        <div class="form-control">
          <label class="label" for="cecotec-password">Cecotec Password</label>
          <input
            id="cecotec-password"
            name="password"
            class="input input-bordered w-full"
            class:input-error={form?.errors?.password}
            type="password"
            placeholder={linked ? "Enter password to update" : "Your Cecotec password"}
            autocomplete="off"
            required
            aria-invalid={form?.errors?.password ? "true" : "false"}
            aria-describedby={form?.errors?.password ? "cecotec-password-error" : undefined}
          >
          {#if form?.errors?.password}
            <label class="label" for="cecotec-password">
              <span
                id="cecotec-password-error"
                class="label-text-alt text-error"
              >
                {form.errors.password}
              </span>
            </label>
          {/if}
        </div>

        <button class="btn btn-primary w-full" type="submit" disabled={loading}>
          {#if loading}
            <span class="loading loading-spinner loading-sm"></span>
          {:else}
            Save & Verify
          {/if}
        </button>
      </form>

      <!-- Disconnect -->
      {#if linked}
        <div class="divider"></div>
        <form method="POST" action="?/disconnect" use:enhance={handleSubmit}>
          <button
            class="btn btn-outline btn-error btn-sm"
            type="submit"
            disabled={loading}
          >
            Disconnect Cecotec Account
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>
