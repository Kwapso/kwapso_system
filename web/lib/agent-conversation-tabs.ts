"use client"

// THE ASSISTANT'S OWN TAB STRIP — which conversations are open in the assistant
// column, which one is being looked at, and the state behind the "+" that
// starts a fresh one.
//
// ── THE CLIENT'S RULING, 15 SEP 2026, VERBATIM ──────────────────────────────
//
//   "I want that, all the time, there is a visible tab that has a plus button.
//    That's how you create a new one. However, when you open it, use your
//    design D so that every time you open a new conversation, it opens a scope
//    picker first."
//
// (Design D lives in the artifact this feature was built from:
// https://claude.ai/code/artifact/8d4b7c6e-639d-4776-a3d9-337ae7e957d5 —
// "Section 1 · Your pick" is what is built here. `agent-scope-picker.tsx`
// carries the picker's own wording, copied from it letter for letter.)
//
// ── WHY THIS IS NOT `workspace-tabs.ts` AGAIN ───────────────────────────────
//
// The main content strip's whole design rests on a background tab costing
// "two strings and nothing else" (`workspace-tabs.ts`'s own words), because a
// background RECORD tab holds no live state at all — it is just an address to
// revisit. A conversation is the opposite shape: `use-agent-chat.tsx` holds
// exactly ONE live thread at module level — one transcript, one `threadId`,
// one set of source chips — and switching conversations REPLACES that one
// thread rather than running a second one beside it, the identical swap the
// history tab already does through `openThread`. So this store holds only
// what a background conversation tab can cost under that model: a stable id,
// the real thread it points at (once one exists), its scope, and the label the
// scope or the thread gave it. Nothing here streams and nothing here is
// fetched ahead of being activated — the caller (`agent-panel.tsx`) is what
// turns "this tab is now active" into an `openThread` / `newChat` call.
//
// A DRAFT HAS NO THREAD YET. Pressing "+" opens a tab with `scope: null` — the
// picker is showing — and no `threadId`: the server only mints one once a
// message is actually sent. `setAgentTabThread` is how the caller reports that
// back once it happens.
//
// NOT PERSISTED, ON PURPOSE — matching `use-agent-chat.tsx`'s own module cells,
// not `workspace-tabs.ts`'s `localStorage` mirror. A thread itself is never
// lost — it is saved server-side and reachable again from the history tab —
// only the STRIP'S OWN memory of which ones happened to be open resets with
// the page, same as the rest of the assistant's live state does.

import * as React from "react"

// "app" (17 Sep 2026) IS ITS OWN SCOPE, NOT A RENAME OF "record" — the client's
// ruling on the app record's Knowledge tab: "a button to ask about this [...]
// should open a conversation with the assistant only about this app." "record"
// already means "about whatever record you're standing on, whichever kind it
// is" and carries no structured id at all, only a label (`recordLabel`, below)
// folded into the first message's prose. An app is the one record kind the
// retrieval door can actually narrow BY (`retrieve()`'s new `appId` parameter,
// workers/content/src/lib/knowledge.ts — R26's read-back half, never the
// vector call), so its scope carries the id too (`scopeId`), and the seam that
// opens it (an app record's own Ask button) always knows exactly which app —
// unlike "record", never picked through the generic in-panel picker.
export type AgentTabScope = "record" | "knowledge" | "everything" | "app"

export type AgentTab = {
  /** A client-side id, stable for the tab's whole lifetime — never the thread
   * id, because a draft has no thread yet and a tab must not change identity
   * the moment its first message mints one. */
  id: string
  /** Set once the server has assigned a real thread — see the file header. */
  threadId?: string
  /** `null` while the picker is showing: a fresh "+" tab that has not chosen
   * yet. Set exactly once, at the moment a picker row is pressed. */
  scope: AgentTabScope | null
  /** What the tab shows. The picked scope's own name — or the record's own
   * name for "This record" — until a real thread title exists to replace it;
   * see `pickAgentTabScope`. */
  label: string
  /** Captured the instant "This record" is chosen, because the reader may
   * navigate elsewhere before they finish typing — a snapshot, the same
   * reasoning `workspace-tabs.ts`'s own `OpenTab.label` gives for writing a
   * background tab's name down rather than resolving it live. Also carries
   * "app" scope's own name (the app's), for the identical reason. */
  recordLabel?: string
  /** THE STRUCTURED ID BEHIND A SCOPE THAT HAS ONE — today only "app"
   * (the app's id). `recordLabel` alone is a NAME, which is all "record"
   * scope has ever needed (its retrieval narrows by prose, never a
   * parameter); "app" scope's whole point is that the retrieval door CAN
   * take an exact id (`ask_knowledge`'s `appId`), so the tab carries it
   * through to the first message rather than making the model guess an app
   * from its name alone. */
  scopeId?: string
}

