// THE LAW MACHINERY'S OWN GUARD.
//
// Every law in this repo is a source scan, and every source scan stands on two
// things: a walk that finds the files, and a stripper that removes the prose. Both
// used to exist in many copies.
//
// The walk: thirteen test files hand-rolled a recursive readdirSync, filtering
// differently. web/test/rules.test.ts enforced R3/R4/R7/R16 over a RECURSIVE walk
// of web/components (three subdirectories); web-portal/test/rules.test.ts enforced
// the same four laws over a FLAT read of web-portal/components. Both said "every
// component". The portal's folder is flat, so both were green — and the first
// portal component to move into a subdirectory would have left them green and
// wrong.
//
// The stripper: `stripComments` existed EIGHT times — three named copies (one of
// them guarding the mcp worker, the external machine surface) and five inline
// repetitions of the same two regexes. Harden one and the other seven are checks
// that only look like it.
//
// So this file guards the guard: the walker behaves as its options say, there is
// exactly ONE stripComments, and the one genuinely different stripper (JSONC, for
// JSON.parse) is proved to be a different job rather than a straggler.

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { sourceFiles, stripComments, stripJsoncComments } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const ROOT = join(WEB, "..")
const COMPONENTS = join(WEB, "components")

describe("the one walker every law reads source through", () => {
  it("RECURSES by default — the whole reason it exists", () => {
    const all = sourceFiles(COMPONENTS, { extensions: [".tsx"] })
    const nested = all.filter((f) => f.rel.includes("/"))
    // web/components is ENTIRELY subdirectories since the 7 Sep 2026 fold (one
    // folder per module or kind). A walk that stopped at the top level would
    // enforce the UI laws on nothing and report success for all of it.
    expect(
      nested.length,
      "web/components has subdirectories — a default walk must reach into them"
    ).toBeGreaterThan(100)
    // ENTIRELY, which is the half this asserted for nothing. ">100 nested" stays
    // true the moment somebody drops one file back at the top level, and
    // UI-CONVENTIONS.md's "web/components has no top-level files" would then be a
    // sentence nothing held. The fold is only worth keeping if it cannot leak
    // back one file at a time.
    const top = all.filter((f) => !f.rel.includes("/")).map((f) => f.rel)
    expect(
      top,
      "web/components has no top-level files (UI-CONVENTIONS.md) — put it in its module's folder"
    ).toEqual([])
    // …and the top level is still read where there is one: web/lib keeps its
    // files flat beside one `api/` folder, so both halves of the walk show here.
    const lib = sourceFiles(join(WEB, "lib"), { extensions: [".ts", ".tsx"] })
    expect(lib.some((f) => !f.rel.includes("/")), "web/lib's own top-level files").toBe(true)
    expect(lib.some((f) => f.rel.includes("/")), "web/lib/api/, one level down").toBe(true)
  })

  it("`recursive: false` means flat, and the difference is real", () => {
    const deep = sourceFiles(COMPONENTS, { extensions: [".tsx"] })
    const flat = sourceFiles(COMPONENTS, { extensions: [".tsx"], recursive: false })
    expect(flat.every((f) => !f.rel.includes("/")), "a flat walk returns no nested file").toBe(true)
    // If these two ever agreed, this suite would be asserting nothing.
    expect(flat.length).toBeLessThan(deep.length)
  })

  it("takes exactly the extensions it is given", () => {
    const tsx = sourceFiles(join(WEB, "lib"), { extensions: [".tsx"] })
    const ts = sourceFiles(join(WEB, "lib"), { extensions: [".ts"] })
    expect(ts.length, "web/lib is full of .ts").toBeGreaterThan(5)
    expect(tsx.every((f) => f.rel.endsWith(".tsx"))).toBe(true)
    expect(ts.every((f) => f.rel.endsWith(".ts"))).toBe(true)
    expect(sourceFiles(join(WEB, "lib"), { extensions: [".ts", ".tsx"] }).length).toBe(
      ts.length + tsx.length
    )
  })

  it("`skipTests` leaves the checks out of what is being checked", () => {
    const withTests = sourceFiles(HERE, { extensions: [".ts"] })
    const without = sourceFiles(HERE, { extensions: [".ts"], skipTests: true })
    expect(withTests.length, "web/test is full of .test.ts").toBeGreaterThan(10)
    expect(without.some((f) => f.rel.endsWith(".test.ts"))).toBe(false)
    expect(without.length).toBeLessThan(withTests.length)
  })

  it("never wanders into node_modules or a build directory", () => {
    // A walk that descends into node_modules is not a slow check, it is a hung
    // one — and every hand-rolled walker had to remember this separately.
    const files = sourceFiles(WEB, { extensions: [".json"] })
    expect(files.length, "web/ has package.json at least").toBeGreaterThan(0)
    const strayed = files.filter((f) => /(^|\/)(node_modules|\.next|out|dist)\//.test(f.rel))
    expect(strayed.map((f) => f.rel), "the walk escaped into a skipped directory").toEqual([])
  })

  it("reports a stable order, so a failure names its offenders the same way twice", () => {
    const once = sourceFiles(COMPONENTS, { extensions: [".tsx"] }).map((f) => f.rel)
    expect(once).toEqual([...once].sort())
  })
})

/** WHO MAY STRIP A COMMENT BY HAND. One entry, and it is not TypeScript at all:
 * a CSS comment is `/*` … `*\u200b/` and CSS has no line comment, so running the
 * TypeScript stripper over a token value would delete a `//` that CSS reads as
 * part of a URL. Everything else that used to do this has been moved onto the
 * shared one — see the census below for why. */
const HAND_ROLLED_STRIPPER_OK: Record<string, string> = {
  "web/test/theme-tokens.test.ts":
    "strips a CSS comment out of a CSS custom property's VALUE, read from tokens.css. Not TypeScript: `//` is not a comment in CSS, it is the middle of a url(), so the shared stripper is the wrong tool here and would silently eat one",
  /* THE ROT CHECK WORKED, AND THIS IS WHAT IT LOOKS LIKE — 8 Sep 2026.
   *
   * `build-tokens.mjs` was listed here on 7 Sep, with the note that "if a kit
   * sync ever removes it this line goes red and gets deleted". Kit v1.2.69 did
   * exactly that: it lifted the token walk out into `token-model.mjs` so the
   * generator and the new contrast law resolve tokens through ONE reader, and
   * the stripper went with it. The line went red on the first check after the
   * sync and is deleted here. Nothing was lost — the same CSS case simply
   * lives in different files now, named below. */
  "shared/ui/foundations/tokens/token-model.mjs":
    "the VENDORED KIT's token reader, and the same CSS case the entry above was written for: it walks `tokens.css`, where `//` is not a comment but the middle of a `url()`, so the shared TypeScript stripper is the wrong tool and would silently eat one. `shared/ui/` is a dependency this repo may not hand-edit at all — `web/test/vendored-kit.test.ts` recomputes its content hash — so this can only ever be fixed upstream, and a kit sync that moves it will turn this line red exactly as the last one did",
  "shared/ui/foundations/tokens/check-contrast.mjs":
    "the kit's contrast law, reading the same `tokens.css` through the same CSS rules as the reader above. It is the check that found three surfaces painting themselves onto themselves on 7-8 Sep 2026; it cannot import a TypeScript stripper from an app that vendors it, and the CSS case is not what that stripper is for",
}

/** Every .ts/.tsx in the repo's own source — both front ends, every worker, and
 * shared/. Uses the walker under test, which is fine: if the walk were broken the
 * suite above is already red. */
const repoSources = () =>
  sourceFiles(
    [join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "workers"), join(ROOT, "shared")],
    { extensions: [".ts", ".tsx"], relativeTo: ROOT }
  )

