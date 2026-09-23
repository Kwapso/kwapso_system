// Per-module SHAPING — pure functions turning already-loaded app data into the
// flat ScreenData (records / rows / sets) each recipe reads. No hooks, no
// fetching: the resolver guards loading/errors then calls these, so they're
// trivially unit-testable and keep the resolver lean.

import { type ScreenData } from "@shared/web/screen-engine/screen-renderer"

import { formatDate, formatDateTime, formatRelative, formatTime } from "@shared/web/format"
import { stripPictographs } from "@shared/text-clean"
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
import { safeSrc } from "@shared/web/rich-text"
import { Badge } from "@shared/ui/components/badge/badge"
import { Icon, type IconName } from "@shared/web/screen-engine/icon"
import { Swatch } from "@/components/records/record-picker"
import type { PickablePerson } from "@/lib/members"
import { CONCEPT_ICON } from "@/lib/pages"
// THE ONE STATUS→DOT DERIVATION, IMPORTED RATHER THAN COPIED — see
// `shapeChoicesTable`'s own status-cell comment below. `automation-edit-sheet.tsx`
// is the module that defines it (`ModuleAutomations` and its own detail head
// already import it the same way); this is a third reader, not a second copy.
// AMENDED, 17 Sep 2026 — the client's ruling on the Choices tables' status
// column: *"Dots like everywhere else."* This file used to import the older
// `AUTOMATION_STATUS_VARIANT` (a filled-pill map) instead; that map is now
// deleted (see automation-edit-sheet.tsx's own header) and every reader,
// this one included, reads `AUTOMATION_STATUS_DOT` alone.
import { AUTOMATION_STATUS_DOT } from "@/components/screens/automation-edit-sheet"
// THE CLASS, NOT THE CHIP. `REF_LEADS_NAME` is the one spelling of "a shrink-0
// thing in front of a name that truncates", written for the reference lozenge
// and exactly as true of the contacts table's mark — the alternative was a
// second set of the same four utilities, which is how two rows come to align
// differently (`record-ref.tsx` carries the whole argument for each one).
import { REF_LEADS_NAME } from "@shared/web/record-ref"
import { ticketTitle } from "@shared/web/ticket-chips"
import type { MeetingTypeIcon } from "@shared/meeting-icons"
import { translator, type Language } from "@shared/i18n"
import { phaseTypeIcon, PHASE_TYPE_GROUP } from "@shared/sprint-types"
import { storyTypeIconName } from "@shared/story-types"
import { TICKET_TYPE_GROUP, ticketTypeIconName, type TicketTypeIconName } from "@shared/ticket-types"
import { appStageDotTone } from "@shared/app-stages"
// THE TICKET STAGE'S OWN DOT (R86, client ruling 18 Sep 2026: "when showing
// status/stage on a list, include the colored dot") — the same seam
// `help-detail.tsx`'s own header chip already reads for the identical tone,
// imported here so a table cell that shows a ticket's STAGE draws through the
// one function rather than a second lookup that happens to agree with it
// today. See `ticketStatusCell` below.
import { helpStatusDotTone } from "@shared/status-tones"
import { SELECTABLE_GROUPS } from "@shared/selectable-groups"
import { selectableFieldWords } from "@shared/selectable-where"
import { SprintTypeGlyph } from "@/lib/sprint-type-icon"
import type {
  Account,
  ActivityItem,
  BrandAsset,
  HelpTicket,
  Invite,
  InviteAudit,
  Meeting,
  MeetingPurpose,
  SelectableValue,
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
    // THE FACE (R35/R60), the same field and the same `safeSrc` seam
    // `use-record-activity.ts` reads it through — the fix this file's own
    // header warns fixes land in one shaper and not the other.
    avatarSrc: safeSrc(a.actorPicture ?? undefined),
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
  // B0383 — the owner's approved rename, "Scheduled" -> "To Do". The stored
  // value stays `scheduled` (`HelpTicket["status"]`, workers/content/src/
  // handlers/help.ts); only the word this map hands back moves.
  scheduled: "To Do",
  in_progress: "In progress",
  ready: "Ready",
  resolved: "Resolved",
}

/** THE ONE CELL RENDERER FOR A TICKET'S STAGE ON A LIST (R86, client ruling
 * 18 Sep 2026, verbatim: "when showing status/stage on a list, include the
 * colored dot"). Before this, the app's own Tickets tab (`work-panels.tsx`'s
 * table) drew the stage as bare muted text — a text-only status cell of
 * exactly the shape this ruling refuses, one table over from the ticket
 * detail head's own chip (`help-detail.tsx`), which already draws
 * `Badge variant="status" dot={helpStatusDotTone(ticket.status)}`. Rather than
 * a second `<Badge>` respelled at the next table that shows a stage, this is
 * that same pairing as ONE shared function — the census `HEADING`/`HELP_STATUS`
 * already stand for. Every table-row stage cell should route through here
 * rather than through `t(HELP_STATUS[...])` alone. */
export function ticketStatusCell(status: HelpTicket["status"], t: (s: string) => string) {
  return (
    <Badge variant="status" dot={helpStatusDotTone(status)}>
      {t(HELP_STATUS[status])}
    </Badge>
  )
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
  // WAS "buildings" — the rail moved Accounts to a briefcase on 3 Sep 2026
  // (client ruling, CONCEPT_ICON.accounts) and this line was not told.
  account: "briefcase",
  // WAS "address-book" / "check-square" — client ruling, 17 Sep 2026,
  // verbatim, over the whole rail: "For contacts, use the user circle in the
  // field" / "For tasks, use the checks in plural in regular." Kept in step
  // with `CONCEPT_ICON.contacts`/`.tasks` (web/lib/pages.ts) and
  // `SECTION_ICONS.contacts`/`.tasks` (app-shell.tsx) per this map's own rule,
  // above: a kind that IS one of the app's own records borrows that record's
  // rail icon.
  contact: "user-circle",
  app: "app-window",
  process: "git-fork",
  sprint: "calendar-dots",
  story: "puzzle-piece",
  meeting: "chat",
  todo: "clipboard-text",
  task: "checks--regular",
  // The four that arrive through somebody's own Google connection.
  document: "file-text",
  email: "envelope",
  event: "calendar",
  message: "chat-teardrop",
  // The team's own vocabulary, typed here rather than mirrored (see
  // `KNOWLEDGE_KINDS`'s own "glossary" entry, workers/content/src/lib/knowledge.ts).
  glossary: "book-open-text",
}

