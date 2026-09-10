// HOW THE AGENCY'S OWN PEOPLE ARE NAMED ON SCREEN — first name, and nothing else.
//
// THE RULING, 7 Sep 2026, in the client's own words: "upwise, when it's staff who
// records activity, only use the first name, so not Audora Alasa, only Audora. Do
// this across all the app. We only record name and surname for the contacts and
// the customers."
//
// So there are TWO POPULATIONS and they are named differently, and the second
// sentence of the ruling is as binding as the first:
//
//   • STAFF — the agency's own people. They arrive from the global `users` table
//     (`first_name` / `last_name`) or from the frozen actor snapshot a row carries
//     (`creator_name` / `editor_name` / `actor_name` / `user_name`, all written
//     from `Actor.name`, itself built by `toActor` in shared/workers/gating.ts as
//     `[firstName, lastName].join(" ")`). FIRST NAME ONLY, everywhere.
//   • CONTACTS AND CUSTOMERS — the client's own people. They are `accounts` rows
//     of type `individual` with a single `name` column, and they never touch
//     `first_name` / `last_name` and never travel as an actor snapshot. FULL NAME,
//     unchanged. Nothing in this file should ever be pointed at one of them.
//
// ── WHERE THE TRIM HAPPENS, AND WHY IT IS HERE AND NOT IN A WORKER ───────────
//
// AT THE RENDER SEAM. The obvious alternative — trim once in the workers, on the
// way out of the database, so every screen is right for free — is WRONG here, and
// three separate things in this repository say so. Each was checked before this
// file was written rather than reasoned about afterwards.
//
//  1. ONE STORED COLUMN, TWO POPULATIONS. `toActor` (shared/workers/gating.ts) is
//     the ONLY constructor of an actor in the whole estate, and the portal gateway
//     builds none of its own — a client login is an ordinary `team_members` row
//     and its writes run through the same `gated`/`gatedBody` opening. So a row a
//     CLIENT authored through the portal carries THAT PERSON'S name in
//     `creator_name`: a process comment (workers/tenancy/src/lib/processes.ts
//     writes `is_staff: scope.kind === "staff" ? 1 : 0` beside it), a ticket, a
//     reply, an attachment, a rating. The reads that serve those rows serve BOTH
//     front doors, and three of them already answer this exact question per row —
//     `raiser_is_client` / `editor_is_client` (workers/content/src/lib/help.ts),
//     `from_client` (its replies and attachments), `is_staff` (process comments).
//     A blanket trim in the worker would truncate a contact's name, which is the
//     half of the ruling that says do not.
//
//  2. THE STORED STRING IS A KEY. `work_logs.user_name` is written from
//     `actor.name` and then used by workers/content/src/lib/work-logs.ts as a
//     LIKE search term (:228), as a sort expression AND as the keyset cursor key
//     (:301, `person: { expr: "w.user_name", key: r => r.user_name }`). Trimming
//     it at the read seam would change which rows a search finds and where a page
//     boundary falls. Trimming it here changes neither.
//
//  3. THE DE-DUPLICATION HAS TO SEE WHAT THE READER SEES. `assignableMembers`
//     (web/lib/members.ts) appends the email to a name that is not unique in the
//     list, because two people with one name is a picker where choosing is a
//     guess. First names collide far more often than full names do, so that
//     disambiguation MUST run on the trimmed name — which means the trim has to
//     have happened before the front door builds the list, i.e. here.
//
// And a fourth, smaller: `actorName` is also on the machine surface (the activity
// tool's own contract, shared/workers/tool-catalog.ts). The ruling is about what a
// PERSON reads. Nothing below changes a byte in the database or on the wire.
//
// ── THE HONEST ANSWERS ───────────────────────────────────────────────────────
//
// Every awkward input has a decision, and it is written down rather than left to
// whatever `split(" ")[0]` happens to do:
//
//   ""  /  null  /  undefined  →  ""            (nothing to show, and no invented
//                                                placeholder — the call sites all
//                                                have their own, e.g. "—")
//   "  Audora Alasa  "         →  "Audora"      (trimmed first, so leading space
//                                                cannot make the first token "")
//   "Audora"                   →  "Audora"      (one token is already the answer)
//   "audora@kwapso.com"        →  "audora@kwapso.com"   ← NOT truncated. See below.
//   "Mary Jane Watson"         →  "Mary"        (a KNOWN loss — see below.)
//
// AN EMAIL IS NEVER CUT. This codebase deliberately uses a person's email AS
// their name when they have no name yet (`targetDisplayName` in
// workers/tenancy/src/lib/members.ts; `personName`'s own fallback), so the stored
// "name" can be an address. Truncating one at the first space or at the "@" turns
// a working identifier into a fragment that identifies nobody. The test is simply
// whether the string contains an "@" AT ALL: a person's name never does, so
// anything that does is (or contains) an address and is handed back whole. That is
// deliberately broader than a strict address pattern — the failure it is guarding
// against is silent mangling, and the cost of being wrong in this direction is a
// full string where a shorter one would have done.
//
// A MULTI-PART GIVEN NAME IS THE ONE THING THE SNAPSHOT CANNOT RECOVER, and it is
// why there are TWO functions here instead of one. The snapshot joined `first_name`
// and `last_name` with a single space and threw the boundary away, so "Mary Jane
// Watson" is indistinguishable from a given name of "Mary" and a surname of "Jane
// Watson" — `staffNameFromSnapshot` answers "Mary" and loses "Jane". Where the
// structured pair is still in hand — every members list, every picker, every
// avatar, the signed-in person themselves — `staffName` reads `first_name`
// directly and is EXACT, "Mary Jane" and all. Prefer it whenever both fields exist;
// reach for the snapshot only when a frozen string is genuinely all there is.
//
// WHAT IS DELIBERATELY NOT TOUCHED:
//   • INITIALS. `personInitials` / `nameInitials` (web/lib/identity.ts) still make
//     a two-letter avatar mark from both names. An initial is a MARK, not a name —
//     R35's own sentence for the case where a record has neither picture nor glyph
//     — and "AA" is not "Audora Alasa". Changing it would be a design change the
//     ruling did not ask for, on the one surface R35 is about.
//   • ANYTHING STORED. No write path calls into this file.

