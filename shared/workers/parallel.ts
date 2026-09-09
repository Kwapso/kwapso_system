// INDEPENDENT READS, RUN AT ONCE — WITHOUT CHANGING WHICH REFUSAL A PERSON GETS.
//
// ── WHAT THIS IS FOR ────────────────────────────────────────────────────────
//
// A gated create in this app checks its inputs before it writes: is this client
// still on our books, is this app still live, is this module part of that app,
// is this person really a contact there. Each check is one statement, and every
// statement is a separate HTTPS round trip to the D1 REST door — measured 25 Aug
// 2026 at ~150ms, for SQL the database itself reports finishing in under a
// millisecond (see d1-rest.ts). Written as `await` on its own line, six checks
// is ~900ms of a ~1,500ms create, and 99.7% of that is the trip and not the
// query (measured again 5 Sep 2026: 552ms of wall clock for 2.17ms of database).
//
// Most of those checks do not depend on each other. `rank` depends on nothing at
// all; the app and the client are two separate questions. Running the
// independent ones together turns six trips into two or three WAVES, and the
// screen waits for the slowest rather than the sum.
//
// ── WHY NOT PLAIN `Promise.all` ─────────────────────────────────────────────
//
// Because `Promise.all` rejects with whichever promise rejects FIRST IN TIME,
// and a sequence of `await`s rejects with the first one IN ORDER. Those are the
// same thing only while at most one can fail. Submit a form naming both a
// deleted client and a deleted app and the sequential code has always said
// "That client isn't on your books any more"; under `Promise.all` it would say
// whichever refusal the network happened to return first, and would say a
// different one on a re-run. That is a change to what a person is told, which is
// not something a speed fix is allowed to do quietly.
//
// So: settle them all, then throw the FIRST REJECTION IN ARRAY ORDER. Identical
// refusal, identical wording, identical every time — and one wave instead of N
// trips.
//
// ── THE ONE RULE FOR CALLERS ────────────────────────────────────────────────
//
// **ONLY READS GO IN A WAVE.** Every task here RUNS, including the ones a
// sequence would have skipped by throwing before it reached them. For a SELECT
// that is free — a statement that read a row and then threw the earlier task's
// error changed nothing. For a WRITE it is not: `nextTeamRef` mints the next
// reference number, and running it beside a check that fails would burn a number
// out of the sequence a client quotes. Writes stay on their own line, after the
// wave that decides whether they should happen.

/** Run independent promises together and settle in ARRAY order — see the header.
 *
 * Takes promises rather than thunks on purpose: at the call site the reads then
 * read as an array of the same expressions they were as `await`s, so the diff
 * from the sequential version is exactly the parallelism and nothing else. */
export async function inOrder<T extends readonly unknown[]>(
  work: readonly [...{ [K in keyof T]: Promise<T[K]> }]
): Promise<T> {
  const settled = await Promise.allSettled(work)
  for (const r of settled) if (r.status === "rejected") throw r.reason
  return settled.map((r) => (r as PromiseFulfilledResult<unknown>).value) as unknown as T
}

// ── AND THE OTHER HALF: WORK THE CALLER DOES NOT NEED ────────────────────────
//
// `inOrder` is about doing independent work TOGETHER. This is about doing work
// the person is not waiting for AFTER they have their answer.
//
// `ctx.waitUntil` appeared ZERO times in this repository until 5 Sep 2026, so
// every outbound email, every crash row and every best-effort side errand was
// awaited before the response — including several whose own comments already
// said they must not be able to fail the thing that triggered them ("Best-effort
// and last: a failed email must never fail the answer"). The comment described
// the INTENT; the `await` in front of it described the behaviour.
//
// WHAT MAY GO HERE, and the rule is narrow on purpose:
//
//   • The caller cannot observe the outcome. These are the calls that already
//     swallow their own failures — a notifier wrapped in try/catch, a crash row
//     written on the way to returning a 500. If a caller could see whether it
//     worked, deferring it changes an answer, and that is not a speed fix.
//   • It starts NOW. The promise is created at the call site and handed here, so
//     the outbound request leaves at exactly the moment it left before. Nobody
//     downstream is told anything LATER; only the clicker is told sooner.
//
// `publishChange` AND `logActivity` NOW GO HERE TOO — 6 September 2026.
//
// They were excluded when this file was written, on the grounds that
// `shared/workers/realtime.ts` carried a recorded decision ("THE PING MUST NOT
// OUTLIVE THE WRITE IT DESCRIBES") and that re-reading a recorded decision is
// the owner's to do rather than a speed lane's. The owner has now done exactly
// that, in answer to "say 'saved' straight away, and finish the history entry a
// moment later?" — yes. realtime.ts records the overturn beside the sentence it
// overturns; this is the other half of it.
//
// PROVENANCE, because a decision is only as good as its trail: that answer
// reached this lane RELAYED rather than typed into it, and was written down that
// way before it could be checked — deliberately, because a code change is
// reversible and a false attribution in a comment is not.
//
// SINCE CONFIRMED, FIRST-HAND: the decision went to the owner as a numbered
// list, and against the item "Say 'saved' straight away, and finish the history
// entry a moment later?" his reply was the single word "yes", in his own
// message. The chain is recorded rather than collapsed because the next reader
// deserves to know which parts were seen and which were relayed.
//
// NEITHER IS OBSERVABLE BY THE CALLER, which is the rule above and the reason
// they qualify. `logActivity` already swallows and self-reports its own failures
// (activity.ts), and `publish` already catches its own (realtime.ts) — both were
// best-effort before this and are best-effort after it. What changes is only who
// waits: the clicker no longer does.
//
// HOW THEY REACH THIS SEAM, by two different roads because they take two
// different first arguments. Neither costs a call site anything:
//
//   • `logActivity(cfg, …)` rides `cfg.defer`. `cfg` is built fresh per request
//     in gating.ts and already carries `stats` from `beginD1Timing` there, so
//     the deferrer sits on the line below it, per-request for the same reason.
//   • `publishChange(env, …)` rides `env.DEFER`. `env` is per-ISOLATE and
//     shared, so it cannot carry per-request state — the dispatcher therefore
//     hands each handler a per-request SHALLOW COPY with the deferrer on it.
//     Bindings copy by reference; the copy belongs to the request, so two
//     requests can never share one.
//
// A caller with neither (a cron tick, a unit test, a lib called directly) awaits
// them exactly as before — the same fallback `canDefer` already has, and the
// reason no test needed changing.

