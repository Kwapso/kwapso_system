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

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import ts from "typescript"
import { sourceFiles, stripComments } from "@shared/rules/source-scan"
import { UNCONTAINED_SECTION_OK } from "@shared/rules/registry"

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

  const paintCache = new Map<string, boolean>()
  function componentPaints(name: string): boolean {
    const cached = paintCache.get(name)
    if (cached !== undefined) return cached
    paintCache.set(name, false) // recursion guard
    const d = declText.get(name)
    if (!d) return false
    const tops = fileTop.get(d.rel) ?? new Map<string, string>()
    let text = d.text
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
      if (!grew) break
    }
    // …AND ONLY THROUGH ITS OWN CLASSES. The walk deliberately does NOT follow
    // the components this one RENDERS. That version was written and thrown
    // away: `CollectionEmptyState` renders a headline, a sentence and a button,
    // one of which resolves to a fill two files away, so every uncontained zero
    // register in the app came back green — and an uncontained zero register is
    // precisely what the client reported. A rule that cannot catch the bug it
    // was written for is not a weaker rule, it is a different one.
    const hit = FILL.test(text)
    paintCache.set(name, hit)
    return hit
  }

  /** An overlay does not stand on the page — it stands on the scrim. Derived
   * in two steps, because almost nothing names a portal itself: a component
   * whose DECLARING FILE renders through one is an overlay, and so is a
   * component that renders an overlay. `<AddLinkDialog>` is a
   * `<FormShellDialog>` is a kit `<Sheet>` is a Radix portal — three files, and
   * stopping at the first would have reported a slide-in form as content lying
   * on the page. */
  const portalFile = new Map<string, boolean>()
  for (const f of all)
    portalFile.set(f.rel, /\.Portal\b|<[A-Za-z]*Portal\b|createPortal\(/.test(readFileSync(f.path, "utf8")))
  const overlayCache = new Map<string, boolean>()
  function isOverlay(name: string): boolean {
    const cached = overlayCache.get(name)
    if (cached !== undefined) return cached
    overlayCache.set(name, false) // recursion guard
    const d = declText.get(name)
    if (!d) return false
    let hit = portalFile.get(d.rel) === true
    if (!hit)
      for (const m of d.text.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g))
        if (m[1] !== name && isOverlay(m[1])) {
          hit = true
          break
        }
    overlayCache.set(name, hit)
    return hit
  }

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
  type Cva = { base: string; variants: Map<string, Map<string, string>>; defaults: Map<string, string> }
  const cvaCache = new Map<string, Cva | null>()
  function cvaOf(name: string): Cva | null {
    if (cvaCache.has(name)) return cvaCache.get(name)!
    cvaCache.set(name, null)
    const d = declText.get(name)
    if (!d) return null
    const file = all.find((f) => f.rel === d.rel)
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
        // several (card.tsx has one per part); reading a sibling's would answer
        // about a box this element is not.
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
  const rootDecl = new Map<string, ts.Node>()
  for (const f of all)
    for (const st of f.tree.statements) {
      if (ts.isVariableStatement(st))
        for (const d of st.declarationList.declarations)
          if (ts.isIdentifier(d.name) && /^[A-Z]/.test(d.name.text) && !rootDecl.has(d.name.text))
            rootDecl.set(d.name.text, d)
      if (ts.isFunctionDeclaration(st) && st.name && /^[A-Z]/.test(st.name.text) && !rootDecl.has(st.name.text))
        rootDecl.set(st.name.text, st)
    }
  /** The JSX elements a component can RETURN — one per `return`, unwrapped
   * through parentheses and through a ternary's two arms, which is `bodies()`'s
   * own shape asked about roots instead of children. A fragment is not a root
   * (there is no one box to stand in) and neither is `null`. */
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

  /** THE BODIES A SECTION ACTUALLY DRAWS — one per BRANCH, which is the clause
   * with the teeth. A ternary's two arms, a `&&`'s right-hand side and a
   * `.map()`'s row are each their own body, so a section cannot pass on the
   * strength of the one branch that happens to have a panel in it. */
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
      if (
        ts.isBinaryExpression(e) &&
        [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(e.operatorToken.kind)
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

  type Finding = { where: string; bare: string[] }
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
        const bare: string[] = []
        if (!boxed)
          for (const b of bodies(node)) {
            const t = tagName(b)
            if (carriesHeading(b)) continue
            if (t && PROSE.test(t)) continue
            if (t && /^[A-Z]/.test(t) && isOverlay(t.split(".")[0])) continue
            if (t && /^[A-Z]/.test(t) && isAct(t.split(".")[0])) continue
            if (/(^|\s)(hidden|sr-only)(\s|$)/.test(classNameOf(b))) continue
            if (subtreePaints(b)) continue
            if (t && READABLE_PROSE.test(t)) amendment4.proseBare++
            bare.push(`<${t}> at line ${f.tree.getLineAndCharacterOfPosition(b.getStart()).line + 1}`)
          }
        titled.push({ where, bare })
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
        // (a) THE MOUNT IS BOXED — the record-chrome shape. The `<TabsView>`
        // carrying this prop, or any JSX ancestor of it, paints.
        let mount: ts.Node | undefined = node
        while (mount && !ts.isJsxElement(mount) && !ts.isJsxSelfClosingElement(mount)) mount = mount.parent
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
          for (const [value, bare] of byPanel)
            panels.push({ where: `${f.rel}#${value}:${lineOf.get(value)}`, bare })
        }
        panelCensus.hosts++
        if (boxed) panelCensus.boxed++
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
    expect(
      rootsFollowed,
      "no component was found to paint through its own ROOT, so amendment 5 admitted nothing. It exists " +
        "because `ThemeSection` and its three neighbours stand in `SettingsSection`'s box rather than " +
        "spelling a fill themselves — if this is zero, either that chokepoint has been unpicked or the " +
        "root walk has stopped resolving, and the second one looks exactly like a law that works"
    ).toBeGreaterThan(0)
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
  })

  it("sections-stand-on-paper: every titled section and every tab panel is contained, or says why not (R67)", () => {
    // ONE CENSUS, TWO SUBJECTS. A titled `<section>` is keyed by its file; a tab
    // panel by `file#value`, because one file's tabs are not one decision.
    const offenders = [...titled, ...panels].filter((s) => s.bare.length > 0)
    const unexplained = offenders.filter((s) => !(s.where.split(":")[0] in UNCONTAINED_SECTION_OK))
    expect(
      unexplained.map((s) => `${s.where} — on the bare page ground: ${s.bare.join(", ")}`),
      "R67 — a titled section, or a tab panel, either IS a container or draws every one of its bodies " +
        "inside one. Put the content on `--surface-panel` (the shape `CollectionFrame`, " +
        "`web/components/team/team-panel.tsx` and `CardGrid tone=\"panel\"` all use — and note that " +
        "`bg-card` is NOT one against the page: it is the page's own colour in light), or name the " +
        "file (a section) or `file#tabValue` (a panel) in UNCONTAINED_SECTION_OK with the real reason:"
    ).toEqual([])

    // ROT-CHECKED, so the list can only shrink: a file whose sections are all
    // contained now must lose its line rather than keep a pin nobody re-reads.
    const claimed = new Set(offenders.map((s) => s.where.split(":")[0]))
    const stale = Object.keys(UNCONTAINED_SECTION_OK).filter((k) => !claimed.has(k))
    expect(
      stale,
      "these UNCONTAINED_SECTION_OK entries match nothing any more — the sections are contained, so delete the entry:"
    ).toEqual([])
  })
})
