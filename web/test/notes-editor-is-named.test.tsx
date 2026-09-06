// THE LABEL OVER A NOTES EDITOR NOW REACHES THE EDITOR — proved by NAME, not by
// attribute.
//
// The gap this locks is not "an attribute is missing". Every one of these forms
// already passed a `Field` an `htmlFor`, and that `htmlFor` already reached the
// DOM as `for="todo-detail"` on a real `<label>`. A test that asserted the
// attribute existed would have passed happily for the whole year the editor was
// nameless, because the attribute was always there — it simply pointed at a
// `div`, and `<label for>` binds only to a labelable element.
//
// So the assertion is the one a screen reader makes: ask the accessibility tree
// for a TEXTBOX CALLED "Anything else they should know" and see whether one
// comes back. `getByRole("textbox", { name })` computes the accessible name the
// same way a browser does — `aria-labelledby`, then `aria-label`, then a bound
// `<label>` — so it is only satisfied by a name that genuinely arrives, by
// whichever of the three routes the control actually uses. Before this change
// there was no such element on any of these screens.
//
// AND IT IS ASKED IN GERMAN TOO. The name is `t(detailField.label)` — the same
// words, from the same config, as the visible label above the box — so a reader
// who chose German hearing "Anything else they should know" would mean the two
// had drifted apart. Asserting it against `translate(...)` rather than against a
// German sentence typed into this file keeps it a test of the WIRING: a re-run
// of the translator moves both sides at once.

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { translate } from "@shared/i18n"
import { sourceFiles } from "@shared/rules/source-scan"
import { LanguageProvider } from "@shared/web/language"
import { Notes } from "@shared/web/notes-editor/notes-editor"

// The only thing this dialog needs that a test cannot give it: the team the
// account picker searches in. Nothing else here is stubbed — the FormShell, the
// `Field` seam, the real catalogue and the real editor all run as they ship.
vi.mock("@/lib/use-active-team", () => ({
  useActiveTeam: () => ({ user: null, ctx: { team: { id: "t1" } }, loading: false }),
}))

import { TodoFormDialog } from "@/components/todo-form-dialog"

const ROOT = join(import.meta.dirname, "..", "..")

/** Every `<Notes …/>` OPENING TAG in a file, whole.
 *
 * Not a regex over `[^>]*`, which is the obvious version and is wrong here for a
 * reason worth writing down: every one of these call sites passes an arrow
 * handler (`onChange={(html) => …}`), so the first `>` inside the tag belongs to
 * a fat arrow rather than to the element, and a lazy match ends the tag two
 * props early — which would have found sixteen tags, read only the first prop of
 * each, and reported them all nameless. So the scan tracks BRACE DEPTH and ends
 * the tag only at a `/>` that is outside every expression container.
 *
 * AND IT READS THE SOURCE UNSTRIPPED, which is the other decision here. The
 * shared comment stripper removes block comments by regex, with no idea what is
 * a comment and what is a string — and `app-form-dialog.tsx` writes
 * `accept="image/*"` on its logo picker, whose slash-star opens a block comment
 * as far as that regex is concerned and closes sixty lines later, taking THREE
 * of this app's notes editors with it. The first draft of this census read
 * fifteen call sites instead of eighteen and was perfectly happy about it, which
 * is why the count below is a floor rather than a formality: a scan that cannot
 * see a file cannot report it. Nothing is stripped instead, so a comment written
 * INSIDE one of these tags must not contain a `>` or an unbalanced brace — and
 * if one ever does, the tag is skipped and the floor is what goes red. */
function notesTags(source: string): string[] {
  const tags: string[] = []
  for (let at = source.indexOf("<Notes"); at !== -1; at = source.indexOf("<Notes", at + 1)) {
    // `<NotesRegister>` and friends are different components.
    if (/[A-Za-z0-9_]/.test(source[at + 6] ?? "")) continue
    let depth = 0
    for (let i = at + 6; i < source.length; i++) {
      const c = source[i]
      if (c === "{") depth++
      else if (c === "}") depth--
      else if (depth === 0 && c === "/" && source[i + 1] === ">") {
        tags.push(source.slice(at, i + 2))
        break
      } else if (depth === 0 && c === ">") break // an element with children — not this one
    }
  }
  return tags
}