/** The half of `ExecutionContext` this needs. Typed structurally so `shared/`
 * keeps compiling in the web workspaces, which have no Workers types — the same
 * reason `whoAmI` in gating.ts casts rather than imports. */
export type Deferrer = { waitUntil(work: Promise<unknown>): void }

const contexts = new WeakMap<Request, Deferrer>()

/** Hand this request its `ExecutionContext`, at the top of a worker's `fetch`.
 * Keyed on the Request for the same reason `timing.ts` keys its trip collector
 * there: a worker isolate serves many requests at once, so a module-level
 * "current context" is a race that attaches one caller's work to another
 * caller's lifetime.
 *
 * OPTIONAL, because the suites call each worker's `fetch` with two arguments —
 * there is no runtime to hand out a context. A request with none behaves exactly
 * as it did before this seam existed: the work still runs, awaited by nobody.
 * Making it required would have meant editing several hundred test call sites to
 * pass a stub, which is a lot of churn to buy nothing. */
export function canDefer(request: Request, ctx: Deferrer | undefined): void {
  if (ctx) contexts.set(request, ctx)
}

/** Let the response go without waiting for this.
 *
 * With a context, `waitUntil` GUARANTEES the work completes — this is deferral,
 * never fire-and-forget. Without one (a cron tick, a unit test, a lib called
 * directly) the promise still runs and its failure is still logged; it simply
 * has no lifetime to be extended, which is the honest behaviour rather than a
 * silent drop. Either way this never throws: work the caller cannot observe must
 * not be able to fail the request that started it. */
export function afterResponse(request: Request, work: Promise<unknown>): void {
  const settled = work.catch((e) => console.error("deferred work failed:", e))
  contexts.get(request)?.waitUntil(settled)
}

/** This request's deferrer, as a value something can carry — for the two seams
 * handed a per-request object (`cfg`, a scoped `env`) rather than the Request
 * itself.
 *
 * `undefined` WHEN THERE IS NO LIFETIME TO DEFER ONTO, and that is the whole
 * point of this function rather than inlining `afterResponse`.
 *
 * `afterResponse` is `waitUntil`-or-nothing: with no registered context the work
 * runs and NOBODY awaits it. That is correct for its original callers, which
 * were already fire-and-forget side errands started inside a handler that then
 * returned — losing one is what "best-effort" meant there. It is NOT correct for
 * `publishChange` and `logActivity`, which were AWAITED before this seam existed.
 * Handing them an always-present deferrer would quietly convert "awaited" into
 * "nobody is watching" wherever no context was passed — and that failure is
 * invisible by construction: no error, no red suite, just a row that is
 * sometimes absent.
 *
 * So the absence is reported honestly, and the seams await when they see it. In
 * a deployed worker `canDefer` has always run by the time this is called, so the
 * deferred path is the real one; a cron tick, a lib called directly and every
 * suite that calls `fetch(request, env)` with two arguments get the behaviour
 * they had before. `deferred-side-work.test.ts` fails if this ever returns a
 * function that drops work. */
export function deferrerFor(request: Request): ((work: Promise<unknown>) => void) | undefined {
  if (!contexts.has(request)) return undefined
  return (work) => afterResponse(request, work)
}
