import type {
  Account,
  ActivityItem,
  HelpTicket,
  Invite,
  InviteAudit,
  Meeting,
  TeamMember,
  TeamRole,
} from "@shared/types"
import { describe, expect, it } from "vitest"
import React from "react"

import type { SelectableValue } from "@shared/types"
import {
  HELP_STATUS,
  INVITE_STATUS,
  shapeAccountsList,
  shapeActivity,
  shapeChoicesTable,
  shapeContactsTable,
  shapeHelpList,
  shapeInviteDetail,
  shapeInvitesList,
  shapeMeetingsList,
  shapeMembersList,
  shapeRolesList,
  type ChoiceGroupHome,
} from "@/components/deep-link/shape"

/* ------------------------------ fixtures ------------------------------ */

const member: TeamMember = {
  userId: "u1",
  email: "alaap@x.com",
  firstName: "Alaap",
  lastName: "Kanchwala",
  imageUrl: null,
  roleId: "r1",
  roleTitle: "Admin",
  isYou: true,
  isAdmin: true,
  isClient: false,
  joinedAt: "2026-06-13T10:00:00.000Z",
  createdByName: null,
  updatedAt: null,
}

const role: TeamRole = {
  id: "r1",
  title: "Editor",
  description: null,
  isDefault: false,
  memberCount: 1,
  active: true,
}

const invite: Invite = {
  id: "i1",
  email: "guest@x.com",
  roleId: "r1",
  roleTitle: "Editor",
  status: "pending",
  createdAt: "2026-06-13T10:00:00.000Z",
  expiresAt: "2026-06-20T10:00:00.000Z",
}

const audit: InviteAudit = {
  inviterName: "Alaap Kanchwala",
  inviterEmail: "alaap@x.com",
  inviterImageUrl: null,
  inviteeHasAccount: false,
  accepted: false,
  acceptedAt: null,
  shelfLifeHours: 168,
}

const ticket: HelpTicket = {
  id: "h1",
  helpType: "Bug",
  // WHAT IT ARRIVED AS — stamped at creation and never updated (team migration
  // 0065). Different from `helpType` above on purpose: this fixture is a ticket
  // somebody raised as a question and triage recorded as a bug, which is the
  // only state of the pair worth pinning in a shape test.
  raisedAsType: "Question",
  description: "The invite button is greyed out and I can't add anyone to the team at all.",
  screenRecordingLink: null,
  sourceScreen: "members",
  status: "in_progress",
  resolved: false,
  resolvedAt: null,
  moduleId: "m1",
  moduleName: "Settings",
  moduleMark: "⚙️",
  // Our unsent working text. Present on a STAFF read (this one) and always null
  // to a client login — lib/help.ts toTicket.
  draftResolution: null,
  // The two numbers a client is shown about the work on their request — and the
  // only two.
  storyCount: 0,
  doneStoryCount: 0,
  raiserId: "u1",
  raiserName: "Alaap",
  editorName: null,
  resolverId: null,
  resolverName: null,
  // Which system it is about and who asked (CHECKLIST 5.8 + 5.9). The agency's
  // own question is about no app and was asked by nobody outside the building,
  // so both are null here — which is the case the row shape has to survive.
  appId: null,
  appName: null,
  appLogo: null,
  raisedByContactId: null,
  raisedByContactName: null,
  // Nobody has claimed this one and it has no app to inherit from either.
  assigneeId: null,
  assigneeName: null,
  appAssigneeId: null,
  // Only a ticket that WAITED ever carries one, and this one never did.
  validatedAt: null,
  createdAt: "2026-06-13T10:00:00.000Z",
  updatedAt: null,
  // The agency's own question belongs to no client, so it names no account —
  // and with no account there is no short code to build a reference out of.
  accountId: null,
  ref: null,
  rank: "M",
  lockedAt: "2026-06-13T10:05:00.000Z",
  archivedAt: null,
  titleDe: null,
  titleEn: null,
  // R54: staff-raised and staff-edited, which is the majority case — staff raise
  // a client's questions for them (SCOPE ch.07). Both false means both names are
  // shown by first name alone.
  raiserIsClient: false,
  editorIsClient: false,
}

