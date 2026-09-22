#!/usr/bin/env node
/* ============================================================================
   THE CARD-CONTENT INSET CHECK — pins `CardContent`'s `inset` prop against
   every way it could drift back out, run by `npm run check` beside the
   token/icon/book/seam checks.

   THE PROBLEM THIS PROP CLOSES. `CardContent` carried one fixed vertical
   rhythm, `py-6 lg:py-[var(--space-7)]` (24 to `lg:`, 32 above), with no
   escape hatch. A caller that wanted a compact card body had exactly one
   move: a `className` override fighting that default on specificity, a
   shape nowhere declared and nowhere checkable. `inset="compact"` makes the
   dense body a first-class, named shape instead — flat at `--space-3` on
   every breakpoint, the same step `CARD_CONTENT_INSET_X` already spends on
   the horizontal axis (17 Sep 2026 evening ruling), so a compact card's
   body is that one step on every side, not a horizontal exception paired
   with a vertical override.

   WHY A SOURCE CHECK, MATCHING THIS KIT'S OTHER `check-*.mjs` FILES — there
   is no jsdom/testing-library in this repository (`npm run check` is `tsc
   --noEmit` plus a run of source-reading scripts like this one), so the
   shape below is verified by reading `card.tsx`'s own source rather than by
   mounting the component.

   FOUR THINGS PINNED, so none of them can drift back silently:
     1 · `CardContentProps` declares `inset?: "default" | "compact"`.
     2 · `CardContent` destructures `inset = "default"` — the untouched
         two-step ladder stays the default, so every existing call site
         renders exactly as it did before this prop existed.
     3 · A `CARD_CONTENT_INSET_Y` lookup (or equivalent per-value mapping)
         resolves `"compact"` to `--space-3`, flat, with no `lg:` step —
         the same token the horizontal inset already reads, not a new
         figure invented for this prop alone.
     4 · The horizontal inset (`CARD_CONTENT_INSET_X`, `--space-3`) is still
         applied regardless of `inset` — this prop is a vertical-only
         escape hatch, not a second horizontal system living beside the
         first.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "card.tsx");

const src = fs.readFileSync(FILE, "utf8");

const findings = [];

/* ── 1 · `CardContentProps` DECLARES THE PROP ────────────────────────── */
const propsStart = src.indexOf("export interface CardContentProps");
const contentStart = src.indexOf("const CardContent = React.forwardRef");
const contentEnd = src.indexOf("CardContent.displayName");

if (propsStart === -1 || contentStart === -1 || contentEnd === -1) {
  console.error(`FAIL card check: could not find \`CardContentProps\`/\`CardContent\` in ${FILE}.`);
  process.exit(1);
}

const propsBody = src.slice(propsStart, contentStart);
const contentBody = src.slice(contentStart, contentEnd);

if (!/inset\?:\s*"default"\s*\|\s*"compact"/.test(propsBody)) {
  findings.push(
    '`CardContentProps` no longer declares `inset?: "default" | "compact"` — a compact card body ' +
      "has no declared shape to ask for again.",
  );
}

/* ── 2 · THE DEFAULT STAYS "default" ─────────────────────────────────── */
if (!/inset\s*=\s*"default"/.test(contentBody)) {
  findings.push(
    '`CardContent` no longer defaults `inset` to `"default"` — every existing call site that never ' +
      "passed `inset` would silently render a different vertical rhythm than before this prop existed.",
  );
}

/* ── 3 · "compact" RESOLVES TO `--space-3`, FLAT, AND "default" STAYS THE
   OLD LADDER ─────────────────────────────────────────────────────────── */
if (!/CARD_CONTENT_INSET_Y_DEFAULT\s*=\s*"py-6 lg:py-\[var\(--space-7\)\]"/.test(src)) {
  findings.push(
    '`inset="default"` no longer resolves to `py-6 lg:py-[var(--space-7)]` — this is the same figure ' +
      "`check-screen-shell.mjs`'s own Ruling 2 check pins on the `screen-shell.tsx` side, and the two " +
      "must stay equal.",
  );
}

if (!/CARD_CONTENT_INSET_Y_COMPACT\s*=\s*"py-\[var\(--space-3\)\]"/.test(src)) {
  findings.push(
    '`inset="compact"` no longer resolves to a flat `py-[var(--space-3)]` — either the figure ' +
      "changed or a breakpoint prefix crept back in, and a compact card body is no longer the " +
      "single step it was declared to be.",
  );
}