/** EVERYTHING OF OURS THAT COULD HOLD A SECOND STRIPPER — deliberately a wider
 * net than repoSources(), and the widening IS the fix.
 *
 * repoSources() is .ts/.tsx under the two front doors, the workers and shared/,
 * because that is the source the property tests at the bottom of this file run
 * the stripper OVER. But "is there a second stripper?" is a different question:
 * it is not about what the laws read, it is about what any of our own code DOES.
 *
 * That census missed the worst copy in the repo for exactly two reasons at once,
 * until 7 Sep 2026. `scripts/` was not a root, and `.mjs` was not an extension —
 * so `scripts/smoke-portal.mjs` re-typed both regexes and nothing looked. It is
 * the LAST step of `deploy:staging`, and it uses them to derive the R24
 * internal-money door list off disk and then attack every one of those doors on
 * a live environment. A blind stripper there does not produce a WRONG list of
 * doors, it produces a SHORT one, and a short list of doors to attack passes —
 * at deploy time, with a green line printed under it.
 *
 * So `scripts/` and `tools/` are roots, and `.mjs` counts. Both directories run
 * inside `npm run check` (scripts through the suites that spawn them, tools
 * through its own tsc project), and neither was ever exempt from the rule — only
 * from the census that reads it. */
const everySourceOfOurs = () =>
  sourceFiles(
    [
      join(ROOT, "web"),
      join(ROOT, "web-portal"),
      join(ROOT, "workers"),
      join(ROOT, "shared"),
      join(ROOT, "scripts"),
      join(ROOT, "tools"),
    ],
    { extensions: [".ts", ".tsx", ".mjs"], relativeTo: ROOT }
  )

