import type { MeatElement } from "@/lib/workspace/types";

const LETTERS: MeatElement[] = ["M", "E", "A", "T"];
const NAMES: Record<MeatElement, string> = {
  M: "Monitor",
  E: "Evaluate",
  A: "Assess",
  T: "Treat",
};

export function MeatChips({ flags }: { flags: Record<MeatElement, boolean> }) {
  return (
    <div role="group" aria-label="MEAT documentation status" className="flex items-center gap-[6px]">
      {LETTERS.map((letter) => {
        const on = flags[letter];
        return (
          <span
            key={letter}
            title={NAMES[letter]}
            aria-label={`${NAMES[letter]}: ${on ? "documented" : "not documented"}`}
            className={
              "inline-flex h-[22px] w-[22px] items-center justify-center rounded-[4px] text-[11px] font-semibold box-border " +
              (on
                ? "bg-accent text-white"
                : "border border-dashed border-border bg-surface text-muted")
            }
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
}
