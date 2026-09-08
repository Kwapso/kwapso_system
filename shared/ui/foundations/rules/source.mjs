/* ============================================================================
   source.mjs — the one reading layer every kit law shares.

   WHY THIS FILE EXISTS AT ALL, rather than three scanners.

   `check-contrast.mjs` proved the expensive half of a law is never the
   arithmetic; it is knowing WHAT you are looking at. Three laws that each
   decided for themselves what a comment is, what a class list is, and what
   counts as a file would disagree within a month — and two laws disagreeing
   about their subject is the failure mode `RULES.md` R8 and R2 are written
   against in the consuming app. So the subject is defined once, here, and the
   three laws are arithmetic over it.

   ----------------------------------------------------------------------------
   THE HARD PART: TELLING A CLASS LIST FROM A SENTENCE

   `"Guillem opened #3521"` is a line of demo copy in `company-hub.tsx`. It
   contains a hash and four hex digits. A colour law that reads every string
   literal reports it, and a law whose first finding is wrong is a law nobody
   reads the second finding of.

   THE TEST IS THE LITERAL'S OWN SHAPE, not where it sits. A hand-kept list of
   class POSITIONS (`className=`, `cn(`, `cva(`, `const X_SKIN =`) is the shape
   this repo refuses on principle: it is true the day it is written and expires
   the first time somebody invents a fourth way to spell a class. Instead:

       a literal is a CLASS LIST when every whitespace-separated token in it is
       utility-shaped, AND at least one token is unambiguously a utility —
       it carries a `-`, a `[`, or a `:`.

   Both halves are load-bearing. Without the first, `"Guillem opened #3521"`
   passes on the strength of `opened`. Without the second, the bare word
   `"open"` — a variant value, a state name, half the string literals in a
   Radix wrapper — is a class list of one, and every law starts reading
   vocabulary it has no business in.

   WHAT THIS COSTS, and it is counted rather than hidden: a class arriving
   through a variable, a template literal with an interpolation, or a lookup
   table indexed at runtime is NOT read. `splitClasses` in `ground-map.mjs`
   made the same trade for the same reason and reports the same number. Every
   law built on this file prints `literals read` and `literals declined`, so a
   scan that suddenly reads half as much is visible before it is trusted.

   WHAT IS DELIBERATELY NOT HERE

     · No AST. A parser needs a dependency, and this file has to run from
       inside `shared/ui/` in a consuming app, where there is no package.json
       and no node_modules — see `conformance.mjs`. Node builtins only.
     · No `.css` reading. Two of the three laws are about what a COMPONENT
       writes. `tokens.css` is read through `token-model.mjs`, which already
       knows how, and nothing here duplicates it.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";

export { decomment } from "../tokens/ground-map.mjs";
import { decomment } from "../tokens/ground-map.mjs";

/* ----------------------------------------------------------------------------
   1 · Which files
   ------------------------------------------------------------------------- */

const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".next", "out", ".git", "coverage"]);

/** Every `.tsx` / `.ts` under `dir`, depth-first, skipping build output. */
export function sourceFilesUnder(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const st = fs.statSync(dir);
  if (st.isFile()) return dir.endsWith(".tsx") || dir.endsWith(".ts") ? [dir] : [];
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      out.push(...sourceFilesUnder(p));
    } else if (name.endsWith(".tsx") || name.endsWith(".ts")) out.push(p);
  }
  return out;
}

/* ----------------------------------------------------------------------------
   2 · One file, de-commented, with honest line numbers
   ------------------------------------------------------------------------- */

export function readSource(file) {
  const raw = fs.readFileSync(file, "utf8");
  const src = decomment(raw);
  return { file, raw, src };
}

/** Line number of a character index, 1-based. */
export function lineAt(src, index) {
  let n = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === "\n") n++;
  return n;
}

/* ----------------------------------------------------------------------------
   3 · Class lists

   `TOKEN_SHAPE` is what a Tailwind utility may be made of: lowercase letters,
   digits, and the punctuation the arbitrary-value syntax uses. A capital
   letter ends it — that is what removes `Guillem`, and it costs nothing,
   because no utility in this kit carries one.
   ------------------------------------------------------------------------- */

