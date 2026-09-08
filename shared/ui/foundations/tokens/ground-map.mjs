/* ============================================================================
   ground-map.mjs — WHAT SITS ON WHAT, derived from the source rather than kept
   by hand.

   THE PROBLEM THIS SOLVES IS THE ONLY HARD PART OF A CONTRAST LAW.

   Measuring two colours is arithmetic. Knowing WHICH two to measure is the
   whole question, and the three bugs of 2026-09-07 are three answers to it
   that nobody had: a footer against the card it sits inside, a toolbar well
   against the shell's content card, a 7px dot against the column header's
   panel. Each value was correct for the context it was written for. Each was
   consumed in a context nobody re-measured.

   A FLAT LIST OF PAIRS WOULD BE A LIE, so this file does not keep one. A
   hand-kept list of "these must differ" is a document that is true on the day
   it is written and quietly expires afterwards — which is not a hypothetical
   here: `GAPS-TRACK1.md` STA-2 wrote down "nothing in the kit consumes the six
   `--dot-*` tokens" as the JUSTIFICATION for leaving those values alone, and
   the sentence stopped being true the moment `Kanban` grew a column header.
   Nobody edited STA-2, because nothing made them.

   SO THE PAIRS ARE DERIVED FROM THE ONE PLACE THAT CANNOT GO STALE WITHOUT
   SOMEBODY EDITING IT: the components themselves. The kit's own law is that a
   ground-painting element uses a NAMED utility class (`bg-card`,
   `bg-surface-panel`, `bg-[var(--dot-building)]`), and an inked one names its
   ink the same way (`text-ink-secondary`). Those classes are in the source, in
   a tree, and the tree is the answer: the ground of a thing is the nearest
   ancestor that paints one.

   WHAT IS ACTUALLY WALKED, and it is more than one file at a time.

     · JSX NESTING, per file. An element that paints a ground, inside an
       element that paints a ground, is a BOUNDARY pair. An element that names
       an ink, under an element that paints a ground, is an INK pair.

     · COMPONENT EXPANSION, across files. `<Card>` is not a `<div>` with no
       ground: it is `bg-surface-panel`, or `bg-card` when a call site says
       `variant="raised"`, and that fact lives in `card.tsx`'s `cva`. So a
       `<Comp>` in the tree is EXPANDED — its own tree is walked in place, with
       the call site's `variant` applied and its `className` merged over the
       top the way `cn`/tailwind-merge does. This is what makes the record
       footer reachable at all: nothing in `record-detail.tsx` says what the
       footer sits on. `ScreenShell` says it, four files away.

     · SLOTS. When a call site writes `<ScreenShell>{something}</ScreenShell>`,
       the something is walked at the ground in effect where `ScreenShell`
       renders `{children}` — not at the call site's own ground. A component
       that hands its children to a charcoal panel has handed them a charcoal
       ground, and the call site never mentions it.

     · LOCAL JSX BINDINGS. `const inner = <Foo/>` used later as `{inner}` is
       spliced in at the point of USE, not left where it was typed. Without
       this the tree records the writing order instead of the render order,
       which is a lie in the safe direction and therefore the worst kind.

   WHAT IT REFUSES TO GUESS, stated here and repeated in the check's report,
   because a derivation that quietly gives up is indistinguishable from one
   that found nothing wrong:

     · STATE AND BREAKPOINT VARIANTS. `hover:bg-accent`, `max-[45rem]:bg-popover`,
       `data-[state=open]:bg-...`. These are real grounds in a state this
       walker cannot enter. They are COUNTED and reported, never measured.
     · COMPUTED CLASS NAMES. `bg-${tone}`, a class arriving through a prop, a
       lookup table indexed at runtime. Counted and reported.
     · INLINE `style` AND CUSTOM-PROPERTY REBINDS. `record-detail.tsx` rebinds
       `--card` on the footer's inner grid; that is a ground change this walker
       does not see. Counted where it is syntactically visible, reported.

   The counting is the point. Every one of those is a hole, and a hole that is
   printed with a number beside it is a hole somebody can argue about.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";

/* ----------------------------------------------------------------------------
   1 · Reading the tree out of a .tsx file

   A tolerant tag scanner, not a parser. It tracks quotes and brace depth so
   that `onClick={() => x}` does not close a tag at its `>`, and it takes tag
   NESTING as the whole structure — every scrap of JavaScript between two tags
   is skipped, which is exactly right here: a `.map()` callback's JSX is a
   child of the element it is written inside, and that is what the browser
   will draw.
   ------------------------------------------------------------------------- */

