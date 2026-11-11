/**
 * Fails the build if anything resembling a service-role credential reached the
 * browser bundle. Runs after `next build` (see the "build" script).
 *
 * `import "server-only"` in src/lib/supabase/service.ts already makes a client
 * import a compile error; this is the second lock, checking the output itself.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { loadEnv } from "./lib/env";

const CLIENT_DIR = join(process.cwd(), ".next", "static");

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(js|mjs|json|html|txt|map)$/.test(name)) yield path;
  }
}

function needles(): { label: string; value: string }[] {
  loadEnv();
  const list = [
    { label: "the SUPABASE_SERVICE_ROLE_KEY variable name", value: "SUPABASE_SERVICE_ROLE_KEY" },
    // base64url of "service_role": present in every legacy service-role JWT payload.
    { label: "a service_role JWT payload", value: "c2VydmljZV9yb2xl" },
    // New-style Supabase secret keys.
    { label: "an sb_secret_ key", value: "sb_secret_" },
  ];
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key && key.length > 20) list.push({ label: "the service-role key value", value: key });
  return list;
}

function main(): void {
  let entries: string[];
  try {
    entries = [...files(CLIENT_DIR)];
  } catch {
    console.error(`No client bundle at ${CLIENT_DIR} — run next build first.`);
    process.exit(1);
  }

  const found: string[] = [];
  const searches = needles();
  for (const file of entries) {
    const text = readFileSync(file, "utf8");
    for (const { label, value } of searches) {
      if (text.includes(value)) found.push(`${relative(process.cwd(), file)}: ${label}`);
    }
  }

  if (found.length > 0) {
    console.error("Service-role credential material found in the client bundle:\n  " + found.join("\n  "));
    process.exit(1);
  }
  console.log(`Client bundle clean: ${entries.length} files checked for ${searches.length} service-role markers.`);
}

main();
