// Guards on the agent's safety surface (pure logic — no model/DB/network):
//  • the confirm rule — removals (remove a member, revoke an invite), the four PRIVILEGE
//    GRANTS (who-can-do-what never changes silently),
//    deactivations (a role/article/dropdown value, only when switching OFF), and
//    deactivations and bulk/import writes pause for the yes/no panel; every OTHER
//    constructive write (article, ticket, reply, team details, reactivate) runs free,
//  • the catalog is OPT-IN (only listed actions are tools), and
//  • the agent acts AS the user with the user's EXACT rights (the server re-checks each
//    call); it still cannot control device sessions or delete the team. Managing
//    existing members (set a role, remove someone) IS allowed — normal, re-gated CRUD.

import { describe, expect, it } from "vitest"

import { getTool, requiresConfirm, toolSpecs, TOOL_CATALOG } from "../src/lib/tools"
import { isMoneyWrite, isPrivilegeWrite, TOOL_GATES } from "@shared/workers/tool-gates"

describe("step/confirm summaries resolve ids to human names", () => {
  const names = { "01ROLE": "Sub Admin", "01USER": "Jane Doe" }

  it("names a role by title (not a ULID) when resolved", () => {
    expect(
      getTool("set_record_active")!.summarize({ record: "role", roleId: "01ROLE", active: false }, names)
    ).toBe("Deactivate the Sub Admin role")
    expect(getTool("set_role_permissions")!.summarize({ roleId: "01ROLE", value: {} }, names)).toBe(
      "Set access rights for the Sub Admin role"
    )
    expect(getTool("invite_member")!.summarize({ email: "sam@x.com", roleId: "01ROLE" }, names)).toBe(
      "Invite sam@x.com as Sub Admin"
    )
    expect(
      getTool("set_member_role")!.summarize({ userId: "01USER", roleId: "01ROLE" }, names)
    ).toBe("Change Jane Doe to Sub Admin")
  })

  it("falls back to the raw id when a name can't be resolved (never throws)", () => {
    expect(
      getTool("set_record_active")!.summarize({ record: "role", roleId: "01ROLE", active: true })
    ).toBe("Activate role 01ROLE")
    expect(getTool("invite_member")!.summarize({ email: "sam@x.com", roleId: "01ROLE" })).toBe(
      "Invite sam@x.com as role 01ROLE"
    )
  })
})

