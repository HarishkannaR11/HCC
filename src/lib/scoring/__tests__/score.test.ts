import { describe, expect, it } from "vitest";
import { SCORE_WEIGHTS } from "../weights";
import { blendScore, rafAccuracy, scoreAttempt, type KeyCode } from "../score";
import type { Patient } from "@/lib/hcc/types";
import { v28Fixture } from "./v28-fixture";

const male73: Patient = { age: 73, sex: "male" };
const female79: Patient = { age: 79, sex: "female" };

const required = (...codes: string[]): KeyCode[] => codes.map((code) => ({ code, required: true }));

// Seed chart 1 (diabetes + CKD 3a + COPD): key HCCs 37 + 329 + 280 = 0.612.
const CHART1_KEY: KeyCode[] = [
  ...required("E11.22", "N18.31", "I12.9", "J44.9", "E78.5"),
  { code: "Z79.84", required: false },
];
// Seed chart 2 (HFrEF + AF): key HCCs 226 + 238 = 0.659; I42.0's HCC227 is trimmed by 226.
const CHART2_KEY = required("I11.0", "I50.22", "I42.0", "I48.19", "Z79.01", "Z85.3");

const score = (submitted: string[], key: KeyCode[], patient: Patient = male73) =>
  scoreAttempt({ submitted, key, patient, reference: v28Fixture() });

describe("SCORE_WEIGHTS", () => {
  it("is the spec's 0.5 / 0.3 / 0.2 blend and sums to 1", () => {
    expect(SCORE_WEIGHTS).toEqual({ recall: 0.5, precision: 0.3, raf: 0.2 });
    expect(SCORE_WEIGHTS.recall + SCORE_WEIGHTS.precision + SCORE_WEIGHTS.raf).toBeCloseTo(1, 10);
  });
});

describe("scoreAttempt — the spec's six steps", () => {
  it("scores a perfect submission at 100", () => {
    const result = score(["E11.22", "N18.31", "I12.9", "J44.9", "E78.5"], CHART1_KEY);
    expect(result.captured).toEqual([37, 280, 329]);
    expect(result.missed).toEqual([]);
    expect(result.overCoded).toEqual([]);
    expect(result.user.raf).toBe(0.612);
    expect(result.key.raf).toBe(0.612);
    expect(result.rafDelta).toBe(0);
    expect(result.scorePct).toBe(100);
  });

  it("counts a missed HCC against recall and RAF, worked by hand", () => {
    // Missed CKD 3a. Captured 2, missed 1, over 0.
    // recall 2/3, precision 1, RAF 0.485 vs 0.612 → Δ −0.127, accuracy 1 − 0.127/0.612 = 0.79248…
    // score = 0.5·0.6667 + 0.3·1 + 0.2·0.79248 = 0.79183 → 79.18
    const result = score(["E11.22", "J44.9"], CHART1_KEY);
    expect(result.captured).toEqual([37, 280]);
    expect(result.missed).toEqual([329]);
    expect(result.recall).toBeCloseTo(2 / 3, 10);
    expect(result.precision).toBe(1);
    expect(result.user.raf).toBe(0.485);
    expect(result.rafDelta).toBe(-0.127);
    expect(result.rafAccuracy).toBeCloseTo(1 - 0.127 / 0.612, 10);
    expect(result.scorePct).toBe(79.18);
  });

  it("treats a status code where only history is documented as an over-code (review gate)", () => {
    // Chart 2, all correct plus C50.912 (active breast cancer; only history documented).
    // captured 226, 238; over-coded 23. recall 1, precision 2/3.
    // RAF 0.845 vs 0.659 → Δ +0.186, accuracy 1 − 0.186/0.659 = 0.71775…
    // score = 0.5 + 0.2 + 0.2·0.71775 = 0.84355 → 84.36
    const result = score(["I11.0", "I50.22", "I42.0", "I48.19", "Z79.01", "C50.912"], CHART2_KEY, female79);
    expect(result.overCoded).toEqual([23]);
    expect(result.precision).toBeCloseTo(2 / 3, 10);
    expect(result.rafDelta).toBe(0.186);
    expect(result.scorePct).toBe(84.36);
  });

  it("puts the wrong HCC of a family on both sides of the ledger", () => {
    // E11.9 instead of E11.22: the diabetes family is coded, but at HCC38, not HCC37.
    const result = score(["E11.9", "N18.31", "J44.9"], CHART1_KEY);
    expect(result.missed).toEqual([37]);
    expect(result.overCoded).toEqual([38]);
    expect(result.user.raf).toBe(0.612); // same coefficient in V28; still wrong
    // recall 2/3, precision 2/3, RAF accuracy 1: 0.5·0.6667 + 0.3·0.6667 + 0.2 = 0.73333
    expect(result.scorePct).toBe(73.33);
    expect(blendScore({ recall: 2 / 3, precision: 2 / 3, rafAccuracy: 1 })).toBe(73.33);
  });
});

