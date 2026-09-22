<script lang="ts">
  import { enhance } from "$app/forms";
  import * as m from "$lib/paraglide/messages";
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

<svelte:head><title>{m.profile_page_title()}</title></svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8 sm:px-8">
  <!-- Account Info -->
  <div class="card bg-base-100 mb-6 shadow-sm">
    <div class="card-body">
      <h1 class="card-title text-2xl font-bold">{m.nav_profile()}</h1>

      <div class="mt-4 flex flex-col gap-3">
        <div class="form-control">
          <label class="label" for="profile-name"
            >{m.common_name_label()}</label
          >
          <input
            id="profile-name"
            class="input w-full"
            type="text"
            value={data.user.name}
            disabled
          >
        </div>
        <div class="form-control">
          <label class="label" for="profile-email"
            >{m.common_email_label()}</label
          >
          <input
            id="profile-email"
            class="input w-full"
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
        <h2 class="card-title text-xl">{m.profile_cecotec_heading()}</h2>
        {#if linked}
          <span class="badge badge-success gap-1"
            >{m.profile_linked_badge()}</span
          >
        {:else}
          <span class="badge badge-neutral"
            >{m.profile_not_linked_badge()}</span
          >
        {/if}
      </div>

      {#if linked && linkedEmail}
        <p class="text-base-content/60 text-sm">
          {m.profile_connected_as({ email: linkedEmail })}
        </p>
      {/if}

      {#if form?.message}
        <div class="alert alert-error mt-2"><span>{form.message}</span></div>
      {/if}

      {#if form?.success}
        <div class="alert alert-success mt-2">
          <span>{m.profile_link_success()}</span>
        </div>
      {/if}

      {#if form?.disconnected}
        <div class="alert alert-info mt-2">
          <span>{m.profile_disconnect_success()}</span>
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
          <label class="label" for="cecotec-email"
            >{m.profile_cecotec_email_label()}</label
          >
          <input
            id="cecotec-email"
            name="email"
            class="input w-full"
            class:input-error={form?.errors?.email}
            type="email"
            placeholder={m.profile_cecotec_email_placeholder()}
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
          <label class="label" for="cecotec-password"
            >{m.profile_cecotec_password_label()}</label
          >
          <input
            id="cecotec-password"
            name="password"
            class="input w-full"
            class:input-error={form?.errors?.password}
            type="password"
            placeholder={linked
              ? m.profile_cecotec_password_placeholder_linked()
              : m.profile_cecotec_password_placeholder_unlinked()}
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
            {m.profile_save_verify()}
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
            {m.profile_disconnect_cta()}
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>
