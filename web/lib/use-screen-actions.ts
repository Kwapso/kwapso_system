"use client"

// useScreenActions — the deep-link host's WRITE layer: the named-action dispatcher
// plus the rich-payload creator (a help ticket). Lifted out of
// the component so the host's mutation surface is one named thing, not inline in the
// render path.
//
// Every action follows the same cache-first rule (CACHING.md): call the
// permission-checked endpoint, PRIME the actor's own cache with the returned list so
// their screen updates instantly, and INVALIDATE any sibling cache whose count the
// write changed — everyone else gets the realtime row ping and re-pulls. runAction
// THROWS on failure so the calling dialog / confirm surfaces the error; the creators
// let the ApiFailure propagate the same way. Nothing here bypasses a gate — these are
// the exact endpoints the manual UI calls.

import * as React from "react"

import { toast } from "@shared/ui/components/sonner/sonner"

import { content as contentApi, tenancy } from "@/lib/api"
import {
  accountsKey,
  brandAssetsKey,
  knowledgeKey,
  listFetch,
  purposesKey,
  tasksKey,
  totalKey,
} from "@/lib/live-resources"
import { invalidate, primeCache, readCache } from "@shared/web/store"
import { useT } from "@shared/web/language"
import type { Translate } from "@shared/web/format"
import type { AccountFormValues } from "@/components/accounts/account-form-dialog"
import type { KnowledgeFormValues } from "@/components/knowledge/knowledge-form-dialog"
import type { KnowledgeSource } from "@shared/types"
import type { KnowledgeLinkRead } from "@/lib/api/content"
import { recordActivityKey } from "@/lib/use-record-activity"

/** The four agency-internal record kinds, keyed by their URL segment (which is
 * what the host has in hand when a panel opens). */
export type InternalKind = "brand" | "purposes"

/** Per kind: which door writes it, which cache holds it, which table its history
 * is under, and what to say when one is created. A table rather than a switch
 * with near-identical arms — the arms would differ only in those four values,
 * and a switch hides that they are the only difference. */
const INTERNAL_WRITERS: Record<
  InternalKind,
  {
    table: string
    created: string
    key: (teamId: string) => string
    save: (v: Record<string, string>, id?: string) => Promise<unknown[]>
    setActive: (id: string, active: boolean) => Promise<unknown[]>
  }
> = {
  brand: {
    table: "brand_assets",
    created: "Added to the brand library.",
    key: brandAssetsKey,
    save: async (v, id) => {
      const body = {
        name: v.name,
        category: v.category || undefined,
        description: v.description || undefined,
        fileUrl: v.fileUrl || undefined,
      }
      const r = id ? await contentApi.updateBrandAsset({ id, ...body }) : await contentApi.createBrandAsset(body)
      return r.assets
    },
    setActive: (id, active) => contentApi.setBrandAssetActive(id, active).then((r) => r.assets),
  },
  purposes: {
    table: "meeting_purposes",
    created: "Meeting purpose added.",
    key: purposesKey,
    save: async (v, id) => {
      const body = {
        name: v.name,
        department: v.department || undefined,
        description: v.description || undefined,
      }
      const r = id
        ? await contentApi.updateMeetingPurpose({ id, ...body })
        : await contentApi.createMeetingPurpose(body)
      return r.purposes
    },
    setActive: (id, active) => contentApi.setMeetingPurposeActive(id, active).then((r) => r.purposes),
  },
}

// THE WARM SENTENCE FOR A VIDEO LINK THAT WORKED — the owner's own words, 12
// Sep: "show me what kind of transcript it's extracting". `provider` is a
// brand name (YouTube/Loom/Tella) and is never translated, passed straight
// through as data; `kind` is an ordinary word from the door's own small,
// fixed vocabulary and gets its own catalogued sentence PER VALUE — never
// `t(kind)`, which the extraction script cannot see inside a variable (R28).
function linkReadSentence(read: KnowledgeLinkRead, t: Translate): string {
  const kind =
    read.kind === "captions"
      ? t("captions")
      : read.kind === "transcript"
        ? t("transcript")
        : read.kind === "description"
          ? t("description")
          : read.kind
  return read.words === 1
    ? t("Read 1 word of {kind} from {provider}.", { kind, provider: read.provider })
    : t("Read {words} words of {kind} from {provider}.", { words: String(read.words), kind, provider: read.provider })
}

