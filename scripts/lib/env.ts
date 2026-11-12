import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Loads .env.local / .env for the standalone scripts. Next.js does this itself
 * at runtime; tsx does not. Variables already set in the shell win.
 */
export function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    let text: string;
    try {
      text = readFileSync(join(process.cwd(), file), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!(match[1] in process.env)) process.env[match[1]] = value;
    }
  }
}

/**
 * Direct Postgres connection string for the seed scripts.
 *
 * Locally: postgresql://postgres:postgres@127.0.0.1:54322/postgres
 * Hosted: the Supabase *session pooler* URI (IPv4, port 5432). The direct
 * db.<ref>.supabase.co host is IPv6-only.
 */
export function databaseUrl(): string {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set - see .env.example");
  return url;
}

/** Supabase API URL and keys, for scripts that go through the public API. */
export function supabaseEnv(): { url: string; anonKey: string; serviceRoleKey: string } {
  loadEnv();
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  // The dashboard offers the URL with the Data API path already appended;
  // supabase-js wants the bare project origin.
  const url = raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  return { url, anonKey, serviceRoleKey };
}