const TAG_NAME = /^[A-Za-z][A-Za-z0-9._]*$/;

/** Strip comments without eating `https://` or a `//` inside a string.
 *
 * EXPORTED since 2026-09-08, for `foundations/rules/`. Every law in this repo
 * reads de-commented source — a rule written about a component must not fire
 * on the paragraph that explains the component — and there is no second
 * definition of what a comment is. This one keeps every newline exactly where
 * it was, so a finding's line number still points at the source a person
 * opens; see the note in `parseFile` for what happened when it did not. */
export function decomment(src) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === "\\") { out += c + (src[i + 1] ?? ""); i += 2; continue; }
      if (c === quote) quote = null;
      out += c; i++; continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; out += c; i++; continue; }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const chunk = src.slice(i, end < 0 ? src.length : end + 2);
      out += chunk.replace(/[^\n]/g, " ");           // keep line numbers honest
      i = end < 0 ? src.length : end + 2;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      const end = src.indexOf("\n", i);
      i = end < 0 ? src.length : end;
      continue;
    }
    out += c; i++;
  }
  return out;
}

/** Find the end of a tag that starts at `<`. Returns {end, selfClosing} or null. */
function tagEnd(src, start) {
  let i = start + 1;
  let depth = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      if (c === "\\") { i += 2; continue; }
      if (c === quote) quote = null;
      i++; continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; i++; continue; }
    if (c === "{") { depth++; i++; continue; }
    if (c === "}") { depth--; i++; continue; }
    if (depth === 0 && c === ">") {
      const before = src.slice(start, i).trimEnd();
      return { end: i, selfClosing: before.endsWith("/") };
    }
    i++;
  }
  return null;
}

/** Every attribute of a tag, as `name -> raw source of its value`. */
function attributes(header) {
  const out = new Map();
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*/g;
  let m;
  while ((m = re.exec(header))) {
    const at = m.index + m[0].length;
    const c = header[at];
    if (c === '"' || c === "'") {
      const close = header.indexOf(c, at + 1);
      if (close < 0) break;
      out.set(m[1], header.slice(at + 1, close));
      re.lastIndex = close + 1;
    } else if (c === "{") {
      let depth = 0;
      let i = at;
      let quote = null;
      for (; i < header.length; i++) {
        const ch = header[i];
        if (quote) {
          if (ch === "\\") { i++; continue; }
          if (ch === quote) quote = null;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
        if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) break; }
      }
      out.set(m[1], header.slice(at, i + 1));
      re.lastIndex = i + 1;
    }
  }
  return out;
}

/**
 * Parse one file into a forest of element nodes plus its local JSX bindings.
 *
 * A node is `{ tag, attrs, children, line, bound }`. `bound` is the identifier
 * this element was assigned to, when it was written as `const x = <Foo/>`.
 */