export function useScreenActions(teamId: string | null) {
  const t = useT()
  // The named-action dispatcher — the flat `{key: string}` payloads the engine emits.
  const runAction = React.useCallback(
    async (actionId: string, payload: Record<string, string>) => {
      if (!teamId) return
      switch (actionId) {
        case "members.changeRole": {
          const { members } = await tenancy.setMemberRole(payload.userId, payload.roleId)
          primeCache(`members:${teamId}`, members)
          invalidate(`member_roles:${teamId}`) // member counts per role changed
          invalidate(`activity:user:${payload.userId}`) // their activity feed gained a row
          toast.success(t("Role updated."))
          break
        }
        case "members.remove": {
          const { members } = await tenancy.removeMember(payload.userId)
          primeCache(`members:${teamId}`, members)
          invalidate(`member_roles:${teamId}`)
          invalidate(`activity:user:${payload.userId}`)
          toast.success(t("Member removed."))
          break
        }
        case "invites.create": {
          const { invites } = await tenancy.createInvite(payload.email, payload.roleId)
          primeCache(`invites:${teamId}`, invites)
          toast.success(`Invited ${payload.email}.`)
          break
        }
        case "invites.revoke": {
          const { invites } = await tenancy.revokeInvite(payload.inviteId)
          primeCache(`invites:${teamId}`, invites)
          toast.success(t("Invite revoked."))
          break
        }
        case "roles.create": {
          const { roles: next } = await tenancy.createRole(payload.title, payload.description)
          primeCache(`member_roles:${teamId}`, next)
          toast.success(`Created ${payload.title}.`)
          break
        }
        // OUR OWN ADMIN, ticked off — and untickable, because a task marked done
        // by mistake is a task somebody has to be able to put back. It needs no
        // confirm: nothing is lost either way, and a confirm on a tick is the
        // kind of ceremony that teaches people to click through dialogs.
        case "tasks.done": {
          const { tasks, openTotal, allTotal } = await contentApi.setTaskDone(
            payload.id,
            payload.done === "true"
          )
          // The door answers with the OPEN list, which is the one the row just
          // left (or rejoined) — so that one is primed and the ALL list, which
          // this response is not, is dropped and re-read. R16: both badges come
          // back from the same write, so neither goes stale behind the other.
          primeCache(tasksKey(teamId, "open"), tasks)
          primeCache(totalKey("tasks", teamId), openTotal)
          primeCache(totalKey("tasks-all", teamId), allTotal)
          invalidate(tasksKey(teamId, "all"))
          invalidate(`activity:record:tasks:${payload.id}`)
          // AND IT SAYS WHERE THE ROW WENT. A tester read the tick as a delete,
          // because the only thing they saw was a row vanishing from the list
          // they were looking at. It has not gone anywhere — "All tasks" beside
          // "Still to do" has held the finished ones since that strip shipped —
          // so the fix is not a second screen, it is one sentence naming the one
          // that is already there.
          toast.success(
            payload.done === "true" ? t("Ticked off. It's under All tasks.") : t("Put back.")
          )
          break
        }
      }
    },
    [teamId, t]
  )

  // Raise a help ticket — its own handler (a small object payload). Primes the list
  // so the ticket shows at once; the realtime "add" ping refreshes everyone else.
  const createHelp = React.useCallback(
    // EVERY FIELD THE FORM OFFERS, because this is a courier and the door is
    // what decides. The type used to name three of the six — it worked only
    // because the object is forwarded whole, which is luck rather than design,
    // and the same narrowing is what hid a dropped `moduleId` on the ticket
    // detail (help-detail.tsx · editTicket) where the payload was rebuilt.
    async (input: {
      description: string
      helpType?: string
      accountId?: string
      appId?: string
      moduleId?: string
      raisedByContactId?: string
    }) => {
      if (!teamId) return
      const { tickets, id } = await contentApi.createHelp(input)
      primeCache(`help:${teamId}`, tickets)
      toast.success(t("Ticket raised."))
      // The new ticket's id, so a screenshot picked while writing it has
      // something to hang on (help-form-dialog's own note says why the page
      // cannot answer that: the list is drag-ranked).
      return id
    },
    [teamId, t]
  )

  // Add an account (a company or a person). The list is PAGED, so the create call
  // can't hand back "the new list" — we re-pull page ONE instead, which is where
  // the newest row now sits, and that same fetcher re-primes the exact total and
  // the cursor. Everyone else gets the realtime "add" ping.
  const createAccount = React.useCallback(
    async (values: AccountFormValues) => {
      if (!teamId) return
      // No `code` and no `parentAccountId`: the door mints the reference from the
      // name (BERG, BERG2 on a clash) and a new account sits on its own, because
      // neither is a question the form asks — see account-form-dialog's header.
      // The door still reads both; nothing here answers them.
      await tenancy.createAccount({
        accountType: values.accountType,
        name: values.name.trim(),
        email: values.email.trim() || undefined,
        phone: values.phone.trim() || undefined,
        street: values.street.trim() || undefined,
        postalCode: values.postalCode.trim() || undefined,
        city: values.city.trim() || undefined,
        country: values.country.trim() || undefined,
        industry: values.industry.trim() || undefined,
        about: values.about.trim() || undefined,
        logoUrl: values.logoUrl || undefined,
        coverUrl: values.coverUrl || undefined,
        locale: values.locale.trim() || undefined,
      })
      primeCache(accountsKey(teamId), await listFetch.accounts(teamId))
      toast.success(t("Added {name}.", { name: values.name.trim() }))
    },
    [teamId, t]
  )

  // Add a knowledge source. The list is PAGED, so the create call can't hand back
  // "the new list" — page ONE is re-pulled instead, which is where the newest row
  // now sits, and that same fetcher re-primes the exact total and the cursor
  // (accounts does the same thing for the same reason). Everyone else gets the
  // realtime "add" ping.
  //
  // A VIDEO LINK, READ FOR REAL (owner's own words, 12 Sep — see
  // `KnowledgeFormDialog`'s own header): the door hands back `read` (what it
  // got) or `refusedBecause` (why not), alongside the ordinary `source`/`total`
  // it always returned. `read` becomes a warmer toast than the generic one
  // below; `refusedBecause` is handed back to the dialog rather than shown
  // here, because it must stay on screen until the person has read it, and a
  // toast is exactly the thing that doesn't (`KnowledgeFormDialog`'s own
  // `linkRefusal` state renders it verbatim instead).
  const createKnowledge = React.useCallback(
    async (values: KnowledgeFormValues) => {
      if (!teamId) return
      const res = await contentApi.createKnowledge({
        title: values.title,
        body: values.body || null,
        sourceUrl: values.sourceUrl || null,
        accountId: values.accountId || null,
        visibility: values.visibility,
        visibleToAppId: values.visibleToAppId || null,
      })
      primeCache(knowledgeKey(teamId), await listFetch.knowledge(teamId))
      if (res.refusedBecause) return { refusedBecause: res.refusedBecause }
      toast.success(
        res.read ? linkReadSentence(res.read, t) : t('The assistant can now use "{title}".', { title: values.title })
      )
    },
    [teamId, t]
  )

  // Correct a source's filing or who may use it — the row-level counterpart to
  // the create above. A single row, not a paged collection, so the door's own
  // answer patches the one row everyone already holds (R1) rather than
  // re-pulling page one: the list stays exactly where it was, one entry
  // corrected in place. Shares the shape `knowledge-detail.tsx`'s own
  // `saveDetails` has carried since the detail screen's Edit button — this is
  // the same door reached from the row instead of from the record.
  const editKnowledge = React.useCallback(
    async (id: string, values: KnowledgeFormValues) => {
      const { source } = await contentApi.updateKnowledge({
        id,
        title: values.title,
        body: values.body || null,
        sourceUrl: values.sourceUrl || null,
        accountId: values.accountId || null,
        visibility: values.visibility,
        visibleToAppId: values.visibleToAppId || null,
      })
      if (source && teamId) {
        primeCache(`knowledge:one:${id}`, source)
        const cur = readCache<KnowledgeSource[]>(knowledgeKey(teamId))
        if (cur) primeCache(knowledgeKey(teamId), cur.map((s) => (s.id === id ? source : s)))
        invalidate(recordActivityKey("knowledge_sources", id))
      }
      toast.success(t("Source updated."))
    },
    [teamId, t]
  )

  // Upload a FILE as a source. Same cache move as the typed note above (page one
  // is re-pulled, because the list pages), and one thing it does not share: the
  // toast is DERIVED FROM THE ANSWER rather than assumed. A file we could not
  // read is stored and listed on purpose, and telling somebody "the assistant
  // can now use it" when it cannot is the exact lie this feature is built not to
  // tell — so the door's own sentence is what gets shown.
  const uploadKnowledgeFile = React.useCallback(
    async (values: {
      fileName: string
      fileDataUrl: string
      title: string
      accountId: string
      visibility: "team" | "app" | "private"
      visibleToAppId: string
    }) => {
      if (!teamId) return
      const { source } = await contentApi.uploadKnowledgeFile({
        fileName: values.fileName,
        fileDataUrl: values.fileDataUrl,
        title: values.title || undefined,
        accountId: values.accountId || null,
        visibility: values.visibility,
        visibleToAppId: values.visibleToAppId || null,
      })
      primeCache(knowledgeKey(teamId), await listFetch.knowledge(teamId))
      if (source?.fileNote) toast.warning(source.fileNote)
      else toast.success(
          t('The assistant can now use "{title}".', {
            title: source?.title ?? values.fileName,
          })
        )
    },
    [teamId, t]
  )

  // THE AGENCY'S OWN HOUSEKEEPING — one writer for the four record kinds, because
  // they are one shape: a create or an edit against a CAPPED list, whose door
  // hands back the whole (small) collection, so the actor's cache is primed
  // straight from the response and everyone else gets the row-level ping. No
  // re-pull, unlike accounts and knowledge above — those page, and a page-one
  // refetch is the honest way to find a new row in a list you only hold part of.
  const saveInternalRecord = React.useCallback(
    async (kind: InternalKind, values: Record<string, string>, id?: string) => {
      if (!teamId) return
      const spec = INTERNAL_WRITERS[kind]
      const next = await spec.save(values, id)
      primeCache(spec.key(teamId), next)
      // The record's own history gained a row; its Activity tab reads that key.
      if (id) invalidate(`activity:record:${spec.table}:${id}`)
      toast.success(id ? t("Saved.") : spec.created)
    },
    [teamId, t]
  )

  /** Archive or restore one of those records. Separate from the save above
   * because it is the DELETE right rather than the edit one, and because it is
   * the half a confirm panel stands in front of. */
  const setInternalActive = React.useCallback(
    async (kind: InternalKind, id: string, active: boolean) => {
      if (!teamId) return
      const spec = INTERNAL_WRITERS[kind]
      primeCache(spec.key(teamId), await spec.setActive(id, active))
      invalidate(`activity:record:${spec.table}:${id}`)
      toast.success(active ? t("Restored.") : t("Archived."))
    },
    [teamId, t]
  )

  return {
    runAction,
    createHelp,
    createAccount,
    createKnowledge,
    editKnowledge,
    uploadKnowledgeFile,
    saveInternalRecord,
    setInternalActive,
  }
}
