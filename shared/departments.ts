// THE FIVE DEPARTMENTS a piece of our own admin belongs to — and the ONE thing
// each of them changes about the form.
//
// They are not an enum. The five names are seeded as ordinary values in the
// `Department` dropdown group (SELECTABLE_GROUPS.department, the same group a
// meeting purpose already pick-or-creates into), so a team adds or retires one on
// the Dropdown values screen without a deploy — the owner's answer to c1. What
// lives HERE is the part a dropdown row cannot carry: the mark and the colour the
// agency already chose for each of the five in the app they are leaving, and the
// SECOND QUESTION each one asks.
//
// The names and marks are read off the legacy data (glide/data/
// agency.departments.json, the `departments` table) rather than invented: Sales
// paper-airplane, Admin folder, Production code-bracket, Marketing star,
// Business rocket-launch. The legacy set had eight rows; three of them (System,
// Operations, Support) carried no colour and no icon, which is what "the five"
// means.
//
// THE COLOURS ARE THE CHART SERIES, NOT THE LEGACY HEXES. Each of the five
// arrived carrying a hex the old app had chosen (#F4C600, #6738E8, #B1E847,
// #f584e3, #C497FE) and none of the five was one of kwapso's own colours, so a
// department dot was the one mark on screen that did not belong to this app's
// palette — and five literals in a shared file is exactly the shape UI-RULEBOOK
// C10 refuses, because a theme change cannot reach them. A department is a MARK,
// and C6 says a mark comes from the chart series, so the five now resolve
// through `--chart-1` to `--chart-5`: the same five colours the pulse charts and
// every other categorical mark in the app already draw from. The order is the
// legacy order, so a department keeps the same dot from one release to the next.
//
// A department a team invents itself is a first-class value with no mark and no
// second question — `departmentMark` answers null and `departmentAsks` answers
// "nothing else", which is the honest reading of a word the code has never met.

/** One of the five the agency already runs on: its name, its mark, its colour. */
export type DepartmentStyle = {
  name: string
  /** a lucide icon name, the nearest equivalent of the legacy mark */
  icon: "send" | "folder" | "code" | "star" | "rocket"
  /** the colour of the small dot beside the name, as a CSS value that resolves
   * through the theme — one of the five chart-series tokens, never a literal. */
  color: string
}

export const TASK_DEPARTMENTS: DepartmentStyle[] = [
  { name: "Sales", icon: "send", color: "var(--chart-1)" },
  { name: "Admin", icon: "folder", color: "var(--chart-2)" },
  { name: "Production", icon: "code", color: "var(--chart-3)" },
  { name: "Marketing", icon: "star", color: "var(--chart-4)" },
  { name: "Business", icon: "rocket", color: "var(--chart-5)" },
]

/** The mark and colour for a department, or null for one a team invented. */
function departmentMark(name: string | null | undefined): DepartmentStyle | null {
  if (!name) return null
  return TASK_DEPARTMENTS.find((d) => d.name === name) ?? null
}

/** The department's mark as a CHARACTER, for the places a mark has to be text —
 * a table cell, a select option, a row title. Each is the nearest plain glyph to
 * the icon the agency chose (paper aeroplane, folder, code brackets, star,
 * rocket). It is a MARK, never an emoji in copy: it sits where an icon sits and
 * never inside a sentence, which is the distinction UI-RULEBOOK G1 draws. A
 * department the code has never met has no mark, and reads as itself. */
export function departmentGlyph(name: string | null | undefined): string {
  const mark = departmentMark(name)
  if (!mark) return ""
  if (mark.icon === "send") return "➤"
  if (mark.icon === "folder") return "▤"
  if (mark.icon === "code") return "⟨⟩"
  if (mark.icon === "star") return "★"
  return "▲"
}

/** WHAT ELSE THE DEPARTMENT ASKS FOR — the second field, decided by the first.
 *
 * "A Production task must name an app" (settled, CHECKLIST 3.5 / c6); a Sales
 * task names the client it is about; an Admin task may name one. The rest ask
 * nothing else. It is stated once, here, because the FORM has to show the field
 * the moment the department is picked and the DOOR has to refuse a save without
 * it — two places, one sentence, or they drift into a field that appears and is
 * then not required (or worse, is required and never appears). */
