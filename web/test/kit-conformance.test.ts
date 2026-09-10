// THE KIT'S OWN LAWS, RUN AGAINST THIS APP'S SOURCE — the gate.
//
// ─── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
//
// `shared/ui/` has shipped a rulebook (`docs/RULES.md`) since the day it was
// vendored, and until kit v1.2.70 nothing in this repository executed a line of
// it. Four of its rules are now EXECUTABLE — `foundations/rules/{radii,
// palette,borders,images}.mjs`, run through `conformance.mjs` — and they arrive
// with the tag, inside `foundations/`, because that is one of the nine entries
// `scripts/sync-design.mjs` copies.
//
// `images` is the newest (kit v1.2.75) and the only one this app had already
// written for itself BEFORE the kit shipped it: R60, `web/test/an-image-fills.
// test.ts`, from the client's 2026-09-09 ruling. The two now run side by side
// and that is not duplication worth deleting — R60 also counts the KIT's own
// debt and holds the `RecordMark` clause, neither of which a law shipped by the
// kit can check about itself.
//
// The first run of them against this app returned 46 findings. Thirty were CSS
// borders, which the kit has forbidden since §2.7 and which accumulated for one
// reason: the rule lived in a document this repo vendors and nothing here read
// it. That gap is the whole argument for this file.
//
// ─── THE DIVISION OF LABOUR, AND WHY IT IS SHAPED THIS WAY ───────────────────
//
// THE KIT OWNS THE RULES. THE APP OWNS THE PATHS AND ITS OWN EXEMPTIONS.
//
// The rules cannot live here: they are about the kit's own vocabulary (its two
// radii, its closed palette, its three sanctioned boundaries), so an app that
// re-derived them would be re-deriving them in every app — which is precisely
// what the owner asked to stop ("the only UI&UX input for other apps. I wanna
// avoid iteration there"). R31 and R32 in `shared/rules/registry.ts` are this
// app's own hand-written versions of two of these four laws, and R60 is a third
// — all arrived at by iterating with the client. A second app would have paid
// for them again.
//
// The EXEMPTIONS cannot live in the kit, and the reason is mechanical rather
// than tasteful: `shared/ui/` is HASH-PINNED. `web/test/vendored-kit.test.ts`
// recomputes a content hash over every delivered byte and goes red if anything
// under it was hand-edited, so this app physically cannot add a line to the
// kit's own `foundations/rules/exemptions.json` — and that is the feature. An
// app cannot quietly soften a law it is being held to. What it can do is record
// its own reviewed exceptions, in its own repo, in its own diff, as DATA:
// `web/test/kit-conformance.json`, four fields each (`law`, `where`, `what`,
// `why`), a `why` under 24 characters refused outright by the kit's own loader.
//
// Every entry is ROT-CHECKED in both directions by the kit: an entry whose file
// is gone is dead, an entry whose file no longer commits the violation is
// spent, and both turn this test red with "delete this line" as the remedy. So
// the list can only ever shrink. That is the same ratchet `COMPOSITION_EXEMPT`
// and `KIT_COMPONENT_EXEMPT` run, and it is why an exemption here is a visible,
// dated decision rather than a silent bypass.
//
// ─── WHAT THE FIRST ADOPTION ACTUALLY CHANGED ON SCREEN ──────────────────────
//
// Written down here because it is the one thing a reader of the diff will
// disagree with, and because the components that changed point at this
// paragraph rather than each repeating it.
//
// A BARE `border-b` WAS NOT A HAIRLINE. Tailwind v4 compiles it to
// `border-bottom-style: var(--tw-border-style); border-bottom-width: 1px` and
// nothing else, and v4's preflight sets `border: 0 solid` with NO colour — so
// the used colour is `currentColor`. Measured in a browser against this app's
// own compiled stylesheet: the old row divider resolved to
// `1px rgb(26, 25, 24)` in light and `1px rgb(255, 254, 249)` in dark. Full
// strength ink, both palettes. The kit's hairline is `rgba(26, 25, 24, .08)`.
//
// That is sixteen of the thirty border findings, across ten files —
// `access-tokens`, `meeting-detail`, `process-detail`, `steps-panel`,
// `internal-rate-card`, `google-connections`, the two Google pickers, the
// portal's `impact-screen` and the portal's own sticky chrome — every one of
// them drawing a black (or, in dark mode, a white) rule where the design
// language asks for an 8% edge. The other fourteen findings named their colour
// and are unchanged in tone: three picked-card rings, two indent rules, and
// the drop zone, which is exempted.
//
// Nobody filed the sixteen, and the reason nobody filed them is the reason this
// file exists: they look deliberate, they are only wrong in aggregate, and the
// rule that would have caught them lived in a document nothing executed.
//
// THE APP ALREADY DISAGREED WITH ITSELF ABOUT THIS. Thirty `divide-y` sites
// across both front doors name `divide-border` and draw the 8% line; these ten
// files drew the ink one. And `web/test/shared-web-is-styled.test.ts` found the
// identical fault in `form-shell.tsx` in August — "a bare border-t resolves to
// currentColor under Tailwind v4" — and wrote a one-FILE law against it. This
// is that law's subject, ten files wider, enforced by the kit instead of by
// hand. (`web-portal/components/ticket-attachments.tsx` was an eleventh, found
// beside them and fixed: bare `divide-y` has the same hole, and `divide-*` is
// the one clause the kit's boundary law says out loud that it does not carry.)
//
// WHICH TOKEN, PER SITE. tokens.css declares both tones and says what each is
// for: `--hair` (8%) is "fields, selection controls, same-tone card
// separation", `--hair-strong` (20%) is "section rules". So a row divider
// inside one panel takes `--hairline-under` / `--hairline-over`, and a rule
// BETWEEN two sections — the rate card's block, the portal's sticky chrome,
// the impact screen's conversation — takes the `-strong` shape. Those five
// named shapes are used rather than an inset written out by hand, because the
// kit names them for a stated reason: the standing client question "should even
// the hairline go?" is then one edit in tokens.css rather than a sweep through
// forty call sites — and they re-point themselves on an inverse ground, which
// a hand-written `var(--border)` does not.
//
// ─── WHY A TEST RATHER THAN AN npm SCRIPT ────────────────────────────────────
//
// The kit's own §12.1 suggests a `check:kit` line in package.json. This repo
// puts its laws in vitest instead — R31, R32, R39, R45 and R46 are all `it()`
// blocks in `web/test/`, run by `npm test`, which `npm run check` runs — and a
// law in the same place as the other laws is a law the next person finds.
//
// It also settles R46, and settles it HONESTLY. R46 asks that every kit part be
// REACHED by the app or carry a reasoned exemption, and `foundations/rules` was
// its one open finding: the app vendored the seam and used it nowhere. The
// reachability walk (`scripts/kit-coverage.mjs`) seeds from `from "@shared/ui/…"`
// specifiers in `web/`, `web-portal/` and `shared/web/` — so a package.json
// script invoking the CLI would have satisfied the GATE while leaving R46
// exactly as red as it was, and an exemption would have said "this app has no
// surface for it", which is false. The import below is the adoption. It is also
// the honest one: this file does not merely name the module, it runs it.
//
// ─── WHAT IS IN SCOPE, AND WHAT IS NOT ───────────────────────────────────────
//
// `ROOTS` names the directories a person's UI is written in. It does NOT name
// `shared/ui/` itself: that is a pinned dependency, checked upstream under the
// tag this app pins, and a finding inside it is unactionable here — the
// hand-edit guard forbids fixing it, so the only response is a message
// upstream. R31 and R32 make the same exclusion for the same reason.
//
// It does not name `web/test/`, `web-portal/test/` or `web/e2e/` either, and
// that is a considered line rather than a convenience: a test QUOTES a class
// name to assert about it, and quoting is not painting. Run against the whole
// of `web/`, the boundary law reports `motion-is-the-kits.test.ts:59` and
// `shared-web-is-styled.test.ts:75` — two assertions ABOUT borders, neither of
// which draws one. `ground-classes-are-named.test.ts` drew this line first and
// in the same words; this file follows it.
//
// ─── IF A LAW IS WRONG, SAY SO — DO NOT SWITCH IT OFF ────────────────────────
//
// Each law's file upstream opens with what it checks, what it deliberately does
// NOT check, and the argument for both (the radii law's header records a clause
// that was written, produced 24 findings, and was then deleted because §4.1
// blessed both spellings). That is the conversation to have. Deleting this
// file, or dropping a root out of `ROOTS`, removes the only thing that would
// have told the next person.

import { existsSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

// THE ADOPTION. `conform` is the kit's own entry point, imported rather than
// shelled out to, so the laws that run in this build are the laws of the tag in
// `shared/ui/VERSION.json` and cannot be a stale copy of them. It is Node
// builtins all the way down — the seam is written to run from inside a vendored
// directory with no package.json and no node_modules, which is why there is
// nothing to install here.
import { conform } from "@shared/ui/foundations/rules/conformance.mjs"

/** One finding, as a law hands it back. The kit's rules are plain JavaScript —
 *  Node builtins only, by construction, so there is no `.d.ts` to import and
 *  `conform` arrives untyped. This is the shape every law returns
 *  (`printFindings` in `foundations/rules/source.mjs` reads exactly these four
 *  fields), written here so the assertions below read like the rest of this
 *  suite rather than like `any`. */
type Finding = { file: string; line: number; what: string; remedy: string }

const HERE = dirname(fileURLToPath(import.meta.url)) // web/test
const ROOT = join(HERE, "..", "..") // repo root

/** The exemptions THIS APP owns. See the header for why they cannot live in
 *  the kit: `shared/ui/` is hash-pinned and this repo may not edit it. */
const EXEMPTIONS = join(ROOT, "web", "test", "kit-conformance.json")

/** Where a person's UI is written. Every directory here is walked for `.ts`
 *  and `.tsx`; anything outside it is either the pinned kit, a worker with no
 *  classes in it, or a test that quotes one. */
const ROOTS = [
  join(ROOT, "web", "app"),
  join(ROOT, "web", "components"),
  join(ROOT, "web", "lib"),
  join(ROOT, "web-portal", "app"),
  join(ROOT, "web-portal", "components"),
  join(ROOT, "web-portal", "lib"),
  join(ROOT, "shared", "web"),
]

/** The same run, as a person would type it, printed with any failure so the
 *  full report (derived counts, blind spots, every remedy) is one paste away.
 *  Built from `ROOTS` rather than written out, so it cannot drift from what
 *  this test actually ran. */
const command =
  `node shared/ui/foundations/rules/conformance.mjs \\\n` +
  `     --exemptions ${relative(ROOT, EXEMPTIONS)} \\\n` +
  `     ${ROOTS.map((r) => relative(ROOT, r)).join(" ")}`

describe("kit conformance — the vendored kit's own laws, run against this app", () => {
  /* A ROOT THAT NO LONGER EXISTS WALKS NOTHING, AND WALKING NOTHING IS GREEN.
   *
   * `sourceFilesUnder` returns an empty list for a missing directory rather
   * than throwing, which is right for the kit (an app names whatever it has)
   * and dangerous here: rename `web/components` and six of these seven roots
   * still walk, so the run stays green with the app's largest directory
   * unread. The kit's own blindness tripwires do not fire either — they guard
   * against reading NO class lists at all, not against reading most of them.
   *
   * So each root is asserted separately, before any law runs. This is the
   * canary the other laws in this repo learned to write after a census that
   * passed by seeing nothing. */
  it("every named root exists and holds source", () => {
    for (const r of ROOTS) {
      expect(existsSync(r), `${relative(ROOT, r)} is named as a UI root and does not exist`).toBe(true)
    }
  })

  it("kit-conformance: radii, palette, borders and images pass, with no blind spot and no rotted exemption", () => {
    // `only: null` is "run every law", spelled out rather than left off: the
    // kit's own CLI passes the flag's value through whether or not it was
    // given, so the parameter has no default and omitting it here would be a
    // silent single-law run the day TypeScript stopped noticing.
    const { files, results, rotted } = conform({ roots: ROOTS, exemptionsFile: EXEMPTIONS, only: null })

    /* The floor is a canary, not a target. It is far below the real count
     * (320 files on the day this was written) and exists only to fail loudly
     * if the walk collapses — a resolution change, a skip-list that grows a
     * new entry, an extension the kit stops reading. */
    expect(files.length, "the conformance walk read almost nothing — the census is broken, not clean").
      toBeGreaterThan(200)
    /* THE LAWS ARE NAMED, NOT COUNTED. This asserted `.toBe(3)` until v1.2.75
     * arrived carrying a fourth (`images`, foundations/rules/images.mjs — the
     * kit's own enforcement of the client's 2026-09-09 fill-not-fit ruling,
     * which is R60 on this side). A bare count told the truth and told it
     * uselessly: "expected 4 to be 3" names neither the law that arrived nor
     * the law that would have LEFT, and a tag that dropped `borders` while
     * adding `images` would have kept this line green with a law silently gone.
     * The names cost nothing and say which. */
    expect(
      results.map((r: { law: string }) => r.law).sort(),
      "the laws shipping in this kit tag are not the laws that ran — a law arrived, left, or was renamed upstream"
    ).toEqual(["borders", "images", "palette", "radii"])

    /* A LAW THAT CANNOT SEE ITS SUBJECT HAS NOT PASSED. Each law upstream
     * declares its own ways of going blind — a vocabulary read off an empty
     * tokens.css, a bridge that yielded no keys, a walk that met no `rounded`
     * or no class list at all — and reports them here instead of returning a
     * clean sheet. They are failures on purpose. */
    const blind = results.flatMap((r) => r.blind.map((b: string) => `${r.law}: ${b}`))
    expect(blind, `a kit law could not see its own subject:\n  ${blind.join("\n  ")}`).toEqual([])

    const findings = results.flatMap((r) =>
      r.findings.map(
        (f: Finding) =>
          `${r.law} · ${relative(ROOT, f.file)}:${f.line}\n      ${f.what}\n      → ${f.remedy}`
      )
    )
    expect(
      findings,
      `the kit's own laws refuse this source. Each finding prints its own remedy; ` +
        `the full report is:\n\n${command}\n\n  ${findings.join("\n  ")}\n\n` +
        `Fix it, or — if the exception is real — add a reasoned entry to ` +
        `${relative(ROOT, EXEMPTIONS)}. Do not delete the law.`
    ).toEqual([])

    /* THE RATCHET. An exemption whose file is gone is dead; one whose file no
     * longer commits the violation it excuses is spent. Both are red, with
     * "delete the entry" as the remedy, so this list can only ever shrink. */
    const stale = rotted.map(({ e, why }) => `${e.law} · ${e.where} · ${e.what}\n      ${why}`)
    expect(
      stale,
      `an exemption in ${relative(ROOT, EXEMPTIONS)} has outlived what it excused — ` +
        `delete the entry:\n  ${stale.join("\n  ")}`
    ).toEqual([])
  })
})
