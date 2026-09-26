// R109, EVERY SCREEN CARRIES THE APP'S CONTENT INSET, AND NO SCREEN GETS ITS
// OWN NUMBER. Aurora, verbatim, 23 Sep 2026, over the accounts screen:
// "there's no margin form the left. make sure you implement the margins
// everywhere, and i dont have to review it one by one. makeit rule."
//
// MEASURED FIRST, LIVE, BEFORE THIS FILE WAS WRITTEN. A Playwright proof
// against https://agency-staging.kwapso.app (1440x842, and 760x900 with the
// rail collapsed) found Accounts — every view (gallery/list/map), every
// status tab (Active/Inactive/Archived/All), every account-detail tab
// (Overview/Apps/Impact/Organisation/Inputs/Knowledge), the accounts module
// settings page, Contacts and Inputs, a cold load and a soft navigation —
// already reading the identical 24px left inset Tickets, the Backlog and a
// ticket record read. No live defect was reproducible that session, so no
// accounts source file was edited. This law exists for the SECOND half of
// her ruling: so the next screen cannot regress the same complaint and she
// does not have to file it again, screen by screen.
//
// WHY THE CENSUS IS NEGATIVE, NOT POSITIVE. The inset a screen's content
// sits inside is a SHELL DEFAULT, never a per-screen choice: `shared/ui/
// compositions/templates/screen-shell.tsx`'s own `SHELL_CONTENT_INSET_X`
// (`px-[var(--space-6)]`, 24px) is spent by `DENSITY_BODY` on the pane's own
// inner stack (`[data-slot="screen-shell-stack"]`, the direct child of
// `[data-slot="screen-shell-body"]` — every comment in this codebase calls
// that element "the pane"), and `web/components/shell/app-shell.tsx` mounts
// that one `ScreenShell` unconditionally. So every module this app renders —
// list or detail, recipe-driven or host-composed, top-level (`/accounts`) or
// team-scoped (`/t/<team>/accounts`) — inherits the identical 24px left/right
// inset for FREE, before a single line of its own source runs. A screen
// cannot ADD this inset (there is nothing to add, and R29's own
// `one-page-width` law already forbids a second page-level container the
// identical way) — it can only CANCEL it, by reaching past the pane's own
// padded edge. The app's one sanctioned way to do that on purpose is the
// record footer band's own `-mx-[var(--pane-inset-x…)]` /
// `-mx-[var(--pane-escape-x…)]` escape (`shared/ui`'s own mechanism), always
// paired with a matching padding put back. So the law a screen's OWN host
// file can actually break is a negative one: it may not carry that escape,
// or a blunter equivalent (`w-screen`, `100vw`), without saying why.
//
// THREE PARTS, each proving something the others cannot:
//
//   (i)   THE SCREEN REGISTRY IS DERIVED, NEVER HAND-LISTED. Every module
//         this app can route to necessarily imports its host component into
//         one of exactly three dispatcher files — `collection-content.tsx`
//         (LIST screens), `module-content.tsx` (DETAIL screens) and
//         `deep-link-screen.tsx` (the five bespoke top-level screens: home,
//         kwapso, settings, module-settings, invitations) — because that
//         import is how the module renders at all. So "every `Screen`/
//         `Collection`/`Detail*` component these three files import from
//         `@/components/…`" is a structural stand-in for "every screen the
//         app's own router declares": a module added to either dispatcher
//         tomorrow is in the registry the day it ships, with nobody
//         remembering to add it to a list. Proved not vacuous by a floor
//         (today: 25) and a spot check for the two files this session
//         actually measured (`AccountsScreen`, `AccountDetailScreen`).
//
//   (ii)  THE NEGATIVE CENSUS. Every registry file, stripped of comments, is
//         scanned for the escape signature. A hit is a finding unless named
//         in `CONTENT_INSET_EXEMPT`, keyed by `{file, contains}` — the
//         offending line's own text, never a line number, so the pin cannot
//         rot on an unrelated edit above it — rot-checked both ways: a
//         finding with no exemption fails the build, and an exemption
//         matching nothing real (the code moved on) fails it too.
//
//   (iii) THE MECHANISM ITSELF, POSITIVELY. (i) and (ii) together only prove
//         "every screen the router knows about does not fight the inset" —
//         they say nothing about whether the inset is actually there to
//         fight. So three structural assertions pin the real thing, once, at
//         its one true source: `app-shell.tsx` mounts exactly one,
//         unconditional `<ScreenShell>`; `shared/ui`'s own
//         `SHELL_CONTENT_INSET_X` is pinned to `px-[var(--space-6)]` and
//         BOTH `DENSITY_BODY` density variants spend it (not just one); and
//         the element carrying `data-slot="screen-shell-stack"` — the actual
//         wrapper a screen's content renders into — spends
//         `DENSITY_BODY[density]` in its own `className`. Reading these
//         three together is what stops the check from "passing merely
//         because a file mentions the token somewhere": (iii) proves the
//         token sits on the real wrapping element, not merely in a comment
//         or an unrelated class list, and (i)+(ii) prove nothing between
//         that element and the screen's own rendered content undoes it.
//
// WHAT THIS CHECK CANNOT SEE, said plainly rather than left for someone to
// discover the hard way:
//
//   - It reads the derived registry's files ONE LEVEL DEEP. A screen host
//     file that renders clean but hands off to a deeply nested shared
//     component which THEN reaches past the pane (the way the record footer
//     band's own mechanism lives inside the vendored kit, several imports
//     away from any one screen's own file) is invisible to this census. The
//     one place this app-side code currently comes close — `record-chrome.
//     tsx` and `record-detail-body.tsx`, shared by several DETAIL screens —
//     carries no such escape today (checked directly, by hand, while writing
//     this law: neither file matches the escape signature), so there is
//     nothing to widen the scope to catch yet. If one of them ever grows a
//     real escape, it will not turn this build red on its own; it needs
//     either its own line in `CONTENT_INSET_EXEMPT`-shaped review or a
//     deliberate widening of the file set this test reads.
//   - It is scoped to the AGENCY app (`web/`) only. The client portal
//     (`web-portal/`) has its own shell (`portal-shell.tsx`) and its own
//     page-width law (R29's `PAGE_WIDTH_OWNER` names it separately); this
//     law does not claim anything about it.
//   - It is a SOURCE census, not a live measurement. It cannot see a
//     genuinely dynamic escape built at runtime from a variable className
//     (none exist in this app today — every real example, in this codebase
//     and in the vendored kit, is a literal string) — and it cannot replace
//     the live Playwright proof this session ran against staging, which is
//     what actually found today's numbers. A source check proves the CODE
//     carries no cancelling pattern; it does not re-measure pixels.

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { stripComments } from "@shared/rules/source-scan"
import { CONTENT_INSET_EXEMPT, type ContentInsetExempt } from "@shared/rules/registry"

