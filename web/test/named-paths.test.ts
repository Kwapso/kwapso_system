// A PATH THIS REPO NAMES IN PROSE MUST RESOLVE ON DISK.
//
// Every law here is a source scan, and every scan reads a path it was HANDED.
// Nothing ever read the paths the repo WRITES — the ones in a document, and the
// ones in a comment above the code they explain. Those are the paths a person
// follows, and they were checked by nobody: the 7 Sep 2026 fold of
// `web/components` into one folder per module left one behind — the settings
// screen's own header still pointed two folders away at a `selectable-screen`
// that had moved into `choices/` — and a human found it, weeks after a green
// build.
//
// It is worse than untidy. Five comments turned out to name a GUARD that does
// not exist — `workers/auth/src/lib/sessions.ts` promised the build would fail
// if a fourth copy of the cookie name appeared and named a test file that is not
// there; `workers/content/src/routes/triage.ts` said a whole-repo census watched
// the rota and named another. Both properties are genuinely enforced, by suites
// under different names. A reader who checks is reassured by a file that is not
// there, and a reader who does not check is reassured by nothing at all.
//
// ── THE CENSUS WAS NARROWER THAN THE LAW, UNTIL 9 SEP 2026 ──────────────────
//
// The law said "a path — in a document, in a comment, in a string". The check
// said something much smaller, in two hand-written regexes that had drifted
// apart from each other and from the sentence they enforce:
//
//   · the SOURCE census only matched `.ts` and `.tsx`, so a comment in worker
//     source naming a markdown file under documents/ that has never existed
//     passed a green build. That was demonstrated, not argued.
//   · the SOURCE census also hard-coded which FOLDERS could appear in a path:
//     `web/(components|lib|app|test)`, `shared/(web|rules|workers|ui)`,
//     `workers/<w>/(src|test)`, `scripts/`. Everything else — `db/`, `tools/`,
//     `types/`, `documents/`, a new folder under `shared/` — was invisible.
//   · the DOCS census only read `documents/**.md` and the root canon, so the
//     fifteen markdown files that live NEXT TO THE CODE they describe —
//     `web/components/README.md`, which R57 derives a law from, `scripts/README.md`,
//     `design/`, `docs-audit/`, `docs-lane/`, `glide/` — were read by neither half.
//   · neither pattern allowed a `[` in a segment, so every Next catch-all route
//     (`web/app/tickets/[[...rest]]/page.tsx`, seventeen of them, named all over
//     the canon) was outside both censuses.
//
// So: ONE pattern now, over TWO corpora, and everything the pattern is built
// from is read off the disk rather than typed here — the ROOTS are the repo's
// own top-level folders, and the exemption for a path that is OUTPUT rather than
// source is `.gitignore`'s own answer, not a second list.
//
//   DOCS — every `.md` this repo writes, wherever it lives.
//   CODE — our own source and config: every root that holds code of ours, at
//          every depth, in every text extension. An import specifier in this
//          codebase never carries an extension, so this reads prose and string
//          literals and never the module graph.
//
// The way out is `GONE_ON_PURPOSE` — a path a document names precisely BECAUSE
// it is gone ("the clause and `web/lib/use-live-refetch.ts` were retired"). Each
// line carries its reason and is rot-checked twice: a path that comes back, or
// one nothing names any more, turns the build red, so the list can only shrink.
//
// WHAT THE WIDENING FOUND, all six fixed rather than exempted or narrowed away:
// `shared/web/form-shell.tsx` named the portal's onboarding step one folder up
// from the real `web-portal/components/needs-name.tsx`; the core migration for
// the activity table cited a `shared/test/` suite that has never existed for the
// append-only guard, which really lives in `workers/tenancy/test/activity-trail.test.ts`;
// `workers/tenancy/test/query-vocabulary.test.ts` sent a reader after a
// `query-vocabulary-audit` script for the wider instrument, which is
// `scripts/query-bench.mjs`; `workers/tenancy/test/migration-gate.test.ts` built
// its two-accounts fixture out of two invented worker configs, now two real ones;
// and two genuine absences are pinned below (`scripts/icon-art.mjs` and the
// `brand-theme` layer the reskin removed).
//
// NOTE, because it is the point: this header may not spell a dead path either.
// Three of those findings could not be written out here at all — the first run of
// the widened census went red on this very file, naming the dead paths its own
// changelog had just spelled. The check bit its author before it bit anyone else.

