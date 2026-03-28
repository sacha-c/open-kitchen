import { createServerClient } from "@supabase/ssr";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import {
  PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  PUBLIC_SUPABASE_URL,
} from "$env/static/public";
import { getTextDirection } from "$lib/paraglide/runtime";
import { paraglideMiddleware } from "$lib/paraglide/server";

const handleParaglide: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }) => {
    event.request = request;

    return resolve(event, {
      transformPageChunk: ({ html }) =>
        html
          .replace("%paraglide.lang%", locale)
          .replace("%paraglide.dir%", getTextDirection(locale)),
    });
  });

const handleSupabase: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    {
      cookies: {
        getAll: () => event.cookies.getAll(),
        /**
         * Note: You have to add the `path` variable to the
         * set and remove method due to sveltekit's cookie API
         * requiring this to be set, setting the path to `/`
         * will replicate previous/standard behaviour (https://kit.svelte.dev/docs/types#public-types-cookies)
         */
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: "/" });
          });
        },
      },
    },
  );
  return resolve(event, {
    filterSerializedResponseHeaders(name: string) {
      return name === "content-range" || name === "x-supabase-api-version";
    },
  });
};

export const handle: Handle = sequence(handleParaglide, handleSupabase);