export function departmentAsks(name: string | null | undefined): {
  field: "app" | "account" | null
  required: boolean
} {
  if (name === "Production") return { field: "app", required: true }
  if (name === "Sales") return { field: "account", required: true }
  if (name === "Admin") return { field: "account", required: false }
  return { field: null, required: false }
}

/** THE EISENHOWER SCORE — 1 to 4, from the two ticks.
 *
 * `(important × 2) + urgent + 1`, which is the formula the agency's own legacy
 * screen used and not one of the several sensible alternatives: neither tick is
 * 1 (do it when you get to it), urgent alone is 2, important alone is 3, both is
 * 4 (do it now). It replaces a high/medium/low picker, which asked one question
 * where the answer needs two. */
export function priorityScore(important: boolean, urgent: boolean): 1 | 2 | 3 | 4 {
  return ((important ? 2 : 0) + (urgent ? 1 : 0) + 1) as 1 | 2 | 3 | 4
}

/** What each of the four scores is CALLED, so a list can show them distinctly and
 * every screen calls them the same thing. */
export const PRIORITY_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "Whenever",
  2: "Urgent",
  3: "Important",
  4: "Do it now",
}

/** PRIORITY'S OWN FOUR TONES — never App Stage's six.
 *
 * `PriorityTone` is a SEPARATE type from `DotTone` (`shared/app-stages.ts`),
 * on purpose, not four new members bolted onto it. Two files elsewhere hold
 * an EXHAUSTIVE `Record<DotTone, …>` over the app-stage six
 * (`web/components/records/record-week.tsx`'s own `DOT_FILL`,
 * `web/components/tickets/tickets-collection.tsx`'s `DOT_TONE_FILL`) —
 * widening `DotTone` would silently demand a fifth, sixth, seventh and
 * eighth entry in both, neither of which has anything to do with a task's
 * priority. `Badge`'s `dot` prop and `Kanban`'s `KanbanColumn.dot` both
 * accept `PriorityTone`'s four names too (kit v1.2.89: `--dot-red` /
 * `--dot-orange` / `--dot-purple` / `--dot-blue`, `shared/ui/foundations/
 * tokens/tokens.css`), because the kit's own `BadgeDot` / `KanbanColumnDot`
 * unions grew the same four members the six already had — a caller never
 * imports this type to pass one through. */
export type PriorityTone = "red" | "orange" | "purple" | "blue"

/** THE PRIORITY'S OWN COLOUR — SUPERSEDED 2026-09-15, the same day it
 * shipped. The client's first ruling on the Tasks table ("Priority (has a
 * color here)") landed with no existing chip to reuse, so `PRIORITY_DOT_TONE`
 * borrowed four of `Badge`'s six App-Stage tones — `archived`/`review`/
 * `building`/`blocked` — "the only reusable name in reach". Shown back to
 * her the same afternoon (the artifact at claude.ai/code/artifact/
 * 895888b7-ca1a-4df0-ae2d-c61b9127fb4e measures why in a table), and one of
 * the four was a real defect: `building` is charcoal, the exact hex
 * `--surface-inverse` is in light, so a priority-3 dot vanished wherever the
 * two met, and in dark it tripped `Badge`'s `building`-on-mango special case
 * by accident — the one colour this system reserves for the brand, painted
 * onto a chip one rank below "Do it now".
 *
 * HER RULING, VERBATIM, THE SAME DAY: "For the priorities: 4: keep the red.
 * 3: use the orange. Urgent: use the purple. Whenever: use the blue."
 * Checked against `PRIORITY_LABEL` above, not assumed: 4 is "Do it now", 3 is
 * "Important", 2 is "Urgent", 1 is "Whenever" — so "Urgent" names priority 2
 * and "Whenever" names priority 1, exactly as spelled out below.
 *
 * NOTHING PRIORITY-RELATED READS AN APP-STAGE TONE ANY MORE. Every value
 * here is one of `PriorityTone`'s own four, never `archived`/`review`/
 * `building`/`blocked`/`shipped`/`done` — and `building`'s dark-mode
 * mango special case (`Badge`'s one compound variant) can therefore never
 * fire for a priority chip again, because no priority is ever `building`. */
export const PRIORITY_DOT_TONE: Record<1 | 2 | 3 | 4, PriorityTone> = {
  1: "blue",
  2: "purple",
  3: "orange",
  4: "red",
}
