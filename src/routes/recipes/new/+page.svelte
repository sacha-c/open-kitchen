<script lang="ts">
  import { resolve } from "$app/paths";
  import RecipeForm from "$lib/components/RecipeForm.svelte";

  let { data, form } = $props();
</script>

<svelte:head> <title>New Recipe — OpenKitchen</title> </svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="mb-8 text-3xl font-bold">New Recipe</h1>

  <RecipeForm
    catalogs={{ units: data.units, allIngredients: data.allIngredients }}
    formResult={form}
    cancelUrl={resolve("/recipes")}
    submitLabel="Create Recipe"
  />
</div>
