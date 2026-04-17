<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import { languageTag } from "$lib/paraglide/runtime";
  import type { SubmitFunction } from "./$types.js";

  interface FormResult {
    errors?: Record<string, string>;
    values?: Record<string, unknown>;
  }
  let { form }: { form: FormResult | null } = $props();

  let loading = $state(false);

  const UNITS = ["g", "ml", "tsp", "tbsp", "Pizca", "units"];
  const SPEED_OPTIONS = Array.from({ length: 11 }, (_, i) => String(i));

  interface Ingredient {
    name: string;
    amount: string;
    unit: string;
  }
  interface Step {
    description: string;
    operationType: number;
    time: number;
    speed: string;
    temperature: number;
    power: number;
  }

  function restoreIngredients(): Ingredient[] {
    const vals = form?.values;
    if (!vals?.ingredients || !Array.isArray(vals.ingredients)) {
      return [{ name: "", amount: "", unit: "g" }];
    }
    return (vals.ingredients as Ingredient[]).length > 0
      ? (vals.ingredients as Ingredient[])
      : [{ name: "", amount: "", unit: "g" }];
  }

  function restoreSteps(): Step[] {
    const vals = form?.values;
    if (!vals?.steps || !Array.isArray(vals.steps)) {
      return [
        {
          description: "",
          operationType: 1,
          time: 0,
          speed: "0",
          temperature: 0,
          power: 0,
        },
      ];
    }
    return (vals.steps as Step[]).length > 0
      ? (vals.steps as Step[])
      : [
          {
            description: "",
            operationType: 1,
            time: 0,
            speed: "0",
            temperature: 0,
            power: 0,
          },
        ];
  }

  let ingredients = $state<Ingredient[]>(restoreIngredients());
  let steps = $state<Step[]>(restoreSteps());

  let cookingTime = $derived(
    steps.reduce((sum, s) => sum + (Number(s.time) || 0), 0),
  );

  function formatTime(seconds: number): string {
    if (seconds === 0) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? (s > 0 ? `${m}m ${s}s` : `${m}m`) : `${s}s`;
  }

  function addIngredient() {
    ingredients.push({ name: "", amount: "", unit: "g" });
  }

  function removeIngredient(index: number) {
    ingredients.splice(index, 1);
  }

  function moveIngredient(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ingredients.length) return;
    const temp = ingredients[index];
    ingredients[index] = ingredients[target];
    ingredients[target] = temp;
  }

  function addStep() {
    steps.push({
      description: "",
      operationType: 1,
      time: 0,
      speed: "0",
      temperature: 0,
      power: 0,
    });
  }

  function removeStep(index: number) {
    steps.splice(index, 1);
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const temp = steps[index];
    steps[index] = steps[target];
    steps[target] = temp;
  }

  function fieldError(name: string): string | undefined {
    return form?.errors?.[name];
  }

  const handleSubmit: SubmitFunction = () => {
    loading = true;
    return async ({ update }) => {
      await update();
      loading = false;
    };
  };
</script>

