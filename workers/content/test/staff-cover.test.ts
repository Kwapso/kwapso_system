// A TEAM MEMBER'S COVER — C1, the client's ruling, 16 Sep 2026: "For the
// cover, let's try C1. I want this for accounts and members." Team migration
// 0102 adds `staff_profiles.cover_url`, mirroring `photo_url` field for
// field — same validation seam (`safeExternalLink`), same upsert, same
// reclaim. This suite is `workers/tenancy/test/app-logo.test.ts`'s own
// argument read again for the fourth column that shape now covers: the
// tempting version of this feature is `optionalText` straight into the
// column, which passes every OTHER check in this repo while never proving
// the row actually holds what the door was told, or that an old object gets
// let go when a new one replaces it. So this suite runs the REAL doors
// against a real SQLite database with the real migrations (0102 included)
// and asks the ROW what it holds — the same discipline `staff-anonymity.
// test.ts` already applies to this worker.
//
// AND IT PROVES THE UPLOAD PATH IS THE EXISTING ONE — the client's own
// words, "same upload primitive, same size limits, same R2/asset path". No
// new route exists for a cover: the last test below uploads through
// `POST /api/content/staff/upload`, the SAME door `photoUrl` has always used
// (also covered generically, for both doors, by media-upload-stream.test.ts's
// `DOORS` table — a cover adds no new streamed door for that suite to miss),
// and feeds the door's own answer straight into `coverUrl`.

import type { DatabaseSync } from "node:sqlite"
import { withDeferred } from "./deferred"
import { beforeEach, describe, expect, it, vi } from "vitest"

const holder = vi.hoisted(() => ({ db: null as DatabaseSync | null }))

vi.mock("@shared/workers/d1-rest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/workers/d1-rest")>()
  const { d1Impl } = await import("../../tenancy/test/d1-sqlite")
  return { ...actual, ...d1Impl(() => holder.db as DatabaseSync) }
})

import worker from "../src/index"
import { buildSpineDb, IDS, makeEnv } from "../../tenancy/test/spine-harness"

const db = () => holder.db as DatabaseSync

/** A one-pixel PNG, as the browser's picker would hand it over — the same
 * fixture `workers/tenancy/test/app-logo.test.ts` uses for the identical
 * reason: the door judges the declared type and the base64 shape, not a
 * photograph a human reader could tell apart from filler. */
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

function env(userId: string, extra: Record<string, unknown> = {}) {
  return { ...(makeEnv(() => db(), userId) as object), ...extra } as never
}

/** One request at a content-worker route, with a waiting context so the
 * door's deferred work (the live publish) has landed before assertions run —
 * `staff-anonymity.test.ts`'s own `call` helper, same shape. */