/** How many conversation tabs may sit open at once, the "+" not counted — the
 * same ceiling `workspace-tabs.ts` gives the record strip and for a related
 * reason: this strip never folds while `onClose` is given (a tab set does not
 * fold — `breadcrumb-folders.tsx`'s own rule), so past this it would only grow
 * the strip's own horizontal scroll rather than hide anything. */
export const MAX_AGENT_TABS = 8

let tabs: AgentTab[] = []
let activeId: string | null = null
/** THE PINNED CLOCK TAB'S OWN VIEW — orthogonal to `tabs`/`activeId`, the same
 * way "+" is: neither the clock tab nor "+" is a conversation, so neither is
 * a row in this store's array (see `agent-tab-strip.tsx`'s own header for
 * "+"'s half of that argument). `activeId` keeps pointing at whichever
 * conversation tab the strip should return to — pressing the clock tab never
 * moves it — so History can open and close without disturbing what the
 * reader was looking at underneath it. */
let historyOpen = false
const subscribers = new Set<() => void>()
function announce(): void {
  for (const fn of subscribers) fn()
}

let nextId = 0
const newTabId = () => `agent-tab-${++nextId}`

const NOTHING: AgentTab[] = []

/** Ensure at least one tab exists, representing whatever conversation is
 * already live (a resumed thread, or a blank one) — called once the panel
 * knows what it resumed. It is never a picker: only a tab opened through "+"
 * asks the reader anything, which is what keeps today's resumed-thread
 * behaviour byte for byte unless the reader presses "+" themselves.
 *
 * A ONE-SHOT, NOT "WHENEVER EMPTY" — changed for the closing ruling below.
 * This used to guard on `tabs.length > 0`, which made it re-fire the moment
 * the strip emptied for ANY reason, including the reader closing their own
 * last tab on purpose. `hasEverSeeded` guards on having run once, ever, in
 * this session, so a caller may still call this on every render that has not
 * yet seen a tab (unchanged) but it stays permanently inert after the first
 * real seed — closing down to zero later stays zero, which is what lets the
 * aside itself close (`agent-panel.tsx`'s `handleCloseAgentTab`) instead of
 * racing a silent refill. */
let hasEverSeeded = false
// A NAMED CONSTANT, NOT A LITERAL INLINE BELOW — R33's own walker treats an
// object literal carrying a `label` field as a translatable config row (the
// same reading that lets a `FieldConfig` spread translate itself) and then
// asks every OTHER string-literal property in that same object to sit inside
// a `t(...)` call too. `scope` is not a sentence, it is this type's own
// discriminant, so it is read off a typed constant here instead of written a
// second time as a bare string beside `label`.
const SEED_SCOPE: AgentTabScope = "everything"

export function seedAgentTabs(threadId: string | undefined, label: string): void {
  // BOTH GUARDS STAY. `tabs.length > 0` is the original idempotency (never
  // seed a SECOND tab beside one that arrived some other way — a history
  // pick, a "+" — before this runs); `hasEverSeeded` is the new one, and it
  // is the one that matters once the strip has been non-empty at least once.
  if (hasEverSeeded || tabs.length > 0) return
  hasEverSeeded = true
  const id = newTabId()
  tabs = [{ id, threadId, scope: SEED_SCOPE, label }]
  activeId = id
  announce()
}

