"use client"

// NEW TAB — Chrome's own blank tab, this app's shape of it.
//
// THE FIRST RULING, 17 Sep 2026, verbatim: "For the new tab, when it opens a
// fresh tab, put here the text that says, 'Alaap, this space is for you.' He
// will take care of building this page. He will build a search bar."
//
// THE SECOND, THE SAME DAY, verbatim: "For the new tab page, implement 02 in
// your proposal. However, do not ask the assistant, just search anything, and
// instead of search, put an icon there that means search. Make sure you use
// elements in the kit." — "02" is section 02 of the design proposal
// (https://claude.ai/artifact/K395o8xStcBESTbwnsaUBg): a search bar, a
// module scope-chip row underneath it, and a "Recently opened" list read off
// the workspace tab trails already stored — no hand-off to the assistant, an
// icon-only trigger rather than a worded "Search" button.
//
// SO THE PLACEHOLDER LINE THE FIRST RULING ASKED FOR IS GONE — superseded,
// not forgotten (git history carries it). This is the search page it was
// standing in for.
//
// EVERY PIECE IS A KIT PART: SearchInput (the bar), Headline (the title),
// Badge inside a real <button> ("a badge is a label, not a control" —
// badge.tsx's own header — so the press lives on the button around it, not
// the badge), RecordMark (the mark beside every row, a search hit and a
// recently-opened one alike), CollectionCard (the paper the whole screen
// stands on, R67). No hint under the title (R81 — the client's own rule
// against explaining a screen instead of building it) and the search
// trigger is charcoal, never mango: the page's own title carries no act of
// its own, and an icon button beside a bar is not a title-level one (R84).
//
// SIX DOORS, ONE QUESTION EACH, NO NEW ROUTE. Every module already answers
// `q` at its own list door (R14 — paged, so this is a DISPLAY cap on a
// quick-search box, never a claim about the collection's own size): tickets
// (`content.help`), accounts (`tenancy.accounts`), stories
// (`content.stories`), apps (`tenancy.apps`), contacts (`tenancy.accounts`
// narrowed to individuals — the same door Contacts itself reuses,
// `lib/screens.ts`'s own `contactsListRecipe`), knowledge
// (`content.knowledge`). One TERMINOLOGY correction from the proposal's own
// mock, made here rather than silently: its chip read "People", and this
// app's glossary (`shared/glossary.ts`) and its own sidebar page both say
// "Contacts" for exactly this door — so the chip does too (R34).
//
// RECENTLY OPENED reads `openTabsSnapshot()` — every OTHER open tab's own
// trail, newest-touched-tab first (the best ordering this store exposes
// without a timestamp it does not keep; `workspace-tabs.ts`'s own `recency`
// is a module-private array, not part of the public store), each tab's own
// steps walked from its current cursor backward. A step is shown only when
// its path resolves to a real module record (`stepModuleTitle`, below) — a
// bare module list or an account screen carries no record to jump back to.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { Headline, Text } from "@shared/ui/components/typography/typography"
import { SearchInput } from "@shared/ui/components/search-input/search-input"
import { MagnifyingGlass } from "@shared/ui/foundations/icons"
import { useDebouncedCallback } from "@shared/ui/components/use-debounce/use-debounce"

import { InAppLink } from "@/components/shell/in-app-link"
import { CollectionCard } from "@/components/deep-link/screen-bits"
import { RecordMark } from "@shared/web/record-mark"
import { content, tenancy } from "@/lib/api"
import { softNavigate } from "@/lib/nav"
import { NEW_TAB_PATH, openBeside, openTabsSnapshot } from "@/lib/workspace-tabs"
import { TEAM_SECTIONS } from "@/lib/pages"
import { useT } from "@shared/web/language"

type ModuleKey = "tickets" | "accounts" | "stories" | "apps" | "contacts" | "knowledge"

/** The scope row, in the order the proposal's own mock draws them (minus the
 * "People" → "Contacts" correction above). */
const MODULES: readonly { key: ModuleKey; title: string }[] = [
  { key: "tickets", title: "Tickets" },
  { key: "accounts", title: "Accounts" },
  { key: "stories", title: "Stories" },
  { key: "apps", title: "Apps" },
  { key: "contacts", title: "Contacts" },
  { key: "knowledge", title: "Knowledge base" },
]

/** A DISPLAY cap (R14's own distinction: this bounds what ONE quick-search
 * box shows, never a claim about a collection's real size — a real page of
 * any one of these six lives behind its own screen and its own
 * `<PagedFind>`, not here). */
const RESULTS_PER_MODULE = 5
const RECENT_CAP = 10

type ResultRow = { id: string; module: ModuleKey; href: string; label: string }

/** One call per module, straight through the door the rest of the app
 * already asks — never a seventh endpoint invented for a quick-search box. */