/** The tag's own first line, for a failure message that names the call site
 * without printing forty lines of props back at the reader. */
function firstLine(tag: string): string {
  return tag.split("\n")[0].trim()
}


afterEach(cleanup)

describe("a notes editor says what it is", () => {
  it("the To-do form's detail box is a multi-line textbox called by its own label", () => {
    render(
      <LanguageProvider value="en">
        <TodoFormDialog open onOpenChange={() => {}} onSubmit={async () => {}} />
      </LanguageProvider>
    )

    // THE WHOLE POINT: found BY NAME, through the accessibility tree.
    const box = screen.getByRole("textbox", { name: "Anything else they should know" })

    // …and it is the editor, not the title Input that sits above it.
    expect(box.getAttribute("contenteditable"), "the named textbox is not the editor").toBe("true")
    // Multi-line, so Enter is announced as a new paragraph rather than as submit.
    expect(box.getAttribute("aria-multiline")).toBe("true")
    // The `htmlFor` the call site was already writing now lands on the editable
    // node — which is what turns it from decoration into wiring, and what lets
    // the field's help and error line resolve against it.
    expect(box.id, "the Field's htmlFor never reached the editor").toBe("todo-detail")
  })

  it("…and says it in the reader's language", () => {
    render(
      <LanguageProvider value="de">
        <TodoFormDialog open onOpenChange={() => {}} onSubmit={async () => {}} />
      </LanguageProvider>
    )
    const german = translate("Anything else they should know", "de")
    expect(german, "the catalogue has no German for this label — the test would prove nothing").not.toBe(
      "Anything else they should know"
    )
    expect(screen.getByRole("textbox", { name: german })).toBeTruthy()
  })

  it("a disabled editor cannot be typed into, and says so", () => {
    render(<Notes aria-label="Detail" disabled />)
    const box = screen.getByRole("textbox", { name: "Detail" })
    // A `div` has no `disabled` attribute, so the only thing that actually takes
    // the caret away is contentEditable going false — asserted here rather than
    // assumed, because `aria-disabled` alone would be a control that announces a
    // state it is not in.
    expect(box.getAttribute("contenteditable")).toBe("false")
    expect(box.getAttribute("aria-disabled")).toBe("true")
  })

  it("and every call site on both front doors hands one over", () => {
    // The render tests above prove ONE screen. This is the other seventeen, and
    // the eighteenth somebody writes next month: an editor with no name is not a
    // broken attribute, it is a control a screen reader cannot describe, and it
    // looks completely finished to everyone who can see it.
    const roots = [join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared", "web")]
    const nameless: string[] = []
    let found = 0

    for (const f of sourceFiles(roots, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true })) {
      if (f.rel.endsWith("notes-editor/notes-editor.tsx")) continue // the definition, not a call
      for (const tag of notesTags(f.source)) {
        found++
        if (!/aria-label(?:ledby)?=/.test(tag)) nameless.push(`${f.rel}: ${firstLine(tag)}`)
      }
    }

    // A census that finds nothing passes perfectly against a deleted component —
    // and one that finds MOST of them passes just as happily, which is how the
    // first draft of this scan read fifteen of the eighteen and said nothing
    // (see `stripLineComments`). Eighteen today: sixteen inside a `Field`, the
    // meeting screen's own notes section, and the recipe engine's `notes` field.
    expect(found, "the notes-editor census has gone partly blind — it should see 18").toBeGreaterThan(17)
    expect(
      nameless,
      `a notes editor with no accessible name. Hand it the words its Field already shows:\n  ${nameless.join("\n  ")}`
    ).toEqual([])
  })

  it("…and the editor is still the kind of control that can carry one", () => {
    // The absence census above is satisfied by an editor that takes `aria-label`
    // and drops it on the floor. This is the positive half, read off the source
    // the props actually live in.
    const src = readFileSync(join(ROOT, "shared", "web", "notes-editor", "notes-editor.tsx"), "utf8")
    for (const needed of ['role="textbox"', 'aria-multiline="true"', "aria-label={ariaLabel}", "contentEditable={!disabled}"])
      expect(src, `the editor no longer carries ${needed}`).toContain(needed)
  })
})
