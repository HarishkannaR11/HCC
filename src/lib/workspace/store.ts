/**
 * Workspace state: claimed codes, evidence links, mode, and search controls.
 *
 * Zustand over useReducer: five components (TopBar, ChartPane, CodeSearch,
 * ClaimedPanel, plus the page shell) all need slices of this state with no
 * parent-child relationship between most of them, and Zustand's hook
 * subscribes each reader to only the fields it selects — a reducer would need
 * context plus manual memoized selectors to avoid re-rendering every pane on
 * every keystroke in the search box.
 */
import { create } from "zustand";
import type { EvidenceLink, MeatElement, PracticeMode } from "./types";

interface WorkspaceState {
  mode: PracticeMode;
  setMode: (mode: PracticeMode) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
  hccOnly: boolean;
  toggleHccOnly: () => void;

  /** In claim order — first to reach a shared HCC owns it. */
  claimedCodes: string[];
  addClaimedCode: (code: string) => void;
  removeClaimedCode: (code: string) => void;

  evidenceLinks: EvidenceLink[];
  addEvidenceLink: (link: Omit<EvidenceLink, "id">) => void;
  removeEvidenceLink: (id: string) => void;
}

let nextEvidenceId = 0;
/** Stable, collision-free ids without pulling in a uuid dependency for one call site. */
function makeEvidenceId(): string {
  nextEvidenceId += 1;
  return `evidence-${nextEvidenceId}-${Date.now().toString(36)}`;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  mode: "guided",
  setMode: (mode) => set({ mode }),

  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  hccOnly: false,
  toggleHccOnly: () => set((state) => ({ hccOnly: !state.hccOnly })),

  claimedCodes: [],
  addClaimedCode: (code) =>
    set((state) => (state.claimedCodes.includes(code) ? state : { claimedCodes: [...state.claimedCodes, code] })),
  removeClaimedCode: (code) =>
    set((state) => ({
      claimedCodes: state.claimedCodes.filter((c) => c !== code),
      // Cascade: evidence for a code that's no longer claimed is meaningless.
      evidenceLinks: state.evidenceLinks.filter((link) => link.codeId !== code),
    })),

  evidenceLinks: [],
  addEvidenceLink: (link) =>
    set((state) => ({ evidenceLinks: [...state.evidenceLinks, { ...link, id: makeEvidenceId() }] })),
  removeEvidenceLink: (id) =>
    set((state) => ({ evidenceLinks: state.evidenceLinks.filter((link) => link.id !== id) })),
}));

/** Which MEAT elements have at least one evidence link for `code`. */
export function meatFlagsFor(evidenceLinks: EvidenceLink[], code: string): Record<MeatElement, boolean> {
  const flags: Record<MeatElement, boolean> = { M: false, E: false, A: false, T: false };
  for (const link of evidenceLinks) {
    if (link.codeId !== code) continue;
    for (const element of link.meat) flags[element] = true;
  }
  return flags;
}
