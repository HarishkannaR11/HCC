"use client";

import { useEffect, useState } from "react";
import { previewRaf, submitAttempt } from "@/lib/workspace-api";
import { useWorkspaceStore } from "@/lib/workspace/store";
import type { RafPreviewResult } from "@/lib/workspace/types";
import { ClaimedCard } from "./ClaimedCard";

type SubmitStatus = "idle" | "submitting" | "submitted";

export function ClaimedPanel({ chartId, className = "flex" }: { chartId: string; className?: string }) {
  const claimedCodes = useWorkspaceStore((s) => s.claimedCodes);
  const evidenceLinks = useWorkspaceStore((s) => s.evidenceLinks);
  const removeClaimedCode = useWorkspaceStore((s) => s.removeClaimedCode);

  const [preview, setPreview] = useState<RafPreviewResult>({ codes: [], capturedHccs: [], totalRaf: 0 });
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");

  // A code list change invalidates any prior "submitted" acknowledgement.
  // Adjusted during render (React's documented pattern) rather than a
  // useEffect, which would need an extra render pass to catch up.
  const [claimedCodesAtLastRender, setClaimedCodesAtLastRender] = useState(claimedCodes);
  if (claimedCodes !== claimedCodesAtLastRender) {
    setClaimedCodesAtLastRender(claimedCodes);
    setSubmitStatus("idle");
  }

  useEffect(() => {
    let cancelled = false;
    previewRaf(claimedCodes).then((result) => {
      if (!cancelled) setPreview(result);
    });
    return () => {
      cancelled = true;
    };
  }, [claimedCodes]);

  async function handleSubmit() {
    setSubmitStatus("submitting");
    await submitAttempt({ chartId, claimedCodes, evidenceLinks });
    setSubmitStatus("submitted");
  }

  const previewByCode = new Map(preview.codes.map((c) => [c.icd10Code, c]));

  return (
    <section
      aria-label="Claimed codes"
      className={`w-full lg:flex-1 min-w-0 box-border bg-surface-alt flex-col min-h-0 ${className}`}
    >
      <div className="px-6 pt-5 pb-3 flex items-baseline justify-between">
        <h2 className="m-0 text-[15px] font-semibold">Claimed codes</h2>
        <span className="text-xs text-muted">
          {claimedCodes.length} {claimedCodes.length === 1 ? "code" : "codes"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col gap-2.5">
        {claimedCodes.length === 0 && (
          <p className="my-3 text-sm text-muted">
            Add a code from search to start building this chart&rsquo;s claim.
          </p>
        )}
        {claimedCodes.map((code) => {
          const codePreview = previewByCode.get(code);
          if (!codePreview) return null;
          return (
            <ClaimedCard
              key={code}
              preview={codePreview}
              evidenceLinks={evidenceLinks}
              onRemove={() => removeClaimedCode(code)}
            />
          );
        })}
      </div>

      <div className="px-6 pt-4.5 pb-5.5 border-t border-border bg-surface flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] text-ink/90">Captured RAF · disease HCCs</span>
          <span aria-live="polite" className="font-mono text-[26px] font-semibold text-accent">
            {preview.totalRaf.toFixed(3)}
          </span>
        </div>
        <span className="text-xs leading-snug text-muted">
          Community non-dual aged · hierarchies applied · demographics excluded
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={claimedCodes.length === 0 || submitStatus === "submitting"}
          className="h-12 rounded-card bg-accent text-white font-sans text-[15px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitStatus === "submitting" ? "Submitting…" : "Submit for scoring"}
        </button>
        {submitStatus === "submitted" && (
          <p aria-live="polite" className="text-xs text-accent-ink -mt-1">
            Submission logged (mock) {"—"} see console. Scoring arrives with the real API.
          </p>
        )}
      </div>
    </section>
  );
}
