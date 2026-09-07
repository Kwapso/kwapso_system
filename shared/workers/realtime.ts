// Publish a "something changed" ping to a live channel — the call any worker
// makes after a successful write so every open screen refreshes ONLY the row
// that changed. Best-effort: a live-layer hiccup must never break the write it
// describes (callers don't await-throw). Reusable by every kwapso-based app.
//
// TWO channel scopes (the realtime worker fans each `event` to everyone on the
// named channel):
//   • team:<teamId>  — team-scoped data (members, roles, invites, …). Every
//     member of that team is connected.
//   • user:<userId>  — identity-scoped data for ONE person across their devices
//     (account activity, profile, email, their team-membership list) AND
//     session events (a forced sign-out). Every signed-in device is connected,
//     even before the user joins a team.
//
// The payload NEVER carries row data (`{resource,id}` only) — the client pulls
// that one row through the permission-checked endpoint, so nothing can leak.

import type { Fetcher } from "@cloudflare/workers-types"

import { logError, type CoreDb } from "./error-log"

/** THE PEAK ONE TENANT IS BUILT FOR — the review yardstick, in code.
 *
 * 250,000 people in one team at ~10% peak concurrency, which is the number every
 * other ceiling in this file is measured against. It was a sentence in a comment
 * and in a rubric; it is a constant here so the arithmetic below can be checked
 * rather than believed. */
export const REALTIME_PEAK_LISTENERS_PER_TEAM = 25_000

/** HOW MANY SOCKETS ONE SHARD MAY HOLD BEFORE SOMEBODY IS TOLD.
 *
 * A Durable Object is single-threaded and a broadcast is a serial loop, so past
 * a few thousand sockets every publish on that team queues behind the last —
 * and the first symptom of that is "the app feels slow", on the one team big
 * enough to matter, pointing at nothing. Nothing measured a real team's listener
 * count and nothing would have said a word as a team approached the number.
 *
 * 3,000 is the LOW end of one object's own range, deliberately — the point of a
 * watch is to fire while there is still time to raise the shard count, and
 * raising it re-shards new listeners (`shardFor` is a modulo of the count), so
 * it wants a maintenance window rather than an emergency.
 *
 * The row it writes carries the two numbers nobody has: how many sockets that
 * shard is holding, and how many of them the ping was actually sent to. The
 * second is the measurement of subscription scoping — the thing the ceiling
 * arithmetic depends on and that has never been observed on a real tenant. */
export const REALTIME_SHARD_WATCH_SOCKETS = 3_000

/** HOW MANY OBJECTS ONE TEAM'S CHANNEL IS SPREAD ACROSS — DERIVED, NOT CHOSEN.
 *
 * ── WHY THE CHANNEL IS SPLIT AT ALL ─────────────────────────────────────────
 *
 * A Durable Object is single-threaded and a broadcast is a serial loop over its
 * sockets, so ONE object per team made the team's socket count the ceiling: at a
 * few thousand listeners a ping costs hundreds of milliseconds of one object's
 * only thread, and every later publish queues behind it. Cloudflare's soft
 * ceiling for one instance is ~1,000 requests/second and each publish is one
 * request, so the publish rate reached it before the loop did.
 *
 * Splitting the channel divides the sockets — and therefore the per-ping work AND
 * the per-object request rate — by this number. It is the one change that moves
 * the ceiling rather than shaving the constant in front of it.
 *
 * THE COST IS PAID BY THE PUBLISHER, and it is paid INSIDE the realtime worker
 * rather than here: a publisher still makes ONE call naming `team:<id>`, and
 * realtime fans that out to the shards. Every one of the hundred-odd
 * `publishChange` call sites is therefore untouched, which is the whole reason the
 * split is shaped this way — a fan-out written at the publisher would have been a
 * hundred chances to write it differently.
 *
 * ── WHY IT IS AN ARITHMETIC AND NOT A NUMBER (7 Sep 2026) ───────────────────
 *
 * It was `4`, with a paragraph reasoning that four "takes the ceiling from ~3–5k
 * concurrent listeners per team to ~12–20k, which clears the yardstick's 25,000
 * only once combined with subscription scoping". Read plainly, that says the
 * shard count did NOT clear the yardstick on its own and leaned on a saving
 * nobody had ever measured on a real tenant — and a hand-picked constant beside
 * a hand-written ceiling is exactly the shape that cannot go red when the
 * yardstick moves.
 *
 * So the count is now the division those two comments were doing by eye: enough
 * shards that a team at the yardstick's peak sits at or under the WATCH line on
 * every shard. `ceil(25,000 / 3,000)` = 9, which is 27,000 sockets of watched
 * capacity — 2,000 clear of the peak before anybody is even told, and ~45,000 at
 * the high end of one object's own measured range. Nothing is assumed about
 * subscription scoping; whatever it removes is now headroom on top rather than
 * the thing the number depends on.
 *
 * ── WHY RAISING IT IS SAFE, AND WHAT UNLOCKED IT ────────────────────────────
 *
 * Sharding divides broadcast work by N and multiplies publish work by N, so a
 * larger N used to make the fan-out the bottleneck (ARCHITECTURE.md §7's table:
 * 128 shards fail on the publish side at ~22,000 object calls a second). The
 * INTEREST REGISTRY below removed that: a publish now reaches the shards that
 * declared an interest, so the publish side stops scaling with N. Its own note
 * called raising this number "the follow-on decision this unlocks"; this is that
 * decision, taken as a derivation so it cannot silently fall behind the
 * yardstick again.
 *
 * A DEPLOY DOES NOT DROP A PING. `shardFor` is a modulo, so a listener already
 * connected on an old shard stays there, and the fan-out reaches shards 0..N-1
 * — a superset of where the old clients are. New connections spread over the
 * wider set. Nothing needs draining. */
