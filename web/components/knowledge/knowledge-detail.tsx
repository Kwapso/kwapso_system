"use client"

// One knowledge source, as a tabbed record: Source / Overview. Source = the
// exact words the assistant reads out of it, where they came from, and the two
// controls that matter — correct it, or take it away. Overview = how it is
// filed, who may use it, how many searchable pieces it became and when it was
// last indexed. Its history is still the GENERIC record feed (R5) and is still
// read here — it is simply not a tab any more: it is reached from the ink
// footer's Latest activity column, on the client's 2026-09-06 ruling, and
// web/components/records/activity-panel.tsx carries that ruling and the argument.
//
// WHY THE TEXT IS SHOWN IN FULL rather than summarised: this screen is the
// answer to "what does it actually know?", and a summary of the material is a
// different thing from the material. Somebody who reads an answer they disagree
// with comes here to see the words behind it, and then takes them away.
//
// Edit is gated by knowledge:update; taking a source away by knowledge:delete —
// the same rights the assistant is held to when it is asked to do either.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import { toast } from "@shared/ui/components/sonner/sonner"
import { TabsView } from "@shared/web/screen-engine/tabs-view"

import { ConnectionsPanel } from "@/components/records/connections-panel"
import { useRemembered } from "@shared/web/remembered"
import { Power } from "@shared/ui/foundations/icons"
import { EditPenButton } from "@shared/web/edit-pen-button"
import { fileTypeIcon } from "@shared/web/screen-engine/file-type-icon"

import type { Account, AppRow, KnowledgeSource } from "@shared/types"
import { RecordFooterBand, RecordScreen, STICKY_TABS, RECORD_TABS_CONFIG } from "@/components/records/record-chrome"
import { RecordDetailBody } from "@/components/records/record-detail-body"
import { KnowledgeFormDialog, type KnowledgeFormValues } from "@/components/knowledge/knowledge-form-dialog"
import { KNOWLEDGE_KIND } from "@/components/deep-link/shape"
import { OverviewList } from "@/components/records/overview-list"
import { TranslateAction, useHumanTranslation } from "@/components/records/translate-human-text"
import { content, tenancy } from "@/lib/api"
import { auditItems } from "@/lib/audit-overview"
import { accountKey, appsKey, knowledgeKey, listFetch, recordMapKey } from "@/lib/live-resources"
import { formatCount } from "@shared/web/format-count"
import { formatDateTime } from "@shared/web/format"
import { safeHref } from "@shared/web/rich-text"
import { ACTIVITY_GATE_MAP } from "@shared/rules/registry"
import { usePermissions } from "@/lib/perms"
import { invalidate, primeCache, useCached } from "@shared/web/store"
import { recordActivityKey, useRecordActivity } from "@/lib/use-record-activity"
import { useLanguage } from "@shared/web/language"
import { RichText } from "@shared/web/rich-text-view"
import { useConfirm } from "@shared/web/use-confirm"

