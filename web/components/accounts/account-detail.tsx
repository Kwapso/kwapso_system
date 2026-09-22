"use client"

// Account detail — one COMPANY at /accounts/<id>, as a tabbed record:
// Overview / its work / Knowledge. A RATES TAB stood between them until
// 10 Sep 2026 — what this client was charged per hour — and went at the client's
// own ruling ("the whole account rates also killed it"). Its history is not the last tab any
// more — it is reached from the ink footer's Latest activity column, on the
// client's 2026-09-06 ruling; web/components/records/activity-panel.tsx carries the
// ruling and the argument.
// Host-composed, because most of those tabs are collections with their own
// actions — link a person, add an app, ask for an input — and no engine block draws
// those. Those list bodies live next door in account-detail-panels.tsx; this file
// owns the record itself — its data, its rights, its tabs and counts, its
// dialogs, and the one confirm they all share.
//
// A PERSON GETS A DIFFERENT SCREEN. Companies and people are one table (SCOPE
// ch.03) and were, until now, one screen — which drew a human being with sprints
// and a Contacts tab of their own. This file reads the record and
// hands an individual straight to contact-detail.tsx: one door, one read, two
// screens. What splits is the SCREEN and the PERMISSION, never the table.
//
// THE LOGINS MOVED WITH THEM. Only a person can hold one (the owner's ruling), so
// the Portal access tab is on the contact's page now rather than on the company's
// — where it invited the question "who exactly is signing in?" and answered it
// with a list.
//
// THE PEOPLE ARE THEIR OWN PERMISSION. This account's own contacts are behind
// `contacts:read` — a developer opening a client sees the company and its
// apps, and not the address book. The server withholds the rows too
// (routes/accounts.ts): content that is not drawn is not a permission.
//
// NO CONTACTS TAB ANY MORE (client, 31 Aug 2026: "contacts as a real sidebar
// page, also remove the tab from inside accounts"). The address book across
// EVERY account now has its own destination (`/contacts`, grouped by company —
// see web/lib/screens.ts's `contactsListRecipe` and the "contacts" branch in
// collection-content.tsx). What survives HERE, on Overview, is the answer to
// "who is a contact of THIS account" — the add/link/remove controls that used
// to live on the tab, unchanged, because a company's own record is still where
// somebody adds or removes ITS people, and reading them nested under this
// company's own fields costs nothing new: the rows were already fetched for
// this screen either way.
//
// THE HIERARCHY IS STATED ONCE, IN THE HEADER — which account this one sits
// under, as a link one tap up the tree. It used to be stated twice, and the
// second telling was a tab called "Under this account" listing the rows whose
// parent pointer names this one. In this agency's data those rows are its
// people, so the record carried two tabs answering the same question under two
// names, which is the duplication the tester reported (7.2). That tab went and
// Contacts was the survivor; now Contacts itself has moved off the tab strip
// too, onto Overview and onto its own page — the parent pointer itself is
// untouched throughout.
//
// Every count here is an exact server COUNT(*) through the ONE formatCount seam
// (R16) — never the length of a list the door capped. Every destructive action is
// red and asks first; nothing is ever deleted (archive, unlink, revoke all keep
// the row, so history and access survive).

import * as React from "react"

import { Button } from "@shared/ui/components/button/button"
import { Skeleton } from "@shared/ui/components/skeleton/skeleton"
import { toast } from "@shared/ui/components/sonner/sonner"
import { TabsView } from "@shared/web/screen-engine/tabs-view"
import { useRemembered } from "@shared/web/remembered"
import { useConfirm } from "@shared/web/use-confirm"

import { ClientOrgPanel } from "@/components/accounts/client-org-panel"
import { Power, Archive, PencilSimple } from "@shared/ui/foundations/icons"
import { EditPenButton } from "@shared/web/edit-pen-button"
import { Badge } from "@shared/ui/components/badge/badge"

import type { AccountDetail, AppRow } from "@shared/types"
import { type SavingsView } from "@shared/workers/savings"
import { RecordCover, RecordMark } from "@shared/web/record-mark"
import { AccountFormDialog, type AccountFormValues } from "@/components/accounts/account-form-dialog"
import { ContactsPanel, type PanelActions } from "@/components/accounts/account-detail-panels"
import { CollectionCard } from "@/components/deep-link/screen-bits"
import {
  ContactCreateDialog,
  ContactLinkDialog,
  type ContactCreateValues,
  type ContactLinkValues,
} from "@/components/accounts/contact-link-dialog"
import { ContactDetailScreen } from "@/components/accounts/contact-detail"
import { AppFormDialog } from "@/components/apps/app-form-dialog"
import { TodoFormDialog, type TodoFormValues } from "@/components/work/todo-form-dialog"
import { useAssignableMembers } from "@/lib/members"
import { useSessionUserId } from "@/lib/use-active-team"
import { KnowledgeScreen } from "@/components/knowledge/knowledge-screen"
import { RichText } from "@shared/web/rich-text-view"
import { ImpactPanel } from "@/components/process/impact-panel"
import { createAppFrom } from "@/components/apps/apps-screen"
import { AppsPanel, TodosPanel, sliceKey } from "@/components/work/work-panels"
import { OverviewList } from "@/components/records/overview-list"
import { ApiFailure, content as contentApi, tenancy } from "@/lib/api"
import {
  RecordActionsMenu,
  RecordScreen,
  STICKY_TABS,
  RECORD_TABS_CONFIG,
  type RecordAction,
} from "@/components/records/record-chrome"
import { HeadActionsFoldMenu, HEAD_ACTIONS_ROW_CLASS, type HeadActionItem } from "@shared/web/head-actions"
import { formatCount } from "@shared/web/format-count"
import {
  accountKey,
  accountImpactKey,
  accountsKey,
  appsKey,
  listFetch,
  todosKey,
  totalKey,
} from "@/lib/live-resources"
import { softNavigate } from "@/lib/nav"
import { CONCEPT_ICON } from "@/lib/pages"
import { usePermissions } from "@/lib/perms"
import { invalidate, useCached, useCachedValue } from "@shared/web/store"
import { useRecordActivity } from "@/lib/use-record-activity"
import { useRecordCounts } from "@/lib/use-record-counts"
import { useT } from "@shared/web/language"

