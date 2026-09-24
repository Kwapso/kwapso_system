"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

/* ============================================================================
   The one icon wrapper. Every export is this component with a different
   `viewBox` and `children` baked in by generate-icons.mjs.

   THE ART IS PHOSPHOR (MIT), fill weight by default, with a NAMED LIST OF
   REGULAR-WEIGHT EXCEPTIONS THAT IS NOT KEPT HERE. Client ruling, verbatim,
   2026-09-03, which started the list at three (Plus, Power, Prohibit): those
   "take names from Phosphor... the only icons that we are using are these
   icons from Phosphor." Fill wraps a bare mark (a plus, a power glyph, a
   prohibit circle) in a solid disc or square, which reads as a heavy badge
   rather than a lean glyph for an action icon; regular keeps them a thin
   outline.

   THIS COMMENT SAID "three named exceptions — Plus, Power and Prohibit"
   UNTIL 24 SEP 2026, AND HAD BEEN WRONG SINCE 6 SEP 2026. Her rulings kept
   coming (X, DotsThree, DotsThreeVertical, MagnifyingGlass, Paperclip,
   Asterisk, Check, Waves, the whole Arrow* family) and none of them edited
   this paragraph, so a prose count of three sat over 111 regular-weight
   files. ATTRIBUTION.md's own §Weight says why that shape is dangerous:
   "A weight rule that lives only in prose drifts silently from the art it
   describes." So this paragraph names no count and no list any more.

   THE LIST IS foundations/icons/ATTRIBUTION.md §Weight — every exception,
   with the ruling and the date that put it there — and the MACHINE-READABLE
   truth is icon-art.manifest.json, which records each glyph's verified
   upstream name and weight and is enforced offline by check-icon-art.mjs in
   `npm run check`. Read those, never this.

   MOST RECENT ENTRY: `Check` (Phosphor `check`, regular) is the tick on the
   ticket stage ladder's mark, on Aurora's ruling of 24 Sep 2026 — "icon on
   completed stages shoudl be phospor check regular". `Check` was already
   regular here (6 Sep 2026); her ruling moved the CALL SITE
   (components/status-stepper/status-stepper.tsx) off `CheckFat`, which is
   Phosphor's separate `check-fat` glyph at fill weight.

   Swapping in different art means replacing icons/<Name>.svg and re-running
   the generator. No call site and no component changes — that is the whole
   point of the split.

   Fill weight means SOLID SHAPES, not strokes: the art is closed paths,
   filled, with holes cut by opposite path winding where a glyph needs one
   (a gear's centre, a letter's counter). There is nothing to weight, so
   `strokeWidth` is gone rather than kept as a dead prop — the client asked
   for no leftover machinery from the pack this replaces.
   ========================================================================= */

/**
 * The delivery sizes, in px as the commission names them.
 *
 * 28 is the sixth and it arrived late: 27.42 draws the module wall's icon at
 * 28 and the ladder had five. Client ruling T2, 2026-08-23 -- admit it rather
 * than snap the tile to 24 or 32, because the wall is the front door of the
 * product and the artifact drew it deliberately. verify/decisions.html T.
 */
export const ICON_SIZES = [16, 20, 22, 24, 28, 32] as const;
export type IconSize = (typeof ICON_SIZES)[number];

/** px -> the token that holds it. No component ever writes the px itself. */
const SIZE_TOKEN: Record<IconSize, string> = {
  16: "var(--icon-16)",
  20: "var(--icon-20)",
  22: "var(--icon-22)",
  24: "var(--icon-24)",
  28: "var(--icon-28)",
  32: "var(--icon-32)",
};

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  /**
   * One of the six delivery sizes, or any number / CSS length.
   *
   * A bare number is read as px-at-the-16px-authoring-base and converted to
   * rem, so `size={16}` scales with the text-size control instead of pinning
   * itself. That is deliberate and is the behaviour commission rule 5 asks
   * for.
   */
  size?: IconSize | number | string;
  /**
   * Accessible name. When set the icon becomes `role="img"` and announces;
   * when absent it is `aria-hidden` decoration, which is right for an icon
   * sitting beside its own label.
   *
   * It is a prop, not a hardcoded string, because both apps run in Arabic,
   * Urdu and Persian and a string baked into a component cannot be
   * translated.
   */
  title?: string;
}

function resolveSize(size: IconProps["size"]): string {
  if (size === undefined) return SIZE_TOKEN[24];
  if (typeof size === "number") {
    return (SIZE_TOKEN as Record<number, string | undefined>)[size] ?? `${size / 16}rem`;
  }
  const asNumber = Number(size);
  if (!Number.isNaN(asNumber)) {
    return (SIZE_TOKEN as Record<number, string | undefined>)[asNumber] ?? `${asNumber / 16}rem`;
  }
  return size;
}

export interface CreateIconOptions {
  displayName: string;
  viewBox: string;
  children: React.ReactNode;
}

export function createIcon({ displayName, viewBox, children }: CreateIconOptions) {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size, title, className, ...props },
    ref
  ) {
    const dimension = resolveSize(size);
    const labelled = title !== undefined || props["aria-label"] !== undefined;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        width={dimension}
        height={dimension}
        /* THE WHOLE SET IS FILLED, so the root paints the fill and the art
           carries only geometry. The art still names no colour of its own,
           which is how an icon works in both themes for free — it takes the
           ink of whatever it sits in. A child path that names its own fill
           (rare — Phosphor's art is single-tone) would still beat this one,
           same rule as before. */
        fill="currentColor"
        focusable="false"
        aria-hidden={labelled ? undefined : true}
        role={labelled ? "img" : undefined}
        /* className last, so a caller's sizing utilities beat the width and
           height attributes set above. */
        className={cn("shrink-0", className)}
        {...props}
      >
        {title !== undefined ? <title>{title}</title> : null}
        {children}
      </svg>
    );
  });

  Icon.displayName = displayName;
  return Icon;
}

export type IconComponent = ReturnType<typeof createIcon>;
