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

/** What the scan is currently inside. A STACK, because these nest without limit:
 * a JSX attribute holds an expression, which holds a template literal, which
 * holds another expression, which holds more JSX. */
type ScanContext =
  /** Ordinary TypeScript. The only context a comment can open in. */
  | { kind: "code"; braces: number }
  /** Between backticks. */
  | { kind: "template" }
  /** Inside `<` … `>`: attribute names, quoted values, `{}` holes. */
  | { kind: "jsxTag" }
  /** Between an element's tags — prose. */
  | { kind: "jsxText" }

const IDENTIFIER_CHAR = /[A-Za-z0-9_$]/
const WHITESPACE = /\s/

/** Words after which a `/` opens a REGEX and a `<` opens JSX, even though the
 * word is spelled like an identifier. `return <div/>` is the one that matters
 * most here; without it every component's markup would be scanned as arithmetic. */
const KEYWORDS_BEFORE_AN_EXPRESSION = new Set([
  "return",
  "typeof",
  "instanceof",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "case",
  "do",
  "else",
  "yield",
  "await",
  "default",
])

/** Index just past a comment that starts at `at`. A line comment stops BEFORE
 * its newline, so the line structure survives; an unterminated block comment
 * runs to the end of the file, which is what the compiler does too. */
function endOfComment(src: string, at: number): number {
  if (src[at + 1] === "/") {
    const nl = src.indexOf("\n", at)
    return nl === -1 ? src.length : nl
  }
  const close = src.indexOf("*/", at + 2)
  return close === -1 ? src.length : close + 2
}

/** What a comment leaves behind: ONE SPACE, so `a/*c*\u200b/b` does not become the
 * token `ab` and a law reading identifiers is not handed a word nobody wrote,
 * plus every newline the comment spanned, so line numbers below it are unmoved. */
function commentReplacement(eaten: string, options: StripOptions): string {
  if (options.keepLength) return eaten.replace(/[^\n]/g, " ")
  if (eaten.startsWith("//")) return "" // the newline after it is separator enough
  return " " + "\n".repeat((eaten.match(/\n/g) ?? []).length)
}

/** The one dial. */
export type StripOptions = {
  /** Blank each comment with the SAME NUMBER OF CHARACTERS instead of removing
   * it, so every index into the result still points at the same place in the
   * original. One caller needs this — web/test/hooks-order.test.ts walks brace
   * depth and reports `path:offset` — and it used to hand-roll the whole
   * stripper to get it, blindness and all. Off by default: a scan asking "does
   * this file contain X" wants the text closed up, not a field of spaces. */
  keepLength?: boolean
}

/** Index just past a `<…>` type-argument list inside a JSX opening tag, counting
 * nesting so `<Map<string, Row>>` closes once. Runs to EOF rather than throwing
 * if it is unbalanced — an unclosed one is a syntax error the compiler will say
 * more about than a scanner can. */
function endOfTypeArguments(src: string, at: number): number {
  let depth = 0
  for (let i = at; i < src.length; i++) {
    if (src[i] === "<") depth += 1
    else if (src[i] === ">") {
      depth -= 1
      if (depth === 0) return i + 1
    }
  }
  return src.length
}

/** Index just past the closing quote, or -1 when the line ends first — which per
 * the language means this was never a string literal. That single rule is what
 * makes `<p>Don't</p>` safe without the scan having to understand JSX. */
function endOfQuoted(src: string, at: number): number {
  const quote = src[at]
  for (let i = at + 1; i < src.length; i++) {
    const c = src[i]
    if (c === "\\") {
      i += 1 // an escaped anything, INCLUDING a line continuation
      continue
    }
    if (c === quote) return i + 1
    if (c === "\n") return -1
  }
  return -1
}

/** Index just past a regex literal's flags, or -1 if this `/` does not start
 * one. A regex literal cannot span a line either, and `[…]` suspends the meaning
 * of `/` inside it. Getting this WRONG in the negative direction is the
 * dangerous one: `/https?:\/\//` read as division leaves a bare `//` in code,
 * and the rest of that line is then eaten as a comment. */
function endOfRegex(src: string, at: number): number {
  let inClass = false
  for (let i = at + 1; i < src.length; i++) {
    const c = src[i]
    if (c === "\\") {
      i += 1
      continue
    }
    if (c === "\n") return -1
    if (inClass) {
      if (c === "]") inClass = false
      continue
    }
    if (c === "[") {
      inClass = true
      continue
    }
    if (c === "/") {
      let j = i + 1
      while (j < src.length && /[a-z]/.test(src[j])) j += 1 // flags
      return j
    }
  }
  return -1
}

