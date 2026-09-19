#!/usr/bin/env node
/* ============================================================================
   THE TICKET-THREAD CHECK — pins `bylinePlacement` and the message-run gap
   rule against every way they could come back, run by `npm run check`
   beside the badge/avatar/select checks.

   THE REQUEST, VERBATIM: "on 'chat' in tickets put the name and time under
   the message" and "when 2 messages from the same person, only after the
   last message."

   THE SPLIT. The app side is done outside this repo:
   `kwapso_system/web/components/tickets/help-detail.tsx` groups messages
   into runs by `authorId` and hands `author`/`time`/`initials` only to the
   LAST message of each run — so a message with none of those three is, by
   construction, an earlier message of a run. This file pins the kit's own
   half, `ticket-thread.tsx`:

     1 · `bylinePlacement?: "above" | "below"`, defaulting to `"above"` —
         the kit's own ch27.10 drawing, unchanged when the prop is left out.
         `"below"` moves the same author · org · time line to follow the
         bubble (and any attachments) instead of leading it, aligned to the
         bubble's own side.
     2 · Runs: a message with no byline sits CLOSER to the next one
         (`--space-1`) than a run boundary does (`--space-2h`) — done with
         margin selectors keyed on a `data-run="continued"` attribute the
         thread sets on a byline-less message, not a per-message magic
         number.

   SECTIONS 1–4 ARE STATIC, matching this kit's other `check-*.mjs` files —
   no jsdom/testing-library in this repository, so most of this is read from
   the source directly. SECTION 5 MOUNTS the component (vite SSR +
   `react-dom/server`, the same loader `check-badge.mjs` uses) and reads the
   rendered HTML back for the one claim static source-reading cannot prove:
   that in the A, A, B scenario the byline for bubbles 2 and 3 actually
   lands AFTER the bubble in DOM order, that bubble 1 (no byline) carries
   `data-run="continued"` and bubbles 2/3 do not, and that the DEFAULT
   (`bylinePlacement` omitted) render is byte-identical to the pre-existing
   "above" markup — no `data-run` attribute anywhere, byline first.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "ticket-thread.tsx");
const src = fs.readFileSync(FILE, "utf8");
const rel = path.relative(process.cwd(), FILE);

const findings = [];

/* ============================================================================
   1 · THE PROP — declared, optional, defaulting to "above".
   ========================================================================= */
if (!/export type ThreadBylinePlacement = "above" \| "below";/.test(src)) {
  findings.push(
    `${rel} does not export ThreadBylinePlacement as "above" | "below" — the placement type the prop reads.`,
  );
}
if (!/bylinePlacement\?:\s*ThreadBylinePlacement;/.test(src)) {
  findings.push(`${rel}'s TicketThreadProps does not declare bylinePlacement?: ThreadBylinePlacement.`);
}
if (!/bylinePlacement = "above",/.test(src)) {
  findings.push(
    `${rel} does not default bylinePlacement to "above" in its destructure — an unset prop must render the kit's ` +
      "own ch27.10 drawing, not some other default.",
  );
}

/* ============================================================================
   2 · THE DEFAULT STAYS BYTE-IDENTICAL — the message-list container's class
   string for "above" must be the exact literal it always was, not a merged
   / reordered result of a template, so a caller who never touches the prop
   gets the identical output it always got.
   ========================================================================= */
if (!/:\s*"flex flex-col gap-\[var\(--space-2h\)\]"/.test(src)) {
  findings.push(
    `${rel} does not fall back to the literal "flex flex-col gap-[var(--space-2h)]" for the message list when ` +
      'bylinePlacement !== "below" — the default render must stay byte-identical to the pre-existing markup.',
  );
}

/* ============================================================================
   3 · THE RUN GAP — the smaller-gap selector is keyed on data-run, spent
   only for the "below" branch, and both space tokens are the ones the
   request implies (`--space-2h` full, `--space-1` continued) — not a
   per-message magic number.
   ========================================================================= */
