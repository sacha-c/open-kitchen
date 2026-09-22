import { redirect } from "@sveltejs/kit";
import { and, eq, isNotNull } from "drizzle-orm";
import { getLocale } from "$lib/paraglide/runtime";
import {
  CecotecError,
  listCatalogCategories,
  listPublicCatalog,
} from "$lib/server/cecotec/client";
import { getAuthenticatedCecotecSession } from "$lib/server/cecotec/session";
import type { CecotecCatalogRecipe } from "$lib/server/cecotec/types";
import { db } from "$lib/server/db";
import { recipe } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

const PAGE_SIZE = 20;

// Cecotec's catalog sometimes republishes what is effectively the same
// recipe under a different id/number (same name/image/cooking time, near-
// identical steps — verified in issue #60). We don't need perfect
// correctness here, just to show the better-performing one: group by the
// fields already available in the listing response (no extra API calls)
// and keep whichever has the most views, falling back to rating.
function popularityScore(r: CecotecCatalogRecipe): number {
  return r.views ?? 0;
}

function ratingScore(r: CecotecCatalogRecipe): number {
  const n = typeof r.starAvg === "number" ? r.starAvg : Number(r.starAvg);
  return Number.isFinite(n) ? n : 0;
}

function dedupeCatalogRecords(
  records: CecotecCatalogRecipe[],
): CecotecCatalogRecipe[] {
  const bestByKey = new Map<string, CecotecCatalogRecipe>();
  for (const record of records) {
    const key = `${record.defaultName}|${record.landscapeImageUrl ?? ""}|${record.cookingTime}`;
    const current = bestByKey.get(key);
    if (
      !current ||
      popularityScore(record) > popularityScore(current) ||
      (popularityScore(record) === popularityScore(current) &&
        ratingScore(record) > ratingScore(current))
    ) {
      bestByKey.set(key, record);
    }
  }
  return [...bestByKey.values()];
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.session || !locals.user) {
    redirect(303, "/");
  }

  const categoryId = url.searchParams.get("category");
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const emptyResult = {
    categories: [] as { id: string; name: string }[],
    recipes: [] as {
      id: string;
      number: string;
      name: string;
      imageUrl: string | null;
      cookingTime: number;
      views: number | null;
      starAvg: string | null;
      importedRecipeId: string | null;
    }[],
    selectedCategoryId: categoryId,
    page,
    totalPages: 0,
  };

  try {
    const session = await getAuthenticatedCecotecSession(locals.user.id);
    if (!session) {
      return { linked: false, error: null, ...emptyResult };
    }

    // Cecotec's catalog only has en/es content; ca falls back to es (same
    // mapping used elsewhere for Cecotec calls, e.g. transformRecipeForCecotec).
    const locale = getLocale();
    const code: "en" | "es" = locale === "en" ? "en" : "es";

    const [categories, catalog, importedRecipes] = await Promise.all([
      listCatalogCategories(session.accessToken, code),
      listPublicCatalog(session.accessToken, {
        code,
        categoryId: categoryId ?? undefined,
        currentPageNo: page,
        pageSize: PAGE_SIZE,
      }),
      db
        .select({
          id: recipe.id,
          importedFromCecotecNumber: recipe.importedFromCecotecNumber,
        })
        .from(recipe)
        .where(
          and(
            eq(recipe.userId, locals.user.id),
            isNotNull(recipe.importedFromCecotecNumber),
          ),
        ),
    ]);

    const localRecipeIdByCatalogNumber = new Map(
      importedRecipes.map((r) => [r.importedFromCecotecNumber as string, r.id]),
    );

    return {
      linked: true,
      error: null,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.recipeCategoryName,
      })),
      recipes: dedupeCatalogRecords(catalog.records).map((r) => ({
        id: r.id,
        number: r.number,
        name: r.defaultName,
        imageUrl: r.landscapeImageUrl ?? null,
        cookingTime: r.cookingTime,
        views: r.views ?? null,
        starAvg: r.starAvg != null ? String(r.starAvg) : null,
        importedRecipeId: localRecipeIdByCatalogNumber.get(r.number) ?? null,
      })),
      selectedCategoryId: categoryId,
      page: catalog.current,
      totalPages: catalog.pages,
    };
  } catch (e) {
    if (e instanceof CecotecError) {
      return { linked: true, error: e.message, ...emptyResult };
    }
    throw e;
  }
};
