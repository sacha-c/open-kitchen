import { redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { getLocale } from "$lib/paraglide/runtime";
import {
  CecotecError,
  listCatalogCategories,
  listPublicCatalog,
} from "$lib/server/cecotec/client";
import { getAuthenticatedCecotecSession } from "$lib/server/cecotec/session";
import { db } from "$lib/server/db";
import { recipe } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

const PAGE_SIZE = 20;

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
        .select({ id: recipe.id, cecotecNumber: recipe.cecotecNumber })
        .from(recipe)
        .where(eq(recipe.userId, locals.user.id)),
    ]);

    const localRecipeIdByCecotecNumber = new Map(
      importedRecipes
        .filter((r) => r.cecotecNumber !== null)
        .map((r) => [r.cecotecNumber as string, r.id]),
    );

    return {
      linked: true,
      error: null,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.recipeCategoryName,
      })),
      recipes: catalog.records.map((r) => ({
        id: r.id,
        number: r.number,
        name: r.defaultName,
        imageUrl: r.landscapeImageUrl ?? null,
        cookingTime: r.cookingTime,
        views: r.views ?? null,
        starAvg: r.starAvg != null ? String(r.starAvg) : null,
        importedRecipeId: localRecipeIdByCecotecNumber.get(r.number) ?? null,
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
