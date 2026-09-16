"use client"

// THE ASSISTANT'S OWN TAB STRIP — one folder tab per open conversation,
// FIRST; then the pinned clock tab that opens History; the "+" that is
// always LAST and never closes. History sits immediately to the LEFT of
// "+" — not at the very front of the strip. Client ruling, 15 Sep 2026, said
// in two parts the same day (see web/lib/agent-conversation-tabs.ts for both
// quotes in full and for why a conversation tab is a different shape from
// `workspace-tabs.ts`'s record ones): the "+" first, then "I like the
// history rail tab. Put it before the plus tab." The first build read that
// second sentence as "ahead of everything, including every open
// conversation" and pinned History at index 0 — the client's follow-up
// correction, 16 Sep 2026, over a screenshot of exactly that: "I want the
// history tab to be on the left of the plus, not the very far left. Put it
// to the left of the plus." So "before the plus tab" meant only that: History
// sits directly to the plus tab's left, after every conversation tab, never
// ahead of the strip.
//
// DRAWN WITH THE KIT'S OWN `BreadcrumbFolders` — the identical component the
// main content trail uses (`web/components/shell/app-shell.tsx`), called
// directly here rather than through `ScreenShell`'s `asideLabel`.
//
// THIS STRIP IS NOW THE ASIDE'S ONE AND ONLY TAB LEVEL, NOT A SECOND ONE
// BELOW IT. A first version of this file drew here because `asideLabel` was
// a single `string` the kit turned into exactly one fixed tab and offered no
// prop for a caller-supplied item ARRAY — so this strip mounted one level
// BELOW that fixed "Assistant" tab, inside the panel's own header, and
// `agent-panel.tsx` carried a `mt-[var(--folder-tab-overlap)]` hack to pull
// it clear of the outer tab's own negative margin. The client's ruling,
// 15 Sep 2026, over a screenshot of exactly that: *"You got it completely
// wrong. The tabs need to be at the same level as the assistant tab, so it
// will have no assistant name. We know that's what it is. Rather, each tab
// will have the name. Now you create it like a sub-level, but no, no, it's
// only one tab level."* The kit answered with `ScreenShell`'s `asideTabs`
// prop (kit v1.2.88): this component is now handed there directly, IN PLACE
// of the kit's own fixed tab rather than nested under it — see
// `web/lib/agent-dock.tsx`'s `AgentDockTabsSlot` for the portal that gets it
// there from `AgentPanel` (mounted at the root) and `agent-panel.tsx`'s own
// header for what the re-base hack retired with it. `asideLabel` still names
// the landmark (`role="complementary"`'s `aria-label`); it draws no visible
// tab at all once `asideTabs` is given.
//
// `BreadcrumbFolders` ITSELF WAS NEVER THE WALL. It already took a plain
// `items: BreadcrumbFoldersItem[]`, so this file is a second, direct call
// site of the exported component — the same move `app-shell.tsx` already
// makes for the record trail. The kit's own file even names this exact need
// and its own answer: `breadcrumb-folders.tsx`'s closing comment (2026-09-06)
// considered exporting its tab's private skin classes for "a '+' slot at the
// end of a tab set — the obvious one" and refused, because a class string is
// not an interface. Its answer is "ship the THING, not the string": pass the
// "+" as an ordinary item in `items` and let the component draw it in its own
// skin — which is what this file does. Nothing here reaches for an unexported
// class, and nothing here needed a kit round-trip for its OWN drawing — only
// the SLOT it now rides in did (`asideTabs`, above).
//
// THE "+" IS AN ITEM, NOT A SEPARATE CONTROL. `BreadcrumbFoldersItem.closable`
// defaults to `true` once `onClose` is given; this file's own last item sets
// it `false`, the kit's existing, documented way to keep one tab out of the
// closable set — see that field's own doc, and see `MAX_AGENT_TABS` for why
// this is enough on its own to satisfy "never closable" without a second
// mechanism. Its `label` is an icon plus an `sr-only` span — the same pattern
// this panel already uses one row up for its own heading
// (`agent-panel.tsx`'s `<span className="sr-only">{t("Assistant")}</span>`)
// — rather than a string `aria-label` on the item, which
// `BreadcrumbFoldersItem` has no field for (only the close BUTTON's own label
// is settable per item). A visually-hidden text node is the reliable half of
// the accessible-name computation for an anchor, so the name does not depend
// on whether a nested, un-labelled icon happens to fold in.
//
// EVERY ITEM'S `href` IS A FRAGMENT, NEVER A ROUTE. A conversation tab is not
// an address — activating one is a SWAP of the one live thread
// (`use-agent-chat.tsx`), never a navigation — so each item carries
// `#agent-tab:<id>` purely so the strip's own click interception
// (`onClickCapture`, the identical mechanism `app-shell.tsx` runs on the
// content trail, R37) can tell which tab was pressed. `preventDefault` fires
// on every click here, unconditionally: nothing in this strip may ever change
// the address bar.

import * as React from "react"