import { describe, expect, it } from "vitest"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { sourceFiles } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

/** A path our own words name on purpose, knowing it is not there. */
const GONE_ON_PURPOSE: Record<string, string> = {
  "web/components/team/role-detail.tsx":
    "the per-role screen the client deleted on 2026-09-09 (\"I want to see the roles much differently… all the roles together\"). Every role's sheet is one grid on Settings › Team now (roles-matrix.tsx), and half a dozen comments — module-content.tsx's `roles` branch, the roles matrix's own header, web/lib/pages.ts, R36's screen clause in rules.test.ts — name this path precisely BECAUSE it is gone, which is what makes each of those sentences readable",
  "web/lib/use-live-refetch.ts":
    "R15's retired half. RULES.md, CACHING.md and the registry all say this hook was deleted when paging moved to cursors over the shared store — naming it is the whole point of the sentence",
  "web/lib/live-bus.ts":
    "CACHING.md, one sentence on from the hook above: the bus 'outlived its only subscriber and is now gone too'",
  "web/components/condensed-title.tsx":
    "the registry's R46 note on the kit's `useIsVisible`: its one caller in the app, removed when the client asked for the compressed title bar to go",
  "web/components/knowledge-ask.tsx":
    "CONTROL-SWAP-LANES.md's lane A manifest — a snapshot of the files that lane was handed, left as counted and annotated at the top of the file",
  "shared/web/screen-engine/range-facet.tsx":
    "CONTROL-SWAP-LANES.md's lane C manifest, same snapshot: it went when the filter row became the design kit's",
  "shared/web/screen-engine/searchable-facet.tsx":
    "CONTROL-SWAP-LANES.md's lane C manifest, same snapshot and the same commit",
  "web-portal/components/auth-artwork.tsx":
    "UI-GAPS.md row 23 records the file's own deletion — it says 'is deleted', which is the fact the row exists to carry",
  "shared/ui/lib/recipe.ts":
    "SCREEN-ENGINE-PLAN.md says the recipe type 'was' here while the engine lived in the library, and where it is now",
  "shared/ui/styles.css":
    "UI-CONVENTIONS.md says in so many words 'There is no shared/ui/styles.css'; OPERATIONS.md dates the vendoring that ended it, library-map.md is the superseded swap key that mapped its tokens, and both apps' globals.css and shared/brand.ts name it in the same past tense",
  "shared/web/brand-theme.tsx":
    "the `<style>` tag that stood six mango tokens in front of the old library's teal preset. RESKIN-REPORT.md records the end of it — 'the theme IS the kwapso palette now, so BrandTheme is gone' — and design/library-map.md, which carries a SUPERSEDED banner of its own, names the file twice as the middle layer of the three-deep chain that swap removed. Found only when the docs census learned to read markdown that lives outside documents/",
  "web/components/temp/auth-card.tsx":
    "the temp/ folder went when the kit shipped its own sign-in composition; `web/components/shell/auth-card.tsx`'s header says what it 'was'",
  "web/components/temp/code-input.tsx":
    "the same folder, named by the portal's own compile fence as the file whose planned deletion would once have broken the other app",
  "workers/auth/test/session-read-seam.test.ts":
    "`web/test/one-cookie-name.test.ts` records the two suites it was merged out of, on 6 Sep 2026 — the names are the record",
  "web/components/help-status-stepper.tsx":
    "COMPOSITION-MISMATCHES.md and NEEDS-A-SPEC.md both name it to say it is GONE: the client's 31 Aug 2026 ruling that nothing renders after the chips row put a status track below them out of bounds, and this wrapper was removed rather than relocated on 1 Sep 2026. Both entries were kept, not deleted, because the composition question survives the component",
  "web/components/story-status-stepper.tsx":
    "the other half of the same removal, named in the same two sentences for the same reason",
  "web/lib/api.ts":
    "the agency client became a directory; `workers/gateway/test/agency-door.test.ts` explains that it walks the directory precisely because it 'used to be' this one file",
  "scripts/icon-art.mjs":
    "the stage that stood lucide's glyphs in front of the kit's icon-name placeholders until v1.0.8 shipped 1,383 drawn glyphs. `scripts/sync-design.mjs` names it in the comment that replaced the call — 'is deleted rather than left switched off' — which is the sentence that tells the next reader the art stage is not merely disabled somewhere they have not looked",
}

// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE REPO KEEPS, versus WHAT THE REPO MAKES.
//
// A path git is told never to track is not a pointer a reader follows; it is a
// FILE THIS REPO WRITES, named by the script that writes it. `scripts/glide-to-r2.mjs`
// says where it puts `glide/r2-manifest.json`; INVENTORY.md says that file holds
// customer data and is why it is ignored; `scripts/build-screen-builder.mjs`
// names the megabyte `tools/screen-builder/index.html` it generates. Requiring
// those on disk would make the check fail on a fresh clone, which is a check
// nobody can keep.
//
// So the exemption is DERIVED from `.gitignore` and held nowhere else. Adding an
// output to the ignore file exempts it here in the same commit; deleting the
// ignore line puts it back under the law. The two shapes are git's own: an entry
// that starts with `/` or contains a `/` is anchored to the repo root, and a
// bare name matches that segment at any depth. Globs and negations are skipped
// rather than half-implemented — a pattern this cannot read is a pattern that
// exempts nothing, which is the safe direction.
// ─────────────────────────────────────────────────────────────────────────────

const IGNORE_LINES = readFileSync(join(ROOT, ".gitignore"), "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#") && !l.startsWith("!") && !l.includes("*"))

const ANCHORED_OUTPUT: string[] = []
const OUTPUT_ANYWHERE = new Set<string>()
for (const line of IGNORE_LINES) {
  const bare = line.replace(/^\//, "").replace(/\/$/, "")
  if (line.startsWith("/") || bare.includes("/")) ANCHORED_OUTPUT.push(bare)
  else OUTPUT_ANYWHERE.add(bare)
}

/** Something this repo generates rather than keeps — git's answer, not ours. */
const isOutput = (path: string): boolean => {
  const segments = path.split("/")
  if (segments.some((s) => OUTPUT_ANYWHERE.has(s))) return true
  return segments.some((_, i) => ANCHORED_OUTPUT.includes(segments.slice(0, i + 1).join("/")))
}

// ─────────────────────────────────────────────────────────────────────────────
// THE PATTERN, BUILT FROM THE DISK.
//
// The old two regexes each carried a hand-typed list of folders, and both lists
// were already behind the tree they described. This one asks the repo what its
// top-level folders ARE. A new one is covered the day it is created; an ignored
// one (`credentials/`, `backups/`, `node_modules/`) is never even walked, which
// is also what keeps a client export out of a unit test's memory. Dot-folders
// are local scaffolding (`.claude/`, `.session-notes/`, `.github/`), not canon
// this repo's prose sends a reader to.
// ─────────────────────────────────────────────────────────────────────────────

const ROOTS = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !isOutput(e.name))
  .map((e) => e.name)
  .sort()

/** Written out in full, an extension included, a path is one a person is meant
 * to open. These are every text extension this repo's own files carry. */
const NAMED_EXTENSIONS = ["tsx", "ts", "mts", "mjs", "sql", "css", "jsonc", "json", "md", "html"]

/** One path segment. Starts with a letter, a digit — or a `[`, because seventeen
 * real files live under a Next catch-all (`[[...rest]]`) and the canon names
 * them. A segment may NOT start with a dot, which is what keeps the registry's
 * illustrative `web/components/....tsx` out of the census. */
const SEGMENT = String.raw`[A-Za-z0-9\[][A-Za-z0-9._\[\]-]*`

/** The lookbehind is load-bearing: without it the Next build's own reference to
 * a generated `routes.d.ts` under `.next/types/`, in each app's `next-env.d.ts`,
 * reads as a repo path rooted at `types/`. */
const NAMED_PATH = new RegExp(
  String.raw`(?<![A-Za-z0-9._/-])(?:@/|(?:${ROOTS.join("|")})/)` +
    String.raw`${SEGMENT}(?:/${SEGMENT})*\.(?:${NAMED_EXTENSIONS.join("|")})\b`,
  "g"
)

