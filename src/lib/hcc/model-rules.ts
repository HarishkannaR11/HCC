/**
 * CMS-HCC model rules that the published suppression table does not express.
 *
 * V28: HCC223 (Heart Failure with Heart Assist Device/Artificial Heart) is
 * kept only when another heart-failure HCC (221, 222, 224, 225 or 226) is also
 * present; otherwise it is zeroed before the hierarchy is applied. A heart
 * assist device status code (Z95.811, Z95.812) on its own therefore captures
 * nothing. Source: CMS PY2026 V28 model software hierarchy logic, as
 * reimplemented in public model code; confirm against the SAS macro when the
 * official package is loaded.
 */
import type { HccRequirement } from "./types";

const MODEL_REQUIREMENTS: Record<string, HccRequirement[]> = {
  V28: [
    {
      hcc: 223,
      requiresAnyOf: [221, 222, 224, 225, 226],
      reason: "V28: HCC223 counts only with another heart failure HCC",
    },
  ],
};

export function requirementsFor(modelVersion: string): HccRequirement[] {
  return MODEL_REQUIREMENTS[modelVersion] ?? [];
}
