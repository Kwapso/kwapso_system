// ONE FILE'S REFUSAL IS ONE FILE'S — the regression this suite locks.
//
// `driveFileText` throwing mid-loop used to take every file after it with it:
// `readGoogleMaterial`'s Drive loop and `hydrateText`'s hydration loop both
// called it with no catch, so a single file Google would not hand over (a
// metadata 403, a timeout, a socket that dropped mid-download) turned a whole
// read into nothing — the loop stopped, and the message named no file at all.
// `google-drive-text.test.ts` proves `driveFileText` ITSELF is honest about a
// download refusal (403 → "", 401 → throw); this suite proves the CALLERS in
// google-read.ts no longer let any throw from it end the run, and that the
// file it happened to is named rather than swallowed into silence.
//
// `google_access_lost` (401) is the one exception, and it is asserted here too:
// a dead token would otherwise be tolerated once per file and the whole read
// would come back looking like a clean, empty pass — worse than the bug this
// fixes.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GuardError } from "@shared/workers/gating"
import type { MemberGuard } from "@shared/workers/gating"
import type { GoogleItem, GoogleSource } from "@shared/types"

const holder = vi.hoisted(() => ({
  /** Drive files a "named folder" listing answers with. */
  files: [] as {
    id: string
    name: string
    mimeType: string
    modifiedTime: string | null
    webViewLink: string | null
    folderId: string
  }[],
  /** fileId → the error `driveFileText` throws for it, when it throws at all. */
  fails: new Map<string, Error>(),
  /** fileId → the text `driveFileText` answers with, when it does not throw. */
  text: new Map<string, string>(),
}))

vi.mock("../src/lib/google", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/google")>()
  return {
    ...actual,
    listNamedSources: async (): Promise<GoogleSource[]> => [
      {
        id: "SRC1",
        connectionId: "CONN1",
        userId: "USER1",
        service: "drive",
        externalId: "FOLDER1",
        name: "Bergman shared folder",
        shelf: "team",
        kind: "folder",
        accountId: null,
        accountName: null,
        active: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        creatorName: null,
        updatedAt: null,
        editorName: null,
      },
    ],
    accessTokenFor: async () => ({ token: "tok", connectionId: "CONN1", grantedScopes: "" }),
  }
})

vi.mock("../src/lib/google-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/google-api")>()
  return {
    ...actual,
    driveList: async (_token: string, folderIds: string[]) => (folderIds.length ? holder.files : []),
    driveFilesById: async () => [],
    driveFileText: async (_env: unknown, _token: string, fileId: string) => {
      const fail = holder.fails.get(fileId)
      if (fail) throw fail
      return holder.text.get(fileId) ?? ""
    },
  }
})

const { readGoogleMaterial, hydrateText } = await import("../src/lib/google-read")

const guard: MemberGuard = { userId: "USER1", teamId: "TEAM1", roleId: "ROLE1", databaseId: "DB1" }
const env = {} as never
const cfg = {} as never

