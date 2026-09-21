<script lang="ts">
  import { resolve } from "$app/paths";
  import RecipeForm from "$lib/components/RecipeForm.svelte";

  let { data, form } = $props();
</script>

<svelte:head>
  <title>Edit {data.recipe.name} — OpenKitchen</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8">
  <div class="mb-8 flex items-center justify-between">
    <h1 class="text-3xl font-bold">Edit Recipe</h1>
    <a
      href={resolve(`/recipes/${data.recipe.id}`)}
      class="text-sm hover:underline text-base-content/60"
    >
      ← Back to Details
    </a>
  </div>

  <RecipeForm
    recipe={data.recipe}
    ingredients={data.ingredients}
    steps={data.steps}
    catalogs={{ units: data.units, allIngredients: data.allIngredients }}
    hasCecotecCredentials={data.hasCecotecCredentials}
    formResult={form}
    cancelUrl={`/recipes/${data.recipe.id}`}
    submitLabel="Save Changes"
  />
</div>