const activity: ActivityItem[] = [
  {
    id: "a1",
    type: "Member role changed",
    description: "Alaap changed Bo's role to Editor",
    actorName: "Alaap",
    // R54: staff, so the screen shows the first name alone. A contact who acted
    // through the portal lands in this same feed and is named in full.
    actorIsClient: false,
    // R35/R60: a stored picture on file for this actor.
    actorPicture: "https://cdn.example.com/alaap.jpg",
    createdAt: "2026-06-14T09:00:00.000Z",
    // The row says WHICH KIND of thing happened and WHICH DOOR it came through.
    // Both are nullable on the type because rows written before the columns
    // landed answer null — a fixture that omitted them would be asserting a
    // shape the door cannot actually produce.
    verb: "edited",
    origin: "web",
  },
]

/* ------------------------------- tests -------------------------------- */

describe("INVITE_STATUS", () => {
  it("maps every invite state to a display label", () => {
    expect(INVITE_STATUS).toMatchObject({
      pending: "Pending",
      accepted: "Accepted",
      revoked: "Revoked",
      expired: "Expired",
    })
  })
})

describe("shapeActivity", () => {
  it("maps each item to { id, description, actor, initials, timestamp }", () => {
    const [row] = shapeActivity(activity, "en")
    expect(row.id).toBe("a1")
    expect(row.description).toBe("Alaap changed Bo's role to Editor")
    expect(row.actor).toBe("Alaap")
    expect(row).toHaveProperty("timestamp")
  })

  // UNDEFINED, NOT "". R54's trim runs through `staffNameFromSnapshot`, which
  // answers "" for a row with no actor, and `?? undefined` let that empty string
  // straight through — `??` catches null and undefined and an empty string is
  // neither. It has to be `|| undefined`, and the difference is not cosmetic:
  // the kit draws this field as `aria-label={item.actor}` on the avatar fallback
  // (shared/ui/components/activity-feed/activity-feed.tsx), and an EMPTY
  // aria-label is not an absent one — it overrides the initials underneath it
  // with nothing, so a screen reader meets an unnamed element where it would
  // otherwise have read the "?" mark the case below asserts.
  it("leaves actor undefined when actorName is null", () => {
    const [row] = shapeActivity([{ ...activity[0], actorName: null }], "en")
    expect(row.actor).toBeUndefined()
    // Not "" — see above. Asserted separately because `toBeUndefined` is the
    // one thing an empty string would also satisfy if this ever became a
    // truthiness check.
    expect(row.actor).not.toBe("")
  })

  it("leaves actor undefined for a blank actor snapshot too", () => {
    // A system write can store "" rather than null, and the trim answers "" for
    // both. The same empty aria-label, reached by the other road.
    const [row] = shapeActivity([{ ...activity[0], actorName: "   " }], "en")
    expect(row.actor).toBeUndefined()
  })

  // The recipe engine's OWN activity feed (Team, Team member, Invite — the
  // `{ kind: "activity" }` block in screen-renderer.tsx) draws through this
  // shaper rather than `useRecordActivity`, so it needs the same avatar mark
  // the bespoke `RecordScreen` path already carries — a row here with no
  // `initials` is exactly the second, easy-to-miss avatar surface this app has.
  it("carries the same nameInitials mark the bespoke activity path uses", () => {
    const [row] = shapeActivity(activity, "en")
    expect(row.initials).toBe("A")
  })

  it("still marks the row with a fallback initial when actorName is null", () => {
    const [row] = shapeActivity([{ ...activity[0], actorName: null }], "en")
    expect(row.initials).toBe("?")
  })

  // R35/R60, client ruling: "make sure that in the footer for the activity, we
  // see the avatars of the people ... right now it only shows the initials."
  // Same surface as the `initials` case above — a second, easy-to-miss place
  // the fix has to land, because this shaper feeds the recipe engine's own
  // Team / Team member / Invite rails, not just the bespoke record path.
  it("carries the actor's stored picture through, safe-checked", () => {
    const [row] = shapeActivity(activity, "en")
    expect(row.avatarSrc).toBe("https://cdn.example.com/alaap.jpg")
  })

  it("leaves avatarSrc undefined when the actor has no picture on file", () => {
    const [row] = shapeActivity([{ ...activity[0], actorPicture: null }], "en")
    expect(row.avatarSrc).toBeUndefined()
  })

  // `safeSrc` refuses a scheme it does not allow (rich-text.test.ts owns the
  // full list) — asserted here so a row can never hand the kit's `<img>` a
  // `javascript:` URL because the worker's own value was untrusted.
  it("drops a picture URL safeSrc refuses", () => {
    const [row] = shapeActivity([{ ...activity[0], actorPicture: "javascript:alert(1)" }], "en")
    expect(row.avatarSrc).toBeUndefined()
  })
})