describe("agent tool catalog + confirm rule (destructive + privilege grants)", () => {
  // THE RULE, in two halves. (1) DESTRUCTIVE acts confirm — removing a member,
  // revoking an invite, deactivating a record. (2) So do PRIVILEGE GRANTS, and
  // only these four: the model reaches them while reading team data an attacker
  // can author (a ticket description is 20,000 characters of someone else's
  // text), so a silent grant is a silent privilege escalation. Everything else
  // constructive still runs straight away — that is the deliberate UX.
  // The set is written out so it cannot quietly GROW back into "confirm
  // everything", which is the friction this rule was written to remove.
  const DESTRUCTIVE = ["remove_member", "revoke_invite"]
  // NOT here any more, and worth saying why: `raise_help_ticket` and
  // `update_help_ticket`. Both carry `accountId`, which decides WHICH CLIENT CAN
  // READ THE TICKET — the update door sets it on a ticket that had none, handing
  // over the whole reply history, and the raise door can post agency content into
  // a named client's portal from birth. Both are reachable from a model that has
  // just been reading ticket text a client wrote, so both stop for the panel now.
  // See workers/content/test/fence-row-confirm.test.ts and FENCED_ROW_OWNERS.
  const RUNS_FREELY = [
    "update_team",
    "create_brand_asset",
    "update_brand_asset",
    "reply_help_ticket",
    "create_dropdown_value",
    "update_dropdown_value",
  ]

  it("confirms destructive acts", () => {
    for (const name of DESTRUCTIVE)
      expect(requiresConfirm(getTool(name)!), `${name} must confirm (destructive)`).toBe(true)
  })

  // DERIVED, never a name list: every catalogued WRITE whose gate lands on
  // member_roles or team_members must confirm. A name list locks the tools you
  // thought of and waves through the next one — deriving it is what caught
  // update_role sitting at confirm:false beside four that confirmed.
  it("confirms every write that touches who-can-do-what — derived from the catalog", () => {
    const privilege = TOOL_CATALOG.filter((t) => isPrivilegeWrite(t))
    expect(privilege.length, "the derivation must actually find the privilege writes").toBeGreaterThanOrEqual(6)
    for (const t of privilege) {
      expect(
        t.confirm,
        `${t.name} writes to a privilege table (${TOOL_GATES[t.name] ?? t.path}) — it must DECLARE confirm: true, not a predicate and not false`
      ).toBe(true)
      expect(requiresConfirm(t, { active: true }), `${t.name} must confirm whatever its input`).toBe(true)
      expect(requiresConfirm(t, { active: false }), `${t.name} must confirm whatever its input`).toBe(true)
    }
    // …and the derivation must not sweep up ordinary content writes.
    for (const name of RUNS_FREELY)
      expect(isPrivilegeWrite(getTool(name)!), `${name} is not a privilege write`).toBe(false)
  })

  // THE SAME DERIVATION, ONE STEP ALONG. A privilege write decides who may act;
  // a RATE CARD write decides what an hour is worth. Both are wrong quietly —
  // and a wrong rate is the quieter of the two, because it returns success and
  // re-prices every margin computed after it.
  //
  // Derived, never a name list, for the reason the test above it gives. It was
  // worth it: six of the seven `commercials` writes declared confirm:true and
  // `set_role_rate` — the third rate card, added after the other two — declared
  // false, with nothing to catch that it had been added differently.
  //
  // THE FLOOR FELL FROM FIVE TO TWO AND THEN TO ZERO, both on 10 Sep 2026, and a
  // falling tripwire is the move that turns a check blind — so this case is
  // RETIRED IN PLACE rather than deleted or quietly weakened, and what it
  // measures now is the retirement itself.
  //
  // The client retired the internal rates first, taking four of the seven
  // `commercials` writes with the doors behind them (`create_internal_rate`,
  // `update_internal_rate`, `set_internal_rate_active` and `set_role_rate`, the
  // very tool this case was written about). An hour later she retired the
  // ACCOUNT rate card too — "the whole account rates also killed it" — and the
  // remaining three went (`create_account_rate`, `update_account_rate`, and
  // `set_account_rate_active`, which was `set_record_active`'s `account_rate`
  // record and was judged by the toggle suite).
  //
  // SO `isMoneyWrite` ANSWERS FALSE TO EVERY TOOL IN THE CATALOGUE. A case that
  // looped over an empty set and asserted a property of each member would PASS,
  // finding nothing, for ever — which is the exact failure `shared/workers/
  // tool-gates.ts` argues against one file away. Instead:
  //
  //   · THE EMPTINESS IS PINNED, exactly, so a `commercials` write appearing
  //     tomorrow turns this red and somebody decides about its confirm on
  //     purpose rather than by omission. That is a stronger guard than the old
  //     `>= 2` floor, which could not have noticed a fifth tool being added
  //     without one.
  //   · THE PREDICATE IS STILL EXERCISED, on the two NAMED negative controls the
  //     old case ended with. They are what stops `isMoneyWrite` from being
  //     re-written to match everything while the set above stays empty.
  //   · AND `commercials` STILL HAS A LIVE READ, asserted, so "the module was
  //     deleted" and "the module has no writes" stay distinguishable.
  it("no tool writes money any more — pinned, so the next one that does is decided on purpose", () => {
    const money = TOOL_CATALOG.filter((t) => isMoneyWrite(t))
    expect(
      money.map((t) => t.name),
      "a `commercials` write is back in the catalogue. That is not a failure — it is this pin doing its job. " +
        "Restore the confirm assertions this case carried until 10 Sep 2026 (git history), decide whether the " +
        "new tool DECLARES confirm: true, and re-point the pin at it."
    ).toEqual([])
    // The module is still here and still read — `get_app_impact` is a read tool
    // on the one door `commercials` still gates — so an empty write set above is
    // "nothing writes money" and never "the module quietly went away and this
    // pin is vacuous". Asserted off the CATALOGUE rather than off TOOL_GATES,
    // which holds writes only (a read's gate lives on its door, and R36's census
    // reads it there).
    // …and the predicate must not sweep up a price that is NOT a rate card. A
    // client tool's price is `processes`, deliberately — a fact about one
    // client's setup, not a card the whole book is costed from. If that line ever
    // moves, this fails and somebody decides on purpose.
    expect(
      getTool("get_app_impact")?.path,
      "`commercials`'s one surviving door lost its tool — the pin above would then be measuring a module nothing reaches"
    ).toBe("/api/tenancy/app-money")
    expect(isMoneyWrite(getTool("get_app_impact")!), "a READ is never a money write").toBe(false)
    expect(isMoneyWrite(getTool("set_client_tool_price")!), "a tool price is processes, not commercials").toBe(false)
    expect(isMoneyWrite(getTool("update_team")!), "the derivation must not sweep up ordinary writes").toBe(false)
  })

  // The other half of the same slip, and the one that cost money rather than a
  // panel: a missing `centsPerHour` used to coerce to 0, which is a VALID rate.
  // The call succeeded and priced the work at nothing.
  //
  // IT WAS WRITTEN ABOUT `set_role_rate` and RE-POINTED TWICE ON 10 SEP 2026, as
  // each rate card was retired under it — first onto the account rate card's two
  // body writes, and then, when those went too, onto the two writes that still
  // send an hourly figure: `create_client_role` and `update_client_role`.
  //
  // RE-POINTED RATHER THAN RETIRED, BOTH TIMES, because the fault is in the
  // SHAPE of the builder and never in one tool. `centsPerHour` on a client role
  // is what an hour of that client's OWN person costs THEM — a different
  // audience from every card that has been retired, and the same failure
  // available: a missing number coercing to 0 is a VALID rate, so the call
  // succeeds and prices the work at nothing. It is also the figure `listSavings`
  // freezes onto every step of a map, so a zero here silently makes a whole
  // process's saving worth nothing while every screen keeps rendering.
  //
  // Both are checked, because the original slip was one builder being written
  // differently from its neighbour and one of a pair is exactly the case that
  // hides that.
  it("an hourly-rate write with no number sends undefined, so the door can refuse it", () => {
    for (const name of ["create_client_role", "update_client_role"]) {
      const build = getTool(name)!.buildBody!
      const base = { id: "01ROLE", accountId: "01ACC", name: "Dispatch clerk" }
      expect(build({ ...base }).centsPerHour, `${name} must not coerce a missing rate to 0`).toBeUndefined()
      expect(build({ ...base, centsPerHour: 4500 }).centsPerHour, `${name} sends a real rate`).toBe(4500)
      // Zero is still sendable when it is MEANT — the fix must not make free
      // work unpriceable.
      expect(build({ ...base, centsPerHour: 0 }).centsPerHour, `${name} sends a deliberate zero`).toBe(0)
    }
  })

  it("every OTHER constructive write still runs freely (the friction stays gone)", () => {
    for (const name of RUNS_FREELY)
      expect(requiresConfirm(getTool(name)!), `${name} runs freely (constructive)`).toBe(false)
  })

  it("(de)activate toggles confirm ONLY when turning something OFF (input-aware)", () => {
    // Deactivating an existing record is destructive → confirm; reactivating is not.
    // The `role` record is NOT in this list: it writes to member_roles, so the
    // derived privilege rule makes it confirm both ways (a reactivated role hands
    // its rights back to everyone holding it) — asserted just below.
    const t = getTool("set_record_active")!
    for (const record of ["brand_asset", "dropdown_value", "app", "meeting"]) {
      expect(requiresConfirm(t, { record, active: false }), `${record} deactivate must confirm`).toBe(true)
      expect(requiresConfirm(t, { record, active: true }), `${record} activate runs freely`).toBe(false)
      // A missing/omitted `active` deactivates (buildBody sends active:false), so it
      // must confirm too — the predicate mirrors buildBody's `active === true`.
      expect(requiresConfirm(t, { record }), `${record} with no active deactivates → confirm`).toBe(true)
    }
    // BOTH WAYS for the access writes, derived rather than declared.
    for (const record of ["role", "portal_access", "contact_link"])
      for (const active of [true, false])
        expect(
          requiresConfirm(t, { record, active }),
          `${record} is an access write — it asks with active:${active} too`
        ).toBe(true)
    // …and an unrecognised record asks, because a question nobody has an answer
    // to is answered in the safe direction.
    expect(requiresConfirm(t, { record: "nonsense", active: true })).toBe(true)
  })

  it("never confirms a read", () => {
    for (const t of TOOL_CATALOG.filter((t) => !t.write)) {
      expect(requiresConfirm(t)).toBe(false)
    }
  })

  it("can set + read a role's access rights (parity with the Roles screen)", () => {
    expect(getTool("set_role_permissions")).toBeDefined()
    expect(getTool("get_role_permissions")).toBeDefined()
    expect(getTool("set_role_permissions")!.write).toBe(true)
    expect(getTool("get_role_permissions")!.write).toBe(false)
  })

  it("bulk tools change many records at once — write, confirm (high-blast), via CONTENT", () => {
    // A bulk change hits many rows, so it's always confirmed with a count-bearing summary.
    for (const name of ["bulk_set_help_status"]) {
      const t = getTool(name)
      expect(t, `tool "${name}" must be defined`).toBeDefined()
      expect(t!.write).toBe(true)
      expect(t!.confirm).toBe(true)
      expect(requiresConfirm(t!)).toBe(true)
      expect(t!.binding).toBe("CONTENT")
      expect(t!.path.startsWith("/api/")).toBe(true)
    }
  })

  it("can LIST invites — so it can find a pending invite's id to revoke it", () => {
    // The gap that broke 'revoke sabiha's invite': revoke_invite needs an inviteId, but
    // there was no tool to list pending invites (list_members only shows joined members).
    const t = getTool("list_invites")
    expect(t, "list_invites must exist").toBeDefined()
    expect(t!.write).toBe(false)
    expect(t!.binding).toBe("TENANCY")
    expect(t!.path).toBe("/api/tenancy/invites")
    // revoke_invite (the tool it feeds) is still there.
    expect(getTool("revoke_invite")).toBeDefined()
  })

  it("manages members AS the user — set_member_role + remove_member are present", () => {
    // The agent acts AS the user with their EXACT rights (the server re-checks each
    // call), so member management is allowed. Removing a member is destructive and
    // re-assigning a role is a privilege grant — both stop for the confirm panel.
    expect(getTool("remove_member")).toBeDefined()
    expect(getTool("set_member_role")).toBeDefined()
    expect(requiresConfirm(getTool("remove_member")!)).toBe(true)
    expect(requiresConfirm(getTool("set_member_role")!)).toBe(true)
  })

  it("exposes a spec for every catalogued tool, and nothing else is callable", () => {
    const specs = toolSpecs()
    expect(specs.map((s) => s.name).sort()).toEqual(TOOL_CATALOG.map((t) => t.name).sort())
    // Catastrophic acts stay out of the catalog: deleting the team, signing out devices.
    expect(getTool("delete_team")).toBeUndefined()
    expect(getTool("sign_out")).toBeUndefined()
    expect(getTool("change_my_email")).toBeUndefined()
  })

  it("still cannot control device sessions or delete the team (catastrophic acts blocked)", () => {
    // Device-session control and team deletion are catastrophic, not normal CRUD, so
    // they stay out of the catalog by name and by surface.
    const banned = /delete_team|sign_out/i
    for (const t of TOOL_CATALOG) {
      expect(banned.test(t.name), `tool "${t.name}" must not be a catastrophic act`).toBe(false)
    }
    // No tool may touch the device-sessions surface.
    for (const t of TOOL_CATALOG) {
      expect(/sessions/.test(t.path), `tool "${t.name}" path ${t.path}`).toBe(false)
    }
  })

  it("every write tool declares how it's gated (a module the real door checks)", () => {
    for (const t of TOOL_CATALOG) {
      if (t.binding === "SELF") {
        // A SELF tool runs inside data-ops — its gate is its own handler, which
        // must exist (it re-opens teamContext + requireRight from the request).
        expect(typeof t.run, `SELF tool "${t.name}" must carry a run handler`).toBe("function")
        continue
      }
      expect(t.binding === "CONTENT" || t.binding === "TENANCY").toBe(true)
      expect(t.path.startsWith("/api/")).toBe(true)
    }
  })

  it("the chat-import runner always confirms (writing a whole file is high-blast)", () => {
    const t = TOOL_CATALOG.find((x) => x.name === "run_import_batch")
    expect(t).toBeDefined()
    expect(t?.confirm).toBe(true)
    expect(t?.write).toBe(true)
  })
})
