"use client"

// AgentPanel — the app-wide AI co-pilot. A permanent THIRD COLUMN on the
// shell's ground where there is room for one (`ScreenShell`'s `aside`), and the
// floating panel anchored off its launcher where there is not (below the kit's
// `md`, where the aside is dropped outright). ONE panel either way: only the
// box around it changes — see `PanelFrame` below. Mounted once at the root
// (agent-host.tsx, which owns go() + runAction() + the cache, so the agent can
// drive real screens) and portalled into the column. Built on the library
// AgentChat.
//
// This file is the RENDER SHELL only. The whole state machine — the transcript,
// streaming consumption (text deltas / live step rows / the confirm pause /
// terminal settle), per-device + cross-device thread resume, the broken-stream
// re-sync, and the send / confirm /
// new-chat / open-thread actions — lives in web/lib/use-agent-chat.tsx. The
// usage + history dialogs are self-contained components beside this one.
//
// The credit count (free daily + what an admin added) shows in the header. Using the agent needs
// agent:create; the server re-gates every action AS the signed-in user.

import * as React from "react"
import { createPortal } from "react-dom"
import { CaretDown, Check, X } from "@shared/ui/foundations/icons"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/ui/components/collapsible/collapsible"

import { Button } from "@shared/ui/components/button/button"
import { Badge } from "@shared/ui/components/badge/badge"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import { PopoverContent } from "@shared/ui/components/popover/popover"
import { AgentChat } from "@shared/ui/components/agent-chat/agent-chat"
import { Toggle } from "@shared/ui/components/toggle/toggle"

import { SOURCE_CHIPS, SOURCE_CHIP_KEYS } from "@shared/knowledge-chips"
import { CollectionRegister } from "@shared/ui/components/collection-frame/collection-frame"
import { RunSteps } from "@shared/ui/components/run-steps/run-steps"
import { Title } from "@shared/ui/components/title/title"
import { cn } from "@shared/ui/lib/utils"

import { AgentHistoryTab } from "@/components/assistant/agent-history-tab"
import { AgentScopePicker } from "@/components/assistant/agent-scope-picker"
import { AgentTabStrip } from "@/components/assistant/agent-tab-strip"
import { AssistantLimitNotice } from "@/components/assistant/assistant-limit-notice"
import { citationPills, TurnSources } from "@/components/assistant/agent-sources"
import { AgentUsageDialog } from "@/components/assistant/agent-usage-dialog"
import { useAgentDock, useAgentDockTabs } from "@/lib/agent-dock"
import { setAgentOpen } from "@/lib/agent-open"
import { useAgentChat, type AgentChatItem } from "@/lib/use-agent-chat"
import {
  activateAgentTab,
  agentTabsSnapshot,
  closeAgentTab,
  openAgentTabForThread,
  openHistoryTab,
  openNewAgentTab,
  pickAgentTabScope,
  reorderAgentTab,
  seedAgentTabs,
  setAgentTabThread,
  useActiveAgentTabId,
  useAgentTabs,
  useHistoryTabOpen,
  type AgentTabScope,
} from "@/lib/agent-conversation-tabs"
import { usePermissions } from "@/lib/perms"
import { useActiveTabPath, useOpenTabs } from "@/lib/workspace-tabs"
import { parseRoute } from "@/components/deep-link/route"
import { useLanguage, useT } from "@shared/web/language"
import { formatRelative } from "@shared/web/format"

/** THE CHIP LABELS. Here rather than in `shared/knowledge-chips.ts` because a
 * sentence a person reads is the front door's to say and to translate (R28/R33):
 * a string in `shared/` that no front door said would be an orphan in the
 * catalogue. The KEYS are shared; the words are ours.
 *
 * "App records" and "Knowledge articles" are two words each on purpose — the
 * other four name a service a person already has a word for, and these two do
 * not: "Records" alone reads as a database table, and "Articles" alone reads as
 * something we published. */
