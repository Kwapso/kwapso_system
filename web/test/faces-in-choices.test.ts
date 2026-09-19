// R90 — FACES IN CHOICES: ANY CHOICE OVER PEOPLE, CONTACTS, ACCOUNTS OR APPS
// SHOWS THE SAME FACE THE LISTS SHOW.
//
// Aurora, verbatim, about the new Raised-by `Select` on the ticket form and
// page: "every time there is an avatar, I want to also see it in the choice
// component, so I also want to see the avatars here." Stated as a law of the
// house rather than a one-off fix: any choice over people, contacts, accounts
// or apps carries the record's own face — a photograph where it has one,
// initials on the record's own tone where it does not — in its OPTIONS.
//
// WHY THIS IS `Select`'S OWN LAW, AND NOT R35 WIDENED. R35
// (`records-carry-their-face`) already holds `RecordPicker`/`PickerOption` to
// exactly this account, structurally, through the TYPE (`picture`/`mark`/
// `face` are fields `PickerOption` must declare, so a caller cannot drop one
// before a component ever sees it). That mechanism has nothing to do with
// this one: the kit's `Select` (`@shared/ui/components/select/select`) only
// grew a face slot at v1.2.127 — a `face={{ src, name, tone, shape }}` prop
// on `SelectItem`, rendered through the kit's own `Avatar` primitive — and
// before that tag existed there was nothing for a `Select` census to hold
// accountable. R90 is that census, scoped to `<Select>` on purpose: folding
// `RecordPicker` in here would re-litigate ground R35 already owns through a
// completely different, non-overlapping mechanism.
//
// THE CENSUS, OFF THE DISK, LIKE EVERY OTHER LAW IN THIS FILE FAMILY
// (`staff-pill-row.test.ts`, `alphabetical-options.test.ts`). `Select` is a
// COMPOUND component here — every real call site builds its rows as CHILDREN
// (`SelectContent` › `.map()` › `SelectItem`) — so a mount's own slice runs
// from `<Select` to its matching `</Select>`. Inside that slice:
//
//   1 · IS THIS SELECT OVER PEOPLE/CONTACTS/ACCOUNTS/APPS? Detected by the
//       FIELD NAMES of the array `.map()`ed into its rows — `personName`,
//       `contactId`, `memberId`, `accountId`, `avatar`, `photo` or
//       `initials` (case-insensitively, so a prefixed camelCase field like
//       `personAccountId` or `raisedByContactId` still matches) — read
//       either straight out of the `<Select>` block itself (a call site that
//       maps its raw records inline, e.g. `contactChoices.map((l) => (
//       <SelectItem … face={{ name: l.personName }}>`) or out of the
//       SOURCE ARRAY's own definition elsewhere in the file, when the block
//       maps a pre-built options array instead (`contactOptions.map(…)`,
//       built a few lines up from `contactChoices.map((l) => ({ …,
//       label: l.personName }))`) — the same indirection
//       `staff-pill-row.test.ts`'s own `helperFindings` was written to see
//       through, resolved here by finding the identifier's own `const NAME =`
//       binding and reading a window of source after it rather than the
//       block alone.
//   2 · IF SO, DOES EVERY `<SelectItem` IN THE BLOCK CARRY `face=`? A block
//       this census marks identity-bearing must give every one of its rows a
//       `face` — not merely the legacy `image` prop, which draws a bare
//       `<img>` with no fallback (the exact gap kit v1.2.127 closed).
//
// A WORD ON WHAT THIS DOES NOT CLAIM. Text-based, like its siblings: a value
// smuggled through an opaque helper this census cannot trace is not caught.
// It is not a type-checker. What it does catch is the shape that shipped
// twice already in this file family (a picker whose face silently stayed a
// bare `<img>`, or never existed at all) — the two real call sites this law
// was written against (`help-form-dialog.tsx`'s and `help-stakeholders.tsx`'s
// own "Raised by" Selects) are both fixed and both pass it.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { FACES_IN_CHOICES_EXEMPT } from "@shared/rules/registry"

const ROOT = join(import.meta.dirname, "..", "..")

/** The seven field names the brief names, case-insensitively so a prefixed
 * camelCase field (`personAccountId`, `raisedByContactId`, `personLogoUrl`'s
 * sibling `personName`) still matches without hand-listing every prefix this
 * codebase happens to use today. */
const IDENTITY_FIELD = /personname|contactid|memberid|accountid|avatar|photo|initials/i

