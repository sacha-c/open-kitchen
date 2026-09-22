import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as m from "$lib/paraglide/messages";
import {
  authenticate,
  CecotecError,
  getDevices,
} from "$lib/server/cecotec/client";
import { encrypt } from "$lib/server/crypto";
import { db } from "$lib/server/db";
import { cecotecCredentials } from "$lib/server/db/schema";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.session || !locals.user) {
    redirect(303, "/");
  }

  const userId = locals.user.id;
  const rows = await db
    .select()
    .from(cecotecCredentials)
    .where(eq(cecotecCredentials.userId, userId));
  const credentials = rows[0] ?? null;

  return {
    user: {
      name: locals.user.name,
      email: locals.user.email,
    },
    cecotecLinked: credentials !== null,
    cecotecEmail: credentials?.email ?? null,
  };
};

function createSaveSchema() {
  return z.object({
    email: z
      .string()
      .min(1, m.error_email_required())
      .email(m.error_invalid_email()),
    password: z.string().min(1, m.error_cecotec_password_required()),
  });
}

export const actions: Actions = {
  save: async ({ request, locals }) => {
    if (!locals.session || !locals.user) {
      redirect(303, "/");
    }

    const userId = locals.user.id;
    const formData = await request.formData();
    const raw = {
      email: (formData.get("email") ?? "").toString().trim(),
      password: (formData.get("password") ?? "").toString(),
    };

    const parsed = createSaveSchema().safeParse(raw);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]?.toString();
        if (field) errors[field] = issue.message;
      }
      return fail(400, { errors, email: raw.email });
    }

    let cecotecUserId: string;
    let modelCode: string | null = null;
    try {
      const result = await authenticate(
        parsed.data.email,
        parsed.data.password,
      );
      cecotecUserId = result.userId;
      const devices = await getDevices(result.accessToken);
      modelCode = devices[0]?.modleName ?? null;
    } catch (e) {
      if (e instanceof CecotecError) {
        return fail(400, {
          email: raw.email,
          message: m.error_invalid_cecotec_credentials(),
        });
      }
      throw e;
    }

    const encryptedPassword = encrypt(parsed.data.password);
    const now = new Date();

    await db
      .insert(cecotecCredentials)
      .values({
        id: crypto.randomUUID(),
        userId,
        email: parsed.data.email,
        encryptedPassword,
        cecotecUserId,
        modelCode,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: cecotecCredentials.userId,
        set: {
          email: parsed.data.email,
          encryptedPassword,
          cecotecUserId,
          modelCode,
          updatedAt: now,
        },
      });

    return { success: true, cecotecEmail: parsed.data.email };
  },

  disconnect: async ({ locals }) => {
    if (!locals.session || !locals.user) {
      redirect(303, "/");
    }

    const userId = locals.user.id;
    await db
      .delete(cecotecCredentials)
      .where(eq(cecotecCredentials.userId, userId));

    return { disconnected: true };
  },
};
