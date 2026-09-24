// @vitest-environment node
//
// THE CONTACTS SURFACES TELL THEIR MARKS THE PERSON IS EXTERNAL. Aurora,
// 24 Sep 2026, reading the first landing of the greyscale work back, verbatim:
// *"no. in contacts they are not yet in grayscale."*
//
// WHAT WENT WRONG, SAID PLAINLY, BECAUSE IT IS NOT THE ORDINARY MISS. The
// treatment shipped correct everywhere the lane could reach and went out with
// the single biggest external-face wall in the app untreated — the contacts
// gallery — because that file belonged to another lane that day. It was not a
// call site nobody thought of; it was named in the lane's own report as "the
// biggest external-face surface in the app" and fenced off in the same
// sentence. So the failure the commissioning brief warned about ("a treatment
// applied in six of eight places is worse than none, because the two that are
// missed become the lie") arrived from the one direction a census cannot see:
// not an oversight, an ownership boundary. This file is what makes the
// boundary stop mattering — the check does not care who may edit the file, only
// what it says.
//
// A SEPARATE FILE FROM `external-faces-are-grey.test.tsx`, AND NOT BY
// PREFERENCE. That suite RENDERS, so it runs in jsdom, where vite serves
// `import.meta.url` over http and `fileURLToPath` refuses it — a source census
// cannot anchor itself to disk there. This one reads source, so it runs in
// node. Two environments, two files, one ruling.
//
// A SOURCE CENSUS, AND THE LIMIT IS STATED RATHER THAN GLOSSED. Rendering
// either body means standing up `PagedFind`, a door and a cache, and
// `contactGalleryBody` is a lowercase local that is deliberately not exported
// (its own header says why). So what is proved here is that the two contact
// surfaces TELL their marks; that being told is what actually greys the
// photograph is proved by RENDER, next door, at seven call sites including
// `PersonCard` itself. Neither half is worth much without the other.
//
// THE EXPECTED VALUE IS THE LITERAL WORD, NEVER A LOOKUP. A contact is
// external BY CONSTRUCTION — every row on either surface is an `accountType:
// "individual"` account linked to a company, which is what a contact IS
// (SCOPE ch.03) — so resolving it against a members cache would be
// re-deriving a fact the screen's own name states, and would fail open the
// moment that cache were cold.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"

/** The repo root, off THIS file's own location (`<repo>/web/test/…`). */
const REPO = resolve(new URL(".", import.meta.url).pathname, "..", "..")

/** The two places this app draws a CONTACT's own face, and the expression that
 * finds each one. Keyed by `{file, contains}` — a fragment of the call site's
 * own text, never a line number.
 *
 * TWO SURFACES, ONE SCREEN. Contacts has a gallery body and a table body and
 * a person can be looking at either; the gallery is the one Aurora filed
 * against and the table is the one that would have been missed next, because
 * it is shaped in a different file (`deep-link/shape.tsx`) from the screen
 * that mounts it.
 *
 * THE TABLE'S MARK IS A SQUARE, which is why it needs naming here at all. The
 * R110 census (`photo-beats-initials.test.ts`) reads `shape="round"` as the
 * app's own declaration that a mark is a person, and a contact deliberately
 * does not carry it — `record-mark.tsx` settled that on 19 Aug 2026: "A CLIENT
 * is a rounded square, whether it is a company or a sole trader." The box says
 * "client" and the photograph is still a person's face (31 of 110 hold a real
 * one). A census keyed on the shape is blind to that row by construction, so
 * this table is where it gets seen. */
const CONTACT_SURFACES: { file: string; within?: string; contains: string; what: string }[] = [
  {
    file: "web/components/accounts/contacts-screen.tsx",
    contains: "<PersonCard",
    what: "the contacts gallery wall — the tile Aurora filed this against",
  },
  {
    // SCOPED TO THE FUNCTION, and that is not fussiness. `shape.tsx` shapes
    // nine collections and three of them draw `<RecordMark picture={a.logoUrl}
    // name={a.name} size="choice">` verbatim — an ACCOUNT in a picker, an
    // ACCOUNT in a list, and this CONTACT. A bare `indexOf` found the first,
    // which is an account, reported it untold, and would have gone green the
    // day somebody greyed an account by mistake. Caught by this census failing
    // on correct code, which is the one way a too-loose anchor ever announces
    // itself.
    file: "web/components/deep-link/shape.tsx",
    within: "export function shapeContactsTable",
    contains: '<RecordMark picture={a.logoUrl} name={a.name} size="choice"',
    what: "shapeContactsTable's own person cell — the same screen's list body",
  },
]

