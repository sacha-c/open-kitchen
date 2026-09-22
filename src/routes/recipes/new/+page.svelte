<script lang="ts">
  import RecipeForm from "$lib/components/RecipeForm.svelte";
  import * as m from "$lib/paraglide/messages";

  let { data, form } = $props();
</script>

<svelte:head> <title>{m.recipe_new_page_title()}</title> </svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-8">
  <h1 class="mb-8 text-3xl font-bold">{m.recipe_new_heading()}</h1>

  <RecipeForm
    catalogs={{ units: data.units, allIngredients: data.allIngredients }}
    hasCecotecCredentials={data.hasCecotecCredentials}
    formResult={form}
    cancelUrl="/recipes"
    submitLabel={m.label_create_recipe()}
  />
</div>
