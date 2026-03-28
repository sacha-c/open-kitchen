import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals: { supabase } }) => {
  const { data, error } = await supabase.auth.getClaims();
  if (!error && data?.claims) {
    redirect(303, "/account");
  }
  return { url: url.origin };
};

export const actions: Actions = {
  default: async (event) => {
    const {
      request,
      locals: { supabase },
    } = event;
    const formData = await request.formData();
    const email = (formData.get("email") || "").toString().trim();
    const password = (formData.get("password") || "").toString();
    const errors: Record<string, string> = {};

    // Email validation
    if (!/^[\w-.+]+@([\w-]+\.)+[\w-]{2,8}$/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }
    // Password validation
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.password =
        "Password must contain at least one letter and one number.";
    }
    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, email });
    }

    // Try sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!signInError) {
      return { success: true, message: "Signed in successfully!" };
    }

    // If user not found, try sign up
    if (
      signInError.message?.match(
        /invalid login|user not found|invalid credentials|email or password/gi,
      )
    ) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        return fail(400, {
          success: false,
          email,
          message:
            signUpError.message ||
            "There was an issue creating your account. Please try again or contact support.",
        });
      }
      return {
        success: true,
        message: "Account created and signed in successfully!",
      };
    }

    // Other errors
    return fail(400, {
      success: false,
      email,
      message:
        signInError.message || "There was an issue, Please contact support.",
    });
  },
};
