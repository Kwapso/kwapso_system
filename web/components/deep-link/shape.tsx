// Per-module SHAPING — pure functions turning already-loaded app data into the
// flat ScreenData (records / rows / sets) each recipe reads. No hooks, no
// fetching: the resolver guards loading/errors then calls these, so they're
// trivially unit-testable and keep the resolver lean.

import { type ScreenData } from "@shared/web/screen-engine/screen-renderer"

import { formatDate, formatDateTime, formatRelative } from "@shared/web/format"
// The ROW SHAPE, named rather than restated. `use-record-activity.ts` declares
// what a dressed activity row is for the bespoke record path; this function has
// always produced exactly that object (the header above is the record of two
// fixes that landed in one copy and not the other), and saying so in the return
// type is what lets the deep-link host hand this straight to `<ActivityRail>`
// without a cast. `ScreenData.sets` still takes it: a `Record<string, unknown>`
// accepts an object type with these six known fields.
import type { ActivityFeedRow } from "@/lib/use-record-activity"
import { nameInitials, personName } from "@/lib/identity"
import { describeWithStaffName, staffNameFromSnapshot } from "@shared/staff-name"
import { RecordMark } from "@shared/web/record-mark"
// THE CLASS, NOT THE CHIP. `REF_LEADS_NAME` is the one spelling of "a shrink-0
// thing in front of a name that truncates", written for the reference lozenge
// and exactly as true of the contacts table's mark — the alternative was a
// second set of the same four utilities, which is how two rows come to align
// differently (`record-ref.tsx` carries the whole argument for each one).
import { REF_LEADS_NAME } from "@shared/web/record-ref"
import { ticketTitle } from "@shared/web/ticket-chips"
import { Icon, type IconName } from "@shared/web/screen-engine/icon"
import { translator, type Language } from "@shared/i18n"
import type {
  Account,
  ActivityItem,
  BrandAsset,
  HelpTicket,
  Invite,
  InviteAudit,
  KnowledgeSource,
  Meeting,
  MeetingPurpose,
  TeamMember,
  TeamRole,
} from "@shared/types"

/** Display status per invite state (one source for list + detail). */
export const INVITE_STATUS: Record<Invite["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
}

/** Activity items → the engine's activity-block row shape.
 *
 * `initials` rides here too — the SAME `nameInitials` helper `use-record-
 * activity.ts` uses for the bespoke `RecordScreen` path — because this is the
 * OTHER activity feed in the app: the recipe engine's own `{ kind: "activity"
 * }` block (screen-renderer.tsx) draws Team, Team member and Invite through
 * this shaper, not through `useRecordActivity`, so the initials fix that
 * landed there never reached these three screens. Same row shape, same
 * missing field, a second place to get it right.
 *
 * `timestamp` WENT THROUGH THE SAME SECOND-PLACE FIX, 2026-09-03: it used to
 * read `formatActivityWhen`, a raw sortable string ("2026-06-30 21:50") —
 * `use-record-activity.ts`'s own copy of this row shape had the identical
 * bug, fixed there by reading `formatRelative` instead, the function this
 * screen's own RECORD column already uses (`formatDate`/`formatDateTime`
 * above). This function has no hook to call `useLanguage()` with (it is a
 * pure shaper, no React tree), so `t` is built with `translator(lang)` — the
 * same plain, non-hook function `LanguageProvider` itself calls to build the
 * hook's own `t` — rather than threading a second parameter through five call
 * sites for a value this file can already make itself from the `lang` each of
 * them already has. `dateTime` carries the raw instant alongside it, for the
 * kit's own `<time datetime>` slot — the same pairing added at the other
 * activity feed's fix. */
