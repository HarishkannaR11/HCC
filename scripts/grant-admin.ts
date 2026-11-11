/**
 * Promote an existing account to admin (or back to learner).
 *
 *   npm run admin:grant -- someone@example.com
 *   npm run admin:grant -- someone@example.com --revoke
 *
 * Roles are never settable from the app or the API; this script (direct
 * Postgres, DATABASE_URL) is the only path.
 */
import { parseArgs } from "node:util";
import { Client } from "pg";
import { databaseUrl } from "./lib/env";

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { revoke: { type: "boolean", default: false } },
  });
  const email = positionals[0]?.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Usage: npm run admin:grant -- <email> [--revoke]");
  const role = values.revoke ? "learner" : "admin";

  const db = new Client({ connectionString: databaseUrl() });
  await db.connect();
  try {
    const result = await db.query(
      `update public.profiles p set role = $2
       from auth.users u
       where u.id = p.id and lower(u.email) = $1
       returning p.id`,
      [email, role],
    );
    if (result.rowCount === 0) throw new Error(`No account for ${email}. Sign up first, then run this again.`);
    console.log(`${email} is now ${role}.`);
  } finally {
    await db.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
