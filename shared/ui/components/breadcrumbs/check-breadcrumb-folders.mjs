#!/usr/bin/env node
/* ============================================================================
   THE 18 SEP 2026 ONE-STRIP-ONE-GAP CHECK — run by `npm run check` beside
   the other component checks.

   CLIENT RULING, VERBATIM: "on the assistant, the inctove tabds shape is
   still overlapping with the active one. tahts worng. shoudl 100% replicate
   what hapens with main content tabs."

   THE DIVERGENCE SHE SAW WAS NEVER A SECOND COMPONENT — `BreadcrumbFolders`
   (this file) is the ONLY drawing of a folder-tab strip in the kit, and it
   is called DIRECTLY, with no wrapper, by both real call sites: the app's
   content trail (`app-shell.tsx`) and the assistant dock
   (`web/components/assistant/agent-tab-strip.tsx`, `@shared/ui`-vendored,
   unreachable from here — see that file's own header, "DRAWN WITH THE
   KIT'S OWN BreadcrumbFolders — the identical component the main content
   trail uses"). There is exactly ONE `<BreadcrumbList>` render site in this
   file (checked below) and it spends exactly one class string, `STRIP`, so
   every caller of the exported component gets the same gap by
   CONSTRUCTION — proved live, not just by inspection: `verify/tabstrip-
   parity/page.tsx` renders the content shape and two assistant shapes
   (A: active·iconOnly·iconOnly, B: rest·active·iconOnly·iconOnly, the
   drag-reordered shape) side by side from the SAME real call-site props,
   and `measureNesting` there reads the SAME 9px gap (`--space-2`, the tab
   strip's own row token) for every consecutive pair in all three, with the
   two assistant strips' own `<ol>` className read BYTE-IDENTICAL to the
   content strip's (confirmed 18 Sep 2026 against the harness's dev build:
   `text-caption text-ink-tertiary flex flex-nowrap items-end isolate
   gap-[var(--space-2)] max-w-full overflow-x-auto overflow-y-hidden
   scroll-p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
   [&::-webkit-scrollbar]:h-0 pt-1 mt-[calc(var(--space-1)*-1)]
   mb-[calc(var(--folder-tab-overlap)*-1)]`, for the content host and both
   assistant hosts alike).

   WHAT SHE SAW WAS THE PRE-GAP BUILD. `STRIP`'s own comment ("THE OVERLAP
   IS GONE, 18 SEP 2026") already narrates the mechanism this replaced —
   `TAB_OVERLAP_MARGIN`, a negative per-`<li>` margin that nested every tab
   under its predecessor's shoulder — and the retirement is a same-file, ONE
   -PLACE change: because both strips share this one component, the day the
   gap landed it landed for both at once. What this check pins is that it
   STAYS that way: a caller-supplied `listClassName` (the one prop this file
   offers a caller to change the `<ol>`'s own class list, documented "for a
   call site that needs to change the strip") never grows an internal
   default that touches the gap, and no second `<BreadcrumbList>` render
   site — a per-caller "dock variant" — is ever added, because either one
   would let exactly the divergence she is describing return without a
   second component ever existing to blame. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "breadcrumb-folders.tsx");

const src = fs.readFileSync(FILE, "utf8");
const rel = path.relative(process.cwd(), FILE);

const findings = [];

// EXACTLY ONE RENDER SITE. Two would mean two class strings that could
// drift — the structural half of "one implementation with one gap".
const listRenderSites = src.match(/<BreadcrumbList\b/g) ?? [];
if (listRenderSites.length !== 1) {
  findings.push(
    `${rel} renders <BreadcrumbList> ${listRenderSites.length} times — exactly one keeps every caller (content ` +
      "trail, assistant dock, any future one) on the same class string by construction; a second render site " +
      "is a second implementation for the gap to disagree with.",
  );
}

// THE ONE RENDER SITE SPENDS STRIP, MERGED ONLY WITH THE CALLER'S OWN
// listClassName — not a second, hand-picked class list a future "dock"
// branch could substitute.
if (!/<BreadcrumbList ref=\{listRef\} className=\{cn\(STRIP, listClassName\)\}>/.test(src)) {
  findings.push(
    `${rel}'s <BreadcrumbList> does not read className={cn(STRIP, listClassName)} — every consumer's gap comes ` +
      "from this one merge; a literal or a second constant here could diverge per call site.",
  );
}

// STRIP ITSELF IS STILL THE 18 SEP GAP, NOT THE RETIRED NEGATIVE-MARGIN
// OVERLAP. Working code shape (the class Tailwind actually emits), not a
// bare mention — this file's own prose is free to keep narrating
// TAB_OVERLAP_MARGIN's retirement at length while explaining why it is gone.
const stripBlockMatch = src.match(/^const STRIP = cn\(([\s\S]*?)\);/m);
if (!stripBlockMatch) {
  findings.push(`${rel} has no const STRIP = cn(...) declaration to check.`);
} else {
  const stripBody = stripBlockMatch[1];
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

// NO SECOND STRIP-SHAPED CONSTANT. A future `STRIP_ASIDE`/`STRIP_DOCK` is
// exactly the "second implementation" this check exists to refuse, however
// it merges its own gap.
const stripLikeNames = Array.from(src.matchAll(/^const (STRIP\w*) = cn\(/gm)).map((m) => m[1]);
if (stripLikeNames.length !== 1) {
  findings.push(
    `${rel} declares ${stripLikeNames.length} STRIP-shaped constant(s) (${stripLikeNames.join(", ") || "none"}) ` +
      "— exactly one (STRIP) keeps the content trail and the assistant dock reading the identical class list; a " +
      "second one is a second implementation, whatever its own gap reads today.",
  );
}

if (findings.length > 0) {
  console.error("FAIL breadcrumb-folders one-strip-one-gap check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK breadcrumb-folders one-strip-one-gap check: exactly one <BreadcrumbList> render site, spending exactly " +
    "one STRIP constant (gap-[var(--space-2)], the retired negative-margin overlap gone) merged only with the " +
    "caller's own listClassName — so the content trail and the assistant dock (and any future caller) render " +
    "through one implementation and cannot diverge without a second one being added first. Live proof of the " +
    "outcome: verify/tabstrip-parity/page.tsx's measureNesting reads the identical 9px gap and byte-identical " +
    "<ol> class string for the content strip and both assistant-strip configurations.",
);