export function shapeActivity(items: ActivityItem[], lang: Language): ActivityFeedRow[] {
  const t = translator(lang)
  return items.map((a) => ({
    id: a.id,
    // R54, and the same two lines `use-record-activity.ts` carries — this is the
    // OTHER activity shaper, and the file's own header above is a list of fixes
    // that landed in one of the two and not the other. The sentence is where the
    // name is visible; `actor` is only the avatar's accessible name.
    description: a.actorIsClient
      ? a.description
      : describeWithStaffName(a.description, a.actorName),
    // `|| undefined`, NOT `?? undefined`. `staffNameFromSnapshot` answers ""
    // for a row with no actor (a system write), and "" is not "no actor" here:
    // the kit draws this field as `aria-label={item.actor}` on the avatar
    // fallback (shared/ui/components/activity-feed/activity-feed.tsx), and an
    // EMPTY aria-label is worse than an absent one — it overrides the initials
    // underneath it with nothing, so a screen reader announces an unnamed
    // element instead of the "?" mark. `??` only catches null/undefined and
    // let the empty string straight through.
    actor: (a.actorIsClient ? a.actorName : staffNameFromSnapshot(a.actorName)) || undefined,
    initials: nameInitials(a.actorName),
    timestamp: formatRelative(a.createdAt, t, lang),
    dateTime: a.createdAt,
  }))
}

/* `shapeTeamDetail` is gone with the screen it fed — the team overview, deleted
 * on the client's 2026-09-09 ruling. web/lib/pages.ts carries the decision. */


export function shapeMembersList(members: TeamMember[], lang: Language): ScreenData {
  return {
    rows: members.map((m) => ({
      id: m.userId,
      // A PERSON'S FACE (R35). `imageUrl` arrived on every one of these rows and
      // was drawn on the profile menu, the staff panel and a ticket's
      // stakeholders — and not on the list of the team itself.
      mark: <RecordMark picture={m.imageUrl} name={personName(m)} shape="round" />,
      name: personName(m),
      detail: `${m.roleTitle} · joined ${formatDate(m.joinedAt, lang)}`,
      // Facet column (read by the filter engine, not the renderer).
      role: m.roleTitle,
    })),
  }
}

export function shapeRolesList(roles: TeamRole[]): ScreenData {
  return {
    rows: roles.map((r) => ({
      id: r.id,
      // No picture exists for a role, and that is not a reason to draw nothing:
      // the initial in the same box every other row uses is what keeps a list of
      // roles the same shape as a list of anything else (R35).
      mark: <RecordMark name={r.title} />,
      name: r.active ? r.title : `${r.title} (inactive)`,
      detail: r.description || `${r.memberCount} member${r.memberCount === 1 ? "" : "s"}`,
      // Facet column (read by the filter engine, not the renderer).
      state: r.active ? "Active" : "Inactive",
    })),
  }
}

export function shapeInvitesList(invites: Invite[]): ScreenData {
  return {
    rows: invites.map((i) => ({
      id: i.id,
      mark: <RecordMark name={i.email} shape="round" />,
      email: i.email,
      detail: `${i.roleTitle} · ${INVITE_STATUS[i.status]}`,
      // Facet column (read by the filter engine, not the renderer).
      status: INVITE_STATUS[i.status],
    })),
  }
}

/** Display label per ticket status (server's underscore form → friendly text).
 * One source for the list detail line; the thread's own status badge uses the
 * library's hyphen labels.
 *
 * SIX NOW, and every one of them is a FACT rather than a choice. It was seven
 * until the client retired `awaiting_validation` on 7 Sep 2026 (shared/types.ts,
 * `HELP_STATUSES`); its label, "Waiting on you", is deliberately not gone from
 * the app — a ticket that really passed through that stage still draws those
 * words on its stage history (`stageLabel`, web/components/tickets/ticket-stages.tsx).
 * It is gone from HERE because this map is keyed by the LIVE vocabulary and a
 * list row can only show a stage a ticket is currently in. */