export function parseFile(file) {
  const rawSrc = fs.readFileSync(file, "utf8");
  const src = decomment(rawSrc);
  /* Line numbers come off the DE-COMMENTED text, which is what the indices
     below are indices into. `decomment` keeps every newline exactly where it
     was, so the two texts agree line for line; measuring against `rawSrc`
     instead reported nodes inside comment blocks, which is a provenance that
     sends a reader to the wrong place and quietly discredits a true finding. */
  const lineAt = (idx) => src.slice(0, idx).split("\n").length;

  const roots = [];
  const stack = [];
  let i = 0;

  const push = (node) => {
    (stack.length ? stack[stack.length - 1].children : roots).push(node);
  };

  while (i < src.length) {
    const lt = src.indexOf("<", i);
    if (lt < 0) break;

    /* Closing tag */
    if (src[lt + 1] === "/") {
      const gt = src.indexOf(">", lt);
      if (gt < 0) break;
      const name = src.slice(lt + 2, gt).trim();
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].tag === name) {
          for (let j = stack.length - 1; j >= k; j--) {
            stack[j].innerEnd = lt;
            stack[j].end = gt + 1;
          }
          stack.length = k;
          break;
        }
      }
      i = gt + 1;
      continue;
    }

    /* A FRAGMENT IS A NODE, AND LEAVING IT OUT WAS NOT A HARMLESS OMISSION.
       `<>` carries no tag name, so the scanner used to walk straight past it
       — and with it past the only structure that made `const inner = (<>…</>)`
       a BINDING. Everything written inside the fragment was then pushed as a
       child of whatever element the fragment happened to sit inside, and the
       `{inner}` that renders it resolved to nothing, so the splice-at-use
       described at the head of this file silently stopped happening for every
       binding the kit wraps in a fragment.

       The header above calls the writing-order tree "a lie in the safe
       direction". THIS one lies the other way: `status-stepper`'s current
       pill wraps its label and number in a fragment, and with the fragment
       invisible the number's `text-ink-on-accent` was measured against the
       DIALOG behind the stepper rather than against the mango pill that
       covers it — 1.132 in dark, reported as a failure, for a pair no screen
       draws. A derivation that invents a bug costs more trust than one that
       misses it, so the fragment is parsed like any other element: it paints
       nothing, it inherits its ground, and it can be bound to a name. */
    if (src[lt + 1] === ">") {
      const node = {
        tag: "", attrs: new Map(), children: [], slotRefs: [], file,
        line: lineAt(lt), start: lt, innerStart: lt + 2, innerEnd: null, end: null,
        bound: (/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\(?\s*$/.exec(
          src.slice(Math.max(0, lt - 120), lt),
        ) ?? [])[1] ?? null,
      };
      push(node);
      stack.push(node);
      i = lt + 2;
      continue;
    }

    const rest = src.slice(lt + 1);
    const nameMatch = /^[A-Za-z][A-Za-z0-9._]*/.exec(rest);
    if (!nameMatch || !TAG_NAME.test(nameMatch[0])) { i = lt + 1; continue; }

    /* TYPESCRIPT LOOKS EXACTLY LIKE JSX AND IS NOT.
       `React.forwardRef<HTMLDivElement, Props>(` opens a tag named
       `HTMLDivElement` that never closes, and one of those swallows the whole
       rest of a file into a phantom element — which is not a parse error, it
       is SILENCE: the walker below then finds two grounds where the file has
       forty. Both tells are cheap. A generic's `<` is glued to an identifier
       (`forwardRef<`, `Map<`, `useState<`), where JSX's always follows an
       opener, a comma, an operator or a newline. And a generic's argument list
       has a top-level comma where a JSX header has attributes. */
    const prev = lt > 0 ? src[lt - 1] : "\n";
    if (/[A-Za-z0-9_$.\])]/.test(prev)) { i = lt + 1; continue; }

    const t = tagEnd(src, lt);
    if (!t) { i = lt + 1; continue; }

    const header = src.slice(lt + 1 + nameMatch[0].length, t.end - (t.selfClosing ? 1 : 0));
    if (/^\s*,/.test(header)) { i = lt + 1; continue; }
    /* An attribute list is names, `{...spreads}` and strings. A `|`, a `&` or
       a bare `[]` at the top level of it is a type, not a header. */
    if (/^\s*[|&]/.test(header)) { i = lt + 1; continue; }
    const before = src.slice(Math.max(0, lt - 120), lt);
    const boundMatch = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\(?\s*$/.exec(before);

    const node = {
      tag: nameMatch[0],
      attrs: attributes(header),
      children: [],
      slotRefs: [],
      file,
      line: lineAt(lt),
      start: lt,
      innerStart: t.end + 1,
      innerEnd: t.selfClosing ? t.end + 1 : null,
      end: t.selfClosing ? t.end + 1 : null,
      bound: boundMatch ? boundMatch[1] : null,
    };
    push(node);
    if (!t.selfClosing) stack.push(node);
    i = t.end + 1;
  }

  /* Anything left open at EOF closes at EOF. */
  for (const n of stack) { n.innerEnd ??= src.length; n.end ??= src.length; }

  /* `{ident}` and `{props.ident}` written DIRECTLY inside an element — with
     every child element's own span cut out first, so a `{children}` two levels
     down is not attributed to its grandparent. These are the slots: the point
     where a call site's children, or a prop holding JSX, is actually rendered. */
  const IDENT = /\{\s*(?:props\.)?([A-Za-z_$][\w$]*)\s*\}/g;
  const fillSlots = (nodes) => {
    for (const n of nodes) {
      let text = "";
      let cursor = n.innerStart;
      for (const c of n.children) {
        text += src.slice(cursor, c.start);
        cursor = c.end ?? c.start;
      }
      text += src.slice(cursor, n.innerEnd ?? n.innerStart);
      IDENT.lastIndex = 0;
      let m;
      while ((m = IDENT.exec(text))) n.slotRefs.push(m[1]);
      fillSlots(n.children);
    }
  };
  fillSlots(roots);

  return { file, src, rawSrc, roots };
}

