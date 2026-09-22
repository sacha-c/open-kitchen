import { fail, redirect } from "@sveltejs/kit";
import * as m from "$lib/paraglide/messages";
import { auth } from "$lib/server/auth";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) {
    redirect(303, "/");
  }
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const email = (formData.get("email") || "").toString().trim();
    const password = (formData.get("password") || "").toString();
    const name = (formData.get("name") || "").toString().trim();
    const errors: Record<string, string> = {};

    if (!name) {
      errors.name = m.error_name_required();
    }
    if (!/^[\w-.+]+@([\w-]+\.)+[\w-]{2,8}$/.test(email)) {
      errors.email = m.error_invalid_email();
    }
    if (password.length < 8) {
      errors.password = m.error_password_too_short({ min: 8 });
    }
    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, email, name });
    }

    const response = await auth.api.signUpEmail({
      body: { email, password, name },
      asResponse: true,
    });
    if (!response.ok) {
      return fail(400, {
        email,
        name,
        message: m.error_signup_failed(),
      });
    }

    redirect(303, "/");
  },
};
