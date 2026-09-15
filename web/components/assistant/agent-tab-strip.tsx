"use client"

// THE ASSISTANT'S OWN TAB STRIP — one folder tab per open conversation, plus
// the "+" that is always last and never closes. Client ruling, 15 Sep 2026
// (see web/lib/agent-conversation-tabs.ts for the quote in full and for why a
// conversation tab is a different shape from `workspace-tabs.ts`'s record
// ones).
//
// DRAWN WITH THE KIT'S OWN `BreadcrumbFolders` — the identical component the
// main content trail uses (`web/components/shell/app-shell.tsx`), called
// directly here rather than through `ScreenShell`'s `asideLabel`.
//
// `asideLabel` IS NOT THIS STRIP'S DOOR, AND IT CANNOT BE. It is a single
// `string` the kit turns into exactly ONE fixed tab
// (`shared/ui/compositions/templates/screen-shell.tsx`:
// `<BreadcrumbFolders items={[{ label: asideLabel }]} onCurrentActivate={toggleAside} .../>`,
// hardcoded) — there is no prop there for a caller-supplied item ARRAY, so a
// strip of open conversations cannot be drawn through it without a change to
// the kit itself. That single "Assistant" tab is left exactly as it is; this
// strip draws one level BELOW it, inside the panel's own header.
//
// `BreadcrumbFolders` ITSELF IS NOT THAT WALL. It already takes a plain
// `items: BreadcrumbFoldersItem[]`, so this file is a second, direct call
// site of the exported component — the same move `app-shell.tsx` already
// makes for the record trail. The kit's own file even names this exact need
// and its own answer: `breadcrumb-folders.tsx`'s closing comment (2026-09-06)
// considered exporting its tab's private skin classes for "a '+' slot at the
// end of a tab set — the obvious one" and refused, because a class string is
// not an interface. Its answer is "ship the THING, not the string": pass the
// "+" as an ordinary item in `items` and let the component draw it in its own
// skin — which is what this file does. Nothing here reaches for an unexported
// class, and nothing here needed a kit round-trip.
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

import { Plus } from "@shared/ui/foundations/icons"
import { BreadcrumbFolders, type BreadcrumbFoldersItem } from "@shared/ui/components/breadcrumbs/breadcrumb-folders"

import { useT } from "@shared/web/language"
import type { AgentTab } from "@/lib/agent-conversation-tabs"

const NEW_TAB_HREF = "#agent-tab:new"
const TAB_HREF_PREFIX = "#agent-tab:"
const tabHref = (id: string) => `${TAB_HREF_PREFIX}${id}`

export function AgentTabStrip({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
}: {
  tabs: AgentTab[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
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

  const activeIndex = activeId ? tabs.findIndex((tab) => tab.id === activeId) : -1

  return (
    <BreadcrumbFolders
      items={items}
      label={t("Open conversations")}
      activeIndex={activeIndex}
      onClose={(item) => {
        if (typeof item.key === "string" && item.key !== "new") onClose(item.key)
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
        if (href?.startsWith(TAB_HREF_PREFIX)) onSelect(href.slice(TAB_HREF_PREFIX.length))
      }}
    />
  )
}
