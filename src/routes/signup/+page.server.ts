import { fail, redirect } from "@sveltejs/kit";
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
      errors.name = "Please enter your name.";
    }
    if (!/^[\w-.+]+@([\w-]+\.)+[\w-]{2,8}$/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
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
        message: "Could not create account. The email may already be in use.",
      });
    }

    redirect(303, "/");
  },
};
