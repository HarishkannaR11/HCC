import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

/**
 * Service-role client. Bypasses row level security entirely.
 *
 * `server-only` makes importing this from a Client Component a build error, and
 * `npm run build` additionally scans the client bundle for the key itself
 * (scripts/check-client-bundle.ts). Use it only where the caller has already
 * been authenticated and authorised in code: writing scored attempts, and
 * reading an answer key for an attempt the caller has submitted.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");

  return createClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
