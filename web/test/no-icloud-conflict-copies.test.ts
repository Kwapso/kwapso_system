import { describe, expect, it } from "vitest"
import { readdirSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")

/* THIS REPOSITORY LIVES INSIDE iCLOUD, AND iCLOUD RESOLVES A CONFLICT BY
 * MAKING A SECOND COPY.
 *
 * `~/Documents` is synced by iCloud Drive's Desktop & Documents feature —
 * confirmed on this machine: `~/Library/Mobile Documents/com~apple~CloudDocs/
 * Documents` exists, the repo root carries `com.apple.file-provider-domain-id`,
 * and `bird`, the sync daemon, is running. When iCloud believes two versions of
 * a file exist it keeps both, naming the loser `<name> 2`, `<name> 3`, and so
 * on. It does this to DIRECTORIES as well as files.
 *
 * ── WHAT IT ACTUALLY BROKE ──────────────────────────────────────────────────
 *
 * On 2026-09-07 it duplicated four whole directories inside `shared/ui/` —
 * `components 2`, `compositions 2`, `foundations 2`, `assets 2`. That directory
 * is the VENDORED design kit, and `vendored-kit.test.ts` hashes its contents to
 * prove nobody has hand-edited it. The hash moved, so the kit-integrity check
 * failed with a message about hand-editing, which is not what had happened at
 * all. Twice before, duplicated `.d.ts` files under the Next build directory
 * broke `tsc` with "Duplicate identifier", which reads like a code error and is
 * not one.
 *
 * Both failures point at the wrong culprit, and that is why this check exists:
 * so the next person sees the real cause in one line instead of hunting a
 * hand-edit that never happened.
 *
 * ── WHY A TEST AND NOT A .gitignore ENTRY ───────────────────────────────────
 *
 * These files are already untracked — none has ever been committed, and git is
 * not the thing at risk. What is at risk is every tool that READS the tree:
 * tsc, the kit hash, the law scanners. Ignoring them would hide them from git
 * and leave them in front of the compiler, which is exactly backwards.
 *
 * ── THE REAL FIX IS ENVIRONMENTAL ───────────────────────────────────────────
 *
 * Nothing inside the repository can opt a folder out of iCloud. The cure is to
 * keep the working copy outside a synced directory, or to turn Desktop &
 * Documents sync off. Until then this check turns a mystery into a sentence.
 */
const SUSPECT = /^(.*?) \d+(\..+)?$/

/** Where a duplicate does real damage: everything a tool reads. Build output is
 * deliberately included — the `tsc` failures came from `web/.next/types`. */
const ROOTS = ["shared", "web", "web-portal", "workers", "scripts", "tools", "documents"]

/** How many directories the sweep actually opened. THE ONLY THING THIS CHECK
 * CAN FLOOR.
 *
 * Every other empty-list census in this repo can name a positive control — some
 * file that MUST match the pattern, so a scan matching nothing goes red. This
 * one cannot: the pattern is "a conflict copy", the correct state of the tree is
 * that there are none, and a control would have to be a conflict copy committed
 * on purpose. So the tripwire is one level down — not "did it find something"
 * but "did it LOOK anywhere". A sweep that walked four directories because six
 * of the seven roots were renamed reports a clean tree in the same words as a
 * clean tree. */
let visited = 0

function conflictCopies(dir: string, out: string[]): void {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  visited++
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue
    const full = join(dir, entry.name)
    if (SUSPECT.test(entry.name)) {
      // A real file may legitimately end in a number ("base 16.md"). The tell is
      // that a SIBLING exists with the same name minus the number, which is what
      // makes it a copy rather than a name.
      const twin = entry.name.replace(SUSPECT, "$1$2")
      if (twin !== entry.name && entries.some((e) => e.name === twin)) {
        out.push(relative(ROOT, full))
        continue
      }
    }
    if (entry.isDirectory()) conflictCopies(full, out)
  }
}

describe("the working copy", () => {
  it("carries no iCloud conflict copies", () => {
    const found: string[] = []
    /** A root the sweep could not open. This USED to be swallowed — `catch {}`
     * with a note saying a missing root is not this test's business — and that
     * was the one way this check could go quiet: rename `workers/` and the
     * sweep skips it in silence, on a machine where iCloud is duplicating
     * directories under it. A root that has genuinely gone is a fact worth a
     * red line and a one-word edit here, not a shrug. */
    const unreachable: string[] = []
    for (const root of ROOTS) {
      const dir = join(ROOT, root)
      try {
        if (statSync(dir).isDirectory()) conflictCopies(dir, found)
        else unreachable.push(`${root} (not a directory)`)
      } catch {
        unreachable.push(`${root} (missing)`)
      }
    }
    expect(
      unreachable,
      "these roots could not be swept, so nothing was checked under them — a root that has moved must be renamed in ROOTS, not skipped:\n  " +
        unreachable.join("\n  ")
    ).toEqual([])
    // …AND IT REALLY WALKED THE TREE. Seven roots, 538 directories between
    // them today (measured, node_modules and .git excluded as the sweep
    // excludes them). 200 is a floor with room to lose more than half the tree
    // and still far above what a sweep down to one root would reach.
    expect(
      visited,
      `the sweep opened only ${visited} directories — it is reporting a clean tree it never looked at`
    ).toBeGreaterThan(200)
    expect(
      found,
      "iCloud has made conflict copies inside the working tree. These are NOT " +
        "hand-edits and NOT code errors, whatever the failure that sent you here " +
        "said — they are second copies of files this repository already has, made " +
        "because it lives in a synced ~/Documents. Delete them:\n" +
        found.map((f) => `  rm -rf ${JSON.stringify(f)}`).join("\n") +
        "\nThe lasting fix is to keep the working copy outside iCloud."
    ).toEqual([])
  })
})
