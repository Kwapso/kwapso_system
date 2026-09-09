// R60 — AN IMAGE FILLS ITS BOX. IT IS NEVER SHRUNK TO FIT INSIDE ONE.
//
// THE RULING, client, 2026-09-09, blanket and unhedged: *"everywhere for
// images: do fill, not fit!"* Every picture this app draws is `object-cover` —
// it fills the box it is given and is CROPPED to it — never `object-contain`,
// which shrinks the picture until the whole of it sits inside the box and pads
// the difference with the ground behind it.
//
// WHAT IT COSTS, said out loud so nobody "fixes" it back. A wide wordmark in a
// small square LOSES ITS ENDS and shows its middle. That is the intent. It was
// weighed against the alternative on the screen she was looking at: a marked
// column where a contained logo sits smaller, paler and a different shape from
// the filled face beside it and the letter-tile below it — grey bars down one
// row in three, in a column that is otherwise flush. On staging only 48 of 134
// accounts hold a picture at all, so most boxes are a solid letter tile either
// way and the contained ones were the odd shape out rather than the norm.
//
// WHY A LAW AND NOT SIX EDITS. Because a fit is INVISIBLE to every other check
// here and only visible in aggregate — the same argument R32 makes about colour
// drift and R35 about the thirteen placeholder implementations. The census the
// ruling was made against found NINE `object-contain` against eleven
// `object-cover` across the estate, and not one of the nine was wrong on its own
// screen. Nobody files that as a bug. So the check reads every `object-*`
// utility this repo's own source writes and requires `cover`, and the way out is
// a reasoned, rot-checked line rather than a judgement call at a call site.
//
// ── TWO CENSUSES, BECAUSE THERE ARE TWO WAYS TO SAY "CONTAIN" ───────────────
//
//   1 · THE CLASS. `object-contain` / `object-fill` / `object-none` /
//       `object-scale-down` written into a className anywhere in our source.
//       This is the direct spelling and the one the ruling was made against.
//
//   2 · THE PROP. `fit="contain"` handed to the kit's own `Image`
//       (`shared/ui/components/image/image.tsx`, whose line 261 turns exactly
//       that value into exactly that class). Without this half the law is a
//       one-line evasion: delete the className, pass the prop, ship the same
//       pixels under a green build. A law with a documented bypass is not a law,
//       which is the lesson R59 wrote down when it refused to recognise forms by
//       shape and inverted instead.
//
// ── AND THE KIT IS OUT OF SCOPE, ON PURPOSE, WITH A NUMBER ──────────────────
//
// `shared/ui/` holds FIVE — four `object-contain` classes and one `fit="contain"`
// prop the hand census that preceded this law could not see — and NONE of them
// can be fixed here.
// It is a vendored dependency pinned by content hash: a hand-edit under that
// folder turns the build red on its own (`web/test/vendored-kit.test.ts`), so a
// law demanding one would be a law demanding a change this repo forbids — red
// either way, fixable neither way. The honest scope is OUR SOURCE, and the kit's
// half is the peer lane's, made upstream in Kwapso/kwapso-ui-ux and pulled by
// tag.
//
// That is a reason to exclude it from the REQUIREMENT and not a reason to stop
// counting it. `KIT_CONTAIN_CEILING` pins how many the vendored kit still
// carries and is asserted for EXACT equality, exactly as `TRANSLATION_CEILING`
// (R44) pins a debt that may only fall: the day the kit's fix is tagged and
// pulled, the count drops, this goes red, and the pin comes down with it — which
// is the one moment anybody would otherwise forget that the note above is now
// out of date. A ceiling that could drift upward would be a record of what the
// kit USED to owe us, translated into confidence on every build.

import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

/** OUR SOURCE — the folders this repo writes and can change. Named one by one
 * rather than walking `web/` and `web-portal/` whole, because a walk from the
 * workspace root would drag in `out/` and `node_modules/` (the walker skips
 * those) AND `test/` (it does not, unless asked) — and a test file is allowed
 * to write `object-contain` in a fixture, which is what this very file does
 * four paragraphs down. The subject is the code a person sees, not its checks. */
const ROOTS = [
  join(ROOT, "web", "app"),
  join(ROOT, "web", "components"),
  join(ROOT, "web", "lib"),
  join(ROOT, "web-portal", "app"),
  join(ROOT, "web-portal", "components"),
  join(ROOT, "web-portal", "lib"),
  join(ROOT, "shared", "web"),
]

