/**
 * The seed charts, scored against the committed CMS-format fixture
 * (data/fixtures/py2026) through the same parser the loader uses. This ties the
 * engine to real V28 tables rather than a hand-copied slice, and pins the RAF
 * each seed chart's header comment promises a reviewer.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildReference, sourceFileNames, type ReferenceRelease, type SourceFiles } from "../../../../scripts/lib/reference-build";
import { SEED_CHARTS } from "../../../../scripts/seed/charts";
import { requirementsFor } from "@/lib/hcc/model-rules";
import { ageOn } from "@/lib/hcc/resolve";
import type { ReferenceSlice } from "@/lib/hcc/types";
import { reviewCodes } from "../review";
import { scoreAttempt } from "../score";

const FIXTURE = join(__dirname, "..", "..", "..", "..", "data", "fixtures", "py2026");
const hccNumber = (code: string) => Number(code.replace(/^HCC/, ""));

function fixtureRelease(): ReferenceRelease {
  const names = sourceFileNames(2026, "V28");
  const files = Object.fromEntries(
    Object.entries(names).map(([key, name]) => [key, readFileSync(join(FIXTURE, name), "utf8")]),
  ) as unknown as SourceFiles;
  return buildReference(files, { paymentYear: 2026, model: "V28", expectFullRelease: false });
}

function toSlice(release: ReferenceRelease): ReferenceSlice {
  return {
    mappings: release.icd_hcc_map.map((m) => ({
      icd10Code: m.code,
      hccCategory: hccNumber(m.hcc_code),
      ageEdit: m.age_edit,
      sexEdit: m.sex_edit,
      mceAgeCondition: m.mce_age_condition,
    })),
    weights: new Map(
      release.hcc_categories.map((c) => [
        hccNumber(c.hcc_code),
        { category: hccNumber(c.hcc_code), label: c.label, family: c.hierarchy_group, rafWeight: c.raf_community_nondual },
      ]),
    ),
    suppressions: release.hcc_hierarchy.map((h) => ({ category: hccNumber(h.parent), suppressed: hccNumber(h.child) })),
    requirements: requirementsFor(release.hcc_model_version),
  };
}

const reference = toSlice(fixtureRelease());

/** What each chart's header comment promises (scripts/seed/charts.ts). */
const EXPECTED: Record<string, { hccs: number[]; trimmed: number[]; raf: number }> = {
  "00000000-0000-4000-8000-000000000101": { hccs: [37, 280, 329], trimmed: [], raf: 0.612 },
  "00000000-0000-4000-8000-000000000102": { hccs: [224, 238], trimmed: [226], raf: 0.659 },
  "00000000-0000-4000-8000-000000000103": { hccs: [37, 155, 253, 327], trimmed: [38], raf: 1.366 },
};

describe.each(SEED_CHARTS)("seed chart scored on the PY2026 fixture: $title", (chart) => {
  const patient = { age: ageOn(chart.patient.dob, chart.encounterDate), sex: chart.patient.sex };
  const key = chart.key.map((k) => ({ code: k.code, required: k.required }));
  const required = chart.key.filter((k) => k.required).map((k) => k.code);
  const expected = EXPECTED[chart.id];

  it("has a documented expectation", () => {
    expect(expected).toBeDefined();
  });

  it("key HCCs and RAF match the chart's header comment, after hierarchy trimming", () => {
    const result = scoreAttempt({ submitted: required, key, patient, reference });
    expect(result.key.hccs).toEqual(expected.hccs);
    expect(result.key.trimmed.map((t) => t.hcc)).toEqual(expected.trimmed);
    expect(result.key.raf).toBe(expected.raf);
  });

  it("scores exactly the required key at 100", () => {
    expect(scoreAttempt({ submitted: required, key, patient, reference }).scorePct).toBe(100);
  });

  it("names the trap behind every planted distractor", () => {
    const review = reviewCodes(
      [...required, ...chart.distractors.map((d) => d.code)],
      chart.key.map((k) => ({ code: k.code, required: k.required, trap: k.trap })),
      chart.distractors.map((d) => ({ code: d.code, trap: d.trap })),
    );
    expect(review.lines.filter((l) => l.verdict === "distractor").map((l) => l.code)).toEqual(
      chart.distractors.map((d) => d.code),
    );
  });
});
