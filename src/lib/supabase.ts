import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browser: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (typeof window === "undefined") return createClient(url, key);
  if (!browser) {
    browser = createClient(url, key, {
      auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true },
    });
  }
  return browser;
}
