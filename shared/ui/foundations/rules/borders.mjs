/* ============================================================================
   THE BOUNDARY LAW — a boundary is a fill or an inset shadow, never a border.

   `docs/RULES.md` §2.7: no outline, no hairline, no stroke on a Button, in any
   state; `variant="outline"` does not exist on Button and never will. No
   border on a coloured pill either — *colour is the whole treatment*, kit
   ruling 26. And the appendix's rejection list, in one line: a component that
   separates two things with a stroke has said the same thing twice.

   ----------------------------------------------------------------------------
   WHY THE KIT IS THE ONLY POSSIBLE HOME FOR THIS ONE

   There is no law in the consuming app that checks it. There has never been.
   The kit obeys it — 177 files, and the only strokes left are a spinner's arc
   and a drop target's dashed edge — and the consuming app does not: forty-odd
   `border-b`, `border-t`, `border-primary`, `border-l-2` sites that no test
   has ever read, because the rule lives in a document the app vendors and
   nothing executes. That gap IS the client's sentence about iteration. The
   components arrived; the rule that makes them look like one system did not.

   ----------------------------------------------------------------------------
   THE THREE REMEDIES, WHICH ARE WHY THIS LAW IS NOT AUSTERITY

   The kit does not ask a component to do without a boundary. It asks for one
   of the three shapes that theme correctly:

     · A PAPER STEP.       Two adjacent surfaces in different tones. This is
                           the kit's first answer and the one `check-contrast
                           .mjs` measures — it has a floor of 1.05 and a
                           number for every pair.
     · A FILL.             `bg-border` on a 1px div. `separator.tsx`,
                           `dropdown-menu.tsx`, `status-stepper.tsx` and
                           `stat-grid.tsx` all draw their rule this way. The
                           token is the same one; the box model is not.
     · AN INSET SHADOW.    `shadow-[inset_0_0_0_0.0625rem_var(--border)]`.
                           `date-picker.tsx`, `select.tsx`, `sort-control.tsx`
                           and `tabs.tsx` draw a field's hairline this way, and
                           the contrast law knows how to read it — it resolved
                           1,237 strokes on the last run and DISCHARGES a
                           boundary that a ring carries. A `border` is invisible
                           to that reading. So a stroke written as a border is
                           not merely off-vocabulary: it is a boundary that the
                           kit's own contrast law cannot see, which is how
                           `--surface-idle` at 1.042 came to be legible at all.

   That last sentence is why this law sits beside the contrast law rather than
   anywhere else. The two are one argument.

   ----------------------------------------------------------------------------
   WHAT IT DERIVES

   The subject is the utility GRAMMAR, not a list of class names, so every
   spelling is covered at once: `border`, `border-2`, `border-x`,
   `border-b-[0.0625rem]`, `border-primary`, `hover:border-t`,
   `data-[state=open]:border-s-2`. What is enumerated is the opposite — the
   forms that do NOT paint a stroke — and each is named with its reason:

     · `border-0`, `border-<side>-0`, `border-none`   — removing one.
     · `border-collapse`, `border-separate`,
       `border-spacing-*`                             — table layout, not paint.
     · `bg-border`, `text-border`, `--border`         — the TOKEN named as a
                                                        fill or an ink, which
                                                        is remedy two.

   An inline `style` carrying `border`/`borderTop`/`borderLeft` is read too.
   The box model does not care which syntax reached it.

   ----------------------------------------------------------------------------
   WHAT IT DELIBERATELY DOES NOT CHECK

     · `outline`. Focus is ONE global rule (§3.1) and a component writes
       nothing; the focus ring is an outline at an offset and is the single
       stroke the kit blesses everywhere. A law that read `outline-*` would
       fight §3.1 rather than support it.
     · `divide-*`. Tailwind's row rule compiles to a border on the child, so
       it is genuinely this law's subject — but it is not in this kit's source
       at all today, and a clause with no subject is a clause nobody has
       tested. Named here, deliberately unwritten, so the next reader knows it
       was considered rather than missed.
     · WHETHER A BLESSED HAIRLINE IS IN THE RIGHT PLACE. §2.7 blesses two
       places, form fields and selection controls. Which components those are
       is a judgement, and it is recorded the way this repo records judgements:
       as exemption DATA with a reason each, rot-checked in `source.mjs` so a
       component that stops drawing its stroke drags its own exemption out.

   ----------------------------------------------------------------------------
   DO NOT SWITCH THIS OFF TO GET A BUILD GREEN.

   The remedy is three lines away in every case, and it is in the list above.
   An exemption is the honest move when a stroke is genuinely right — say
   which component, say why in a sentence, and the rot check will delete it
   for you the day it stops being true. Deleting the law's call site instead
   removes the only thing that would have told the next person.
   ========================================================================= */

