/**
 * Fails the build if a server secret reaches a browser bundle.
 *
 * Runs after `next build` (npm "postbuild"). Scans everything Next.js serves
 * to browsers (.next/static) for:
 *   - the literal value of SUPABASE_SERVICE_ROLE_KEY, when it is set;
 *   - the variable name itself (a sign server code was bundled for the client);
 *   - Supabase secret keys (sb_secret_...);
 *   - any JWT whose payload claims role "service_role".
 *
 * `server-only` on src/lib/supabase/service-role.ts already turns an import
 * from a Client Component into a build error; this is the second net.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { loadEnv } from "./lib/env";

const STATIC_DIR = join(process.cwd(), ".next", "static");

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

function decodeJwtRole(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function main(): void {
  loadEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const findings: string[] = [];
  let scanned = 0;

  for (const file of walk(STATIC_DIR)) {
    if (!/\.(js|mjs|css|html|json|map|txt)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    const where = relative(process.cwd(), file);
    scanned++;

    if (serviceKey && serviceKey.length > 20 && text.includes(serviceKey)) findings.push(`${where}: SUPABASE_SERVICE_ROLE_KEY value`);
    if (text.includes("SUPABASE_SERVICE_ROLE_KEY")) findings.push(`${where}: SUPABASE_SERVICE_ROLE_KEY name`);
    if (/sb_secret_[A-Za-z0-9_-]{8,}/.test(text)) findings.push(`${where}: Supabase secret key (sb_secret_...)`);
    for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
      if (decodeJwtRole(match[0]) === "service_role") findings.push(`${where}: service_role JWT`);
    }
  }

  if (scanned === 0) {
    console.error("check-client-bundle: no files under .next/static. Run `next build` first.");
    process.exit(1);
  }
  if (findings.length > 0) {
    console.error("\nBUILD FAILED: server secrets found in client bundles:\n");
    for (const finding of findings) console.error(`  ${finding}`);
    process.exit(1);
  }
  console.log(`check-client-bundle: ${scanned} client files scanned, no server secrets found.`);
}

main();
