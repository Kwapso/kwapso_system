// PLAIN-SURFACE SCOPE — THE RULING, RULEBOOK L43 (Aurora, 21 Sep 2026):
// an experiment scoped to the TICKETS MODULE ONLY. The grouping cards around
// titled sections (Assigned to, Related stories, Effort, Stakeholders) lose
// their box and sit directly on the white main content. Chips, tabs,
// buttons, tables and their frames, toolbars, wells, the conversation card,
// the per-person tiles, the "On the loop" tile, the Effort metric tiles
// (Card variant="raised"), the dark RecordFooterBand, error and empty state
// cards and the tickets Overview chart panels stay boxed. Stories, tasks and
// every other module must not change at all.
//
// TWO SHELLS CARRY THE EXPERIMENT — `TicketSidePanel`
// (web/components/tickets/ticket-detail-body.tsx) and `EmptyGatedPanel`
// (web/components/deep-link/screen-bits.tsx) — each with a `surface?:
// "boxed" | "plain"` prop, defaulting to `"boxed"` (today's markup, byte for
// byte). `EffortCard` (web/components/work/effort-card.tsx) and
// `AssignedToCard` (web/components/tickets/help-stakeholders.tsx) forward
// their own `surface` prop into one of the two shells. Only the ticket
// record page's own call site (web/components/tickets/help-detail.tsx)
// passes `surface="plain"` — this census makes sure the string never
// spreads anywhere else before Aurora ships it app wide.
//
// TWO STRINGS CENSUSED: `surface="plain"` (the prop a call site passes) and
// `variant="plain"` (the kit `Card` variant the two shells pass down to it —
// a stray `variant="plain"` outside the two shells' own plumbing would be a
// second, undeclared door into the same experiment). Every file that
// mentions either string must be under `web/components/tickets/`, or be one
// of the two shells' own prop-plumbing files.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const REPO_ROOT = join(__dirname, "..", "..")

const ROOTS = [
  join(REPO_ROOT, "web"),
  join(REPO_ROOT, "web-portal"),
  join(REPO_ROOT, "shared", "web"),
]

/** THE ONLY FILES OUTSIDE `web/components/tickets/` PERMITTED TO MENTION
 * EITHER STRING — the two shells' own prop plumbing. `ticket-detail-body.tsx`
 * and `help-stakeholders.tsx` already live under `web/components/tickets/`,
 * so they need no entry here; only `screen-bits.tsx` (`EmptyGatedPanel`) and
 * `effort-card.tsx` (`EffortCard`, which forwards its own `surface` prop
 * into `EmptyGatedPanel`) sit outside it. */
const PLUMBING_FILES_OUTSIDE_TICKETS = new Set([
  "web/components/deep-link/screen-bits.tsx",
  "web/components/work/effort-card.tsx",
])

const NEEDLES = [`surface="plain"`, `variant="plain"`]

function allowed(rel: string): boolean {
  if (rel.startsWith("web/components/tickets/")) return true
  return PLUMBING_FILES_OUTSIDE_TICKETS.has(rel)
}

function findings(): string[] {
  const files = sourceFiles(ROOTS, {
    extensions: [".ts", ".tsx"],
    relativeTo: REPO_ROOT,
    skipTests: true,
  })
  const out: string[] = []
  for (const f of files) {
    // shared/ui is vendored and excluded by construction — none of the three
    // roots above reaches into it, but a future root added here should not
    // silently start walking it either.
    if (f.rel.startsWith("shared/ui/")) continue
    const src = stripComments(f.source)
    if (NEEDLES.some((needle) => src.includes(needle)) && !allowed(f.rel)) out.push(f.rel)
  }
  return out
}

describe("plain surface scope (rulebook L43)", () => {
  it("surface=\"plain\" / variant=\"plain\" appear only under web/components/tickets/ or the two shells' own plumbing", () => {
    const offenders = findings()
    expect(
      offenders,
      "plain sections are a tickets module experiment (rulebook L43); do not spread them before Aurora ships it app wide:\n  " +
        offenders.join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS — a synthetic offender outside the allow-list is
  // actually caught by the same matching this test's own census uses.
  it("catches a synthetic offender outside the allow-list", () => {
    const rel = "web/components/work/story-detail.tsx"
    const src = 'return <Card variant="plain">{children}</Card>'
    expect(!allowed(rel) && src.includes(`variant="plain"`)).toBe(true)
  })

  it("does not flag the two shells' own plumbing files", () => {
    expect(allowed("web/components/deep-link/screen-bits.tsx")).toBe(true)
    expect(allowed("web/components/work/effort-card.tsx")).toBe(true)
    expect(allowed("web/components/tickets/ticket-detail-body.tsx")).toBe(true)
    expect(allowed("web/components/tickets/help-stakeholders.tsx")).toBe(true)
  })
})
