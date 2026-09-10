# LANE kb_REVIEW — break the permission fence. Adversarial, fresh eyes.

You are **kb_REVIEW**. Your job is **to find the way this code lets one person read
another person's material.** You are not here to confirm it works. You are here to
break it, and to say plainly what you could not break.

**You have been given NO prior context on purpose.** Another session designed and
built this. Its reasoning is in the code and in a log. **Read the code FIRST and the
reasoning SECOND** — an incumbent's explanation is very good at making a reader stop
looking.

**YOU MAY NOT SPAWN AGENTS. EVER.** **Your cost is $0** — read code, run tests, run
queries against a local SQLite. Do not call an AI model.

**Do not fix anything.** Report. A reviewer who fixes becomes an author and stops
being able to see it.

---

## STEP 1 — set up a CLEAN checkout. Not a worktree of the working copy.

```
cd /Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa
git fetch origin
git worktree add .worktrees/kb-review origin/main --detach
cd .worktrees/kb-review
npm install
npm run check ; echo "EXIT=$?"
```

`EXIT=0` is expected. **Read the number. Do not grep the output** — a suite that
fails to LOAD prints no failures and still exits 1.

Everything you create lives inside this project. Never the Desktop, never `~/`.

## STEP 2 — understand what the fence is SUPPOSED to do, from the code only.

Read these, in this order, and write down what you think the rule is **before**
reading anyone's explanation of it:

1. `workers/content/src/lib/knowledge.ts` — find `ownerClause`, `appClause`,
   `readerClause`. These are the fence.
2. `workers/content/src/lib/knowledge-identity.ts` — `Sighting`, `readableBy`,
   `liveSightings`, `stillLive`, `teamVisible`.
3. `workers/tenancy/src/team-schema/migrations.ts` — search for
   `knowledge_sightings`, `team_visible`, `generated_only`.
4. `documents/DATA-MODEL.md`, knowledge section.

**Only after all of that**, read `.session-notes/lanes/HUB-KB-LOG.md` — the design
argument, including the parts the hub got wrong and had to reverse.

## STEP 3 — the claims to break. Attack each one. Report per claim.

The implementer asserts each of these. **Your job is to falsify them.** For each,
say **BROKEN** (with the exact case) or **HELD** (with what you tried).

**CLAIM 1.** `readableBy(sightings, me)` returns exactly the same set of readable
sources as the fence that runs today (`owner_user_id IS NULL OR owner_user_id = me`).
→ *Attack: what row shape makes these disagree? What if a source has no sightings at
all? What if every sighting is retired? What if `owner_user_id` is set AND a team
sighting exists?*

**CLAIM 2.** `teamVisible(s) || <me has a live sighting>` is equivalent to
`readableBy(s, me)`.
→ *Attack: find a sightings array where they differ. Look hardest at retired
sightings and at the empty array.*

**CLAIM 3.** `team_visible` is only ever a NARROWING aid and never the authoritative
answer; the authoritative check is the read-back join to `knowledge_sources`.
→ *Attack: find any read path that reaches a chunk or a passage WITHOUT that join.
Search every caller. If one exists, that is a fence bypass.*

**CLAIM 4.** The app-visibility tier (`visible_to_app_id`, riding `app_staff`) is
still enforced on every path after the sightings change.
→ *Attack: `Sighting.shelf` is only `private` or `team`. Where does the app tier go?
Find a read where a source restricted to one app's staff reaches somebody else.*

**CLAIM 5.** A stale `team_visible` cannot leak. It is recomputed in the same
statement or transaction as any write touching a sighting's `shelf` or `gone_at`.
→ *Attack: find a write path that changes a shelf or sets `gone_at` and does NOT
recompute. A follow-up write that can be skipped, an early return, a failure between
the two statements, a batch that partially applies.*

**CLAIM 6.** Retiring a sighting removes that person's access within one sweep.
→ *Attack: `gone_at` is set — does every read honour it? Does the chunk copy? Does
the terms copy? Does the vector index?*

**CLAIM 7.** A CARD (`generated_only = 1`) is findable but never quotable.
→ *Attack: find a path that returns a card's BODY as a passage or a citation.*

## STEP 4 — four specific things to check, found the hard way tonight

These are real faults that occurred in this codebase in the last day. Check whether
any survives anywhere in the fence code:

1. **A probe that reads a benign 404 as "gone" and deletes material.** Four
   instances were found. Look at anything that decides something is missing.
2. **A test that mocks away the very function it is testing.** `googlePresence`
   had NO test that ran it until last night — every caller mocked it. **For every
   fence function, ask: is there a test that RUNS this, or only tests that mock it?**
   List any fence function with no test that executes it.
3. **A test that asserts the RETURN VALUE when it should assert the REQUEST.**
   Asserting the answer alone passes against a wrong query whenever the mock says
   yes.
4. **A check that derives its expectation from the thing it is checking.** One test
   here did (`toBeLessThanOrEqual` on a value read from the code) and can never
   fail. Look for that shape in the fence tests.

## STEP 5 — run the tests, and try to make them lie

1. Run the fence tests: `cd workers/content && npx vitest run test/knowledge-*.test.ts`
2. **Mutation-test them.** For each fence test, break the code it guards — invert a
   condition, delete a clause, remove the retired-sightings filter — and confirm the
   test goes RED. **A test that stays green when you break its subject is not a
   control.** Report every one you found that stayed green.
3. Revert your mutations. `git checkout .` when done.

## STEP 6 — report

Message the hub session (title contains `planner` or `hub`, cwd
`/Users/alaap_kanchwala_apple/Desktop/kwapso_cpaa`) with
`mcp__ccd_session_mgmt__send_message`:

- **Per claim (1–7): BROKEN or HELD**, and for BROKEN the exact case — the row
  shape, the call path, the user who reads what.
- **Every fence function with no test that RUNS it.**
- **Every test that stayed green when you broke its subject.**
- Anything in STEP 4's list you found.
- **What you could not check, and why.** An honest gap is worth more than a
  reassurance.

**Do not soften a finding because the design argument is persuasive.** The log you
read in STEP 2 contains five occasions where a confident, well-argued position was
wrong. If the code and the argument disagree, the code wins.