export const REALTIME_SHARDS = Math.ceil(REALTIME_PEAK_LISTENERS_PER_TEAM / REALTIME_SHARD_WATCH_SOCKETS)

/** WHICH shard a listener joins — stable per person, so their own devices land
 * together and a reconnect returns to the same object.
 *
 * A cheap non-cryptographic hash: this decides load distribution, not
 * authorization, and a listener who forced themselves onto another shard would
 * gain nothing (the shards are identical and the account fence rides the socket,
 * not the shard). It must be IDENTICAL on the client and in the worker, which is
 * why it lives in the seam both import rather than being written twice. */
export function shardFor(key: string, shards = REALTIME_SHARDS): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return Math.abs(h) % shards
}

/** The DO name for one shard of a team's channel. `#` because a Durable Object
 * name is an opaque string and `#` appears in no team id (a ULID is base32), so
 * the two halves can never be confused for one another. */
export function teamShardName(teamId: string, shard: number): string {
  return `team:${teamId}#${shard}`
}

/** The DO name for a team's INTEREST REGISTRY — one instance per team, holding
 * which shards currently hold a listener for which resource. `!` for the same
 * reason `#` is used above: it appears in no ULID, so a registry name can never
 * collide with a shard's. */
export function teamInterestName(teamId: string): string {
  return `team:${teamId}!interest`
}

/** WHY A REGISTRY, AND THE HONEST ARITHMETIC.
 *
 * A publish fans out to every shard whether or not anybody there is listening
 * for that resource. The registry lets the door ask once and skip the shards
 * with nobody interested.
 *
 * At the FOUR shards this app ran until 7 Sep 2026 it was roughly a wash and
 * could cost one extra call: 1 registry read + K interested shards, against 4
 * unconditional ones. It won at K ≤ 2 and lost at K = 4. That was never the
 * reason it exists — and at the derived nine it is a saving on every publish
 * that fewer than eight shards care about.
 *
 * IT EXISTS TO REMOVE THE CEILING ON THE SHARD COUNT ITSELF. Sharding divides
 * broadcast work by N but multiplies publish work by N, so ARCHITECTURE.md §7's
 * own table shows 128 shards failing on the publish side at ~22,000 object calls
 * a second — the fan-out becomes the bottleneck exactly when the sharding starts
 * to matter. With interest routing the publish side stops scaling with N and
 * starts scaling with how many shards actually care, which is what makes a
 * larger N worth having. Raising REALTIME_SHARDS was the follow-on decision
 * this unlocked, and it was TAKEN on 7 Sep 2026 — as a derivation from the
 * yardstick rather than a second hand-picked number, which is the argument
 * written out at `REALTIME_SHARDS` itself.
 *
 * FAIL OPEN, ALWAYS. Every unknown answers "interested": an unregistered shard,
 * an entry older than a listener's own deadline, an unreachable registry, a
 * malformed reply. The cost of a wrong "yes" is one wasted object call. The cost
 * of a wrong "no" is a screen that goes quietly out of date, which is the single
 * failure the live layer exists to prevent. */
export const INTEREST_STALE_MS = 15 * 60 * 1000

/** One shard's declared interest, as the registry stores it. `all: true` means
 * that shard holds at least one listener that declared no subscription — the
 * pre-subscription client, which must hear everything. */