describe("scoreAttempt — hierarchy trimming", () => {
  it("trims a milder HCC on the learner's side before comparing (37 suppresses 38)", () => {
    const result = score(["E11.22", "E11.9", "N18.31", "J44.9"], CHART1_KEY);
    expect(result.user.hccs).toEqual([37, 280, 329]);
    expect(result.user.trimmed).toEqual([{ hcc: 38, suppressedBy: 37 }]);
    expect(result.overCoded).toEqual([]); // HCC38 is not an over-code: the hierarchy removed it
    expect(result.scorePct).toBe(100);
  });

  it("trims the key too: I42.0's HCC227 never counts beside HCC226", () => {
    const result = score(["I50.22", "I48.19"], CHART2_KEY, female79);
    expect(result.key.hccs).toEqual([226, 238]);
    expect(result.key.trimmed).toEqual([{ hcc: 227, suppressedBy: 226 }]);
    expect(result.key.raf).toBe(0.659);
    expect(result.scorePct).toBe(100);
  });

  it("lets an unsupported acuity code suppress the correct HCC (acute on chronic HF)", () => {
    // Learner adds I50.23: HCC224 suppresses 226 and 227 on their side.
    // captured 238; missed 226; over-coded 224. RAF 0.659 both sides (same coefficient).
    const result = score(["I11.0", "I50.22", "I50.23", "I42.0", "I48.19"], CHART2_KEY, female79);
    expect(result.user.hccs).toEqual([224, 238]);
    expect(result.user.trimmed).toEqual([
      { hcc: 226, suppressedBy: 224 },
      { hcc: 227, suppressedBy: 224 },
    ]);
    expect(result.captured).toEqual([238]);
    expect(result.missed).toEqual([226]);
    expect(result.overCoded).toEqual([224]);
    expect(result.rafDelta).toBe(0);
    expect(result.scorePct).toBe(60); // 0.5·0.5 + 0.3·0.5 + 0.2·1
  });

  it("trims transitively within CKD (stage 4 suppresses 3a)", () => {
    const key = required("N18.4");
    const result = score(["N18.31", "N18.4"], key);
    expect(result.user.hccs).toEqual([327]);
    expect(result.user.trimmed).toEqual([{ hcc: 329, suppressedBy: 327 }]);
    expect(result.scorePct).toBe(100);
  });

  it("does not care about submission order", () => {
    const a = score(["N18.31", "J44.9", "E11.9", "E11.22"], CHART1_KEY);
    const b = score(["E11.22", "E11.9", "J44.9", "N18.31"], CHART1_KEY);
    expect(a.user.hccs).toEqual(b.user.hccs);
    expect(a.scorePct).toBe(b.scorePct);
  });
});

describe("scoreAttempt — edges", () => {
  it("reports codes with no HCC separately, not as errors", () => {
    const result = score(["E11.22", "N18.31", "J44.9", "I10", "E78.5"], CHART1_KEY);
    expect(result.noHccImpact).toEqual(["I10", "E78.5"]);
    expect(result.scorePct).toBe(100);
  });

  it("applies CMS age edits before comparing (breast cancer at 42 vs 61)", () => {
    const key = required("C50.011");
    expect(score(["C50.011"], key, { age: 42, sex: "female" }).key.hccs).toEqual([22]);
    expect(score(["C50.011"], key, { age: 61, sex: "female" }).key.hccs).toEqual([23]);
  });

  it("sets optional key codes aside entirely", () => {
    const key: KeyCode[] = [...required("E11.22"), { code: "M06.9", required: false }];
    const result = score(["E11.22", "M06.9"], key);
    expect(result.optionalSetAside).toEqual(["M06.9"]);
    expect(result.overCoded).toEqual([]);
    expect(result.user.raf).toBe(0.166);
    expect(result.scorePct).toBe(100);
  });

  it("ignores duplicate submissions", () => {
    expect(score(["E11.22", "E11.22", "N18.31", "J44.9"], CHART1_KEY).scorePct).toBe(100);
  });

  it("defines precision as 1 when no HCC was submitted (spec), so an HCC-free submission still earns 30", () => {
    const result = score(["I10"], CHART1_KEY);
    expect(result.captured).toEqual([]);
    expect(result.recall).toBe(0);
    expect(result.precision).toBe(1);
    expect(result.rafAccuracy).toBe(0);
    expect(result.scorePct).toBe(30);
  });

  it("handles a key with no HCCs: only an HCC-free submission is accurate", () => {
    const key = required("I10");
    expect(score(["I10"], key).scorePct).toBe(100);
    const over = score(["I10", "E11.9"], key);
    expect(over.recall).toBe(1);
    expect(over.precision).toBe(0);
    expect(over.rafAccuracy).toBe(0);
    expect(over.scorePct).toBe(50);
  });

  it("floors RAF accuracy at 0 when the learner over-codes past double the key", () => {
    expect(rafAccuracy(2.0, 0.5)).toBe(0);
    expect(rafAccuracy(0.75, 0.5)).toBe(0.5);
  });

  it("snapshots a label and coefficient for every HCC it mentions", () => {
    const result = score(["E11.9", "E11.22", "C50.912"], CHART1_KEY);
    expect(Object.keys(result.hccLabels).sort()).toEqual(["23", "280", "329", "37", "38"]);
    expect(result.hccLabels["37"]).toEqual({ code: "HCC37", label: "Diabetes with Chronic Complications", raf: 0.166 });
  });
});
