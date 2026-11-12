"use client";

import { useId, useRef, useState } from "react";

export interface TrendDatum {
  id: string;
  /** Pre-formatted local date, e.g. "Oct 14". */
  date: string;
  chartTitle: string;
  mode: "practice" | "timed" | "audit";
  score: number;
  rolling: number;
}

// Validated pair (dataviz validate_palette.js, light, surface #ffffff): all checks pass.
const SERIES = {
  score: { name: "Score", color: "#2a78d6" },
  rolling: { name: "3-chart average", color: "#eb6834" },
} as const;

const W = 720;
const H = 240;
const M = { top: 12, right: 112, bottom: 28, left: 36 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const TICKS = [0, 25, 50, 75, 100];

/**
 * Score per scored chart, oldest to newest, with a three-chart rolling mean.
 * One y-axis (0–100%). Hover or arrow keys move a crosshair that snaps to the
 * nearest chart; the tooltip lists both series. A table view of the same data
 * sits beside the chart on the page.
 */
export function ScoreTrendChart({ data }: { data: TrendDatum[] }) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();

  const x = (i: number) => M.left + (data.length === 1 ? PW / 2 : (i / (data.length - 1)) * PW);
  const y = (v: number) => M.top + PH - (Math.max(0, Math.min(100, v)) / 100) * PH;
  const path = (key: "score" | "rolling") => data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");

  function nearest(clientX: number) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return null;
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * W;
    let best = 0;
    for (let i = 1; i < data.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    return best;
  }

  const last = data.length - 1;
  const current = active !== null ? data[active] : null;
  // Direct labels at the line ends; nudge apart only if they would collide.
  const endScoreY = y(data[last].score);
  let endRollingY = y(data[last].rolling);
  if (Math.abs(endScoreY - endRollingY) < 14) endRollingY = endScoreY + (endRollingY >= endScoreY ? 14 : -14);

  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption id={titleId} className="sr-only">
        Score per scored chart over time, with a three-chart rolling average.
      </figcaption>
      <div className="flex flex-wrap gap-4 text-[12px] text-muted" aria-hidden="true">
        {Object.values(SERIES).map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="inline-block h-[2px] w-4 rounded" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-accent"
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          onPointerMove={(e) => setActive(nearest(e.clientX))}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((a) => a ?? last)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? last) - 1));
            if (e.key === "ArrowRight") setActive((a) => Math.min(last, (a ?? last) + 1));
          }}
        >
          {TICKS.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={M.left + PW} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} />
              <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--color-muted)">
                {t}%
              </text>
            </g>
          ))}
          <text x={M.left} y={H - 8} fontSize={11} fill="var(--color-muted)">
            {data[0].date}
          </text>
          {data.length > 1 ? (
            <text x={M.left + PW} y={H - 8} textAnchor="end" fontSize={11} fill="var(--color-muted)">
              {data[last].date}
            </text>
          ) : null}

          {active !== null ? (
            <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + PH} stroke="var(--color-muted)" strokeWidth={1} />
          ) : null}

          {data.length > 1 ? (
            <>
              <path d={path("rolling")} fill="none" stroke={SERIES.rolling.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <path d={path("score")} fill="none" stroke={SERIES.score.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </>
          ) : null}
          {data.map((d, i) => (
            <circle
              key={d.id}
              cx={x(i)}
              cy={y(d.score)}
              r={active === i ? 5.5 : 4}
              fill={SERIES.score.color}
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          ))}

          <g fontSize={12}>
            <line x1={x(last) + 8} x2={x(last) + 18} y1={endScoreY} y2={endScoreY} stroke={SERIES.score.color} strokeWidth={2} />
            <text x={x(last) + 22} y={endScoreY} dominantBaseline="middle" fill="var(--color-ink)">
              {Math.round(data[last].score)}%
            </text>
            {data.length > 1 ? (
              <>
                <line x1={x(last) + 8} x2={x(last) + 18} y1={endRollingY} y2={endRollingY} stroke={SERIES.rolling.color} strokeWidth={2} />
                <text x={x(last) + 22} y={endRollingY} dominantBaseline="middle" fill="var(--color-muted)">
                  avg {Math.round(data[last].rolling)}%
                </text>
              </>
            ) : null}
          </g>
        </svg>

        {current && active !== null ? (
          <div
            role="status"
            className="pointer-events-none absolute top-1 z-10 w-56 rounded-card border border-border bg-surface px-3 py-2 text-[12px] shadow-md"
            style={{ left: `${Math.min(70, Math.max(0, (x(active) / W) * 100 - 10))}%` }}
          >
            <div className="text-muted">
              {current.date} · {current.mode === "timed" ? "Timed" : "Practice"}
            </div>
            <div className="truncate text-ink/80">{current.chartTitle}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-block h-[2px] w-3 rounded" style={{ background: SERIES.score.color }} />
              <b className="font-mono text-[13px] text-ink">{current.score.toFixed(2)}%</b>
              <span className="text-muted">score</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-[2px] w-3 rounded" style={{ background: SERIES.rolling.color }} />
              <b className="font-mono text-[13px] text-ink">{current.rolling.toFixed(1)}%</b>
              <span className="text-muted">3-chart average</span>
            </div>
          </div>
        ) : null}
      </div>
    </figure>
  );
}
