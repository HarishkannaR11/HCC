"use client";

import { useActionState } from "react";
import { deleteChart, setChartStatus, type ActionState } from "@/app/admin/charts/actions";
import { Button } from "@/components/ui/button";
import type { ChartStatus } from "@/lib/charts/constants";
import { FormStatus } from "./field";

export function PublishControl({ chartId, status }: { chartId: string; status: ChartStatus }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setChartStatus, {});
  const publishing = status === "draft";

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <input type="hidden" name="chart_id" value={chartId} />
      <input type="hidden" name="status" value={publishing ? "published" : "draft"} />
      <Button type="submit" variant={publishing ? "default" : "outline"} disabled={pending}>
        {pending ? "Saving…" : publishing ? "Publish" : "Unpublish"}
      </Button>
      <FormStatus error={state.error} />
    </form>
  );
}

export function DeleteChartControl({ chartId, title }: { chartId: string; title: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteChart, {});

  return (
    <form
      action={formAction}
      className="flex items-center gap-3"
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${title}" and its answer key? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="chart_id" value={chartId} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? "Deleting…" : "Delete chart"}
      </Button>
      <FormStatus error={state.error} />
    </form>
  );
}