<svelte:head> <title>New Recipe — OpenKitchen</title> </svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="mb-8 text-3xl font-bold">New Recipe</h1>

  <form method="POST" use:enhance={handleSubmit} class="flex flex-col gap-8">
    <!-- Recipe Metadata -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h2 class="card-title text-lg">Recipe Details</h2>

        <div class="form-control">
          <label class="label" for="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            class="input input-bordered w-full"
            maxlength={200}
            required
            value={form?.values?.name ?? ""}
            aria-invalid={fieldError("name") ? "true" : undefined}
            aria-describedby={fieldError("name") ? "name-error" : undefined}
          >
          {#if fieldError("name")}
            <span id="name-error" class="label-text-alt text-error mt-1">
              {fieldError("name")}
            </span>
          {/if}
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label" for="servings">Servings</label>
            <input
              id="servings"
              name="servings"
              type="text"
              class="input input-bordered w-full"
              placeholder="e.g. 2, 4-6"
              required
              value={form?.values?.servings ?? ""}
              aria-invalid={fieldError("servings") ? "true" : undefined}
              aria-describedby={fieldError("servings")
                ? "servings-error"
                : undefined}
            >
            {#if fieldError("servings")}
              <span id="servings-error" class="label-text-alt text-error mt-1">
                {fieldError("servings")}
              </span>
            {/if}
          </div>

          <div class="form-control">
            <label class="label" for="language">Language</label>
            <select
              id="language"
              name="language"
              class="select select-bordered w-full"
              required
            >
              <option
                value="en"
                selected={((form?.values?.language as string) ?? languageTag()) === "en"}
              >
                English
              </option>
              <option
                value="es"
                selected={((form?.values?.language as string) ?? languageTag()) === "es"}
              >
                Español
              </option>
              <option
                value="ca"
                selected={((form?.values?.language as string) ?? languageTag()) === "ca"}
              >
                Català
              </option>
            </select>
          </div>
        </div>

        <div class="form-control">
          <span class="label">Image</span>
          <div
            class="bg-base-200 flex h-32 items-center justify-center rounded-lg border-2 border-dashed"
          >
            <span class="text-base-content/40 text-sm">
              Image upload coming soon
            </span>
          </div>
        </div>

        <div class="text-base-content/60 mt-2 text-sm">
          Total cooking time: <strong>{formatTime(cookingTime)}</strong>
          (auto-calculated from steps)
        </div>
      </div>
    </div>

    <!-- Ingredients Section -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h2 class="card-title text-lg">Ingredients</h2>
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            onclick={addIngredient}
          >
            + Add
          </button>
        </div>

        {#each ingredients as ingredient, i (i)}
          <div class="bg-base-200/50 flex flex-col gap-2 rounded-lg p-3">
            <div class="flex items-start gap-2">
              <div class="form-control flex-1">
                <input
                  name={`ingredients[${i}].name`}
                  type="text"
                  class="input input-bordered input-sm w-full"
                  placeholder="Ingredient name"
                  bind:value={ingredient.name}
                  aria-invalid={fieldError(`ingredients.${i}.name`)
                    ? "true"
                    : undefined}
                >
                {#if fieldError(`ingredients.${i}.name`)}
                  <span class="label-text-alt text-error mt-1">
                    {fieldError(`ingredients.${i}.name`)}
                  </span>
                {/if}
              </div>
              <div class="form-control w-20">
                <input
                  name={`ingredients[${i}].amount`}
                  type="text"
                  class="input input-bordered input-sm w-full"
                  placeholder="Amt"
                  bind:value={ingredient.amount}
                  aria-invalid={fieldError(`ingredients.${i}.amount`)
                    ? "true"
                    : undefined}
                >
                {#if fieldError(`ingredients.${i}.amount`)}
                  <span class="label-text-alt text-error mt-1">
                    {fieldError(`ingredients.${i}.amount`)}
                  </span>
                {/if}
              </div>
              <div class="form-control w-24">
                <select
                  name={`ingredients[${i}].unit`}
                  class="select select-bordered select-sm w-full"
                  bind:value={ingredient.unit}
                  aria-invalid={fieldError(`ingredients.${i}.unit`)
                    ? "true"
                    : undefined}
                >
                  {#each UNITS as unit (unit)}
                    <option value={unit}>{unit}</option>
                  {/each}
                </select>
              </div>
              <div class="flex gap-1">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  disabled={i === 0}
                  onclick={() => moveIngredient(i, -1)}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  disabled={i === ingredients.length - 1}
                  onclick={() => moveIngredient(i, 1)}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error"
                  onclick={() => removeIngredient(i)}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        {/each}

        {#if ingredients.length === 0}
          <p class="text-base-content/40 py-4 text-center text-sm">
            No ingredients added.
            <button
              type="button"
              class="link text-primary"
              onclick={addIngredient}
            >
              Add one
            </button>
          </p>
        {/if}
      </div>
    </div>

    <!-- Steps Section -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h2 class="card-title text-lg">Steps</h2>
          <button type="button" class="btn btn-sm btn-ghost" onclick={addStep}>
            + Add
          </button>
        </div>

        {#if fieldError("steps")}
          <div class="alert alert-error text-sm">{fieldError("steps")}</div>
        {/if}

        {#each steps as step, i (i)}
          <div class="bg-base-200/50 flex flex-col gap-3 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold">Step {i + 1}</span>
              <div class="flex gap-1">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  disabled={i === 0}
                  onclick={() => moveStep(i, -1)}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  disabled={i === steps.length - 1}
                  onclick={() => moveStep(i, 1)}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error"
                  onclick={() => removeStep(i)}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>

            <div class="form-control">
              <label class="label text-sm" for={`step-desc-${i}`}>
                Description
              </label>
              <textarea
                id={`step-desc-${i}`}
                name={`steps[${i}].description`}
                class="textarea textarea-bordered w-full"
                maxlength={1000}
                rows={2}
                required
                bind:value={step.description}
                aria-invalid={fieldError(`steps.${i}.description`)
                  ? "true"
                  : undefined}
              ></textarea>
              {#if fieldError(`steps.${i}.description`)}
                <span class="label-text-alt text-error mt-1">
                  {fieldError(`steps.${i}.description`)}
                </span>
              {/if}
            </div>

            <div class="form-control">
              <label class="label text-sm" for={`step-type-${i}`}> Type </label>
              <select
                id={`step-type-${i}`}
                name={`steps[${i}].operationType`}
                class="select select-bordered select-sm w-full"
                bind:value={step.operationType}
                required
              >
                <option value={1}>Preparation</option>
                <option value={2}>Cooking</option>
                <option value={0}>Manual</option>
              </select>
            </div>

            {#if step.operationType === 2}
              <div class="bg-base-300/50 grid grid-cols-2 gap-3 rounded-lg p-3">
                <div class="form-control">
                  <label class="label text-sm" for={`step-time-${i}`}>
                    Time (seconds)
                  </label>
                  <input
                    id={`step-time-${i}`}
                    name={`steps[${i}].time`}
                    type="number"
                    class="input input-bordered input-sm w-full"
                    min={1}
                    max={5400}
                    required
                    bind:value={step.time}
                    aria-invalid={fieldError(`steps.${i}.time`)
                      ? "true"
                      : undefined}
                  >
                  {#if fieldError(`steps.${i}.time`)}
                    <span class="label-text-alt text-error mt-1">
                      {fieldError(`steps.${i}.time`)}
                    </span>
                  {/if}
                </div>

                <div class="form-control">
                  <label class="label text-sm" for={`step-speed-${i}`}>
                    Speed
                  </label>
                  <select
                    id={`step-speed-${i}`}
                    name={`steps[${i}].speed`}
                    class="select select-bordered select-sm w-full"
                    bind:value={step.speed}
                    required
                  >
                    {#each SPEED_OPTIONS as s (s)}
                      <option value={s}>{s}</option>
                    {/each}
                  </select>
                </div>

                <div class="form-control">
                  <label class="label text-sm" for={`step-temp-${i}`}>
                    Temperature (°C)
                  </label>
                  <input
                    id={`step-temp-${i}`}
                    name={`steps[${i}].temperature`}
                    type="number"
                    class="input input-bordered input-sm w-full"
                    min={0}
                    max={200}
                    required
                    bind:value={step.temperature}
                    aria-invalid={fieldError(`steps.${i}.temperature`)
                      ? "true"
                      : undefined}
                  >
                  {#if fieldError(`steps.${i}.temperature`)}
                    <span class="label-text-alt text-error mt-1">
                      {fieldError(`steps.${i}.temperature`)}
                    </span>
                  {/if}
                </div>

                <div class="form-control">
                  <label class="label text-sm" for={`step-power-${i}`}>
                    Power
                  </label>
                  <input
                    id={`step-power-${i}`}
                    name={`steps[${i}].power`}
                    type="number"
                    class="input input-bordered input-sm w-full"
                    min={0}
                    max={10}
                    required
                    bind:value={step.power}
                    aria-invalid={fieldError(`steps.${i}.power`)
                      ? "true"
                      : undefined}
                  >
                  {#if fieldError(`steps.${i}.power`)}
                    <span class="label-text-alt text-error mt-1">
                      {fieldError(`steps.${i}.power`)}
                    </span>
                  {/if}
                </div>
              </div>
            {:else}
              <!-- Hidden fields for non-cooking steps to ensure form data is sent -->
              <input type="hidden" name={`steps[${i}].time`} value="0">
              <input type="hidden" name={`steps[${i}].speed`} value="0">
              <input type="hidden" name={`steps[${i}].temperature`} value="0">
              <input type="hidden" name={`steps[${i}].power`} value="0">
            {/if}
          </div>
        {/each}

        {#if steps.length === 0}
          <p class="text-base-content/40 py-4 text-center text-sm">
            No steps added.
            <button type="button" class="link text-primary" onclick={addStep}>
              Add one
            </button>
          </p>
        {/if}
      </div>
    </div>

    <!-- Submit -->
    <div class="flex justify-end gap-3">
      <a href={resolve("/recipes")} class="btn btn-ghost">Cancel</a>
      <button type="submit" class="btn btn-primary" disabled={loading}>
        {#if loading}
          <span class="loading loading-spinner loading-sm"></span>
          Creating…
        {:else}
          Create Recipe
        {/if}
      </button>
    </div>
  </form>
</div>
