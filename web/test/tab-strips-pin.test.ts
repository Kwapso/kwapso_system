// R77 — EVERY SCREEN-LEVEL TAB STRIP PINS ON SCROLL THROUGH ONE SEAM.
//
// The client's ruling, 2026-09-15, over Settings: "When I scroll down in
// settings, the tabs do not stay pinned at the top. Make sure you fix this
// here and everywhere else. Should be the same behavior when scrolling down:
// the tab should stay visible." R63 (`pinned-toolbar`) already pins a
// collection's own tab strip (`STICKY_FOLDER_TABS`, through the one seam
// `renderFolderTabs`, shared/web/screen-engine/tabs-view.tsx) and a record's
// own inner strip (`STICKY_TABS`, web/components/records/record-chrome.tsx).
// `settings-screen.tsx` proved a third shape existed: a MAIN screen drawing a
// bare `<TabsView>` with its own `renderPanel`, asking neither seam for the
// class — so its strip scrolled away with everything under it.
//
// THE CENSUS, OFF THE DISK, DERIVED LIKE EVERY OTHER LAW HERE: a `<TabsView`
// mount either
//   (a) is not literally `<TabsView` JSX at all, because the file calls
//       `renderFolderTabs` instead and lets THAT seam draw the strip — the
//       collection screens' own pattern, and the one `settings-screen.tsx`
//       adopted to close this law's own founding case; or
//   (b) carries `STICKY_FOLDER_TABS` or `STICKY_TABS` literally in its own
//       source — a record detail's inner strip, or a strip that spells the
//       identifier by hand.
// Nothing else passes. `TAB_STRIP_PIN_EXEMPT` (shared/rules/registry.ts) is
// the reasoned, rot-checked way out for a `<TabsView>` that is not a screen's
// own labelling strip at all — never a filename pattern hand-derived here,
// because R73 already settled that shape for every law in this file: a
// deny-list is data in the registry or it is not a deny-list.
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { TAB_STRIP_PIN_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

/** A literal mount — `<TabsView` as JSX, never the identifier discussed in a
 * comment (`stripComments`, below, already took care of that: several files
 * in this census — tickets-collection.tsx, paged-find.tsx, screen-bits.tsx,
 * member-screen.tsx — name `<TabsView>` in prose, quoting the very seam they
 * route through instead of drawing it bare). */
const MOUNT = /<TabsView\b/

/** Either sticky class, actually SPENT as the mount's own `className` — never
 * merely imported or discussed. Every real call site in the app spells it
 * `className={STICKY_TABS}` / `className={STICKY_FOLDER_TABS}` verbatim (no
 * `cn(...)` wrapper), so the positional match is exact rather than a bare
 * identifier search: a file that imports `STICKY_TABS` for some other reason,
 * or a file whose `<TabsView>` mount had its `className` prop quietly deleted
 * while the now-unused import stayed behind, must still fail this census —
 * which a plain "does the token appear anywhere" search would have missed
 * (measured: reverting `contact-detail.tsx`'s `className={STICKY_TABS}` to
 * `className={undefined}` left the identifier sitting in its own import line,
 * and a loose match passed the census clean). */
const STICKY = /className=\{STICKY_(?:FOLDER_)?TABS\}/

type Candidate = { rel: string; src: string }

/** Every `.tsx` file under `web/` and `web-portal/` whose (comment-stripped)
 * source draws a literal `<TabsView` mount — the population this law holds to
 * account, and the same one-walker seam (`shared/rules/source-scan.ts`) every
 * other derived census in this base reads off disk. */
function tabsViewMounts(): Candidate[] {
  const files = sourceFiles([join(ROOT, "web"), join(ROOT, "web-portal")], {
    extensions: [".tsx"],
    relativeTo: ROOT,
    skipTests: true,
  })
  const out: Candidate[] = []
  for (const f of files) {
    const src = stripComments(f.source)
    if (MOUNT.test(src)) out.push({ rel: f.rel, src })
  }
  return out
}

/** The law itself, as a pure function of the population and the exemption
 * table — so the mutation proof below can exercise it against a synthetic
 * fixture without touching a real file on disk. Returns the offending paths,
 * in the order they were found. */
function offenders(candidates: Candidate[], exempt: Record<string, string>): string[] {
  return candidates.filter((c) => !STICKY.test(c.src) && !(c.rel in exempt)).map((c) => c.rel)
}

describe("R77 — a screen's own tab strip pins on scroll, not only a collection's", () => {
  it("tab-strips-pin: every <TabsView mount goes through renderFolderTabs, carries the sticky class, or is a named exemption", () => {
    const candidates = tabsViewMounts()
    // THE TRIPWIRE every derived census here carries: a walk that reads
    // nothing reports the same all-clear as one that read everything and
    // found no fault. Seventeen record/main-screen strips carried STICKY_TABS
    // alone as of 2026-09-15; this only ever grows.
    expect(
      candidates.length,
      "the <TabsView census found almost nothing — the walk or the MOUNT regex has gone blind"
    ).toBeGreaterThan(10)

    const bad = offenders(candidates, TAB_STRIP_PIN_EXEMPT)
    expect(
      bad,
      "these draw a bare <TabsView> with neither STICKY_FOLDER_TABS/STICKY_TABS on their own " +
        "className nor a TAB_STRIP_PIN_EXEMPT line — the strip scrolls away with the page (R77):\n  " +
        bad.join("\n  ")
    ).toEqual([])
  })

  it("tab-strips-pin: TAB_STRIP_PIN_EXEMPT can only shrink — every line excuses a real, still-failing mount", () => {
    const byPath = new Map(tabsViewMounts().map((c) => [c.rel, c.src]))
    const stale: string[] = []
    for (const rel of Object.keys(TAB_STRIP_PIN_EXEMPT)) {
      const src = byPath.get(rel)
      if (src === undefined) {
        stale.push(`${rel}: no <TabsView mount here any more — delete the line`)
        continue
      }
      if (STICKY.test(src)) {
        stale.push(`${rel}: already carries STICKY_FOLDER_TABS/STICKY_TABS on its own — the exemption is not needed`)
      }
    }
    expect(
      stale,
      "TAB_STRIP_PIN_EXEMPT names a file whose exemption has outlived its subject:\n  " + stale.join("\n  ")
    ).toEqual([])
  })

  // PROVE THE CHECK CAN FAIL, the same discipline every derived census in
  // this base is held to (CONVENTIONS.md, "writing a check that can fail") —
  // against a SYNTHETIC fixture, never a real file, so this proof needs no
  // disk mutation and cannot itself go stale as the app's own files change.
  it("tab-strips-pin: the census is provably not vacuous", () => {
    // FIXTURE LABELS, DELIBERATELY NOT SHAPED LIKE A REPO PATH — none starts
    // with a ROOT this repo's `named-paths` census recognises (`web/`,
    // `shared/`, …), the same "an illustrative path is not a real one" escape
    // `shared/rules/registry.ts` spells `web/components/....tsx` for.
    const compliantThroughSeam: Candidate[] = [] // renderFolderTabs — no literal <TabsView at all, so not a candidate
    const compliantStickyTabs: Candidate = {
      rel: "fixture#record-detail",
      src: '<TabsView className={STICKY_TABS} config={c} value={v} onValueChange={f} renderPanel={p} />',
    }
    const compliantExempt: Candidate = {
      rel: "fixture#nested-view-switch",
      src: "<TabsView config={c} value={v} onValueChange={f} />",
    }
    const offending: Candidate = {
      rel: "fixture#bare-main-screen",
      src: "<TabsView config={tabsConfig} value={tab} onValueChange={handleTabChange} renderPanel={(panel) => null} />",
    }
    const exempt = { [compliantExempt.rel]: "fixture: a nested view switch, not a screen's own strip" }

    // The two compliant shapes, and the one this file's census never even
    // sees (renderFolderTabs draws no literal <TabsView), pass clean.
    expect(offenders([...compliantThroughSeam, compliantStickyTabs, compliantExempt], exempt)).toEqual([])

    // The exact shape settings-screen.tsx shipped with before R77 — a bare
    // mount, a renderPanel, no sticky class, no exemption — turns it red.
    expect(offenders([compliantStickyTabs, compliantExempt, offending], exempt)).toEqual([offending.rel])

    // AND THE MUTATION THIS LAW'S OWN FIX GUARDS AGAINST: strip STICKY_TABS
    // off a previously-compliant record strip (the same one-line edit
    // reverting settings-screen.tsx's fix would be) and the census must
    // catch it by name, not silently pass.
    const reverted: Candidate = { ...compliantStickyTabs, src: compliantStickyTabs.src.replace("STICKY_TABS", "") }
    expect(offenders([reverted, compliantExempt], exempt)).toEqual([reverted.rel])
  })
})
