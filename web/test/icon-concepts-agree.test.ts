// ONE CONCEPT, ONE GLYPH — WHEREVER THE CONCEPT IS SPELLED.
//
// The app's icon for a CONCEPT — waves, tasks, knowledge, contacts, roles — is
// not written once. It is written in four tables and a handful of call sites,
// each in the shape its consumer needs, and none derived from another:
//
//   CONCEPT_ICON            web/lib/pages.ts                        concept → kebab name
//   NAV_ICONS/SECTION_ICONS web/components/shell/app-shell.tsx      section → component
//   TAB_ICONS               shared/web/screen-engine/tabs-view.tsx  tab value → kebab name
//   KNOWLEDGE_KIND_ICON     web/components/deep-link/shape.tsx      kind → kebab name
//   the Welcome tiles       web/components/screens/home-screen.tsx  href → component
//
// … plus every tab literal that spells an `icon:` beside its `value:`, even
// though `TAB_ICONS[value]` wins over whatever it spells (tabs-view.tsx
// `tabIcon`, screen-renderer.tsx `tabGlyph`): an inline that disagrees with
// the table is a lie on the page, not a choice.
//
// Each of those carries a comment promising to match the others. A comment is
// not a check. On 17 Sep 2026 TAB_ICONS.roles said "user-gear" while
// CONCEPT_ICON.roles said "shield-check" — Settings' own Roles tab and the
// import draft-review's proposed-roles list both resolve through TAB_ICONS, so
// one concept wore two glyphs on two screens with `npm run check` green. Found
// by eye, fixed by hand. This file is what should have found it: the same
// sweep, the day it landed, found FOUR more (overview, members, open, accounts)
// that had shipped the same way.
//
// THE LAW: wherever one concept key is spelled in more than one of these
// places, every spelling resolves to the same kit export. Kebab names and
// component identifiers are compared through `kitExportName`, so a `"shield-check"`
// and a `ShieldCheck` are the same word. The failure names every disagreeing
// file, line and value, so the fix is a read, not a hunt.
//
// EVERYTHING IS READ OFF DISK, comments stripped first (see icon-vocabulary.
// test.ts's own note on why: a commented-out entry is not an entry). Importing
// the tables would be neater and would miss the point — SECTION_ICONS is not
// exported, the Welcome tiles live inside a component, and the inline tab
// literals are not a table at all.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { kitExportName } from "@shared/web/screen-engine/icon-names"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const rel = (p: string) => p.replace(ROOT + "/", "")
const read = (path: string) => stripComments(readFileSync(path, "utf8"))
const lineAt = (src: string, index: number) => src.slice(0, index).split("\n").length

/** One place a concept's glyph is written. `glyph` is the KIT EXPORT NAME
 * whatever shape the site wrote it in; `wrote` is the spelling as it sits in
 * the file, for the message. */
type Spelling = { key: string; glyph: string; site: string; where: string; wrote: string }

/** The `{ … }` that opens after `marker`, brace-matched — the one-line
 * NAV_ICONS and the hundred-line CONCEPT_ICON come out the same way. */
function objectBody(src: string, marker: string, path: string): { body: string; at: number } {
  const start = src.indexOf(marker)
  expect(start, `${marker} went missing from ${rel(path)}`).toBeGreaterThan(-1)
  const at = src.indexOf("{", start)
  let depth = 0
  for (let i = at; i < src.length; i++) {
    if (src[i] === "{") depth++
    else if (src[i] === "}" && --depth === 0) return { body: src.slice(at, i + 1), at }
  }
  throw new Error(`${marker} in ${rel(path)} never closes`)
}

/** Every `key: "kebab-name"` or `key: Component` entry of one table, keyed by
 * the concept the entry's own key names. */
