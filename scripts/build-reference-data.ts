/**
 * Parse one payment year of CMS/CDC source files into
 * data/processed/py<year>.json, ready for `npm run data:load`.
 *
 *   npm run data:build                                   # PY2026, V28, data/raw
 *   npm run data:build -- --source data/fixtures/py2026 --fixture
 *   npm run data:build -- --year 2027 --model V28 --source data/raw/py2027
 *
 * Pure transformation (scripts/lib/reference-build.ts) plus file I/O. Nothing
 * here touches the network or the database, so the parse can be re-run and
 * diffed offline.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { buildReference, sourceFileNames, type SourceFiles } from "./lib/reference-build";

function main(): void {
  const { values } = parseArgs({
    options: {
      year: { type: "string", default: "2026" },
      model: { type: "string", default: "V28" },
      source: { type: "string", default: join("data", "raw") },
      fixture: { type: "boolean", default: false },
    },
  });

  const year = Number(values.year);
  if (!Number.isInteger(year)) throw new Error(`--year must be an integer, got ${values.year}`);
  const model = values.model.toUpperCase();
  const source = resolve(values.source);

  const names = sourceFileNames(year, model);
  const files = Object.fromEntries(
    Object.entries(names).map(([key, name]) => {
      try {
        return [key, readFileSync(join(source, name), "utf8")];
      } catch {
        throw new Error(`Missing source file ${join(values.source, name)} - see data/README.md`);
      }
    }),
  ) as unknown as SourceFiles;

  console.log(`Parsing PY${year} ${model} reference data from ${values.source}${values.fixture ? " (fixture)" : ""}\n`);
  const release = buildReference(files, {
    paymentYear: year,
    model,
    expectFullRelease: !values.fixture,
    log: (line) => console.log(line),
  });

  const outDir = join(process.cwd(), "data", "processed");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `py${year}.json`);
  writeFileSync(outFile, JSON.stringify(release), "utf8");
  console.log(`\nWrote ${outFile}`);
}

main();
