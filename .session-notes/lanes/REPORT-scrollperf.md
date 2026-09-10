# REPORT — scrollperf

**Branch** `perf/scrolling-is-smooth-not-just-fast` · **commit** `3534b09d`
(rebased onto `66ddd22e`) · pushed, no PR opened.
**Worktree** `/Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa/.worktrees/scrollperf`
(the brief named a worktree inside the project; LANE-COMMON's `~/kwapso-lanes/`
was overridden by that, matching the five other in-project worktrees).

**This lane changed no UI, no UX and no business logic.** It measured, and it
proposes a fix it did not apply, as the brief instructed.

---

## The answer

**The hypothesis's premise is right and its conclusion is wrong.**

The scroller genuinely is not composited — Chrome's compositor labels every
scrolling frame on the agency app `SCROLL_MAIN_THREAD`, where a document
scroller on the same machine reads `SCROLL_COMPOSITOR_THREAD`. But it does not
cost anything like what the owner is describing. The median frame gap is
**16.67ms — a clean 60fps — in every configuration I could build**, and turning
the cause off at runtime moves late frames from **12.7% to 8.5%**, not from 20fps
to 60.

**The owner's report was not reproduced.** I say what I think that means below.

**The cause is not sticky.** It is `overflow:hidden` and `border-radius`
*together* on the card that clips the scroller. Either one alone is free.

---

## What I measured, and with what

Deployed staging (`agency-staging.kwapso.app`), **real headed Chrome** driven
from Node via Playwright, signed in through the admin test-login door exactly as
`scripts/smoke-staging.mjs` does (key from the Keychain, never printed). Not the
Browser pane — a hidden tab where rAF never fires.

Committed as `scripts/scroll-cadence-bench.mjs`, with a `scripts/README.md` entry.

### The instrument I did not use, and why that matters

**`requestAnimationFrame` deltas were flat 60fps on everything** — every screen,
every control, every speed: p50 16.7ms, p95 ~17.5ms, zero frames over 33ms,
including on the two cases the compositor was demonstrably treating differently.

rAF measures the *main thread's* cadence and a composited scroll does not use
the main thread. Had I stopped there I would have reported "scrolling is fine,
60fps everywhere" with a full table behind it, and it would have been a
confident wrong answer. The brief offered rAF deltas as one of two options; the
other one, CDP tracing, is the one that works.

What counts frames a person actually saw is Chrome's **`PipelineReporter`** trace
event — one per compositor frame, carrying `state` (presented / dropped / no
update wanted) and `scroll_state`.

### The instrument was calibrated before any number off it was believed

`node scripts/scroll-cadence-bench.mjs --calibrate`, four independent runs, all
agreeing:

| case | reads |
|---|---|
| document scroll, nothing in the way | `SCROLL_COMPOSITOR_THREAD` |
| scroller behind a **non-passive wheel listener** (forced main-thread) | `SCROLL_MAIN_THREAD` |

The field discriminates. Both arms reproduce on demand, which is what makes the
app's reading admissible.

---

## Finding 1 — the scroller is not composited, and here is exactly why

Bisect: the same 40-line synthetic page each time, one property changed, **no app
code in it at all**.

| the card around the scroller | `scroll_state` |
|---|---|
| nested scroller, nothing else | `SCROLL_COMPOSITOR_THREAD` |
| `overflow:hidden` only | `SCROLL_COMPOSITOR_THREAD` |
| `border-radius` only | `SCROLL_COMPOSITOR_THREAD` |
| `box-shadow` only | `SCROLL_COMPOSITOR_THREAD` |
| a `position:sticky` child only | `SCROLL_COMPOSITOR_THREAD` |
| **`overflow:hidden` + `border-radius` together** | **`SCROLL_MAIN_THREAD`** |

It is the **rounded clip**. The app's shape is the kit's `CARD`
(`shared/ui/compositions/templates/screen-shell.tsx:1812`): `overflow-hidden` +
`rounded-[var(--radius)]`, with the one scroller `[data-slot="screen-shell-body"]`
(`:1884`) inside it.