if (!/CARD_CONTENT_INSET_Y\s*:\s*Record<"default"\s*\|\s*"compact",\s*string>/.test(src)) {
  findings.push(
    "`CardContent` no longer resolves `inset` through a `Record<\"default\" | \"compact\", string>` " +
      "lookup keyed on the prop's own two values — re-derived per call site, this can silently " +
      "drift out of sync with `CardContentProps`'s own union.",
  );
}

if (!/CARD_CONTENT_INSET_Y\[inset\]/.test(contentBody)) {
  findings.push(
    "`CardContent`'s className no longer reads `CARD_CONTENT_INSET_Y[inset]` — the `inset` prop is " +
      "declared but nothing in the render actually switches on it.",
  );
}

/* ── 4 · THE HORIZONTAL INSET IS UNCONDITIONAL ───────────────────────── */
if (!/CARD_CONTENT_INSET_X/.test(contentBody)) {
  findings.push(
    "`CardContent` no longer applies `CARD_CONTENT_INSET_X` unconditionally — `inset` must stay a " +
      "vertical-only switch, not grow a second horizontal system beside the 17 Sep 2026 evening " +
      "ruling's own flat `--space-3`.",
  );
}

/* ── 5 · THE `plain` VARIANT, ADDED v1.2.145 ─────────────────────────────
   Client ruling, 21 Sep 2026: a record page's grouping sections lose their
   box and sit directly on the page's own white main content; everything
   else keeps its paper. Four things pinned:
     a · `cardVariants`'s `variant` object declares a `plain` key, and its
         class string carries no `bg-*` fill and no `shadow-*`: the shell
         paints nothing.
     b · The shell still carries a `group/card` marker class. It is no
         longer how `CardHeader`/`CardContent`/`CardFooter` find their OWN
         shell's variant (see section 8, below, for why that changed) -
         `kanban.tsx`'s `BoardCard` reads this exact marker to detect a
         `plain` `Card` ANCESTOR several levels up, deliberately relying on
         a CSS descendant match's "any ancestor" breadth, and removing the
         class would break that unrelated, still-correct use.
     c · `CardHeader`, `CardContent` and `CardFooter` each carry an
         `isPlain && "px-0 ..."` override (section 8's `CardVariantContext`
         read), the zeroed horizontal inset, so a part cannot silently keep
         its box inset while its OWN shell goes bare.
     d · A `default` shell's own class string is untouched: `plain` is an
         addition, not a rewrite of the five existing variants. ──────── */
const variantsBlock = src.slice(src.indexOf("variants: {"), src.indexOf("defaultVariants:"));

if (!/plain:\s*"([^"]*)"/.test(variantsBlock)) {
  findings.push(
    "`cardVariants`'s `variant` object no longer declares a `plain` key: the sixth variant, the " +
      "client's 21 Sep 2026 ruling, has no shape to render.",
  );
} else {
  const plainClass = variantsBlock.match(/plain:\s*"([^"]*)"/)[1];
  if (/\bbg-(?!transparent\b)[a-z-]/.test(plainClass)) {
    findings.push(
      `\`plain\`'s class string ("${plainClass}") carries a painted \`bg-*\` fill: a plain shell must ` +
        "stay transparent so the page's own paper shows through.",
    );
  }
  if (/\bshadow-/.test(plainClass)) {
    findings.push(
      `\`plain\`'s class string ("${plainClass}") carries a shadow utility, and a plain shell has no ` +
        "shadow, same as it has no fill and no stroke.",
    );
  }
}

if (!/"group\/card"/.test(src.slice(src.indexOf("const cardVariants = cva("), src.indexOf("defaultVariants:")))) {
  findings.push(
    "`cardVariants`'s base class list no longer carries `\"group/card\"`: `kanban.tsx`'s `BoardCard` " +
      "still reads this exact marker to detect a `plain` `Card` ancestor several levels up, and removing " +
      "it would break that unrelated, still-correct use.",
  );
}

const headerBody = src.slice(src.indexOf("const CardHeader"), src.indexOf("CardHeader.displayName"));
const contentBody2 = src.slice(src.indexOf("const CardContent"), src.indexOf("CardContent.displayName"));
const footerBody = src.slice(src.indexOf("const CardFooter"), src.indexOf("CardFooter.displayName"));

for (const [name, body] of [
  ["CardHeader", headerBody],
  ["CardContent", contentBody2],
  ["CardFooter", footerBody],
]) {
  if (!/isPlain && "px-0/.test(body)) {
    findings.push(
      `\`${name}\` no longer carries an \`isPlain && "px-0 ...\`\` override: a plain shell's parts must ` +
        "drop their horizontal inset to 0 so the text lines up with the page column.",
    );
  }
}