describe("shapeMembersList", () => {
  it("maps userId→id, name via personName, and a 'role · joined …' detail", () => {
    const { rows } = shapeMembersList([member], "en")
    expect(rows?.[0].id).toBe("u1")
    // R54 — the member list is our own people, and `personName` reads
    // `first_name` straight off the structured pair, so this is the EXACT trim.
    expect(rows?.[0].name).toBe("Alaap")
    expect(String(rows?.[0].detail)).toContain("Admin")
    expect(String(rows?.[0].detail)).toContain("joined")
  })
})

describe("shapeRolesList", () => {
  it('adds the "(inactive)" suffix when !active', () => {
    const { rows } = shapeRolesList([{ ...role, active: false }])
    expect(rows?.[0].name).toBe("Editor (inactive)")
  })

  it("keeps the plain title when active", () => {
    const { rows } = shapeRolesList([role])
    expect(rows?.[0].name).toBe("Editor")
  })

  it('falls back to a "N members" detail when there is no description', () => {
    expect(shapeRolesList([{ ...role, memberCount: 1 }]).rows?.[0].detail).toBe("1 member")
    expect(shapeRolesList([{ ...role, memberCount: 3 }]).rows?.[0].detail).toBe("3 members")
  })

  it("uses the description for the detail when present", () => {
    const { rows } = shapeRolesList([{ ...role, description: "Can edit content" }])
    expect(rows?.[0].detail).toBe("Can edit content")
  })
})

describe("shapeInvitesList", () => {
  it("puts the email + an INVITE_STATUS value in the detail", () => {
    const { rows } = shapeInvitesList([invite])
    expect(rows?.[0].email).toBe("guest@x.com")
    expect(String(rows?.[0].detail)).toContain("Editor")
    expect(String(rows?.[0].detail)).toContain(INVITE_STATUS.pending)
  })
})

describe("HELP_STATUS", () => {
  it("maps every status (underscore form) to a friendly label", () => {
    expect(HELP_STATUS).toMatchObject({
      new: "New",
      triaged: "Triaged",
      in_progress: "In progress",
      ready: "Ready",
      resolved: "Resolved",
    })
  })
})

describe("shapeHelpList", () => {
  // K1 / CHECKLIST 11.9: the title alone, then ONE line of two facts. The
  // reference used to be prefixed into the name and the line used to carry four
  // things; both are what made a page of tickets read as a wall of text.
  it("maps id, a truncated description→name, and a 'status · type' detail", () => {
    const { rows } = shapeHelpList([ticket])
    expect(rows?.[0].id).toBe("h1")
    expect(String(rows?.[0].name).length).toBeLessThanOrEqual(80)
    expect(rows?.[0].name).not.toContain(ticket.ref as string)
    expect(rows?.[0].detail).toBe(`${HELP_STATUS.in_progress} · Bug`)
  })

  it("ends a long description with an ellipsis", () => {
    const long = { ...ticket, description: "x".repeat(200) }
    expect(String(shapeHelpList([long]).rows?.[0].name).endsWith("…")).toBe(true)
  })

  // The untyped fallback is "General" — the SAME word the ticket detail's
  // Overview prints, so a ticket with no type doesn't read as two things. It used
  // to say "Help", which was the section's old name doing duty as a type.
  it('falls back the type to "General" when helpType is null', () => {
    const { rows } = shapeHelpList([{ ...ticket, helpType: null }])
    expect(String(rows?.[0].detail).endsWith(" · General")).toBe(true)
  })
})

