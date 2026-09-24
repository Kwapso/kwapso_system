// @vitest-environment node
//
// A pure source scan: it reads files and parses them, and never touches a DOM.
// The workspace's default environment is jsdom, and standing one up costs a few
// seconds of a worker thread this file has no use for.
//
// ─────────────────────────────────────────────────────────────────────────────
// R67 — A TITLED SECTION STANDS ON PAPER. NOTHING SITS ON THE BARE PAGE GROUND.
// ─────────────────────────────────────────────────────────────────────────────
//
// THE CLIENT, TWICE, IN TWO DAYS, ABOUT TWO DIFFERENT SCREENS.
//
//   2026-09-09, over the Team tab: "more members in each row, too much blank
//   space. needs container!! nothing on top of white background, its a rule!"
//
//   2026-09-10, over Settings › Integrations: "but give it a container. once
//   again, nothing shoudl sit on the white, everything contained! (make this a
//   law)"
//
// "Once again" and "make this a law" are the whole brief. The first one was
// fixed at one screen (web/components/team/team-panel.tsx, which carries the
// measured contrast numbers and the reasoning); the second is the same fault
// one tab over, which is what a fix-at-the-screen always earns.
//
// ── WHAT A CONTAINER IS HERE, AND WHY IT IS DERIVED ─────────────────────────
//
// The kit's own §2.6 settles it: there are TWO paper tones and no third.
// Off-beige `--background` is the PAGE; soft paper `--surface-panel` is the
// PANEL; a card standing on a panel takes the other tone again (`raised`).
// So "contained" is not a class somebody chose, it is a FILL FROM THE PAPER
// FAMILY, and the family is read off `shared/ui/foundations/tokens/tokens.css`
// rather than typed here: every `--surface-*` custom property the kit declares,
// plus whatever each one points AT (`--surface-raised: var(--card)`,
// `--surface-idle: var(--muted)`), MINUS `--surface-page` — which the kit
// defines as `var(--background)` and which is, by its own name, the ground a
// container is meant to stand out from. A fill the kit adds tomorrow is covered
// without editing this file; a token it renames turns the derivation red rather
// than quietly shrinking the census.
//
// ── WHAT A SECTION IS, AND WHAT WAS DELIBERATELY LEFT OUT ───────────────────
//
// The subject is a `<section>` ELEMENT. It used to be a `<section>` that
// carries a HEADING of its own — an `<h1>`…`<h4>`, the kit's `<Headline>`, or
// `<CollectionHeading>` — on the reasoning that a heading is what makes a unit
// unambiguously "a titled section of content".
//
// THE HEADING REQUIREMENT WAS DROPPED ON 2026-09-11 BY THE SAME RULING THAT
// NARROWED THE PROSE EXEMPTION (amendment 4, at `PROSE` below), and the reason
// is the sharpest argument this file has for deriving a subject rather than
// picking one. She asked for two headings to be DELETED — "remove this text
// Access tokens", and Google's eyebrow with it — and under the old subject that
// silently took both sections out of the law on the same commit that answered
// her about them. A law you leave by deleting your title is a law that rewards
// exactly the wrong fix. `<section>` is the source's own statement that this is
// a section of content; the heading was only ever a proxy for it.
//
// FOUR THINGS ARE DELIBERATELY NOT CONTENT, and each exclusion is a decision
// rather than a convenience:
//
//   · THE TITLE BLOCK. Any child that itself contains the heading — the heading
//     and the create button beside it ride the section's own header row, and a
//     heading is not something that stands ON anything.
//   · PROSE, BUT ONLY `<a>` AND `<br>` SINCE AMENDMENT 4. This exclusion used
//     to cover every readable tag and the client has overruled it; the whole
//     account is at `PROSE` below, where the narrowing is made.
//   · AN OVERLAY. A component whose declaring file renders through a portal
//     (a Radix `.Portal`, a `createPortal`) is not in the section's flow at
//     all — a `<Sheet>` or an `<AlertDialog>` declared inside a section paints
//     on the scrim, not on the page. Derived off the kit's own source, so the
//     next overlay it ships is covered.
//   · AN ACT. A lone `<Button>` (or a component that renders nothing but one)
//     is "Show older", "Ask us something", "Try again" — the same class of
//     thing as the create button in the section's header row, which the title
//     block already lets through. A control is pressed, not read.
//   · ANYTHING `hidden` OR `sr-only`. A file input a button clicks for you
//     draws nothing and cannot sit on anything.
//
// AND THE CLAUSE THAT MAKES THE LAW BITE: containment is asked PER BODY, and a
// ternary's two arms are two bodies. That is the whole reason the section the
// client reported was invisible to every check here — Access tokens drew its
// ROWS inside `bg-surface-panel` and its error, its skeleton and its zero
// straight onto the page, so "does this section have a panel in it anywhere"
// answers yes and describes the wrong screen. She was looking at the branch
// with nothing in it.
//
// A NAIVE VERSION OF THIS LAW ("every screen's root is a panel") was written
// first and thrown away: it is either trivially true or it forbids the shape
// the whole app already uses and the client has already approved — a heading
// OUTSIDE, the content on paper under it, which is what `CollectionFrame`
// draws on every collection screen in the base. Both shapes pass here, and
// they are the same sentence read from either end: either the section is the
// box, or everything the section draws is in one.
//
// ANCESTRY IS READ FROM THE SYNTAX TREE, not from indentation or a window of
// characters (the same move `action-rows-wrap.test.ts` makes beside this file):
// "what is this section standing inside" is a question about the JSX, and the
// compiler is already a dependency here.
//
// ── AMENDMENT 8 (2026-09-14) — TWO BLIND SPOTS, FOUND BY THE LANE THAT HAD TO
//    WORK AROUND THEM ─────────────────────────────────────────────────────
//
// A lane building the settings round's Automations tab
// (`web/components/screens/module-automations.tsx`) hit this census twice in
// one sitting and had to write around it both times — its own comment, beside
// `<RecordTable useKitPanel>`, named both faults precisely before this
// amendment existed to fix them:
//
//   1. IMPORT ALIASES WERE NOT RESOLVED. `shared/web/screen-engine/
//      collection-frame.tsx` does `import { CollectionFrame as
//      KitCollectionFrame } from "@shared/ui/components/collection-frame/
//      collection-frame"` and renders `<KitCollectionFrame>`. The kit's own
//      `CollectionFrame` paints `bg-surface-panel` unconditionally, so a
//      `RecordTable useKitPanel` table genuinely stands on paper — but every
//      lookup here (`declText`, `rootDecl`) was keyed by a tag's OWN spelling,
//      and an import binding declares no `VariableStatement`/
//      `FunctionDeclaration` of its own, so `KitCollectionFrame` resolved to
//      NOTHING, which this walk read as "paints nothing," not as
//      "unresolved." The lane's workaround was a class on the table that
//      repeated, in a string, a fact the kit already paints — true, but a
//      second coat of the census's own colour rather than a fix to the
//      census. Fixed by resolving every `import { X as Y }` / `import Y from`
//      binding ONE HOP through the SAME FILE LIST this walk already reads
//      (the kit's, the app's), so a tag written under its imported name finds
//      the declaration it names. The redundant class is gone —
//      `module-automations.tsx`'s `<RecordTable>` carries no className any
//      more, and the census finds the kit's real panel through the alias.
//
//   2. `componentPaints` WAS BRANCH-BLIND. It read a component's WHOLE
//      function as one string, so `settings-choices-panel.tsx`'s
//      `SettingsChoicesPanel` passed because an EARLY, UNRELATED return
//      (`modulesWithChoices.length === 0`'s `NoAccess` box) happens to spell
//      `bg-surface-panel` — a coincidence, not containment, and this file's
//      own foundational finding restated one level down: a component can
//      pass for the wrong reason, same as a section can. Fixed two ways at
//      once: an early guard return (`if (cond) return …`, not the function's
//      last statement) is cut from the text `componentPaints` scans, so a
//      loading/error/access-denied branch can no longer vouch for content it
//      has nothing to do with; and the scan gained a SECOND hop source
//      alongside the existing same-file one — an import THIS component's OWN
//      file writes — because `rootPaints` (amendment 5's real, AST-based
//      cross-file walk) cannot reach the fix here either: `ModuleAutomations`
//      returns a Fragment (`rootElements` hands back zero roots for one, on
//      purpose — "no single box to stand in"), and `SettingsChoicesPanel`'s
//      real content sits inside `<CollectionCreateActionProvider>`, which
//      forwards `{children}` opaquely (the same shape amendment 7 already
//      named for `bodies()`, blocking `rootElements` here instead). A
//      component's own `getText()` still contains whatever JSX it wraps as
//      literal source, so the table is right there in the text once an
//      import is a hop source. NEVER A CHAIN ACROSS A SECOND FILE: only the
//      ASKED-ABOUT component's own file is consulted this way, so amendment
//      5's own fixture pair (`FixtureRootedMiddle`/`FixturePaintedLeaf`, two
//      files with NO import line between them, written to prove `rootPaints`
//      specifically resolves that shape) is untouched — there is nothing
//      there to hop through, and the tripwire's `rootsFollowed >= 2` still
//      holds.
//
// MEASURED, NOT ASSUMED: before and after, the census judges the SAME 46
// sections/panels with the SAME 33 passing / 13 named in
// `UNCONTAINED_SECTION_OK` — this amendment does not change what the census
// concludes about the app as it stood, because the two blind spots' own
// workarounds (the redundant class; the `NoAccess` coincidence) were already
// making the census agree, for the wrong reason, with what turned out to be
// true. What changed is provable by mutation, not by the pass/fail count
// alone: strip either escape hatch — `module-automations.tsx`'s className, or
// `settings-choices-panel.tsx`'s `NoAccess` fill — and the AMENDMENTS-1–7
// census (no alias resolution, whole-function `componentPaints`) reports
// three sections on the bare page ground; this one still reports zero,
// because it was never leaning on either hatch to begin with.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import ts from "typescript"
import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { UNCONTAINED_SECTION_OK, OVERLAY_FAMILY_OK, RECORD_DETAIL_COLLECTION_OK } from "@shared/rules/registry"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

/** BOTH FRONT DOORS AND THE CODE THEY SHARE. `shared/web/` is in on purpose:
 * four of the app's settings sections live there and are drawn on both. */
const APP_DIRS = [join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "shared", "web")]
/** The kit, read but never judged — it is a hash-pinned dependency. It is here
 * so a `<Card>` or a `<Skeleton>` can be asked what it paints. */
const KIT_DIR = join(ROOT, "shared", "ui")

const TOKENS = join(ROOT, "shared", "ui", "foundations", "tokens", "tokens.css")

/** EVERY TOKEN RESOLVED TO A LITERAL, ONCE PER PALETTE — which is what lets the
 * ground be a COLOUR rather than a name (see `containerFills`). Light is the
 * `:root` block; dark is everything from the file's first dark selector on, so
 * both of the kit's dark blocks (`@media (prefers-color-scheme: dark)` and
 * `[data-theme="dark"]`) are read and the later wins. The kit requires the two
 * to agree — its own comment says a token defined in only one of them "renders
 * differently for 'system dark' than for 'I picked dark', and that bug is
 * miserable to find by eye" — so reading them as one block is reading what the
 * kit promises, and the tripwire below fails if the split ever stops finding a
 * real dark palette. A `var()` chain is followed to its literal; a token dark
 * never overrides falls through to its light value, which is the cascade. */
function palettes() {
  // COMMENTS FIRST, and this is not tidiness. `tokens.css` is two-thirds prose:
  // it quotes declarations inside its own explanations (`--surface-panel:
  // var(--kw-soft-paper)` appears in three comments), and it discusses
  // `[data-theme="dark"]` in prose well before the block that declares it. Read
  // raw, the palette split lands inside a comment and the light map fills up
  // with sentences — which produces a plausible-looking family that is wrong,
  // i.e. exactly the silent pass this file's tripwire exists to refuse.
  //
  // THROUGH THE ONE SHARED STRIPPER, never a regex typed here: `source-scan`'s
  // own law (`there is exactly one comment stripper`) caught the two-line
  // version this originally carried, and it is right to — a hand-rolled
  // `/\*[\s\S]*?\*/` is blind to a comment marker inside a string, which
  // `tokens.css` has in its `content:` values. `keepLength` blanks each comment
  // in place, so the index the dark-block split lands on still means what it
  // means in the file on disk.
  const css = stripComments(readFileSync(TOKENS, "utf8"), { keepLength: true })
  const darkAt = css.search(/@media \(prefers-color-scheme: dark\)|\[data-theme="dark"\]/)
  const light = new Map<string, string>()
  const dark = new Map<string, string>()
  const read = (text: string, into: Map<string, string>) => {
    for (const m of text.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)) into.set(m[1], m[2].trim())
  }
  read(css.slice(0, darkAt), light)
  read(css.slice(darkAt), dark)
  const resolve = (which: "light" | "dark", name: string, depth = 0): string => {
    if (depth > 12) return `?${name}`
    const v = (which === "dark" ? (dark.get(name) ?? light.get(name)) : light.get(name)) ?? null
    if (!v) return `?${name}`
    const m = /^var\(--([a-z0-9-]+)/.exec(v)
    if (m) return resolve(which, m[1], depth + 1)
    return v.split("/*")[0].trim().toUpperCase()
  }
  return { resolve }
}

/** THE PAPER FAMILY, off the kit's own tokens. Every `--surface-*` property and
 * every variable one points at; `--surface-page` and `--background` are the
 * GROUND and are the one thing a container is defined against.
 *
 * ── AMENDMENT 1 (2026-09-11): THE GROUND IS A VALUE, NOT A NAME ─────────────
 *
 * The version above subtracted the ground by NAME — `--surface-page` and
 * `--background`, the two tokens that say "ground" in their spelling. Every
 * other `--surface-*` was a container. But FOUR of them resolve to the page's
 * own colour: in LIGHT `--card`, `--surface-raised`, `--surface-lift` and
 * `--surface-selected` are all #FFFEF9, and so is `--background`. Two more
 * collide in DARK: `--surface-idle` and `--surface-record-footer` are both
 * #141310, and so is the dark page. So a body painted `bg-card` and standing on
 * the page was answering "I am contained" at CONTRAST 1.000 — which is not a
 * near-miss of this law, it IS this law's own worked example. The registry's
 * own `why` for R67 says it: "in LIGHT `--card`, `--background` and
 * `--surface-raised` are all #FFFEF9 — so those cards measured contrast 1.000
 * against the page". The law described the bug in prose and then blessed it in
 * code.
 *
 * So a fill is a container only where it DIFFERS FROM THE GROUND IN BOTH
 * PALETTES. Both, not either: a container that is invisible in one theme is the
 * bug this law exists to stop, and half a container is not a cheaper container.
 * Derived, so the day the kit moves a token's value the family moves with it —
 * and a token that becomes the page colour leaves the family on its own.
 *
 * WHAT THIS DOES NOT SAY. It does not say `bg-card` is never a container: a
 * raised card on soft paper is the kit's own §2.6 pairing and is exactly right.
 * It says `bg-card` cannot contain something standing on the PAGE — and by the
 * time this set is consulted, nothing above has painted, so the page is the
 * ground. The ancestor walk visits parents before children, so the first
 * painter it meets is the outermost one, whose ground is the page. */
