import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { globSync } from "node:fs"

import { stripComments } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

/* AN ELEMENT THAT PAINTS A GROUND USES THE NAMED UTILITY.
 *
 * The kit makes a secondary button always the other tone from whatever it is
 * standing on, with no prop and no thought from the caller: tokens.css rebinds
 * `--btn-secondary-fill` off a list of CLASS NAMES —
 *
 *   .bg-background, .bg-card, .bg-popover, .bg-surface-page,
 *   .bg-surface-raised, [data-ground="page"] { --btn-secondary-fill: … }
 *
 * — and custom properties inherit, so everything inside follows. The mechanism
 * is entirely in the SELECTOR. `bg-[var(--surface-raised)]` paints the very
 * same colour and matches none of it, so the rebind never fires and the token
 * stays at its base `var(--card)` — which in light mode is the identical
 * #FFFEF9 the container was just painted with. Beige on beige.
 *
 * That is not hypothetical. It is why the client reported, twice, that "the
 * buttons in the toolbar are missing the background": both toolbars
 * (`screen-bits.tsx`, `paged-find.tsx`) painted their ground with the
 * arbitrary form, so every Filter / Sort / View control inside them was
 * invisible against it. `record-picker.tsx` even carries a note observing that
 * "`--btn-secondary-fill` already IS `--card`" — the frozen value, written down
 * as though it were the design.
 *
 * The failure is silent by construction: the colour is right, the class looks
 * deliberate, and nothing renders wrong except the thing standing on top.
 */
const GROUND_TOKENS = ["surface-raised", "surface-panel", "surface-page", "card", "background", "popover"]
const ESCAPE = new RegExp(String.raw`bg-\[var\(--(${GROUND_TOKENS.join("|")})\)\]`)

/** The one place the escape hatch is the CORRECT answer, and why.
 *
 * `agent-panel.tsx` repoints `--card` to `--surface-quiet` on this very element
 * for the assistant's own beige retint. A custom property resolves from the
 * final cascaded value on an element, not from declaration order, so a named
 * class there would read the beige it had just reassigned rather than the true
 * raised tone. Its own header argues this at length. Reading the token directly
 * is what keeps the panel's ground independent of its retint.
 *
 * An entry here is a claim that the same argument holds. Adding one without
 * that argument written beside the code is how this check stops being worth
 * running. */
const DELIBERATE = new Set(["web/components/assistant/agent-panel.tsx"])

describe("ground classes", () => {
  it("are the named utility, so the kit's ground-aware tokens still rebind", () => {
    const files = globSync("{web,shared}/**/*.tsx", {
      cwd: ROOT,
      exclude: (p) => p.includes("node_modules") ||
        p.includes("shared/ui/") ||
        p.includes("/.next/") ||
        // Tests QUOTE these class strings to assert about them; quoting is not painting.
        /(^|\/)(test|tests)\//.test(p),
    })
    const offenders: string[] = []
    for (const file of files) {
      const rel = relative(".", file).replace(/\\/g, "/")
      if (DELIBERATE.has(rel)) continue
      /* COMMENTS OUT, THROUGH THE ONE STRIPPER — and the line numbers kept.
         This used to be two regexes applied per line (`//…` to end of line, and
         a leading `*` for a block's continuation). Both directions were wrong,
         and the dangerous one is the second:

           · a BLOCK comment opened mid-line, or one whose continuation lines
             do not start with a star, was not a comment as far as those two
             regexes were concerned — a false RED on prose, the failure that
             bit this repo twice on 7 Sep 2026 (and the reason this paragraph
             describes that syntax in words rather than writing it out: the
             delimiter would close the comment it is inside);
           · and `//` inside a STRING — any URL — truncated the rest of the
             line, so a className written after one was never scanned. That is
             a false NEGATIVE, an offender the census cannot see, which is the
             direction that ships a bug under a green build.

         `stripComments` is the tokeniser the other laws read source through and
         it preserves every newline a comment spanned, so `rel:line` below still
         points where it says it does. */
      const source = stripComments(readFileSync(join(ROOT, file), "utf8"))
      source.split("\n").forEach((line, i) => {
        const hit = line.match(ESCAPE)
        if (hit) offenders.push(`${rel}:${i + 1} — ${hit[0]}`)
      })
    }
    expect(
      offenders,
      "these paint a ground with the arbitrary form, so the kit's `--btn-secondary-fill` rebind " +
        "cannot match them and every secondary control inside resolves to the same tone as its " +
        "own background. Use the named utility (bg-surface-raised, bg-card, bg-background …), " +
        "which paints the identical colour AND is in the rebind's selector list:\n" +
        offenders.join("\n")
    ).toEqual([])
  })
})
