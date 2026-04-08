<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "./$types.js";

  interface FormResult {
    email?: string;
    message?: string;
    errors?: Record<string, string>;
  }
  let {
    data,
    form,
  }: {
    data: { user: { name: string; email: string } | null };
    form: FormResult | null;
  } = $props();
  let loading = $state(false);

  const handleSubmit: SubmitFunction = () => {
    loading = true;
    return async ({ update }) => {
      await update();
      loading = false;
    };
  };
</script>

<svelte:head> <title>OpenKitchen</title> </svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
  <div class="card bg-base-100 w-full max-w-sm shadow-xl">
    <div class="card-body">
      <h1 class="card-title text-2xl font-bold">OpenKitchen</h1>

      {#if data.user}
        <p class="mt-4 text-lg">
          Welcome, <span class="font-semibold">{data.user.name}</span>!
        </p>
        <p class="text-base-content/60 text-sm">{data.user.email}</p>

        <form
          method="POST"
          action="?/signout"
          use:enhance={handleSubmit}
          class="mt-6"
        >
          <button
            class="btn btn-outline btn-error w-full"
            type="submit"
            disabled={loading}
          >
            {#if loading}
              <span class="loading loading-spinner loading-sm"></span>
            {:else}
              Sign Out
            {/if}
          </button>
        </form>
      {:else}
        <p class="text-base-content/60 text-sm">Sign in to your account</p>

        {#if form?.message}
          <div class="alert alert-error mt-2"><span>{form.message}</span></div>
        {/if}

        <form
          method="POST"
          action="?/signin"
          use:enhance={handleSubmit}
          autocomplete="on"
          class="mt-4 flex flex-col gap-4"
        >
          <div class="form-control">
            <label class="label" for="email">Email</label>
            <input
              id="email"
              name="email"
              class="input input-bordered w-full"
              type="email"
              placeholder="you@example.com"
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
            <label class="label" for="password">Password</label>
            <input
              id="password"
              name="password"
              class="input input-bordered w-full"
              type="password"
              placeholder="Your password"
              autocomplete="current-password"
              required
              minlength={6}
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
              Sign In
            {/if}
          </button>
        </form>

        <div class="divider text-xs">OR</div>

        <a href="/signup" class="btn btn-ghost btn-sm">
          Don't have an account? Sign up
        </a>
      {/if}
    </div>
  </div>
</div>