function containerFills(): string[] {
  const css = readFileSync(TOKENS, "utf8")
  const family = new Set<string>()
  const aliasedBy = new Map<string, Set<string>>()
  for (const m of css.matchAll(/^\s*--(surface-[a-z0-9-]+):\s*var\(--([a-z0-9-]+)\)/gm)) {
    family.add(m[1])
    if (!aliasedBy.has(m[2])) aliasedBy.set(m[2], new Set())
    aliasedBy.get(m[2])!.add(m[1])
  }
  // AN ALIAS JOINS THE FAMILY ONLY WHEN MORE THAN ONE SURFACE TOKEN POINTS AT
  // IT, which is the signature of a shared PAPER TONE rather than one control's
  // fill. `--card` qualifies — `--surface-raised` and `--surface-lift` are both
  // it, it is the kit's own raised paper, and 25 places in our source spell
  // `bg-card` for exactly that. `--muted` does NOT: only `--surface-idle` points
  // at it, and idle is a disabled WELL. A section standing on `bg-muted` is
  // standing in a groove, not on a sheet, and counting it would have quietly
  // passed every section that happens to draw one line of inline code.
  for (const [alias, sources] of aliasedBy) if (sources.size > 1) family.add(alias)
  // THE GROUND ITSELF IS NEVER A CONTAINER — that is the whole sentence of the
  // law, and `--surface-page` is `var(--background)` by the kit's own line.
  family.delete("surface-page")
  family.delete("background")
  // `--kw-*` are the RAW ramp underneath the semantic tokens; nothing in the
  // app may name one (R32 forbids it), so they are not spellable fills.
  const named = [...family].filter((n) => !n.startsWith("kw-")).sort()
  // …AND NOW BY VALUE (amendment 1 above). A fill that resolves to the page's
  // own colour in either palette cannot contain anything standing on the page.
  const { resolve } = palettes()
  const groundLight = resolve("light", "background")
  const groundDark = resolve("dark", "background")
  return named.filter((n) => resolve("light", n) !== groundLight && resolve("dark", n) !== groundDark)
}

/** The fills the derivation THREW OUT, kept so the tripwire can prove the
 * subtraction did something and the failure message can say what it dropped. */
function groundColoured(): string[] {
  const css = readFileSync(TOKENS, "utf8")
  const family = new Set<string>()
  const aliasedBy = new Map<string, Set<string>>()
  for (const m of css.matchAll(/^\s*--(surface-[a-z0-9-]+):\s*var\(--([a-z0-9-]+)\)/gm)) {
    family.add(m[1])
    if (!aliasedBy.has(m[2])) aliasedBy.set(m[2], new Set())
    aliasedBy.get(m[2])!.add(m[1])
  }
  for (const [alias, sources] of aliasedBy) if (sources.size > 1) family.add(alias)
  family.delete("surface-page")
  family.delete("background")
  const kept = new Set(containerFills())
  return [...family].filter((n) => !n.startsWith("kw-") && !kept.has(n)).sort()
}

type Parsed = { rel: string; path: string; tree: ts.SourceFile }

function parse(dirs: string[]): Parsed[] {
  const out: Parsed[] = []
  for (const dir of dirs)
    for (const f of sourceFiles(dir, { extensions: [".tsx"], relativeTo: ROOT, skipTests: true }))
      out.push({
        rel: f.rel,
        path: f.path,
        tree: ts.createSourceFile(f.path, f.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
      })
  return out
}

function tagName(node: ts.Node): string | null {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText()
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText()
  return null
}

/** Every string literal anywhere inside this element's `className` — so a
 * `cn(...)`, a ternary and a `cva` call are all read, rather than only the
 * plain-string case. */
function classNameOf(node: ts.Node): string {
  const attrs = ts.isJsxElement(node)
    ? node.openingElement.attributes
    : ts.isJsxSelfClosingElement(node)
      ? node.attributes
      : null
  if (!attrs) return ""
  const parts: string[] = []
  for (const a of attrs.properties) {
    if (!ts.isJsxAttribute(a) || a.name.getText() !== "className") continue
    const collect = (n: ts.Node) => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) parts.push(n.text)
      ts.forEachChild(n, collect)
    }
    if (a.initializer) collect(a.initializer)
  }
  return parts.join(" ")
}

const HEADING = /^(h[1-4]|Headline|CollectionHeading)$/

// ── AMENDMENT 4 (2026-09-11): PROSE IS CONTENT WHEN IT IS NOT INSIDE THE THING
//    IT DESCRIBES. THE CLIENT OVERRULED THIS FILE'S OWN WRITTEN EXEMPTION. ────
//
// THE CLIENT, A FOURTH TIME, 2026-09-11, over a screenshot of Settings ›
// Integrations:
//
//   "i said nothing on white backgorund. remove this text Access tokens / Let
//    an outside tool (an AI agent, a script, an automation) work in your team
//    as you, capped by your role, in the team the token was made for. for
//    google replicate the no tokens yet, sth like "connect to google" and the
//    button to do so. remove the text directly on white background."
//
// THIS IS NOT A GAP IN THE LAW. IT IS THE LAW'S OWN EXEMPTION, REJECTED BY THE
// PERSON IT WAS WRITTEN FOR. The header above used to read, in full:
//
//   "PROSE. `<p>`, `<span>`, `<small>`, `<em>`, `<strong>`, `<a>`, `<br>`. A
//    sentence directly under a heading is part of the title block. Every
//    settings section in this app is heading + sentence + control, and boxing
//    the sentence would be a different design, not this rule."
//
// Every clause of that is a true description of the app and the last one is a
// PREDICTION about what she wanted, made on her behalf, in a lane she was not
// in. She has now looked at the screen that sentence blessed — twice: the third
// ruling was one tab over, and this is the tab itself — and said remove it. The
// exemption was the reason three amendments in one day could each widen the
// law and still leave the reported sentence standing on the white.
//
// SO THE EXEMPTION IS NARROWED RATHER THAN DELETED, and the narrowing is one
// sentence: prose is part of the title block when it is IN the title block, and
// content everywhere else. Both halves of that are already clauses in the walk
// below and neither needed writing:
//
//   · A `<p>` inside the child that carries the heading is skipped by
//     `carriesHeading(b)` one line above this exemption — the title block is
//     exempt as a UNIT, which is what "part of the title block" actually means.
//   · A `<p>` inside a body that paints is skipped by `subtreePaints(b)` — a
//     sentence on paper was never the complaint.
//
// What is left, and what now fails, is precisely the shape she pointed at: a
// sentence that is its OWN body, standing on the page ground BESIDE the box it
// describes. That is the one case the tag-based skip was covering, and it is
// the case she has now ruled on four times.
//
// TWO TAGS SURVIVE THE NARROWING, each for a reason that is not "it is prose":
//
//   · `<br>` draws nothing a person can read and cannot sit on anything, the
//     same reasoning `hidden`/`sr-only` already get.
//   · `<a>` is an ACT. "A control is pressed, not read" is this file's own
//     sentence about a lone `<Button>`, and a link is a button in a different
//     hat; letting the `<button>` through and catching the `<a>` beside it
//     would be the law disagreeing with itself about one decision.
//
// THE COST, AND IT IS PAID IN `UNCONTAINED_SECTION_OK` RATHER THAN HIDDEN: the
// heading+sentence+control shape really is everywhere, and on 2026-09-10 she
// ruled the OTHER WAY about the module settings pages' own descriptions — "The
// section description: no, I want to keep it." Keep the words and stop leaving
// them on the white are reconcilable; which of the two she means for each
// screen is hers to say. So the screens this amendment newly reaches are
// written down as reasoned exemptions, rot-checked, awaiting her ruling on a
// picture — a census that fails the build the day one is quietly "fixed" in the
// wrong direction, instead of a list in a report nothing reads.
//
// ── WHAT THIS AMENDMENT STILL CANNOT SEE, MEASURED RATHER THAN ASSUMED ──────
//
// THE BIGGEST HEADING+SENTENCE-ON-THE-GROUND SURFACE IN THE APP IS THE SEVEN
// MODULE SETTINGS PAGES, and not one of them is reachable by this walk. Ticket
// settings draws `<Headline as="h2">Ticket types</Headline>` with "The kinds a
// ticket can be raised as…" under it, on the page, above a contained toolbar —
// the exact shape of the two sections this ruling was about. TWO independent
// reasons, and closing either one alone changes nothing:
//
//   (i)  THE ROOT IS A `<div>`. `selectable-screen.tsx` and
//        `module-settings-screen.tsx` compose with `<div className="flex flex-col
//        gap-6">`, so the subject — a `<section>` ELEMENT — never reaches them.
//   (ii) THE WORDS ARE PROPS. `scope.title` / `scope.description` arrive from
//        `MODULE_SETTINGS`, a table of data; the sentence a person reads is not
//        a literal at the position that draws it, and the heading+prose sit
//        together in one wrapper `<div>` that the TITLE BLOCK clause skips as a
//        unit anyway.
//
// A VERSION THAT ALSO JUDGED PROSE INSIDE THE TITLE BLOCK WAS WRITTEN AND
// MEASURED ON 2026-09-11, and it is not here because it found exactly nothing:
// the census came back byte-identical, 8 offenders either way. Every title
// block in this repo that pairs a heading with a sentence lives in a
// `<div>`-rooted component, so the clause would have been a paragraph of law
// enforcing nothing — and a clause that measures zero is the failure mode this
// file's tripwire exists to refuse, not a free safety net.
//
// SO THE MODULE SETTINGS PAGES ARE OUT OF THIS LAW, DELIBERATELY AND IN
// WRITING, and they are also the screens the client ruled the OTHER WAY about
// on 2026-09-10 ("The section description: no, I want to keep it"). Reaching
// them means judging a component by the PROPS it is handed rather than the JSX
// it writes, which is a different check with a different oracle; it is worth
// building the day she says which way those pages go, and it is not worth
// guessing at before then.
const PROSE = /^(a|br)$/

