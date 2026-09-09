/* ============================================================================
   THE PICTURE LAW — a picture FILLS its box. It is never letterboxed to fit.

   THE CLIENT'S SENTENCE, 9 Sep 2026: *"everywhere for images: do fill, not
   fit!"*

   Said in CSS: `object-fit: cover`. The picture is scaled until it covers the
   frame and the overflow is trimmed. **A wide logo losing its ends is the
   INTENDED CONSEQUENCE**, not a side effect to design around — the client
   named the trade when she made the ruling, and this law exists so nobody
   re-litigates it component by component.

   `docs/RULES.md` §4.4 is the prose. This file is the same sentence, executed.

   ----------------------------------------------------------------------------
   WHY THIS ONE HAD TO BE MACHINE-CHECKED, AND NOT LEFT AS PROSE

   Because the census that produced it was wrong, and wrong in a way a person
   cannot fix by being more careful.

   A hand-run grep across both repositories on the day of the ruling reported
   **nine `object-contain` against eleven `object-cover`**, four of the nine in
   this kit. It missed two, and it missed them for the same reason: a fit is
   not always spelled as a class.

     · `components/gallery/gallery.tsx` letterboxed every tile on the wall —
       written `<Image fit="contain">`, a PROP.
     · the consuming app's `attachment-preview.tsx` does the same thing the
       same way.

   Neither contains the string `object-contain`. The gallery is the single
   most visible picture surface either product draws, and it was invisible to
   the count that was supposed to find it. So this law reads BOTH SPELLINGS —
   the utility and the `fit` prop — and derives its own census on every run
   rather than trusting one taken by hand on one afternoon.

   ----------------------------------------------------------------------------
   THE VOCABULARY IS CLOSED, WHICH MAKES THIS LAW SHAPED DIFFERENTLY FROM
   `borders.mjs`, AND THAT IS DELIBERATE

   The boundary law enumerates the EXCEPTIONS and treats everything else
   matching `border…` as a stroke, because Tailwind can always grow a
   fourteenth spelling of a border. `object-fit` cannot: CSS defines exactly
   five values, they have not changed since the property shipped, and a sixth
   would be a CSS Working Group decision rather than a Tailwind release. So
   here the SUBJECT is enumerated and everything else under `object-*` is
   passed over as `object-position` — which is a different property, decides
   nothing this ruling is about, and is genuinely none of this law's business.

     cover        the ruling.                              PASSES.
     contain      letterboxes. The thing overruled.        FINDING.
     fill         stretches to the box, distorting it.     FINDING — and worth
                  saying out loud, because "fill" is the client's own word for
                  what she wants and `object-fit: fill` is not it. Cover fills
                  the box honestly; `fill` fills it by squashing the picture.
                  A law that let this through on the strength of its name
                  would ship the one result nobody asked for.
     none         natural size, clipped by the frame.      FINDING.
     scale-down   `none` or `contain`, whichever is smaller — so it letterboxes
                  every picture larger than its box, which is all of them.
                  FINDING.

   Both the utility (`object-contain`, `md:object-contain`,
   `data-[state=open]:object-none`, `object-[contain]`) and the prop
   (`fit="contain"`, `fit={"contain"}`, and a component's own destructuring
   default `fit = "contain"`) are read. An inline `style={{ objectFit: … }}`
   is read too; the box model does not care which syntax reached it.

   ----------------------------------------------------------------------------
   WHAT IT DELIBERATELY DOES NOT CHECK

     · WHETHER A PICTURE HAS A FIT AT ALL. An `<img>` at its natural size in a
       box nobody sized needs no `object-fit`, and there are several in this
       kit. A clause demanding one on every picture would put `object-cover`
       on every glyph-shaped `<img>` in the system to satisfy a scanner. The
       pictures are COUNTED instead, and the count is what the blindness
       tripwire stands on — see below.
     · `background-image` with `background-size: contain`. That is genuinely
       this law's subject: it is the same decision reached by a different
       property. It is not in this kit's source at all today — zero matches
       across `components/`, `compositions/`, `lib/` and `foundations/` — and
       a clause with no subject is a clause nobody has tested. Named here,
       deliberately unwritten, so the next reader knows it was weighed rather
       than missed. `borders.mjs` leaves `divide-*` unwritten for the same
       reason and in the same words.
     · WHAT BOX THE PICTURE RESERVES. `ratio` is a composition's decision.
       This law rules on what happens INSIDE the box, whatever its shape.
     · WHICH PICTURE HAS A REAL CLAIM TO LETTERBOX. There is one in this kit
       and it is `image.tsx`'s own `fit="contain"` branch — an opt-in the
       ruling does not reach, because the ruling is about the DEFAULT and that
       default is already `cover`. That is a JUDGEMENT, so it is recorded the
       way this repo records judgements: as exemption DATA with a reason,
       rot-checked in `source.mjs`, so the day the branch is deleted the
       exemption goes red and drags itself out.

   ----------------------------------------------------------------------------
   THE BLINDNESS TRIPWIRE, AND WHY IT IS NOT THE ONE `borders.mjs` HAS

   The boundary law's only way to pass while blind is a walk that read no
   classes. This law has a second, sharper one, and it is the failure that
   actually happened: **a run that saw pictures and could not see a single
   decision about how they fill.** Fits written in a `.css` file this scanner
   does not read, or arriving through a variable, produce exactly that — a
   green run over a directory full of letterboxed images.

   So: if the walk found elements carrying a `src` and judged ZERO fits, in
   classes, in props and in inline styles, the run is BLIND, not clean. Absence
   of evidence is reported as absence of evidence.

   ----------------------------------------------------------------------------
   DO NOT SWITCH THIS OFF TO GET A BUILD GREEN.

   The remedy is one word in every case. An exemption is the honest move when
   a picture genuinely must be seen whole — say which component, say why in a
   sentence, and the rot check will delete it for you the day it stops being
   true. Deleting the law's call site instead removes the only thing that
   would have told the next person.
   ========================================================================= */

