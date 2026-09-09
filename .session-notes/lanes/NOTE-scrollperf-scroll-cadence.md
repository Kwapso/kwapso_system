# Scrolling: what was measured, 9 Sep 2026

Measured on `8cd1e60a`, against deployed staging (`agency-staging.kwapso.app`),
in a real headed Chrome driven from Node. Harness:
`scripts/scroll-cadence-bench.mjs` — `--calibrate` proves the
instrument before any number off it is believed.

## The report

The owner, 9 Sep 2026: *"Even though the app is running very quickly and data is
loading very quickly, the scrolling just feels sluggish. Not lag — I feel like
maybe if I was seeing something at 60 frames per second, now I'm seeing it at
20. It's snappy. I'll give you that it's very fast. It just doesn't feel
smooth."*

Fast and smooth are two properties. This measures the second one and nothing
here is a load time.

## The answer in one paragraph

**The scroller genuinely is not composited, and that is worth fixing. It is not
what a person sees at 20 frames per second.** Chrome's own compositor labels
every scrolling frame on the agency app `SCROLL_MAIN_THREAD`; a document
scroller on the same machine reads `SCROLL_COMPOSITOR_THREAD`. Turning one
property off at runtime flips the app to the composited path and measurably
improves the frame distribution. But the improvement is 12.7% of frames arriving
late down to 8.5% — the median frame gap is 16.67ms either way, and no
configuration I could build dropped below 60fps. The cause of "60 down to 20"
was not reproduced.

## Why the obvious instrument is the wrong one

`requestAnimationFrame` deltas reported a flat **60fps, p95 ~17ms, zero frames
over 33ms** on every screen and under every control — including the two the
compositor was demonstrably treating differently. rAF measures the main thread's
cadence, and a composited scroll does not use the main thread. Reporting that
number would have been a confident wrong answer.

What counts frames a person saw is Chrome's `PipelineReporter` trace event: one
per compositor frame, carrying `state` (presented, dropped, no update wanted)
and `scroll_state`.

## The instrument was calibrated before it was believed

`--calibrate` asks the field what it says when the answer is already known:

| case | reads |
| --- | --- |
| document scroll, nothing in the way | `SCROLL_COMPOSITOR_THREAD` |
| scroller behind a **non-passive wheel listener** (forced onto the main thread) | `SCROLL_MAIN_THREAD` |

It discriminates. Both arms reproduce on demand.

## Which ingredient takes the scroll off the compositor

Same 40-line page each time, one property changed, no app code in it at all:

| the card around the scroller | reads |
| --- | --- |
| nested scroller, nothing else | `SCROLL_COMPOSITOR_THREAD` |
| `overflow:hidden` only | `SCROLL_COMPOSITOR_THREAD` |
| `border-radius` only | `SCROLL_COMPOSITOR_THREAD` |
| `box-shadow` only | `SCROLL_COMPOSITOR_THREAD` |
| a `position:sticky` child only | `SCROLL_COMPOSITOR_THREAD` |
| **`overflow:hidden` + `border-radius` together** | **`SCROLL_MAIN_THREAD`** |

It is the **rounded clip**, and only the rounded clip. A clip alone is free and
a radius alone is free; a scroller clipped to a rounded rectangle is not.

**Sticky is exonerated.** The tab strips were the named suspect and they cost
nothing — and on the collection screens measured there were between zero and one
sticky elements inside the scroller anyway.

The app's own shape is the kit's `CARD`
(`shared/ui/compositions/templates/screen-shell.tsx`): `overflow-hidden` plus
`rounded-[var(--radius)]`, with the one scroller `[data-slot="screen-shell-body"]`
inside it.

## What it costs on the real app

Knowledge base on staging (4,375px of scroll), five interleaved repeats per arm,
one property changed at runtime (`border-radius:0` on the card):

| | scroll_state | median frame gap | p95 | frames arriving >16.7ms apart |
| --- | --- | --- | --- | --- |
| baseline | `SCROLL_MAIN_THREAD` | 16.67ms | 17.34ms | **88/694 = 12.7%** |
| card squared | `SCROLL_COMPOSITOR_THREAD` | 16.67ms | 17.15ms | **59/693 = 8.5%** |

Five runs out of five in the same direction. Two further screens agree: a ticket
detail went 14/154 late to 0/154, and the knowledge base in a taller window went
21/140 to 7/139.

No frames over 33ms in either arm on any run but one. **Nobody perceives this as
20fps.**

## The hypothesis, settled

The premise is right and the conclusion is wrong.

- *"A nested scroller with sticky descendants and a clip often cannot stay on the
  compositor"* — **confirmed**, though it is the rounded clip and not the sticky
  descendants.
- *"so each frame costs main-thread work the document scroller would not"* —
  **refuted**. The main thread spends about **0.95ms per frame** during a scroll
  (212 `BeginMainFrame`s totalling 201ms, worst 4.4ms) and the app itself does no
  per-frame work at all: there is not one `requestAnimationFrame` in shipped
  code, and the single scroll listener is passive and debounced, as the brief
  said.

A load test settles it: with 4, 8 and 12ms of manufactured main-thread work every
frame — up to three-quarters of the frame budget — the composited and
main-thread arms were indistinguishable, both holding a 16.67ms median. The
label is a fragility, not a bill.

## What was not reproduced, and the honest reason

Nothing here scrolled below 60fps. Every screen tried (knowledge base, tickets
list and its Closed and All tabs, meetings, accounts, a ticket detail), both
colour schemes, three window sizes, three input paths and scroll speeds from
1,600 to 8,000 px/s, held a 16.67ms median.

So the owner is seeing something this bench does not. What it cannot see, in
order of how likely each is to produce exactly "everything fast, scrolling at a
third rate":

1. **His Chrome, not a clean one.** This launches a fresh profile with no
   extensions and one tab. A GPU process that has fallen back to software
   compositing produces precisely this symptom and nothing else changes. Worth
   asking him to open `chrome://gpu` and say whether the top block reads
   hardware accelerated.
2. **A second display.** Compositing across a display with a different refresh
   rate or scale factor is a different pipeline from the built-in one measured
   here.
3. **A trackpad.** The gestures here are synthesised, and Chrome runs its own
   smooth-scroll animation over synthetic wheel events, which a trackpad's
   direct deltas do not get. A trackpad path was approximated three ways and
   none of them degraded, but none of them is a real finger either.

Any one of those would be his machine rather than this code, which is why they
are questions rather than findings.

## The proposed fix, not applied

**What would change.** One line, `shared/ui/compositions/templates/screen-shell.tsx`'s
`CARD`: stop clipping the scroller with a rounded corner. Two shapes do it —
move `overflow-hidden` off the card and onto the header band and body
separately, so the radius and the clip stop meeting on one element; or keep the
card as it is and give the body its own square inner box.

**What it costs.** It is a kit change, so it is made upstream in
`Kwapso/kwapso-ui-ux`, tagged, and pulled — a hand edit under `shared/ui/` turns
the build red. Nothing app-side moves.

**What it risks.** The card's rounded corner is client-approved
(2026-09-02, "I choose option 1 to square it" for the leading corner) and the
radius on the other three is the shell's one elevation cue. Any shape that keeps
the corner must not reintroduce the clip on the same element, and the check that
it worked is one line of this bench: the screen must read
`SCROLL_COMPOSITOR_THREAD`. There is a real chance the rounded corner is worth
more than 4% of frames, and that is the owner's call, not this lane's.

**What it does not fix.** The owner's report. On the numbers here it buys a
smoother 60fps, not a rescue from 20.
