#!/usr/bin/env node
/* ============================================================================
   THE CONTRAST LAW — run by `npm run check`, beside the token, icon, states
   and book checks that already guard this repo.

   WHY IT EXISTS, in the words of the evening that produced it.

   In one evening the consuming app hit three colour bugs, and every one of
   them was the same mistake wearing a different component:

       record footer on the card it sits inside (dark)       1.000
       toolbar well on the shell's content card (BOTH)       1.000
       --dot-building bare on --surface-panel (dark)         1.02

   None of them could go red, because nothing in this kit measured a token
   against the surface it is actually used on. Each value was CORRECT for the
   context it was written for and invisible in a context nobody re-measured.
   `--surface-record-footer` was `var(--surface-raised)`, which is exactly what
   CH27.8's dark clause asks for — of a footer sitting on the PAGE. This one
   sits on a card. `--dot-building` was charcoal, which is the only legible ink
   on the mango pill ruling 26 puts it on. `Kanban`'s column header puts it on
   soft paper.

   TWO TOKENS CAN EACH BE CORRECT AND STILL NAME ONE COLOUR. That sentence is
   the whole subject of this file.

   ----------------------------------------------------------------------------
   WHAT IT DERIVES, AND FROM WHAT

   Nothing here is a list. `GAPS-TRACK1.md` STA-2 is the argument against
   lists, written by this repository against itself: it recorded "nothing in
   the kit consumes the six `--dot-*` tokens" as the JUSTIFICATION for leaving
   those six values alone, and the sentence quietly stopped being true the day
   `Kanban` grew a column header. Nobody edited it, because nothing made them.
   A hand-kept register of "these must differ" would expire the same way and
   for the same reason, and this codebase rejects that shape on principle —
   see R2's "Earned by" note in the consuming app's RULES.md.

   So every pair is derived, from three sources that cannot go stale without
   somebody editing code:

     1 · THE TOKEN VALUES, through `token-model.mjs` — which is
         `build-tokens.mjs`'s own reader, moved out so that both use it. This
         matters more than it looks: `--surface-record-footer` →
         `--surface-raised` → `--card` → `#26241F` is a three-hop chain and
         the bug was only visible at the end of it. A check that compared
         NAMES would have called that pair different and passed. A second
         resolver would have been a second opinion about what a token
         resolves to, which is the same failure one level up.

     2 · THE UTILITY NAMES, out of tokens.css's own `@theme inline` bridge.
         `bg-card` paints `--card` because the bridge says so. Reading the
         bridge rather than keeping a table is the same decision
         `build-tokens.mjs`'s DEAD SELECTOR guard makes from the other side.

     2b · AND §8's GROUND-KEYED REBINDS, out of the same stylesheet. A
         relational token does not have one value: `--btn-secondary-fill` is
         `var(--card)` on `:root` and soft paper inside any off-beige ground
         scope, because ruling 01 states a RELATION and a flat value cannot
         hold one. Resolving the `:root` half against a ground that is one of
         those scopes measures the exact pair the rebind exists to prevent —
         which this law did on its first run, reporting §8 itself as a 1.000
         bug. It is keyed on the CLASS, so `bg-surface-raised` is in scope and
         the arbitrary `bg-[var(--surface-raised)]` is not, and the two are
         kept apart here exactly as the stylesheet keeps them apart. The
         rebind is resolved against THE GROUND BEING MEASURED, never merged
         across an element's branches: a `ground ? "bg-surface-raised" :
         "bg-surface-panel"` means two different values and each is measured
         where it applies.

     3 · WHAT SITS ON WHAT, out of the components — `ground-map.mjs`. The
         kit's own law is that a ground-painting element uses a NAMED utility
         class, so the tree of those classes IS the answer to "what is behind
         this". The walk crosses component boundaries (a `<Card>` is its cva's
         fill, and a call site's `className` merges over it the way
         tailwind-merge makes it), follows children through slots (the demo's
         `ViewPreview` hands its children to `CollectionFrame`, which paints
         the paper a `Kanban` column head then stands on), reads class TABLES
         (`COLUMN_DOT[dot]` — the shape that made bug three unreadable), and
         breaks the chain at a portal, because an overlay does not sit on the
         card its trigger happened to be in.

   `demo/` is in scope and has to be. `components/` says what each part
   paints; almost none of them say what they are placed ON. The book is the
   only place in this repository where several of them meet a ground at all.

   ----------------------------------------------------------------------------
   THE TIERS, AND WHY NOT WCAG

   Four tiers, because this kit draws four different things with colour and
   they have nothing in common: a word, a 7px dot, a card boundary and a
   hairline. Every floor is argued from a number already written down and
   defended in this repository. Where one lands on a WCAG number it is because
   THE KIT GOT THERE FIRST — `--kw-forest` was moved to #20955B for the stated
   reason that 4.44 was "under AA's 4.5 for the 12px badge label", and
   `--kw-poppy-ink` was minted at 4.98/4.52 the same way. 4.5 is a number this
   kit has spent two hexes on; it is not an import. The full argument for each
   floor is beside it in `TIERS` below.

   THE ONE THAT IS NOT NEGOTIABLE is that nothing may be INVISIBLE. 1.000 is
   not a low-contrast surface, it is the same surface, and 1.02 is not a design
   position. Everything else in this file is a judgement that a person may
   overturn with a reason; that one is arithmetic.

   AND THE HARDEST CALL IS THE ONE THAT LOOKS SOFTEST. The boundary gate is
   1.05, not the 1.10–1.20 band the kit's defended steps sit in, because the
   kit's own page/panel alternation — ch26.04, stated as law — measures 1.079
   in dark. A law whose first act is to fail the foundation of the system it
   guards is a law that gets switched off within a week. So 1.10 is kept as
   the QUIET line: every boundary under it is printed with its number on every
   run, so the register grows and the client can rule on the band, while the
   build goes red only where a surface has stopped existing.

   ----------------------------------------------------------------------------
   WHAT IT DELIBERATELY DOES NOT ASSERT

   · IT DOES NOT ASSERT THAT A LOW NUMBER IS WRONG. It asserts that an
     invisible one is. The kit ships 1.103, 1.111, 1.198 and 1.499 as answers,
     and two of the six `--dot-*` tones sit at 1.81 and 2.21 with a written
     argument behind them.
   · IT DOES NOT ASSERT ANYTHING ABOUT STATES IT CANNOT ENTER. `hover:`,
     `data-[state=open]:` and breakpoint-prefixed grounds are counted and
     printed, never measured.
   · IT DOES NOT ASSERT CO-OCCURRENCE IT CANNOT PROVE. Two conditional fills
     chosen inside ONE component are two props, and a `dot="shipped"` on a
     `variant="destructive"` badge is a product the source never writes. Those
     pairs are declined and counted rather than reported as bugs.
   · IT DOES NOT SEE A GROUND CHANGED BY A CUSTOM PROPERTY. `record-detail.tsx`
     rebinds `--card` on the footer's inner grid; that is a real ground change
     with no class attached to it. Counted, printed, unmeasured.
   · IT DOES NOT SEE THE CONSUMING APP. Every pair here is one the KIT itself
     draws. An app that composes two kit parts in a way the kit never does can
     still make an invisible pair, and this check will not know — which is
     exactly how bug two reached a screen. The answer to that is this same
     check running there, over the same tokens.
   · IT MEASURES COLOUR, NOT LAYOUT. A perfectly legible pair that is 2px tall
     behind a shadow is not its business.

   ----------------------------------------------------------------------------
   A BOUNDARY IS A STEP OR A STROKE — 2026-09-08, and read the whole of this

   THIS FILE USED TO SAY, in this exact place, that it "does not credit an
   inset HAIRLINE for a boundary the fill fails to make", on the grounds that
   "there is an edge somewhere" is not the same claim as "these two surfaces
   are different". The first half of that sentence was wrong and the second
   half was right, and separating them is the whole of this section.

   THE KIT HAS ALWAYS DRAWN BOUNDARIES BOTH WAYS. `tokens.css` forbids the
   `border` property outright — review 1A · fix 2 — and sanctions exactly two
   ways to say "this surface ends here": a fill one step from the ground, or an
   inset stroke. `--hairline` (`inset 0 0 0 1px var(--hair)`) exists for the
   second, `badge.tsx`'s `outline` variant and `card.tsx`'s `hairline` prop use
   it that way, and the record-footer entry in the CHANGELOG states the pairing
   in as many words: "the boundary is a step AND a rule". A law that could see
   only the step was measuring one of the kit's two sanctioned answers and
   calling the other one absent.

   SO THE REFINEMENT, AND IT IS A DERIVATION RATHER THAN AN EXEMPTION:

       A fill below the boundary floor is acceptable IF AND ONLY IF the same
       element also draws a hairline whose OWN contrast against that same
       ground clears the hairline tier.

   Nothing about the boundary floor moves. No tier is renamed, no exemption is
   widened, and the two entries in EXEMPT are still two. What changes is that a
   second, MEASURED fact can now answer the question the first one asked — and
   the reason the old sentence was nonetheless right is that a hairline is a
   colour like any other, and this law had never measured one here. "There is
   an edge somewhere" is still refused. "There is an edge, and it measures
   1.175 against that ground in light and 1.161 in dark" is a different claim,
   and it is the one the discharge requires.

   FOUR THINGS KEEP IT FROM BECOMING A BLANKET PASS, and each is asserted on
   every run by the DISCHARGES fixtures below, both ways, the way EXEMPT is:

     · THE STROKE IS MEASURED, NOT COUNTED. `--hair` and `--hair-faint` are
       charcoal at 8% and 6%, so a stroke's real colour is a function of what
       is under it; the alpha is composited exactly as an ink's is. A
       `--hair-faint` ring on `--surface-idle` in dark composites to 1.022 and
       DISCHARGES NOTHING — it is a rule nobody can see, drawn around a fill
       nobody can see.
     · IT IS MEASURED THE WORSE OF THE TWO HONEST WAYS. An inset shadow paints
       ON the element's own fill, so its true colour is stroke-over-fill and
       the question is whether THAT reads against the ground. But a reader may
       equally ask what the stroke would measure taken against the ground
       alone. Both are computed and the LOWER is the one that has to clear the
       floor, because picking the kinder of two defensible numbers is how a
       law starts negotiating with itself.
     · ONLY A CLOSED RING COUNTS. `--hairline-under`, `--hairline-over` and
       `--hairline-start` are one edge each — a rule between two things, not a
       shape around one — and a pill whose fill has vanished is not rescued by
       a line along its bottom. Only `inset 0 0 0 <spread> <colour>` with a
       real spread discharges. A NON-inset shadow discharges nothing either: it
       paints outside the element, on the ground, and is not that element's
       edge.
     · THE STROKE MUST BE PROVABLY ON WITH THE FILL. It is taken from the same
       class group as the fill it discharges — the same branch of the same
       `cn()` — or from an unconditional group on the same element. A stroke in
       the other arm of a ternary is not a stroke this fill has.

   And a discharged pair is PRINTED, with both palettes' stroke figures, in its
   own band beside QUIET. A boundary carried by a rule rather than by a step is
   a thing the client should be able to count, not a thing that disappears.

   ----------------------------------------------------------------------------
   TWO THINGS IT USED TO GET WRONG IN THE UNSAFE DIRECTION — 2026-09-08

   A law that MISSES a pair is a hole. A law that INVENTS one costs more,
   because the first thing a person does with a false finding is stop reading
   the true ones. Two of the eleven pairs this check arrived red on were its
   own, and both came out of `ground-map.mjs` rather than out of the colours:

   · A FRAGMENT WAS NOT A NODE. `<>` carries no tag name, so the scanner
     walked past it — and with it past the structure that makes
     `const inner = (<>…</>)` a binding. Everything inside was reparented onto
     whatever element the fragment sat inside, and `{inner}` rendered nothing,
     so the splice-at-use this file's own header promises silently stopped
     happening for every binding the kit wraps in a fragment.
   · A CLASS CONSTANT HAD TO BE AT COLUMN ZERO. `const skin = cn(…)` written
     inside a render read as an element with no fill, and an element that
     paints nothing hands its ANCESTOR's ground to its children.

   Together those two put `status-stepper`'s current pill's number —
   `text-ink-on-accent`, charcoal, sitting on the mango pill that covers it —
   against the DIALOG behind the stepper, and reported 1.132 in dark for a
   pair no screen has ever drawn. Both are fixed in `ground-map.mjs` with the
   argument written beside each.

   ----------------------------------------------------------------------------
   THE TWO THINGS THAT MAKE IT TRUSTWORTHY

   A REGRESSION SET. Three bugs, four fixtures, kept with their PRE-FIX values,
   asserted RED on every run. A law that passes on a fixed tree tells you
   nothing, because green is also what a law that has stopped looking prints.
   If a threshold is softened, a tier renamed, an exemption widened or the
   colour maths drifted, the fixtures go before anything else does.

   A BLINDNESS TRIPWIRE. Three ANCHORS — specific pairs that can only exist if
   the walker is still crossing component boundaries, still reading cva
   variants, still reading class tables, still letting a caller's className win
   — plus collapse floors on the census. Anchors rather than a bare count,
   because a count can be met by any old rubbish while an anchor names a chain
   through named files. This is the failure mode that has already bitten this
   project twice in one day: STA-2's assumption expiring in silence, and
   `verify/out.css` going on resolving a dot to a colour the source had
   changed.

   Exemptions are reasoned, dated, and checked BOTH WAYS — an exemption that
   matches nothing fails the check, so the list can only shrink and shrinking
   it takes a person deleting a line. `demo/check-book.mjs`'s TOOLBAR_EXEMPT is
   the pattern.

     node foundations/tokens/check-contrast.mjs           the gate
     node foundations/tokens/check-contrast.mjs --all     every pair, measured
     KW_WHY=dot- node foundations/tokens/check-contrast.mjs   trace one token
   ============================================================================ */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readTokenModel, resolvedPalette } from "./token-model.mjs";