describe("shapeInviteDetail", () => {
  it("shapes the record + uses INVITE_STATUS for status", () => {
    const data = shapeInviteDetail(invite, audit, activity, "en")
    expect(data.record?.id).toBe("i1")
    expect(data.record?.email).toBe("guest@x.com")
    expect(data.record?.status).toBe(INVITE_STATUS.pending)
    // R54 through the SNAPSHOT path — `audit.inviterName` is the frozen
    // "First Last" the invite stored, so `staffNameFromSnapshot` takes the
    // first token. Whoever sent an invite is one of ours by construction.
    expect(data.record?.invitedBy).toBe("Alaap")
    expect(data.sets?.activity?.[0].id).toBe("a1")
  })

  it('shows accepted as "" when the invite was not accepted', () => {
    const data = shapeInviteDetail(invite, audit, activity, "en")
    expect(data.record?.accepted).toBe("")
  })

  it('falls back invitedBy to "" when there is no audit', () => {
    const data = shapeInviteDetail(invite, null, activity, "en")
    expect(data.record?.invitedBy).toBe("")
    expect(data.record?.accepted).toBe("")
  })
})

/* `shapeTeamDetail`'s suite went with the shaper and the screen it fed — the
 * team overview, deleted on the client's 2026-09-09 ruling. web/lib/pages.ts
 * carries the decision and where `/t/<teamId>` lands now. */

/* ------------------------------- accounts ------------------------------- */

const account = (over: Partial<Account> & { id: string; name: string }): Account => ({
  accountType: "entity",
  parentAccountId: null,
  email: null,
  phone: null,
  street: null,
  postalCode: null,
  city: null,
  country: null,
  industry: null,
  about: null,
  logoUrl: null,
  coverUrl: null,
  code: null,
  currency: null,
  locale: null,
  timezone: null,
  commercialsVisible: false,
  altNames: [],
  nameNarrowsAlone: "unreviewed",
  accountManagerId: null,
  active: true,
  ...over,
})

describe("shapeAccountsList", () => {
  // K1: three facts at most. The reference CODE left the line on 17 Aug 2026 —
  // it is a lookup key, not something anybody scans a list for — and it leads
  // the eyebrow on the account's own screen instead.
  it("says what a row IS on one line — its kind, never the code and never a status", () => {
    const rows = shapeAccountsList([
      account({ id: "a1", name: "Bergman S.A.", code: "BERG" }),
    ]).rows
    // Client ruling 2026-09-15: name is a React element with logo and text
    expect(rows?.[0].nameText).toBe("Bergman S.A.")
    expect(React.isValidElement(rows?.[0].name)).toBe(true)
    // NO STATUS (0042). Whether an account is live is the archive flag, and the
    // NAME carries that as "(archived)" — so a live account says nothing about
    // its state, which is the honest thing for a fact true of almost every row.
    expect(rows?.[0].detail).toBe("Company")
    // …AND NOTHING ELSE THE SCREEN DOES NOT DRAW. The row used to carry `type` /
    // `status` / `archived` for the frame's own filter bar to sieve — which on a
    // PAGED collection narrowed the loaded fifty. Those three are the DOOR's
    // filters now (web/lib/collection-filters.ts), so a shaped row is what the
    // screen shows and no longer half a filter index nothing reads.
    //
    // `mark` is the fourth and it IS drawn: the recipe names it as the row's
    // leading column (library v0.11.0), and it holds a NODE rather than a URL —
    // the slot renders whatever the column carries, so a bare `logoUrl` here
    // would print the path in the box.
    //
    // `manager` is the fifth (0091, client ruling 14 Sep 2026) and, since the
    // gallery/table pass this same day, it IS drawn — the account manager's
    // avatar chip on the card wall and the table's own column.
    //
    // `country` and `status` are the sixth and seventh, added the same day for
    // the table's own Country and Status columns (client ruling: "in the table
    // columns: name status, account manager, country"). `status` is the
    // archive flag worded — there is no separate `status` column on an account
    // (0042) — and `logoUrl` is the eighth, the raw picture the gallery's own
    // bigger card face reads (`mark` above is sized for a list row).
    expect(Object.keys(rows?.[0] ?? {}).sort()).toEqual([
      "country",
      "detail",
      "id",
      "logoUrl",
      "manager",
      "mark",
      "name",
      "nameText",
      "status",
    ])
    expect(rows?.[0].mark, "the leading column must hold a node, not a string").toBeTypeOf("object")
    expect(rows?.[0].manager, "nobody assigned yet is a real, honest answer").toBeNull()
    expect(rows?.[0].country, "no country typed yet is a real, honest answer").toBe("")
    expect(rows?.[0].status, "the archive flag, worded, is a node — a coloured badge").toBeTypeOf("object")
  })

  it("names the parent when it is on the page, and still says nested when it isn't", () => {
    const rows = shapeAccountsList([
      account({ id: "a1", name: "Bergman S.A." }),
      account({ id: "a2", name: "Bergman Workshop", parentAccountId: "a1" }),
      // Its parent sits on a later page — the line must not imply top level.
      account({ id: "a3", name: "Delaval Nord", parentAccountId: "off-page" }),
    ]).rows
    expect(rows?.[0].detail).not.toContain("under")
    expect(rows?.[1].detail).toContain("under Bergman S.A.")
    expect(rows?.[2].detail).toContain("under another account")
  })

  it("drops the parent from the line when a heading already names it", () => {
    // `sayParent=false` is for a caller that already groups rows under a
    // heading naming the parent, so every row saying "under Bergman S.A."
    // would spend a third of a three-fact line on the fact the reader is
    // looking AT. (The one caller this was written for, contacts-by-company.tsx,
    // was deleted 14 Sep 2026 as unreached dead code — this test keeps the
    // shape covered on its own.)
    const rows = shapeAccountsList(
      [
        account({ id: "a1", name: "Bergman S.A." }),
        account({ id: "a2", name: "Marta Bergman", accountType: "individual", parentAccountId: "a1" }),
      ],
      false
    ).rows
    expect(rows?.[1].detail).not.toContain("under")
    // …and the rest of the line is untouched, so this is a subtraction and not a
    // second shaper.
    expect(rows?.[1].detail).toContain("Person")
  })

  it("keeps an archived account visible, and flags it (archive-never-delete)", () => {
    const rows = shapeAccountsList([account({ id: "a1", name: "Old Co", active: false })]).rows
    // The row SAYS so in its name — which is what a person reads. "Only the
    // archived ones" is a question for the door (`archived=yes`), asked from the
    // find bar, and web/test/facets-ask-the-door.test.tsx is where that lives.
    // Client ruling 2026-09-15: name is a React element with logo and text
    expect(rows?.[0].nameText).toBe("Old Co (archived)")
    expect(React.isValidElement(rows?.[0].name)).toBe(true)
  })
})

