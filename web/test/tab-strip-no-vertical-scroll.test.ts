// NO TAB STRIP MAY EVER SCROLL VERTICALLY — client, 17 Sep 2026, verbatim:
// "sometimes there is a vertical scroll on the tabs under the title. It
// should not be like that."
//
// MEASURED LIVE ON STAGING (Playwright, headless, logged in through the
// admin test-login door), not guessed: on Tickets/Waves (the collection's
// own facet strip), Settings, an App detail and an Account detail (the
// record's own strip under its title), `[role=tablist]`'s `scrollHeight`
// sat exactly 1px above its `clientHeight`, with `getComputedStyle(...).
// overflowY` reading `"auto"` even though nothing in this app's own classes
// asks for that axis. THE ROOT CAUSE: the kit's `TabsList` (shared/ui/
// components/tabs/tabs.tsx) set `overflow-x-auto` and left `overflow-y`
// unset; the CSS Overflow spec's own computed-value rule turns an unset
// "visible" axis into "auto" too the moment its sibling is anything else. So
// a box a sub-pixel short of its own flex-row content (an icon, a badge, a
// translated label's line-height) became vertically scrollable —
// "sometimes", her own word, because the sub-pixel rounding depends on
// exactly what a given strip is drawing.
//
// THE FIX MOVED UPSTREAM, 17 SEP 2026, SAME DAY. Kit v1.2.111
// (shared/ui/VERSION.json) added `overflow-y-hidden` straight onto its own
// `TabsList` (shared/ui/components/tabs/tabs.tsx: `"relative max-w-full
// overflow-x-auto overflow-y-hidden scroll-p-2 [scrollbar-width:none]"`),
// the identical ruling fixed at the root rather than escaped around per
// strip. Until then this app carried its own `[&>[role=tablist]]:overflow-
// y-hidden` override on both places it pins a tab strip — `STICKY_TABS`
// (record-chrome.tsx) and `STICKY_FOLDER_TABS` (tabs-view.tsx) — which this
// test used to assert directly. Both overrides are retired now that the kit
// closes the axis for every `<Tabs>` the app draws, never only the two it
// used to escape around, so THIS test reads the kit's own constant instead
// of the two retired app-side ones — the same posture as `web/test/
// vendored-kit.test.ts`: prove the kit still carries the fix, since the app
// can no longer be the one holding it open.
//
// DRIVEN OFF THE SOURCE (the same file a browser actually reads the class
// list from), not off the live network read above — that read proved the
// DEFECT once; this proves the FIX stays in place, upstream. A regression
// here means a kit sync pulled a `TabsList` that dropped the axis, which
// `npm run kit:drift` would also catch as a content-hash mismatch, but this
// test names the actual class rather than trusting the hash alone.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
const read = (p: string) => readFileSync(join(ROOT, p), "utf8")

/** The body of `export const <name> = ...` / `const <name> = ...` — from the
 * declaration to the next top-level `export`, which is always where one of
 * these string-concatenation constants ends. Slicing by `indexOf` rather
 * than a regex: the surrounding source carries block comments with their
 * own quotes and backticks inside, which a `[\s\S]*?` capture cannot be
 * trusted to stop at reliably. */
function constBody(src: string, name: string): string {
  const start = src.indexOf(`const ${name} =`)
  if (start < 0) throw new Error(`${name} not found`)
  const from = start + `const ${name} =`.length
  const nextExport = src.indexOf("\nexport ", from)
  return src.slice(from, nextExport < 0 ? undefined : nextExport)
}

describe("no [role=tablist] strip ever scrolls on the vertical axis", () => {
  it("the kit's own TabsList (shared/ui/components/tabs/tabs.tsx) closes overflow-y", () => {
    const body = constBody(read("shared/ui/components/tabs/tabs.tsx"), "TabsList")
    expect(body, "TabsList must forbid vertical scroll on its own element").toContain(
      "overflow-y-hidden"
    )
    expect(body).not.toMatch(/overflow-y-auto\b/)
  })

  it("neither retired app-side strip constant re-opens the axis with its own override", () => {
    const cases: [string, string][] = [
      ["web/components/records/record-chrome.tsx", "STICKY_TABS"],
      ["shared/web/screen-engine/tabs-view.tsx", "STICKY_FOLDER_TABS"],
    ]
    for (const [file, name] of cases) {
      const body = constBody(read(file), name)
      expect(
        body,
        `${name} must never set [&>[role=tablist]]:overflow-y-auto or a bare overflow-auto — the kit's own TabsList now owns the closed axis`
      ).not.toMatch(/\[&>\[role=tablist\]\]:overflow-y-auto\b/)
      expect(body).not.toMatch(/\[&>\[role=tablist\]\]:overflow-auto\b/)
    }
  })
})
