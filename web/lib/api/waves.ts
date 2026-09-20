// WAVES — the agency app's doors onto what a client bought.
//
// A file of its own beside the other four, for the reason the barrel next door
// gives: both gateway suites derive the app's whole attack surface from this
// DIRECTORY, so a door added in a new file beside them is covered the day it
// lands. These all answer at `/api/tenancy/…`, which is the tenancy worker and
// nothing else.
//
// EVERY ONE OF THEM REFUSES A CLIENT LOGIN at the worker (a wave is made of
// sprints, and a sprint row is the agency's own delivery record), so none of
// these paths may ever appear on the portal gateway's allow-list.

import { api } from "@shared/web/api"
import type { Wave, WaveOverlap, WavePhaseDay, WaveSprint } from "@shared/waves"

/* ------------------------------ the cache keys -----------------------------
 *
 * Beside the doors they cache, so the key and the fetch cannot drift — and so
 * the live registry (`web/lib/live-resources.ts`, R15) can import them as data
 * without the cycle it would create by living in a component. Same shape as
 * every other collection key: `<resource>:<teamId>`, which is also the resource
 * name the tenancy worker publishes, so a ping names the key it should drop. */

/** The team's waves — bounded (R14), read whole, narrowed per client on screen. */
export function wavesKey(teamId: string): string {
  return `waves:${teamId}`
}

/** ONE wave, with its sprints and their clashes. Its own key rather than a row
 * out of the list, because the record screen needs three things the list does
 * not carry — and because a wave's dates move when a SPRINT moves, which is a
 * ping the list row alone could not answer. */
export function waveOneKey(id: string): string {
  return `wave:one:${id}`
}

export const waves = {
  /** Every wave the caller may see, or one client's, one carrying a live
   * sprint of one type (`EXISTS`, the door's own — a wave has no such column),
   * or one covering one app (`app_id`, a real column since team migration
   * 0099 — cheap, unlike the sprint type facet). Bounded (R14), with the
   * door's exact COUNT(*) beside the rows (R16). None of the three is sent by
   * the sidebar collection today — it reads the whole bounded list once and
   * narrows in the browser (wave-finder.tsx's own header says why) — but the
   * door answers all three for any other caller. */
  list: (params?: { accountId?: string; sprintType?: string; appId?: string }) => {
    const q = new URLSearchParams()
    if (params?.accountId) q.set("accountId", params.accountId)
    if (params?.sprintType) q.set("sprintType", params.sprintType)
    if (params?.appId) q.set("appId", params.appId)
    const qs = q.toString()
    return api<{ waves: Wave[]; total: number }>(`/api/tenancy/waves${qs ? `?${qs}` : ""}`)
  },

  /** One wave, the sprints in it, any clash between their dates, and how many
   * days each phase type gets on it (always seven rows, defaults filled in
   * where nobody has set one, `PHASE_DAY_DEFAULTS`, shared/waves.ts). Four
   * answers in one round trip because they are one screen. */
  one: (id: string) =>
    api<{ wave: Wave; sprints: WaveSprint[]; overlaps: WaveOverlap[]; phaseDays: WavePhaseDay[] }>(
      `/api/tenancy/waves/one?id=${encodeURIComponent(id)}`
    ),

  create: (input: { accountId: string; name: string; goal?: string; appId?: string }) =>
    api<{ id: string }>("/api/tenancy/waves", { method: "POST", body: JSON.stringify(input) }),

  /** The DATES are deliberately not here: they are the sprints' answer, never a
   * field somebody types over. `appId` is TRI-STATE at the door: leave this key
   * out to keep whatever app the wave already covers, send `""`/`null` to
   * clear it, or a real id to set it — `undefined` here drops the key
   * entirely (`JSON.stringify`), which is "leave it alone". */
  update: (input: { id: string; name: string; goal?: string; appId?: string | null }) =>
    api<{ ok: true }>("/api/tenancy/waves/update", { method: "POST", body: JSON.stringify(input) }),

  setActive: (id: string, active: boolean) =>
    api<{ ok: true; moved: boolean }>("/api/tenancy/waves/active", {
      method: "POST",
      body: JSON.stringify({ id, active }),
    }),

  /** Put a sprint in a wave, or take it out (`waveId: null`). The response
   * carries any resulting overlap — a WARNING, never a refusal, so the write has
   * already landed by the time the screen reads it. */
  setSprint: (input: { sprintId: string; waveId: string | null }) =>
    api<{ ok: true; moved: boolean; overlaps: WaveOverlap[] }>("/api/tenancy/waves/sprint", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /** How many days one or more phase types get on this wave (the Settings
   * panel, Aurora's 20 Sep 2026 ruling). `days` names any subset of the
   * seven; the rest keep whatever they already carry. */
  setPhaseDays: (input: { waveId: string; days: { phaseType: string; days: number }[] }) =>
    api<{ ok: true; phaseDays: WavePhaseDay[] }>("/api/tenancy/waves/phase-days", {
      method: "POST",
      body: JSON.stringify(input),
    }),
}
