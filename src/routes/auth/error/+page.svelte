<script lang="ts">
  import * as m from "$lib/paraglide/messages";
</script>

<svelte:head> <title>{m.auth_error_page_title()}</title> </svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
  <div class="card bg-base-100 w-full max-w-sm shadow-xl">
    <div class="card-body items-center text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="text-error mb-2 h-12 w-12"
        aria-hidden="true"
        role="img"
      >
        <title>{m.auth_error_icon_title()}</title>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <h1 class="card-title">{m.auth_error_heading()}</h1>
      <p class="text-base-content/60 text-sm">{m.auth_error_message()}</p>
      <a href="/" class="btn btn-primary mt-4 w-full"
        >{m.auth_error_back_to_signin()}</a
      >
    </div>
  </div>
</div>
