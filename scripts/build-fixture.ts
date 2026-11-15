/**
 * Rebuild the committed CMS-format fixture (data/fixtures/py2026) as a strict
 * subset of the official files in data/raw.
 *
 *   npm run data:fixture
 *
 * Run it after adding or changing a seed chart, so the scoring test and
 * `db:seed:fixture` cover every code the charts use. The fixture keeps:
 *   - every code already in it, plus every key and distractor code of every
 *     seed chart, each with its chain of category headers;
 *   - the crosswalk rows of those codes;
 *   - every HCC they map to, closed over the CMS hierarchy, so each hierarchy
 *     group is complete and trims exactly as it does in production;
 *   - the official lines for all of that, copied verbatim.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatIcd10 } from "../src/lib/icd10";
import { sourceFileNames } from "./lib/reference-build";
import { SEED_CHARTS } from "./seed/charts";

const YEAR = 2026;
const MODEL = "V28";
const RAW = join(process.cwd(), "data", "raw");
const FIXTURE = join(process.cwd(), "data", "fixtures", `py${YEAR}`);
const names = sourceFileNames(YEAR, MODEL);

const read = (dir: string, name: string) => readFileSync(join(dir, name), "utf8").replace(/^﻿/, "");
const lines = (text: string) => text.split(/\r?\n/).filter((l) => l.trim() !== "");
const undotted = (code: string) => code.replace(".", "").toUpperCase();
const firstCell = (line: string) => line.split(",")[0].trim();
const hccOf = (cell: string) => Number(cell.trim().replace(/^HCC/, ""));

function main(): void {
  let raw: Record<keyof typeof names, string[]>;
  try {
    raw = Object.fromEntries(Object.entries(names).map(([key, name]) => [key, lines(read(RAW, name))])) as typeof raw;
  } catch {
    console.error(`Official ${MODEL} PY${YEAR} files are missing from data/raw. See data/README.md.`);
    process.exit(1);
  }
  const existing = lines(read(FIXTURE, names.order)).map((l) => l.slice(6, 13).trim());
  const existingHccs = lines(read(FIXTURE, names.factors)).slice(1).map(firstCell).filter((c) => /^HCC\d+$/.test(c)).map(hccOf);

  // Codes: what the fixture has, plus every code a seed chart uses, plus headers.
  const orderByCode = new Map(raw.order.map((l) => [l.slice(6, 13).trim(), l]));
  const wanted = new Set(existing);
  for (const chart of SEED_CHARTS) {
    for (const code of [...chart.key.map((k) => k.code), ...chart.distractors.map((d) => d.code)]) {
      const r = undotted(code);
      if (!orderByCode.has(r)) throw new Error(`${chart.title}: ${code} is not in the official order file`);
      wanted.add(r);
    }
  }
  for (const code of [...wanted]) {
    for (let n = 3; n < code.length; n++) if (orderByCode.has(code.slice(0, n))) wanted.add(code.slice(0, n));
  }

  // Crosswalk rows for those codes, and the HCCs they reach.
  const [mapHeader, ...mapRows] = raw.mappings;
  const keptMaps = mapRows.filter((l) => wanted.has(firstCell(l)));
  const hccs = new Set<number>([...existingHccs, ...keptMaps.map((l) => Math.round(Number(l.split(",")[1])))]);

  // Close over the hierarchy: whole groups, in both directions.
  const [hierHeader, ...hierRows] = raw.hierarchies;
  const edges = hierRows.map((l) => l.split(",").map((c) => c.trim()).filter(Boolean).map(hccOf));
  for (let changed = true; changed; ) {
    changed = false;
    for (const [parent, ...children] of edges) {
      const group = [parent, ...children];
      if (children.length && group.some((h) => hccs.has(h)) && !group.every((h) => hccs.has(h))) {
        group.forEach((h) => hccs.add(h));
        changed = true;
      }
    }
  }

  const [factorHeader, ...factorRows] = raw.factors;
  const keptFactors = factorRows.filter((l) => /^HCC\d+$/.test(firstCell(l)) && hccs.has(hccOf(firstCell(l))));
  const keptHier = hierRows.filter((l) => hccs.has(hccOf(firstCell(l))));
  const keptOrder = raw.order.filter((l) => wanted.has(l.slice(6, 13).trim()));

  const write = (name: string, rows: string[]) => writeFileSync(join(FIXTURE, name), rows.join("\n") + "\n");
  write(names.order, keptOrder);
  write(names.mappings, [mapHeader, ...keptMaps]);
  write(names.factors, [factorHeader, ...keptFactors]);
  write(names.hierarchies, [hierHeader, ...keptHier]);
  write(names.categories, raw.categories);

  const billable = keptOrder.filter((l) => l[14] === "1").length;
  console.log(`Fixture written to ${FIXTURE}`);
  console.log(`  ${keptOrder.length} ICD-10-CM codes (${billable} billable), ${keptMaps.length} crosswalk rows, ${keptFactors.length} HCCs`);
  console.log(`  seed charts covered: ${SEED_CHARTS.length}; e.g. ${formatIcd10(undotted(SEED_CHARTS[0].key[0].code))}`);
}

main();
