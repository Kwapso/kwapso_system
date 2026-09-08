/* ============================================================================
   token-model.mjs — ONE reader of tokens.css, for every check that needs one.

   WHY THIS FILE EXISTS AT ALL, given that it is entirely code lifted out of
   `build-tokens.mjs` and nothing here is new.

   `build-tokens.mjs` already knew how to walk this stylesheet: which blocks
   are the light palette, which two are the dark one, and how to chase a
   `var()` chain to the hex at the end of it. The contrast law needs exactly
   that and nothing else — `--surface-record-footer` is only a bug three hops
   down, at `#26241F`, and a check that stopped at the name would have called
   the pair different and passed.

   The tempting thing was to write that walk again inside the new check. A
   SECOND resolver is a second opinion, and two opinions about what a token
   resolves to is the same failure the law is being built to catch, one level
   up: both would be "correct", they would disagree, and the disagreement
   would be invisible until a screen was wrong. So the walk moved here, and
   both callers import it. If this file is wrong, every check is wrong the
   same way and at the same time — which is the only kind of wrong a system
   can find.

   NOTHING HERE FAILS A BUILD. This module reads and resolves; it holds no
   opinion about what the values ought to be. The guards stay in
   `build-tokens.mjs` and the thresholds stay in `check-contrast.mjs`, because
   a reader that also judged would give the two checks one shared blind spot
   instead of one shared eye.
   ========================================================================= */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TOKENS_CSS = join(HERE, "tokens.css");

/* ----------------------------------------------------------------------------
   Block walking
   ------------------------------------------------------------------------- */

/** Return the body of the block whose header starts at `from`. */
export function bodyAt(text, from) {
  const open = text.indexOf("{", from);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return { body: text.slice(open + 1, i), end: i };
    }
  }
  return null;
}

/** Every `--name: value;` pair in a block body, in source order. */
export function declarations(body) {
  const out = new Map();
  const re = /(--[A-Za-z0-9_-]+)\s*:\s*([^;}]+)[;}]?/g;
  let m;
  while ((m = re.exec(body))) out.set(m[1], m[2].trim().replace(/\s+/g, " "));
  return out;
}

/** Merge every bare `:root { }` block (skipping [data-*] and nested ones). */
export function collectLight(text) {
  const merged = new Map();
  const re = /(^|\})\s*:root\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    const blk = bodyAt(text, m.index);
    if (!blk) continue;
    for (const [k, v] of declarations(blk.body)) merged.set(k, v);
  }
  return merged;
}

export function blockAfter(text, needle) {
  const i = text.indexOf(needle);
  if (i < 0) return null;
  const blk = bodyAt(text, i);
  return blk ? declarations(blk.body) : null;
}

/* ----------------------------------------------------------------------------
   var() resolution

   Twelve passes, because the deepest chain this file has ever carried is
   `--surface-record-footer` → `--surface-raised` → `--card` → `--kw-off-beige`
   → `#FFFEF9`, and a chain that does not terminate in twelve is a cycle
   somebody needs to be told about rather than a chain to keep chasing.
   ------------------------------------------------------------------------- */

export function makeResolver(map, warn = []) {
  const seen = new Set();
  return function resolve(value, key = "") {
    if (typeof value !== "string") return value;
    let out = value;
    for (let pass = 0; pass < 12 && out.includes("var("); pass++) {
      out = out.replace(/var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,([^)]*))?\)/g, (all, ref, fb) => {
        if (ref === key || seen.has(ref + "|" + key)) return all;
        if (map.has(ref)) return map.get(ref);
        if (fb !== undefined) return fb.trim();
        warn.push(`UNRESOLVED — ${key || "?"} points at ${ref}, which is not defined`);
        return all;
      });
    }
    return out.trim();
  };
}

/* ----------------------------------------------------------------------------
   The model
   ------------------------------------------------------------------------- */

/**
 * Read tokens.css and return both palettes, raw and resolved.
 *
 * `structural` lists the things a reader cannot recover from — a missing dark
 * block. It is returned rather than thrown, so each caller decides whether
 * that is a build failure (build-tokens: yes) or a blindness report
 * (check-contrast: also yes, but with its own words).
 */
export function readTokenModel(src = TOKENS_CSS) {
  const raw = readFileSync(src, "utf8");
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");
  const structural = [];

  const mediaIdx = css.indexOf("@media (prefers-color-scheme: dark)");
  if (mediaIdx < 0) structural.push("no `@media (prefers-color-scheme: dark)` block found");
  const mediaBody = mediaIdx >= 0 ? bodyAt(css, mediaIdx)?.body ?? "" : "";

  const light = collectLight(css.slice(0, mediaIdx < 0 ? undefined : mediaIdx));
  const darkMedia = blockAfter(mediaBody, ':root:not([data-theme="light"])');
  const darkExplicit = blockAfter(css, ':root[data-theme="dark"]');

  if (!darkMedia) structural.push('no `:root:not([data-theme="light"])` block inside the media query');
  if (!darkExplicit) structural.push('no `:root[data-theme="dark"]` block found');

  const darkMap = new Map(light);
  for (const [k, v] of darkExplicit ?? []) darkMap.set(k, v);

  const warnings = [];
  return {
    raw,
    css,
    light,
    darkMedia,
    darkExplicit,
    darkMap,
    structural,
    warnings,
    resolveLight: makeResolver(light, warnings),
    resolveDark: makeResolver(darkMap, warnings),
  };
}

/**
 * A palette as a plain `name -> resolved value` Map. This is the shape the
 * contrast law wants: it asks "what colour is `--dot-building` in dark", not
 * "what does the dark block say about it".
 */
export function resolvedPalette(model, theme) {
  const src = theme === "dark" ? model.darkMap : model.light;
  const resolve = theme === "dark" ? model.resolveDark : model.resolveLight;
  const out = new Map();
  for (const [k, v] of src) out.set(k, resolve(v, k));
  return out;
}
