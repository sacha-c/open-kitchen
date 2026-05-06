/**
 * Static catalog lookups for Cecotec ingredient and unit IDs.
 *
 * Catalogs are bundled at build time from:
 *   src/lib/server/cecotec/catalog_ingredients.json  (1051 entries, en/es/ca)
 *   src/lib/server/cecotec/catalog_units.json         (47 entries)
 *
 * Refresh catalogs by running: .mambo/build_catalogs.py
 */

import ingredientsRaw from "./catalog_ingredients.json";
import unitsRaw from "./catalog_units.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IngredientEntry {
  id: string;
  en: string;
  es: string;
  ca: string;
}

interface UnitEntry {
  id: string;
  name: string;
}

const ingredients = ingredientsRaw as IngredientEntry[];
const units = unitsRaw as UnitEntry[];

// ---------------------------------------------------------------------------
// Language fallback: Cecotec API has no Catalan ingredient names → fall back to Spanish
// ---------------------------------------------------------------------------
function catalogLang(lang: string): "en" | "es" | "ca" {
  if (lang === "en") return "en";
  if (lang === "ca") return "es"; // ca not available in API catalog
  return "es";
}

// ---------------------------------------------------------------------------
// Lookup: ingredient name → ID
// ---------------------------------------------------------------------------

/** Build a case-insensitive name→id index for a given language. */
function buildIngredientIndex(lang: "en" | "es"): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of ingredients) {
    const name = entry[lang];
    if (name) map.set(name.toLowerCase(), entry.id);
  }
  return map;
}

const ingredientIndexEn = buildIngredientIndex("en");
const ingredientIndexEs = buildIngredientIndex("es"); /**
 * Look up a Cecotec ingredient ID by display name and recipe language.
 * Falls back: ca → es, unknown lang → en.
 * Returns null if not found in the catalog.
 */
export function lookupIngredientId(name: string, lang: string): string | null {
  const resolvedLang = catalogLang(lang);
  const primary = resolvedLang === "en" ? ingredientIndexEn : ingredientIndexEs;
  const fallback =
    resolvedLang === "en" ? ingredientIndexEs : ingredientIndexEn;

  return (
    primary.get(name.toLowerCase()) ?? fallback.get(name.toLowerCase()) ?? null
  );
}

// ---------------------------------------------------------------------------
// Lookup: unit abbreviation → ID
// ---------------------------------------------------------------------------

const unitIndex = new Map<string, string>();
for (const u of units) {
  unitIndex.set(u.name.toLowerCase(), u.id);
}

/**
 * Look up a Cecotec unit ID by abbreviation (e.g. "g", "ml", "tsp").
 * Returns null if not found.
 */
export function lookupUnitId(unitName: string): string | null {
  return unitIndex.get(unitName.toLowerCase()) ?? null;
}

// ---------------------------------------------------------------------------
// Accessors for the full catalogs (e.g. for UI dropdowns)
// ---------------------------------------------------------------------------

export function getIngredientCatalog(): IngredientEntry[] {
  return ingredients;
}

export function getUnitCatalog(): UnitEntry[] {
  return units;
}