export type ShardInterest = { resources: string[]; all: boolean; at: number }

/** What a publisher needs: the binding, and the shared internal key the realtime
 * worker checks. Taking the whole env (rather than just the binding) is what
 * lets the key travel with the call — a publisher that forgets it is a type
 * error here instead of a silent 403 at runtime. */
export type RealtimeEnv = {
  REALTIME: Fetcher
  INTERNAL_KEY?: string
  /** THE CORE DATABASE, so a swallowed failure leaves a row and not just a line.
   *
   * OPTIONAL, and that is the whole design. There are 175 `publishChange` call
   * sites; a required argument would be 175 chances to write it differently, and
   * an optional PARAMETER would be 175 chances to forget it. Every worker's `env`
   * already carries `DB`, and every one of those calls already passes `env` — so
   * widening the TYPE gives all of them a durable record without a single call
   * site changing, which is the same reasoning `REALTIME_SHARDS` uses one screen
   * up for why the fan-out is not written at the publisher.
   *
   * `?` rather than required because the two GATEWAYS bind no database and the
   * web workspaces compile this file. Where it is absent the behaviour is exactly
   * what it always was. */
  DB?: CoreDb
  /** THIS REQUEST'S DEFERRER, so the ping stops being something the clicker
   * waits for. Set by each worker's dispatcher on a per-request SHALLOW COPY of
   * `env` — see `deferrerFor` in parallel.ts and the note on `publish` below.
   *
   * OPTIONAL for the same reason `DB` above is: widening the TYPE reaches all
   * 175 `publishChange` call sites without one of them changing. A caller
   * without it (a cron, a test, a lib called directly) awaits the ping exactly
   * as before. */
  DEFER?: (work: Promise<unknown>) => void
}

/** One change ping. `op` is advisory; the client re-pulls the row and decides
 * whether it still belongs in the collection (keep-or-drop), so "edit" vs
 * "remove" need not be exact. A `session` event (no id) is the sign-out signal. */
export type ChangeEvent = {
  /** The module/collection tag, e.g. "members", "member_roles", "invites",
   * "account_activity", "teams". For a session event: "session". */
  resource: string
  /** The affected row id (omitted for collection-wide or session events). */
  id?: string
  /** add | edit | remove | session — advisory; the client verifies by re-pull. */
  op?: "add" | "edit" | "remove" | "session"
  /** WHOSE row this is: the account it belongs to, when the row is not itself an
   * account. A CLIENT LOGIN's socket carries the set of accounts they may hear
   * about (`mayHearChange`), and a ticket id tells that fence nothing — so a
   * resource a client is allowed to hear names its account here, or it is heard
   * only by staff. Never a secret in its own right: it is the id of a company
   * the listener already stands in, or the listener never receives it. */
  scope?: string
}

