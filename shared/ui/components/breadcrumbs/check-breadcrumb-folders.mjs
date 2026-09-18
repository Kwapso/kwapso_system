#!/usr/bin/env node
/* ============================================================================
   THE 18 SEP 2026 ONE-STRIP-ONE-GAP CHECK — run by `npm run check` beside
   the other component checks. EXTENDED THE SAME DAY, THIRD REPORT ON THE
   SAME SCREENSHOT: "the assistant tabs overlap / the issue's still there."

   THE FIRST HALF OF THIS FILE (below) answered her SECOND report — a
   divergence that turned out not to exist, because `BreadcrumbFolders` is
   the ONLY folder-tab strip in the kit and both real call sites (the app's
   content trail, the assistant dock) call it directly with no wrapper. That
   check still stands and still matters: it is what proves a future "dock
   variant" can never quietly re-fork the gap.

   THE THIRD REPORT WAS A DIFFERENT DEFECT WEARING THE SAME WORDS. Every
   rect sweep that answered the first two measured TAB-TO-TAB GAPS (correct,
   8px, every time) and never asked whether the STRIP ITSELF fit its
   container — at the assistant pane's fixed 380px it did not, and the "+"
   (the one tab that must always be reachable) scrolled off with everything
   else. `fit="shrink"` (`BreadcrumbFoldersProps`) is the fix: a second
   mode, still ONE component, that pulls the trailing pinned run (History,
   "+") OUTSIDE the shrinking list into its own, always-visible box. This
   check's SECOND half pins THAT class contract, the same way the first
   half pins the natural mode's: one scroll list, one pinned list, one set
   of shrink constants, spent by exactly the render sites that should spend
   them. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "breadcrumb-folders.tsx");

const src = fs.readFileSync(FILE, "utf8");
const rel = path.relative(process.cwd(), FILE);

const findings = [];

// THREE RENDER SITES, EXACTLY — ONE PER SHAPE, NEVER A FOURTH. The natural-
// mode strip, the shrink mode's scroll list and the shrink mode's pinned
// list. A fourth would mean a second implementation of one of the three
// shapes, which is the same class of drift the original one-render-site
// rule refused.
const listRenderSites = src.match(/<BreadcrumbList\b/g) ?? [];
if (listRenderSites.length !== 3) {
  findings.push(
    `${rel} renders <BreadcrumbList> ${listRenderSites.length} times — exactly three (natural, shrink-scroll, ` +
      "shrink-pinned) keeps every caller on one implementation per shape; any other count is a second " +
      "implementation of one of them.",
  );
}

// THE NATURAL-MODE RENDER SITE SPENDS STRIP, MERGED ONLY WITH THE CALLER'S
// OWN listClassName — byte-identical to the strip before `fit` existed.
if (!/<BreadcrumbList ref=\{listRef\} className=\{cn\(STRIP, listClassName\)\}>/.test(src)) {
  findings.push(
    `${rel}'s natural-mode <BreadcrumbList> does not read className={cn(STRIP, listClassName)} — every ` +
      "fit=\"natural\" consumer's gap comes from this one merge.",
  );
}

// THE SHRINK MODE'S SCROLL LIST SPENDS STRIP_SHRINK_SCROLL, SAME MERGE
// SHAPE, SAME listClassName ESCAPE HATCH.
if (!/<BreadcrumbList ref=\{listRef\} className=\{cn\(STRIP_SHRINK_SCROLL, listClassName\)\}>/.test(src)) {
  findings.push(
    `${rel}'s shrink-mode scroll <BreadcrumbList> does not read className={cn(STRIP_SHRINK_SCROLL, ` +
      "listClassName)} — the shrinking half of fit=\"shrink\" must merge the same way the natural strip does.",
  );
}

// THE SHRINK MODE'S PINNED LIST SPENDS STRIP_SHRINK_PINNED — no listClassName
// here on purpose: a caller's own class hook targets the strip the reader
// scrolls, not the pinned tail, which never grows or shrinks per caller.
if (!/<BreadcrumbList className=\{STRIP_SHRINK_PINNED\}>/.test(src)) {
  findings.push(
    `${rel}'s shrink-mode pinned <BreadcrumbList> does not read className={STRIP_SHRINK_PINNED} — the pinned ` +
      "History/\"+\" run must render through this one constant.",
  );
}

// STRIP ITSELF IS STILL THE 18 SEP GAP, NOT THE RETIRED NEGATIVE-MARGIN
// OVERLAP. Working code shape (the class Tailwind actually emits), not a
// bare mention — this file's own prose is free to keep narrating
// TAB_OVERLAP_MARGIN's retirement at length while explaining why it is gone.
const constBlock = (name) => {
  const match = src.match(new RegExp(`^const ${name} = cn\\(([\\s\\S]*?)\\);`, "m"));
  return match ? match[1] : null;
};

const stripBody = constBlock("STRIP");
if (!stripBody) {
  findings.push(`${rel} has no const STRIP = cn(...) declaration to check.`);
} else {
  if (!/gap-\[var\(--space-2\)\]/.test(stripBody)) {
    findings.push(
      `${rel}'s STRIP does not read gap-[var(--space-2)] — the 18 Sep "need space betwwen tehm" ruling's own ` +
        "gap, spent once here for every caller.",
    );
  }
  if (/ms-\[calc\(var\(--folder-shoulder\)\*-1\)\]/.test(stripBody) || /TAB_OVERLAP_MARGIN/.test(stripBody)) {
    findings.push(
      `${rel}'s STRIP still carries the retired negative-margin overlap mechanism — the 18 Sep ruling replaced ` +
        "it outright and it must stay gone from the working class list (the file's own prose may still narrate " +
        "it in the past tense; this match is scoped to STRIP's own cn(...) body).",
    );
  }
}

// THE 18 SEP 2026 POINTER FIX — `isolate` ON EACH `<ol>`, NOT ONLY ON THE
// OUTER ROW. Live proof (kwapso_system's `plus-click-check.mjs` against
// v1.2.125): a real pointer click centred on the "+" tab's own anchor rect
// hit-tested to `document.elementFromPoint` returning the PINNED `<ol>`
// itself, never the anchor — `STRIP_SHRINK_ROW`'s own `isolate` stops a
// negative-z `<li>` from escaping past the ROW, but does nothing for a
// child whose nearest ancestor stacking context is still the `<ol>` it
// lives in, two levels closer, which had no `isolation` of its own. Every
// tab's `<li>` carries a negative inline `z-index` (`restZIndex`, read at
// render), so BOTH split lists need this — a regression here is exactly
// the defect `verify/agent-tab-strip-fit/check-pointer.mjs` reproduces with
// a real `page.mouse.click`, not just a class-string check, but this check
// pins the construction so the class can never quietly drop the word again
// without a human noticing in a diff.
for (const name of ["STRIP_SHRINK_SCROLL", "STRIP_SHRINK_PINNED"]) {
  const bodyOrLiteral = constBlock(name) ?? (src.match(new RegExp(`^const ${name} = "([^"]*)";`, "m")) ?? [])[1];
  if (bodyOrLiteral === null || bodyOrLiteral === undefined) {
    findings.push(`${rel} has no const ${name} declaration to check.`);
  } else if (!/(^|\s)isolate(\s|$)/.test(bodyOrLiteral)) {
    findings.push(
      `${rel}'s ${name} does not read isolate — without isolation on the SAME <ol> whose flex children carry ` +
        "the negative restZIndex, a real pointer click on a tab hit-tests to the <ol> itself instead of the " +
        "anchor (measured on v1.2.125's staging build, see check-pointer.mjs). STRIP_SHRINK_ROW's own isolate " +
        "is one level too high to fix this.",
    );
  }
}

// THE SHRINK ROW'S GAP MATCHES STRIP'S OWN, AT ALL THREE LEVELS — the outer
// row (between the two lists) and each list (between the tabs inside it).
// A drifted gap on any one of the three would read as a wider or narrower
// seam exactly where the scroll list meets the pinned one, which is the
// single pixel row most likely to be looked at closely.
for (const name of ["STRIP_SHRINK_ROW", "STRIP_SHRINK_SCROLL", "STRIP_SHRINK_PINNED"]) {
  const bodyOrLiteral = constBlock(name) ?? (src.match(new RegExp(`^const ${name} = "([^"]*)";`, "m")) ?? [])[1];
  if (bodyOrLiteral === null || bodyOrLiteral === undefined) {
    findings.push(`${rel} has no const ${name} declaration to check.`);
  } else if (!/gap-\[var\(--space-2\)\]/.test(bodyOrLiteral)) {
    findings.push(
      `${rel}'s ${name} does not read gap-[var(--space-2)] — every gap in the strip, natural mode or shrink, ` +
        "is the same token; a different one here would read as a mismatched seam at the pinned boundary.",
    );
  }
}

// fit="shrink" IS AN OPT-IN, NOT A NEW DEFAULT — a caller that never
// mentions `fit` must render exactly what it always has. Matched as a real
// destructuring line (leading whitespace, a bare `=`, a trailing comma), not
// a bare substring search — this file's own prose mentions `fit="natural"`
// (with an `=`, no spaces, inside backticks) more than once, and a search
// that could not tell prose from code would pass on the strength of a
// comment alone.
if (!/^\s+fit = "natural",\s*$/m.test(src)) {
  findings.push(
    `${rel} does not default fit to "natural" in the component's own destructuring — a missing default would ` +
      "change every existing caller's DOM the day this shipped.",
  );
}

// THE SHRINKING TAB'S OWN THREE-PART CONTRACT: the <li> grows from zero and
// caps at its own content width, a floor below which it stops shrinking,
// and the inner control's fixed 128px floor is cancelled so it can actually
// reach that floor.
if (!/const TAB_SHRINK_ITEM = "flex-1 basis-0 max-w-max";/.test(src)) {
  findings.push(
    `${rel}'s TAB_SHRINK_ITEM is not "flex-1 basis-0 max-w-max" — a shrinking tab must grow from zero and cap ` +
      "at its own natural (max-content) width, never stretch past it.",
  );
}
if (!/const TAB_SHRINK_MIN_WIDTH =\s*\n?\s*"min-w-\[calc\(4ch_\+_var\(--space-5\)_\+_var\(--folder-shoulder\)_\+_var\(--control-height-pill\)_\+_var\(--space-2\)\)\]";/.test(
    src,
  )
) {
  findings.push(
    `${rel}'s TAB_SHRINK_MIN_WIDTH does not read the pinned four-character-plus-close-button calc — the floor ` +
      "a shrinking tab may never cross must stay a real, derived minimum rather than an arbitrary number.",
  );
}
if (!/const TAB_SHRINK_TAB = "shrink min-w-0";/.test(src)) {
  findings.push(
    `${rel}'s TAB_SHRINK_TAB does not read "shrink min-w-0" — MEASURED regression (see that constant's own ` +
      "comment): TAB's base class opens with shrink-0, and with only min-w-0 overridden the <li> shrinks to its " +
      "floor while the anchor inside it keeps its own full content width and silently overflows the box, with " +
      "no ellipsis ever drawn. Both overrides are required, not one.",
  );
}
if (!/const LABEL_SHRINK = "min-w-0 truncate";/.test(src)) {
  findings.push(
    `${rel}'s LABEL_SHRINK does not read "min-w-0 truncate" — a label needs both to actually ellipsis once its ` +
      "tab is narrower than the text.",
  );
}

// EVERY SHRINK CONSTANT IS ACTUALLY READ IN THE RENDER, NOT JUST DECLARED.
// A constant that exists but is never spent is the same silent drift the
// one-STRIP rule below refuses for the natural-mode shape.
for (const name of ["TAB_SHRINK_ITEM", "TAB_SHRINK_MIN_WIDTH", "TAB_SHRINK_TAB", "LABEL_SHRINK"]) {
  const uses = (src.match(new RegExp(name, "g")) ?? []).length;
  // 1 for the declaration itself (`const NAME =`); anything beyond that is a
  // real read.
  if (uses < 2) {
    findings.push(`${rel} declares ${name} but never reads it outside its own declaration.`);
  }
}

// NO SECOND STRIP-SHAPED CONSTANT BEYOND THE FOUR THIS FILE NOW OWNS. A
// future STRIP_ASIDE/STRIP_DOCK is exactly the "second implementation" this
// check exists to refuse, however it merges its own gap.
const KNOWN_STRIP_NAMES = new Set([
  "STRIP",
  "STRIP_SHRINK_ROW",
  "STRIP_SHRINK_SCROLL",
  "STRIP_SHRINK_PINNED",
  // Pre-existing, unrelated to the gap/fit contract: the `max-md:hidden`
  // gate that hides the whole strip below `md` in favour of the phone's
  // text trail. Named STRIP* because it gates the strip, not because it is
  // a second drawing of one.
  "STRIP_ONLY",
]);
const stripLikeNames = Array.from(src.matchAll(/^const (STRIP\w*) = /gm)).map((m) => m[1]);
const unknownStripNames = stripLikeNames.filter((name) => !KNOWN_STRIP_NAMES.has(name));
if (unknownStripNames.length > 0 || stripLikeNames.length !== KNOWN_STRIP_NAMES.size) {
  findings.push(
    `${rel} declares STRIP-shaped constant(s) ${JSON.stringify(stripLikeNames)} — expected exactly ` +
      `${JSON.stringify([...KNOWN_STRIP_NAMES])}; a name outside that set is a second implementation, whatever ` +
      "its own gap reads today.",
  );
}

if (findings.length > 0) {
  console.error("FAIL breadcrumb-folders one-strip-one-gap check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK breadcrumb-folders one-strip-one-gap check: three <BreadcrumbList> render sites (natural, shrink-scroll, " +
    "shrink-pinned), each spending exactly its own named constant, all reading the identical gap-[var(--space-2)] " +
    "token, fit defaulting to \"natural\", and every fit=\"shrink\" tab-sizing constant declared AND read. Live " +
    "proof of the natural-mode outcome: verify/tabstrip-parity/page.tsx's measureNesting; live proof of the " +
    "shrink-mode outcome: verify/agent-tab-strip-fit/page.tsx's own measurements at 1, 3, 5 and 8 tabs.",
);