export function AccountDetailScreen({
  teamId,
  accountId,
  basePath,
}: {
  teamId: string
  accountId: string
  /** the accounts list in the URL form we arrived through (/accounts or
   * /t/<teamId>/accounts) — sibling links stay in that same form. */
  basePath: string
}) {
  const t = useT()
  const detailQ = useCached<AccountDetail>(accountKey(accountId), () =>
    tenancy.accountDetail(accountId)
  )
  // THE SECONDARY HALF, ONCE THE RECORD IS IN HAND — a picker, a badge or a
  // panel BESIDE the record rather than the record, and until 7 Sep 2026 every
  // one of them left the browser in front of it (web/test/cold-screen-hops.test.tsx
  // censused this screen before a person could read it).
  //
  // `have` is the DETERMINISTIC gate shared/web/after-paint.ts asks callers to
  // prefer over its own scheduler — "exact, needs no scheduler, and cannot be
  // flaky". Every read below is about THIS record or the form that edits it, so
  // every one of them has that dependency already.
  const have = detailQ.data !== undefined
  // The ONE web-side read of a record's history (R5) — rows, the door's exact
  // COUNT(*) for the tab badge, and the cursor the feed below spends. Hand-rolling
  // this read is what let a badge and its feed disagree elsewhere.
  const activity = useRecordActivity("accounts", have ? accountId : null)
  // A READ OF PAGE ONE STOOD HERE, for the parent picker and the statuses in
  // use. The statuses went with the column (0042) and the picker gets its own
  // list, so this record now opens without it.
  // TOTAL IMPACT — the hours this client's apps have given back, and the money
  // that is worth, from the ONE savings door (it narrows by account, so the
  // arithmetic here is the same arithmetic the maps screen shows for everybody).
  // R25: the panel renders SAVINGS_CAPTION with it, word for word.
  const valueQ = useCached<SavingsView>(have ? accountImpactKey(accountId) : null, () =>
    tenancy.impact({ accountId })
  )

  const { can } = usePermissions(teamId)
  // Who can be put on an app (8.10), for the record-an-app dialog below.
  const members = useAssignableMembers(teamId)
  // THE SIGNED-IN USER, preselected as staff on a new app raised from here, and
  // as account manager on the edit form's own default — client ruling,
  // 15 Sep 2026: "always put the user preselected by default."
  const myUserId = useSessionUserId()
  // THE SYSTEMS A SPRINT ON THIS CLIENT COULD COVER. The SAME cache key the
  // Apps screen (and every other form in the work engine) reads, narrowed here
  // rather than asked for again: a sprint covers one app and an app belongs to
  // one account, so offering another client's systems would be offering a row
  // the door would refuse.
  const appsQ = useCached<AppRow[]>(have ? appsKey(teamId) : null, () => listFetch.apps(teamId))
  const canReadKnowledge = can("knowledge", "read")
  const canEdit = can("accounts", "update")
  const canArchive = can("accounts", "delete")
  // THE ADDRESS BOOK IS ITS OWN GRANT. `contacts` rather than `accounts`: a
  // developer opening a client sees the company and its apps, not the list of
  // people inside it (Aurora, 17 Aug 2026). The server withholds the rows too —
  // this only decides whether to draw the tab.
  const canSeeContacts = can("contacts", "read")
  const canLinkContacts = can("contacts", "create")
  const canUnlinkContacts = can("contacts", "delete")
  // MAKING a contact is two writes and therefore two rights: the person is an
  // `accounts` row and being a contact here is a `contacts` row. Both doors gate
  // on their own (R10) — this only decides whether to offer a button that would
  // come straight back a 403. Linking somebody we already hold stays one right.
  const canCreateContacts = canLinkContacts && can("accounts", "create")
  // THE WORK HANGING OFF THIS CLIENT. Apps are the record directly below an
  // account (an app belongs to ONE account, always — the owner's ruling), and
  // to-dos beside them are the other collection a door will narrow to one
  // account. Each tab is gated on its own module, so a role that cannot read
  // inputs simply does not see that tab.
  //
  // WAVES AND PHASES LEFT THIS RECORD, Aurora ruling, 22 Sep 2026, verbatim:
  // "remove waves & phases from account detail page." Neither component
  // moved: `WaveCollection` still draws the sidebar Waves page
  // (`web/components/work/waves-screen.tsx`, `WavesScreen`), and
  // `SprintsPanel` is still an app's own Phases tab
  // (`web/components/apps/app-detail.tsx`), only THIS record's own two tabs
  // into them, and the write dialog that hung off the Phases tab, are gone.
  // The wave/sprint-account counts (`totalKey("waves-account", …)`,
  // `totalKey("sprints-account", …)`) still exist server-side and still feed
  // `useRecordCounts` above; they were shared badge plumbing this record
  // never owned, and other callers still invalidate them (see
  // `wave-detail.tsx`'s own `sliceKey("sprints-account", …)`); only the two
  // `useCachedValue` reads that turned them into THIS screen's tab badges
  // are removed, below.
  const canSeeApps = can("processes", "read")
  const canWriteApps = can("processes", "create")
  // THE RIGHT ON THE CHILD, NEVER THE PARENT. Asking a client for something is
  // `inputs:create` (renamed from `todos:create` 15 Sep 2026, team migration
  // 0096), the right the TO-DO door gates on. Standing on an account record
  // is not a right; `accounts:*` says nothing about whether a person may put
  // an input on the backlog. The door decides either way (R10); this only
  // decides whether we draw a button that would come back a 403.
  // MODULE RENAMED `todos` → `inputs` 15 SEP 2026 (team migration 0096).
  const canSeeTodos = can("inputs", "read")
  const canAskTodo = can("inputs", "create")
  const canCancelTodo = can("inputs", "delete")
  // A RATES TAB STOOD HERE, gated on `commercials:read` — what this client was
  // charged per hour, by kind of work — with the rate card itself as its only
  // panel. The client retired it on 10 Sep 2026: "the whole account rates also
  // killed it". The margin panel that used to sit under the card had gone an
  // hour earlier with the internal rates, so the tab lost its last body and the
  // tab went with it rather than being left drawing nothing.
  //
  // The read that fed it lived here too, because the Overview needed the
  // headline rate to price the hours — see the note where `moneyBack` used to be
  // computed, below.

  // THE BADGES, BEFORE THE CLICK. One bounded read of every child total on this
  // record, primed into the same sidecars below — so a tab with work behind it
  // says so on arrival instead of only once you open it. The ROWS stay lazy:
  // each panel still fetches its own when its tab is shown.
  useRecordCounts("accounts", have ? accountId : null)
  // R16: the exact totals those tabs badge — from the counts read above, and
  // re-primed by each panel's own fetch over the same filter its rows came from.
  // `null` is a THIRD answer beside a number and an absence: the role holds no
  // read right on that module, so nobody counted (R18). It renders as nothing,
  // like a zero and like a still-loading total, and stays distinguishable from
  // both in the cache.
  const appsTotal = useCachedValue<number | null>(totalKey("apps-account", accountId))
  const todosTotal = useCachedValue<number | null>(totalKey("todos-account", accountId))
  // THE KNOWLEDGE TAB'S OWN BADGE — the same `knowledge-account` sidecar
  // `useRecordCounts("accounts", …)` above already primed (shared/record-counts.ts),
  // read the identical way `appsTotal`/`todosTotal` are: no second fetch, the
  // exact server COUNT(*) (R16).
  const knowledgeTotal = useCachedValue<number | null>(totalKey("knowledge-account", accountId))

  // The one deep-linkable tab. `?tab=organisation` is what the step form's
  // "add or edit their roles and tools" link carries — the management surface
  // is a tab on this record, and a link that lands one tab away is a link that
  // makes the reader hunt. Read once, on mount; the strip owns it after that.
  //
  // AND A LINK BEATS THE MEMORY. The open tab is otherwise remembered per record
  // (web/lib/nav-memory.ts), but an address that NAMES a tab is somebody telling
  // us where to go — the memory does not get to argue with it. That is the same
  // ruling as the one in the shell: nothing about this feature rewrites a
  // destination a person asked for.
  const askedTab = () =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab")
  // THE TABS THIS ROLE CAN ACTUALLY SEE: every value `tabsConfig` below can
  // carry, gated the identical way. REVIVED AGAINST THIS SET, not accepted
  // blindly: `useRemembered`'s own contract for exactly this case ("a tab
  // that no longer exists on this record", shared/web/remembered.tsx), the
  // same seam `module-settings-screen.tsx` reaches for when a tab it used to
  // draw is gone. Waves and Phases left this record on 22 Sep 2026 (Aurora:
  // "remove waves & phases from account detail page"); a memory from before
  // that still holding either word must land on Overview rather than a blank
  // panel with no tab selected.
  const knownTabs = [
    "overview",
    ...(canSeeApps ? ["apps", "impact", "organisation"] : []),
    ...(canSeeTodos ? ["todos"] : []),
    ...(canReadKnowledge ? ["knowledge"] : []),
  ]
  const [tab, setTab] = useRemembered(
    "tab",
    () => (askedTab() === "organisation" ? "organisation" : "overview"),
    (found) =>
      askedTab()
        ? undefined
        : typeof found === "string" && knownTabs.includes(found)
          ? found
          : undefined
  )
  const [editOpen, setEditOpen] = React.useState(false)
  const [linkOpen, setLinkOpen] = React.useState(false)
  const [newContactOpen, setNewContactOpen] = React.useState(false)
  const [appOpen, setAppOpen] = React.useState(false)
  const [todoOpen, setTodoOpen] = React.useState(false)

  /** Re-read what this screen shows after our own write. (Everyone else's screen
   * catches up from the live ping — see the accounts entries in live-resources.) */
  const refresh = React.useCallback(() => {
    invalidate(accountKey(accountId))
    invalidate(`activity:record:accounts:${accountId}`)
    invalidate(accountsKey(teamId))
  }, [accountId, teamId])

  // The one confirm dialog every red action on this record shares
  // (shared/web/use-confirm.tsx) — `run` refreshes on success and toasts
  // either way; `ask` opens the dialog with the words for this particular act.
  const { busy, ask, run, dialog: confirmDialog } = useConfirm(refresh)

  /** What the three collection tabs borrow from this screen: ask first, then do
   * it. Bundled so a panel takes one prop rather than three, and so there is
   * exactly one confirm dialog on the record (at the bottom of this file). */
  const actions: PanelActions = { busy, ask, act: run }

  // Saving the record. There is no MOVE half any more: the form stopped offering
  // a parent picker (18 Aug 2026 — account-form-dialog's header), so the only
  // write this makes is the record's own fields. Where the account SITS is still
  // shown on the Overview below and still moved by `/api/tenancy/accounts/parent`
  // — just never from here.
  async function save(values: AccountFormValues) {
    if (!detailQ.data?.account) return
    // An emptied box is NULL, not a missing key. The door treats a field it never
    // heard about as "leave it alone" (so an assistant renaming an account can't
    // erase the rest of the record), which means clearing one is now something
    // this form has to SAY. It also means the three fields this form doesn't
    // carry — currency, language, time zone — survive a save, where they used to
    // be wiped by every edit made from this screen.
    await tenancy.updateAccount({
      id: accountId,
      name: values.name.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      street: values.street.trim() || null,
      postalCode: values.postalCode.trim() || null,
      city: values.city.trim() || null,
      country: values.country.trim() || null,
      industry: values.industry.trim() || null,
      website: values.website.trim() || null,
      // 0091 — always sent (edit mode always shows this field), so a save
      // here can never leave a stale manager, the same reasoning altNames
      // below already carries.
      accountManagerUserId: values.accountManagerId || null,
      about: values.about.trim() || null,
      logoUrl: values.logoUrl || null,
      coverUrl: values.coverUrl || null,
      locale: values.locale.trim() || null,
      // 0083/c-misspell, 0085/c-hijack B — the two declared knowledge-base
      // safety fields, always sent from this screen (edit mode always shows
      // them) so a save here can never leave one stale.
      altNames: values.altNames
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      nameNarrowsAlone: values.nameNarrowsAlone,
    })
    refresh()
    toast.success(t("Account updated."))
  }

  async function addContact(values: ContactLinkValues) {
    await tenancy.linkPerson({
      accountId,
      personAccountId: values.personAccountId,
      relationship: values.relationship.trim() || undefined,
      isMainStakeholder: values.isMainStakeholder,
    })
    refresh()
    toast.success(t("Contact added."))
  }

  /** MAKE a person and put them on this company. Two writes, on purpose.
   *
   * THE LINK AND THE PARENT POINTER ARE DIFFERENT FACTS, and this does both.
   * The parent says "Marta sits under Bergman" — one company, the tree the
   * header draws. The LINK says "Marta is a contact of Bergman" — and the same
   * person can hold several of those, at companies she does not sit under,
   * which is precisely what a single pointer cannot express (see
   * contact-link-dialog's header). Creating with a parent does NOT create a
   * link, so the tab she was created on would not list her. Hence both.
   *
   * THE TYPE IS WRITTEN HERE, BY THE CODE. A contact is a person, always — it
   * is not a question this form asks, the way it is no longer a question the
   * account form asks (18 Aug 2026).
   *
   * WHEN THE SECOND WRITE FAILS. The person now exists and is not a contact.
   * We do NOT roll her back: undoing it means archiving an account, which needs
   * a right this caller may well not hold and is itself a write that can fail —
   * a rollback that fails silently is worse than the state it was fixing. So we
   * say exactly what happened and where she is. She is a live account, in the
   * accounts list and findable by the Add contact search on this very tab, so
   * the recovery is one button away and nothing is stranded in silence. The
   * dialog closes rather than staying open, because a second submit would make
   * a second Marta.
   */
  async function createContact(values: ContactCreateValues) {
    const name = values.name.trim()
    const { id } = await tenancy.createAccount({
      accountType: "individual",
      name,
      parentAccountId: accountId,
      email: values.email.trim() || undefined,
      phone: values.phone.trim() || undefined,
    })
    try {
      await tenancy.linkPerson({
        accountId,
        personAccountId: id,
        relationship: values.relationship.trim() || undefined,
        isMainStakeholder: values.isMainStakeholder,
      })
    } catch (err) {
      refresh()
      // Through `t` with a placeholder rather than a template literal: a
      // computed string has no English key, so the catalogue cannot hold it and
      // it would ship in English to somebody who chose German (R28 ·
      // shared/i18n.ts `fill`). The server's own sentence rides in the same way
      // when it has one — it is the half that knows WHY.
      toast.error(
        err instanceof ApiFailure
          ? t("{name} is now in your accounts, but not a contact here: {reason} Use Add contact to finish.", {
              name,
              reason: err.message,
            })
          : t("{name} is now in your accounts, but we couldn't make them a contact here. Use Add contact to finish.", {
              name,
            })
      )
      return
    }
    refresh()
    toast.success(t("Contact added."))
  }

  // THE CHROME STAYS, ONLY THE PANEL SPINS (RecordChrome's law 4) — part of
  // the rollout from help-detail (73414c58). No empty branch: this door never
  // returns a null record, only data or an error, so only those two states
  // are migrated.
  if (detailQ.error)
    return (
      <RecordScreen
        title={<Skeleton className="h-7 w-48" />}
        state="error"
        copy={{ errorTitle: t("Couldn't load the account.") }}
        errorAction={
          <Button variant="secondary" onClick={() => invalidate(accountKey(accountId))}>
            {t("Try again")}
          </Button>
        }
      />
    )
  if (detailQ.data === undefined)
    return <RecordScreen title={<Skeleton className="h-7 w-48" />} state="loading" />

  const { account, parent, links } = detailQ.data

  // A PERSON IS A DIFFERENT SCREEN. One table, one door, one read — and from here
  // two compositions, because a contact has no sprints, no rate card and no
  // contacts of their own. Everything below this line is about a COMPANY.
  if (account.accountType === "individual")
    return (
      <ContactDetailScreen
        teamId={teamId}
        detail={detailQ.data}
        basePath={basePath}
        onSaved={refresh}
      />
    )


  // WHAT THE HOURS WERE WORTH stood here until 10 Sep 2026: the drill-down's own
  // saved hours multiplied by the FIRST live line of this client's rate card,
  // rendered as a "Money given back, every month" panel on the Impact tab.
  //
  // IT COULD NOT SURVIVE THE LOSS OF ITS INPUT. The client retired the rate card
  // ("the whole account rates also killed it"), and there is no other number in
  // this base that answers the same question — what WE would charge for the
  // hours we gave back.
  //
  // IT WAS NOT RE-POINTED, AND THE REFUSAL IS THE POINT. `SavingsView` already
  // carries `savedCentsPerMonth`, the same hours priced at the CLIENT'S OWN role
  // rate frozen onto each step, and swapping one in for the other would have kept
  // the panel alive under the same heading while silently changing what the
  // number MEANS — from "what this is worth to us" to "what it used to cost
  // them". This app has been bitten by exactly that once (lib/processes.ts
  // records the day two arithmetics disagreed on the owner's own screen:
  // €2,766.35 on the map, 0.00 one tab over). Showing the client-side figure here
  // is a product decision and it is hers, not this lane's.

  const where = [account.street, account.postalCode, account.city, account.country]
    .filter(Boolean)
    .join(", ")

  // 0091 — THE MANAGER'S FACE, resolved off the members list this screen
  // already holds (R56: one read, not a second one for this chip). The door
  // hands back the id only (`account.accountManagerId`); the name and
  // picture are looked up here the same way `stakeholders-panel.tsx` already
  // resolves a staff face off `app.staff`'s ids.
  const manager = members.find((m) => m.id === account.accountManagerId)

  const overviewItems = [
    // FIRST ROW (client ruling, 14 Sep 2026): "who the account responsible
    // or account manager is." An avatar chip, never a bare name (R35) — "-"
    // is a real, honest answer for the accounts that predate this field.
    {
      label: t("Account manager"),
      value: manager ? (
        <span className="flex items-center gap-2">
          <RecordMark picture={manager.photo} name={manager.name} shape="round" />
          {manager.name}
        </span>
      ) : (
        ""
      ),
    },
    { label: t("Parent account"), value: parent ? parent.name : t("Sits on its own") },
    { label: t("Reference"), value: account.code || "" },
    { label: t("Industry"), value: account.industry || "" },
    { label: t("Website"), value: account.website || "" },
    { label: t("Email"), value: account.email || "" },
    { label: t("Phone"), value: account.phone || "" },
    { label: t("Address"), value: where || "" },
    { label: t("Language"), value: account.locale || "Ours" },
    // The audit rows moved to the record footer (D7 / CHECKLIST 11.3).
  ]

  const tabsConfig = {
    ...RECORD_TABS_CONFIG,
    tabs: [
      { value: "overview", label: t("Overview"), icon: "info", badge: "", badgeVariant: "" as const },
      // NO CONTACTS TAB (client, 31 Aug 2026). The address book, behind its own
      // right, is now a section on Overview above — same `contacts:read` gate,
      // same rows, so a role without it still sees neither. NO "UNDER THIS
      // ACCOUNT" TAB either (7.2): it listed the account rows whose parent
      // pointer names this one, which — in the way this agency actually uses
      // the record — is the same list of people the Contacts section above
      // already shows, under a second name. The PARENT POINTER is untouched: a
      // company still sits under its holding company, the form still moves it,
      // and the header still links up the tree.
      //
      // NO WAVES OR PHASES TAB EITHER, Aurora ruling, 22 Sep 2026, verbatim:
      // "remove waves & phases from account detail page." Both collections
      // stand on their own now: Waves has the sidebar page (`WavesScreen` /
      // `WaveCollection`, web/components/work/waves-screen.tsx) and Phases is
      // still an app's own tab (`SprintsPanel`, web/components/apps/
      // app-detail.tsx). Neither component moved or lost its other host,
      // only this record's own two tabs into them did, along with the
      // write-a-phase dialog that hung off the Phases tab here.
      // The work hanging off this client, each behind its own read right.
      ...(canSeeApps
        ? [
            {
              value: "apps",
              label: t("Apps"),
              icon: CONCEPT_ICON.apps,
              badge: formatCount(appsTotal),
              badgeVariant: "" as const,
            },
            // WHAT IT HAS BEEN WORTH, on a tab of its own (19 Aug 2026). It was
            // the fourth block on Overview — under the cover, eight admin fields
            // and a free-text About — which is where the headline number of the
            // whole product had been sitting. The owner asked where it was.
            //
            // "Impact" is the word (owner, 19 Aug 2026). It was "Value", and the
            // note here argued FOR that on R34 grounds: the client portal called
            // the same screen Value with the same piggy-bank mark, and one thing
            // gets one word on both front doors. The rule was right and the word
            // was the owner's to pick — so the portal moved too, in the same
            // commit, along with the app tab, the route, both machine tools and
            // the glossary. R34 is satisfied by both doors saying Impact, not by
            // either of them keeping the old one.
            //
            // Behind `canSeeApps` because the arithmetic IS the apps' — every
            // saving is a step on a process map on one of their systems, so a
            // role that cannot see the systems cannot see their sum. No badge: a
            // tab badge is an exact server COUNT of rows (R16), and this tab
            // holds one derivation rather than a collection.
            {
              value: "impact",
              label: t("Impact"),
              icon: CONCEPT_ICON.impact,
              badge: "",
              badgeVariant: "" as const,
            },
            // THEIR OWN ORGANISATION — who does the work there, what an hour of
            // them costs, and what they run on. Behind `canSeeApps` for the same
            // reason Impact is: a role exists to carry the cost that turns a
            // process map's minutes into money, so whoever may read the maps may
            // read the cast list. No badge — the tab holds THREE collections,
            // and a single number over three lists would say nothing (R16 badges
            // one collection's exact count, or none).
            {
              value: "organisation",
              label: t("Organisation"),
              icon: "network",
              badge: "",
              badgeVariant: "" as const,
            },
          ]
        : []),
      ...(canSeeTodos
        ? [
            {
              value: "todos",
              label: t("Inputs"),
              icon: CONCEPT_ICON.todos,
              badge: formatCount(todosTotal),
              badgeVariant: "" as const,
            },
          ]
        : []),
      // THE KNOWLEDGE BASE, IN CONTEXT (CHECKLIST 12.1). The same tab an app
      // record carries, asking about this client instead — the compartment is
      // named for it, so a question typed here can never be answered out of
      // another client's material (R23's `reason` says which it searched).
      ...(canReadKnowledge
        ? [
            {
              value: "knowledge",
              label: t("Knowledge"),
              icon: CONCEPT_ICON.knowledge,
              badge: formatCount(knowledgeTotal),
              badgeVariant: "" as const,
            },
          ]
        : []),
      // NO PORTAL TAB. Only a person can hold a login (the owner's ruling), so
      // the switch lives on the contact's own page — see contact-detail.tsx.
      // AND NO ACTIVITY TAB (client, 2026-09-06 · 2026-09-07) — a client's history
      // is reached from the ink footer's Latest activity column now, and opens in
      // a slide-in off it. web/components/records/activity-panel.tsx carries the ruling.
    ],
  }

  const openAccount = (id: string) => softNavigate(`${basePath}/${id}`)
  // THE TEAM ROOT, for a knowledge source opened from this account's own tab —
  // it lives at its own address, not nested under this account's, the identical
  // `urlPrefix` app-detail.tsx builds for its own Knowledge tab's `onIntent`.
  const urlPrefix = basePath.replace(/\/accounts$/, "")

  /* B1 / CHECKLIST 11.2 — Edit stays visible, archiving moves into the menu with
   * its red and its confirm intact. */
  // 0117, 22 Sep 2026 — HER RULING SPLIT ONE WORD INTO TWO ACTIONS. "Archive"
  // used to mean what she now calls INACTIVE (put away, still fully
  // reachable, its own tab); the button, the confirm and the toast below all
  // now speak of DEACTIVATE/REACTIVATE instead, unchanged in every way but
  // the words. ARCHIVE now names her real, stronger state — a second pair of
  // menu items, "Give the new state a door and a way back, matching how the
  // existing one is offered": the identical shape, one confirm for the
  // destructive half and none for the way back.
  const overflow: RecordAction[] = canArchive
    ? [
        account.active
          ? {
              key: "deactivate",
              label: t("Deactivate"),
              icon: <Power className="size-3.5" />,
              disabled: busy,
              destructive: true,
              onSelect: () =>
                ask({
                  title: `Deactivate ${account.name}?`,
                  body: "It stops showing in the everyday lists and every picker. Everything on it, its people and its history, stays exactly where it is, and you can bring it back any time.",
                  action: "Deactivate",
                  run: () =>
                    run(
                      () => tenancy.setAccountActive(accountId, false),
                      "Account deactivated.",
                      "Couldn't deactivate the account."
                    ),
                }),
            }
          : {
              key: "reactivate",
              label: t("Reactivate"),
              icon: <Power className="size-3.5" />,
              disabled: busy,
              onSelect: () =>
                void run(
                  () => tenancy.setAccountActive(accountId, true),
                  "Account reactivated.",
                  "Couldn't reactivate the account."
                ),
            },
        // ARCHIVE / UNARCHIVE — her stronger state (0117). NEVER deletes, her
        // own words: "Archived menas 'delated' (only that we cnnot delete)."
        // Offered regardless of active/inactive, because either can be
        // archived; unarchiving hands back exactly the active/inactive state
        // the account carried before, unchanged by this pair.
        account.archived
          ? {
              key: "unarchive",
              label: t("Unarchive"),
              icon: <Archive className="size-3.5" />,
              disabled: busy,
              onSelect: () =>
                void run(
                  () => tenancy.setAccountArchived(accountId, false),
                  "Account unarchived.",
                  "Couldn't unarchive the account."
                ),
            }
          : {
              key: "archive",
              label: t("Archive"),
              icon: <Archive className="size-3.5" />,
              disabled: busy,
              destructive: true,
              onSelect: () =>
                ask({
                  title: `Archive ${account.name}?`,
                  body: "It stops showing everywhere, in every list, picker and count. Everything on it, its people and its history, stays exactly where it is, and you can bring it back any time from here.",
                  action: "Archive",
                  run: () =>
                    run(
                      () => tenancy.setAccountArchived(accountId, true),
                      "Account archived.",
                      "Couldn't archive the account."
                    ),
                }),
            },
      ]
    : []

  /* THE FOLD — same shape as `help-detail.tsx`'s own ("h3, and aign the menu
   * to the chips"): below `shared/web/head-actions.tsx`'s own breakpoint,
   * Edit leaves its standalone pen and joins `overflow` inside the ONE "…"
   * trigger that moves into the chip row. Same order the wide row already
   * draws them in — edit, then whatever already lived in the menu. */
  const foldedActions: HeadActionItem[] = [
    ...(canEdit
      ? [
          {
            key: "edit",
            label: t("Edit"),
            icon: <PencilSimple className="size-3.5" />,
            onSelect: () => setEditOpen(true),
          },
        ]
      : []),
    ...overflow,
  ]

  return (
    <RecordScreen
      // NO COVER BAND — C1 shipped 16 Sep 2026 ("For the cover, let's try
      // C1. I want this for accounts and members.") and was reversed the
      // same session: "I changed my mind. Let's remove this completely."
      // `RecordScreen` no longer takes a `cover` prop at all
      // (record-chrome.tsx's own removal note); `account.coverUrl` is still
      // read, by the pre-existing Overview-tab `RecordCover` further down
      // this file, unrelated to this ruling.
      // THE CLIENT'S OWN LOGO, INLINE LEFT OF THE TITLE — B1, client ruling
      // 2026-09-15: "For cover and logo, I choose B1. Apply this on apps,
      // accounts, and team members." record-chrome.tsx's own `mark` prop doc
      // has the artifact and the full ruling; `mark` (not `leading`, which
      // stayed inert through the 2026-09-01 "no images on title" ruling and
      // is untouched here) is what makes it draw, boxed to the title's own
      // line-height so the title itself never moves. The column has been on
      // this row since 0024 and the form has offered the picker since — it
      // was simply never drawn until now. No logo falls back to the
      // company's initial, never to an empty square (shared/web/record-mark.tsx).
      mark={<RecordMark picture={account.logoUrl} name={account.name} size="tile" />}
      // NO EYEBROW — client ruling, 2026-09-03, verbatim: "I want you to remove
      // the eyebrow on the title on main screens. Remove that eyebrow, kill it."
      // The prop this line used to pass is deleted from `RecordScreen` itself
      // (record-chrome.tsx says why it had outlived the 2026-09-01 ruling that
      // took the eyebrow out of the full header); the breadcrumb above this
      // header is what names the record type now.
      recordNumber={account.code || undefined}
      // NO `collectionLabel` ANY MORE. Aurora ruling, 22 Sep 2026, verbatim:
      // "on ocmpanies the first chip must be the id (in black). rmeove this
      // 'company' one (all of them are companies)." This screen only ever
      // renders for the entity half of the `accounts` table (the individual
      // half hands off to `ContactDetailScreen` above), so every record this
      // chip could ever sit on already reads "Company"; restating it on each
      // one is the same "eyebrow said it already" mistake `contact-detail.tsx`
      // was corrected out of on 2026-08-31, not a different one. That
      // screen's own note claiming this chip was "NOT the same mistake" is
      // superseded by this ruling. `recordNumber` above is unchanged and
      // still renders FIRST: `RecordRef` (shared/web/record-ref.tsx), the
      // one black-chip component every kind with a reference already uses
      // (a ticket, a story, a sprint…), is what `record-chrome.tsx`'s own
      // `identityChips` always draws before `collectionLabel` or `chips`,
      // so removing this one prop does not reorder anything: the id chip was
      // already first and already black, and now it is simply the only chip
      // ahead of the status pill.
      // THE SECOND PILL, WITH A COLOUR (client ruling, 2026-08-31, reading
      // their own screenshot of an account back: a status chip carries a dot).
      // REWIRED 17 Sep 2026 — her ruling that session, verbatim: "account
      // active green dot." The live half used to stay wordless; it carries
      // the kit's own `shipped` (green) dot now, the same live/put-away pair
      // every other kind in this ruling reaches for.
      //
      // AMENDED 22 Sep 2026 (0117) — THREE STATES NOW, NOT TWO. Her ruling
      // split "archived" into INACTIVE (unchanged meaning, `account.active
      // === false`) and a real, stronger ARCHIVED (`account.archived`,
      // independent of `active`). The glossary's old sentence ("An account
      // has none [no status]: it is live, or it is archived") is HISTORY —
      // see `shared/glossary.ts`'s own account entry for the current one.
      // ARCHIVED WINS THE CHIP when both are true (an inactive account can
      // also be archived): the stronger fact is the one worth a person's
      // attention, the same "worse fact wins the one chip" shape a ticket's
      // own status chip already follows. Both put-away states share the grey
      // `archived` dot tone (`shared/status-tones.ts` — a colour name, not a
      // word shown to anyone), told apart by the LABEL instead.
      chips={
        <>
          <Badge
            variant="status"
            dot={account.archived || !account.active ? "archived" : "shipped"}
          >
            {account.archived ? t("Archived") : account.active ? t("Active") : t("Inactive")}
          </Badge>
          {/* THE FOLDED TRIGGER, ON THE CHIP ROW'S OWN LINE — same wiring as
              `help-detail.tsx`'s own ("aign the menu to the chips"). */}
          <HeadActionsFoldMenu items={foldedActions} label={t("More actions")} />
        </>
      }
      title={account.name}
      actions={
        <div data-slot="head-actions-row" className={HEAD_ACTIONS_ROW_CLASS}>
          {/* ICON-ONLY (client ruling, 2026-08-31: "edit, only the pencil icon"). */}
          {canEdit && <EditPenButton onClick={() => setEditOpen(true)} label={t("Edit")} />}
          <RecordActionsMenu actions={overflow} />
        </div>
      }
      // THE "PART OF {ACCOUNT}" LINE IS GONE — CLIENT RULING, 2026-08-31,
      // VERBATIM: "what is this 3rd component in the title under the chips?
      // kill everywhere. chips is the last component of headers!" This lived
      // in `headerExtra`, which maps to `RecordChrome`'s `hero` prop — the
      // kit draws it in its own `data-record-region="hero"` block, directly
      // under the header block that carries the chips and still above the
      // tab strip, so on the rendered page it read as more content under the
      // pills exactly as the ruling describes. Not lost: "Parent account" is
      // already a row in the Overview tab (`overviewItems`).
      // D7 / CHECKLIST 11.3 — who made it and when, now the kit's own ink
      // footer's Record column.
      audit={{
        createdByName: account.createdByName,
        createdAt: account.createdAt,
        editedByName: account.editedByName,
        updatedAt: account.updatedAt,
      }}
      activity={activity}
      onAddNote={can("accounts", "create") ? activity.addNote : undefined}
      notePlaceholder={t("Add a note")}
    >

      <TabsView
        className={STICKY_TABS}
        config={tabsConfig}
        value={tab}
        onValueChange={setTab}
        renderPanel={(tabItem) => {
          if (tabItem.value === "overview")
            return (
              <div className="flex flex-col gap-4">
                {/* The cover, then the record. An image at the top of a company's
                    page is the fastest way to know you are on the right one. */}
                {/* A STORED PATH IS NOT THE SAME FACT AS THE BYTES BEING THERE.
                    This is the biggest picture in the app, so a 404 here is a
                    full-width torn-paper glyph across a client's own page —
                    and nothing reclaims a superseded cover, the column takes a
                    pasted URL, and the pictures in it came from an account
                    being cancelled. `RecordCover` renders exactly what having
                    no cover renders when the picture will not load: nothing. */}
                <RecordCover picture={account.coverUrl} className="h-32 w-full rounded-[var(--radius)] object-cover sm:h-40" />
                <OverviewList items={overviewItems} />
                {account.about && (
                  <div className="rounded-[var(--radius)] bg-surface-panel p-4">
                    <p className="text-muted-foreground mb-2 text-micro uppercase">
                      {t("About")}
                    </p>
                    <RichText html={account.about} />
                  </div>
                )}
                {/* THE ADDRESS BOOK, ON OVERVIEW RATHER THAN ITS OWN TAB (client,
                    31 Aug 2026: "contacts as a real sidebar page, also remove
                    the tab from inside accounts"). Same right (`contacts:read`
                    — a role without it sees neither this box nor the rows), same
                    rows, same add/link/remove controls the tab used to carry:
                    "who is a contact of THIS account" is still a question this
                    record answers, it just no longer needs a tab of its own to
                    do it. Every contact ACROSS every account has its own page
                    now — see `/contacts` (web/lib/screens.ts). */}
                {canSeeContacts && (
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground text-micro uppercase">
                      {t("Contacts")}
                    </p>
                    {/* THE REAL CARD, NOT A HAND-ROLLED `rounded-[var(--radius)]
                        bg-surface-panel p-4` LOOKALIKE (Aurora, 21 Sep 2026:
                        "review sping aboe toolbar everyhwere. f.e. in app /
                        phases its completey off"). The lookalike painted the
                        same tone and radius but carried no `data-slot="card"`
                        at all, so neither `web/app/globals.css`'s R83 rules
                        nor `CollectionCard`'s own now-corrected default lead
                        (`screen-bits.tsx`) could ever reach the toolbar
                        inside it: a flat, unresponsive `p-4` (16px) above
                        `<ContactsPanel>`'s own `<ToolbarRow>`, never this
                        law's 10px. `CollectionCard` is the one component every
                        other nested collection in this app already stands on
                        for exactly this reason. */}
                    <CollectionCard>
                      <ContactsPanel
                        accountName={account.name}
                        links={links}
                        canCreate={canLinkContacts}
                        canCreatePerson={canCreateContacts}
                        canArchive={canUnlinkContacts}
                        actions={actions}
                        onAdd={() => setLinkOpen(true)}
                        onNew={() => setNewContactOpen(true)}
                        onOpen={openAccount}
                      />
                    </CollectionCard>
                  </div>
                )}
              </div>
            )

          // WHAT WE HAVE GIVEN THEM BACK, summed across their apps — the
          // question a client asks first and the one the whole product is for.
          // The panel carries the caption that makes the number honest (R25); it
          // is never assembled here.
          // THE CLIENT'S OWN ORGANISATION. `links` is handed down rather than
          // re-fetched: the record screen already holds this company's contacts
          // for the Contacts section on Overview, and they are exactly the pool
          // a role's holder comes from.
          if (tabItem.value === "organisation")
            return <ClientOrgPanel teamId={teamId} accountId={accountId} contacts={links} />

          if (tabItem.value === "impact")
            return (
              <div className="flex flex-col gap-4">
                {/* A MONEY PANEL SAT UNDER THIS until 10 Sep 2026 — the same
                    hours multiplied by this client's agreed rate, with R25's
                    caption beside it. It went with the rate card it multiplied
                    by; see the note where `moneyBack` was computed, above. */}
                <ImpactPanel view={valueQ.data} />
              </div>
            )

          // THE WORK HANGING OFF THIS CLIENT. Each panel asks the SERVER its own
          // narrowed question (?accountId=), so the rows and the badge above are
          // the same answer — never a page of everything filtered in the browser.
          if (tabItem.value === "apps")
            return (
              <AppsPanel
                accountId={accountId}
                accountName={account.name}
                host={{ base: `${basePath}/${accountId}` }}
                onNew={canWriteApps ? () => setAppOpen(true) : undefined}
              />
            )
          if (tabItem.value === "todos")
            return (
              <TodosPanel
                teamId={teamId}
                accountId={accountId}
                canCancel={canCancelTodo}
                onNew={canAskTodo ? () => setTodoOpen(true) : undefined}
              />
            )
          // THE KNOWLEDGE BASE, IN CONTEXT (7.15), THE SAME WAY AN APP DOES IT
          // (8.9). Aurora, 22 Sep 2026: "replicate how it looks in main
          // knowelegde ... search, button to ask, preview the content, filters
          // by type" and "in knoweledge when isnide app or acount, make ask a
          // button in the toolbar" — a real gallery, the same `KnowledgeScreen`
          // an app's own Knowledge tab already renders
          // (web/components/apps/app-detail.tsx), narrowed to this account's
          // own compartment (`account:<id>`) instead of an `appId`. This used
          // to mount the old one-shot ask box alone — no toolbar, no cards, no
          // filters — which is the band of empty page she reported; the
          // gallery's own toolbar, search box, type filter and Ask button
          // (inside the toolbar, R48/R50) fill it now.
          if (tabItem.value === "knowledge")
            return (
              <KnowledgeScreen
                scope={{
                  kind: "account",
                  teamId,
                  accountId,
                  accountName: account.name,
                  // A KNOWLEDGE SOURCE OPENS AT ITS OWN ADDRESS, not nested
                  // under this account's — the identical destination
                  // `app-detail.tsx`'s own `onIntent` sends (R37: through the
                  // soft-navigation bus, never a bare `<a href>`).
                  onIntent: (intent) => {
                    if (intent.kind === "open") softNavigate(`${urlPrefix}/${intent.module}/${intent.id}`)
                  },
                }}
                t={t}
                can={can}
              />
            )

          // EVERY TAB ABOVE HAS ITS OWN BRANCH, so this is unreachable — kept
          // because `renderPanel` must return a node for any tab it is handed,
          // and drawing the Overview panel a second time here would put the
          // record's own fields under a strip position that no longer exists.
          // Activity used to be the fall-through; it is not a tab any more
          // (see the tabs config above).
          return null
        }}
      />

      <AccountFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        draftKey={`account:edit:${accountId}`}
        members={members}
        // THE SIGNED-IN USER — only matters when `initial.accountManagerId`
        // below is empty (an old account with no manager on file): the form
        // dialog falls back to this rather than opening on the one state its
        // picker can no longer draw (16 Sep 2026 ruling killed the "Nobody" pill).
        defaultAccountManagerId={myUserId ?? ""}
        initial={{
          accountType: account.accountType,
          name: account.name,
          email: account.email ?? "",
          phone: account.phone ?? "",
          street: account.street ?? "",
          postalCode: account.postalCode ?? "",
          city: account.city ?? "",
          country: account.country ?? "",
          industry: account.industry ?? "",
          website: account.website ?? "",
          accountManagerId: account.accountManagerId ?? "",
          about: account.about ?? "",
          logoUrl: account.logoUrl ?? "",
          coverUrl: account.coverUrl ?? "",
          locale: account.locale ?? "",
          altNames: account.altNames.join(", "),
          nameNarrowsAlone: account.nameNarrowsAlone,
        }}
        onSubmit={save}
      />

      {/* An app is recorded FROM the account it belongs to, with that account
          already chosen — whose system it is is set once and there is no
          move-app door, so being on the right record when you write it down is
          the whole safeguard. */}
      <AppFormDialog
        members={members}
        open={appOpen}
        onOpenChange={setAppOpen}
        teamId={teamId}
        accounts={[{ id: accountId, name: account.name }]}
        draftKey={`app:add:${accountId}`}
        defaultStaffUserId={myUserId ?? ""}
        onSubmit={async (v) => {
          await createAppFrom(teamId, { ...v, accountId }, t)
          invalidate(sliceKey("apps-account", accountId))
        }}
      />

      {/* MOUNTED ONLY WHEN OPEN, unlike the app and contact dialogs above. This
          one resolves the team ITSELF (`useActiveTeam`) and fetches its own
          picker, so keeping it mounted behind a closed dialog would cost every
          reader of an account record a router subscription and a list read for
          a form nobody has asked for. The draft survives either way — it lives
          in session storage, which is the whole point of Law R7.

          THE PHASE FORM THAT USED TO STAND HERE, written from the account's
          own record with the client already chosen, left with the Phases tab
          it opened from (Aurora, 22 Sep 2026: "remove waves & phases from
          account detail page"). A phase is still sold from an app's own
          record (`app-detail.tsx`'s own `SprintFormDialog`), which is where a
          client's own systems already live; this record no longer offers a
          second door to the same write.

          SOMETHING WE NEED FROM THIS CLIENT. The client is a fact about where
          you are standing, and it is the field that decides whose portal this
          lands in. */}
      {todoOpen && (
      <TodoFormDialog
        open={todoOpen}
        onOpenChange={setTodoOpen}
        // THE WHOLE ROW, same reasoning as the sprint form's own `apps` above:
        // `AccountAppPicker` narrows by `accountId` itself.
        apps={(appsQ.data ?? []).filter((a) => a.active && a.accountId === accountId)}
        fixedAccount={{ id: accountId, name: account.name }}
        draftKey={`todo:add:account:${accountId}`}
        onSubmit={async (v: TodoFormValues) => {
          await contentApi.raiseTodo({
            accountId,
            title: v.title,
            detail: v.detail || undefined,
            dueOn: v.dueOn ? new Date(v.dueOn).toISOString() : undefined,
            appId: v.appId || undefined,
            assignedContactId: v.assignedContactId || undefined,
          })
          invalidate(sliceKey("todos-account", accountId))
          invalidate(todosKey(teamId))
          toast.success(t("Asked, and emailed to them."))
        }}
      />
      )}

      <ContactLinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        teamId={teamId}
        accountName={account.name}
        draftKey={`account:contact:${accountId}`}
        excludeIds={[accountId, ...links.filter((l) => l.active).map((l) => l.personAccountId)]}
        onSubmit={addContact}
      />

      {/* The other way onto the same tab — a person who did not exist yet. Its own
       * draft key, because a half-typed new person and a half-picked existing one
       * are two different half-finished errands. */}
      <ContactCreateDialog
        open={newContactOpen}
        onOpenChange={setNewContactOpen}
        accountName={account.name}
        draftKey={`account:new-contact:${accountId}`}
        onSubmit={createContact}
      />

      {/* One confirm for every red action — nothing here deletes, so each one says
       * plainly what survives. */}
      {confirmDialog}
    </RecordScreen>
  )
}