async function searchModule(key: ModuleKey, q: string): Promise<ResultRow[]> {
  switch (key) {
    case "tickets": {
      const r = await content.help({ q })
      return r.tickets.slice(0, RESULTS_PER_MODULE).map((row) => ({
        id: row.id,
        module: key,
        href: `/tickets/${row.id}`,
        label: row.titleEn || row.titleDe || row.ref || row.description.slice(0, 60),
      }))
    }
    case "accounts": {
      const r = await tenancy.accounts({ q, type: "entity" })
      return r.accounts
        .slice(0, RESULTS_PER_MODULE)
        .map((row) => ({ id: row.id, module: key, href: `/accounts/${row.id}`, label: row.name }))
    }
    case "contacts": {
      const r = await tenancy.accounts({ q, type: "individual" })
      return r.accounts
        .slice(0, RESULTS_PER_MODULE)
        .map((row) => ({ id: row.id, module: key, href: `/contacts/${row.id}`, label: row.name }))
    }
    case "stories": {
      const r = await content.stories({ q })
      return r.stories.slice(0, RESULTS_PER_MODULE).map((row) => ({
        id: row.id,
        module: key,
        href: `/stories/${row.id}`,
        label: row.ref ? `${row.ref} · ${row.title}` : row.title,
      }))
    }
    case "apps": {
      const r = await tenancy.apps(undefined, q)
      return r.apps
        .slice(0, RESULTS_PER_MODULE)
        .map((row) => ({ id: row.id, module: key, href: `/apps/${row.id}`, label: row.name }))
    }
    case "knowledge": {
      const r = await content.knowledge({ q })
      return r.sources
        .slice(0, RESULTS_PER_MODULE)
        .map((row) => ({ id: row.id, module: key, href: `/knowledge/${row.id}`, label: row.title }))
    }
  }
}

const EMPTY_RESULTS: Record<ModuleKey, ResultRow[]> = {
  tickets: [],
  accounts: [],
  stories: [],
  apps: [],
  contacts: [],
  knowledge: [],
}

/** Every top-level module's own title, off the ONE table the rest of the app
 * already reads it from (`route.ts`'s `sectionTitle` does the same lookup by
 * hand for the breadcrumb trail; this needs the reverse direction too — every
 * segment at once — so it builds its own small map rather than call that
 * function sixty times). */
const SECTION_TITLE_BY_SEGMENT: Record<string, string> = Object.fromEntries(
  TEAM_SECTIONS.map((s) => [s.segment, s.title])
)

/** WHICH RECORD A TRAIL STEP WAS — the module's own title, or `null` when the
 * step is not a record at all (an account screen, a bare module list, a
 * `/new` tab that was never navigated away from). Read off the path alone,
 * because that is all a `TrailStep` carries: `/<segment>/<id>` (top level) or
 * `/t/<teamId>/<segment>/<id>` (team-scoped) both resolve the same way. */
function stepModuleTitle(path: string): string | null {
  const m = /^\/(?:t\/[^/]+\/)?([a-z-]+)\/[^/?]+/.exec(path)
  if (!m) return null
  return SECTION_TITLE_BY_SEGMENT[m[1] ?? ""] ?? null
}

type RecentRow = { path: string; label: string; moduleTitle: string }

/** THE LAST TEN STEPS ACROSS EVERY OPEN TAB'S OWN TRAIL, newest first — see
 * this file's header for what "newest" can honestly mean off a store that
 * keeps no timestamp. `tabs` (the snapshot) is walked in REVERSE, which
 * approximates most-recently-opened-tab-first (`openBeside` inserts new tabs
 * forward of the one she was on, so a later tab in the array skews newer);
 * each tab's OWN steps are walked from its current cursor backward, which is
 * exact — a tab's own history is genuinely ordered. Deduplicated by path,
 * keeping the first (i.e. newest) occurrence, and never includes this
 * screen's own tab. */
function recentSteps(): RecentRow[] {
  const seen = new Set<string>()
  const rows: RecentRow[] = []
  const tabs = openTabsSnapshot()
  for (let i = tabs.length - 1; i >= 0; i--) {
    const tab = tabs[i]
    if (!tab) continue
    // A TAB WHOSE WHOLE HISTORY IS THE BLANK NEW-TAB STEP has nothing to
    // recommend — the same "unused" reading `openNewTab` itself uses.
    if (tab.steps.length === 1 && tab.steps[0]?.path === NEW_TAB_PATH) continue
    for (let c = tab.cursor; c >= 0; c--) {
      const step = tab.steps[c]
      if (!step || seen.has(step.path)) continue
      const moduleTitle = stepModuleTitle(step.path)
      if (!moduleTitle) continue
      seen.add(step.path)
      rows.push({ path: step.path, label: step.label, moduleTitle })
      if (rows.length >= RECENT_CAP) return rows
    }
  }
  return rows
}