if (!/isPlain && "\[&:not\(:last-child\)\]:shadow-none"/.test(headerBody)) {
  findings.push(
    "`CardHeader` no longer cancels its own hairline on a `plain` shell: a plain section has no box " +
      "to separate from, so it must draw no hairline under its title either.",
  );
}

if (!/isPlain && "shadow-none"/.test(footerBody)) {
  findings.push(
    "`CardFooter` no longer cancels its own hairline on a `plain` shell, the same reasoning as the " +
      "header's own hairline cancellation, above.",
  );
}

/* ── A `default` shell is byte-identical to before this variant existed ── */
if (!/default:\s*"bg-surface-panel \[--badge-quiet-fill:var\(--surface-raised\)\]"/.test(src)) {
  findings.push(
    "`cardVariants`'s `default` variant class string changed: adding `plain` must not touch the " +
      "five existing variants.",
  );
}

/* ── 6 · THE PLAIN SHELL'S CHIP FILL, v1.2.149 ───────────────────────────
   THE DEFECT THIS PINS, MEASURED LIVE ON THE TICKETS LIST BEFORE THE FIX:
   inside a `plain` Card, `--badge-quiet-fill` resolved #FFFEF9 against a
   pane of rgb(255, 254, 249). Ratio 1.000. Every stage chip, type chip and
   count pill on the module was invisible; the only chips left were the
   black id chips, which paint `--surface-inverse` and are the one variant
   that never reads this property.

   WHY IT IS A SEPARATE ASSERTION FROM "no painted bg" ABOVE. A plain shell
   paints no PAPER of its own and must still ANSWER the paper question for
   the chips inside it, because a chip takes the other tone from its ground
   and a plain card's ground is the page. Those two sentences pull in
   opposite directions, which is exactly how the original line ended up
   reusing `default`'s answer (`--surface-raised`, the page's own colour)
   and calling it correct. The value is pinned by name, not merely its
   presence: `--surface-panel` is soft paper, the other tone from the page,
   and `--surface-raised` here is the bug verbatim. */
const plainMatch = variantsBlock.match(/plain:\s*"([^"]*)"/);
if (plainMatch !== null) {
  const plainClass = plainMatch[1];
  if (!/\[--badge-quiet-fill:var\(--surface-panel\)\]/.test(plainClass)) {
    findings.push(
      `\`plain\`'s class string ("${plainClass}") does not rebind --badge-quiet-fill to --surface-panel: ` +
        "a plain shell's ground is the PAGE, whose other paper tone is soft paper. Leaving it at " +
        "`default`'s own --surface-raised paints every quiet chip the exact colour it stands on (measured " +
        "1.000 on the live tickets list, 21 Sep 2026).",
    );
  }
}

/* ── 7 · THE BOXED BODY INSET DID NOT FOLLOW THE PANE, v1.2.149 ──────────
   On 21 Sep 2026 the pane's own gutter moved to `--space-6` and split away
   from this export (`SHELL_CONTENT_INSET_X`, `compositions/templates/
   screen-shell.tsx`). THIS constant did not move, and that is the half of
   the split worth pinning from this side: a later edit that "restored the
   equality" by widening a boxed card's body to 24 would put 48px of side
   air inside every boxed card on a 24px pane, and would make `CardHeader`
   (still `px-6 lg:px-[var(--space-7)]`) wider than the body it heads.
   `check-screen-shell.mjs` pins the other half and the reason. */
if (!/const CARD_CONTENT_INSET_X = "px-\[var\(--space-3\)\]";/.test(src)) {
  findings.push(
    "`CARD_CONTENT_INSET_X` is no longer `px-[var(--space-3)]` - the boxed card's own body inset did " +
      "not move with the pane's gutter on 21 Sep 2026, and widening it to match would double the side " +
      "air inside every boxed card and overrun CardHeader's own `px-6 lg:px-[var(--space-7)]`.",
  );
}