/** The vendored kit — counted, never required (see the header). */
const KIT = join(ROOT, "shared", "ui")

/** How many non-`cover` fits the pinned kit still ships. EXACT: it may fall when
 * the upstream fix is tagged and pulled, and it may never rise.
 *
 * The five on v1.2.72, so a reader can tell at a glance whether the number
 * below still describes the same five:
 *   · components/select/select.tsx      — a select option's mark
 *   · components/dropdown-menu/…        — the same mark on a menu item
 *   · components/choice/choice.tsx      — the same mark on a choice row
 *   · components/image/image.tsx        — the `fit` prop's own branch, which is
 *                                         the seam the other three are spelled
 *                                         against and the one that decides
 *                                         whether "contain" remains sayable at
 *                                         all
 *   · components/gallery/gallery.tsx    — a gallery slide, `fit="contain"` at
 *                                         16:9, deliberately letterboxing a
 *                                         portrait. THE PROP CENSUS FOUND THIS
 *                                         ONE AND A CLASS-ONLY SCAN DID NOT:
 *                                         the hand census this law was written
 *                                         from counted four, because a fit
 *                                         spelled as a prop is invisible to a
 *                                         grep for `object-`. Which is the whole
 *                                         argument for the second census above,
 *                                         demonstrated on the first run. */
const KIT_CONTAIN_CEILING = 5

/** THE ONE FIT THIS APP KEEPS, and the reason has to survive re-reading because
 * the ruling above has no exceptions clause in it.
 *
 * Rot-checked below: a line whose file no longer holds a non-`cover` fit turns
 * the build red, so this list can only shrink and can never become a place a
 * `contain` hides. */
const OBJECT_FIT_OK: Record<string, string> = {
  "shared/web/attachment-preview.tsx":
    "The kit's media well showing a FILE somebody attached to a ticket — a " +
    "screenshot of the thing that is broken, a scan, a photograph of a screen. " +
    "Every other picture this law governs is a MARK: a logo, a face, a brand " +
    "lockup, standing FOR a record whose name is written beside it, where a crop " +
    "costs the edges of an identity the word already carries. This one IS the " +
    "content, with no word beside it saying what was lost. The well is 16/9 and " +
    "an attachment is not: a portrait screenshot cropped to it shows a band from " +
    "the middle and hides the error message at the top, which is the reason the " +
    "file was attached — and nothing on screen tells the reader that happened, " +
    "because a crop looks exactly like a picture that was always that shape. " +
    "The preview also OPENS the file, so containing it costs nothing a person " +
    "cannot get past in one press. Flagged for the client rather than assumed: " +
    "her ruling was made over marks in select components and filters, and this " +
    "is the one site in the app it does not obviously describe. Delete this line " +
    "the day she says it does.",
}

/** Every non-`cover` fit in one file, class-spelled or prop-spelled. Comments
 * are stripped first — a commented-out `object-contain` and a live one look
 * identical to a regex, and this file's own header is full of the word. */
function offences(source: string): string[] {
  const src = stripComments(source)
  const found: string[] = []
  for (const m of src.matchAll(/\bobject-(cover|contain|fill|none|scale-down)\b/g))
    if (m[1] !== "cover") found.push(m[0])
  // The kit's `Image` prop. `fit="contain"` and the ternary form a call site
  // reaches for when it wants to decide — both are the same instruction.
  for (const m of src.matchAll(/\bfit=(?:"contain"|\{\s*"contain"\s*\})/g)) found.push(m[0])
  return found
}

/** Every non-`cover` fit under `roots`, keyed by repo-relative path. */
function census(roots: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const root of roots)
    for (const f of sourceFiles(root, {
      extensions: [".ts", ".tsx", ".css"],
      relativeTo: ROOT,
      skipTests: true,
    })) {
      const hits = offences(f.source)
      if (hits.length) out.set(f.rel, hits)
    }
  return out
}

