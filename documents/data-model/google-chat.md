### google_connections + google_sources. KEEP (BUILT 2026-08-12, team migration `0019_google_connections`). ONE PERSON'S OWN GOOGLE

Two tables, and the shape of the first one is the whole product decision: a
connection hangs off a **user id**, never a team. Each person connects their own
Google account, one service at a time, and the assistant acting for them sees
exactly what they can see. There is no service account anywhere in this module
and deliberately nowhere to put one. "connect the agency's Drive once and let
everybody read it" is not a mistake somebody could make here, it is a column that
does not exist.

**`google_connections`**, `user_id` (the GLOBAL user id, plain TEXT with no
`REFERENCES`, exactly like `staff_profiles.user_id`: the members live in the core
database, so a foreign key would name a table this one does not have),
`service` (`drive` / `gmail` /
`calendar` / `chat`), `google_email` (which account, so a person with two can
tell them apart), `scopes` (**what Google actually granted**, not what we asked
for, somebody can untick a box, and a connection that quietly works for less
than it claims is how an assistant ends up saying "there is nothing in that
folder" about a folder full of things), the two token columns, `last_used_at`,
`last_error`, **`scope_mode` and `scope_event_types`** (below), and the audit
block.

- **`scope_mode`** (`everything` / `only`, migration
  `0058_what_this_person_lets_us_read`) is **how much of this connection kwapso
  may read**, and it exists because one table could not carry two opposite
  meanings of silence. The containers themselves are rows in `google_sources` —
  a calendar and a Gmail label sit beside the folder, the file and the space —
  but "this person has named nothing" already means *read nothing* there, and on
  Gmail and Calendar it has always meant *read everything*. Without the mode,
  switching off a last named label would hand somebody their whole mailbox back
  through a gesture that reads as a narrowing. `everything` is the default and is
  bit-for-bit what every connection did before the column existed; `only` reads
  the named containers and nothing else, and `only` with nothing named reads
  **nothing**, which the screen says in those words.

  It earned itself on **25 August 2026**: a live password was said out loud on a
  call, transcribed into the meeting notes and indexed. The fix offered was a
  credential SCANNER over transcripts and the owner refused it — "no it should
  not scan anything.. give content as it is" — because a scanner tuned to catch a
  spoken secret also silently drops real material. So the lever is scope: the
  answer to "that should never have been read" is "that source was never in
  scope".

- **`scope_event_types`** is a space-separated allow-list in **Google's own
  words** (`default`, `outOfOffice`, `focusTime`, `workingLocation`, `birthday`,
  `fromGmail`), the same shape as `scopes` above it, passed straight to
  `events.list` as repeated `eventTypes`. `''` means every kind and is the only
  way to spell it — the door refuses an *empty list*, because "untick them all"
  would otherwise round-trip back into "every kind" and be a second way for a
  narrowing gesture to widen. It is a column rather than a `google_sources` row
  because an event type is not a container: nobody shared it, it has no shelf, no
  client and nothing to link to.

- **The narrowing is applied by GOOGLE, never by us.** A label becomes `labelIds`
  on the search, a calendar becomes the calendar in the URL, a kind becomes
  `eventTypes` — so material out of scope is never fetched. A thing that was
  fetched and then discarded has still been fetched, and has still been through
  this worker's logs and memory on the way to being dropped. One seam reads the
  decision (`googleScope`) and every mail and calendar read in the worker goes
  through it — the knowledge sweep, the meetings sync, the events door and the
  mail door alike — proved by a census in
  `workers/content/test/google-scope.test.ts` rather than by convention.

- **The tokens are ciphertext in the column**, not merely at rest under
  Cloudflare's disk encryption. A refresh token is a standing key to somebody's
  mailbox that survives their password change, and this database is reachable by
  anything holding the account's D1 REST token, a backup, an export, a debug
  query. AES-GCM with a fresh IV per value, the key in a secret the database has
  no copy of (`GOOGLE_TOKEN_KEY`). A dump of this table without that secret is a
  table of email addresses. One file reads them back
  (`workers/content/src/lib/google-crypto.ts`), and no read a screen sees can
  select one, the public column list is the enforcement, and a test proves it.
- **`UNIQUE (user_id, service) WHERE deactivated_at IS NULL`**, one live
  connection per person per service, on the database rather than in a handler.
  Connecting is a browser round-trip a person can genuinely finish twice (two
  tabs, an impatient second click), and a read-then-write would make two rows
  holding two refresh tokens, one of which nothing would ever revoke
  (CONCURRENCY rule 2). Partial, so disconnecting and connecting again, the
  ordinary way somebody fixes a broken grant, is still allowed.

**`google_sources`**, the containers one person named: the Drive FOLDERS, the
individual Drive FILES, the Chat SPACES — and, since `0058`, the CALENDARS and
the Gmail LABELS. Drive is not "your Drive" and Chat is not "your Chat": both are
reached only through rows here, so the unnamed rest is out of reach by
construction rather than by a filter somebody has to remember to write.

**The two newer kinds are the mirror image, and the verb is the difference.** A
Drive folder is SHARED — nothing in a Drive is in reach until somebody hands it
over. A calendar or a label is SCOPED — everything is in reach the moment the
connection exists, and naming one is how a person says "this, and not the rest".
Same table, same audit, same switch; which meaning applies is
`google_connections.scope_mode`, above, and never the emptiness of this list.

Mail also still carries a second, older fence on the interactive door: only mail
to or from a **known contact** (an address on one of the team's `accounts`). That
one is the PRODUCT's rule about what that door is for; `scope_mode` is the
PERSON's rule about their own mailbox. They are different questions and both are
passed to Gmail. (The knowledge SWEEP does not apply the contact fence — the
owner opened his mailbox to it on 20 Aug 2026 — so the two doors disagree, which
predates scope and is written down here rather than quietly reconciled.)

- **`kind`** (`folder` / `file` / `space` / `calendar` / `label`, the last two
  from `0058_what_this_person_lets_us_read`; the split of the first two by
  `0035_calendar_depth_and_file_shares`) splits what used to be one word. Sharing
  was folder-wise only, which meant sharing one contract meant sharing everything
  filed beside it. The fence does not change shape — what is named is the only
  thing readable — and a named file is exactly one file, ignored by the search
  term because somebody who shared one document has already narrowed it as far as
  narrowing goes.

- **`shelf`** (`private` / `team`) is the answer to the question the design round
  said we must answer at the moment of sharing: who will be able to read this?
  A SCOPED row is always `private` and the form never asks: mail and a calendar
  are filed as one person's material everywhere else in the module, and offering
  a choice nothing downstream honours is the switch that decides nothing (R36).
  It is stored on the source rather than inferred later, because "I thought that
  folder was just mine" is the failure the column exists to prevent. It defaults
  to `private`, the safe answer is the one you get by not deciding, and it
  rides the activity sentence as well as the row, so "who could read this?" is
  answerable six months later.
- `user_id` is denormalised off the connection: every read here is "mine", and a
  join to answer the cheapest question in the module would be a join on every
  list.

**Permissions: two modules. It was three.** `google` (read what you shared ·
**create = connect an account**, name a folder or space, and say how much of a
mailbox or a calendar may be read · update = write back
through it · delete = disconnect or stop sharing), plus `google_mail`, which
exists to carry ONE right: may kwapso send mail as you. Separate from `agent`, so
granting somebody the assistant does not grant the assistant their outbox. A
module whose four rights are not all meaningful is not new here: nothing reads
`agent:update` either.

**`google_events` was the third and is gone** (migration
`0038_calendar_one_way`). It carried "kwapso may put an EVENT in your calendar",
and the calendar became read-only on 18 August 2026 — so it guarded nothing. A
switch that switches nothing is worse than no switch: somebody grants it, expects
a capability, and gets silence. The migration deletes its `role_permissions` rows
from every existing team.

**Not importable** (two `CATALOG_EXEMPT` lines). A connection is a CAPABILITY,
not a record, the row is worthless without the token inside it, and that token
can only be minted by a person standing at Google's consent screen saying yes.
The switch module has no rows at all.

**No client-portal exposure, on any door.** Clients get no assistant and no
Google surface; every handler opens with `refusePortalCaller` and both tables are
`fence: null` in `PORTAL_ACTIVITY_FENCE`.

### chat_people. KEEP (BUILT 2026-08-20, team migration `0049_chat_people`). THE NAMES CHAT ARRIVES WITHOUT

Google Chat names a message's sender `users/<number>` and offers no scope that
turns the number into a person — the roster comes back nameless, and the People
API answers only for the caller's own contacts. The ONE route to a name is the
conversation itself: when somebody writes an @mention, Google attaches an
annotation carrying the display name. This table remembers what was learned
(`user_id` → `display_name`, with `learned_at` and `learned_from`), so a
message filed into the knowledge base reads "a person said this" rather than a
number, and a name survives the request it was learned in. Four columns, no
audit ceremony: it grows with PEOPLE, not with messages, and a row is a cached
fact, not a record anybody curates.

---

