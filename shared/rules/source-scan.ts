// THE ONE WAY A LAW READS SOURCE OFF DISK.
//
// A TEST module, like seam-scan.ts beside it. Nothing in any worker's src/ or
// either front end's app/ imports it, and wrangler bundles from src/, so it never
// ships. It lives in shared/rules/ because that is where the law machinery lives:
// registry.ts is the laws as DATA, seam-scan.ts is R1 + R10 as CODE, and this is
// the file-reading every one of them stands on.
//
// WHY IT EXISTS. Thirteen test files each hand-rolled a recursive readdirSync
// walker, and they did not agree. Some took `.ts`, some `.tsx`, some both minus
// `.test.ts`; some recursed and some read one directory flat. That is not a
// tidiness problem. web/test/rules.test.ts enforces R3/R4/R7/R16 over a RECURSIVE
// walk of web/components — which has three subdirectories — while
// web-portal/test/rules.test.ts enforced the same four laws over a FLAT read of
// web-portal/components. Both said "every component". They meant different sets.
// The portal's folder happens to be flat today, so the law is green and correct;
// the first portal component to move into a subdirectory would leave it green and
// wrong. A law that silently stops applying is worse than one that fails, because
// nothing goes red.
//
// So: one walker, and every option it has is EXPLICIT at the call site. The
// default is to recurse, because "every file under here" is what a law almost
// always means; a caller that genuinely wants one directory has to say
// `recursive: false` and can be asked why.
//
// Build directories are skipped unconditionally — a walk that wanders into
// node_modules is not a check, it is a hang.

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

/** Never walked: generated output and installed packages are not this repo's source. */
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "out", "dist", "coverage"])

/** One source file, in the three shapes the callers ask for: the absolute path
 * (to read again), the path relative to the scan's base (what a failure message
 * should name), and the text. */
export type SourceFile = {
  /** Absolute path on disk. */
  path: string
  /** Path relative to `relativeTo` (defaults to the root it was found under). */
  rel: string
  /** The file's contents. */
  source: string
}

export type WalkOptions = {
  /** Which file extensions count. No default — a law states its own subject. */
  extensions: string[]
  /** Walk subdirectories. Defaults to TRUE; say `false` only when one directory
   * is genuinely the whole subject (repo-root docs, say) and mean it. */
  recursive?: boolean
  /** Leave test files out — the scan's subject is usually the code, not its
   * checks. Defaults to false, so a caller that needs it says so. */
  skipTests?: boolean
  /** Base for `rel`. Defaults to the root each file was found under. */
  relativeTo?: string
}

/** Every source file under `roots`, read. Sorted, so a failure message lists the
 * same offenders in the same order on every machine. */
export function sourceFiles(roots: string | string[], options: WalkOptions): SourceFile[] {
  const dirs = typeof roots === "string" ? [roots] : roots
  const recursive = options.recursive ?? true
  const out: SourceFile[] = []

  for (const root of dirs) {
    const base = options.relativeTo ?? root
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) {
          if (recursive && !SKIP_DIRS.has(entry.name)) walk(path)
          continue
        }
        if (!options.extensions.some((ext) => entry.name.endsWith(ext))) continue
        if (options.skipTests && /\.test\.tsx?$/.test(entry.name)) continue
        out.push({ path, rel: relative(base, path), source: readFileSync(path, "utf8") })
      }
    }
    walk(root)
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/** node:path's own `relative` is not in the workers' Node shim (they compile with
 * @cloudflare/workers-types and no @types/node), and the only case here is a path
 * that already starts with its base — so this is a prefix strip, not a path
 * algebra. It falls back to the absolute path rather than lying about a
 * relationship it can't compute. */
function relative(base: string, path: string): string {
  if (!path.startsWith(base)) return path
  const rest = path.slice(base.length)
  return rest.startsWith("/") ? rest.slice(1) : rest
}

// ─────────────────────────────────────────────────────────────────────────────
// AND THE STRIPPER, WHICH NOW LIVES NEXT DOOR IN PLAIN JAVASCRIPT.
//
// `stripComments` and `stripJsoncComments` were declared in THIS file until
// 7 Sep 2026. They moved to `strip-comments.mjs` beside it — the same code,
// byte for byte the same output — for a reason that has nothing to do with
// tidiness and everything to do with WHO RUNS THEM.
//
// Every caller here compiles: the laws run under vitest, which transpiles
// TypeScript on the way in. But `scripts/*.mjs` run under PLAIN NODE with no
// build step, and one of them — `scripts/smoke-portal.mjs`, the LAST step of
// `deploy:staging` — derives the R24 internal-money door list off disk at deploy
// time. It was hand-rolling the two regexes this tokeniser exists to replace, so
// a deploy gate was choosing which doors to attack from source it could not
// fully see, and a SHORT list of doors to attack passes. It could not import
// this file to fix that: node strips types without a flag only from 22.18, and
// `package.json` promises `>=22`, so the import would have worked on one machine
// and failed on a supported one — at the end of a deploy, after eight workers
// had shipped. Moving the code is a smaller promise than moving `engines`.
//
// THIS RE-EXPORT IS THE WHOLE COMPATIBILITY LAYER. Every TypeScript caller still
// writes `from "@shared/rules/source-scan"` and none of them changed. There is
// still exactly ONE stripper: web/test/source-scan.test.ts censuses `scripts/`
// and `.mjs` as well now, so a second copy anywhere — including a script — turns
// the build red.
// ─────────────────────────────────────────────────────────────────────────────

export { stripComments, stripJsoncComments } from "./strip-comments.mjs"
export type { StripOptions } from "./strip-comments.mjs"
