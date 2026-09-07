"use client"

// Kills the first-tap-per-module blank. On entering /t the in-memory cache Map
// starts empty, so the very first tap into a team tab shows a skeleton for a full
// round-trip. This hook background-primes ONLY the cheap, always-needed team-wide
// caches the moment the team shell mounts (or the team changes), so those taps
// paint from cache instead.
//
// It seeds through primeCacheIfCold, which fires each fetch in parallel, guards on
// `cache.has` (so it NEVER overwrites a warm or live-patched entry), and swallows
// any error. These are the EXACT keys + fetchers the team-area hooks use
// (deep-link-screen's roles/invites/selectable), so a prewarmed key is
// byte-for-byte what useCached would have fetched. It does NOT prewarm
// learning/tickets (module-scoped — may never be visited) or members (loaded only on
// the members tab, not team-wide). Pure seeding: no cache-first or live-sync change.
//
// ── AND IT WAITS FOR THE PERSON, WHICH IT DID NOT ──────────────────────────────
//
// A prewarm exists to make the NEXT tap free. It was firing in the same commit
// as the screen the person is actually waiting for, so on a cold deep link from
// an email (R30) three requests for taps that may never happen were competing
// with the read of the record on screen. That is the exact inversion the hop
// budget names: `MAX_REQUESTS_BEFORE_FIRST_PAINT` is a ceiling on requests
// BEFORE the record can be read, and a screen may warm anything it likes after.
//
// So it is deferred to the browser's own idle moment — `requestIdleCallback`
// where it exists, a macrotask where it does not (Safari). Not `useEffect`
// alone: an effect still runs inside the same frame as the first paint's own
// fetches, which is what it was already doing.
//
// `my-perms` IS NO LONGER HERE. The boot answer carries the caller's rights
// (`ActiveContext.permissions`) and `useActiveTeam` primes that key from it, so
// prewarming it would be a request for something already in hand.

import * as React from "react"

import { tenancy } from "@/lib/api"
import { primeCacheIfCold } from "@shared/web/store"
import { useAfterPaint } from "@shared/web/after-paint"

export function useTeamPrewarm(teamId: string | null): void {
  // The SAME gate the team-wide badge reads use, and it has to be: a bare idle
  // callback fires while the screen's own reads are still in flight, which is
  // the very thing this was moved off.
  const settled = useAfterPaint()
  React.useEffect(() => {
    if (!teamId || !settled) return
    // Reads with no dependency between them — fire them all in parallel. Each is
    // cold-guarded and error-swallowed inside primeCacheIfCold, and now joins a
    // real read already in flight instead of racing it.
    primeCacheIfCold(`member_roles:${teamId}`, () => tenancy.roles().then((r) => r.roles))
    primeCacheIfCold(`invites:${teamId}`, () => tenancy.invites().then((r) => r.invites))
    primeCacheIfCold(`selectable:${teamId}`, () => tenancy.selectable().then((r) => r.values))
  }, [teamId, settled])
}