/**
 * Every string literal in a file, found by WALKING rather than by alternation.
 *
 * THIS IS NOT A TIDY-UP. The obvious regex —
 *
 *     /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\$]*)`/g
 *
 * — is what this file shipped first, and it is silently wrong on this kit's
 * consumers. A template literal with an interpolation is not matched by the
 * backtick arm (the `$` is excluded from it), so the scan walks INTO it, meets
 * the apostrophe in `` `Couldn't list your ${noun}s.` ``, and opens a
 * single-quoted string there. That string closes at the next apostrophe —
 * thirty-two lines later, in another function — and everything between the two
 * is invisible. In `google-source-dialog.tsx` it hid a real finding: a bare
 * `rounded` on line 352. The run was GREEN on that file and the file was not
 * clean.
 *
 * A scan whose coverage depends on where the apostrophes fell is not a census.
 * So:
 *
 *   · `"` and `'` close on their OWN LINE or they were never quotes. A class
 *     list has never spanned a line, and an apostrophe in JSX text is text.
 *   · a backtick runs to its close across lines, tracking `${ }` nesting; if
 *     it carries an interpolation its content is not a literal and is counted
 *     as declined, which is the honest answer rather than a partial one.
 *
 * NOTE FOR WHOEVER READS THIS NEXT: `literalsIn` in `foundations/tokens/
 * ground-map.mjs` still carries the original regex, and the contrast law
 * stands on it. It is left alone deliberately — that law is finished, its
 * numbers are published, and re-reading its source would move them. But the
 * blind spot is the same one, and it is worth an hour some day.
 */
export function stringLiterals(src) {
  const out = [];
  let i = 0;
  let declined = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      let closed = -1;
      for (; j < src.length; j++) {
        if (src[j] === "\\") { j++; continue; }
        if (src[j] === "\n") break;
        if (src[j] === c) { closed = j; break; }
      }
      if (closed < 0) { i++; continue; }       // an apostrophe in prose, not a quote
      out.push({ index: i + 1, text: src.slice(i + 1, closed) });
      i = closed + 1;
      continue;
    }
    if (c === "`") {
      /* A TEMPLATE LITERAL IS NOT ONE STRING, and treating it as one is how
         this scanner lost two findings it had already made. The consuming app
         writes its conditional classes like this:

             className={`flex gap-1 rounded-[var(--radius)] p-6 ${
               dragging ? "border-primary" : "border-muted-foreground/30"
             }`}

         Both the STATIC CHUNKS and the expression between them carry classes.
         Skipping the whole literal because it has an interpolation drops the
         outer list; reading only the outer text drops the branches. So the
         template is taken apart: every chunk is a literal in its own right,
         and every `${ }` is re-scanned from the top, nested templates and all.
         The only thing counted as declined is a chunk that stops mid-class —
         `bg-` glued to an interpolated tone — which is unreadable by anyone. */
      let j = i + 1;
      let chunk = j;
      for (; j < src.length; j++) {
        if (src[j] === "\\") { j++; continue; }
        if (src[j] === "$" && src[j + 1] === "{") {
          const text = src.slice(chunk, j);
          if (text.trim()) out.push({ index: chunk, text });
          const close = expressionEnd(src, j + 1);
          const inner = stringLiterals(src.slice(j + 2, close));
          for (const l of inner.literals) out.push({ index: j + 2 + l.index, text: l.text });
          declined += inner.interpolated;
          if (/[\w\]-]$/.test(text)) declined++;   // `bg-${tone}` — a class cut in half
          j = close;
          chunk = j + 1;
          continue;
        }
        if (src[j] === "`") break;
      }
      const tail = src.slice(chunk, j);
      if (tail.trim()) out.push({ index: chunk, text: tail });
      i = j + 1;
      continue;
    }
    i++;
  }
  return { literals: out, interpolated: declined };
}