import { classLists, utilities, excuses, styleSpans, readSource, lineAt } from "./source.mjs";

export const LAW = "images";

/** The five values CSS gives `object-fit`, and nothing else is one. */
const LETTERBOXES = new Set(["contain", "fill", "none", "scale-down"]);
const FILLS = "cover";

/** Why each refused value is refused, printed with the finding. */
const WHY = {
  contain: "letterboxes — the picture shrinks to fit and leaves the frame showing around it",
  fill: "stretches the picture to the frame, distorting it. `fill` is not the client's `fill`",
  none: "draws the picture at its natural size and clips whatever misses the frame",
  "scale-down": "`none` or `contain`, whichever is smaller — so it letterboxes anything bigger than its box",
};

const REMEDY =
  "`object-cover` — the picture fills the frame and the overflow is trimmed. " +
  "A wide logo losing its ends is the ruling, not a bug. If this picture genuinely " +
  "must be seen whole, add an exemption with a sentence saying why.";

/**
 * The `object-fit` value a utility names, or null when it names something else.
 * `object-center`, `object-[50%_50%]` and friends are `object-position`, a
 * different property; they are counted and passed over rather than judged.
 */
function fitOf(base) {
  if (!base.startsWith("object-")) return null;
  let value = base.slice(7);
  // `object-[contain]` — the arbitrary spelling of the same five words.
  if (value.startsWith("[") && value.endsWith("]")) value = value.slice(1, -1);
  if (value === FILLS || LETTERBOXES.has(value)) return value;
  return null;
}

/* `fit` BOUND TO ONE OF THE FIVE WORDS BY NAME. Two shapes reach this, and
   catching both is the point rather than an accident:

     · `fit="contain"` — a JSX attribute. The spelling that hid the gallery
       from the hand census.
     · `fit = "contain"` — a destructuring default in a component's own
       signature, which is a component deciding to letterbox for every caller
       who says nothing. That is the ruling's actual subject, and it is
       strictly worse than one call site asking for it.

   `(?!=)` after the `=` is what keeps `fit === "contain"` out: a comparison
   inside `image.tsx` is the component IMPLEMENTING the prop, not anybody
   choosing a value, and it is already the exempted branch below. */