beforeEach(() => {
  holder.files = [
    {
      id: "FILE_A",
      name: "Before the refusal",
      mimeType: "text/plain",
      modifiedTime: "2026-09-01T00:00:00.000Z",
      webViewLink: "https://drive.example/FILE_A",
      folderId: "FOLDER1",
    },
    {
      id: "FILE_B",
      name: "The one Google refuses",
      mimeType: "text/plain",
      modifiedTime: "2026-09-02T00:00:00.000Z",
      webViewLink: "https://drive.example/FILE_B",
      folderId: "FOLDER1",
    },
    {
      id: "FILE_C",
      name: "After the refusal",
      mimeType: "text/plain",
      modifiedTime: "2026-09-03T00:00:00.000Z",
      webViewLink: "https://drive.example/FILE_C",
      folderId: "FOLDER1",
    },
  ]
  holder.fails = new Map()
  holder.text = new Map([
    ["FILE_A", "the words in A"],
    ["FILE_C", "the words in C"],
  ])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("readGoogleMaterial — one file's refusal is not the whole read's", () => {
  it("skips the refused MIDDLE file and still reads the ones after it, named", async () => {
    holder.fails.set(
      "FILE_B",
      new GuardError(403, "google_forbidden", "Google wouldn't allow that — this item may not be shared with you.")
    )
    const said: string[] = []
    const realError = console.error
    console.error = (...a: unknown[]) => void said.push(a.map(String).join(" "))
    let result: Awaited<ReturnType<typeof readGoogleMaterial>>
    try {
      result = await readGoogleMaterial(env, cfg, guard, { services: ["drive"], withText: true })
    } finally {
      console.error = realError
    }

    // THE REGRESSION: before the fix, the throw from FILE_B escaped the loop and
    // FILE_C — everything after the refused file — was never reached at all.
    expect(result.items.map((i) => i.externalId)).toEqual(["FILE_A", "FILE_B", "FILE_C"])
    const byId = new Map(result.items.map((i) => [i.externalId, i]))
    expect(byId.get("FILE_A")?.text).toBe("the words in A")
    expect(byId.get("FILE_C")?.text, "the file after the refusal must still be read").toBe(
      "the words in C"
    )
    expect(byId.get("FILE_B")?.text, "the refused file has nothing to show, not somebody else's text").toBe(
      ""
    )

    // AND THE PERSON MUST BE TOLD WHICH FILE — collected on the return value...
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].title).toBe("The one Google refuses")
    expect(result.skipped[0].reason).toContain("Google wouldn't allow")
    // ...and written to the log, the channel this codebase already reads for a
    // Google refusal (see google-drive-text.test.ts's identical assertion on
    // driveFileText's own 401 line).
    const line = said.find((s) => s.includes("The one Google refuses"))
    expect(line, "the log must name the file that was skipped").toBeDefined()
  })

  it("still aborts the whole read on a DEAD CONNECTION (401), rather than swallowing it per file", async () => {
    holder.fails.set(
      "FILE_B",
      new GuardError(409, "google_access_lost", "Google wouldn't allow that any more. Connect it again in Settings.")
    )
    await expect(
      readGoogleMaterial(env, cfg, guard, { services: ["drive"], withText: true })
    ).rejects.toMatchObject({ code: "google_access_lost" })
  })
})

describe("hydrateText — one item's refusal is not the slice's", () => {
  const items = (): GoogleItem[] => [
    {
      service: "drive",
      sourceId: "SRC1",
      externalId: "FILE_A",
      title: "Before the refusal",
      url: null,
      text: "",
      updatedAt: null,
      shelf: "team",
      ownerUserId: "USER1",
      accountId: null,
    },
    {
      service: "drive",
      sourceId: "SRC1",
      externalId: "FILE_B",
      title: "The one Google refuses",
      url: null,
      text: "",
      updatedAt: null,
      shelf: "team",
      ownerUserId: "USER1",
      accountId: null,
    },
    {
      service: "drive",
      sourceId: "SRC1",
      externalId: "FILE_C",
      title: "After the refusal",
      url: null,
      text: "",
      updatedAt: null,
      shelf: "team",
      ownerUserId: "USER1",
      accountId: null,
    },
  ]

  it("skips the refused MIDDLE item and still hydrates the ones after it, named", async () => {
    holder.fails.set(
      "FILE_B",
      new GuardError(403, "google_forbidden", "Google wouldn't allow that — this item may not be shared with you.")
    )
    const said: string[] = []
    const realError = console.error
    console.error = (...a: unknown[]) => void said.push(a.map(String).join(" "))
    let result: Awaited<ReturnType<typeof hydrateText>>
    try {
      result = await hydrateText(env, cfg, guard, items())
    } finally {
      console.error = realError
    }

    const byId = new Map(result.items.map((i) => [i.externalId, i]))
    expect(byId.get("FILE_A")?.text).toBe("the words in A")
    expect(byId.get("FILE_C")?.text, "the item after the refusal must still be hydrated").toBe(
      "the words in C"
    )
    // An item whose text could not be read keeps what it already had (here: "").
    expect(byId.get("FILE_B")?.text).toBe("")

    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0].title).toBe("The one Google refuses")
    const line = said.find((s) => s.includes("The one Google refuses"))
    expect(line, "the log must name the item that was skipped").toBeDefined()
  })

  it("still aborts the whole hydration on a DEAD CONNECTION (401)", async () => {
    holder.fails.set(
      "FILE_B",
      new GuardError(409, "google_access_lost", "Google wouldn't allow that any more. Connect it again in Settings.")
    )
    await expect(hydrateText(env, cfg, guard, items())).rejects.toMatchObject({
      code: "google_access_lost",
    })
  })
})
