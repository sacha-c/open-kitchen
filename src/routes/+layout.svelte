<script lang="ts">
  import { page } from "$app/state";
  import { locales, localizeHref } from "$lib/paraglide/runtime";
  import "./layout.css";
  import { onMount } from "svelte";
  import { invalidate } from "$app/navigation";

  let { data, children } = $props();
  let { supabase, claims } = $derived(data);
  onMount(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, _session) => {
      if (_session?.expires_at !== claims?.exp) {
        invalidate("supabase:auth");
      }
    });
    return () => data.subscription.unsubscribe();
  });
</script>

<div class="app">
  <main>{@render children()}</main>
</div>

<div style="display:none">
  {#each locales as locale}
    <a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
  {/each}
</div>
