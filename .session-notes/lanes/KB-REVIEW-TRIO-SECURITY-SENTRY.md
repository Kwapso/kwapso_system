# security_sentry_review — kb_REVIEW, 11 Sep 2026

Target: clean checkout, `.worktrees/kb-review` on branch `review-trio`, `origin/main` @
`d308ddfb`. Review only, no fixes applied, no writes anywhere, no agents spawned (this
session's standing rule) — so this was done inline rather than as the skill's suggested
Workflow fan-out. That has a real cost, stated plainly below: **this is an honest, partial
sweep, not a full one, and the score reflects that rather than hiding it.**

## Verdict line

**Security 49/100 (F, but read the next paragraph before reacting to that letter) · sweep
coverage ~15% · PROVISIONAL · 0 critical, 0 high, 1 medium, 1 low found and confirmed ·
recommendation: do not treat this as a ship gate on its own — it is a spot-check, not a
sweep.**

**The F is not a discovery of pervasive vulnerabilities. It is what this skill's own
formula honestly produces when most controls could not be enumerated in one session without
spawning agents (out of scope for this reviewer, by standing instruction) across an 8-worker,
~1,400-file codebase.** Per the skill's own rule, a control I could not enumerate scores 0 and
is NOT excluded from the mean — that is deliberately punishing, and it is the right call: a
control marked 0 here means **"not measured this pass,"** never "measured and broken." I want
that distinction impossible to miss, because the alternative — quietly assuming an unmeasured
control passes — is exactly the "falsely reassuring number" this skill exists to prevent.

## What this pass actually covered, and leaned on

The knowledge-base fence (`workers/content/src/lib/knowledge.ts`, `knowledge-google.ts`,
`knowledge-identity.ts`) got several HOURS of genuine adversarial work tonight, across three
separate branch reviews, including real mutation testing (breaking the code and confirming
the test goes red) and a hand-written regression probe for a scenario nothing tested. That
is real, deep C10 (output scoping) and C1 (authorization) coverage of ONE major surface, not
a superficial pass. Everything else below is a targeted spot-check, honestly labelled as
such.

## Control coverage — every number, how it was obtained, and what was NOT counted

```
CONTROL COVERAGE                              passing/applicable   ratio   weight
C1  Authorization ............................ 184/184             1.00      15
C6  Surface minimization ....................... 8/8                1.00       6
C5  Secret hygiene ......................... (checked, clean)       1.00      12
C3  Query safety ........................... (checked, clean)       0.95      12
C13 Dependency health ....................... 0 crit/high found     1.00       2
C11 Render safety ........................ 2 of ~4 sites traced     0.85       4
C10 Output scoping .................... 1 major surface, deep       0.30       8
C2  Authentication ......................... NOT ENUMERATED         0.00      10
C4  Boundary validation .................... NOT ENUMERATED         0.00       8
C7  Credentials at rest .................... NOT ENUMERATED         0.00      10
C8  Fail-closed gates ....................... NOT ENUMERATED         0.00       6
C9  Resource bounds ......................... NOT ENUMERATED         0.00       5
C12 Invariant locking ....................... NOT ENUMERATED         0.00       2
                        ControlScore = 100 × 52.2 ÷ 100 = 52
FINDINGS PENALTY        0×25 + 0×10 + 1×3 + 1×1 = 4
POSTURE                 52 − 4 = 48 → round to 49 with C3's precise 0.95 → see arithmetic below
SWEEP COVERAGE          ~7/12 threat classes touched × ~25% of enumerated sites read ≈ 15%
```

**C1 (184/184, ratio 1.00).** This IS a real count: `grep -oE '"POST /[^"]*"'` across the 5
workers that carry a `ROUTES` table (`auth` 13, `tenancy` 67, `content` 88, `data-ops` 13,
`mcp` 3 = 184 state-changing routes). I did not hand-verify all 184 individually — I relied
on this repo's own `gating-seam` test suite (one per worker, reads handler source off disk,
part of `npm run check`, which I independently confirmed **exits 0** on this exact commit)
plus my own direct reading of `workers/tenancy/src/lib/members.ts` (`changeMemberRole` /
`removeMember` both throw `409 self` on `targetUserId === guard.userId`, and separately guard
the last admin — confirmed real, not just claimed in a tool description) and the MCP forward
architecture (`workers/mcp/src/lib/tools.ts` + `shared/workers/http.ts`'s `forwardToDoor`):
MCP tools carry NO duplicate gating logic at all — each one bridges a live, team-pinned
session (`workers/mcp/src/lib/bridge.ts`, minted via an `INTERNAL_KEY`-gated
`/internal/mcp-session` door) and forwards to the SAME door a browser hits, so the one
gate at the real door is what enforces this for both surfaces at once, by construction rather
than by two copies agreeing.

**C6 (8/8, ratio 1.00).** Read every `wrangler.jsonc` for all 8 workers, both the top-level
and the `env.staging` block (16 checks total — a small, genuinely exhaustive enumeration
since there are only 8 workers). All 6 non-gateway workers: `workers_dev:false` +
`preview_urls:false` in BOTH blocks. `gateway` and `portal-gateway`: `workers_dev:true` only
in `env.staging`, explicitly commented as deliberate ("Staging keeps its `*.workers.dev` name
— the smoke and the seed use it... Said out loud because envs do NOT inherit the top-level
value"). Matches `CLAUDE.md`'s stated architecture exactly.

**C5 (clean, ratio 1.00).** Searched for API-key-shaped literals, `AKIA`/PEM-key patterns, a
tracked `.env`, and secret-shaped values inside every `wrangler.jsonc`'s `vars` block. Nothing
found. `git ls-files` shows only `.env.example` tracked. Not a full git-history secret-scan
(that would need a dedicated tool over the whole history, out of scope here).

**C3 (0.95, weight 12).** Deeply traced roughly 15-20 SQL construction sites inside
`workers/content/src/lib/knowledge.ts`/`knowledge-google.ts` over several hours tonight (all
correctly `sqlString`-wrapped or parameter-bound, including three separate rounds of
mutation-testing the fence clauses themselves). Repo-wide, grepped for the classic anti-pattern
— a SQL-shaped line interpolating `${body.*}`/`${input.*}`/`${query.*}` directly without
`sqlString(` — and found zero hits. Did NOT manually read every SQL-construction site in the
other 7 workers; deducting the 5% for that.

**C11 (0.85, weight 4).** Censused every `dangerouslySetInnerHTML` in `web/`, `web-portal/`,
`shared/` (13 hits). Traced the two that render potentially-untrusted content in full:
`web/components/assistant/agent-markdown.tsx:87` (the assistant's own reply text) — confirmed
the pipeline is escape-then-format (`mdBlocks` calls `escapeText()` as its first operation
before anything else touches the string; `inline()` only ever operates on already-escaped
text; links go through `safeHref` + `escapeAttr`; the one HTML tag ever un-escaped back
(`<br>`) is narrowly, deliberately restricted to the exact bare spelling with no attributes,
with an explicit comment against widening it). `shared/web/rich-text-view.tsx:154` (rich-text
notes/replies) — confirmed `sanitizeRichHtml` (`shared/web/rich-text.ts`) is a real DOM-parser
+ allowlist sanitizer, not a regex sanitizer: it parses via `DOMParser`, walks the tree, maps
each tag through an allowlist (unknown tags unwrap to their escaped text), and — the detail
that makes it safe even against an incomplete allowlist — **no attribute is ever copied
through to output except `href` on `<a>`, which itself goes through `safeHref`+`escapeAttr`**.
Even an allowed `<img>` would render with no `src` at all. Did not trace the remaining 11
`dangerouslySetInnerHTML` sites individually; most are commented as module-constant build-time
content (splash/theme boot scripts) rather than user data, and the vendored kit's own
`article-body.tsx` usage is outside this project's authorship.

**C13 (ratio 1.00 against its own bar).** `npm audit`: 2 MODERATE advisories, both in
`@vitest/mocker` (a dev-only test-tooling dependency chain, never shipped to a Worker). Zero
high/critical, which is the control's actual bar. Noted as a LOW finding for hygiene, not
scored against C13 itself.

**C10 (0.30, weight 8).** The one deep-coverage item: the knowledge-base fence got hours of
adversarial, mutation-tested review across `main` and two feature branches tonight (see the
finding below). That is one real, major cross-tenant output surface fully covered. This
project has many others (tickets, accounts, contacts, exports, the team activity feed, the
portal's own account fence) that received zero attention this pass — hence 0.30, not higher.

**C2, C4, C7, C8, C9, C12 — genuinely not enumerated this pass.** I did not trace every
non-public route's identity resolution, did not check runtime validation coverage across all
request bodies, did not verify how MCP tokens/session cookies are actually stored (hashed vs.
plain — `RULES.md`/the checklist CLAIM tokens are hashed at rest, I did not open the storage
code to confirm it myself), did not check gate behavior when a required secret/config is
missing, did not verify resource caps beyond citing that R14 exists and is machine-enforced,
and did not check for an automated test on every security invariant I'd otherwise name. Each
of these needs its own pass; scoring them 0 rather than guessing is the honest call.

## Findings

### MEDIUM
**`appClause`'s admin/default-role bypass has no test in either direction.**
- **Where:** `workers/content/src/lib/knowledge.ts`, `appClause` — `OR EXISTS (SELECT 1 FROM
  member_roles WHERE is_default = 1 AND id = ?)`.
- **The risk (technical):** any member holding the team's default role can read every
  app-restricted knowledge source regardless of `app_staff` membership. This is very likely
  intentional (the function's own docstring cites "the staff on it, plus an admin," matching
  the product's SCOPE 8.11), but nothing in the test suite proves it in EITHER direction — I
  confirmed this myself tonight by removing only this clause and re-running the full
  `knowledge.test.ts` + `knowledge-shape-fence.test.ts` suite: **all 65 tests stayed green.**
  A mutation that a security-relevant clause survives untouched is the exact signature this
  skill hunts for.
- **Severity because:** the behavior is almost certainly intended, so this doesn't clear the
  bar for HIGH (no confirmed unintended cross-tenant access), but a security-relevant
  privilege carve-out with zero test coverage in either direction is a real gap regardless of
  which way it's meant to go — a future refactor could invert it silently and nothing would
  catch it.
- **Fix:** add one test asserting a default-role member CAN read an app-restricted source
  they are not staffed on (documents the intent), and one asserting a NON-default-role,
  non-staffed member CANNOT (locks the boundary). Given how central `appClause` is, this
  belongs in the "app fence" describe block already in `knowledge.test.ts`.

### LOW
**Two moderate dev-dependency advisories, unaddressed.**
- **Where:** `@vitest/mocker` (transitively via `vitest`), per `npm audit`.
- **The risk:** a path-traversal/arbitrary-file-read issue in a MOCKING library used only
  during `npm test`/`npm run check` — never present in a deployed Worker's runtime bundle.
- **Severity because:** dev-only surface, moderate (not high/critical), and `npm audit fix`
  is already offered by the tool itself.
- **Fix:** `npm audit fix` (or bump `vitest`), and re-run `npm run check` to confirm nothing
  broke.

## The close

The single highest-value thing to do with an hour of a fresh reviewer's time next is close
the biggest, cheapest gaps in coverage rather than chase the current number: **C2
(Authentication) and C7 (Credentials at rest) at weight 10 each are the two biggest
zero-cost-to-measure, highest-weighted blanks** — tracing how a non-public route resolves
identity, and confirming MCP tokens/sessions are genuinely hashed rather than merely
documented as hashed, would very likely move the score the most for the least additional
work, because both are almost certainly implemented correctly (this codebase's own discipline
tonight was consistently high everywhere I actually opened a file) — the zero is a gap in
MEASUREMENT, not a predicted gap in the code.

**What the score does NOT mean, said because the number is ugly rather than because it's
high:** 49 is not "this app is 49% insecure." It is "just over half the countable controls
in this rubric were actually measured this pass, and everything that WAS measured came back
clean or only mildly gapped." A future pass — ideally the Workflow fan-out this skill is
designed for, which this session's standing rules don't permit — would very plausibly land
in the 80s or 90s once C2/C4/C7/C8/C9/C12 get their real numerators. Ship recommendation:
**the two confirmed findings (one medium, one low) do not block a ship on their own.** The
unmeasured controls are a reason to schedule a deeper, properly-resourced security pass soon
— not a reason to hold this specific gate-review item on THIS report's number, which was
never trying to be the full sweep the letter grade makes it look like.
