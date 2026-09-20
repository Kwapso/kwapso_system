// R93 — VISUAL ACCOMPANIES TEXT. Aurora, verbatim, 20 Sep 2026: "When
// selecting a module, also show the module's icon. Make this law: always,
// if there's a visual (avatar, icon or color), it should always accompany
// the text everywhere (filters, views, select components…), the only
// exception being avatars/logos in chips."
//
// R90 (`faces-in-choices`) ALREADY HOLDS every `<Select>` choosing over a
// PERSON (a record's own face — a photograph or initials) to this account.
// R93 is the sibling for the visuals R90 does not reach: an ICON or a
// COLOUR, on an entity that is not a person — a module, a ticket/story type,
// a status. It EXTENDS the family rather than duplicating it: same shape of
// census, a different field vocabulary, and the two share nothing else
// because a face and an icon are drawn through two different kit slots
// (`face=` vs `icon=`) with two different fallback rules.
//
// THE EXCEPTION, READ PRECISELY. Her own words: "the only exception being
// avatars/logos in chips" — a CHIP may omit its avatar/logo, never a Select
// item, a filter option or a view row. This census only ever looks at
// `<Select>`/`<RecordPicker>` choice surfaces, so it never reaches a chip at
// all; the exception is named here for the record, not because this file
// would otherwise catch it.
//
// SCOPED TO MODULES ON PURPOSE, THE DAY THIS LAW SHIPPED — mirroring R90's
// own "scoped to `<Select>`" note. Aurora's own worked example is the
// module picker, and it is the one population this codebase can name
// WITHOUT guessing at a type from surrounding prose: every module-shaped
// array in this app is `AppModule[]` (`shared/types.ts`), carries a real
// `icon` field (`shared/module-icons.ts`), and the choice surfaces that map
// one — a `<Select>`'s `<SelectItem>` rows, or a `<RecordPicker>`'s
// `options=` — are held to drawing that icon exactly as the module's own
// gallery card does (`modules-panel.tsx`'s `icon={m.icon ?? DEFAULT_MODULE_
// ICON}`). Status and ticket/story-type colour dots already have their own
// standing census (`status-owns-the-chip.test.ts`, `status-stage-picker-
// dots.test.ts`) and are not re-covered here to avoid two laws disagreeing
// over one population; the day a SECOND named entity (an app logo, a
// contact's own colour) gets a choice surface of its own, this census's own
// field vocabulary grows to name it, the same way R90's IDENTITY_FIELD list
// grew past its first four names.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { VISUAL_ACCOMPANIES_TEXT_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

/** A module-shaped source array, by the name this codebase already gives
 * one everywhere it appears (`modules`, `appModules`, `shownModules`,
 * `group.modules`…) — the last dotted segment, so `group.modules` still
 * matches. */
const MODULE_ARRAY = /module/i

function tagEnd(src: string, start: number): number {
  let depth = 0
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (ch === "{") depth++
    else if (ch === "}") depth--
    else if (ch === ">" && depth === 0) return i + 1
  }
  return src.length
}

function componentSlice(src: string, tagName: string, start: number): string {
  const openEnd = tagEnd(src, start)
  const opening = src.slice(start, openEnd)
  if (/\/>\s*$/.test(opening.trimEnd())) return opening
  const close = `</${tagName}>`
  const closeIdx = src.indexOf(close, openEnd)
  return closeIdx === -1 ? opening : src.slice(start, closeIdx + close.length)
}

/** The identifier this block's rows are mapped from — see
 * `main-excludes-secondary.test.ts`'s identical helper. */