describe("shapeContactsTable", () => {
  // R35, client ruling 2026-09-15: "add the logos to account and app …
  // identify everywhere else where it makes sense" — the Contacts table's
  // own "Account" column (contacts-screen.tsx's `CONTACT_COLUMNS` reads
  // `accountCell`). Pinned as a SEPARATE row key from `account`: that key
  // stays plain text for `CollectionFrame`'s own free-text search
  // (`searchKeys`), and a React node there would be "[object Object]".
  it("gives the Account column its own face, and keeps `account` plain text for search", () => {
    const rows = shapeContactsTable([
      account({
        id: "p1",
        name: "Marta Ruiz",
        accountType: "individual",
        companyName: "Bergman Marine",
        companyLogoUrl: "/media/bergman-marine.png",
      }),
    ]).rows
    expect(rows?.[0].account, "search must never see a node").toBe("Bergman Marine")
    expect(typeof rows?.[0].account).toBe("string")
    expect(
      React.isValidElement(rows?.[0].accountCell),
      "the Account column must hold a node (mark + name), not a bare string"
    ).toBe(true)
  })

  // AN UNLINKED CONTACT NAMES NO COMPANY — an ordinary absence (22 of 110 real
  // contacts), so the row draws nothing at all rather than an em dash or an
  // empty-name tile (no placeholder character, per the no-em-dash law: R95).
  it("an unlinked contact draws nothing, not an empty mark", () => {
    const rows = shapeContactsTable([
      account({ id: "p1", name: "Luis Vera", accountType: "individual" }),
    ]).rows
    expect(rows?.[0].account).toBe("")
    expect(rows?.[0].accountCell).toBeNull()
  })
})

/* -------------------------------- meetings ------------------------------- */

