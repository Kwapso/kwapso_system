/* ============================================================================
   THE PALETTE LAW — every colour resolves through a token, and the raw ramp
   is nobody's business but tokens.css's.

   `docs/RULES.md` §2.2 (no hex, rgb(), hsl() or named colour in a `.tsx` file,
   ever) and §8.3 (the raw palette `--kw-*` is internal). Two sentences, one
   law, because they are the same sentence read at two depths: a component may
   not name a COLOUR, and it may not name the NAME of a colour either.

   ----------------------------------------------------------------------------
   WHY BOTH HALVES, AND WHY THE SECOND IS THE ONE WITH TEETH

   `#FED069` in a component is obvious once anybody looks. The kit has looked,
   and there are nine hex literals left in 177 files. The half nobody looks at
   is `var(--kw-mango)`. It reads like a token — it has the `--` and the
   `var()` and it lands on exactly the right yellow — and it is a component
   reaching past every semantic layer the kit has, straight into the raw ramp.

   THE DIFFERENCE IS WHAT HAPPENS IN DARK. `--kw-mango` is `#FED069` in both
   palettes because it is a PIGMENT, not a role. `--primary` is the role, and
   the role is what the dark block re-points. A component that writes
   `var(--kw-mango)` has opted out of theming without writing a single thing
   that looks wrong, and it will keep looking right until somebody opens the
   app at night. This is `docs/RULES.md` §2.1's failure — a colour defined in
   one mode only — arriving through the other door.

   ----------------------------------------------------------------------------
   WHAT IT DERIVES, AND WHY THE `--kw-` PREFIX IS NOT THE TEST

   The obvious check is "no component contains the string `--kw-`". It is
   wrong, and the kit's own source proves it in three files:

       breadcrumb-folders.tsx   --kw-crumb-rest, --kw-crumb-live
       description-list.tsx     --kw-dl-col, --kw-dl-label
       kanban.tsx               --kw-kanban-col

   None of those is in the ramp. None of them is in tokens.css at all. They
   are component-local custom properties — a column width, a label column, a
   paper the component sets on itself and reads back one line later — that
   happen to have been named with the house prefix. A prefix check reports all
   five, and a law whose findings are all false is switched off within a week.

   SO THE SUBJECT IS DERIVED FROM tokens.css: a `--kw-*` name is the raw ramp
   IF AND ONLY IF tokens.css DECLARES it. Seventeen names do, today. Admit an
   eighteenth pigment tomorrow and it is covered the moment it is declared,
   with no edit here. Rename one and the old name stops being the ramp, which
   is also correct. The check reprints the derived count, so a derivation that
   silently returns zero is visible instead of green.

   ----------------------------------------------------------------------------
   THE FIVE POSITIONS A COLOUR CAN REACH THE SCREEN

   1 · AN ARBITRARY CLASS VALUE  `bg-[#FED069]`, `text-[rgb(26,25,24)]`.
   2 · AN INLINE STYLE OBJECT    `style={{ background: "#26241F" }}`.
   3 · A TAILWIND RAMP           `bg-amber-500`, `text-slate-400`. This is the
       one place a NAME is checked against a foreign vocabulary rather than
       derived, and it has to be: Tailwind's eleven-family ramp is not in this
       repo and cannot be read out of it. What IS derived is the property
       prefix set — the utilities that take a colour — so a family name alone
       (`slate`, in a variant table, in a prop) is never mistaken for a colour.
   4 · AN SVG PAINT ATTRIBUTE    `fill="#4285F4"`, `stroke={...}`. A glyph
       drawn in the markup is as painted as a div; the consuming app's Google
       button is the case that argued for this clause, and it is exactly the
       kind of thing that earns an exemption rather than escapes the census.
   5 · THE RAW RAMP              `var(--kw-mango)`, anywhere in the file.

   ----------------------------------------------------------------------------
   WHAT IT DELIBERATELY DOES NOT CHECK

     · A COLOUR IN A CANVAS OR 2D CONTEXT. `ctx.fillStyle = "#ffffff"` in the
       consuming app's `web/lib/image.ts` flattens a transparent PNG before it
       is encoded as a JPEG. It is not CSS, it cannot inherit a theme, and
       there is no token whose job it is — the white it needs is the white of
       the JPEG format's missing alpha, not the white of the paper. Reporting
       it would teach the reader that this law's findings need triage, which
       is the property a law cannot afford.
     · WHETHER THE RIGHT TOKEN WAS CHOSEN. `check-contrast.mjs` owns that
       question and owns it well; this law is upstream of it and stops where
       it starts. A component that passes here and picks `--dot-building` on
       soft paper is caught there, by measurement, not here, by vocabulary.
     · A COLOUR ARRIVING THROUGH A PROP OR A VARIABLE. `background: entry.color`
       in `chart.tsx` is a data colour supplied by the chart series at runtime,
       which is the one legitimate way a colour is not in the source. Counted
       and printed; never failed.
   ========================================================================= */

import { readTokenModel } from "../tokens/token-model.mjs";
import { classLists, utilities, excuses, styleSpans, paintAttributes, readSource, lineAt } from "./source.mjs";

export const LAW = "palette";

/* A colour written out, in any of the four CSS spellings. `#0000` is included
   on purpose: a four-digit hex is a colour with an alpha, and the kit uses it
   to mean "transparent", which is still a value written where a token belongs. */
