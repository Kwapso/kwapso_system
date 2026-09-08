# REPORT — connstate (fix/connections-tab-honest-states)

**Commit measured:** `febacb17` on `fix/connections-tab-honest-states`, pushed to
`origin/fix/connections-tab-honest-states`. Branched from `origin/main` at
`96a8f829` (precondition satisfied).

## The bug

`web/components/knowledge/knowledge-detail.tsx` (~line 353), the Connections
tab's map panel:

```tsx
return mapQ.data ? (
  <RelationshipMap ... />
) : (
  <Skeleton variant="list" lines={4} />
)
```

`mapQ` is `useCached(...)`, which returns `{ data, loading, error, refresh }`.
`data` stays `undefined` on a rejected fetch exactly as it does before the
first fetch settles, so a door timeout or 500 rendered the identical four grey
rows as "still loading" — forever, since nothing re-fetches on its own. This
is the house failure pattern CLAUDE.md names by name: a wrong answer that
looks like an answer.

## The fix

```tsx
) : mapQ.error ? (
  <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
    {t("Couldn't load this record's connections.")}
    <Button variant="secondary" size="sm" onClick={() => mapQ.refresh()}>
      {t("Try again")}
    </Button>
  </p>
) : (
  <Skeleton variant="list" lines={4} />
)
```

Same shape as the existing block-level retry in
`web/components/work/work-logs-panel.tsx:422-430` (a `p` + secondary `Button`
calling `.refresh()`) rather than a new component — reuse, not invention.

The **genuinely-empty** state needed no new code: `RelationshipMap`
(`web/components/records/relationship-map.tsx:312-316`) already renders the
kit's own `CollectionEmptyState` ("Nothing is linked to this yet.") when
`links.length === 0`, per the owner's 7 Sep 2026 ruling that the kit's empty
register — not a hand-rolled one — is the answer here. Verified this still
fires correctly (test 3 below).

Three states now exist where two did:
1. **Loading** — `mapQ.data === undefined && !mapQ.error` → skeleton.
2. **Failed** — `mapQ.error` → sentence + working retry.
3. **Empty / loaded** — `mapQ.data` → `RelationshipMap`, which itself draws
   the kit's empty register when the neighbourhood has no links.

## Census: every other `X.data ? … : <Skeleton>` in web/ and web-portal/

Per the brief's warning, `grep` can silently skip files with embedded control
bytes (exit 1, no output, no error). Before trusting any grep result I ran
`file -b` over every `.ts`/`.tsx`/`.js`/`.jsx` file under `web/` and
`web-portal/` — none reported anything but ASCII/UTF-8 text, so no file was
silently dropped for this census. I then cross-checked plain `grep -rl` against
`git grep -l` for `<Skeleton` across both trees — both returned **62 files,
182 line hits**, byte-for-byte the same file list, so grep is trustworthy here.

Locating the actual `X.data ? A : <Skeleton>` **shape** (not just files that
happen to contain the word `Skeleton`) needs more than a keyword count, since
the ternary can span many lines. I used two independent instruments and only
trusted where they agreed:

1. A window-based scan (`.data ?` appearing anywhere in the 40 lines before
   each `<Skeleton` occurrence) — a deliberately loose net, to catch anything
   nearby.
2. An `awk` pass matching the **syntactic** shape directly: `<Skeleton` sitting
   as a ternary's alternate branch (the line either starts `) : (` / `: (` /
   `: <Skeleton`, or the previous line ends `: (`).

Instrument 1 (loose) surfaced 8 candidates:

| File : line | Verdict |
|---|---|
| `web-portal/components/delivery-block.tsx:62` | **Not the bug.** False-positive from my own regex (`sprintsQ.data ?? []` matched `.data \?`). Already checks `.error` first with an early return + `ErrorPanel` + retry (line 46-56), then `.loading` for the skeleton. |
| `web-portal/components/ticket-attachments.tsx:178` | **Not this shape**, but a related, different bug worth flagging separately (see below) — it guards on `.loading && !.data`, not `.data ? … : Skeleton`. |
| `web/components/choices/selectable-detail.tsx:91,108` | **Not the bug.** Checks `.error` first (early return with retry), then `.data === undefined` for the skeleton — the exact fix pattern already applied here, referenced in its own comment as coming from `help-detail`'s `73414c58`. |
| `web/components/deep-link/module-content.tsx:392,425` | **Not the bug.** Both `members` and `invites` branches check `.error` first (`<LoadError>`) with an early return, then `.data === undefined` for the skeleton. |
| `web/components/knowledge/knowledge-detail.tsx:366` | **The bug** (fixed here). |
| `web/components/work/tasks-screen.tsx:524` | **Not the bug.** `tasksQ.error` is checked at line 350 with an early return before this calendar section is reached; `tasksLoading` here is a derived, already-error-free flag. |