const meeting = (over: Partial<Meeting> & { id: string; title: string }): Meeting => ({
  ref: null,
  accountId: null,
  accountName: null,
  accountLogoUrl: null,
  appId: null,
  appName: null,
  purposeId: null,
  purposeName: null,
  purposeIcon: null,
  agenda: null,
  notes: null,
  location: null,
  startsAt: "2026-09-10T09:00:00.000Z",
  endsAt: null,
  googleEventId: null,
  googleEventUrl: null,
  googleJoinUrl: null,
  googleOrganizer: null,
  googleStatus: null,
  googleTimeZone: null,
  googleRecurrence: null,
  googleGuests: [],
  googleAttachments: [],
  googleSyncedAt: null,
  fromCalendar: false,
  transcriptFileId: null,
  transcriptCapturedAt: null,
  transcriptUrl: null,
  transcriptFoundBy: null,
  knowledgeIndexedAt: null,
  recurringEventId: null,
  active: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  creatorName: null,
  updatedAt: null,
  editorName: null,
  ...over,
})

describe("shapeMeetingsList", () => {
  // R35, client ruling 2026-09-15: "add the logos to account and app …
  // identify everywhere else where it makes sense" — the meetings Table's own
  // "Account" column (meetings-screen.tsx's TABLE_COLUMNS reads
  // `accountCell`). Pinned as a SEPARATE row key from `client`: the calendar
  // view reads `client` as `String(row.client ?? "")`
  // (`MeetingsMonthCalendar`), and a React node there would print
  // "[object Object]" — so `client` must stay plain text forever, and
  // `accountCell` is the node that carries the logo.
  it("gives the Table's Account column its own face, and keeps `client` plain text for the calendar", () => {
    const rows = shapeMeetingsList(
      [meeting({ id: "m1", title: "Kickoff", accountName: "Bergman S.A.", accountLogoUrl: "/media/bergman.png" })],
      "en"
    ).rows
    expect(rows?.[0].client, "the calendar's own String() read must never see a node").toBe("Bergman S.A.")
    expect(typeof rows?.[0].client).toBe("string")
    expect(
      React.isValidElement(rows?.[0].accountCell),
      "the Table's Account column must hold a node (mark + name), not a bare string"
    ).toBe(true)
  })

  // A RECORD WITH NO LOGO DRAWS THE INITIALS TILE, NEVER AN EM DASH (R35) — and
  // an internal meeting (no account at all) is not an absent record, it is the
  // agency's own meeting, so the mark falls back to "Ours" rather than to
  // nothing, exactly as `client` already does.
  it("an internal meeting (no account) still draws a face, labelled Ours", () => {
    const rows = shapeMeetingsList([meeting({ id: "m1", title: "Standup" })], "en").rows
    expect(rows?.[0].client).toBe("Ours")
    expect(React.isValidElement(rows?.[0].accountCell)).toBe(true)
  })
})

/* -------------------------------- choices -------------------------------- */

const selectableValue = (over: Partial<SelectableValue> & { id: string; type: string; value: string }): SelectableValue => ({
  isDefault: false,
  active: true,
  mark: null,
  nameDe: null,
  description: null,
  standardDays: null,
  position: null,
  createdAt: null,
  createdByName: null,
  ...over,
})

const choicesGroupHome: Map<string, ChoiceGroupHome> = new Map([
  ["Phase type", { segment: "work", title: "Work" }],
  ["Story type", { segment: "work", title: "Work" }],
  ["App stage", { segment: "apps", title: "Apps" }],
  ["Industry", { segment: "accounts", title: "Accounts" }],
])

