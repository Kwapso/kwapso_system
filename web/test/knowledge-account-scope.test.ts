// THE ACCOUNT RECORD'S OWN KNOWLEDGE TAB — Aurora's ruling, 22 Sep 2026,
// verbatim: "on accounst/knoweledge, 1. tehres too much blank space begfore
// teh content 2. replicate how it looks in main knowelegde, search, button to
// ask, preview the content, filters by type.. etc." — then, over BOTH record
// hosts: "same for knowelegde inside apps," and "in knoweledge when isnide
// app or acount, make ask a button in the toolbar."
//
// BEFORE THIS CHANGE the account record's Knowledge tab was not a thinner
// gallery, it was NO gallery at all — account-detail.tsx mounted
// `<AskTheAssistant>` alone, no toolbar, no cards, no filters. This is the
// "too much blank space" she measured: a small ask box, then bare page
// ground the rest of the way to the record's own footer band.
//
// FIVE PROOFS, off the real call sites — the same "read source off disk"
// technique this screen's own sibling test (knowledge-app-scope.test.ts)
// already uses, and for the identical reason given there.
//
//   1. THE SCOPE TYPE EXISTS. `KnowledgeGalleryScope` carries a real "account"
//      variant (`accountId`, `accountName`), the same shape "app" already is.
//   2. THE ACCOUNT SCOPE'S OWN READ NARROWS BY COMPARTMENT, over the same
//      `sliceKey` seam every record-hosted collection uses, and is COUNTED
//      (R16) through `shared/record-counts.ts` + the content door's own
//      `record-counts.ts`, the identical registry the app scope's own
//      `knowledge-app` line already rides.
//   3. THE LIST STAYS LIVE (R15): `live-resources.ts`'s `knowledge` entry
//      drops the account's own gallery cache by prefix, the same way it
//      already drops the app's.
//   4. ASK OPENS A NEW, ACCOUNT-SCOPED CONVERSATION, never "knowledge" (the
//      whole team's base) and never a second `<AskTheAssistant>` box.
//   5. THE GALLERY IS THE SHARED ONE — no second card, no second toolbar: the
//      account branch reaches the identical `renderGallery()`/`<PagedFind>`
//      tree the team and app scopes already read, narrowed by a `fixed`
//      prop and an empty state of its own, never a second implementation.
//
// THE SWAP ON account-detail.tsx ITSELF, done the same session this comment
// changed: it held the file until then (another lane's boundary while it was
// held), and now mounts `<KnowledgeScreen scope={{ kind: "account", … }}>`
// on its own Knowledge tab, exactly the shape `knowledge-app-scope.test.ts`
// already proves for app-detail.tsx — see the describe block below, mirrored
// line for line off that file's own first block.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8")
}

describe('the "account" scope is a real KnowledgeGalleryScope variant', () => {
  it('carries accountId and accountName, the same shape "app" already is', () => {
    const src = read("web", "components", "knowledge", "knowledge-screen.tsx")
    const at = src.indexOf("export type KnowledgeGalleryScope")
    expect(at, "the scope union").toBeGreaterThan(-1)
    const unionTag = src.slice(at, at + 2600)
    expect(unionTag, 'a third arm, kind: "account"').toMatch(/kind:\s*"account"/)
    expect(unionTag, "its own id").toMatch(/accountId:\s*string/)
    expect(unionTag, "its own name, for the empty state and the Ask conversation's label").toMatch(
      /accountName:\s*string/
    )
  })
})

