<script lang="ts">
  import type { SubmitFunction } from "@sveltejs/kit";
  import { untrack } from "svelte";
  import { enhance } from "$app/forms";
  import { beforeNavigate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { formatCookingTime } from "$lib/format-cooking-time";
  import {
    getImageValidationError,
    IMAGE_ACCEPT,
    MAX_IMAGE_SIZE_LABEL,
  } from "$lib/image-upload-policy";
  import * as m from "$lib/paraglide/messages";
  import {
    getStepTypeBadgeClass,
    getStepTypeLabel,
  } from "$lib/step-operation-type";

  interface FormResult {
    errors?: Record<string, string>;
    values?: Record<string, unknown>;
  }

  interface CatalogItem {
    id: string;
    name: string;
  }

  interface RecipeData {
    name: string;
    servings: string;
    language: string;
    imageUrl: string | null;
  }

  interface InitialIngredient {
    name: string;
    amount: string | number;
    unit: string;
    cecotecIngredientId?: string | null;
    cecotecUnitId?: string | null;
  }

  interface InitialStep {
    description: string;
    operationType: number;
    totalTime: number;
    speed: string | number;
    temperature: number;
    power: number;
  }

  interface Props {
    recipe?: RecipeData;
    ingredients?: InitialIngredient[];
    steps?: InitialStep[];
    catalogs?: {
      units?: CatalogItem[];
      allIngredients?: CatalogItem[];
    };
    formResult?: FormResult | null;
    hasCecotecCredentials?: boolean;
    cancelUrl: "/recipes" | `/recipes/${string}`;
    submitLabel: string;
  }

  let {
    recipe = { name: "", servings: "2", language: "en", imageUrl: null },
    ingredients: initialIngredients = [],
    steps: initialSteps = [],
    catalogs = { units: [], allIngredients: [] },
    formResult = null,
    hasCecotecCredentials = false,
    cancelUrl,
    submitLabel,
  }: Props = $props();

  let loading = $state(false);
  let imageUploading = $state(false);
  let imageError = $state<string | null>(null);
  const initialImageUrl = untrack(
    () =>
      (formResult?.values?.imageUrl as string | null | undefined) ??
      recipe.imageUrl ??
      "",
  );
  let imageUrl = $state(initialImageUrl);
  let imagePreviewUrl = $state(initialImageUrl);

  interface FormIngredient {
    name: string;
    amount: string;
    unit: string;
    cecotecIngredientId: string;
    cecotecUnitId: string;
  }

  interface FormStep {
    description: string;
    operationType: number;
    totalTime: number;
    speed: string;
    temperature: number;
    power: number;
  }

  function restoreIngredients(): FormIngredient[] {
    const vals = formResult?.values;
    if (
      vals?.ingredients &&
      Array.isArray(vals.ingredients) &&
      vals.ingredients.length > 0
    ) {
      return vals.ingredients as FormIngredient[];
    }
    if (initialIngredients.length > 0) {
      return initialIngredients.map((i) => ({
        name: i.name,
        amount: String(i.amount),
        unit: i.unit,
        cecotecIngredientId: i.cecotecIngredientId ?? "",
        cecotecUnitId: i.cecotecUnitId ?? "",
      }));
    }
    return [];
  }

  function restoreSteps(): FormStep[] {
    const vals = formResult?.values;
    if (vals?.steps && Array.isArray(vals.steps) && vals.steps.length > 0) {
      return vals.steps as FormStep[];
    }
    if (initialSteps.length > 0) {
      return initialSteps.map((s) => ({
        description: s.description,
        operationType: s.operationType,
        totalTime: s.totalTime,
        speed: String(s.speed),
        temperature: s.temperature,
        power: s.power,
      }));
    }
    return [];
  }

  let ingredientsList = $state<FormIngredient[]>(restoreIngredients());
  let stepsList = $state<FormStep[]>(restoreSteps());

  // Collapsed state per step: existing steps start collapsed, new ones start expanded.
  // If the form was re-rendered after a validation error (formResult has steps), keep all expanded.
  let stepsCollapsed = $state<boolean[]>(
    stepsList.map(() => {
      const hasFormErrorSteps = !!(
        formResult?.values?.steps &&
        Array.isArray(formResult.values.steps) &&
        (formResult.values.steps as unknown[]).length > 0
      );
      return initialSteps.length > 0 && !hasFormErrorSteps;
    }),
  );

  let cookingTime = $derived(
    stepsList.reduce((sum, s) => sum + (Number(s.totalTime) || 0), 0),
  );

  function addIngredient() {
    ingredientsList.push({
      name: "",
      amount: "",
      unit: catalogs.units?.[0]?.name ?? "g",
      cecotecIngredientId: "",
      cecotecUnitId: catalogs.units?.[0]?.id ?? "",
    });
  }

  function removeIngredient(index: number) {
    ingredientsList.splice(index, 1);
  }

  function moveIngredient(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ingredientsList.length) return;
    const temp = ingredientsList[index];
    ingredientsList[index] = ingredientsList[target];
    ingredientsList[target] = temp;
  }

  function addStep() {
    stepsList.push({
      description: "",
      operationType: 1,
      totalTime: 0,
      speed: "0",
      temperature: 0,
      power: 0,
    });
    stepsCollapsed.push(false); // new steps start expanded
  }

  function removeStep(index: number) {
    stepsList.splice(index, 1);
    stepsCollapsed.splice(index, 1);
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= stepsList.length) return;
    const temp = stepsList[index];
    stepsList[index] = stepsList[target];
    stepsList[target] = temp;
    const tempCollapsed = stepsCollapsed[index];
    stepsCollapsed[index] = stepsCollapsed[target];
    stepsCollapsed[target] = tempCollapsed;
  }

  function toggleStepCollapse(index: number) {
    stepsCollapsed[index] = !stepsCollapsed[index];
  }

  function fieldError(name: string): string | undefined {
    return formResult?.errors?.[name];
  }

  async function uploadSelectedImage(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validationError = getImageValidationError(file);
    if (validationError) {
      imageError = validationError;
      input.value = "";
      return;
    }

    imageError = null;
    imageUploading = true;
    const localPreviewUrl = URL.createObjectURL(file);
    imagePreviewUrl = localPreviewUrl;

    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(resolve("/api/upload-image"), {
        method: "POST",
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as {
        error?: unknown;
        url?: unknown;
      } | null;

      if (!response.ok || typeof result?.url !== "string") {
        imagePreviewUrl = imageUrl;
        imageError =
          typeof result?.error === "string"
            ? result.error
            : m.error_image_upload_failed();
        return;
      }

      imageUrl = result.url;
      imagePreviewUrl = result.url;
    } catch {
      imagePreviewUrl = imageUrl;
      imageError = m.error_image_upload_failed();
    } finally {
      URL.revokeObjectURL(localPreviewUrl);
      imageUploading = false;
      input.value = "";
    }
  }

  // Unsaved changes tracking: snapshot initial serialized state (untrack to avoid state_referenced_locally warning)
  const initialSnapshot = untrack(() =>
    JSON.stringify({
      recipe,
      ingredients: initialIngredients,
      steps: initialSteps,
    }),
  );
  let isDirty = $derived(
    !loading &&
      JSON.stringify({
        recipe: {
          name: formResult?.values?.name ?? recipe.name,
          servings: formResult?.values?.servings ?? recipe.servings,
        },
        ingredients: ingredientsList,
        steps: stepsList,
      }) !== initialSnapshot,
  );

  beforeNavigate(({ cancel }) => {
    if (isDirty) {
      if (!window.confirm(m.recipe_form_confirm_leave())) {
        cancel();
      }
    }
  });

  const handleSubmit: SubmitFunction = () => {
    loading = true;
    return async ({ update }) => {
      await update();
      loading = false;
    };
  };
</script>

<form
  method="POST"
  use:enhance={handleSubmit}
  class="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start"
>
  <!-- Left column: Recipe Details + Ingredients -->
  <div class="flex flex-col gap-8">
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h2 class="card-title text-lg">{m.recipe_form_details_heading()}</h2>

        <div class="form-control">
          <label class="label" for="name">{m.common_name_label()}</label>
          <input
            id="name"
            name="name"
            type="text"
            class="input w-full"
            maxlength={200}
            required
            value={formResult?.values?.name ?? recipe.name}
            aria-invalid={fieldError("name") ? "true" : undefined}
            aria-describedby={fieldError("name") ? "name-error" : undefined}
          >
          {#if fieldError("name")}
            <span id="name-error" class="label-text-alt text-error mt-1">
              {fieldError("name")}
            </span>
          {/if}
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div class="form-control">
            <label class="label" for="servings">{m.label_servings()}</label>
            <input
              id="servings"
              name="servings"
              type="text"
              class="input w-full"
              placeholder={m.recipe_form_servings_placeholder()}
              required
              value={formResult?.values?.servings ?? recipe.servings}
              aria-invalid={fieldError("servings") ? "true" : undefined}
              aria-describedby={fieldError("servings") ? "servings-error" : undefined}
            >
            {#if fieldError("servings")}
              <span id="servings-error" class="label-text-alt text-error mt-1">
                {fieldError("servings")}
              </span>
            {/if}
          </div>

          <div class="form-control">
            <label class="label" for="language">{m.language_label()}</label>
            <select
              id="language"
              name="language"
              class="select w-full"
              required
            >
              <option
                value="en"
                selected={((formResult?.values?.language as string) ?? recipe.language) === "en"}
              >
                English
              </option>
              <option
                value="es"
                selected={((formResult?.values?.language as string) ?? recipe.language) === "es"}
              >
                Español
              </option>
              <option
                value="ca"
                selected={((formResult?.values?.language as string) ?? recipe.language) === "ca"}
              >
                Català
              </option>
            </select>
          </div>

          <div class="form-control">
            <span class="label">{m.label_cooking_time()}</span>
            <div
              class="input bg-base-200/60 flex items-center text-sm font-medium"
            >
              {formatCookingTime(cookingTime)}
            </div>
          </div>
        </div>

        <div class="form-control">
          <label class="label" for="recipe-image">{m.recipe_form_image_label()}</label>
          <input type="hidden" name="imageUrl" value={imageUrl}>
          <div
            class="bg-base-200 border-base-300 rounded-box relative flex h-28 items-center justify-center overflow-hidden border-2 border-dashed"
          >
            {#if imagePreviewUrl}
              <img
                src={imagePreviewUrl}
                alt={m.recipe_form_image_preview_alt()}
                class="absolute inset-0 h-full w-full object-cover"
              >
            {:else}
              <img
                src="/recipe-placeholder.svg"
                alt=""
                aria-hidden="true"
                class="absolute inset-0 w-full h-full object-cover opacity-40"
              >
            {/if}
            {#if imageUploading}
              <div
                class="bg-base-100/80 absolute inset-0 flex items-center justify-center"
                aria-live="polite"
              >
                <span class="loading loading-spinner loading-md"></span>
                <span class="ml-2 text-sm font-medium"
                  >{m.recipe_form_uploading()}</span
                >
              </div>
            {:else if hasCecotecCredentials}
              <span
                class="text-base-content bg-base-100/85 relative z-10 rounded px-3 py-1 text-center text-sm font-medium"
              >
                {imageUrl
                  ? m.recipe_form_image_cta_replace()
                  : m.recipe_form_image_cta_add()}
              </span>
            {/if}
          </div>
          <input
            id="recipe-image"
            type="file"
            class="file-input mt-2 w-full"
            accept={IMAGE_ACCEPT}
            disabled={!hasCecotecCredentials || imageUploading}
            onchange={uploadSelectedImage}
          >
          {#if imageError}
            <span class="label-text-alt text-error mt-1" role="alert">
              {imageError}
            </span>
          {/if}
          {#if !hasCecotecCredentials}
            <span class="label-text-alt mt-1">
              <a class="link link-primary" href={resolve("/profile")}
                >{m.recipe_form_connect_cecotec_link()}</a
              >
              {m.recipe_form_connect_cecotec_suffix()}
            </span>
          {:else}
            <span class="label-text-alt mt-1">
              {m.recipe_form_image_help({ maxSize: MAX_IMAGE_SIZE_LABEL })}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h2 class="card-title text-lg">{m.label_ingredients_heading()}</h2>
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            onclick={addIngredient}
          >
            {m.recipe_form_add_ingredient()}
          </button>
        </div>

        {#each ingredientsList as ingredient, i (i)}
          <div class="bg-base-200/50 flex flex-col gap-2 rounded-lg p-3">
            <datalist id={`ingredient-list-${i}`}>
              {#each (catalogs.allIngredients || []) as opt (opt.id)}
                <option value={opt.name} data-id={opt.id}></option>
              {/each}
            </datalist>

            <!-- Responsive row: name on top (mobile), inline (sm+) -->
            <div class="flex flex-col sm:flex-row sm:items-start gap-2">
              <div class="form-control w-full sm:flex-1">
                <input
                  name={`ingredients[${i}].name`}
                  type="text"
                  list={`ingredient-list-${i}`}
                  class="input input-sm w-full"
                  class:input-error={fieldError(`ingredients.${i}.name`)}
                  placeholder={m.recipe_form_ingredient_search_placeholder()}
                  autocomplete="off"
                  bind:value={ingredient.name}
                  oninput={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  const match = (catalogs.allIngredients || []).find(
                    (o) => o.name.toLowerCase() === val.toLowerCase(),
                  );
                  ingredient.cecotecIngredientId = match?.id ?? '';
                }}
                  aria-invalid={fieldError(`ingredients.${i}.name`) ? 'true' : undefined}
                >
                <input
                  type="hidden"
                  name={`ingredients[${i}].cecotecIngredientId`}
                  value={ingredient.cecotecIngredientId}
                >
                {#if fieldError(`ingredients.${i}.name`)}
                  <span class="label-text-alt text-error mt-1"
                    >{fieldError(`ingredients.${i}.name`)}</span
                  >
                {/if}
              </div>

              <!-- Amount + unit + actions: second row on mobile, inline on sm+ -->
              <div class="flex items-start gap-2 w-full sm:w-auto">
                <div class="form-control w-20 shrink-0">
                  <input
                    name={`ingredients[${i}].amount`}
                    type="text"
                    class="input input-sm w-full"
                    placeholder={m.recipe_form_amount_placeholder()}
                    bind:value={ingredient.amount}
                    aria-invalid={fieldError(`ingredients.${i}.amount`) ? "true" : undefined}
                  >
                  {#if fieldError(`ingredients.${i}.amount`)}
                    <span class="label-text-alt text-error mt-1"
                      >{fieldError(`ingredients.${i}.amount`)}</span
                    >
                  {/if}
                </div>

                <div class="form-control flex-1 sm:w-24 sm:flex-none">
                  <select
                    class="select select-sm w-full"
                    class:select-error={fieldError(`ingredients.${i}.unit`)}
                    name={`ingredients[${i}].unit`}
                    bind:value={ingredient.unit}
                    onchange={(e) => {
                    const val = (e.target as HTMLSelectElement).value;
                    const match = (catalogs.units || []).find((u) => u.name === val);
                    ingredient.cecotecUnitId = match?.id ?? '';
                  }}
                    aria-invalid={fieldError(`ingredients.${i}.unit`) ? "true" : undefined}
                  >
                    {#if ingredient.unit && !(catalogs.units || []).some((u) => u.name === ingredient.unit)}
                      <option value={ingredient.unit}>{ingredient.unit}</option>
                    {/if}
                    {#each (catalogs.units || []) as unit (unit.id)}
                      <option value={unit.name}>{unit.name}</option>
                    {/each}
                  </select>
                  <input
                    type="hidden"
                    name={`ingredients[${i}].cecotecUnitId`}
                    value={ingredient.cecotecUnitId}
                  >
                  {#if fieldError(`ingredients.${i}.unit`)}
                    <span class="label-text-alt text-error mt-1"
                      >{fieldError(`ingredients.${i}.unit`)}</span
                    >
                  {/if}
                </div>

                <div class="flex gap-1 ml-auto sm:ml-0">
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs"
                    disabled={i === 0}
                    onclick={() => moveIngredient(i, -1)}
                    title={m.action_move_up()}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs"
                    disabled={i === ingredientsList.length - 1}
                    onclick={() => moveIngredient(i, 1)}
                    title={m.action_move_down()}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs text-error"
                    onclick={() => removeIngredient(i)}
                    title={m.action_remove()}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/each}

        {#if ingredientsList.length === 0}
          <p class="text-base-content/40 py-4 text-center text-sm">
            {m.recipe_form_no_ingredients()}
            <button
              type="button"
              class="link text-primary"
              onclick={addIngredient}
            >
              {m.action_add_one()}
            </button>
          </p>
        {/if}
      </div>
    </div>
  </div>
  <!-- End left column -->

  <!-- Right column: Steps -->
  <div class="flex flex-col gap-8">
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h2 class="card-title text-lg">{m.label_steps_heading()}</h2>
          <button type="button" class="btn btn-sm btn-ghost" onclick={addStep}>
            {m.recipe_form_add_step()}
          </button>
        </div>

        {#if fieldError("steps")}
          <div class="alert alert-error text-sm">{fieldError("steps")}</div>
        {/if}

        {#each stepsList as step, i (i)}
          <div
            class="bg-base-200/50 flex flex-col gap-3 rounded-lg border-l-4"
            class:border-info={step.operationType === 1}
            class:border-warning={step.operationType === 2}
            class:border-neutral={step.operationType === 0}
          >
            <!-- Step header: always visible, click to toggle collapse -->
            <div
              class="flex items-center justify-between p-4 pb-0"
              class:pb-4={stepsCollapsed[i]}
            >
              <button
                type="button"
                class="flex items-center gap-2 text-left flex-1 min-w-0"
                onclick={() => toggleStepCollapse(i)}
                aria-expanded={!stepsCollapsed[i]}
              >
                <!-- Chevron icon -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="h-4 w-4 shrink-0 text-base-content/40 transition-transform"
                  class:rotate-[-90deg]={stepsCollapsed[i]}
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span class="text-sm font-semibold shrink-0"
                  >{m.recipe_form_step_heading({ number: i + 1 })}</span
                >
                <span
                  class="badge badge-sm shrink-0 {getStepTypeBadgeClass(step.operationType)}"
                >
                  {getStepTypeLabel(step.operationType)}
                </span>
                {#if stepsCollapsed[i] && step.description}
                  <span class="text-xs text-base-content/50 truncate"
                    >{step.description}</span
                  >
                {/if}
              </button>
              <div class="flex gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  disabled={i === 0}
                  onclick={() => moveStep(i, -1)}
                  title={m.action_move_up()}
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  disabled={i === stepsList.length - 1}
                  onclick={() => moveStep(i, 1)}
                  title={m.action_move_down()}
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error"
                  onclick={() => removeStep(i)}
                  title={m.action_remove()}
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Step content: hidden when collapsed (inputs still submit) -->
            <div
              class="flex flex-col gap-3 px-4 pb-4"
              class:hidden={stepsCollapsed[i]}
            >
              <div class="form-control">
                <label class="label text-sm" for={`step-desc-${i}`}
                  >{m.recipe_form_description_label()}</label
                >
                <textarea
                  id={`step-desc-${i}`}
                  name={`steps[${i}].description`}
                  class="textarea w-full"
                  maxlength={1000}
                  rows={2}
                  required
                  bind:value={step.description}
                  aria-invalid={fieldError(`steps.${i}.description`) ? "true" : undefined}
                ></textarea>
                {#if fieldError(`steps.${i}.description`)}
                  <span class="label-text-alt text-error mt-1"
                    >{fieldError(`steps.${i}.description`)}</span
                  >
                {/if}
              </div>

              <div class="form-control">
                <label class="label text-sm" for={`step-type-${i}`}
                  >{m.recipe_form_step_type_label()}</label
                >
                <select
                  id={`step-type-${i}`}
                  class="select select-sm w-full"
                  name={`steps[${i}].operationType`}
                  bind:value={step.operationType}
                  required
                >
                  <option value={1}>{m.step_type_preparation()}</option>
                  <option value={2}>{m.step_type_cooking()}</option>
                  <option value={0}>{m.step_type_manual()}</option>
                </select>
              </div>

              {#if step.operationType === 2}
                <div
                  class="bg-base-300/50 grid grid-cols-2 gap-3 rounded-lg p-3"
                >
                  <div class="form-control col-span-2">
                    <label class="label text-sm" for={`step-time-min-${i}`}
                      >{m.recipe_form_duration_label()}</label
                    >
                    <div class="flex items-center gap-2">
                      <div class="flex items-center gap-1">
                        <input
                          id={`step-time-min-${i}`}
                          type="number"
                          class="input input-sm w-20"
                          class:input-error={fieldError(`steps.${i}.totalTime`)}
                          min={0}
                          max={90}
                          value={Math.floor(step.totalTime / 60)}
                          aria-label={m.recipe_form_minutes_aria()}
                          aria-invalid={fieldError(`steps.${i}.totalTime`) ? "true" : undefined}
                          oninput={(e) => {
                        const mins = Math.max(0, Math.min(90, Number((e.target as HTMLInputElement).value) || 0));
                        step.totalTime = mins * 60 + (step.totalTime % 60);
                      }}
                        >
                        <span class="text-base-content/60 text-sm"
                          >{m.unit_min()}</span
                        >
                      </div>
                      <div class="flex items-center gap-1">
                        <input
                          id={`step-time-sec-${i}`}
                          type="number"
                          class="input input-sm w-20"
                          class:input-error={fieldError(`steps.${i}.totalTime`)}
                          min={0}
                          max={59}
                          value={step.totalTime % 60}
                          aria-label={m.recipe_form_seconds_aria()}
                          aria-invalid={fieldError(`steps.${i}.totalTime`) ? "true" : undefined}
                          oninput={(e) => {
                        const secs = Math.max(0, Math.min(59, Number((e.target as HTMLInputElement).value) || 0));
                        step.totalTime = Math.floor(step.totalTime / 60) * 60 + secs;
                      }}
                        >
                        <span class="text-base-content/60 text-sm"
                          >{m.unit_sec()}</span
                        >
                      </div>
                      {#if step.totalTime > 0}
                        <span class="text-base-content/50 text-xs"
                          >≈ {formatCookingTime(step.totalTime)}</span
                        >
                      {/if}
                    </div>
                    <input
                      type="hidden"
                      name={`steps[${i}].totalTime`}
                      value={step.totalTime}
                    >
                    {#if fieldError(`steps.${i}.totalTime`)}
                      <span class="label-text-alt text-error mt-1"
                        >{fieldError(`steps.${i}.totalTime`)}</span
                      >
                    {/if}
                  </div>

                  <div class="form-control col-span-2">
                    <div class="label">
                      <label class="label-text text-sm" for={`step-speed-${i}`}
                        >{m.label_speed()}</label
                      >
                      <span class="label-text-alt font-bold text-base"
                        >{step.speed}</span
                      >
                    </div>
                    <input
                      id={`step-speed-${i}`}
                      name={`steps[${i}].speed`}
                      type="range"
                      class="range range-sm"
                      min="0"
                      max="10"
                      step="1"
                      bind:value={step.speed}
                    >
                    <div
                      class="flex justify-between px-1 text-xs text-base-content/40"
                    >
                      {#each Array.from({ length: 11 }, (_, k) => k) as tick (tick)}
                        <span>{tick}</span>
                      {/each}
                    </div>
                  </div>

                  <div class="form-control">
                    <label class="label text-sm" for={`step-temp-${i}`}
                      >{m.recipe_form_temperature_label()}</label
                    >
                    <input
                      id={`step-temp-${i}`}
                      name={`steps[${i}].temperature`}
                      type="number"
                      class="input input-sm w-full"
                      min={0}
                      max={200}
                      required
                      bind:value={step.temperature}
                      aria-invalid={fieldError(`steps.${i}.temperature`) ? "true" : undefined}
                    >
                    {#if fieldError(`steps.${i}.temperature`)}
                      <span class="label-text-alt text-error mt-1"
                        >{fieldError(`steps.${i}.temperature`)}</span
                      >
                    {/if}
                  </div>

                  <div class="form-control">
                    <div class="label">
                      <label class="label-text text-sm" for={`step-power-${i}`}
                        >{m.label_power()}</label
                      >
                      <span class="label-text-alt font-bold text-base"
                        >{step.power}</span
                      >
                    </div>
                    <input
                      id={`step-power-${i}`}
                      name={`steps[${i}].power`}
                      type="range"
                      class="range range-sm"
                      min="0"
                      max="10"
                      step="1"
                      bind:value={step.power}
                    >
                    <div
                      class="flex justify-between px-1 text-xs text-base-content/40"
                    >
                      {#each Array.from({ length: 11 }, (_, k) => k) as tick (tick)}
                        <span>{tick}</span>
                      {/each}
                    </div>
                  </div>
                </div>
              {:else}
                <input type="hidden" name={`steps[${i}].totalTime`} value="0">
                <input type="hidden" name={`steps[${i}].speed`} value="0">
                <input type="hidden" name={`steps[${i}].temperature`} value="0">
                <input type="hidden" name={`steps[${i}].power`} value="0">
              {/if}
            </div>
            <!-- End collapsible content -->
          </div>
        {/each}

        {#if stepsList.length === 0}
          <p class="text-base-content/40 py-4 text-center text-sm">
            {m.recipe_form_no_steps()}
            <button type="button" class="link text-primary" onclick={addStep}>
              {m.action_add_one()}
            </button>
          </p>
        {/if}
      </div>
    </div>
  </div>
  <!-- End right column -->

  <div
    class="lg:col-span-2 sticky bottom-0 z-10 flex justify-end gap-3 border-t border-base-200 bg-base-100/95 py-4 backdrop-blur-sm"
  >
    <a href={resolve(cancelUrl)} class="btn btn-ghost">{m.common_cancel()}</a>
    <button
      type="submit"
      class="btn btn-primary"
      disabled={loading || imageUploading}
    >
      {#if loading || imageUploading}
        <span class="loading loading-spinner loading-sm"></span>
        {imageUploading ? m.recipe_form_uploading_image() : m.recipe_form_saving()}
      {:else}
        {submitLabel}
      {/if}
    </button>
  </div>
</form>