/** ── "UNUSED" — the client's ruling, 17 Sep 2026, verbatim ──────────────────
 *
 *   "On the assistant, when I have a new chat open and I create another new
 *    one, if this new one is still unused, just open the already existing
 *    one. What I want to avoid is having 10 new unused sessions."
 *
 * ZERO TURNS is the definition, read off the thread model rather than off
 * `scope` or the composer: the server mints a thread only once a message is
 * actually SENT (the file header, above), so `threadId` is unset for a bare
 * "+" draft (`scope: null`), for a tab that HAS picked a scope but sent
 * nothing yet, and even for one with unsent text currently sitting in the
 * composer — that text lives in `use-agent-chat.tsx`, never in this store, so
 * nothing about a draft can ever set `threadId` here. Which is exactly the
 * client's own qualifier: "if the existing new chat has a typed draft, it
 * still counts as unused for this purpose unless a message was sent." A
 * history-opened tab (`openAgentTabForThread`) always arrives WITH a
 * `threadId` — it is resuming a thread that already exists server-side — so
 * it is never unused by this reading, which is the right answer: reopening a
 * past conversation is not "starting a new session" this ruling is about. */
export function isUnusedAgentTab(tab: AgentTab): boolean {
  return !tab.threadId
}

/** The newest unused tab, or none. "Newest" is CREATION order, not strip
 * position — a drag (L20) can move a tab without changing when it was made —
 * read off `newTabId`'s own strictly increasing numeric suffix rather than
 * array index, so a reorder can never change which tab "+" lands on. */
function newestUnusedAgentTab(): AgentTab | undefined {
  let best: AgentTab | undefined
  let bestN = -1
  for (const t of tabs) {
    if (!isUnusedAgentTab(t)) continue
    const n = Number(t.id.slice("agent-tab-".length))
    if (n > bestN) {
      bestN = n
      best = t
    }
  }
  return best
}

/** BOOT-TIME COLLAPSE — the other half of the same ruling: if the strip
 * somehow already holds more than one unused (zero-turn) tab when the panel
 * first mounts, keep only the newest and drop the rest. After this change
 * "+" itself can never produce that shape again (see `openNewAgentTab`,
 * below), so this exists for whatever a stale pre-fix session, or a caller
 * that bypassed "+" altogether, could still hand the panel. NEVER TOUCHES THE
 * SERVER: an unused tab, by `isUnusedAgentTab`'s own definition, never minted
 * a `threadId`, so no thread exists server-side to delete for it either —
 * dropping it here is purely LOCAL, the file header's own "not persisted"
 * reasoning applied to a single row instead of the whole store. A no-op once
 * at most one unused tab is open, the ordinary case. */
export function pruneUnusedAgentTabsOnBoot(): void {
  const unused = tabs.filter(isUnusedAgentTab)
  if (unused.length <= 1) return
  const keep = newestUnusedAgentTab()
  tabs = tabs.filter((t) => !isUnusedAgentTab(t) || t.id === keep?.id)
  if (activeId !== null && !tabs.some((t) => t.id === activeId)) {
    activeId = keep?.id ?? tabs.at(-1)?.id ?? null
  }
  announce()
}

/** TEST-ONLY. Appends a raw unused draft, bypassing "+"'s own dedupe
 * (`openNewAgentTab`, below) entirely — the only way left to build the
 * multi-unused shape `pruneUnusedAgentTabsOnBoot` exists to clean up, now
 * that the public "+" door can never produce it itself. Never called from
 * app code; exists so the boot-collapse test can construct the pre-fix shape
 * directly instead of asserting nothing (which is all the public API alone
 * can prove once the dedupe above already holds). */
export function __unsafeAppendUnusedAgentTabForTest(label: string): string {
  const id = newTabId()
  tabs = [...tabs, { id, scope: null, label }]
  activeId = id
  announce()
  return id
}

/** Push a new tab onto the strip and make it active — the shared half of "+"
 * (below) and a history row's own open (`openAgentTabForThread`), evicting
 * past the ceiling exactly the same way for both: never the new tab, never
 * the one that was active. */
function pushTab(draft: AgentTab): void {
  const wasActive = activeId
  let next = [...tabs, draft]
  if (next.length > MAX_AGENT_TABS) {
    const victim = next.find((t) => t.id !== draft.id && t.id !== wasActive)
    if (victim) next = next.filter((t) => t.id !== victim.id)
  }
  tabs = next
  activeId = draft.id
}

