import { createClient } from "@supabase/supabase-js";
import {
  PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  PUBLIC_SUPABASE_URL,
} from "$env/static/public";

const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseKey = PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