**Two corrections to the brief's starting map**, both from source:

- The scroller is **not** `app-shell.tsx:1092` — that line is the *rail's* own
  scroller. The real one is the kit's `BODY`. `app-shell.tsx:1706`'s div sets
  `overflow-x-clip` deliberately so it does *not* become a second scroller, and
  its comment says so.
- **Sticky is exonerated.** It costs nothing in the bisect, and on the collection
  screens measured there were between **zero and one** sticky elements inside the
  scroller anyway (knowledge base: 0; tickets, meetings, accounts: 1).

Command: `node scripts/scroll-cadence-bench.mjs --calibrate`

---

## Finding 2 — what that actually costs, on the real app

Knowledge base on staging (4,375px of scroll), **five interleaved repeats per
arm** (interleaved so machine drift hits both), one property changed at runtime
via CSS injection — never a code change:

| | `scroll_state` | median gap | p95 | frames >16.7ms apart |
|---|---|---|---|---|
| baseline | `SCROLL_MAIN_THREAD` | 16.67ms | 17.34ms | **88/694 = 12.7%** |
| `border-radius:0` on the card | `SCROLL_COMPOSITOR_THREAD` | 16.67ms | 17.15ms | **59/693 = 8.5%** |

Per-run, five out of five in the same direction (18.7→14.8, 8.0→4.3, 12.9→7.3,
11.6→6.5, 12.2→9.4 %). Two further screens agree independently: a ticket detail
**14/154 → 0/154**, and the knowledge base in a taller window **21/140 → 7/139**.

**No frames over 33ms in either arm on any run but one.** This is a real,
repeatable improvement in smoothness and it is nowhere near the owner's report.

Command: `node scripts/scroll-cadence-bench.mjs --screen=knowledge --repeats=5`

---

## Finding 3 — the "each frame costs main-thread work" clause is refuted

- Main thread during a scroll: **0.95ms per frame** (212 `BeginMainFrame`s
  totalling 201ms, worst 4.4ms; `Layout` 0.17ms/frame; 12–16 raster tasks
  totalling 5ms).
- The app does **no per-frame work at all**: not one `requestAnimationFrame` in
  shipped code (only `web/test/splash.test.ts`), and the single scroll listener
  (`web/components/deep-link/use-scroll-memory.ts:251`) is passive and debounced,
  exactly as the brief said.
- **Load test.** With 4, 8 and 12ms of manufactured main-thread work every frame
  — up to three-quarters of the budget — a composited scroller and the app's
  main-thread one were **indistinguishable**, both holding a 16.67ms median.

So `SCROLL_MAIN_THREAD` here is a **fragility, not a bill**. It is a path with no
headroom rather than a path that is being charged.

---

## What I could NOT do: reproduce the owner's report

Nothing dropped below 60fps. Tried: knowledge base (4.2k sources), tickets list
and its Dashboard/Closed/All tabs, meetings, accounts, a ticket detail; light and
dark; three window sizes to 1440×932 at dpr 2; three input paths (Chrome's
smooth-scroll wheel gesture, a touch gesture, and hand-timed 120Hz wheel deltas);
speeds 1,600–8,000 px/s. Every one held a 16.67ms median.

**The honest reading is that he is seeing something this bench cannot see.** In
order of how likely each is to produce exactly "everything fast, scrolling at a
third rate" — these are questions, not findings:

1. **His Chrome, not a clean one.** I launch a fresh profile, no extensions, one
   tab. A GPU process that has fallen back to **software compositing** produces
   precisely this symptom and changes nothing else. **Ask him to open
   `chrome://gpu` and read the top block** before anything in the code is
   touched. This is the one I would check first.
2. **A second display.** Compositing onto a display with a different refresh rate
   or scale factor is a different pipeline from the built-in one I measured.