import { parseColor, composite, contrast, hex } from "./color.mjs";
import { buildRegistry, tsxFilesUnder, literalsIn, splitClasses } from "./ground-map.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ARGV = process.argv.slice(2);
const VERBOSE = ARGV.includes("--all");

/* ----------------------------------------------------------------------------
   The palettes, through the SAME reader `build-tokens.mjs` uses.
   ------------------------------------------------------------------------- */

const model = readTokenModel();
const PALETTE = { light: resolvedPalette(model, "light"), dark: resolvedPalette(model, "dark") };
const THEMES = ["light", "dark"];

/* The Tailwind bridge is the authority on which utility names exist and what
   each one paints. Reading it rather than keeping a list is the same decision
   `build-tokens.mjs`'s DEAD SELECTOR guard makes from the other side. */
const bridge = model.raw.slice(model.raw.indexOf("@theme inline"));
const COLOR_UTILITY = new Map();   // `card`      -> `--card`
const TEXT_UTILITY = new Set();    // `caption`   -> a type step, not an ink
for (const m of bridge.matchAll(/--color-([a-z0-9-]+)\s*:\s*var\(\s*(--[a-z0-9-]+)\s*\)/g)) {
  COLOR_UTILITY.set(m[1], m[2]);
}
for (const m of bridge.matchAll(/--text-([a-z0-9-]+)\s*:/g)) TEXT_UTILITY.add(m[1]);

/* ----------------------------------------------------------------------------
   §8's GROUND-KEYED REBINDS — a token whose value depends on the class of the
   surface it is standing on, read out of tokens.css rather than listed here.

   THIS IS THE ONE MECHANISM IN THE KIT THAT DELIBERATELY MAKES A TOKEN MEAN
   TWO COLOURS, and a law that could not see it reported the mechanism itself
   as a bug. `--btn-secondary-fill` is `var(--card)` on `:root` and tokens.css
   §8 rebinds it to `var(--surface-panel)` under `.bg-background`, `.bg-card`,
   `.bg-popover`, `.bg-surface-raised`, `.bg-surface-page` and
   `[data-ground=page]`, and to `var(--surface-raised)` under
   `.bg-surface-panel`, `.bg-secondary` and `[data-ground=panel]` — ruling 01,
   "a band and its buttons are never the same tone", stated as a relation
   rather than as a value. Resolving the `:root` half against a ground that is
   one of those classes measures the exact pair the rebind exists to prevent:
   #FFFEF9 on #FFFEF9, 1.000, for a button the browser paints soft paper.

   IT IS KEYED ON THE CLASS, NOT ON THE COLOUR, and that distinction is load-
   bearing rather than pedantic. `bg-surface-raised` matches §8; the arbitrary
   `bg-[var(--surface-raised)]` paints the identical colour and matches
   NOTHING, because Tailwind emits it under a different selector. That is not
   a quirk this file works around — `screen-shell.tsx`'s BODY paints exactly
   that arbitrary form and then writes `[--btn-secondary-fill:var(--surface-panel)]`
   by hand precisely BECAUSE §8 cannot reach it. So the two forms are kept
   apart here as CSS keeps them apart, and Tailwind's arbitrary-property
   utility is read as what it is: a rebind on that one element.

   Read from the stylesheet, not listed, for the same reason as everything
   else in this check: a list would still say `--btn-secondary-fill` on the
   day somebody adds a second relational token, and nothing would make them
   edit it. Only rules whose whole selector list is bare `.bg-*` classes or
   `[data-ground="…"]` are taken — those are the ground scopes; a rule with a
   descendant, a pseudo-class or an element in it is not one.
   ------------------------------------------------------------------------- */

const GROUND_REBIND = new Map();   // `bg-card` / `data-ground=page` -> Map(token -> value)
{
  const css = model.raw.replace(/\/\*[\s\S]*?\*\//g, " ");
  for (const m of css.matchAll(/(^|[};])\s*([^{}@;]+?)\s*\{([^{}]*)\}/g)) {
    const parts = m[2].split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) continue;
    const keys = [];
    for (const p of parts) {
      let k = null;
      if (/^\.[A-Za-z0-9_-]+$/.test(p)) k = p.slice(1);
      else if (/^\[data-ground=["']?[A-Za-z0-9_-]+["']?\]$/.test(p)) k = p.slice(1, -1).replace(/["']/g, "");
      if (!k) { keys.length = 0; break; }
      keys.push(k);
    }
    if (!keys.length) continue;
    const decls = [...m[3].matchAll(/(--[A-Za-z0-9-]+)\s*:\s*([^;]+);/g)];
    if (!decls.length) continue;
    for (const k of keys) {
      const into = GROUND_REBIND.get(k) ?? new Map();
      for (const d of decls) into.set(d[1], d[2].trim());
      GROUND_REBIND.set(k, into);
    }
  }
}

/* Tailwind's arbitrary-property utility, `[--btn-secondary-fill:var(--surface-panel)]`
   — a custom property declared on ONE element, which is how the shell rebinds
   the fill for a body it paints with an arbitrary background §8 cannot see. */
const ARBITRARY_PROP = /^\[(--[A-Za-z0-9-]+)\s*:\s*(.+)\]$/;

/* ----------------------------------------------------------------------------
   Classes -> tokens
   ------------------------------------------------------------------------- */

/* `bg-*` utilities that set no colour. Tailwind's own vocabulary. */
const BG_NON_COLOUR = new Set([
  "cover", "contain", "auto", "center", "top", "bottom", "left", "right",
  "repeat", "no-repeat", "repeat-x", "repeat-y", "repeat-round", "repeat-space",
  "fixed", "local", "scroll", "clip", "origin", "blend", "none", "gradient",
  "transparent", "current", "inherit", "size", "position", "image",
]);
const TEXT_NON_COLOUR = new Set([
  "left", "center", "right", "justify", "start", "end", "wrap", "nowrap",
  "balance", "pretty", "clip", "ellipsis", "current", "inherit", "transparent",
  "xs", "sm", "base", "lg", "xl", "size", "align", "transform", "decoration",
  "shadow", "pos", "indent", "overflow",
]);

