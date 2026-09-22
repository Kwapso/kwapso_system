// THE CRASH-CLASS GUARD (React #310/#300): a hook called BELOW a top-level early
// return renders fine until the day the early return fires first — then the hook
// count changes between renders and the whole tree white-screens. The fix for one
// file is hoisting; THIS check makes the class unshippable at any size: it walks
// every component/hook function in web source and fails any use*() call that
// appears after an early return in the same function. Worth more than any single
// fix — the containment half is the ErrorBoundary in the root layout.
//
// A SCANNER WITH A BLIND SPOT IS A CHECK THAT IS SILENTLY OFF, so the scanner is
// itself locked by fixtures below. Four real blind spots have been found this way
// (each waved a whole file through, or invented a finding that was not there): a
// `React.`-namespaced hook; a destructured param's `{` mistaken for the body; a
// guard written the ordinary way, `if (!ready) {\n return null\n}`, whose return
// sits at brace depth 2 and so never registered as a return at all; and (22 Sep
// 2026) a NESTED FUNCTION DECLARATION CARRYING A RETURN-TYPE ANNOTATION —
// `function helper(x: string): number | undefined { ... }` inside a component.
// Hence the rule the walk now uses: a return counts unless it is inside a NESTED
// FUNCTION (a callback's own return is its own; an `if`/`try`/`switch` block's
// return is the component's).
//
// THE FOURTH ONE WAS THE DANGEROUS DIRECTION. `opensNestedFunction` decided
// "nested or not" by looking at the single character before the `{`: `=> {` for
// an arrow, `) {` for everything else, anything else a plain block. A return-type
// annotation (`): T {`) puts the type's own last character there instead, so the
// helper read a genuine nested function as a bare block — its body's own
// `return` statements were then credited to the ENCLOSING component, and a
// `use*()` call written after the helper, however many statements later, was
// flagged as following an early return that was never the component's own.
// `module-settings-screen.tsx`'s `typeValueCount` (a private helper with exactly
// this shape) tripped it this way; reshaping that one function to dodge the scan
// would have left every OTHER annotated nested declaration in this codebase
// still invisible to it — worse, in the direction this comment opens with: a
// scanner that cannot find where a nested function BEGINS cannot reliably find
// where one ENDS either, and the same misreading that INVENTS a false early
// return here could just as easily SWALLOW a real one inside a block it
// wrongly calls "nested" — the false negative, silently missing the exact crash
// class this file exists to catch. So the scanner was fixed, not the component.
//
// `returnTypeParenBeforeBrace` (below) is the fix: when the character right
// before the `{` is not `)` and not the end of `=> `, it walks backward once
// more through what LOOKS like an ordinary TYPE EXPRESSION — identifiers, dotted
// paths, `,`/`|`/`&`/`?`, whitespace, quoted literal types, and BALANCED
// `<>`/`()`/`[]`/`{}` — until it either reaches a top-level `:` sitting directly
// after a `)` (a return-type annotation: hand the `)` back so the existing
// paren-matching walk resumes exactly as it would have for `) {`) or runs into
// a character it does not recognise as part of an ordinary type (bail, unchanged
// from before this fix). BAILING IS THE SAFE DIRECTION HERE, not a remaining
// gap papered over: an unrecognised shape falls back to "not nested" — the
// direction that produces a NOISY false positive (an extra, wrong finding, the
// same failure mode this whole class already is), never a false negative that
// hides a real one. Two shapes are named, not silently guessed past, because
// they are genuinely outside what a backward character walk can resolve without
// a real parser: a return type that itself contains an ARROW (a function-type
// return value, `(): (x: number) => string {`) reads its own `=>` as this
// scanner's arrow-detection and gives up on the type; and a TEMPLATE LITERAL
// TYPE with a `${...}` interpolation is walked only as far as its balanced
// braces, never evaluated. Both are rare enough in house style (verified: zero
// hits across the current scanned tree) that bailing on them costs a false
// positive nobody has hit yet, not a silent hole — if one ever lands, this
// scanner will flag it wrong and loud, which is the failure mode to have.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { sourceFiles, stripComments } from "@shared/rules/source-scan"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")