3. **A real trackpad.** My gestures are synthesised, and Chrome runs its own
   smooth-scroll animation over synthetic wheel events, which a trackpad's direct
   deltas do not get. I approximated it three ways and none degraded — but none
   of them is a finger.

I did **not** ask him any of this; the brief did not authorise contacting him and
the planner owns that.

---

## The proposed fix — NOT applied

**What would change.** One line in the kit:
`shared/ui/compositions/templates/screen-shell.tsx`'s `CARD` — stop clipping the
scroller with a rounded corner. Two shapes do it: move `overflow-hidden` off the
card onto the header band and the body separately, so radius and clip stop
meeting on one element; or keep the card and give the body its own square inner
box.

**What it costs.** A kit change, so upstream in `Kwapso/kwapso-ui-ux`, tagged and
pulled — a hand edit under `shared/ui/` turns the build red. Nothing app-side
moves. Verifying it is one line of the bench: the screen must read
`SCROLL_COMPOSITOR_THREAD`.

**What it risks.** The card's corners are client-approved (2026-09-02, "I choose
option 1 to square it" for the *leading* corner only) and the radius on the other
three is the shell's one elevation cue. Any reshape must not put the clip back on
the same element. **There is a real chance the rounded corner is worth more than
4% of frames — that is the owner's call, not this lane's.**

**What it does not fix.** The owner's report, on these numbers.

---

## Files touched

| file | why |
|---|---|
| `scripts/scroll-cadence-bench.mjs` (new, 200 lines) | The measurement, so it can be repeated when the owner rules on the fix. Header says why rAF is the wrong instrument and why it must be headed. `--calibrate` is the self-check. |
| `scripts/README.md` (+1 line) | Its own rule: every script says which of the four groups it is in. Listed under **Measure**. |
| `.session-notes/lanes/NOTE-scrollperf-scroll-cadence.md` (new) | The findings with the arithmetic. `.session-notes/perf/` was my first choice and is **gitignored** — only `.session-notes/lanes/` is tracked. |

---

## Things the planner should know

- **`scripts/README.md` opens "Eighty-one files" and there are 67 top-level files
  today** — that count was already stale before this lane. I bumped it to
  eighty-two, then reverted: adding one file does not make 81→82 true when 81 was
  already wrong. Left alone and reported rather than made differently wrong.
- **The first gate run was green and should not have been**, because the bench
  was still under `.session-notes/perf/`, which oxlint does not scan. Moving it
  into `scripts/` immediately found a `no-useless-escape`. A file outside the
  lint's reach is not a file that passed the lint.
- **The ticket-detail case is thin**: that record only had 850px to scroll, so it
  moved 69.5px. Its `scroll_state` flip is solid; its frame distribution is a
  small sample. A long ticket thread would be a better subject and I did not find
  one.
- I read staging only. No migration, no `ALTER`, no deploy, no model call, no API
  key of the owner's spent.

## Gate

`npm run check > gate3.log 2>&1; echo EXIT=$?` → **EXIT=0**, unpiped.

| workspace suite | test files | tests |
|---|---|---|
| (1) | 21 passed | 224 passed |
| (2) | 77 passed | 991 passed |
| (3) | 93 passed, 1 skipped | 1217 passed, 3 skipped |
| (4) | 40 passed | 427 passed |
| (5) | 13 passed | 609 passed |
| (6) | 5 passed | 90 passed |
| (7) | 11 passed | 100 passed |
| (8) | 2 passed | 49 passed |
| (9) | 145 passed | 1215 passed, 8 skipped |
| (10) | 12 passed | 96 passed |
| **total** | **419 passed, 1 skipped** | **5,018 passed, 11 skipped, 0 failed** |

(The 11 skipped are the worktree-thinner suites — `glide/normalised.json` and
`web/out` are git-ignored artefacts a worktree does not have.)

## Review score

None. This lane has no review skill attached — the brief asked for a measurement
and a named cause, not a score.