/** Press "+" — opens on the newest UNUSED tab if one is already sitting open
 * (the ruling above: "if this new one is still unused, just open the already
 * existing one"), never a second draft beside it. Only once no unused tab
 * exists does this actually mint a fresh, scope-less one, activated
 * immediately so its picker shows. Returns the (new or reused) tab's id.
 * Evicts the tab that has sat least far forward in the strip (never the new
 * one, never the one that was active) once the ceiling is crossed on an
 * actual creation — a simpler rule than `workspace-tabs.ts`'s own recency
 * ranking, defensible here because a conversation tab is opened far less
 * often than a record one and the cost of guessing wrong is one extra click
 * to reopen it from the history tab, which still holds every thread. */
export function openNewAgentTab(): string {
  const existing = newestUnusedAgentTab()
  if (existing) {
    activeId = existing.id
    // Landing on an already-open draft is still choosing a fresh
    // conversation, never History — same reasoning as `activateAgentTab`,
    // below.
    historyOpen = false
    announce()
    return existing.id
  }
  const id = newTabId()
  // `label` STARTS EMPTY, ON PURPOSE — a draft tab's provisional word ("New")
  // is user-facing text, and this store has no `t()` to say it with (it is
  // plain state, imported by React and by nothing else). The strip itself
  // supplies the translated placeholder for an empty label — see
  // `agent-tab-strip.tsx`.
  pushTab({ id, scope: null, label: "" })
  // Pressing "+" is choosing a fresh conversation, which is never History —
  // same reasoning as `activateAgentTab`, below.
  historyOpen = false
  announce()
  return id
}

/** Switch which tab is being looked at — pure state. The caller
 * (`agent-panel.tsx`) is what then loads that tab's thread or clears the panel
 * for a fresh one; this store has no opinion about `use-agent-chat.tsx`. */
export function activateAgentTab(id: string): void {
  if (!tabs.some((t) => t.id === id)) return
  // Still worth announcing when the id itself hasn't moved: picking a
  // conversation tab while History is showing must close History even
  // though `activeId` doesn't change.
  if (activeId === id && !historyOpen) return
  activeId = id
  historyOpen = false
  announce()
}

/** A picker row was pressed: the scope is set once, and the label becomes the
 * pick itself — the design artifact's own reading: "the tab's own label is the
 * pick, not a fourth control... a record's name if she'd picked 'This
 * record'." */
export function pickAgentTabScope(
  id: string,
  scope: AgentTabScope,
  label: string,
  recordLabel?: string,
  scopeId?: string
): void {
  tabs = tabs.map((t) => (t.id === id ? { ...t, scope, label, recordLabel, scopeId } : t))
  announce()
}

/** The server minted a thread for a tab that had none — its first message
 * landed, or a resume finished after the tab was already seeded. */
export function setAgentTabThread(id: string, threadId: string): void {
  tabs = tabs.map((t) => (t.id === id && t.threadId !== threadId ? { ...t, threadId } : t))
  announce()
}

/** ── THE PINNED CLOCK TAB ─────────────────────────────────────────────────
 * Client ruling, 15 Sep 2026, the same day as the header's own quote: "I
 * like the history rail tab. Put it before the plus tab... when I click on
 * one, it would open in a tab." CORRECTED 16 Sep 2026, over a screenshot of
 * History pinned ahead of every conversation tab: "I want the history tab
 * to be on the left of the plus, not the very far left. Put it to the left
 * of the plus." `agent-tab-strip.tsx` draws it AFTER every conversation
 * tab and immediately before "+", never at the front of the strip;
 * `agent-history-tab.tsx` is its body — V2 from the artifact, grouped by
 * last used. */

export function openHistoryTab(): void {
  if (historyOpen) return
  historyOpen = true
  announce()
}

export function useHistoryTabOpen(): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => historyOpen,
    () => false
  )
}

