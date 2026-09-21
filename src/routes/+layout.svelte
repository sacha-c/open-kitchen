<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { locales, localizeHref } from "$lib/paraglide/runtime";
  import "./layout.css";

  let { children, data } = $props();

  let signingOut = $state(false);
</script>

<div class="app">
  {#if data.user}
    <nav class="navbar border-base-300 bg-base-100 border-b px-4 sm:px-8">
      <div class="flex-1">
        <a
          href={resolve("/")}
          class="font-display flex items-center gap-2 text-xl font-bold tracking-tight"
        >
          <img src="/logo.png" alt="" class="h-8 w-8">
          OpenKitchen
        </a>
      </div>
      <div class="flex flex-none items-center gap-2">
        <ul class="menu menu-horizontal hidden gap-1 px-1 font-medium sm:flex">
          <li><a href={resolve("/recipes")}>My Recipes</a></li>
        </ul>
        <div class="dropdown dropdown-end">
          <button
            type="button"
            tabindex="0"
            class="btn btn-ghost flex items-center gap-2 px-2 font-medium sm:px-3"
          >
            <span
              class="bg-primary text-primary-content flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase sm:h-6 sm:w-6"
            >
              {data.user.name.charAt(0)}
            </span>
            <span class="hidden sm:inline">{data.user.name}</span>
          </button>
          <ul
            class="dropdown-content menu bg-base-100 rounded-box z-1 mt-2 w-52 p-2 shadow-md"
          >
            <li class="menu-title sm:hidden">{data.user.name}</li>
            <li class="sm:hidden">
              <a href={resolve("/recipes")}>My Recipes</a>
            </li>
            <li><a href={resolve("/profile")}>Profile</a></li>
            <li>
              <form
                method="POST"
                action={`${resolve("/")}?/signout`}
                use:enhance={() => {
                  signingOut = true;
                  return async ({ update }) => {
                    await update();
                    signingOut = false;
                  };
                }}
              >
                <button
                  class="text-error w-full text-left"
                  type="submit"
                  disabled={signingOut}
                >
                  {signingOut ? "Signing out…" : "Sign Out"}
                </button>
              </form>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  {/if}
  <main>{@render children()}</main>
</div>

<div style="display:none">
  {#each locales as locale (locale)}
    <a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
  {/each}
</div>