describe("there is exactly one comment stripper", () => {
  it("the census can see `scripts/` and `.mjs` — where the last copy hid", () => {
    // A census that cannot reach the offender reports "all clear" in exactly the
    // words it uses for "all correct". This asserts the net itself, before any
    // of the questions asked through it, and it names the two files that made the
    // hole: the deploy gate, and the tokeniser it now imports.
    const rels = new Set(everySourceOfOurs().map((f) => f.rel))
    expect(rels.has("scripts/smoke-portal.mjs"), "the deploy gate must be in the census").toBe(true)
    expect(rels.has("shared/rules/strip-comments.mjs"), "…and so must the tokeniser").toBe(true)
    const scripts = [...rels].filter((r) => r.startsWith("scripts/"))
    expect(scripts.length, "scripts/ is full of .mjs — this must not be a short read").toBeGreaterThan(50)
    expect(
      everySourceOfOurs().length,
      "the wide census must be strictly wider than the .ts/.tsx one"
    ).toBeGreaterThan(repoSources().length)
  })

  it("only shared/rules/strip-comments.mjs declares one", () => {
    // It moved out of source-scan.ts on 7 Sep 2026 and into plain JavaScript, so
    // that `scripts/*.mjs` — which run under plain node with no build step — can
    // import the same code the laws do instead of re-typing it. source-scan.ts
    // re-exports it, so every TypeScript caller is unchanged; a re-export is not
    // a declaration and must not be counted as one.
    const declared = everySourceOfOurs()
      .filter((f) => /(?:function|const)\s+stripComments\b/.test(f.source))
      .map((f) => f.rel)
    expect(declared.length, "the scan found no declaration at all — it has gone blind").toBe(1)
    expect(declared).toEqual(["shared/rules/strip-comments.mjs"])
  })

  it("and source-scan.ts still hands it to every TypeScript caller", () => {
    // The compatibility half of the move. Forty-odd suites import the stripper
    // from "@shared/rules/source-scan" and none of them changed; if this
    // re-export were dropped the failure would be a compile error in every one of
    // them, which is loud — but the line is cheap and states the intent.
    const scan = everySourceOfOurs().find((f) => f.rel === "shared/rules/source-scan.ts")
    expect(scan, "source-scan.ts must exist").toBeDefined()
    expect(scan?.source).toContain('export { stripComments, stripJsoncComments } from "./strip-comments.mjs"')
  })

  it("the deploy gate reads source through the shared tokeniser, not its own", () => {
    // NAMED, like the mcp gating seam below, because of what it does with the
    // answer: scripts/smoke-portal.mjs derives the R24 internal-money door list
    // off disk and then proves each door is refused at BOTH hostnames on a live
    // environment. It ran the two regexes until 7 Sep 2026 — a deploy gate
    // deciding which doors to attack from source it could not fully see.
    const gate = everySourceOfOurs().find((f) => f.rel === "scripts/smoke-portal.mjs")
    expect(gate, "the portal smoke must exist — it is the last step of deploy:staging").toBeDefined()
    expect(
      gate?.source,
      "it must import the one tokeniser (the .mjs directly: this file runs under plain node)"
    ).toContain('from "../shared/rules/strip-comments.mjs"')
  })

  it("the declaration file and the implementation export the same names", () => {
    // The one seam the move introduced, so the one place it can drift. The
    // implementation is .mjs with JSDoc; the nine worker tsconfigs have `allowJs`
    // off and will not open a .mjs at all, so the TypeScript callers read
    // strip-comments.d.mts instead. Two files, one contract — checked, not
    // trusted. (Its header carries the measured TS7016 that forced it.)
    const impl = everySourceOfOurs().find((f) => f.rel === "shared/rules/strip-comments.mjs")
    const dts = readFileSync(join(ROOT, "shared", "rules", "strip-comments.d.mts"), "utf8")
    const named = (src: string, re: RegExp) => [...src.matchAll(re)].map((m) => m[1]).sort()
    const exported = named(stripComments(impl?.source ?? ""), /export\s+function\s+(\w+)/g)
    const declared = named(dts, /export\s+declare\s+function\s+(\w+)/g)
    expect(exported, "the implementation must export something — this has gone blind").not.toEqual([])
    expect(declared, "the declaration file and the implementation have drifted apart").toEqual(exported)
  })

  it("nobody re-types its regexes inline instead", () => {
    // The inline copies are the ones nothing NAMES, so nothing can find them.
    // This looks for the two regexes themselves, written out anywhere.
    //
    // It used to look for the LINE one alone, and that is how eleven more copies
    // of the BLOCK one sat behind a green check: `.replace(/…/g, "")` on its own
    // does not mention the line pattern, so the census walked straight past it.
    // Every one of them carried the `accept="image/*"` blindness, and each was
    // guarding a real law — the portal's R3/R4/R7/R16 suite among them. Both
    // halves are matched now. The patterns are assembled from pieces so this file
    // does not report itself.
    //
    // AND IT RUNS OVER `everySourceOfOurs()` RATHER THAN `repoSources()`, which
    // is the second widening and the one that took a year: matching both halves
    // still only ever looked at .ts/.tsx under web/, web-portal/, workers/ and
    // shared/, so the twelfth copy — `scripts/smoke-portal.mjs`, a DEPLOY GATE —
    // was outside the net by directory and by extension at the same time.
    const LINE_REGEX = "replace(/(^|[^:])" + "\\/\\/" + "[^\\n]*/gm"
    const BLOCK_REGEX = "/" + "\\/\\*[\\s\\S]*?\\*\\/" + "/g"
    const offenders = everySourceOfOurs()
      .filter((f) => f.source.includes(LINE_REGEX) || f.source.includes(BLOCK_REGEX))
      .map((f) => f.rel)
      .filter((rel) => !HAND_ROLLED_STRIPPER_OK[rel])
    expect(
      offenders,
      `these re-type the shared stripper instead of importing it — every one of ` +
        `them is blind to a comment marker inside a string: ${offenders.join(", ")}`
    ).toEqual([])
  })

  it("nobody hand-writes the walk either", () => {
    // The third shape, and the one both patterns above walk straight past:
    // web/test/one-black-chip.test.ts wrote the whole stripper as a character
    // loop — `raw.indexOf("*​/", i)`, `raw.startsWith("//", i)` — because the
    // shared one closed the file up and its pins are `path:line`. It inherited
    // the blindness exactly: `accept="image/*"` opened a comment and the sixty
    // lines under it were blanked. The shared one keeps line numbers now, so
    // that reason is gone; handling the CLOSING token at all is the tell, and
    // there are only two places it may appear.
    const CLOSER = '"' + "*" + '/"'
    // strip-comments.mjs, not source-scan.ts: the tokeniser moved next door into
    // plain JavaScript on 7 Sep 2026 so the scripts could import it. Same two
    // places, and the second is still this file's own deliberately dumb oracle.
    // …and a third, from the VENDORED KIT, added 8 Sep 2026. `ground-map.mjs`
    // derives which fill sits on which surface by reading component JSX, so it
    // handles the closing token itself. It is inside `shared/ui/`, which this
    // repo may not hand-edit at all — `web/test/vendored-kit.test.ts` recomputes
    // the content hash — and the shared tokeniser is not published to the kit,
    // so importing it is not available either. The loop below rot-checks all
    // three the same way: an entry that stops handling the token turns red.
    const allowed = new Set([
      "shared/rules/strip-comments.mjs",
      "web/test/source-scan.test.ts",
      "shared/ui/foundations/tokens/ground-map.mjs",
    ])
    const offenders = everySourceOfOurs()
      .filter((f) => f.source.includes(CLOSER) && !allowed.has(f.rel))
      .map((f) => f.rel)
    expect(
      offenders,
      `these decide for themselves where a comment ends: ${offenders.join(", ")}`
    ).toEqual([])
    // …and both of the two really do, so this is not passing over an empty set.
    for (const rel of allowed)
      expect(
        everySourceOfOurs().some((f) => f.rel === rel && f.source.includes(CLOSER)),
        `${rel} was the tokeniser (or the guard's own dumb oracle) — it has moved`
      ).toBe(true)
  })

  it("every hand-rolled stripper still listed is really still there", () => {
    // Rot check, so the list can only shrink.
    const BLOCK_REGEX = "/" + "\\/\\*[\\s\\S]*?\\*\\/" + "/g"
    const present = new Set(
      everySourceOfOurs()
        .filter((f) => f.source.includes(BLOCK_REGEX))
        .map((f) => f.rel)
    )
    for (const [rel, why] of Object.entries(HAND_ROLLED_STRIPPER_OK)) {
      expect(present.has(rel), `HAND_ROLLED_STRIPPER_OK lists ${rel}, which no longer has one`).toBe(
        true
      )
      expect(why.length, `${rel} strips comments by hand — that needs a real reason`).toBeGreaterThan(40)
    }
  })

  it("the mcp worker's gating seam is one of the callers", () => {
    // Named on purpose. It is the check that guards the EXTERNAL machine surface,
    // and it is the copy that survived the last consolidation.
    const seam = repoSources().find((f) => f.rel === "workers/mcp/test/gating-seam.test.ts")
    expect(seam, "the mcp gating seam must exist").toBeDefined()
    expect(seam?.source).toContain('from "@shared/rules/source-scan"')
  })

})