/** A HISTORY ROW WAS PICKED: bring that thread into the strip as its own
 * tab — activating it if a tab already points at this thread (the client's
 * own words, "or activates it if already open"), opening one if not. Its
 * `scope` is `SEED_SCOPE`, the same placeholder `seedAgentTabs` gives a
 * resumed thread: a tab that already carries a `threadId` never reads its
 * own `scope` again (`agent-panel.tsx`'s record-scope prefix only rides a
 * tab's FIRST message, gated on `!tab.threadId`), so the value is exactly as
 * inert here as it is there. Returns the tab's id, same as `openNewAgentTab`
 * does, though today's one caller (`agent-panel.tsx`) has no use for it
 * beyond the store already being in step. */
export function openAgentTabForThread(threadId: string, label: string): string {
  const existing = tabs.find((t) => t.threadId === threadId)
  if (existing) {
    activeId = existing.id
  } else {
    pushTab({ id: newTabId(), threadId, scope: SEED_SCOPE, label })
  }
  historyOpen = false
  announce()
  return activeId as string
}

/** Close one tab. THE "+" IS NEVER PASSED HERE — it carries no id in this
 * store at all; see `agent-tab-strip.tsx`'s own item, `closable: false`. The
 * neighbour rule is `workspace-tabs.ts`'s own `closeTab`, read the same way
 * off array position: `next[at]` is whichever tab has just shifted INTO the
 * closed one's spot (its old right-hand neighbour), falling back to
 * `next[at - 1]` (its old left-hand one) only once there is nothing left of
 * that spot to shift into — the closed tab was the strip's own last one.
 * `null` is returned once the strip is empty of real conversations, which is
 * a real state here (just the "+" remains, exactly as the client asked: it
 * is never itself closable and never requires a conversation to sit beside
 * it). */
export function closeAgentTab(id: string): string | null {
  const at = tabs.findIndex((t) => t.id === id)
  if (at < 0) return activeId
  const wasActive = id === activeId
  const next = tabs.slice(0, at).concat(tabs.slice(at + 1))
  tabs = next
  const landing = next.length === 0 ? null : wasActive ? (next[at] ?? next[at - 1]).id : activeId
  activeId = landing
  announce()
  return landing
}

/** MOVE ONE CONVERSATION TAB, BY POSITION. Wires the kit's `BreadcrumbFolders
 * onReorder` (client ruling, 16 Sep 2026: "go with the drag order") through
 * `agent-tab-strip.tsx`, whose own comment on `onReorder` explains why the
 * indices it hands back name real `tabs` slots directly — History and "+"
 * are both `closable: false` so the kit never offers them as a source or a
 * target, and neither exists as a row in this array in the first place.
 *
 * Like `reorderTab` in `workspace-tabs.ts`, this never touches `activeId`
 * (named by `id`, not by position) and is a silent no-op for an index this
 * store does not hold. */
export function reorderAgentTab(fromIndex: number, toIndex: number): void {
  if (fromIndex < 0 || fromIndex >= tabs.length) return
  const clamped = Math.max(0, Math.min(toIndex, tabs.length - 1))
  if (clamped === fromIndex) return
  const next = tabs.slice()
  const [moved] = next.splice(fromIndex, 1)
  next.splice(clamped, 0, moved)
  tabs = next
  announce()
}

/** What the store is holding right now — for a caller that needs the fresh
 * list synchronously right after a mutation (`closeAgentTab`'s own return is
 * the LANDING id; the tab record itself is read back through here), and for a
 * test proving the ceiling holds. */
export function agentTabsSnapshot(): AgentTab[] {
  return tabs
}

/** The open tabs, for the strip. Two hooks rather than one combined snapshot —
 * `workspace-tabs.ts`'s own shape — because `useSyncExternalStore` compares
 * snapshots by identity, and a fresh `{tabs, activeId}` object built on every
 * call would never equal the last one it handed out. */
export function useAgentTabs(): AgentTab[] {
  return React.useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => (tabs.length === 0 ? NOTHING : tabs),
    () => NOTHING
  )
}

/** Which tab is being looked at right now. `null` matches `useAgentTabs()`'s
 * own empty state — the two are always either both real or both empty. */
export function useActiveAgentTabId(): string | null {
  return React.useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => activeId,
    () => null
  )
}