/** Every component, hook and page in the agency app. */
function scannedFiles(): string[] {
  return sourceFiles(
    ["components", "lib", "app"].map((d) => join(WEB, d)),
    { extensions: [".ts", ".tsx"], skipTests: true }
  ).map((f) => f.path)
}

/** Strip strings/template literals/comments so braces inside them don't skew the
 * depth walk (heuristic, good enough for house-style code).
 *
 * LENGTH-PRESERVING — every index the brace walk below computes has to keep
 * pointing at the same place in the original text, which is why the comments come
 * out through the shared stripper's `keepLength` mode rather than being deleted.
 *
 * It used to re-type the comment regexes here to get that, and inherited their
 * blindness: `accept="image/*"` in a JSX attribute opened a "comment" that ran to
 * the next `*​/`, and the braces in between were blanked out of the depth walk.
 * The strings are still blanked here, because a `{` inside one is not a block —
 * that half is this suite's own job and nobody else's. */
function stripNoise(src: string): string {
  return stripComments(src, { keepLength: true })
    .replace(/`(?:\\.|[^`\\])*`/g, (m) => `"${" ".repeat(Math.max(0, m.length - 2))}"`)
    .replace(/"(?:\\.|[^"\\])*"/g, (m) => `"${" ".repeat(Math.max(0, m.length - 2))}"`)
    .replace(/'(?:\\.|[^'\\])*'/g, (m) => `'${" ".repeat(Math.max(0, m.length - 2))}'`)
}

/** `{` openers that are a BLOCK, not a function body — their returns belong to
 * the enclosing component, which is exactly what makes them early returns. */
const BLOCK_KEYWORDS = new Set(["if", "for", "while", "switch", "catch"])

/** Plausible characters inside an ORDINARY type expression, walked backward:
 * word characters, `$` (a type param can be named `$T` in this codebase's own
 * style, and the check has to accept what it would accept going forward),
 * `.` (a namespaced type), `,`/`|`/`&`/`?` (tuple/union/intersection/optional),
 * whitespace, and the three quote characters (a string-literal type,
 * `"asc" | "desc"`, exactly the shape `paged-sort.test.ts`'s own door reads
 * off this codebase's real sort menus). Deliberately NOT `=` or `>` on its
 * own — those belong to `=>`, and a return type containing an arrow is one of
 * the two named gaps below. */
const TYPE_CHAR = /[\w$.,|&?\s"'`-]/

/** Given the index of the last non-whitespace character before a `{` that is
 * NOT itself a `)` (so the immediate, common case in `opensNestedFunction`
 * already returned), asks whether this is instead the END of a return-type
 * annotation — `): SomeType {` — by walking backward through what looks like
 * an ordinary type expression, tracking `<>`/`()`/`[]`/`{}` balance so a
 * generic, a tuple, an array type or an inline object type does not throw the
 * walk off, until it either finds a top-level `:` sitting directly after a
 * `)` (returns that `)`'s index, so the caller's existing paren-matching walk
 * resumes exactly as it would for the ordinary `) {` case) or meets a
 * character it does not recognise as part of an ordinary type (returns
 * `undefined` — the SAFE direction: falling back to "not nested" costs a
 * noisy false positive, never a silent false negative; see this file's own
 * header for the two shapes this deliberately still does not resolve). */
function returnTypeParenBeforeBrace(src: string, j: number): number | undefined {
  let i = j
  let angle = 0
  let paren = 0
  let bracket = 0
  let brace = 0
  while (i >= 0) {
    const c = src[i]
    if (angle === 0 && paren === 0 && bracket === 0 && brace === 0 && c === ":") {
      let k = i - 1
      while (k >= 0 && /\s/.test(src[k])) k--
      return src[k] === ")" ? k : undefined
    }
    if (c === ">") angle++
    else if (c === "<") {
      if (angle === 0) return undefined
      angle--
    } else if (c === ")") paren++
    else if (c === "(") {
      if (paren === 0) return undefined
      paren--
    } else if (c === "]") bracket++
    else if (c === "[") {
      if (bracket === 0) return undefined
      bracket--
    } else if (c === "}") brace++
    else if (c === "{") {
      if (brace === 0) return undefined
      brace--
    } else if (!TYPE_CHAR.test(c)) return undefined
    i--
  }
  return undefined
}