// WHO MAY READ A DIRECTORY DIRECTLY.
//
// A hand-rolled walker can only appear where readdirSync is called, so that call
// is the choke point. Everything that reads SOURCE goes through sourceFiles();
// what is left is a handful of ROSTER reads — "which workers are on disk?" —
// which list directories and never descend. Each is a conscious line with a
// reason, exactly like every other deny-list in this codebase, and adding one is
// meant to be a decision somebody makes on purpose.
const DIRECT_READDIR: Record<string, string> = {
  "shared/rules/source-scan.ts": "the one walker itself — this is where the recursion lives",
  "web/test/no-icloud-conflict-copies.test.ts":
    "the conflict-copy guard looks for files sourceFiles() is built to ignore — whole DUPLICATED DIRECTORIES and non-source bytes like `components 2/` inside the vendored kit and `routes.d 2.ts` under the build output. The one walker filters to our source extensions and skips build directories, which is exactly where iCloud's copies land, so routing this through it would make the guard blind to every case it exists to catch",
  "web/test/vendored-kit.test.ts":
    "the hand-edit guard hashes EVERY delivered byte of the vendored kit — css, svg, fonts, json, not just source — and must walk byte-for-byte the same way scripts/sync-design.mjs does, or the two hashes drift and the guard lies",
  "web/test/rules.test.ts":
    "roster read: lists the worker directories to build the scan's roots, then hands them to sourceFiles",
  "web/test/config-vars.test.ts":
    "roster read: the same per-worker src/ roots for the server-side env-var scan",
  "web/test/doc-claims.test.ts":
    "the repo-root .md files (a deliberately flat set — the canon lives at the root) plus the worker roster",
  "workers/content/test/media-keys.test.ts":
    "roster read: the same per-worker src/ roots, for the media-key scan",
  "workers/data-ops/test/error-seam.test.ts":
    "roster read, and it defines a worker as a directory with a src/index.ts — which is the question this suite asks",
  "workers/gateway/test/public-surface.test.ts":
    "roster read, and it defines a worker as a directory with a wrangler.jsonc — which is the question this suite asks",
  "web/test/linked-emails.test.ts":
    "roster read, twice: the per-worker src/ roots it hands to sourceFiles to find every email-composing function, and the worker directories whose wrangler.jsonc must carry the portal's own origin",
  "workers/data-ops/test/no-quiet-downgrade.test.ts":
    "roster read, and it defines a worker exactly as public-surface.test.ts does — a directory with a wrangler.jsonc — because the question it asks is 'does ANY config pin an engine the code does not name', and enumerating them is the whole point: the failure it guards is somebody adding a THIRD config, not somebody forgetting the second",
  "workers/tenancy/test/activity-trail.test.ts":
    "roster read: the per-worker src/ roots plus shared/workers, handed to sourceFiles — the whole surface that can write to the activity table, because the writers are spread across three workers and the point of the census is that no worker is an exception",
  "web/test/named-paths.test.ts":
    "roster read, and the roster IS the law: R58 asks whether a path this repo NAMES resolves, so the set of names it will accept has to be the repository's own top-level folders read off disk. A hand-typed list is the exact fault that was fixed on 9 Sep 2026 — the old pattern's folder list had fallen behind the tree and `db/`, `tools/`, `types/` and `documents/` were invisible to it. It lists the root and never descends; every file it then READS goes through sourceFiles",
  "web/test/backup-covers-r2.test.ts":
    "roster read: the workers with a wrangler.jsonc, to build the src/ roots it then hands to sourceFiles and to find each one's r2_buckets",
}

