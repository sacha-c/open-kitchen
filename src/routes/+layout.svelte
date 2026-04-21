<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { locales, localizeHref } from "$lib/paraglide/runtime";
  import "./layout.css";

  let { children, data } = $props();
</script>

<div class="app">
  {#if data.user}
    <nav class="navbar bg-base-100 shadow-sm">
      <div class="flex-1">
        <a href={resolve("/")} class="btn btn-ghost text-xl">OpenKitchen</a>
      </div>
      <div class="flex-none">
        <ul class="menu menu-horizontal gap-1 px-1">
          <li><a href={resolve("/recipes")}>My Recipes</a></li>
          <li><a href={resolve("/profile")}>{data.user.name}</a></li>
        </ul>
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
