import { fail, redirect } from "@sveltejs/kit";
import { auth } from "$lib/server/auth";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  return {
    user: locals.user,
  };
};

export const actions: Actions = {
  signin: async ({ request }) => {
    const formData = await request.formData();
    const email = (formData.get("email") || "").toString().trim();
    const password = (formData.get("password") || "").toString();
    const errors: Record<string, string> = {};

    if (!/^[\w-.+]+@([\w-]+\.)+[\w-]{2,8}$/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }
    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }
    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, email });
    }

    const response = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });
    if (!response.ok) {
      return fail(400, {
        email,
        message: "Invalid email or password.",
      });
    }

    redirect(303, "/");
  },

  signout: async ({ request }) => {
    await auth.api.signOut({
      headers: request.headers,
    });
    redirect(303, "/");
  },
};
