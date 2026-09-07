// AN EXPORT NOBODY IMPORTS IS A CONTRACT NOBODY AGREED TO.
//
// orphan-components.test.ts asks whether a component FILE is reachable. This
// asks the question one level down: is each exported BINDING reachable, in a
// file that is itself perfectly alive? A lib nine functions long with one of
// them exported for nobody passes every check in this repo — it imports fine,
// it type-checks, it is covered by whatever tests cover its neighbours, and the
// only symptom is that a reader arrives at a public name and cannot tell whether
// it is a seam or a leftover.
//
// Found on 7 Sep 2026 by census rather than by anything going red: 21 exported
// values that nothing anywhere named. Nineteen were the published price table —
// exported, quoted in COSTS.md's prose, and asserted by NOTHING, while the
// pricing suite's own header claimed it "pins every constant here"; they are
// pinned now. One was `indexAllFunctions`, a private helper of the activity seam
// that had been given a public name it never needed. The last is the parked
// dialog below.
//
// WHAT COUNTS AS A USE, and why it is deliberately generous. A name is USED if
// any other file in the app mentions it at all — an import, a re-export, a
// string, a comment. That over-forgives on purpose, exactly as
// orphan-components.test.ts does: a missed finding costs nothing here, and a
// wrongly-deleted export costs a working feature. TESTS COUNT AS USERS. A
// registry read only by the law that enforces it is the shape half this codebase
// is built on (RULES_REGISTRY, STORED_FILES, PALETTE_LITERAL_OK…) and calling
// those dead would make this census argue with the repo rather than check it.
//
// WHAT IS OUT OF SCOPE, structurally rather than by exemption:
//   · shared/ui/ — a pinned dependency; what it exports is upstream's business
//   · web/app/ and web-portal/app/ — Next's app-router contract. `metadata`,
//     `viewport`, `dynamic` and `generateStaticParams` are exported FOR the
//     framework, which imports them by convention and never by name
//   · test files — the suite is the checker, not the subject
//   · types — `export type` and `export interface` erase at compile time and
//     are TypeScript's business, not this census's

import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles } from "@shared/rules/source-scan"

const WEB = join(__dirname, "..")
const ROOT = join(WEB, "..")

/** Exported values that nothing names, each with the decision that keeps it.
 * Rot-checked both ways below: an entry whose export has gained a user, or whose
 * export no longer exists, turns the build red — so the list can only shrink. */
const DEAD_EXPORT_OK: Record<string, string> = {
  "web/components/tickets/mail-reply-dialog.tsx::MailReplyDialog":
    "the file is PARKED in web/test/orphan-components.test.ts with the decision that parks " +
    "it — it is the only place either front end holds a Gmail draft id, kept for the day a " +
    "screen opens it. An unmounted file has an unimported export by construction; this line " +
    "is that same decision seen from one level down, and both go together or neither does.",
}

/** Every app-owned source file: both front doors minus their app-router folders,
 * shared/ minus the pinned kit, and each worker's src/. */
function appSources() {
  const roots = [
    join(WEB, "components"),
    join(WEB, "lib"),
    join(ROOT, "web-portal", "components"),
    join(ROOT, "web-portal", "lib"),
    join(ROOT, "shared"),
    join(ROOT, "workers"),
  ]
  return sourceFiles(roots, { extensions: [".ts", ".tsx"], relativeTo: ROOT, skipTests: true }).filter(
    (f) => !f.rel.startsWith("shared/ui/") && !/\/test\//.test(f.rel) && !/^workers\/[^/]+\/(?!src\/)/.test(f.rel)
  )
}

/** Every file that could NAME one of them — the app, both `app/` folders, every
 * suite, and the scripts, which reach into shared/ through .mjs of their own. */
function allSources() {
  const roots = ["web", "web-portal", "shared", "workers", "scripts", "tools"].map((d) => join(ROOT, d))
  return sourceFiles(roots, { extensions: [".ts", ".tsx", ".mjs"], relativeTo: ROOT }).filter(
    (f) => !f.rel.startsWith("shared/ui/")
  )
}

/** `export const NAME` / `export function NAME` / `export class NAME`, at the
 * top level. Not `export type`, not `export interface`, not `export default`
 * (which has no name to import), and not a re-export (`export { x } from …`,
 * which is a use of x rather than a declaration of it). */
function exportedValues(source: string): string[] {
  return [
    ...source.matchAll(/^export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm),
  ].map((m) => m[1])
}

describe("every exported value is named by something", () => {
  const declared = appSources().flatMap((f) => exportedValues(f.source).map((name) => ({ rel: f.rel, name })))
  // The whole corpus as one string per file, minus THIS file — a register that
  // vouched for its own entries would report a clean sweep for ever.
  const others = allSources().filter((f) => f.rel !== relative(ROOT, __filename))

  it("finds a real corpus on both sides (a blind census reads exactly like a clean one)", () => {
    expect(declared.length, "no exported values found — the declaration scan has gone blind").toBeGreaterThan(500)
    expect(others.length, "no files found to search — the use scan has gone blind").toBeGreaterThan(500)
    // And it can still SEE a dead export: a name that exists nowhere must come
    // back unused, or the matcher below is answering yes to everything.
    const nonsense = "zzNoSuchExportedNameZz"
    expect(others.some((f) => new RegExp(`\\b${nonsense}\\b`).test(f.source))).toBe(false)
  })

  it("nothing is exported for nobody, outside DEAD_EXPORT_OK", () => {
    const used = new Set<string>()
    for (const f of others) for (const m of f.source.matchAll(/[A-Za-z_$][\w$]*/g)) used.add(m[0])
    // A name is used if any OTHER file contains it. Own-file uses do not count:
    // that is precisely the case where the `export` keyword buys nothing.
    const orphans: string[] = []
    for (const { rel, name } of declared) {
      const elsewhere = others.some(
        (f) => f.rel !== rel && used.has(name) && new RegExp(`\\b${name}\\b`).test(f.source)
      )
      if (!elsewhere) orphans.push(`${rel}::${name}`)
    }
    const unexplained = orphans.filter((k) => !DEAD_EXPORT_OK[k])
    expect(
      unexplained,
      `nothing anywhere names these exports — drop the \`export\` keyword if the binding is ` +
        `private to its file, delete it if it is not needed, or add a reasoned DEAD_EXPORT_OK ` +
        `line: ${unexplained.join(", ")}`
    ).toEqual([])

    // The ratchet, both ways.
    const live = Object.keys(DEAD_EXPORT_OK).filter((k) => !orphans.includes(k))
    expect(
      live,
      `DEAD_EXPORT_OK names exports that something imports now, or that no longer exist — ` +
        `delete these lines: ${live.join(", ")}`
    ).toEqual([])
  })

  it("every DEAD_EXPORT_OK line states a real reason", () => {
    for (const [key, why] of Object.entries(DEAD_EXPORT_OK))
      expect(why.length, `${key} is exported for nobody — that needs a real reason`).toBeGreaterThan(40)
  })
})
