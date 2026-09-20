// WORKING DAYS, ONE SHARED HELPER. Aurora's ruling, 21 Sep 2026, verbatim:
// "Yes, ship. mind you, all of this is Monday to Friday, so when I say 5,
// it's actually a full week, but I, of course, don't count the weekends."
// So a "day" on a phase, everywhere this app counts one (the wave's Settings
// panel, the phase form's prefill, the Timeline's expected spans, the
// burndown chart's ideal line), is a WORKING day, Monday to Friday, never a
// calendar one. One place does the arithmetic, so a phase-days field, a
// prefilled end date and a projected timeline span can never disagree about
// what "5 days" means.
//
// DATES ARE `YYYY-MM-DD` STRINGS, read and returned as such, the same shape
// every stored date column and every other date helper in this app already
// holds (`shared/wave-stage.ts`'s own `todayISO`, `shared/web/format.ts`'s
// `dateFromYMD`/`ymdFromDate`). Parsed and formatted in UTC on purpose: a
// worker has no timezone of its own to be wrong about (the same argument
// `shared/sprint-state.ts`'s own header makes), and the browser side already
// hands this file plain calendar dates with no time-of-day attached, so UTC
// costs nothing and avoids a local-midnight rollover bug on either side.

function parseISODate(dateISO: string): Date {
  const [y, m, d] = dateISO.slice(0, 10).split("-").map(Number)
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1))
}

function formatISODate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** True for a Monday through a Friday, false for a Saturday or a Sunday. */
export function isWorkingDay(dateISO: string): boolean {
  const day = parseISODate(dateISO).getUTCDay()
  return day !== 0 && day !== 6
}

/** `n` WORKING DAYS AFTER `start`, so `addWorkingDays(monday, 5)` lands one
 * calendar week later (the following Monday), because the five weekdays
 * Tuesday through Friday plus the next Monday are the five working days that
 * follow a Monday, the weekend between them skipped rather than counted.
 * A `start` that already falls on a Saturday or a Sunday ROLLS FORWARD to
 * the following Monday first, then counts `n` working days from there, since
 * a phase is never said to begin on a day nobody works. `n` of 0 returns that
 * rolled-forward start itself, unchanged on a weekday. */
export function addWorkingDays(start: string, n: number): string {
  const d = parseISODate(start)
  const startDay = d.getUTCDay()
  if (startDay === 6) d.setUTCDate(d.getUTCDate() + 2)
  else if (startDay === 0) d.setUTCDate(d.getUTCDate() + 1)
  let counted = 0
  while (counted < n) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) counted++
  }
  return formatISODate(d)
}

/** HOW MANY WORKING DAYS SIT BETWEEN `start` AND `end`, counted the same way
 * `addWorkingDays` counts them forward, so `workingDaysBetween(start,
 * addWorkingDays(start, n))` is `n` for any weekday `start` (`addWorkingDays`
 * rolls a weekend `start` to Monday before it counts, so the two only agree
 * on a plain weekday, which is what the phase form's own prefill always
 * hands this). Neither end is rolled here: this answers "how many working
 * days apart are these two exact dates," not "how many working days does a
 * phase starting here run." Negative when `end` falls before `start`, zero
 * when they are the same day. */
export function workingDaysBetween(start: string, end: string): number {
  const a = parseISODate(start)
  const b = parseISODate(end)
  const step = b.getTime() >= a.getTime() ? 1 : -1
  const cursor = new Date(a)
  let count = 0
  while (cursor.getTime() !== b.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + step)
    if (cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6) count += step
  }
  return count
}

/** HOW MANY WORKING DAYS A DATED SPAN COVERS, BOTH ENDS INCLUDED. The
 * everyday reading of "Monday to Friday is five days," as opposed to
 * `workingDaysBetween`'s own STEP count between the two dates (four, from a
 * Monday to that same week's Friday). For reading a phase's own recorded
 * start and end back as its length (the wave's own "expected length" figure,
 * `waves-screen.tsx#waveExpectedWorkingDays`) rather than measuring the
 * working-day distance between two arbitrary dates. Never negative: an `end`
 * before `start` reads as nothing to span, not a negative length. */
export function workingDaySpan(start: string, end: string): number {
  return Math.max(0, workingDaysBetween(start, end) + (isWorkingDay(start) ? 1 : 0))
}
