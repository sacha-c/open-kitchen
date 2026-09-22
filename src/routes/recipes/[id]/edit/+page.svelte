<script lang="ts">
  import { resolve } from "$app/paths";
  import RecipeForm from "$lib/components/RecipeForm.svelte";
  import * as m from "$lib/paraglide/messages";

  let { data, form } = $props();
</script>

<svelte:head>
  <title>{m.recipe_edit_page_title({ name: data.recipe.name })}</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-8">
  <div class="mb-8 flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-3xl font-bold">{m.recipe_edit_heading()}</h1>
    <a
      href={resolve(`/recipes/${data.recipe.id}`)}
      class="text-sm hover:underline text-base-content/60"
    >
      {m.recipe_edit_back_link()}
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
    submitLabel={m.recipe_form_submit_save()}
  />
</div>
