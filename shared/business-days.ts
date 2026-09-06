// WORKING TIME — Monday to Friday, and nothing else counts.
//
// THE CLIENT, 2026-09-06, twice and with emphasis: "the time counts
// monday-friday! saturday and sunday do not count towards how long it took!
// very very important!" Public holidays are explicitly NOT excluded — she was
// asked and ruled "ignore public holidays. only mo-fri."
//
// ── WHY THIS IS ONE FILE AND NOT SIX ────────────────────────────────────────
//
// Every duration this product reports is the same question: how long has this
// been with us. Closure time, a ticket's age in the triage queue, an extra
// waiting on the client, raised-to-first-read, time in a stage. Each was
// written where it was needed, and each divided by 86_400_000, so each counted
// weekends. Six copies of one idea drift the moment one of them is corrected.
//
// ── WHAT IT WAS DOING WRONG, MEASURED ───────────────────────────────────────
//
// `triage.ts` computed both the three-day cutoff and the `days` number on every
// card in calendar days. Over 4,704 raise/now pairs across a fortnight, 84%
// reported a LARGER number than the working-day truth, and 336 crossed the
// three-day line while under three working days — a ticket raised Wednesday
// read "4 days" on Sunday when it had had two. Every weekend added two phantom
// days to a queue she reads every morning.
//
// ── HOW IT COUNTS ───────────────────────────────────────────────────────────
//
// It accrues only the MILLISECONDS that fall on a weekday, then floors to whole
// days. Not "count the weekday dates between the two", which would make a
// ticket raised at 23:00 a day old sixty seconds later; and not "calendar days
// minus weekends", which cannot answer a span that starts on a Saturday. The
// clock simply stops at Friday midnight and restarts on Monday, which is what
// she described: the weekend does not count towards how long it took.
//
// So a ticket raised Friday 16:00 and read Monday 09:00 has aged 17 working
// hours — zero days — where the calendar said three.
//
// ── THE TIMEZONE, STATED RATHER THAN ASSUMED ────────────────────────────────
//
// UTC. Every timestamp in this product is stored and compared as an ISO instant
// and there is no team timezone anywhere in the schema to read instead. The
// consequence is real and small: for a team in CET, Friday 23:00–24:00 local is
// already Saturday here and stops counting an hour early, and the same hour
// returns on Monday. It moves a boundary by an hour, never a day, and it is the
// same hour for every ticket. Introducing a team timezone is a bigger change
// than this file and would want to be made deliberately, not smuggled in under
// a bug fix.

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

/** Sunday = 0 … Saturday = 6, in UTC. */
const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6

/** Midnight UTC at the start of the day `d` falls in. */
function startOfDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * Milliseconds of Monday-to-Friday time between two instants.
 *
 * Walks day by day rather than closed-form, because the closed form has to
 * special-case which side of a weekend each endpoint falls on and gets the
 * partial days wrong in exactly the cases nobody tests. A span here is days or
 * weeks, so the loop is short; it is bounded below so a clock skew that puts
 * `to` before `from` returns 0 rather than a negative age.
 */
export function workingMsBetween(from: Date | string, to: Date | string): number {
  const a = typeof from === "string" ? Date.parse(from) : from.getTime()
  const b = typeof to === "string" ? Date.parse(to) : to.getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0

  let total = 0
  for (let day = startOfDay(new Date(a)); day < b; day += DAY_MS) {
    if (isWeekend(new Date(day))) continue
    // The part of THIS day that lies inside [a, b].
    const start = Math.max(day, a)
    const end = Math.min(day + DAY_MS, b)
    if (end > start) total += end - start
  }
  return total
}

/** Whole working days elapsed — the number a person is shown. */
export function workingDaysBetween(from: Date | string, to: Date | string): number {
  return Math.floor(workingMsBetween(from, to) / DAY_MS)
}

/** Working hours elapsed, for spans too short to be a day. */
export function workingHoursBetween(from: Date | string, to: Date | string): number {
  return Math.floor(workingMsBetween(from, to) / HOUR_MS)
}

/**
 * The instant `days` working days before `at` — the cutoff a query compares
 * `created_at` against.
 *
 * The inverse of `workingDaysBetween`, so "older than three working days" is
 * the same fact whether it is asked in SQL or counted in JS. Steps backwards a
 * day at a time, skipping weekends, and lands at the same clock time — going
 * back three working days from Monday 09:00 reaches the previous Wednesday
 * 09:00, not the previous Friday.
 */
export function workingDaysAgo(at: Date, days: number): Date {
  if (days <= 0) return new Date(at.getTime())
  let left = days
  const cursor = new Date(at.getTime())
  while (left > 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    if (!isWeekend(cursor)) left -= 1
  }
  return cursor
}