/** Does the `{` at this index open a nested function body (arrow, function
 * expression, object method) rather than a plain block / object literal? */
function opensNestedFunction(src: string, brace: number): boolean {
  let j = brace - 1
  while (j >= 0 && /\s/.test(src[j])) j--
  if (j >= 1 && src[j] === ">" && src[j - 1] === "=") return true // `=> {`
  if (src[j] !== ")") {
    // `try {`, `else {`, `do {`, an object literal… — UNLESS this is a return-
    // type-annotated declaration, `): T {`, whose own closing `)` sits further
    // back than the single character this function otherwise looks at.
    const closeParen = returnTypeParenBeforeBrace(src, j)
    if (closeParen === undefined) return false
    j = closeParen
  }
  let paren = 1
  let k = j - 1
  while (k >= 0 && paren > 0) {
    if (src[k] === ")") paren++
    else if (src[k] === "(") paren--
    k--
  }
  while (k >= 0 && /\s/.test(src[k])) k--
  const end = k
  while (k >= 0 && /[\w$]/.test(src[k])) k--
  return !BLOCK_KEYWORDS.has(src.slice(k + 1, end + 1))
}

/** Component/hook function starts in a source: [name, index just past the `(`].
 * Both house shapes count — a shape the scan can't see is a file with the check
 * silently OFF. */
