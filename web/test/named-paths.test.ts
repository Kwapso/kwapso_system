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
// Two censuses, one registry, and both are derived off the disk:
//
//   DOCS   — every repo path with a real extension in `documents/**.md` and the
//            root `.md` canon.
//   SOURCE — every repo path with a `.ts`/`.tsx` extension anywhere in our own
//            source. Written out in full, an extension included, it is a path a
//            person is meant to open: an import specifier in this codebase never
//            carries one, so the census sees prose and string literals and never
//            the module graph.
//
// The way out is `GONE_ON_PURPOSE` — a path a document names precisely BECAUSE
// it is gone ("the clause and `web/lib/use-live-refetch.ts` were retired"). Each
// line carries its reason and is rot-checked twice: a path that comes back, or
// one nothing names any more, turns the build red, so the list can only shrink.

import { describe, expect, it } from "vitest"
import { existsSync } from "node:fs"
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
    "UI-CONVENTIONS.md says in so many words 'There is no shared/ui/styles.css'; OPERATIONS.md dates the vendoring that ended it",
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
}

/** Every repo path with a real extension, in the canon a person reads. */
const DOC_REF =
  /(?:web|web-portal|shared|workers|scripts|db)\/[A-Za-z0-9][A-Za-z0-9._/-]*\.(?:tsx|ts|mjs|sql|css|json|jsonc)\b/g

/** Every repo path spelled out with a source extension, anywhere in our source.
 * An import specifier never carries one here, so this reads prose and literals. */
const SOURCE_REF =
  /(?:@\/|(?:web|web-portal)\/(?:components|lib|app|test)\/|shared\/(?:web|rules|workers|ui)\/|workers\/[a-z-]+\/(?:src|test)\/|scripts\/)[A-Za-z0-9][A-Za-z0-9._/-]*\.tsx?\b/g

interface Ref {
  from: string
  path: string
}

function refsIn(files: { rel: string; source: string }[], pattern: RegExp): Ref[] {
  const out: Ref[] = []
  for (const file of files)
    for (const hit of file.source.match(pattern) ?? [])
      out.push({ from: file.rel, path: hit.replace(/^@\//, "web/") })
  return out
}

/** The canon a person reads: everything under documents/, plus the root .md
 * files, which are deliberately flat (`recursive: false` says so out loud). */
const docRefs = () =>
  refsIn(
    [
      ...sourceFiles(join(ROOT, "documents"), { extensions: [".md"], relativeTo: ROOT }),
      ...sourceFiles(ROOT, { extensions: [".md"], recursive: false, relativeTo: ROOT }),
    ],
    DOC_REF
  )

/** Our own source, through the one walker. The vendored kit is left out: it is a
 * dependency whose bytes are hashed, not prose of ours (web/test/vendored-kit.test.ts). */
const sourceRefs = () =>
  refsIn(
    sourceFiles(
      ["web", "web-portal", "shared", "workers", "scripts"].map((d) => join(ROOT, d)),
      { extensions: [".ts", ".tsx", ".mjs"], relativeTo: ROOT }
    ).filter((f) => !f.rel.startsWith("shared/ui/")),
    SOURCE_REF
  )

const dangling = (refs: Ref[]) =>
  refs.filter((r) => !GONE_ON_PURPOSE[r.path] && !existsSync(join(ROOT, r.path)))

describe("every path this repo names can be opened", () => {
  it("the two censuses see the repo at all (neither may go blind)", () => {
    // A pattern that matched nothing would pass every assertion below by having
    // nothing to test. These are the sentinels that say each one read something.
    expect(docRefs().length, "no repo paths found in documents/ — the doc scan is blind").toBeGreaterThan(300)
    expect(sourceRefs().length, "no repo paths found in source — the source scan is blind").toBeGreaterThan(900)
  })

  it("the canon names no file that is not there", () => {
    const bad = dangling(docRefs()).map((r) => `${r.from} → ${r.path}`)
    expect(
      [...new Set(bad)],
      `these documents point a reader at a file that does not exist — correct the path, or, ` +
        `if the words are about its absence, add a reasoned GONE_ON_PURPOSE line`
    ).toEqual([])
  })

  it("no comment or literal in our source names a file that is not there", () => {
    const bad = dangling(sourceRefs()).map((r) => `${r.from} → ${r.path}`)
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
    const named = new Set([...docRefs(), ...sourceRefs()].map((r) => r.path))
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
})