/** Does this `<`, in a position where an expression may start, open a JSX
 * element? The caller has already ruled out comparison (`a < b` — `a` is a
 * value). What is left to tell apart is a GENERIC TYPE PARAMETER on an arrow
 * function, which this repo writes four times: `<T,>`, `<T extends { … }>`.
 * Both are refused here — the first because a tag name is never followed by a
 * comma, the second because a one-letter capital is a type parameter and `props
 * extends` is not an attribute. Refusing wrongly only means a stretch of code is
 * read as text and its comments survive; ACCEPTING wrongly would delete code. */
function opensJsxElement(src: string, at: number): boolean {
  if (src[at + 1] === ">") return true // a fragment, <>
  const match = /^<([A-Za-z_$][A-Za-z0-9_$.:-]*)([\s\S]?)/.exec(src.slice(at, at + 200))
  if (!match) return false
  const [, name, after] = match
  if (!/[\s/><]/.test(after)) return false // `<` = a generic type argument
  if (name.length === 1 && /[A-Z]/.test(name)) return false
  return !src.slice(at + 1 + name.length).trimStart().startsWith("extends")
}

/** Comments are NOT code, and this repo's comments DISCUSS the very seams being
 * scanned — "no requireRight (it's about you)", "no LIMIT needed here". Without
 * this, a handler whose real gate was deleted stays GREEN, satisfied by the prose
 * below it, and a comment describing the ABSENCE of a bound satisfies the bound.
 *
 * Deliberately LOSSY and deliberately NOT string-BLANKING: R14 reads `LIMIT` out
 * of SQL held in template literals, so a stripper that emptied string contents
 * would blind it. Everything that is not a comment comes out byte for byte; a
 * block comment leaves one space (so `a/*c*​/b` does not become the token `ab`)
 * and its newlines, so LINE NUMBERS SURVIVE and a `path:line` failure message
 * means what it says. When a caller needs JSONC instead, that is
 * stripJsoncComments below — a different job, named apart.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A TOKENISER AND NOT TWO REGEXES. Read this before "simplifying".
 * ────────────────────────────────────────────────────────────────────────────
 *
 * It was two regexes for years:
 *
 *     src.replace(/(^|[^:])\/\/[^\n]*​/gm, "$1").replace(/\/\*[\s\S]*?\*​\//g, " ")
 *
 * and it was wrong three separate times, each time in the same way: `/` and `*`
 * are ORDINARY CHARACTERS almost everywhere in this language, and a regex cannot
 * tell where it is.
 *
 *  1. LINE COMMENTS HAD TO GO FIRST, or a `//` comment mentioning a path like
 *     `/api/content/<star>` put the two characters `/` and `*` side by side, the
 *     block regex opened a "comment" THERE, and it ran to the next `*​/` anywhere
 *     below — swallowing the rest of the function. It cost exactly that: a
 *     comment added to `postHelpStatus` turned the R1 publish check red on a
 *     handler whose `publishChange` had not moved. Ordering papered over it.
 *
 *  2. Then `accept="image/*"`. A JSX attribute, in
 *     `web/components/app-form-dialog.tsx`. No `//` in sight, so the ordering
 *     fix did nothing: the block regex opened a comment inside the STRING and
 *     closed it at the next `*​/` — the end of a JSDoc SIXTY LINES BELOW. Three
 *     `<Notes>` call sites, a `<Field>` and a `<FileUpload>` were deleted before
 *     any law read the file. An agent's census of that file counted 15 sites
 *     where 18 exist and was perfectly happy, BECAUSE ABSENCE LOOKS EXACTLY LIKE
 *     COMPLIANCE. That is the whole danger of this function: over-stripping does
 *     not turn a law red, it turns it QUIET.
 *
 *  3. And a regex literal spelling a URL — `/https?:\/\//` — puts two slashes
 *     side by side in code, so the LINE regex ate the rest of that line, which
 *     then moved every `/*` and `*​/` after it out of step.
 *
 * Ordering, a `:` guard, a special case for `image/*` — each of those fixes one
 * instance and leaves the class. The class is that you cannot answer "is this
 * `/` the start of a comment?" without knowing what you are inside of, and there
 * are five things you can be inside of. So this walks the text once and tracks
 * exactly that, and it is the ONLY honest minimum:
 *
 *   • a quoted string ('…' or "…"), which per the language cannot contain a raw
 *     newline — so a quote with no partner before the line ends is NOT a string
 *     opening (an apostrophe in JSX text: `<p>Don't</p>`), and we go on as if it
 *     were the ordinary character it is;
 *   • a template literal, which CAN span lines, and whose `${…}` holes are code
 *     again — so the stack, not a flag;
 *   • a regex literal, told from division by whether the previous token could
 *     END an expression (the standard heuristic, and the reason `afterValue` is
 *     tracked at all);
 *   • JSX TEXT, where a slash is a slash and an apostrophe is an apostrophe, and
 *     the only two special characters are `<` and `{`;
 *   • a comment, which is the one place we delete anything.
 *
 * The bias, everywhere, is TOWARDS KEEPING TEXT. Failing to recognise a comment
 * leaves prose in the scan, which can make a law pass on its own documentation —
 * bad, and loud enough to find. Wrongly recognising one DELETES CODE, and a law
 * cannot fail on a line that is not there. When the two risks trade off, this
 * takes the first. `web/test/source-scan.test.ts` proves both directions, and
 * proves them again over every file in the repo.
 *
 * EIGHT COPIES OF THIS FUNCTION EXISTED: three named ones with three different doc
 * comments (one guarding the mcp worker — the external machine surface) and five
 * inline repetitions of the same two regexes. Harden the pattern in one and the
 * other seven are checks that only look like it. That census only ever matched
 * the LINE regex, so nine more copies of the BLOCK regex alone sat behind it,
 * each with defect 2 intact; the census in source-scan.test.ts now matches both
 * halves. */
