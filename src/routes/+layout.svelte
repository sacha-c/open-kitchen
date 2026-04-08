<script lang="ts">
  import { page } from "$app/state";
  import { locales, localizeHref } from "$lib/paraglide/runtime";
  import "./layout.css";

  let { children } = $props();
</script>

<div class="app">
  <main>{@render children()}</main>
</div>

<div style="display:none">
  {#each locales as locale}
    <a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
  {/each}
</div>
