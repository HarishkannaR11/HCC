"use client";

import { useActionState } from "react";
import { deleteKeyItem, saveKeyItem, type ActionState } from "@/app/admin/charts/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { TRAP_LABELS, TRAP_TYPES, type TrapType } from "@/lib/charts/constants";
import { Field, FormStatus } from "./field";
import { clickKeepingValues, submitKeepingValues } from "./keep-values";

export interface KeyItemView {
  id: string;
  icd10_code: string;
  description: string | null;
  hcc: { hcc_code: string; label: string; raf: number } | null;
  is_required: boolean;
  supporting_excerpt: string | null;
  rationale: string | null;
  trap_type: TrapType;
}

export function AnswerKeyEditor({ chartId, items }: { chartId: string; items: KeyItemView[] }) {
  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="m-0 text-[13px] text-muted">No codes yet. Add the expert answer below.</p>
      ) : (
        items.map((item) => <KeyItemForm key={`${item.id}-${item.icd10_code}`} chartId={chartId} item={item} />)
      )}
      <div className="border-t border-border pt-4">
        <h3 className="m-0 mb-3 text-sm font-semibold">Add a code</h3>
        <KeyItemForm chartId={chartId} />
      </div>
    </div>
  );
}

function KeyItemForm({ chartId, item }: { chartId: string; item?: KeyItemView }) {
  const [saveState, saveAction, saving] = useActionState<ActionState, FormData>(saveKeyItem, {});
  const [deleteState, deleteAction, deleting] = useActionState<ActionState, FormData>(deleteKeyItem, {});
  const err = saveState.fieldErrors ?? {};
  const prefix = item ? `key-${item.id}` : "key-new";

  return (
    <form
      action={saveAction}
      onSubmit={submitKeepingValues(saveAction)}
      // Reset the "add" form after each successful save.
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
            placeholder="E11.22"
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
        <label className="flex h-9 items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            name="is_required"
            defaultChecked={item ? item.is_required : true}
            className="size-4 accent-[var(--color-accent)]"
          />
          Required
        </label>
        {item ? (
          <div className="flex flex-wrap items-center gap-2 h-9 text-[13px]">
            {item.hcc ? (
              <Badge title={item.hcc.label}>
                {item.hcc.hcc_code} · {item.hcc.raf.toFixed(3)}
              </Badge>
            ) : (
              <Badge variant="neutral">No HCC</Badge>
            )}
            <span className="text-muted">{item.description}</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field
          id={`${prefix}-excerpt`}
          label="Supporting excerpt"
          error={err.supporting_excerpt}
          hint="Copy it exactly from the chart text."
        >
          <Textarea id={`${prefix}-excerpt`} name="supporting_excerpt" defaultValue={item?.supporting_excerpt ?? ""} rows={2} maxLength={2000} />
        </Field>
        <Field id={`${prefix}-rationale`} label="Rationale" error={err.rationale} hint="Shown to the learner after they submit.">
          <Textarea id={`${prefix}-rationale`} name="rationale" defaultValue={item?.rationale ?? ""} rows={2} maxLength={4000} />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={saving || deleting}>
          {saving ? "Saving…" : item ? "Save" : "Add to answer key"}
        </Button>
        {item ? (
          <Button
            type="submit"
            size="sm"
            variant="outline"
            formAction={deleteAction}
            disabled={saving || deleting}
            onClick={clickKeepingValues(deleteAction, `Remove ${item.icd10_code} from the answer key?`)}
          >
            {deleting ? "Removing…" : "Remove"}
          </Button>
        ) : null}
        <FormStatus error={saveState.error ?? deleteState.error} ok={item ? saveState.ok : false} />
      </div>
    </form>
  );
}
