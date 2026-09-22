// A CALLER OF `auditFields`/`auditItems` (web/lib/audit-overview.ts) SELECTS A
// FACT BY NAME, NEVER BY ARRAY POSITION.
//
// Found 22 Sep 2026, over `web/components/knowledge/knowledge-detail.tsx`'s own
// Overview tab, mid-fix for a real duplication (creator/created/editor/updated
// were showing twice: once in the ink footer's Record column, once as rows in
// Overview). The first cut kept only the Status row with `auditItems(...)[4]` —
// correct today only because `auditItems`'s own doc comment happens to promise
// a fixed order. The coordinator's own words are why this file exists: "The
// moment anybody inserts a row above Status, or makes a row conditional, the
// call site silently takes a DIFFERENT fact and puts it on the page under the
// wrong heading, with every check still green. A positional index into a
// returned list is the same class of mistake as keying an exemption by a line
// number, and this repo already has a law against that habit for exactly this
// reason." (`documents/UI-RULEBOOK.md`'s own exemption tables are keyed by
// `{file, contains}`, never a line number, for the identical reason: a position
// rots the moment something moves above it.)
//
// THE FIX, upstream in audit-overview.ts: `auditFields` hands back the same
// five facts as a NAMED object (`createdBy` / `created` / `editedBy` / `edited`
// / `status`), and `auditItems` (kept for a caller that wants every fact as one
// ordered DescriptionList — none does today) is now BUILT FROM it rather than a
// second, independently-ordered literal. This census is the other half: it
// refuses a call site that reads either export's return value BY POSITION —
// `[<digit>]`, `.at(<digit>)`, or an array-destructuring assignment straight off
// `auditItems(...)` — so the mistake this file's own header describes cannot
// come back through a different call site.
//
// PROVED NOT VACUOUS the same way `footer-audit-completeness.test.ts` (the
// previous lane's own census, beside this one) proves itself: against synthetic
// source only, at the bottom of this file, so the census is shown to catch the
// exact shape of the regression and never flag the by-name form that replaced
// it.

import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const REPO_ROOT = join(__dirname, "..", "..")
// `web/lib/audit-overview.ts` is reachable only from `web/` (`@/*` resolves
// inside the web workspace alone, per web/tsconfig.json) and from `shared/`
// by a relative import if one is ever written — both roots are censused so a
// future caller anywhere either could import from is covered, not only the
// one file that calls it today.
const ROOTS = [join(REPO_ROOT, "web"), join(REPO_ROOT, "shared")]

const CALL_NAMES = ["auditFields", "auditItems"] as const

interface Finding {
  rel: string
  snippet: string
}

/** The index of the `)` that closes the `(` at `openParenIdx`, depth-counted so
 * a nested call inside the arguments (there always is one: `t`, `lang`, and an
 * object literal) never closes the outer call early — the same technique
 * `footer-audit-completeness.test.ts`'s own `tagEnd` uses for a JSX tag. */
