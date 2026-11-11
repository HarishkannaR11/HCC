/**
 * Non-negotiables that a grep can enforce.
 *
 *  - No CPT codes or descriptors anywhere in code, migrations or data. CPT is
 *    AMA-licensed; this product uses ICD-10-CM and CMS-HCC only. Markdown is
 *    excluded because the docs state this rule in words.
 *  - No claim of AAPC/AHIMA affiliation in the product.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const SCANNED_DIRS = ["src", "scripts", "supabase/migrations", "data/fixtures"];
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".sql", ".csv", ".txt", ".json", ".css"]);
const THIS_FILE = relative(ROOT, __filename);

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (SCANNED_EXTENSIONS.has(extname(path))) yield path;
  }
}

const sources = SCANNED_DIRS.flatMap((dir) => [...files(join(ROOT, dir))])
  .map((path) => ({ path: relative(ROOT, path), text: readFileSync(path, "utf8") }))
  .filter((f) => f.path !== THIS_FILE);

describe("compliance", () => {
  it("scans a meaningful set of files", () => {
    expect(sources.length).toBeGreaterThan(30);
  });

  it("contains no CPT references", () => {
    const hits = sources.filter((f) => /\bCPT\b|current procedural terminology|\bHCPCS\b/i.test(f.text)).map((f) => f.path);
    expect(hits).toEqual([]);
  });

  it("makes no affiliation claim", () => {
    const pattern = /\b(official|certified by|endorsed by|approved by|partner of)\b[^.\n]{0,40}\b(AAPC|AHIMA)\b|\b(AAPC|AHIMA)\b[^.\n]{0,40}\b(official|certified|endorsed|approved)\b/i;
    const hits = sources.filter((f) => pattern.test(f.text)).map((f) => f.path);
    expect(hits).toEqual([]);
  });
});
