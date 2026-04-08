import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { auth } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) =>
  svelteKitHandler({ event, resolve: () => new Response(), auth, building });

export const POST: RequestHandler = async (event) =>
  svelteKitHandler({ event, resolve: () => new Response(), auth, building });
