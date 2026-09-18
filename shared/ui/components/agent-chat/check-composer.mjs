#!/usr/bin/env node
/* ============================================================================
   THE COMPOSER-ONE-ROW CHECK — pins the client's 18 Sep 2026 report against
   every way it could come back, run by `npm run check` beside the token/
   icon/book/seam/badge/avatar checks.

   THE RULING, VERBATIM, on the assistant composer at ~410px: "Now it makes
   it two rows, and it kind of breaks. Make sure that it's only one row. Ask
   about your work. It doesn't break into rows, and also, as you see in the
   screenshot, when it's selected, it's not working properly. Something's
   off."

   THE CAUSE, IN TWO FILES, BOTH PINNED HERE.
     1 · `textarea.tsx`'s `autoGrow` effect measured `el.scrollHeight`
         unconditionally — including with an EMPTY field, where the number
         it read was not the typed content (there was none) but the
         PLACEHOLDER's own wrapped layout. At 410px "Ask about your work"
         wrapped to two lines, so `scrollHeight` reported two line-heights
         before a single character existed, and `grown` (hence the pill's
         radius and the field's rendered height) flipped true off ghost text
         alone. The fix short-circuits on `el.value.length === 0`: an empty
         field is pinned to the CSS resting height and never measured.
     2 · `agent-chat.tsx`'s composer row gave the `<Textarea>` `flex-1` but
         not `min-w-0`, so the field's floor was its min-CONTENT width —
         wider than the paperclip, gaps and send button left it once the row
         itself narrowed at 410px — which is what made the placeholder wrap
         in the first place. The fix adds `min-w-0`, and belt-and-suspenders,
         `placeholder:whitespace-nowrap` (+ `overflow-hidden`/`text-ellipsis`)
         so the ghost text itself never wraps regardless of width.

   "Selected... something's off" is not a third bug: the composer was already
   two rows tall from the placeholder wrap BEFORE focus ever entered the
   picture, so a click that focused it landed the caret in the already-broken
   two-line box. Fixing (1) and (2) removes the two-row rest state, and
   tokens.css §8's `[data-focus-shell]:has([data-focus-proxy]:focus-visible)`
   rule (unchanged here) draws only an outline on focus — no height, no
   radius, nothing else moves. There is no separate focus fix to pin.

   THIS IS A STATIC CHECK, MATCHING THIS KIT'S OTHER `check-*.mjs` FILES —
   no jsdom/testing-library in this repository, so "the empty field is never
   measured" is verified by reading the guard's own source shape rather than
   by mounting the component. `verify/composer-one-row/page.tsx` is the
   DOM-measured counterpart — real widths, real focus, real typing, read
   live in a browser via `window.__composerProbe()` — for the MEASURED proof
   a static read cannot give on its own.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEXTAREA_FILE = path.join(HERE, "..", "textarea", "textarea.tsx");
const AGENT_CHAT_FILE = path.join(HERE, "agent-chat.tsx");

const textareaSrc = fs.readFileSync(TEXTAREA_FILE, "utf8");
const agentChatSrc = fs.readFileSync(AGENT_CHAT_FILE, "utf8");
const textareaRel = path.relative(process.cwd(), TEXTAREA_FILE);
const agentChatRel = path.relative(process.cwd(), AGENT_CHAT_FILE);

const findings = [];

/* ── 1 · THE autoGrow EFFECT GUARDS ON AN EMPTY VALUE, BEFORE IT EVER
   READS `scrollHeight` ──────────────────────────────────────────────────
   Scoped to the effect body itself (between its `useIsomorphicLayoutEffect`
   opening and the `}, [autoGrow, onGrownChange, props.value]);` that closes
   it) so a mention of `el.value.length` anywhere else in the file — a
   comment, a different effect — cannot satisfy this by accident. */