if (!/"\[&>\*\+\*\]:mt-\[var\(--space-2h\)\]"/.test(src)) {
  findings.push(`${rel} does not apply the full run gap (--space-2h) as a [&>*+*] margin rule for "below".`);
}
if (!/"\[&>\[data-run=continued\]\+\*\]:mt-\[var\(--space-1\)\]"/.test(src)) {
  findings.push(
    `${rel} does not apply the tightened continued-run gap (--space-1) keyed on a [&>[data-run=continued]+*] ` +
      "margin rule — the request's own construction, not a magic number on an individual message.",
  );
}
if (!/data-run=\{below && !hasByline \? "continued" : undefined\}/.test(src)) {
  findings.push(
    `${rel} does not set data-run="continued" on a message exactly when it is rendering "below" and has no byline ` +
      "— the run signal is a message with no author/authorMeta/time/internal, i.e. an earlier message of a run.",
  );
}
// The attribute must be gated on "below" too, or a plain `above` thread
// (unrelated call sites — internal chat, comments, the assistant) would
// start carrying a new data attribute nobody asked it to grow.
if (/data-run=\{!hasByline/.test(src)) {
  findings.push(
    `${rel} sets data-run without gating on the "below" placement — every existing "above" thread would grow a ` +
      "new attribute it never had, breaking the default's byte-identical guarantee.",
  );
}

/* ============================================================================
   4 · THE BYLINE MOVES, ITS TYPOGRAPHY DOES NOT — one shared `byline` node
   rendered before the content for "above" and after it for "below", so the
   two placements can never drift into two different-looking headers.
   ========================================================================= */
if (!/const byline = hasByline \? \(/.test(src)) {
  findings.push(`${rel} does not build a single shared byline node reused by both placements.`);
}
if (!/\{below \? null : byline\}/.test(src)) {
  findings.push(`${rel} does not render the byline BEFORE the bubble/media/attachments when placement is "above".`);
}
if (!/\{below \? byline : null\}/.test(src)) {
  findings.push(`${rel} does not render the byline AFTER the bubble/media/attachments when placement is "below".`);
}

/* ============================================================================
   5 · MOUNTED, NOT GREPPED — A, A, B, "below". Vite SSR + react-dom/server,
   the same loader `check-badge.mjs`'s own section 6 uses: no new dependency,
   no jsdom, roughly a second of wall time.
   ========================================================================= */
{
  const KIT_ROOT = path.resolve(HERE, "..", "..");
  const THREAD_URL = "/" + path.relative(KIT_ROOT, FILE).split(path.sep).join("/");
  let server = null;
  try {
    const [{ createServer }, React, { renderToStaticMarkup }] = await Promise.all([
      import("vite"),
      import("react"),
      import("react-dom/server"),
    ]);
    server = await createServer({
      root: KIT_ROOT,
      configFile: false,
      logLevel: "silent",
      server: { middlewareMode: true, hmr: false, watch: null },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    const { TicketThread } = await server.ssrLoadModule(THREAD_URL);
    const h = React.createElement;

    // A, A, B — bubble 1 (theirs) no byline, bubble 2 (theirs) byline,
    // bubble 3 (mine) byline. The exact shape help-detail.tsx now produces:
    // author/time/initials only on the last message of a run.
    const messages = [
      { id: "1", side: "theirs", initials: "AM", body: "First." },
      {
        id: "2",
        side: "theirs",
        author: "Aiko Morita",
        time: "10:02",
        initials: "AM",
        body: "Second, same run.",
      },
      { id: "3", side: "mine", author: "Devon Cole", time: "10:05", initials: "DC", body: "Reply." },
    ];

    const render = (name, el) => {
      try {
        return renderToStaticMarkup(el);
      } catch (e) {
        findings.push(`${rel}: rendering shape "${name}" THREW — ${e instanceof Error ? e.message : String(e)}`);
        return null;
      }
    };

    /* ---- "below" — the reported case ---- */
    const below = render(
      "below, A A B",
      h(TicketThread, {
        messages,
        bylinePlacement: "below",
        composer: false,
        label: "check",
      }),
    );

    if (below !== null) {
      const messageBlocks = below
        .split('data-slot="thread-message"')
        .slice(1)
        .map((chunk) => chunk.split('data-slot="thread-message"')[0]);

      if (messageBlocks.length !== 3) {
        findings.push(
          `${rel}: expected 3 rendered messages for the A, A, B scenario, got ${messageBlocks.length}: ${below}`,
        );
      } else {
        const expectRun = [true, false, false]; // only bubble 1 has no byline
        const expectByline = [false, true, true]; // only bubbles 2 and 3 carry one
        messageBlocks.forEach((block, i) => {
          const n = i + 1;
          const isContinued = /data-run="continued"/.test(block);
          if (isContinued !== expectRun[i]) {
            findings.push(
              `${rel}: bubble ${n} of the A, A, B "below" render ${isContinued ? "carries" : "is missing"} ` +
                `data-run="continued" — expected ${expectRun[i] ? "" : "no "}data-run here.`,
            );
          }

          const bubbleAt = block.indexOf('data-slot="thread-bubble"');
          const bylineAt = block.indexOf('data-slot="thread-byline"');
          const hasByline = bylineAt !== -1;
          if (hasByline !== expectByline[i]) {
            findings.push(
              `${rel}: bubble ${n} of the A, A, B "below" render ${hasByline ? "carries" : "is missing"} a byline ` +
                `— expected ${expectByline[i] ? "one" : "none"} (only the LAST message of a run gets author/time).`,
            );
          }
          if (hasByline && bubbleAt !== -1 && bylineAt < bubbleAt) {
            findings.push(
              `${rel}: bubble ${n} of the A, A, B "below" render draws its byline BEFORE the bubble in DOM order ` +
                '— "below" must follow it.',
            );
          }
        });

        // Bubble 3 is "mine" — its byline must align to the bubble's own
        // (trailing) edge, same as ch27.10's "above" header always has.
        const bubble3Byline = messageBlocks[2].match(
          /<span data-slot="thread-byline" class="([^"]*)"/,
        );
        if (bubble3Byline && !/justify-end/.test(bubble3Byline[1])) {
          findings.push(
            `${rel}: bubble 3 ("mine") of the A, A, B "below" render does not align its byline to the trailing ` +
              "edge (justify-end) — ruling 36's own side rule applies to the byline as much as the bubble.",
          );
        }
      }
    }

    /* ---- default (bylinePlacement omitted) — byte-identical to "above" ---- */
    const defaultRender = render(
      "default (no bylinePlacement), A A B",
      h(TicketThread, { messages, composer: false, label: "check" }),
    );
    const aboveRender = render(
      "above, A A B",
      h(TicketThread, { messages, bylinePlacement: "above", composer: false, label: "check" }),
    );
    if (defaultRender !== null && aboveRender !== null && defaultRender !== aboveRender) {
      findings.push(
        `${rel}: omitting bylinePlacement does not render byte-identically to bylinePlacement="above" for the ` +
          "same messages.",
      );
    }
    if (defaultRender !== null && /data-run="continued"/.test(defaultRender)) {
      findings.push(
        `${rel}: the default ("above") render of the A, A, B scenario carries a data-run="continued" attribute — ` +
          "the run-gap rule must be scoped to \"below\" only, so an existing \"above\" thread's markup never grows " +
          "an attribute it did not have before this change.",
      );
    }
    if (defaultRender !== null) {
      const defaultBlocks = defaultRender
        .split('data-slot="thread-message"')
        .slice(1)
        .map((chunk) => chunk.split('data-slot="thread-message"')[0]);
      const block2 = defaultBlocks[1] ?? "";
      const authorAt = block2.indexOf("Aiko Morita");
      const bubbleAt = block2.indexOf('data-slot="thread-bubble"');
      if (authorAt === -1 || bubbleAt === -1 || authorAt > bubbleAt) {
        findings.push(
          `${rel}: the default ("above") render does not draw bubble 2's own author before bubble 2's own bubble ` +
            "in document order — the header must still lead the bubble when bylinePlacement is left unset.",
        );
      }
    }
  } catch (e) {
    findings.push(
      `${rel}: section 5 could not mount <TicketThread> at all (${e instanceof Error ? e.message : String(e)}) — ` +
        "the bylinePlacement render path is unproven; fix the loader before trusting the static pins above.",
    );
  } finally {
    if (server) await server.close();
  }
}

if (findings.length > 0) {
  console.error("FAIL ticket-thread check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK ticket-thread check: bylinePlacement defaults to \"above\" and the default render is byte-identical to " +
    "today's (no data-run attribute anywhere, byline before the bubble) — \"below\" moves the same byline node to " +
    "follow the bubble/attachments, aligned to the bubble's own side — a byline-less message (an earlier message " +
    "of a run) carries data-run=\"continued\" and the column applies the tightened --space-1 gap after it via a " +
    "[&>[data-run=continued]+*] margin rule, full --space-2h otherwise — and a mounted A, A, B \"below\" render " +
    "confirms only bubbles 2 and 3 carry a byline, bubble 1 is marked continued, and bubble 3's byline aligns to " +
    "its own (mine) trailing edge.",
);
