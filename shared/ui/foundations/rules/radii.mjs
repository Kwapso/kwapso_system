/* ============================================================================
   THE SHAPE LAW — two radii and no third, spelled the kit's way.

   `docs/RULES.md` §4.1–4.3 and kit ruling 03. A rectangular surface is 24, a
   pill is 999, the square selection MARK is 6 and a bar is 4. A fifth radius
   invented for one component is a rejection.

   ----------------------------------------------------------------------------
   WHY THIS LAW MOVED INTO THE KIT

   The consuming app has enforced this since 2026-08-27 as `RULES.md` R31,
   `two-radii`, and R31's own text says why it belongs here rather than there:
   *"THE SPELLING BECAME THE KIT'S ON 2026-08-27, when the kit became canon."*
   A law about which words spell the kit's own shape vocabulary, living in one
   of the kit's consumers, is a law the SECOND consumer has to rediscover by
   iterating with the client. That is the cost this file removes.

   ----------------------------------------------------------------------------
   WHAT IT DERIVES, AND FROM WHAT — nothing here is a list of allowed classes

   Every judgement below is read out of `foundations/tokens/tokens.css`, which
   is the only file in this repo where a size is decided (§8.2):

     · THE VOCABULARY. Every `--radius*` custom property declared at `:root`.
       That is the set of corners that exist. Add `--radius-huge` to tokens.css
       and `rounded-[var(--radius-huge)]` becomes legal the same second, with
       no edit here — which is the correct behaviour, because the decision was
       made in the one place decisions are made.

     · WHICH BARE SPELLINGS ARE SAFE. The `@theme inline` block. A key
       registered there (`--radius-pill: var(--radius-pill)`) is a real
       Tailwind theme key and `rounded-pill` compiles to it, unconditionally.
       A key NOT registered there is one of two things, and the check tells
       them apart off the same file:

         — `--radius-lg` IS declared at `:root` but is NOT bridged. So
           `rounded-lg` resolves to 24 ONLY IF tokens.css happens to load after
           Tailwind's own theme. §4.2's load-bearing reason, and the check can
           state it because it can see both facts.
         — `rounded-4xl` names nothing tokens.css declares at all. Outside the
           vocabulary; there is no argument to have.

       THIS IS THE DERIVATION THAT MATTERS. A hand-written deny-list of
       `rounded-lg|xl|2xl|md|sm` — which is what §4.2 reads as, in prose — goes
       stale the day Tailwind ships `rounded-5xl` or the day tokens.css stops
       re-pointing one of them. The rule "bare is legal iff bridged" cannot.

   ----------------------------------------------------------------------------
   ONE CLAUSE THIS LAW WAS WRITTEN WITH AND THEN GAVE UP, ON PURPOSE

   The first draft called `rounded-[var(--radius-select)]` a finding: the token
   is bridged, so `rounded-select` is already its word, and two spellings of
   one corner is how a vocabulary stops being one. It produced 24 findings
   against the kit's own source in one run, which is the right number for a
   real rule and a warning sign for an invented one.

   IT WAS INVENTED. §4.1's own table reads *"`rounded-select` **or**
   `rounded-[var(--radius-select)]`"*, in bold, and prescribes the arbitrary
   form outright for `--radius-sm`. The clause was not enforcing the rulebook;
   it was legislating past it, and a law that is stricter than the document it
   claims to check has stopped being a check and become an opinion.

   So the arbitrary form of any DECLARED radius passes, and the spelling census
   is printed as a derived number instead — visible to anyone who wants to
   argue for one spelling, binding on nobody until the rulebook says so. If
   the client rules for a single spelling, this is a ten-line clause and the
   census already says what it would cost.

   ----------------------------------------------------------------------------
   WHAT IT DELIBERATELY DOES NOT CHECK

     · WHICH of two blessed spellings a component picked (above).
     · `border-radius` written in a `style={{ }}` object or a CSS file. A
       component that reaches for inline geometry has a different problem and
       `docs/RULES.md` §1.1 is the law about it. Counted, printed, not failed.
     · WHETHER THE RIGHT RADIUS WAS CHOSEN. §4.3 is the sentence a machine
       cannot check: *6 is the radius of a square mark; a channel, a disc or a
       capsule is a pill.* This law proves the vocabulary is closed. It does
       not, and cannot, prove a component picked the right word out of it.
     · A radius arriving through a variable or an interpolation. Counted as a
       declined literal by `source.mjs`, and printed, because a scan that
       silently reads less than it did is the failure mode this repo has been
       bitten by twice.
   ========================================================================= */