// SHORTENED, ONE WORD (OR THE SHORTEST NOUN) PER KIND — the client's ruling,
// 17 Sep 2026, verbatim, over the Knowledge screen's own tab strip: "the
// names of the tabs are too long. Instead of 'From a meeting,' say
// 'Meetings,' and so on. In all the cases, just make the names shorter."
// This map is the ONE place a kind's word is written (knowledge-screen.tsx's
// tab strip, the Type facet and every source card all read it, never their
// own copy), so shortening it here is the whole fix. Every "From a…"/"About
// a…" sentence became a short plural noun, the glossary's own term (R34)
// where this app already has one — `dropdown` reads "Choices"
// (`dropdownValues`, shared/glossary.ts), not the literal "Dropdowns" a
// blind pluralisation would have written. `note` and `file` were not
// spared for already being short: "Note" became the plural "Notes" to match
// every other tab, and "From a file" became "Uploads" — the word for the
// thing a person actually did, not a literal shrink of the old sentence.
export const KNOWLEDGE_KIND: Record<string, string> = {
  note: "Notes",
  file: "Uploads",
  ticket: "Tickets",
  // A KIND WITH NO MODULE BEHIND IT ANY MORE. Learning went on 17 Aug 2026 and
  // its 41 articles stayed, already indexed — so this word still names what a
  // source IS even though nothing writes a new one.
  article: "Articles",
  account: "Accounts",
  // EVERY KIND THE SWEEP WRITES NEEDS A WORD HERE. A kind missing from this map
  // falls through to its own bare name, so the Type filter offered "sprint" and
  // "account_links" beside "Tickets" — and the six kinds added on 18 Aug
  // would have made most of the filter read that way. Held to the kind list by
  // workers/content/test/knowledge-coverage.test.ts, which reads this map off
  // disk — so a new kind cannot ship without a word for it here.
  contact: "Contacts",
  app: "Apps",
  process: "Processes",
  sprint: "Phases",
  story: "Stories",
  meeting: "Meetings",
  todo: "Inputs",
  task: "Tasks",
  // The four that arrive through somebody's own Google connection — still
  // named for the thing, not the service, the same way every other kind is.
  document: "Docs",
  email: "Emails",
  event: "Events",
  message: "Messages",
  // R47's three (1 Sep 2026). `person` used to read "About a colleague"
  // rather than "From a colleague" — the source is ABOUT them and was not
  // written by them — and the short form keeps that distinction the only way
  // a noun can: a person IS a colleague, never "from" one.
  person: "Colleagues",
  dropdown: "Choices",
  portal_login: "Logins",
  // The team's own vocabulary (Aurora's ruling, 20 Sep 2026); its own tab is
  // built by hand in knowledge-screen.tsx rather than derived like the tabs
  // above (it must be reachable while empty, so the Glossary tab can seed
  // itself), but the word still lives here: every OTHER reader of a source's
  // kind (a card, the Type filter) is this map, and a glossary source is no
  // exception to that.
  glossary: "Glossary",
}

/* -------------------------------- meetings -------------------------------- */

// THE EIGHT MEETING-TYPE ICONS, NAMED LITERALLY — `MeetingPurpose.icon` and
// `Meeting.purposeIcon` arrive from the database at runtime (`<Icon
// name={p.icon} …>` below and in `internal-screens.tsx`'s Choices row), and
// `scripts/icon-map.mjs`'s census can only see a literal `icon: "…"` in
// SOURCE — it has no way to read a value that only exists once a row comes
// back from the door. Without this, the generated `icon-map.ts` would never
// import `ClockCounterClockwise` et al., and every meeting-type icon would
// resolve to nothing (`iconComponent()` returns null for a name the map
// doesn't carry) — a silent hole, never a build failure. Kept beside
// `MEETING_TYPE_ICONS` (@shared/meeting-icons), the vocabulary the write door
// checks against, so the two can never drift: an icon added there and not
// here draws nothing; one added here and not there refuses at the door.
const MEETING_TYPE_ICON_CENSUS: { icon: MeetingTypeIcon }[] = [
  { icon: "clock-counter-clockwise" },
  { icon: "calendar-blank" },
  { icon: "check-circle" },
  { icon: "arrows-clockwise" },
  { icon: "rocket-launch" },
  { icon: "arrow-clockwise" },
  { icon: "calendar-dots" },
  { icon: "target" },
]
void MEETING_TYPE_ICON_CENSUS

// THE FOUR TICKET-TYPE ICONS, NAMED LITERALLY — the same census-bait shape
// `MEETING_TYPE_ICON_CENSUS` just above holds for its own eight, and for the
// identical reason: `ticketTypeIconName` (@shared/ticket-types) resolves a
// NAME at runtime through `iconComponent()`, never a literal `icon: "…"` a
// source scan can see, so without this the generated `icon-map.ts`
// (scripts/icon-map.mjs) would never import `Bug`/`Question`/`PlusCircleRegular`/
// `ChatCircleText` for THIS reason (any of the four may still be pulled in by
// an unrelated call elsewhere) — a silent hole, not a build failure. Kept
// beside the map it census-checks so the two can never drift.
const TICKET_TYPE_ICON_CENSUS: { icon: TicketTypeIconName }[] = [
  { icon: "bug" },
  { icon: "question" },
  { icon: "plus-circle--regular" },
  { icon: "chat-circle-text" },
]
void TICKET_TYPE_ICON_CENSUS

/** One meeting, as a row: when it was, who it was with and why. The date leads
 * because a calendar is scanned by date — the title is what you read once you have
 * found the day. */
