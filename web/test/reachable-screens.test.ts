// THE SCREENS ARE REACHABLE, AND A DOOR HAS A BUTTON.
//
// Three invariants, all earned by things this repo actually shipped:
//
//   1. EVERY SIDEBAR DESTINATION DECLARES WHICH SECTION OF THE RAIL IT IS IN,
//      and the shell partitions the rail from that field rather than naming
//      pages. Client feedback 31 Aug 2026 replaced the owner's original
//      two-group daily/occasional split with three NAMED sections (My work,
//      Build, Accounts) plus two destinations that declared `"none"` and sat
//      outside all three (Home, Kwapso) — then, the same day, asked for a
//      fourth NAMED section (Kwapso, last), and then, later the same day,
//      asked for that section to be removed from the rail entirely ("move
//      with your profile and settings"). So Home is the rail's only
//      remaining `"none"` entry, Kwapso is `inRail: false` (off the rail
//      altogether, like Settings), and there are three named sections again
//      — a rule like that survives exactly as long as the next person adding
//      a section remembers it, unless the registry makes it un-forgettable.
//
//   2. EVERY SIDEBAR DESTINATION ACTUALLY RESOLVES. A section in the registry is
//      a link in the rail, and a link needs four things to work: a permission
//      module, a place in TOP_LEVEL_MODULES (or tapping it leaves the History
//      API and full-reloads, throwing away the warm cache the entire caching
//      model stands on), a page shell under web/app (or a reload 404s), and the
//      gateway forwarding its sub-paths (or a deep link to a record 404s).
//      Every one of those four was broken for at least one live section when
//      this check was written: Knowledge base and Work were missing from
//      TOP_LEVEL_MODULES, and the Brand library and
//      Meeting purposes had no page shell at all — four sidebar links that
//      404'd on reload, in a green build.
//
//   3. A SHIPPED DOOR HAS A CONTROL. The work engine shipped a ticket's
//      reference number, its archive door and its drag-rank door, and a person
//      could reach none of the three: the reference rendered on no screen, and
//      the two doors had no caller anywhere in the front end. Nothing was
//      broken — the tests passed, the machine surface worked, and the
//      capability did not exist for the people the app is for. So every
//      non-GET route on the three workers the agency app talks to must be
//      CALLED from web/ or web-portal/, or be a named line saying who it is
//      for.
//
//      THREE SINCE 5 SEP 2026, and the third one paid for itself immediately.
//      data-ops was outside this law until a tidiness review asked why; adding
//      it turned the build red on `POST /api/data-ops/agent/chat` and
//      `/agent/confirm` — the two most-pressed write doors in the product,
//      reported as having no control at all. Neither was a gap. `streamSse`
//      holds its own `method: "POST"`, so the matcher could not see the verb
//      (the third helper to hide it from this check, after `post()` and
//      `sendFile`), and the Send button's actual call lives in
//      `web/lib/use-agent-chat.tsx`, one directory outside the screen walk. A
//      law that has never been pointed at a module is not a law that module
//      passes.
//
//      auth, mcp and realtime are still outside THE WRITES half, and the
//      reason this file gave until 7 Sep 2026 — "they answer from a `switch`
//      rather than an `export const ROUTES` table" — was true of realtime and
//      the two gateways and FALSE of auth and mcp, both of which export a
//      ROUTES table at workers/<w>/src/index.ts. Corrected, and the real
//      reason measured rather than guessed: pointing the WRITES census at
//      those two reports six doors, and two of them are
//      `POST /api/auth/email/start` and `/email/verify` — the sign-in doors
//      every single person in the product presses, on both front ends. The
//      matcher misses them because `web/lib/api/auth.ts` puts the verb in an
//      options object rather than in `post(`, which is the FOURTH helper to
//      hide a method from this check. Widening it today would buy a row of
//      excuses in front of doors that are not gaps; the fix is the matcher.
//      THE READS HALF DOES walk auth and mcp (invariant 4, below) — nothing
//      there needs a verb.
//
// THE FOURTH INVARIANT IS THE READS. The third skips GET — "a read is pressed
// by opening the screen" — which is right for the reads a screen makes and
// wrong for a read that no screen makes. A dead-end review on 5 Sep 2026
// found four such doors on the content worker's Google lane (`/drive/file`,
// `/gmail/message`, `/calendar/event/transcript`, `/chat/spaces`), and this
// header then said "none is exposed as an MCP tool". THAT SENTENCE WAS FALSE
// THE DAY IT WAS WRITTEN: all four were already tools on the assistant's own
// catalogue (`google_drive_file`, `google_mail_message`,
// `google_meeting_transcript`, `google_chat_spaces` —
// workers/data-ops/src/lib/tools.ts), reached by a person through agent_chat
// under that person's own rights. A second review on 7 Sep 2026 read the
// sentence, believed it, and charged three of them as the product's one real
// dead end.
//
// AND THE CORRECTION MUST NOT OVERSHOOT THE OTHER WAY, which the first draft
// of this paragraph did by saying "R43 mirrors them onto MCP". It does not:
// R43 permits an asymmetry that is a named, reasoned line, and all 21 Google
// tools are exactly that — `GOOGLE_MCP_EXCLUSION` in
// workers/mcp/test/agent-mcp-tool-parity.test.ts, MCP.md §3, "a leaked
// personal access token's blast radius must not include a mailbox". Agent
// surface yes, MCP surface deliberately no. Writing a second confident,
// unchecked sentence to replace the first one would have been the same
// mistake wearing the opposite claim.
//
// A claim in a comment is read by people and checked by nothing, which is the
// whole reason the fourth invariant exists: every GET door on the three ROUTES workers is opened by a
// front door, is the `path` of a tool on the machine surfaces (DERIVED from
// the catalogue, never listed here), or is a reasoned `NO_SCREEN_READ` line;
// and the owner-key doors, GET and POST alike, each name the script or
// runbook that reaches them, with that file re-read so the claim cannot rot
// the way this header's did.
//
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { sourceFiles } from "@shared/rules/source-scan"
import { SHARED_TOOLS } from "@shared/workers/tool-catalog"