function functionStarts(src: string): Array<[string, number]> {
  const out: Array<[string, number]> = []
  const re =
    /(?:function\s+((?:[A-Z]|use[A-Z])\w*)\s*\(|(?:const|let|var)\s+((?:[A-Z]|use[A-Z])\w*)\s*(?::[^=;\n]*)?=\s*(?:async\s+)?\()/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) out.push([m[1] ?? m[2], re.lastIndex])
  return out
}

/** Offenders in ONE source: every hook call that appears after an early return
 * in the same component/hook function. `label` is what the failure names. */
export function findOffendersIn(src: string, label: string): string[] {
  const offenders: string[] = []
  src = stripNoise(src)
  for (const [name, afterParen] of functionStarts(src)) {
    // The body brace is the first `{` AFTER the parameter list closes — a
    // destructured param (`({ off }: …)`) has braces of its own, and taking the
    // first `{` blindly would "scan" the param object and skip the body.
    let paren = 1
    let p = afterParen
    while (p < src.length && paren > 0) {
      if (src[p] === "(") paren++
      else if (src[p] === ")") paren--
      p++
    }
    const bodyStart = src.indexOf("{", p)
    if (bodyStart === -1) continue
    // A concise arrow body (`= (x) => (`) has no braces of its own; walking on
    // would wander into unrelated JSX. It also can't hold a hook after a return.
    const gap = src.slice(p, bodyStart)
    if (gap.includes("=>") && !/=>\s*$/.test(gap)) continue
    // Walk the body tracking brace depth AND how many of those braces opened a
    // nested function. A hook ON the return statement itself (`return useX(…)`)
    // is legal — a return only counts once its own statement has ENDED (parens
    // balanced back + a newline; this codebase omits semicolons).
    let depth = 0
    let fnDepth = 0
    const braceIsFn: boolean[] = []
    let sawReturn = false
    let inReturn = false
    let returnParen = 0
    for (let i = bodyStart; i < src.length; i++) {
      const c = src[i]
      if (c === "{") {
        const nested = depth > 0 && opensNestedFunction(src, i)
        braceIsFn.push(nested)
        if (nested) fnDepth++
        depth++
      } else if (c === "}") {
        depth--
        if (braceIsFn.pop()) fnDepth--
        if (depth === 0) break // function body ended
      }
      if (inReturn) {
        if (c === "(" || c === "[") returnParen++
        else if (c === ")" || c === "]") returnParen--
        else if (c === "\n" && returnParen <= 0) {
          inReturn = false
          sawReturn = true // the early return statement has fully ended
        }
        continue
      }
      // A return ANYWHERE that isn't inside a nested function is the component's
      // own — including inside an `if`/`try`/`switch` block, the ordinary way a
      // guard clause is written.
      if (fnDepth === 0 && depth >= 1 && src.startsWith("return", i) && !/[\w$.]/.test(src[i - 1] ?? " ")) {
        inReturn = true
        returnParen = 0
        i += 5
        continue
      }
      if (depth === 1) {
        // Bare hooks AND namespaced ones (React.useState) both count.
        const hook = /^(?:React\.)?use[A-Z]\w*(?=[(<])/.exec(src.slice(i, i + 60))
        if (hook && !/[\w$.]/.test(src[i - 1] ?? " ")) {
          if (sawReturn) offenders.push(`${label} → ${name} calls ${hook[0]} after an early return`)
          i += hook[0].length - 1
        }
      }
    }
  }
  return offenders
}

function findOffenders(): string[] {
  return scannedFiles().flatMap((f) => findOffendersIn(readFileSync(f, "utf8"), f.slice(WEB.length)))
}

describe("hooks never follow a top-level early return (the React #310 crash class)", () => {
  it("every component/hook calls all its hooks before any early return", () => {
    const offenders = findOffenders()
    expect(
      offenders,
      `hoist these hooks above the early returns (a conditional hook count white-screens the tree): ${offenders.join("; ")}`
    ).toEqual([])
  })

  // The scanner itself must be able to see (a scan that finds no functions has
  // silently gone blind — this is the sanity tripwire).
  it("the scan actually parses the codebase (sees many components)", () => {
    let fns = 0
    for (const file of scannedFiles()) fns += functionStarts(readFileSync(file, "utf8")).length
    expect(fns).toBeGreaterThan(40)
  })

  // THE SCANNER'S OWN LOCK. Each shape below was, or could be, a blind spot that
  // switched the check off for a whole file. A regression here is worse than a
  // bad component: it is a check that cannot fail.
  it("catches every shape an early return is written in", () => {
    const shapes: Array<[string, string]> = [
      ["one-line guard", "function A() {\n  if (!x) return null\n  const [v] = useState(0)\n  return v\n}"],
      // The one that hid: the return sits at brace depth 2.
      ["braced guard", "function B() {\n  if (!ready) {\n    return null\n  }\n  const [v] = useState(0)\n  return v\n}"],
      ["React-namespaced hook", "function C() {\n  if (!x) return null\n  const v = React.useMemo(() => 1, [])\n  return v\n}"],
      ["destructured params", "function D({ off }: P) {\n  if (off) return null\n  const [v] = useState(0)\n  return v\n}"],
      ["arrow component", "const E = ({ off }: P) => {\n  if (off) return null\n  const [v] = useState(0)\n  return v\n}"],
      ["return inside try", "function F() {\n  try {\n    return read()\n  } catch {}\n  const [v] = useState(0)\n  return v\n}"],
      ["custom hook", "function useG() {\n  if (!x) {\n    return null\n  }\n  const v = useRef(0)\n  return v\n}"],
      // THE FALSE-NEGATIVE PROOF (22 Sep 2026): a return-type-annotated nested
      // function declaration sits BESIDE the real bug, not standing in for it —
      // this is the shape the fix must not let hide a genuine early return. If
      // `opensNestedFunction` ever again failed to recognise `helper` as nested,
      // its own two `return`s would falsely trip `sawReturn` before the real
      // `if` even runs — which happens to still leave this fixture red (the
      // real bug is real), so the fixture below it is the one that actually
      // catches a regression here: it proves the SAME annotated shape produces
      // ZERO offenders when the hooks are correctly ordered.
      [
        "real early return beside an annotated nested function",
        "function H() {\n  function helper(x: string): number | undefined {\n    if (x === \"\") return 1\n    return 2\n  }\n  if (!helper) return null\n  const [v] = useState(0)\n  return v\n}",
      ],
    ]
    for (const [what, src] of shapes) expect(findOffendersIn(src, what), `blind to: ${what}`).toHaveLength(1)
  })

  it("does not cry wolf on legal code", () => {
    const legal: Array<[string, string]> = [
      // A callback's own return is the callback's, not the component's.
      ["return in a callback", "function A() {\n  const r = xs.map((x) => {\n    if (!x) return null\n    return x\n  })\n  const [v] = useState(0)\n  return [r, v]\n}"],
      ["return in an effect", "function B() {\n  useEffect(() => {\n    if (!x) return\n    go()\n  }, [])\n  const [v] = useState(0)\n  return v\n}"],
      // A hook ON the return statement runs before the function ends.
      ["hook on the return", "function C() {\n  return useMemo(() => 1, [])\n}"],
      ["hooks then return", "function D() {\n  const [v] = useState(0)\n  if (!v) return null\n  return v\n}"],
      // THE REGRESSION LOCK FOR THE FIX ITSELF (22 Sep 2026): a nested function
      // DECLARATION (not an arrow) carrying a return-type annotation — the
      // exact shape `module-settings-screen.tsx`'s own `typeValueCount` is —
      // must read as nested, so its own early `return`s never reach the
      // component's `sawReturn` and the hook below reads as correctly ordered.
      [
        "annotated nested function declaration, function name(args): Type { … }",
        "function E() {\n  function helper(x: string): number | undefined {\n    if (x === \"\") return 1\n    return 2\n  }\n  const [v] = useState(0)\n  return helper(String(v))\n}",
      ],
      // The same shape once more, with an ARRAY parameter and a GENERIC
      // return type — exercising `returnTypeParenBeforeBrace`'s `[]`/`<>`
      // balance rather than its plain-identifier fast path, so a bracket or
      // angle-bracket in the type cannot throw the backward walk off.
      [
        "annotated nested function declaration with brackets and generics in its signature",
        "function F() {\n  function pick(xs: string[]): Array<number> | undefined {\n    return xs.length ? [xs.length] : undefined\n  }\n  const [v] = useState(0)\n  return pick([String(v)])\n}",
      ],
    ]
    for (const [what, src] of legal) expect(findOffendersIn(src, what), `false positive: ${what}`).toEqual([])
  })
})

// THE CONTAINMENT HALF (ERROR-HANDLING.md C1).
//
// Prevention is above: no hook below an early return. Containment is the
// ErrorBoundary, because prevention only covers the crash class we know about —
// a render throw of any other kind still blanks the tree, and window.onerror
// does not fire for React's render phase.
//
// This exists because the boundary was NOT mounted. web/app/layout.tsx imported
// it and rendered it nowhere, while ERROR-HANDLING.md said in as many words that
// it is mounted in the root layout "around the routed screens AND the co-pilot
// host". The portal's layout had it; the agency app's did not, and nothing was
// red. The lint step added alongside this found it as a dead import — which is a
// fair description of what a containment guard nobody renders actually is.
describe("the ErrorBoundary is MOUNTED, not merely imported", () => {
  const layouts = {
    "web/app/layout.tsx": readFileSync(join(WEB, "app", "layout.tsx"), "utf8"),
    "web-portal/app/layout.tsx": readFileSync(
      join(WEB, "..", "web-portal", "app", "layout.tsx"),
      "utf8"
    ),
  }

  for (const [file, src] of Object.entries(layouts)) {
    it(`${file} renders it, not just imports it`, () => {
      expect(src, `${file} must import the boundary`).toContain("ErrorBoundary")
      expect(
        /<ErrorBoundary[\s>]/.test(src),
        `${file} imports ErrorBoundary and never renders it — a render throw blanks the whole tree`
      ).toBe(true)
    })
  }

  it("the agency app wraps the routed screens AND the co-pilot host", () => {
    // Both, because the agent panel outlives navigation: it renders above the
    // routed screens, so a throw inside it is not contained by anything a route
    // owns. ERROR-HANDLING.md names both.
    const src = layouts["web/app/layout.tsx"]
    const open = src.indexOf("<ErrorBoundary>")
    const close = src.indexOf("</ErrorBoundary>")
    expect(open, "the boundary must be rendered").toBeGreaterThan(-1)
    const inside = src.slice(open, close)
    expect(inside, "the routed screens are inside it").toContain("{children}")
    expect(inside, "the co-pilot host is inside it").toContain("<AgentHost />")
  })
})
