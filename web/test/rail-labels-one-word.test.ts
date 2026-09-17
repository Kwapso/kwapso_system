// R85 — EVERY RAIL DESTINATION IS NAMED IN ONE WORD.
//
// The client's ruling, 17 Sep 2026, verbatim: "Make it a rule that in the
// navigation bar, we only have one-word names. For example, 'Knowledge
// Base': reduce it to 'Knowledge'. We need an alternative for work logs.
// Propose me multiple."
//
// A DESTINATION is a link a person can click to land somewhere — the same
// two lists `web/components/shell/app-shell.tsx` reads to draw the rail
// (`universal`, built from `NAV`; `sidebarPages`, built from `TEAM_SECTIONS`)
// — so this census asks `web/lib/pages.ts` the SAME question the rail does,
// rather than keeping a second, driftable list of what is "on the rail".
//
// `NAV`: every entry that carries a real `group` (not `"none"`) and is not
// `inRail: false` — today that is none of the three (`home`, `kwapso`,
// `settings` are all `group: "none"` and/or `inRail: false`), but the check
// asks the field rather than naming the rows, the same posture `app-shell.tsx`
// itself takes ("nothing in NAV does today… but the shell still asks each
// entry rather than naming one").
//
// `TEAM_SECTIONS`: every row with `placement: "sidebar"` — a "tab" or
// "contextual" row is reached from somewhere else entirely (R64) and is not a
// rail destination at all.
//
// GROUP HEADINGS are a different kind of label — they title a SECTION, never
// a place a click lands — and the client's ruling never named one, so they
// are named in `RAIL_LABEL_WORDS_OK` (shared/rules/registry.ts) rather than
// measured, reason "groups are headings, not destinations; awaiting her
// word". Rot-checked against `NAV_GROUP_ORDER`: a key naming a group that no
// longer exists has outlived its subject.

import { describe, expect, it } from "vitest"

import { NAV, NAV_GROUP_LABELS, NAV_GROUP_ORDER, TEAM_SECTIONS } from "@/lib/pages"
import { RAIL_LABEL_WORDS_OK } from "@shared/rules/registry"

type RailLabel = { key: string; label: string }

/** Every rail DESTINATION, off the same two lists the shell itself reads —
 * never a hand-kept list of slugs. */
function railDestinations(): RailLabel[] {
  const fromNav = NAV.filter((i) => i.group !== "none" && i.inRail !== false).map((i) => ({
    key: `nav:${i.slug}`,
    label: i.title,
  }))
  const fromSections = TEAM_SECTIONS.filter((s) => s.placement === "sidebar").map((s) => ({
    key: `section:${s.key}`,
    label: s.title,
  }))
  return [...fromNav, ...fromSections]
}

/** One word: no whitespace, no hyphen, once the label is trimmed. */
function isOneWord(label: string): boolean {
  const trimmed = label.trim()
  return trimmed.length > 0 && !/[\s-]/.test(trimmed)
}

describe("R85 — every rail destination is named in one word", () => {
  it("rail-labels-one-word: every NAV/TEAM_SECTIONS destination reachable from the rail has a one-word title", () => {
    const offenders = railDestinations()
      .filter((d) => !isOneWord(d.label))
      .map((d) => `${d.key} — "${d.label}"`)
    expect(offenders, offenders.join("\n")).toEqual([])
  })

  it("the red proof: today's registry (\"Knowledge base\", \"Work logs\") would have failed this exact check", () => {
    const preFix: RailLabel[] = [
      { key: "section:knowledge", label: "Knowledge base" },
      { key: "section:time", label: "Work logs" },
      { key: "section:accounts", label: "Accounts" },
    ]
    const offenders = preFix.filter((d) => !isOneWord(d.label))
    expect(offenders.map((d) => d.key)).toEqual(["section:knowledge", "section:time"])
  })

  it("group headings are named in RAIL_LABEL_WORDS_OK, not silently measured — every current group is covered, and the table names no group that no longer exists", () => {
    const stale = Object.keys(RAIL_LABEL_WORDS_OK).filter(
      (k) => !(NAV_GROUP_ORDER as readonly string[]).includes(k)
    )
    expect(
      stale,
      `these RAIL_LABEL_WORDS_OK entries name a group that no longer exists — delete them:\n  ${stale.join("\n  ")}`
    ).toEqual([])

    for (const group of NAV_GROUP_ORDER) {
      expect(
        RAIL_LABEL_WORDS_OK[group],
        `${group} ("${NAV_GROUP_LABELS[group]}") has no RAIL_LABEL_WORDS_OK entry — every group sits there for now, awaiting the client's word on whether headings are in scope`
      ).toBeTruthy()
    }
  })

  it("Knowledge and Hours are the live titles today", () => {
    const knowledge = TEAM_SECTIONS.find((s) => s.key === "knowledge")
    const time = TEAM_SECTIONS.find((s) => s.key === "time")
    expect(knowledge?.title).toBe("Knowledge")
    expect(time?.title).toBe("Hours")
    // The routes and identifiers never moved.
    expect(knowledge?.segment).toBe("knowledge")
    expect(time?.segment).toBe("time")
  })
})