import { NAV, NAV_GROUP_ORDER, TEAM_SECTIONS } from "../lib/pages"
import { BASE_RECIPES, MODULE_PERMISSION } from "../lib/screens"
import { TOP_LEVEL_MODULES } from "../components/deep-link/route"

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, "..")
const ROOT = join(WEB, "..")
const read = (p: string) => readFileSync(p, "utf8")

/** Every destination in the left rail — the universal anchors plus the team's
 * own sidebar pages. Derived from the two registries, never listed here.
 * `inRail !== false` drops Settings (client, 31 Aug 2026): its page is real
 * and unchanged, it just isn't a rail destination any more. */
const RAIL = [
  ...NAV.filter((n) => !n.need && n.inRail !== false).map((n) => ({ what: `NAV "${n.slug}"`, group: n.group })),
  ...TEAM_SECTIONS.filter((s) => s.placement === "sidebar").map((s) => ({
    what: `section "${s.key}"`,
    group: s.group,
  })),
]

describe("the screens are reachable", () => {
  // 1 — THE RAIL IS THREE NAMED SECTIONS PLUS "NONE", and the registry is what
  // says which — never a fourth value nobody decided about.
  it("nav-groups: every rail destination declares its section (or is deliberately standalone), and the shell derives them", () => {
    expect(RAIL.length, "the rail derivation found nothing — it has gone blind").toBeGreaterThan(5)
    const VALID = new Set<string>([...NAV_GROUP_ORDER, "none"])
    const undeclared = RAIL.filter((d) => !VALID.has(d.group as string))
    expect(
      undeclared.map((d) => d.what),
      `a rail destination with an unrecognised group lands somewhere by accident rather than by decision — give it a real NavGroup or "none" in lib/pages.ts: ${undeclared.map((d) => d.what).join(", ")}`
    ).toEqual([])

    // "none" is NAV's own word for "no heading" — Home is the one entry left
    // using it since Kwapso got its own section. A TEAM_SECTIONS sidebar page
    // declaring it would sit in the rail with no section at all, which nobody
    // has asked for and `StandaloneNavItem` was never built to scale past a
    // handful of hand-placed entries.
    const sidebarStandalone = RAIL.filter((d) => d.what.startsWith("section ") && d.group === "none")
    expect(
      sidebarStandalone.map((d) => d.what),
      `"none" is reserved for NAV's own anchors — these team sections need a real NavGroup instead: ${sidebarStandalone.map((d) => d.what).join(", ")}`
    ).toEqual([])

    // EVERY NAMED SECTION HAS TO BE OCCUPIED, or its heading never draws and
    // the client's own grouping is silently undone by a registry edit.
    for (const g of NAV_GROUP_ORDER)
      expect(
        RAIL.filter((d) => d.group === g).length,
        `the "${g}" section is empty — a section's heading only draws over real destinations`
      ).toBeGreaterThan(0)

    // …and the SHELL must partition by that field rather than naming pages. A
    // hand-listed group in the component would leave the registry describing a
    // rail it no longer controls.
    const shell = read(join(WEB, "components", "shell", "app-shell.tsx"))
    expect(shell, "app-shell must build the rail groups from each destination's own group field").toContain(
      'i.group === g'
    )
  })

  // 2 — A LINK IN THE RAIL GOES SOMEWHERE.
  it("sidebar-destinations: every sidebar section resolves end to end", () => {
    const gateway = read(join(ROOT, "workers", "gateway", "src", "index.ts"))
    const sidebar = TEAM_SECTIONS.filter((s) => s.placement === "sidebar")
    expect(sidebar.length, "the sidebar scan found no sections — it has gone blind").toBeGreaterThan(5)

    for (const s of sidebar) {
      // (a) the URL segment maps to the permission module the server enforces —
      // without it the deep-link host NotFounds the page it just linked to.
      expect(
        MODULE_PERMISSION[s.segment],
        `sidebar section "${s.key}" (/${s.segment}) has no MODULE_PERMISSION entry — the host would refuse the page the rail links to`
      ).toBe(s.module)

      // (b) it is an in-app path, so `go()` moves to it through the History API.
      expect(
        TOP_LEVEL_MODULES,
        `"/${s.segment}" is a sidebar page but not a TOP_LEVEL_MODULE — every tap on it leaves the History API and FULL-RELOADS, throwing away the warm cache`
      ).toContain(s.segment)

      // (c) the static export has a shell for it, or a reload / a pasted link 404s.
      expect(
        existsSync(join(WEB, "app", s.segment, "[[...rest]]", "page.tsx")),
        `"/${s.segment}" is a sidebar page with no web/app/${s.segment}/[[...rest]]/page.tsx — the link works inside the app and 404s on reload`
      ).toBe(true)

      // (d) the gateway serves that shell for any sub-path, or a deep link to a
      // record under it 404s.
      expect(
        new RegExp(`"${s.segment}"`).test(gateway),
        `the gateway does not forward /${s.segment}/* to its shell — a deep link to one of its records 404s on load`
      ).toBe(true)

      // (e) …and something actually RENDERS it. Four registries can all agree a
      // section exists while the render switch has no branch for it, and then
      // the rail links to a page that answers NotFound.
      //
      // It is a real failure, not a hypothetical one: the Time section shipped
      // its registries in one commit and its screen in the same one, and for the
      // length of that commit the branch sat BELOW `renderCollection`'s
      // `<module>.list` recipe guard — which every other collection passes and a
      // host-composed one cannot. Every test was green, because the four checks
      // above are about registries and none of them opens the screen.
      //
      // A collection is drawn either by a branch in the switch or by a recipe;
      // this asks for one of the two, which is the weakest claim that still
      // catches a destination nothing draws.
      const collections = read(join(WEB, "components", "deep-link", "collection-content.tsx"))
      const hasBranch = new RegExp(`module === "${s.segment}"`).test(collections)
      const hasRecipe = `${s.segment}.list` in BASE_RECIPES
      expect(
        hasBranch || hasRecipe,
        `sidebar section "${s.key}" has no branch in renderCollection AND no "${s.segment}.list" recipe — the rail links to a page that renders NotFound`
      ).toBe(true)
    }
  })

  // 3 — A DOOR THAT CHANGES SOMETHING HAS SOMETHING THAT PRESSES IT.
  //
  // TWO HOPS, and the second one is the whole point. Hop one is the api layer:
  // which method names the door's path. Hop two is a COMPONENT calling that
  // method — because `rankStory` sat in the api layer for weeks with the path
  // written out in full and no screen calling it, so a one-hop check ("is the
  // path mentioned anywhere?") would have reported the drag-rank gap as fine.
  // A control is a thing a person can press, and a person presses components.
  //
  // WHAT IT DOES NOT CATCH, said plainly so nobody over-trusts it: a handler in
  // a component with no button wired to it still reads as a call. It measures
  // "does a screen reach this door", not "can a person see the control" — the
  // second is a question about pixels, and this is a source scan. It catches the
  // failure this repo actually had (the capability absent from every screen) and
  // it would not catch a button someone later deleted from around a live handler.
  it("doors-have-controls: every write door is called from a screen, or says who it is for", () => {
    // Hop one: the api layer's method → the path it posts to. Read as one blob
    // per file and split on the method boundaries, because a method's body is
    // where its path literal lives.
    const apiSrc = sourceFiles([join(WEB, "lib", "api"), join(ROOT, "web-portal", "lib")], {
      extensions: [".ts"],
      skipTests: true,
    })
      .map((f) => f.source)
      .join("\n")
    expect(apiSrc.length, "the api-layer scan read nothing — it has gone blind").toBeGreaterThan(5000)
    // `name: (args) => …` up to the next method at the same indent. The path may
    // sit several lines down (a query builder, a then-chain), so the window runs
    // to the next declaration rather than to the end of the line.
    const methods = [...apiSrc.matchAll(/^ {2}(\w+):\s*[(<]/gm)]
    expect(methods.length, "the api-method scan found almost nothing").toBeGreaterThan(40)
    /** WHICH METHOD POSTS TO THIS DOOR — and the two ways that question used to be
     * answered wrongly, both found by sabotaging a control and watching this check
     * stay green.
     *
     *   • A PATH ENDS WHERE ITS STRING DOES. A plain `includes` is a prefix test,
     *     so `/api/tenancy/rates` matched `/api/tenancy/rates/update` too, and the
     *     stem door read as pressed the moment any sibling was.
     *   • A PATH IS NOT A DOOR. `/api/tenancy/rates` is TWO doors — a GET that
     *     reads the card and a POST that adds to it — and the reading method is
     *     called from a screen on every card that renders. So the write door read
     *     as pressed by the read door's own caller.
     *
     * What separates them is that the body SAYS it is a write — in any of the
     * THREE ways this api layer writes one: the shared `post()` helper
     * (shared/web/api.ts), the inline `{ method: "POST", … }` the older tenancy
     * methods still use, or `sendFile()` — the upload helper that streams a file
     * as the request body (web/lib/api/content.ts). All three are here because all
     * three are real; matching only the first called sixteen live doors
     * unreachable, which is the same kind of wrong answer in the other direction.
     *
     * `sendFile` earned its place the day the four streaming upload doors landed:
     * it holds the `method: "POST"` itself, so the CALLER's body carries the path
     * and no write marker, and all four streamed doors read as unpressed while
     * being wired to real file pickers. A helper that hides the verb is exactly the
     * shape this matcher has been wrong about twice — and `streamSse` is the
     * THIRD, found on 5 Sep 2026 the moment data-ops came into this census.
     * It holds `method: "POST"` inside web/lib/api/stream.ts exactly as
     * `sendFile` does, so the assistant's own two doors — `agent/chat` and
     * `agent/confirm`, the most-pressed write doors in the product — read as
     * having no control at all. A helper that hides the verb is not an
     * accident this matcher will stop meeting; it is what an api layer does
     * when a call needs more than `fetch` and a body.
     *
     * Between them these two holes hid BOTH rate cards' create doors — delete the
     * "New rate" button and this check said fine. */
    const WRITES = /\bpost\(|\bsendFile[<(]|\bstreamSse\(|method:\s*"(?:POST|PUT|PATCH|DELETE)"/
    /** Does this function body call THIS door — the whole path, and as a write?
     * Two holes lived here. A path was matched as a PREFIX, so
     * `/api/content/knowledge/sync-google` counted as a call to
     * `/api/content/knowledge/sync`; and a path is not a door — the same string
     * is a GET and a POST, so the reading twin vouched for the writing one. */
    const reaches = (path: string, body: string) =>
      new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=["\`?]|\\$\\{)`).test(body) &&
      WRITES.test(body)
    const bodyOf = new Map<string, string>()
    methods.forEach((m, i) => {
      const from = m.index as number
      const to = (methods[i + 1]?.index as number | undefined) ?? apiSrc.length
      bodyOf.set(m[1], (bodyOf.get(m[1]) ?? "") + apiSrc.slice(from, to))
    })

    // Hop two: the SCREENS — every component in both front ends, plus the
    // handful of non-component callers a screen genuinely delegates to (the
    // pre-auth onboarding flow, the host's own write layer).
    const screens =
      sourceFiles(
        [
          join(WEB, "components"),
          join(WEB, "app"),
          join(ROOT, "web-portal", "components"),
          join(ROOT, "web-portal", "app"),
        ],
        { extensions: [".ts", ".tsx"], skipTests: true }
      )
        .map((f) => f.source)
        .join("\n") +
      // The host's own write layer — a named action dispatched from a screen's
      // button is still that button pressing the door.
      read(join(WEB, "lib", "use-screen-actions.ts")) +
      // Same shape, one hook over: the record footer's add-a-note field calls
      // `activity.addNote`, which is this file's own `tenancy.addNote(` call —
      // a control passed by REFERENCE (`onAddNote={... ? activity.addNote :
      // undefined}`) presses the door exactly as a named dispatch does.
      read(join(WEB, "lib", "use-record-activity.ts")) +
      // And the assistant's own state machine, extracted from agent-panel.tsx so
      // the panel stays a render shell (its own header says so). The Send button
      // is in the panel; the call is here. Added 5 Sep 2026 with data-ops, for
      // the same reason as the two above: a screen's write layer living one
      // directory over is still that screen's button.
      read(join(WEB, "lib", "use-agent-chat.tsx"))
    expect(screens.length, "the screen scan read nothing — it has gone blind").toBeGreaterThan(10000)

    const unpressed: string[] = []
    let doors = 0
    // THREE WORKERS SINCE 5 SEP 2026, not two. data-ops was outside the law
    // entirely, so a write door could ship there with no button, no menu item
    // and no line below it, in a green build — the exact shape the header's
    // third invariant was written for. It is in now because it has a ROUTES
    // table to read; auth and mcp answer from a `switch` and cannot be walked
    // by any seam scan in this repo until they gain one.
    for (const worker of ["content", "tenancy", "data-ops"]) {
      const index = read(join(ROOT, "workers", worker, "src", "index.ts"))
      const table = /export const ROUTES[^=]*=\s*\{([\s\S]*?)\n\}/.exec(index)
      expect(table, `workers/${worker} has no ROUTES table — did it move?`).toBeTruthy()
      for (const [, method, path] of (table as RegExpExecArray)[1].matchAll(
        /"([A-Z]+) (\/[^"]+)":\s*\{\s*handler:/g
      )) {
        if (method === "GET") continue // a read is pressed by opening the screen
        // Key-gated ops doors (adminGuard): no session reaches them at all, so
        // there is no screen they could have and no person to give a button to.
        // They are run from scripts with the owner's key — a different kind of
        // caller, not a missing control.
        if (/^\/api\/[a-z-]+\/admin\//.test(path)) continue
        doors++
        // Which api method posts to this door, and is that method called from a
        // screen? Either hop missing is the same failure with two faces: no
        // plumbing, or plumbing nobody can reach.
        // A WHOLE PATH, not a prefix of one. `body.includes(path)` counted
        // `/api/content/knowledge/sync-google` as a call to
        // `/api/content/knowledge/sync`, so wiring a button to the LONGER door
        // silently marked the shorter one as pressed — and this suite's own
        // ratchet then demanded the deletion of a true NO_CONTROL line. A door
        // path ends where the URL literal does: a closing quote or backtick, or
        // the `?` that starts a query string.
        // Through the one matcher above, which knows both holes: a whole path,
        // and only a body that actually WRITES.
        const callers = [...bodyOf].filter(([, body]) => reaches(path, body)).map(([name]) => name)

        if (!callers.some((name) => new RegExp(`\\.${name}\\s*\\(`).test(screens)))
          unpressed.push(`${method} ${path}`)
      }
    }
    expect(
      doors,
      "the write-door census found almost nothing — it has gone blind"
    ).toBeGreaterThan(30)

    const unlisted = unpressed.filter((d) => !(d in NO_CONTROL))
    expect(
      unlisted,
      `these doors change something and nothing a person can click calls them — give them a control, or write down here who they ARE for: ${unlisted.join(", ")}`
    ).toEqual([])

    // THE RATCHET: an excuse in front of a door that now HAS a control is a line
    // nobody reread. Wire one up and its line must go, so this list can only shrink.
    const stale = Object.keys(NO_CONTROL).filter((d) => !unpressed.includes(d))
    expect(
      stale,
      `NO_CONTROL names doors that are called from a front end now — delete these lines: ${stale.join(", ")}`
    ).toEqual([])
  })

  // 4 — A DOOR THAT ANSWERS SOMETHING HAS SOMETHING THAT ASKS IT.
  //
  // The reads. A read is a way in only if something asks it: a screen (an api
  // method, or an <a href> straight at the door — the accounts export is one),
  // or a tool on the machine surfaces, which is a way in for the assistant and,
  // through R43's parity, for an MCP client. What a machine can ask for is
  // DERIVED: the shared catalogue is imported so a path is the one the tool
  // actually forwards to, and each surface's own file is read for its
  // surface-only tools. Nothing here is a list of doors somebody typed.
  //
  // Owner-key doors are the third kind. No session reaches them, so no screen
  // could have a button for one — they are run from a script or a runbook
  // command with the owner's key. Each is a line in OWNER_KEY_DOORS naming the
  // file that reaches it, and that file is re-read for the path: a runbook that
  // stops naming a door turns this red, which is the difference between "it is
  // documented in four places" and a check.
  it("reads-have-a-way-in: every read door is opened by a screen, is a tool on the machine surfaces, or says who it is for", () => {
    const frontDoors = sourceFiles(
      [
        join(WEB, "lib"),
        join(WEB, "components"),
        join(WEB, "app"),
        join(ROOT, "web-portal", "lib"),
        join(ROOT, "web-portal", "components"),
        join(ROOT, "web-portal", "app"),
      ],
      { extensions: [".ts", ".tsx"], skipTests: true }
    )
      .map((f) => f.source)
      .join("\n")
    expect(frontDoors.length, "the front-door scan read nothing — it has gone blind").toBeGreaterThan(10000)

    const toolPaths = new Set<string>(SHARED_TOOLS.map((t) => t.path))
    for (const f of [
      join(ROOT, "workers", "data-ops", "src", "lib", "tools.ts"),
      join(ROOT, "workers", "mcp", "src", "lib", "tools.ts"),
    ])
      for (const m of read(f).matchAll(/path:\s*"(\/api\/[^"]+)"/g)) toolPaths.add(m[1])
    expect(toolPaths.size, "the tool-path derivation found almost nothing — it has gone blind").toBeGreaterThan(30)

    // A whole path, as the third invariant matches one: it ends at a quote, a
    // backtick, the `?` of a query string, or the `${` of a builder.
    const opens = (path: string) =>
      new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=["\`?]|\\$\\{)`).test(frontDoors)

    const unopened: string[] = []
    const ownerKey: string[] = []
    let doors = 0
    // FIVE WORKERS, not the third invariant's three. auth and mcp export a
    // ROUTES table like the other three, so their READS cost nothing extra to
    // walk — and walking them found one undeclared owner-key door on the first
    // run (`POST /api/auth/admin/test-login`). The writes half stays at three
    // for a measured reason, said in this file's header: its matcher cannot see
    // a verb that lives in an options object, which is how web/lib/api/auth.ts
    // calls the two sign-in doors every person in the product presses.
    for (const worker of ["content", "tenancy", "data-ops", "auth", "mcp"]) {
      const index = read(join(ROOT, "workers", worker, "src", "index.ts"))
      const table = /export const ROUTES[^=]*=\s*\{([\s\S]*?)\n\}/.exec(index)
      expect(table, `workers/${worker} has no ROUTES table — did it move?`).toBeTruthy()
      for (const [, method, path] of (table as RegExpExecArray)[1].matchAll(
        /"([A-Z]+) (\/[^"]+)":\s*\{\s*handler:/g
      )) {
        if (/^\/api\/[a-z-]+\/admin\//.test(path)) {
          ownerKey.push(`${method} ${path}`)
          continue
        }
        if (method !== "GET") continue
        doors++
        if (opens(path) || toolPaths.has(path)) continue
        unopened.push(`GET ${path}`)
      }
    }
    expect(doors, "the read-door census found almost nothing — it has gone blind").toBeGreaterThan(60)

    const unlisted = unopened.filter((d) => !(d in NO_SCREEN_READ))
    expect(
      unlisted,
      `these doors answer a question nothing asks — no screen opens them and no tool forwards to them. Give each a caller, or write down here who it is for: ${unlisted.join(", ")}`
    ).toEqual([])
    // The same ratchet as NO_CONTROL: a reason in front of a door that now has
    // a caller is a line nobody reread.
    const stale = Object.keys(NO_SCREEN_READ).filter((d) => !unopened.includes(d))
    expect(
      stale,
      `NO_SCREEN_READ names doors a screen or a tool reaches now — delete these lines: ${stale.join(", ")}`
    ).toEqual([])

    // The owner-key doors, both ways: every one has a line, every line is a door,
    // and the file each line names still names the path.
    expect(ownerKey.length, "the owner-key census found nothing — it has gone blind").toBeGreaterThan(5)
    const unclaimed = ownerKey.filter((d) => !(d in OWNER_KEY_DOORS))
    expect(
      unclaimed,
      `these owner-key doors say nothing about who runs them — add a line to OWNER_KEY_DOORS naming the script or runbook that does: ${unclaimed.join(", ")}`
    ).toEqual([])
    for (const [door, { reached }] of Object.entries(OWNER_KEY_DOORS)) {
      expect(ownerKey, `OWNER_KEY_DOORS names "${door}", which is not an owner-key door any more — delete the line`).toContain(door)
      const path = door.split(" ")[1]
      expect(
        read(join(ROOT, reached)).includes(path),
        `OWNER_KEY_DOORS says ${reached} reaches "${door}", and that file no longer names the path — the way in has rotted`
      ).toBe(true)
    }
  })

  // 5 — A SCREEN THAT FILLS THE WINDOW HAS A WAY OFF IT.
  //
  // The other half of a dead end, and the half a route census cannot see: not a
  // door nobody can press, but a SCREEN nobody can leave. A full-height surface
  // (`min-h-[100svh]`) has drawn over the rail, so whatever is on it is the only
  // thing a person can press. Walked against staging on 7 Sep 2026 with a real
  // teamless session, "You're not in a team" — where the app puts anybody whose
  // invite expired, and anybody who was removed from a team — had exactly three
  // controls on it and all three changed the colour scheme. The portal's own
  // equivalent screen has had a "Sign out" since the day it was written.
  //
  // So every `.tsx` under the two front doors that draws one is classified,
  // and the token that proves the classification is re-read from the file:
  //
  //   shell      it draws the app around `children`; the rail IS the way out
  //   retry      a failure that can be retried, and offers it
  //   form       a step a person completes; the submit is the way on
  //   terminal   nothing to complete and nothing to retry — it MUST offer a
  //              sign-out, because a person standing here with the wrong
  //              address has no other exit but clearing a cookie
  //
  // Discovery is DERIVED (the census reads the disk), the classification is
  // data, and both directions are checked: a new full-height screen with no
  // line fails, and a line whose file no longer draws one fails too.
  it("full-screen-escapes: a screen that draws over the rail says how to get off it", () => {
    const roots = [join(WEB, "app"), join(WEB, "components"), join(ROOT, "web-portal", "app"), join(ROOT, "web-portal", "components")]
    const drawn = sourceFiles(roots, { extensions: [".tsx"], skipTests: true })
      .filter((f) => f.source.includes("min-h-[100svh]"))
      .map((f) => relative(ROOT, f.path))
    expect(drawn.length, "the full-height census found nothing — it has gone blind").toBeGreaterThan(3)

    const unclassified = drawn.filter((f) => !(f in FULL_SCREEN_SURFACES))
    expect(
      unclassified,
      `these screens fill the window, so the rail is not under them — say which kind each is in FULL_SCREEN_SURFACES, and if it is "terminal" give it a way out: ${unclassified.join(", ")}`
    ).toEqual([])

    const PROOF: Record<string, RegExp> = {
      shell: /children/,
      retry: /Try again/,
      form: /onSubmit|type="submit"/,
      terminal: /auth\.logout\(\)/,
    }
    for (const [file, { kind }] of Object.entries(FULL_SCREEN_SURFACES)) {
      expect(drawn, `FULL_SCREEN_SURFACES names ${file}, which no longer draws a full-height screen — delete the line`).toContain(file)
      expect(
        PROOF[kind].test(read(join(ROOT, file))),
        `${file} is classified "${kind}" and no longer carries what that promises. A "terminal" screen with no auth.logout() is a screen a person cannot leave.`
      ).toBe(true)
    }
  })
})

/** EVERY SCREEN THAT DRAWS OVER THE RAIL, AND WHAT GETS A PERSON OFF IT.
 * `kind` is proved against the file by the check above, so a classification
 * cannot outlive the thing it claims. "terminal" is the one with teeth: it
 * means there is nothing to submit and nothing to retry, so the only honest
 * exit is signing out and trying another address. */
const FULL_SCREEN_SURFACES: Record<string, { kind: "shell" | "retry" | "form" | "terminal"; why: string }> = {
  "web/app/layout.tsx": { kind: "shell", why: "the document frame; it draws whatever page is under it and never a state of its own." },
  "web/components/shell/app-shell.tsx": { kind: "shell", why: "the signed-in app: the rail is on the screen, so every destination is a click away." },
  "web/components/shell/error-boundary.tsx": { kind: "retry", why: "the root boundary. Something broke and nothing is lost — the offer is to try again." },
  "web/app/onboarding/page.tsx": {
    kind: "terminal",
    why: "THREE screens in one file and two of them end: \"You're not in a team\" (invite expired, or removed) and \"You're in the right place\" (a client login at the agency's door). Neither has anything to submit — team creation is closed, and this build cannot know the portal's address — so `SignOutEscape` is the way off both. The third face is the profile form, which submits.",
  },
  "web-portal/app/layout.tsx": { kind: "shell", why: "the portal's document frame, same as the agency's." },
  "web-portal/components/portal-shell.tsx": { kind: "shell", why: "the portal's frame: it draws the nav, and hands the two states that are not the app to NoAccess and to the kit's failure screen." },
  "web-portal/components/no-access.tsx": { kind: "terminal", why: "signed in, and the world is empty. Deliberately offers no way IN (access is a decision somebody makes), so the only control is the way OUT — the precedent the agency's onboarding screens were measured against." },
  "web-portal/components/needs-name.tsx": { kind: "form", why: "one question with an answer only this person has; the submit finishes it." },
}

/** READ DOORS NO SCREEN OPENS AND NO TOOL FORWARDS TO. One kind of line: a
 * caller the census cannot see, with the reason it cannot. The list is a
 * RATCHET like NO_CONTROL below — give a door a screen or a tool and its line
 * must go. */
const NO_SCREEN_READ: Record<string, string> = {
  "GET /api/content/google/callback":
    "GOOGLE'S OWN REDIRECT TARGET. A person reaches it by finishing the consent screen: /google/start sends the browser to Google, and Google sends it back here with the code. No screen names the path because no screen ever calls it — the address is built once, in lib/google-oauth.ts (`redirectUri`), and handed to Google, which is the only caller there will ever be. A human path, then, and one the census cannot see because the literal lives in the worker that answers it.",
}

/** OWNER-KEY DOORS, AND WHO RUNS EACH ONE. `adminGuard` doors take no session
 * — a person with the owner's key runs them from a script or a runbook
 * command, so a screen is the wrong shape and its absence is not a gap. Every
 * `/admin/` route on the three ROUTES workers has a line here; `reached` is the
 * file that names the path, re-read by the check above so a runbook that drops
 * a door turns the build red rather than leaving a door nobody can find. */
const OWNER_KEY_DOORS: Record<string, { reached: string; why: string }> = {
  "POST /api/tenancy/admin/migrate-teams": {
    reached: "scripts/check-team-migrations.mjs",
    why: "the second step of every staging deploy (OPERATIONS.md): new team tables do not appear because the code shipped, somebody has to apply them.",
  },
  "POST /api/tenancy/admin/create-team": {
    reached: "scripts/seed-staging.mjs",
    why: "team creation is closed product-wide (TEAM_CREATION_CLOSED), so the one team a product has is made by the seed with the owner's key, never from a screen.",
  },
  "GET /api/tenancy/admin/db-sizes": {
    reached: "documents/OPERATIONS.md",
    why: "how big every team database is, for the retention runbook. An operator's number, not a member's.",
  },
  "POST /api/tenancy/admin/move-module": {
    reached: "documents/OPERATIONS.md",
    why: "moves one module's rows between databases during a resharding, which is an operation on the estate rather than on a team.",
  },
  "POST /api/data-ops/admin/seed-targets": {
    reached: "documents/BOOTSTRAP.md",
    why: "refreshes the global import catalogue's labels on a fresh account (BOOTSTRAP.md step). The catalogue self-heals on read since R13, so this is a bootstrap convenience rather than a step anyone must remember.",
  },
  "GET /api/data-ops/admin/errors": {
    reached: "scripts/errors.mjs",
    why: "the central error log, read newest-first by the errors script. RUNBOOK.md is the reading order.",
  },
  "POST /api/data-ops/admin/errors/resolve": {
    reached: "documents/RUNBOOK.md",
    why: "marks ONE error row dealt with, by id, from the runbook's curl. The script resolves by signature (the line below) because a signature is what a person reads; one id is the exception.",
  },
  "POST /api/data-ops/admin/errors/resolve-signature": {
    reached: "scripts/errors.mjs",
    why: "marks every row sharing one signature dealt with — `node scripts/errors.mjs <env> --resolve <signature> --note <why>`.",
  },
  "POST /api/auth/admin/test-login": {
    reached: "scripts/smoke-staging.mjs",
    why: "mints a sign-in code for a staging address without an inbox, so a smoke run and a browser walk can get past the front door. STAGING ONLY — the handler refuses unless `TEST_LOGIN_KEY` is set, which production never sets, so there is no screen for it because on the only environment that answers it there is no person to show one to.",
  },
  "POST /api/data-ops/admin/grant-credits": {
    reached: "documents/OPERATIONS.md",
    why: "tops up a team's AI credit balance. An owner action until real payments wire into the same seam (DATA-MODEL.md § agent_credits).",
  },
}

/** WRITE DOORS NOTHING A PERSON CAN PRESS REACHES YET. Two kinds of line, and
 * they are labelled, because pretending a gap is a decision is how a gap
 * survives a review.
 *
 *   • FOR A MACHINE — the door exists for the assistant, the MCP surface or the
 *     import engine, and a person does the same thing another way. Nothing is
 *     missing.
 *   • A GAP — the capability shipped and the people the app is for cannot use
 *     it. Named here so it is a list somebody can work through rather than a
 *     silence. Every one of these belongs to a lane other than screens.
 *
 * The list is a RATCHET: wire a door up and its line must be deleted, or the
 * build goes red. So it can only ever shrink, and it can never quietly describe
 * a screen that now exists. */
const NO_CONTROL: Record<string, string> = {
  /* ── for a client that is already out there ───────────────────────────── */
  "POST /api/content/brand-assets/upload":
    "FOR AN OLDER BUILD OF THIS APP. The buffered half of the brand-asset upload pair — a base64 data URL in a JSON body — replaced on 17 Aug 2026 by /upload-stream, which hands the file to R2 as it arrives. No screen in THIS build calls it, and that is deliberate: a browser holds its own copy of the app for as long as the tab is open, so somebody who loaded a page before the deploy is still running the old JavaScript and still posting here. An upload contract is the one change where the server must be ready before the client and outlast it afterwards. All of these lines go when no build in the wild uses them.",
  "POST /api/content/staff/upload":
    "FOR AN OLDER BUILD OF THIS APP — the buffered half of the staff-file upload pair, kept for tabs opened before the 17 Aug 2026 deploy for the reason written on the brand-asset line above.",
  "POST /api/content/knowledge/upload":
    "FOR AN OLDER BUILD OF THIS APP. The buffered upload door — a base64 data URL in a JSON body — replaced on 17 Aug 2026 by /upload-stream, which takes the file as the request body and never materialises it. No screen in THIS build calls it, and that is the point rather than a gap: a browser holds its own copy of the app for as long as the tab is open, so a person who loaded the app before the deploy is still running the old JavaScript and still posting here. The door stays until no build in the wild uses it; deleting it then is a separate, boring change. An upload contract is the one kind of change where the server must be ready before the client is, and outlast it afterwards.",

  /* ── the control left the screen, the door did not ──────────────────────── */
  // THE PARENT DOOR IS NOT HERE ANY MORE (19 Aug 2026). Its line said, in the
  // last sentence somebody wrote before closing it, exactly what to do if this
  // was ever asked for: "a control on the CONTACT ('who does she work for?'),
  // not the parent picker coming back onto a company's form". That control is
  // on the contact's Overview now (contact-detail's `moveToCompany`), so the
  // ratchet has done the one thing it exists to do and the excuse is gone.
  "POST /api/content/help/rank":
    "THE ORDER IS STILL THE PRIORITY, and it is still set — just not from the ticket's own screen. Drag-rank is the one priority signal SCOPE ch.07 allows, and Move up / Move down sat on the ticket detail until 17 Aug 2026, when the owner took them off it: a person reading ONE request is not deciding where it sits among forty, and two buttons that move a row you cannot see are a control with no feedback. The door stays because the machine surface still ranks (`rank_help_ticket`), and because the day this app grows a drag handle on the LIST is the day it is wanted back.",
  "POST /api/content/help/status":
    "FOR A MACHINE, and it became one on 17 Aug 2026 when the ticket lifecycle stopped being a control. Five of the seven stages are now reached by something HAPPENING — the work lands in a sprint, a timer starts, the last story closes, a person sends the answer, an extra is raised and waits — so a picker offering all seven is precisely the thing the tester asked us to take away ('a status is a fact, not a button', CHECKLIST 5.2). The two stages a person still decides have doors and words of their own, and both have controls: 'Mark it read' on the triage queue and 'They've confirmed it' on the ticket. What is left here is a CORRECTION, which is a sentence somebody says to the assistant ('put BERG-T0412 back to triaged') rather than a control on a screen. It refuses `resolved` outright, so the one move that leaves the building is not reachable through it at all.",

  /* ── for a machine ─────────────────────────────────────────────────────── */
  "POST /api/content/help/bulk-status":
    "FOR A MACHINE. The same shape for tickets: a set of ids moved together. A person moves one ticket with the stepper on its own screen.",
  "POST /api/content/help/bulk-status-by-filter":
    "FOR A MACHINE. 'Move everything matching this filter' is a sentence somebody says to the assistant, not a control that could be drawn safely: a button whose blast radius is however many rows the filter happened to match is a button nobody can check before pressing.",
  "POST /api/content/work-logs/auto-stop":
    "FOR A MACHINE. A private preference about how the caller's own timers behave, set by asking the assistant. It changes no record anybody else can see, which is also why it is the content worker's one housekeeping write.",
  "POST /api/content/knowledge/sync":
    "FOR A MACHINE, and deliberately: the sweep runs itself every fifteen minutes. A button that says 'catch up now' invites people to press it when nothing is behind — the owner's own comprehension answer was that eleven new tickets need no hand-adding at all. The knowledge-base lane owns whether a status line ever earns one.",
  "POST /api/tenancy/config/screens":
    "FOR A MACHINE. A team's screen-recipe override is app furniture rather than a record: the assistant writes one, and a screen for editing screens is a screen nobody asked for.",

  // SIX CALENDAR-WRITE DOORS WERE LISTED HERE and are not exempt any more, they
  // are GONE (18 August 2026): create an event, push a sprint's dates, change
  // what an entry says, its guests, its location, call it off. A door with no
  // screen needed a reason; a door that does not exist needs none. The seventh,
  // the meeting push, went with them.
  "POST /api/content/google/drive/upload":
    "FOR A MACHINE. Putting a file INTO Drive is the assistant answering 'save that to the Bergman folder'. A person with a folder open drags it there, and the app's own upload doors are the ones on the record it belongs to.",
  "POST /api/content/google/chat/messages":
    "FOR A MACHINE. Posting into a named space is an act the assistant performs on request; a person is already in the space. The owner asked for read AND post, and the post half is the assistant's.",

  // THE EIGHT THAT FINISH THAT SENTENCE, and they are one decision, not eight.
  // (It was thirteen before the calendar's write half was retired.) Every door on
  // this module acts INSIDE Google — a file in a Drive folder, a label in a
  // mailbox — and kwapso deliberately has no screen for any of it. That is the same ruling the four
  // lines above already stand on, and it is the reason the module exists: a
  // person who wants to rename a file opens Drive, which is better at it than a
  // card we could build beside it would ever be. What kwapso adds is the
  // ASSISTANT doing it on request, and a history row on the connection so "what
  // has kwapso done as me?" has an answer in Settings.
  //
  // Read the two `take it back` doors as part of the same decision rather than as
  // an oversight: they exist so the assistant's own writes are undoable, and the
  // person's undo is Drive's bin and Chat's own delete, which they already have.
  "POST /api/content/google/drive/update":
    "FOR A MACHINE. Rewriting a file is the assistant answering 'update the scope doc with what we agreed'. A person with the document open edits it in Google Docs, which is better at editing documents than anything we would put beside it.",
  "POST /api/content/google/drive/folder":
    "FOR A MACHINE. Making a folder inside a shared one is the assistant tidying as it files — 'put these under a Bergman folder'. A person makes a folder in Drive, in one click, where the folders are.",
  "POST /api/content/google/drive/save-mail":
    "FOR A MACHINE. 'Put that exchange in the client folder' is a sentence somebody says to an assistant; the person's own version is forwarding the thread, which Gmail already does. It is also the one door here that reads one service and writes another, which is exactly the kind of errand a machine is for.",
  "POST /api/content/google/drive/trash":
    "FOR A MACHINE, and specifically to undo a machine. It exists so the assistant can take back a file it wrote; a person uses Drive's own bin, which is the same act on the same file with a shorter path to it.",
  "POST /api/content/google/gmail/reply":
    "FOR A MACHINE. The person's control is the mail reply dialog, which DRAFTS — the owner's ruling that a drafted reply is the normal way to answer mail. This door sends inside the thread, which is the assistant's half of the same sentence and carries the same always-ask confirm.",
  "POST /api/content/google/gmail/label":
    "FOR A MACHINE. Filing a message under a label is the assistant tidying a mailbox on request. A person clicks the label button in Gmail, where the message already is.",
  "POST /api/content/google/gmail/trash":
    "FOR A MACHINE, and specifically to undo a machine — the mail counterpart of the Drive bin two lines up, and the owner asked for it in those words ('why is there no method for you to delete drafts?'). The assistant can write a draft into somebody's mailbox, so it must be able to take one back; a person bins their own mail in Gmail, which is one click from where the message already is. It is also why this app lists no mail and no drafts on any screen: there is no inbox here to hang a bin button on, deliberately, because Gmail is better at being Gmail than a card we could build beside it. THE ONE THING WORTH RE-READING IF THAT CHANGES: web/components/tickets/mail-reply-dialog.tsx is the only place in either front end that ever holds a draft id, and today no screen opens it — the day something does, that dialog is where a person's own 'bin it' belongs and this line goes.",
  "POST /api/content/google/chat/delete":
    "FOR A MACHINE, and specifically to undo a machine — the counterpart of the post door above. It takes back a message kwapso itself sent; a person deletes their own message in Chat.",

  /* ── a gap, owned by another lane ──────────────────────────────────────── */
  // EMPTY, and that is the point of the two headings staying here. Twelve doors
  // sat under this one — both rate cards, the two halves of the Gmail sentence
  // the owner asked for in words, a correction to a row of time, two uploads and
  // a profile nobody could retire — and each of them now has something a person
  // can press. What is left above is not a backlog: every line up there says a
  // MACHINE is the caller, which is a decision rather than a gap.
}