/** The opening tag that starts at `from`, ending at its first top-level `>`.
 * Brace depth is tracked so a `{a ? b : c}` value holding a `>` does not end
 * the tag early. */
function openingTagAt(code: string, from: number): string {
  let i = from
  let depth = 0
  while (i < code.length) {
    const c = code[i]
    if (c === "{") depth++
    else if (c === "}") depth--
    else if (c === ">" && depth === 0) break
    i++
  }
  return code.slice(from, i + 1)
}

function readSurface(file: string): string {
  return stripComments(readFileSync(resolve(REPO, file), "utf8")).replace(/\s+/g, " ")
}

/** Where in `code` the call site named by an entry starts, or -1. `within`
 * narrows the search to the declaration that owns it, for a file that draws
 * the same expression for several different kinds of record. */
function siteIn(code: string, entry: { within?: string; contains: string }): number {
  const from = entry.within ? code.indexOf(entry.within.replace(/\s+/g, " ")) : 0
  if (from === -1) return -1
  const at = code.indexOf(entry.contains.replace(/\s+/g, " "), from)
  return at
}

describe("a contact's face is told it is external", () => {
  it("both contact surfaces hand their mark the fact", () => {
    const untold = CONTACT_SURFACES.filter((e) => {
      const { file } = e
      const code = readSurface(file)
      const at = siteIn(code, e)
      if (at === -1) return true
      return !/\bexternal\b/.test(openingTagAt(code, at))
    })
    expect(
      untold,
      'Aurora, 24 Sep 2026: "no. in contacts they are not yet in grayscale." A contact surface ' +
        "stopped telling its mark, or its expression moved and this census is now reading nothing " +
        "at all (which looks identical to passing):\n  " +
        untold.map((e) => `${e.file}  ${e.what}\n      ${e.contains}`).join("\n  ")
    ).toEqual([])
  })

  it("it says the word outright, never a resolved value", () => {
    // `external={isSomethingLookedUp}` would pass the clause above and would be
    // the wrong shape: a contact screen already knows, and a lookup there fails
    // OPEN (a cold cache draws everybody in colour) on the one screen where the
    // answer can never be in doubt. So the literal is required.
    for (const e of CONTACT_SURFACES) {
      const { file, what } = e
      const code = readSurface(file)
      const at = siteIn(code, e)
      expect(at, `${file}: the census found nothing to read for ${what}`).toBeGreaterThan(-1)
      const tag = openingTagAt(code, at)
      expect(
        / external[ />]/.test(tag),
        `${file} (${what}) resolves \`external\` instead of stating it. A contact is external by ` +
          "construction; a lookup here re-derives what the screen's own name says and fails open " +
          `on a cold cache. Tag read: ${tag}`
      ).toBe(true)
    }
  })

  it("the reader tells a told mark from an untold one (tripwire)", () => {
    // Both clauses above are substring work, which is the shape that passes by
    // matching nothing — the failure this lane hit twice already (a kit clause
    // satisfied by its own comment, and a render assertion satisfied by an
    // earlier test's leaked DOM). So the same reader is run over a synthetic
    // pair and must separate them.
    const told = openingTagAt('<PersonCard picture={row.logoUrl} external />', 0)
    const untold = openingTagAt('<PersonCard picture={row.logoUrl} title={a > b} />', 0)
    expect(/ external[ />]/.test(told)).toBe(true)
    expect(/ external[ />]/.test(untold)).toBe(false)
    // and the brace tracking really is doing something: the untold tag must be
    // the WHOLE element, not cut short at the `>` inside `{a > b}`.
    expect(untold).toContain("title=")
    expect(untold.endsWith("/>")).toBe(true)
  })
})