describe("shapeChoicesTable", () => {
  // THE DETAILS COLUMN — client ruling, 16 Sep 2026 evening (this function's
  // own header, "THE DETAILS COLUMN"). Sprint type is the one type that
  // carries BOTH an icon (shared/sprint-types.ts, matched by the row's own
  // word) and a duration (`standardDays`, a real column).
  it("draws the icon for a sprint type row that has one, and the door's own duration", () => {
    const rows = shapeChoicesTable(
      [selectableValue({ id: "s1", type: "Phase type", value: "Build", standardDays: 5 })],
      choicesGroupHome,
      "en"
    ).rows
    expect(React.isValidElement(rows?.[0].details), "a sprint type with a known word draws a node").toBe(true)
  })

  // A BARE TYPE — one `selectable_data` carries no code-owned enrichment for
  // (Industry, here) — draws a genuinely empty cell: no dash, no placeholder,
  // the same "carries nothing" answer R81 gives a form field.
  it("draws nothing for a type the Details column has no case for", () => {
    const rows = shapeChoicesTable(
      [selectableValue({ id: "i1", type: "Industry", value: "Hospitality" })],
      choicesGroupHome,
      "en"
    ).rows
    expect(rows?.[0].details).toBeNull()
  })

  // A SPRINT TYPE ROW WHOSE WORD THE CODE HAS NEVER MET (a team's own
  // rename) carries no icon and, absent a duration too, draws nothing —
  // `sprintTypeIcon` returns "" rather than throwing, and the cell reads
  // that the same way it reads any other type with nothing to show.
  it("draws nothing for a sprint type row the icon vocabulary has never met, with no duration either", () => {
    const rows = shapeChoicesTable(
      [selectableValue({ id: "s2", type: "Phase type", value: "Retro" })],
      choicesGroupHome,
      "en"
    ).rows
    expect(rows?.[0].details).toBeNull()
  })

  // A STORY TYPE ROW draws its own icon only — no duration column is ever
  // read for it, so the fixture's `standardDays: null` (the default) is
  // never in question here.
  it("draws the icon for a story type row that has one", () => {
    const rows = shapeChoicesTable(
      [selectableValue({ id: "t1", type: "Story type", value: "Bug" })],
      choicesGroupHome,
      "en"
    ).rows
    expect(React.isValidElement(rows?.[0].details)).toBe(true)
  })

  // AN APP STAGE ROW draws the same dot tone `apps-screen.tsx`'s own stage
  // pill already draws — a node, not a bare string, because a dot never
  // renders without its label (the kit's own ruling 04).
  it("draws the dot tone for an app stage row", () => {
    const rows = shapeChoicesTable(
      [selectableValue({ id: "a1", type: "App stage", value: "Build" })],
      choicesGroupHome,
      "en"
    ).rows
    expect(React.isValidElement(rows?.[0].details)).toBe(true)
  })

  // THE STATUS CHIP, FOLDED INTO VALUE. Client ruling, 17 Sep 2026, verbatim:
  // "Dots like everywhere else"; folded into the Value cell 21 Sep 2026 (K59,
  // "ok split the who and date added in 2 columns", see settings-choices-
  // panel.tsx's own header for the R82 accounting for why Status is the fold
  // that moved). Read alongside D17's tone table (`shared/status-tones.ts`'s
  // own palette, applied here through `AUTOMATION_STATUS_DOT`): Active → shipped
  // (green), Protected → building (charcoal), Retired/Inactive → archived (grey).
  // Protected OUTRANKS active/inactive (this function's own header, "PROTECTED
  // OUTRANKS ACTIVE/INACTIVE"), so a row with both `isDefault: true` and
  // `active: true` still reads Protected/building, never Active/shipped — the
  // second case below is exactly that row. Each case also asserts the chip is
  // `variant="status"` rather than the retired filled pill (`inverse` /
  // `success` / `secondary`), so a regression back to `AUTOMATION_STATUS_VARIANT`
  // fails here even if shape.tsx's own import census (automations.test.ts) is
  // ever weakened.
  it("draws a status dot with the D17 tone per state, inside the Value cell, never a filled pill", () => {
    const cases: Array<{
      over: Partial<SelectableValue> & { id: string; type: string; value: string }
      tone: "shipped" | "building" | "archived"
      word: string
    }> = [
      { over: { id: "s1", type: "Industry", value: "Active row", active: true, isDefault: false }, tone: "shipped", word: "Active" },
      { over: { id: "s2", type: "Industry", value: "Protected row", active: true, isDefault: true }, tone: "building", word: "Protected" },
      { over: { id: "s3", type: "Industry", value: "Inactive row", active: false, isDefault: false }, tone: "archived", word: "Inactive" },
    ]
    for (const { over, tone, word } of cases) {
      const rows = shapeChoicesTable([selectableValue(over)], choicesGroupHome, "en").rows
      const value = rows?.[0].value as React.ReactElement<{ children?: React.ReactNode }> | undefined
      expect(React.isValidElement(value), `${word} row's Value cell must be a node`).toBe(true)
      const chip = React.Children.toArray(value!.props.children).find(
        (c): c is React.ReactElement<{ variant?: string; dot?: string }> =>
          React.isValidElement(c) && (c.props as { variant?: string }).variant === "status"
      )
      expect(chip, `${word} row's Value cell must carry its status chip`).toBeDefined()
      expect(chip!.props.dot, `${word} row's dot must read D17's "${tone}" tone`).toBe(tone)
      expect(rows?.[0].statusText, `${word} row's plain-text status word`).toBe(word)
    }
  })

  // K59 (documents/UI-RULEBOOK.md), Aurora, 21 Sep 2026: "in settibsg sticket:
  // typ (bug, etc) but ineed to see that 'type'." The Where cell folds the
  // module (the retired Module column's own word) with the field a group's
  // values fill in ("Work: Type" for "Phase type", off `shared/selectable-
  // where.ts`'s own derivation) — never the module alone.
  it("the Where cell reads 'module: field', folding the retired Module column", () => {
    const rows = shapeChoicesTable(
      [selectableValue({ id: "p1", type: "Phase type", value: "Build" })],
      choicesGroupHome,
      "en"
    ).rows
    expect(rows?.[0].whereText).toBe("Work: Type")
    expect(rows?.[0].whereField, "the Where facet's own plain field").toBe("Type")
    expect(rows?.[0].moduleSegment, "the Module facet still reads this, unchanged").toBe("work")
  })

  // A group Where's own map (`shared/selectable-homes.ts`) does not name —
  // stray data, a retired group, a test fixture — draws the module alone
  // rather than throwing the whole table down with it (`choiceFieldWord`'s
  // own header in shape.tsx).
  it("the Where cell falls back to the module alone for a group selectableFieldWords does not know", () => {
    const rows = shapeChoicesTable(
      [selectableValue({ id: "x1", type: "Not a real group", value: "Whatever" })],
      new Map<string, ChoiceGroupHome>([["Not a real group", { segment: "work", title: "Work" }]]),
      "en"
    ).rows
    expect(rows?.[0].whereText).toBe("Work")
    expect(rows?.[0].whereField).toBe("")
  })

  // "ok split the who and date added in 2 columns". K59, Aurora, 21 Sep
  // 2026, splitting the same day's earlier "in choices also show columns
  // added on and added by" out of its one folded cell into two real columns:
  // `addedBy` (the creator's face and first name) and `addedOn` (the
  // formatted date), with the RAW instant riding beside them for the date
  // sort (`sorted-columns-declare-their-type.test.ts`'s own law).
  it("the Added by cell carries the creator's face and first name, and the Added on cell carries the date plus the raw instant for sort", () => {
    const rows = shapeChoicesTable(
      [
        selectableValue({
          id: "a1",
          type: "Industry",
          value: "Retail",
          createdAt: "2026-05-01T09:00:00.000Z",
          createdByName: "Ana Bergman",
        }),
      ],
      choicesGroupHome,
      "en"
    ).rows
    expect(React.isValidElement(rows?.[0].addedBy), "Added by draws a node (face + name)").toBe(true)
    // R54: staff are shown by first name only, everywhere.
    expect(rows?.[0].addedByText).toBe("Ana")
    expect(rows?.[0].addedOn, "Added on is the formatted date alone").toBe("May 1, 2026")
    expect(rows?.[0].createdAtRaw, "the sort's own raw value, never the shaped date").toBe(
      "2026-05-01T09:00:00.000Z"
    )
  })

  // A value from before the audit columns existed (or a row the fixture just
  // never set them on) draws both cells with nothing to say, not a crash and
  // not a dash, the same "carries nothing" answer R81 gives elsewhere.
  // Added by draws `null` (the same empty answer the Details column gives),
  // never an empty wrapper node, because there is no face to anchor one.
  it("the Added by and Added on cells are empty, not broken, for a value with no audit block", () => {
    const rows = shapeChoicesTable(
      [selectableValue({ id: "a2", type: "Industry", value: "Retail" })],
      choicesGroupHome,
      "en"
    ).rows
    expect(rows?.[0].addedBy).toBeNull()
    expect(rows?.[0].addedByText).toBe("")
    expect(rows?.[0].addedOn).toBe("")
    expect(rows?.[0].createdAtRaw).toBeNull()
  })
})