const HERE = __dirname
const WEB = join(HERE, "..") // web/
const ROOT = join(WEB, "..") // repo root
const read = (p: string) => readFileSync(p, "utf8")

// ── (i) the screen registry, derived from the app's own router ─────────────

/** The three files that dispatch a `module` string to the component that
 * actually renders it — the whole of this app's router, for the purpose of
 * "what is a screen". Every module the app can route to necessarily imports
 * its host component into one of these three, or it cannot render at all. */
const DISPATCHERS = [
  join(WEB, "components", "deep-link", "collection-content.tsx"),
  join(WEB, "components", "deep-link", "module-content.tsx"),
  join(WEB, "components", "deep-link", "deep-link-screen.tsx"),
]

/** One local-component import line: `import { A, B } from "@/components/x"`. */
const IMPORT_LINE = /^import\s*\{([^}]+)\}\s*from\s*"(@\/components\/[^"]+)"/gm

/** A screen-shaped component name — the JSX-component convention (leading
 * capital) plus one of the three suffixes every screen host in this app
 * actually carries. Deliberately excludes helper imports from the same
 * files (`NotFound`, `LoadError`, `NoAccess`, `ActivityRail`,
 * `IMPORT_TARGET_LABEL`, `moduleSettingsPage`) — none of them end this way. */
const SCREEN_NAME = /^[A-Z]\w*(Screen|Collection|Detail\w*)$/

interface ScreenRef {
  name: string
  /** The import specifier as written, e.g. "@/components/accounts/accounts-screen". */
  specifier: string
  /** Path relative to the repo root, e.g. "web/components/accounts/accounts-screen.tsx". */
  rel: string
  abs: string
}

