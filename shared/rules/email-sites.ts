// EVERY FUNCTION IN `workers/` THAT COMPOSES A BRANDED EMAIL — one derivation,
// read by two laws.
//
// R30 (`linked-emails`) asks whether each of these is CLASSIFIED and whether one
// that names a record carries the way back to it. R70 (`automations`) asks
// whether each of them appears in the automation registry, so that no message
// this base sends is invisible on the settings page the client ruled for.
//
// EXTRACTED RATHER THAN COPIED, and that is the whole reason this file exists:
// two laws standing on two hand-kept lists of "what an email is" eventually
// disagree, and the day they do, one of them is quietly enforcing nothing. The
// census moved here unchanged on 2026-09-11 — `linked-emails.test.ts` was its
// only reader until then, and now reads it from here.

import { sourceFiles, stripComments } from "./source-scan"
import { readdirSync } from "node:fs"
import { join } from "node:path"

/** THE SEAM THAT PUTS A MESSAGE ON THE WIRE, under any local name.
 *
 * Two functions compose a branded email: `brandedEmail` (auth, which owns the
 * Resend key and calls the template directly) and `sendBrandedEmail` (everyone
 * else, who hands the finished message to auth's internal door). Both are
 * imported — and one of them is imported ALIASED in two files
 * (`sendBrandedEmail as send`), so the local names are read off each file's own
 * import statements rather than assumed. A law that can be dodged by renaming an
 * import is not a law.
 *
 * Deliberately NOT the seam: auth's `sendEmail` and its `/internal/send-email`
 * door. Those are the PIPE — they relay a message somebody else composed, and
 * the composer is the one with something to say about a record. */
export function emailSeamNames(src: string): string[] {
  const names = new Set<string>()
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"[^"]*(?:email-template|workers\/notify)"/g))
    for (const spec of m[1].split(",")) {
      const [imported, local] = spec.split(/\s+as\s+/).map((s) => s.trim())
      if (imported === "brandedEmail" || imported === "sendBrandedEmail") names.add(local || imported)
    }
  return [...names]
}

/** Every function in `workers/` that composes a branded email, as
 * `<repo-relative file>::<function>` → its own source.
 *
 * A body runs from its `export function` to the next one — the same slice the
 * publish-seam, gating-seam and R14 scans take, so this reads the code the same
 * way its twenty-eight siblings do. */
export function emailSites(root: string): Map<string, string> {
  const srcDirs = readdirSync(join(root, "workers"), { withFileTypes: true })
    .filter((w) => w.isDirectory())
    .map((w) => join(root, "workers", w.name, "src"))
  const out = new Map<string, string>()
  for (const file of sourceFiles(srcDirs, { extensions: [".ts"], relativeTo: root })) {
    const seams = emailSeamNames(file.source)
    if (!seams.length) continue
    // Comments discuss the very seams being scanned ("sent through the SAME
    // branded template"), so they are not code here either.
    const code = stripComments(file.source)
    const starts = [...code.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)]
    starts.forEach((m, i) => {
      const body = code.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : undefined)
      if (seams.some((name) => new RegExp(`\\b${name}\\s*\\(`).test(body)))
        out.set(`${file.rel}::${m[1]}`, body)
    })
  }
  return out
}