function SourceChips({
  sources,
  onToggle,
  disabled,
}: {
  sources: string[]
  onToggle: (key: string) => void
  disabled?: boolean
}) {
  const t = useT()
  // THE SERVICE'S OWN NAME, not the bare word. "Drive" alone is already in this
  // app's catalogue as a disk drive ("Laufwerk", "Unidad"), and "Mail" and
  // "Chat" are common nouns a translator will faithfully translate — so a chip
  // reading "Drive" would have said "Laufwerk" to a German reader and meant
  // Google Drive. `Gmail` and `Google Chat` are already in the catalogue,
  // correctly untranslated; `Google Drive` joins them for the same reason.
  const LABEL: Record<string, string> = {
    meetings: t("Meetings"),
    mail: t("Gmail"),
    drive: t("Google Drive"),
    chat: t("Google Chat"),
    records: t("App records"),
    articles: t("Knowledge articles"),
  }
  return (
    // `pb-3` SEPARATES THE SCOPE FROM THE CONVERSATION (owner, 13 Sep 2026:
    // "can we make sure that the data source chip selector and the first
    // message sent by me have a little bit of padding between them?"). The
    // host below is a plain `flex-col` with no gap of its own, so the last
    // chip's own box was the only thing between this row and the first
    // bubble — two different KINDS of thing (a control you set once for the
    // thread, and the thread itself) reading as one stack.
    <div className="flex flex-col gap-1 px-1 pb-3">
      {/* A VISIBLE caption, not just the group's aria-label — the owner saw
       * this row on staging with no other context ("i dont understand what
       * this black pills with sources are"): `aria-label` names the group for
       * a screen reader but renders nothing a sighted person can read, so the
       * row looked like unlabelled buttons. Styled like the app's other small
       * section captions (e.g. `google-connections.tsx`'s `t("Google")`
       * heading). */}
      <span className="text-muted-foreground text-micro uppercase mt-2">{t("Reading from")}</span>
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={t("Which sources the assistant reads")}
      >
        {SOURCE_CHIPS.map((chip) => {
          const on = sources.includes(chip.key)
          return (
            <Toggle
              key={chip.key}
              size="sm"
              variant="outline"
              pressed={on}
              disabled={disabled}
              onPressedChange={() => onToggle(chip.key)}
              aria-label={LABEL[chip.key] ?? chip.key}
              // SAME SIZE AS THE DETAIL TITLE'S OWN PILLS (owner, 3 Sep 2026:
              // "make them the same size as the pills on top of details
              // title"). That row is `record-chrome.tsx`'s `IDENTITY_ROW`,
              // which gives every `Badge` inside it the kit's `size="pill"`
              // geometry — `--control-height-pill` (26 at the kit's own
              // 16px-root arithmetic), `--space-3h` inline padding and the
              // `text-badge` step — by the SAME three custom properties
              // `badge.tsx` defines that size from, not by numbers re-derived
              // here. `Toggle` has no `size="pill"` of its own (its ladder
              // stops at `sm`'s 32-tall `--control-height-dense`, chapter
              // 10's segmented-control height, which is a different control's
              // geometry to begin with — the kit change that would be a real
              // `size="pill"` on this component is logged for Aurora, not
              // guessed at here), so this reaches the SAME tokens Badge's
              // pill size already reaches, on the one call site that draws
              // this row, exactly as `IDENTITY_ROW` reaches them on its own
              // side rather than a hand-tuned pixel count. `gap-2` is
              // untouched: `toggleVariants`' own base class already sets it,
              // matching `IDENTITY_ROW`'s `gap-2` without needing to be
              // repeated here.
              className="h-[var(--control-height-pill)] px-[var(--space-3h)] text-badge"
            >
              {LABEL[chip.key] ?? chip.key}
            </Toggle>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   THE FRAME — the ONE thing that differs between the two presentations.

   The assistant is a COLUMN on a wide screen (`ScreenShell`'s `aside`, kit
   v1.2.28) and a floating panel on a narrow one, because the kit drops its
   third column below `md` and a phone cannot spend 380px on it. Those are two
   BOXES, not two assistants: everything inside — the transcript, the streamed
   steps, the confirm pause, the citations, the composer — is
   the same tree in both, rendered once below and handed to whichever box this
   width calls for. There is no second copy of the panel and no second copy of
   its state; `useAgentChat` is called once, in `AgentPanel`, above this.

   WHY THE COLUMN IS A PORTAL. The panel is mounted at the ROOT (agent-host.tsx)
   so it outlives navigation — including the navigation it causes itself, since
   a multi-step run drives the real screen. The shell's column is several levels
   BELOW that, inside the routed `AppShell`. `createPortal` is what lets one
   component be a child of the root in the React tree and a child of the column
   in the DOM; web/lib/agent-dock.tsx holds the node and the whole argument.
   ───────────────────────────────────────────────────────────────────────────── */

/** WHAT BOTH BOXES PAINT, and it is the whole of what the owner ruled on.
 *
 * ITEM 1 (owner, 31 Aug 2026 — the precise repeat of the 28 Aug report,
 * GAPS-A.md OVL-1): "the background of the assistant should be white, and his
 * messages in beige." AT THE TIME, `--card` and `--popover` were #FFFEF9 in
 * light and #26241F in dark — IDENTICAL to `--background`, which is why the
 * earlier `bg-surface-panel` patch (still visible in git blame) never really
 * fixed it: `--surface-panel` (#F7F2EB light / #1C1B18 dark) sits only ONE
 * faint step from `--card`, not a genuinely different tone. So: the ground
 * was `bg-background` — the token tokens.css itself calls "the kwapso white"
 * — and every `bg-card` inside this one subtree (the assistant's bubble, its
 * composer pill, a pending confirm step's marker) is repointed, by a LOCALLY
 * SCOPED custom property, at `--surface-quiet` instead: #E2DDD4 light (a real
 * beige, not an off-white) and #3A3833 dark (distinctly lighter than the
 * near-black ground — the dark-mode variation the owner asked for). Still one
 * token each side, per R32 — reassigned for this one surface, not a new
 * colour, and not a change to `--card` anywhere else in the app. Your OWN
 * messages (`bg-surface-inverse`, ruling 36's charcoal-on-light /
 * off-beige-on-dark fill) were never part of this bug — checked: they sit
 * nowhere near the ground tone in either palette.
 *
 * ITEM 3 (owner, 31 Aug 2026): "fix the color of the texts... you invented that
 * color. refer to guide and rules for colors!" `--card-foreground` is set
 * EXPLICITLY here, alongside `--card`, rather than left to inherit — R32's own
 * words, "what a colour MEANS has a token": both halves of this surface's
 * paper/ink pair are now named together in one place instead of one being
 * declared and the other assumed. The VALUE is unchanged (`var(--foreground)`
 * is exactly what `--card-foreground` already resolves to globally —
 * tokens.css line 203 — so no bubble repaints), which is the honest finding
 * after tracing every text colour in this surface back to its source: the
 * assistant's bubble (`text-card-foreground`, agent-chat.tsx's `turnVariants`),
 * the composer's typed text (`text-foreground`, `textarea.tsx`'s own base
 * class, FLD-B5) and your own sent bubble (`text-ink-on-inverse`) all already
 * resolve through real, paired tokens with strong contrast in both palettes.
 * The one GENUINE gap found while tracing this: `shared/web/markdown-html.ts`
 * emits bare `<a>`/`<code>`/`<strong>` with no class at all, so a link inside
 * an assistant reply was rendering in the BROWSER'S default blue rather than
 * any app token — fixed in `agent-markdown.tsx`.
 *
 * CORRECTION (client screenshot, 3 Sep 2026, dark mode, Settings screen):
 * "the background of assistant should be the same as the background of
 * content." ITEM 1's own premise had gone stale under it without anybody
 * touching this file: a later dark-mode token pass (the three-spine work)
 * split `--card` (#26241F, `--kw-unlit-raised`) away from `--background`
 * (#141310, `--kw-unlit-page`) — they are NO LONGER identical in dark, only
 * in light (both still `--kw-off-beige`), which is exactly why this read as
 * "barely different near-blacks" instead of a loud break: it is dark-mode
 * only, and the two shades are close enough to miss without measuring them.
 * The content card was never painted from `--background` — it uses
 * `--surface-raised` (`screen-shell.tsx`'s `CARD`, `bg-[var(--surface-raised)]`),
 * which resolves through `--card` — so once the token split, this panel's own
 * `bg-background` quietly stopped matching the card it was built to sit
 * beside. Simply swapping to `bg-card`/`bg-[var(--surface-raised)]` ON THIS
 * SAME element is not the fix: this element ALSO repoints `--card` to
 * `--surface-quiet` for ITEM 1's own beige retint below, and a custom
 * property resolves from the FINAL cascaded value on an element, not
 * declaration order within one class list — reading `--card` here would read
 * the beige it just reassigned, not the true raised tone. So the two
 * concerns now live on two different elements: this outer surface reads the
 * genuine, un-repointed `--surface-raised` (`PANEL_SURFACE`, below), and the
 * `--card`/`--card-foreground` retint moves one level down, onto
 * `PANEL_QUIET_SCOPE`, wrapped around `{children}` at both render sites —
 * still scoped to exactly the same subtree (header included, same as
 * before), so every `bg-card` this comment already named (the bubble, the
 * composer pill, the confirm marker) keeps reading `--surface-quiet`
 * unchanged; only the PANEL's OWN ground now resolves independently of that
 * repoint. */
const PANEL_SURFACE = "flex flex-col overflow-hidden bg-[var(--surface-raised)]"

/** THE QUIET RETINT SCOPE — ITEM 1's `--card` → `--surface-quiet` reassignment,
 * moved off the outer surface (see the CORRECTION above `PANEL_SURFACE`) onto
 * a wrapper around `{children}`, so it retints the assistant's own bubble /
 * composer / confirm marker without also being read back by the ground
 * that surrounds them. `flex-1 min-h-0 flex-col` reproduces the layout the
 * outer element used to do directly (this wrapper is now its one child, and
 * needs to fill it the same way) so the header (`shrink-0`) and the content
 * column (`flex-1 min-h-0`) inside still stack and size exactly as before. */
const PANEL_QUIET_SCOPE =
  "flex flex-1 min-h-0 flex-col " +
  "[--card:var(--surface-quiet)] [--card-foreground:var(--foreground)]"

/** THE COLUMN. The kit's aside already owns the width (`ASIDE_WIDTH`, 23.75rem),
 * the inset and the column's own scroller, so this only has to FILL it — no
 * width of its own, which is also R29 by the letter (no second page measure).
 *
 * IT IS PAPER ON THE GROUND, EXACTLY AS THE CARD IS. `ScreenShell`'s own table
 * puts the aside at the same level as the rail — "NOT a container, lies on it,
 * paints nothing" — so the column paints nothing and the assistant's own
 * surface is this app's node: the same `rounded-[var(--radius)]` (R31, no third
 * radius) and the same `--shadow-lifted` the shell gives the screen card, so
 * the two things floating on the spine read as siblings rather than as a card
 * beside a bare stack. The background itself now lives on `PANEL_SURFACE`
 * (`bg-[var(--surface-raised)]`, the same expression `screen-shell.tsx`'s own
 * `CARD` uses for the content card) rather than here — see the CORRECTION
 * comment above it for why this used to say `bg-background` and no longer
 * does. */
const PANEL_COLUMN = "h-full w-full rounded-[var(--radius)] shadow-[var(--shadow-lifted)]"

/** THE DOCKED PANEL'S OWN LEADING CORNER, SQUARED. Client, 2026-09-03:
 * "Assistante (the name) should be a folder tab, like the breadcrumbs - then
 * the full container for the assistant would be aligned with the main one."
 * `screen-shell.tsx` draws a tab directly above this column, the SAME way the
 * content card's own trail sits above IT — so this panel needs the SAME "one
 * corner given up for the joint" move `CARD_JOINED` makes there, for the
 * identical reason: the tab's silhouette is a fixed SVG path (`folder.tsx`)
 * that may not be edited, and a plain CSS radius is this file's own to
 * remove. `rounded-ss-none`, not `-tl-`, so it mirrors with the tab in RTL
 * for free — R31 by the letter (zero is the absence of a radius, not a third
 * one; see `RADIUS_EXCEPTION["rounded-ss-none"]`). DOCKED ONLY: the floating
 * popover draws no tab above it and keeps all four corners, exactly as
 * before.
 *
 * WHICH TAB CHANGED (kit v1.2.88's `asideTabs`), THE GEOMETRY DID NOT. It
 * used to be the kit's own single fixed tab (`asideLabel`, through
 * `BreadcrumbFolders`, `screen-shell.tsx`'s own default); it is now
 * `AgentTabStrip`, portalled into the same `screen-shell-aside-tab` slot
 * (`app-shell.tsx`'s `asideTabs`, this file's own JSX below). Either way it
 * is a `BreadcrumbFolders` tab riding the identical fixed SVG silhouette
 * directly above this column, so the corner this squares off stays squared
 * for the identical reason. */
const PANEL_COLUMN_DOCKED = cn(PANEL_COLUMN, "rounded-ss-none")

function PanelFrame({ docked, children }: { docked: boolean; children: React.ReactNode }) {
  const dock = useAgentDock()

  if (docked) {
    // NO COLUMN, NO PANEL. The aside is not rendered at all when it is shut
    // (client, verbatim: "closed asstant show nothing. it's literally only the
    // bar"), and it is dropped outright on screens that draw no shell — login,
    // onboarding. Both arrive here as a null dock, and both mean the same
    // thing: there is nowhere to draw, so nothing is drawn. The panel itself
    // stays mounted above, so the thread and the live run are not lost.
    if (!dock) return null
    return createPortal(
      <div className={cn(PANEL_SURFACE, PANEL_COLUMN_DOCKED)}>
        <div className={PANEL_QUIET_SCOPE}>{children}</div>
      </div>,
      dock
    )
  }

  return (
    <PopoverContent
      side="top"
      align="end"
      sideOffset={12}
      collisionPadding={16}
      className={cn(
        PANEL_SURFACE,
        "p-0",
        // ITEM (owner, 1 Sep 2026): "make the assistant as wide as the
        // add/edit [panel]". That panel is `FormShellDialog`'s Sheet
        // (shared/web/form-shell.tsx), fixed the same day to
        // `w-[clamp(26.25rem,34vw,40rem)] max-w-[min(100%,40rem)]` — 420px
        // floor, 34% of the viewport in between, 640px ceiling, with a
        // matching `max-w` meant to stop the floor and the ceiling fighting on
        // a view narrower than 420px. Copied verbatim rather than re-derived,
        // so the two surfaces track the SAME number if it ever changes again.
        //
        // AND THE COPY BROUGHT A CAP THAT CANNOT WORK HERE. Measured live on
        // staging at a 375px viewport, 13 Sep 2026, while checking the owner's
        // "on any screen size, I would never like to scroll horizontally in
        // the chat": the panel was 473px wide with its right edge at 489 —
        // 114px off the screen, clipped rather than scrollable, so the last
        // characters of every line were simply unreachable.
        //
        // WHY `min(100%, 40rem)` NEVER PROTECTED ANYTHING ON THIS SURFACE. A
        // percentage resolves against the CONTAINING BLOCK, and a Radix
        // popover's content does not sit against the viewport — it sits inside
        // `[data-radix-popper-content-wrapper]`, which is `position: fixed`
        // with `min-width: max-content`. So the wrapper took its width from
        // the content (473px, the 420px floor plus insets) and the content's
        // `100%` then resolved against the wrapper: 100% of itself. Circular,
        // and therefore no cap at all. Read off `getComputedStyle` rather than
        // reasoned about — `max-width: min(100%, 720px)` on a box 472.5px wide.
        // The SHEET is not affected and keeps its own line: a Dialog's content
        // has no popper wrapper, so its `100%` is the viewport's.
        //
        // THE CAP HAS TO NAME THE VIEWPORT, then. `100vw` minus twice
        // `collisionPadding` (16 each side, set just above) is the same gutter
        // Radix would have left on its own, so the panel lands where collision
        // handling already wanted it. Verified live at 375px before this was
        // written: 339px wide, left 18, right 357, document scrollWidth equal
        // to clientWidth, and no turn's right edge past 339.
        "w-[clamp(26.25rem,34vw,40rem)] max-w-[min(calc(100vw-2rem),40rem)]",
        // ITEM 2 (owner, 31 Aug 2026): "make it taller until the top of the
        // page (while keeping its bubble behaviour)". `h-[100dvh]` is
        // deliberately larger than any viewport EVER is — the kit's own
        // `max-h-[var(--radix-popover-content-available-height)]` (from
        // `popover.tsx`'s SURFACE, still applied, untouched by this className)
        // is what actually wins: Radix computes that variable as the real gap
        // between the launcher and the viewport's top edge (minus
        // `collisionPadding`, 16 above), so the panel always grows to fill
        // exactly that space — with NO separate breakpoint math to keep in
        // sync with agent-host.tsx's launcher offsets.
        "h-[100dvh]",
        // ITEM (owner, 1 Sep 2026): "add a mango soft glow around it (#FED069)
        // so that it sticks more out of the page." #FED069 IS this app's
        // primary token, verbatim — `--kw-mango` (tokens.css line 145,
        // "PRIMARY. A fill, never a data colour."), `--primary` and
        // `--surface-brand` both resolve to it, in EITHER palette. So
        // `var(--primary)` reaches it directly rather than the literal hex the
        // owner quoted — R32 by the letter (no hex in this file) and by the
        // point (the colour still MEANS "primary" if that token is ever
        // retuned). `color-mix(in_srgb, var(--primary) 32%, transparent)` is
        // the same technique `sheet.tsx`'s own scrim already uses for a
        // translucent token fill — reached, not invented. Layered AFTER (not
        // replacing) the kit's own `--shadow-overlay` elevation shadow
        // (`popover.tsx`'s SURFACE, `shadow-xl`).
        //
        // IT IS THE FLOATING FORM'S ONLY, AND THAT IS THE ARGUMENT FOR IT. A
        // glow exists to lift a bubble off the page it is covering; a column
        // standing on the ground beside the card is not covering anything, and
        // a mango halo down the window's edge would be a second mango region
        // on a mango spine.
        "shadow-[var(--shadow-overlay),0_0_3rem_0.5rem_color-mix(in_srgb,var(--primary)_32%,transparent)]",
      )}
    >
      <div className={PANEL_QUIET_SCOPE}>{children}</div>
    </PopoverContent>
  )
}

export function AgentPanel({
  teamId,
  open,
  docked,
}: {
  teamId: string | null
  open: boolean
  // NO `onOpenChange` any more (ITEM 1, 31 Aug 2026) — this component had
  // exactly one use for it, the header's own ✕, which is gone outright: the
  // launcher already toggles open/closed (agent-host.tsx) and Escape /
  // outside-click still close a Popover unassisted. `open` stays (still
  // drives `useAgentChat`'s resume-on-open and the composer autofocus
  // effect); the setter that closed it does not.
  /** WHICH BOX THIS DRAWS IN — the shell's third column, or the floating panel.
   * Decided ONCE, by width, in agent-host.tsx, and passed rather than read here
   * so this component has no opinion about a breakpoint and there is one place
   * the question is asked. See `PanelFrame` above: it is the only thing the two
   * presentations do not share. */
  docked: boolean
}) {
  const { t, lang } = useLanguage()
  const { can } = usePermissions(teamId)
  const canUse = can("agent", "create")

  const chat = useAgentChat(teamId, open, canUse)
  const [usageOpen, setUsageOpen] = React.useState(false)
  // THE TAB LEVEL'S OWN DOCK NODE — `AgentTabStrip`'s new home, DOCKED ONLY
  // (kit v1.2.88's `asideTabs`; see the JSX below for the portal and
  // `web/lib/agent-dock.tsx` for the whole argument). `null` on the narrow,
  // floating presentation — there is no `ScreenShell` there to publish one —
  // which is exactly where the strip stays inline, as it always has.
  const dockTabs = useAgentDockTabs()

  /* ── THE TAB STRIP — the client's "+" ruling, 15 Sep 2026 ──────────────────
     web/lib/agent-conversation-tabs.ts carries the quote and the whole
     argument for this shape; this component only wires it to the one live
     chat (`use-agent-chat.tsx`) and to what the app currently has open
     (`workspace-tabs.ts`). */
  const agentTabs = useAgentTabs()
  const activeAgentTabId = useActiveAgentTabId()
  const activeAgentTab = agentTabs.find((tab) => tab.id === activeAgentTabId)
  // THE PINNED CLOCK TAB'S OWN VIEW — a second, 15 Sep 2026 ruling, same day:
  // "I like the history rail tab. Put it before the plus tab... when I click
  // on one, it would open in a tab." Its launcher WAS this row's own
  // "Past conversations" button, opening `agent-history-dialog.tsx` as a
  // sheet — retired outright below, the tab strip's clock tab is now the one
  // way to reach it (the same "one-mango" reasoning already retired the old
  // "New chat" button beside "+").
  const historyTabOpen = useHistoryTabOpen()

  // WHETHER "THIS RECORD" HAS SOMETHING TO POINT AT. `useActiveTabPath()` is
  // the same in-app address the main content trail tracks — reactive on every
  // soft navigation — and `parseRoute` reads its DEEPEST level exactly as the
  // deep-link shell does: a non-empty `recordId` is a record actually open,
  // not a bare collection or the team overview. KNOWN GAP: that tracking is
  // itself switched off on a narrow viewport (`workspace-tabs.ts`'s own
  // decision 5, "on a phone there is no tab set at all"), so on the floating
  // popover this can under-report — which is the conservative side to be
  // wrong on: the task's own rule is "if 'This record' has no current record,
  // hide that option," and hiding it a little more often than strictly
  // necessary never offers something it cannot deliver.
  const activeWorkspacePath = useActiveTabPath()
  const openWorkspaceTabs = useOpenTabs()
  const currentRoute = activeWorkspacePath ? parseRoute(activeWorkspacePath, "") : null
  const hasCurrentRecord = !!currentRoute?.recordId
  const currentRecordLabel = hasCurrentRecord
    ? (openWorkspaceTabs.find((tab) => tab.path === activeWorkspacePath)?.label ?? currentRoute?.recordId)
    : undefined

  // SEED, ONCE — a bare panel gets one tab standing for whatever it resumes
  // (or a blank one), never a picker. `seedAgentTabs` itself is the guard —
  // a real ONE-SHOT now (its own header has the reason), not merely "no-op
  // while a tab exists" — so this can run on every render without its own
  // gate, and it stays permanently inert once the reader has closed their
  // own last tab (see `handleCloseAgentTab` / the reopen effect below, which
  // is what a session-only "while empty" guard here would have raced).
  React.useEffect(() => {
    if (agentTabs.length === 0) seedAgentTabs(chat.threadId, t("Conversation"))
  }, [agentTabs.length, chat.threadId, t])

  // REOPENING AN EMPTY STRIP STARTS FRESH, ON THE PICKER — the other half of
  // the closing ruling, 15 Sep 2026 (see `handleCloseAgentTab` below for the
  // half that shuts the column). The seed above only ever fires ONCE per
  // session and never again once the strip has been non-empty — so by the
  // time `open` can transition back to `true` with zero tabs, it is because
  // the reader closed every conversation on purpose, not because nothing has
  // loaded yet. That reader pressing the top-right opener again should not
  // land back on the RESUMED thread the seed gave them at launch (gone, and
  // rightly — they closed it); "+" always opens the picker, and this is that
  // same door, pressed from outside instead of from the strip itself.
  const wasOpenRef = React.useRef(open)
  React.useEffect(() => {
    const wasOpen = wasOpenRef.current
    wasOpenRef.current = open
    if (open && !wasOpen && agentTabs.length === 0) {
      openNewAgentTab()
      chat.newChat()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agentTabs.length])

  // KEEP THE ACTIVE TAB'S THREAD IN STEP WITH THE ONE LIVE THREAD. Covers both
  // directions at once: a resume that finishes after the seed above, and a
  // draft tab's first message minting a real thread — `use-agent-chat.tsx`
  // sets `chat.threadId` the moment either happens, and whichever tab is
  // active right now is the one it happened TO, because switching tabs is a
  // synchronous swap (see `switchToAgentTab` below) before either can occur.
  React.useEffect(() => {
    if (!chat.threadId || !activeAgentTabId) return
    setAgentTabThread(activeAgentTabId, chat.threadId)
  }, [chat.threadId, activeAgentTabId])

  // Load whichever tab is now active into the one live chat — the swap model
  // `agent-conversation-tabs.ts`'s own header argues for. A tab with a real
  // thread resumes it (identical to the history tab's own `onPick`, below); a
  // draft (no thread yet — still on the picker, or scoped but not sent to)
  // starts from a clean slate.
  function switchToAgentTab(tab: { threadId?: string } | undefined) {
    if (tab?.threadId) void chat.openThread(tab.threadId)
    else chat.newChat()
  }

  function handleSelectAgentTab(id: string) {
    const tab = agentTabs.find((t) => t.id === id)
    if (!tab) return
    activateAgentTab(id)
    switchToAgentTab(tab)
  }

  function handleNewAgentTab() {
    openNewAgentTab()
    chat.newChat()
  }

  // A HISTORY ROW WAS PICKED — the client's own words, "when I click on one,
  // it would open in a tab": `openAgentTabForThread` brings the thread into
  // the strip (activating it if a tab already points there, opening one if
  // not) and closes History; `chat.openThread` is the identical resume call
  // `agent-history-dialog.tsx`'s own `onPick` used to make.
  function handlePickHistoryThread(threadId: string, topic: string) {
    openAgentTabForThread(threadId, topic)
    void chat.openThread(threadId)
  }

  // CLOSING THE LAST CONVERSATION TAB CLOSES THE COLUMN ITSELF — the client's
  // ruling, 15 Sep 2026, read together with the "only one tab level" one
  // (`web/lib/agent-dock.tsx`'s own header has that half in full): once
  // `AgentTabStrip` IS the aside's one tab level, a strip with nothing left
  // on it is not a state this app draws — History and "+" are furniture, not
  // conversations, so `closeAgentTab` returning `null` (its own doc: "a real
  // state here, just the '+' remains") is precisely "no conversation is open
  // any more," and the honest answer to that is the column going away, not an
  // empty transcript sitting open. `setAgentOpen(false)` is the exact call
  // the shell's own edge handle and the mobile Sparkle toggle already make —
  // one flag, still, never a second "closed because empty" state to keep in
  // step with it. The reopen effect above is this rule's other half: the
  // top-right opener does not resume what was just closed, it starts fresh
  // on the picker.
  function handleCloseAgentTab(id: string) {
    const wasActive = id === activeAgentTabId
    const landingId = closeAgentTab(id)
    if (landingId === null) setAgentOpen(false)
    if (!wasActive) return
    switchToAgentTab(landingId ? agentTabsSnapshot().find((t) => t.id === landingId) : undefined)
  }

  // A picker row was pressed: name the scope, then apply its reading-from
  // narrowing — diffed against whatever the shared source-chip row currently
  // holds, one `toggleSource` per key that disagrees, because `useAgentChat`
  // exposes only the single-key toggle (the same one `SourceChips` uses) and
  // not a bulk setter. "This record" also narrows to the app's own records
  // door and names the record in the first message, the identical convention
  // `ask-the-assistant.tsx` already uses for a record-scoped question
  // ("About {context}: …") — the chat door itself has no structured
  // record-id field to hand it instead.
  function handlePickScope(scope: AgentTabScope) {
    if (!activeAgentTabId) return
    const label =
      scope === "record"
        ? (currentRecordLabel ?? t("This record"))
        : scope === "knowledge"
          ? t("Knowledge base")
          : t("Everything (today's default)")
    pickAgentTabScope(activeAgentTabId, scope, label, scope === "record" ? currentRecordLabel : undefined)
    const target = scope === "record" ? ["records"] : scope === "knowledge" ? ["articles"] : [...SOURCE_CHIP_KEYS]
    for (const key of SOURCE_CHIP_KEYS) {
      const has = chat.sources.includes(key)
      const want = target.includes(key)
      if (has !== want) chat.toggleSource(key)
    }
  }

  // The record-scope prefix rides only the FIRST message of a record-scoped
  // tab — `!tab.threadId` is "nothing sent yet in this tab", the same signal
  // `setAgentTabThread` clears the moment the server mints one.
  function handleSend(text: string) {
    const tab = activeAgentTab
    const prefixed =
      tab?.scope === "record" && !tab.threadId && tab.recordLabel ? `About ${tab.recordLabel}: ${text}` : text
    return chat.send(prefixed)
  }

  // ESCAPE ON A PICKER TAB CLOSES IT — the task's own rule for a surface drawn
  // in the tab body rather than a dialog. DOCKED ONLY: on the narrow, floating
  // presentation Escape already closes the whole `Popover` (Radix's own
  // default — nothing here changes it), so a second handler would only race
  // it, never add anything.
  React.useEffect(() => {
    if (!docked || !open || !activeAgentTabId || activeAgentTab?.scope !== null) return
    const id = activeAgentTabId
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleCloseAgentTab(id)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
    // `handleCloseAgentTab` is remade every render (it closes over `chat`,
    // itself a fresh object each render — the same reason use-agent-chat.tsx's
    // own "handed-in question" effect excludes `send`) — listing it would tear
    // this listener down and rebuild it on every keystroke elsewhere in the
    // panel while the picker sits open, for a value that is already read
    // fresh, by id, the moment Escape actually fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docked, open, activeAgentTabId, activeAgentTab?.scope])

  // Hand focus to the composer once the popover has animated in — Radix
  // focuses the PANEL by default, so keystrokes hit it (and paint a focus
  // ring around the whole bubble) instead of the message box. Best-effort: if
  // the textarea isn't there (no rights), nothing happens.
  React.useEffect(() => {
    if (!open || !canUse) return
    const id = setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>(".agent-chat-host textarea")?.focus()
    }, 120)
    return () => clearTimeout(id)
  }, [open, canUse])

  // AVATARS ARE GONE (owner, 3 Sep 2026, verbatim: "remove the avatars from
  // the assistant chat - they take too much space"). ITEM 6 above (the round,
  // punched-through-ring marks this section used to build for both sides) is
  // reversed outright, not hidden: `avatars={false}` below, on the AgentChat
  // call itself, so the kit renders neither `userAvatar` nor
  // `assistantAvatar` at all and the row's own `gap-2` toward them collapses
  // with them — the bubble's own flex item is the row's only remaining
  // child, so it gets the full 62%/85% cap to itself instead of sharing it
  // with a 20px mark, which is the "reclaim the space" half of the ask.
  //
  // SPEAKER IDENTITY DOES NOT NEED A REPLACEMENT, because it was never
  // resting on the avatar alone. `agent-chat.tsx`'s own ruling 36 already
  // draws the two sides on two different signals that have nothing to do
  // with the mark: SIDE (`self-end`/`self-start` — yours right, its left) and
  // FILL (`bg-surface-inverse` charcoal for you, `bg-card` paper for it) —
  // "Threads are yours-right on the charcoal fill, theirs-left on paper,
  // avatars outside" is one ruling naming three signals, and only the third
  // is what this item removes. A screen reader was never told by the avatar
  // either: the role is `sr-only` above each bubble regardless (`userLabel`/
  // `assistantLabel` in the kit component), untouched by this change. So the
  // two speakers stay unambiguous through alignment + fill exactly as they
  // did before the avatar existed on top of them; nothing new is invented
  // here to replace it.

  // ITEM 7, TAKEN FURTHER THREE TIMES NOW (owner: 31 Aug "on top of the
  // bubble", then 1 Sep "make it eyebrow and aligned to right on my messages
  // and to left on the assistant's. a bit more space… currently its
  // overlapping", then the client's screenshot of the LOADING turn: a small
  // mango avatar beside "jus / t / no / w" — "just now" wrapping one letter
  // at a time down the panel, and a request that the label move BELOW the
  // bubble instead of above it, with the avatar riding the TOP of a tall,
  // multi-line bubble rather than its full-height centre.
  //
  // ROOT CAUSE OF THE LETTER-WRAP, FOUND ON THE PENDING TURN SPECIFICALLY:
  // the label used to be `inset-x-0` — STRETCHED to the width of its
  // positioned ancestor. That is fine once the bubble holds real words, but
  // the turn that is still waiting for its first token is pushed with
  // `content: ""` (use-agent-chat.tsx's optimistic placeholder), and an
  // empty box has nothing to size itself by: absolutely positioned
  // descendants take no part in a box's own width calculation (CSS §10.3.7),
  // so the bubble collapsed to its bare `px-4`/padding and the label
  // stretched to fit THAT — a container a few pixels wide, which is exactly
  // where "just now" started breaking one character per line. Fixed at the
  // root two ways at once: the label is `whitespace-nowrap` now (its own
  // width, never a container's, so nothing it sits inside can ever pinch it
  // apart) and the pending turn no longer reaches this function at all — see
  // the `messages` filter below, which keeps the empty placeholder out of
  // the rendered list while `AgentChat`'s own `thinking` dots stand in for
  // it instead. Belt and braces: even a short REAL reply can never repeat
  // this now.
  //
  // BELOW, NOT ABOVE. Anchored one level up from before: `relative` moved
  // from the bubble itself to the COLUMN that holds the bubble, its sources
  // and its footnote (the same descendant-selector technique, now
  // `[&_[data-slot=agent-chat-turn]>div]:relative`, below), so `top-full`
  // resolves against the column's own auto height — the bottom of WHATEVER
  // that turn rendered last (a plain reply's bubble, or a cited one's source
  // pills under it) — rather than the bubble alone. A label anchored to the
  // bubble would have sat on top of a citation pill on any turn that carries
  // one; anchored to the column it can't, because an absolutely positioned
  // box takes no part in ITS OWN containing block's height either, so
  // `top-full` always lands past every in-flow sibling, never over one.
  //
  // ALIGNMENT: "right on my messages, left on the assistant's" is now
  // `end-0`/`start-0` (logical, RTL-safe) rather than a full-width
  // `text-align` — the label hugs the edge its bubble already sits on
  // without needing to stretch across it first.
  const eyebrow = (createdAt: string | undefined, role: "user" | "assistant") =>
    createdAt ? (
      <span
        className={cn(
          "absolute top-full mt-1 whitespace-nowrap text-micro tabular-nums text-ink-tertiary",
          role === "user" ? "end-0" : "start-0"
        )}
      >
        {formatRelative(createdAt, t, lang)}
      </span>
    ) : null

  // THE TAB STRIP ITSELF — built once, placed differently by presentation
  // (see the JSX below). Drawn only once there is a conversation surface at
  // all (`canUse`); a role the assistant is closed to has nothing for tabs
  // to switch between.
  const tabStrip = canUse ? (
    <AgentTabStrip
      tabs={agentTabs}
      activeId={activeAgentTabId}
      historyActive={historyTabOpen}
      onSelect={handleSelectAgentTab}
      onClose={handleCloseAgentTab}
      onNew={handleNewAgentTab}
      onOpenHistory={openHistoryTab}
      onReorder={reorderAgentTab}
    />
  ) : null

  return (
    // ONE TREE, TWO BOXES — `PanelFrame` above, and everything from here down
    // is drawn identically in both. Wide: the shell's third column. Narrow: the
    // floating panel the rest of this comment argues for, which is still
    // exactly what a phone gets because the kit drops its aside below `md`.
    //
    // ITEM 2 (owner, 31 Aug 2026): "more like a bubble coming out of its
    // button, instead of a slide-in". A `Popover`, anchored to the launcher
    // button in agent-host.tsx (which owns the `Popover` root + trigger, and
    // renders this component as its content) — NOT the kit's own
    // `overlays/assistant.tsx` / `CopilotOverlay`. Checked first, per the law
    // of this change: that composition's own file header names it
    // "CONTRADICTION 1" — chapter 19 calls for a corner-anchored floating
    // card, but what got BUILT, on purpose, "because it is the delivery
    // contract", is a right-hand `Sheet` (`copilot-overlay.tsx` lines ~43-68).
    // Adopting it would trade one slide-in drawer for another, not for a
    // bubble — the one thing this change is asked to fix — while also
    // dropping this app's whole message model (streamed chunks, tool-step
    // rows, R23 citations, staged file attachments) for `CopilotOverlay`'s
    // flat `CopilotMessage` list, which has no concept of any of them. A
    // genuine mismatch, not a missed adoption (COMPOSITION-MISMATCHES.md
    // already carries a `[!]` row for it, on different — and now stale —
    // reasoning: it says this app's panel "is deliberately modal", which is
    // no longer true of this file at all — the panel was already
    // `modal={false}` before this change and stays non-modal now, only on a
    // different primitive. Worth a follow-up correction to that file; out of
    // scope here).
    //
    // So: the kit's own anchored primitive one level down — `Popover`
    // (`components/popover/popover.tsx`, 3 existing call sites) — composed by
    // hand into a chat-sized panel, same as `record-picker.tsx` composes
    // `Popover` + `Command` rather than reaching for a mismatched whole
    // composition. Never modal, never traps focus (Radix's own Popover
    // default — nothing passed here changes it), which is this surface's law
    // regardless of primitive: you can type in a table while the assistant is
    // open.
    //
    // The usage + history dialogs render as SIBLINGS of the popover content
    // (below), not nested inside it — exactly as they were siblings of
    // `SheetContent` before. Radix unmounts a closed overlay's content, so
    // nesting them inside would have closed Usage/ClockCounterClockwise the instant the
    // assistant bubble itself closed, which was never the intent (open Usage
    // from the panel, then dismiss the panel with Escape — Usage stays put).
    <>
    {/* THE TAB STRIP, DOCKED — a PORTAL, sibling to `PanelFrame` rather than a
        child of it. Client ruling, 15 Sep 2026, in two parts the same day:
        the "+" itself ("all the time, there is a visible tab that has a plus
        button"), and — over a screenshot of exactly the shape this used to
        be, nested one level inside the panel's own header — *"The tabs need
        to be at the same level as the assistant tab... it's only one tab
        level."* This IS that one level now: `useAgentDockTabs()` (above)
        reads the node `app-shell.tsx` publishes as `ScreenShell`'s
        `asideTabs` (kit v1.2.88), which lands the strip in
        `screen-shell-aside-tab` — the SAME slot the kit's own single fixed
        tab used to occupy, not a box inside `screen-shell-aside-body`
        underneath it. `docked && dockTabs` both have to be true: the second
        clause is the ordinary null-during-first-paint guard every dock read
        needs (`useAgentDock`'s own doc has the twin case), and the first is
        because the floating presentation publishes no such node at all — see
        below, where this same `tabStrip` renders inline instead.

        THE RE-BASE HACK THIS REPLACED IS GONE, AND ITS OWN MEASUREMENTS STAY
        HERE AS THE RECORD OF WHY. Until kit v1.2.88, `AgentTabStrip` was the
        aside body's own first child, nested UNDER the kit's fixed "Assistant"
        tab — and that tab pays `margin-block-end: calc(var(--folder-tab-
        overlap) * -1)` (`screen-shell.tsx`'s own comment: "the strip's feet
        land beneath the card's top edge"), pulling `screen-shell-aside-body`
        up 17.02px on purpose so a CARD underneath could ride over it. This
        panel IS that card everywhere else it is asked to be one, but nested
        here its own first child was a SECOND strip of tabs, not paper — so
        the pull landed on `AgentTabStrip` instead, stacked on top of that
        component's own unrelated -4.5px (its focus-ring padding given back),
        and the inner strip's first tab rendered under the outer tab's own
        painted area (measured on staging: `document.elementFromPoint` at
        that corner returned the OUTER tab). `mt-[var(--folder-tab-overlap)]`
        on a wrapping `<div>` was the fix — cancel the outer pull this was
        the first thing to receive. Once `AgentTabStrip` IS the one tab level
        rather than riding under it, there is no outer pull left to cancel:
        the wrapper and its margin are simply gone, not replaced by anything.
        `min-w-0` is a different fix for a different problem (still true, see
        `AgentDockTabsSlot`'s own doc) and survives — the kit's own
        `screen-shell-aside-tab` wrapper already carries it. */}
    {docked && dockTabs ? createPortal(tabStrip, dockTabs) : null}
    <PanelFrame docked={docked}>
      {/* THE TAB STRIP, FLOATING — unchanged in kind: the narrow popover
          draws no `ScreenShell` at all (`agent-host.tsx`'s own header), so
          there is no outer kit tab here to be "one level" wrong relative to
          and no dock node to portal into — the strip is simply this
          component's own first thing, exactly as it always has been. */}
      {!docked && tabStrip}
      <div className="flex shrink-0 flex-col gap-[var(--space-2h)] shadow-[var(--hairline-under)] px-4 pt-[var(--space-5)] pb-[var(--space-4h)]">
        {/* ITEM 1 (owner, 31 Aug 2026): "remove the x button on top right (i
            dont need it anymore)". The launcher button itself already toggles
            open/closed (agent-host.tsx, this round's own item 3 fix), and
            Escape / outside-click still close a Popover on their own — a
            second, redundant close control is gone outright, not just hidden.

            ITEM 5 — "put the + and history button... on top next to the
            title assistant... copy the rules for when we put buttons next to
            a title". That rule is a real, unused kit part: `Title`
            (shared/ui/components/title/title.tsx, 0 direct call sites before
            this) — eyebrow/heading on the start, `actions` pushed to the end
            with `ms-auto`, wrapping on a narrow row, exactly the "aligned
            with the title" convention record-chrome.tsx just adopted for
            record detail screens today (override 73 / the 31 Aug refinement).
            `rule={false}` — the heavy hairline `Title` draws under its own
            row would double up with this header block's own
            `shadow-[var(--hairline-under)]` underneath the quota badge.
            `size="h4"` — the "band inside a panel" step (20px), not `h2`'s
            32px page-section size; this is a popover, not a page.

            THE VISIBLE HEADING TEXT IS DOCKED-ONLY NOW. Client, 2026-09-03:
            "Assistante (the name) should be a folder tab, like the
            breadcrumbs - then the full container for the assistant would be
            aligned with the main one." — so on a wide screen the word
            "Assistant" moved OUT of this row and onto the folder tab
            `screen-shell.tsx` now draws above the whole column
            (`asideLabel`, through `BreadcrumbFolders`); saying it again here
            would be the same word twice, stacked. The heading stays — an
            `sr-only` span, not a removed element — because this row still
            needs an accessible name for its own action buttons' landmark and
            a docked screen reader shouldn't hear NOTHING where a heading was.
            THE POPOVER KEEPS THE VISIBLE WORD: the floating panel (narrow
            screens) draws no tab above it — there is nothing beside it to
            align with — so its own heading is still the only place the name
            is said, exactly as it always was. */}
        {/* NO ACTIONS IN THIS ROW ANY MORE. It held two buttons in turn and
            both are gone the same way, to the tab strip above: "New chat"
            first (ITEM 5's own comment on `Title`, below, still tells that
            half), and now "Past conversations" — the pinned clock tab
            (`AgentTabStrip`, the client's 15 Sep 2026 ruling: "I like the
            history rail tab. Put it before the plus tab") is the ONE way to
            reach `agent-history-tab.tsx` today, so a second button here
            would be the identical "one-mango" duplicate `agent-host.tsx`
            already argues against for the launcher. */}
        <Title as="h2" size="h4" rule={false}>
          {docked ? <span className="sr-only">{t("Assistant")}</span> : t("Assistant")}
        </Title>
        {/* ITEM 6 — "remove the subtitle... for space purposes". Gone outright
            (not hidden): the vertical room it held goes to the now much
            taller panel (item 2) instead. */}
        {canUse && chat.quotaLabel && (
          <div>
            <button
              type="button"
              onClick={() => setUsageOpen(true)}
              className="rounded-pill"
              title={t("See where your assistant credits went")}
            >
              <Badge
                variant={
                  chat.quota?.blocked
                    ? "destructive"
                    : // NEARLY OUT wears the warning colour — a colour, not a
                      // sentence, so R28 owes nothing. The threshold is the
                      // last handful, not a fraction: 3 is "you will feel this
                      // today", whatever the team's allowance is.
                      chat.quota && !chat.quota.unlimited && chat.quota.remaining <= 3
                      ? "warning"
                      : "secondary"
                }
                className="cursor-pointer text-badge"
              >
                {chat.quotaLabel}
              </Badge>
            </button>
          </div>
        )}
      </div>

      {!canUse ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-center text-sm">
          {t("The assistant isn't available for your role here.")}
        </div>
      ) : (
        // agent-chat-host scopes the composer autofocus selector. (It also
        // used to be the panel-wide drop zone for the chat import; that went
        // with the upload — see the comment over the composer below.)
        //
        // PADDING, REGULARIZED (owner, 1 Sep 2026, round 2 on this: "the
        // padding in the assistant on the sides is excessive. regularize with
        // standardized paddings. also it's missing padding from the bottom.").
        // `CardContent`'s `p-6 lg:p-[var(--space-7)]` (card.tsx) was borrowed
        // for the FIRST padding pass, but that pattern is sized for a page
        // CARD that genuinely widens at the `lg:` breakpoint — this panel
        // never does (`w-[clamp(26.25rem,34vw,40rem)]`, capped at 640px
        // always), so the 32px step was dead weight at best and, once item
        // 1's bubbles started using the FULL width inside it with their own
        // MINIMAL padding, read as an oversized gutter around content that
        // no longer needed one. `px-4` — plain, no responsive escalation — is
        // the flatter, more standard inset for a fixed-width floating panel;
        // AgentChat itself sets no horizontal inset of its own, so this is
        // still the one place the whole conversation's gutter is set.
        // `pb-4` is new: NOTHING below the composer/confirm-panel previously
        // reserved room from the panel's own bottom edge, so with no pending
        // confirm in view the composer's own pill could sit flush against it
        // — the "missing… padding from the bottom" the owner saw. Two
        // children still carry their own VERTICAL-only inset that would
        // double up on the horizontal if it came back: the confirm panel's
        // `py-4` and `AssistantLimitNotice`'s own `mb-2`. (A third, the
        // staged-attachment row's `pb-2`, went with the upload.)
        <div className="agent-chat-host flex min-h-0 flex-1 flex-col px-4 pb-4">
          {historyTabOpen ? (
            // THE PINNED CLOCK TAB'S BODY — V2 from the artifact, grouped by
            // last used (`agent-history-tab.tsx`'s own header carries the
            // client's ruling in full). Same move as the scope picker just
            // below: drawn INSIDE this tab body rather than as a dialog,
            // replacing the ordinary transcript and composer entirely while
            // it is the active tab.
            <AgentHistoryTab open={historyTabOpen} busy={chat.busy} onPick={handlePickHistoryThread} />
          ) : activeAgentTab?.scope === null ? (
            // THE SCOPE PICKER — a fresh "+" tab's first state, drawn INSIDE
            // this same tab body rather than as a dialog (Laws R59/R67; see
            // `agent-scope-picker.tsx`'s own header for the argument).
            // Replaces the ordinary transcript and composer entirely until a
            // row below is pressed.
            <AgentScopePicker hasRecord={hasCurrentRecord} onPick={handlePickScope} />
          ) : (
          <>
          {/* WHY IT COULDN'T ANSWER, when the model door was the reason.
              PINNED UNDER THE HEADER, above the conversation — the first
              placement put it under the composer, which on screen reads as a
              note stranded below the input rather than as a status the panel
              is reporting (seen in the browser, 27 Aug 2026; the composer
              belongs to AgentChat, so "above the composer" and "at the bottom
              of the panel" are the same place). It is a fact about the APP,
              not something the assistant said, so it stays outside the
              conversation entirely. Clears the moment the next question is
              asked. */}
          {chat.failure && <AssistantLimitNotice failure={chat.failure} />}

          {/* WHICH DOORS THIS CONVERSATION READS FROM — all on, untick to
              narrow. Control when somebody wants it, and a diagnostic when an
              answer smells wrong: re-ask with one chip on and see which door
              lied.

              UNDER THE HEADER, NOT UNDER THE INPUT, and the owner asked for
              "above the input". Two reasons, and the first is this file's own
              precedent: the limit notice was moved out from under the composer
              on 27 Aug 2026 because the composer belongs to `AgentChat`, so
              "above the composer" and "at the bottom of the panel" are the
              same place — and a row of controls stranded below the input reads
              as an afterthought rather than as the scope the conversation is
              running under. The second is that this IS the conversation's
              scope, not the message's: it is held for the whole thread, so it
              belongs where the thread's other facts are.

              THE LAST CHIP ON STAYS ON — see `toggleSource`: an empty list
              reads as "every door" everywhere behind this, so unticking the
              last one would silently WIDEN the search. */}
          <SourceChips sources={chat.sources} onToggle={chat.toggleSource} disabled={chat.busy} />

          {/* THE CHAT'S FILE UPLOAD IS GONE (owner, 13 Sep 2026: "the file
              upload feature is pretty useless, so let's get rid of that
              completely at the moment").
              WHAT WENT, AND WHAT DID NOT. This removes the ENTRANCE — the
              paperclip beside Send, the hidden file input, the panel-wide
              drop zone and the staged-file strip — and with it the client
              plumbing behind them (`addAttachments` / `attached` /
              `removeAttachment` in use-agent-chat.tsx). The IMPORT itself is
              untouched: `run_import_batch` is still a real tool on the
              catalogue with its own gate, its confirm payload and its MCP
              twin, and the Import screen still uploads a spreadsheet the
              ordinary way (`web/components/screens/import-screen.tsx`, which
              is why `web/lib/file-to-csv.ts` stays). Pulling the server half
              as well would have meant re-reasoning R9/R13/R19/R22/R27 parity
              and the MCP twin's own exemption line for a feature the owner
              asked to hide "at the moment" — so the capability sits behind a
              door nobody can open from the chat, and putting the door back is
              this commit reverted rather than a rebuild.
              THE TEXTAREA GOT ITS STRIP BACK. It reserved `pe-28` (112px) so
              typed text cleared BOTH the paperclip and Send; with only Send
              left the measured need is composer `pe-2` (8px) + Send's real
              ~45px + a gap, so `pe-14` (56px) is the honest number and the
              other 56px is returned to the words. */}
          <div className="relative min-h-0 flex-1">
            {/* Fill the panel and shed the component's own card chrome (it
             * ships as a standalone fixed-height card) so it reads as one
             * surface, not a card-in-a-card with a double border. The 3-dot
             * indicator shows only in the gap before the first streamed
             * event. */}
            <AgentChat
              className={cn(
                "h-full rounded-none border-0 bg-transparent",
                // The strip typed text must not run under — Send alone now
                // that the paperclip is gone (see the comment above this
                // element for the measurement).
                "[&_[data-slot=agent-chat-composer]_[data-slot=textarea]]:pe-14",
                // AND THE CARET NEEDS SOMEWHERE TO STAND (owner, 13 Sep 2026:
                // "the cursor is barely visible whenever I click inside the
                // empty input box... why not just shift the placeholder that
                // says 'Ask about your work' a tiny bit to the right so the
                // cursor can start a bit later and not get cut off?"). His
                // diagnosis was right and so was his fix.
                //
                // MEASURED on staging before and after, not reasoned about:
                // the textarea's `padding-inline-start` computed to 0px, so
                // the caret painted at x=0 of the content box — the exact
                // column the placeholder's own first glyph starts in. A caret
                // is one or two device pixels and a browser draws it centred
                // on that offset, so half of it lands outside the box and the
                // other half sits ON the "A". Nothing is clipping the pill:
                // the textarea already starts 23px inside it. The collision is
                // between the caret and the TEXT, which is why widening the
                // pill would not have helped and a colour change would not
                // either.
                //
                // `ps-1.5` (6px) is the whole fix, and it moves BOTH — caret
                // and placeholder shift together, so the gap the owner asked
                // for opens in front of the words rather than inside them. Set
                // here rather than on the pill because the pill's own
                // `padding-inline-start` is the kit's (22.5px) and is doing a
                // different job; this is the text's own inset. Verified live
                // at 6px: the textarea still fits its pill with the `pe-14`
                // strip intact, and the caret stands clear of the "A".
                "[&_[data-slot=agent-chat-composer]_[data-slot=textarea]]:ps-1.5",
                // ITEM (owner, 1 Sep 2026, on the text-write field
                // specifically): "this is the color of the text write field
                // #F7F2EB (like everywhere else!)". #F7F2EB is `--kw-soft-
                // paper`, which `--surface-panel` (and `--secondary`) already
                // resolve to — the token the recent pill-colour
                // standardisation pass put everywhere else, and the one
                // thing this composer never picked up. The composer pill is
                // `bg-card` (agent-chat.tsx, can't hand-edit), and `--card`
                // is already scoped once for this whole panel, at
                // `--surface-quiet` (item 1's message beige) — redefining it
                // AGAIN there would repaint the message bubbles too, which
                // nobody asked to change. So the redefinition happens one
                // level deeper, ON the composer itself: a CSS custom
                // property set directly on an element always wins over one
                // it would otherwise have inherited from an ancestor,
                // regardless of the ancestor rule's own specificity, so this
                // repoints `--card` to `--surface-panel` for the composer
                // (and only the composer) without touching the outer scope
                // or the bubbles at all. Verified live: computed
                // background-color on the composer pill is `rgb(247, 242,
                // 235)` (#F7F2EB) after this change, was `rgb(226, 221,
                // 212)` (#E2DDD4, the bubble's own tone) before it.
                "[&_[data-slot=agent-chat-composer]]:[--card:var(--surface-panel)]",
                // ITEM (owner, 1 Sep 2026): "make the text full width and add
                // minimum padding around it." Ruling 36's own 62% cap
                // (`max-w-[62%] … max-sm:max-w-[85%]`, agent-chat.tsx) is a
                // TURN-row width, not the bubble's — it caps how much of the
                // panel a message may use at all, which is exactly what the
                // owner is asking to lift: a long reply should wrap at the
                // panel's own width, not one-off at 62% of it. Full-width is
                // an UPPER bound, not a forced stretch: a short "ok" still
                // shrinks to its own text (`min-w-0`, unchanged), nothing
                // about that changed — only the CEILING moved.
                "[&_[data-slot=agent-chat-turn]]:max-w-full",
                // THE BUBBLE, REPOINTED TO MATCH THE COMPOSER (client, 31 Aug
                // 2026, on top of the composer fix a few lines up: "make the
                // message bubble beige too, same as the text field — #F7F2EB").
                // The assistant's bubble is `bg-card` (`turnVariants`, above),
                // and this whole panel already reassigns `--card` to
                // `--surface-quiet` at the QUIET scope (`PANEL_QUIET_SCOPE`,
                // wrapped around this whole subtree — item 1's fix; see the
                // CORRECTION comment on `PANEL_SURFACE` for why that
                // reassignment lives on its own wrapper now, not on the
                // panel's outer element) — which is exactly why the composer
                // needed its OWN, deeper override to reach `--surface-panel`
                // instead (see that comment for the mechanism: a custom
                // property set directly on an element wins over inheritance
                // regardless of the ancestor rule's own specificity). Same
                // technique, applied one scope up: this repoints `--card` to
                // `--surface-panel` for every `[data-slot=agent-chat-turn]`
                // (both roles' turn wrapper), which reaches the assistant's
                // `bg-card` bubble two levels down through ordinary
                // inheritance and touches nothing else that still reads
                // `--surface-quiet` from the quiet scope — your OWN bubble
                // (`bg-surface-inverse`, never part of `--card` at all) and
                // the pending-confirm marker (`RunSteps`, a sibling of
                // `AgentChat` outside this subtree) are both untouched, so the
                // turn-to-turn (you vs. the assistant) and
                // bubble-to-confirm-marker distinctions this panel already
                // relies on both survive. Separation from the PANEL's own
                // ground is still a FILL difference, never a stroke (rejected
                // outright by the client the same day, "pills no border!" —
                // see `web/app/layout.tsx`'s hairline comment): the panel
                // itself is `bg-[var(--surface-raised)]` (#FFFEF9 light /
                // #26241F dark — the CORRECTION comment on `PANEL_SURFACE`
                // above has the token-split history; this used to read
                // `bg-background` and no longer does), close to
                // `--surface-panel` (#F7F2EB / #1C1B18) in both palettes — the
                // same kind of gap the composer already stands on,
                // client-approved, so the bubble now reads exactly as
                // legible against the same ground.
                "[&_[data-slot=agent-chat-turn]]:[--card:var(--surface-panel)]",
                // The bubble itself — `turnVariants`' `px-4 py-3` — has no
                // `data-slot` of its own to target directly; it is reached
                // structurally, as "the first DIV inside a turn's own
                // column div" (the sr-only role name before it is a SPAN,
                // so `:first-of-type` on `div` skips it correctly). Logged
                // for Aurora same as the others: a REAL per-bubble className
                // slot on AgentChat would retire this the day it ships.
                //
                // THE PADDING CAME BACK UP (owner, 13 Sep 2026: "the words in
                // the chat bubbles are too close to the border"). It was cut
                // to `px-2 py-1.5` on 1 Sep for "minimum padding around it",
                // in the same breath as lifting the turn's 62% width cap —
                // and the two do not sit together: once a bubble may run the
                // panel's FULL width, the inset is the only thing left
                // holding the words off the edge, so the change that made the
                // measure long also made the gutter the thing you notice.
                // `px-3.5 py-2.5` is the middle of the two readings — clear
                // of the edge, still tighter than the kit's own `px-4 py-3`,
                // so the panel keeps the denser feel the 1 Sep pass was
                // after.
                "[&_[data-slot=agent-chat-turn]>div>div:first-of-type]:px-3.5",
                "[&_[data-slot=agent-chat-turn]>div>div:first-of-type]:py-2.5",
                // NOTHING IN A BUBBLE MAY SIZE THE PANEL (owner, same day: "on
                // any screen size, I would never like to scroll horizontally
                // in the chat"). Two different mechanisms, because the
                // sideways scroll had two different causes and fixing either
                // alone leaves the other.
                //
                // (1) `min-w-0` on the turn and its column. Every ancestor
                // between the bubble's contents and the panel is a flex item,
                // and a flex item's `min-width` is `auto` — it REFUSES to
                // shrink below its content. That is why a wide child pushed
                // the whole conversation sideways rather than being clipped:
                // nothing above it was allowed to be narrower than it.
                //
                // (2) containment, and NOT ON THE BUBBLE. `min-w-0` lets a box
                // shrink; it does not stop a box being SIZED BY ITS CONTENTS,
                // which is the half `agent-markdown.tsx` learned the hard way
                // on its own tables. The tempting one-liner is `contain:
                // inline-size` on the bubble itself — and it is wrong here: a
                // contained box takes its width from the room it is GIVEN
                // rather than from its words, so every bubble in the panel
                // would stretch to full width and a one-word "ok" would draw
                // the same box as a paragraph. The shrink-to-fit bubble is
                // deliberate (see the `max-w-full` ruling above: full width is
                // a CEILING, not a stretch). So containment goes on the
                // handful of children that can actually be wide, each in its
                // own file: a markdown table and a refused code fence
                // (agent-markdown.tsx), and a drawn table block
                // (agent-blocks.tsx). Prose needs none — it wraps, and
                // `overflow-wrap: anywhere` there covers the one token that
                // cannot.
                "[&_[data-slot=agent-chat-turn]]:min-w-0",
                "[&_[data-slot=agent-chat-turn]>div]:min-w-0",
                // `relative` moved UP a level, off the bubble and onto the
                // COLUMN that holds it (the bubble, its sources, its
                // footnote) — see the long comment above the `eyebrow`
                // function for why: anchoring the timestamp to the column
                // rather than the bubble is what lets `top-full` clear a
                // turn's sources pills instead of sitting on top of them.
                "[&_[data-slot=agent-chat-turn]>div]:relative",
                // The avatar-to-bubble vertical alignment (top-align a tall,
                // wrapped bubble instead of centring the mark against its
                // full height) is fixed once, for every consumer of the
                // library's chat parts, in shared/web/library-overrides.css
                // — not repeated here as a one-off. See that file for why.
                //
                // ITEM 7's timestamp sits BELOW each bubble rather than above
                // it (see `eyebrow`, above), which is why this can't just be
                // the kit's own 10px turn gap (`--space-2h`) — a turn's own
                // label needs room to clear before the NEXT turn's bubble
                // starts.
                //
                // TOO MUCH BLANK SPACE (client screenshot, 1 Sep 2026): a
                // question, a visible gap, two tool-step pills, another gap,
                // then the answer — `--space-7` (32px) was landed for the
                // eyebrow clearance above and never re-checked against how it
                // reads with the tool-step chips this turn gap also governs
                // (agent-chat.tsx has one `agent-chat-turns` gap for every
                // turn — a real message or a tool-step chip alike), where a
                // 32px gap around a one-line chip reads as dead air rather
                // than structure. MEASURED on this exact conversation shape
                // (question → 2 tool chips → answer), live, via
                // `getBoundingClientRect`: the eyebrow's own box (line-height
                // + its `mt-1`) bottoms out 17px below its turn's own bottom
                // edge, so 32px was carrying 15px more clearance than the
                // label ever needed. `--space-5` (20px) is the nearest named
                // step that still clears it (measured, not assumed: turn
                // bottom 115 + gap 20 = 135, past the eyebrow's own bottom at
                // 132) — tokens.css ruling 28's "above 32px use the named
                // token" doesn't apply below it, but staying on the named
                // ladder rather than an arbitrary `gap-[]` keeps this
                // consistent with every other spacing decision in this file.
                "[&_[data-slot=agent-chat-turns]]:gap-[var(--space-5)]"
              )}
              // ITEM (3 Sep 2026) — no marks on either side any more (see the
              // comment above this function for why speaker identity does
              // not need a replacement).
              avatars={false}
              // NO `header` any more (ITEM 5, 31 Aug 2026) — ClockCounterClockwise and New
              // chat moved UP to share the panel's own `Title` row, aligned
              // with "Assistant" per the just-established title/actions
              // convention (see the comment above the `Title` element). The
              // kit's own AssistantMark + heading this slot would have drawn
              // are gone with it: the panel's title already names it, once.
              // The kit's chat knows user and assistant; a TOOL STEP renders
              // as a quiet assistant-side chip carrying the step's outcome.
              //
              // THE PENDING REPLY BUBBLE IS DROPPED HERE, NOT RENDERED EMPTY.
              // send()/resolve() (use-agent-chat.tsx) push the next assistant
              // turn optimistically, before anything has arrived, so it can
              // be found and filled the moment text streams in — carrying
              // `content: ""` until then. Rendering that bubble was the
              // whole bug: an empty box has no width of its own to offer the
              // timestamp beneath it (see `eyebrow`'s comment), and a
              // blinking caret with no words to sit after read as nothing
              // happening at all rather than as a reply in progress (the
              // client's own report — no visible sign the assistant was
              // composing). The turn stays IN `chat.items` throughout (the
              // hook still needs it as the target text deltas write into),
              // it just does not reach the kit's render list while it is
              // still empty — `AgentChat`'s own `thinking` state (three
              // breathing dots, its own turn, below) stands in for it
              // instead, which is the state the library actually built for
              // this wait.
              messages={chat.items
                .filter((it) => !(it.role === "assistant" && it.content === ""))
                .map((it: AgentChatItem) => {
                  if (it.role === "tool") {
                    const mark =
                      it.status === "pending" ? (
                        <Spinner size="sm" />
                      ) : it.status === "failed" ? (
                        <X className="text-destructive size-3.5" aria-hidden />
                      ) : (
                        <Check className="text-success size-3.5" aria-hidden />
                      )
                    return {
                      id: it.id,
                      role: "assistant" as const,
                      content:
                        it.thought === undefined ? (
                          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                            {mark}
                            {it.actionLabel}
                          </span>
                        ) : (
                          // THE MODEL'S THINKING, ONE PRESS AWAY — the same
                          // disclosure the turn's sources use (agent-sources.tsx),
                          // closed by default because it is scratch work: rough,
                          // unedited, and not the answer. It streams while the
                          // step runs, which is the point — a long step used to
                          // look dead for a minute at a time.
                          // No `[contain:inline-size]` here, unlike the sources
                          // strip: that one sits inside an answer with prose to
                          // give the bubble a width, this one IS the bubble's
                          // whole content. Closed, the row is as wide as its
                          // label; open, the notes widen it up to the kit's own
                          // cap and wrap there. Measured on staging, 14 Sep
                          // 2026: with containment the open notes were squeezed
                          // into a column as wide as the words "Working it out".
                          <Collapsible>
                            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
                              {mark}
                              {it.actionLabel}
                              <CaretDown className="motion-disclosure-marker size-3.5" aria-hidden />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <p className="text-muted-foreground mt-1 text-xs">{t("Rough notes, not the answer.")}</p>
                              <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap [overflow-wrap:anywhere]">{it.thought}</p>
                            </CollapsibleContent>
                          </Collapsible>
                        ),
                    }
                  }
                  // WHAT THIS TURN READ (Law R23), in the kit's ruled shape.
                  // `evidence` is app data — a knowledge citation with a kind, a
                  // record path and the passage's own words — and the kit's
                  // `sources` is two names and a link. The mapping is the whole
                  // job of agent-sources.tsx; the numbering is the kit's, derived
                  // from this array's order, so a mark in the prose and the pill
                  // under it cannot disagree.
                  const { evidence, createdAt, ...message } = it
                  const withSources =
                    evidence && teamId ? (
                      <>
                        {message.content}
                        {/* The passages, one press away, INSIDE the turn's own
                            body — see agent-sources.tsx for why it is here
                            rather than in the `actions` slot. */}
                        <TurnSources evidence={evidence} teamId={teamId} />
                      </>
                    ) : (
                      message.content
                    )
                  return {
                    ...message,
                    ...(evidence && teamId ? { sources: citationPills(evidence, t) } : null),
                    content: (
                      <>
                        {eyebrow(createdAt, message.role)}
                        {withSources}
                      </>
                    ),
                  }
                })}
              // The caret at the end of a turn's own words — on once real
              // text is actually arriving, never before (see `streamingReply`
              // in use-agent-chat.tsx: it is the complement of `showTyping`
              // below, specifically so the two can never both point at the
              // same turn — a caret blinking after a tool-step chip's label
              // was the failure mode that made them separate props).
              streaming={chat.streamingReply}
              // NOTHING HAS ARRIVED YET. The kit's own state for this wait —
              // three breathing dots, drawn as their own turn beneath
              // whatever tool steps are already showing — replacing the
              // caret-in-an-empty-bubble that used to be the only sign
              // anything was happening (see the long comment on `messages`,
              // above).
              thinking={chat.showTyping}
              disabled={chat.busy || chat.quota?.blocked || !!chat.pending}
              // THE EMPTY PANEL, THROUGH THE KIT'S OWN REGISTER RATHER THAN A
              // HAND-BUILT BOX.
              //
              // THE OWNER, 26 Aug 2026: "the interface of the chat is still
              // quite wonky and weird, not only when the chat is new but even
              // in an existing chat."
              //
              // The examples were a bare `flex max-w-64 flex-col` — vertically
              // centred by the kit's empty register, horizontally NOT, so two
              // ragged left-aligned lines hung in the middle of an otherwise
              // empty panel with no eyebrow, no measure and no relationship to
              // anything above or below them. It is the one screen state a new
              // person always sees, and it was the one part of this panel the
              // design system had never drawn.
              //
              // `CollectionRegister` is what the kit puts in an empty region
              // everywhere else in the app — eyebrow, centred body, the 40ch
              // measure — so the assistant's blank state now looks like every
              // other blank state instead of like a mistake. Email-free on
              // purpose: an inline address auto-detects on phones and breaks
              // the centred line mid-quote.
              emptyState={
                <CollectionRegister
                  tone="quiet"
                  eyebrow={t("Try asking")}
                  body={t("“Invite a member as a Viewer”, or “what changed this week?”")}
                />
              }
              onSend={(text) => void handleSend(text)}
            />
          </div>

          {/* A paused turn: the proposed actions + approve / decline. */}
          {chat.pending && (
            <div className="flex flex-col gap-4 shadow-[var(--hairline-over)] py-4">
              <p className="text-sm font-medium">{t("I'd like to make these changes:")}</p>
              {/* Each step now carries the PAYLOAD under its label (a role's
               * whole access sheet is a dozen lines), so the list scrolls on
               * its own and the two buttons stay where a thumb expects them —
               * a confirm you have to hunt for is nearly as bad as one you
               * can't read. */}
              <div className="max-h-[40vh] min-h-0 overflow-y-auto">
                <RunSteps steps={chat.confirmSteps} />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void chat.resolve(false)}
                  disabled={chat.busy}
                >
                  {t("Not now")}
                </Button>
                <Button size="sm" onClick={() => void chat.resolve(true)} disabled={chat.busy}>
                  {t("Go ahead")}
                </Button>
              </div>
            </div>
          )}
          </>
          )}
        </div>
      )}
    </PanelFrame>

      {/* NO SIBLING HISTORY DIALOG ANY MORE — `agent-history-dialog.tsx` is
          retired outright, its one launcher (the removed "Past
          conversations" button, above) and its whole surface both replaced
          by the pinned clock tab's own body, rendered INSIDE `PanelFrame`
          above rather than as a second overlay beside it. */}
      <AgentUsageDialog open={usageOpen} onOpenChange={setUsageOpen} summary={chat.usageSummary} />
    </>
  )
}
