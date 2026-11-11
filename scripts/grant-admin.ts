/**
 * Grant (or revoke) the admin role. The role column cannot be written by any
 * client, so this service-role script is the only way to make an admin.
 *
 *   npm run admin:grant -- you@example.com
 *   npm run admin:grant -- you@example.com --revoke
 *
 * The account must already exist (sign up first).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { supabaseConfig } from "./lib/env";

async function main(): Promise<void> {
  const email = process.argv.slice(2).find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  const revoke = process.argv.includes("--revoke");
  if (!email) throw new Error("Usage: npm run admin:grant -- <email> [--revoke]");

  const { url, key } = supabaseConfig();
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  let userId: string | null = null;
  for (let page = 1; !userId; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Listing users failed: ${error.message}`);
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 200) break;
  }
  if (!userId) throw new Error(`No account for ${email}. Sign up first, then re-run.`);

  const role = revoke ? "learner" : "admin";
  const { data, error } = await db.from("profiles").update({ role }).eq("id", userId).select("id");
  if (error) throw new Error(`Updating profile failed: ${error.message}`);
  if (!data.length) throw new Error(`${email} has no profile row — was the account created before migration 0004?`);

  console.log(`${email} is now ${role === "admin" ? "an admin" : "a learner"}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