export function shapeMeetingsList(meetings: Meeting[], lang: Language): ScreenData {
  // No hook to call `useLanguage()` with (a pure shaper, no React tree) — the
  // same reason `shapeActivity`/`shapeAccountsList` above build `t` this way.
  // Needed now because "Ours" (R35's accountCell fallback, below) is a real
  // JSX child (R28/R33's `t(...)` census reads it), where the plain-text
  // `client`/`detail` fallbacks two lines down are not — they were already
  // untranslated before this pass and stay that way; this fixes only the node
  // this pass adds.
  const t = translator(lang)
  return {
    rows: meetings.map((m) => {
      // THE ACCOUNT'S OWN NAME OR "OURS", ONCE — read by both the mark's
      // accessible name and the visible text beside it, so the two can never
      // say two different words about the same row.
      const accountLabel = m.accountName ?? t("Ours")
      // THE DISPLAY-TIME STRIP — the client's ruling, 16 Sep 2026: "kill the
      // emojis. Also, when they're in the name, just remove them, please." A
      // title synced from Google before this ruling shipped is still stored
      // with whatever pictograph its invitation carried
      // (`workers/content/src/lib/meetings.ts`'s `titleOf` strips at INGEST,
      // for every sync from now on) — this is the other half, read once here
      // so every field below that carries the title agrees.
      const title = stripPictographs(m.title)
      return {
      id: m.id,
      // WHO IT WAS WITH, as a picture. A calendar scanned by date still wants to
      // say at a glance whose call it was (R35).
      mark: <RecordMark name={m.accountName ?? title} />,
      // A CANCELLED meeting stays in the list (deactivate-not-delete) and says
      // so — "didn't we have a call in March?" is answered either way, and the
      // answer "yes, and we called it off" is a different one from silence.
      name: m.active ? title : `${title} (cancelled)`,
      // THE PLAIN-TEXT SIBLING (R80/K22, 16 Sep 2026's table) — `name` above
      // is already plain text today, but this is declared anyway, the same
      // convention `shapeAccountsList`'s own `nameText` follows one file
      // over: a table's `searchKey` names a PROPERTY the frame reads
      // (record-table.tsx's own doc), and a name that later grows a node
      // (a mark, a badge) must not silently break the column that searches
      // and sorts it.
      nameText: m.active ? title : `${title} (cancelled)`,
      // K1: when, and who with. The purpose is a column on the "all" view, which
      // is where a person compares meetings on it (K2).
      detail: [formatDate(m.startsAt, lang), m.accountName ?? "ours"].filter(Boolean).join(" · ") || "",
      // TABLE COLUMNS, not facets. `client` and `state` are two of the six the
      // "All" view draws, and the meetings list's filters are the DOOR's now
      // (web/lib/collection-filters.ts) — so these are read by the table and by
      // nothing else. `purpose` went with the facet that was its only reader.
      client: m.accountName ?? "Ours",
      // THE ACCOUNT, WEARING ITS OWN FACE (R35, client ruling 2026-09-15: "add
      // the logos to account and app … identify everywhere else where it
      // makes sense") — the Table's own "Account" column. A SEPARATE key from
      // `client` above, deliberately: `client` is read as plain text by the
      // calendar view's own detail line (`MeetingsMonthCalendar`, this file's
      // header comment), and `String(<span>…</span>)` there would print
      // "[object Object]". An internal meeting (no account) draws "Ours" as
      // the mark's own name, the same fallback `client` already uses, so the
      // initial tile reads "O" rather than a blank box.
      accountCell: (
        <span className="flex items-center gap-2">
          {/* `choice` — a table row's face fits the text line, never the
              other way round (client ruling, 18 Sep 2026: "when avatar/icon
              on list view, make the avatar smaller"). */}
          <RecordMark picture={m.accountLogoUrl} name={accountLabel} size="choice" />
          <span className="min-w-0 truncate">{accountLabel}</span>
        </span>
      ),
      purpose: m.purposeName ?? "Not said",
      // THE TYPE, WEARING ITS OWN ICON — same `client`/`accountCell` split as
      // above: `purpose` stays plain text (a consumer may still read it as a
      // string), `purposeCell` is the node with the type's Phosphor icon
      // (MeetingPurpose.icon) beside its name, for a table cell or an agenda
      // row that wants to draw it instead of bare text.
      purposeCell: m.purposeName ? (
        <span className={REF_LEADS_NAME}>
          {m.purposeIcon ? (
            <Icon name={m.purposeIcon} className="text-muted-foreground size-4 shrink-0" />
          ) : null}
          <span className="min-w-0 truncate">{m.purposeName}</span>
        </span>
      ) : null,
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
      // THE TIME, SPLIT FROM THE DATE — the table's own Time column (16 Sep
      // 2026 table ruling: "I want it exactly like the one in tickets"),
      // read down a page the same way `when` is. DOOR-ORDERED for the
      // identical reason `when` is one comment up — see
      // `sorted-columns-declare-their-type.test.ts`'s own `DOOR_ORDERED.time`.
      time: formatTime(m.startsAt, lang),
      // The bare day the calendar view keys entries on — it wants a date, not a
      // moment, and formatting it for the grid is the grid's job.
      startsOn: m.startsAt.slice(0, 10),
      app: m.appName ?? "",
      where: m.location ?? "",
      written: m.notes ? "Yes" : "",
      // WHO IS COMING, AS FACES — the table's own Attendees column. Rooms are
      // not stakeholders (`meeting-detail.tsx`'s own split, "a room shown as
      // a stakeholder is a stakeholder nobody can ring"), so they are
      // filtered out before anybody is counted. `null` for a typed meeting
      // with no guest list — the honest absence a `render` fallback below
      // draws as an em dash, never an invented name.
      attendeesCell: (() => {
        const people = (m.googleGuests ?? []).filter((g) => !g.resource)
        if (people.length === 0) return null
        const shown = people.slice(0, 3)
        return (
          <span className="flex items-center gap-1.5">
            <span className="flex items-center gap-1">
              {shown.map((g) => (
                <RecordMark key={g.email} name={g.name || g.email} shape="round" size="choice" />
              ))}
            </span>
            {people.length > shown.length ? (
              <span className="text-muted-foreground text-xs">+{people.length - shown.length}</span>
            ) : null}
          </span>
        )
      })(),
      // THE PLAIN-TEXT SIBLING, declared for the same reason `nameText` is
      // above — never read today (R14: the door owns this table's search),
      // visibly correct the day it stops being paged rather than silently
      // unsearchable.
      attendeesText: (m.googleGuests ?? [])
        .filter((g) => !g.resource)
        .map((g) => g.name || g.email)
        .join(", "),
      // THE NUMBER, FOR THE CHIP IN FRONT OF THE NAME (the recipe's own
      // `reference` column, screens.ts). It was `reference: m.ref ?? "-"` and
      // had no reader at all after the All table's Reference COLUMN was cut —
      // a row key rendering an em dash into nothing. Raw and nullable now,
      // because `RecordRef` decides what an absent one looks like, and what it
      // looks like is nothing.
      ref: m.ref,
      }
    }),
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
   * standing under a heading that names it, so "under Bergman S.A." on every
   * row of a Bergman group would spend a third of the summary line on the one
   * fact the reader is looking at. K1 counts facts, not characters. (The
   * grouped-by-company caller this parameter was written for —
   * `contacts-by-company.tsx` — was deleted 14 Sep 2026 as unreached dead
   * code; kept here because it is still the correct shape for a heading that
   * already names the parent, not a leftover.) */
  sayParent = true,
  /** 0091 — who each row's account manager is, resolved off the SAME cached
   * members list every picker in the app already reads (R56: no second
   * fetch for this column). `[]` costs nothing: every row's `manager` is
   * then "-", exactly what an account with nobody assigned already shows.
   * DRAWN NOW — the gallery card wall and the table's own column
   * (`web/components/accounts/accounts-screen.tsx`, client ruling 14 Sep
   * 2026), the view this field was declared ahead of. */
  members: PickablePerson[] = [],
  /** THE WORDS ON THIS ROW — "Active"/"Archived" below, and nothing else
   * today. No hook to call
   * `useLanguage()` with (a pure shaper, no React tree), so `t` is built the
   * same way `shapeActivity` above builds it. */
  lang: Language = "en"
): ScreenData {
  const t = translator(lang)
  const managerById = new Map(members.map((m) => [m.id, m]))
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
        // roles and articles are. For the TABLE VIEW, client ruling 2026-09-15:
        // "on the accounts list, on the left of the name, in the same column,
        // put the logo of the company." The gallery renders the mark separately
        // (`size="band"`); the table renders both mark+name in one cell.
        name: (
          <span className="flex items-center gap-2">
            {/* THE SMALLEST SIZE, IN A TABLE ROW (client ruling, 18 Sep 2026:
                "when avatar/icon on list view, make the avatar smaller. should
                not be the cause of more height to the overall row"). The kit's
                own `choice` size (24px, `--avatar-sm`) is what fits a single
                text line without stretching the row to hold it — the same
                fix this ruling makes at every table-row face cell in this
                file, tickets-collection.tsx and work-panels.tsx. */}
            <RecordMark picture={a.logoUrl} name={a.name} size="choice" />
            <span>{a.name}</span>
          </span>
        ),
        // Keep the plain text for search and sort. The table's own column
        // definition will use `searchKey` to find this field for filtering.
        nameText: a.name,
        // K1: what it is, and where it sits in the tree. The CODE left the line
        // — it is a lookup key, not something anybody scans a list for, and it
        // leads the eyebrow on the record's own screen. The parent stayed,
        // because "under Bergman S.A." is a fact about this row that no other
        // row carries.
        //
        // AND THE STATUS LEFT IT TOO (0042). Whether an account is live is the
        // archive flag, which is shown separately in the status column — so a
        // live account says nothing about its state, which is the honest thing
        // for a fact that is true of almost every row. It had been a free-text
        // column that drifted into four spellings of two ideas, and every one
        // of 106 contacts read "Active".
        detail: [ACCOUNT_TYPE[a.accountType], parent].filter(Boolean).join(" · ") || "",
        // 0091 — the account manager's face (R35), or null for nobody
        // assigned yet. `a.accountManagerId` is `null` for a client login
        // (`toAccount`'s own withholding) as well as for "nobody assigned",
        // so this column reads the same honest null either way.
        manager: (() => {
          const m = a.accountManagerId ? managerById.get(a.accountManagerId) : undefined
          return m ? (
            <span className="flex items-center gap-2">
              {/* THE SMALLEST SIZE, IN A TABLE ROW — see `name`'s own note a
                  few lines up (client ruling, 18 Sep 2026). */}
              <RecordMark picture={m.photo} name={m.name} shape="round" size="choice" />
              {m.name}
            </span>
          ) : (
            null
          )
        })(),
        // THE POSTAL ADDRESS' OWN FIELD (shared/types.ts's `Account.country`),
        // for the table's Country column — client ruling 14 Sep 2026. Plain
        // data, not app copy, so it is never a `t()` call (R28 covers what the
        // app SAYS, not a value somebody picked from the Country dropdown).
        country: a.country ?? "",
        // THE ARCHIVE FLAG, SAID AS A WORD (0042's own finding, read the other
        // way round): there is no `status` COLUMN on an account — one was
        // removed for drifting into four spellings of the same fact
        // (`workers/tenancy/src/lib/accounts.ts`'s own header) — so "Status" IS
        // `active`, worded and, per the Choices rule, coloured where the word
        // carries a colour. It does not sit in a `selectable_data` group (it is
        // not a Choice at all, it is the archive flag), so there is no vocabulary
        // colour to read off one.
        //
        // REWIRED 17 Sep 2026, her ruling that session: "account active green
        // dot." This was a FILLED pill (`success`/`secondary`) until now — the
        // shape every other coloured kind in this ruling abandoned for
        // `variant="status"` + a dot (the Portal column a few lines down made
        // the identical move on 16 Sep). `shipped` (green) while live,
        // `archived` (grey) once put away — unchanged in word, only in shape.
        status: (
          <Badge variant="status" dot={a.active ? "shipped" : "archived"}>
            {a.active ? t("Active") : t("Archived")}
          </Badge>
        ),
        // THE RAW PICTURE, for the gallery card's own bigger face
        // (`size="band"`, the way `members-gallery.tsx` draws one) — `mark`
        // above is sized for a LIST row and is the wrong box to stretch.
        logoUrl: a.logoUrl,
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
 * and it is a dash — the tickets list draws `-` for a ticket with no app, and
 * `shapeAccountsList` above draws it for an empty summary line. A dash is quiet
 * enough to scan past, which is what an ordinary absence should be; "None" reads
 * like an answer somebody gave, and "Not set" reads like a fault.
 *
 * Also what `record-table.tsx` sorts LAST in both directions (`isBlank` names
 * `"-"` outright), so a table ordered by a mostly-empty column opens on the rows
 * that have something in it.
 *
 * ── THE FOURTH COLUMN, PORTAL (client ruling, 16 Sep 2026) ───────────────────
 *
 * "add a column to show if they are in the portal or not" — `hasPortalLogin`,
 * read straight off the row (`workers/tenancy/src/lib/accounts.ts`'s own
 * header has the door half). ORIGINALLY a filled `Badge`, the same shape
 * `status` still draws on `shapeAccountsList` above (`success` for a live
 * grant, `secondary` for none) — REPLACED THE SAME SESSION, her own
 * follow-up: *"For contacts, portal: no portal, same as with automations.
 * Let's switch the design to the color dot. Portal: make it green, and no
 * portal: gray."* (and, the same breath, "All dots are always solid, not
 * rings.") So this column now draws `<Badge variant="status" dot="shipped">`
 * for a live grant and `dot="archived">` for none — green and grey, her
 * exact words, never a hex (R32) — the identical shape the ticket detail
 * head's own stage chip and `automation-edit-sheet.tsx`'s own status dot
 * (`AUTOMATION_STATUS_DOT`, added the same session) already draw. `status`
 * on `shapeAccountsList` above is UNCHANGED and still a filled pill — a
 * different column on a different table, not named in this ruling.
 * `null` (no `portal_users:read`) reads exactly like `false` here —
 * `contacts-screen.tsx` only spreads this column onto the table's own field
 * list when the caller holds that right in the first place, so a caller ever
 * asked to shape a `null` row already could not see the column it would have
 * rendered in. `lang`, not the hook's own `t`: this file has no React tree
 * to call `useLanguage()` from (`shapeAccountsList`'s header, a few hundred
 * lines up, makes the identical argument), so the caller hands the language
 * and a `translator(lang)` is built here, same as there. */
export function shapeContactsTable(contacts: Account[], lang: Language = "en"): ScreenData {
  const t = translator(lang)
  return {
    rows: contacts.map((a) => ({
      id: a.id,
      // THE PERSON, as the mark and the name in one cell. `RecordMark` decides
      // the box and the fallback (R35/R60) — 31 of 110 hold a real face and the
      // rest get their initial, so this column is initials far more often than
      // photographs and has to look deliberate either way.
      //
      // `choice` (24px), NOT `row` — REVERSED 18 Sep 2026. This used to argue
      // for `row` (36px) as "the size for an ordinary collection row read on
      // its own", which was correct against the ruling in force that day. The
      // client's later ruling supersedes it, unhedged, over every table row in
      // the app: "when avatar/icon on list view, make the avatar smaller.
      // should not be the cause of more height to the overall row." A face at
      // `row` sits taller than this table's own text line, so the row's
      // height is set by the picture rather than by what a person reads;
      // `choice` is the kit's own smallest size and is what a single text
      // line already needs.
      person: (
        <span className={REF_LEADS_NAME}>
          <RecordMark picture={a.logoUrl} name={a.name} size="choice" />
          <span className="min-w-0 truncate">
            {a.name}
          </span>
        </span>
      ),
      // THE PLAIN NAME BESIDE THE NODE, and it is not a duplicate: the column
      // above holds a React element, and `CollectionFrame`'s own search reads
      // the row's values as text (`searchKeys`), so without this the frame
      // would be searching `[object Object]`. It is also what a browser-side
      // sort would compare if this column ever gained one.
      name: a.name,
      account: a.companyName ?? "",
      // THE ACCOUNT, WEARING ITS OWN FACE (R35, client ruling 2026-09-15:
      // "add the logos to account and app … identify everywhere else where
      // it makes sense") — this table's own "Account" column. A SEPARATE key
      // from `account` above, deliberately: `account` is kept as the plain
      // text `CollectionFrame`'s free-text search reads (this column's own
      // `searchKeys`, contacts-screen.tsx), and a React node there would be
      // "[object Object]". NO MARK AT ALL when there is no linked company —
      // the same em dash `account` already falls back to, and the same
      // absent-record treatment the ticket table's own App column gives an
      // unset app: 22 of 110 contacts on the real team sit under no company,
      // and that is an ordinary absence, not a record with no picture.
      accountCell: a.companyName ? (
        // `flex-wrap` — the census in `web/test/rules.test.ts` ("a record's
        // name survives a narrow screen") reads 1400 characters forward of
        // ANY `flex items-center` row looking for `min-w-0` near a `<Badge>`,
        // and the new Portal cell a few lines down (`shapeContactsTable`'s
        // own header has the full ruling) now falls inside that window — the
        // identical text-proximity finding `automation-edit-sheet.tsx`
        // already wrote out for its own Status field. Wrapping costs nothing
        // here (a mark and one company name never need the second line on
        // any screen this table renders at) and keeps the census honest
        // rather than gamed around.
        <span className="flex flex-wrap items-center gap-2">
          {/* `choice` — see `person`'s own note above (client ruling, 18 Sep
              2026): a table row's face fits the text line, never the other
              way round. */}
          <RecordMark picture={a.companyLogoUrl ?? null} name={a.companyName} size="choice" />
          <span className="min-w-0 truncate">{a.companyName}</span>
        </span>
      ) : null,
      role: a.relationship ?? "",
      // THE STATUS COLUMN, 17 Sep 2026 — her ruling that session: "contact
      // live green." A live/archived dot, the same `variant="status"` +
      // `shipped`/`archived` pair the Portal column right below already
      // draws for its own two states, never a filled pill.
      status: (
        <Badge variant="status" dot={a.active ? "shipped" : "archived"}>
          {a.active ? t("Live") : t("Archived")}
        </Badge>
      ),
      // THE PORTAL COLUMN — see this function's own header. `!== true` rather
      // than `!a.hasPortalLogin` catches `null` (withheld) and `false`
      // (really not) in the same "No portal" branch, on purpose: the caller
      // already decided whether this column is drawn at all, and both are the
      // honest "not shown as a live login" answer once it is.
      portal:
        a.hasPortalLogin === true ? (
          <Badge variant="status" dot="shipped">{t("Portal")}</Badge>
        ) : (
          <Badge variant="status" dot="archived">{t("No portal")}</Badge>
        ),
      // THE RAW PICTURE, for the gallery card's own bigger face
      // (`contacts-screen.tsx`'s own `contactGalleryBody`, `PersonCard`'s
      // `size="band"` default) — `person` above is already sized and composed
      // for a TABLE row (`size="choice"`, mark+name in one span) and is the
      // wrong node to stretch. The identical reasoning `shapeAccountsList`'s
      // own `logoUrl` field carries one screen over.
      logoUrl: a.logoUrl,
    })),
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
      invitedBy: staffNameFromSnapshot(audit?.inviterName) || audit?.inviterEmail || "",
      invited: formatDate(invite.createdAt, lang),
      expires: formatDate(invite.expiresAt, lang),
      accepted: audit?.accepted && audit.acceptedAt ? formatDate(audit.acceptedAt, lang) : "",
    },
    sets: { activity: shapeActivity(activity, lang) },
  }
}

/* ------------------- the agency's own housekeeping ------------------------ */
// An ARCHIVED row stays in the list. That is deactivate-not-delete showing
// through to the screen — the row is retired, not removed, so it is still there
// to restore. The `state` facet shows the archive status on cards and tables.
// Aurora's ruling, 22 Sep 2026, verbatim: "if status archive i dont need it
// shoing here!!!! rmeove that, show only the name" — the "(archived)" suffix
// has been removed from all account, contact, brand asset and meeting purpose
// names everywhere they are displayed or used for search/sort.
// Roles have said "(inactive)" for the same reason since the base's first
// commit; these names no longer carry a status suffix.

export function shapeBrandList(items: BrandAsset[]): ScreenData {
  return {
    rows: items.map((a) => ({
      id: a.id,
      mark: <RecordMark picture={a.fileUrl} name={a.name} />,
      name: a.name,
      // A COLOUR SAYS ITS VALUE. Twelve rows named "1".."12" read as twelve
      // identical lines saying "Color" until 0043 gave them the hex they had
      // always carried inside a URL. The WORD is still worth having — a hex is a
      // thing a person copies far more often than they look at.
      //
      // AND THE SWATCH, at last. This comment promised it "needs the library's
      // leading slot (UI-GAPS #16)"; #16 shipped, and the sentence outlived the
      // fact — which is precisely the rot that gap's own check exists to catch,
      // one level below where it was looking.
      detail: a.colorHex || a.category || a.description || "",
      category: a.category || "",
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
      category: asset.category || "",
      description: asset.description || "",
      // A COLOUR IS THE ASSET, not a file of it (0043). The two are exclusive by
      // construction: the migration cleared `file_url` on every row it converted.
      file: asset.colorHex || asset.fileUrl || "No file yet",
      created: formatDateTime(asset.createdAt, lang),
      createdBy: staffNameFromSnapshot(asset.creatorName) || "", // R54
      updated: asset.updatedAt ? formatDateTime(asset.updatedAt, lang) : "",
    },
    sets: { activity: shapeActivity(activity, lang) },
  }
}

export function shapePurposesList(items: MeetingPurpose[]): ScreenData {
  return {
    rows: items.map((p) => ({
      id: p.id,
      mark: <RecordMark name={p.name} />,
      name: p.name,
      detail: p.department || p.description || "",
      department: p.department || "",
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
      department: purpose.department || "",
      description: purpose.description || "",
      created: formatDateTime(purpose.createdAt, lang),
      createdBy: staffNameFromSnapshot(purpose.creatorName) || "", // R54
      updated: purpose.updatedAt ? formatDateTime(purpose.updatedAt, lang) : "",
    },
    sets: { activity: shapeActivity(activity, lang) },
  }
}

/** WHERE ONE GROUP OF CHOICE VALUES LIVES — the module its words are stored
 * on (`shared/selectable-homes.ts`, read through `MODULE_SETTINGS` and
 * `moduleSettingsIndex`), never a second map typed here. The Choices tab
 * builds this once, off the one gate (`settings-choices-panel.tsx`), and
 * hands it to the shaper below so a pure function never has to ask
 * `usePermissions` a question of its own.
 *
 * `colour` AND `icon` ARE THE WHOLE MENU (client, 14 Sep 2026: "the only thing
 * that choices can have is either a color or an icon"). `colour` WAS wired to
 * `ticketTypeColour` (`web/lib/type-colours.ts`) — the one group that had one,
 * `module-settings-screen.tsx` — until the client's 17 Sep 2026 ruling ("the
 * one that gets the chip with the color is always the status … for tickets,
 * we need to find icons for the ticket type") retired it: no `ModuleSettings
 * Section` sets `colour` any more, so this slot is unwired today, kept typed
 * for the group that earns one next. `icon` is likewise unwired here — Ticket
 * type's own icon is read directly in `choiceDetailsCell` below
 * (`ticketTypeIconName`), the same shape Story type's already takes, rather
 * than through this resolver, because the Details column and not the Value
 * column is where her ruling wants it (see that function's own header). NEVER
 * BOTH on one group — a value has a colour or an icon, never two marks
 * fighting for the same slot, which is the same "one glyph, one slot" rule
 * `type-marks.ts` states for the mark this replaces. */
export type ChoiceGroupHome = {
  segment: string
  title: string
  colour?: (value: string) => string
  icon?: (value: string) => IconName | null | undefined
}

/** The system-wide Choices tab (Settings), a table over every choice value
 * this reader's own visible modules own — see `settings-choices-panel.tsx`
 * for how the rows are gathered and gated. The client's own words, 14 Sep
 * 2026: *"the value itself · module with the icon · status: active,
 * inactive, and are protected."*
 *
 * THE MODULE CELL BECAME "WHERE", K59, 21 Sep 2026 — Aurora, verbatim: "in
 * settibsg sticket: typ (bug, etc) but ineed to see that 'type'." The MODULE
 * half is unchanged (`moduleTitle`, below, still `t(home.title)`); beside it
 * now rides the FIELD a group's own values fill in (`shared/selectable-
 * where.ts`'s `selectableFieldWords`, derived off `shared/selectable-
 * homes.ts` rather than typed twice) — "Tickets: Type", not "Tickets" alone.
 * See "THE MODULE, WITH THE MODULE'S ICON" below for the cell this folds
 * into, and `settings-choices-panel.tsx`'s own header for why it is a fold
 * (R82's six-column ceiling) rather than a seventh column.
 *
 * ── THE VALUE: A COLOUR, AN ICON, OR NOTHING — NEVER THE MARK ───────────────
 *
 * The client's fifth ruling on emoji, 14 Sep 2026, and the one that finally
 * reaches this screen rather than just the write door: *"kill all the
 * emojis. I don't want to see it. The only thing that choices can have is
 * either a color or an icon. So far, only ticket types have color."* — a
 * sentence her 17 Sep 2026 ruling (this file's own header, above) narrowed
 * further: colour is the status's alone now, so "ticket types have color" is
 * no longer true anywhere this table reads. Before this, a value with no
 * colour fell back to its own `mark` — a two-letter code by convention, but
 * in LIVE data sometimes exactly the pictograph she has ruled against four
 * times already (R66, CLAUDE.md; `0088`'s migration is the data-side sweep).
 * `v.mark` is not read here AT ALL any more, by any group, for any reason —
 * not a filtered "unless it looks like an emoji", a flat refusal, because the
 * ruling is flat too ("kill ALL the emojis").
 *
 * WHAT MAY STILL DRAW BESIDE THE WORD is a COLOUR swatch, if the value's
 * group carries one (`ChoiceGroupHome.colour`, unwired today, see that
 * type's own header), an ICON, if it carries one (`ChoiceGroupHome.icon`,
 * likewise unwired), OR ONE OF THE FOUR TYPE-OWNED MARKS `choiceValueMark`
 * (below) resolves for Sprint type, Story type, Ticket type and App stage,
 * moved here from the Details column on Aurora's 22 Sep 2026 (later) ruling,
 * verbatim: *"no: the icon/color next to the value in first column! …
 * however icon color its not a detail!"* See `choiceValueMark`'s own header
 * for the full account, and why Details keeps only text now.
 * NEVER MORE THAN ONE: colour wins over a home icon, which wins over a
 * type-owned mark. A group with none of the four draws the bare word, which
 * is every group with no code-owned mark (Industry, Country, the three
 * "labels" groups, and more).
 *
 * A PLAIN STRING WHEN THERE IS NOTHING TO DRAW BESIDE THE WORD, and that is
 * a search/sort decision as much as a visual one: `record-table.tsx`'s
 * `searchKeys`/its own `ordered()` both read `String(row[key])` when a column
 * declares no `searchKey`/`sortKey` of its own, and a React element strings to
 * `"[object Object]"`. `valueText` rides beside the cell for the rows that DO
 * wear a swatch or an icon, which is what the column's own `searchKey`/
 * `sortKey` read instead.
 *
 * ── THE MODULE, WITH THE MODULE'S ICON ──────────────────────────────────────
 *
 * `CONCEPT_ICON` keyed by the segment `groupHome` already carries — the exact
 * table the Modules wall (`settings-screen.tsx`) reads for its own cards, so
 * a module wears the same glyph whether it is a card there or a cell here.
 *
 * ── STATUS IS ONE WORD: PROTECTED · ACTIVE · INACTIVE ───────────────────────
 *
 * The client's ruling, same sentence as the emoji one: *"also, the status: if
 * it's protected, it's always active. So you don't need to put active
 * protected, just protected."* Before this, `active`/`inactive` and
 * `isDefault` ("Protected") were drawn as two INDEPENDENT badges, because the
 * door genuinely let them disagree — `setSelectableDefault`
 * (workers/tenancy/src/lib/selectable.ts) used to write `is_default` with no
 * question asked about `deactivated_at`, so a value deactivated first and
 * protected second sat there reading "Inactive Protected". THAT GAP IS CLOSED
 * AT THE DOOR NOW, in the same change that added this comment: protecting a
 * value reactivates it, in one idempotent UPDATE (R17), and `0088`'s
 * migration reactivates every row already in that state. So "protected"
 * TRULY IMPLIES "active" from here on, and the display can finally say what
 * she asked for instead of working around a database that could still
 * disagree with it: ONE word, `Protected` outranking `Active`/`Inactive`
 * (never "Active Protected" — protected values are never shown inactive,
 * which is the invariant the door now keeps rather than a display choice this
 * file is making). `statusText` is the same word. `statusState` is the
 * facet's own plain field, the SAME three-way derivation the badge draws,
 * read by the toolbar's ONE Status facet (settings-choices-panel.tsx). The
 * separate Protected yes/no facet that stood beside it is GONE: it asked a
 * question Status now already answers, and keeping both would let a reader
 * filter "Active" and "Protected" as if a row could be excluded from one by
 * matching the other, which the invariant above makes impossible.
 *
 * STATUS IS BACK TO BEING ITS OWN COLUMN, 22 SEP 2026. K59, Aurora,
 * verbatim: *"ok, but keep status as its own column!"* The 21 Sep 2026
 * reading one paragraph up folded the status chip into the Value cell to
 * hold the table at R82's six-column ceiling once Added by/Added on split
 * out of one cell into two; this reading undoes exactly that fold and picks
 * Details instead — Details already reads as an honest empty cell on most
 * rows (this file's own header, "THE DETAILS COLUMN"), which is a worse
 * place to hide a fact every row carries than Status ever was. `statusText`
 * and `statusState` are unchanged, still plain fields off the same
 * derivation; the chip (`status`, `valueCell`'s own comment below) is a
 * column cell again rather than a child of `value`.
 *
 * ── THE DETAILS COLUMN — 16 SEP 2026 EVENING ────────────────────────────────
 *
 * The client's ruling, verbatim: *"regarding the fact that some Choices
 * components can have more properties, for example, meeting types have
 * department, but sprint types have duration. Why don't you add, everywhere
 * where you have Choices on the module and on the general, an in-between
 * column with details or info or whatever, and include this from each case."*
 *
 * WHAT ACTUALLY CARRIES AN EXTRA FACT, checked against the code rather than
 * assumed from her example: her own instance — a meeting type's department —
 * is NOT one of these rows at all. "Meeting type" is `meeting_purposes`
 * (`MeetingTypesPanel`, web/components/team/internal-screens.tsx), a
 * bespoke module read through `contentApi.meetingPurposes()`, not a
 * `selectable_data` type, so it never reaches `SelectableScreen` or this
 * table — its own Department column already exists there, on its own
 * screen. No `selectable_data` type carries a department today, so the
 * Details cell below has no department case: adding one would be dead code
 * for a fact nothing in this table has. What DOES carry an extra fact,
 * confirmed against `SelectableValue` and the three code-owned vocabularies
 * that enrich it (`shared/sprint-types.ts`, `shared/story-types.ts`,
 * `shared/app-stages.ts`):
 *
 *   • Sprint type — an ICON (`sprintTypeIcon`, matched by the row's own
 *     word) and a DURATION (`v.standardDays`, a real column the list door
 *     already selects — `COLUMNS` in workers/tenancy/src/lib/selectable.ts).
 *   • Story type — an ICON only (`storyTypeIconName`), no duration is ever
 *     seeded for it — `standardDays` is a generic column on every type, but
 *     only Sprint type rows are ever written with one.
 *   • App stage — a DOT TONE only (`appStageDotTone`), the same tone
 *     `apps-screen.tsx`'s own stage pill already draws.
 *   • Ticket type — an ICON only (`ticketTypeIconName`, @shared/ticket-types),
 *     added 17 Sep 2026 the same day the colour it replaces was retired from
 *     the VALUE cell above: the client's ruling names icons for ticket type
 *     and colour for status, and this is where Story type's identical
 *     ICON-only case already lives, so Ticket type takes the same seat next
 *     to it rather than a bespoke one in the Value column.
 *   • Every other type (Department, Industry, Country, Brand asset
 *     category, Deliverable kind, and the three "labels" groups) carries
 *     nothing beyond its word — an honest empty cell, no dash, no hint
 *     (R81's own rule, read here for a table cell rather than a form).
 *
 * DETAILS STOPPED BEING ITS OWN COLUMN ON 22 SEP 2026 (MORNING), the same
 * reading that restored Status above (this file's own header, "STATUS IS
 * BACK TO BEING ITS OWN COLUMN"): the cell this function built was
 * unchanged that round, only where it rendered moved, onto the Value cell's
 * own second line.
 *
 * THAT FOLD DID NOT SURVIVE THE DAY EITHER. Aurora, later the same day,
 * verbatim: *"no: the icon/color next to the value in first column! details
 * is the next column (however icon color its not a detail!) make status the
 * second column, the rest ok."* Two corrections in one sentence: what the
 * second line under Value had been showing for three of the four cases above
 * (Sprint type's glyph, Story type's glyph, Ticket type's glyph, App stage's
 * dot) was never a DETAIL, it was a MARK, the same kind of thing
 * `ChoiceGroupHome.colour`/`.icon` already draw beside a value's own name,
 * so it moves there now (`choiceValueMark`, just below this function), and
 * Details returns as its own column, third (after Status), holding only what
 * is left once the mark is gone: Sprint type's own day-count `Badge` and
 * nothing else, since Story type, Ticket type and App stage had no text
 * beyond the mark that just moved out. */
/** THE VALUE'S OWN MARK: an icon or a colour drawn BESIDE the value, never a
 * second line beneath it (Aurora, 22 Sep 2026 (later); this file's own
 * header above has her verbatim ruling, and `choiceDetailsCell`'s own header
 * a few lines down has the accounting for what stayed behind). `ChoiceGroupHome
 * .colour`/`.icon` (unwired today) win first, unchanged from before this
 * change; failing those, the same four type-owned marks `choiceDetailsCell`
 * used to draw as a "detail" read here instead: Sprint type and Story type
 * and Ticket type's own icon (`sprintTypeIcon`/`storyTypeIconName`/
 * `ticketTypeIconName`), and App stage's own dot tone.
 *
 * NEVER A `Badge`: a coloured tone beside a value is a `Swatch`, the same
 * mark `ChoiceGroupHome.colour` already draws, so R86 ("the one coloured
 * chip is the record's status") never sees a second coloured CHIP on this
 * row. App stage's tone used to be a `Badge variant="status" dot={…}>
 * {v.value}</Badge>`, repeating the value's own word as its label to satisfy
 * the kit's "a dot never renders without one" rule (ruling 04); that label is
 * unnecessary here because the mark now sits beside that SAME text already,
 * so a plain `Swatch` reading the tone's own CSS custom property
 * (`var(--dot-<tone>)`, the identical token `badge.tsx`'s own `DOT_FILL`
 * resolves) is both simpler and the honest "mark, not chip" answer. */
function choiceValueMark(v: SelectableValue, home: ChoiceGroupHome | undefined): React.ReactNode {
  const colour = home?.colour?.(v.value)
  if (colour) return <Swatch colour={colour} />
  const homeIcon = home?.icon?.(v.value)
  if (homeIcon) return <Icon name={homeIcon} className="text-muted-foreground size-4 shrink-0" />
  if (v.type === PHASE_TYPE_GROUP) {
    return phaseTypeIcon(v.value) !== "" ? (
      <SprintTypeGlyph type={v.value} size={14} className="text-muted-foreground shrink-0" />
    ) : null
  }
  if (v.type === "Story type") {
    const iconName = storyTypeIconName(v.value)
    return iconName ? <Icon name={iconName} className="text-muted-foreground size-4 shrink-0" /> : null
  }
  if (v.type === TICKET_TYPE_GROUP) {
    const iconName = ticketTypeIconName(v.value)
    return iconName ? <Icon name={iconName} className="text-muted-foreground size-4 shrink-0" /> : null
  }
  if (v.type === SELECTABLE_GROUPS.appStage) {
    // NAMED `stageTone`, NOT THE GENERIC `tone`. R86's own census
    // (`web/test/status-owns-the-chip.test.ts`) reads a `<Swatch colour={…}>`
    // expression's resolved TEXT for "status"/"stage"/"waiting" before it
    // will pass a coloured mark with no exemption; a template literal
    // resolves to nobody's identifier (`rootIdentifierName` gives up on a
    // `TemplateExpression`), so what the census actually reads here is this
    // literal's own source text, `${stageTone}` embedded in it, the same
    // "resolved through a local const" shape that census's own doc already
    // approves for `appStageDotTone(v.value)` READ AS TEXT, one step wider.
    const stageTone = appStageDotTone(v.value)
    return stageTone ? <Swatch colour={`var(--dot-${stageTone})`} /> : null
  }
  return null
}

/** THE REMAINING DETAIL: text only, never an icon or a colour (see
 * `choiceValueMark`'s own header, just above: the mark moved there on
 * Aurora's 22 Sep 2026 (later) ruling). The only group left with something
 * to say here is Sprint type's own duration, a plain `Badge
 * variant="secondary"`, a quiet count chip rather than a status colour, so
 * R86 does not reach it either. Every other group `choiceValueMark` draws a
 * mark for (Story type, Ticket type, App stage) had NOTHING beyond that
 * mark, so their Details cell is now an honest empty one, the same
 * "carries nothing" answer R81 gives elsewhere. */
function choiceDetailsCell(v: SelectableValue, t: ReturnType<typeof translator>): React.ReactNode {
  if (v.type === PHASE_TYPE_GROUP) {
    const days = v.standardDays
    if (days === null) return null
    return (
      <Badge variant="secondary" className="shrink-0">
        {t("{days} days", { days })}
      </Badge>
    )
  }
  return null
}

/** ONE GROUP'S FIELD WORD, FOR A CELL THAT MUST NEVER THROW — `selectable
 * FieldWords` (shared/selectable-where.ts) refuses a group `shared/selectable-
 * homes.ts` does not name at all, which is right for a build-time completeness
 * proof (`workers/tenancy/test/selectable-where.test.ts`) and wrong for a
 * render: a stray or historical group should draw a Where cell with no field
 * half, never take the whole table down with it. */
function choiceFieldWord(type: string): string | null {
  try {
    return selectableFieldWords(type)?.[0] ?? null
  } catch {
    return null
  }
}

export function shapeChoicesTable(
  values: SelectableValue[],
  groupHome: Map<string, ChoiceGroupHome>,
  lang: Language
): ScreenData {
  const t = translator(lang)
  return {
    rows: values.map((v) => {
      const home = groupHome.get(v.type)
      const segment = home?.segment ?? ""
      const moduleTitle = home ? t(home.title) : v.type
      // ── WHERE — K59, documents/UI-RULEBOOK.md, Aurora, 21 Sep 2026 ─────────
      // "everywhere where i edit choices we need to add a c[o]lumn as for
      // where is th[a]t choice[]! for exmaple in settibsg s[t]icket: typ[e]
      // (bug, etc) but i[n]eed to see that 'type'." The record half is the
      // settings page's own title (`moduleTitle`, above, the one this cell
      // used to draw ALONE, in the retired "Module" column); the field half
      // is `shared/selectable-where.ts`'s own answer, derived from `shared/
      // selectable-homes.ts` rather than typed here. FOLDS the old Module
      // column into this one (R82's six-column ceiling, see settings-
      // choices-panel.tsx's own header for the accounting) rather than
      // adding a seventh: the Module FACET stays, reading `moduleSegment`
      // below unchanged, but the Module CELL does not survive as its own
      // column now that this one says strictly more.
      const fieldWord = choiceFieldWord(v.type)
      const whereText = fieldWord ? `${moduleTitle}: ${t(fieldWord)}` : moduleTitle
      // PROTECTED OUTRANKS ACTIVE/INACTIVE, see this function's own header.
      // The invariant the door and 0088's migration now keep is what makes
      // this a safe simplification rather than a display choice papering over
      // a database that could still disagree: a protected row is never
      // inactive, so there is no case this ordering hides.
      const statusWord = v.isDefault ? t("Protected") : v.active ? t("Active") : t("Inactive")
      // THE DETAILS CELL, text only, its own column again (third, after
      // Status). See `choiceDetailsCell`'s own header for what is left in it
      // now that the icon/dot marks moved to the Value cell.
      const detailsNode = choiceDetailsCell(v, t)
      // THE VALUE CELL, the mark (`choiceValueMark`, above `choiceDetailsCell`)
      // and the name, ONE LINE, `REF_LEADS_NAME` (the shrink-0-mark-in-front-
      // of-a-truncating-name class every other leading mark in this app
      // already uses). NO SECOND LINE any more, Aurora, 22 Sep 2026 (later),
      // verbatim, this file's own header: "no: the icon/color next to the
      // value in first column!"
      const valueCell = (
        <span className={REF_LEADS_NAME}>
          {choiceValueMark(v, home)}
          <span className="min-w-0 truncate">{v.value}</span>
        </span>
      )
      // ADDED, creator's face and the date, SPLIT AGAIN — Aurora, 23 Sep
      // 2026, verbatim: "split added on and by in 2 separate columns." The
      // single "who over when" cell (this function's own history: split
      // 21 Sep evening, folded back together 22 Sep once Details reclaimed
      // its own seat and the fold was the only way to hold R82's six-column
      // ceiling — documents/UI-RULEBOOK.md's K59 has the full back and
      // forth) is two cells again, in the order she wrote them: Added on
      // first, then Added by. THIS RE-OPENS THE SEVENTH COLUMN R82 EXISTS TO
      // CATCH, and this time nothing here is a candidate to fold back into —
      // her ruling names the two columns outright, so `settings-choices-
      // panel.tsx`'s own unscoped column list is named in
      // `TABLE_COLUMN_BUDGET_EXEMPT` (shared/rules/registry.ts) instead,
      // R82's own sanctioned way out, a reasoned line rather than a silent
      // breach.
      // R54: a dropdown value is written only by staff (every write door on
      // `selectable_data` refuses a portal caller, R21), so
      // `staffNameFromSnapshot` is unconditional here the way it is for every
      // OTHER staff-only record's created-by name.
      const addedByName = staffNameFromSnapshot(v.createdByName) || v.createdByName || ""
      // THE RAW VALUE FIRST, THE SHAPED STRING OFF IT, never a formatter call
      // inline in the row object (`sorted-columns-declare-their-type.test.ts`'s
      // own census reads a literal `key: formatDate(...)` line as a column that
      // needs its own `sortType` declared where it lives, this table's own
      // sort lives in the TOOLBAR now (settings-choices-panel.tsx's
      // `sortOptions`), reading `createdAtRaw` below directly, never this
      // formatted string). The SAME `formatDate` every other date cell in
      // this file reads (`shapeMembersList`'s "joined …", `shapeMeetingsList`'s
      // `when`) — no new format invented for this column.
      const addedOn = v.createdAt ? formatDate(v.createdAt, lang) : ""
      return {
        id: v.id,
        value: valueCell,
        valueText: v.value,
        where: (
          <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
            <Icon
              name={CONCEPT_ICON[segment as keyof typeof CONCEPT_ICON] ?? CONCEPT_ICON.settings}
              className="text-muted-foreground size-4 shrink-0"
            />
            <span className="min-w-0 truncate">{whereText}</span>
          </span>
        ),
        whereText,
        // THE MODULE FACET'S OWN PLAIN FIELD, UNCHANGED. A filter reads
        // `row[field]` for an exact match (`evaluateRules`, shared/web/
        // screen-engine/config.ts), so it cannot share a key with a node
        // column any more than search or sort can. The Module COLUMN folded
        // into `where` above; the Module FACET still reads this.
        moduleSegment: segment,
        // THE WHERE FACET'S OWN PLAIN FIELD, the field word alone ("Type",
        // "Status", …), so a reader can narrow to every group that fills the
        // same kind of field across every module at once.
        whereField: fieldWord ?? "",
        // THE STATUS CELL, ITS OWN COLUMN, SECOND SEAT NOW. K59, Aurora,
        // 22 Sep 2026, verbatim: "ok, but keep status as its own column!"
        // (morning) then "make status the second column, the rest ok."
        // (later). Same word, same D17 dot this cell has drawn all along
        // (see the AMENDED 17 Sep 2026 note one screen up in this file's
        // history). Inline, never a variable read back in,
        // `web/test/ticket-list-face-and-status.test.ts`'s own census reads
        // THIS property's own text for `<Badge … dot=`, the same reason
        // `shapeAccountsList`'s own `status` cell, one screen up in this
        // file, writes its Badge inline rather than through a named
        // constant.
        status: (
          <Badge variant="status" dot={AUTOMATION_STATUS_DOT[v.isDefault ? "protected" : v.active ? "on" : "off"]}>
            {statusWord}
          </Badge>
        ),
        statusText: statusWord,
        // THE FACET'S OWN PLAIN FIELD, SAME THREE-WAY DERIVATION AS THE CHIP
        // ABOVE. One flag pair read once, not a second source of truth. See
        // this function's own header for why Protected is no longer a
        // separate facet beside this one.
        statusState: v.isDefault ? "protected" : v.active ? "active" : "inactive",
        // THE DETAILS FACT, ITS OWN COLUMN AGAIN, see this function's own
        // header and `choiceDetailsCell`'s own doc. `null` for every type
        // Details has nothing left to say about, now that the icon/dot marks
        // moved to Value.
        details: detailsNode,
        // ADDED ON, its own column now, first (she wrote "added on and by",
        // in that order). Plain formatted text, the same `formatDate` every
        // other date cell in this file draws, and the same `""` fallback
        // every other plain-text fact on this row already uses for "nothing
        // recorded" (`whereField`, two lines up) — never a dash, never a
        // placeholder word, the "carries nothing" answer R81 already gives
        // Details a few lines up. INDEPENDENT OF THE PERSON NOW: the old
        // coupled cell gated the date on `addedByName` too, so a seeded
        // value with a `createdAt` and no `createdByName` — most of a team's
        // vocabulary, seeded rather than typed in by hand — showed nothing
        // at all. Split, this cell answers only for its own fact.
        addedOn,
        // ADDED BY, second. THE PERSON, DRAWN THE WAY THIS TABLE'S OWN
        // NEIGHBOURS DRAW ONE (R35/R90): `shapeAccountsList`'s `manager`
        // cell and `shapeMeetingsList`'s `attendeesCell`, one screen either
        // side of this function, are both `<RecordMark … shape="round"
        // size="choice" />` beside the name in a `flex items-center gap-2`
        // span — the SAME shape, read here rather than invented. `shape=
        // "round"` because this is a PERSON, not a company/account square
        // (R60's own account-mark note, `shapeAccountsList` above, draws the
        // opposite shape on purpose for that reason); `size="choice"`, the
        // kit's smallest, is what a single table-row text line already needs
        // without stretching the row taller (client ruling, 18 Sep 2026,
        // quoted throughout this file). No second line under the name any
        // more — the date moved to its own column — so this cell is one
        // line, mark then name, same as `manager`'s. `SelectableValue`
        // carries no picture (R90's own "no photo field yet" shape, the same
        // gap the work-logs panel's own Logged-by filter carries), so
        // `RecordMark` draws the initials tile alone off the name. `null`,
        // never a blank avatar over an empty name, for a value with no
        // recorded creator — the same seeded-vocabulary case `addedOn`'s own
        // note above describes, now independently honest here too.
        addedBy: addedByName ? (
          <span className="flex min-w-0 items-center gap-2">
            <RecordMark name={addedByName} shape="round" size="choice" />
            <span className="min-w-0 truncate">{addedByName}</span>
          </span>
        ) : null,
        addedByText: addedByName,
        // THE SORT'S OWN RAW VALUE, the RAW ISO instant, read by the
        // toolbar's own "Added on" `SortOption` (settings-choices-panel.tsx),
        // never the shaped `addedOn` string above
        // (`sorted-columns-declare-their-type.test.ts`'s own law: a sortable
        // date compares the fact, never the words shaped for a reader).
        createdAtRaw: v.createdAt,
      }
    }),
  }
}
