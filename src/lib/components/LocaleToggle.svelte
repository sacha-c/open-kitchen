<script lang="ts">
  import * as m from "$lib/paraglide/messages";
  import { getLocale, type Locale, setLocale } from "$lib/paraglide/runtime";

  const SUPPORTED_LOCALES = ["en", "es"] as const satisfies readonly Locale[];

  let { variant = "icon" }: { variant?: "icon" | "menu-item" } = $props();

  let locale = $state(getLocale());

  function switchTo(next: Locale) {
    locale = next;
    setLocale(next);
  }

  function toggleLocale() {
    switchTo(locale === "en" ? "es" : "en");
  }

  let label = $derived(
    locale === "en" ? m.switch_to_spanish() : m.switch_to_english(),
  );
</script>

{#if variant === "menu-item"}
  <li class="hover:bg-transparent focus:bg-transparent active:bg-transparent">
    <div class="flex items-center justify-between gap-3 hover:bg-transparent">
      <span class="text-base-content/70">{m.language_label()}</span>
      <div class="join" role="radiogroup" aria-label={m.language_label()}>
        {#each SUPPORTED_LOCALES as candidate (candidate)}
          <button
            type="button"
            role="radio"
            aria-checked={locale === candidate}
            class={[
              "btn btn-xs join-item",
              locale === candidate ? "btn-primary" : "btn-ghost",
            ]}
            onclick={() => switchTo(candidate)}
          >
            {candidate.toUpperCase()}
          </button>
        {/each}
      </div>
    </div>
  </li>
{:else}
  <button
    type="button"
    class="btn btn-ghost btn-circle btn-sm text-xs font-bold uppercase"
    onclick={toggleLocale}
    aria-label={label}
    title={label}
  >
    {locale}
  </button>
{/if}
