/**
 * Environment, validated at the boundary. Read lazily (functions, not
 * module-level constants) so `next build` does not need runtime secrets.
 *
 * NEXT_PUBLIC_* values are inlined into client bundles by Next.js; everything
 * else stays on the server. The service role key is read only in
 * src/lib/supabase/service-role.ts, which is `server-only`.
 */
import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

export function publicEnv(): { supabaseUrl: string; supabaseAnonKey: string } {
  const env = publicSchema.parse({
    // Literal property access so Next.js can inline these.
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return { supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL, supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}

/**
 * Absolute origin used to build auth redirect URLs (email confirmation,
 * Google OAuth). Must be allow-listed in Supabase Auth's redirect URLs.
 */
export function siteUrl(): string {
  const raw = process.env.SITE_URL ?? "http://localhost:3000";
  return z.url().parse(raw).replace(/\/$/, "");
}