describe("the account scope's own read narrows by compartment (R14, R16)", () => {
  it("knowledge-screen.tsx asks the door for `compartment`, over the sliceKey seam every record-hosted collection uses", () => {
    const src = read("web", "components", "knowledge", "knowledge-screen.tsx")
    expect(src, "the account scope's own resting read").toMatch(
      /compartment:\s*accountCompartment\(isAccount \? scope\.accountId : ""\)/
    )
    expect(src, "the same sliceKey seam sprints/stories/tickets/meetings/deliverables/knowledge-app already use").toMatch(
      /sliceKey\("knowledge-account",\s*scope\.accountId\)/
    )
    // fixed={{ compartment }} is what makes every SEARCHED/SORTED/FILTERED
    // page ask the same narrowed question too — not only the resting read.
    expect(src, "the paged find's own fixed narrowing").toMatch(
      /isAccount\s*\n?\s*\?\s*\{ compartment: accountCompartment\(scope\.accountId\) \}/
    )
    // THE EXACT STRING THE DOOR MATCHES — `account:<id>`, never a bespoke
    // local shape that happens to look similar.
    expect(src, "the compartment string the door itself builds and matches").toMatch(
      /function accountCompartment\(accountId: string\): string \{\s*return `account:\$\{accountId\}`/
    )
  })

  it("the door already parses and filters by `compartment` — the account scope rides an existing, gated path", () => {
    const route = read("workers", "content", "src", "routes", "knowledge.ts")
    expect(route, "the query is read at the boundary (R20)").toMatch(
      /compartment:\s*queryText\(url\.searchParams\.get\("compartment"\),\s*"Compartment"\)/
    )
    const lib = read("workers", "content", "src", "lib", "knowledge.ts")
    expect(lib, "SourceFilters carries it").toMatch(/compartment\?:\s*string/)
    expect(lib, "the WHERE clause narrows by it").toMatch(/if \(filter\.compartment\)/)
    expect(lib, "the account's own compartment string is built in exactly one place").toMatch(
      /export const accountCompartment = \(accountId: string\): string => `account:\$\{accountId\}`/
    )
  })

  it("the account's own knowledge total is a real R16 count, through the shared record-counts registry", () => {
    const registry = read("shared", "record-counts.ts")
    const accountsAt = registry.indexOf("accounts: [")
    expect(accountsAt, "the accounts table's own children").toBeGreaterThan(-1)
    const accountsTag = registry.slice(accountsAt, registry.indexOf("apps: ["))
    expect(accountsTag, "a real registry line, the same shape apps' own knowledge-app line is").toMatch(
      /\{\s*key:\s*"knowledge-account",\s*module:\s*"knowledge",\s*resource:\s*"knowledge",\s*door:\s*"content"\s*\}/
    )
    const counters = read("workers", "content", "src", "routes", "record-counts.ts")
    expect(counters, "the counter itself, narrowed by the exact same compartment string the door matches").toMatch(
      /"knowledge-account":\s*\(cfg,\s*guard,\s*_s,\s*id\)\s*=>\s*countSources\(cfg,\s*guard,\s*\{\s*compartment:\s*accountCompartment\(id\)\s*\}\)/
    )
    expect(counters, "accountCompartment is imported from the door's own knowledge lib").toMatch(
      /import\s*\{\s*accountCompartment,\s*countSources\s*\}\s*from\s*"\.\.\/lib\/knowledge"/
    )
  })
})

describe("the account's own gallery stays live (R15)", () => {
  it('live-resources.ts drops "knowledge-account-of:<accountId>" by prefix, the same way it already drops the app\'s own', () => {
    const src = read("web", "lib", "live-resources.ts")
    const at = src.indexOf("knowledge: {")
    expect(at, "the knowledge live-resource entry").toBeGreaterThan(-1)
    const tag = src.slice(at, at + 3500)
    expect(tag, "the app's own gallery cache").toMatch(/"knowledge-app-of:"/)
    expect(tag, "the account's own gallery cache").toMatch(/"knowledge-account-of:"/)
  })
})

describe('the "account" scope\'s Ask opens a NEW, account-scoped conversation, never "knowledge"', () => {
  it('the account tab\'s Ask button calls openNewAgentTab → pickAgentTabScope(id, "record", scope.accountName) → setAgentOpen, in that order', () => {
    const src = read("web", "components", "knowledge", "knowledge-screen.tsx")
    const fnAt = src.indexOf("function openAskConversation()")
    expect(fnAt, "the shared opener").toBeGreaterThan(-1)
    const fnEnd = src.indexOf("\n  }", fnAt)
    const body = src.slice(fnAt, fnEnd)
    expect(body, "scopes to this account, by name — \"record\" scope has no structured id, the same shape the generic in-panel picker already relies on to resolve an account's compartment from its own words").toMatch(
      /pickAgentTabScope\(id,\s*"record",\s*scope\.accountName\)/
    )
    const openAt = body.indexOf("openNewAgentTab()")
    const scopeAt = body.indexOf('pickAgentTabScope(id, "record", scope.accountName)')
    const panelAt = body.indexOf("setAgentOpen(true)")
    expect(openAt).toBeGreaterThan(-1)
    expect(scopeAt).toBeGreaterThan(openAt)
    expect(panelAt).toBeGreaterThan(scopeAt)
  })

  it('never "knowledge" scope (the whole team\'s base) for an account-scoped question', () => {
    const src = read("web", "components", "knowledge", "knowledge-screen.tsx")
    const fnAt = src.indexOf("function openAskConversation()")
    const fnEnd = src.indexOf("\n  }", fnAt)
    const body = src.slice(fnAt, fnEnd)
    // The three-way branch: app → "app", account → "record", team → "knowledge".
    expect(body).toMatch(/if \(isApp\) pickAgentTabScope\(id, "app"/)
    expect(body).toMatch(/else if \(isAccount\) pickAgentTabScope\(id, "record"/)
    expect(body).toMatch(/else pickAgentTabScope\(id, "knowledge"\)/)
  })
})

describe("the account tab mounts the SAME gallery the team and app scopes read, never a second implementation", () => {
  it("the account branch reaches renderGallery()/<PagedFind>, exactly like the app branch beside it", () => {
    const src = read("web", "components", "knowledge", "knowledge-screen.tsx")
    const at = src.indexOf("if (isRecordHost)")
    expect(at, "one shared branch for BOTH record hosts, not a second copy per scope").toBeGreaterThan(-1)
    const tag = src.slice(at, at + 1300)
    expect(tag, "calls the one gallery function every scope reads").toMatch(/\{renderGallery\(\)\}/)
    // There is exactly ONE `<PagedFind<KnowledgeSource>` tag in the whole
    // file — the structural guarantee that "account" never grew its own.
    const pagedFindCount = (src.match(/<PagedFind<KnowledgeSource>/g) ?? []).length
    expect(pagedFindCount, "one <PagedFind> tree, read by team, app and account alike").toBe(1)
  })

  it("the account scope's own empty state names the account, not the whole knowledge base", () => {
    const src = read("web", "components", "knowledge", "knowledge-screen.tsx")
    expect(src, "the account's own title").toMatch(/isAccount\s*\n?\s*\?\s*t\("Nothing filed under this account yet\."\)/)
    expect(src, "the account's own description").toMatch(
      /Everything the assistant knows about this account will show up here/
    )
  })

  it("the account scope drops the compartment facet but keeps the type facet, the same subtraction the app scope already makes", () => {
    const src = read("web", "components", "knowledge", "knowledge-screen.tsx")
    const at = src.indexOf("facets={")
    expect(at).toBeGreaterThan(-1)
    const tag = src.slice(at, at + 800)
    // Both app and account fall into the SAME else branch — there is no
    // account-specific facets expression to drift, because there is only one.
    expect(tag, "the non-team branch drops only compartment").toMatch(
      /translatedFacets\("knowledge", t, \{\}\)\.filter\(\(f\) => f\.field !== "compartment"\)/
    )
  })
})

describe("the account record's Knowledge tab mounts the shared gallery, scoped to the account", () => {
  it('account-detail.tsx renders <KnowledgeScreen scope={{ kind: "account", ... }}>, not AskTheAssistant', () => {
    const src = read("web", "components", "accounts", "account-detail.tsx")
    expect(src, "the old ask-box mount is gone").not.toMatch(/<AskTheAssistant\b/)
    expect(src).not.toMatch(/from "@\/components\/assistant\/ask-the-assistant"/)
    expect(src, "imports the shared gallery component").toMatch(
      /import\s*\{\s*KnowledgeScreen\s*\}\s*from\s*"@\/components\/knowledge\/knowledge-screen"/
    )
    const at = src.indexOf('if (tabItem.value === "knowledge")')
    expect(at, "the knowledge panel branch").toBeGreaterThan(-1)
    const tag = src.slice(at, at + 900)
    expect(tag, "mounts the shared component").toMatch(/<KnowledgeScreen\b/)
    expect(tag, 'scoped "account", not "team" or "app"').toMatch(/kind:\s*"account"/)
    expect(tag, "carries this record's own id").toMatch(/accountId(?:,|\s*:\s*accountId)/)
    expect(tag, "and this record's own name, for the empty state and the Ask conversation's label").toMatch(
      /accountName:\s*account\.name/
    )
  })

  it("the Knowledge tab's own badge is a real count now, not the old ask-box exemption", () => {
    const src = read("web", "components", "accounts", "account-detail.tsx")
    const at = src.indexOf('value: "knowledge"')
    expect(at, "the knowledge tab's own config line").toBeGreaterThan(-1)
    const tag = src.slice(at, at + 200)
    expect(tag, "R16: an exact server total, the same sidecar seam every sibling tab already uses").toMatch(
      /badge:\s*formatCount\(knowledgeTotal\)/
    )
  })

  it("the badge reads the sidecar useRecordCounts(\"accounts\", accountId) already primed — no second fetch", () => {
    const src = read("web", "components", "accounts", "account-detail.tsx")
    expect(src, "the one bounded read of every child total on this record").toMatch(
      /useRecordCounts\("accounts",\s*have \? accountId : null\)/
    )
    expect(src, "knowledgeTotal reads the same totalKey prefix the registry primes it under").toMatch(
      /const knowledgeTotal = useCachedValue<number \| null>\(totalKey\("knowledge-account", accountId\)\)/
    )
  })
})

describe("nothing regressed back to the old ask-box-only shape", () => {
  it("knowledge-screen.tsx is the account tab's whole answer — AskTheAssistant is not imported or mounted here", () => {
    // The file's own header PROSE names `` `<AskTheAssistant>` `` (backtick-
    // quoted, describing what USED to render) on purpose — that is the
    // history this change replaces, not a regression. What must never exist
    // is a live import or an actual JSX mount of it.
    const src = read("web", "components", "knowledge", "knowledge-screen.tsx")
    // The import line is the definitive proof either way: without it in
    // scope no JSX in this file could mount `<AskTheAssistant>` at all. The
    // header's own PROSE names it too, backtick-quoted, describing what USED
    // to render there — history this change replaces, not a live mount.
    expect(src, "no import of the old one-shot ask box").not.toMatch(/from "@\/components\/assistant\/ask-the-assistant"/)
  })
})
