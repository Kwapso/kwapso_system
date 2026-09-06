"use client"

// WHO CAN BE GIVEN WORK — the one answer, for every picker in the agency app.
//
// THE PROBLEM. A client-portal login is an ORDINARY TEAM MEMBER. Grant → invite
// → accept is the only way to make one that works, so a client contact holds a
// role, has a session, and sits in `listMembers` beside our own staff with
// nothing on the row to tell them apart. Every dropdown built from that list
// therefore offered them: "Who's doing it" on a new task, the assignee on a
// story, the staff tick-list on an app, triage duty, the people you can mention
// on a ticket. The owner found it by opening one of them and reading his
// clients' names back.
//
// THE RULE (his words): assignee and owner pickers on internal work list AGENCY
// STAFF ONLY. A client may be picked in exactly two places — a to-do raised for
// them, and a ticket raised on their behalf — and neither of those is a person
// picker at all: both name an ACCOUNT, and a ticket's "raised by" names a
// CONTACT off that account's own detail door. So there is no exception to carve
// here; there is one list, and it is ours.
//
// WHY IT IS ONE FUNCTION AND NOT A FILTER PER SCREEN. Nine screens build a
// people list. A rule copied nine times is a rule that holds eight times: the
// tenth screen is written by somebody who never read this comment. So the DOOR
// supplies the fact (`isClient`, from the team's own `portal_users` table, the
// same table the account fence reads) and this file makes the decision, once.
// The admin screens — the members list, a member's detail, change-role, remove,
// the team roster — deliberately do NOT call this: a client login is a member,
// and the screen for managing members has to show them, or nobody can take one
// away.

import type { TeamMember } from "@shared/types"
import { useCached } from "@shared/web/store"
import { personName } from "@/lib/identity"
import { tenancy } from "@/lib/api"
import { TEAM_RESOURCES } from "@/lib/live-resources"

/** One pickable person: the id a door stores, the words a person reads, and
 * THEIR FACE (R35).
 *
 * `photo` was dropped here for a year. `TeamMember` carries `imageUrl`, the
 * member list draws it, the profile menu draws it, the ticket's stakeholder list
 * draws it — and every picker that chose a person from this same array showed a
 * column of names, because the mapping one line down took `id` and `name` and
 * left the picture behind. A field that is not carried cannot be forgotten
 * later; it is already gone. */
export type PickablePerson = { id: string; name: string; photo?: string | null }

/**
 * The people this team can hand work to — our own staff, never a client login,
 * each with a name that is theirs alone.
 *
 * TWO NAMES THE SAME IS ITS OWN BUG. The owner's screenshot had "Alaap
 * Kanchwala" listed twice in one dropdown: not a duplicated row (the membership
 * table is unique on team + user), but two DIFFERENT people rows carrying the
 * same display name — an agency login and a client-contact login for the same
 * human. Dropping clients removes that particular pair, and it does not fix the
 * class: two colleagues genuinely called Alaap Kanchwala would read as one
 * option twice, and picking is a guess. So a name that is not unique in this
 * list carries the email that makes it unique. A name that IS unique is left
 * exactly as it was, because most of the time it is a name, not a record.
 */
export function assignableMembers(members: TeamMember[] | undefined): PickablePerson[] {
  const ours = (members ?? []).filter((m) => !m.isClient)
  const seen = new Map<string, number>()
  for (const m of ours) {
    const name = personName(m)
    seen.set(name, (seen.get(name) ?? 0) + 1)
  }
  return ours.map((m) => {
    const name = personName(m)
    return {
      id: m.userId,
      // The email is the disambiguator because it is the thing that is unique by
      // construction (the users table says so) and the thing a colleague already
      // knows. A role title would not be: two people can share one.
      name: (seen.get(name) ?? 0) > 1 && m.email ? `${name} (${m.email})` : name,
      photo: m.imageUrl,
    }
  })
}

/** THE PEOPLE STAFFED TO ONE APP — narrowed from the list above, with the
 * fail-open that makes the narrowing safe.
 *
 * WHAT THE RELATIONSHIP IS, AND WHERE IT COMES FROM. `app_staff` (team migration
 * `0030_app_staff_and_stakeholders`) is our rota on one system: an app id, a user
 * id, and which of them is the lead. It has NO DOOR OF ITS OWN and does not need
 * one — it rides the app row, because whoever may read a system may read who is
 * on it (`listApps` in `workers/tenancy/src/lib/processes.ts` returns
 * `staff: canOpen ? … : []`, withheld from a client login and from anybody the
 * 8.11 record fence keeps out). So "the people staffed to this app" is already
 * an answer the bounded, gated apps list carries, and a second door for it would
 * be a second place the same fence had to be got right.
 *
 * WHY IT IS HERE RATHER THAN AT THE CALL SITE. It was written inline in
 * `story-form-dialog.tsx`, correctly, with the fail-open and the reason for it —
 * and then the triage card needed the identical two lines for the identical
 * question ("who could pick this up?"). Two copies of a rule is one copy and a
 * countdown; this file's own header already makes that argument about the list
 * these people come out of ("a rule copied nine times is a rule that holds eight
 * times"), and the narrowing belongs beside it for the same reason.
 *
 * THE FAIL-OPEN IS THE LOAD-BEARING HALF. An app nobody has been staffed to
 * narrows to NOBODY, and a picker offering nobody is a screen a person cannot
 * finish — on precisely the apps where the staffing has not been filled in,
 * which is the worst possible place to enforce it. So an empty staff list means
 * the whole team, which is also what the DOOR does: `refuseOffAppAssignee`
 * (`workers/content/src/lib/stories.ts`) refuses an assignee who is not on the
 * app's staff ONLY when the app has staff. The picker is the courtesy half of a
 * rule the server keeps; this makes the two say the same sentence. */
export function staffedOn(
  members: PickablePerson[],
  /** app id → the user ids on it, straight off the apps list's own `staff` */
  appStaff: Map<string, string[]>,
  /** the app in question — `null`/`undefined` on a record that names none */
  appId: string | null | undefined
): PickablePerson[] {
  const here = appId ? (appStaff.get(appId) ?? []) : []
  return here.length ? members.filter((m) => here.includes(m.id)) : members
}

/** The same answer, fetched. Every screen that offers people reads the ONE
 * members cache four other screens already hold, so opening a form costs a round
 * trip only on a page that has never needed the list. */
export function useAssignableMembers(teamId: string): PickablePerson[] {
  const membersQ = useCached<TeamMember[]>(TEAM_RESOURCES.members.key(teamId), () =>
    tenancy.members().then((r) => r.members)
  )
  return assignableMembers(membersQ.data)
}