function table(path: string, marker: string, site: string): Spelling[] {
  const src = read(path)
  const { body, at } = objectBody(src, marker, path)
  const out: Spelling[] = []
  for (const m of body.matchAll(/(?:^|[{,])[ \t\n]*"?([a-z][a-z0-9-]*)"?:[ \t]*(?:"([a-z][a-z0-9-]*)"|([A-Z][A-Za-z0-9]*)\b)/g)) {
    const [, key, kebab, component] = m
    const keyAt = at + m.index! + m[0].search(/["a-z]/)
    out.push({
      key,
      glyph: kebab ? kitExportName(kebab) : component,
      site: `${site}.${key}`,
      where: `${rel(path)}:${lineAt(src, keyAt)}`,
      wrote: kebab ? `"${kebab}"` : component,
    })
  }
  expect(out.length, `${site} read as empty from ${rel(path)}`).toBeGreaterThan(0)
  return out
}

/** KNOWLEDGE_KIND_ICON is keyed by the SINGULAR kind — `ticket`, `story`,
 * `process` — and its own rule (shape.tsx) is that a kind which IS one of the
 * app's records borrows that record's rail icon. So a kind joins the pool
 * under the CONCEPT its plural names, and only then: `note`, `file` and
 * `article` are Phosphor's own words for the kind and answer to nobody. */
function conceptFor(kind: string, concepts: Set<string>): string | undefined {
  return [kind, `${kind}s`, `${kind}es`, kind.replace(/y$/, "ies")].find((c) => concepts.has(c))
}

/** The Welcome screen's tiles: `{ …, icon: Component, href: "/x" }`. The
 * concept is the destination — the path's first segment, or the `?tab=` it
 * opens when it lands on a Settings tab — because the tile's whole promise
 * (its own comment) is to wear the glyph that page wears on the rail. */
function tiles(path: string): Spelling[] {
  const src = read(path)
  const out: Spelling[] = []
  for (const m of src.matchAll(/\bicon:\s*([A-Z][A-Za-z0-9]*),\s*href:\s*"\/([a-z][a-z0-9-]*)(?:\?tab=([a-z][a-z0-9-]*))?"/g)) {
    const [, component, segment, tab] = m
    const key = tab ?? segment
    out.push({ key, glyph: component, site: `tile → ${m[0].match(/"[^"]*"/)![0]}`, where: `${rel(path)}:${lineAt(src, m.index!)}`, wrote: component })
  }
  return out
}

/** Source under a directory, tests and e2e specs excluded: a fixture may name
 * a glyph on purpose that disagrees with everything. */
function sources(dir: string): string[] {
  return sourceFiles(dir, { extensions: [".ts", ".tsx"] })
    .filter((f) => !/(^|\/)(test|e2e)\//.test(f.rel))
    .map((f) => f.path)
}

/** Every tab literal that spells its own icon: `{ value: "k", …, icon: "g" }`
 * or `icon: CONCEPT_ICON.c` (resolved through the table it names), in either
 * field order. `TAB_ICONS[value]` wins over the inline at render time, so the
 * inline joins the pool under the tab's VALUE — that is the key the strip
 * actually resolves. Screen recipes (web/lib/screens.ts) spell the same thing
 * as `key:` rather than `value:`, and screen-renderer.tsx resolves those the
 * same way, so that file's `key:` counts too. */
function inlineTabs(concepts: Map<string, string>): Spelling[] {
  const out: Spelling[] = []
  const seen = new Set<string>()
  const icon = /\bicon:\s*(?:"([a-z][a-z0-9-]*)"|CONCEPT_ICON\.([a-z][a-z0-9-]*))/
  for (const f of [
    ...sources(join(ROOT, "web", "components")),
    ...sources(join(ROOT, "web", "lib")),
    ...sources(join(ROOT, "web-portal", "components")),
    ...sources(join(ROOT, "shared", "web")),
  ]) {
    const src = read(f)
    const field = f.endsWith("/web/lib/screens.ts") ? "(?:value|key)" : "value"
    const valueThenIcon = new RegExp(`\\{[^{}]*?\\b${field}:\\s*"([a-z][a-z0-9-]*)"[^{}]*?${icon.source}`, "g")
    const iconThenValue = new RegExp(`\\{[^{}]*?${icon.source}[^{}]*?\\b${field}:\\s*"([a-z][a-z0-9-]*)"`, "g")
    const note = (key: string, kebab: string | undefined, concept: string | undefined, index: number) => {
      const where = `${rel(f)}:${lineAt(src, index)}`
      if (seen.has(where)) return
      seen.add(where)
      const resolved = concept ? concepts.get(concept) : kebab
      if (!resolved) return // `icon: CONCEPT_ICON.nothing` is tsc's to catch, not this file's
      out.push({
        key,
        glyph: kitExportName(resolved),
        site: `tab "${key}" inline icon`,
        where,
        wrote: concept ? `CONCEPT_ICON.${concept} = "${resolved}"` : `"${kebab}"`,
      })
    }
    for (const m of src.matchAll(valueThenIcon)) note(m[1], m[2], m[3], m.index! + m[0].search(new RegExp(`\\b${field}:`)))
    for (const m of src.matchAll(iconThenValue)) note(m[3], m[1], m[2], m.index! + m[0].search(new RegExp(`\\b${field}:`)))
  }
  return out
}

/** THE LAW, as a function of the pool so a control can prove it bites: for
 * every key spelled more than once, every spelling resolves to one glyph. */
function disagreements(pool: Spelling[]): string[] {
  const byKey = new Map<string, Spelling[]>()
  for (const s of pool) byKey.set(s.key, [...(byKey.get(s.key) ?? []), s])
  const out: string[] = []
  for (const [key, spellings] of byKey) {
    if (new Set(spellings.map((s) => s.glyph)).size < 2) continue
    const width = Math.max(...spellings.map((s) => s.where.length))
    out.push(
      `"${key}" is drawn ${new Set(spellings.map((s) => s.glyph)).size} ways:\n` +
        spellings.map((s) => `    ${s.where.padEnd(width)}  ${s.site} = ${s.wrote}  → ${s.glyph}`).join("\n")
    )
  }
  return out
}

function pool(): { spellings: Spelling[]; counts: Record<string, number> } {
  const concept = table(join(ROOT, "web", "lib", "pages.ts"), "export const CONCEPT_ICON", "CONCEPT_ICON")
  const concepts = new Map(concept.map((s) => [s.key, s.wrote.replace(/"/g, "")]))

  const shell = join(ROOT, "web", "components", "shell", "app-shell.tsx")
  const nav = table(shell, "const NAV_ICONS", "NAV_ICONS")
  const section = table(shell, "const SECTION_ICONS", "SECTION_ICONS")

  const tab = table(join(ROOT, "shared", "web", "screen-engine", "tabs-view.tsx"), "export const TAB_ICONS", "TAB_ICONS")

  const kind = table(join(ROOT, "web", "components", "deep-link", "shape.tsx"), "export const KNOWLEDGE_KIND_ICON", "KNOWLEDGE_KIND_ICON")
    .map((s) => ({ ...s, key: conceptFor(s.key, new Set(concepts.keys())) ?? "" }))
    .filter((s) => s.key)

  const tile = tiles(join(ROOT, "web", "components", "screens", "home-screen.tsx"))
  const inline = inlineTabs(concepts)

  return {
    spellings: [...concept, ...nav, ...section, ...tab, ...kind, ...tile, ...inline],
    counts: { concept: concept.length, nav: nav.length, section: section.length, tab: tab.length, kind: kind.length, tile: tile.length, inline: inline.length },
  }
}

describe("one concept, one glyph, across every table that spells it", () => {
  it("icon-concepts: the census read every site it claims to", () => {
    // THE FLOORS. A regex that stops matching reports a clean app it never
    // read; each site has to come back at roughly the size it is. The record
    // kinds are the ten records shape.tsx lists; the tiles are the Welcome
    // screen's six links and two admin cards; the inline tabs are the detail
    // screens' strips.
    const { counts } = pool()
    expect(counts.concept, "CONCEPT_ICON").toBeGreaterThan(30)
    expect(counts.nav, "NAV_ICONS").toBe(3)
    expect(counts.section, "SECTION_ICONS").toBeGreaterThan(10)
    expect(counts.tab, "TAB_ICONS").toBeGreaterThan(40)
    expect(counts.kind, "KNOWLEDGE_KIND_ICON's record kinds").toBeGreaterThan(8)
    expect(counts.tile, "the Welcome tiles").toBeGreaterThan(6)
    expect(counts.inline, "inline tab icons").toBeGreaterThan(40)
  })

  it("icon-concepts: wherever a concept is spelled twice, both spellings draw the same glyph", () => {
    const { spellings } = pool()
    const found = disagreements(spellings)
    // A second floor on the OVERLAP: the law judges keys spelled in more than
    // one place, and a census whose sites had drifted apart in their naming
    // would find no overlap and nothing to judge.
    const keys = new Map<string, number>()
    for (const s of spellings) keys.set(s.key, (keys.get(s.key) ?? 0) + 1)
    const overlapping = [...keys.values()].filter((n) => n > 1).length
    expect(overlapping, "too few concepts are spelled in more than one place — the sites stopped overlapping").toBeGreaterThan(25)

    expect(
      found,
      `${found.length} concept(s) wear two glyphs at once:\n\n${found.join("\n\n")}\n\n` +
        `One concept, one icon. Pick the glyph the client ruled (or the one that ships) and spell it the same ` +
        `in every site listed — a TAB_ICONS entry wins over an inline \`icon:\` on the page, so an inline that ` +
        `disagrees with it is already not what renders.`
    ).toEqual([])
  })

  it("icon-concepts: the law bites on a made-up disagreement", () => {
    // A green law that measures nothing is the failure this whole file
    // documents. Feed the comparison the exact shape of the 17 Sep roles bug
    // and insist it comes back named.
    const fake: Spelling[] = [
      { key: "roles", glyph: kitExportName("shield-check"), site: "CONCEPT_ICON.roles", where: "a.ts:1", wrote: '"shield-check"' },
      { key: "roles", glyph: kitExportName("user-gear"), site: "TAB_ICONS.roles", where: "b.tsx:2", wrote: '"user-gear"' },
      { key: "waves", glyph: "Waves", site: "SECTION_ICONS.waves", where: "c.tsx:3", wrote: "Waves" },
      { key: "waves", glyph: kitExportName("waves"), site: "TAB_ICONS.waves", where: "d.tsx:4", wrote: '"waves"' },
    ]
    const found = disagreements(fake)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('"roles" is drawn 2 ways')
    expect(found[0]).toContain("a.ts:1")
    expect(found[0]).toContain("b.tsx:2")
    expect(found[0]).toContain("UserGear")
  })
})
