import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-to-server routes (the n8n callback).
 * Bypasses RLS, so never import this from client code or use it with
 * user-supplied ids without checking them first.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