describe("no law walks a directory tree by hand", () => {
  const callers = () =>
    sourceFiles(
      [join(ROOT, "web"), join(ROOT, "web-portal"), join(ROOT, "workers"), join(ROOT, "shared")],
      { extensions: [".ts", ".tsx"], relativeTo: ROOT }
    ).filter((f) => /(?<![\w$])readdirSync\s*\(/.test(stripComments(f.source)))

  it("finds the readdirSync callers (the scan itself must not go blind)", () => {
    expect(callers().length).toBeGreaterThan(3)
  })

  it("every direct readdirSync is one of the reviewed roster reads", () => {
    const unlisted = callers()
      .map((f) => f.rel)
      .filter((rel) => !DIRECT_READDIR[rel])
    expect(
      unlisted,
      `these read a directory themselves — read source through sourceFiles() from ` +
        `@shared/rules/source-scan, or add a reasoned DIRECT_READDIR line: ${unlisted.join(", ")}`
    ).toEqual([])
  })

  it("every reviewed line still names a file that really does it (no rotting entries)", () => {
    const actual = new Set(callers().map((f) => f.rel))
    for (const rel of Object.keys(DIRECT_READDIR))
      expect(actual.has(rel), `DIRECT_READDIR lists ${rel}, which no longer calls readdirSync`).toBe(
        true
      )
  })

  it("every reviewed line states a real reason", () => {
    for (const [rel, why] of Object.entries(DIRECT_READDIR))
      expect(why.length, `${rel} reads a directory directly — that needs a real reason`).toBeGreaterThan(20)
  })
})

describe("the two strippers are two jobs, and neither can do the other's", () => {
  // The gateway's public-surface suite parses every wrangler.jsonc to ask which
  // workers answer on a public address. It needs a stripper that keeps strings
  // byte-exact; the seam scans need one that is lossy and leaves template literals
  // alone. Both now live in source-scan.ts, named apart — these fixtures are the
  // reason, and they are what stops a later "tidy-up" folding them together.

  it("the seam-scan stripper is a HEURISTIC, and a config still goes through the other one", () => {
    // This fixture used to read: `{ "note": "a // b" }` comes back truncated,
    // because the seam-scan stripper was two regexes and knew nothing about
    // strings. That stopped being true on 7 Sep 2026 — it is a tokeniser now and
    // would parse that config perfectly well. Which is exactly the moment
    // somebody folds the two together, so here is the reason not to, restated:
    //
    // the JSONC one is EXACT BY CONSTRUCTION (it tracks one quote and one escape,
    // and you can read it and be sure), and its caller is about to JSON.parse the
    // result, where a lossy answer is not a weaker check but a wrong config. The
    // seam-scan one guesses — regex-versus-division, JSX-versus-comparison — and
    // is allowed to, because its caller is asking "does this file contain X". It
    // also keeps every line the comment spanned, which the JSONC one does not,
    // and that difference alone is enough to make their outputs different text.
    const cfg = '{\n  /* why\n     not */ "ok": 1\n}'
    expect(JSON.parse(stripJsoncComments(cfg)), "the exact one parses").toEqual({ ok: 1 })
    expect(
      stripComments(cfg).split("\n").length,
      "the seam one keeps the comment's lines, so a `path:line` pin holds"
    ).toBe(4)
    expect(
      stripJsoncComments(cfg).split("\n").length,
      "the exact one closes them up — fine for a parser, useless for an address"
    ).toBe(3)
  })

  it("the JSONC stripper cannot do the seam scan's job — it knows ONE quote", () => {
    // It tracks `"` and nothing else, so a `//` inside a SINGLE-quoted string is
    // read as a comment and the rest of that line goes with it. A seam scan run
    // through it would lose the door it is there to read.
    const src = "const url = 'https://kwapso.com/api' // a real comment"
    expect(stripJsoncComments(src), "it truncates the string").not.toContain("kwapso.com/api")
    expect(stripComments(src), "the seam one keeps the string whole").toContain(
      "https://kwapso.com/api"
    )
    expect(stripComments(src), "and still removes the real comment").not.toContain("a real comment")
  })

  it("the JSONC stripper would BLIND a seam scan — one stray quote and it stops stripping", () => {
    // A template literal holding SQL with an unbalanced double quote. The JSONC
    // stripper reads that quote as the start of a string and never sees a comment
    // again — so `// requireRight(x)` below it survives, and a gate check would be
    // satisfied by a comment naming the gate. That is the exact failure the seam
    // scans strip comments to prevent.
    const src = 'const sql = `WHERE name = " `\n// requireRight(x)\nhandler()'
    expect(stripJsoncComments(src), "the JSONC one leaves the comment standing").toContain(
      "requireRight(x)"
    )
    expect(stripComments(src), "the seam-scan one removes it").not.toContain("requireRight(x)")
  })

  it("the real configs parse through the JSONC one", () => {
    // Not a fixture — the actual files the law reads.
    for (const cfg of sourceFiles(join(ROOT, "workers"), { extensions: ["wrangler.jsonc"] })) {
      const parsed = JSON.parse(stripJsoncComments(cfg.source)) as { name?: string }
      expect(typeof parsed.name, `${cfg.rel} must parse to a worker config`).toBe("string")
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE STRIPPER KNOWS WHERE IT IS — proved in both directions, because a stripper
// is wrong in two ways and only one of them is loud.
//
// TOO MUCH is the silent one. Every law here asks "does this source contain X?",
// so source that was deleted before the law read it answers no, and no is what
// compliance looks like. `accept="image/*"` in web/components/apps/app-form-dialog.tsx
// opened a comment the old regex closed at a JSDoc sixty lines below; three
// `<Notes>` call sites, a `<Field>` and a `<FileUpload>` were gone before any law
// looked, and an agent's census of that file counted 15 sites where 18 exist and
// reported no problem.
//
// TOO LITTLE is the loud one, and it is not harmless either: this repo's comments
// DISCUSS the seams being scanned ("no requireRight — it's about you", "no LIMIT
// needed here"), so a law that reads the prose is a law that can be satisfied by
// its own documentation. A gate check passes on a handler whose gate was deleted,
// because a sentence below it says the word.
//
// So: fixtures for every shape that has bitten, then the same two questions asked
// again over every source file in the repo.
// ─────────────────────────────────────────────────────────────────────────────

describe("the stripper removes comments, and only comments", () => {
  /** THE EXACT SHAPE THAT BLINDED THE LAWS. A JSX attribute whose value contains
   * the two characters that open a block comment, a long stretch of ordinary
   * markup, and a real doc comment far below whose close is what the old regex
   * reached for. The marker in the middle is the thing that used to disappear. */
  const jsxWithAnImageAccept = [
    "export function AppFormDialog() {",
    "  return (",
    "    <Sheet>",
    '      <FileUpload accept="image/*" multiple={false} onFilesSelected={pickLogo} />',
    ...Array.from({ length: 55 }, (_, n) => `      <Field config={field${n}} />`),
    "      <Notes value={about} onChange={setAbout} />",
    "      {/* A real comment, and its close is what the old regex ran to. */}",
    "      <Notes value={notes} onChange={setNotes} />",
    "    </Sheet>",
    "  )",
    "}",
  ].join("\n")

  it("a JSX attribute is not a comment, and the sixty lines under it survive", () => {
    const stripped = stripComments(jsxWithAnImageAccept)
    expect(stripped, "the attribute itself is code and stays").toContain('accept="image/*"')
    expect(
      stripped,
      "THE MARKER SIXTY LINES BELOW — this is the line the old stripper deleted, and " +
        "its absence is what every census of that file was reading as compliance"
    ).toContain("<Notes value={about} onChange={setAbout} />")
    expect([...stripped.matchAll(/<Notes /g)].length, "both call sites, not one").toBe(2)
    expect([...stripped.matchAll(/<Field /g)].length, "every Field, not none").toBe(55)
  })

  it("…and the real comment among them is still gone", () => {
    // The inverse of the same fixture. A stripper that strips nothing passes the
    // test above and is just as broken.
    expect(stripComments(jsxWithAnImageAccept)).not.toContain("A real comment")
  })

  it("a commented-out violation cannot satisfy a law", () => {
    // The whole reason laws strip at all. Both comment shapes, both positions.
    const src = [
      "export async function postThing(req: Request) {",
      "  // requireRight(guard, 'help', 'write')",
      "  /* publishChange(env, teamId, 'help', id) */",
      "  return json({ ok: true })",
      "}",
    ].join("\n")
    const stripped = stripComments(src)
    expect(stripped, "a line comment naming the gate is not a gate").not.toContain("requireRight")
    expect(stripped, "nor is a block comment naming the publish").not.toContain("publishChange")
    expect(stripped, "and the code that IS there is untouched").toContain("json({ ok: true })")
  })

  it("a comment between two JSX attributes is a comment", () => {
    // 199 of these in the repo — the trivia between attributes is the ordinary
    // place a component explains a prop.
    const src = [
      "<DataTable<Row>",
      "  rows={rows}",
      "  /* Source order is the order. */",
      "  showSortControl={false}",
      "  // and this one too",
      "  selectable",
      "/>",
    ].join("\n")
    const stripped = stripComments(src)
    expect(stripped).not.toContain("Source order")
    expect(stripped).not.toContain("and this one too")
    expect(stripped, "the generic type argument is not the end of the tag").toContain(
      "showSortControl={false}"
    )
  })

  it("a `//` inside a string is not a comment, and a `*/` inside one closes nothing", () => {
    const src = [
      'const site = "https://kwapso.com"',
      'const glob = "image/*"',
      'const odd = "a */ b"',
      "const gate = requireRight(guard)",
    ].join("\n")
    const stripped = stripComments(src)
    expect(stripped).toContain('"https://kwapso.com"')
    expect(stripped).toContain('"image/*"')
    expect(stripped).toContain('"a */ b"')
    expect(stripped, "nothing below was swallowed").toContain("requireRight(guard)")
  })

  it("JSX text is text: an apostrophe is an apostrophe and a URL is a URL", () => {
    // Being string-aware is what makes `Don't` dangerous: a naive tokeniser opens
    // a string at the apostrophe and runs. A quoted string cannot cross a newline,
    // so a quote with no partner on its line was never a string opening.
    const src = [
      "export function Note() {",
      "  return (",
      "    <p>",
      "      Don't paste a link like https://kwapso.com/t/1 — it won't help.",
      "    </p>",
      "  )",
      "}",
      "// a real comment, and it must still go",
      "const gate = requireRight(guard)",
    ].join("\n")
    const stripped = stripComments(src)
    expect(stripped, "the prose is untouched").toContain("Don't paste a link like")
    expect(stripped, "the URL did not eat the rest of its line").toContain("it won't help.")
    expect(stripped, "and the real comment below still goes").not.toContain("a real comment")
    expect(stripped).toContain("requireRight(guard)")
  })

  it("a regex literal is not two comments", () => {
    // `/https?:\/\//` puts two slashes side by side in CODE, and `/\/\*/` puts a
    // comment opener there. The old line regex ate the rest of the line on the
    // first, which then moved every block-comment boundary below it out of step.
    const src = [
      "const URL_RE = /^https?:\\/\\//i",
      "const OPENER_RE = /\\/\\*/",
      "const gate = requireRight(guard)",
    ].join("\n")
    const stripped = stripComments(src)
    expect(stripped).toContain("/^https?:\\/\\//i")
    expect(stripped).toContain("/\\/\\*/")
    expect(stripped).toContain("requireRight(guard)")
  })

  it("division is division, and the comment after it still goes", () => {
    const src = "const half = total / 2 // half of it\nconst gate = requireRight(guard)"
    const stripped = stripComments(src)
    expect(stripped).toContain("total / 2")
    expect(stripped).not.toContain("half of it")
    expect(stripped).toContain("requireRight(guard)")
  })

  it("a template literal is left alone — R14 reads LIMIT out of one", () => {
    // The reason this stripper does not BLANK strings, only refuses to read
    // comments inside them. R14 reads the cap out of SQL held in a template.
    const src = [
      "const sql = `",
      "  SELECT id FROM help -- not a JS comment",
      "  WHERE url LIKE 'https://%'",
      "  LIMIT ${LIST_CAP}`",
      "// the cap is said in a comment too, and that one goes",
    ].join("\n")
    const stripped = stripComments(src)
    expect(stripped, "the bound R14 reads").toContain("LIMIT ${LIST_CAP}")
    expect(stripped).toContain("'https://%'")
    expect(stripped).not.toContain("the cap is said in a comment")
  })

  it("line numbers survive, so a `path:line` failure means what it says", () => {
    // The old one closed the file up: a block comment became one space and every
    // line under it moved. web/test/one-black-chip.test.ts hand-rolled a second
    // stripper for exactly this, and inherited the blindness with it.
    const src = ["const a = 1", "/* one", " * two", " */", "const b = 2"].join("\n")
    const lines = stripComments(src).split("\n")
    expect(lines.length, "five lines in, five lines out").toBe(5)
    expect(lines[4]).toContain("const b = 2")
    expect(lines.slice(1, 4).join("").trim(), "and the comment's own lines are empty").toBe("")
  })

  it("stripping twice changes nothing", () => {
    // A stripper whose output it cannot read again is one that invented syntax.
    const once = stripComments(jsxWithAnImageAccept)
    expect(stripComments(once)).toBe(once)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AND THE SAME TWO QUESTIONS OVER THE WHOLE REPO.
//
// A fixture proves the shapes somebody thought of. This asks every source file in
// the base, which is the only way to catch the shape nobody thought of — and the
// `image/*` one was in the tree for as long as the attribute was, unnoticed.
//
// The oracle here is deliberately DUMB and deliberately NOT the stripper: a line
// is treated as comment-ish only when it plainly is one (its `/*` or `//` sits at
// the start of the line, or after a space or an opening bracket), which is how
// every real comment in this repo is written and is exactly what `accept="image/*"`
// is NOT. Nothing else in the file is consulted, so this cannot agree with the
// stripper by sharing its mistake.
// ─────────────────────────────────────────────────────────────────────────────

/** A `/*` that could plausibly open a comment: at the start of the line, or after
 * whitespace or an opening bracket. In `accept="image/*"` it comes after `e`, and
 * in `"*​/*"` after `*` — so neither opens one here, which is the whole point. */
const PLAUSIBLE_BLOCK_OPENER = /(^|[\s{(,;=])\/\*/

/** Does this line, read on its own, look like the start of a multi-line comment? */
function opensAPlainBlockComment(raw: string): boolean {
  const at = raw.search(PLAUSIBLE_BLOCK_OPENER)
  return at !== -1 && !raw.slice(at).includes("*/")
}

/** A line with no comment marker on it and no comment above it holding it open.
 * Nothing about such a line may change. */
function linesThatCannotBeComments(source: string): { n: number; text: string }[] {
  const out: { n: number; text: string }[] = []
  let inside = false
  source.split("\n").forEach((raw, index) => {
    const held = inside
    if (inside) {
      if (raw.includes("*/")) inside = false
    } else if (opensAPlainBlockComment(raw)) inside = true
    if (held) return
    const text = raw.trim()
    if (!text) return
    if (text.startsWith("*")) return // a JSDoc continuation line
    if (raw.includes("//") || raw.includes("/*") || raw.includes("*/")) return
    out.push({ n: index + 1, text })
  })
  return out
}

/** The one line in the repo where a comment marker at the start of a line is NOT
 * a comment. Data, with its reason, and rot-checked below like every other
 * deny-list here — so it can only ever shrink. */
const COMMENT_MARKER_IN_A_STRING: Record<string, string> = {
  "workers/tenancy/test/migration-gate.test.ts":
    "a FIXTURE: the migration gate is handed a source string that contains `// a comment mentioning version:` precisely to prove the gate parses the array rather than text-matching. The marker is inside a template literal, so it is not a comment and must survive — if this ever stops being listed, the stripper started reading into template literals and R14's SQL is next",
}

describe("no law reads a file the stripper quietly shortened", () => {
  it("every source file comes out with exactly as many lines as it went in with", () => {
    // The cheapest half of the guard, and the one that fails first if anybody
    // reaches for a regex again: two regexes cannot preserve a line count.
    const wrong = repoSources()
      .filter((f) => stripComments(f.source).split("\n").length !== f.source.split("\n").length)
      .map((f) => f.rel)
    expect(wrong, `these came out a different length: ${wrong.slice(0, 5).join(", ")}`).toEqual([])
  })

  it("no line that cannot be a comment is ever lost", () => {
    // THE REGRESSION ITSELF. Under the old stripper this named 1,172 lines across
    // the base — the `<Notes>` call sites among them.
    const lost: string[] = []
    for (const file of repoSources()) {
      const stripped = stripComments(file.source).split("\n")
      for (const line of linesThatCannotBeComments(file.source))
        if ((stripped[line.n - 1] ?? "").trim() === "")
          lost.push(`${file.rel}:${line.n}  ${line.text.slice(0, 70)}`)
    }
    expect(
      lost.length,
      `the stripper deleted source that is not a comment — every law reading these ` +
        `files is blind to these lines:\n${lost.slice(0, 20).join("\n")}`
    ).toBe(0)
  })

  it("and no line that plainly IS a comment survives", () => {
    // The other direction, over the same census. A stripper that strips nothing
    // passes the test above; it would turn every law into a text search that hits
    // the prose explaining the law.
    const survived = new Map<string, string>()
    for (const file of repoSources())
      for (const [index, line] of stripComments(file.source).split("\n").entries()) {
        const text = line.trim()
        if (!text.startsWith("//") && !text.startsWith("/*")) continue
        if (!survived.has(file.rel)) survived.set(file.rel, `${index + 1}  ${text.slice(0, 70)}`)
      }
    const unlisted = [...survived].filter(([rel]) => !COMMENT_MARKER_IN_A_STRING[rel])
    expect(
      unlisted.map(([rel, where]) => `${rel}:${where}`),
      "a comment came through the stripper — a law scanning this file can be " +
        "satisfied by the prose in it"
    ).toEqual([])
    for (const rel of Object.keys(COMMENT_MARKER_IN_A_STRING))
      expect(
        survived.has(rel),
        `COMMENT_MARKER_IN_A_STRING lists ${rel}, which no longer has one — delete the line`
      ).toBe(true)
    for (const [rel, why] of Object.entries(COMMENT_MARKER_IN_A_STRING))
      expect(why.length, `${rel} needs a real reason`).toBeGreaterThan(40)
  })
})

/** WHERE A RAW CONTROL BYTE IS ALLOWED TO SIT, and why. Data, rot-checked both
 * ways, so a file that no longer has one turns this red and the line is deleted.
 *
 * EMPTY, AND IT GOT THERE THE WAY AN EXEMPTION IS SUPPOSED TO. It opened with
 * one entry, for the vendored kit's `use-remembered-view.ts`, and the reason
 * named the condition under which the line would disappear: the kit is a pinned
 * dependency this repo may not hand-edit (`web/test/vendored-kit.test.ts`
 * recomputes its content hash), so the fix could only be made upstream in
 * Kwapso/kwapso-ui-ux and a sync would clear it. That is what happened, the same
 * day, in kit v1.2.74. An exemption whose reason cannot be read as an
 * instruction is a permanent one. */
const CONTROL_BYTE_OK: Record<string, string> = {}

describe("no source file is invisible to a text search", () => {
  it("carries no raw control byte, which makes grep skip the WHOLE file in silence", () => {
    // WHY THIS IS A GUARD ON THE GUARD.
    //
    // Every law in this repo is a source scan. This suite exists because a scan
    // stands on a walk and a stripper; it turns out it also stands on the file
    // being READABLE AS TEXT by the tools a person reaches for.
    //
    // `grep` classifies a file holding a raw control byte as BINARY and skips
    // it, printing nothing and exiting 1, in a way that is indistinguishable
    // from an honest zero matches. No warning, no different exit code.
    //
    // On 8 Sep 2026 that cost two separate sessions a false conclusion each.
    // `web/components/deep-link/deep-link-screen.tsx` (889 lines, the record
    // screen's whole tab strip) answered every grep with nothing, and was
    // reported to the owner as DELETED. It had not been touched. The same shape
    // turned up hours later on a second file. Both times the byte was deliberate
    // and correct (a NUL used as a join separator, the ZIP magic number in a
    // fixture); the defect was writing it as a RAW BYTE instead of an escape,
    // which is identical at runtime and is the whole difference between a file
    // the toolchain can read and one it silently cannot.
    //
    // TAB, NEWLINE and CARRIAGE RETURN are excluded: they are whitespace, they
    // do not trip the binary heuristic, and a file full of tabs is fine.
    //
    // Read by CHARACTER CODE rather than by a regex: a character class spelling
    // this range is exactly what `no-control-regex` exists to refuse, and a
    // suppression comment on the one check whose whole subject is control
    // characters would be a small lie in both directions.
    const isControl = (n: number): boolean => n < 0x20 && n !== 9 && n !== 10 && n !== 13
    const firstControl = (text: string): number => {
      for (let i = 0; i < text.length; i++) if (isControl(text.charCodeAt(i))) return i
      return -1
    }
    const offenders: string[] = []
    for (const file of everySourceOfOurs()) {
      const at = firstControl(file.source)
      if (at === -1) continue
      const line = file.source.slice(0, at).split("\n").length
      const code = file.source.charCodeAt(at).toString(16).padStart(4, "0").toUpperCase()
      offenders.push(`${file.rel}:${line}  U+${code}`)
    }
    const unlisted = offenders.filter((o) => !CONTROL_BYTE_OK[o.split(":")[0]])
    expect(
      unlisted,
      "a raw control byte makes this file invisible to grep. Write the byte as " +
        'an escape ("\\u0000", "\\u0003") instead: identical at runtime.'
    ).toEqual([])

    // Rot check, the other way. An exemption for a file that no longer holds one
    // is a record of a problem somebody already fixed, and it rots into cover for
    // the next occurrence of it.
    const seen = new Set(offenders.map((o) => o.split(":")[0]))
    for (const [rel, why] of Object.entries(CONTROL_BYTE_OK)) {
      expect(seen.has(rel), `CONTROL_BYTE_OK lists ${rel}, which is clean now: delete the line`).toBe(true)
      expect(why.length, `${rel} needs a real reason`).toBeGreaterThan(40)
    }
  })
})
