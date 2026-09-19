#!/usr/bin/env node
/* ============================================================================
   THE BADGE CHECK — pins the client's 18 Sep 2026 report against every way
   it could come back, run by `npm run check` beside the token/icon/book/seam
   checks.

   THE RULING, VERBATIM: "why is chip ticket type grey and not black? all
   text shhould be black. when its a link make it underlined (for exmaple
   the app name)."

   EXTENDED 18 SEP 2026, A SECOND RULING THE SAME DAY, VERBATIM: "on ticket
   list views, its missing the space between icon and name and the
   backgorund card. always, make it a rule, for everythng wether its a dot
   or an icno, for all chips / pills." See section 4, below, for the two
   defects this second ruling reports and how each is checked.

   EXTENDED AGAIN 19 SEP 2026, A THIRD RULING, VERBATIM: "chips and pills
   always must have the background card or shape wherever they are. In this
   case, I'm talking inside ticket-related stories. The type of ticket and
   the status need the card to have a background." The type chip (18 Sep's
   own fix) already had one; the STATUS chip beside it did not — it read
   `--pill-fill`, which resolves to `--card`, byte-identical to
   `--background` in light, so it drew no visible fill wherever it sat on
   the page or a raised card. See section 1b, below.

   TWO DEFECTS, ONE CHIP. The ticket-type badge is `variant="secondary"` —
   the quiet counter — and that variant's own label read `text-ink-secondary`
   (a muted grey, `#4a4946` on paper) while every COLOURED variant in this
   file already drew a charcoal label on its own fill ("charcoal on every
   accent", this file's own law). Nobody had carried that law over to the one
   UNCOLOURED variant, and a second spot — the Archived status pill's own
   compound variant — repainted its label to `text-ink-tertiary` for the same
   reason. Both are fixed the same way: the FILL (or the dot) carries the
   tone, the LABEL is always `--foreground`. Separately, a badge that IS a
   link (an app-name chip, her own example) had no way to signal that at
   all — no underline, nothing distinguishing it from an inert quiet chip —
   so `asChild`/`href` and an always-on underline (`LINK_UNDERLINE`) were
   added.

   WHY THIS IS A NEW FILE RATHER THAN A BLOCK INSIDE ANOTHER CHECK. Every
   other `check-*.mjs` in this kit pins ONE component's own file; badge.tsx
   had none before this ruling — REGULAR STATUS-COLOUR-LOGIC BUGS ARE EXACTLY
   WHAT PUT THE GREY TEXT INTO PRODUCTION UNNOTICED FOR AS LONG AS IT SHIPPED,
   so a component this central (59 direct call sites, this file's own header)
   goes without a check no longer. Wired into `npm run check` in package.json
   beside `check-avatar.mjs`.

   SECTIONS 1–5 ARE STATIC, MATCHING THIS KIT'S OTHER `check-*.mjs` FILES —
   no jsdom/testing-library in this repository, so "no variant still reads a
   muted ink" is verified by reading the source directly rather than by
   mounting the component and reading computed styles.

   SECTION 6 IS NOT, AND THAT IS THE LESSON OF 18 SEP 2026. Section 3 below
   pinned `asChild` as four source shapes — the `Slot` import, the constant,
   the `isLink` line, the class application — and every one of them was
   green on the day the first real `<Badge asChild>` call site in the app
   (`shared/web/ticket-chips.tsx`'s app-name chip, the exact chip the ruling
   names) threw "Slot failed to slot onto its children" inside Radix `Slot`.
   The source SAID the right words; the render was wrong. A static pin can
   prove a line exists; only a render proves the line works. So section 6
   MOUNTS the component — through vite's own SSR loader (already a dev
   dependency; it is what compiles this TSX everywhere else) and
   `react-dom/server`'s `renderToStaticMarkup` (a peer dependency this repo
   already has installed for the demo), no DOM needed — and reads the HTML
   back. No new dependency, no jsdom; roughly a second of wall time.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "badge.tsx");
const src = fs.readFileSync(FILE, "utf8");
const rel = path.relative(process.cwd(), FILE);

const findings = [];

/* ============================================================================
   1 · NO VARIANT'S LABEL READS A MUTED INK — "all text shhould be black."
   Scoped to the `variants: { variant: { … } }` block specifically (not the
   whole file — the doc comments ABOVE that block are free to keep discussing
   the retired grey ink in prose while explaining why it is gone, the same
   "working code shape, not a bare word" standard `check-screen-shell.mjs`
   already holds itself to) — matched as `text-ink-secondary`/`text-ink-tertiary`
   appearing inside a variant's own return string, not merely mentioned in a
   neighbouring comment line.
   ========================================================================= */