/* `bg-[var(--tok)]`, and `bg-[var(--tok,var(--fallback))]` too: the whole
   expression is handed to the token model's own resolver, fallback and all,
   rather than being pattern-matched down to a name this file then has to look
   up a second way. */
const ARBITRARY_VAR = /^\[(var\(.*\))\]$/;
const ARBITRARY_HEX = /^\[(#[0-9a-fA-F]{3,8}|rgba?\([^\]]*\))\]$/;

/* ----------------------------------------------------------------------------
   A STROKE — the kit's other way of saying "this surface ends here".

   THE SPELLINGS ARE THE ONES THE KIT ACTUALLY WRITES, counted rather than
   assumed. `grep -o 'shadow-\[[^]]*\]' components compositions demo` over this
   tree gives 24 distinct forms, and they fall into exactly two families:

       shadow-[var(--hairline)]                 the nine named shapes
       shadow-[var(--hairline-under)]           (…-over, -start, -strong,
       shadow-[var(--hairline-ink)]              -under-strong, -over-strong,
       shadow-[var(--hairline-error)]            -error)

       shadow-[inset_0_0_0_0.0625rem_var(--hair-strong)]      written out
       shadow-[inset_0_-0.0625rem_0_var(--border)]            in place
       shadow-[inset_0_0.0625rem_0_var(--spine-hair)]
       shadow-[1px_0_0_0_var(--hair-grid)]
       shadow-[0_0_0_var(--avatar-ring)_var(--background)]
       shadow-[var(--shadow-rest)]   …-lifted, …-overlay

   NEITHER FAMILY IS PATTERN-MATCHED DOWN TO A TOKEN NAME. The whole bracket
   is handed to the token model's own resolver — the same one that turns
   `--surface-record-footer` into `#26241F` three hops down — and what comes
   back is a box-shadow string that is then read as a SHAPE and a COLOUR. That
   is what keeps `--hairline` and its literal spelling one thing, and it is
   why the drop shadows and the avatar ring in the list above need no entry
   here: they resolve to shapes that are not a closed inset ring, and are
   refused by the shape test rather than by a name this file keeps.

   Tailwind writes spaces as `_` inside an arbitrary value, so they come back
   out first. */
const SHADOW_CLASS = /^shadow-\[(.+)\]$/;

/** The raw box-shadow expression a `shadow-[…]` class carries, or null. */
function strokeExprOf(cls) {
  const m = SHADOW_CLASS.exec(cls);
  return m ? m[1].replace(/_/g, " ") : null;
}

/* A CLOSED INSET RING and nothing else: `inset 0 0 0 <spread> <colour>`. The
   three zeroes are the x-offset, the y-offset and the blur, and a spread is
   required to be non-zero because `inset 0 0 0 0 <colour>` draws nothing.
   Everything the kit spells that is NOT this shape is a one-sided rule
   (`inset 0 -1px 0 …`), an outer shadow (`1px 0 0 0 …`, `0 0 0 <ring> …`) or a
   soft drop shadow, and none of those is a boundary drawn around a fill. */
const CLOSED_RING = /^inset\s+0(?:[a-z%]+)?\s+0(?:[a-z%]+)?\s+0(?:[a-z%]+)?\s+([\d.]+)([a-z%]*)\s+(.+)$/i;

/**
 * Resolve one stroke expression in one palette and return the colour of the
 * ring it draws, or null if it does not draw one.
 */
function ringOf(expr, theme) {
  if (!expr) return null;
  const r = theme === "dark" ? model.resolveDark : model.resolveLight;
  const resolved = r(expr).replace(/\s+/g, " ").trim();
  const m = CLOSED_RING.exec(resolved);
  if (!m || parseFloat(m[1]) <= 0) return null;
  const colour = parseColor(m[3].trim());
  return colour ? { colour, spread: m[1] + m[2], resolved } : null;
}

/**
 * What does this class paint? Returns `{ token }`, `{ literal }`, `null`
 * (nothing to do with colour), or `{ unreadable }`.
 */
function colourOf(cls, kind) {
  const prefix = kind + "-";
  if (!cls.startsWith(prefix)) return null;
  const tail = cls.slice(prefix.length);
  if (!tail) return null;

  let m = ARBITRARY_VAR.exec(tail);
  if (m) {
    const expr = m[1].replace(/_/g, " ");
    /* `bg-[var(--card)]` and `bg-card` are the same paint and must be the same
       key, or the two halves of one pair sit in two rows and neither reads as
       a pair at all. Only a BARE var() collapses; one with a fallback keeps
       its whole expression, because the fallback is part of the answer. */
    const bare = /^var\(\s*(--[A-Za-z0-9-]+)\s*\)$/.exec(expr);
    return { token: bare ? bare[1] : expr };
  }
  m = ARBITRARY_HEX.exec(tail);
  if (m) return { literal: m[1] };
  if (tail.startsWith("[")) return { unreadable: cls };

  const head = tail.split("-")[0];
  if (kind === "bg" && (BG_NON_COLOUR.has(head) || BG_NON_COLOUR.has(tail))) return null;
  if (kind === "text") {
    if (TEXT_NON_COLOUR.has(head) || TEXT_NON_COLOUR.has(tail)) return null;
    if (TEXT_UTILITY.has(tail)) return null;               // a type step
    if (/^\d/.test(tail)) return null;                     // text-2xl, text-7xl
  }
  /* The CLASS is carried alongside the token, because §8's rebinds key on the
     class name and not on the colour it happens to paint. */
  if (COLOR_UTILITY.has(tail)) return { token: COLOR_UTILITY.get(tail), cls };
  return { unreadable: cls };
}

/* ----------------------------------------------------------------------------
   The registry — every component the kit ships, as a tree it can be walked
   through.
   ------------------------------------------------------------------------- */

/* `demo/` IS IN SCOPE AND HAS TO BE. `components/` and `compositions/` say
   what each part paints; almost none of them say what it is placed ON. The
   book does — it is the only place in this repository where `Kanban` meets a
   ground at all, and the dot that measured 1.02 lives in a column header
   whose paper is decided four files away by whatever renders the board. A law
   that skipped the book would have reported "all clear" on bug three while
   the bug was two directories away, which is precisely the failure being
   guarded against. */
const SCAN_DIRS = ["components", "compositions", "demo"].map((d) => path.join(ROOT, d));
const FILES = SCAN_DIRS.flatMap((d) => tsxFilesUnder(d));
const { registry, collisions } = buildRegistry(FILES);

/* Local JSX bindings, per component: `const inner = <Foo/>` used as `{inner}`. */
function bindingsOf(entry) {
  const out = new Map();
  const visit = (nodes) => {
    for (const n of nodes) {
      if (n.bound) out.set(n.bound, n);
      visit(n.children);
    }
  };
  visit(entry.roots);
  return out;
}
for (const entry of registry.values()) entry.bindings = bindingsOf(entry);

/* ----------------------------------------------------------------------------
   The walk
   ------------------------------------------------------------------------- */

const pairs = new Map();       // key -> { kind, fg, bg, where[] }
const counts = {
  nodes: 0, files: FILES.length, components: registry.size,
  conditionalGrounds: 0, unreadableClasses: new Map(),
  styleRebinds: 0, recursionStops: 0, expansions: 0, ambiguousInks: 0, crossBranchSkips: 0, continuations: 0,
  strokes: 0,
};
const BUDGET = 400_000;
let exhausted = false;

/**
 * The class groups an element carries, in order.
 *
 * A GROUP IS A BRANCH, and getting this wrong invents bugs rather than finding
 * them. `cn(open ? "bg-surface-inverse text-ink-on-inverse" : "bg-surface-raised
 * text-foreground")` is ONE element with TWO complete answers, and reading its
 * classes as one flat list pairs the inverse ink against the raised paper —
 * 1.000, and entirely fictional, because no state of that element ever draws
 * it. So every string literal is its own group, an ink is measured against its
 * OWN group's ground first, and an element with two grounds is understood to
 * have two, not one.
 */
function classGroups(node, entry, inject) {
  const origin = entry?.file ?? node.file;
  const raw = node.attrs.get("className") ?? node.attrs.get("class") ?? "";
  /* A BRANCH IS A `?` OR AN `&&`, NOT A COMMA. `cn("flex …", "bg-surface-brand
     text-ink-on-accent", "px-…")` is one element wearing all three strings at
     once — the kit splits class lists across lines to comment them, not to
     make them exclusive. Treating those as alternatives loses the ground an
     ink is actually written beside, which is the one pairing nobody should
     have to guess at. Only an expression that actually contains a conditional
     gets the branch treatment. */
  const conditionalExpr = /\?|&&|\|\|/.test(raw);
  const bare = !conditionalExpr;
  const groups = [];

  /* The cva this file's root reads, evaluated with the call site's variant.
     Base and chosen variant are simultaneous, so they are ONE group. */
  if (entry?.cvaName && raw.includes(entry.cvaName + "(") && entry.cva) {
    const table = entry.cva;
    const v = inject?.variant ?? table.defaultVariant;
    const text = [table.base, v && table.variants.has(v) ? table.variants.get(v) : ""].join(" ");
    const g = readGroup(text);
    /* A cva with more than one variant paints a CHOSEN fill: which one is a
       prop, not a fact about the tree. Marking it conditional keeps it from
       being crossed with another prop's choice — a `dot="shipped"` on a
       `variant="destructive"` badge is a product of two independent props
       that no call site in this repository actually writes. */
    if (g.ground) g.ground = { ...g.ground, origin, cond: table.variants.size > 1 };
    groups.push({ ...g, conditional: false });
  }

  /* A className that names a module-level class constant gets that constant's
     strings, one group per value — see `classConstants`. */
  if (entry?.constants?.size) {
    for (const [name, values] of entry.constants) {
      if (!new RegExp(`\\b${name}\\b`).test(raw)) continue;
      for (const v of values) {
        const g = readGroup(v);
        if (g.ground) g.ground = { ...g.ground, origin, cond: true };
        groups.push({ ...g, conditional: true });
      }
    }
  }

  const literals = literalsIn(raw);
  let literalGroups = 0;
  if (bare) {
    /* No conditional in the expression: every string is on the element, and
       last-wins settles the ground and the ink between them. */
    const g = readGroup(literals.join(" "));
    if (g.ground) g.ground = { ...g.ground, origin, cond: false };
    groups.push({ ...g, conditional: false });
  } else {
    for (const lit of literals) {
      const g = readGroup(lit);
      if (g.any) literalGroups++;
      if (g.ground) g.ground = { ...g.ground, origin, cond: true };
      groups.push({ ...g, conditional: true });
    }
  }
  /* An element whose className is assembled from MORE THAN ONE string is an
     element with branches this walker cannot evaluate — `cn("…", charcoal ?
     "text-ink-on-inverse-secondary" : "text-ink-secondary")`. It is only a
     problem when the GROUND above is branching too, and then it is a bad one:
     the two branches are almost always driven by the same variable, so pairing
     across them measures the charcoal screen's ink on the paper screen's
     ground and reports a bug that no state of the component can draw. */
  groups.branching = literalGroups > 1;

  /* WHICH STROKE IS THIS FILL'S STROKE.
     Two answers are provable and no third one is. A stroke written in the SAME
     group as the fill is on whenever the fill is — the same arm of the same
     `cn()`, which is how `status-stepper` spells its later pill. A stroke in an
     UNCONDITIONAL group is on in every branch, so it is on with any of this
     element's fills. A stroke in the OTHER arm of a ternary is neither, and
     crediting it would be exactly the "there is an edge somewhere" claim this
     law refuses. */
  const firm = groups.find((g) => g.stroke && !g.conditional)?.stroke ?? null;
  for (const g of groups) if (g.ground) g.ground = { ...g.ground, stroke: g.stroke ?? firm };

  return groups;
}

function readGroup(text) {
  const { kept, conditional } = splitClasses(text);
  const any = kept.length > 0;
  counts.conditionalGrounds += conditional.filter((c) => /:(bg|text)-/.test(c)).length;
  let ground = null;
  let stroke = null;
  const inks = [];
  const props = new Map();
  for (const cls of kept) {
    const ap = ARBITRARY_PROP.exec(cls);
    if (ap) { props.set(ap[1], ap[2].replace(/_/g, " ")); continue; }
    /* LAST WINS here too: `shadow-none` after a hairline, or one shape
       overwritten by another, is one `box-shadow` property and the later
       class is the one the browser keeps. */
    if (cls.startsWith("shadow-")) {
      stroke = strokeExprOf(cls);
      counts.strokes += stroke ? 1 : 0;
      continue;
    }
    const bg = colourOf(cls, "bg");
    if (bg?.token || bg?.literal) ground = bg;
    else if (bg?.unreadable) note(bg.unreadable);
    const tx = colourOf(cls, "text");
    /* LAST WINS, INSIDE A GROUP, for the ink exactly as for the ground —
       because that is what `cn`'s tailwind-merge does. `cardVariants`' base
       says `text-card-foreground` and its `inverse` variant says
       `bg-surface-inverse text-ink-on-inverse`; both are in one group, only
       the second is on the element, and reading both as live inks measures
       charcoal ink on a charcoal card and reports 1.000 for a pair no screen
       has ever drawn. */
    if (tx?.token || tx?.literal) { inks.length = 0; inks.push(tx); }
    else if (tx?.unreadable) note(tx.unreadable);
  }
  return { ground, stroke, inks, any, props };
}

function note(cls) {
  counts.unreadableClasses.set(cls, (counts.unreadableClasses.get(cls) ?? 0) + 1);
}

const keyOf = (c) => (c ? c.token ?? c.literal : null);

function record(kind, fg, bg, node, chain) {
  const fgKey = keyOf(fg);
  const bgKey = keyOf(bg);
  if (!fgKey || !bgKey) return;
  /* A token standing inside a ground scope may resolve to something other
     than its `:root` value — §8, above. The pair keeps its NAMES, because the
     names are what a reader has to go and look at, and carries the expression
     each side actually resolves to on this ground. Two placements of one
     token that resolve differently are two pairs, not one averaged into
     silence. */
  /* §8 IS RESOLVED AGAINST THE GROUND BEING MEASURED, not against a merged
     picture of every ground the element might have. An element with two
     possible fills — `ground ? "bg-surface-raised" : "bg-surface-panel"` — is
     in the page scope in one branch and the panel scope in the other, and the
     relational token means a DIFFERENT colour in each. Merging them found a
     disagreement and fell back to the `:root` value, which is the one answer
     that is wrong in both branches: it reported 1.000 for a pair that
     measures 1.103 whichever way the prop goes. So the rebind is looked up on
     the ground this pair is actually against, and each ground gets its own
     measurement. An explicit `[--tok:value]` written between the ground and
     this element wins over the scope, because it is nearer. */
  const fgExpr = fg.expr ?? (bg.cls ? GROUND_REBIND.get(bg.cls)?.get(fgKey) : null) ?? fgKey;
  const bgExpr = bg.expr ?? bgKey;
  const rebound = fgExpr !== fgKey || bgExpr !== bgKey;
  /* THE STROKE IS PART OF THE PAIR'S IDENTITY, not a note attached to it. Two
     placements of one fill on one ground, where only ONE of them draws a
     hairline, are two different boundaries and exactly one of them may be
     discharged. Collapsing them onto one key would let the stroked placement
     answer for the bare one, which is the same first-wins accident that let a
     token be "correct" in the context it was written for. §8's rebinds reach
     into the shape too — `.bg-surface-inverse` flips `--hair` under it — so
     the ground's own scope is applied to the expression here, as it is to the
     fill. */
  let strokeExpr = fg.stroke ?? null;
  if (strokeExpr && bg.cls) {
    const rb = GROUND_REBIND.get(bg.cls);
    if (rb) strokeExpr = strokeExpr.replace(/var\(\s*(--[A-Za-z0-9-]+)\s*\)/g, (all, t) => rb.get(t) ?? all);
  }
  const key = `${kind}|${fgKey}|${bgKey}${rebound ? `|${fgExpr}|${bgExpr}` : ""}${strokeExpr ? `|+${strokeExpr}` : ""}`;
  const at = `${path.relative(ROOT, node.file)}:${node.line}`;
  const existing = pairs.get(key);
  if (existing) {
    existing.seen++;
    if (existing.where.length < 3 && !existing.where.includes(at)) existing.where.push(at);
    return;
  }
  pairs.set(key, {
    kind, fg: fgKey, bg: bgKey, fgExpr, bgExpr, rebound, strokeExpr,
    where: [at], seen: 1, chain: chain ?? "—",
    /* Whether either side is one option among several. A conditional pair is
       still a real pair — it is how a component behaves in one of its states —
       but the report says so, because "verify the state" is a different job
       from "this is wrong on every screen". */
    conditional: Boolean(fg.cond || bg.cond),
  });
}

/**
 * Walk one node.
 *
 * `grounds` is a LIST, because an element with a branch has more than one and
 * every branch is a state a person can see. It is empty when nothing above
 * this point paints a ground — the honest state of a component nobody has yet
 * placed on a surface, and the reason a component is measured at its call
 * sites rather than in isolation.
 */
function walk(node, grounds, entry, slots, inject, stack, consumed, chain, rebinds) {
  if (counts.nodes++ > BUDGET) { exhausted = true; return; }

  const styleAttr = node.attrs.get("style");
  if (styleAttr && /--[a-z-]+\s*:|background/i.test(styleAttr)) counts.styleRebinds++;

  const groups = classGroups(node, entry, inject);
  let candidates = groups.map((g) => g.ground).filter(Boolean);

  /* A call site's own className is merged OVER the component's, last-wins,
     which is what `cn`/tailwind-merge does — `Card variant="inverse"` with
     `className="bg-surface-record-footer"` paints the footer's ground, not
     charcoal. That override is the whole reason bug one is reachable. */
  if (inject?.grounds?.length) candidates = inject.grounds;

  /* WHAT THIS ELEMENT REBINDS, for itself and for everything under it.
     Two sources, and both are class-shaped so both are in the source: a
     Tailwind arbitrary-property utility written on the element, and §8's
     ground scopes matching a ground class the element paints.

     AN ELEMENT WITH TWO POSSIBLE GROUNDS ONLY REBINDS WHAT BOTH AGREE ON. A
     skin that is `bg-card` in one state and `bg-surface-idle` in another sits
     in a §8 scope in the first and in none in the second, so the fill under
     it is not one value and this walker does not get to pick the convenient
     one. Where the branches disagree the rebind is dropped and the token
     falls back to the value in force above — which is the honest answer and
     the same one the check gives everywhere else it cannot prove a state. */
  let localRebinds = rebinds ?? new Map();
  {
    const own = new Map();
    for (const g of groups) if (g.props?.size) for (const [k, v] of g.props) own.set(k, v);
    if (own.size) {
      localRebinds = new Map(localRebinds);
      for (const [k, v] of own) localRebinds.set(k, v);
    }
  }
  const withExpr = (c) => {
    if (!c) return c;
    let out = c;
    if (c.token && localRebinds.has(c.token)) out = { ...out, expr: localRebinds.get(c.token) };
    /* A rebind in force here reaches the STROKE as well as the fill — the
       shell writes `[--hair:…]` on a body §8 cannot see, and a stroke resolved
       against `:root` on that body would be the wrong colour by exactly the
       amount the rebind exists to correct. */
    if (c.stroke && localRebinds.size) {
      const sub = c.stroke.replace(/var\(\s*(--[A-Za-z0-9-]+)\s*\)/g, (all, t) => localRebinds.get(t) ?? all);
      if (sub !== c.stroke) out = { ...out, stroke: sub };
    }
    return out;
  };
  candidates = candidates.map(withExpr);

  /* Under a branching ancestor, only an element that is itself unconditional
     may be paired — see `classGroups`. Everything else is counted here and
     printed in the report, because a pair this walker declines to make is a
     hole and a hole has to be visible. */
  /* `KW_WHY=dot- npm run check:contrast` — trace one token family through the
     walk. It prints, on stderr, every element that paints a matching ground
     and what was behind it at that moment. This is here rather than in a
     scratch file because "the pair I expected is not in the output" is the
     question this check will be asked most often, and the answer is almost
     always a ground that never arrived. */
  if (process.env.KW_WHY && candidates.some((c) => (c.token ?? "").includes(process.env.KW_WHY))) {
    console.error(`WHY ${path.relative(ROOT, node.file)}:${node.line} <${node.tag}> cand=${candidates.map((c)=>c.token).join(",")} grounds=${grounds.map((g)=>g.token).join(",")||"NONE"} chain=${chain}`);
  }
  const crossBranch = grounds.length > 1 && (groups.branching || candidates.length > 1);
  if (crossBranch) counts.crossBranchSkips++;
  else
    for (const own of candidates)
      for (const bg of grounds) {
        /* AN ELEMENT THAT NAMES THE SAME TOKEN AS ITS GROUND IS A
           CONTINUATION, NOT A BOUNDARY. A sticky strip paints `--surface-raised`
           over a `--surface-raised` pane precisely SO THAT it disappears, and
           `record-detail.tsx` says so in as many words. The bug is the other
           shape: two DIFFERENT names that resolve to one colour, which is
           exactly what `--surface-record-footer` on `--card` was. Same name,
           same intention; different name, someone believed there was a step. */
        if (keyOf(own) === keyOf(bg)) { counts.continuations++; continue; }
        /* TWO CHOICES DO NOT MAKE A PAIR. If the fill above and the fill below
           are each one option out of several, nothing in the source says they
           are ever chosen together. */
        if (own.cond && bg.cond && own.origin === bg.origin) { counts.crossBranchSkips++; continue; }
        record("boundary", own, bg, node, chain);
      }

  const here = candidates.length ? candidates : grounds;
  const nextChain = candidates.length
    ? (inject?.grounds?.length ? inject.at : `${path.relative(ROOT, node.file)}:${node.line} <${node.tag}>`)
    : chain;

  /* WHICH GROUND DOES AN INK STAND ON — the question a flat class list gets
     wrong in both directions.

     · An ink written in the SAME group as a ground stands on that ground. A
       branch that brings both brings a finished answer.
     · An ink in a group with no ground of its own stands on whatever survives.
       A group that carries a ground AND an ink overrides this ink whenever it
       applies (last-wins), so such a ground is never this ink's ground — that
       is the selected day in `date-picker`: `text-foreground` in one branch,
       `bg-surface-inverse text-ink-on-inverse` in the other, and pairing
       across them reports charcoal on charcoal for a state that cannot exist.
     · If the element has an UNCONDITIONAL ground it is that. Otherwise the
       ink is measured on the ancestor, and on any conditional ground that
       brings no ink of its own. */
  const ownInks = inject?.inks?.length
    ? []
    : groups.flatMap((g) => g.inks.map((ink) => ({ ink: withExpr(ink), own: g.ground, conditional: g.conditional })));
  const allInks = [...ownInks, ...(inject?.inks ?? []).map((ink) => ({ ink, own: null, conditional: false }))];
  const unconditional = groups.find((g) => g.ground && !g.conditional)?.ground ?? null;
  const groundOnly = groups.filter((g) => g.ground && !g.inks.length).map((g) => g.ground);

  for (const { ink, own, conditional } of allInks) {
    if (own) { record("ink", ink, own, node, nextChain); continue; }
    if (inject?.grounds?.length) { for (const g of inject.grounds) record("ink", ink, g, node, nextChain); continue; }
    if (unconditional) { record("ink", ink, unconditional, node, nextChain); continue; }
    if (crossBranch) { counts.ambiguousInks++; continue; }
    /* TWO CONDITIONAL GROUPS ON ONE ELEMENT ARE NOT NECESSARILY ON TOGETHER.
       `Badge`'s `outline` variant is `bg-transparent text-foreground` and one
       of its constants is a charcoal pill; measuring the first one's ink on
       the second one's ground is a screen the component cannot produce. A
       conditional ink is therefore only ever measured on the ground it
       INHERITS, which is true in every branch. */
    for (const g of groundOnly) if (!(conditional && g.cond && g.origin === node.file)) record("ink", ink, g, node, nextChain);
    for (const bg of grounds) {
      /* A conditional ink on a conditional fill CHOSEN IN THE SAME FILE is one
         state written twice, not two things meeting — `status-stepper`'s
         current step is `bg-primary text-ink-on-accent` and its charcoal never
         touches the dialog behind the stepper. Across files it is a real
         placement and is measured. */
      if (conditional && bg.cond && bg.origin === node.file) { counts.ambiguousInks++; continue; }
      record("ink", ink, bg, node, chain);
    }
  }

  /* A registered component is EXPANDED in place: its own tree is walked here,
     carrying this ground, with this call site's variant and className applied
     to its root and this call site's children handed to its `{children}`. */
  const sub = registry.get(node.tag);
  if (sub) {
    if (stack.includes(node.tag) || stack.length >= 10) { counts.recursionStops++; }
    else {
      counts.expansions++;
      /* CHILDREN FORWARD THROUGH EVERY LAYER, or the chain stops at the
         first component that passes its own `{children}` down. The demo's
         `ViewPreview` hands its children to `CollectionFrame`, which paints
         the soft-paper panel that a `Kanban` column head then stands on —
         three components and two files between the ground and the 7px dot
         whose value was wrong. Losing the forward here loses that pair. */
      const forwarded = node.slotRefs.flatMap((ref) => slots?.[ref] ?? []);
      const nextSlots = { children: [...node.children, ...forwarded] };
      const nextInject = {
        at: `${path.relative(ROOT, node.file)}:${node.line} <${node.tag}>`,
        variant: (node.attrs.get("variant") ?? "").replace(/[{}"'\s]/g, "") || null,
        grounds: candidates,
        /* EVERY ink the call site names, not only the homeless ones. `cn`
           merges the caller's `text-…` over the component's own, so a Card
           told `bg-surface-record-footer text-ink-on-record-footer` does not
           keep `text-card-foreground` from its own cva — and pairing the one
           it does not keep against the ground it does gives 1.000 for a
           screen nobody has ever rendered. */
        inks: allInks.map((x) => x.ink),
      };
      const subConsumed = new Set();
      for (const root of sub.roots) {
        if (root.bound && sub.bindings.get(root.bound) === root) continue;
        walk(root, grounds, sub, nextSlots, nextInject, [...stack, node.tag], subConsumed, chain, localRebinds);
      }
      return;
    }
  }

  /* Slots (a call site's children, rendered where the component puts them)
     and local JSX bindings (`const inner = <Foo/>` used as `{inner}`), both
     walked at THIS ground rather than where they were typed. */
  for (const ref of node.slotRefs) {
    if (slots && slots[ref]) {
      for (const child of slots[ref]) walk(child, here, entry, null, null, stack, consumed, nextChain, localRebinds);
      continue;
    }
    const bound = entry?.bindings?.get(ref);
    if (bound && !consumed.has(bound)) {
      consumed.add(bound);
      walk(bound, here, entry, slots, null, stack, consumed, nextChain, localRebinds);
    }
  }

  /* A PORTAL BREAKS THE GROUND CHAIN, and it has to, or the law reads the
     JSX tree where the browser reads the DOM. `DropdownMenuContent` is
     written inside whatever opened it and RENDERS at the document root, so
     measuring its popover paper against the card the trigger happened to sit
     in invents a pair that exists nowhere. Below a `*Portal` the ground is
     unknown again — which is the truthful answer, since what an overlay lands
     on is a scrim and a scroll position, not a parent. */
  const throughPortal = /Portal$/.test(node.tag) ? [] : here;

  for (const child of node.children) {
    if (child.bound && entry?.bindings?.get(child.bound) === child) continue;   // walked at use
    walk(child, throughPortal, entry, slots, null, stack, consumed, /Portal$/.test(node.tag) ? null : nextChain, localRebinds);
  }
}

for (const entry of registry.values()) {
  const consumed = new Set();
  for (const root of entry.roots) {
    if (root.bound && entry.bindings.get(root.bound) === root) continue;
    walk(root, [], entry, null, null, [entry.name], consumed, null, null);
  }
}


/* ============================================================================
   THE TIERS

   Four of them, because this kit draws four different things with colour and
   they do not have one requirement between them. Every floor below is argued
   from a number this repository has already written down and defended. None
   is copied from WCAG, and where one lands on a WCAG number it is because the
   kit got there first — `--kw-forest` was moved to #20955B for the stated
   reason that 4.44 was "under AA's 4.5 for the 12px badge label", and
   `--kw-poppy-ink` was minted at 4.98/4.52 the same way. 4.5 is a number this
   kit has spent two hexes on. It is not an import.
   ========================================================================= */

const TIERS = {
  /* INK · a word. The floor is the one the kit itself uses to MINT COLOURS. */
  ink: {
    floor: 4.5,
    why: "the number this kit moved two brand hexes to clear (--kw-forest to #20955B at 4.61, --kw-poppy-ink at 4.98/4.52). Its own ink ladder sits far above it: --ink-tertiary, the palest ink it ever writes a word in, measures 6.51 light and 7.93 dark.",
  },
  /* MARK · a 7px dot, a chart series. Small, and never the only signal. */
  mark: {
    floor: 1.5,
    why: "ruling 26 — 'the dot never speaks alone' — so a mark is not text and 4.5 would be a category error. But a mark is TINY, and area is what makes a small step readable, so it needs more than a card's boundary, not less. 1.5 is the smallest same-family separation this kit has ever defended in writing (the record footer's well, 1.499 light / 1.587 dark) applied as a floor to a shape a thousand times smaller. The two dots that sit just above it are named in the report rather than passed in silence.",
  },
  /* BOUNDARY · one surface against the surface behind it. */
  boundary: {
    floor: 1.05,
    quiet: 1.1,
    why: "NOT 3:1. WCAG's non-text threshold would fail almost every surface this kit ships and the client has ruled on these exact numbers repeatedly — 1.103/1.111 is override 77's answer for a selected row, 1.198 is the corrected record footer. It is also not 1.10, and that is the harder call: the kit's own page/panel alternation, which ch26.04 states as law, measures 1.079 in dark. A law whose first act is to fail the foundation of the system it guards is a law that gets switched off. So the GATE is the invisibility line and nothing more — below 1.05 a surface has stopped existing — and 1.10 is kept as the QUIET line, printed with its number on every run so the register grows and the client can rule on the band.",
  },
  /* HAIRLINE · a 1px rule, or a translucent wash used as one. */
  hairline: {
    floor: 1.05,
    why: "chapter 13's subtitle is 'Colour separates, strokes don't', so a hairline that shouted would be the wrong fix. The kit's faintest, --hair-faint, composites to 1.127 on a card; the one hairline BUG this kit has had — --hair unflipped on .bg-surface-inverse — measured exactly 1.000. The floor is therefore the same invisibility line as a boundary's, and the interesting thing about this tier is that it is deliberately not higher.",
  },
};

const MARK_TOKEN = /--(dot|chart)-/;
const HAIR_TOKEN = /--hair|--border$|--input$/;

function tierOf(pair) {
  if (HAIR_TOKEN.test(pair.fg)) return "hairline";
  if (MARK_TOKEN.test(pair.fg)) return "mark";
  return pair.kind === "ink" ? "ink" : "boundary";
}

/* ============================================================================
   EXEMPTIONS — reasoned, and checked BOTH WAYS.

   Each entry names a pair, the ruling that decided it, and the number it is
   expected to measure. An exemption that no longer MATCHES anything fails the
   check, exactly as `demo/check-book.mjs`'s TOOLBAR_EXEMPT does: the list can
   only shrink, and shrinking it takes a person deleting a line and saying why.

   There are two. Neither is a value somebody hoped nobody would look at; both
   are decisions with a date on them.
   ========================================================================= */

const EXEMPT = [
  {
    tier: "ink",
    fg: /disabled/,                  // --ink-disabled, --btn-disabled-label
    bg: null,                        // any ground
    why:
      "tokens.css §3 states it in the declaration itself — 'disabled means " +
      "disabled and nothing else, and disabled is exempt from contrast'. A " +
      "control a person may not operate is not a control whose label they " +
      "need to read; making it legible is how a disabled control stops " +
      "looking disabled.",
  },
  {
    tier: "boundary",
    fg: "--surface-selected",
    bg: ["--card", "--surface-raised", "--background", "--popover"],
    why:
      "RULED D15-B, 2026-08-27, register row 77 — the client took the " +
      "artifact's lift after seeing it drawn AND MEASURED in red on " +
      "verify/decide-3.html §D15. tokens.css §4 records the consequence in " +
      "her own terms: 'a selected thing now measures 1.000 against the " +
      "off-beige body pane in light, 1.000 against an unselected raised card " +
      "in BOTH palettes'. This is the one 1.000 in the system that a person " +
      "chose with the number in front of her. It is exempt because it was " +
      "ruled, not because it is fine.",
  },
];

function exemptionFor(pair, tier) {
  return EXEMPT.find(
    (e) =>
      e.tier === tier &&
      (e.fg instanceof RegExp ? e.fg.test(pair.fg) : e.fg === pair.fg) &&
      (e.bg === null || e.bg.includes(pair.bg)),
  );
}

/* ============================================================================
   MEASURE
   ========================================================================= */

/* A class may name a token (`bg-card` -> `--card`) or write a whole `var()`
   expression (`bg-[var(--dot-building)]`, fallbacks and all). Both go through
   the token model's own resolver, which is the same one `build-tokens.mjs`
   uses — there is exactly one opinion in this repository about what a token
   resolves to. */
function resolve(tokenOrLiteral, theme, palette = PALETTE) {
  const p = palette[theme];
  if (p.has(tokenOrLiteral)) return parseColor(p.get(tokenOrLiteral));
  if (tokenOrLiteral.includes("var(")) {
    const r = theme === "dark" ? model.resolveDark : model.resolveLight;
    return parseColor(r(tokenOrLiteral));
  }
  return parseColor(tokenOrLiteral);
}

/**
 * Measure one derived pair in one palette.
 *
 * A TRANSLUCENT FOREGROUND IS FLATTENED OVER ITS GROUND, which is what the
 * browser does and what makes `--accent`'s 5% wash measure 1.105 rather than
 * the nonsense an un-composited rgba would give. A translucent GROUND is a
 * different matter and is refused: what is behind it is a fact about the DOM
 * this walker does not have, and guessing would put a made-up number beside a
 * real one.
 */
function measure(pair, theme, palette = PALETTE) {
  const bg = resolve(pair.bgExpr ?? pair.bg, theme, palette);
  const fg = resolve(pair.fgExpr ?? pair.fg, theme, palette);
  if (!bg || !fg) return { skip: bg ? "fg" : "bg" };
  if (bg.a < 1) return { skip: "translucent-ground" };
  const flat = composite(fg, bg);
  return { ratio: contrast(flat, bg), fgHex: hex(flat), bgHex: hex(bg) };
}

/**
 * DISCHARGE — is this boundary carried by a stroke instead of by a step?
 *
 * Returns the measured figures when it is, and null when it is not. Null is
 * the answer for a pair with no stroke, for a stroke that is not a closed
 * ring, for a stroke whose colour cannot be resolved, for a translucent fill
 * or ground (the same refusal `measure` makes, for the same reason), and —
 * the case that matters — for a ring that is itself under the hairline floor.
 *
 * A HAIRLINE THAT IS INVISIBLE DISCHARGES NOTHING. That is the whole of the
 * honesty here: the stroke is held to `TIERS.hairline`, the tier this kit
 * already keeps for a 1px rule, and it is held to it against THE SAME GROUND
 * the fill just failed against. Nothing is taken on the presence of a class.
 */
function discharge(pair, tier, theme, palette = PALETTE) {
  if (tier !== "boundary" || !pair.strokeExpr) return null;
  const ring = ringOf(pair.strokeExpr, theme);
  if (!ring) return null;

  const bg = resolve(pair.bgExpr ?? pair.bg, theme, palette);
  const fill = resolve(pair.fgExpr ?? pair.fg, theme, palette);
  if (!bg || !fill || bg.a < 1 || fill.a < 1) return null;

  /* THE WORSE OF THE TWO HONEST READINGS. An inset shadow is painted ON the
     element's own fill, so `overFill` is what the pixel actually is; a reader
     asking "how visible is that rule on that paper" is asking `overGround`.
     Below the boundary floor the two grounds are within 5% of each other by
     construction, so these numbers are always close — and the lower one is
     the one that has to clear, because a law that picks the kinder of two
     defensible numbers has started arguing its own case. */
  const overFill = contrast(composite(ring.colour, fill), bg);
  const overGround = contrast(composite(ring.colour, bg), bg);
  const ratio = Math.min(overFill, overGround);
  if (ratio < TIERS.hairline.floor) return null;
  return { ratio, overFill, overGround, ringHex: hex(composite(ring.colour, fill)), resolved: ring.resolved };
}

const findings = [];
const quiet = [];
const discharged = [];
const unmeasured = { fg: 0, bg: 0, "translucent-ground": 0 };

for (const pair of pairs.values()) {
  const tier = tierOf(pair);
  for (const theme of THEMES) {
    const m = measure(pair, theme);
    if (m.skip) { unmeasured[m.skip]++; continue; }
    const spec = TIERS[tier];
    const row = { ...pair, tier, theme, ...m };
    if (m.ratio < spec.floor) {
      const ex = exemptionFor(pair, tier);
      if (ex) { ex.fired = (ex.fired ?? 0) + 1; continue; }
      const d = discharge(pair, tier, theme);
      if (d) {
        /* BOTH PALETTES ON THE ROW, always. A stroke that carries a boundary
           in light and vanishes in dark is the shape of every bug this file
           exists for, and a reader should not have to run the other palette
           to see it. */
        const other = theme === "light" ? "dark" : "light";
        const o = discharge(pair, tier, other);
        discharged.push({ ...row, ring: d, otherTheme: other, otherRing: o });
        continue;
      }
      findings.push(row);
    } else if (spec.quiet && m.ratio < spec.quiet) {
      quiet.push(row);
    }
  }
}

/* ============================================================================
   THE REGRESSION SET — the three bugs of 7 September 2026, as fixtures.

   THIS IS THE ONLY PART OF THE CHECK THAT PROVES THE REST OF IT WORKS. A law
   that passes on a fixed tree tells you nothing: green is what a law that has
   stopped looking also prints. So the three values that were live last night
   are kept here with their pre-fix colours, and the check asserts that its
   own verdict function calls each of them a failure. If a threshold is
   softened, a tier is renamed, an exemption is widened or the colour maths
   drifts, this goes red before anything else does.

   The fixtures are PAIRS AND VALUES, not screenshots: each says which two
   tokens met, on which palette, with the value tokens.css carried before the
   fix. The grounds are the ones the consuming app actually put them on.
   ========================================================================= */

const REGRESSIONS = [
  {
    name: "the record footer painted itself its own parent's colour",
    theme: "dark",
    tier: "boundary",
    fg: "--surface-record-footer",
    bg: "--card",
    before: { "--surface-record-footer": "#26241F" },   // was var(--surface-raised)
    expect: 1.0,
    after: 1.198,      // the corrected value, asserted GREEN on the same run
    source: "CHANGELOG, Unreleased; git show v1.2.67 -- foundations/tokens/tokens.css",
  },
  {
    name: "the toolbar well on the shell's content card, in both palettes",
    theme: "light",
    tier: "boundary",
    fg: "--surface-raised",
    bg: "--card",
    before: {},                                        // NOTHING TO RESTORE: the pair is 1.000 today, and always will be
    expect: 1.0,
    answeredBy: "--surface-lift",
    source:
      "the shell paints its content region --surface-raised, and --surface-raised IS " +
      "--card by tokens.css §4's own declaration. THIS FIXTURE CAN NEVER GO GREEN AND " +
      "MUST NOT: the two names are one colour on purpose, so the pair is a permanent " +
      "1.000 and a permanent proof that the law still catches one. What changed on " +
      "2026-09-08 is that nothing in the kit DRAWS it any more — the parts that used " +
      "to paint `bg-card` onto this ground (Alert, StatusStepper's pill and mark, the " +
      "book's shadow swatch) take §4's relational `--surface-lift` instead, and measure " +
      "1.103 light / 1.111 dark. If a component starts painting `bg-card` on the shell " +
      "body again it is the FINDINGS list that will say so, not this fixture.",
  },
  {
    name: "the toolbar well on the shell's content card, dark",
    theme: "dark",
    tier: "boundary",
    fg: "--surface-raised",
    bg: "--card",
    before: {},
    expect: 1.0,
    answeredBy: "--surface-lift",
    source: "the same pair, the other palette — the half a dark-only law would have missed",
  },
  {
    name: "--dot-building bare on the column header's panel",
    theme: "dark",
    tier: "mark",
    fg: "--dot-building",
    bg: "--surface-panel",
    before: { "--dot-building": "#1A1918" },            // was var(--kw-charcoal)
    expect: 1.02,
    after: 17.056,     // the corrected value, asserted GREEN on the same run
    source: "CHANGELOG, Unreleased; GAPS-TRACK1.md STA-2",
  },
];

const regressionFailures = [];
for (const r of REGRESSIONS) {
  const palette = {
    light: new Map(PALETTE.light),
    dark: new Map(PALETTE.dark),
  };
  for (const [k, v] of Object.entries(r.before)) palette[r.theme].set(k, v);
  const m = measure({ fg: r.fg, bg: r.bg }, r.theme, palette);
  const spec = TIERS[r.tier];
  r.measured = m.ratio;
  if (m.skip) regressionFailures.push(`${r.name}: could not be measured at all (${m.skip})`);
  else if (!(m.ratio < spec.floor))
    regressionFailures.push(
      `${r.name}: measured ${m.ratio.toFixed(3)} against the ${r.tier} floor ${spec.floor} — ` +
        `THE LAW NO LONGER CATCHES IT`,
    );
  else if (Math.abs(m.ratio - r.expect) > 0.02)
    regressionFailures.push(
      `${r.name}: measured ${m.ratio.toFixed(3)}, the record says ${r.expect} — ` +
        `the arithmetic has drifted from the numbers in CHANGELOG.md`,
    );

  /* AND GREEN AFTER, on the tree as it stands. Red-before on its own proves
     the law can fail; it does not prove the fix worked. Two of these three
     have one, and the number the CHANGELOG published for each is asserted
     here so the entry and the code cannot drift apart. */
  if (r.after !== undefined) {
    const now = measure({ fg: r.fg, bg: r.bg }, r.theme);
    r.now = now.ratio;
    if (now.skip) regressionFailures.push(`${r.name}: the FIXED pair cannot be measured (${now.skip})`);
    else if (now.ratio < TIERS[r.tier].floor)
      regressionFailures.push(`${r.name}: the fix does not clear the ${r.tier} floor — ${now.ratio.toFixed(3)}`);
    else if (Math.abs(now.ratio - r.after) > 0.02)
      regressionFailures.push(
        `${r.name}: the fixed pair measures ${now.ratio.toFixed(3)}, the CHANGELOG says ${r.after}`,
      );
  }
}

/* ============================================================================
   THE DISCHARGE FIXTURES — the acceptance test for "a step OR a stroke".

   THE REGRESSION SET ABOVE PROVES THE LAW STILL CATCHES A BAD FILL. It cannot
   prove anything about the refinement added on 2026-09-08, because a rule that
   said "any element with a shadow class passes" would leave all four of those
   fixtures red and still be a blanket pass wearing a measurement's clothes.

   So the discharge is given its own fixtures, and — this is the part that
   matters — MOST OF THEM ASSERT A REFUSAL. Five cases, each a fill under the
   boundary floor, differing only in the stroke drawn around it:

     · the ring the kit actually draws            DISCHARGED
     · the same ring in a fainter ink             REFUSED — the rule is invisible
     · a one-sided rule                           REFUSED — not a shape, an edge
     · an outer shadow                            REFUSED — outside the element
     · no stroke at all                           REFUSED — the original finding

   Each states the number it expects, so the arithmetic cannot drift silently,
   and each is checked BOTH WAYS the way EXEMPT is: a fixture that stops
   producing its stated verdict fails the check whichever direction it moves.
   If somebody later widens the ring test, drops the compositing, or takes the
   kinder of the two readings, rows two and three go green and this goes red.
   ========================================================================= */

const DISCHARGES = [
  {
    name: "the kit's own ring — --hairline on --surface-idle, off-beige paper",
    fg: "--surface-idle", bg: "--popover", stroke: "var(--hairline)",
    expect: "discharged",
    ring: { light: 1.175, dark: 1.161 },
    why: "status-stepper's later pill and overflow tail, 2026-09-08. The fill is 1.042 in light — under the boundary floor — and the ring measures above the hairline floor in BOTH palettes, so the boundary is carried by the stroke.",
  },
  {
    name: "the same ring drawn in --hair-faint, dark",
    fg: "--surface-idle", bg: "--popover", stroke: "inset 0 0 0 1px var(--hair-faint)",
    expect: "refused", theme: "dark",
    ring: { dark: 1.022 },
    why: "6% of off-beige on the unlit page composites to 1.022 against the raised paper it has to separate from. A rule nobody can see around a fill nobody can see is two invisible things, not a boundary. THIS IS THE ROW THAT PROVES THE DISCHARGE IS A MEASUREMENT.",
  },
  {
    name: "a one-sided rule — --hairline-under",
    fg: "--surface-idle", bg: "--popover", stroke: "var(--hairline-under)",
    expect: "refused",
    why: "`inset 0 -1px 0 var(--hair)` is a rule between two things, not a shape around one. Its ink is the identical charcoal that DOES discharge the closed ring above, so this row can only stay red while the shape test is real.",
  },
  {
    name: "an outer ring — the same shape without `inset`",
    fg: "--surface-idle", bg: "--popover", stroke: "0 0 0 1px var(--hair-strong)",
    expect: "refused",
    why: "IDENTICAL to the discharging ring in every respect but the word `inset`, and drawn in a DARKER ink — --hair-strong is charcoal at 20%, which would clear the hairline floor with room to spare if the shape test let it through. An outer shadow paints on the ground beside the element, not on the element's fill, so it is the ground's pixel and not the element's edge; it is also the one an ancestor's `overflow-hidden` clips away. This row is red only while `inset` is actually required.",
  },
  {
    name: "no stroke at all — the finding as it stood before the refinement",
    fg: "--surface-idle", bg: "--popover", stroke: null,
    expect: "refused",
    why: "the same fill on the same ground with nothing drawn around it. If this ever discharges, the refinement has become an exemption.",
  },
];

const dischargeFailures = [];
for (const d of DISCHARGES) {
  const themes = d.theme ? [d.theme] : THEMES;
  for (const theme of themes) {
    const got = discharge({ fg: d.fg, bg: d.bg, strokeExpr: d.stroke }, "boundary", theme);
    const label = `${d.name} (${theme})`;
    if (d.expect === "discharged") {
      if (!got) {
        dischargeFailures.push(`${label}: expected to be DISCHARGED by its stroke and was not — the law can no longer see the kit's own hairline`);
        continue;
      }
      d.measured ??= {};
      d.measured[theme] = got.ratio;
      const want = d.ring?.[theme];
      if (want !== undefined && Math.abs(got.ratio - want) > 0.02)
        dischargeFailures.push(`${label}: the ring measures ${got.ratio.toFixed(3)}, the record says ${want} — the stroke arithmetic has drifted`);
    } else {
      if (got)
        dischargeFailures.push(
          `${label}: expected the stroke to discharge NOTHING and it discharged at ${got.ratio.toFixed(3)} — ` +
            `THE REFINEMENT HAS BECOME A BLANKET PASS\n      ${d.why}`,
        );
      /* And the refused ring's own number is recorded where there is one, so
         a reader can see it is refused on its merits rather than by a name. */
      if (!got && d.ring?.[theme] !== undefined) {
        const ring = ringOf(d.stroke, theme);
        const bg = resolve(d.bg, theme);
        const fill = resolve(d.fg, theme);
        if (ring && bg && fill) {
          const got2 = Math.min(
            contrast(composite(ring.colour, fill), bg),
            contrast(composite(ring.colour, bg), bg),
          );
          d.measured ??= {};
          d.measured[theme] = got2;
          if (Math.abs(got2 - d.ring[theme]) > 0.02)
            dischargeFailures.push(`${label}: the refused ring measures ${got2.toFixed(3)}, the record says ${d.ring[theme]}`);
        }
      }
    }
  }
}

/* AND THE DISCHARGE MUST STILL BE DOING SOMETHING. An exemption that matches
   nothing fails this check; so does a derivation that matches nothing. If the
   kit stops drawing a discharged boundary, this line is the one that makes
   somebody delete the machinery rather than leave it standing unused. */
if (!discharged.length)
  dischargeFailures.push(
    "IDLE DISCHARGE — no pair in the kit is carried by a stroke any more.\n" +
      "      Either the fills were fixed, in which case delete the discharge and its fixtures,\n" +
      "      or the walker stopped seeing `shadow-[…]` on the element that paints the fill.",
  );

/* ============================================================================
   THE BLINDNESS TRIPWIRE

   A resolver that has stopped matching reports "all clear" in exactly the
   words a passing check uses. That failure mode has already cost this project
   two evenings — `GAPS-TRACK1.md` STA-2's assumption expired in silence, and
   `verify/out.css` went on resolving a dot to a colour the source had
   changed. So the derivation has to prove it is still looking.

   THREE PROOFS, and they are anchors rather than a bare count, because a
   count can be met by any old rubbish while an anchor names a specific chain
   through specific files. If the walker stops crossing a component boundary,
   or stops reading a cva, or stops reading a class table, one of these dies.
   ========================================================================= */

const seen = new Set([...pairs.values()].map((p) => `${p.kind}|${p.fg}|${p.bg}`));
const ANCHORS = [
  {
    key: "boundary|--card|--surface-panel",
    proves: "component expansion + cva variants: a `Card variant=\"raised\"` inside a soft-paper panel, which is the kit's own alternation and is written in no single file.",
  },
  {
    key: "boundary|--dot-building|--card",
    proves: "class TABLES: `Kanban`'s dot takes its fill from `COLUMN_DOT[dot]`, a module-level object. Reading only the literals inside `className` makes this dot colourless — which is how bug three stayed invisible.",
  },
  {
    key: "ink|--ink-on-record-footer|--surface-record-footer",
    proves: "call-site className override: `<Card variant=\"inverse\" className=\"bg-surface-record-footer text-ink-on-record-footer\">`, where the caller's classes must win over the component's cva the way tailwind-merge makes them.",
  },
];
const blind = ANCHORS.filter((a) => !seen.has(a.key));

/* A COLLAPSE DETECTOR, NOT A COVERAGE TARGET. These are set well under
   today's numbers on purpose: their job is to notice that the walk has
   stopped working, not to freeze a census that legitimately moves whenever a
   component is added or a file is split. */
const FLOORS = { files: 150, components: 300, pairs: 80, expansions: 3000 };
const thin = Object.entries(FLOORS)
  .filter(([k, v]) => (k === "pairs" ? pairs.size : counts[k]) < v)
  .map(([k, v]) => `${k}: ${k === "pairs" ? pairs.size : counts[k]}, floor ${v}`);

/* ============================================================================
   REPORT
   ========================================================================= */

const banner = (s) => `\n${s}\n${"-".repeat(s.length)}`;
const num = (n) => n.toFixed(3);

const line = (r) =>
  `  ${num(r.ratio).padStart(7)}  ${r.tier.padEnd(8)} ${r.theme.padEnd(5)} ` +
  `${r.fg.padEnd(30)} ${r.fgHex}  on  ${r.bg.padEnd(24)} ${r.bgHex}\n` +
  `            ${r.where.join("  ")}${r.chain && r.chain !== "—" ? `   under  ${r.chain}` : ""}` +
  /* A rebound token is printed with the value it takes ON THIS GROUND, or the
     reader goes to tokens.css, finds the `:root` half, and concludes the
     check cannot do arithmetic. */
  (r.rebound
    ? `\n            on this ground  ${r.fgExpr !== r.fg ? `${r.fg} = ${r.fgExpr}` : ""}` +
      `${r.bgExpr !== r.bg ? `${r.fgExpr !== r.fg ? " · " : ""}${r.bg} = ${r.bgExpr}` : ""}   (tokens.css §8)`
    : "");

if (VERBOSE || ARGV.includes("--dump")) {
  const all = [];
  for (const pair of pairs.values())
    for (const theme of THEMES) {
      const m = measure(pair, theme);
      if (!m.skip) all.push({ ...pair, tier: tierOf(pair), theme, ...m });
    }
  all.sort((a, b) => a.ratio - b.ratio);
  console.log(banner(`every derived pair, both palettes (${all.length})`));
  for (const r of all) console.log(line(r));
}

const hard = [...regressionFailures, ...dischargeFailures, ...blind.map((a) => `BLIND — the derivation no longer produces ${a.key}\n      it proved: ${a.proves}`), ...thin.map((t) => `THIN — the derivation found far less than it should (${t})`)];
if (collisions.length > 12) hard.push(`AMBIGUOUS — ${collisions.length} component names are defined in more than one file; the registry can only hold one of each`);
if (exhausted) hard.push("EXHAUSTED — the walk hit its node budget and stopped early, so this run saw only part of the kit");
for (const e of EXEMPT) if (!e.fired) hard.push(`ROTTEN EXEMPTION — ${e.tier} ${e.fg} on ${e.bg ? e.bg.join("/") : "any ground"} matched nothing.\n      Either the pair is gone, in which case delete the entry, or the derivation stopped finding it.`);

console.log(banner("contrast law"));
console.log(`  files walked             ${counts.files}`);
console.log(`  components expanded      ${counts.components} definitions, ${counts.expansions} expansions, ${counts.nodes} nodes`);
console.log(`  pairs derived            ${pairs.size}  (${pairs.size * 2} measurements, both palettes)`);
console.log(`  tiers                    ink ${TIERS.ink.floor} · mark ${TIERS.mark.floor} · boundary ${TIERS.boundary.floor} · hairline ${TIERS.hairline.floor}`);
console.log(`  regression set           ${REGRESSIONS.length} fixtures — pre-fix value, then the tree as it stands`);
for (const r of REGRESSIONS)
  console.log(
    `      ${num(r.measured ?? NaN).padStart(7)}  ->  ` +
      `${r.now !== undefined ? num(r.now).padStart(7) : r.answeredBy ? `1.000 by design` : "        —"}   ${r.name}` +
      (r.answeredBy ? `\n                 the two names are one colour on purpose; the kit draws ${r.answeredBy} there now` : ""),
  );

console.log(
  `  discharge fixtures       ${DISCHARGES.length} — one stroke that carries a boundary, ${DISCHARGES.length - 1} that must not`,
);
for (const d of DISCHARGES)
  console.log(
    `      ${(d.expect === "discharged" ? "DISCHARGED" : "refused").padStart(10)}  ` +
      `${Object.entries(d.measured ?? {}).map(([t, v]) => `${t} ${num(v)}`).join(" · ").padEnd(28)} ${d.name}`,
  );
console.log(`  strokes read             ${counts.strokes}   (shadow-[…] classes resolved to a box-shadow)`);

console.log(banner("what this run could not see"));
console.log(`  state / breakpoint grounds   ${counts.conditionalGrounds}   (hover:, max-[45rem]:, data-[state=…]:)`);
console.log(`  inline style / var rebinds   ${counts.styleRebinds}   (a ground changed by a custom property, not a class)`);
console.log(`  cross-branch pairs declined  ${counts.crossBranchSkips + counts.ambiguousInks}   (both sides conditional; co-occurrence unproven)`);
console.log(`  continuations (same token)   ${counts.continuations}   (a ground repeating its own ground: a mask, not a step)`);
console.log(`  classes it could not read    ${counts.unreadableClasses.size}`);
for (const [cls, n] of [...counts.unreadableClasses].sort((a, b) => b[1] - a[1]).slice(0, 8))
  console.log(`      ${String(n).padStart(4)} x ${cls}`);
console.log(`  pairs with a translucent ground   ${unmeasured["translucent-ground"]}   (what is behind it is not in the source)`);
if (collisions.length) console.log(`  duplicate component names        ${collisions.length}`);

if (discharged.length) {
  console.log(banner(`DISCHARGED — a boundary carried by a stroke, not by a step (${discharged.length})`));
  console.log(`  Not a failure, and not an exemption either. The fill is under the boundary floor`);
  console.log(`  ${TIERS.boundary.floor} and the element draws a closed inset ring whose own colour clears the`);
  console.log(`  hairline floor ${TIERS.hairline.floor} against this same ground, in the palette named and in the other.`);
  for (const r of discharged.sort((a, b) => a.ratio - b.ratio)) {
    console.log(line(r));
    console.log(
      `            fill ${num(r.ratio)} — under the boundary floor ${TIERS.boundary.floor}` +
        `   ·   carried by  ${r.strokeExpr}`,
    );
    console.log(
      `            ring ${r.theme} ${num(r.ring.ratio)} ${r.ring.ringHex}` +
        `  (on the fill ${num(r.ring.overFill)}, on the ground ${num(r.ring.overGround)}; the lower stands)` +
        `   ·   ring ${r.otherTheme} ${r.otherRing ? num(r.otherRing.ratio) : "—"}`,
    );
  }
}

if (quiet.length) {
  console.log(banner(`QUIET — under ${TIERS.boundary.quiet}, above the invisibility floor (${quiet.length})`));
  console.log("  Not a failure. These are the surface steps the client should see a number for.");
  for (const r of quiet.sort((a, b) => a.ratio - b.ratio)) console.log(line(r));
}

if (findings.length || hard.length) {
  if (findings.length) {
    console.error(banner(`FAILED — ${findings.length} pair(s) below their tier's floor`));
    for (const r of findings.sort((a, b) => a.ratio - b.ratio)) {
      console.error(line(r));
      console.error(
        `            ${r.tier} floor ${TIERS[r.tier].floor}` +
          (r.ratio < 1.05 ? "   ·   INVISIBLE, and that is the one line nothing may cross" : "") +
          (r.conditional ? "   ·   conditional — one state of the component, so check that this state happens" : ""),
      );
    }
  }
  if (hard.length) {
    console.error(banner("FAILED — the law cannot vouch for itself"));
    for (const h of hard) console.error("  " + h);
  }
  console.error("");
  process.exit(1);
}

console.log(banner("contrast law: OK"));
console.log(`  ${pairs.size} pairs, both palettes, nothing below its tier\n`);