import { ClockCounterClockwise, Plus } from "@shared/ui/foundations/icons"
import { BreadcrumbFolders, type BreadcrumbFoldersItem } from "@shared/ui/components/breadcrumbs/breadcrumb-folders"

import { useT } from "@shared/web/language"
import type { AgentTab } from "@/lib/agent-conversation-tabs"

const NEW_TAB_HREF = "#agent-tab:new"
// A DIFFERENT HASH FAMILY FROM `TAB_HREF_PREFIX`, ON PURPOSE — the History
// tab is not a conversation and carries no `id` in `agent-conversation-
// tabs.ts` at all (same reasoning as "+", see that file's own header), so its
// href must never collide with `#agent-tab:<id>` and be misread as a select
// of a tab literally named "history".
const HISTORY_TAB_HREF = "#agent-history"
const TAB_HREF_PREFIX = "#agent-tab:"
const tabHref = (id: string) => `${TAB_HREF_PREFIX}${id}`

export function AgentTabStrip({
  tabs,
  activeId,
  historyActive,
  onSelect,
  onClose,
  onNew,
  onOpenHistory,
}: {
  tabs: AgentTab[]
  activeId: string | null
  /** Whether the pinned clock tab is the one showing right now — the same
   * "which crumb is live" question `activeId` answers for a real
   * conversation, asked of the one tab that isn't in `tabs` at all
   * (`useHistoryTabOpen`, `web/lib/agent-conversation-tabs.ts`). */
  historyActive: boolean
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
  /** Press the clock tab — opens `agent-history-tab.tsx` in place of the
   * ordinary transcript, same shape as `onNew` opening the picker. */
  onOpenHistory: () => void
}) {
  const t = useT()

  const items: BreadcrumbFoldersItem[] = [
    ...tabs.map(
      (tab): BreadcrumbFoldersItem => ({
        key: tab.id,
        // A DRAFT'S LABEL STARTS EMPTY (see `agent-conversation-tabs.ts`'s
        // own comment on `openNewAgentTab`) — this is the one place it is
        // said, translated, for the picker's own ghost tab.
        label: tab.label || t("New"),
        href: tabHref(tab.id),
      })
    ),
    {
      key: "history",
      label: (
        <>
          <ClockCounterClockwise aria-hidden className="size-[var(--icon-button)]" />
          <span className="sr-only">{t("History")}</span>
        </>
      ),
      href: HISTORY_TAB_HREF,
      // PINNED, LIKE "+" — the client's own ruling, 15 Sep 2026: "I like the
      // history rail tab. Put it before the plus tab", CORRECTED 16 Sep 2026
      // over a screenshot of History pinned ahead of every conversation
      // tab: "I want the history tab to be on the left of the plus, not the
      // very far left. Put it to the left of the plus." So History sits
      // AFTER every conversation tab and directly before "+" — never at the
      // front of the strip. Never closable, for the identical reason "+" is
      // neither: it is not a conversation, so there is nothing here for a ×
      // to close.
      closable: false,
    },
    {
      key: "new",
      label: (
        <>
          <Plus aria-hidden className="size-[var(--icon-button)]" />
          <span className="sr-only">{t("New conversation")}</span>
        </>
      ),
      href: NEW_TAB_HREF,
      // NEVER CLOSABLE — the client's own words, "all the time, there is a
      // visible tab [with a plus button]". This is the kit's own opt-out
      // (see the file header); without it this item would grow the identical
      // × every real conversation tab does the moment `onClose` is passed
      // below.
      closable: false,
    },
  ]

  // NO OFFSET ANY MORE. `tabs` now shares its indices with the LEADING run
  // of `items` byte for byte (a conversation tab's index in `tabs` is its
  // index in `items`, full stop) — History and "+" both trail the real
  // tabs now, so nothing here has to shift a `tabs` index to land on the
  // matching `items` one. `historyActive` points at History's own slot,
  // `tabs.length`, the position right after the last conversation tab.
  const tabIndex = activeId ? tabs.findIndex((tab) => tab.id === activeId) : -1
  const activeIndex = historyActive ? tabs.length : tabIndex >= 0 ? tabIndex : -1

  return (
    <BreadcrumbFolders
      items={items}
      label={t("Open conversations")}
      activeIndex={activeIndex}
      onClose={(item) => {
        if (typeof item.key === "string" && item.key !== "new" && item.key !== "history") onClose(item.key)
      }}
      closeLabel={t("Close tab")}
      onClickCapture={(e: React.MouseEvent) => {
        const a = (e.target as HTMLElement).closest("a")
        if (!a) return
        e.preventDefault()
        const href = a.getAttribute("href")
        if (href === NEW_TAB_HREF) {
          onNew()
          return
        }
        if (href === HISTORY_TAB_HREF) {
          onOpenHistory()
          return
        }
        if (href?.startsWith(TAB_HREF_PREFIX)) onSelect(href.slice(TAB_HREF_PREFIX.length))
      }}
    />
  )
}
