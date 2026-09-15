#!/usr/bin/env node
// GENERATE documents/RULES-INDEX.md — every law in `shared/rules/registry.ts`
// against the file(s) that actually check it, derived off disk in this same
// run. RULES.md keeps WHAT a law says; this keeps WHERE it is checked; neither
// copies the other's job.
//
//   node --experimental-transform-types scripts/rules-index.mjs           regenerate
//   node --experimental-transform-types scripts/rules-index.mjs --check   verify current, no write (wired into `npm run check`)
//
// ── WHY GENERATED, NEVER HAND-KEPT ───────────────────────────────────────────
//
// A hand-typed R-id → file table is a second source of truth for a fact
// `shared/rules/registry.ts` and the check files themselves already carry —
// exactly what RULES.md itself warns a law's own index must not become. So this
// derives the mapping two ways, both against the checked-in test tree in THIS
// run, never a list:
//
//   DEDICATED FILE   a test file whose basename is exactly `<checkId>.test.ts`
//                    (the per-worker publish-seam/gating-seam pattern — one
//                    checkId, several worker directories, several files).
//   INLINE CASE      an `it("<checkId>: …")` (or `it('…'`/`it(\`…\``) block
//                    inside a larger suite (web/test/rules.test.ts hosts most
//                    of these — one file, many laws).
//
// A THIRD pattern, found necessary once the first two left nine laws
// unmatched and reading them showed why: several suites name a law by its
// NUMBER rather than its checkId, in a TOP-LEVEL `describe(` — never a nested
// one, because a nested `it()` can mention another law in passing (R9's own
// suite has one glossary test whose title says "Law R6 meets R9", which would
// wrongly claim that file for R6 too if this searched anywhere but the
// top-level block that OWNS the suite).
//
//   TOP-LEVEL describe   `describe("agent-app parity (Law R9): …")`,
//                        `describe("R70 — every automation is visible …")` —
//                        anchored to the START of a line, so a passing mention
//                        one level deeper can never be mistaken for ownership.
//
// **WARNING FOR WHOEVER WIDENS THIS PATTERN NEXT**: a bare `\bR<n>\b` is not
// safe here and was measured to be unsafe, not merely suspected. Cloudflare's
// own object-storage product is ALSO spelled "R2" — three real files about it
// (`backup-covers-r2.test.ts`, `r2-cors.test.ts`, `r2-lifecycle.test.ts`)
// matched Law R2 (`record-detail-tabs`) under a looser first draft of this
// regex, silently, before this comment existed. `filesFor` below only
// accepts "Law R<n>", "R<n> —" (a dash immediately after), or a parenthesised
// "(R<n>" — never a bare number — precisely to keep that door shut. Loosen it
// and re-run against `web/test/rules.test.ts`'s R2 row before trusting a wider
// pattern.
//
// A law whose checkId AND number match none of the three is reported
// UNRESOLVED rather than guessed at: this file may only ever name a path it
// has just found, so R58 (`named-paths`) can never see a link that doesn't
// open, and nothing here ever restates a law's own prose (RULES.md stays the
// one owner of that).
//
// ── THE ROT CHECK ─────────────────────────────────────────────────────────
//
// `--check` regenerates the file in memory and diffs it against what's
// committed, matching `kb-exam-merge.mjs --check`'s own convention elsewhere
// in this folder. Wired into `npm run check` so the index cannot go stale the
// way COSTS.md did — a generated doc nobody re-runs is a hand-kept doc with
// extra steps.