describe("R67 — a titled section stands on paper", () => {
  const fills = containerFills()
  const FILL = new RegExp(`(^|[\\s:[])bg-(${fills.join("|")})\\b`)

  const app = parse(APP_DIRS)
  const kit = parse([KIT_DIR])
  const all = [...app, ...kit]

  // ── WHAT EACH COMPONENT PAINTS, resolved through the module-scope constants
  // its own file declares. A kit control almost never carries its fill inline:
  // `Skeleton` reads `skeletonVariants`, which is `cva(PULSE, …)`, which is
  // where `bg-surface-quiet` actually lives. Resolving one hop would call it
  // unpainted and report a false offender, so the walk is transitive over the
  // file's own top-level declarations until it stops growing.
  const declText = new Map<string, { text: string; rel: string }>()
  const fileTop = new Map<string, Map<string, string>>()
  for (const f of all) {
    const tops = new Map<string, string>()
    for (const st of f.tree.statements) {
      if (ts.isVariableStatement(st))
        for (const d of st.declarationList.declarations)
          if (ts.isIdentifier(d.name)) tops.set(d.name.text, d.getText())
      if (ts.isFunctionDeclaration(st) && st.name) tops.set(st.name.text, st.getText())
    }
    fileTop.set(f.rel, tops)
    for (const [name, text] of tops)
      if (/^[A-Z]/.test(name) && !declText.has(name)) declText.set(name, { text, rel: f.rel })
  }

  // `componentPaints` used to be built right here, closed over this outer
  // `declText`/`fileTop` (the whole app + kit). IT NOW LIVES INSIDE
  // `createPaintWalk` BELOW, unchanged in substance but PARAMETERISED BY A
  // FILE LIST rather than closed over `all` — see that function's own header
  // for why: R67's amendment-5 tripwire needed a corpus it owns, not the
  // app's, and a closure over `all` cannot be pointed at anything else.
  // `declText`/`fileTop` stay here, unmoved, because `isOverlay` and `isAct`
  // just below still read them and have nothing to do with painting.

  // ── AMENDMENT 6 (2026-09-14) — AN OVERLAY IS ONE OF THE KIT'S OWN
  //    SCRIM-STANDING SURFACES, NOT "RENDERS ANY PORTAL", AND IT IS ASKED OF
  //    EVERY ROOT A COMPONENT CAN RETURN, NOT OF ANY TAG ITS TEXT MENTIONS ──
  //
  // THE OLD TEST WAS "DOES THE DECLARING FILE MENTION A PORTAL ANYWHERE",
  // TRANSITIVELY, AND THAT CAUGHT SOMETHING THAT IS NOT AN OVERLAY AT ALL.
  // `shared/ui/components/tooltip/tooltip.tsx` wraps its pill in
  // `TooltipPrimitive.Portal` too — every floating Radix primitive does, it is
  // how any of them escapes an `overflow: hidden` ancestor — but the kit's own
  // header says why this one is not the rest of chapter 12: "THE TOOLTIP IS
  // THE EXCEPTION TO THE OVERLAY SURFACE. Every other floating thing in
  // chapter 12 is `--popover` at 24 under `--shadow-overlay`. This one is
  // `--surface-inverse` … and it carries NO shadow." A tooltip portals so an
  // icon-only button's label can clear a scroll container; it is never asked
  // "what stands behind you", because nothing does — it describes the
  // trigger, it does not present a surface a section's content could have
  // been drawn into instead. `ToolbarRow`'s own row builds a `<SortControl>`
  // (R53), the kit's own `SortControl` falls back to a `<Select>` below its
  // narrowest breakpoint, and `Select`'s Radix primitive portals its listbox
  // for the same reason a tooltip does — clearing whatever it is standing in
  // — so the old, file-wide test could not tell "this is a modal" from "this
  // floats one popup list", and `isOverlay("ToolbarRow")` came back `true`
  // and cascaded to every component that draws a toolbar.
  //
  // SO THE TEST IS NARROWED FROM "PORTALS" TO A NAMED FAMILY: does the
  // component RETURN one of the kit's actual modal-surface TAGS.
  // `Sheet`/`SheetContent` and `AlertDialog`/`AlertDialogContent` are R59's
  // own two shapes, verbatim: "A surface that COLLECTS — a form, an editor, a
  // picker — presents as the kit's `Sheet` … A surface that ASKS a yes/no
  // question about something that already exists is an `AlertDialog`,
  // centred." Bare `Dialog`/`DialogContent` is R59's third, narrower shape —
  // not a form's home any more, but still a live, if discouraged, centred
  // surface (`CENTRED_DIALOG_OK`, R59's own reasoned way out) that still
  // stands on the scrim and never on the page, so it belongs in the family
  // for the same reason `AlertDialog` does.
  //
  // POPOVER WAS TRIED AND MEASURED OUT. R59's own tooltip sentence reads, from
  // the other side, as the kit drawing one line between the tooltip and
  // everything else that floats, Popover included — and a first pass put it
  // in the family on that reading. IT REGRESSED THE LAW'S OWN EXEMPLAR: this
  // very file names `CollectionFrame` as ONE OF THE TWO SHAPES A SECTION MAY
  // STAND IN ("heading outside, content on paper … which is what
  // `CollectionFrame` draws on every collection screen in the base"), and
  // `CollectionFrame`'s own filter bar reaches for a `<Popover>` — a "more
  // filters" trigger, one control among many real, paper-standing bodies.
  // With Popover in the family, `isOverlay("CollectionFrame")` came back
  // `true`: the law's own reference shape for "correctly contained" was
  // reading as "stands on the scrim, skip it", and that false verdict
  // cascaded into `RecordTable` (which draws one) and from there into
  // `SettingsChoicesPanel` (Settings › Modules and Settings › Ticket types'
  // own vocabulary tables) — a WORSE regression than the one this amendment
  // exists to fix, because it hid the law's own worked example rather than
  // one Tooltip cascade. A `<Popover>` in this codebase is exactly the same
  // shape as `Select`/`DropdownMenu`/`ContextMenu`: a floating LIST or MENU
  // hung off an ordinary in-flow trigger, not a surface a component's whole
  // job is to present — none of its four call sites
  // (`agent-host.tsx`, `agent-panel.tsx`, `record-picker.tsx`,
  // `collection-frame.tsx`) puts a popover's content in place of a
  // component's own body. So it is deliberately OUT, on the same reasoning
  // that already keeps `Select`/`Combobox`/`DropdownMenu`/`ContextMenu` out:
  // each is a CONTROL, its trigger is what stands in the section's flow, and
  // R67's own ACT exclusion already covers a lone control.
  //
  // AND THE WALK ITSELF NARROWED FROM "ANY TAG THE TEXT MENTIONS" TO "EVERY
  // ROOT THE COMPONENT CAN RETURN" — R67's OWN "PER BRANCH" CLAUSE, ASKED OF
  // THIS QUESTION TOO. Even inside the four-name family, `isOverlay` still
  // over-excused: `ScreenRenderer` (`shared/web/screen-engine/
  // screen-renderer.tsx`) is the engine behind `contacts-by-company.tsx:164`
  // and a hundred other call sites, and ONE of its several early-return
  // branches — `recipe.type === "confirm"` — renders `<ScreenConfirm>`,
  // which is genuinely nothing but an `<AlertDialog>`. The old "any tag the
  // text mentions, transitively" scan found that one true branch and called
  // the WHOLE component an overlay, so every call site that renders an
  // ordinary list or detail screen (the overwhelming majority of them) was
  // excused too — the identical failure shape this law's own foundational
  // finding names for painting ("she was looking at the branch with nothing
  // in it"), moved from the paint question to this one. So `isOverlay` now
  // reuses `rootElements` (amendment 5's own helper, unchanged) to collect
  // every element a component can RETURN — a ternary's two arms as two roots,
  // exactly as `rootPaints` already does for painting — and requires EVERY
  // root to resolve, transitively, to the family. `ScreenConfirm` has one
  // root, `<AlertDialog>`, and passes. `ScreenRenderer` has several,
  // including a bare `<div>` and a `<ScreenLayer>`, and fails — correctly,
  // because most of what it renders is ordinary page content. A single-root
  // wrapper like `AddLinkDialog` → `FormShellDialog` → `Sheet` still resolves
  // in the same two hops it always did; a component with no returns TypeScript
  // can find (rootless, e.g. one only reachable through `React.forwardRef`)
  // resolves to `false` rather than `true`, the same under-reaching direction
  // every other clause here takes.
  const OVERLAY_SURFACE = /^(Sheet|SheetContent|Dialog|DialogContent|AlertDialog|AlertDialogContent)$/
  const overlayRootDecl = new Map<string, ts.Node>()
  for (const f of all)
    for (const st of f.tree.statements) {
      if (ts.isVariableStatement(st))
        for (const d of st.declarationList.declarations)
          if (ts.isIdentifier(d.name) && /^[A-Z]/.test(d.name.text) && !overlayRootDecl.has(d.name.text))
            overlayRootDecl.set(d.name.text, d)
      if (
        ts.isFunctionDeclaration(st) &&
        st.name &&
        /^[A-Z]/.test(st.name.text) &&
        !overlayRootDecl.has(st.name.text)
      )
        overlayRootDecl.set(st.name.text, st)
    }
  const overlayCache = new Map<string, boolean>()
  function isOverlay(name: string): boolean {
    const cached = overlayCache.get(name)
    if (cached !== undefined) return cached
    if (OVERLAY_SURFACE.test(name)) {
      overlayCache.set(name, true)
      return true
    }
    overlayCache.set(name, false) // recursion guard
    const decl = overlayRootDecl.get(name)
    if (!decl) return false
    const roots = rootElements(decl)
    const hit =
      roots.length > 0 &&
      roots.every((r) => {
        const t = tagName(r)
        return !!t && /^[A-Z]/.test(t) && isOverlay(t.split(".")[0])
      })
    overlayCache.set(name, hit)
    return hit
  }

  // THE OVERLAY FAMILY'S OWN SKIP SET, PINNED — so a WIDENING is REVIEWED,
  // never trusted. `isOverlay` decides which components excuse a body from
  // R67 by standing on the scrim rather than the page, and a skip decision is
  // exactly the kind of thing that used to be silent: the census below runs
  // `isOverlay` on whatever tag names it meets and moves on. This is the
  // house pattern `KIT_CONTAIN_CEILING` set for a NUMBER that may only fall —
  // here the reviewed unit is the set of NAMES, not a count, because a name
  // carries a reason and a count does not. Computed once, at census time (the
  // two loops below populate `overlayCache` as they run), and asserted BOTH
  // ways in the tripwire: a name `isOverlay` newly returns `true` for and
  // this table does not know about turns the build red until it is named
  // here with a real reason (a new component starting to portal a `Sheet`,
  // say); a name below that `isOverlay` no longer agrees with is stale and
  // must be deleted, the same rot-check `UNCONTAINED_SECTION_OK` already
  // uses.
  //
  // OVERLAY_FAMILY_OK moved to shared/rules/registry.ts, 14 Sep 2026 (RULES.md
  // line 13's promise made true — this table's own note the day it was
  // written said a later lane would move it here "rather than
  // half-migrating"; this is that lane). Imported above.

  /** …AND AN ACT IS NOT CONTENT EITHER. A lone `<Button>` under a heading is
   * "Show older" or "Ask us something" — the same class of thing as the create
   * button in the section's header row, which the title-block exclusion already
   * lets through. A control is pressed, not read; it is not a body of content
   * that could be said to sit on anything. Derived by resolving the tag to the
   * kit's own `Button`, so a wrapper around one counts too. */
  const actCache = new Map<string, boolean>()
  function isAct(name: string): boolean {
    if (name === "Button") return true
    const cached = actCache.get(name)
    if (cached !== undefined) return cached
    actCache.set(name, false)
    const d = declText.get(name)
    if (!d) return false
    const roots = [...d.text.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map((m) => m[1])
    const hit = roots.length > 0 && roots.every((r) => r === name || isAct(r))
    actCache.set(name, hit)
    return hit
  }

  // ── AMENDMENT 2 (2026-09-11): A COMPONENT PAINTS WHAT THE CALL SITE PICKED ─
  //
  // `componentPaints` answers off the component's TEXT, and a `cva` carries
  // every variant's classes in that text whether or not a caller reaches for
  // them. So `<CardGrid>` — whose `tone` DEFAULTS to `bare`, which paints
  // nothing at all — answered "I paint", because the same `cva` two lines down
  // declares `panel: "… bg-surface-panel …"`. The wall the client reported was
  // that exact call: a `CardGrid` with no `tone`, holding `Card variant="raised"`
  // cells, on the bare page. The law looked at it and saw soft paper that was
  // never on the screen.
  //
  // So where a component's fill comes from a `cva`, the VARIANT THE CALL SITE
  // SELECTS decides — the literal it passes, or `defaultVariants` when it passes
  // nothing. A prop that is not a literal (`variant={tone ?? "default"}`) cannot
  // be resolved here and is treated as "may paint" if ANY of that key's options
  // do, so the walk keeps under-reaching rather than inventing offenders: this
  // law's stated direction, and the reason a `cva` a component does not actually
  // call is never read at all.
  // `Cva`/`cvaOf` used to be built right here, closed over this outer `all`.
  // Both now live inside `createPaintWalk` below, parameterised the same way
  // `componentPaints` is — see that function's header.
  type Cva = { base: string; variants: Map<string, Map<string, string>>; defaults: Map<string, string> }

  /** A string prop's literal value at this call site; `ABSENT` when the prop is
   * not written at all (so `defaultVariants` decides) and `null` when it is
   * written but is not a literal (so nothing here can decide). */
  const ABSENT = Symbol("absent")
  function literalProp(node: ts.Node, name: string): string | typeof ABSENT | null {
    const a = ts.isJsxElement(node)
      ? node.openingElement.attributes
      : ts.isJsxSelfClosingElement(node)
        ? node.attributes
        : null
    if (!a) return ABSENT
    for (const p of a.properties) {
      if (ts.isJsxSpreadAttribute(p)) return null // `{...props}` could carry it
      if (!ts.isJsxAttribute(p) || p.name.getText() !== name) continue
      const init = p.initializer
      if (!init) return "true"
      if (ts.isStringLiteral(init)) return init.text
      if (ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression))
        return init.expression.text
      return null
    }
    return ABSENT
  }

  // ── AMENDMENT 5 (2026-09-11): A COMPONENT PAINTS WHAT ITS OWN ROOT PAINTS ──
  //
  // THIS IS THE UNDER-REACH THAT PUNISHES THE RIGHT FIX, and it turned red on
  // the commit that made it. `componentPaints` reads a component's own TEXT and
  // the constants its own FILE declares, and deliberately does NOT follow the
  // components it renders — "`CollectionEmptyState` renders a headline, a
  // sentence and a button, one of which resolves to a fill two files away, so
  // every uncontained zero register in the app came back green". That sentence
  // is still true and that version is still thrown away.
  //
  // BUT IT COUNTED A COMPONENT AS UNPAINTED THE MOMENT ITS BOX MOVED INTO A
  // SHARED COMPONENT. On 2026-09-11 the client ruled that a settings section's
  // title sits INSIDE its container ("ticket types should be on top of the
  // searchbar inside the container without subtitle, make this. always"), and
  // the answer to a fault said five times is a chokepoint rather than a sixth
  // repair: `shared/web/settings-section.tsx` owns the box AND draws the
  // heading, so a call site has no position left to put one in the wrong place.
  // `ThemeSection`, `ScaleSection`, `SpineSection` and `LanguageSection` each
  // stopped spelling `bg-surface-panel` in their own text the instant they
  // started standing in one — and Settings › Appearance, which had passed this
  // law since the day the law was written, reported as a bare `<div>` on the
  // page ground. A law that reddens when four screens are fixed by one
  // component is measuring the WRITING and not the SCREEN.
  //
  // SO THE WALK FOLLOWS ONE EDGE AND ONLY ONE: THE ROOT. A component paints if
  // its own classes do, if its own `cva` does — or if the single element it
  // RETURNS paints, resolved the same way, transitively. `ThemeSection` roots
  // at `<SettingsSection>` roots at `<section className="… bg-surface-panel …">`,
  // three files, one edge each.
  //
  // WHY THIS IS NOT THE VERSION THAT WAS THROWN AWAY, and it is a difference in
  // kind rather than in degree: that one followed every component a component
  // RENDERS, so a fill anywhere in the subtree answered for the whole of it.
  // This follows the one element that IS the component — the box it stands in,
  // which is the only thing a caller of it is standing in too.
  // `CollectionEmptyState` roots at `<div data-slot="collection-empty-body"
  // className="flex min-w-0 flex-col items-start gap-3 …">`, which paints
  // nothing, so it still does not paint and an uncontained zero register is
  // still a finding. That is asserted in the tripwire below rather than
  // asserted here in prose, because it is the exact regression this amendment
  // could reintroduce.
  //
  // EVERY RETURN, NOT THE LAST ONE. A component with an early `return
  // <ErrorPanel/>` has more than one root, and they are not interchangeable:
  // this file's own foundational finding is that a section can draw paper on
  // one branch and the page on another ("she was looking at the branch with
  // nothing in it"). So ALL of a component's returned elements must paint, or
  // it does not — the per-branch clause read one level down, and the same
  // under-reaching direction the rest of this file keeps.
  /** The JSX elements a component can RETURN — one per `return`, unwrapped
   * through parentheses and through a ternary's two arms, which is `bodies()`'s
   * own shape asked about roots instead of children. A fragment is not a root
   * (there is no one box to stand in) and neither is `null`. Pure — it takes a
   * declaration node and nothing else — so `createPaintWalk` below can run it
   * against any corpus, the real app or a fixture. */
  function rootElements(decl: ts.Node): ts.Node[] {
    const out: ts.Node[] = []
    let fragment = false
    const fromExpr = (e: ts.Expression) => {
      if (ts.isParenthesizedExpression(e)) return fromExpr(e.expression)
      if (ts.isConditionalExpression(e)) {
        fromExpr(e.whenTrue)
        fromExpr(e.whenFalse)
        return
      }
      if (ts.isJsxFragment(e)) {
        fragment = true
        return
      }
      if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e)) out.push(e)
    }
    const walk = (x: ts.Node) => {
      // A nested component's or a callback's own `return` is not this
      // component's root, so arrow/function bodies below the top are skipped.
      if (x !== decl && (ts.isArrowFunction(x) || ts.isFunctionExpression(x) || ts.isFunctionDeclaration(x))) return
      if (ts.isReturnStatement(x) && x.expression) fromExpr(x.expression)
      ts.forEachChild(x, walk)
    }
    // An expression-bodied arrow (`const X = () => <div/>`) returns without a
    // `return` at all.
    if (ts.isVariableDeclaration(decl) && decl.initializer) {
      const init = decl.initializer
      if ((ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && !ts.isBlock(init.body)) fromExpr(init.body)
      else ts.forEachChild(decl, walk)
    } else ts.forEachChild(decl, walk)
    return fragment ? [] : out
  }

  // ── FIXED 2026-09-14 — THE TRIPWIRE NOW OWNS ITS SPECIMEN, NOT THE APP'S ───
  //
  // `componentPaints`, `cvaOf`, `rootDecl`, `rootPaints` and `paints` used to
  // be five closures built ONCE, directly over `all` (the whole app + kit).
  // That was fine for the real census below, but it meant amendment 5's own
  // blindness tripwire — "at least one component must be found to paint
  // through its own ROOT" — could only be proved by pointing at a component
  // ALREADY IN THE APP that has that shape (`ThemeSection` etc., rooted in
  // `SettingsSection`). On 2026-09-14 a lane doing exactly what the client
  // ordered — "one container, four sections" — folded `LanguageSection`'s own
  // wrapper into `SettingsSection` too, and in doing so removed the LAST such
  // component from the product. The census is unchanged and still correct;
  // the tripwire went red because its only specimen retired.
  //
  // A TRIPWIRE PROVING "the walk still resolves a root-painted component"
  // SHOULD NOT DEPEND ON THE APP HAPPENING TO CONTAIN ONE — that is true for
  // the same reason the rest of this file gives for deriving its subject
  // instead of hand-picking it: it fails when the product legitimately
  // changes, and worse, it can pass for the wrong reason if some unrelated
  // screen happens to grow the shape back. So the five closures above are now
  // ONE function, `createPaintWalk`, parameterised by a file list rather than
  // closed over `all`. The real census still calls it exactly once, on `all`,
  // below. The tripwire calls it a SECOND time, on three tiny fixture
  // "files" this test builds and owns — never read off disk, never merged
  // into `all`, so they cannot affect, and cannot be affected by, anything
  // the app actually contains.
  function createPaintWalk(files: Parsed[]) {
    const declText = new Map<string, { text: string; rel: string }>()
    const fileTop = new Map<string, Map<string, string>>()

    // ── AMENDMENT 8 (2026-09-14) — AN IMPORT ALIAS RESOLVES ONE HOP ──────────
    // See this file's header for the full account (the lane that hit this,
    // and why). `shared/web/screen-engine/collection-frame.tsx` does
    // `import { CollectionFrame as KitCollectionFrame } from
    // "@shared/ui/components/collection-frame/collection-frame"` and renders
    // `<KitCollectionFrame>`. Every lookup below (`declText`, `rootDecl`) is
    // keyed by a tag's OWN spelling, and an import binding declares no
    // `VariableStatement`/`FunctionDeclaration` of its own — so a tag written
    // under its imported name resolved to nothing, and "nothing" read as
    // "paints nothing," not as "unresolved." `byPath`/`byRel` index this
    // WALK'S OWN file list (the kit's, the app's, or — for the tripwire below
    // — a fixture's), never the whole repo, so a fixture that imports nothing
    // real simply finds no target and is unaffected.
    const byPath = new Map<string, Parsed>()
    const byRel = new Map<string, Parsed>()
    for (const f of files) {
      byPath.set(f.path, f)
      byRel.set(f.rel, f)
    }
    type ImportBinding = { imported: string; specifier: string; fromRel: string }
    const importAlias = new Map<string, ImportBinding>()

    /** A module specifier, resolved ONE HOP off the file that wrote it — the
     * three shapes this repo's tsconfigs actually declare (CLAUDE.md's own
     * "paths" excerpt): `@shared/*` is always `shared/*` off the repo root;
     * `@/*` is the IMPORTING file's own front door (`web/` or `web-portal/`
     * — `shared/web/` files don't use it, so there is no third door to
     * thread through); a bare `.`/`..` is relative to the importing file's
     * own directory. Anything else (a bare package name) resolves to nothing
     * — under-reaching, this walk's own direction throughout. */
    function resolveSpecifier(fromRel: string, specifier: string): Parsed | undefined {
      const fromFile = byRel.get(fromRel)
      if (!fromFile) return undefined
      let base: string | null = null
      if (specifier.startsWith("@shared/")) base = join(ROOT, "shared", specifier.slice("@shared/".length))
      else if (specifier.startsWith("@/")) {
        const doorRoot = fromRel.startsWith("web-portal/")
          ? join(ROOT, "web-portal")
          : fromRel.startsWith("web/")
            ? join(ROOT, "web")
            : null
        if (doorRoot) base = join(doorRoot, specifier.slice(2))
      } else if (specifier.startsWith(".")) {
        base = join(dirname(fromFile.path), specifier)
      }
      if (!base) return undefined
      return byPath.get(`${base}.tsx`) ?? byPath.get(join(base, "index.tsx"))
    }

    /** A DEFAULT import resolves to the module's default export — the one
     * name a `default` binding can mean, read off the target file's own
     * `export default`. */
    function defaultExportName(file: Parsed): string | undefined {
      for (const st of file.tree.statements) {
        if (ts.isExportAssignment(st) && !st.isExportEquals && ts.isIdentifier(st.expression))
          return st.expression.text
        if (
          ts.isFunctionDeclaration(st) &&
          st.name &&
          ts.canHaveModifiers(st) &&
          ts.getModifiers(st)?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
        )
          return st.name.text
      }
      return undefined
    }

    // Every file's OWN import bindings, kept precisely per file (never
    // collapsed "first wins" the way `importAlias` below is) — `componentPaints`
    // needs to ask "does THIS SPECIFIC FILE import a name its OWN text
    // references", and two files importing two different things under the
    // same local name must not shadow one another.
    const importsByFile = new Map<string, Map<string, ImportBinding>>()
    for (const f of files) {
      const tops = new Map<string, string>()
      const imports = new Map<string, ImportBinding>()
      for (const st of f.tree.statements) {
        if (ts.isVariableStatement(st))
          for (const d of st.declarationList.declarations)
            if (ts.isIdentifier(d.name)) tops.set(d.name.text, d.getText())
        if (ts.isFunctionDeclaration(st) && st.name) tops.set(st.name.text, st.getText())
        if (ts.isImportDeclaration(st) && st.importClause && ts.isStringLiteral(st.moduleSpecifier)) {
          const specifier = st.moduleSpecifier.text
          const clause = st.importClause
          if (clause.name) {
            const binding = { imported: "default", specifier, fromRel: f.rel }
            imports.set(clause.name.text, binding)
            if (!importAlias.has(clause.name.text)) importAlias.set(clause.name.text, binding)
          }
          if (clause.namedBindings && ts.isNamedImports(clause.namedBindings))
            for (const el of clause.namedBindings.elements) {
              const imported = (el.propertyName ?? el.name).text
              const binding = { imported, specifier, fromRel: f.rel }
              imports.set(el.name.text, binding)
              if (!importAlias.has(el.name.text)) importAlias.set(el.name.text, binding)
            }
        }
      }
      fileTop.set(f.rel, tops)
      importsByFile.set(f.rel, imports)
      for (const [name, text] of tops)
        if (/^[A-Z]/.test(name) && !declText.has(name)) declText.set(name, { text, rel: f.rel })
    }

    // ONE HOP, resolved through the same file list — a REAL local declaration
    // always wins (an alias only fills the gap a bare import binding leaves).
    for (const [aliasName, info] of importAlias) {
      if (!/^[A-Z]/.test(aliasName) || declText.has(aliasName)) continue
      const targetFile = resolveSpecifier(info.fromRel, info.specifier)
      if (!targetFile) continue
      const targetTops = fileTop.get(targetFile.rel)
      if (!targetTops) continue
      const targetName = info.imported === "default" ? defaultExportName(targetFile) : info.imported
      if (!targetName) continue
      const text = targetTops.get(targetName)
      if (text !== undefined) declText.set(aliasName, { text, rel: targetFile.rel })
    }

    // `rootDecl` gets the SAME one-hop alias resolution, over real ts.Node
    // declarations rather than text — `rootPaints`/`rootElements` need the
    // node, not a string, to find what a component RETURNS.
    const rootDecl = new Map<string, ts.Node>()
    const fileTopNode = new Map<string, Map<string, ts.Node>>()
    for (const f of files) {
      const tops = new Map<string, ts.Node>()
      for (const st of f.tree.statements) {
        if (ts.isVariableStatement(st))
          for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) tops.set(d.name.text, d)
        if (ts.isFunctionDeclaration(st) && st.name) tops.set(st.name.text, st)
      }
      fileTopNode.set(f.rel, tops)
      for (const [name, node] of tops)
        if (/^[A-Z]/.test(name) && !rootDecl.has(name)) rootDecl.set(name, node)
    }
    for (const [aliasName, info] of importAlias) {
      if (!/^[A-Z]/.test(aliasName) || rootDecl.has(aliasName)) continue
      const targetFile = resolveSpecifier(info.fromRel, info.specifier)
      if (!targetFile) continue
      const targetTops = fileTopNode.get(targetFile.rel)
      if (!targetTops) continue
      const targetName = info.imported === "default" ? defaultExportName(targetFile) : info.imported
      if (!targetName) continue
      const node = targetTops.get(targetName)
      if (node) rootDecl.set(aliasName, node)
    }

    // ── AMENDMENT 8's SECOND FIX — A PASS MEANS THE REAL ROOT, NOT A
    //    COINCIDENTAL BRANCH ─────────────────────────────────────────────────
    // The OLD `componentPaints` text-scanned a component's WHOLE function —
    // every early return, every unrelated branch, all one string — so
    // `settings-choices-panel.tsx`'s `SettingsChoicesPanel` passed because its
    // OWN `NoAccess` branch (`modulesWithChoices.length === 0`) spells
    // `bg-surface-panel`, a coincidence that has nothing to do with whether
    // the table it actually renders (`RecordTable useKitPanel`, its REAL,
    // final return) stands on paper. See this file's header for the full
    // account and the module-automations.tsx comment that named both blind
    // spots.
    //
    // TRIED FIRST AND MEASURED OUT: making the walk require EVERY root to
    // independently paint (mirroring `rootPaints`'s own "every branch"
    // philosophy, applied to the text question too). It broke the census far
    // wider than it fixed: `panelCensus.boxed` — how many `<TabsView
    // renderPanel>` mounts an ANCESTOR already paints — fell from the
    // low double digits to ZERO, because `componentPaints` is what most of
    // those ancestor chains actually resolve THROUGH (a `<Card>`, a record
    // screen's own chrome), and plenty of them carry a harmless early return
    // (a loading guard, a `return null`) beside their real, painted body.
    // Requiring every one of those unrelated branches to ALSO paint is a
    // different, much stricter law than R67 asks for here — it is the same
    // over-reach this file's own header warns against for the naive "every
    // screen's root is a panel" version. So the fix is narrower: EXCLUDE the
    // coincidental branches from the text instead of requiring all of them
    // to independently pass.
    //
    // A "main return" is READ OFF THE SOURCE, not assumed: the component's
    // own function BODY (unwrapped one hop through a wrapping call like
    // `React.forwardRef`/`React.memo`, since the kit's own components are
    // written that way) is walked statement by statement, and any `if (cond)
    // return …` — no `else`, not the LAST statement — is a GUARD, not
    // content: `NoAccess`, an error state, a loading `Skeleton`, each read
    // and discarded before the table `settings-choices-panel.tsx` actually
    // renders is reached. Their text is cut from what gets scanned; the
    // component's own SAME-FILE module-scope constants are still hop-
    // expanded exactly as before, over what remains. A declaration this
    // cannot make sense of as a function (a plain constant, a
    // `React.createContext(...)`, anything a hop TARGET turns out to be
    // rather than a component asked about directly) falls back to its own
    // whole text, unchanged — the case this mechanism has always covered.
    function mainBody(node: ts.Node): ts.Node | undefined {
      if (ts.isFunctionDeclaration(node)) return node.body
      if (ts.isVariableDeclaration(node) && node.initializer) {
        let init: ts.Expression = node.initializer
        if (ts.isCallExpression(init) && init.arguments.length > 0) {
          const last = init.arguments[init.arguments.length - 1]
          if (last && (ts.isArrowFunction(last) || ts.isFunctionExpression(last))) init = last
        }
        if ((ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && ts.isBlock(init.body)) return init.body
      }
      return undefined
    }
    function isGuardReturn(st: ts.Statement): boolean {
      if (!ts.isIfStatement(st) || st.elseStatement) return false
      const then = st.thenStatement
      if (ts.isReturnStatement(then)) return true
      return ts.isBlock(then) && then.statements.length > 0 && then.statements.every((s) => ts.isReturnStatement(s))
    }
    function mainText(node: ts.Node): string {
      const body = mainBody(node)
      if (!body || !ts.isBlock(body)) return node.getText()
      const stmts = body.statements
      const keep: string[] = []
      for (let i = 0; i < stmts.length; i++) {
        if (i < stmts.length - 1 && isGuardReturn(stmts[i])) continue
        keep.push(stmts[i].getText())
      }
      return keep.join("\n")
    }
    // AND ONE MORE HOP THIS WALK NOW MAKES: THROUGH AN IMPORT ITS OWN FILE
    // WRITES, never a chain across a SECOND file. `module-automations.tsx`'s
    // `ModuleAutomations` returns a Fragment (`<>…</>`) holding `<RecordTable
    // useKitPanel>` and its own edit sheet — a shape `rootElements` reads as
    // "no single box to stand in" and hands back ZERO roots (its own header,
    // a few lines up) — so `rootPaints` can never resolve it, alias fix or
    // not, and the WHOLE question rests on `componentPaints`. Its own TEXT
    // names `RecordTable`, but `RecordTable` is not declared in THIS file —
    // it is imported, so the SAME-FILE hop above (`tops`, which only ever
    // held real `VariableStatement`/`FunctionDeclaration`s) could not reach
    // it, alias fix or not. So the hop grows one more source: THIS component's
    // own FILE's import bindings (`importsByFile`, built beside `fileTop`
    // above) — a name this text references that the file imports (aliased,
    // per fix #1, or plain) resolves through `declText`, exactly as a same-
    // file constant does, and its text joins the scan. `settings-choices-
    // panel.tsx`'s `SettingsChoicesPanel` needs the identical reach for a
    // different structural reason: its real content sits inside
    // `<CollectionCreateActionProvider>`, which forwards `{children}` (the
    // same shape amendment 7 already named for `bodies()`, here blocking
    // `rootElements` instead) — but a component's own `getText()` still
    // contains whatever JSX it wraps as literal source, so `RecordTable`
    // is right there in the text to hop through once imports are a source.
    // NEVER RECURSIVE ACROSS A SECOND FILE: only THIS file's own bindings are
    // consulted, each hop, so a fixture file with no import statements at all
    // (amendment 5's own `root-walk-fixture-*.tsx`, which name each other with
    // no `import` line between them) has nothing here to hop through —
    // `componentPaints("FixtureRootedMiddle")` still cannot see
    // `FixturePaintedLeaf`'s fill this way, and only `rootPaints` resolves it,
    // exactly as that tripwire requires.
    const paintCache = new Map<string, boolean>()
    function componentPaints(name: string): boolean {
      const cached = paintCache.get(name)
      if (cached !== undefined) return cached
      paintCache.set(name, false) // recursion guard
      const d = declText.get(name)
      if (!d) return false
      const decl = rootDecl.get(name)
      const tops = fileTop.get(d.rel) ?? new Map<string, string>()
      const imports = importsByFile.get(d.rel) ?? new Map<string, ImportBinding>()
      let text = decl ? mainText(decl) : d.text
      const seen = new Set([name])
      for (let hop = 0; hop < 8; hop++) {
        let grew = false
        for (const [k, v] of tops) {
          if (seen.has(k)) continue
          if (new RegExp(`\\b${k}\\b`).test(text)) {
            seen.add(k)
            text += `\n${v}`
            grew = true
          }
        }
        for (const [localName] of imports) {
          if (seen.has(localName)) continue
          if (!new RegExp(`\\b${localName}\\b`).test(text)) continue
          seen.add(localName)
          const target = declText.get(localName)
          if (target) {
            text += `\n${target.text}`
            grew = true
          }
        }
        if (!grew) break
      }
      const hit = FILL.test(text)
      paintCache.set(name, hit)
      return hit
    }

    // A COMPONENT PAINTS WHAT THE CALL SITE PICKED (amendment 2): where the
    // fill comes from a `cva`, the variant the call site selects decides.
    const cvaCache = new Map<string, Cva | null>()
    function cvaOf(name: string): Cva | null {
      if (cvaCache.has(name)) return cvaCache.get(name)!
      cvaCache.set(name, null)
      const d = declText.get(name)
      if (!d) return null
      const file = files.find((f) => f.rel === d.rel)
      if (!file) return null
      let found: Cva | null = null
      const strings = (n: ts.Node): string => {
        let s = ""
        const collect = (x: ts.Node) => {
          if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) s += ` ${x.text}`
          ts.forEachChild(x, collect)
        }
        collect(n)
        return s
      }
      const visit = (n: ts.Node) => {
        if (found) return
        if (
          ts.isVariableDeclaration(n) &&
          ts.isIdentifier(n.name) &&
          n.initializer &&
          ts.isCallExpression(n.initializer) &&
          n.initializer.expression.getText() === "cva" &&
          // ONLY THE `cva` THIS COMPONENT ACTUALLY CALLS. A file may declare
          // several (card.tsx has one per part); reading a sibling's would
          // answer about a box this element is not.
          new RegExp(`\\b${n.name.text}\\s*\\(`).test(d.text)
        ) {
          const args = n.initializer.arguments
          const variants = new Map<string, Map<string, string>>()
          const defaults = new Map<string, string>()
          if (args[1] && ts.isObjectLiteralExpression(args[1]))
            for (const p of args[1].properties) {
              if (!ts.isPropertyAssignment(p)) continue
              const key = p.name.getText().replace(/['"]/g, "")
              if (key === "variants" && ts.isObjectLiteralExpression(p.initializer))
                for (const vp of p.initializer.properties) {
                  if (!ts.isPropertyAssignment(vp) || !ts.isObjectLiteralExpression(vp.initializer)) continue
                  const opts = new Map<string, string>()
                  for (const op of vp.initializer.properties)
                    if (ts.isPropertyAssignment(op))
                      opts.set(op.name.getText().replace(/['"]/g, ""), strings(op.initializer))
                  variants.set(vp.name.getText().replace(/['"]/g, ""), opts)
                }
              if (key === "defaultVariants" && ts.isObjectLiteralExpression(p.initializer))
                for (const dp of p.initializer.properties)
                  if (ts.isPropertyAssignment(dp))
                    defaults.set(
                      dp.name.getText().replace(/['"]/g, ""),
                      dp.initializer.getText().replace(/['"]/g, "")
                    )
            }
          found = { base: args[0] ? strings(args[0]) : "", variants, defaults }
          return
        }
        ts.forEachChild(n, visit)
      }
      visit(file.tree)
      cvaCache.set(name, found)
      return found
    }

    // `rootDecl` (with its own one-hop alias resolution) was built above,
    // beside `declText`/`fileTop` — see AMENDMENT 8's own header there for why
    // the census of top-level declarations now happens in one place instead
    // of two nearly-identical loops.
    //
    // AMENDMENT 5 ITSELF: a component paints if its own classes do, if its
    // own `cva` does, or if the single element it RETURNS paints, resolved
    // the same way, transitively — ONE edge, the component's own root.
    let rootsFollowed = 0
    const rootCache = new Map<string, boolean>()
    function rootPaints(name: string): boolean {
      const cached = rootCache.get(name)
      if (cached !== undefined) return cached
      rootCache.set(name, false) // recursion guard
      const decl = rootDecl.get(name)
      if (!decl) return false
      const roots = rootElements(decl)
      if (roots.length === 0) return false
      const hit = roots.every((r) => paints(r))
      if (hit) rootsFollowed++
      rootCache.set(name, hit)
      return hit
    }

    const paints = (n: ts.Node): boolean => {
      if (FILL.test(classNameOf(n))) return true
      const t = tagName(n)
      if (!t || !/^[A-Z]/.test(t)) return false
      const name = t.split(".")[0]
      const cva = cvaOf(name)
      // No `cva` to read — the component's own classes, and then its own ROOT
      // (amendment 5), are the whole answer.
      if (!cva) return componentPaints(name) || rootPaints(name)
      if (FILL.test(cva.base)) return true
      for (const [key, opts] of cva.variants) {
        const passed = literalProp(n, key)
        if (passed === null) {
          if ([...opts.values()].some((v) => FILL.test(v))) return true
          continue
        }
        const chosen = passed === ABSENT ? cva.defaults.get(key) : passed
        if (chosen !== undefined && opts.has(chosen) && FILL.test(opts.get(chosen)!)) return true
      }
      return false
    }

    return { paints, rootPaints, rootsFollowed: () => rootsFollowed }
  }

  const mainWalk = createPaintWalk(all)
  const { paints, rootPaints } = mainWalk

  // ── THE TRIPWIRE'S OWN FIXTURE — three tiny synthetic "files", parsed the
  // same way `parse()` parses a real one but never touched to disk and never
  // added to `all`. They mirror the real, three-file chain the comment above
  // names (`ThemeSection` → `SettingsSection` → a `<section>` with an inline
  // fill), with the same shape and the same reason each level exists:
  //
  //   · `FixturePaintedLeaf` paints DIRECTLY — its own JSX carries a fill
  //     class — so it is found by `componentPaints` alone, the base case,
  //     never touching `rootPaints`. Stands in for `SettingsSection`.
  //   · `FixtureRootedMiddle`'s own text has no fill anywhere in it — it only
  //     names `FixturePaintedLeaf` — so `componentPaints` alone reports it as
  //     NOT painting, and only the root walk (amendment 5) can find that its
  //     one RETURN is the leaf. Stands in for `ThemeSection`.
  //   · `FixtureBareHost` is the call site: it returns `<FixtureRootedMiddle
  //     />`, the same shape the real census meets when it walks a section's
  //     body and finds `<ThemeSection />` sitting in it. Asserting through
  //     `rootPaints` on THIS name is what actually exercises the fallback
  //     inside `paints` (`componentPaints(name) || rootPaints(name)`) for
  //     the middle component too, not just the standalone `rootPaints`
  //     function — the exact wiring a regression here would break.
  //
  // Two files matter for keeping this honest: `FixturePaintedLeaf` and
  // `FixtureRootedMiddle` are declared in SEPARATE fixture files on purpose.
  // `componentPaints`'s hop-expansion only reads a component's OWN FILE's
  // top-level constants — if both lived in one file, `FixtureRootedMiddle`'s
  // text would hop-expand into `FixturePaintedLeaf`'s and report as painting
  // WITHOUT any root-walk at all, which would prove nothing (and is exactly
  // why the real `ThemeSection`/`SettingsSection` pair being in different
  // files is load-bearing, not incidental).
  function parseFixture(rel: string, source: string): Parsed {
    const path = join(HERE, "__fixtures__", rel)
    return { rel, path, tree: ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX) }
  }
  const rootWalkFixture = [
    parseFixture(
      "root-walk-fixture-leaf.tsx",
      `export function FixturePaintedLeaf() {
         return <div className="p-4 bg-surface-panel">leaf</div>
       }`
    ),
    parseFixture(
      "root-walk-fixture-middle.tsx",
      `export function FixtureRootedMiddle() {
         return <FixturePaintedLeaf />
       }`
    ),
    parseFixture(
      "root-walk-fixture-host.tsx",
      `export function FixtureBareHost() {
         return <FixtureRootedMiddle />
       }`
    ),
  ]

  // ── AMENDMENT 7's OWN FIXTURE — SAME REASON AS THE ONE ABOVE: A TRIPWIRE
  //    PROVING `bodies()` STILL SEES A BARE IDENTIFIER SHOULD NOT DEPEND ON
  //    THE APP HAPPENING TO CONTAIN ONE. `settings-section.tsx`'s own
  //    `<section>{children}</section>` never reaches `bodies()` at all — its
  //    `<section>` paints itself directly, so shape (a) resolves it before
  //    `bodies()` is called — which is correct today and would say nothing
  //    about whether the counter still fires the day a NEW chokepoint forwards
  //    `{children}` without painting itself. Mirrors the real shape closely
  //    enough to mean something (a `<section>` with no fill, whose only child
  //    is a bare identifier) while owning its own file, so nothing the app
  //    does can empty it out or fill it in by accident. */
  const bareIdentifierFixture = parseFixture(
    "bare-identifier-fixture.tsx",
    `function FixtureChildrenPassthrough({ children }) {
       return <section className="flex flex-col gap-2">{children}</section>
     }`
  )
  function firstSection(f: Parsed): ts.JsxElement {
    let found: ts.JsxElement | undefined
    const walk = (n: ts.Node) => {
      if (!found && ts.isJsxElement(n) && tagName(n) === "section") found = n
      ts.forEachChild(n, walk)
    }
    walk(f.tree)
    if (!found) throw new Error(`fixture ${f.rel} has no <section> — the fixture itself is broken`)
    return found
  }
  const subtreePaints = (n: ts.Node): boolean => {
    let hit = false
    const walk = (x: ts.Node) => {
      if (hit) return
      if ((ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x)) && paints(x)) {
        hit = true
        return
      }
      ts.forEachChild(x, walk)
    }
    walk(n)
    return hit
  }
  const carriesHeading = (n: ts.Node): boolean => {
    let hit = false
    const walk = (x: ts.Node) => {
      const t = tagName(x)
      if (t && HEADING.test(t)) hit = true
      ts.forEachChild(x, walk)
    }
    walk(n)
    return hit
  }

  // ── AMENDMENT 7 (2026-09-14) — A BARE IDENTIFIER IS AN UNRESOLVED BODY, NOT
  //    A ZERO ONE ────────────────────────────────────────────────────────────
  //
  // `bodies()` RESOLVES A TERNARY, A `&&`, A `.map()` AND A JSX LITERAL — every
  // shape a section's content actually takes IN THE FILE THAT WRITES IT. A
  // CHOKEPOINT COMPONENT writes a different shape: `shared/web/
  // settings-section.tsx` draws `<section …>{children}</section>`, and
  // `{children}` is a bare `Identifier` expression, which `fromExpr` above
  // does not match at all — not a ternary, not a JSX literal, not a call. The
  // old behaviour was silence: the expression matched no branch, nothing was
  // pushed, and `bodies()` returned however many OTHER bodies the section
  // wrote (zero, for a chokepoint whose whole job is to forward its caller's
  // content) — a section that hands its census-eligible content to its CALLER
  // reported as a section with NOTHING to judge, which is not the same claim
  // as "everything it draws is on paper." Nothing about that empty array said
  // it was empty because the walk gave up rather than because the section is
  // simple.
  //
  // TWO WAYS OUT, and this file takes the CHEAPER one on purpose. Resolving
  // `{children}` for real means following it one hop to every CALL SITE of the
  // component that declares it — `SettingsSection`'s own children are written
  // at `ThemeSection`, `ScaleSection`, `SpineSection` and every module
  // settings page, each a different file — and then asking whether every one
  // of THOSE bodies stands on paper, which is a second census nested inside
  // this one. It is not built here, and the reason is measured rather than
  // assumed: `SettingsSection`'s own `<section>` carries `bg-surface-panel` on
  // itself (this file's own `settings-section.tsx`), so shape (a) — "the
  // section IS the box" — already resolves it correctly, TODAY, without ever
  // calling `bodies()` on it: the ancestor walk in the two census loops below
  // checks `paints(node)` before `bodies()` is reached at all, and a painted
  // node short-circuits there. So the live risk is not this exact file, it is
  // the NEXT chokepoint that forwards `{children}`/`{body}`/`{content}`
  // without painting itself — the day one exists, its bodies must not read as
  // zero. So a bare identifier expression is not dropped, it is COUNTED, the
  // same move amendment 4 makes for `headless`/`proseBare`: a number this
  // file owns and the tripwire below pins, so a widening of this blind spot
  // (a new component reading `{children}` on a `<section>` that is NOT
  // already boxed) is a reviewed change to the pin rather than a silent
  // return to "zero bodies means clean."
  //
  /** THE BODIES A SECTION ACTUALLY DRAWS — one per BRANCH, which is the clause
   * with the teeth. A ternary's two arms, a `&&`'s right-hand side and a
   * `.map()`'s row are each their own body, so a section cannot pass on the
   * strength of the one branch that happens to have a panel in it. */
  const amendment7 = { unresolvedIdentifiers: 0 }
  function bodies(node: ts.JsxElement | ts.ArrowFunction | ts.FunctionExpression): ts.Node[] {
    const out: ts.Node[] = []
    const fromChild = (n: ts.Node) => {
      if (ts.isJsxText(n)) return
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
        out.push(n)
        return
      }
      if (ts.isJsxFragment(n)) {
        for (const c of n.children) fromChild(c)
        return
      }
      if (ts.isJsxExpression(n) && n.expression) fromExpr(n.expression)
    }
    const fromExpr = (e: ts.Expression) => {
      if (ts.isParenthesizedExpression(e)) return fromExpr(e.expression)
      if (ts.isConditionalExpression(e)) {
        fromExpr(e.whenTrue)
        fromExpr(e.whenFalse)
        return
      }
      // `&&`'s LEFT is a GUARD, never content — `scoping && <GoogleScopeDialog/>`
      // asks "is scoping truthy", it does not offer `scoping` itself as
      // something that could stand on the page. AMENDMENT 7 is what surfaced
      // this: before it, a bare identifier on either side was silently
      // dropped either way, so walking into `&&`'s left cost nothing and hid
      // a category error in this walk. Once a bare identifier is COUNTED
      // rather than dropped, that same walk turned two ordinary guards
      // (`scoping && <GoogleScopeDialog/>`, `sharing && <GoogleSourceDialog/>`
      // in `google-connections.tsx`) into false "unresolved body" counts —
      // `scoping`/`sharing` are booleans standing in a CONDITION position, not
      // a body this walk failed to see into. `||` and `??` keep both sides:
      // `data.icon || <DefaultIcon/>` really does offer two candidate bodies,
      // either of which could be what renders.
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        fromExpr(e.right)
        return
      }
      if (
        ts.isBinaryExpression(e) &&
        [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(e.operatorToken.kind)
      ) {
        fromExpr(e.left)
        fromExpr(e.right)
        return
      }
      if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e)) {
        out.push(e)
        return
      }
      if (ts.isJsxFragment(e)) {
        for (const c of e.children) fromChild(c)
        return
      }
      if (ts.isCallExpression(e)) {
        for (const a of e.arguments) {
          if (!ts.isArrowFunction(a) && !ts.isFunctionExpression(a)) continue
          const b = a.body
          if (ts.isBlock(b)) {
            const walk = (x: ts.Node) => {
              if (ts.isReturnStatement(x) && x.expression) fromExpr(x.expression)
              ts.forEachChild(x, walk)
            }
            walk(b)
          } else fromExpr(b)
        }
        return
      }
      // AMENDMENT 7 — a bare identifier (`{children}`, `{body}`, `{content}`)
      // is a body this walk cannot see into, not an absent one. Counted
      // rather than pushed: an untagged node would report as a literal
      // `<null>` finding, which is not what it is — it is unmeasured, and the
      // tripwire below is where that gets a reviewed number instead of a
      // silent zero.
      if (ts.isIdentifier(e)) {
        amendment7.unresolvedIdentifiers++
        return
      }
    }
    // A RENDER PROP's bodies are every expression it can RETURN — the same
    // per-branch question asked of a different shape of source. A nested
    // callback's block-bodied `return` is picked up too, which is the `.map()`
    // row clause read from the other end.
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      if (ts.isBlock(node.body)) {
        const walk = (x: ts.Node) => {
          if (ts.isReturnStatement(x) && x.expression) fromExpr(x.expression)
          ts.forEachChild(x, walk)
        }
        walk(node.body)
      } else fromExpr(node.body)
    } else for (const c of node.children) fromChild(c)
    return out
  }

  /** A STROKE OR A HEX ON A SECTION — THE HALF OF R67 THAT SURVIVED L43.
   *
   * Aurora took the boxes off on 21 Sep 2026 ("go an implement this appwide"),
   * so "this body is on the bare page ground" stopped being an offence and
   * became the DEFAULT. What did not change is the other half of this law's
   * own sentence, which until today had no census of its own because the fill
   * was always there to do the separating: BUILD-A-SCREEN.md §6.1, "no CSS
   * border, ever" - separation is a fill or an inset shadow, never a stroke -
   * and R32's closed palette, never a hex literal. On a section that has given
   * up its fill, a stroke is the thing somebody reaches for next, and it is
   * the one move that would undo the whole pass.
   *
   * SCOPED TO THE SECTION'S OWN BOX AND ITS OWN BODIES, never the subtree: a
   * field, a table cell or a kit control deeper inside carries its own edges
   * and is not what this law is about. `border-none`/`border-0` are removals,
   * not strokes. */
  const STROKE = /(^|[\s:[])(border(?!-(?:none|0)\b)(?:-[a-z]+)?|outline(?:-[a-z]+)?)(\b|$)/
  const HEX = /#[0-9a-fA-F]{3,8}\b/
  function strokeOrHex(node: ts.Node): string | null {
    const cls = classNameOf(node)
    if (HEX.test(cls)) return "a hex literal"
    if (STROKE.test(cls)) return "a stroke"
    return null
  }

  type Finding = { where: string; bare: string[]; stroked: string[] }
  const titled: Finding[] = []
  const panelCensus = { hosts: 0, boxed: 0 }
  /** AMENDMENT 4's OWN COUNTERS, so its two halves can be proved to measure
   * something rather than trusted to. `headless` is how many `<section>`s the
   * dropped heading requirement admitted — zero means the widening is a no-op
   * and the two sections the client's ruling un-titled are back outside the law
   * without anybody noticing. `proseBare` is how many bare bodies are the
   * SENTENCE she pointed at rather than a widget — zero means the narrowed
   * exemption is catching nothing and the law has quietly reverted to what it
   * said before she overruled it. Both are asserted in the tripwire below. */
  const amendment4 = { headless: 0, proseBare: 0 }
  const READABLE_PROSE = /^(p|span|small|em|strong)$/

  for (const f of app) {
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) && tagName(node) === "section") {
        if (!carriesHeading(node)) amendment4.headless++
        const where = `${f.rel}:${f.tree.getLineAndCharacterOfPosition(node.getStart()).line + 1}`
        // (a) the team-panel shape — the section IS the box, or stands in one.
        let boxed = false
        for (let p: ts.Node | undefined = node; p && !boxed; p = p.parent)
          if ((ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) && paints(p)) boxed = true
        // (b) the CollectionFrame shape — heading outside, every body on paper.
        // KEPT, AND NO LONGER THE OFFENCE (L43, 21 Sep 2026): `bare` is still
        // computed, still counted and still read by this file's own blindness
        // tripwire, because the census having gone blind and the app having
        // gone plain look identical from the outside and only this number
        // tells them apart. What it no longer does is fail the build.
        const bare: string[] = []
        const stroked: string[] = []
        const sectionMark = strokeOrHex(node)
        if (sectionMark)
          stroked.push(
            `<section> at line ${f.tree.getLineAndCharacterOfPosition(node.getStart()).line + 1} carries ${sectionMark}`
          )
        // ONE `bodies()` CALL, EXACTLY WHERE IT ALWAYS WAS. That function is
        // not pure: amendment 7's own `unresolvedIdentifiers` counter ticks
        // inside it, and this file's tripwire pins that number. A second walk
        // for the stroke question would have tripled it against an app that
        // had not changed — so the stroke scan rides the SAME loop, under the
        // SAME `!boxed` guard, rather than beside it. A boxed section is still
        // asked about its own box above; its bodies stand on real paper, which
        // is the shape this law never had a complaint about, and a stroke
        // reached for to get an edge back is by definition a thing that
        // happens where the fill has gone.
        if (!boxed)
          for (const b of bodies(node)) {
            const line = f.tree.getLineAndCharacterOfPosition(b.getStart()).line + 1
            const mark = strokeOrHex(b)
            if (mark) stroked.push(`<${tagName(b)}> at line ${line} carries ${mark}`)
            const t = tagName(b)
            if (carriesHeading(b)) continue
            if (t && PROSE.test(t)) continue
            if (t && /^[A-Z]/.test(t) && isOverlay(t.split(".")[0])) continue
            if (t && /^[A-Z]/.test(t) && isAct(t.split(".")[0])) continue
            if (/(^|\s)(hidden|sr-only)(\s|$)/.test(classNameOf(b))) continue
            if (subtreePaints(b)) continue
            if (t && READABLE_PROSE.test(t)) amendment4.proseBare++
            bare.push(`<${t}> at line ${line}`)
          }
        titled.push({ where, bare, stroked })
      }
      ts.forEachChild(node, visit)
    }
    visit(f.tree)
  }

  // ── AMENDMENT 3 (2026-09-11): A TAB PANEL IS A TITLED SECTION ─────────────
  //
  // THE CLIENT, A THIRD TIME, 2026-09-10: "remember in settings modules card,
  // needs container background." Settings › Modules — a wall of cards on the
  // bare page. The law above was already written, already enforced, already
  // green, and could not see it.
  //
  // IT COULD NOT SEE IT BY CONSTRUCTION, not by accident. The subject above is
  // a `<section>` CARRYING A HEADING OF ITS OWN, and a tab panel has no heading
  // of its own — it is titled by the strip above it, which is the whole point of
  // a tab strip. So every settings tab, and every record detail's sub-tab, was
  // outside the law's subject the day the law was written: 14 `renderPanel`
  // hosts and 70 bodies that no clause here could reach. Two of the client's
  // three rulings were about a settings TAB. A law that answers her second
  // sentence and cannot see the screen of her third is not a law that got
  // unlucky.
  //
  // THE SUBJECT IS THE BODY, AND THE SHAPES ARE THE SAME TWO. A panel body is
  // what `renderPanel` returns, per branch, through exactly the walk the
  // sections above use. And it passes the same two ways: the `<TabsView>` MOUNT
  // is boxed by an ancestor — which is what a record detail does, handing its
  // whole strip to `RecordScreen`'s card, and is why 11 of the 14 hosts ask
  // nothing further — or every body it draws stands on paper. Without the
  // ancestor walk at the mount this clause reports 18 offenders and 14 of them
  // are the record chrome's own container seen from inside; with it, 4. A law
  // that cannot see the box a screen is already standing in would have been
  // answered by wrapping every panel in a second one, which is the "container
  // inside a container" the client rejected by name on the Overview tab.
  //
  // EXEMPTIONS ARE KEYED PER PANEL, `path#value`, and that granularity is
  // load-bearing rather than tidy: `settings-screen.tsx` holds the tab this
  // ruling is about AND another tab that is mid-retirement in a different lane.
  // A file-level key would have let the second one's exemption excuse the
  // first, which is the "passes on the strength of the branch that happens to
  // have a panel in it" failure this law already names — moved up one level,
  // from a branch to a tab. The value is read off the panel's own dispatch
  // (`panel.value === "modules"`), so it is the word the tab strip uses, and a
  // panel reached by fall-through is `#default`.
  const panels: Finding[] = []
  /** The tab this body belongs to, read off the enclosing dispatch — the same
   * `value` the strip draws. A body under no comparison is the fall-through. */
  const panelValueOf = (body: ts.Node, fn: ts.Node): string => {
    for (let p: ts.Node | undefined = body; p && p !== fn.parent; p = p.parent) {
      const test = ts.isIfStatement(p)
        ? p.expression
        : ts.isConditionalExpression(p)
          ? p.condition
          : null
      if (!test) continue
      const m = /\.value\s*===\s*["'`]([A-Za-z0-9_-]+)["'`]/.exec(test.getText())
      if (m) return m[1]
    }
    return "default"
  }

  // JUDGES ONE `renderPanel` HOST — pulled out of the attribute-form loop
  // below (amendment 9) so the sibling-form loop after it can ask the exact
  // same question of a differently-spelled host, rather than a second,
  // drifting copy of these twelve lines. `mount` is the element that stands
  // in for "the box a fill on this host would paint": the `<TabsView>` itself
  // for the attribute form (a caller could spell `<TabsView
  // className="bg-surface-panel">`), the shared wrapper for the sibling form
  // (see amendment 9's own header for why).
  function judgePanelHost(f: Parsed, fn: ts.ArrowFunction | ts.FunctionExpression, mount: ts.Node | undefined) {
    // (a) THE MOUNT IS BOXED — the record-chrome shape. The mount, or any
    // JSX ancestor of it, paints.
    let boxed = false
    for (let p: ts.Node | undefined = mount; p && !boxed; p = p.parent)
      if ((ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) && paints(p)) boxed = true
    if (!boxed) {
      // (b) …or EVERY BODY stands on paper, per branch, with the same four
      // things that are deliberately not content.
      const byPanel = new Map<string, string[]>()
      const lineOf = new Map<string, number>()
      for (const b of bodies(fn)) {
        const t = tagName(b)
        const value = panelValueOf(b, fn)
        const line = f.tree.getLineAndCharacterOfPosition(b.getStart()).line + 1
        if (!lineOf.has(value)) lineOf.set(value, line)
        if (carriesHeading(b)) continue
        if (t && PROSE.test(t)) continue
        if (t && /^[A-Z]/.test(t) && isOverlay(t.split(".")[0])) continue
        if (t && /^[A-Z]/.test(t) && isAct(t.split(".")[0])) continue
        if (/(^|\s)(hidden|sr-only)(\s|$)/.test(classNameOf(b))) continue
        if (subtreePaints(b)) continue
        if (t && READABLE_PROSE.test(t)) amendment4.proseBare++
        if (!byPanel.has(value)) byPanel.set(value, [])
        byPanel.get(value)!.push(`<${t}> at line ${line}`)
      }
      // A TAB PANEL HAS NO `<section>` TAG OF ITS OWN TO CARRY A STROKE, so
      // its `stroked` list is empty by construction. It is present rather than
      // absent because the two censuses are concatenated below and one of them
      // missing the field would read as "nothing found" instead of "nothing to
      // find", which is this file's own recurring lesson.
      for (const [value, bare] of byPanel)
        panels.push({ where: `${f.rel}#${value}:${lineOf.get(value)}`, bare, stroked: [] })
    }
    panelCensus.hosts++
    if (boxed) panelCensus.boxed++
  }

  for (const f of app) {
    const visit = (node: ts.Node) => {
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText() === "renderPanel" &&
        node.initializer &&
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression &&
        (ts.isArrowFunction(node.initializer.expression) ||
          ts.isFunctionExpression(node.initializer.expression))
      ) {
        const fn = node.initializer.expression
        // THE MOUNT — the `<TabsView>` carrying this prop.
        let mount: ts.Node | undefined = node
        while (mount && !ts.isJsxElement(mount) && !ts.isJsxSelfClosingElement(mount)) mount = mount.parent
        judgePanelHost(f, fn, mount)
      }
      ts.forEachChild(node, visit)
    }
    visit(f.tree)
  }

  // ── AMENDMENT 9 (2026-09-15) — THE SIBLING renderPanel SHAPE, R77'S OWN
  //    SPLIT WENT BLIND TO THE PANELS IT MOVED ─────────────────────────────
  //
  // R77 (`tab-strips-pin`, 2026-09-15) rewrote three main screens' own
  // `<TabsView renderPanel={…}>` JSX ATTRIBUTE into `renderFolderTabs(…)`
  // beside a plain SIBLING `(function renderPanel(panel) {…})(…)` — the split
  // every collection screen already draws, so `STICKY_FOLDER_TABS` (which
  // pins the WHOLE `<Tabs>` root, unlike `STICKY_TABS`) pins the strip
  // without pinning the panel's own content along with it. `kwapso-screen.tsx`
  // and `settings-screen.tsx`'s own headers have the full account; R77's law
  // text and `TAB_STRIP_PIN_EXEMPT` above name `module-settings-screen.tsx`
  // as the third screen the same lane split the same day.
  //
  // THE LOOP JUST ABOVE FINDS A HOST BY ITS JSX ATTRIBUTE, which is the shape
  // this file's own header names ("every body a `renderPanel` returns") —
  // the sibling form spells no such attribute at all, so all three screens
  // dropped out of the census the moment they adopted R77. Their
  // `UNCONTAINED_SECTION_OK` entries were deleted as "matching nothing"
  // rather than re-judged — a green that measured nothing, the exact failure
  // this file's own tripwire exists to refuse (see the census's own tripwire
  // assertions below, which this amendment adds two new ones to).
  //
  // THE SUBJECT IS THE SAME FUNCTION, FOUND A DIFFERENT WAY. A sibling host
  // is TWO JSX children of one element, in that order: one that CALLS
  // `renderFolderTabs(` (the strip), immediately followed by one that is an
  // IMMEDIATELY-INVOKED function expression or arrow (the panel) —
  // POSITIONAL ADJACENCY, not a name, because an arrow IIFE carries no name
  // to match and this file's own house style is to derive a shape rather
  // than pick one by spelling ("ANCESTRY IS READ FROM THE SYNTAX TREE", this
  // file's header). The named form all three call sites actually write today
  // (`function renderPanel(panel) {…}`) matches on adjacency too, so one
  // clause covers both without asking which syntax a fourth screen picks
  // tomorrow. Whitespace-only `JsxText` between the two children (the source
  // formatter's own newline+indent) is skipped rather than treated as a
  // third sibling standing between them.
  //
  // THE MOUNT IS THE SHARED WRAPPER — the element that is the JSX PARENT of
  // both siblings (`<div className="flex w-full flex-col">` on all three
  // screens today), the position a caller would actually paint a fill on if
  // this host were ever boxed at its own root rather than through a
  // record-chrome ancestor further up. Same ancestor walk as the attribute
  // form, `judgePanelHost` above, starting one level up.
  //
  // MEASURED AGAINST FALSE POSITIVES, NOT ASSUMED SAFE: `renderFolderTabs(`
  // has three OTHER call sites in the app (`tickets-collection.tsx`,
  // `paged-find.tsx`, `deep-link/screen-bits.tsx`) and not one of them is
  // followed by an IIFE — a ternary, a `wrap ? wrap(...) : ...` and a
  // `<CollectionCreateActionProvider>` respectively — so this clause reaches
  // exactly the three screens named above and nothing else, today.
  function unwrapParens(e: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(e)) e = e.expression
    return e
  }
  /** The function an expression immediately invokes, if it is one — the
   * callee unwrapped through any parentheses, and only when THAT is itself a
   * function literal (an ordinary call, `renderFolderTabs(…)`, has a callee
   * that is an Identifier, which this rejects). */
  function iifeFn(e: ts.Expression): ts.ArrowFunction | ts.FunctionExpression | undefined {
    if (!ts.isCallExpression(e)) return undefined
    const callee = unwrapParens(e.expression)
    return ts.isArrowFunction(callee) || ts.isFunctionExpression(callee) ? callee : undefined
  }
  function callsRenderFolderTabs(e: ts.Expression): boolean {
    return ts.isCallExpression(e) && e.expression.getText() === "renderFolderTabs"
  }
  for (const f of app) {
    const visit = (node: ts.Node) => {
      if (ts.isJsxExpression(node) && node.expression && ts.isJsxElement(node.parent)) {
        const fn = iifeFn(node.expression)
        if (fn) {
          const kids = node.parent.children
          const idx = kids.indexOf(node)
          let prev = idx - 1
          while (prev >= 0 && ts.isJsxText(kids[prev]) && !kids[prev].getText().trim()) prev--
          const before = prev >= 0 ? kids[prev] : undefined
          if (before && ts.isJsxExpression(before) && before.expression && callsRenderFolderTabs(before.expression))
            judgePanelHost(f, fn, node.parent)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(f.tree)
  }

  // ── THE BLINDNESS TRIPWIRE ────────────────────────────────────────────────
  // Three ways this check could report a clean app while measuring nothing: the
  // token derivation could come back empty (every fill unspellable, so every
  // section "uncontained" — or, with an empty alternation, every string a
  // match); the walk could find no files; the heading census could find no
  // sections at all. Each fails LOUDLY here rather than passing quietly, which
  // is the failure mode this repository keeps re-earning.
  it("the census measures something (a blind scan reports all clear exactly like a passing one)", () => {
    expect(fills.length, "no container fill was derived from the kit's tokens — the paper family moved").toBeGreaterThan(3)
    expect(fills, "the ground is not a container and must never be in the derived family").not.toContain("surface-page")
    expect(fills, "the ground is not a container and must never be in the derived family").not.toContain("background")
    expect(app.length, "the front-door walk found nothing").toBeGreaterThan(150)
    expect(kit.length, "the kit walk found nothing — nothing could be asked what it paints").toBeGreaterThan(50)
    expect(titled.length, "no <section> was found on either front door — the census has gone blind").toBeGreaterThan(20)
    // …and the two shapes are both really represented, so a rule that only ever
    // sees one of them is not silently enforcing half of itself.
    expect(titled.filter((s) => s.bare.length === 0).length, "no section passes — the definition has drifted").toBeGreaterThan(10)

    // AMENDMENT 1's OWN TRIPWIRE. The subtraction by VALUE is the half of this
    // law that has no other symptom: if the palette split stops finding a dark
    // block, every token resolves light-only, nothing collides, and the family
    // silently goes back to blessing `bg-card` on the page at contrast 1.000 —
    // passing exactly like a law that works. So the two palettes must really
    // differ, and the subtraction must really have dropped the fills that are
    // the page's own colour.
    const { resolve } = palettes()
    expect(
      resolve("dark", "background"),
      "light and dark resolved --background to the same literal — the palette split found no dark block, " +
        "so every 'is this fill the ground?' question is being answered against one palette"
    ).not.toEqual(resolve("light", "background"))
    expect(
      groundColoured(),
      "no surface token resolves to the page colour any more. Either the kit re-toned them (delete this " +
        "tripwire and amendment 1 with it) or the resolver stopped resolving — and the second one looks " +
        "identical to a clean app:"
    ).toContain("card")
    for (const n of fills)
      for (const which of ["light", "dark"] as const)
        expect(resolve(which, n), `--${n} did not resolve to a literal in ${which}`).toMatch(/^#|^rgb|^oklch|^hsl/)

    // AMENDMENT 3's. A panel census that finds no hosts, or that boxes ALL of
    // them, enforces nothing and reports success for it.
    expect(panelCensus.hosts, "no <TabsView renderPanel> host was found — the panel census has gone blind").toBeGreaterThan(10)
    expect(panelCensus.boxed, "no panel host is boxed by its mount — the ancestor walk has stopped resolving").toBeGreaterThan(5)
    expect(
      panelCensus.hosts - panelCensus.boxed,
      "every panel host is boxed, so the per-body clause judged nothing at all"
    ).toBeGreaterThan(0)

    // AMENDMENT 4's. Both halves of it are SUBTRACTIONS from what used to be
    // waved through, and a subtraction that stops subtracting is invisible: the
    // census comes back the size it was, every screen passes, and the law reads
    // exactly as it did before the client overruled it. So each half must prove
    // it still reaches something.
    expect(
      amendment4.headless,
      "no <section> without a heading of its own was found, so dropping the heading requirement admitted " +
        "nothing. That requirement was dropped because the client's ruling DELETED two headings — if this " +
        "is really zero, the subject has drifted back and those sections are outside the law again"
    ).toBeGreaterThan(0)
    // AMENDMENT 5's, AND IT IS TWO ASSERTIONS THAT PULL IN OPPOSITE DIRECTIONS
    // ON PURPOSE. The root walk is a WIDENING of what counts as painted, so its
    // failure modes are a no-op in one direction and the thrown-away version in
    // the other, and each is invisible on its own.
    //
    // FIXED 2026-09-14 — OWNED SPECIMEN, NOT THE APP'S. This used to read
    // `rootsFollowed` off `mainWalk`, i.e. off whatever the real app happens to
    // contain, on the reasoning that `ThemeSection` and its three neighbours
    // always would. They stopped: the client's ruling ("one container, four
    // sections") reached its last holdout, `LanguageSection`, the same day
    // this was found red, and the product legitimately has zero components of
    // that shape now. A tripwire that goes red because the PRODUCT changed,
    // with nothing wrong, sends the next person hunting a bug that is not
    // there — and the same proxy could just as easily pass for the wrong
    // reason, green because some unrelated screen happens to grow the shape
    // back, whether or not the walk still works. So the proof is now run
    // against `rootWalkFixture` above, a corpus this test owns and nothing
    // else can add to or empty out.
    const fixtureWalk = createPaintWalk(rootWalkFixture)
    expect(
      fixtureWalk.rootPaints("FixtureBareHost"),
      "the owned fixture — FixtureBareHost returns <FixtureRootedMiddle/>, which returns " +
        "<FixturePaintedLeaf/>, which is the only one of the three whose own JSX carries a fill class — " +
        "no longer resolves as painting. Either `rootElements` stopped finding a component's own RETURN, " +
        "or `paints`'s `componentPaints(name) || rootPaints(name)` fallback (the line amendment 5 added) " +
        "was dropped, and the second one looks exactly like a law that works"
    ).toBe(true)
    expect(
      fixtureWalk.rootsFollowed(),
      "the owned fixture resolved zero components through their own root — FixtureRootedMiddle and " +
        "FixtureBareHost both should, since neither one's own text carries a fill class"
    ).toBeGreaterThanOrEqual(2)
    expect(
      rootPaints("CollectionEmptyState"),
      "`CollectionEmptyState` now counts as PAINTING, which is the version of this walk that was written " +
        "and thrown away: it renders a headline, a sentence and a button, one of which resolves to a fill " +
        "two files away, and following that edge turned every uncontained zero register in the app green — " +
        "an uncontained zero register being precisely what the client reported. Amendment 5 follows ONE " +
        "edge, the component's own ROOT, and this register's root is a bare `<div>`"
    ).toBe(false)

    expect(
      amendment4.proseBare,
      "no bare body in the whole census is a readable sentence, so the narrowed PROSE exemption is catching " +
        "nothing at all. A sentence on the page ground is the exact shape the client ruled on four times " +
        "(the fourth overruled this file's own exemption); a zero here means the law has reverted to the " +
        "version she rejected while still passing"
    ).toBeGreaterThan(0)

    // AMENDMENT 6's TRIPWIRE — THE OVERLAY FAMILY'S SKIP SET, BOTH WAYS. By
    // the time this runs, the two census loops above have already called
    // `isOverlay` on everything they met, so `overlayCache` holds today's real
    // verdicts. A name it now says `true` for that `OVERLAY_FAMILY_OK` does
    // not know about is a WIDENING that must be reviewed and named, not
    // waved through; a pinned name it no longer agrees with is stale and the
    // list can only shrink, the same rot-check `UNCONTAINED_SECTION_OK` uses.
    const overlayTrueNow = [...overlayCache.entries()].filter(([, v]) => v).map(([k]) => k)
    const newOverlay = overlayTrueNow.filter((n) => !(n in OVERLAY_FAMILY_OK))
    expect(
      newOverlay,
      "isOverlay now returns true for a component OVERLAY_FAMILY_OK does not name — either it is a real " +
        "scrim-standing surface (add it here with the chain that proves it) or the family has widened again " +
        "the way Popover once did (narrow it back):"
    ).toEqual([])
    const staleOverlay = Object.keys(OVERLAY_FAMILY_OK).filter((n) => !overlayTrueNow.includes(n))
    expect(
      staleOverlay,
      "these OVERLAY_FAMILY_OK entries match nothing isOverlay returns true for any more — delete them:"
    ).toEqual([])

    // AMENDMENT 7's TRIPWIRE, IN TWO HALVES LIKE AMENDMENT 4's. First the
    // REVIEWED PIN against the real app.
    //
    // IT WAS ZERO UNTIL 23 SEP 2026, and the reason it was zero is the reason
    // it is now ONE. Amendment 7's own note named the risk exactly: the one
    // live chokepoint that forwards `{children}` on a `<section>` is
    // `shared/web/settings-section.tsx`, and it was resolved by shape (a) —
    // "the section IS the box" — before `bodies()` was ever called on it,
    // because it painted `bg-surface-panel` on itself. *"So the live risk is
    // not this exact file, it is the NEXT chokepoint that forwards
    // `{children}`/`{body}`/`{content}` without painting itself."* It turned
    // out to be this exact file. Aurora, 23 Sep 2026, verbatim: "settings
    // appearacne shoudl not have card - thats not minimal." The fill came
    // off, shape (a) stopped short-circuiting, and the walk reached the bare
    // `{children}` that was always underneath it.
    //
    // ONE, AND THE ONE IS NAMED. This is a BLINDNESS counter, not an
    // offence: R67's "a body must stand on paper" clause was deleted whole by
    // amendment 10 the moment Aurora overturned the premise app wide, so an
    // unpainted section forwarding its children is the ordinary shape now and
    // there is nothing here for it to fail. What the counter exists to say is
    // that this walk cannot see INTO that section — and it cannot, for
    // exactly the file amendment 7 predicted. Resolving it for real is still
    // the second, nested census amendment 7 declined to build (one hop to
    // every call site of the component), and it would today resolve to ONE
    // caller, `AppearancePanel`, whose body is four rows on the page ground
    // that no surviving clause judges. So the pin moves rather than the walk.
    // It must still only ever rise WITH a reason written at this line.
    expect(
      amendment7.unresolvedIdentifiers,
      "the real census now finds MORE bare identifiers standing where a section's content should be than " +
        "the one `shared/web/settings-section.tsx` has forwarded since its box came off (23 Sep 2026) — a " +
        "second component is forwarding `{children}`/`{body}`/`{content}` on an unpainted `<section>`. " +
        "Resolve it one hop through the caller, or explain the new count here (it must only ever rise " +
        "together with a reason)"
    ).toBe(1)
    // …then the OWNED FIXTURE, so the counter's own wiring is proved without
    // waiting for the app to grow a second chokepoint (this file's own most
    // recent lesson, at amendment 5's `rootsFollowed` tripwire above).
    const beforeFixture = amendment7.unresolvedIdentifiers
    const fixtureBodies = bodies(firstSection(bareIdentifierFixture))
    expect(
      fixtureBodies,
      "the owned fixture's `<section>{children}</section>` produced a real body — `bodies()` started " +
        "resolving a bare identifier to JSX, which it cannot do; something upstream of this walk changed"
    ).toEqual([])
    expect(
      amendment7.unresolvedIdentifiers - beforeFixture,
      "the owned fixture's bare `{children}` was not counted — the AMENDMENT 7 branch in `fromExpr` stopped " +
        "matching `ts.isIdentifier`, and a section that forwards its content invisibly is back to reading " +
        "as a clean zero"
    ).toBe(1)
  })

  // ── AMENDED A TENTH TIME, 21 SEP 2026 — THE PREMISE WAS OVERTURNED, NOT
  //    WIDENED. Aurora, on the Minimal Kit page, verbatim: "go an implement
  //    this appwide", and, for the whole pass, "the goal: make a more minimal
  //    clean app" (rulebook L43).
  //
  //    THIS LAW'S FIRST SENTENCE WAS "each panel stands on paper; nothing is
  //    drawn on the bare page ground", and it was HERS — five sayings in three
  //    days, quoted in full in RULES.md's own R67 row ("nothing on top of white
  //    background, its a rule!"). She has now ruled the other way, over the
  //    whole app, with a validated page behind it. A law does not get to keep
  //    enforcing a premise its author retired, so the clause that failed a
  //    build for a bare body is GONE.
  //
  //    WHAT STILL HOLDS, AND IS NOW THE WHOLE OF THE OFFENCE: a section paints
  //    the PAGE or the kit's PAPER - never a stroke, never a hex. That was
  //    always this law's own sentence (BUILD-A-SCREEN.md §6.1, "no CSS border,
  //    ever"; R32's closed palette) and it never had a census here, because
  //    while every section carried a fill there was nothing for a stroke to be
  //    the alternative TO. There is now: a section that has given up its box is
  //    exactly where somebody reaches for an outline to get the edge back, and
  //    one outline would undo the pass.
  //
  //    THE `<section>` CENSUS STAYS, WHOLE. Same subject (the literal
  //    `<section>` tag, amendment 4), same walk, same per-branch `bodies()`,
  //    same paint resolution, same tab-panel half, same tripwires. It admits
  //    the page ground now - `bare` is still computed and still asserted to be
  //    non-trivial below, because "the census went blind" and "the app went
  //    plain" look identical from outside and that number is the only thing
  //    that tells them apart.
  it("sections-stand-on-paper: no titled section and no tab panel draws a stroke or a hex (R67, as amended by L43)", () => {
    // ONE CENSUS, TWO SUBJECTS. A titled `<section>` is keyed by its file; a tab
    // panel by `file#value`, because one file's tabs are not one decision.
    const offenders = [...titled, ...panels].filter((s) => s.stroked.length > 0)
    const unexplained = offenders.filter((s) => !(s.where.split(":")[0] in UNCONTAINED_SECTION_OK))
    expect(
      unexplained.map((s) => `${s.where} — ${s.stroked.join(", ")}`),
      "R67 — a section paints the page or the kit's paper, never a stroke and never a hex. " +
        "Separation is a fill or an inset shadow (BUILD-A-SCREEN.md §6.1), and a colour resolves " +
        "through a token (R32). If the section needs an edge back, it needs the kit's paper " +
        "(`variant=\"default\"`), not an outline. Otherwise name the file in UNCONTAINED_SECTION_OK " +
        "with the real reason:"
    ).toEqual([])

    // ROT-CHECKED, so the list can only shrink: a file whose sections draw no
    // stroke now must lose its line rather than keep a pin nobody re-reads.
    const claimed = new Set(offenders.map((s) => s.where.split(":")[0]))
    const stale = Object.keys(UNCONTAINED_SECTION_OK).filter((k) => !claimed.has(k))
    expect(
      stale,
      "these UNCONTAINED_SECTION_OK entries match nothing any more — delete the entry:"
    ).toEqual([])
  })

  // PROVED NOT VACUOUS, the same two-part way every other amendment in this
  // file proves its own: the matcher really fires on the shapes it names, and
  // really does not fire on the ones it must not.
  it("the stroke/hex matcher catches what it names and nothing beside it", () => {
    const fire = [
      "rounded-[var(--radius)] border border-dashed p-4",
      "border-b",
      "outline outline-2",
      "bg-[#FFFEF9] p-4",
    ]
    const quiet = [
      "flex flex-col gap-4 rounded-[var(--radius)] bg-surface-panel p-4",
      "flex min-w-0 flex-col gap-6",
      "border-none",
      "border-0",
      "shadow-[var(--hairline-under)]",
      "bg-surface-panel",
    ]
    for (const c of fire)
      expect(HEX.test(c) || STROKE.test(c), `must be caught: ${c}`).toBe(true)
    for (const c of quiet)
      expect(HEX.test(c) || STROKE.test(c), `must NOT be caught: ${c}`).toBe(false)
  })

  // ═══════════════════════════════════════════════════════════════════════
  // R67, WIDENED — A COLLECTION NESTED IN A RECORD-DETAIL TAB STANDS ON ITS
  // OWN CARD; THE RECORD'S OUTER CHROME IS A DIFFERENT SURFACE.
  //
  // See `RECORD_DETAIL_COLLECTION_OK`'s own header (`shared/rules/
  // registry.ts`) for the client's ruling and the full account. In short:
  // amendment 3 just above already visits every `STICKY_TABS` record-detail
  // `renderPanel` host, and shape (a) — "the mount is boxed by an ancestor" —
  // passes every one of them on the strength of the ONE shared `Card` the
  // kit's `RecordDetail` draws around whatever `panel` is
  // (`overview-list.tsx`'s own header has the citation). That box is the
  // right answer for a plain fact list (the client rejected a SECOND nested
  // card around `OverviewList`, "container inside a container") and the
  // wrong answer for an actual COLLECTION — `SprintsPanel`/`AppsPanel`
  // already draw their OWN nested card inside it
  // (`CollectionFrame useKitPanel`), unchallenged, so a sibling collection
  // tab that skips that nested card reads as the one with "the background
  // card" missing, which is exactly what she reported about the app's
  // Tickets tab.
  //
  // So this second census asks R67's own per-body question a second time,
  // for the SAME hosts, WITHOUT shape (a)'s ancestor shortcut — but only of
  // a body that is actually shaped like a collection (a toolbar over rows),
  // never of a plain fact list or a lone act: widening this to every panel
  // body would refight the settled `OverviewList` question. "Shaped like a
  // collection" is read off the source the same way `componentPaints` reads
  // whether something paints — the branch's own JSX, hop-expanded one level
  // through the SAME FILE's other top-level declarations (so `<AppTicketsTab
  // appId={appId} .../>` resolves through `AppTicketsTab` → `AppTicketsPanel`
  // → `PagedPanelBody`, all three in `work-panels.tsx`, to the literal
  // `<PagedFind` two hops down) — never across a second file, the same
  // under-reaching direction every walk in this file takes.
  describe("R67, widened — a nested collection in a record-detail tab stands on its own card", () => {
    /** Is this the `<TabsView className={STICKY_TABS} …>` mount a record
     * detail wears (`record-chrome.tsx`)? Read positionally, the way R20
     * reads a checked field: the `className` attribute's initializer is the
     * bare identifier `STICKY_TABS`, not a string a `<TabsView
     * className="…">` call could also write — so a screen that spells its
     * own sticky class some other way is simply outside this narrower
     * census, the same under-reach every walk here takes on purpose. */
    function mountsStickyTabs(mount: ts.Node | undefined): boolean {
      if (!mount || !(ts.isJsxElement(mount) || ts.isJsxSelfClosingElement(mount))) return false
      const attrs = ts.isJsxElement(mount) ? mount.openingElement.attributes : mount.attributes
      for (const a of attrs.properties) {
        if (!ts.isJsxAttribute(a) || a.name.getText() !== "className") continue
        const init = a.initializer
        if (init && ts.isJsxExpression(init) && init.expression && ts.isIdentifier(init.expression))
          return init.expression.text === "STICKY_TABS"
      }
      return false
    }

    /** One hop through the SAME FILE's other top-level declarations — the
     * identical mechanism `componentPaints` (above) hop-expands through,
     * reused here to ask a different question of the grown text: does it
     * reference one of the seams a real collection is built from, rather
     * than whether it paints. Deliberately narrow: `declText`/`fileTop` are
     * this describe block's own outer closures, built once over `all`. */
    const COLLECTION_SHAPE = /<(ToolbarRow|PagedFind|CollectionFrame|RecordTable|Table)\b/
    const collectionShapeCache = new Map<string, boolean>()
    function referencesCollectionSeam(name: string): boolean {
      const cached = collectionShapeCache.get(name)
      if (cached !== undefined) return cached
      collectionShapeCache.set(name, false) // recursion guard
      const d = declText.get(name)
      if (!d) return false
      const tops = fileTop.get(d.rel) ?? new Map<string, string>()
      let text = d.text
      const seen = new Set([name])
      for (let hop = 0; hop < 4; hop++) {
        let grew = false
        for (const [k, v] of tops) {
          if (seen.has(k)) continue
          if (new RegExp(`\\b${k}\\b`).test(text)) {
            seen.add(k)
            text += `\n${v}`
            grew = true
          }
        }
        if (!grew) break
      }
      const hit = COLLECTION_SHAPE.test(text)
      collectionShapeCache.set(name, hit)
      return hit
    }
    /** Asked of a whole BODY (one `bodies()` entry — a JSX literal, or a
     * `.map()`/ternary/`&&` arm) rather than of one tag: walks every element
     * in it and asks the same question of each tag it meets, so
     * `<AppTicketsTab appId={appId} host={host} … />` — a single
     * self-closing element with no JSX children of its own — is still
     * resolved through its OWN name. */
    function looksLikeCollection(n: ts.Node): boolean {
      let hit = false
      const walk = (x: ts.Node) => {
        if (hit) return
        const t = tagName(x)
        if (t) {
          const base = t.split(".")[0]
          if (COLLECTION_SHAPE.test(`<${base}`) || referencesCollectionSeam(base)) {
            hit = true
            return
          }
        }
        ts.forEachChild(x, walk)
      }
      walk(n)
      return hit
    }

    // ── A PRECISE, STRUCTURAL "does this collection stand on paper" check ──
    //
    // `paints`/`subtreePaints` (the machinery amendments 1–9 built, reused
    // for `titled`/`panels` above) resolve a bare component reference
    // through `componentPaints`'s TEXT-based hop expansion — which grows the
    // scanned text through every same-file constant and same-file import the
    // ACCUMULATED text so far happens to mention, recursively. That is the
    // right direction for the QUESTION amendments 1–9 ask (a component's own
    // classes, or a `cva` it calls), and the WRONG direction for this one:
    // `work-panels.tsx` alone declares eleven panels, and once the hop walk
    // has pulled in three or four of them the accumulated text is thousands
    // of lines, and something in THAT blob almost always spells a container
    // fill class that has nothing to do with the ONE panel being asked
    // about. Measured, not assumed: with `paints`/`subtreePaints` in place
    // of the resolver below, this census reported the app's Tickets tab —
    // the literal screen the client's ruling names — as containED, because
    // `AppTicketsTab`'s hop-accumulated text (through `AppTicketsPanel`,
    // `PagedPanelBody`, `TicketsDashboard` and whatever THEY in turn
    // mention) happens to contain a fill class several components away from
    // the one actually on screen.
    //
    // So this narrower census asks the question the way R67's own amendment
    // 5 (`rootPaints`) does — ONE edge, the component's own RETURN,
    // followed transitively — with the ONE addition amendment 8 already
    // proved necessary for a text scan and `rootElements` never carried: a
    // GUARD return (an early `if (cond) return …`, no `else`, not the last
    // statement — a loading skeleton, an error panel) is cut before roots
    // are collected, exactly as `mainText`/`mainBody`/`isGuardReturn` do
    // inside `createPaintWalk` above, reimplemented locally here rather than
    // exported, since a guard branch this rejects is EXACTLY what R79's own
    // `PagedPanelBody` writes twice (its error `<ShapeStateBody>` and its
    // loading `<Skeleton>`) before its real, final `<PagedFind>` return —
    // without cutting them, `rootElements`'s own "every root must pass"
    // requirement would fail on the loading skeleton and never even reach
    // the collection underneath it.
    function isGuardReturnLocal(st: ts.Statement): boolean {
      if (!ts.isIfStatement(st) || st.elseStatement) return false
      const then = st.thenStatement
      if (ts.isReturnStatement(then)) return true
      return ts.isBlock(then) && then.statements.length > 0 && then.statements.every((s) => ts.isReturnStatement(s))
    }
    /** The declaration node for every top-level, capitalised name in `all` —
     * the NODE counterpart to the outer `declText`/`fileTop` (which hold
     * only text), built the same way `rootDecl` is inside `createPaintWalk`,
     * needed here so `realRoots` below has an actual AST node to walk. */
    const topLevelNode = new Map<string, ts.Node>()
    for (const f of all)
      for (const st of f.tree.statements) {
        if (ts.isVariableStatement(st))
          for (const d of st.declarationList.declarations)
            if (ts.isIdentifier(d.name) && /^[A-Z]/.test(d.name.text) && !topLevelNode.has(d.name.text))
              topLevelNode.set(d.name.text, d)
        if (
          ts.isFunctionDeclaration(st) &&
          st.name &&
          /^[A-Z]/.test(st.name.text) &&
          !topLevelNode.has(st.name.text)
        )
          topLevelNode.set(st.name.text, st)
      }
    /** The JSX elements a declaration RETURNS, with every GUARD return cut
     * first — `rootElements`'s own per-branch collection (a ternary's two
     * arms included), asked only of the statements left once a loading/
     * error guard is removed. Mirrors `rootElements`'s own handling of an
     * expression-bodied arrow (no `return` at all) for the same reason. */
    function realRoots(decl: ts.Node): ts.Node[] {
      const body =
        ts.isFunctionDeclaration(decl) && decl.body
          ? decl.body
          : ts.isVariableDeclaration(decl) &&
              decl.initializer &&
              (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) &&
              ts.isBlock(decl.initializer.body)
            ? decl.initializer.body
            : undefined
      if (!body) return rootElements(decl) // an expression-bodied arrow has no statements to guard-cut
      const kept = body.statements.filter((_, i) => i === body.statements.length - 1 || !isGuardReturnLocal(body.statements[i]))
      const out: ts.Node[] = []
      const fromExpr = (e: ts.Expression) => {
        if (ts.isParenthesizedExpression(e)) return fromExpr(e.expression)
        if (ts.isConditionalExpression(e)) {
          fromExpr(e.whenTrue)
          fromExpr(e.whenFalse)
          return
        }
        // A FRAGMENT IS ITS OWN ROOT HERE, unlike `rootElements` above (which
        // deliberately hands back ZERO roots for one — "no ONE box to stand
        // in", the right call for "does this component itself resolve to a
        // single container"). This narrower census asks a different
        // question — does ANYTHING inside what this panel returns paint —
        // so the fragment node is pushed and `collectionSubtreePaints`
        // (below) walks straight through it via `ts.forEachChild`, the same
        // way it already walks into a `<div>` wrapper's children.
        if (ts.isJsxFragment(e)) {
          out.push(e)
          return
        }
        if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e)) out.push(e)
      }
      for (const st of kept) if (ts.isReturnStatement(st) && st.expression) fromExpr(st.expression)
      return out
    }
    function hasJsxProp(node: ts.Node, propName: string): boolean {
      const attrs = ts.isJsxElement(node)
        ? node.openingElement.attributes
        : ts.isJsxSelfClosingElement(node)
          ? node.attributes
          : null
      if (!attrs) return false
      return attrs.properties.some((p) => ts.isJsxAttribute(p) && p.name.getText() === propName)
    }
    const collectionPaintCache = new Map<string, boolean>()
    /** The named seams this app already uses to say "this stands on its own
     * paper" — read as a NAME rather than resolved through the kit's `cva`
     * (which this narrower census does not carry a resolver for): the kit's
     * `Card` defaults to `bg-surface-panel` (`shared/ui/components/card/
     * card.tsx`'s own `cardVariants`, `defaultVariants: { variant:
     * "default" }`), and `CollectionCard` (`screen-bits.tsx`) is a bare,
     * variant-less `<Card>` — always that default, never `raised`. It is
     * this whole census's OWN prescribed fix (`<PagedFind wrap={…}>`,
     * `work-panels.tsx`'s `PagedPanelBody`), so naming it here is not a
     * shortcut around the law, it is the law's own seam. */
    const NAMED_PANEL_SEAM = new Set(["CollectionCard"])
    /** Does THIS ONE element stand on paper directly — its own classes, one
     * of the kit's own unconditional-panel escape hatches (`useKitPanel` on
     * `CollectionFrame`/`RecordTable`, `CollectionCard`, a `<PagedFind
     * wrap={…}>`) — or, failing those, does the NAMED component it calls
     * resolve to painting (`collectionSeamPaints`, one edge, guard branches
     * cut)? Never walks INTO the element itself — `collectionSubtreePaints`
     * below is what walks, this is only ever asked of one node at a time. */
    function elementPaintsDirectly(node: ts.Node): boolean {
      if (!(ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node))) return false
      if (FILL.test(classNameOf(node))) return true
      const t = tagName(node)
      if (!t) return false
      const base = t.split(".")[0]
      if (!/^[A-Z]/.test(base)) return false
      if (hasJsxProp(node, "useKitPanel")) return true
      if (base === "PagedFind" && hasJsxProp(node, "wrap")) return true
      if (NAMED_PANEL_SEAM.has(base)) return true
      return collectionSeamPaints(base)
    }
    /** Walks EVERY node in the subtree (`ts.forEachChild`, unconditionally —
     * the same move `subtreePaints` above makes, which is what lets this
     * reach a `.map()` row, a `&&`/ternary arm and a plain nested `<div>`
     * alike without a separate clause for each shape) and asks
     * `elementPaintsDirectly` of every JSX element it meets, stopping at the
     * first hit. */
    function collectionSubtreePaints(node: ts.Node): boolean {
      let hit = false
      const walk = (x: ts.Node) => {
        if (hit) return
        if (elementPaintsDirectly(x)) {
          hit = true
          return
        }
        ts.forEachChild(x, walk)
      }
      walk(node)
      return hit
    }
    /** Does the named component structurally stand on paper — followed ONE
     * edge at a time (its own real, guard-stripped return), every root
     * required to paint, the same "every branch" direction `rootPaints`
     * takes above. */
    function collectionSeamPaints(name: string): boolean {
      const cached = collectionPaintCache.get(name)
      if (cached !== undefined) return cached
      collectionPaintCache.set(name, false) // recursion guard
      const decl = topLevelNode.get(name)
      if (!decl) return false
      const roots = realRoots(decl)
      const hit = roots.length > 0 && roots.every((r) => collectionSubtreePaints(r))
      collectionPaintCache.set(name, hit)
      return hit
    }

    const stickyPanels: Finding[] = []
    const stickyCensus = { hosts: 0, collections: 0 }
    for (const f of app) {
      const visit = (node: ts.Node) => {
        if (
          ts.isJsxAttribute(node) &&
          node.name.getText() === "renderPanel" &&
          node.initializer &&
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          (ts.isArrowFunction(node.initializer.expression) || ts.isFunctionExpression(node.initializer.expression))
        ) {
          const fn = node.initializer.expression
          let mount: ts.Node | undefined = node
          while (mount && !ts.isJsxElement(mount) && !ts.isJsxSelfClosingElement(mount)) mount = mount.parent
          if (mountsStickyTabs(mount)) {
            stickyCensus.hosts++
            const byPanel = new Map<string, string[]>()
            const lineOf = new Map<string, number>()
            for (const b of bodies(fn)) {
              const t = tagName(b)
              const value = panelValueOf(b, fn)
              const line = f.tree.getLineAndCharacterOfPosition(b.getStart()).line + 1
              if (!lineOf.has(value)) lineOf.set(value, line)
              if (!looksLikeCollection(b)) continue // out of this narrower census's population
              stickyCensus.collections++
              if (!byPanel.has(value)) byPanel.set(value, [])
              if (carriesHeading(b)) continue
              if (t && PROSE.test(t)) continue
              if (t && /^[A-Z]/.test(t) && isOverlay(t.split(".")[0])) continue
              if (t && /^[A-Z]/.test(t) && isAct(t.split(".")[0])) continue
              if (/(^|\s)(hidden|sr-only)(\s|$)/.test(classNameOf(b))) continue
              // THE FIX: no ancestor shortcut here — a nested collection is
              // asked to paint ITSELF, never excused by the record's own
              // outer chrome card. `collectionSubtreePaints`, not
              // `subtreePaints`/`paints` — see the block comment above.
              if (collectionSubtreePaints(b)) continue
              byPanel.get(value)!.push(`<${t}> at line ${line}`)
            }
            // `stroked: []` — this SECOND census asks a different question
            // (is a nested collection on its own card?) and has no `<section>`
            // tag of its own to carry a stroke. Present rather than absent
            // because it shares the `Finding` type with the census above, and
            // an optional field would let a real stroke list go missing here
            // without anything saying so.
            for (const [value, bare] of byPanel)
              stickyPanels.push({ where: `${f.rel}#${value}:${lineOf.get(value)}`, bare, stroked: [] })
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(f.tree)
    }

    it("the census measures something (a blind scan reports all clear exactly like a passing one)", () => {
      expect(
        stickyCensus.hosts,
        "no STICKY_TABS renderPanel host was found — the record-detail census has gone blind"
      ).toBeGreaterThan(5)
      expect(
        stickyCensus.collections,
        "no collection-shaped panel body was found under any STICKY_TABS host — either every record detail " +
          "stopped nesting a real collection in a tab, or `looksLikeCollection` stopped resolving one"
      ).toBeGreaterThan(5)
    })

    it("a nested collection in a record-detail tab is contained, or says why not", () => {
      const offenders = stickyPanels.filter((s) => s.bare.length > 0)
      const unexplained = offenders.filter((s) => !(s.where.split(":")[0] in RECORD_DETAIL_COLLECTION_OK))
      expect(
        unexplained.map((s) => `${s.where} — on the record's outer chrome, not its own card: ${s.bare.join(", ")}`),
        "a record-detail tab panel that draws a collection stands on the same nested `CollectionCard`/" +
          "`bg-surface-panel` the main collection screens use (`CollectionFrame useKitPanel`, `<PagedFind " +
          "wrap={…}>`), never only on the record's own outer chrome card. Wrap it, or name " +
          "`file#tabValue` in RECORD_DETAIL_COLLECTION_OK with the real reason:"
      ).toEqual([])

      const claimed = new Set(offenders.map((s) => s.where.split(":")[0]))
      const stale = Object.keys(RECORD_DETAIL_COLLECTION_OK).filter((k) => !claimed.has(k))
      expect(
        stale,
        "these RECORD_DETAIL_COLLECTION_OK entries match nothing any more — the panel is contained, so delete the entry:"
      ).toEqual([])
    })
  })
})