/** The identifier (last dotted segment) an option list is built from —
 * either `IDENT.map(` directly, or `sortedOptions(IDENT, …)` (R75's own
 * sorting seam, which every real `<Select>` call site in this app routes
 * through before mapping). */
const SOURCE_REF = /(?:sortedOptions\(\s*([\w.]+)|([\w.]+)\.map\()/g

/** The index one past the `>` that closes the tag opened at `start` —
 * stepping over `{…}` so a nested element inside a prop expression
 * (`face={{ src: x, name: y }}`) cannot end the tag early. */
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

/** A `<Select` mount's own slice, `<Select` … `</Select>` — the compound
 * shape every real call site in this app builds (see the header). */
function selectSlice(src: string, start: number): string {
  const close = "</Select>"
  const closeIdx = src.indexOf(close, start)
  return closeIdx === -1 ? src.slice(start, tagEnd(src, start)) : src.slice(start, closeIdx + close.length)
}

/** Does this `<Select>` block choose over people/contacts/accounts/apps? The
 * block's own text first (the inline-map call sites), then — for a block
 * that maps a pre-built options array instead — that array's own `const`
 * binding elsewhere in the file, read through a generous window so its
 * `.map((x) => ({ …}))` object literal is in reach. */
function isIdentityChoice(block: string, fileSrc: string): boolean {
  if (IDENTITY_FIELD.test(block)) return true
  const names = new Set<string>()
  for (const m of block.matchAll(SOURCE_REF)) {
    const dotted = m[1] ?? m[2]
    if (!dotted) continue
    names.add(dotted.split(".").pop() as string)
  }
  for (const name of names) {
    const defRe = new RegExp(`\\bconst\\s+${name}\\s*=`)
    const def = defRe.exec(fileSrc)
    if (!def) continue
    const window = fileSrc.slice(def.index, def.index + 2000)
    if (IDENTITY_FIELD.test(window)) return true
  }
  return false
}

type Finding = { rel: string; expr: string }

/** Every identity-bearing `<Select>` block with at least one `<SelectItem`
 * that carries no `face=`, one finding per (file, source-array-expression)
 * pair — the EXPRESSION the exemption registry keys on, never a line number
 * (a file:line key rots on every edit above it). */
function findings(): Finding[] {
  const files = sourceFiles([join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared", "web")], {
    extensions: [".tsx"],
    relativeTo: ROOT,
    skipTests: true,
  })
  const out: Finding[] = []
  for (const f of files) {
    const src = stripComments(f.source)
    for (const m of src.matchAll(/<Select\b/g)) {
      const block = selectSlice(src, m.index)
      if (!isIdentityChoice(block, src)) continue
      const missingFace = [...block.matchAll(/<SelectItem\b/g)].some((si) => {
        const tag = block.slice(si.index, tagEnd(block, si.index))
        return !/\bface\s*=/.test(tag)
      })
      if (!missingFace) continue
      // The expression this finding is keyed on: the source array(s) feeding
      // the block, joined — stable across edits above or below this block,
      // unlike a line number.
      const exprMatches = [...block.matchAll(SOURCE_REF)].map((sm) => sm[1] ?? sm[2])
      const expr = exprMatches.length > 0 ? [...new Set(exprMatches)].join("+") : "(inline)"
      out.push({ rel: f.rel, expr })
    }
  }
  return out
}

describe("R90 — faces in choices", () => {
  it("every Select over people/contacts/accounts/apps gives its options a face", () => {
    const found = findings()
    const unexempt = found.filter((f) => !(`${f.rel}#${f.expr}` in FACES_IN_CHOICES_EXEMPT))
    expect(
      unexempt,
      `these Selects choose over a record with a face (personName/contactId/memberId/accountId/` +
        `avatar/photo/initials on their own options array) but at least one <SelectItem> carries no ` +
        `face= — give it one (kit v1.2.127's face slot), or name it in FACES_IN_CHOICES_EXEMPT with a ` +
        `reason: ${unexempt.map((f) => `${f.rel}#${f.expr}`).join(", ")}`
    ).toEqual([])
  })

  it("FACES_IN_CHOICES_EXEMPT names only real, still-open findings", () => {
    const found = new Set(findings().map((f) => `${f.rel}#${f.expr}`))
    const stale = Object.keys(FACES_IN_CHOICES_EXEMPT).filter((key) => !found.has(key))
    expect(
      stale,
      `these FACES_IN_CHOICES_EXEMPT entries no longer match a real finding — the census moved on ` +
        `(fixed, or the source changed shape) and the line should be deleted: ${stale.join(", ")}`
    ).toEqual([])
  })
})
