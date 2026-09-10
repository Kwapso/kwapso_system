// ONE IDENTITY PER REAL-WORLD THING — the gate every source passes through.
//
// THE FAULT, IN ONE INTERPOLATION.
//
// Until now a Google source's key was built as the reader's own id, a colon, and
// the thing's id. Two colleagues who had both named the same Drive folder got a
// row each; a mail thread three people were on was three sources; and the same
// standing meeting arrived once per person who had it in their calendar. Every
// copy was chunked, embedded and stored separately, and a question that matched
// it matched all of them — so the shortlist a reader sees could be the same
// document three times while the passage that actually answers waits below the
// cut.
//
// The identity here is the THING'S OWN ID and the person is never in it. Who saw
// it is a SIGHTING beside the source, which is a different sentence about a
// different fact: "this is Aurora's Drive folder" was always two claims wearing
// one string.
//
// WHY THAT USED TO BE DELIBERATE, AND WHAT REPLACES THE REASON.
//
// The old shape was not an accident. Its comment said sharing one row "would
// make the last sweep to run decide who else can read somebody's document" —
// and against a single owner column that is exactly true, because one column
// cannot hold two answers and the last writer wins.
//
// So the fence moves off the source and onto the set. A person may be answered
// from a thing when SOME live sighting of it is on the team's shelf, or when one
// of them is their own. No sweep decides that; the set does, and a sweep only
// ever adds or removes its own person's row.
//
// THAT IS NOT A WIDER FENCE, IT IS THE SAME ONE. Under the old shape a person
// could read the thing when any one of its rows was readable to them, which for
// "no owner, or me" is precisely the sentence above. `readableBy` is held to
// that equivalence by a test that enumerates every combination of two people and
// two shelves and compares the two rules row for row — because a merge that
// quietly widened a fence would be the most expensive possible way to remove a
// duplicate.
//
// AND THE MAIL, WHICH IS THE ONE THAT DOES NOT MERGE YET.
//
// Gmail's message id is scoped to ONE MAILBOX: the same message sitting in two
// colleagues' inboxes carries two different ids, and the id that is the same for
// both is the RFC-822 message header, which this app does not read today. So
// mail still lands one source per person. Nothing here pretends otherwise — the
// identity is whatever id the lane hands over, and the lane hands over the only
// one it has. When the header is read, mail merges by changing what is passed
// in, and not one line of this file.

import type { GoogleService } from "@shared/types"

/** WHAT A SOURCE IS, as the pair the sources table already holds. The first half
 * says which world the thing lives in; the second is the thing's own id in that
 * world, and never the id of anybody who happens to be looking at it. */
export type SourceIdentity = { originTable: string; originRowId: string }

/** ONE PERSON'S SIGHT OF ONE THING. `shelf` is theirs and theirs alone — the
 * colleague who filed the same folder as team material has a row of their own
 * saying so, and neither overwrites the other.
 *
 * `goneAt` is when they stopped being able to see it (they un-shared the folder,
 * left the space, or were removed from the team). Stamped rather than deleted,
 * so "she never saw it" and "she saw it until Tuesday" stay different answers. */
export type Sighting = { userId: string; shelf: "private" | "team"; goneAt?: string | null }

/** Where each Google service's things live. Named for the service rather than
 * for a table in this database, because none of these is one — and it is what
 * keeps four services' ids from colliding under one identity. */
const GOOGLE_ORIGIN: Record<GoogleService, string> = {
  drive: "google_drive",
  gmail: "google_gmail",
  calendar: "google_calendar",
  chat: "google_chat",
}

/** Where an uploaded file's identity lives. Not a table either: an upload has no
 * original anywhere else, so the bytes are the only thing that can name it. */
const UPLOAD_ORIGIN = "upload_bytes"

/** The thing Google itself named — a file id, an event id, a thread name, a
 * message id — and nothing about who fetched it.
 *
 * An empty id THROWS rather than filing a row. A falsy external id used to be a
 * harmless-looking half of a key; on its own it is a single row that every
 * unidentifiable item in a service would upsert over in turn, which reads as one
 * document whose contents change every quarter of an hour. */
export function googleIdentity(service: GoogleService, externalId: string): SourceIdentity {
  const id = externalId.trim()
  if (!id) throw new Error(`a ${service} item arrived with no id of its own, so it cannot be filed`)
  return { originTable: GOOGLE_ORIGIN[service], originRowId: id }
}

/** An upload IS its bytes. Two people uploading the same file, or one person
 * uploading it twice, are one thing seen twice — which is what lets the second
 * upload be refused with a link to the first rather than silently doubling a
 * document in the pile.
 *
 * The hash is `contentHash`'s, computed over the text the file reads as. Two
 * files that read identically ARE the same material here, whatever their
 * filenames say. */