/* ── 8 · THE NESTING FIX, v1.2.154 ───────────────────────────────────────
   AURORA, 22 SEP 2026, ON THE EFFORT SECTION'S METRIC TILES (`Card
   variant="default"` nested inside the plain Effort `Card`): "the contact
   is touching the border." The three parts used to find their OWN shell's
   variant with `group-data-[variant=plain]/card:`, which Tailwind compiles
   as a plain CSS descendant selector - it matches ANY `plain` ancestor,
   not only the nearest one, so a `default` tile nested inside a `plain`
   card matched the OUTER shell's `data-variant="plain"` straight past its
   own `default` shell in between and lost its insets.

   THE FIX MOVES DETECTION FROM THE DOM TO REACT. `Card` provides its own
   resolved `variant` on `CardVariantContext`; each part reads it with
   `React.useContext`, which always resolves to the NEAREST enclosing
   provider - never an "any ancestor" walk - so a nested `Card` shadows an
   outer one for everything mounted inside it. Six things pinned, each a
   different way this could silently regress back to the DOM-based bug:
     a · `CardVariantContext` is declared with `React.createContext`.
     b · `Card` renders a `CardVariantContext.Provider` whose `value` is
         the shell's OWN resolved `variant` (`variant ?? "default"`).
     c · That provider wraps `children` - the part a NESTED `Card` (and
         everything inside it) actually reads - not some other node.
     d, e, f · `CardHeader`, `CardContent` and `CardFooter` each call
         `React.useContext(CardVariantContext)`, so each one asks for its
         OWN shell's variant rather than inheriting a prop or reading the
         DOM.
   A seventh assertion closes the loop from the other side: NONE of the
   three parts' own bodies contain `group-data-[variant=plain]` any more -
   the exact string whose "any ancestor" semantics produced the bug. Its
   absence from just these three bodies is the proof that the nesting case
   this ruling was filed against cannot reoccur through them; `kanban.tsx`
   keeps the identical string for its own, unrelated, deliberately-broad
   ancestor read (section 5's own note, above), so this check is scoped to
   `card.tsx`'s three parts, not to the string everywhere. ──────────── */
if (!/const CardVariantContext = React\.createContext<.+>\("default"\);/.test(src)) {
  findings.push(
    "`CardVariantContext` is no longer declared with `React.createContext(\"default\")`: without it, " +
      "a part has no way to read its own shell's variant except the DOM-based `group-data-*` selector " +
      "the 22 Sep 2026 nesting ruling moved away from.",
  );
}

const cardBody = src.slice(src.indexOf("const Card = React.forwardRef"), src.indexOf('Card.displayName = "Card"'));

if (!/<CardVariantContext\.Provider value=\{variant \?\? "default"\}>/.test(cardBody)) {
  findings.push(
    "`Card` no longer renders `<CardVariantContext.Provider value={variant ?? \"default\"}>`: without " +
      "it, a nested `Card` cannot shadow an outer shell's variant for its own parts.",
  );
}

if (!/<CardVariantContext\.Provider value=\{variant \?\? "default"\}>\s*\{children\}\s*<\/CardVariantContext\.Provider>/.test(cardBody)) {
  findings.push(
    "`Card`'s `CardVariantContext.Provider` no longer wraps exactly `{children}`: a provider wrapping " +
      "anything else would not shadow the outer variant for the shell's own content.",
  );
}

for (const [name, body] of [
  ["CardHeader", headerBody],
  ["CardContent", contentBody2],
  ["CardFooter", footerBody],
]) {
  if (!/React\.useContext\(CardVariantContext\)/.test(body)) {
    findings.push(
      `\`${name}\` no longer calls \`React.useContext(CardVariantContext)\`: without it, this part has ` +
        "no way to find its OWN shell's variant rather than any `plain` ancestor's.",
    );
  }
  if (/group-data-\[variant=plain\]/.test(body)) {
    findings.push(
      `\`${name}\` still carries a \`group-data-[variant=plain]\` selector: this is the exact "any ` +
        "ancestor\" CSS descendant match whose breadth caused the 22 Sep 2026 nesting bug (a default " +
        "Card's parts reading a plain GRANDPARENT's variant instead of their own default parent's), " +
        "and its presence here means the bug can still reoccur through this part.",
    );
  }
}

if (findings.length > 0) {
  console.error("FAIL card check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  '`CardContent`\'s `inset` prop still declares "default"/"compact", defaults to "default", ' +
    'resolves "compact" to a flat `--space-3` and leaves the horizontal inset unconditional; the ' +
    "`plain` variant paints no fill and no shadow; `CardHeader`/`CardContent`/`CardFooter` each read " +
    "their OWN shell's variant off `CardVariantContext` (nearest-provider, not any-ancestor) rather " +
    "than the old `group-data-[variant=plain]/card:` descendant match, so a default Card nested inside " +
    "a plain Card keeps its own insets; `kanban.tsx`'s own, unrelated use of the `group/card` marker for " +
    "an ancestor-level read is untouched; CARD_CONTENT_INSET_X is still --space-3, so the boxed body " +
    "inset did not follow the pane to --space-6; `default` is untouched: OK card check.",
);
