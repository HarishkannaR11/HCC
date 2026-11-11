"use client";

import { useActionState } from "react";
import { saveSections, type ActionState } from "@/app/admin/charts/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { SECTION_LABELS, SECTION_ORDER, type SectionType } from "@/lib/charts/constants";
import { Field, FormStatus } from "./field";
import { submitKeepingValues } from "./keep-values";

const ROWS: Partial<Record<SectionType, number>> = { assessment_plan: 8, hpi: 6, signature: 2 };

export function SectionsForm({ chartId, sections }: { chartId: string; sections: Partial<Record<SectionType, string>> }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveSections, {});
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} onSubmit={submitKeepingValues(formAction)} className="flex flex-col gap-4">
      <input type="hidden" name="chart_id" value={chartId} />
      <p className="m-0 text-[13px] text-muted">
        Leave a section empty to omit it. Assessment &amp; plan is required to publish. Leave the signature out only when
        the chart teaches the missing-signature trap.
      </p>
      {SECTION_ORDER.map((type) => (
        <Field key={type} id={`section-${type}`} label={SECTION_LABELS[type]} error={err[type]}>
          <Textarea
            id={`section-${type}`}
            name={type}
            defaultValue={sections[type] ?? ""}
            rows={ROWS[type] ?? 4}
            maxLength={20000}
            className="font-serif text-[15px]"
          />
        </Field>
      ))}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save chart text"}
        </Button>
        <FormStatus error={state.error} ok={state.ok} />
      </div>
    </form>
  );
}
