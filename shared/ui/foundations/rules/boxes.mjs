/* ============================================================================
   THE BOX LAW — a container is told from its ground by a TONE or a GAP, never
   by a stroke around it.

   `docs/RULES.md` §2.8, and the client's sentence that made it, 23 September
   2026, verbatim: *"by rule no borders nowhere in the kit"*.

   ----------------------------------------------------------------------------
   WHY THIS IS A SECOND LAW AND NOT A CLAUSE INSIDE `borders.mjs`

   `borders.mjs` already forbids a CSS `border`, and the kit already obeyed
   it: on the run before this file existed it judged 17 border utilities and
   every one was a reviewed exception — a spinner's arc, a drop target's
   dashed edge. So the strokes she was looking at were never `border`s at
   all. They were the kit's own REMEDY for a border, an inset shadow, which
   `borders.mjs` names as blessed and therefore cannot see. That is the whole
   of the gap, and it is the same failure the picture law found in §13: a law
   written against one spelling passes green while the thing it exists to
   prevent is drawn in another.

   The two laws are one argument read from opposite ends. `borders` says "do
   not write the stroke as a border, write it as an inset shadow". `boxes`
   says "and if what you are drawing is a box around a container, do not
   write it at all".

   ----------------------------------------------------------------------------
   WHAT IT DERIVES

   A FOUR-EDGE stroke, in either spelling the kit has:

     · `shadow-[var(--hairline)]`, `--hairline-strong`, `--hairline-error`,
       `--hairline-ink` — the named shapes (tokens.css §12), each of which is
       `inset 0 0 0 1px …` and therefore closes on all four sides.
     · `shadow-[inset_0_0_0_…]` — the same box written out.
     · `boxShadow: "inset 0 0 0 …"` in a `style={{ … }}` object. The box model
       does not care which syntax reached it.

   Variants and state prefixes come for free, because the subject is the
   SHAPE inside the brackets and not the utility's own name:
   `hover:shadow-[var(--hairline)]`, `enabled:focus:shadow-[inset_0_0_0_…]`,
   `data-[state=open]:…` are all read.

   WHAT IT DELIBERATELY DOES NOT READ, and each is named rather than missed:

     · ONE-EDGE SHAPES. `--hairline-under`, `--hairline-over`,
       `--hairline-start`, `--hairline-under-strong`, `--hairline-over-strong`,
       and the written-out `inset 0 -1px 0` / `inset 0 1px 0` / `inset 1px 0 0`.
       A rule BETWEEN two things is a separator, not a box around one, and
       several of them are ruled — the seam inside a card shell, a table's
       row rule, the underline under the current stage label. A law that
       swept those up would be enforcing a sentence nobody said. They are
       COUNTED, so the report says how many were passed over rather than
       leaving a reader to wonder whether the law saw them.
     · OUTLINE AND RING. Focus is ONE global rule (§3.1) and a component
       writes nothing; the focus ring is an outline at an offset and is the
       single stroke the kit blesses everywhere. `borders.mjs` declines these
       for the same reason and this law follows it exactly.
     · WHETHER A FOUR-EDGE STROKE IS ON A CONTAINER. That is a judgement
       about what an element IS, and no class list carries it. So the law
       refuses to guess: EVERY four-edge stroke is a finding until somebody
       writes down which of §2.8's four exceptions it falls under, as
       exemption DATA with a reason, rot-checked in `source.mjs` so a
       component that stops drawing its stroke drags its own exemption out.
       That is the same shape `borders.mjs` uses for the spinner, and it is
       the only mechanism in this repository that has ever kept a judgement
       honest for longer than the session that made it.

   ----------------------------------------------------------------------------
   THE THREE REMEDIES, WHICH ARE WHY THIS LAW IS NOT AUSTERITY

     · THE OTHER PAPER TONE.  §2.6's table: a card takes the other paper from
                              the band it sits in. `check-contrast.mjs` has a
                              measured number for every pair and a floor.
     · A GAP.                 Two cards with air between them need no edge
                              each. §1.2's ladder is where the air comes from.
     · A `Separator`.         For two surfaces of the SAME tone that touch —
                              the one case `Card`'s retired `hairline` prop
                              existed for, and what `variant="plain"` already
                              reaches for after the 21 Sep 2026 ruling.

   ----------------------------------------------------------------------------
   DO NOT SWITCH THIS OFF TO GET A BUILD GREEN.

   An exemption is the honest move when a stroke is genuinely one of the four
   exceptions — say which component, say which exception and why in a
   sentence, and the rot check will delete it for you the day it stops being
   true. Deleting the law's call site instead removes the only thing that
   would have told the next person.
   ========================================================================= */

import { classLists, utilities, excuses, styleSpans } from "./source.mjs";

export const LAW = "boxes";

/** The named shapes that close on all four sides. `--hairline` itself must be
 *  matched with its closing paren so `--hairline-under` cannot answer for it. */
const NAMED_FOUR_EDGE = /--hairline(?:-strong|-error|-ink)?\)/;

/** The named shapes that draw ONE edge. Checked first — a one-edge name is
 *  never this law's subject, however it is prefixed. */
