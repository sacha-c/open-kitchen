import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { getTextDirection } from "$lib/paraglide/runtime";
import { paraglideMiddleware } from "$lib/paraglide/server";
import { auth } from "$lib/server/auth";

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

const handleAuth: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });
  event.locals.session = session?.session ?? null;
  event.locals.user = session?.user ?? null;
  return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(handleParaglide, handleAuth);
