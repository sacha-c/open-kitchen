<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData, SubmitFunction } from "./$types.js";

  interface Props {
    form: ActionData & { errors?: { email?: string; password?: string } };
  }
  let { form }: Props = $props();
  let loading = $state(false);

  const handleSubmit: SubmitFunction = () => {
    loading = true;
    return async ({ update }) => {
      update();
      loading = false;
    };
  };
</script>

<svelte:head> <title>User Management</title> </svelte:head>

<form
  class="row flex flex-center"
  method="POST"
  use:enhance={handleSubmit}
  autocomplete="on"
>
  <div class="col-6 form-widget">
    <h1 class="header">Supabase + SvelteKit</h1>
    <p class="description">
      Sign in or create an account with your email and password
    </p>
    {#if form?.message !== undefined}
      <div class="success {form?.success ? '' : 'fail'}">{form?.message}</div>
    {/if}
    <div>
      <label for="email">Email address</label>
      <input
        id="email"
        name="email"
        class="inputField"
        type="email"
        placeholder="Your email"
        value={form?.email ?? ''}
        autocomplete="email"
        required
        aria-invalid={form?.errors?.email ? 'true' : 'false'}
        aria-describedby={form?.errors?.email ? 'email-error' : undefined}
      >
      {#if form?.errors?.email}
        <span id="email-error" class="flex items-center text-sm error">
          {form?.errors?.email}
        </span>
      {/if}
    </div>
    <div class="mt-4">
      <label for="password">Password</label>
      <input
        id="password"
        name="password"
        class="inputField"
        type="password"
        placeholder="Your password"
        autocomplete="current-password"
        required
        minlength="8"
        aria-invalid={form?.errors?.password ? 'true' : 'false'}
        aria-describedby={form?.errors?.password ? 'password-error' : undefined}
      >
      {#if form?.errors?.password}
        <span id="password-error" class="flex items-center text-sm error">
          {form?.errors?.password}
        </span>
      {/if}
    </div>
    <div>
      <button
        class="button primary block mt-6"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Loading…' : 'Sign in / Create account'}
      </button>
    </div>
  </div>
</form>
