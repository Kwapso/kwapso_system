"use client"

// ONE place every screen asks "may I?" — mirrors the server's rights in the UI
// so you never see an action you can't perform (defense in depth: the server
// still enforces every write). Reads the SAME cached `my-perms:<teamId>` the
// page guard uses, so there's no extra fetch and it refreshes live when a role
// changes (AppShell invalidates it on a member_roles ping).

import type { PermissionValue } from "@shared/types"

import { tenancy } from "@/lib/api"
import { clearCache, primeCache, readCache, useCached } from "@shared/web/store"

export type Right = "read" | "create" | "edit" | "delete"
export type Can = (module: string, right: Right) => boolean

/** Your effective rights for a team + a `can(module, right)` check. While rights
 * are still loading, `can` returns false (so actions stay hidden until known).
 *
 * `error` IS RETURNED, and it has to be, because of where this hook sits. Every
 * record detail in the app opens by asking this hook whether you may read the
 * module — and the caller could only ask whether `perms` was still `undefined`,
 * which is true both while the answer is coming AND for ever after it failed.
 * So a single unlucky rights fetch — a cold worker, one 500 — froze navigation
 * into EVERY record type at once, behind a loading skeleton, until a hard
 * reload. The one hook nothing can render without was the one that could not
 * say it had failed.
 *
 * `can` stays false on an error, deliberately: an unknown right is not a
 * granted one, and the server refuses regardless. */
export function usePermissions(teamId: string | null): {
  perms: PermissionValue | undefined
  loading: boolean
  error: unknown
  can: Can
} {
  const q = useCached<PermissionValue>(teamId ? `my-perms:${teamId}` : null, () =>
    tenancy.myPermissions().then((r) => r.permissions)
  )
  const perms = q.data
  const can: Can = (module, right) => perms?.[module]?.[right] === true
  return { perms, loading: q.loading, error: q.error, can }
}

/** MY RIGHTS JUST CHANGED — so everything I am holding was fetched by somebody
 * with different rights, and some of it I may no longer read.
 *
 * ── THE HOLE THIS CLOSES ────────────────────────────────────────────────────
 *
 * A `member_roles` or `members` ping already invalidated `my-perms`, so the
 * BUTTONS re-hid correctly and the nav dropped the section. The ROWS stayed.
 * `clearCache()` is called at sign-out and at a team or company switch, on the
 * reasoning written above it — that those change WHO IS ASKING, and a cache
 * keyed by resource and team still holds rows the next identity may not read.
 * Revoking somebody's `accounts:read` while they have the accounts list open
 * changes who is asking just as completely, and nothing called it: the list they
 * were already looking at kept painting from memory until the ten-minute age
 * ceiling or a remount, whichever came first.
 *
 * ── WHY IT COMPARES RATHER THAN JUST CLEARING ───────────────────────────────
 *
 * Clearing on every `member_roles` ping would be correct and horrible: any admin
 * renaming any role would empty every open tab in the team and refetch every
 * screen for everybody. The ping says a role MOVED, not that YOUR rights did —
 * and almost every one of them is somebody else's row. So this asks the door
 * what the caller may do now, compares it with what they were being shown a
 * moment ago, and only clears when the answer actually differs. The person whose
 * rights changed pays one refetch; nobody else pays anything.
 *
 * ── THE ORDER IS LOAD-BEARING ───────────────────────────────────────────────
 *
 * The fresh rights are primed AFTER the clear, never before — `clearCache()`
 * takes every key including this one, and a shell left holding no rights at all
 * renders as "you may do nothing" until the next fetch resolves, which is a
 * worse lie than the stale rows were.
 *
 * Best-effort: a failed fetch leaves the cache exactly as it was and the ordinary
 * `useCached` path re-asks. Widening what somebody can see is never this
 * function's doing — the door still refuses every read on its own. */
export async function revalidateRights(teamId: string): Promise<void> {
  const key = `my-perms:${teamId}`
  const before = readCache<PermissionValue>(key)
  let after: PermissionValue
  try {
    after = (await tenancy.myPermissions()).permissions
  } catch {
    return
  }
  // A structural compare, not a reference one: this value is rebuilt by every
  // fetch, so it is never the same object twice and `!==` would clear always.
  //
  // NOTHING CACHED YET FALLS THROUGH TO THE CLEAR, deliberately. `before` is
  // undefined when a ping lands before the rights read has resolved — early in a
  // boot — and there is then no old answer to prove the rights did NOT move. The
  // safe direction is the same one the rest of the gate takes: an unknown is not
  // a match. It costs one refetch on a cache that was barely warm.
  if (before !== undefined && JSON.stringify(before) === JSON.stringify(after)) {
    primeCache(key, after)
    return
  }
  clearCache()
  primeCache(key, after)
}
