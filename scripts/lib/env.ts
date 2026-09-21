import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Loads .env for the standalone data scripts. Next.js does this itself at
 * runtime; tsx does not.
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

export function supabaseConfig(): { url: string; key: string } {
  loadEnv();
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  // The dashboard offers the URL with the Data API path already appended;
  // supabase-js wants the bare project origin.
  const url = raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  return { url, key };
}