const effectMatch = textareaSrc.match(
  /useIsomorphicLayoutEffect\(\(\) => \{([\s\S]*?)\}, \[autoGrow, onGrownChange, props\.value\]\);/,
);
if (!effectMatch) {
  findings.push(
    `${textareaRel}: the \`autoGrow\` \`useIsomorphicLayoutEffect\` (keyed on ` +
      "[autoGrow, onGrownChange, props.value]) is missing outright.",
  );
} else {
  const body = effectMatch[1];

  if (!/el\.value\.length === 0/.test(body)) {
    findings.push(
      `${textareaRel}: the \`autoGrow\` effect no longer guards on \`el.value.length === 0\` — ` +
        "an empty field (nothing typed) will again be measured by `scrollHeight`, which includes " +
        "the PLACEHOLDER's own wrapped layout and is exactly what grew the composer to two rows " +
        "with no text in it (18 Sep 2026, ~410px).",
    );
  } else {
    // The guard must come BEFORE the unconditional scrollHeight measurement,
    // not after — an empty check that runs too late has already measured
    // the wrong number.
    const guardAt = body.indexOf("el.value.length === 0");
    const measureAt = body.indexOf("el.scrollHeight}px");
    if (measureAt !== -1 && guardAt > measureAt) {
      findings.push(
        `${textareaRel}: \`el.value.length === 0\` is checked AFTER \`el.style.height = ` +
          '`${el.scrollHeight}px`\` already ran — the guard has to run first, or the empty-field ' +
          "height has already been set off the placeholder's wrapped layout by the time it fires.",
      );
    }

    // Inside the empty branch, the field must be reset toward the CSS
    // resting height (`auto`) and never re-armed with a `scrollHeight`
    // pixel value — that pixel value is precisely the wrapped-placeholder
    // number this check exists to keep out.
    const emptyBranchMatch = body.match(
      /el\.value\.length === 0\)\s*\{([\s\S]*?)\n\s*\}\n\s*\n\s*el\.style\.height = "auto";\n\s*el\.style\.height = `\$\{el\.scrollHeight\}px`;/,
    );
    if (!emptyBranchMatch) {
      findings.push(
        `${textareaRel}: could not find the empty-field branch resetting to \`height: "auto"\` ` +
          "ahead of the non-empty `scrollHeight` measurement that follows it — the two paths may " +
          "have been merged back into one unconditional measurement.",
      );
    } else if (/scrollHeight/.test(emptyBranchMatch[1])) {
      findings.push(
        `${textareaRel}: the empty-field branch still reads \`scrollHeight\` somewhere inside " +
          "it — an empty field must never be sized off it, by construction, not by a value that " +
          "happens to come out right.`,
      );
    }
  }
}

/* ── 2 · THE COMPOSER'S TEXTAREA CARRIES `min-w-0` ALONGSIDE `flex-1` ────
   `flex-1` alone (`flex: 1 1 0%`) still floors a flex child at its own
   min-CONTENT width; a `<textarea>`'s min-content width is not the row's to
   give away, and that is what left the field wider than the row had room
   for once the paperclip, gaps and send button took their share at 410px —
   which is what made the placeholder wrap in the first place. Matched as a
   single class-string token, not merely present anywhere in the file, so a
   `min-w-0` on some unrelated element cannot satisfy this by accident. */
const composerClassMatch = agentChatSrc.match(
  /data-focus-proxy=""\s*\n[\s\S]*?className=\{cn\(\s*\n\s*(\/\/[^\n]*\n\s*)*"([^"]*)"/,
);
if (!composerClassMatch) {
  findings.push(
    `${agentChatRel}: could not find the composer \`<Textarea data-focus-proxy>\`'s own ` +
      "className string to check for `min-w-0`.",
  );
} else {
  const firstClassLine = composerClassMatch[2];
  if (!/\bflex-1\b/.test(firstClassLine)) {
    findings.push(
      `${agentChatRel}: the composer Textarea's first className line no longer carries \`flex-1\`.`,
    );
  }
  if (!/\bmin-w-0\b/.test(firstClassLine)) {
    findings.push(
      `${agentChatRel}: the composer Textarea's first className line is missing \`min-w-0\` — ` +
        "the field can float back to its min-content width and overflow the row instead of " +
        "shrinking with it, reopening the 410px wrap.",
    );
  }
}

/* ── 3 · THE PLACEHOLDER ITSELF NEVER WRAPS, REGARDLESS OF WIDTH ─────────
   Belt-and-suspenders alongside (1) and (2): even if something else measures
   the field oddly, the ghost text must not visually wrap to a second line at
   any width. `::placeholder`-scoped only, so a real multi-line ANSWER a
   person has typed keeps wrapping and growing exactly as `autoGrow` drives
   it — this must never reach the value itself. */
const NOWRAP_CLASSES = [
  "placeholder:whitespace-nowrap",
  "placeholder:overflow-hidden",
  "placeholder:text-ellipsis",
];
for (const cls of NOWRAP_CLASSES) {
  if (!agentChatSrc.includes(cls)) {
    findings.push(
      `${agentChatRel}: the composer Textarea is missing \`${cls}\` — the placeholder ("Ask ` +
        "about your work\") can wrap onto a second line again at a narrow pane width.",
    );
  }
}

if (findings.length > 0) {
  console.error("FAIL composer check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK composer check: `textarea.tsx`'s `autoGrow` never measures an empty field's `scrollHeight` " +
    "(so the placeholder can no longer grow the pill), and `agent-chat.tsx`'s composer Textarea " +
    "carries `min-w-0` plus a non-wrapping placeholder — the two-row rest state and the focus " +
    "oddity it caused (client, 18 Sep 2026, ~410px) stay fixed by construction.",
);