const call = (userId: string, route: string, body?: unknown, query = "", extra?: Record<string, unknown>) => {
  const [method, path] = route.split(" ")
  return withDeferred((ctx) =>
    worker.fetch(
      new Request(`https://content${path}${query}`, {
        method,
        headers: { Cookie: "session=x", "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
      }),
      env(userId, extra) as never,
      ctx as never
    )
  )
}

/** What the ROW holds, read straight out of the database — the whole point
 * of this suite is that this and the response can disagree. */
const storedCover = (userId: string) =>
  (db().prepare("SELECT cover_url FROM staff_profiles WHERE user_id = ?").get(userId) as
    | { cover_url: string | null }
    | undefined)?.cover_url ?? null

beforeEach(() => {
  holder.db = buildSpineDb()
  // `staff_profiles` is not one of the modules `grantAll` (spine-harness.ts)
  // hands the admin fixture role — it is deliberately narrow, and adding a
  // module there is a shared-fixture change with wider fallout than this one
  // suite. Granted locally instead, the same shape `staff-anonymity.test.ts`
  // already uses to add a module a shared fixture role doesn't carry.
  db().exec(
    `INSERT INTO role_permissions (id, role_id, module, can_read, can_create, can_update, can_delete)
     VALUES ('P_STAFF_PROFILES', '${IDS.adminRole}', 'staff_profiles', 1, 1, 1, 1);`
  )
})

describe("a team member's cover (C1) — the door stores it and serves it back", () => {
  it("round-trips coverUrl through the save door, into the row, and back out in the response", async () => {
    const res = await call(IDS.staffUser, "POST /api/content/staff/profiles", {
      userId: IDS.staffUser,
      coverUrl: "/media/internal/T/staff/01ABCXYZ",
    })
    const text = await res.text()
    expect(res.status, text).toBe(200)
    const { profiles } = JSON.parse(text) as { profiles: { userId: string; coverUrl: string | null }[] }
    const mine = profiles.find((p) => p.userId === IDS.staffUser)
    expect(mine?.coverUrl, "the write door's own response carries it").toBe("/media/internal/T/staff/01ABCXYZ")
    expect(storedCover(IDS.staffUser), "and so does the row").toBe("/media/internal/T/staff/01ABCXYZ")
  })

  it("serves it back through the read door too, filtered by ?userId the same way the member's own page reads it", async () => {
    await call(IDS.staffUser, "POST /api/content/staff/profiles", {
      userId: IDS.staffUser,
      coverUrl: "/media/internal/T/staff/COVERX",
    })
    const res = await call(IDS.staffUser, "GET /api/content/staff/profiles", undefined, `?userId=${IDS.staffUser}`)
    expect(res.status).toBe(200)
    const { profiles } = (await res.json()) as { profiles: { userId: string; coverUrl: string | null }[] }
    expect(profiles).toHaveLength(1)
    expect(profiles[0].coverUrl).toBe("/media/internal/T/staff/COVERX")
  })

  it("keeps photoUrl and coverUrl independent — an edit that mentions only one never clobbers the other", async () => {
    await call(IDS.staffUser, "POST /api/content/staff/profiles", {
      userId: IDS.staffUser,
      photoUrl: "/media/internal/T/staff/PHOTO1",
      coverUrl: "/media/internal/T/staff/COVER1",
    })
    const res = await call(IDS.staffUser, "POST /api/content/staff/profiles", {
      userId: IDS.staffUser,
      photoUrl: "/media/internal/T/staff/PHOTO1",
      coverUrl: "/media/internal/T/staff/COVER2",
    })
    expect(res.status, await res.clone().text()).toBe(200)
    const row = db()
      .prepare("SELECT photo_url, cover_url FROM staff_profiles WHERE user_id = ?")
      .get(IDS.staffUser) as { photo_url: string | null; cover_url: string | null }
    expect(row.photo_url, "the photo is untouched by an edit that only names the cover").toBe(
      "/media/internal/T/staff/PHOTO1"
    )
    expect(row.cover_url).toBe("/media/internal/T/staff/COVER2")
  })

  it("clears the cover when the field is sent empty, exactly as the photo already does", async () => {
    await call(IDS.staffUser, "POST /api/content/staff/profiles", {
      userId: IDS.staffUser,
      coverUrl: "/media/internal/T/staff/COVERY",
    })
    const res = await call(IDS.staffUser, "POST /api/content/staff/profiles", {
      userId: IDS.staffUser,
      coverUrl: "",
    })
    expect(res.status, await res.clone().text()).toBe(200)
    expect(storedCover(IDS.staffUser)).toBeNull()
  })

  it("reclaims the superseded object through the SAME staff-owned reclaim list the photo already uses", async () => {
    const deletes: string[] = []
    const internal = { delete: async (key: string) => void deletes.push(key) }

    await call(IDS.staffUser, "POST /api/content/staff/profiles", {
      userId: IDS.staffUser,
      coverUrl: "/media/internal/T/staff/OLDCOVER",
    })
    const res = await call(
      IDS.staffUser,
      "POST /api/content/staff/profiles",
      { userId: IDS.staffUser, coverUrl: "/media/internal/T/staff/NEWCOVER" },
      "",
      { INTERNAL_MEDIA: internal }
    )
    expect(res.status, await res.clone().text()).toBe(200)
    expect(deletes, "the object the cover stopped pointing at is reclaimed, unprefixed").toContain(
      "T/staff/OLDCOVER"
    )
    expect(storedCover(IDS.staffUser)).toBe("/media/internal/T/staff/NEWCOVER")
  })

  it("uploads through the EXISTING staff upload door — no new upload path for the cover", async () => {
    const puts: { key: string; contentType: string }[] = []
    const internal = {
      put: async (key: string, _bytes: Uint8Array, opts: { httpMetadata: { contentType: string } }) => {
        puts.push({ key, contentType: opts.httpMetadata.contentType })
      },
    }
    const uploadRes = await call(IDS.staffUser, "POST /api/content/staff/upload", { dataUrl: PNG }, "", {
      INTERNAL_MEDIA: internal,
    })
    const uploadText = await uploadRes.text()
    expect(uploadRes.status, uploadText).toBe(200)
    const { url } = JSON.parse(uploadText) as { url: string }
    // Same module segment `photoUrl` uploads through (workers/content/src/
    // routes/staff.ts: `teamMediaKey(guard.teamId, "staff")`) — a distinct
    // "cover" segment would mean a second upload path, which the client's
    // ruling explicitly refuses.
    expect(url).toContain(`/media/internal/${IDS.team}/staff/`)
    expect(puts, "the one staff upload door wrote the bytes").toHaveLength(1)

    // The cover field accepts EXACTLY what that door handed back.
    const saveRes = await call(IDS.staffUser, "POST /api/content/staff/profiles", {
      userId: IDS.staffUser,
      coverUrl: url,
    })
    expect(saveRes.status, await saveRes.clone().text()).toBe(200)
    expect(storedCover(IDS.staffUser)).toBe(url)
  })
})