import { classLists, utilities, excuses, styleSpans } from "./source.mjs";

export const LAW = "borders";

const SIDES = "x|y|t|r|b|l|s|e|inline|block|inline-start|inline-end|block-start|block-end";

/** A `border…` utility that paints nothing. Each with its reason, above. */
const NOT_A_STROKE = new RegExp(
  `^border(?:-(?:${SIDES}))?-0$|` +          // removing one
  `^border-none$|` +
  `^border-(?:collapse|separate)$|` +
  `^border-spacing(?:-.*)?$`                  // table layout
);

const IS_BORDER_UTILITY = new RegExp(`^border(?:-(?:${SIDES}))?(?:-.+)?$`);

/* An inline style that sets a border shorthand or one side of one. The
   negative lookahead keeps `border-radius` / `borderRadius` out: a corner is
   the shape law's subject, not this one's. */
const INLINE_BORDER =
  /\bborder(?:Top|Right|Bottom|Left|Block|Inline|BlockStart|BlockEnd|InlineStart|InlineEnd)?(?:Width|Style|Color)?\s*:|\bborder(?:-(?:top|right|bottom|left|block|inline))?(?:-(?:width|style|color))?\s*:/g;
const INLINE_RADIUS = /\bborder-?[Rr]adius/;

export function run({ files, exemptions }) {
  const findings = [];
  const excused = [];
  let classListsRead = 0;
  let declinedLiterals = 0;
  let bordersJudged = 0;
  let removals = 0;
  let tokenAsFill = 0;

  for (const file of files) {
    const { lists, declined } = classLists(file);
    declinedLiterals += declined;
    classListsRead += lists.length;

    for (const l of lists)
      for (const u of utilities(l.text)) {
        /* Remedy two, counted rather than ignored: the token named as a fill
           or an ink is the shape this law is pushing components towards, so
           the number of times it is already used belongs in the report. */
        if (u.base === "bg-border" || u.base === "text-border") { tokenAsFill++; continue; }
        if (!IS_BORDER_UTILITY.test(u.base)) continue;
        if (NOT_A_STROKE.test(u.base)) { removals++; continue; }
        bordersJudged++;

        const f = {
          file,
          line: l.line,
          what: `${u.raw} — a CSS border`,
          remedy:
            "a paper step (two surfaces, different tones), `bg-border` on a 1px element, " +
            "or shadow-[inset_0_0_0_0.0625rem_var(--border)] — which the contrast law can also read",
        };
        const ex = exemptions.find((e) => excuses(e, LAW, file, u.base));
        (ex ? excused : findings).push(ex ? { ...f, ex } : f);
      }

    for (const s of styleSpans(file)) {
      for (const m of s.text.matchAll(INLINE_BORDER)) {
        const at = s.text.slice(Math.max(0, m.index - 2), m.index + 20);
        if (INLINE_RADIUS.test(at)) continue;
        bordersJudged++;
        const f = {
          file,
          line: s.line,
          what: `${m[0].replace(/\s*:$/, "")} in a style={{ … }} object — a CSS border`,
          remedy: "the same three remedies; a stroke written inline is still a stroke",
        };
        const ex = exemptions.find((e) => excuses(e, LAW, file, m[0]));
        (ex ? excused : findings).push(ex ? { ...f, ex } : f);
      }
    }
  }

  /* THE BLINDNESS TRIPWIRE. This law's whole subject is a set of class names,
     so the one way it goes green while blind is a walk that read no classes.
     It has no derived vocabulary to come back empty — which is worth saying
     plainly, because the OTHER two laws' tripwires guard a derivation and
     this one has none to guard. */
  const blind = [];
  if (classListsRead === 0)
    blind.push("no class list was read in the whole walk — the census is blind, not clean");
  if (files.length === 0) blind.push("no source files were walked");

  return {
    law: LAW,
    title: "boundary law — a fill or an inset shadow, never a border",
    derived: [
      ["class lists read", classListsRead, ""],
      ["border utilities judged", bordersJudged, ""],
      ["`border-*-0` / `border-none` (removing one)", removals, ""],
      ["`bg-border` / `text-border` (the token as a fill)", tokenAsFill, ""],
    ],
    unseen: [
      ["literals declined as prose or interpolated", declinedLiterals],
      ["`divide-*` — this law's subject, deliberately unwritten", 0],
    ],
    findings,
    excused,
    blind,
  };
}
