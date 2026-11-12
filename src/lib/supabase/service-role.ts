import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Service-role client. BYPASSES ROW LEVEL SECURITY.
 *
 * `server-only` makes importing this from a Client Component a build error,
 * and scripts/check-client-bundle.ts fails the build if the key itself ever
 * appears in .next/static. Use it only where RLS cannot express the rule:
 * reading the answer key after a verified submission (Phase 2) and billing
 * webhooks (Phase 4).
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(publicEnv().supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
