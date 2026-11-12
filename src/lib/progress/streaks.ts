/**
 * Streaks over the learner's local activity dates (YYYY-MM-DD). Pure.
 * A streak is alive through today if the learner was active yesterday: it
 * only breaks once a whole local day passes without a scored chart.
 */
const DAY = 86_400_000;
const toDay = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY);

export interface Streaks {
  current: number;
  longest: number;
  activeToday: boolean;
}

export function computeStreaks(activeDates: readonly string[], today: string): Streaks {
  const days = [...new Set(activeDates.map(toDay))].sort((a, b) => a - b);
  const todayN = toDay(today);

  let longest = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const set = new Set(days);
  const activeToday = set.has(todayN);
  let cursor = activeToday ? todayN : todayN - 1;
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor -= 1;
  }
  return { current, longest, activeToday };
}

/** The learner's local calendar date for an instant, in an IANA time zone. */
export function localDate(instant: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}