/** Index of the `}` closing a `${` whose brace sits at `open`. */
function expressionEnd(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "\\") { i++; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      for (; j < src.length && src[j] !== "\n"; j++) {
        if (src[j] === "\\") { j++; continue; }
        if (src[j] === c) break;
      }
      if (j < src.length && src[j] === c) i = j;
      continue;
    }
    if (c === "`") {
      let j = i + 1;
      let d = 0;
      for (; j < src.length; j++) {
        if (src[j] === "\\") { j++; continue; }
        if (src[j] === "$" && src[j + 1] === "{") { d++; j++; continue; }
        if (d) { if (src[j] === "{") d++; else if (src[j] === "}") d--; continue; }
        if (src[j] === "`") break;
      }
      i = j;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return i; }
  }
  return src.length;
}

const TOKEN_SHAPE = /^[a-z0-9!@*+&_-][a-z0-9[\]().,/%#:!@*+&_'=<>~^|$-]*$/;
const UNAMBIGUOUS = /[-[:]/;

/**
 * A capital letter ends a token — EXCEPT inside an arbitrary value, where the
 * text is CSS and CSS is full of them.
 *
 * This exception is not a nicety. Without it, `border-[color-mix(in_srgb,
 * currentColor_25%,transparent)]` disqualifies its own class list on the `C`
 * of `currentColor`, and the whole line — including the `border-t-current`
 * beside it — is declined as prose. That is exactly what happened on the
 * first run of the boundary law against this kit: the spinner's arc, the one
 * component the law most needed to see, was invisible to it, and the run
 * looked cleaner for it. A scan that gets quieter as the source gets more
 * interesting is the failure this repository keeps paying for.
 */
function tokenShaped(t) {
  return TOKEN_SHAPE.test(t.replace(/\[[^\]]*\]/g, "[]"));
}

/** True when this literal is a list of Tailwind utilities, by its own shape. */
export function isClassList(text) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  if (!tokens.every(tokenShaped)) return false;
  return tokens.some((t) => UNAMBIGUOUS.test(t));
}

/**
 * Every class-shaped string literal in a file, with line numbers, plus the
 * count of literals declined — the blindness number each law reprints.
 */
export function classLists(file) {
  const { src } = readSource(file);
  const { literals, interpolated } = stringLiterals(src);
  const kept = [];
  let declined = interpolated;
  for (const l of literals) {
    if (!l.text.trim()) continue;
    if (isClassList(l.text)) kept.push({ file, line: lineAt(src, l.index), text: l.text });
    else declined++;
  }
  return { lists: kept, declined };
}

/**
 * Split a class list into utilities, keeping the variant prefixes rather than
 * dropping them.
 *
 * `ground-map.mjs` DISCARDS `hover:bg-accent`, correctly: it is measuring a
 * ground it cannot enter. These laws must do the opposite. `hover:border-b`
 * paints a hairline on hover, and a border law that only read the resting
 * state would pass every component that draws its stroke on interaction —
 * which, in a kit whose whole hover vocabulary is a paper-tone change, is
 * exactly where a stray border would be written.
 */
export function utilities(text) {
  const out = [];
  for (const raw of text.trim().split(/\s+/)) {
    if (!raw) continue;
    /* Split off variant prefixes at top-level `:` only, so `data-[state=open]:`
       and `max-[45rem]:` survive intact and `bg-[color-mix(in_srgb,...)]`
       is never cut in half. */
    let depth = 0;
    let cut = 0;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === "[" || ch === "(") depth++;
      else if (ch === "]" || ch === ")") depth--;
      else if (ch === ":" && depth === 0) cut = i + 1;
    }
    const base = raw.slice(cut);
    if (!base) continue;
    out.push({ raw, base, variants: cut ? raw.slice(0, cut - 1).split(":") : [] });
  }
  return out;
}

