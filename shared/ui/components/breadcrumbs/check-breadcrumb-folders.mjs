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

// THE CLASS-LIST PARITY PIN, 20 SEP 2026 — her fifth report on this exact
// shape: "whats going on with the assistant tabs? shape of 'not active (and
// + and log) is still wrong". `verify/agent-tab-strip-fit/page.tsx`'s own
// `measureClassParity` answers it at the TILE level — a natural-mode
// reference strip beside the fit="shrink" cases, checked per tab kind
// (pinned "+" byte-identical, inactive/active with TAB_SHRINK_TAB's one
// sanctioned substitution undone) — and this is the STATIC pin that proves
// the harness keeps declaring AND reading it, the same "declared AND read"
// standard the shrink constants above are already held to. It does not
// re-run the browser probe (no check-*.mjs in this repo drives a headless
// browser against a live-mounted harness page outside `check-pointer.mjs`,
// which is its own separate, already-passing Node/Playwright script in the
// same directory — the "pointer/hit checks from v1.2.126" this pin's own
// report names) — it proves the SOURCE still wires the proof up rather than
// quietly dropping it.
const AGENT_TAB_STRIP_FIT_FILE = path.join(HERE, "..", "..", "verify", "agent-tab-strip-fit", "page.tsx");
if (!fs.existsSync(AGENT_TAB_STRIP_FIT_FILE)) {
  findings.push(
    `verify/agent-tab-strip-fit/page.tsx is missing — the fit="shrink" harness this repo's own checks and ` +
      "reports point to must exist on disk.",
  );
} else {
  const fitSrc = fs.readFileSync(AGENT_TAB_STRIP_FIT_FILE, "utf8");
  const fitRel = path.relative(process.cwd(), AGENT_TAB_STRIP_FIT_FILE);

  if (!/function measureClassParity\(\)/.test(fitSrc)) {
    findings.push(
      `${fitRel} has no measureClassParity() — the class-list parity assertion against the natural strip ` +
        "(inactive, active, pinned \"+\") that answers her 20 Sep report must be declared.",
    );
  }
  if (!/window\.__agentTabStripClassParityProbe = measureClassParity/.test(fitSrc)) {
    findings.push(
      `${fitRel} declares measureClassParity but does not expose it as ` +
        "window.__agentTabStripClassParityProbe — a proof nothing can call is the same as no proof.",
    );
  }
  if (!/data-natural-reference="true"/.test(fitSrc)) {
    findings.push(
      `${fitRel} has no fit="natural" reference strip (data-natural-reference) — measureClassParity has ` +
        "nothing to compare the shrink-mode tiles against without one.",
    );
  }
  // THE ONE SUBSTITUTION THE PROOF MAY MAKE, NAMED HERE SO A SECOND ONE
  // CANNOT BE ADDED QUIETLY: `shrink`/`min-w-0` swapped back for `shrink-0`
  // before a scrolling tile is compared to its natural-mode counterpart —
  // TAB_SHRINK_TAB's own, documented difference, and the only one.
  if (!/function shrinkAdjustedClassSet/.test(fitSrc)) {
    findings.push(
      `${fitRel} has no shrinkAdjustedClassSet — the rest/active tile comparison must undo TAB_SHRINK_TAB's ` +
        "own documented shrink-0 substitution before comparing, not compare raw class strings that were never " +
        "going to match.",
    );
  }
  if (!/["']shrink-0["']/.test(fitSrc) || !fitSrc.includes('set.delete("shrink")')) {
    findings.push(
      `${fitRel}'s shrinkAdjustedClassSet does not read like the documented shrink/min-w-0 -> shrink-0 swap — ` +
        "see TAB_SHRINK_TAB's own comment in breadcrumb-folders.tsx for the substitution this must undo.",
    );
  }

  // THE LAYERING PIN, 20 SEP 2026 — Aurora, verbatim, with her crop of the
  // assistant strip: "loos at screenshot. i see the bottom of th eincactive
  // tabs for the assistant but they shoudl be behind the shape!" The
  // BEHAVIOUR this fixes lives in screen-shell.tsx's own ASIDE_BODY
  // (relative z-[2] — see that constant's own comment for the full
  // mechanism), not in this file: STRIP_SHRINK_SCROLL/STRIP_SHRINK_PINNED's
  // own isolate (pinned above, unchanged, still load-bearing for real
  // pointer clicks) is what PROMOTES the strip into the stacking bucket
  // that made the panel's own missing z-index lose to it; the panel side of
  // the construction is what actually decides who wins. This pin proves the
  // HARNESS still declares and reads a live proof of the outcome — the same
  // "declared AND read" standard the class-parity pin just above already
  // holds `measureClassParity` to — not that today's numbers still pass
  // (that is measureLayering's own job, run live against the mounted
  // harness, not re-derived here in a static, no-browser check).
  if (!/function measureLayering\(/.test(fitSrc)) {
    findings.push(
      `${fitRel} has no measureLayering() — the elementFromPoint layering assertion (an inactive tab's own ` +
        "overlap band must resolve to the panel, never the tab) that answers her 20 Sep report must be " +
        "declared.",
    );
  }
  if (!/window\.__agentTabStripLayeringProbe = measureLayering/.test(fitSrc)) {
    findings.push(
      `${fitRel} declares measureLayering but does not expose it as window.__agentTabStripLayeringProbe — a ` +
        "proof nothing can call is the same as no proof.",
    );
  }
  if (!/data-slot="agent-tab-strip-fit-panel"/.test(fitSrc)) {
    findings.push(
      `${fitRel} has no data-slot="agent-tab-strip-fit-panel" — measureLayering has nothing standing in for ` +
        "the real screen-shell-aside-body panel the strip rides onto without one.",
    );
  }
  // THE MOCK PANEL MUST ACTUALLY PARTICIPATE IN STACKING THE SAME WAY
  // ASIDE_BODY DOES, OR THE PROOF IS TESTING NOTHING — a panel div with no
  // position/z-index would fail measureLayering for the SAME reason the
  // real defect existed, which is the point, but a harness that quietly
  // dropped the z-[2] would then "prove" the bug is fixed by testing an
  // unfixed construction against an equally unfixed mock.
  if (!/position:\s*"relative"/.test(fitSrc) || !/zIndex:\s*2/.test(fitSrc)) {
    findings.push(
      `${fitRel}'s mock panel does not read position: "relative" / zIndex: 2 — it must mirror screen-` +
        "shell.tsx's own ASIDE_BODY construction (relative z-[2]), the real fix this proof is standing in for.",
    );
  }
}

// THE POINTER/HIT CHECKS FROM v1.2.126 STAY ON DISK, BESIDE THE CLASS
// PARITY PIN ABOVE — `check-pointer.mjs` is the real-PointerEvent proof
// that a click on a pinned or scrolling tile actually reaches its own
// anchor; this pin only confirms the file is still there, not that it still
// passes (that is `check-pointer.mjs`'s own job, run separately against a
// live dev server — see its header for why it cannot run inside this
// static, no-browser check).
const CHECK_POINTER_FILE = path.join(HERE, "..", "..", "verify", "agent-tab-strip-fit", "check-pointer.mjs");
if (!fs.existsSync(CHECK_POINTER_FILE)) {
  findings.push(
    "verify/agent-tab-strip-fit/check-pointer.mjs is missing — the v1.2.126 real-pointer-click proof for the " +
      "shrink-mode strip's pinned and scrolling tiles must stay on disk beside this check.",
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
    "shrink-mode outcome: verify/agent-tab-strip-fit/page.tsx's own measurements at 1, 3, 5 and 8 tabs; live " +
    "proof of class-list parity between the two modes: that same file's measureClassParity, pinned here; live " +
    "proof of real-pointer hit-testing: check-pointer.mjs, pinned here too.",
);