describe("R60 — an image fills its box, it is never fitted inside one", () => {
  // ── THE TRIPWIRES, FIRST, because every assertion below is a census and a
  //    census that reads nothing passes silently. Both halves of the matcher get
  //    a positive control: this is a law about a STRING, so the one way it can
  //    quietly stop working is somebody narrowing the pattern.
  it("the scan is reading real files (it must not go blind)", () => {
    const files = ROOTS.flatMap((r) => sourceFiles(r, { extensions: [".ts", ".tsx", ".css"] }))
    expect(files.length, "the walk found almost no source — it is measuring nothing").toBeGreaterThan(150)
    // And it can SEE a fit: the app is full of `object-cover` and a matcher that
    // had stopped matching would report zero of those too.
    const covers = files.filter((f) => /\bobject-cover\b/.test(stripComments(f.source)))
    expect(covers.length, "not one `object-cover` found — the pattern has stopped matching").toBeGreaterThan(5)
  })

  it("the matcher catches both spellings of a fit (its own positive control)", () => {
    expect(offences(`<img className="size-full object-contain" />`)).toEqual(["object-contain"])
    expect(offences(`<Image fit="contain" ratio="16 / 9" />`)).toEqual([`fit="contain"`])
    expect(offences(`<Image fit={"contain"} />`)).toEqual([`fit={"contain"}`])
    // …and does not fire on the thing the law WANTS, or on a comment.
    expect(offences(`<img className="object-cover" />`)).toEqual([])
    expect(offences(`// a face is drawn object-contain, historically`)).toEqual([])
  })

  it("every image in our own source fills — or has a reasoned exemption", () => {
    const found = census(ROOTS)
    const unreasoned = [...found].filter(([rel]) => !(rel in OBJECT_FIT_OK))
    expect(
      unreasoned.map(([rel, hits]) => `${rel} — ${hits.join(", ")}`),
      "an image that does not fill its box (R60, client 2026-09-09: \"everywhere for images: do fill, not fit!\"). " +
        "Use `object-cover`, or add a reasoned OBJECT_FIT_OK line saying why this picture must not be cropped"
    ).toEqual([])
  })

  it("every OBJECT_FIT_OK line is a real exemption, with a real reason", () => {
    const found = census(ROOTS)
    for (const [rel, reason] of Object.entries(OBJECT_FIT_OK)) {
      expect(existsSync(join(ROOT, rel)), `OBJECT_FIT_OK names ${rel}, which is not on disk`).toBe(true)
      expect(
        found.has(rel),
        `OBJECT_FIT_OK still exempts ${rel}, which no longer holds a non-cover fit — delete the line`
      ).toBe(true)
      expect(reason.length, `${rel}'s exemption has no argument in it`).toBeGreaterThan(120)
    }
  })

  it("the vendored kit's own debt is pinned, and may only fall", () => {
    const kit = census([KIT])
    const total = [...kit.values()].reduce((n, hits) => n + hits.length, 0)
    expect(
      total,
      total > KIT_CONTAIN_CEILING
        ? `the vendored kit gained a non-cover fit (${total} vs a pinned ${KIT_CONTAIN_CEILING}). It cannot be ` +
          "fixed here — shared/ui is hash-pinned — so this is upstream work in Kwapso/kwapso-ui-ux"
        : `the vendored kit's fix has landed (${total} left, pinned at ${KIT_CONTAIN_CEILING}). Lower ` +
          "KIT_CONTAIN_CEILING to " +
          total +
          " and re-read this file's header, which names the five that were there"
    ).toBe(KIT_CONTAIN_CEILING)
  })

  it("the app's one mark seam cannot be told to fit", () => {
    // The narrow, load-bearing half of the law, held directly rather than by
    // census: `RecordMark` draws almost every picture in the product, and it
    // used to take a `fit` prop whose square DEFAULT was `contain`. A default is
    // worse than a call site — it applies to callers who never made the choice —
    // so the prop was removed rather than re-defaulted, and this is what keeps
    // it removed. A `fit` back on this component would put the losing option
    // back within one keystroke of every mark in the app.
    const mark = stripComments(readFileSync(join(ROOT, "shared", "web", "record-mark.tsx"), "utf8"))
    expect(/\bobject-cover\b/.test(mark), "the record mark no longer fills — R60 is about this file first").toBe(true)
    expect(
      /\n\s*fit\??:/.test(mark),
      "`RecordMark` has grown a `fit` prop again — every record's picture fills its box (R60)"
    ).toBe(false)
  })
})
