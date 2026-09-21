/**
 * Data layer for the chart coding workspace.
 *
 * Every function here is async and returns exactly the shape the real routes
 * will (GET /api/chart/[id], GET /api/codes, POST /api/raf-preview,
 * POST /api/score) so swapping the bodies for `fetch` calls later touches
 * only this file — no component should import from `./workspace/mock-*`
 * directly.
 *
 * MOCK — every implementation in this file is replaced in the API-wiring
 * task. Nothing here talks to Supabase or a route handler yet.
 */
import { MOCK_CHART } from "./workspace/mock-chart";
import { MOCK_CODES, MOCK_SUPPRESSION_PAIRS } from "./workspace/mock-codes";
import type {
  Chart,
  CodeSearchResult,
  RafCodePreview,
  RafPreviewResult,
  SubmitAttemptPayload,
  SubmitAttemptResult,
} from "./workspace/types";

/** Simulates network latency so loading states are visible and real. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** GET /api/chart/[id] (future). Returns the chart the browser may see —
 * never the answer key (hard rule: expected_codes never reaches the client). */
export async function getChart(id: string): Promise<Chart> {
  await delay(150);
  if (id !== MOCK_CHART.id) {
    throw new Error(`Unknown chart: ${id}`);
  }
  return MOCK_CHART;
}

/** GET /api/codes?q=&hccOnly= (future). Prefix match on the code, fuzzy match
 * on the description — mirrored here over the small mock catalog. */
export async function searchCodes(q: string, hccOnly: boolean): Promise<CodeSearchResult[]> {
  await delay(200);

  const needle = q.trim().toLowerCase();
  if (needle === "") return [];

  return MOCK_CODES.filter((code) => {
    const matches =
      code.icd10Code.toLowerCase().includes(needle) || code.description.toLowerCase().includes(needle);
    if (!matches) return false;
    return !hccOnly || code.hccs.length > 0;
  }).map((code) => ({
    icd10Code: code.icd10Code,
    description: code.description,
    hccs: code.hccs,
  }));
}

/**
 * POST /api/raf-preview (future). Live RAF preview for the codes currently
 * claimed — never a hint about which codes are *expected*, only what the
 * codes claimed so far are worth.
 *
 * MOCK — replaced by /api/raf-preview. This walk (claim order breaks ties on
 * a shared HCC, then the hierarchy suppresses a milder category in the same
 * family) mirrors src/lib/hcc/raf.ts, but against the two suppression pairs
 * hardcoded in mock-codes.ts rather than the real `hcc_hierarchy` table.
 */
export async function previewRaf(codes: readonly string[]): Promise<RafPreviewResult> {
  await delay(120);

  const byCode = new Map(MOCK_CODES.map((c) => [c.icd10Code, c]));
  const uniqueCodes = [...new Set(codes)];

  // First code (in claim order) to reach each HCC owns it.
  const ownerOf = new Map<number, string>();
  for (const code of uniqueCodes) {
    for (const hcc of byCode.get(code)?.hccs ?? []) {
      if (!ownerOf.has(hcc.category)) ownerOf.set(hcc.category, code);
    }
  }

  const present = new Set(ownerOf.keys());
  const suppressorOf = new Map<number, number>();
  for (const pair of MOCK_SUPPRESSION_PAIRS) {
    if (present.has(pair.category) && present.has(pair.suppressed)) {
      suppressorOf.set(pair.suppressed, pair.category);
    }
  }

  let totalThousandths = 0;
  const capturedHccs: number[] = [];

  const codePreviews: RafCodePreview[] = uniqueCodes.map((icd10Code) => {
    const catalogEntry = byCode.get(icd10Code);
    const hccs = catalogEntry?.hccs ?? [];

    const mappings = hccs.map((hcc) => {
      const weight = catalogEntry?.weights[hcc.category] ?? 0;
      const owner = ownerOf.get(hcc.category);
      const suppressedBy = owner === icd10Code ? suppressorOf.get(hcc.category) ?? null : null;
      // A code that isn't the HCC's owner is a duplicate claim, not a
      // suppression; either way it contributes nothing.
      const counted = owner === icd10Code && suppressedBy === null;

      if (counted) {
        totalThousandths += Math.round(weight * 1000);
        capturedHccs.push(hcc.category);
      }

      return {
        category: hcc.category,
        label: hcc.label,
        rafWeight: weight,
        counted,
        suppressedBy,
      };
    });

    return {
      icd10Code,
      description: catalogEntry?.description ?? "Unknown code",
      mapsToHcc: hccs.length > 0,
      mappings,
      scoredWeight: mappings.reduce((sum, m) => sum + (m.counted ? Math.round(m.rafWeight * 1000) : 0), 0) / 1000,
    };
  });

  return {
    codes: codePreviews,
    capturedHccs: [...new Set(capturedHccs)].sort((a, b) => a - b),
    totalRaf: totalThousandths / 1000,
  };
}

/**
 * POST /api/score (future). For now this only acknowledges receipt — actual
 * scoring is server-side (Phase 2) and must never be computed or guessed at
 * on the client.
 */
export async function submitAttempt(payload: SubmitAttemptPayload): Promise<SubmitAttemptResult> {
  await delay(300);

  console.log("[workspace-api] submitAttempt (mock, not scored):", payload);

  return {
    received: true,
    receivedAt: new Date().toISOString(),
    chartId: payload.chartId,
    codeCount: payload.claimedCodes.length,
  };
}