import "./lib/shared-alias.mjs"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { dirname, join, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { importTs } from "./lib/import-ts.mjs"

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..")
const OUT = join(REPO, "documents", "RULES-INDEX.md")

const { RULES_REGISTRY } = await importTs(join(REPO, "shared", "rules", "registry.ts"))
const { sourceFiles } = await importTs(join(REPO, "shared", "rules", "source-scan.ts"))

/** Every directory that can legitimately hold a law's check — the eight worker
 * suites plus both front doors'. Named explicitly rather than walked from
 * `workers/*`, because a worker without a `test/` directory would otherwise
 * throw out of `sourceFiles` rather than simply contribute nothing. */
const CHECK_ROOTS = [
  "workers/auth/test",
  "workers/tenancy/test",
  "workers/content/test",
  "workers/data-ops/test",
  "workers/mcp/test",
  "workers/realtime/test",
  "workers/gateway/test",
  "workers/portal-gateway/test",
  "web/test",
  "web-portal/test",
]
  .map((r) => join(REPO, r))
  .filter((r) => existsSync(r))

const checkFiles = sourceFiles(CHECK_ROOTS, {
  extensions: [".test.ts", ".test.tsx"],
  relativeTo: REPO,
})

/** Escape a checkId for use inside a RegExp — every checkId in the registry is
 * already `[a-z0-9-]+`, but this costs nothing and refuses to assume it. */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** The file(s) that check ONE law, derived fresh against `checkFiles` — never
 * against a prior run's own output, which is what would make this a cache
 * instead of a generator. */
function filesFor(checkId, lawId) {
  const escaped = escapeRe(checkId)
  const dedicated = new RegExp(`(^|${sep === "\\" ? "\\\\" : sep})${escaped}\\.test\\.tsx?$`)
  const inline = new RegExp("it\\(\\s*[`'\"]" + escaped + "\\b")
  // The rule's bare number, e.g. "9" out of "R9" — a trailing letter (a
  // sub-lettered id, if the registry ever mints one) rides along unescaped
  // since \b still bounds it correctly either side.
  //
  // NOT a bare `\bR<n>\b` — measured, and it collides for real: Cloudflare's
  // own object-storage product is ALSO spelled "R2", and three files about it
  // (`backup-covers-r2.test.ts`, `r2-cors.test.ts`, `r2-lifecycle.test.ts`)
  // matched Law R2 (`record-detail-tabs`) under that looser pattern before
  // this line existed. So the match is narrowed to the two conventions this
  // repo's suites actually use for a LAW's own number — "Law R<n>" written
  // out, or "R<n>" immediately followed by a dash the way `describe("R70 —
  // …")` reads — neither of which "R2 CORS …" or "the backup covers R2" can
  // satisfy. A third, equally common convention turned up alongside it: a
  // parenthesised `(R<n>)` — `describe("agent-filter-parity (R19): …")` —
  // sometimes naming more than one law (`(R14 · R40)`, `(R14 + R16)`). Checked
  // the same way before trusting it: no top-level R2-storage describe in this
  // repo is ever written `(R2)`, so it costs nothing this pattern already paid
  // for above.
  const num = escapeRe(lawId.replace(/^R/, ""))
  // The `\b` sits INSIDE each alternative, not once in front of the group —
  // a shared leading `\b` refused to match the parenthesised form, because
  // `\b` needs a word character on exactly one side and "… parity (R19)" has
  // a space before the "(", a non-word character on BOTH sides of that gap.
  const numbered = new RegExp(
    `^describe\\(\\s*[\`'"][^\\n]*(?:\\bLaw R${num}\\b|\\bR${num}\\s*[—-]|\\(R${num}\\b)`,
    "m"
  )
  const hits = new Set()
  for (const f of checkFiles) {
    if (dedicated.test(f.rel) || inline.test(f.source) || numbered.test(f.source)) hits.add(f.rel)
  }
  return [...hits].sort()
}

const rows = RULES_REGISTRY.map((r) => ({ ...r, files: filesFor(r.checkId, r.id) }))
const unresolved = rows.filter((r) => r.files.length === 0)

const byDimension = { arch: [], ui: [], workflow: [], ai: [] }
for (const r of rows) byDimension[r.dimension]?.push(r)

const DIMENSION_LABEL = {
  arch: "Architecture",
  ui: "UI",
  workflow: "Workflow",
  ai: "AI / agent",
}

const lines = []
lines.push("# RULES-INDEX.md — every law, and the file(s) that check it")
lines.push("")
lines.push(
  "**GENERATED. Do not hand-edit — run `node --experimental-transform-types " +
    "scripts/rules-index.mjs` to regenerate.** `npm run check` runs it with " +
    "`--check` and fails the build if this file disagrees with the checked-in " +
    "test tree, the same way `kb-exam-merge.mjs --check` guards KB-EXAM-UNION.md."
)
lines.push("")
lines.push(
  "This file answers WHERE a law is checked. It never restates WHAT a law says " +
    "— that stays [RULES.md](../RULES.md)'s alone (README.md's own rule: one " +
    "topic, one owner). Every path below was resolved on disk in the run that " +
    "produced this file, never typed by hand, so a moved or renamed check file " +
    "cannot leave a stale link behind — the generator would simply stop finding " +
    "it and report the law UNRESOLVED instead."
)
lines.push("")
lines.push(
  `${RULES_REGISTRY.length} laws, ${rows.length - unresolved.length} resolved to at least one check file, ` +
    `${unresolved.length} unresolved.`
)
lines.push("")

for (const dim of ["arch", "ui", "workflow", "ai"]) {
  const group = byDimension[dim]
  if (!group.length) continue
  lines.push(`## ${DIMENSION_LABEL[dim]} (${group.length})`)
  lines.push("")
  lines.push("| Law | Status | checkId | Checked in |")
  lines.push("|---|---|---|---|")
  for (const r of group) {
    const fileLinks = r.files.length
      ? r.files.map((f) => `\`${f}\``).join("<br>")
      : "*unresolved — see below*"
    lines.push(`| ${r.id} | ${r.status} | \`${r.checkId}\` | ${fileLinks} |`)
  }
  lines.push("")
}

if (unresolved.length) {
  lines.push("## Unresolved")
  lines.push("")
  lines.push(
    "None of the three patterns this generator looks for matched anywhere " +
      "under the check roots it walks (`workers/*/test`, `web/test`, " +
      "`web-portal/test`): no dedicated `<checkId>.test.ts` file, no " +
      "`it(\"<checkId>: …\")` case, and no top-level `describe(\"… R<n> …\")` " +
      "naming the law's own number. Not necessarily unchecked — a law can be " +
      "enforced by a shared helper none of the three recognise — but this " +
      "generator refuses to guess, so read the law's own entry in " +
      "`shared/rules/registry.ts` and RULES.md directly."
  )
  lines.push("")
  for (const r of unresolved) lines.push(`- ${r.id} (\`${r.checkId}\`, ${r.status})`)
  lines.push("")
}

lines.push("---")
lines.push("")
lines.push(
  "Regenerated by `scripts/rules-index.mjs`, which imports `RULES_REGISTRY` " +
    "from `shared/rules/registry.ts` and walks the check roots through the " +
    "one shared file-reading seam every law that scans source stands on " +
    "(`shared/rules/source-scan.ts`'s `sourceFiles`). No hand-typed path in " +
    "this file, and none permitted — see the header of the generator."
)
lines.push("")

const generated = lines.join("\n")

if (process.argv.includes("--check")) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : null
  if (current !== generated) {
    console.error(
      `documents/RULES-INDEX.md is stale against the checked-in tree.\n` +
        `Run: node --experimental-transform-types scripts/rules-index.mjs\n` +
        (current === null ? `(the file does not exist yet)\n` : "")
    )
    process.exit(1)
  }
  console.log(
    `rules-index: current — ${RULES_REGISTRY.length} laws, ${unresolved.length} unresolved.`
  )
} else {
  writeFileSync(OUT, generated)
  console.log(
    `rules-index: wrote documents/RULES-INDEX.md — ${RULES_REGISTRY.length} laws, ` +
      `${rows.length - unresolved.length} resolved, ${unresolved.length} unresolved.`
  )
}
