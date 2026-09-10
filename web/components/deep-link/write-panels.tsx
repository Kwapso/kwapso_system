"use client"

// The WRITE UI of the deep-link host, in one place. Every form and confirm here is
// opened by the URL (?panel=… / ?confirm=…) so Back closes it and a link to it is
// shareable — and every one is gated by the right its action needs, because a deep
// link must not reach a form the action itself would hide (block at every step, not
// just at submit). The host owns the URL and the mutations; this owns the dialogs.

import * as React from "react"

import { toast } from "@shared/ui/components/sonner/sonner"
import { type ScreenQuery } from "@shared/web/screen-engine/recipe"

import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { KnowledgeFormDialog } from "@/components/knowledge/knowledge-form-dialog"
import { KnowledgeUploadDialog } from "@/components/knowledge/knowledge-upload-dialog"
import { HelpFormDialog } from "@/components/tickets/help-form-dialog"
import { RolePickerDialog } from "@/components/team/role-picker-dialog"
import { RoleFormDialog } from "@/components/team/role-form-dialog"
import { InviteDialog } from "@/components/team/invite-dialog"
import { TeamEditDialog } from "@/components/team/team-edit-dialog"
import { ConfirmAction } from "@/components/deep-link/confirm-action"
import {
  InternalRecordDialog,
  brandAssetFields,
  purposeFields,
} from "@/components/team/internal-record-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/ui/components/alert-dialog/alert-dialog"
import { Spinner } from "@shared/ui/components/spinner/spinner"
import type { InternalKind } from "@/lib/use-screen-actions"
import { ApiFailure, content } from "@/lib/api"
import { personName } from "@/lib/identity"
import { type usePermissions } from "@/lib/perms"
import { type useActiveTeam } from "@/lib/use-active-team"
import { type useScreenActions } from "@/lib/use-screen-actions"
import { type useScreenData } from "@/lib/use-screen-data"
import { appsKey, listFetch } from "@/lib/live-resources"
import { useCached } from "@shared/web/store"
import { reportError } from "@shared/web/log"
import type { AppRow, KnowledgeSource, TeamRole } from "@shared/types"
import { useT } from "@shared/web/language"

/** Everything the write layer needs from the host: the URL's ?panel/?confirm, the
 * caller's rights, the lists the pickers offer, and the mutations to run. Taken as
 * ONE bundle (like the render half's ModuleContentCtx) so the host hands over a
 * snapshot rather than threading a dozen loose props. */
export type WritePanelsProps = Pick<
  ReturnType<typeof useScreenData>,
  | "membersQ"
  | "accountsQ"
  | "helpTypeOptions"
  // The agency's own housekeeping: the pick-or-create vocabularies its forms
  // offer, and the loaded rows an EDIT panel prefills from.
  | "brandCategoryOptions"
  | "departmentOptions"
  | "brandQ"
  | "purposesQ"
  // The row an EDIT panel on a source prefills from — the same list the
  // knowledge collection screen already holds, read rather than re-fetched.
  | "knowledgeQ"
> &
  Pick<
    ReturnType<typeof useScreenActions>,
    | "runAction"
    | "createHelp"
    | "createAccount"
    | "createKnowledge"
    | "editKnowledge"
    | "uploadKnowledgeFile"
    | "saveInternalRecord"
    | "setInternalActive"
  > & {
    query: ScreenQuery
    can: ReturnType<typeof usePermissions>["can"]
    teamId: string | null
    /** the roles a picker may offer — retired ones can't be assigned */
    activeRoles: TeamRole[]
    active: ReturnType<typeof useActiveTeam>
    /** close the open panel / confirm (Back, or a clean replace on a deep link) */
    closePanel: () => void
    /** the record is gone — go back to the list it left */
    onRecordGone: () => void
  }

/** URL segment → which agency-internal record kind its panels are about. The
 * one place the translation is written down, so the form, the confirm and the
 * writer all agree. */
