import Link from "next/link";

/** Shown in place of a chart the learner's plan does not cover. No chart text is loaded. */
export function Paywall({ title, freeLimit }: { title: string; freeLimit: number }) {
  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-3 rounded-card border border-border bg-surface p-6 text-center">
      <span className="text-[12px] font-semibold uppercase tracking-wide text-accent-ink">Full library</span>
      <h1 className="m-0 text-lg font-semibold">{title}</h1>
      <p className="m-0 text-[14px] text-ink/80">
        You have used your {freeLimit} free charts. You can keep re-coding those as often as you like; subscribe to open this one
        and the rest of the library.
      </p>
      <div className="mt-1 flex justify-center gap-3">
        <Link href="/billing" className="rounded-[6px] bg-accent px-4 py-2 text-[14px] font-medium text-white">
          See plans
        </Link>
        <Link href="/practice" className="rounded-[6px] border border-border bg-surface px-4 py-2 text-[14px]">
          Back to practice
        </Link>
      </div>
    </section>
  );
}