import { readTokenModel, blockAfter } from "../tokens/token-model.mjs";
import { classLists, utilities, excuses, styleSpans } from "./source.mjs";

export const LAW = "radii";

/* The eight side/corner segments Tailwind admits between `rounded` and its
   value. Their MEANING is Tailwind's, not the kit's, so they are named here
   rather than derived — but note what is being named: the grammar of the
   utility, never the set of allowed radii. §4.1's "a directional variant of
   the first is the same word applied to one edge". */
const SIDES = new Set(["t", "r", "b", "l", "s", "e", "ss", "se", "es", "ee", "tl", "tr", "bl", "br"]);

/** Pull the radius vocabulary and the bridge out of tokens.css. */
export function shapeVocabulary(tokensCss) {
  const model = readTokenModel(tokensCss);
  const declared = new Map();
  for (const [k, v] of model.light) if (/^--radius(-|$)/.test(k)) declared.set(k, v);

  const bridge = blockAfter(model.css, "@theme inline") ?? new Map();
  const bridged = new Set();
  for (const k of bridge.keys()) if (/^--radius-/.test(k)) bridged.add(k);

  /* Every token tokens.css declares, not just the radii. A derived corner is
     `calc(var(--radius) - var(--space-1h))`, so the SUBTRAHEND is a spacing
     token and judging it against the radius vocabulary alone reports the one
     legitimate use of calc() in the kit as an undeclared radius. It did, in
     the first run of this file. */
  const allTokens = new Set([...model.light.keys(), ...model.darkMap.keys()]);

  return { declared, bridged, allTokens, structural: model.structural };
}