export function stripComments(src: string, options: StripOptions = {}): string {
  const out: string[] = []
  const stack: ScanContext[] = [{ kind: "code", braces: 0 }]
  /** True when the last token scanned could END an expression: an identifier, a
   * number, a closing bracket, a literal. After one of those a `/` is DIVISION
   * and a `<` is LESS-THAN; after anything else — an operator, a comma, an open
   * bracket, a keyword like `return` — both of them OPEN something. This one
   * bit is the whole of the regex-vs-division and JSX-vs-comparison decision. */
  let afterValue = false
  let i = 0

  while (i < src.length) {
    const top = stack[stack.length - 1]
    const c = src[i]
    const c2 = src[i + 1]

    // INSIDE A TEMPLATE LITERAL. Spans lines, so it is a context and not a
    // lookahead; `${` puts code back on top of the stack, and the matching `}`
    // pops it (see the code arm's brace counting).
    if (top.kind === "template") {
      if (c === "\\") {
        out.push(src.slice(i, i + 2))
        i += 2
      } else if (c === "`") {
        stack.pop()
        out.push(c)
        afterValue = true
        i += 1
      } else if (c === "$" && c2 === "{") {
        stack.push({ kind: "code", braces: 0 })
        out.push("${")
        afterValue = false
        i += 2
      } else {
        out.push(c)
        i += 1
      }
      continue
    }

    // BETWEEN AN ELEMENT'S TAGS. Prose written by a person: apostrophes, slashes
    // ("and/or"), URLs. Nothing here is ever a comment, and only `<` and `{`
    // mean anything.
    if (top.kind === "jsxText") {
      if (c === "{") {
        stack.push({ kind: "code", braces: 0 })
        out.push(c)
        afterValue = false
        i += 1
      } else if (c === "<" && c2 === "/") {
        // A closing tag: this element's children are over.
        const gt = src.indexOf(">", i)
        const end = gt === -1 ? src.length : gt + 1
        out.push(src.slice(i, end))
        stack.pop()
        afterValue = true
        i = end
      } else if (c === "<") {
        stack.push({ kind: "jsxTag" })
        out.push(c)
        i += 1
      } else {
        out.push(c)
        i += 1
      }
      continue
    }

    // INSIDE `<` … `>`. Attribute values are quoted strings (this is where
    // `accept="image/*"` lives) or `{}` expressions — and a comment CAN open
    // here, because the space between two attributes is trivia like any other.
    // This repo writes 199 of them, one above the attribute it explains.
    if (top.kind === "jsxTag") {
      if (c === "/" && (c2 === "/" || c2 === "*")) {
        const end = endOfComment(src, i)
        out.push(commentReplacement(src.slice(i, end), options))
        i = end
      } else if (c === '"' || c === "'") {
        // A JSX attribute string has no escapes and MAY span lines, so this is
        // the one quote scan that does not stop at a newline.
        const close = src.indexOf(c, i + 1)
        const end = close === -1 ? src.length : close + 1
        out.push(src.slice(i, end))
        i = end
      } else if (c === "{") {
        stack.push({ kind: "code", braces: 0 })
        out.push(c)
        afterValue = false
        i += 1
      } else if (c === "<") {
        // A GENERIC TYPE ARGUMENT on the element itself — `<PagedFind<Process>`,
        // `<DataTable<Row>`. Nothing inside it can be a comment, and the `>`
        // that closes it is NOT the one that ends the tag: read that wrong and
        // every attribute below (comments included) is read as child text.
        const end = endOfTypeArguments(src, i)
        out.push(src.slice(i, end))
        i = end
      } else if (c === "/" && c2 === ">") {
        stack.pop()
        out.push("/>")
        afterValue = true
        i += 2
      } else if (c === ">") {
        stack.pop()
        stack.push({ kind: "jsxText" })
        out.push(c)
        i += 1
      } else {
        out.push(c)
        i += 1
      }
      continue
    }

    // ORDINARY TYPESCRIPT — the only context in which a comment can open.
    if (c === "/" && (c2 === "/" || c2 === "*")) {
      const end = endOfComment(src, i)
      out.push(commentReplacement(src.slice(i, end), options))
      i = end
      continue
    }
    if (c === '"' || c === "'") {
      const end = endOfQuoted(src, i)
      if (end === -1) {
        // No partner before the line ended, so it was never a string: an
        // apostrophe in JSX text this scan did not recognise as JSX, or a stray
        // quote in prose. Treat it as the ordinary character it is.
        out.push(c)
        afterValue = false
        i += 1
      } else {
        out.push(src.slice(i, end))
        afterValue = true
        i = end
      }
      continue
    }
    if (c === "`") {
      stack.push({ kind: "template" })
      out.push(c)
      i += 1
      continue
    }
    if (c === "/" && !afterValue) {
      const end = endOfRegex(src, i)
      if (end !== -1) {
        out.push(src.slice(i, end))
        afterValue = true
        i = end
        continue
      }
    }
    if (c === "<" && !afterValue && opensJsxElement(src, i)) {
      stack.push({ kind: "jsxTag" })
      out.push(c)
      i += 1
      continue
    }
    if (IDENTIFIER_CHAR.test(c)) {
      let j = i
      while (j < src.length && IDENTIFIER_CHAR.test(src[j])) j += 1
      const word = src.slice(i, j)
      out.push(word)
      afterValue = !KEYWORDS_BEFORE_AN_EXPRESSION.has(word)
      i = j
      continue
    }
    if (c === "{") {
      top.braces += 1
      out.push(c)
      afterValue = false
      i += 1
      continue
    }
    if (c === "}") {
      // A `}` at depth zero closes the `${…}` or `{…}` this code context was
      // pushed for, and hands the template or the JSX element back.
      if (top.braces === 0 && stack.length > 1) stack.pop()
      else if (top.braces > 0) top.braces -= 1
      out.push(c)
      afterValue = true
      i += 1
      continue
    }
    out.push(c)
    if (!WHITESPACE.test(c)) afterValue = c === ")" || c === "]"
    i += 1
  }

  return out.join("")
}

