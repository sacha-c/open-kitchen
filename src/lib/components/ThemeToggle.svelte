<script lang="ts">
  import { onMount } from "svelte";

  type Theme = "light" | "dark";

  const STORAGE_KEY = "theme";

  let { variant = "icon" }: { variant?: "icon" | "menu-item" } = $props();

  let theme = $state<Theme>("light");

  function readAppliedTheme(): Theme {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "culinary-dark") return "dark";
    if (attr === "culinary") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  onMount(() => {
    theme = readAppliedTheme();
  });

  function setTheme(next: Theme) {
    theme = next;
    document.documentElement.setAttribute(
      "data-theme",
      next === "dark" ? "culinary-dark" : "culinary",
    );
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private browsing, disabled storage)
    }
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  let label = $derived(
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );
</script>

{#snippet sunIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
    class="h-4 w-4"
    aria-hidden="true"
    role="img"
  >
    <title>Sun icon</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
    />
  </svg>
{/snippet}

{#snippet moonIcon()}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
    class="h-4 w-4"
    aria-hidden="true"
    role="img"
  >
    <title>Moon icon</title>
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
    />
  </svg>
{/snippet}

{#if variant === "menu-item"}
  <li class="hover:bg-transparent focus:bg-transparent active:bg-transparent">
    <div class="flex items-center justify-between gap-3 hover:bg-transparent">
      <span class="text-base-content/70">Theme</span>
      <div class="join" role="radiogroup" aria-label="Theme">
        <button
          type="button"
          role="radio"
          aria-checked={theme === "light"}
          class={[
            "btn btn-xs join-item gap-1",
            theme === "light" ? "btn-primary" : "btn-ghost",
          ]}
          onclick={() => setTheme("light")}
        >
          {@render sunIcon()}
          Light
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={theme === "dark"}
          class={[
            "btn btn-xs join-item gap-1",
            theme === "dark" ? "btn-primary" : "btn-ghost",
          ]}
          onclick={() => setTheme("dark")}
        >
          {@render moonIcon()}
          Dark
        </button>
      </div>
    </div>
  </li>
{:else}
  <button
    type="button"
    class="btn btn-ghost btn-circle btn-sm"
    onclick={toggleTheme}
    aria-label={label}
    title={label}
  >
    {#if theme === "dark"}
      {@render sunIcon()}
    {:else}
      {@render moonIcon()}
    {/if}
  </button>
{/if}
