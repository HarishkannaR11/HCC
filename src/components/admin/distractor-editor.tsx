"use client";

import { useActionState } from "react";
import { deleteDistractor, saveDistractor, type ActionState } from "@/app/admin/charts/actions";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { TRAP_LABELS, TRAP_TYPES, type TrapType } from "@/lib/charts/constants";
import { Field, FormStatus } from "./field";
import { clickKeepingValues, submitKeepingValues } from "./keep-values";

export interface DistractorView {
  id: string;
  icd10_code: string;
  description: string | null;
  why_wrong: string;
  trap_type: TrapType;
}

export function DistractorEditor({ chartId, items }: { chartId: string; items: DistractorView[] }) {
  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="m-0 text-[13px] text-muted">No distractors yet.</p>
      ) : (
        items.map((item) => <DistractorForm key={`${item.id}-${item.icd10_code}`} chartId={chartId} item={item} />)
      )}
      <div className="border-t border-border pt-4">
        <h3 className="m-0 mb-3 text-sm font-semibold">Add a distractor</h3>
        <DistractorForm chartId={chartId} />
      </div>
    </div>
  );
}

function DistractorForm({ chartId, item }: { chartId: string; item?: DistractorView }) {
  const [saveState, saveAction, saving] = useActionState<ActionState, FormData>(saveDistractor, {});
  const [deleteState, deleteAction, deleting] = useActionState<ActionState, FormData>(deleteDistractor, {});
  const err = saveState.fieldErrors ?? {};
  const prefix = item ? `distractor-${item.id}` : "distractor-new";

  return (
    <form
      action={saveAction}
      onSubmit={submitKeepingValues(saveAction)}
      key={item ? undefined : saveState.savedAt}
      className="rounded-card border border-border bg-surface-alt p-4 flex flex-col gap-3"
    >
      <input type="hidden" name="chart_id" value={chartId} />
      {item ? <input type="hidden" name="item_id" value={item.id} /> : null}

      <div className="flex flex-wrap items-end gap-3">
        <Field id={`${prefix}-code`} label="ICD-10-CM" error={err.icd10_code} className="w-32">
          <Input
            id={`${prefix}-code`}
            name="icd10_code"
            defaultValue={item?.icd10_code}
            required
            className="font-mono uppercase"
            placeholder="E11.9"
            aria-invalid={Boolean(err.icd10_code) || undefined}
          />
        </Field>
        <Field id={`${prefix}-trap`} label="Trap type" className="w-72">
          <NativeSelect id={`${prefix}-trap`} name="trap_type" defaultValue={item?.trap_type ?? "none"}>
            {TRAP_TYPES.map((t) => (
              <option key={t} value={t}>
                {TRAP_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {item?.description ? <span className="h-9 flex items-center text-[13px] text-muted">{item.description}</span> : null}
      </div>

      <Field id={`${prefix}-why`} label="Why it is wrong" error={err.why_wrong} hint="Shown to the learner after they submit.">
        <Textarea id={`${prefix}-why`} name="why_wrong" defaultValue={item?.why_wrong ?? ""} rows={2} required maxLength={4000} />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={saving || deleting}>
          {saving ? "Saving…" : item ? "Save" : "Add distractor"}
        </Button>
        {item ? (
          <Button
            type="submit"
            size="sm"
            variant="outline"
            formAction={deleteAction}
            disabled={saving || deleting}
            onClick={clickKeepingValues(deleteAction, `Remove distractor ${item.icd10_code}?`)}
          >
            {deleting ? "Removing…" : "Remove"}
          </Button>
        ) : null}
        <FormStatus error={saveState.error ?? deleteState.error} ok={item ? saveState.ok : false} />
      </div>
    </form>
  );
}