/** Neither corpus is OUR prose: `shared/ui/` is the design kit, a dependency
 * whose bytes are hashed rather than words of ours (web/test/vendored-kit.test.ts),
 * and `tools/screen-builder/catalogue.json` is `scripts/build-kit-catalogue.mjs`'s
 * copy of the kit's own component comments — regenerated on every sync, so a
 * correction typed into it is overwritten by the next `sync-design` run and red
 * in kit-catalogue.test.ts meanwhile. The kit cites a `verify/` decision page for
 * the 2026-08-22 footer ruling that this repo no longer has; that is upstream's
 * sentence to fix, not ours. */
const notOurs = (rel: string) => rel.startsWith("shared/ui/") || rel === "tools/screen-builder/catalogue.json"

interface Ref {
  from: string
  path: string
}

/** `@/` is each front door's alias for its OWN tree, so it resolves against the
 * file that wrote it and not always against `web/`. */
const resolveAlias = (from: string, hit: string) =>
  hit.replace(/^@\//, from.startsWith("web-portal/") ? "web-portal/" : "web/")

function refsIn(files: { rel: string; source: string }[]): Ref[] {
  const out: Ref[] = []
  for (const file of files)
    for (const hit of file.source.match(NAMED_PATH) ?? [])
      out.push({ from: file.rel, path: resolveAlias(file.rel, hit) })
  return out
}

/** THE PROSE HALF: every `.md` this repo writes, wherever it lives — under
 * `documents/`, at the root (deliberately flat, so `recursive: false` says so
 * out loud), and beside the code, which is where `web/components/README.md`
 * lives and R57 reads a law out of it. */
const docFiles = () =>
  [
    ...sourceFiles(
      ROOTS.map((d) => join(ROOT, d)),
      { extensions: [".md"], relativeTo: ROOT }
    ),
    ...sourceFiles(ROOT, { extensions: [".md"], recursive: false, relativeTo: ROOT }),
  ].filter((f) => !notOurs(f.rel) && !isOutput(f.rel))

/** THE CODE HALF. Two passes on purpose: the first asks each root whether it
 * holds code OF OURS at all, reading only code extensions, and the second reads
 * the winners in full. `glide/` fails the first pass, so `glide/data/` — a
 * symlink to a client's whole export on a checkout that has one — is walked and
 * never read. */
const CODE = [".ts", ".tsx", ".mts", ".mjs", ".sql"]
const CONFIG = [".css", ".json", ".jsonc", ".html"]

const codeFiles = () =>
  ROOTS.filter((d) => sourceFiles(join(ROOT, d), { extensions: CODE }).length > 0)
    .flatMap((d) => sourceFiles(join(ROOT, d), { extensions: [...CODE, ...CONFIG], relativeTo: ROOT }))
    .filter((f) => !notOurs(f.rel) && !isOutput(f.rel))

/** …AND `isOutput` ON BOTH WALKS ABOVE, WHICH IT WAS NOT UNTIL 2026-09-10.
 *
 * The predicate answered only "is the path being NAMED something we generate",
 * never "is the file doing the naming". So this census read generated files as
 * if they were this repo's own prose — and a generated file names whatever it
 * named on the day it was built. `tools/screen-builder/index.html` is 2.8 MB of
 * regenerable HTML, built on 6 Sep, and it still pointed at a verification page
 * that has since gone — named here in prose rather than spelled out, because
 * this check reads its own file and a dead path in a COMMENT is exactly what it
 * forbids. The suite went red
 * on this laptop and stayed green on CI, because CI clones and never builds it
 * — two gates wearing one name, which this repo has already been bitten by
 * once (a4d87f64).
 *
 * The root `.md` half is the same bug with a worse blast radius: every review
 * skill writes its report to the repo root, so running ANY review put a
 * document-shaped artefact where `docFiles()` would read it as canon.
 *
 * One answer, three readers now. If git is told never to track a file, this
 * repo did not write it as prose and does not stand behind what it says. */
const dangling = (refs: Ref[]) =>
  refs.filter((r) => !GONE_ON_PURPOSE[r.path] && !isOutput(r.path) && !existsSync(join(ROOT, r.path)))

describe("every path this repo names can be opened", () => {
  // A pattern that matched nothing, a walk that opened nothing, or a root list
  // that came back empty would pass every assertion below by having nothing to
  // test. This is the whole failure mode the law exists to prevent, one level up.
  it("the census can still see the repo at all (it may not go blind)", () => {
    expect(ROOTS.length, "no top-level folders derived off disk — the pattern has no roots").toBeGreaterThan(5)

    const docs = docFiles()
    const code = codeFiles()
    expect(docs.length, "the docs walk opened nothing").toBeGreaterThan(40)
    expect(code.length, "the code walk opened nothing").toBeGreaterThan(900)
    expect(refsIn(docs).length, "no repo paths found in our markdown — the doc scan is blind").toBeGreaterThan(1000)
    expect(refsIn(code).length, "no repo paths found in our source — the code scan is blind").toBeGreaterThan(2000)

    // …and the sharpest one: EVERY FILE THE CENSUS READS IS A PATH THE CENSUS
    // COULD SEE. Spell each corpus file's own repo-relative path and the pattern
    // must match it. A root, an extension or a segment shape that quietly falls
    // out of the regex is caught here by the files it would have stopped seeing —
    // which is exactly how `.md`-in-source and `[[...rest]]` hid for weeks.
    // The root canon (`CLAUDE.md`, `RULES.md`, `AGENTS.md`, `README.md`) is out
    // of this one and out of the census: a bare filename has no folder to anchor
    // on, and a pattern loose enough to catch `RULES.md` also catches every
    // mention of `package.json` in every runbook. Those four are named constantly
    // and are the least likely files in the repository to move unnoticed.
    const whole = new RegExp(`^${NAMED_PATH.source}$`)
    const unseeable = [...docs, ...code]
      .map((f) => f.rel)
      .filter((rel) => rel.includes("/") && !whole.test(rel))
    expect(
      unseeable.slice(0, 20),
      `the census READS these files and could not RECOGNISE their own paths, so a document ` +
        `naming one of them would never be checked — widen the pattern, do not narrow the walk`
    ).toEqual([])
  })

  it("the canon names no file that is not there", () => {
    const bad = dangling(refsIn(docFiles())).map((r) => `${r.from} → ${r.path}`)
    expect(
      [...new Set(bad)],
      `these documents point a reader at a file that does not exist — correct the path, or, ` +
        `if the words are about its absence, add a reasoned GONE_ON_PURPOSE line`
    ).toEqual([])
  })

  it("no comment or literal in our source names a file that is not there", () => {
    const bad = dangling(refsIn(codeFiles())).map((r) => `${r.from} → ${r.path}`)
    expect(
      [...new Set(bad)],
      `these name a file that does not exist. A comment naming a GUARD that is not ` +
        `there is the dangerous shape: it reassures a reader who checks`
    ).toEqual([])
  })

  it("every GONE_ON_PURPOSE line is still gone (a path that came back must be un-pinned)", () => {
    for (const path of Object.keys(GONE_ON_PURPOSE))
      expect(
        existsSync(join(ROOT, path)),
        `GONE_ON_PURPOSE says ${path} is deliberately absent, and it is on disk — delete the line`
      ).toBe(false)
  })

  it("every GONE_ON_PURPOSE line is still named by something (no rot)", () => {
    const named = new Set([...refsIn(docFiles()), ...refsIn(codeFiles())].map((r) => r.path))
    for (const path of Object.keys(GONE_ON_PURPOSE))
      expect(
        named.has(path),
        `GONE_ON_PURPOSE pins ${path} and nothing mentions it any more — delete the line`
      ).toBe(true)
  })

  it("every GONE_ON_PURPOSE line says why", () => {
    for (const [path, why] of Object.entries(GONE_ON_PURPOSE))
      expect(why.length, `${path} needs a real reason, not a placeholder`).toBeGreaterThan(30)
  })

  // The two ways out may not be confused. An output path pinned as GONE_ON_PURPOSE
  // would be a line nothing can ever retire: the rot-check would keep passing
  // because the file is regenerable and absent on a clean clone, so the pin would
  // outlive whatever it was written for.
  it("GONE_ON_PURPOSE pins nothing that is merely un-built", () => {
    const generated = Object.keys(GONE_ON_PURPOSE).filter(isOutput)
    expect(
      generated,
      `.gitignore already exempts these as output this repo writes — they need no pin`
    ).toEqual([])
  })
})