/* ----------------------------------------------------------------------------
   2 · Class extraction

   Only STRING LITERALS are read. A class arriving through a variable is
   invisible here and is counted as such — see `unreadable` below.
   ------------------------------------------------------------------------- */

const LITERAL = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\$]*)`/g;

export function literalsIn(expr) {
  if (!expr) return [];
  const out = [];
  let m;
  LITERAL.lastIndex = 0;
  while ((m = LITERAL.exec(expr))) out.push(m[1] ?? m[2] ?? m[3] ?? "");
  return out;
}

/** Split a class string, dropping every state/breakpoint-prefixed class. */
export function splitClasses(text) {
  const kept = [];
  const conditional = [];
  for (const raw of text.split(/\s+/)) {
    if (!raw) continue;
    /* A `:` outside brackets means a variant prefix — hover:, lg:,
       data-[state=open]:, max-[45rem]:. Those are grounds in a state this
       walker cannot enter. */
    let depth = 0;
    let prefixed = false;
    for (const ch of raw) {
      if (ch === "[") depth++;
      else if (ch === "]") depth--;
      else if (ch === ":" && depth === 0) { prefixed = true; break; }
    }
    (prefixed ? conditional : kept).push(raw);
  }
  return { kept, conditional };
}

/* ----------------------------------------------------------------------------
   3 · cva tables

   `cva("base", { variants: { variant: { raised: "bg-card" } }, defaultVariants })`
   is read out of the source so a `<Card variant="raised">` at a call site can
   be told what it paints. Only the `variant` axis is read: it is the axis the
   kit uses for grounds, and reading axes that never carry one would invent
   combinations no call site can produce.
   ------------------------------------------------------------------------- */

function braceSpan(src, from) {
  const open = src.indexOf("{", from);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  return null;
}

export function cvaTables(src) {
  const tables = new Map();
  const re = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*cva\(/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length;
    /* The base is everything up to the top-level comma before `{ variants`. */
    const optionsIdx = src.indexOf("{", start);
    const base = literalsIn(src.slice(start, optionsIdx < 0 ? start : optionsIdx)).join(" ");
    const options = optionsIdx < 0 ? null : braceSpan(src, optionsIdx - 1);
    const table = { base, variants: new Map(), defaultVariant: null };
    if (options) {
      const vIdx = options.indexOf("variant:");
      if (vIdx >= 0) {
        const span = braceSpan(options, vIdx);
        if (span) {
          const vre = /([A-Za-z_$][\w$"'-]*)\s*:\s*((?:\[[^\]]*\])|(?:"[^"]*")|(?:'[^']*'))/g;
          let vm;
          while ((vm = vre.exec(span))) {
            table.variants.set(vm[1].replace(/["']/g, ""), literalsIn(vm[2]).join(" "));
          }
        }
      }
      const dm = /defaultVariants\s*:\s*\{[^}]*variant\s*:\s*["']([\w-]+)["']/.exec(options);
      if (dm) table.defaultVariant = dm[1];
    }
    tables.set(m[1], table);
  }
  return tables;
}

/* ----------------------------------------------------------------------------
   3b · Module-level class constants

   THE PATTERN THAT MADE BUG THREE UNREACHABLE FROM THE SOURCE. `Kanban` does
   not write its dot's class in the element:

       const COLUMN_DOT = { building: "bg-[var(--dot-building)]", … };
       <span className={cn("size-[var(--dot-status)] …", COLUMN_DOT[dot])} />

   A walker that reads only the literals inside `className` sees a 7px span
   with no fill at all — which is not a miss, it is a SILENCE, and silence is
   indistinguishable from a clean bill of health. The kit uses this shape
   everywhere a tone is chosen by data: `COLUMN_DOT`, `DOT_TONE`,
   `INTERACTIVE_NEUTRAL`, `CARD_SELECTED`, `LIST_SKIN`.

   So every `const` is read for its string literals, and a className that
   names one gets them. EACH VALUE OF A TABLE IS ONE ALTERNATIVE, not one long
   class list: six dot tones are six grounds a column head can draw, and all
   six are measured against the head's paper.

   AND IT IS EVERY CONST, NOT ONLY THE COLUMN-ZERO ONES. This used to anchor
   at `^const`, which is to say at module level, and a skin assembled INSIDE a
   render — `const skin = cn(pillClasses, isCurrent && "bg-[var(--surface-brand)] …")`
   in `status-stepper`'s pill row — read as an element with no fill at all.
   That is not merely a missed ground: an element that paints nothing hands
   its ANCESTOR's ground to its children, so the pill's own children were
   measured against the dialog behind the pill instead of against the pill.
   The anchor is now `^[ \t]*const`, which is the same rule applied wherever
   the const is written. A local const that holds no `bg-`/`text-` literal is
   dropped exactly as a module-level one is, so the only consts this adds are
   the ones that decide a colour.
   ------------------------------------------------------------------------- */

export function classConstants(src) {
  const out = new Map();
  const re = /^[ \t]*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*/gm;
  let m;
  while ((m = re.exec(src))) {
    const from = m.index + m[0].length;
    /* The value runs to the first `;` at depth zero. */
    let depth = 0;
    let quote = null;
    let i = from;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === "\\") { i++; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
      if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) depth--;
      else if (c === ";" && depth <= 0) break;
      if (i - from > 4000) break;
    }
    const value = src.slice(from, i);
    if (value.includes("<")) continue;                 // JSX, not a class string
    /* A `cva(...)` table is NOT a class constant. Its variants are mutually
       exclusive by construction — one `variant` prop picks exactly one — and
       reading them all as simultaneous alternatives puts the `outline`
       variant's ink on the `inverse` variant's fill and reports 1.000 for a
       badge that cannot exist. `cvaTables` reads these properly, one variant
       at a time, with the call site's own prop. */
    if (/^\s*cva\s*\(/.test(value)) continue;
    const literals = literalsIn(value).filter((s) => /(^|\s)(bg|text)-/.test(s));
    if (literals.length) out.set(m[1], literals);
  }
  return out;
}

/* ----------------------------------------------------------------------------
   4 · The component registry

   One entry per component NAME the kit exports, holding the forest it renders
   and the cva table its root reads. Components are found by their definition
   at column zero, which is how every file in this repo writes them.
   ------------------------------------------------------------------------- */

export function tsxFilesUnder(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "dist" || name === "node_modules") continue;
      out.push(...tsxFilesUnder(p));
    } else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/**
 * Build `name -> { file, roots, cva }` for every component definition found.
 *
 * A component's forest is the JSX written inside its definition span. The
 * span runs from its own `function`/`const` at column zero to the next one,
 * which is coarse and deliberately so: a helper defined between two
 * components lands in the first one's forest, where its JSX is still real JSX
 * rendered by that file. The cost is a slightly wider tree, never a wrong one.
 */
export function buildRegistry(files) {
  const registry = new Map();
  const collisions = [];

  for (const file of files) {
    const parsed = parseFile(file);
    const cva = cvaTables(parsed.src);
    const constants = classConstants(parsed.src);

    /* Definition boundaries, at column zero. */
    const defs = [];
    const dre = /^(?:export\s+)?(?:default\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9]*)\b/gm;
    let m;
    while ((m = dre.exec(parsed.src))) {
      /* `const DOT_TONE = {...}` is a table, not a component. A SCREAMING_CASE
         name is the repo's own signal for one, and admitting them cuts a
         file's components into spans that belong to nothing. */
      if (m[1] === m[1].toUpperCase()) continue;
      defs.push({ name: m[1], index: m.index });
    }
    defs.push({ name: null, index: parsed.src.length });

    /* Which cva table does this file's components read? The one whose name a
       component's own className mentions; with one table in the file, that is
       simply the table. */
    const tableNames = [...cva.keys()];

    for (let d = 0; d < defs.length - 1; d++) {
      const { name, index } = defs[d];
      const end = defs[d + 1].index;
      const lineStart = parsed.rawSrc.slice(0, index).split("\n").length;
      const lineEnd = parsed.rawSrc.slice(0, end).split("\n").length;
      const roots = parsed.roots.filter((n) => n.line >= lineStart && n.line < lineEnd);
      if (!roots.length) continue;

      const body = parsed.src.slice(index, end);
      const used = tableNames.find((t) => body.includes(t + "("));
      const entry = {
        name, file, roots, constants,
        cva: used ? cva.get(used) : null,
        cvaName: used ?? null,
      };

      if (registry.has(name)) collisions.push(`${name}: ${registry.get(name).file} and ${file}`);
      else registry.set(name, entry);
    }
  }

  return { registry, collisions };
}
