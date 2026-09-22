import { redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { getLocale } from "$lib/paraglide/runtime";
import {
  authenticate,
  CecotecError,
  listCatalogCategories,
  listPublicCatalog,
} from "$lib/server/cecotec/client";
import { decrypt } from "$lib/server/crypto";
import { db } from "$lib/server/db";
import { cecotecCredentials } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.session || !locals.user) {
    redirect(303, "/");
  }

  const [creds] = await db
    .select()
    .from(cecotecCredentials)
    .where(eq(cecotecCredentials.userId, locals.user.id));

  const categoryId = url.searchParams.get("category");
  const page = Number(url.searchParams.get("page") ?? "1") || 1;

  if (!creds) {
    return {
      linked: false,
      error: null,
      categories: [],
      recipes: [],
      selectedCategoryId: categoryId,
      page,
      totalPages: 0,
    };
  }

  // Cecotec's catalog only has en/es content; ca falls back to es (same
  // mapping used elsewhere for Cecotec calls, e.g. transformRecipeForCecotec).
  const locale = getLocale();
  const code: "en" | "es" = locale === "en" ? "en" : "es";

  try {
    const { accessToken } = await authenticate(
      creds.email,
      decrypt(creds.encryptedPassword),
    );

    const [categories, catalog] = await Promise.all([
      listCatalogCategories(accessToken, code),
      listPublicCatalog(accessToken, {
        code,
        categoryId: categoryId ?? undefined,
        currentPageNo: page,
        pageSize: PAGE_SIZE,
      }),
    ]);

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
      })),
      selectedCategoryId: categoryId,
      page: catalog.current,
      totalPages: catalog.pages,
    };
  } catch (e) {
    if (e instanceof CecotecError) {
      return {
        linked: true,
        error: e.message,
        categories: [],
        recipes: [],
        selectedCategoryId: categoryId,
        page,
        totalPages: 0,
      };
    }
    throw e;
  }
};
