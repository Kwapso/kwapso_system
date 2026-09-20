// EVERY BUTTON THAT STARTS A TIMER READS "START", WITH THE STOPWATCH.
//
// Aurora's ruling, 21 Sep 2026, verbatim: "everywhere where there's button to
// start timer, rename to just 'start' and change icon for a stopwatch (same
// as in navbar for logs)." The navbar's own glyph is `CONCEPT_ICON.time`
// (`web/lib/pages.ts`), `"timer"`, `Timer` in the kit's own Phosphor naming
// (`shared/web/screen-engine/icon-map.ts`), so "the stopwatch" and "the
// Logs rail's own icon" are the same glyph, asserted here rather than assumed.
//
// TWO SITES DRAW A TIMER-START CONTROL. `useRecordTimerAction`/
// `RecordTimerButton` (web/components/shell/timer-bar.tsx) is the ONE shared
// toggle every record head reads (help-detail.tsx, story-detail.tsx,
// task-detail.tsx, its own header note says so); its "not mine" branch is
// the button this ruling is about, and its default now reads `t("Start")` /
// `<Timer>` for every caller that does not pass its own override.
// `StartTimerStrip` (web/components/work/time-panel.tsx) is the second, a
// row of per-story quick-launch chips beside the Stories backlog, each one
// already carrying the STORY'S OWN TITLE as its label (deliberately, so a
// list of five can be told apart without reading each one), so only its
// GLYPH is in scope here; forcing its text down to the bare word "Start"
// would delete the one thing that tells the five buttons apart.
//
// THE STOP CONTROL IS UNCHANGED, on purpose: it draws `StopCircle`, not
// `Play`, so it was never in the icon family this ruling retired.
//
// TASK DETAIL AND TASK FORM ARE SKIPPED HERE, with a dated note: another
// lane owns `web/components/work/task-detail.tsx` (a 21 Sep 2026 ruling of
// its own, "beside the mango Done," landed the SAME day, wiring its own
// `startLabel`/`startIcon` override on `RecordTimerButton`) and
// `web/components/work/task-form-dialog.tsx`, and renames its own button,
// this file's CLAUDE.md working agreement. Both already inherit this law's
// default for free (the override is additive, `web/components/shell/
// timer-bar.tsx`'s own note says so), so nothing here is unproven for them;
// this test simply is not the one that pins their copy.
//
// A CENSUS, NOT A HARD-CODED PAIR: every file under `web/`, `web-portal/`
// and `shared/web/` that actually WIRES a timer-start control (calls
// `.startTimer(` on the content API directly, or reaches for the shared
// `useRecordTimerAction`/`RecordTimerButton`/`StartTimerStrip` trio) is
// walked, so a THIRD site added later is held to the same law rather than
// silently missed the way a fixed two-file list would miss it.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const REPO_ROOT = join(__dirname, "..", "..")

const ROOTS = [
  join(REPO_ROOT, "web", "components"),
  join(REPO_ROOT, "web", "app"),
  join(REPO_ROOT, "web", "lib"),
  join(REPO_ROOT, "web-portal", "components"),
  join(REPO_ROOT, "web-portal", "app"),
  join(REPO_ROOT, "web-portal", "lib"),
  join(REPO_ROOT, "shared", "web"),
]

/** DATED, REASONED, see this file's own header. Relative to `REPO_ROOT`. */
const SKIP_FILES = new Set([
  "web/components/work/task-detail.tsx", // 21 Sep 2026, another lane's own button, see above
  "web/components/work/task-form-dialog.tsx", // 21 Sep 2026, same lane, same reason
])

const WIRES_A_TIMER_START = /\.startTimer\(|useRecordTimerAction\(|<RecordTimerButton\b|<StartTimerStrip\b/

const files = sourceFiles(ROOTS, { extensions: [".ts", ".tsx"], skipTests: true, relativeTo: REPO_ROOT }).filter(
  (f) => !/(^|\/)(test|e2e)\//.test(f.rel) && !SKIP_FILES.has(f.rel) && WIRES_A_TIMER_START.test(f.source)
)

describe("every timer-start control reads Start, with the stopwatch (Aurora, 21 Sep 2026)", () => {
  it("finds at least the two known sites, a census that finds nothing is not proving anything", () => {
    const rels = files.map((f) => f.rel)
    expect(rels).toContain("web/components/shell/timer-bar.tsx")
    expect(rels).toContain("web/components/work/time-panel.tsx")
  })

  it.each(files.map((f) => [f.rel, f] as const))("%s: no leftover \"Start timer\" wording", (_rel, f) => {
    const src = stripComments(f.source)
    expect(src).not.toContain('t("Start timer")')
    expect(src).not.toContain("t('Start timer')")
  })

  it.each(files.map((f) => [f.rel, f] as const))("%s: no leftover Play icon, the stopwatch is Timer", (_rel, f) => {
    const src = stripComments(f.source)
    expect(src).not.toMatch(/<Play\b/)
  })

  it('the shared toggle\'s own default is exactly t("Start") with the Timer icon', () => {
    const f = files.find((x) => x.rel === "web/components/shell/timer-bar.tsx")!
    const src = stripComments(f.source)
    // The kit's own icon for this glyph, the SAME name `CONCEPT_ICON.time`
    // gives the Logs rail entry in web/lib/pages.ts ("timer" -> `Timer`).
    expect(src).toContain('import { StopCircle, Timer } from "@shared/ui/foundations/icons"')
    expect(src).toContain('label: mine ? t("Stop timer") : (startLabel ?? t("Start")),')
    expect(src).toContain("icon: mine ? <StopCircle className=\"size-3.5\" /> : (startIcon ?? <Timer className=\"size-3.5\" />),")
  })

  it("the story quick-start strip carries the Timer glyph (its label stays the story's own title, on purpose)", () => {
    const f = files.find((x) => x.rel === "web/components/work/time-panel.tsx")!
    const src = stripComments(f.source)
    expect(src).toContain("<Timer className=\"size-3.5\" />")
  })

  it("the Logs rail's own icon IS the stopwatch this law points at", () => {
    const pages = readFileSync(join(REPO_ROOT, "web", "lib", "pages.ts"), "utf8")
    expect(pages).toMatch(/\btime:\s*"timer"/)
  })
})