const FIT_PROP = /\bfit\s*=(?!=)\s*(?:"([a-z-]+)"|\{\s*"([a-z-]+)"\s*\})/g;

/** `objectFit: "contain"` or `object-fit: contain` inside a style object. */
const INLINE_FIT = /\bobject-?[Ff]it\s*:\s*["']?([a-z-]+)/g;

/** A JSX element carrying a `src` — the shape of "a picture", whoever drew it. */
const PICTURE = /<[A-Za-z][\w.]*(?:\s[^<>]*)?\ssrc\s*=/g;

export function run({ files, exemptions }) {
  const findings = [];
  const excused = [];
  let classListsRead = 0;
  let declinedLiterals = 0;
  let pictures = 0;
  let fitsJudged = 0;
  let covers = 0;
  let positions = 0;
  let fitProps = 0;

  /** One finding, routed through the exemption list. */
  const judge = (file, line, value, what) => {
    fitsJudged++;
    if (value === FILLS) {
      covers++;
      return;
    }
    const f = { file, line, what: `${what} — ${WHY[value]}`, remedy: REMEDY };
    const ex = exemptions.find((e) => excuses(e, LAW, file, what));
    (ex ? excused : findings).push(ex ? { ...f, ex } : f);
  };

  for (const file of files) {
    const { lists, declined } = classLists(file);
    declinedLiterals += declined;
    classListsRead += lists.length;

    for (const l of lists)
      for (const u of utilities(l.text)) {
        if (!u.base.startsWith("object-")) continue;
        const value = fitOf(u.base);
        /* `object-position` — where the picture sits inside the frame once it
           has filled it. A different property, and a legitimate companion to
           `object-cover` rather than an evasion of it. */
        if (value === null) { positions++; continue; }
        judge(file, l.line, value, u.raw);
      }

    const { src } = readSource(file);

    for (const m of src.matchAll(PICTURE)) { void m; pictures++; }

    for (const m of src.matchAll(FIT_PROP)) {
      const value = m[1] ?? m[2];
      if (value !== FILLS && !LETTERBOXES.has(value)) continue;
      fitProps++;
      judge(file, lineAt(src, m.index), value, `fit="${value}"`);
    }

    for (const s of styleSpans(file))
      for (const m of s.text.matchAll(INLINE_FIT)) {
        const value = m[1];
        if (value !== FILLS && !LETTERBOXES.has(value)) continue;
        judge(file, s.line, value, `object-fit: ${value} in a style={{ … }} object`);
      }
  }

  /* THE BLINDNESS TRIPWIRE — see the header. The second clause is the one
     that matters: a walk full of pictures and empty of decisions about them
     has not measured this law's subject, and saying "OK" there would be the
     hand census's own failure rebuilt inside the machine that replaced it. */
  const blind = [];
  if (files.length === 0) blind.push("no source files were walked");
  if (classListsRead === 0)
    blind.push("no class list was read in the whole walk — the census is blind, not clean");
  if (pictures > 0 && fitsJudged === 0)
    blind.push(
      `${pictures} element(s) carrying a \`src\` were found and NOT ONE object-fit was ` +
        "readable — in a class, in a `fit` prop or in an inline style. Every picture here " +
        "is filling its box in a way this law cannot see (a `.css` file, a variable, a " +
        "lookup), so this run is the absence of evidence and not evidence of absence",
    );

  return {
    law: LAW,
    title: "picture law — a picture fills its box, and is never letterboxed to fit",
    derived: [
      ["class lists read", classListsRead, ""],
      ["pictures seen (elements carrying a `src`)", pictures, ""],
      ["object-fit decisions judged", fitsJudged, ""],
      ["`cover` — the ruling, already obeyed", covers, ""],
      ["`fit` set to one of the five by name", fitProps, "prop, or a component's own default"],
      ["`object-*` position utilities passed over", positions, "a different property"],
    ],
    unseen: [
      ["literals declined as prose or interpolated", declinedLiterals],
      ["`background-size: contain` — this law's subject, deliberately unwritten", 0],
      ["pictures with no object-fit at all — not this law's business", Math.max(0, pictures - fitsJudged)],
    ],
    findings,
    excused,
    blind,
  };
}