const variantsBlockMatch = src.match(/variant:\s*\{([\s\S]*?)\n\s*\},\n\s*\/\* The dot's tone/);
if (!variantsBlockMatch) {
  findings.push(`Could not locate the \`variant: { … }\` block in ${rel} to check — the surrounding markers moved.`);
} else {
  const variantsBlock = variantsBlockMatch[1];
  // Strip block comments before scanning, so a doc comment inside the block
  // (there are several, one per variant) cannot itself trigger the guard —
  // only an actual class string can.
  const codeOnly = variantsBlock.replace(/\/\*[\s\S]*?\*\//g, "");
  if (/text-ink-secondary|text-ink-tertiary/.test(codeOnly)) {
    findings.push(
      `A variant inside badgeVariants' own \`variant: { … }\` block in ${rel} still reads text-ink-secondary or ` +
        "text-ink-tertiary for its LABEL — the 18 Sep ruling requires every variant's text to be --foreground; " +
        "only the fill or the dot may carry tone.",
    );
  }
}

// THE SPECIFIC FIX, PINNED POSITIVELY — not just "no grey" but "secondary
// reads foreground", so a regression that drops the fill's own custom
// property along with the ink fix would still be caught by this line.
if (!/secondary: "bg-\[var\(--badge-quiet-fill,var\(--surface-quiet\)\)\] text-foreground",/.test(src)) {
  findings.push(
    `${rel}'s secondary variant does not read text-foreground for its label — the exact chip the client reported ` +
      '("ticket type grey and not black") is this variant.',
  );
}

/* ============================================================================
   1b · A STATUS CHIP IS A CHIP — 19 SEP 2026 CLIENT RULING, VERBATIM: "chips
   and pills always must have the background card or shape wherever they are.
   In this case, I'm talking inside ticket-related stories. The type of
   ticket and the status need the card to have a background." `status` used
   to read `--pill-fill` (ch11's "other paper tone from the panel"), which
   resolves to `--card` — byte-identical to `--background` in light, so a
   status chip on the page or on a raised card drew no visible fill at all,
   exactly her report. PINNED POSITIVELY, the same shape as secondary's own
   pin above: `status` now reads the SAME rebindable chip-surface property
   secondary does — `--badge-quiet-fill`, falling back to `--surface-quiet`
   — not `--pill-fill`, so a caller never has to learn a second property to
   fix the same defect twice. The LABEL half is untouched (`--pill-label`,
   which already resolves to `--foreground`) — this ruling named the card,
   not the ink or the dot.
   ========================================================================= */
if (!/status: "bg-\[var\(--badge-quiet-fill,var\(--surface-quiet\)\)\] text-\[var\(--pill-label\)\]",/.test(src)) {
  findings.push(
    `${rel}'s status variant does not read bg-[var(--badge-quiet-fill,var(--surface-quiet))] — the same chip-` +
      'surface fill secondary draws — for its background. The 19 Sep 2026 ruling ("chips and pills always must ' +
      'have the background card or shape wherever they are") requires status to carry the identical visible fill ' +
      "secondary already has, not the old --pill-fill (which resolves to --card, invisible against --background " +
      "or a raised card in light).",
  );
}
if (/status: "bg-\[var\(--pill-fill\)\]/.test(src)) {
  findings.push(
    `${rel}'s status variant still reads bg-[var(--pill-fill)] — the exact token the 19 Sep 2026 ruling retired ` +
      "for this variant because it resolves to --card, which goes invisible against --background or a raised " +
      "card in light (both --kw-off-beige).",
  );
}

/* ============================================================================
   2 · NO COMPOUND VARIANT REPAINTS A LABEL — the retired Archived-pill
   tertiary-ink exception must stay gone. Checked as the absence of the
   specific compound-variant shape (a `class` entry naming a muted ink),
   not the bare word `compoundVariants` — a future, legitimate compound
   variant for some OTHER purpose (dotTone-specific fill, for instance) is
   not what this check exists to forbid.
   ========================================================================= */
if (/dotTone: "archived", class: "text-ink-tertiary"/.test(src)) {
  findings.push(
    `${rel} still carries the retired Archived-pill compound variant (dotTone: "archived", class: ` +
      '"text-ink-tertiary") — 18 Sep 2026 retired it outright: the state lives in the dot, never in a dimmed label.',
  );
}
if (/class:\s*"[^"]*text-ink-(?:secondary|tertiary)[^"]*"/.test(src)) {
  findings.push(
    `${rel} has a compoundVariants entry repainting a label to text-ink-secondary/tertiary — no variant, base or ` +
      "compound, may dim a badge's own label for tone any more.",
  );
}

/* ============================================================================
   3 · THE LINK UNDERLINE — "when its a link make it underlined." Checked as
   four working code shapes: the `Slot` import (asChild needs it), the
   `LINK_UNDERLINE` constant reading an ALWAYS-ON underline (not the hover-
   revealed `.kw-link` idiom `BreadcrumbLink` uses — a discrete chip has no
   surrounding prose to read a hover-only underline against), the `isLink`
   computation reading BOTH `asChild` and `href`, and the render actually
   applying `LINK_UNDERLINE` when `isLink`.
   ========================================================================= */
if (!/^import \{ Slot, Slottable \} from "@radix-ui\/react-slot";$/m.test(src)) {
  findings.push(
    `${rel} does not import both Slot and Slottable from @radix-ui/react-slot — asChild has nothing to render ` +
      "through, or (Slottable gone) the label is no longer the one element Slot merges onto and every asChild " +
      "badge throws again (section 6 below proves it either way).",
  );
}
if (!/const LINK_UNDERLINE = "underline underline-offset-\[0\.1875rem\]";/.test(src)) {
  findings.push(
    `${rel} does not define LINK_UNDERLINE as an always-on "underline underline-offset-[0.1875rem]" — a hover-only ` +
      "underline (BreadcrumbLink's own .kw-link idiom) would not read as a link on a chip with no hover to reveal it.",
  );
}
if (!/const isLink = asChild \|\| href !== undefined;/.test(src)) {
  findings.push(
    `${rel} does not compute isLink from BOTH asChild and href — either one alone is the caller's own declaration ` +
      "that a badge points somewhere, per BadgeProps' own doc.",
  );
}
if (!/isLink \? LINK_UNDERLINE : undefined,/.test(src)) {
  findings.push(`${rel} does not apply LINK_UNDERLINE when isLink — a linked badge would render with no underline at all.`);
}
if (!/asChild\?: boolean;/.test(src) || !/href\?: string;/.test(src)) {
  findings.push(`${rel}'s BadgeProps does not declare both asChild?: boolean and href?: string.`);
}

/* ============================================================================
   4 · THE LEADING-MARK GAP IS UNIVERSAL AND EVERY VARIANT CARRIES A FILL —
   18 SEP 2026, A SECOND RULING THE SAME DAY, VERBATIM: "on ticket list
   views, its missing the space between icon and name and the backgorund
   card. always, make it a rule, for everythng wether its a dot or an icno,
   for all chips / pills." Two defects, checked separately: the gap used to
   apply only when the `dot` PROP was truthy, so an icon handed in as a plain
   child (the ticket-type chip's own shape, never through `dot`) got none at
   all — fixed by moving the gap into `badgeVariants`' own BASE class list,
   unconditional; and the ruling's "no variant may render bare text without
   a fill" is pinned so a future variant cannot omit a `bg-` declaration the
   way the ad-hoc chip (outside this file) omitted its gap.
   ========================================================================= */

// 4a · THE GAP TOKEN IS DEFINED — "gap-2", --space-2, the same rung the
// status dot already spent (see the retired GAP_WITH_DOT's own comment).
if (!/const LEADING_MARK_GAP = "gap-2";/.test(src)) {
  findings.push(
    `${rel} does not define const LEADING_MARK_GAP = "gap-2" — the 18 Sep ruling's leading-mark gap, the same ` +
      "rung the status dot already spent.",
  );
}

// 4b · THE GAP IS SPENT IN THE BASE CLASS LIST, NOT BEHIND A `dot ? … :`
// TERNARY. Matched inside badgeVariants' own first cva() argument — the
// array of base classes shared by every variant — so a LEADING_MARK_GAP
// reference anywhere else in the file (a doc comment, for instance) cannot
// satisfy this.
const cvaBaseArrayMatch = src.match(/const badgeVariants = cva\(\s*\[([\s\S]*?)\],\s*\{/);
if (!cvaBaseArrayMatch) {
  findings.push(`Could not locate badgeVariants' own base class array in ${rel} to check — the cva(...) call shape moved.`);
} else if (!/LEADING_MARK_GAP/.test(cvaBaseArrayMatch[1])) {
  findings.push(
    `badgeVariants' own base class array in ${rel} does not spend LEADING_MARK_GAP — the leading-mark gap must ` +
      "draw unconditionally (a gap utility costs nothing on a one-child, label-only badge), not only when a dot " +
      "or an icon happens to be present.",
  );
}

// 4c · THE OLD CONDITIONAL APPLICATION IS GONE — the exact regression shape
// the ruling reports: a gap that only fires when `dot` is truthy leaves an
// icon-led chip (icon handed in some OTHER way) with none.
if (/dot\s*\?\s*(GAP_WITH_DOT|LEADING_MARK_GAP)\s*:\s*undefined/.test(src)) {
  findings.push(
    `${rel} still applies its leading-mark gap conditionally (dot ? … : undefined) — the 18 Sep ruling requires ` +
      "it in badgeVariants' own base class list, spent on every badge regardless of what (if anything) leads.",
  );
}

// 4d · EVERY VARIANT CARRIES A `bg-` DECLARATION — re-scoped to the same
// `variant: { … }` block section 1 reads, comments stripped the same way,
// so a doc comment mentioning "no fill" in prose cannot itself trigger or
// satisfy this. `outline`'s bg-transparent counts: it is a DECLARED choice
// (this file's own header law explains why), not an absent one — the guard
// is against a variant with no `bg-` utility in its class string at all.
if (variantsBlockMatch) {
  const codeOnlyForFill = variantsBlockMatch[1].replace(/\/\*[\s\S]*?\*\//g, "");
  const variantEntryPattern = /(\w+):\s*"([^"]+)",/g;
  const noFill = [];
  let m;
  while ((m = variantEntryPattern.exec(codeOnlyForFill)) !== null) {
    const [, name, classes] = m;
    if (!/\bbg-/.test(classes)) noFill.push(name);
  }
  if (noFill.length > 0) {
    findings.push(
      `The following variant(s) in ${rel}'s own \`variant: { … }\` block carry no bg- declaration at all: ` +
        `${noFill.join(", ")} — the 18 Sep ruling ("no variant may render bare text without a fill") requires ` +
        "every variant to declare a background, even bg-transparent, as a deliberate choice.",
    );
  }
}

// 4e · THE ICON SLOT — a formal prop, not an ad-hoc `<Icon/>` + `<span>`
// pair. Checked as BadgeProps' own declaration, the render destructure, and
// the actual render site drawing a data-slot="badge-icon" wrapper.
if (!/icon\?:\s*React\.ReactNode;/.test(src)) {
  findings.push(`${rel}'s BadgeProps does not declare icon?: React.ReactNode — the icon-led chip's own formal slot.`);
}
if (!/\n\s+dot,\n\s+icon,\n/.test(src)) {
  findings.push(`${rel}'s Badge render function does not destructure icon alongside dot.`);
}
if (!/data-slot="badge-icon"/.test(src)) {
  findings.push(`${rel} does not render a data-slot="badge-icon" wrapper — the icon prop is declared but not drawn.`);
}

/* ============================================================================
   5 · THE ICON SLOT'S COLOUR IS FORCED, NEVER MUTED — 18 SEP 2026, A THIRD
   RULING THE SAME DAY, over a screenshot of a ticket head: "type icon is
   still gray." The icon slot used to leave colour entirely to the caller
   ("sized and coloured at the call site") and the app repo's own ticket-type
   chip call sites (outside this repo, unreachable from here) hand it a
   Phosphor glyph carrying its own `text-muted-foreground` — reproduced
   deliberately in `verify/badge/page.tsx`'s icon-led section for exactly
   this reason. The fix has to win even against a caller that still writes a
   muted class directly on its own SVG, which a bare `text-foreground` on the
   wrapping span cannot do (a directly-set colour beats an inherited one
   regardless of the ancestor's own class) — so the wrapper forces it with
   `[&_svg]:text-foreground`, the same descendant-selector rescue `select.tsx`
   already uses for its own icons. Checked as the EXACT render-site class
   string, not a bare substring search for "text-foreground" anywhere in the
   file (the file's own doc prose already says that word many times) — and
   as the ABSENCE of any muted-ink or opacity utility on that specific span,
   so a regression that reintroduces "coloured at the call site" by deleting
   the forced class, or that mutes the icon a different way (an opacity
   utility rather than a colour class), both fail loudly.
   ========================================================================= */
const badgeIconSpanMatch = src.match(
  /<span\s+aria-hidden="true"\s+data-slot="badge-icon"\s+className="([^"]*)"\s*>/,
);
if (!badgeIconSpanMatch) {
  findings.push(
    `Could not locate the exact <span aria-hidden="true" data-slot="badge-icon" className="…"> render site in ` +
      `${rel} to check — its shape moved (attribute order or formatting), so this pin can no longer confirm the ` +
      "icon's colour is forced.",
  );
} else {
  const badgeIconClass = badgeIconSpanMatch[1];
  if (!/\[&_svg\]:text-foreground/.test(badgeIconClass)) {
    findings.push(
      `${rel}'s badge-icon span does not carry [&_svg]:text-foreground — a caller's own SVG can still set its own ` +
        'muted colour class (text-muted-foreground, the exact shape the client\'s "type icon is still gray" report ' +
        "found), and a bare text-foreground on the wrapper cannot outrank a colour set directly on the child.",
    );
  }
  if (/text-(?:muted-foreground|ink-secondary|ink-tertiary|ink-disabled)\b/.test(badgeIconClass)) {
    findings.push(
      `${rel}'s badge-icon span itself reads a muted ink class (text-muted-foreground/text-ink-secondary/` +
        "text-ink-tertiary/text-ink-disabled) — the icon slot carries no muted colour of its own; it forces " +
        "text-foreground, full stop.",
    );
  }
  if (/\bopacity-\d/.test(badgeIconClass)) {
    findings.push(
      `${rel}'s badge-icon span applies an opacity-* utility — muting the icon by opacity dims the same ink an ` +
        "un-muted icon already passes contrast at, which is the identical mistake the label's own muted-ink fix " +
        "(section 1, above) already rules out for text.",
    );
  }
}

/* ============================================================================
   6 · `asChild` ACTUALLY RENDERS — mounted, not grepped. 18 SEP 2026: the
   client's underline ruling ("when its a link make it underlined (for
   exmaple the app name)") is delivered as `<Badge asChild><Link>…</Link>
   </Badge>`, and that shape threw on its first real call. WHY: the render
   writes three child expressions (icon, dot, label) and two are `null`
   placeholders on a plain link chip; `React.Children.count` counts a `null`
   like an element (`count([null, null, <a/>])` → 3, proved live), and Radix
   `Slot` demands exactly one — so `asChild` threw on EVERY badge, with icon
   and dot too (three real elements are still not one). The fix wraps the
   label in Radix's own `Slottable` under `asChild`, so `Slot` takes the
   label element as its target and the icon/dot spans become that element's
   own leading children. Five renders, each read back as HTML:

     a. asChild, no icon, no dot  — THE reported case: one <a>, badge classes,
                                    LINK_UNDERLINE, data-slot="badge", label.
     b. asChild + icon            — the icon span sits INSIDE the anchor,
                                    before the label.
     c. asChild + icon + dot      — both marks inside, dot after icon,
                                    data-dot on the anchor.
     d. href, no asChild          — the plain <a> path, unchanged.
     e. plain                     — a <span>, no underline, no Slottable cost.

   The loader is vite's `createServer` + `ssrLoadModule` with `configFile:
   false` (the kit's own vite.config.ts is the demo's, rooted at demo/) and
   no dependency pre-bundling; the module graph is badge.tsx → lib/utils
   → cva/clsx/tailwind-merge → react, all of which resolve from this repo's
   own node_modules. `renderToStaticMarkup` throws synchronously on a Slot
   failure, so a regression is a finding with the thrown message in it.
   ========================================================================= */
{
  const KIT_ROOT = path.resolve(HERE, "..", "..");
  const BADGE_URL = "/" + path.relative(KIT_ROOT, FILE).split(path.sep).join("/");
  let server = null;
  try {
    const [{ createServer }, React, { renderToStaticMarkup }] = await Promise.all([
      import("vite"),
      import("react"),
      import("react-dom/server"),
    ]);
    server = await createServer({
      root: KIT_ROOT,
      configFile: false,
      logLevel: "silent",
      server: { middlewareMode: true, hmr: false, watch: null },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    const { Badge } = await server.ssrLoadModule(BADGE_URL);
    const h = React.createElement;
    const anchor = () => h("a", { href: "/apps/1" }, "App");
    const glyph = () => h("svg", { "data-glyph": "" });
    const render = (name, el) => {
      try {
        return renderToStaticMarkup(el);
      } catch (e) {
        findings.push(`${rel}: rendering <Badge> shape "${name}" THREW — ${e instanceof Error ? e.message : String(e)}`);
        return null;
      }
    };

    // a. THE REPORTED CASE.
    const a = render("asChild, no icon, no dot", h(Badge, { asChild: true, variant: "secondary", size: "pill" }, anchor()));
    if (a !== null) {
      if (!/^<a [^>]*>App<\/a>$/.test(a)) {
        findings.push(`${rel}: asChild rendered something other than a single <a>…</a> around the label: ${a}`);
      }
      if (!/ data-slot="badge"/.test(a)) findings.push(`${rel}: asChild anchor lost data-slot="badge": ${a}`);
      if (!/ href="\/apps\/1"/.test(a)) findings.push(`${rel}: asChild anchor lost the child's own href: ${a}`);
      if (!/underline underline-offset-\[0\.1875rem\]/.test(a)) {
        findings.push(`${rel}: asChild anchor does not carry LINK_UNDERLINE — "when its a link make it underlined": ${a}`);
      }
      if (!/rounded-pill/.test(a) || !/\bbg-\[/.test(a)) {
        findings.push(`${rel}: asChild anchor does not carry the badge's own pill classes/fill (Slot merge lost): ${a}`);
      }
      if (/Slottable/.test(a)) findings.push(`${rel}: a Slottable wrapper leaked into the asChild HTML: ${a}`);
    }

    // b. ICON INSIDE THE ANCHOR, BEFORE THE LABEL.
    const b = render(
      "asChild + icon",
      h(Badge, { asChild: true, icon: glyph(), variant: "secondary", size: "pill" }, anchor()),
    );
    if (b !== null && !/^<a [^>]*><span [^>]*data-slot="badge-icon"[^>]*><svg data-glyph=""><\/svg><\/span>App<\/a>$/.test(b)) {
      findings.push(`${rel}: asChild + icon must render the icon span INSIDE the anchor, before the label: ${b}`);
    }

    // c. ICON AND DOT INSIDE, DOT AFTER ICON, data-dot ON THE ANCHOR.
    const c = render(
      "asChild + icon + dot",
      h(Badge, { asChild: true, icon: glyph(), dot: "building", variant: "status", size: "pill" }, anchor()),
    );
    if (
      c !== null &&
      !/^<a [^>]*data-dot="building"[^>]*><span [^>]*data-slot="badge-icon"[^>]*>.*<\/span><span [^>]*data-slot="badge-dot"[^>]*><\/span>App<\/a>$/.test(c)
    ) {
      findings.push(`${rel}: asChild + icon + dot must render icon then dot inside the anchor, data-dot on it: ${c}`);
    }

    // d. THE href PATH, UNCHANGED.
    const d = render("href", h(Badge, { href: "/apps/1", variant: "secondary", size: "pill" }, "App"));
    if (d !== null && !/^<a data-slot="badge" href="\/apps\/1" class="[^"]*underline underline-offset-\[0\.1875rem\]">App<\/a>$/.test(d)) {
      findings.push(`${rel}: the href (no asChild) path changed shape — it must stay a plain underlined <a>: ${d}`);
    }

    // e. A PLAIN BADGE — a <span>, no underline, no wrapper.
    const e = render("plain", h(Badge, { variant: "secondary", size: "pill" }, "App"));
    if (e !== null && !/^<span data-slot="badge" class="[^"]*">App<\/span>$/.test(e)) {
      findings.push(`${rel}: a plain <Badge> no longer renders a bare <span>…label</span>: ${e}`);
    }
    if (e !== null && /underline/.test(e)) {
      findings.push(`${rel}: a plain <Badge> (no asChild, no href) draws LINK_UNDERLINE — it is not a link: ${e}`);
    }
  } catch (e) {
    findings.push(
      `${rel}: section 6 could not mount <Badge> at all (${e instanceof Error ? e.message : String(e)}) — the ` +
        "asChild render path is unproven; fix the loader before trusting the static pins above.",
    );
  } finally {
    if (server) await server.close();
  }
}

if (findings.length > 0) {
  console.error("FAIL badge check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK badge check: no variant (base or compound) reads a muted ink for its label — secondary reads " +
    "text-foreground and the retired Archived tertiary-label compound variant stays gone — status reads the " +
    "same chip-surface fill as secondary (--badge-quiet-fill, falling back to --surface-quiet) instead of the " +
    "now-retired --pill-fill — a linked badge " +
    "(asChild or href) always draws LINK_UNDERLINE — the leading-mark gap (LEADING_MARK_GAP, gap-2) is spent " +
    "unconditionally in badgeVariants' own base class list rather than behind a dot-only ternary — every variant " +
    "carries an explicit bg- declaration — the icon prop gives an icon-led chip a real Badge slot — and that " +
    "slot forces [&_svg]:text-foreground so a caller's own muted icon class can never win — and <Badge asChild> " +
    "MOUNTS for real (five shapes rendered through vite SSR + react-dom/server): one anchor carrying the badge's " +
    "classes, underline and data-slot, with any icon/dot inside it before the label.",
);