/** The structured pair, as the `users` table holds it. `email` is the fallback
 * this codebase already uses as a name for a person who has not set one. */
export type StaffIdentity = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

/** True when a string is (or carries) an email address rather than a name. A name
 * never contains "@"; see the header for why the test is this broad. */
function looksLikeAddress(s: string): boolean {
  return s.includes("@")
}

/** A staff person's name for the screen, from the structured pair. EXACT — a
 * two-word given name survives, because `first_name` is read as one field rather
 * than split back out of a joined string.
 *
 * The order is first name → last name → email → "". The middle rung is not the
 * ruling being bent: a person who somehow has a surname stored and no given name
 * has exactly ONE name on file, and showing it is better than showing their email
 * address to everybody. It is still one name, never "name and surname". In
 * practice the pair arrives complete — the app will not let a person past
 * `needs-name` without both. */
export function staffName(p: StaffIdentity): string {
  const first = (p.firstName ?? "").trim()
  if (first) return first
  const last = (p.lastName ?? "").trim()
  if (last) return last
  return (p.email ?? "").trim()
}

/** A staff person's name for the screen, from a FROZEN SNAPSHOT — the "First Last"
 * a row stored at write time (`creator_name`, `editor_name`, `actor_name`,
 * `user_name`). Best-effort by construction: see the header on the multi-part
 * given name this cannot recover. Use `staffName` instead wherever the pair is
 * still available.
 *
 * Never point this at a contact or a customer. Where one field carries both
 * populations, the row already says which — `fromStaff`, `raiserIsClient`,
 * `authorIsClient`, `addedByIsClient`, `actorIsClient` — and the call site asks it
 * first. */
export function staffNameFromSnapshot(stored: string | null | undefined): string {
  const s = (stored ?? "").trim()
  if (!s) return ""
  if (looksLikeAddress(s)) return s
  return s.split(/\s+/)[0] as string
}