async function publish(env: RealtimeEnv, channel: string, event: ChangeEvent): Promise<void> {
  // "THE PING MUST NOT OUTLIVE THE WRITE IT DESCRIBES" — OVERTURNED BY THE OWNER,
  // 6 SEPTEMBER 2026. The sentence is kept because the reasoning under it is
  // still true and still load-bearing; only the conclusion changed.
  //
  // WHAT IT SAID, and why it was right at the time: this hop is best-effort, so
  // a live layer that is down costs a screen its instant refresh and nothing
  // else — but a HUNG realtime is worse than a dead one, because without a
  // ceiling the publish keeps the mutation's request open and an unwell live
  // layer turns every successful write into a slow one. The two-second ceiling
  // below is that argument's answer and it STAYS.
  //
  // WHAT CHANGED: the owner was asked "say 'saved' straight away, and finish the
  // history entry a moment later?" and answered yes. So the ping no longer holds
  // the response at all — it runs on the request's own lifetime through
  // `ctx.waitUntil` (parallel.ts), which GUARANTEES completion. This is deferral,
  // never fire-and-forget: the ping still goes, the failure is still recorded by
  // `note` below, and the fetch still LEAVES at the same instant it left before.
  // The only thing that moved is who waits for it. (That answer reached this file
  // relayed rather than typed into it, and has since been confirmed first-hand —
  // his own one-word reply against the numbered item. parallel.ts carries the
  // full provenance note; the chain is kept rather than collapsed.)
  //
  // THE ONE BEHAVIOUR THAT CHANGES, and it is BOUNDED rather than "usually":
  // for a moment the person who saved sees it done before a colleague's screen
  // moves. That moment is the DO hop, and its ceiling is the `AbortSignal` two
  // lines down — two seconds, the same ceiling that already bounded how long the
  // clicker could be made to wait. It cannot be longer than that, because the
  // request is aborted at exactly the point it used to give up.
  //
  // Two seconds is a fan-out to a Durable Object in the same colo; anything
  // slower has already failed.
  // (Cast: see whoAmI in gating.ts — shared/ compiles in the web workspaces too.)
  const init = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // /publish can broadcast to ANY channel, so it is an internal door and
      // is keyed like every other one. Network isolation (workers_dev:false,
      // and the gateway never routing it) was its only protection before —
      // one config regression away from an open broadcast door.
      "x-internal-key": env.INTERNAL_KEY ?? "",
    },
    body: JSON.stringify({ channel, event }),
    signal: AbortSignal.timeout(2_000),
  } as unknown as Parameters<typeof env.REALTIME.fetch>[1]

  // Created HERE, not inside a branch: the request leaves now either way, and
  // only the awaiting differs. (parallel.ts, "It starts NOW".)
  const send = (async () => {
    try {
      const res = await env.REALTIME.fetch("https://realtime/publish", init)
      // A NON-OK ANSWER WAS THE HALF NOBODY SAW. The catch below only ever fired
      // on a thrown fetch — a 403 from a wrong internal key, or a 500 from the
      // switchboard, came back as a resolved Response and was dropped on the
      // floor without so much as a console line. Every screen on that team then
      // went quietly out of date, which is the single failure the live layer
      // exists to prevent, arriving silently.
      if (!res.ok) await note(env, channel, event, `the live layer answered ${res.status}`)
    } catch (e) {
      await note(env, channel, event, e instanceof Error ? e.message : String(e))
    }
  })()
  // The failure path is INSIDE `send`, so a deferred ping records exactly what an
  // awaited one did — deferring must not cost the live layer its own audit.
  if (env.DEFER) return env.DEFER(send)
  await send
}

/** RECORD THE PING THAT DID NOT GO OUT.
 *
 * This hop is best-effort BY DESIGN — the write it describes has already
 * committed, the client is cache-first, and a live-layer hiccup must never fail
 * the action. None of that is an argument for being unable to answer "was the
 * live layer down last Tuesday, and for whom?", and until this landed neither
 * surface could: `error_logs` had no row, and the console line carried no team,
 * no resource and no id to group by, so the two best-effort hops in the whole
 * system were the two with no durable record. R12's principle ("unattended work
 * records its failures") applied to crons and not to the places that fail
 * silently on purpose.
 *
 * Still swallowed, still never thrown: `logError` cannot throw (its own contract)
 * and carries an hourly ceiling per bucket, so a live layer that is down for an
 * hour writes a bounded number of rows and not one per mutation. */
async function note(env: RealtimeEnv, channel: string, event: ChangeEvent, why: string): Promise<void> {
  const what = `${channel} ${event.resource}${event.id ? `/${event.id}` : ""}${event.op ? ` (${event.op})` : ""}`
  console.error("realtime publish failed:", what, why)
  if (env.DB)
    await logError(env.DB, {
      source: "realtime-publish",
      place: what,
      message: `a change ping was not delivered, so every open screen on this channel is showing yesterday until it remounts: ${why}`,
      // The CHANNEL carries the team, so "whose screens went stale" is answerable
      // from the row rather than from the message text.
      teamId: channel.startsWith("team:") ? channel.slice("team:".length) : undefined,
    })
}

/** Tell a TEAM's channel that one row in `resource` changed. `scope` is the
 * account the row belongs to — pass it for anything a client login is meant to
 * hear, because their socket is fenced by account and cannot check a row id. */
export async function publishChange(
  env: RealtimeEnv,
  teamId: string,
  resource: string,
  id?: string,
  op?: ChangeEvent["op"],
  scope?: string
): Promise<void> {
  await publish(env, `team:${teamId}`, { resource, id, op, scope })
}

/** Tell ONE user's channel (all their devices) that one identity row changed. */
export async function publishUserChange(
  env: RealtimeEnv,
  userId: string,
  resource: string,
  id?: string,
  op?: ChangeEvent["op"]
): Promise<void> {
  await publish(env, `user:${userId}`, { resource, id, op })
}

/** Force-sign-out one user's OTHER devices (e.g. after an email change). Carries
 * no id — the client re-checks auth and, if its session is dead, redirects to
 * login. The acting device keeps its (still-valid) session. */
export async function publishSignOut(env: RealtimeEnv, userId: string): Promise<void> {
  await publish(env, `user:${userId}`, { resource: "session", op: "session" })
}