Instrument 2 (strict — `<Skeleton` as a ternary's syntactic alternate,
independent of how far back the test/consequent starts) returned **exactly
one match in the whole of `web/` and `web-portal/`: `knowledge-detail.tsx:366`**
— confirming the fix's target was the only true instance of this shape. I also
ran the same strict check for `<Spinner` (the other stuck-forever affordance
CLAUDE.md's own example calls out) and for a single-line
`? <A/> : <Skeleton/>` variant; both returned zero matches.

**Conclusion: one instance of this exact defect existed in the whole
codebase, and it is the one fixed here.**

### A related-but-different failure, flagged, not fixed

`web-portal/components/ticket-attachments.tsx:178` reads:
```tsx
{listQ.loading && !listQ.data ? (
  <Skeleton .../>
) : attachments.length === 0 ? (
  <p>{t("Nothing attached yet...")}</p>
) : ( ...rows... )}
```
`attachments` is `listQ.data ?? []`. On a **failed** read, `listQ.loading`
becomes `false` (per `shared/web/store.ts`'s `useCached`, `finally { setLoading(false) }`
runs on rejection too) and `listQ.data` stays `undefined`, so `attachments.length === 0`
is true and the portal silently shows "Nothing attached yet" on an error —
the same failure FAMILY (a wrong answer that looks like a right one), but a
different SHAPE (no `Skeleton` ternary at all, so it did not match this
brief's census target) and a different file/module than the one this brief
named. Left unfixed to keep this change scoped to the reported bug and its
exact shape; happy to take it as a follow-up if wanted.

## Render tests, one per state (+ one sanity test)

New file: `web/test/knowledge-connections-tab.test.tsx`, mounting the real
`KnowledgeDetailScreen` (not a stub) with `@/lib/api` mocked and every other
cached read pre-warmed, so only `mapQ` is under test. Each case uses its own
`originRowId` (and therefore its own cache/`inFlight` key) — `shared/web/store.ts`
dedupes concurrent reads of the *same* key across the whole test file, and a
never-settling promise from the "loading" case would otherwise be silently
joined by every later case (this bit me once while writing the suite; fixed
by giving each test its own record).

1. **`still loading`** — `door.recordMap` returns a promise that never
   settles; asserts neither the error sentence nor the empty register appears.
2. **`failed`** — `door.recordMap` rejects; asserts the sentence + `Try again`
   button render, then clicks retry and asserts the door is called a second
   time.
3. **`loaded, genuinely empty`** — `door.recordMap` resolves with a focus node
   and zero links; asserts the kit's `"Nothing is linked to this yet."`
   register renders (not a second skeleton, not the error sentence).
4. **`a real neighbourhood renders`** — sanity check that a real payload still
   draws through `RelationshipMap` correctly (drawn twice on purpose — once in
   the SVG, once as the text-equivalent sentence list — asserted as
   `findAllByText(...).toHaveLength(2)`).

```
$ npx vitest run test/knowledge-connections-tab.test.tsx   (run from web/)
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

**Mutation-proven** (LANE-COMMON's own requirement): reverted the `mapQ.error`
branch back to the original two-way ternary, re-ran the suite —

```
 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
 FAIL  ... > failed: says so, and Try again asks the door again
 TestingLibraryElementError: Unable to find an element with the text:
 Couldn't load this record's connections.
```

— exactly the "failed" test goes red, nothing else does. Restored the fix
(`cp` from a pre-mutation backup) and re-ran: 4/4 green again.

## Translation (R28/R33/R44)

New user-visible string: `"Couldn't load this record's connections."` — one
sentence, in the map panel's error branch, and `"Try again"` was already
catalogued.

- Ran `node scripts/i18n-extract.mjs` (safe, no API key) — added exactly one
  line to `shared/i18n-strings.json`.
- Per the owner's 8 Sep 2026 ruling relayed in LANE-COMMON ("you, inside of
  Claude Code... already have access to your own AI models, which you can use
  for translation"), I translated it myself into `shared/i18n-seed.ts`
  (never `i18n-catalogue.ts`, which is generated) — German, Spanish, Catalan,
  in the same register as the relationship map's other seed entries just
  above it (`Connections`, `"Nothing is linked to this yet."`), reusing
  `Verbindungen`/`registro`/`registre` already established there:
  ```
  de: "Verbindungen dieses Eintrags konnten nicht geladen werden."
  es: "No se pudieron cargar las conexiones de este registro."
  ca: "No s'han pogut carregar les connexions d'aquest registre."
  ```
- `npx vitest run test/translation-ceiling.test.ts` (from `web/`): **1 passed**.
  `TRANSLATION_CEILING` in `shared/rules/registry.ts` is **unchanged at
  246/246/246** (de/es/ca) — the new string is fully translated via the seed,
  so it never entered the untranslated count. No ceiling edit needed, per the
  rule's own "moves down, never up" — here it simply didn't move.
- `npx vitest run test/rules.test.ts test/catalogued-strings.test.ts test/wrapped-strings.test.ts`
  (from `web/`): **85 passed**.

## `npm run check`, exit code read unpiped

```
$ npm run check > /tmp/check-connstate.log 2>&1; echo EXIT=$?
EXIT=0
```

Per-workspace lines, itemised (never a hand-summed total):

| Workspace | Test Files | Tests |
|---|---|---|
| kwapso-auth | 21 passed (21) | 224 passed (224) |
| kwapso-tenancy | 75 passed (75) | 982 passed (982) |
| kwapso-content | 90 passed \| 1 skipped (91) | 1171 passed \| 3 skipped (1174) |
| kwapso-data-ops | 40 passed (40) | 422 passed (422) |
| kwapso-mcp | 13 passed (13) | 599 passed (599) |
| kwapso-realtime | 5 passed (5) | 90 passed (90) |
| kwapso-gateway | 11 passed (11) | 100 passed (100) |
| kwapso-portal-gateway | 2 passed (2) | 49 passed (49) |
| kwapso-web | 143 passed (143) | 1206 passed \| 8 skipped (1214) |
| kwapso-portal-web | 12 passed (12) | 96 passed (96) |

(`kwapso-web`'s 143 test files include the new
`test/knowledge-connections-tab.test.tsx`; the pre-existing skips — 1 file /
3 tests in content, 8 tests in web — are the worktree-gate skips LANE-COMMON
names (`glide/normalised.json`, `web/out` not present in a fresh worktree),
unrelated to this change; not re-verified against a `npm run build` baseline
since this brief did not name a splash/export test as load-bearing.)

## Files touched

- `web/components/knowledge/knowledge-detail.tsx` — the fix (12 lines added,
  one new ternary branch).
- `web/test/knowledge-connections-tab.test.tsx` — new, 4 render tests
  (mutation-proven on the one that matters).
- `shared/i18n-strings.json` — +1 line, machine-extracted, not hand-edited.
- `shared/i18n-seed.ts` — +1 catalogue entry (English key + de/es/ca), hand-
  translated by me per the owner's ruling, never via the banned
  `i18n-translate.mjs`.

## What I could not / did not move, and why

- Did not touch `ticket-attachments.tsx`'s related-but-different failure
  (see above) — different shape, different file, outside this brief's named
  target; flagged rather than silently fixed to keep the diff scoped.
- Did not run `npm run build` / the splash-export suite — the brief named a
  specific component bug and a census, not a build-affecting change, so I
  judged the extra ~9-test worktree-gate gap (LANE-COMMON's own documented
  gap) as not load-bearing here. Happy to run it if the planner wants it
  re-verified against the primary checkout.
- No UI/UX or business-logic decisions were made beyond what was directed:
  the empty-state choice was already the owner's standing ruling (7 Sep 2026,
  "there should be empty states for everything... I'm sure the UI/UX kit has
  it") and was already implemented in `RelationshipMap`; I did not invent a
  new visual treatment for the error state, I reused the exact pattern already
  shipping in `work-logs-panel.tsx`.

## Not done (per LANE-COMMON)

Did not deploy. Did not run `scripts/i18n-translate.mjs`. Did not touch
`shared/ui/`. Did not open a PR (no `gh`); branch pushed to
`origin/fix/connections-tab-honest-states` for the planner to merge.