export function uploadIdentity(hash: string): SourceIdentity {
  const id = hash.trim()
  if (!id) throw new Error("an upload arrived with no content hash, so it cannot be filed")
  return { originTable: UPLOAD_ORIGIN, originRowId: id }
}

/** A row of this app's own — a ticket, an account, a meeting. Unchanged, and
 * deliberately so: a record already has exactly one identity and nobody has ever
 * had a private sight of one. It is here so that every source in the base is
 * named by the same function, and there is no second place to look. */
export function recordIdentity(table: string, rowId: string): SourceIdentity {
  return { originTable: table, originRowId: rowId }
}

/** One string, and it is the one the `identity_key` column holds (migration
 * 0073) — so the unique index there and every set and map here are keyed the
 * same way, by construction rather than by two functions agreeing.
 *
 * SEPARATED BY A SPACE, which is a decision and not a default. No origin table
 * contains one, so the split is unambiguous whatever the thing's own id looks
 * like; and a space is visibly NOT the legacy `<reader>:<thing>` shape, which
 * somebody will be reading in the next column along for as long as the
 * migration takes. Two keys that differ only in which half is the person are
 * exactly the pair you do not want to be telling apart by eye. */
export function identityKey(identity: SourceIdentity): string {
  return `${identity.originTable} ${identity.originRowId}`
}

/** THE THING, out of a key written under the old shape.
 *
 * Rows filed before this change carry the reader's id, a colon, and then the
 * thing's id. A user id contains no colon, so the FIRST one is the boundary
 * whatever the thing's own id looks like — a chat thread full of slashes and
 * colons comes back whole. A key with no colon in it never carried a person and
 * is handed back untouched, which is what makes this safe to run over a mixed
 * table during the migration. */
export function sightedExternalId(originRowId: string): string {
  const at = originRowId.indexOf(":")
  return at === -1 ? originRowId : originRowId.slice(at + 1)
}

/** The sightings somebody can still make: a person who has stopped seeing a
 * thing stops answering for it, and the row stays as the record that they once
 * could. */
export function liveSightings(sightings: Sighting[]): Sighting[] {
  return sightings.filter((s) => !s.goneAt)
}

/** MAY THIS PERSON BE ANSWERED FROM THIS THING? Some live sighting is on the
 * team's shelf, or one of them is theirs. See the header for why this is the
 * same fence the single owner column drew, and not a wider one. */
export function readableBy(sightings: Sighting[], userId: string): boolean {
  return liveSightings(sightings).some((s) => s.shelf === "team" || s.userId === userId)
}

/** IS THERE ANYBODY LEFT WHO CAN SEE IT? A source is live while one live
 * sighting remains, and retires when the last goes — which is what makes a
 * colleague un-sharing a folder cost the base nothing while somebody else still
 * has it, and makes a departing person's private material unfindable the moment
 * their sightings do. */
export function stillLive(sightings: Sighting[]): boolean {
  return liveSightings(sightings).length > 0
}

/** MAY ANYBODY BE ANSWERED FROM THIS, or only the people who saw it?
 *
 * The stored half of the fence. `readableBy` above is the whole truth and needs
 * the sightings in hand; retrieval cannot afford that, because the fence is
 * COPIED onto every chunk and every posting so that stage one is a single-table
 * read. So what gets stored beside a chunk is this ANSWER — and only this one,
 * because it is the half that does not name a person and therefore fits in a
 * column.
 *
 * A chunk carrying it needs no sightings at all. A chunk without it needs the
 * one extra question, "do I have a live sighting of this", and nothing else:
 *
 *     readableBy(s, me)  ===  teamVisible(s) || <me has a live sighting in s>
 *
 * which is asserted over every shape two sightings can take, because an
 * optimisation that is approximately right about a permission is the most
 * expensive kind of nearly-correct there is.
 *
 * IT IS A DERIVED FACT, AND A COPY OF ONE IS EXACTLY WHAT WENT WRONG BEFORE.
 * `owner_user_id` was a stored answer too, and it broke the moment one row had
 * to answer for two people. This is the same species one level down: it goes
 * stale when a shelf moves private to team, and — the direction that leaks —
 * when the last team sighting is retired and only private ones remain. So
 * whatever writes a sighting's shelf or retires one must recompute this in the
 * same statement, and something must re-derive it across the corpus and refuse
 * to agree with a stored value that has drifted. A stale copy of this is a
 * silent fence widening with no code change and no deploy behind it. */
export function teamVisible(sightings: Sighting[]): boolean {
  return liveSightings(sightings).some((s) => s.shelf === "team")
}