/** JSONC → JSON, for a caller that is about to JSON.parse the result (the
 * wrangler configs). A DIFFERENT JOB from stripComments, which is why it is a
 * different function with a different name, and why nobody should fold the two
 * together:
 *
 *  • It must not eat a `//` inside a string — `"https://…"` in a var would
 *    otherwise truncate the file and leave the caller parsing a fragment, which
 *    is how a worker reads as closed while being open.
 *  • It must be exact, not heuristic. A lossy answer here is not a weaker check,
 *    it is a parse error or a silently wrong config.
 *  • And it is wrong for TypeScript: it tracks only `"`, so one unbalanced double
 *    quote inside a template literal puts it in string mode for the rest of the
 *    file and it stops removing comments at all — exactly the failure the seam
 *    scans strip comments to prevent.
 *
 * Character by character, tracking quote and escape state, which is the only way
 * to be sure. web/test/source-scan.test.ts holds the fixtures proving each is
 * wrong at the other's job. */
export function stripJsoncComments(src: string): string {
  let out = ""
  let inString = false
  let escaped = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inString) {
      out += c
      if (escaped) escaped = false
      else if (c === "\\") escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      out += c
      continue
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++
      out += "\n"
      continue
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++
      i++
      continue
    }
    out += c
  }
  return out
}