const NAMED_ONE_EDGE = /--hairline-(?:under|over|start)/;

/** `inset 0 0 0 <spread> <colour>` — a box, written out. Tailwind's arbitrary
 *  value joins on underscores, so the separator is `_` in a class and a space
 *  in a style object; both are accepted. */
const WRITTEN_FOUR_EDGE = /inset[_ ]0[_ ]0[_ ]0[_ ]/;

/** ANY other inset shape — `inset 0 -1px 0`, `inset 1px 0 0`. Tested only
 *  AFTER `WRITTEN_FOUR_EDGE` has had its say, because `inset 0 0 0` would
 *  otherwise satisfy a naive "a zero, an offset, a zero" reading of this and
 *  a box would be counted as a separator. A box is EXACTLY `inset 0 0 0
 *  <spread>`; every other inset has a side, so the order of the two tests is
 *  the whole discrimination and is not an accident. */
const WRITTEN_INSET = /inset[_ ]/;

/** A `boxShadow` in a style object. `shadow` alone is not enough — SVG has a
 *  `filter` and React has `textShadow`, and neither is a box. */
const INLINE_SHADOW = /\bbox-?[Ss]hadow\s*:/g;

export function run({ files, exemptions }) {
  const findings = [];
  const excused = [];
  let classListsRead = 0;
  let declinedLiterals = 0;
  let boxesJudged = 0;
  let oneEdgePassedOver = 0;
  let inlineShadowsRead = 0;

  for (const file of files) {
    const { lists, declined } = classLists(file);
    declinedLiterals += declined;
    classListsRead += lists.length;

    for (const l of lists)
      for (const u of utilities(l.text)) {
        if (!/^shadow-\[/.test(u.base)) continue;

        /* FOUR EDGES FIRST, always. See `WRITTEN_INSET` on why the order
           carries the discrimination rather than the patterns. */
        const fourEdge = NAMED_FOUR_EDGE.test(u.raw) || WRITTEN_FOUR_EDGE.test(u.raw);
        if (!fourEdge) {
          /* A SEPARATOR, NOT A BOX. Counted, then passed over — the count is
             what tells a reader this law looked at them and let them go,
             which is a different statement from never having read them. */
          if (NAMED_ONE_EDGE.test(u.raw) || WRITTEN_INSET.test(u.raw)) oneEdgePassedOver++;
          continue;
        }
        boxesJudged++;

        const f = {
          file,
          line: l.line,
          what: `${u.raw} — a stroke closing on all four edges`,
          remedy:
            "if this is a box around a container, take it off: the other paper tone (§2.6's table), " +
            "the gap between two of them, or a `Separator` for two same-tone surfaces that touch. " +
            "If it is one of §2.8's four exceptions — a separator, a focus/selection affordance, a " +
            "form control's own edge, or a stroke that IS the object — say which, as an exemption " +
            "with a reason",
        };
        const ex = exemptions.find((e) => excuses(e, LAW, file, u.base));
        (ex ? excused : findings).push(ex ? { ...f, ex } : f);
      }

    for (const s of styleSpans(file)) {
      for (const m of s.text.matchAll(INLINE_SHADOW)) {
        inlineShadowsRead++;
        /* Read the value, not the property name: a style object may set a
           lift, which is not a box. */
        const value = s.text.slice(m.index, m.index + 200);
        if (!WRITTEN_FOUR_EDGE.test(value) && !NAMED_FOUR_EDGE.test(value)) {
          if (WRITTEN_INSET.test(value) || NAMED_ONE_EDGE.test(value)) oneEdgePassedOver++;
          continue;
        }
        boxesJudged++;
        const f = {
          file,
          line: s.line,
          what: "an `inset 0 0 0 …` box-shadow in a style={{ … }} object — a stroke on all four edges",
          remedy: "the same three remedies; a box written inline is still a box",
        };
        const ex = exemptions.find((e) => excuses(e, LAW, file, "boxShadow"));
        (ex ? excused : findings).push(ex ? { ...f, ex } : f);
      }
    }
  }

  /* THE BLINDNESS TRIPWIRE. This law's subject is a set of class lists and a
     set of style objects, so the one way it goes green while blind is a walk
     that read neither. It has no derived vocabulary to come back empty — the
     shapes are enumerated above — which is worth saying plainly, because the
     radii and palette tripwires guard a derivation and this one has none. */
  const blind = [];
  if (classListsRead === 0)
    blind.push("no class list was read in the whole walk — the census is blind, not clean");
  if (files.length === 0) blind.push("no source files were walked");

  return {
    law: LAW,
    title: "box law — a container is told apart by a tone or a gap, never by a stroke around it",
    derived: [
      ["class lists read", classListsRead, ""],
      ["four-edge strokes judged", boxesJudged, ""],
      ["one-edge shapes passed over (a separator, not a box)", oneEdgePassedOver, ""],
      ["box-shadow declarations read in style objects", inlineShadowsRead, ""],
    ],
    unseen: [
      ["literals declined as prose or interpolated", declinedLiterals],
      ["`outline` / `ring` — §3.1's subject, deliberately unwritten", 0],
    ],
    findings,
    excused,
    blind,
  };
}