function sourceArray(block: string): string | null {
  const people = /\bpeople=\{\s*([\w.]+)\s*\}/.exec(block)
  if (people) return people[1]
  const mapped = /(?:sortedOptions\(\s*([\w.]+)|([\w.]+)\.map\()/.exec(block)
  if (mapped) return (mapped[1] ?? mapped[2]) ?? null
  return null
}

interface Finding {
  rel: string
  expr: string
}

function findings(): Finding[] {
  const files = sourceFiles([join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared", "web")], {
    extensions: [".tsx"],
    relativeTo: ROOT,
    skipTests: true,
  })
  const out: Finding[] = []
  for (const f of files) {
    const src = stripComments(f.source)
    // ONLY A FILE THAT ACTUALLY IMPORTS `AppModule` FROM `@shared/types` IS
    // CENSUSED — a source array simply NAMED "modules" is not enough: the
    // settings vocabulary screen (`selectable-form-dialog.tsx`) has its own,
    // unrelated `ChoiceModuleOption[]` ("modules" meaning a PERMISSION
    // module, e.g. `tickets`/`accounts` — a settings CONCEPT, resolved to a
    // fixed icon elsewhere through `CONCEPT_ICON`, never `AppModule`'s own
    // `icon` field) and would otherwise be a false positive: same word,
    // different type, no icon field to draw at all.
    if (!/import\s+type\s*\{[^}]*\bAppModule\b[^}]*\}\s*from\s*["']@shared\/types["']/.test(src)) continue
    for (const tag of ["Select", "RecordPicker"] as const) {
      for (const m of src.matchAll(new RegExp(`<${tag}\\b`, "g"))) {
        const block = componentSlice(src, tag, m.index)
        const arr = sourceArray(block)
        if (!arr) continue
        const name = arr.split(".").pop() as string
        if (!MODULE_ARRAY.test(name)) continue
        const wired =
          tag === "Select"
            ? [...block.matchAll(/<SelectItem\b/g)].every((si) => {
                const tagSrc = block.slice(si.index, tagEnd(block, si.index))
                return /\bicon\s*=/.test(tagSrc)
              })
            : /\bicon\s*:/.test(block)
        if (!wired) out.push({ rel: f.rel, expr: arr })
      }
    }
  }
  return out
}

describe("R93 — visual accompanies text (modules)", () => {
  it("every Select/RecordPicker choosing a module shows the module's own icon", () => {
    const found = findings()
    const unexempt = found.filter((f) => !(`${f.rel}#${f.expr}` in VISUAL_ACCOMPANIES_TEXT_EXEMPT))
    expect(
      unexempt,
      `these module choice surfaces carry no icon= (Select) / icon: (RecordPicker) — wire the module's ` +
        `own icon (shared/module-icons.ts's DEFAULT_MODULE_ICON fallback), or name it in ` +
        `VISUAL_ACCOMPANIES_TEXT_EXEMPT: ${unexempt.map((f) => `${f.rel}#${f.expr}`).join(", ")}`
    ).toEqual([])
  })

  it("VISUAL_ACCOMPANIES_TEXT_EXEMPT names only real, still-open findings", () => {
    const found = new Set(findings().map((f) => `${f.rel}#${f.expr}`))
    const stale = Object.keys(VISUAL_ACCOMPANIES_TEXT_EXEMPT).filter((key) => !found.has(key))
    expect(
      stale,
      `these VISUAL_ACCOMPANIES_TEXT_EXEMPT entries no longer match a real finding — the census moved on ` +
        `(fixed, or the source changed shape) and the line should be deleted: ${stale.join(", ")}`
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS, against synthetic source only (never a mutated
  // tracked file).
  it("catches a synthetic module Select with no icon", () => {
    const synthetic = `
      <Select value={moduleId} onValueChange={setModuleId}>
        {sortedOptions(modules, lang, (m) => m.name).map((m) => (
          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
        ))}
      </Select>
    `
    const block = componentSlice(synthetic, "Select", synthetic.indexOf("<Select"))
    expect(sourceArray(block)).toBe("modules")
    const wired = [...block.matchAll(/<SelectItem\b/g)].every((si) => {
      const tagSrc = block.slice(si.index, tagEnd(block, si.index))
      return /\bicon\s*=/.test(tagSrc)
    })
    expect(wired).toBe(false)
  })

  it("does not flag the same Select once every SelectItem carries icon=", () => {
    const synthetic = `
      <Select value={moduleId} onValueChange={setModuleId}>
        {sortedOptions(modules, lang, (m) => m.name).map((m) => (
          <SelectItem key={m.id} value={m.id} icon={<Icon name={m.icon ?? DEFAULT_MODULE_ICON} />}>
            {m.name}
          </SelectItem>
        ))}
      </Select>
    `
    const block = componentSlice(synthetic, "Select", synthetic.indexOf("<Select"))
    const wired = [...block.matchAll(/<SelectItem\b/g)].every((si) => {
      const tagSrc = block.slice(si.index, tagEnd(block, si.index))
      return /\bicon\s*=/.test(tagSrc)
    })
    expect(wired).toBe(true)
  })
})