/** Classify one `rounded…` utility. Returns null when it is fine. */
function judge(base, vocab) {
  if (base === "rounded") {
    return {
      what: "bare `rounded` — Tailwind's own 4px key, not one of the kit's corners",
      remedy: "rounded-[var(--radius)] for a surface, rounded-pill for a pill, rounded-[var(--radius-sm)] for a bar",
    };
  }

  let rest = base.slice("rounded-".length);

  /* Peel one side/corner segment, when the next segment is one. */
  const dash = rest.indexOf("-");
  const head = dash < 0 ? rest : rest.slice(0, dash);
  if (SIDES.has(head) && dash > 0) rest = rest.slice(dash + 1);

  /* `rounded-none` — no corner at all. It names no token because there is no
     token to name; a square corner is the absence of one, not a fifth value. */
  if (rest === "none") return null;

  if (rest.startsWith("[") && rest.endsWith("]")) {
    const inner = rest.slice(1, -1);

    /* `rounded-[inherit]` takes its parent's corner. It introduces nothing. */
    if (inner === "inherit") return null;

    const vars = [...inner.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((m) => m[1]);

    if (!vars.length)
      return {
        what: `rounded-[${inner}] — a literal corner, which is a fifth radius`,
        remedy: "use one of the declared radii: " + [...vocab.declared.keys()].join(", "),
      };

    /* A calc() over a declared radius is a DERIVED corner — the inset child
       of a 24 card, whose corner must be the parent's minus the padding. It
       invents no value; it computes one from values that exist. So it must
       BUILD on a declared radius, and every other input must be a token
       tokens.css declares too. Allowed, and counted, so the number is visible
       rather than assumed to be zero. */
    if (/calc\(/.test(inner)) {
      if (!vars.some((v) => vocab.declared.has(v)))
        return {
          what: `rounded-[${inner}] — a calc() that builds on no declared radius`,
          remedy: "derive a corner FROM one: calc(var(--radius) - …)",
        };
      const foreign = vars.filter((v) => !vocab.allTokens.has(v));
      if (foreign.length)
        return {
          what: `rounded-[…${foreign.join(", ")}…] — tokens.css declares no such token`,
          remedy: "every input to a derived corner is a token; declare it in tokens.css or use one that exists",
        };
      return { derived: true };
    }

    const unknown = vars.filter((v) => !vocab.declared.has(v));
    if (unknown.length)
      return {
        what: `rounded-[…${unknown.join(", ")}…] — tokens.css declares no such radius`,
        remedy: "declare it in tokens.css §Shape if it is real, or use " + [...vocab.declared.keys()].join(", "),
      };

    /* A declared radius, written the long way. §4.1 blesses both forms; see
       the header for the clause this law deliberately does not carry. */
    return null;
  }

  /* A bare key. Legal exactly when `--radius-<key>` is bridged. */
  const token = `--radius-${rest}`;
  if (vocab.bridged.has(token)) return null;

  if (vocab.declared.has(token))
    return {
      what:
        `rounded-${rest} — \`${token}\` is re-pointed by :root but is not in the ` +
        "@theme inline bridge, so it renders the kit's value only if tokens.css loads after Tailwind's theme",
      remedy: `rounded-[var(${token})] — the arbitrary form has no load-order dependency`,
    };

  return {
    what: `rounded-${rest} — tokens.css declares no \`${token}\`; this is Tailwind's own value`,
    remedy: "use a declared radius: " + [...vocab.declared.keys()].join(", "),
  };
}

export function run({ files, tokensCss, exemptions }) {
  const vocab = shapeVocabulary(tokensCss);
  const findings = [];
  const excused = [];
  const derivedCorners = [];
  let read = 0;
  let declinedLiterals = 0;
  let roundedSeen = 0;
  let inlineRadius = 0;
  const spelling = { word: 0, arbitrary: 0 };

  for (const file of files) {
    const { lists, declined } = classLists(file);
    declinedLiterals += declined;
    read += lists.length;
    for (const l of lists) {
      for (const u of utilities(l.text)) {
        if (u.base !== "rounded" && !u.base.startsWith("rounded-")) continue;
        roundedSeen++;
        /* The spelling census the abandoned clause would have policed. */
        const arb = u.base.match(/rounded(?:-[a-z]{1,2})?-\[var\(\s*(--radius[A-Za-z0-9_-]*)/);
        if (arb && vocab.bridged.has(arb[1])) spelling.arbitrary++;
        else if (/^rounded(?:-[a-z]{1,2})?-[a-z0-9]+$/.test(u.base) &&
                 vocab.bridged.has("--radius-" + u.base.split("-").pop())) spelling.word++;
        const verdict = judge(u.base, vocab);
        if (!verdict) continue;
        if (verdict.derived) { derivedCorners.push({ ...l, what: u.raw }); continue; }
        const f = { file, line: l.line, what: `${u.raw} · ${verdict.what}`, remedy: verdict.remedy };
        const ex = exemptions.find((e) => excuses(e, LAW, file, u.base));
        (ex ? excused : findings).push(ex ? { ...f, ex } : f);
      }
    }
  }

  /* Inline `border-radius` — this law's own declared blind spot, counted so
     the hole has a number beside it rather than a silence. */
  for (const file of files)
    for (const s of styleSpans(file))
      inlineRadius += (s.text.match(/border-?[Rr]adius/g) ?? []).length;

  /* THE BLINDNESS TRIPWIRE. Three ways this scan can be green because it saw
     nothing, and every one of them has happened to a law in this codebase:
     a vocabulary that came back empty, a bridge that came back empty, and a
     walk that read no `rounded` at all. A law that can pass while blind is
     not a law. */
  const blind = [];
  if (vocab.declared.size < 2)
    blind.push(`tokens.css yielded ${vocab.declared.size} radius tokens — the vocabulary cannot be read`);
  if (vocab.bridged.size === 0)
    blind.push("the @theme inline bridge yielded no radius keys — every bare spelling would be judged unsafe");
  if (roundedSeen === 0)
    blind.push("no `rounded…` utility was read in the whole walk — the census is blind, not clean");
  if (vocab.structural.length) blind.push(...vocab.structural);

  return {
    law: LAW,
    title: "shape law — two radii and no third",
    derived: [
      ["radius tokens declared", vocab.declared.size, [...vocab.declared.keys()].join(" ")],
      ["bridged into @theme inline", vocab.bridged.size, [...vocab.bridged].join(" ")],
      ["class lists read", read, ""],
      ["rounded utilities judged", roundedSeen, ""],
      ["derived corners (calc over a declared radius)", derivedCorners.length, ""],
      ["bridged corners spelled as the word", spelling.word, "rounded-pill / -select / -bar"],
      ["bridged corners spelled the long way", spelling.arbitrary, "§4.1 blesses both; see the header"],
    ],
    unseen: [
      ["literals declined as prose or interpolated", declinedLiterals],
      ["inline border-radius (§1.1's subject, not this law's)", inlineRadius],
    ],
    findings,
    excused,
    blind,
  };
}
