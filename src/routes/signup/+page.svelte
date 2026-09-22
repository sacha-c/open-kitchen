<script lang="ts">
  import { enhance } from "$app/forms";
  import * as m from "$lib/paraglide/messages";
  import type { SubmitFunction } from "./$types.js";

  interface FormResult {
    email?: string;
    name?: string;
    message?: string;
    errors?: Record<string, string>;
  }
  let { form }: { form: FormResult | null } = $props();
  let loading = $state(false);

  const handleSubmit: SubmitFunction = () => {
    loading = true;
    return async ({ update }) => {
      await update();
      loading = false;
    };
  };
</script>

<svelte:head> <title>{m.signup_page_title()}</title> </svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
  <div class="card bg-base-100 w-full max-w-sm shadow-xl">
    <div class="card-body">
      <h1 class="card-title text-2xl font-bold">
        <img src="/logo.png" alt="" class="h-8 w-8">
        OpenKitchen
      </h1>
      <p class="text-base-content/60 text-sm">{m.auth_signup_heading()}</p>

      {#if form?.message}
        <div class="alert alert-error mt-2"><span>{form.message}</span></div>
      {/if}

      <form
        method="POST"
        use:enhance={handleSubmit}
        autocomplete="on"
        class="mt-4 flex flex-col gap-4"
      >
        <div class="form-control">
          <label class="label" for="name">{m.common_name_label()}</label>
          <input
            id="name"
            name="name"
            class="input w-full"
            type="text"
            placeholder={m.auth_signup_name_placeholder()}
            value={form?.name ?? ""}
            autocomplete="name"
            required
            aria-invalid={form?.errors?.name ? "true" : "false"}
            aria-describedby={form?.errors?.name ? "name-error" : undefined}
          >
          {#if form?.errors?.name}
            <label class="label" for="name">
              <span id="name-error" class="label-text-alt text-error">
                {form.errors.name}
              </span>
            </label>
          {/if}
        </div>

        <div class="form-control">
          <label class="label" for="email">{m.common_email_label()}</label>
          <input
            id="email"
            name="email"
            class="input w-full"
            type="email"
            placeholder={m.common_email_placeholder()}
            value={form?.email ?? ""}
            autocomplete="email"
            required
            aria-invalid={form?.errors?.email ? "true" : "false"}
            aria-describedby={form?.errors?.email ? "email-error" : undefined}
          >
          {#if form?.errors?.email}
            <label class="label" for="email">
              <span id="email-error" class="label-text-alt text-error">
                {form.errors.email}
              </span>
            </label>
          {/if}
        </div>

        <div class="form-control">
          <label class="label" for="password"
            >{m.common_password_label()}</label
          >
          <input
            id="password"
            name="password"
            class="input w-full"
            type="password"
            placeholder={m.auth_signup_password_placeholder()}
            autocomplete="new-password"
            required
            minlength={8}
            aria-invalid={form?.errors?.password ? "true" : "false"}
            aria-describedby={form?.errors?.password ? "password-error" : undefined}
          >
          {#if form?.errors?.password}
            <label class="label" for="password">
              <span id="password-error" class="label-text-alt text-error">
                {form.errors.password}
              </span>
            </label>
          {/if}
        </div>

        <button
          class="btn btn-primary mt-2 w-full"
          type="submit"
          disabled={loading}
        >
          {#if loading}
            <span class="loading loading-spinner loading-sm"></span>
          {:else}
            {m.auth_signup_submit()}
          {/if}
        </button>
      </form>

      <div class="divider text-xs">{m.common_or_divider()}</div>

      <a href="/" class="btn btn-ghost btn-sm">
        {m.auth_signup_have_account()}
      </a>
    </div>
  </div>
</div>
