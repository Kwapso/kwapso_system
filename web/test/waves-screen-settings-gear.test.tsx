// THE WAVES MAIN SCREEN GETS THE MODULE SETTINGS GEAR — Aurora, verbatim,
// 21 Sep 2026: "i still dont see the gear button on main page waves." She
// meant the WAVES MODULE's own main (sidebar) page
// (web/components/work/waves-screen.tsx), never a wave's own record page —
// that one already carries its own per-wave gear (wave-detail.tsx, B46,
// documents/UI-RULEBOOK.md), a different door onto a different fact (one
// wave's own phase days versus the team's default ones).
//
// R61 ("A module's settings have two doors and one derivation") says every
// segment in `MODULE_SETTINGS` gets exactly one `<ModuleSettingsGear
// segment="…">` mounted somewhere in web/ — `web/test/rules.test.ts`'s own
// `module-settings-two-doors` census already proves THAT half off the disk.
// What it cannot prove is WHERE: a gear mounted on the wrong screen (or with
// the wrong `sectionKey`/scope) would still satisfy that census. This is the
// render-level proof, source-scanned the same way
// `web/test/knowledge-head.test.tsx` proves its own screen's head order — a
// full render needs a dozen props this suite does not care about.
//
// READS waves-screen.tsx, NOT wave-detail.tsx.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "..", "..")

function readWavesScreen(): string {
  return readFileSync(join(ROOT, "web", "components", "work", "waves-screen.tsx"), "utf8")
}

describe("the Waves main-screen head (waves-screen.tsx) carries the module settings gear", () => {
  it("imports ModuleSettingsGear from the one file that decides whether a module has settings", () => {
    const src = readWavesScreen()
    expect(src).toMatch(
      /import\s*\{\s*ModuleSettingsGear\s*\}\s*from\s*"@\/components\/screens\/module-settings-screen"/
    )
  })

  it("mounts it inside CollectionHeading's own action prop, scoped to the \"waves\" segment", () => {
    const src = readWavesScreen()
    const headingAt = src.indexOf("<CollectionHeading")
    expect(headingAt, "the waves screen's own <CollectionHeading>").toBeGreaterThan(-1)
    // The head is a short, self-closing call here. `<ModuleSettingsGear …/>`
    // inside `action=` closes with its OWN `/>` first, so the slice must
    // reach past that one to CollectionHeading's own closing `/>` — the
    // SECOND occurrence, never the first.
    const gearCloseAt = src.indexOf("/>", headingAt)
    const closeAt = src.indexOf("/>", gearCloseAt + 1)
    const head = src.slice(headingAt, closeAt)
    expect(head, 'still names the section "waves"').toContain('sectionKey="waves"')
    expect(head).toContain("<ModuleSettingsGear")
    expect(head).toMatch(/<ModuleSettingsGear\s+teamId=\{teamId\}\s+segment="waves"\s*\/>/)
    // Inside the action prop, R61's own placement — not a toolbar action.
    const actionAt = head.indexOf("action={")
    const gearAt = head.indexOf("<ModuleSettingsGear")
    expect(actionAt, "CollectionHeading's action prop").toBeGreaterThan(-1)
    expect(gearAt, "the gear sits inside the action prop").toBeGreaterThan(actionAt)
  })

  it("is last in the action slot — nothing else follows it there (her 'the gear last' ruling)", () => {
    const src = readWavesScreen()
    const headingAt = src.indexOf("<CollectionHeading")
    const closeAt = src.indexOf("/>", headingAt)
    const head = src.slice(headingAt, closeAt)
    const gearAt = head.indexOf("<ModuleSettingsGear")
    const afterGear = head.slice(gearAt + "<ModuleSettingsGear".length)
    expect(afterGear, "no other control after the gear, inside the action prop").not.toMatch(
      /<(Button|GoogleSyncButton)\b/
    )
  })
})
