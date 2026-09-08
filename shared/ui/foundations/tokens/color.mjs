/* ============================================================================
   color.mjs — sRGB parsing, alpha compositing, and the one contrast number.

   Small on purpose. It parses the colour forms `tokens.css` actually contains
   and refuses everything else out loud, because a colour maths module that
   guesses is worse than one that stops: a wrong number reads exactly like a
   right one, and the check built on top of this file is being asked to be the
   thing nobody has to check by eye.

   TWO THINGS HERE ARE NOT DECORATION.

   1 · ALPHA IS COMPOSITED, NOT IGNORED. `--accent` is `rgba(26,25,24,.05)` and
       `--hair` is charcoal at 8%: a well and a hairline are TRANSLUCENT, so
       their real colour is a function of what is behind them. Measuring the
       declared rgba against a backdrop as if it were opaque gives an
       enormously wrong answer in the safe direction — it makes a wash look
       like a solid step — which is the one direction a legibility check must
       never be wrong in. Every translucent value is flattened over its
       resolved backdrop first, which is also what the browser does.

   2 · THE RATIO IS WCAG'S ARITHMETIC AND NOT WCAG'S JUDGEMENT. (L1+.05)/(L2+.05)
       over linearised sRGB is simply how "how different are these two
       colours" is computed everywhere, including in every number already
       written into this repo's CHANGELOG — 1.103, 1.198, 17.06. Using the
       same arithmetic is what lets the law's output be compared with the
       kit's own record. WCAG's THRESHOLDS are a separate matter and are
       argued, not imported, in `check-contrast.mjs`.
   ========================================================================= */

/** A parsed colour: 0-255 channels plus 0-1 alpha. */
export function parseColor(input) {
  if (typeof input !== "string") return null;
  const value = input.trim();

  if (value === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  let m = /^#([0-9a-fA-F]{3,8})$/.exec(value);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) {
      const [r, g, b, a] = [...h].map((c) => parseInt(c + c, 16));
      return { r, g, b, a: h.length === 4 ? a / 255 : 1 };
    }
    if (h.length === 6 || h.length === 8) {
      const n = (i) => parseInt(h.slice(i, i + 2), 16);
      return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
    }
    return null;
  }

  m = /^rgba?\(\s*([^)]+)\)$/.exec(value);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const num = (s) => (s.endsWith("%") ? (parseFloat(s) / 100) * 255 : parseFloat(s));
    const [r, g, b] = parts.slice(0, 3).map(num);
    let a = 1;
    if (parts[3] !== undefined) {
      a = parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    }
    if ([r, g, b, a].some((n) => Number.isNaN(n))) return null;
    return { r, g, b, a };
  }

  /* The one shape tokens.css uses: `color-mix(in srgb, <colour> N%, transparent)`,
     which is that colour at N% alpha and nothing more exotic. Anything else in
     the color-mix family is refused rather than approximated. */
  m = /^color-mix\(\s*in\s+srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*transparent\s*\)$/i.exec(value);
  if (m) {
    const base = parseColor(m[1]);
    if (!base) return null;
    return { ...base, a: base.a * (parseFloat(m[2]) / 100) };
  }

  return null;
}

/** Flatten `fg` (which may be translucent) over the opaque `bg`. */
export function composite(fg, bg) {
  if (fg.a >= 1) return { ...fg, a: 1 };
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

const channel = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export function luminance({ r, g, b }) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Contrast between two OPAQUE colours. Both must already be composited —
 * this function will not silently flatten for you, because the backdrop a
 * translucent colour should be flattened over is a fact about the DOM and
 * not a fact this file can know.
 */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Two decimal places, the way every number in this repo's CHANGELOG is written. */
export const fmt = (n) => n.toFixed(3).replace(/0$/, "");

/** `#rrggbb`, for printing a composited value back to a human. */
export function hex({ r, g, b }) {
  const h = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}