export const HELP_STATUS: Record<HelpTicket["status"], string> = {
  new: "New",
  triaged: "Triaged",
  scheduled: "Scheduled",
  in_progress: "In progress",
  ready: "Ready",
  resolved: "Resolved",
}

/** Trim a ticket description to a single readable list line. */
function truncate(text: string, max = 80): string {
  const clean = text.trim().replace(/\s+/g, " ")
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

export function shapeHelpList(
  tickets: HelpTicket[],
  /** The team's own glyph per ticket kind, from `markMap`. Passed in rather than
   * read here: a shaper takes rows and returns rows, and the vocabulary is a
   * cache the screen already holds. Absent → every row shows its initial, which
   * is what a team that has set no glyphs should see. */
  marks?: Map<string, string>
): ScreenData {
  return {
    rows: tickets.map((t) => ({
      id: t.id,
      // The kind's mark in the leading slot — the same glyph the tab strip
      // carries, so the row and the tab cannot disagree about what a Question
      // looks like.
      mark: <RecordMark mark={marks?.get(t.helpType ?? "") ?? null} name={t.helpType ?? "?"} />,
      // THE TITLE, AND ONLY THE TITLE (UI-RULEBOOK K1, CHECKLIST 11.9). The
      // reference used to be prefixed into it — `BERG-T0412 · Can you check…` —
      // which is why a page of tickets read as a wall of text with no shape. It
      // has not been lost: it leads the eyebrow on the record's own screen (D4),
      // where a person looks when a client rings up saying it out loud.
      // ONE FUNCTION NAMES A TICKET, EVERYWHERE (2026-09-06). This read
      // `truncate(richTextPlain(t.description))` — the description and nothing
      // else — while the triage table one screen along read `titleEn ||
      // titleDe || the first line of the body`, so a ticket with a real title
      // was called two different things on two tables of the SAME collection.
      // `ticketTitle` (shared/web/ticket-chips.tsx) is now the only answer, and
      // its own header carries the full reasoning and the order of the three
      // steps. `truncate` still runs on top: this shaper's rows are a list, and
      // the cap it applies is the LIST's measure rather than the name's.
      name: truncate(ticketTitle(t)),
      // ONE LINE, TWO FACTS. How far along, and what kind. The story counts and
      // the archived flag went with the same edit: a subtitle carrying four
      // facts is table content smuggled into a list (K2).
      detail: [HELP_STATUS[t.status], t.helpType || "General"].filter(Boolean).join(" · "),
    })),
  }
}

/* -------------------------------- knowledge ------------------------------- */

/** What a source IS, in the words a person uses for it. A `note` is something
 * somebody wrote here; everything else MIRRORS a row the app already owns, and
 * saying which row it mirrors is the honest answer to "why does it know that?". */
/** WHAT A PIECE OF KNOWLEDGE CAME FROM, as a glyph (R35).
 *
 * The knowledge base is the one collection where every row is a DIFFERENT KIND
 * of thing — a calendar entry beside a ticket beside a file somebody uploaded —
 * and it was the one collection where every row looked identical: a title, then
 * "From a calendar entry · The agency" in grey. The word is doing all the work,
 * and it is the third thing your eye reaches.
 *
 * A LUCIDE NAME, NOT AN EMOJI, and that is the one real decision here. The marks
 * elsewhere in this app are the TEAM's — a ticket type's glyph is theirs to set
 * on the Dropdown values screen. A source's kind is not: the code owns the list
 * (`KNOWLEDGE_KIND` above, held to the sweep by knowledge-coverage.test.ts), so
 * its icon belongs with the code, in the same vocabulary the nav rail uses for
 * the same concepts. Where a kind IS one of the app's own records — a ticket, a
 * story, an account — it borrows that section's own icon, so the thing looks the
 * same in the knowledge base as it does in the rail.
 *
 * Held to KNOWLEDGE_KIND by the same coverage test: a kind with a word and no
 * glyph would draw an initial, which reads as a bug rather than as a default. */
export const KNOWLEDGE_KIND_ICON: Record<string, string> = {
  // These three drew nothing for weeks — `note`, `file` and `article` are
  // Phosphor's own names for exactly this concept, so the glyph is the
  // concept's name, unaliased.
  note: "note",
  file: "file",
  article: "article",
  // The app's own records borrow the rail's icon for the same concept.
  ticket: "tray",
  account: "buildings",
  contact: "address-book",
  app: "app-window",
  process: "git-fork",
  sprint: "calendar-dots",
  story: "puzzle-piece",
  meeting: "chat",
  todo: "clipboard-text",
  task: "check-square",
  // The four that arrive through somebody's own Google connection.
  document: "file-text",
  email: "envelope",
  event: "calendar",
  message: "chat-teardrop",
}

export const KNOWLEDGE_KIND: Record<string, string> = {
  note: "Note",
  file: "From a file",
  ticket: "From a ticket",
  // A KIND WITH NO MODULE BEHIND IT ANY MORE. Learning went on 17 Aug 2026 and
  // its 41 articles stayed, already indexed — so this word still names what a
  // source IS even though nothing writes a new one.
  article: "From an article",
  account: "From an account",
  // EVERY KIND THE SWEEP WRITES NEEDS A WORD HERE. A kind missing from this map
  // falls through to its own bare name, so the Type filter offered "sprint" and
  // "account_links" beside "From a ticket" — and the six kinds added on 18 Aug
  // would have made most of the filter read that way. Held to the kind list by
  // workers/content/test/knowledge-coverage.test.ts, which reads this map off
  // disk — so a new kind cannot ship without a word for it here.
  contact: "From a contact",
  app: "From an app",
  process: "From a process map",
  sprint: "From a sprint",
  story: "From a story",
  meeting: "From a meeting",
  todo: "From an input",
  task: "From a task",
  // The four that arrive through somebody's own Google connection — named for
  // the thing rather than the service, the same way the kinds themselves are.
  document: "From a document",
  email: "From an email",
  event: "From a calendar entry",
  message: "From a chat message",
  // R47's three (1 Sep 2026). `person` reads "About a colleague" rather than
  // "From a colleague": the source is ABOUT them and was not written by them,
  // and every other line in this map is the second sentence.
  person: "About a colleague",
  dropdown: "From a dropdown list",
  portal_login: "From a portal login",
}

/** Where a source is filed, as a person reads it: an account compartment shows
 * the account, the agency's own shows the agency. The id is deliberately NOT
 * printed — a ULID in a filter dropdown is noise; the account's own name is what
 * somebody is scanning for, and the detail screen names it in full. */
function knowledgeFiledUnder(source: KnowledgeSource, accountNames?: Map<string, string>): string {
  if (!source.accountId) return "The agency"
  return accountNames?.get(source.accountId) ?? "An account"
}

export function shapeKnowledgeList(
  sources: KnowledgeSource[],
  accountNames?: Map<string, string>
): ScreenData {
  return {
    rows: sources.map((s) => ({
      id: s.id,
      mark: (
        <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-[var(--radius)]">
          <Icon
            name={(KNOWLEDGE_KIND_ICON[s.kind] ?? "file") as IconName}
            aria-hidden
            className="size-4"
          />
        </span>
      ),
      // A source taken AWAY from the assistant stays in the list (deactivate-not-
      // delete) and says so, the same way a retired article does — seeing what
      // you excluded is half of trusting what you did not.
      name: s.active ? s.title : `${s.title} (not in use)`,
      detail: `${KNOWLEDGE_KIND[s.kind] ?? s.kind} · ${knowledgeFiledUnder(s, accountNames)}${
        s.visibility === "private" ? " · private to you" : ""
      }`,
    })),
  }
}

/* -------------------------------- meetings -------------------------------- */

/** One meeting, as a row: when it was, who it was with and why. The date leads
 * because a calendar is scanned by date — the title is what you read once you have
 * found the day. */
export function shapeMeetingsList(meetings: Meeting[], lang: Language): ScreenData {
  return {
    rows: meetings.map((m) => ({
      id: m.id,
      // WHO IT WAS WITH, as a picture. A calendar scanned by date still wants to
      // say at a glance whose call it was (R35).
      mark: <RecordMark name={m.accountName ?? m.title} />,
      // A CANCELLED meeting stays in the list (deactivate-not-delete) and says
      // so — "didn't we have a call in March?" is answered either way, and the
      // answer "yes, and we called it off" is a different one from silence.
      name: m.active ? m.title : `${m.title} (cancelled)`,
      // K1: when, and who with. The purpose is a column on the "all" view, which
      // is where a person compares meetings on it (K2).
      detail: [formatDate(m.startsAt, lang), m.accountName ?? "ours"].filter(Boolean).join(" · ") || "—",
      // TABLE COLUMNS, not facets. `client` and `state` are two of the six the
      // "All" view draws, and the meetings list's filters are the DOOR's now
      // (web/lib/collection-filters.ts) — so these are read by the table and by
      // nothing else. `purpose` went with the facet that was its only reader.
      client: m.accountName ?? "Ours",
      purpose: m.purposeName ?? "Not said",
      // WHETHER IT HAS HAPPENED, FROM THE CLOCK. There used to be a `held` status
      // on the row and this read it; a flag somebody had to remember to tick
      // could disagree with the calendar in both directions, so the start time
      // answers it now and cannot go stale.
      state: !m.active ? "Cancelled" : Date.parse(m.startsAt) < Date.now() ? "Past" : "Upcoming",
      // THE COLUMNS THE "ALL" VIEW SHOWS (CHECKLIST 9.1: "all, with far more
      // columns"). They ride every row rather than a second shaper, because the
      // three views are three renderings of ONE list — a second shaper is a
      // second idea of what a meeting row is, and the two drift.
      // A TABLE COLUMN, and the one the "All" view is most often ordered by —
      // BY THE DOOR. The meetings list pages, so its column headers ask
      // `<PagedFind>`'s own order (meetings-screen.tsx passes `order` to the
      // table) and the browser never compares this cell against another one.
      // Nothing here is a sort key, so nothing here has to be spelled for a
      // comparison: it used to render `formatDateSortable` ("2026-04-14"),
      // which was the tax the OLD table charged every date column and which
      // record-table.tsx's `sortKey`/`sortType` seam has now removed. Warm and
      // in the reader's own language, the same as the subtitle above it.
      when: formatDate(m.startsAt, lang),
      // The bare day the calendar view keys entries on — it wants a date, not a
      // moment, and formatting it for the grid is the grid's job.
      startsOn: m.startsAt.slice(0, 10),
      app: m.appName ?? "—",
      where: m.location ?? "—",
      written: m.notes ? "Yes" : "—",
      // THE NUMBER, FOR THE CHIP IN FRONT OF THE NAME (the recipe's own
      // `reference` column, screens.ts). It was `reference: m.ref ?? "—"` and
      // had no reader at all after the All table's Reference COLUMN was cut —
      // a row key rendering an em dash into nothing. Raw and nullable now,
      // because `RecordRef` decides what an absent one looks like, and what it
      // looks like is nothing.
      ref: m.ref,
    })),
  }
}

/* -------------------------------- accounts -------------------------------- */

/** The two kinds an account can be, in the words the screens use. ONE source for
 * the list line, the detail header and the create form (SCOPE ch.03: companies
 * and people are one table, told apart by this). */
const ACCOUNT_TYPE: Record<Account["accountType"], string> = {
  entity: "Company",
  individual: "Person",
}

export function shapeAccountsList(
  accounts: Account[],
  /** Say which account each row sits under. FALSE when the rows are already
   * standing under a heading that names it — the Contacts tab groups by company
   * (contacts-by-company.tsx), and "under Bergman S.A." on every row of the
   * Bergman group is the summary line spending a third of itself on the one fact
   * the reader is looking at. K1 counts facts, not characters. */
  sayParent = true
): ScreenData {
  // The hierarchy, readable in the list itself: name the parent when it is on
  // the page we loaded (for a normal agency, the whole tree is), and otherwise
  // still say the account is nested. Both lines are true — one is just more
  // specific — so a paged list never claims an account is top-level when it
  // isn't. The record's own screen always shows its parent by name.
  const nameById = new Map(accounts.map((a) => [a.id, a.name]))
  return {
    rows: accounts.map((a) => {
      const parent =
        sayParent && a.parentAccountId
          ? `under ${nameById.get(a.parentAccountId) ?? "another account"}`
          : ""
      return {
        id: a.id,
        // THE SQUARE THE ROW IS KNOWN BY (recipe `leading`, library v0.11.0). A
        // NODE, not a URL — the slot renders whatever the column holds, so a bare
        // `logoUrl` here would print the path as text. A row with no picture gets
        // the initial rather than an empty box.
        //
        // EVERY CLIENT IS A SQUARE, the sole traders included. They were drawn
        // circles, which is the honest shape for a person and the wrong one HERE:
        // one list, one column, and two shapes in it reading as two kinds of
        // record when a client is a client.
        //
        // AND THE CROP IS NO LONGER THIS ROW'S DECISION EITHER (R60, client
        // 2026-09-09: "everywhere for images: do fill, not fit!"). This line
        // used to read `a.accountType` to crop the 31 sole traders who hold a
        // real face and contain the companies' wordmarks; every picture fills
        // its box now, so the type is not consulted here at all
        // (shared/web/record-mark.tsx's header carries what that cost).
        mark: <RecordMark picture={a.logoUrl} name={a.name} />,
        // Archived rows stay visible (archive-never-delete), flagged like retired
        // roles and articles are.
        name: a.active ? a.name : `${a.name} (archived)`,
        // K1: what it is, and where it sits in the tree. The CODE left the line
        // — it is a lookup key, not something anybody scans a list for, and it
        // leads the eyebrow on the record's own screen. The parent stayed,
        // because "under Bergman S.A." is a fact about this row that no other
        // row carries.
        //
        // AND THE STATUS LEFT IT TOO (0042). Whether an account is live is the
        // archive flag, which the NAME already carries as "(archived)" one line
        // up — so a live account says nothing about its state, which is the
        // honest thing for a fact that is true of almost every row. It had been
        // a free-text column that drifted into four spellings of two ideas, and
        // every one of 106 contacts read "Active".
        detail: [ACCOUNT_TYPE[a.accountType], parent].filter(Boolean).join(" · ") || "—",
      }
    }),
  }
}

/** THE CONTACTS TABLE'S ROWS — three columns, and the argument for each one.
 *
 * The client, 2026-09-09, looking at five options for this screen: *"for
 * contacts lets do view table, also add column role after account"*. So the
 * columns are the person, then Account, then Role, in that order.
 *
 * ── WHAT THE SCREEN USED TO SHOW, AND WHAT HAPPENED TO IT ────────────────────
 *
 * A contact row was `shapeAccountsList`'s: a mark, a name, and a summary line
 * reading `Person · under Bergman S.A.`. Censused into columns, that is four
 * facts and one of them is a constant:
 *
 *   • the MARK and the NAME become the first column, together, the same shape
 *     `RecordRef` draws for a number in front of a title (`REF_LEADS_NAME` is
 *     literally that class, reused rather than respelled — a shrink-0 thing in
 *     front of a min-w-0 name).
 *   • `under Bergman S.A.` becomes the ACCOUNT column, and stops being a phrase
 *     inside a sentence. It is read off the LINK now rather than off the parent
 *     pointer, so it and Role are two facts about ONE company (shared/types.ts's
 *     note on `companyName` has the whole argument).
 *   • `Person` is DROPPED and is not a loss. It was earning its place on the
 *     Accounts list, where a row can be either kind; on a screen whose entire
 *     question is `type=individual` it is the same word on all 110 rows, which
 *     is a column of furniture (N1: a table's budget is six, and this spends
 *     three).
 *
 * ── EM DASH, NOT "None" ──────────────────────────────────────────────────────
 *
 * 22 of this team's 110 contacts sit under no company and 45 carry no role, and
 * NEITHER is an error: nobody has said yet. The app already has a word for that
 * and it is a dash — the tickets list draws `—` for a ticket with no app, and
 * `shapeAccountsList` above draws it for an empty summary line. A dash is quiet
 * enough to scan past, which is what an ordinary absence should be; "None" reads
 * like an answer somebody gave, and "Not set" reads like a fault.
 *
 * Also what `record-table.tsx` sorts LAST in both directions (`isBlank` names
 * `"—"` outright), so a table ordered by a mostly-empty column opens on the rows
 * that have something in it. */
export function shapeContactsTable(contacts: Account[]): ScreenData {
  return {
    rows: contacts.map((a) => ({
      id: a.id,
      // THE PERSON, as the mark and the name in one cell. `RecordMark` decides
      // the box and the fallback (R35/R60) — 31 of 110 hold a real face and the
      // rest get their initial, so this column is initials far more often than
      // photographs and has to look deliberate either way.
      //
      // THE DEFAULT SIZE (`row`), NOT `choice`, and it is a decision rather than
      // an omission. `choice` is 24px and record-mark.tsx reserves it in writing
      // for a checklist's checkbox row and the record picker's candidate stack —
      // "`row` stays the size for an ordinary collection row read on its own",
      // which is exactly what a line of this table is. It is also the size the
      // LIST rows this table replaced were drawing (`shapeAccountsList` above,
      // through the recipe's `leading: "mark"`), so the same person is the same
      // size on the screen she was on yesterday. The two marks at `choice` in
      // this app are both inside dropdowns.
      person: (
        <span className={REF_LEADS_NAME}>
          <RecordMark picture={a.logoUrl} name={a.name} />
          <span className="min-w-0 truncate">
            {a.active ? a.name : `${a.name} (archived)`}
          </span>
        </span>
      ),
      // THE PLAIN NAME BESIDE THE NODE, and it is not a duplicate: the column
      // above holds a React element, and `CollectionFrame`'s own search reads
      // the row's values as text (`searchKeys`), so without this the frame
      // would be searching `[object Object]`. It is also what a browser-side
      // sort would compare if this column ever gained one.
      name: a.active ? a.name : `${a.name} (archived)`,
      account: a.companyName ?? "—",
      role: a.relationship ?? "—",
    })),
  }
}

export function shapeMemberDetail(member: TeamMember, activity: ActivityItem[], lang: Language): ScreenData {
  return {
    record: {
      id: member.userId,
      name: personName(member),
      email: member.email,
      role: member.roleTitle,
      joined: formatDate(member.joinedAt, lang),
      image: member.imageUrl ?? "",
    },
    sets: { activity: shapeActivity(activity, lang) },
  }
}

export function shapeInviteDetail(
  invite: Invite,
  audit: InviteAudit | null,
  activity: ActivityItem[],
  lang: Language
): ScreenData {
  return {
    record: {
      id: invite.id,
      email: invite.email,
      role: invite.roleTitle,
      status: INVITE_STATUS[invite.status],
      // R54: whoever sent the invite is one of ours by definition — an invite
      // door is not on the portal's surface.
      invitedBy: staffNameFromSnapshot(audit?.inviterName) || audit?.inviterEmail || "—",
      invited: formatDate(invite.createdAt, lang),
      expires: formatDate(invite.expiresAt, lang),
      accepted: audit?.accepted && audit.acceptedAt ? formatDate(audit.acceptedAt, lang) : "—",
    },
    sets: { activity: shapeActivity(activity, lang) },
  }
}

/* ------------------- the agency's own housekeeping ------------------------ */
// Two modules, one shaping pattern, and one thing to keep in view while reading
// them: an ARCHIVED row stays in the list. That is deactivate-not-delete showing
// through to the screen — the row is retired, not removed, so it is still there
// to restore — and the `(archived)` suffix plus the `state` facet are how a
// person tells the two apart at a glance. Roles have said "(inactive)" for the
// same reason since the base's first commit; these say "(archived)" because that
// is the word this app's glossary uses for putting a record away without losing
// it.

export function shapeBrandList(items: BrandAsset[]): ScreenData {
  return {
    rows: items.map((a) => ({
      id: a.id,
      mark: <RecordMark picture={a.fileUrl} name={a.name} />,
      name: a.active ? a.name : `${a.name} (archived)`,
      // A COLOUR SAYS ITS VALUE. Twelve rows named "1".."12" read as twelve
      // identical lines saying "Color" until 0043 gave them the hex they had
      // always carried inside a URL. The WORD is still worth having — a hex is a
      // thing a person copies far more often than they look at.
      //
      // AND THE SWATCH, at last. This comment promised it "needs the library's
      // leading slot (UI-GAPS #16)"; #16 shipped, and the sentence outlived the
      // fact — which is precisely the rot that gap's own check exists to catch,
      // one level below where it was looking.
      detail: a.colorHex || a.category || a.description || "—",
      category: a.category || "—",
      state: a.active ? "Live" : "Archived",
      // The gallery display's own slot (`recipe.image`) — a plain URL
      // string, not the `mark` node above. A colour asset has no file (0043:
      // the two are exclusive by construction), so it draws Gallery's own
      // no-picture register — its name on soft paper — rather than a broken
      // image or an invented swatch tile.
      fileUrl: a.fileUrl || undefined,
    })),
  }
}

export function shapeBrandDetail(asset: BrandAsset, activity: ActivityItem[], lang: Language): ScreenData {
  return {
    record: {
      id: asset.id,
      name: asset.name,
      detail: asset.category || "No type said",
      category: asset.category || "—",
      description: asset.description || "—",
      // A COLOUR IS THE ASSET, not a file of it (0043). The two are exclusive by
      // construction: the migration cleared `file_url` on every row it converted.
      file: asset.colorHex || asset.fileUrl || "No file yet",
      created: formatDateTime(asset.createdAt, lang),
      createdBy: staffNameFromSnapshot(asset.creatorName) || "—", // R54
      updated: asset.updatedAt ? formatDateTime(asset.updatedAt, lang) : "—",
    },
    sets: { activity: shapeActivity(activity, lang) },
  }
}

export function shapePurposesList(items: MeetingPurpose[]): ScreenData {
  return {
    rows: items.map((p) => ({
      id: p.id,
      mark: <RecordMark name={p.name} />,
      name: p.active ? p.name : `${p.name} (archived)`,
      detail: p.department || p.description || "—",
      department: p.department || "—",
      state: p.active ? "Live" : "Archived",
    })),
  }
}

export function shapePurposeDetail(purpose: MeetingPurpose, activity: ActivityItem[], lang: Language): ScreenData {
  return {
    record: {
      id: purpose.id,
      name: purpose.name,
      detail: purpose.department || "No department",
      department: purpose.department || "—",
      description: purpose.description || "—",
      created: formatDateTime(purpose.createdAt, lang),
      createdBy: staffNameFromSnapshot(purpose.creatorName) || "—", // R54
      updated: purpose.updatedAt ? formatDateTime(purpose.updatedAt, lang) : "—",
    },
    sets: { activity: shapeActivity(activity, lang) },
  }
}
