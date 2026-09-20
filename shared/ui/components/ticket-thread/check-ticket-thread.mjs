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

   SECTIONS 8–9b, ADDED LATER, pin two more of Aurora's rulings on the same
   message-actions menu: `onEditRequest?: (id: string) => void` (8), the
   slide-in-editing escape hatch that wins over `onEdit` and opens no
   inline editor of its own; and `faceSize?: "sm" | "md"` (9, mounted at
   9b), which draws each bubble's face at Avatar's own new `"control"` size
   (40, `--avatar-control`) to match the message-actions trigger's height.

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
   5 · THE MESSAGE-ACTIONS AFFORDANCE — 20 Sep 2026, client-ruled, verbatim:
   "for chat edit pencil: i like from p1 that its besides and appears when
   hover, but make it like p4 wth the 3 options menu (edit, copy/delete)."
   `ThreadMessageActions`'s own doc comment in `ticket-thread.tsx` carries
   the full argument; this pins the construction it describes.
   ========================================================================= */
if (!/export interface ThreadMessageActions \{/.test(src)) {
  findings.push(`${rel} does not export ThreadMessageActions — the edit/copy/delete contract a caller wires.`);
}
if (!/onEdit\?:\s*\(id: string, newBody: string\) => void;/.test(src)) {
  findings.push(`${rel}'s ThreadMessageActions does not declare onEdit?: (id: string, newBody: string) => void.`);
}
if (!/onCopy\?:\s*\(id: string\) => void;/.test(src)) {
  findings.push(`${rel}'s ThreadMessageActions does not declare onCopy?: (id: string) => void.`);
}
if (!/onDelete\?:\s*\(id: string\) => void;/.test(src)) {
  findings.push(`${rel}'s ThreadMessageActions does not declare onDelete?: (id: string) => void.`);
}
// Wired at BOTH levels — per message (overriding) and per thread (the
// default) — exactly the "per message or per thread" ask.
if (!/actions\?:\s*ThreadMessageActions;/.test(src)) {
  findings.push(`${rel} does not declare an actions?: ThreadMessageActions field anywhere.`);
}
const actionsFieldCount = (src.match(/actions\?:\s*ThreadMessageActions;/g) ?? []).length;
if (actionsFieldCount < 2) {
  findings.push(
    `${rel} declares actions?: ThreadMessageActions ${actionsFieldCount} time(s) — expected two: once on ` +
      "ThreadMessage (per-message) and once on TicketThreadProps (per-thread default).",
  );
}
if (!/const effectiveActions = message\.actions \?\? actions;/.test(src)) {
  findings.push(
    `${rel} does not resolve effectiveActions as message.actions ?? actions — the per-message value must win ` +
      "over the thread-wide default, read once per row.",
  );
}

// THE PLAIN BRANCH SURVIVES, UNCONDITIONALLY REACHABLE — a caller that
// never passes actions at either level must still get the exact single
// <div data-slot="thread-bubble"> markup this file rendered before the
// feature existed, with no wrapping row and no trigger.
if (!/\) : \(\s*\n\s*\/\* THE PLAIN BRANCH/.test(src)) {
  findings.push(
    `${rel} does not keep a plain, unwrapped thread-bubble fallback branch reachable when effectiveActions is ` +
      "undefined — every existing no-actions caller must render byte-identical output.",
  );
}

// THE TRIGGER — same construction EditPenButton (kwapso_system's own
// shared/web/edit-pen-button.tsx) spends: buttonVariants({ variant:
// "secondary", size: "icon" }), not a hand-rolled class list that could
// drift from it.
if (!/buttonVariants\(\{ variant: "secondary", size: "icon" \}\)/.test(src)) {
  findings.push(
    `${rel}'s trigger does not read buttonVariants({ variant: "secondary", size: "icon" }) — the exact ` +
      "construction EditPenButton spends, so the two controls stay the same size and skin by derivation.",
  );
}
if (!/data-slot="thread-message-actions-trigger"/.test(src)) {
  findings.push(`${rel} does not name the trigger data-slot="thread-message-actions-trigger".`);
}

// HIDDEN UNTIL HOVER/FOCUS, ALWAYS VISIBLE ON A COARSE POINTER — the three
// gates together, or a touch reader (no hover state to reveal it with)
// could never reach the control at all.
for (const gate of [
  "group-hover/actions:opacity-100",
  "group-focus-within/actions:opacity-100",
  "pointer-coarse:opacity-100",
  "pointer-coarse:pointer-events-auto",
]) {
  if (!src.includes(gate)) {
    findings.push(`${rel}'s trigger does not read ${gate} — the hover/focus/coarse-pointer visibility gate is incomplete.`);
  }
}

// EDIT AND DELETE EACH GATE ON THEIR OWN HANDLER; COPY NEVER DOES — see
// ThreadMessageActions's own header for why Copy needs no handler to draw.
// The Edit gate reads EITHER onEdit or onEditRequest (Section 8 pins the
// "onEditRequest wins when both are given" branch this same row's onSelect
// carries) — a caller that wired only onEditRequest must still get a row.
if (!/effectiveActions\.onEdit \|\| effectiveActions\.onEditRequest \? \(/.test(src)) {
  findings.push(
    `${rel} does not gate the Edit row on effectiveActions.onEdit || effectiveActions.onEditRequest being ` +
      "present — a caller that wired only onEditRequest would get no Edit row at all.",
  );
}
if (!/effectiveActions\.onDelete \? \(/.test(src)) {
  findings.push(`${rel} does not gate the Delete row on effectiveActions.onDelete being present.`);
}
if (!/danger\s*\n\s*icon=\{<Trash/.test(src)) {
  findings.push(`${rel}'s Delete row does not pass the danger prop to DropdownMenuItem.`);
}
if (!/navigator\.clipboard\?\.writeText\(plain\)/.test(src)) {
  findings.push(`${rel}'s Copy row does not call navigator.clipboard?.writeText — copying must work with no onCopy handler at all.`);
}
if (!/effectiveActions\.onCopy\?\.\(key\)/.test(src)) {
  findings.push(`${rel}'s Copy row does not also call effectiveActions.onCopy?.(key) after writing the clipboard.`);
}

// THE INLINE EDITOR — a Textarea seeded from the message's own body,
// Save/Cancel beneath it, Save calling onEdit with the message's own key.
if (!/data-slot="thread-edit"/.test(src)) {
  findings.push(`${rel} does not name the inline editor's own wrapper data-slot="thread-edit".`);
}
if (!/const startEdit = \(key: string, currentBody: React\.ReactNode\) => \{/.test(src)) {
  findings.push(`${rel} does not declare startEdit(key, currentBody) to seed the editor.`);
}
if (!/setEditDraft\(typeof currentBody === "string" \? currentBody : ""\);/.test(src)) {
  findings.push(`${rel}'s startEdit does not seed the draft from a string body (empty for a non-string one).`);
}
if (!/const saveEdit = \(key: string, onEdit: \(id: string, newBody: string\) => void\) => \{/.test(src)) {
  findings.push(`${rel} does not declare saveEdit(key, onEdit) calling the handler with the current draft.`);
}

// THE LIVE PROOF THIS PINS — the real-browser harness must stay on disk.
const ACTIONS_HARNESS_FILE = path.join(HERE, "..", "..", "verify", "ticket-thread-below", "page.tsx");
const CHECK_ACTIONS_FILE = path.join(HERE, "..", "..", "verify", "ticket-thread-below", "check-actions.mjs");
if (!fs.existsSync(ACTIONS_HARNESS_FILE)) {
  findings.push("verify/ticket-thread-below/page.tsx is missing — the message-actions harness must exist on disk.");
} else {
  const harnessSrc = fs.readFileSync(ACTIONS_HARNESS_FILE, "utf8");
  if (!/data-probe="actions"/.test(harnessSrc)) {
    findings.push('verify/ticket-thread-below/page.tsx has no data-probe="actions" pane.');
  }
  if (!/window\.__ticketThreadActionsProbe = async \(\) => \{/.test(harnessSrc)) {
    findings.push(
      "verify/ticket-thread-below/page.tsx does not expose window.__ticketThreadActionsProbe as an async " +
        "read-only snapshot function.",
    );
  }
}
if (!fs.existsSync(CHECK_ACTIONS_FILE)) {
  findings.push(
    "verify/ticket-thread-below/check-actions.mjs is missing — the real-pointer-click proof for the " +
      "message-actions menu (Radix's own trigger opens on pointer-down, not a synthetic click) must stay on disk.",
  );
}

/* ============================================================================
   8 · THE SECOND WAY TO EDIT — Aurora, on the same menu, a later ruling:
   "open the edit as slide in. can edit text and date and attachments."
   `ThreadMessageActions`'s own "TWO WAYS TO EDIT" doc carries the full
   argument; this pins the construction: onEditRequest, when given, wins
   over onEdit and this component opens no inline editor for it.
   ========================================================================= */
if (!/onEditRequest\?:\s*\(id: string\) => void;/.test(src)) {
  findings.push(`${rel}'s ThreadMessageActions does not declare onEditRequest?: (id: string) => void.`);
}
if (!/if \(effectiveActions\.onEditRequest\) \{\s*\n\s*effectiveActions\.onEditRequest\(key\);\s*\n\s*\} else \{\s*\n\s*startEdit\(key, message\.body\);\s*\n\s*\}/.test(src)) {
  findings.push(
    `${rel}'s Edit row onSelect does not branch on effectiveActions.onEditRequest first (calling it and NOT ` +
      "startEdit) before falling back to startEdit — onEditRequest must win when both are given, and must never " +
      "also open the inline editor.",
  );
}

/* ============================================================================
   9 · THE FACE MATCHES THE BUTTON — Aurora, verbatim: "make the avatar as
   big as this button." `faceSize?: "sm" | "md"` on TicketThreadProps,
   defaulting to "sm" (today's behaviour, unchanged when left out); "md"
   reads a new Avatar size, "control" (40, `--avatar-control`), matching
   the message-actions trigger's own `size="icon"` (`--control-height-
   button`). `Avatar`'s own file and tokens.css carry the size itself —
   this only pins that TicketThread reaches for it correctly.
   ========================================================================= */
if (!/faceSize\?:\s*"sm" \| "md";/.test(src)) {
  findings.push(`${rel} does not declare faceSize?: "sm" | "md" on TicketThreadProps.`);
}
if (!/faceSize = "sm",/.test(src)) {
  findings.push(`${rel} does not default faceSize to "sm" — every existing caller that never passed faceSize ` +
    "would silently render a different face size than before this prop existed.");
}
if (!/<Avatar size=\{faceSize === "md" \? "control" : "sm"\} className="flex-none">/.test(src)) {
  findings.push(
    `${rel}'s message avatar does not read size={faceSize === "md" ? "control" : "sm"} — the per-message face ` +
      "would not follow the faceSize prop.",
  );
}
if (!/faceSize === "md" \? "size-\[var\(--avatar-control\)\]" : "size-\[var\(--avatar-sm\)\]"/.test(src)) {
  findings.push(
    `${rel}'s loading skeleton does not switch its own size on faceSize — a "md" thread would flash a smaller ` +
      "face while loading, then jump larger once the first message renders.",
  );
}
const AVATAR_FILE = path.join(HERE, "..", "avatar", "avatar.tsx");
const TOKENS_FILE = path.join(HERE, "..", "..", "foundations", "tokens", "tokens.css");
if (!fs.existsSync(AVATAR_FILE)) {
  findings.push("components/avatar/avatar.tsx is missing — TicketThread's faceSize=\"md\" has no Avatar size to read.");
} else {
  const avatarSrc = fs.readFileSync(AVATAR_FILE, "utf8");
  if (!/control:\s*"size-\[var\(--avatar-control\)\]\s+text-sm"/.test(avatarSrc)) {
    findings.push(
      'components/avatar/avatar.tsx no longer declares a "control" avatarVariants size reading ' +
        "size-[var(--avatar-control)] — TicketThread's faceSize=\"md\" has nowhere to point.",
    );
  }
}
if (!fs.existsSync(TOKENS_FILE)) {
  findings.push("foundations/tokens/tokens.css is missing — --avatar-control has no token file to live in.");
} else {
  const tokensSrc = fs.readFileSync(TOKENS_FILE, "utf8");
  if (!/--avatar-control:\s*2\.5rem;/.test(tokensSrc)) {
    findings.push(
      "foundations/tokens/tokens.css no longer declares --avatar-control: 2.5rem — Avatar's \"control\" size " +
        "and the message-actions trigger (--control-height-button, also 2.5rem) would stop matching.",
    );
  }
}

/* ============================================================================
   6 · MOUNTED, NOT GREPPED — A, A, B, "below". Vite SSR + react-dom/server,
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
    /* ==========================================================================
       7 · THE FACE IS NOT THE BYLINE — Aurora's 20 Sep 2026 ruling, verbatim:
       "on chat, when there are multiple messages by the same person, keep
       the name and date only on the bottom one, but show the avatar for
       each." Section 6 above already renders bubble 1 (theirs, no byline)
       WITH `initials: "AM"`, so it already proves the avatar can render on a
       byline-less message — but only if the caller actually passes
       `initials`/`image` there. The client-observed bug was a caller
       (`kwapso_system/web/components/tickets/help-detail.tsx`, app-side, not
       this file) that omitted `initials` on a run's earlier messages too,
       reading an EARLIER version of this file's own doc comment ("pass
       author/time/initials only on the last message of a run") as
       permission to do that. This section pins the two things that make
       that reading impossible going forward: the avatar renders on EVERY
       message that carries `initials` or `image` regardless of `hasByline`,
       and a message with neither carries no avatar — i.e. `hasAvatar` is
       never derived from the byline fields. ========================================================================== */
    const faceMessages = [
      { id: "1", side: "theirs", initials: "AM", body: "First." },
      {
        id: "2",
        side: "theirs",
        author: "Aiko Morita",
        time: "10:02",
        image: "https://example.test/aiko.jpg",
        body: "Second, same run.",
      },
      { id: "3", side: "mine", author: "Devon Cole", time: "10:05", initials: "DC", body: "Reply." },
      // The old anti-pattern: no byline AND no face. Proves `hasAvatar`
      // truly keys on initials/image alone — this bubble must be the ONLY
      // one with no avatar, not because it lacks a byline (bubble 1 also
      // lacks one) but because it was never given a face at all.
      { id: "4", side: "theirs", body: "Third, no face supplied." },
    ];
    const faceRender = render(
      "face independence, A(initials) A(image) B(initials) X(no face)",
      h(TicketThread, {
        messages: faceMessages,
        bylinePlacement: "below",
        composer: false,
        label: "check",
      }),
    );
    if (faceRender !== null) {
      const faceBlocks = faceRender
        .split('data-slot="thread-message"')
        .slice(1)
        .map((chunk) => chunk.split('data-slot="thread-message"')[0]);
      if (faceBlocks.length !== 4) {
        findings.push(
          `${rel}: expected 4 rendered messages for the face-independence scenario, got ${faceBlocks.length}.`,
        );
      } else {
        const expectAvatar = [true, true, true, false];
        const expectByline = [false, true, true, false];
        const expectImage = [false, true, false, false];
        faceBlocks.forEach((block, i) => {
          const n = i + 1;
          const hasAvatar = block.includes('data-slot="avatar"');
          if (hasAvatar !== expectAvatar[i]) {
            findings.push(
              `${rel}: bubble ${n} of the face-independence render ${hasAvatar ? "carries" : "is missing"} an ` +
                `avatar — expected ${expectAvatar[i] ? "one (initials or image was given)" : "none (no face was given)"}.`,
            );
          }
          const hasByline = block.includes('data-slot="thread-byline"');
          if (hasByline !== expectByline[i]) {
            findings.push(
              `${rel}: bubble ${n} of the face-independence render ${hasByline ? "carries" : "is missing"} a ` +
                "byline where the fixture did not vary — the avatar assertion above depends on this staying true.",
            );
          }
          const hasImage = block.includes('data-slot="avatar-image"');
          if (hasImage !== expectImage[i]) {
            findings.push(
              `${rel}: bubble ${n} of the face-independence render ${hasImage ? "carries" : "is missing"} an ` +
                `<AvatarImage> — expected ${expectImage[i] ? "one (an image src was given)" : "none"}.`,
            );
          }
        });
        // Bubble 1 has no byline (like bubble 1 everywhere else in this
        // file) but DOES have initials — this is the exact shape the client
        // reported broken and the one the corrected doc comment now asks
        // callers to produce.
        if (!(expectAvatar[0] && !expectByline[0])) {
          findings.push(`${rel}: the face-independence fixture no longer isolates "avatar, no byline" on bubble 1.`);
        }
      }
    }

    /* ==========================================================================
       9b · THE FACE SIZE, MOUNTED. Section 9's static pins prove the source
       reads the right identifiers; this proves the rendered markup actually
       carries the right class at both faceSize values, on the same fixture
       (one message, one avatar) so the only variable is the prop itself.
       ========================================================================== */
    const faceSizeMessage = [{ id: "1", side: "theirs", initials: "AM", body: "One." }];
    const faceSizeDefault = render(
      "faceSize omitted",
      h(TicketThread, { messages: faceSizeMessage, composer: false, label: "check" }),
    );
    const faceSizeSm = render(
      "faceSize sm",
      h(TicketThread, { messages: faceSizeMessage, faceSize: "sm", composer: false, label: "check" }),
    );
    const faceSizeMd = render(
      "faceSize md",
      h(TicketThread, { messages: faceSizeMessage, faceSize: "md", composer: false, label: "check" }),
    );
    if (faceSizeDefault !== null && faceSizeSm !== null && faceSizeDefault !== faceSizeSm) {
      findings.push(
        `${rel}: omitting faceSize does not render byte-identically to faceSize="sm" — the default must change ` +
          "nothing about today's output.",
      );
    }
    if (faceSizeDefault !== null && !faceSizeDefault.includes("size-[var(--avatar-sm)]")) {
      findings.push(
        `${rel}: the default (faceSize omitted) render does not carry size-[var(--avatar-sm)] on the avatar — ` +
          "today's 24px face must be unchanged.",
      );
    }
    if (faceSizeMd !== null && !faceSizeMd.includes("size-[var(--avatar-control)]")) {
      findings.push(
        `${rel}: faceSize="md" does not render an avatar carrying size-[var(--avatar-control)] — the face is not ` +
          "actually reaching the 40px control-matched size.",
      );
    }
    if (faceSizeMd !== null && faceSizeMd.includes("size-[var(--avatar-sm)]")) {
      findings.push(
        `${rel}: faceSize="md" still renders an avatar carrying size-[var(--avatar-sm)] — the 24px class must be ` +
          "fully replaced, not merely added alongside the 40px one.",
      );
    }

  } catch (e) {
    findings.push(
      `${rel}: sections 6–9b could not mount <TicketThread> at all (${e instanceof Error ? e.message : String(e)}) — ` +
        "the bylinePlacement, face-independence and faceSize render paths are unproven; fix the loader before " +
        "trusting the static pins above.",
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
    "[&>[data-run=continued]+*] margin rule, full --space-2h otherwise — Section 5 pins the message-actions " +
    "affordance's construction (ThreadMessageActions at both the message and thread level, the plain no-actions " +
    "fallback, the EditPenButton-matching trigger and its hover/focus/coarse-pointer gates, Edit/Delete each " +
    "gated on their own handler, Copy needing none, the inline editor's seed/save wiring), live-proved by a real " +
    "pointer click against a mounted harness in verify/ticket-thread-below/check-actions.mjs, pinned here as " +
    "still on disk — and a mounted A, A, B \"below\" render confirms only bubbles 2 and 3 carry a byline, bubble " +
    "1 is marked continued, and bubble 3's byline aligns to its own (mine) trailing edge. Section 7 confirms the " +
    "avatar is keyed on initials/image alone, independent of the byline: a byline-less message with a face still " +
    "renders one (Aurora's 20 Sep 2026 ruling), a message with an image src renders an <AvatarImage>, and only a " +
    "message given neither initials nor image renders no avatar at all. Section 8 pins the second way to edit: " +
    "onEditRequest?: (id: string) => void on ThreadMessageActions, drawing the Edit row on its own and, when " +
    "given, winning over onEdit so no inline editor opens for it. Section 9 (static) and 9b (mounted) pin " +
    "faceSize?: \"sm\" | \"md\" on TicketThreadProps, defaulting to \"sm\" (byte-identical to omitting it) and " +
    "reading Avatar's own \"control\" size (--avatar-control, 40, matching the message-actions trigger's " +
    "size=\"icon\") on \"md\", for both the per-message avatar and the loading skeleton.",
);