export function NewTabScreen() {
  const t = useT()
  const [q, setQ] = React.useState("")
  const [scope, setScope] = React.useState<ReadonlySet<ModuleKey>>(() => new Set())
  const [results, setResults] = React.useState<Record<ModuleKey, ResultRow[]>>(EMPTY_RESULTS)
  const [searching, setSearching] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const requestRef = React.useRef(0)
  // RECENTLY OPENED IS READ ONCE, ON MOUNT — it names every OTHER open tab,
  // which does not change while this screen is the one on top; re-reading it
  // on every render would also start including whatever THIS tab's own
  // search just opened beside it, which is not "recently opened" in the
  // sense the row means.
  const [recent] = React.useState(recentSteps)

  // THE BAR HAS FOCUS ON OPEN — the proposal's own fourth step: "cmd-T then
  // typing is one motion, as in Chrome."
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const activeModules = scope.size > 0 ? MODULES.filter((m) => scope.has(m.key)) : MODULES

  const runSearch = useDebouncedCallback((query: string, modules: readonly ModuleKey[]) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults(EMPTY_RESULTS)
      setSearching(false)
      return
    }
    const myRequest = ++requestRef.current
    setSearching(true)
    Promise.all(modules.map((key) => searchModule(key, trimmed).then((rows) => [key, rows] as const)))
      .then((pairs) => {
        if (myRequest !== requestRef.current) return // a later keystroke's answer already landed
        setResults((prev) => {
          const next = { ...prev }
          for (const [key, rows] of pairs) next[key] = rows
          return next
        })
        setSearching(false)
      })
      .catch(() => {
        if (myRequest !== requestRef.current) return
        setSearching(false)
      })
  }, 250)

  function toggleModule(key: ModuleKey) {
    setScope((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  React.useEffect(() => {
    runSearch(q, activeModules.map((m) => m.key))
    // `runSearch` is stable across renders (`useDebouncedCallback`); `activeModules`
    // is a fresh array every render, so its own KEYS are the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, scope])

  const flatResults = activeModules.flatMap((m) => results[m.key])
  const hasQuery = q.trim().length > 0
  const hasResults = flatResults.length > 0

  function openResult(row: ResultRow, beside: boolean) {
    if (beside) {
      openBeside(row.href, row.label)
      softNavigate(row.href)
    } else {
      softNavigate(row.href)
    }
  }

  return (
    <section className="flex w-full flex-col">
      <CollectionCard>
        <div className="flex flex-col items-center gap-[var(--space-6)] py-[var(--space-6)] text-center">
          <Headline as="h1" size="display-m">
            {t("Where to?")}
          </Headline>

          <div className="flex w-full max-w-[640px] items-center gap-[var(--space-2h)]">
            <SearchInput
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
              onClear={() => setQ("")}
              loading={searching}
              label={t("Where to?")}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return
                const first = flatResults[0]
                if (!first) return
                e.preventDefault()
                openResult(first, e.metaKey || e.ctrlKey)
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="inverse"
              aria-label={t("Search")}
              onClick={() => {
                const first = flatResults[0]
                if (first) openResult(first, false)
              }}
            >
              <MagnifyingGlass aria-hidden className="size-[var(--icon-button)]" />
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-[var(--space-2)]">
            {MODULES.map((m) => {
              const selected = scope.has(m.key)
              return (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleModule(m.key)}
                >
                  <Badge variant={selected ? "inverse" : "secondary"}>{t(m.title)}</Badge>
                </button>
              )
            })}
          </div>

          {hasQuery ? (
            <div className="flex w-full max-w-[640px] flex-col gap-[var(--space-4)] text-left">
              {hasResults
                ? activeModules
                    .filter((m) => results[m.key].length > 0)
                    .map((m) => (
                      <div key={m.key} className="flex flex-col gap-[var(--space-1h)]">
                        <Text size="caption" tone="tertiary">
                          {t(m.title)}
                        </Text>
                        {results[m.key].map((row) => (
                          <InAppLink
                            key={row.id}
                            href={row.href}
                            className="grid grid-cols-[24px_1fr] items-center gap-[var(--space-2h)] rounded-[var(--radius)] p-[var(--space-1h)] hover:bg-surface-raised"
                          >
                            <RecordMark name={row.label} size="row" />
                            <Text size="sm">{row.label}</Text>
                          </InAppLink>
                        ))}
                      </div>
                    ))
                : !searching && <Text size="sm" tone="tertiary">{t("No results.")}</Text>}
            </div>
          ) : recent.length > 0 ? (
            <div className="flex w-full max-w-[640px] flex-col gap-[var(--space-1h)] text-left">
              <Text size="caption" tone="tertiary">
                {t("Recently opened")}
              </Text>
              {recent.map((row) => (
                <InAppLink
                  key={row.path}
                  href={row.path}
                  className="grid grid-cols-[24px_1fr_auto] items-center gap-[var(--space-2h)] rounded-[var(--radius)] p-[var(--space-1h)] hover:bg-surface-raised"
                >
                  <RecordMark name={row.label} size="row" />
                  <Text size="sm">{row.label}</Text>
                  <Text size="caption" tone="tertiary">
                    {row.moduleTitle}
                  </Text>
                </InAppLink>
              ))}
            </div>
          ) : null}
        </div>
      </CollectionCard>
    </section>
  )
}