function matchingParenEnd(src: string, openParenIdx: number): number {
  let depth = 1
  for (let i = openParenIdx + 1; i < src.length; i++) {
    const c = src[i]
    if (c === "(") depth++
    else if (c === ")") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/** Scans one file's (already comment-stripped) source for every call to one of
 * `CALL_NAMES`, and flags a POSITIONAL read of its return value:
 *   (a) a numeric index chained straight onto the call — `(...)  [4]`
 *   (b) `.at(<digit>)` chained the same way
 *   (c) an array-destructuring assignment reading FROM `auditItems(...)` —
 *       `const [a, b, c] = auditItems(...)` — meaningful only for the
 *       array-returning export; `auditFields` returns a plain object, and
 *       `const { status } = auditFields(...)` is exactly the by-name form
 *       this census exists to require, not to catch. */
function findingsIn(rel: string, rawSource: string): Finding[] {
  const src = stripComments(rawSource)
  const out: Finding[] = []
  for (const name of CALL_NAMES) {
    const openRe = new RegExp(`\\b${name}\\s*\\(`, "g")
    let m: RegExpExecArray | null
    while ((m = openRe.exec(src))) {
      const openParenIdx = m.index + m[0].length - 1
      const end = matchingParenEnd(src, openParenIdx)
      if (end === -1) continue

      const after = src.slice(end + 1)
      const leadWs = /^\s*/.exec(after)![0].length
      const tail = after.slice(leadWs, leadWs + 24)
      const idxMatch = /^\[\s*\d+\s*\]/.exec(tail)
      const atMatch = /^\.at\(\s*\d+\s*\)/.exec(tail)
      if (idxMatch) out.push({ rel, snippet: `${name}(...)${idxMatch[0]}` })
      if (atMatch) out.push({ rel, snippet: `${name}(...)${atMatch[0]}` })

      if (name === "auditItems") {
        const before = src.slice(Math.max(0, m.index - 200), m.index)
        const destructure = /(?:const|let|var)\s*\[[^\]]*\]\s*=\s*$/.exec(before)
        if (destructure) out.push({ rel, snippet: `${destructure[0].trim()} ${name}(...)` })
      }
    }
  }
  return out
}

function findings(): Finding[] {
  const files = sourceFiles(ROOTS, {
    extensions: [".ts", ".tsx"],
    relativeTo: REPO_ROOT,
    recursive: true,
    skipTests: true,
  })
  const out: Finding[] = []
  for (const f of files) out.push(...findingsIn(f.rel, f.source))
  return out
}

describe("a caller of auditFields/auditItems selects a fact by name, never by array position", () => {
  it("no real call site indexes the return value numerically, chains .at(<digit>), or destructures it positionally", () => {
    const found = findings()
    expect(
      found,
      `these call sites read auditFields()/auditItems() BY POSITION. Select the fact you want by ` +
        `NAME instead — auditFields(...).status (or .createdBy/.created/.editedBy/.edited) — because a ` +
        `position is only correct while nothing changes above it, silently, with every check still ` +
        `green the day it stops being true:\n  ` +
        found.map((x) => `${x.rel}  ${x.snippet}`).join("\n  ")
    ).toEqual([])
  })

  // PROVED NOT VACUOUS — against synthetic source only, mirroring exactly the
  // regression this file's own header describes and the by-name fix that
  // replaced it, so a change to the matcher above cannot quietly stop catching
  // either shape without one of these going red.

  it("catches a synthetic numeric index chained onto auditItems(...)", () => {
    const synthetic = [
      "function overview() {",
      "  return [",
      "    auditItems(",
      "      { createdByName: a, createdAt: b, editedByName: c, updatedAt: d, status: e },",
      "      t,",
      "      lang",
      "    )[4],",
      "  ]",
      "}",
      "",
    ].join("\n")
    expect(findingsIn("synthetic.ts", synthetic)).toEqual([{ rel: "synthetic.ts", snippet: "auditItems(...)[4]" }])
  })

  it("catches a synthetic .at(<digit>) chained onto auditFields(...)", () => {
    const synthetic = "const row = auditFields(meta, t, lang).at(4)"
    expect(findingsIn("synthetic.ts", synthetic)).toEqual([
      { rel: "synthetic.ts", snippet: "auditFields(...).at(4)" },
    ])
  })

  it("catches a synthetic positional array-destructure of auditItems(...)", () => {
    const synthetic = "const [createdBy, created, editedBy, edited, status] = auditItems(meta, t, lang)"
    expect(findingsIn("synthetic.ts", synthetic)).toEqual([
      {
        rel: "synthetic.ts",
        snippet: "const [createdBy, created, editedBy, edited, status] = auditItems(...)",
      },
    ])
  })

  it("does not flag the by-name form that replaced the regression", () => {
    const synthetic = [
      "auditFields(",
      "  { createdByName: a, createdAt: b, editedByName: c, updatedAt: d, status: e },",
      "  t,",
      "  lang",
      ").status,",
    ].join("\n")
    expect(findingsIn("synthetic.ts", synthetic)).toEqual([])
  })

  it("does not flag an ordinary destructure of auditFields(...)'s own object", () => {
    const synthetic = "const { status } = auditFields(meta, t, lang)"
    expect(findingsIn("synthetic.ts", synthetic)).toEqual([])
  })

  it("does not flag a caller that spreads every auditItems(...) row, in order, on purpose", () => {
    const synthetic = "const rows = [...auditItems(meta, t, lang)]"
    expect(findingsIn("synthetic.ts", synthetic)).toEqual([])
  })
})
