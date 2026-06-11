import { createClient } from "@supabase/supabase-js";

export const ADMIN_PASSWORD = "rjsqkd3ro!";
export const ADMIN_COOKIE = "choose_my_lunch_admin";
export const ADMIN_COOKIE_VALUE = "signed-in";

export function createAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Admin Supabase credentials are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}
