"use client"

// The app-wide AI co-pilot, mounted ONCE at the root layout so it rides ABOVE every
// screen and SURVIVES navigation. The assistant's screen-trace moves the page beneath
// it, and switching screens never tears the panel (or its live chat + step pills) down
// — the bug this fixes was mounting the panel inside the per-route AppShell, so every
// navigation (including the agent's own trace) closed it and dropped the run.
//
// It owns the panel, the phone's anchored popover, and the screen-trace engine. It
// reads the ACTIVE team (the module-cached session — safe to read from anywhere) and
// renders nothing until you're signed in with a team, so login / onboarding have no
// co-pilot.
//
// ── IT PICKS THE PRESENTATION, AND IT IS THE ONLY PLACE THAT ASKS ─────────────
//
// Since 2026-09-03 the assistant is a permanent COLUMN on the shared ground —
// `ScreenShell`'s `aside`, mirroring the rail across the card — and the shell
// drops that column below `md`, because a phone cannot spend 380px on it and the
// kit draws no drawer to hide it in. So both presentations exist and the WIDTH
// chooses, once, here: `useShellColumns()` is the same 48rem the kit's own docks
// are gated on, so JS and CSS can never disagree about which one is showing.
//
//   wide   → docked. The panel portals itself into the shell's column
//            (web/lib/agent-dock.tsx). Shut, the shell's own EDGE HANDLE (its
//            top-trailing-corner mango circle) is what opens it — the only
//            control on the column while it renders nothing. Open, that
//            handle's own mid-edge close grab is gone (client ruling,
//            2026-09-15 — a second "close it" circle floating over the card,
//            the app-shell.tsx `asideHandleOnOpen={false}` header has the
//            whole account), and the column closes from its own folder tab
//            instead — its × (`BreadcrumbFolders.onClose`, inside the kit's
//            dock) or the tab body itself. No launcher is drawn at all.
//   narrow → floating, anchored to a fixed screen point below (see the return).
//            No visible launcher draws there any more (14 Sep 2026, see below) —
//            the mobile header's own Sparkle toggle (app-shell.tsx) opens and
//            closes it, and the anchor is only there to keep the popover
//            popping out of the corner it always has.
//
// THE LAUNCHER IS GONE ON WIDE SCREENS ON PURPOSE, AND IT IS THE ONE-MANGO RULE.
// A mango `size="icon"` button used to pin over the card there too; the shell's
// handle opens the same thing from the window's edge instead. Keeping both would
// be two controls for one decision AND a second mango control on every screen
// that already has its own — `SHELL.md`'s "only one mango in the pair", which the
// kit's own header spends four reasons on. The handle wins because it is the
// column's own affordance: it stands where the column will travel.
//
// ONE FLAG BEHIND BOTH. `useAgentOpen()` is the single "is the assistant showing"
// decision (web/lib/agent-open.ts, persisted per person like the rail's collapse),
// fed to the shell as `asideOpen` in app-shell.tsx and to the `Popover` here. A
// person who leaves it open on a laptop and turns the window narrow gets the
// floating panel already open, which is the honest reading of one flag.

import { Popover, PopoverAnchor } from "@shared/ui/components/popover/popover"

import { AgentPanel } from "@/components/assistant/agent-panel"
import { useActiveTeam } from "@/lib/use-active-team"
import { usePermissions } from "@/lib/perms"
import { useAgentOpen, setAgentOpen } from "@/lib/agent-open"
import { useScreenTraceEngine } from "@/lib/screen-trace"
import { useShellColumns } from "@/lib/use-is-phone"

export function AgentHost() {
  const active = useActiveTeam()
  const teamId = active.ctx?.team?.id ?? null
  const { can } = usePermissions(teamId)
  const open = useAgentOpen()
  const docked = useShellColumns()
  // The assistant's steps drive the REAL screen from wherever the host lives — stable
  // here (root), so a multi-step run keeps tracing even as the screen changes. Runs
  // before the early returns (hooks are unconditional); it no-ops with a null team.
  useScreenTraceEngine(teamId)

  // No team context yet (signed out, or on login / onboarding) → no co-pilot.
  if (!active.ctx) return null
  // Gated by agent:create, exactly as the old in-shell launcher was; the server
  // re-checks every action AS the signed-in user regardless.
  if (!can("agent", "create")) return null

  // DOCKED — no launcher, no `Popover`, no overlay of any kind. The panel is
  // still mounted HERE, at the root, and draws itself into the shell's column
  // through a portal; when the column is shut there is no column, so it draws
  // nothing and keeps its thread. "Closed assistant show nothing. It's literally
  // only the bar" (client, verbatim) is the shell's own behaviour, unassisted.
  if (docked) return <AgentPanel teamId={teamId} open={open} docked />

  return (
    // ITEM 2 (owner, 31 Aug 2026): "more like a bubble coming out of its
    // button, instead of a slide-in". `Popover` anchors the panel to a fixed
    // screen point, so the panel is a small anchored card in that corner, not
    // a full-height overlay drawn on top of it (agent-panel.tsx has the full
    // reasoning for choosing `Popover` over the kit's own
    // `overlays/assistant.tsx`).
    //
    // NARROW ONLY, since the shell's edge handle took the wide case (see the
    // header). The branch is not rendered at all when docked — so there is
    // never an invisible anchor holding an open `Popover` beside a docked
    // column.
    //
    // THE ROUND MANGO LAUNCHER IS GONE (owner, 14 Sep 2026, on a screenshot of
    // the open assistant: "remove the old close assistant button - we dont
    // need that anymore since now we close using the tab itself"). It used to
    // be a real `<Button>` here — `PopoverTrigger asChild`, toggling `open` on
    // every click, which doubled as this surface's close control. It was
    // never the only way in even on a phone: the mobile header already carries
    // its own Sparkle toggle on the exact same flag
    // (`app-shell.tsx`'s `md:hidden` row, `onClick={() => setAgentOpen(!assistantOpen)}`),
    // wired the day the docked edge handle shipped so a phone would have SOME
    // control once the launcher stopped drawing on wide screens — so two
    // redundant mango-ish toggles sat on one narrow screen. The knowledge
    // gallery's own "Ask" (`knowledge-screen.tsx`'s `openAskConversation`) is
    // a third opener again, calling `setAgentOpen` directly. Deleting the
    // button outright is safe: nothing becomes unreachable.
    //
    // BUT THE BUTTON WAS ALSO THE POPOVER'S ANCHOR, not just its trigger —
    // Radix positions `PopoverContent` against whatever DOM node this root's
    // `Trigger`/`Anchor` renders, and with neither mounted at all it has
    // nothing to measure and lands unpositioned. So the fixed screen point
    // stays as a bare `PopoverAnchor`: no fill, no glyph, no click handler,
    // just the same corner the panel has always popped out of.
    <Popover open={open} onOpenChange={setAgentOpen}>
      <PopoverAnchor asChild>
        <span aria-hidden className="fixed right-4 bottom-20" />
      </PopoverAnchor>
      <AgentPanel teamId={teamId} open={open} docked={false} />
    </Popover>
  )
}
