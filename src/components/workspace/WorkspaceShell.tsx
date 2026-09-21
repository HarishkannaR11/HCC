"use client";

import { useState } from "react";
import type { Chart } from "@/lib/workspace/types";
import { TopBar } from "./TopBar";
import { ChartPane } from "./ChartPane";
import { CodeSearch } from "./CodeSearch";
import { ClaimedPanel } from "./ClaimedPanel";

type Tab = "chart" | "search" | "claimed";
const TABS: Array<{ key: Tab; label: string }> = [
  { key: "chart", label: "Chart" },
  { key: "search", label: "Search" },
  { key: "claimed", label: "Claimed" },
];

/**
 * Desktop (>=1024px, Tailwind's `lg`) renders all three panes side by side at
 * their design widths. Below that they stack full-width behind a tab bar —
 * every pane still mounts (so state and evidence highlighting survive
 * switching tabs), just hidden via `hidden`/`flex` rather than unmounted.
 */
export function WorkspaceShell({ chart }: { chart: Chart }) {
  const [tab, setTab] = useState<Tab>("chart");

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-bg text-ink">
      <TopBar position={chart.position} difficulty={chart.difficulty} />

      <div role="tablist" aria-label="Workspace panes" className="lg:hidden flex border-b border-border shrink-0 bg-surface">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={
              "flex-1 h-11 text-sm font-medium border-b-2 cursor-pointer " +
              (tab === key ? "border-accent text-accent-ink" : "border-transparent text-muted")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <ChartPane chart={chart} className={tab === "chart" ? "flex" : "hidden lg:flex"} />
        <CodeSearch className={tab === "search" ? "flex" : "hidden lg:flex"} />
        <ClaimedPanel chartId={chart.id} className={tab === "claimed" ? "flex" : "hidden lg:flex"} />
      </div>
    </div>
  );
}
