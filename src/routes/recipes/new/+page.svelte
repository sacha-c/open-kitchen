<script lang="ts">
  import RecipeForm from "$lib/components/RecipeForm.svelte";

  let { data, form } = $props();
</script>

<svelte:head> <title>New Recipe — OpenKitchen</title> </svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-8">
  <h1 class="mb-8 text-3xl font-bold">New Recipe</h1>

  <RecipeForm
    catalogs={{ units: data.units, allIngredients: data.allIngredients }}
    hasCecotecCredentials={data.hasCecotecCredentials}
    formResult={form}
    cancelUrl="/recipes"
    submitLabel="Create Recipe"
  />
</div>