/* ----------------------------------------------------------------------------
   4 · Inline style objects and SVG paint attributes

   Two positions a colour can reach the screen without passing a class. Both
   are read as TEXT SPANS rather than parsed: the question every law asks of
   them is "does a raw colour appear in here", which needs no structure.
   ------------------------------------------------------------------------- */

/** Every `style={{ … }}` span in a file. */
export function styleSpans(file) {
  const { src } = readSource(file);
  const out = [];
  const re = /\bstyle\s*=\s*\{\{/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 0;
    let i = m.index + m[0].length - 2;
    let quote = null;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (quote) { if (ch === "\\") { i++; continue; } if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) break; }
    }
    out.push({ file, line: lineAt(src, m.index), text: src.slice(m.index, i + 1) });
    re.lastIndex = i + 1;
  }
  return out;
}

/** Every `fill=` / `stroke=` / `stopColor=` attribute value in a file. */
export function paintAttributes(file) {
  const { src } = readSource(file);
  const out = [];
  const re = /\b(fill|stroke|stopColor|stop-color|floodColor|lightingColor)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g;
  let m;
  while ((m = re.exec(src)))
    out.push({ file, line: lineAt(src, m.index), attr: m[1], value: (m[2] ?? m[3] ?? m[4] ?? "").trim() });
  return out;
}

/* ----------------------------------------------------------------------------
   5 · Exemptions, and the rot check that keeps them shrinking

   An exemption is DATA — `{ id, where, what, why }` — never a flag in the
   scanner. `where` is a path suffix, so the same entry reads the same whether
   the file is at `components/spinner/spinner.tsx` in this repo or
   `shared/ui/components/spinner/spinner.tsx` in a consuming app.

   THE ROT CHECK IS THE WHOLE POINT, and it runs in both directions:

     · an exemption whose file no longer exists is DEAD — red.
     · an exemption whose file no longer commits the violation it excuses is
       SPENT — red, with "delete this line" as the remedy.

   So the list can only ever shrink, and a component that is fixed drags its
   own exemption out with it. This is the shape the consuming app's registry
   uses for the same reason, and it is the reason a deny-list here is a
   visible, conscious line rather than a silent bypass.
   ------------------------------------------------------------------------- */

export function loadExemptions(file) {
  if (!file) return [];
  if (!fs.existsSync(file)) throw new Error(`exemptions file not found: ${file}`);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${file}: expected a JSON array of exemptions`);
  for (const e of parsed) {
    for (const k of ["law", "where", "what", "why"])
      if (typeof e[k] !== "string" || !e[k].trim())
        throw new Error(`${file}: an exemption is missing \`${k}\`: ${JSON.stringify(e)}`);
    if (e.why.trim().length < 24)
      throw new Error(`${file}: "${e.where}" — \`why\` is not a reason, it is a label: "${e.why}"`);
  }
  return parsed;
}

/** Does this exemption cover this finding? */
export function excuses(exemption, law, file, what) {
  if (exemption.law !== law) return false;
  const norm = file.split(path.sep).join("/");
  if (!norm.endsWith(exemption.where)) return false;
  return exemption.what === "*" || what.includes(exemption.what);
}

/* ----------------------------------------------------------------------------
   6 · Reporting

   The shape is `check-contrast.mjs`'s, deliberately: a header of derived
   numbers, then what the run could not see, then the findings. A reader who
   knows one of this repo's laws can read all of them.
   ------------------------------------------------------------------------- */

export const pad = (n, w = 6) => String(n).padStart(w);

/** A finding names a path a person can paste into an editor, from where they
 *  are standing. An absolute path inside a temp clone helps nobody. */
export const here = (f) => {
  const rel = path.relative(process.cwd(), f);
  return rel && !rel.startsWith("..") ? rel : f;
};

export function printFindings(title, findings) {
  if (!findings.length) return;
  console.log(`\n${title} (${findings.length})`);
  console.log("-".repeat(title.length + 6));
  for (const f of findings) {
    console.log(`  ${here(f.file)}:${f.line}`);
    console.log(`      ${f.what}`);
    console.log(`      → ${f.remedy}`);
  }
}