/** THE ACTIVITY SENTENCE, which is where the client noticed this in the first
 * place — and the one surface where trimming the actor field alone would have
 * changed nothing visible.
 *
 * An activity row's name appears TWICE: in `creator_name`, which the feed draws
 * only as an avatar's accessible name, and again inside `description`, the
 * server-composed sentence that is the visible line ("Audora Alasa edited the
 * account Whitfield"). 140 description writers across the workers interpolate
 * `${actor.name}` into that prose, and it is stored, so no change to a writer can
 * reach a row that already exists.
 *
 * This rewrites the sentence at the moment it is read, and it is an EXACT PREFIX
 * MATCH against the same row's own actor snapshot — not prose parsing. The row is
 * telling us, in a separate column, precisely which characters at the front of
 * that string are its actor's name, so replacing them is a fact the row already
 * carries rather than a guess about English. It costs nothing when the sentence
 * does not begin with the actor (the invite writer's `actor.name || "Someone"`,
 * the auth writers' "Changed your name to …"), and it fixes HISTORY as well as
 * everything written from today, which a write-side change could never do.
 *
 * THE RESIDUE, named rather than hidden: a description that puts a SECOND person
 * inside its prose keeps that person's full name. There are five such writers —
 * "X changed Y's role to Admin" and "X removed Y from the team"
 * (workers/tenancy/src/lib/members.ts), "X invited Y as Admin"
 * (workers/tenancy/src/lib/invites.ts), and the two auth self-descriptions. The
 * row carries no column naming the SECOND person, so there is nothing to match on,
 * and guessing which run of characters in a stored sentence is a surname is
 * exactly the prose parsing this function refuses to do. */
export function describeWithStaffName(
  description: string,
  actorSnapshot: string | null | undefined
): string {
  const full = (actorSnapshot ?? "").trim()
  if (!full) return description
  const first = staffNameFromSnapshot(full)
  if (first === full) return description
  return description.startsWith(full) ? first + description.slice(full.length) : description
}

/** THE ONE SCREEN THAT SHOWS BOTH NAMES — the members gallery on Settings ›
 * Team, and nothing else.
 *
 * THE CLIENT REVERSED HERSELF, TWO DAYS LATER. The 7 Sep 2026 ruling this file
 * is built on says first name only, "across all the app". On 9 Sep 2026, looking
 * at the members gallery she had just asked for — "let's use gallery — i wanna
 * see avatar (in round) role (chip) and email" — she added, verbatim: "show name
 * and surname for the members."
 *
 * Both rulings stand, and they are not in conflict once you read what each one is
 * ABOUT. The first is about a person appearing INSIDE something else: an activity
 * sentence, a picker option, an assignee, an avatar's accessible name — a
 * mention, where the surname is noise and the first name is how a colleague is
 * spoken about. This one is about the ROSTER: the one screen whose subject IS the
 * people, where the reader is looking somebody up rather than reading about them,
 * and where two colleagues called Marta are two rows a first name cannot tell
 * apart. A directory prints both names; a sentence does not.
 *
 * SO IT IS A SECOND FUNCTION ON THE SAME SEAM, not a call site reaching past it.
 * R54's whole shape is that one file turns a staff person into the word a screen
 * shows, and the way to add a second word-form is to add it HERE, where the two
 * rulings can sit next to each other and be read together — not to interpolate
 * `first + " " + last` in a component, which is exactly the drift R54 exists to
 * stop and which no later reader would find.
 *
 * The awkward inputs are `staffName`'s, deliberately: an email is handed back
 * whole and never joined to anything, one name on file is that one name, and
 * nothing is invented for a person who has neither. */
export function staffFullName(p: StaffIdentity): string {
  const first = (p.firstName ?? "").trim()
  const last = (p.lastName ?? "").trim()
  if (first && last) return `${first} ${last}`
  // One name, an email, or nothing — `staffName`'s own ladder, so the two
  // functions can never disagree about a person who has only half a name.
  return staffName(p)
}