const INTERNAL_PANELS: Record<string, InternalKind | undefined> = {
  brand: "brand",
  purposes: "purposes",
}

/** …and the permission module each kind gates on. */
const INTERNAL_MODULE: Record<string, string> = {
  brand: "brand_assets",
  purposes: "delivery",
}

/** What to call one in a sentence a person reads before archiving it. */
const INTERNAL_NOUN: Record<string, string> = {
  brand: "brand asset",
  purposes: "meeting purpose",
}

/** A loaded record → the flat string map the form prefills from. Every value is
 * stringified and every null becomes "", because a form field holds a string and
 * `null` in one renders as the word "null". */
function prefill(row: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)])
  )
}

export function WritePanels({
  query,
  can,
  teamId,
  activeRoles,
  active,
  membersQ,
  accountsQ,
  helpTypeOptions,
  runAction,
  createHelp,
  createAccount,
  createKnowledge,
  editKnowledge,
  knowledgeQ,
  uploadKnowledgeFile,
  saveInternalRecord,
  setInternalActive,
  brandCategoryOptions,
  departmentOptions,
  brandQ,
  purposesQ,
  closePanel,
  onRecordGone,
}: WritePanelsProps) {
  const t = useT()
  const [archiving, setArchiving] = React.useState(false)

  // THE APPS THIS CALLER MAY OPEN (8.11), for the knowledge dialogs' visibility
  // limit (12.3). `canOpen` is decided by the DOOR and rides every app row, so
  // this list is the server's answer rather than a second opinion formed here.
  // A caller staffed to nothing gets an empty list and the dialog leaves the
  // option out — an option that can only end in a refusal is not an option.
  //
  // AND IT WAITS FOR A PANEL TO EXIST. This is the option list of a dialog, and
  // it was read on every screen in the team area whether or not any dialog was
  // open — on a cold deep link, one of the requests a person waited through to
  // see a record they had not asked to edit. `query.panel` is the URL segment that
  // decides whether any of these dialogs draws at all, so it is the honest gate.
  const appsQ = useCached<AppRow[]>(teamId && query.panel ? appsKey(teamId) : null, () =>
    listFetch.apps(teamId as string)
  )
  const openableApps = React.useMemo(
    () =>
      (appsQ.data ?? []).filter((a) => a.canOpen && a.active).map((a) => ({ id: a.id, name: a.name })),
    [appsQ.data]
  )

  // CORRECT A SOURCE'S FILING (?panel=edit&module=knowledge&id) — reached from
  // its row on the knowledge list as well as from its own record screen, both
  // opening the one door. THE LIST ROW IS NOT THE RECORD (the same trap
  // `knowledge-detail.tsx` names): `knowledgeQ`'s rows carry no body at all
  // (LIST_COLS excludes it, a 300-page contract is not a list), so prefilling
  // straight from the row would submit an emptied-out document the instant
  // somebody only meant to re-file it. The DETAIL read — the same
  // `knowledge:one:<id>` cache key the record screen and `editKnowledge` both
  // already use — is what the form prefills from; the list row is only the
  // instant paint while it arrives.
  const knowledgeEditing = query.panel === "edit" && query.module === "knowledge" && !!query.id
  const knowledgeOneQ = useCached<KnowledgeSource | null>(
    teamId && knowledgeEditing ? `knowledge:one:${query.id}` : null,
    () => content.knowledgeOne(query.id as string)
  )
  const knowledgeEditRow =
    knowledgeOneQ.data ?? knowledgeQ.data?.find((s) => s.id === query.id) ?? null
  const knowledgeMirrored = !!knowledgeEditRow && knowledgeEditRow.originRowId !== null
  const knowledgeTextOwnedElsewhere =
    !!knowledgeEditRow && (knowledgeMirrored || knowledgeEditRow.fileUrl !== null)

  // WHICH agency-internal form the URL is asking for, and everything it needs to
  // open prefilled. Resolved once, here, because "is this panel mine?" and "what
  // does it show?" are the same question asked of two segments — answering it
  // per-dialog is how a create panel and an edit panel end up offering different
  // fields for one record kind.
  const internal = React.useMemo(() => {
    const kind = INTERNAL_PANELS[query.module ?? ""]
    const spec = kind
      ? {
          brand: {
            fields: brandAssetFields(brandCategoryOptions),
            title: t("Brand asset"),
            subtitle: "A piece of our own brand material, a logo, a deck, a template.",
            rows: brandQ.data,
          },
          purposes: {
            fields: purposeFields(departmentOptions),
            title: t("Meeting purpose"),
            subtitle: "Why we meet, and the department it belongs to.",
            rows: purposesQ.data,
          },
        }[kind]
      : null
    const editing = query.panel === "edit" && !!query.id
    const row = editing ? (spec?.rows as { id: string }[] | undefined)?.find((r) => r.id === query.id) : undefined
    return {
      kind,
      open:
        !!kind &&
        (query.panel === "add" || editing) &&
        can(INTERNAL_MODULE[kind], editing ? "edit" : "create"),
      fields: spec?.fields ?? [],
      title: spec?.title ?? "",
      subtitle: spec?.subtitle ?? "",
      // The dialog's own draft rule (R7) is keyed per record, so an edit prefills
      // from the loaded row and a create starts blank.
      initial: row ? (prefill(row) as Record<string, string>) : undefined,
    }
  }, [
    query.module, query.panel, query.id, can,
    brandCategoryOptions, departmentOptions,
    brandQ.data, purposesQ.data, t,
  ])

  const internalArchive = React.useMemo(() => {
    const kind = INTERNAL_PANELS[(query.confirm ?? "").replace(/\.archive$/, "")]
    return {
      kind,
      open: !!kind && query.confirm === `${kind}.archive` && !!query.id && can(INTERNAL_MODULE[kind], "delete"),
      title: `Archive this ${INTERNAL_NOUN[kind ?? "brand"]}?`,
    }
  }, [query.confirm, query.id, can])

  // The change-role target (for the picker), from the URL id.
  const changeTarget =
    query.panel === "edit" && query.module === "members" && query.id
      ? (membersQ.data?.find((m) => m.userId === query.id) ?? null)
      : null

  return (
    <>
      {/* Change a member's role (?panel=edit&module=members&id) — gated by edit. */}
      <RolePickerDialog
        open={
          query.panel === "edit" &&
          query.module === "members" &&
          !!query.id &&
          can("team_members", "edit")
        }
        onOpenChange={(o) => !o && closePanel()}
        roles={activeRoles}
        currentRoleId={changeTarget?.roleId ?? null}
        subjectName={changeTarget ? personName(changeTarget) : null}
        onPick={(roleId) => runAction("members.changeRole", { userId: query.id ?? "", roleId })}
      />

      {/* Invite someone (?panel=add&module=invites) — gated by create. */}
      <InviteDialog
        open={query.panel === "add" && query.module === "invites" && can("team_members", "create")}
        onOpenChange={(o) => !o && closePanel()}
        draftKey={teamId ? `invite:new:${teamId}` : undefined}
        roles={activeRoles}
        onSubmit={(email, roleId) => runAction("invites.create", { email, roleId })}
      />

      {/* Create a role (?panel=add&module=roles) — gated by create. */}
      <RoleFormDialog
        open={query.panel === "add" && query.module === "roles" && can("member_roles", "create")}
        onOpenChange={(o) => !o && closePanel()}
        draftKey={teamId ? `role:new:${teamId}` : undefined}
        onSubmit={(title, description) => runAction("roles.create", { title, description })}
      />

      {/* Add an account (?panel=add&module=accounts) — gated by create. No parent
       * picker: a new account is a new company and sits on its own (18 Aug 2026 —
       * account-form-dialog's header). */}
      <AccountFormDialog
        open={query.panel === "add" && query.module === "accounts" && can("accounts", "create")}
        onOpenChange={(o) => !o && closePanel()}
        draftKey={teamId ? `account:new:${teamId}` : undefined}
        onSubmit={createAccount}
      />

      {/* Raise a help ticket (?panel=add&module=help) — gated by create. */}
      <HelpFormDialog
        open={query.panel === "add" && query.module === "tickets" && can("help", "create")}
        onOpenChange={(o) => !o && closePanel()}
        draftKey={teamId ? `help:new:${teamId}` : undefined}
        teamId={teamId}
        helpTypeOptions={helpTypeOptions}
        onSubmit={createHelp}
      />

      {/* Add a knowledge source (?panel=add&module=knowledge) — gated by create.
          The account picker offers the accounts the caller can already see, so a
          source can only ever be filed under a client they may read; the APP
          picker offers only the apps they may OPEN (8.11's `canOpen`, decided by
          the door), because those are the only ones the knowledge door will
          accept as a visibility limit (12.3). */}
      <KnowledgeFormDialog
        open={query.panel === "add" && query.module === "knowledge" && can("knowledge", "create")}
        onOpenChange={(o) => !o && closePanel()}
        draftKey={teamId ? `knowledge:new:${teamId}` : undefined}
        teamId={teamId}
        // THE WHOLE ROW, NOT A COPY OF TWO OF ITS FIELDS. `PickableRecord`
        // (web/lib/pickable.ts) is deliberately the loosest shape that carries a
        // face, and an `Account` structurally satisfies it — so the `.map((a) =>
        // ({ id, name }))` that used to sit here was the exact line that type
        // exists to end, dropping `logoUrl` one hop before the picker that draws
        // it. Client ruling, 2026-09-09: accounts wear their icon in selects.
        accountOptions={(accountsQ.data ?? []).filter((a) => a.active)}
        appOptions={openableApps}
        onSubmit={createKnowledge}
      />

      {/* Correct a source's filing or sharing (?panel=edit&module=knowledge&id)
          — gated by edit, reached from the row on the list as well as from the
          record screen's own Edit button, both opening this one dialog. Waits
          on the DETAIL read (see `knowledgeOneQ` above) before it draws, so a
          fast click-and-submit can never send an emptied body. */}
      <KnowledgeFormDialog
        open={knowledgeEditing && !!knowledgeEditRow && can("knowledge", "edit")}
        onOpenChange={(o) => !o && closePanel()}
        draftKey={query.id ? `knowledge:edit:${query.id}` : undefined}
        teamId={teamId}
        accountOptions={(accountsQ.data ?? []).filter((a) => a.active)}
        appOptions={openableApps}
        textOwnedElsewhere={knowledgeTextOwnedElsewhere}
        titleOwnedElsewhere={knowledgeMirrored}
        textOwnedNote={
          knowledgeEditRow?.fileUrl
            ? t(
                "These words were read out of the file, so they are corrected by adding the file again rather than typed over here. You can still rename it, change where it is filed and who can use it."
              )
            : undefined
        }
        initial={
          knowledgeEditRow
            ? {
                title: knowledgeEditRow.title,
                body: knowledgeEditRow.body ?? "",
                sourceUrl: knowledgeEditRow.sourceUrl ?? "",
                accountId: knowledgeEditRow.accountId ?? "",
                visibility: knowledgeEditRow.visibility,
                visibleToAppId: knowledgeEditRow.visibleToAppId ?? "",
              }
            : undefined
        }
        onSubmit={(values) => editKnowledge(query.id as string, values)}
      />

      {/* Upload a FILE into the knowledge base (?panel=upload&module=knowledge)
          — gated by the same create right, because it makes the same kind of
          record by another road. Its own panel name rather than a flag on the
          one above: the two forms ask different first questions ("what should
          the assistant know?" versus "which file?"), and a deep link should be
          able to say which one it means. */}
      <KnowledgeUploadDialog
        open={query.panel === "add" && query.module === "knowledge-file" && can("knowledge", "create")}
        onOpenChange={(o) => !o && closePanel()}
        draftKey={teamId ? `knowledge:upload:${teamId}` : undefined}
        teamId={teamId}
        // THE WHOLE ROW, NOT A COPY OF TWO OF ITS FIELDS. `PickableRecord`
        // (web/lib/pickable.ts) is deliberately the loosest shape that carries a
        // face, and an `Account` structurally satisfies it — so the `.map((a) =>
        // ({ id, name }))` that used to sit here was the exact line that type
        // exists to end, dropping `logoUrl` one hop before the picker that draws
        // it. Client ruling, 2026-09-09: accounts wear their icon in selects.
        accountOptions={(accountsQ.data ?? []).filter((a) => a.active)}
        appOptions={openableApps}
        onSubmit={uploadKnowledgeFile}
      />

      {/* Edit the team (?panel=edit&module=team) — gated by teams:edit. */}
      <TeamEditDialog
        open={query.panel === "edit" && query.module === "team" && can("teams", "edit")}
        onOpenChange={(o) => !o && closePanel()}
        draftKey={teamId ? `team:edit:${teamId}` : undefined}
        team={active.ctx?.team ?? null}
        onSaved={active.refresh}
      />

      {/* THE AGENCY'S OWN HOUSEKEEPING — one dialog, four record kinds, opened
          either as `?panel=add&module=<segment>` or `?panel=edit&module=<segment>&id`.
          Every one is gated by the right its action needs, so a deep link can
          never reach a form the screen itself would have hidden. */}
      <InternalRecordDialog
        open={internal.open}
        onOpenChange={(o) => !o && closePanel()}
        draftKey={
          teamId && internal.kind ? `${internal.kind}:${query.id ?? "new"}:${teamId}` : undefined
        }
        fields={internal.fields}
        title={internal.title}
        subtitle={internal.subtitle}
        initial={internal.initial}
        onSubmit={(values) =>
          saveInternalRecord(internal.kind as InternalKind, values, query.id || undefined)
        }
      />

      {/* Archive one of them (?confirm=<segment>.archive&id) — gated by delete.
          Its own AlertDialog rather than ConfirmAction's, which is built around
          the two member/invite cases and their wording. */}
      <AlertDialog
        open={internalArchive.open}
        onOpenChange={(o) => !archiving && !o && closePanel()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{internalArchive.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("It stops showing as live and nothing is deleted, its history stays, and you can put it back at any time.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                setArchiving(true)
                void setInternalActive(internalArchive.kind as InternalKind, query.id ?? "", false)
                  .then(onRecordGone)
                  .catch((err: unknown) => {
                    if (!(err instanceof ApiFailure)) reportError("deep-link:archive", err)
                    toast.error(
                      err instanceof ApiFailure ? err.message : t("Something went wrong. Try again.")
                    )
                  })
                  .finally(() => setArchiving(false))
              }}
              disabled={archiving}
            >
              {archiving ? <Spinner /> : null}
              {t("Archive")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Destructive confirms (?confirm=members.remove | invites.revoke) — both
       * need team_members:delete, gated so a deep link can't reach them. */}
      <ConfirmAction
        kind={query.confirm}
        canRun={can("team_members", "delete")}
        memberName={
          query.confirm === "members.remove"
            ? (membersQ.data?.find((m) => m.userId === query.id) ?? null)
            : null
        }
        onCancel={closePanel}
        onConfirm={async () => {
          if (!query.confirm || !query.id) return
          const payload: Record<string, string> =
            query.confirm === "members.remove"
              ? { userId: query.id }
              : { inviteId: query.id }
          try {
            await runAction(query.confirm, payload)
            // The member is gone / the invite changed — return to the list.
            onRecordGone()
          } catch (err) {
            if (!(err instanceof ApiFailure)) reportError("deep-link:confirm", err)
            toast.error(err instanceof ApiFailure ? err.message : t("Something went wrong. Try again."))
          }
        }}
      />
    </>
  )
}