const RAW_COLOUR =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\s*\(/;

/* Tailwind's own ramp families. THE ONE FOREIGN VOCABULARY IN THIS FILE, and
   it is foreign by construction: these names live in Tailwind, not here, so
   there is nothing in this repository to derive them from. They are matched
   only in a colour-taking utility position (below), so the word `rose` in a
   variant table or a person's name is never a finding. */
const RAMPS =
  "slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

/* The utilities that take a colour. Derived in the sense that matters — from
   what a colour utility IS, a property that paints — rather than enumerated
   from Tailwind's docs. `bg-slate-500` is a colour; `basis-slate-500` is not
   a utility at all and needs no opinion. */
const PAINTS = "bg|text|border|divide|outline|ring|shadow|accent|caret|decoration|fill|stroke|from|via|to|placeholder";

const RAMP_UTILITY = new RegExp(`^(?:${PAINTS})-(?:${RAMPS})-\\d{2,3}$`);

/** The raw ramp, read out of tokens.css rather than off the `--kw-` prefix. */
export function rawRamp(tokensCss) {
  const model = readTokenModel(tokensCss);
  const ramp = new Set();
  for (const k of model.light.keys()) if (k.startsWith("--kw-")) ramp.add(k);
  for (const k of model.darkMap.keys()) if (k.startsWith("--kw-")) ramp.add(k);
  return { ramp, structural: model.structural };
}

export function run({ files, tokensCss, exemptions }) {
  const { ramp, structural } = rawRamp(tokensCss);
  const findings = [];
  const excused = [];
  let classListsRead = 0;
  let declinedLiterals = 0;
  let styleSpansRead = 0;
  let paintsRead = 0;
  let runtimeColours = 0;

  const file0 = (file, line, what, remedy, key) => {
    const f = { file, line, what, remedy };
    const ex = exemptions.find((e) => excuses(e, LAW, file, key));
    (ex ? excused : findings).push(ex ? { ...f, ex } : f);
  };

  for (const file of files) {
    /* 1 & 3 · class positions */
    const { lists, declined } = classLists(file);
    declinedLiterals += declined;
    classListsRead += lists.length;
    for (const l of lists)
      for (const u of utilities(l.text)) {
        if (RAMP_UTILITY.test(u.base))
          file0(file, l.line, `${u.raw} — a Tailwind ramp, not a kit token`,
            "name what the colour MEANS: warning, success, destructive, muted, primary, or chart-1…5", u.base);
        else if (RAW_COLOUR.test(u.base))
          file0(file, l.line, `${u.raw} — a colour written into a class`,
            "put the value in tokens.css under a name, then use that name", u.base);
      }

    /* 2 · inline style objects */
    for (const s of styleSpans(file)) {
      styleSpansRead++;
      if (RAW_COLOUR.test(s.text))
        file0(file, s.line, `a raw colour inside style={{ … }}: ${(s.text.match(RAW_COLOUR) ?? [""])[0]}`,
          "a style object may carry a var(--token); it may not carry the value", s.text.slice(0, 60));
      else if (/\b(?:background|backgroundColor|color|fill|stroke|borderColor)\s*:/.test(s.text) &&
               !/var\(--/.test(s.text)) runtimeColours++;
    }

    /* 4 · SVG paint attributes */
    for (const p of paintAttributes(file)) {
      paintsRead++;
      if (RAW_COLOUR.test(p.value))
        file0(file, p.line, `${p.attr}="${p.value}" — a colour painted into the markup`,
          "currentColor, or fill=\"var(--token)\"; a third-party mark that must keep its own colours is an exemption",
          p.value);
    }

    /* 5 · the raw ramp, anywhere in the file */
    const { src } = readSource(file);
    for (const m of src.matchAll(/--kw-[A-Za-z0-9_-]+/g)) {
      if (!ramp.has(m[0])) continue;
      file0(file, lineAt(src, m.index), `${m[0]} — the raw palette, reached past every semantic layer`,
        "use the ROLE token that points at it (--primary, --card, --ink-secondary …); the ramp is tokens.css's alone",
        m[0]);
    }
  }

  /* THE BLINDNESS TRIPWIRE. The ramp clause is the one that can go quietly
     blind — a renamed prefix, a tokens.css this file cannot find, a resolver
     that returns an empty map — and it would go blind GREEN, which is the
     shape of every failure this repository has paid for. */
  const blind = [];
  if (ramp.size === 0)
    blind.push("tokens.css yielded no `--kw-*` ramp — clause 5 would pass every file by seeing nothing");
  if (ramp.size < 8)
    blind.push(`tokens.css yielded only ${ramp.size} ramp names; the kit has carried at least 17 since v1.0`);
  if (classListsRead === 0)
    blind.push("no class list was read in the whole walk — clauses 1 and 3 are blind, not clean");
  blind.push(...structural);

  return {
    law: LAW,
    title: "palette law — every colour resolves through a token",
    derived: [
      ["raw ramp names read off tokens.css", ramp.size, [...ramp].slice(0, 6).join(" ") + (ramp.size > 6 ? " …" : "")],
      ["class lists read", classListsRead, ""],
      ["style objects read", styleSpansRead, ""],
      ["svg paint attributes read", paintsRead, ""],
    ],
    unseen: [
      ["literals declined as prose or interpolated", declinedLiterals],
      ["colours arriving at runtime (a prop, a chart series)", runtimeColours],
    ],
    findings,
    excused,
    blind,
  };
}