function screenRegistry(): ScreenRef[] {
  const out = new Map<string, ScreenRef>()
  for (const dispatcher of DISPATCHERS) {
    const src = read(dispatcher)
    const re = new RegExp(IMPORT_LINE.source, "gm")
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) {
      const names = m[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      const specifier = m[2]
      for (const name of names) {
        if (!SCREEN_NAME.test(name)) continue
        const rel = specifier.replace(/^@\//, "web/") + ".tsx"
        const abs = join(ROOT, rel)
        out.set(`${rel}:${name}`, { name, specifier, rel, abs })
      }
    }
  }
  return [...out.values()]
}

// ── (ii) the negative census: no screen fights the inherited inset ─────────

/** The app's own full-bleed escape idiom (`shared/ui`'s `--pane-inset-x` /
 * `--pane-escape-x` mechanism) — the only sanctioned way a caller reaches
 * past the pane's own padding — plus the blunt, tokenless equivalents
 * (`w-screen`, `100vw`) held to the same standard. This is the one pattern a
 * screen's own host file could plausibly use to CANCEL the inset it is
 * handed for free; it is rare and specific enough that a match is always a
 * genuine finding, the same discipline R29's own `mx-auto`+`w-full`+`max-w-*`
 * triple relies on. */
const ESCAPE_SIGNATURE = /-mx-\[(?:var\(--pane|calc\(-1)|(?<![-\w])w-screen\b|\b100vw\b/

interface Finding {
  rel: string
  line: string
}

function escapeFindings(registry: ScreenRef[]): Finding[] {
  const out: Finding[] = []
  const seen = new Set<string>()
  for (const s of registry) {
    if (seen.has(s.rel)) continue
    seen.add(s.rel)
    if (!existsSync(s.abs)) continue // reported by its own assertion below
    const lines = stripComments(read(s.abs)).split("\n")
    lines.forEach((line) => {
      if (ESCAPE_SIGNATURE.test(line)) out.push({ rel: s.rel, line: line.trim() })
    })
  }
  return out
}

function excused(entries: ContentInsetExempt[], rel: string, line: string): ContentInsetExempt | undefined {
  return entries.find((e) => e.file === rel && line.includes(e.contains))
}

function stillOpen(all: Finding[], rel: string, contains: string): boolean {
  return all.some((f) => f.rel === rel && f.line.includes(contains))
}

describe("R109, every screen carries the app's content inset", () => {
  it("the screen registry is derived from the router and is not empty", () => {
    const registry = screenRegistry()
    const names = new Set(registry.map((s) => s.name))
    expect(
      registry.length,
      "the router-derived screen registry came back with too few entries — the derivation broke " +
        "(collection-content.tsx / module-content.tsx / deep-link-screen.tsx no longer import their " +
        "screens the way this census expects)"
    ).toBeGreaterThanOrEqual(20)
    // A spot check for the two files this session actually measured live —
    // if either goes missing, the census silently stopped covering the exact
    // screen this law was written about.
    expect(names.has("AccountsScreen"), "AccountsScreen must be in the derived registry").toBe(true)
    expect(names.has("AccountDetailScreen"), "AccountDetailScreen must be in the derived registry").toBe(true)
    for (const s of registry) {
      expect(existsSync(s.abs), `${s.rel} is imported by a dispatcher (as ${s.name}) but does not exist on disk`).toBe(
        true
      )
    }
  })

  it("no screen host file cancels the shell's content inset without a reasoned exemption", () => {
    const registry = screenRegistry()
    const found = escapeFindings(registry)
    const unexempt = found.filter((f) => !excused(CONTENT_INSET_EXEMPT, f.rel, f.line))
    expect(
      unexempt,
      "these screens carry a full-bleed escape (-mx-[var(--pane…)], w-screen or 100vw) that cancels the " +
        "24px inset every screen inherits for free from ScreenShell. Remove it, reapply a matching padding " +
        "the way the kit's own record footer band does, or name it in CONTENT_INSET_EXEMPT " +
        "(shared/rules/registry.ts) with the reason:\n  " +
        unexempt.map((f) => `${f.rel}  ${f.line}`).join("\n  ")
    ).toEqual([])
  })

  it("CONTENT_INSET_EXEMPT names only real, still-open findings", () => {
    const registry = screenRegistry()
    const all = escapeFindings(registry)
    const stale = CONTENT_INSET_EXEMPT.filter((e) => !stillOpen(all, e.file, e.contains))
    expect(
      stale,
      "these CONTENT_INSET_EXEMPT entries no longer match a real finding — fixed, or the source moved on, " +
        "delete the entry:\n  " + stale.map((e) => `${e.file}  ${e.contains}`).join("\n  ")
    ).toEqual([])
  })

  it("an exemption's contains matches only one line in its file", () => {
    const registry = screenRegistry()
    const byRel = new Map(registry.filter((s) => existsSync(s.abs)).map((s) => [s.rel, stripComments(read(s.abs)).split("\n")]))
    const ambiguous: string[] = []
    for (const e of CONTENT_INSET_EXEMPT) {
      const lines = byRel.get(e.file) ?? []
      const hits = lines.filter((l) => l.includes(e.contains))
      if (hits.length > 1) ambiguous.push(`${e.file}  "${e.contains}" matches ${hits.length} lines`)
    }
    expect(
      ambiguous,
      "a CONTENT_INSET_EXEMPT entry excuses more than one site in its file — make it specific:\n  " +
        ambiguous.join("\n  ")
    ).toEqual([])
  })

  // PROVEN NOT VACUOUS, against synthetic source only — the same discipline
  // id-chip-is-black.test.ts and no-em-dash.test.ts hold their own censuses
  // to, so a regex typo cannot silently turn this whole file into a no-op.
  it("catches a synthetic escape (proof the census is not vacuous)", () => {
    const synthetic = [
      "export function FakeAccountsScreen() {",
      '  return <div className="-mx-[var(--pane-inset-x,0px)] px-[var(--pane-inset-x,0px)]">hi</div>',
      "}",
      "",
    ].join("\n")
    const lines = synthetic.split("\n")
    const idx = lines.findIndex((l) => ESCAPE_SIGNATURE.test(l))
    expect(idx).toBeGreaterThan(-1)
    // and a plain screen with no escape at all draws nothing.
    const clean = ["export function FakeTicketsScreen() {", "  return <div>hi</div>", "}", ""].join("\n")
    expect(clean.split("\n").some((l) => ESCAPE_SIGNATURE.test(l))).toBe(false)
  })

  // ── (iii) the inset-bearing element itself, positively ───────────────────

  it("app-shell.tsx routes every screen through exactly one, unconditional ScreenShell", () => {
    const src = stripComments(read(join(WEB, "components", "shell", "app-shell.tsx")))
    const mounts = src.match(/<ScreenShell\b/g) ?? []
    expect(
      mounts.length,
      "app-shell.tsx must mount <ScreenShell> exactly once — a second mount is a second, possibly " +
        `unpadded, path a screen could render through (found ${mounts.length})`
    ).toBe(1)
  })

  it("the kit's SHELL_CONTENT_INSET_X is pinned to px-[var(--space-4)] sm:px-[var(--space-6)] and both densities spend it", () => {
    const src = stripComments(
      read(join(ROOT, "shared", "ui", "compositions", "templates", "screen-shell.tsx"))
    )
    expect(
      /const SHELL_CONTENT_INSET_X\s*=\s*"px-\[var\(--space-4\)\] sm:px-\[var\(--space-6\)\]"/.test(src),
      "shared/ui's SHELL_CONTENT_INSET_X moved off px-[var(--space-4)] sm:px-[var(--space-6)] — the base " +
        "inset every screen inherits changed size or identifier; re-measure live and update this pin (a " +
        "kit change, so it lands upstream in kwapso-design, never edited here — see shared/ui/VERSION.json). " +
        "M7 (25 Sep 2026, documents/ui-rulebook/30-9-mobile.md) is why this is now one shell default at two " +
        "widths rather than one width — still no per-screen number."
    ).toBe(true)
    const bodyIdx = src.indexOf("const DENSITY_BODY")
    expect(bodyIdx, "const DENSITY_BODY not found in screen-shell.tsx").toBeGreaterThan(-1)
    const windowLines = src.slice(bodyIdx, bodyIdx + 600).split("\n")
    const comfortable = windowLines.find((l) => /^\s*comfortable:/.test(l))
    const calm = windowLines.find((l) => /^\s*calm:/.test(l))
    expect(comfortable, "DENSITY_BODY.comfortable not found").toBeTruthy()
    expect(calm, "DENSITY_BODY.calm not found").toBeTruthy()
    expect(
      comfortable?.includes("SHELL_CONTENT_INSET_X"),
      "DENSITY_BODY.comfortable must spend SHELL_CONTENT_INSET_X — a screen rendered at comfortable " +
        "density would lose the inset otherwise"
    ).toBe(true)
    expect(
      calm?.includes("SHELL_CONTENT_INSET_X"),
      "DENSITY_BODY.calm must spend SHELL_CONTENT_INSET_X — a screen rendered at calm density would " +
        "lose the inset otherwise"
    ).toBe(true)
  })

  it("the pane's own stack, the element a screen's content actually renders into, spends DENSITY_BODY[density]", () => {
    const src = stripComments(
      read(join(ROOT, "shared", "ui", "compositions", "templates", "screen-shell.tsx"))
    )
    const stackIdx = src.indexOf('data-slot="screen-shell-stack"')
    expect(stackIdx, 'data-slot="screen-shell-stack" not found in screen-shell.tsx').toBeGreaterThan(-1)
    // The className block sits within a short stretch of source right after
    // the data-slot attribute (a handful of JSX lines, not the whole file) —
    // this is what stops the check from passing merely because
    // DENSITY_BODY[density] is mentioned SOMEWHERE in the file, on some
    // other element entirely.
    const window = src.slice(stackIdx, stackIdx + 400)
    expect(
      /DENSITY_BODY\[density\]/.test(window),
      'the element carrying data-slot="screen-shell-stack" — the pane a screen\'s own content actually ' +
        "renders into — does not spend DENSITY_BODY[density] in its own className. The inset would no " +
        "longer reach a screen's content even though the token still exists elsewhere in the file."
    ).toBe(true)
  })
})