export function KnowledgeDetailScreen({
  teamId,
  sourceId,
}: {
  teamId: string
  sourceId: string
}) {
  const { t, lang } = useLanguage()
  const sourcesQ = useCached<KnowledgeSource[]>(knowledgeKey(teamId), () =>
    content.knowledge().then((r) => r.sources)
  )
  // THE LIST ROW IS NOT THE RECORD, and on this screen that distinction is load-
  // bearing. A source can be a 300-page contract, so the LIST deliberately does
  // not carry the material (a page of fifty of them would be tens of megabytes
  // on the way to a screen showing titles) — it carries the summary. This screen
  // is the one that shows the words, so it ALWAYS reads the source by id.
  //
  // The list row is still used, as the instant paint: title, kind, filing and
  // state appear from cache while the material arrives (CACHING.md, cache-first).
  // Taking the row as the whole record instead is the trap EDGE-CASES.md calls
  // "list cache as detail source", and it would have shown an empty document.
  const inPage = sourcesQ.data?.find((s) => s.id === sourceId) ?? null
  const oneQ = useCached<KnowledgeSource | null>(`knowledge:one:${sourceId}`, () =>
    content.knowledgeOne(sourceId)
  )
  const item = oneQ.data ?? inPage ?? null

  // The generic record feed (R5) + the exact server total its tab badges (R8 for
  // the place, R16 for the number — never the loaded page's length).
  const activity = useRecordActivity("knowledge_sources", sourceId)
  // WHAT THIS RECORD IS CONNECTED TO — the map's own read, asked only for a
  // MIRRORED source, because a note somebody typed has no record behind it and
  // therefore no neighbourhood. Cache-first like every other read on this screen
  // (CACHING.md), keyed by the record rather than by the source, so opening the
  // same account from two of its sources is one fetch.
  //
  // AND ONLY FOR A TABLE THE DOOR WILL DRAW. `getKnowledgeMap` refuses any
  // `originTable` that is not a key of `ACTIVITY_GATE_MAP` — permanently, by
  // design (R18's fence has nothing to name for a table that isn't a real row in
  // this database) — so the four Google-derived kinds (an email, a Drive file, a
  // calendar entry, a chat message: `google_gmail`/`google_drive`/
  // `google_calendar`/`google_chat`) never pass. Checked against the SAME map the
  // door reads rather than a second list kept in step by hand, so a table added
  // to the door's fence is drawable here the moment it ships and nowhere needs
  // editing twice.
  const mapDrawable = item?.originTable
    ? Object.prototype.hasOwnProperty.call(ACTIVITY_GATE_MAP, item.originTable)
    : false
  // …AND WHERE THE MAP STANDS WHEN THERE IS NO ORIGIN ROW TO STAND ON.
  //
  // The paragraph above is still true and is still the FIRST choice: a source
  // that mirrors a ticket shows the TICKET's neighbourhood, which is richer than
  // its own and is the record somebody actually came looking for.
  //
  // What changed is the else. `RECORD_EDGES` now carries the source's own four
  // relationships — the call it came out of, and the account, app and sprint it
  // is filed under — so `knowledge_sources` is a table the map can draw, and it
  // has been a key of ACTIVITY_GATE_MAP all along (`knowledge`, the very right
  // this screen is already gated on). So the fallback needs no new permission
  // and widens nothing: it stands on the row the reader already has open.
  //
  // THAT IS WHAT GIVES THE FOUR EXTERNAL KINDS A NEIGHBOURHOOD. An email, a
  // Drive file, a calendar entry and a chat message name a system rather than a
  // row here — 1,313 of 4,838 sources on staging — so there has never been
  // anything for this tab to open. There is now: the same half-hour's email,
  // chat log and transcript all point at one Google event (migration 0070), so
  // the call is one step away and its siblings are one more. A typed note with
  // an account gets the same treatment, for the same reason.
  //
  // It is still possible for the answer to be empty — a note with no account and
  // no event — and that is honest rather than broken: the map's own register
  // says "Nothing is linked to this yet."
  const mapTarget = item
    ? mapDrawable && item.originTable && item.originRowId
      ? { table: item.originTable, id: item.originRowId }
      : { table: "knowledge_sources", id: item.id }
    : null
  const mapKey = mapTarget ? recordMapKey(mapTarget.table, mapTarget.id) : null
  const mapQ = useCached(mapKey, () =>
    content.recordMap(mapTarget?.table as string, mapTarget?.id as string)
  )
  // The accounts a source MAY BE filed under, for the edit dialog's picker
  // suggestions only — page one is plenty there, since the field itself
  // searches rather than trusting page one to hold everything.
  const accountsQ = useCached<Account[]>(`accounts:${teamId}`, () =>
    tenancy.accounts().then((r) => r.accounts)
  )
  // THE ONE ACCOUNT THIS SOURCE IS FILED UNDER, read by id — app-detail.tsx's
  // own bug, here too, 2026-08-31: this used to come off the SAME paged
  // accounts list above (`accountsQ.data`), and accounts PAGE (R14), so a
  // source filed under an account outside page one read "An account" forever,
  // not just before the page arrived. `item` isn't known yet on the branch
  // where this hook still has to run before the loading guard below, so the
  // id is read optionally.
  const filedAccountId = item?.accountId ?? null
  const filedAccountQ = useCached<Account | null>(
    filedAccountId ? accountKey(filedAccountId) : null,
    () => tenancy.accountRow(filedAccountId as string)
  )
  // The apps a source may be LIMITED TO (12.3). `canOpen` is the door's own
  // answer to 8.11, so this list is the server's and not a second opinion.
  const appsQ = useCached<AppRow[]>(appsKey(teamId), () => listFetch.apps(teamId))

  const { can } = usePermissions(teamId)
  const canEdit = can("knowledge", "update")
  const canRemove = can("knowledge", "delete")

  // The open tab is remembered per record for as long as this document
  // lives (web/lib/nav-memory.ts) — leaving to another section and coming
  // back lands on the tab she was reading, and a miss lands on "source".
  const [tab, setTab] = useRemembered("tab", "source")
  const [editingOpen, setEditingOpen] = React.useState(false)
  // Stopping the assistant from reading this is the red half, so it asks first
  // (shared/web/use-confirm.tsx); using it again is the confirm-free restore.
  const { busy: busyActive, ask: askStop, run: runActive, dialog: stopDialog } = useConfirm()

  // READ THE MATERIAL IN YOUR OWN LANGUAGE, if you ask. A source is a document
  // somebody wrote — a contract, a transcript, a page of house rules — so it is
  // the same line every other record is on: never translated on a read, once on
  // a press, and never written back. The words the assistant searches stay the
  // words that were filed.
  const translation = useHumanTranslation(teamId, [item?.body])

  function patchLists(next: KnowledgeSource | null) {
    if (!next) return
    primeCache(`knowledge:one:${sourceId}`, next)
    const cur = sourcesQ.data
    if (cur) primeCache(knowledgeKey(teamId), cur.map((s) => (s.id === sourceId ? next : s)))
    // The footer's Latest activity rows AND the total come from one fetcher, so
    // dropping the key re-primes both — a hand-rolled refetch used to refresh
    // the rows and leave the count behind.
    invalidate(recordActivityKey("knowledge_sources", sourceId))
  }

  async function saveDetails(values: KnowledgeFormValues) {
    const { source } = await content.updateKnowledge({
      id: sourceId,
      title: values.title,
      body: values.body || null,
      sourceUrl: values.sourceUrl || null,
      accountId: values.accountId || null,
      visibility: values.visibility,
      visibleToAppId: values.visibleToAppId || null,
    })
    patchLists(source)
    toast.success(t("Source updated."))
  }

  function stopUsing() {
    askStop({
      title: t("Stop using this source?"),
      body: t("The assistant stops reading it right away. Nothing is deleted, and the sweep won't put it back. You can turn it on again here any time."),
      action: t("Stop using this"),
      run: () =>
        runActive(
          () => content.setKnowledgeActive(sourceId, false).then(({ source }) => patchLists(source)),
          t("The assistant will no longer use this."),
          t("Couldn't update the source.")
        ),
    })
  }

  async function useAgain() {
    await runActive(
      () => content.setKnowledgeActive(sourceId, true).then(({ source }) => patchLists(source)),
      t("The assistant can use this again."),
      t("Couldn't update the source.")
    )
  }

  // THE CHROME STAYS, ONLY THE PANEL SPINS (RecordChrome's law 4) — part of
  // the rollout from help-detail (73414c58).
  if (sourcesQ.error)
    return (
      <RecordScreen
        title={<Skeleton className="h-7 w-48" />}
        state="error"
        copy={{ errorTitle: t("Couldn't load the source.") }}
        errorAction={
          <Button variant="secondary" onClick={() => invalidate(knowledgeKey(teamId))}>
            {t("Try again")}
          </Button>
        }
      />
    )
  if (sourcesQ.data === undefined || (!item && oneQ.data === undefined && !inPage))
    return <RecordScreen title={<Skeleton className="h-7 w-48" />} state="loading" />
  if (!item)
    return (
      <RecordScreen
        title={t("Source")}
        state="empty"
        copy={{ emptyTitle: t("That source doesn't exist."), emptyDescription: "" }}
      />
    )

  const mirrored = item.originRowId !== null
  // A FILE's words belong to the file, exactly as a mirrored source's belong to
  // its row — so the form's two text fields go read-only for both. Kept as a
  // second name rather than folded into `mirrored`, because the SENTENCE each
  // one shows is different: one is kept in step with a record, the other was
  // read out of a document you can open.
  const textOwnedElsewhere = mirrored || item.fileUrl !== null
  const filedUnder = item.accountId ? (filedAccountQ.data?.name ?? "An account") : "The agency"
  const overviewItems = [
    { label: t("Type"), value: KNOWLEDGE_KIND[item.kind] ?? item.kind },
    { label: t("Filed under"), value: filedUnder },
    {
      label: t("Who can use it"),
      // The three settings, said as a sentence rather than as a word a reader has
      // to map back (12.3). The app's own NAME rides the row, so the middle one
      // names the room instead of an id.
      value:
        item.visibility === "private"
          ? "Only you"
          : item.visibility === "app"
            ? `Only the members on ${item.visibleToAppName ?? "one app"}`
            : "Anyone who can read the knowledge base",
    },
    {
      label: t("Searchable pieces"),
      // An indexed source with no pieces is a real state (its text was empty),
      // and saying "0" is the honest reading of it. For an UPLOADED file that is
      // also the commonest honest state — a deck or an archive is kept and not
      // read — so it is said in words rather than as a zero somebody has to
      // interpret.
      value: item.fileUrl && !item.chunkCount
        ? "None, stored, not searchable"
        : item.indexedAt
          ? String(item.chunkCount)
          : "Not indexed yet",
    },
    ...(item.fileUrl
      ? [
          { label: t("File"), value: item.fileName ?? "Uploaded file" },
          {
            label: t("Size"),
            value: `${Math.max(1, Math.round(item.fileBytes / 1000)).toLocaleString()} KB`,
          },
        ]
      : []),
    { label: t("Last indexed"), value: item.indexedAt ? formatDateTime(item.indexedAt, lang) : "" },
    ...auditItems(
      {
        createdByName: item.creatorName,
        createdAt: item.createdAt,
        editedByName: item.editorName,
        updatedAt: item.updatedAt,
        status: item.active ? t("In use") : t("Not in use"),
      },
      t,
      lang
    ),
  ]

  const link = safeHref(item.sourceUrl)

  const tabsConfig = {
    ...RECORD_TABS_CONFIG,
    tabs: [
      { value: "source", label: t("Source"), icon: "file-text", badge: "", badgeVariant: "" as const },
      { value: "overview", label: t("Overview"), icon: "info", badge: "", badgeVariant: "" as const },
      // THE MAP TAB EXISTS ONLY WHERE THERE IS A RECORD TO MAP. A note somebody
      // typed into the knowledge base had no row behind it, and neither did a
      // source mirrored from outside this database (an email, a Drive file, a
      // calendar entry, a chat message).
      //
      // BOTH OF THOSE NOW HAVE ONE, and the tab is offered to every source: the
      // map falls back to the SOURCE itself (`mapTarget` above), which carries
      // its own four relationships. What is still true is the sentence that
      // paragraph was defending — a tab that always fails for a whole kind of
      // source teaches people it is never worth pressing — and it is now kept by
      // the answer being real rather than by hiding the tab. A source with
      // nothing attached gets the map's own honest register, not a failure.
      ...(mapKey
        ? [
            {
              value: "map",
              label: t("Connections"),
              icon: "network",
              // R16: the door's exact count, through the one seam.
              badge: formatCount(mapQ.data?.total ?? 0),
              badgeVariant: "" as const,
            },
          ]
        : []),
      // NO ACTIVITY TAB (client, 2026-09-06 · 2026-09-07) — a source's history is
      // reached from the ink footer's Latest activity column now, and opens in a
      // slide-in off it. web/components/records/activity-panel.tsx carries the ruling.
    ],
  }

  return (
    /* THE BAND SITS INSIDE THE PROVED CONSTRUCTION, NOT A HAND COPY OF IT —
       21 Sep 2026, second pass. The first pass (this comment's own earlier
       text, in git history) still handed `activity`/`onAddNote`/
       `notePlaceholder` straight to `<RecordScreen>` and drew the footer
       through ONE combined `<RecordDetail>` call — no escape, 24px short of
       the pane's bottom at 1440. That was fixed by moving to
       `<RecordFooterBand>` as a second, footer-only call — but HAND-ROLLED
       as this file's OWN `<div className="flex-1 flex-col gap-6">` sibling
       rather than by calling `record-detail-body.tsx`'s own
       `<RecordDetailBody>`, which draws exactly that root for
       `story-detail.tsx` already. Proved live still 24px short on staging
       (commit e30fa49e) — a second, parallel copy of a proved shape is
       exactly the mistake `RecordDetailBody`'s own header warns against
       ("without hand-copying it a second time"), and it drifted the moment
       it was hand-copied rather than called.
       So this screen now calls the SAME component `story-detail.tsx` does,
       not a look-alike of it: `<RecordScreen panelVisible={false}
       footerVisible={false}>` draws the head alone, exactly as it did
       before, and `<RecordDetailBody>` below draws the body — `main` the
       tabbed content, no `side` (a knowledge source has no side column, one
       tabbed body only — `side` is optional for exactly this screen, see
       `record-detail-body.tsx`'s own doc comment), `footer` the identical
       `<RecordFooterBand>` call this file already built. */
    <>
    <RecordScreen
      // NO EYEBROW — client ruling, 2026-09-03, verbatim: "I want you to remove
      // the eyebrow on the title on main screens. Remove that eyebrow, kill it."
      // The prop this line used to pass is deleted from `RecordScreen` itself
      // (record-chrome.tsx says why it had outlived the 2026-09-01 ruling that
      // took the eyebrow out of the full header); the breadcrumb above this
      // header is what names the record type now.
      collectionLabel={KNOWLEDGE_KIND[item.kind] ?? item.kind}
      chips={
        <>
          {/* CLIENT RULING, 17 Sep 2026, verbatim: "knowledge source in use
              green dot." Used to draw nothing at all while a source was in
              use — only "Not in use" had a chip. Both states carry one now:
              green while in use, grey once not (unchanged). */}
          <Badge variant="status" dot={item.active ? "shipped" : "archived"}>
            {item.active ? t("In use") : t("Not in use")}
          </Badge>
          {item.visibility === "private" && <Badge>{t("Private to you")}</Badge>}
          {item.visibility === "app" && <Badge>{item.visibleToAppName ?? t("Limited to one app")}</Badge>}
        </>
      }
      title={item.title}
      // `status` (which account/agency it's filed under) IS GONE — CLIENT
      // RULING, 2026-08-31, VERBATIM: "what is this 3rd component in the
      // title under the chips? kill everywhere. chips is the last component
      // of headers!" `status` maps to `RecordChrome`'s `meta`, drawn
      // directly under the chips row (`data-record-region="header"`). Not
      // lost: "Filed under" is already a row in the Overview tab
      // (`overviewItems`).
      actions={
        // ICON-ONLY (client ruling, 2026-08-31: "edit, only the pencil icon").
        canEdit && <EditPenButton onClick={() => setEditingOpen(true)} label={t("Edit")} />
      }
      panelVisible={false}
      footerVisible={false}
    />
    <RecordDetailBody
      dataSlot="knowledge-detail-body"
      main={
      <TabsView
        className={STICKY_TABS}
        config={tabsConfig}
        value={tab}
        onValueChange={setTab}
        renderPanel={(panel) => {
          if (panel.value === "overview")
            return <OverviewList items={overviewItems} />
          if (panel.value === "map")
            return (
              <ConnectionsPanel
                teamId={teamId}
                read={mapQ}
                emptyTitle={t("Nothing is linked to this yet.")}
                refusedText={t("This source doesn't have a map to draw.")}
              />
            )
          return (
            <div className="flex flex-col gap-6">
              {/* WHERE THESE WORDS CAME FROM — ONE BLOCK, not three.
                  A mirrored note, a file link, a note about a file we could not
                  read and a note about material too long to draw were four
                  separate blocks stacked between the tab strip and the words,
                  each with `gap-6` around it. That is four things to cross
                  before reaching the thing the screen exists to show, on a
                  screen whose whole job is "what does it actually know?" (N2
                  allows three blocks; this was five).

                  Nothing is hidden and no sentence is softened — least of all
                  the one about a file we could not read, which is the one that
                  must never be missed. They are simply all the same KIND of
                  statement (this is where the material comes from and how
                  complete it is), so they sit together at `gap-1`, which is what
                  N7 says the gap between parts of one thing means. The eye reads
                  one provenance note and then the material. */}
              {(mirrored || item.fileUrl || item.bodyTruncated) && (
                <div className="text-muted-foreground flex flex-col gap-1 text-sm">
                  {item.fileUrl && (
                    <a
                      // Through the seam like every other URL on a screen, even
                      // though this one is a path THIS app minted (/media/internal/…)
                      // rather than anything a person typed. A URL nobody validated
                      // because "it can't be dangerous" is how the next one gets in.
                      href={safeHref(item.fileUrl)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary flex w-fit max-w-full items-center gap-2 underline-offset-2 hover:underline"
                    >
                      {(() => {
                        const FileGlyph = fileTypeIcon(item.fileName)
                        return <FileGlyph className="size-4 shrink-0" />
                      })()}
                      <span className="min-w-0 truncate">{item.fileName ?? t("Open the file")}</span>
                    </a>
                  )}
                  {item.fileNote && (
                    // Never hidden, never softened. A file we could not read is
                    // kept on purpose, and the one thing that must not happen is
                    // a reader assuming the assistant can answer from it.
                    <p>{item.fileNote}</p>
                  )}
                  {mirrored && (
                    <p>
                      {t("Kept in step with the record it came from, its words change when that record does.")}
                    </p>
                  )}
                  {item.bodyTruncated && (
                    <p>
                      {t("Showing the first part of")}{" "}
                      {Math.round(item.bodyBytes / 1000).toLocaleString()}{" "}
                      {t("KB of material. Every word of it is searchable, this is the screen being kind to itself.")}
                    </p>
                  )}
                </div>
              )}
              {item.body ? (
                <>
                  {/* Above the material, because the material is what it acts
                      on — and it changes nothing that is filed: the assistant
                      still searches the words that were written. */}
                  <div className="flex justify-end">
                    <TranslateAction translation={translation} />
                  </div>
                  {/* The material itself. An article somebody wrote here is
                      HTML, a mirrored document is plain words or markdown, and
                      RichText picks the pipeline. Rendering it FORMATTED does
                      not desync it from the assistant: the assistant is handed
                      plainText of this same body, so both read the same words
                      and only the layout differs. */}
                  <RichText html={translation.of(item.body)} />
                  {/* THE CUT SPEAKS WHERE IT HAPPENS, not only in the preface.
                      The same sentence is already above the material, and that
                      was the whole of it until 14 Sep 2026 — when the owner
                      reached the bottom of a 142,429-character transcript,
                      found it stopping mid-word, and had nothing in front of
                      him to explain it. A notice at the top of a page this long
                      is a notice read minutes and thousands of pixels before
                      the thing it describes, which is the same as not having
                      one. So it is said twice, and the SECOND one is the one
                      that does the work: it is the only one a reader who
                      scrolled can possibly be looking at. */}
                  {item.bodyTruncated && (
                    <p className="text-muted-foreground mt-3 text-sm">
                      {t("That is the end of what this screen shows, not the end of the material:")}{" "}
                      {Math.round(item.bodyBytes / 1000).toLocaleString()}{" "}
                      {t("KB is kept in full and every word of it is searchable. Open the original below to read the rest.")}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">{t("No text yet.")}</p>
              )}
              {item.sourceUrl &&
                (link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary inline-flex w-fit items-center gap-1 text-sm underline-offset-2 hover:underline"
                  >
                    {t("Open where this came from")}
                  </a>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("The link on this source isn't a web address we can open safely.")}
                  </p>
                ))}
              {canRemove && (
                <div className="flex flex-wrap items-center gap-2">
                  {item.active ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={stopUsing}
                      disabled={busyActive}
                      className="text-destructive hover:text-destructive gap-1"
                    >
                      {busyActive ? <Spinner /> : <Power className="size-3.5" />}
                      {t("Stop using this")}
                    </Button>
                  ) : (
                    // NOT MANGO ANY MORE (R84) — this button used to sit inside
                    // <RecordScreen>'s own children, which the census's ancestor
                    // walk read as "inside a title component" by accident; now
                    // that the body is RecordScreen's own SIBLING (this file's
                    // own header, the flush-footer fix), the walk correctly
                    // finds it outside one, and a bare row action was never
                    // meant to be the screen's one mango button anyway.
                    // `variant="secondary"`, matching its sibling above. THE
                    // `size="sm"` IS UNCHANGED AND STILL R98's OWN
                    // `BUTTON_SIZE_EXEMPT` ENTRY (registry.ts) — kept on one
                    // line so that entry's `contains` (an exact substring of
                    // this tag) still matches; reformatting it across lines
                    // would silently break the exemption's own match rather
                    // than fix anything.
                    <Button variant="secondary" size="sm" onClick={() => void useAgain()} disabled={busyActive} className="gap-1">
                      {busyActive ? <Spinner /> : <Power className="size-3.5" />}
                      {t("Use this again")}
                    </Button>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {item.active
                      ? t("The assistant stops reading it. Nothing is deleted, and the sweep won't put it back.")
                      : t("Nothing was deleted, this puts it back in front of the assistant.")}
                  </span>
                </div>
              )}
            </div>
          )
        }}
      />
      }
      // NO `side` — a knowledge source has no side column, one tabbed body
      // only (`RecordDetailBody`'s own doc comment above `side`).
      //
      // THE BAND — the SAME data the old single combined call handed
      // `<RecordScreen>` (see this function's own header note above), built
      // here instead so `RecordDetailBody`'s own `mt-auto` reaches the true
      // bottom of the page. No `audit`: a knowledge source has no
      // creator/editor (unchanged; see the comment this replaced for why).
      footer={
        <RecordFooterBand
          activity={activity}
          onAddNote={can("knowledge", "create") ? activity.addNote : undefined}
          notePlaceholder={t("Add a note")}
        />
      }
    />

      <KnowledgeFormDialog
        open={editingOpen}
        onOpenChange={setEditingOpen}
        draftKey={`knowledge:edit:${sourceId}`}
        teamId={teamId}
        // THE WHOLE ROW, NOT A COPY OF TWO OF ITS FIELDS. `PickableRecord`
        // (web/lib/pickable.ts) is deliberately the loosest shape that carries a
        // face, and an `Account` structurally satisfies it — so the `.map((a) =>
        // ({ id, name }))` that used to sit here was the exact line that type
        // exists to end, dropping `logoUrl` one hop before the picker that draws
        // it. Client ruling, 2026-09-09: accounts wear their icon in selects.
        accountOptions={accountsQ.data ?? []}
        // Only the apps this caller may OPEN (8.11) — the door refuses any other,
        // so offering one would be offering a refusal.
        appOptions={(appsQ.data ?? [])
          .filter((a) => a.canOpen && a.active)
          .map((a) => ({ id: a.id, name: a.name }))}
        textOwnedElsewhere={textOwnedElsewhere}
        titleOwnedElsewhere={mirrored}
        mirrored={mirrored}
        sightingsCount={item.sightingsCount}
        textOwnedNote={
          item.fileUrl
            ? "These words were read out of the file, so they are corrected by adding the file again rather than typed over here. You can still rename it, change where it is filed and who can use it."
            : undefined
        }
        initial={{
          title: item.title,
          body: item.body ?? "",
          sourceUrl: item.sourceUrl ?? "",
          accountId: item.accountId ?? "",
          visibility: item.visibility,
          visibleToAppId: item.visibleToAppId ?? "",
        }}
        onSubmit={saveDetails}
      />

      {stopDialog}
    </>
  )
}
