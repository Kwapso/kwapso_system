# Rulings awaiting implementation

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

## Rulings awaiting implementation

**Assistant conversations (2026-09-15):** A "+" tab is always visible in the assistant's tab
strip and remains visible even when the assistant is closed. A new conversation opens on a
scope picker first. A pinned clock tab sits ahead of "+", never closable, and opens the
reader's own conversation history — search on top, grouped by last used (Today / Yesterday /
Last week / Earlier), each row a topic plus its created and last-used dates; picking a row
opens that conversation as a tab in the strip. **Status: built** (`web/lib/agent-conversation-
tabs.ts`, `web/components/assistant/agent-tab-strip.tsx`, `agent-scope-picker.tsx`,
`agent-history-tab.tsx`). The old `agent-history-dialog.tsx` sheet and its launcher button are
retired — the pinned clock tab is now the one way to reach a past conversation.

**Assistant tabs, one level (2026-09-15):** the ruling above shipped with the app's own strip
drawn one level BELOW the kit's single, fixed "Assistant" folder tab — a real conversation
strip, but a sub-level under furniture that only ever said "Assistant." The client's ruling,
over a screenshot of exactly that, verbatim: *"You got it completely wrong. The tabs need to
be at the same level as the assistant tab, so it will have no assistant name. We know that's
what it is. Rather, each tab will have the name. Now you create it like a sub-level, but no,
no, it's only one tab level."* The aside has exactly ONE tab level: no tab is named
"Assistant" — the word is now only the landmark's accessible name
(`role="complementary"`'s `aria-label`), never a visible tab — and `AgentTabStrip` (History ·
one tab per open conversation · "+") IS that one level, not a strip nested under it. Closing
follows from the same reading: a conversation tab's × closes that conversation; History and
"+" are furniture and are never closable; closing the LAST conversation tab closes the
assistant column itself, and the top-right opener reopens it with a fresh conversation on the
scope picker rather than resuming what was just closed. **Status: built.** Kit v1.2.88 added
`ScreenShell`'s `asideTabs` prop for exactly this (`shared/ui/compositions/templates/
screen-shell.tsx`) — drawn IN PLACE of the kit's own single fixed tab, in the identical slot
and geometry, so the folder-tab attachment to the card below is unchanged. App-side:
`web/lib/agent-dock.tsx` (`AgentDockTabsSlot` / `useAgentDockTabs`, the tab-level twin of the
existing panel-body dock), `web/components/shell/app-shell.tsx` (`asideTabs={...}` on the one
`ScreenShell` call site), `web/components/assistant/agent-panel.tsx` (the strip portalled
there when docked; the old `mt-[var(--folder-tab-overlap)]` re-base retired outright — it was
solving a nesting problem that no longer exists — and the closing/reopening behaviour above).
`web/test/agent-tab-strip.test.tsx` proves the aside draws exactly one tab strip and that no
tab renders named "Assistant."

**Corrected 16 Sep 2026, three ways, over a screenshot of the built strip beside the main
content strip.** *"The concept is great, but the design is still broken. Make sure that they
look exactly like the tabs in the main content. Also, I want the history tab to be on the left
of the plus, not the very far left. Put it to the left of the plus. Also, now when I click on
the tab, it doesn't close, so restore that behavior."* Three claims, three findings:

1. **Order — a real bug, fixed.** `AgentTabStrip` pinned History at `items[0]`, ahead of every
   conversation tab, reading "put it before the plus tab" as "ahead of everything." It now
   builds `items` as `[...conversations, history, new]` — History sits immediately left of "+"
   and never at the front. `web/lib/agent-conversation-tabs.ts`'s own header comment on the
   pinned clock tab is corrected to match. Tested: `agent-tab-strip.test.tsx`'s "pinned History
   tab" describe block now asserts History's index is `newIndex - 1` and `> 0`, not merely
   first.
2. **Look — not reproducible from source, and not a kit skin.** `ScreenShell`'s `asideTabs`
   slot (kit v1.2.88) draws the caller's node completely unconditionally — same
   `screen-shell-aside-tab` wrapper, same `ASIDE_TAB` geometry, same `--folder-tab-overlap`
   attachment, no kit-added skin around it (`compositions/templates/screen-shell.tsx`, the
   `asideTabs ?? (...)` line). `AgentTabStrip` calls the identical `BreadcrumbFolders` the
   content trail calls, with the same `items`/`activeIndex`/`onClose` shape. Rendering the real
   app component through the real `AgentDockTabsSlot` portal (not a direct `asideTabs` hand-off)
   and reading the DOM back confirms every tab carries `data-slot="breadcrumb-folder-fill"` and
   the kit's `TAB`/`TAB_REST`/`TAB_LIVE` classes, byte-identical to the content strip's own
   markup — and the kit's own demo (`demo/shapes/templates-0.tsx`'s `asideTabs` panel,
   `BreadcrumbFolders` with `onClose`) renders the real folder silhouette in a live browser
   (`<svg data-slot="folder-shape">` with a real, non-empty `viewBox`). No variant, prop, or
   wrapper skin difference was found anywhere in the reachable source. The chip screenshot most
   likely reflects a staging build that predates this round shipping (`ready-means-deployed`) —
   redeploy and re-screenshot before assuming another code path draws it.
3. **Close — not reproducible from source; coverage gap closed.** `web/test/agent-tab-strip.test.tsx`
   previously only ever handed `<AgentTabStrip>` straight to `asideTabs`, which proves the kit
   slot but skips the actual production wiring — `agent-panel.tsx` builds the strip at the root
   and reaches the aside through `createPortal` into `AgentDockTabsSlot`'s published node
   (`web/lib/agent-dock.tsx`). A new describe block, "AgentTabStrip through the real
   AgentDockTabsSlot portal," reproduces that exact shape (a sibling component reading
   `useAgentDockTabs()` and portalling into it) and presses a real conversation tab's × through
   it: `onClose` still fires with that tab's own id. The portal boundary is not where a close
   regression would hide.

**Assistant width and pinned tabs (16 Sep 2026 amendments):** Two further rulings on the same strip and its container shape.

**Width snap points.** The client's ruling, 16 Sep 2026, verbatim: *"assistant width = drag the seam with 320/400/520 snaps."* The assistant column is resizable by dragging its left edge; the drag has three snap points — minimum 320px, middle 400px, maximum 520px — so a writer can coarse-adjust without free-dragging the precise width. When docked (the normal state, inside a `ScreenShell`), the seam sits at the left of the aside and is draggable; when undocked (a modal layering, if implemented), the resize behaviour is not yet specified. The snaps are data, not computed, to allow future tuning without a code change: `ASSISTANT_WIDTH_SNAPS` in `web/lib/agent-dock.tsx` or equivalent.

**Pinned tabs placement, and the paint order client feedback, 16 Sep 2026, with a
screenshot.** Her words: *"on assistant, make sure the history tab and + are behind!"* —
over a screenshot of History and "+" grey-filled over the active Conversation tab's own
right edge. **Status: already correct at the source; not reproducible from a fresh
render.** `breadcrumb-folders.tsx`'s z-lift (added 2026-09-06 for the content strip's own
identical complaint) keys each tab's z-index to whether **it** is the live one — `TAB_LIVE`
(`z-[1]`) when `entry.index === activeCrumb`, `TAB_REST` (`z-0`) otherwise — never to
position in the DOM. So the active conversation tab, which this strip places FIRST (ahead
of the pinned History/"+" pair — the opposite shape from the main content strip, whose
active crumb is always the trail's own LAST item), still paints above both of them:
`z-[1] > z-0` regardless of paint order. Neither pinned tab carries a fill or a `data-slot`
of its own that could stack over a neighbour (`agent-tab-strip.tsx` hands both the ordinary
`TAB_REST` path, same as any background conversation tab), and `activeIndex` reaches the
kit correctly — `tabIndex = tabs.findIndex(...)`, no stale offset survives the 16 Sep
reorder above. **Tested:** `agent-tab-strip.test.tsx`'s "stacking — the active tab paints
above its pinned neighbours" describe block renders the exact reported shape (one active
conversation tab, first, ahead of History and "+") and reads the rendered `className`
back off each crumb, asserting `z-[1]` on the active tab and `z-0` on both pinned
neighbours — then repeats it with a second, background conversation tab open. Both pass
against the current source. Per `ready-means-deployed`: a screenshot proves what is LIVE,
not what the tree contains: this claim held once already for the same client round (see
"Look — not reproducible from source" above, three paragraphs up) because the chip she saw
predated that round's deploy. The likely account here is the same one — redeploy and
re-screenshot before assuming a second code path draws the strip.

**Not laws.** The three snap points and the width ranges are recorded here for the next
reader rather than independently checked. The stacking order IS checked (see above), by a
test rather than by a registry law — no `shared/rules/registry.ts` entry censuses this
strip's z-index the way it censuses e.g. R63's pinned toolbar.

**App status ladder, ruled 16 Sep 2026, not yet built.** Over an artifact ("App Status
Ladder"), the client chose model M2, the lifecycle ladder, with two corrections to it —
verbatim: *"for app status i choose m2, lifecycle ladder. however make sure you add planned
and not started. … when it's in validation and after it has a refinement, it's not yet
built. It's in validation, and then we are refining. … Live is only after the first
refinement sprint."* The DECIDED rungs, in order: Not started · Planned · In audit · In
plan · In build · In validation · In refinements · Live · Archived. Archived is the one rung
set by hand; every other rung is DERIVED from an app's waves and sprints. An app reaches
Live only after its first Refinements sprint has wrapped — In validation and In refinements
are two distinct rungs, not one, and an app sits in the earlier of the two until a
refinement sprint has actually run. **Colouring of the dots is still pending her pick** —
app stage pills stay coloured the old way meanwhile. Status: ruled, not yet built.

**Accounts tabs, ruled 16 Sep 2026, replacement pending.** The client's ruling, verbatim:
*"Accounts tab: drop the companies. It makes sense."* The Companies · All strip on the
Accounts screen is retired. What replaces it is pending her pick from a follow-up artifact
("Accounts Tabs"). Status: ruled, not yet built.

**Colour scheme, ruled 17 Sep 2026 — reconciled into D17. Status: ruled, in build.** The
client's ruling, verbatim: *"Do not invent new colors. Just use the ones that exist in the
kit only. For tickets, stories, everywhere, sprints running, and waves running, use the
blue. Accounts: active green, inactive gray."* [R32](../RULES.md)'s closed palette
(`closed-palette`) is the constraint this already has to fit inside — a token only, never
a hex or a Tailwind ramp. The further rulings the same day — ticket, story, sprint, wave,
input, contact, account and knowledge-source colouring, plus the charcoal-never-means-
in-progress correction — are now reconciled into one written rule:
[D17](#d17-a-status-colour-means-one-thing-everywhere-dots-are-always-solid-and-a-department-is-told-apart-by-an-icon-never-a-hue)'s
own 17 Sep 2026 amendment carries every one of them verbatim. **Status: ruled, in build,
17 Sep 2026.**

**Toolbar on small screens, RULED 17 Sep 2026.** Shown an artifact of the collection
toolbar folding for a phone/tablet width, the client's first ruling, verbatim: *"toolbar
option B, expand the artifact to show me how it looks when I click the three-dot button
and how it looks expanded, with everything: the sort, the filter, the views, everything.
Possible to have the search bar, but also all the buttons there? Just asking."* Option B
itself was chosen from that round — search stays on the row and never shrinks; Filter,
Sort and the view switch fold into one ⋯ button below 48rem container width, on tablet
and phone. Her closing question is now answered: the client's follow-up ruling the same
evening, verbatim, its whole text: *"popover menu."* The three-dot button's open state is
a popover — Filter, Sort and the view switch sit together inside it, opened from the one
⋯ button — never a sheet and never every button spread back out along the search row.

**Status: ruled, in build (kit v1.2.109, in progress), 17 Sep 2026.**

**Law.** None registered.

**Kit upload zone, ruled, artifact
[E19jyAKzRs6hoYdrWtQgTR](https://claude.ai/artifact/E19jyAKzRs6hoYdrWtQgTR).** Shown an
artifact of three upload-zone layouts (A strip+grid, B add tile, C filmstrip), the
client's first ruling, 17 Sep 2026, verbatim: *"I like the status when it's empty, like 'Drop
files here' or 'Choose.' That really works, but when I already drop something, I don't
like that what I dropped is so small and the other remains the same big. Can you create an
artifact with alternatives? My goal would be that the 'Drop files' becomes smaller and
that I can really see the images that I have already uploaded. They don't show only as the
name, but I also see the image itself, or, if it's a document, a preview."* None of the
three shown options was chosen from that first round. The empty-state copy and affordance
("Drop files here" / "Choose") stay as drawn — that half already worked from the start.
What was still open was the FILLED state: the original zone kept the drop target at its
full, empty-state size once a file landed beside it, and a dropped file showed as a
filename rather than an image thumbnail or a document preview. A follow-up artifact of
filled-state alternatives was built and shown the same day, and the client's second
ruling, 17 Sep 2026, verbatim: *"upload zone option B."* Option B is the shrinking
behaviour: once the first file lands, the dashed drop zone stops holding the full,
empty-state footprint and becomes one tile alongside the rest, in a wrapping grid of
thumbnails — an image renders as the image, a document as a preview, never a bare
filename standing in for either.

**Status: ruled, in build (kit v1.2.110, in progress), 17 Sep 2026.**

**Law.** None registered.

**Decisions awaiting further input (17 Sep 2026):**

- **Meeting-type department inheritance — CLOSED, 17 Sep 2026.** Her first words on it:
  *"I would need more consulting to take a decision."* Asked again the same day, her
  closing words: *"The whole meeting department brief, I don't understand what you mean
  here."* Closed without a change: no meeting-type-to-department inheritance is built, and
  the existing rule stands — a department is told apart by its own icon, never a colour or
  an inherited value
  ([D17](#d17-a-status-colour-means-one-thing-everywhere-dots-are-always-solid-and-a-department-is-told-apart-by-an-icon-never-a-hue)).
- **Close-dialog proof pattern.** The client's exact words: *"We will work on this later when we work on the ticket details page."* Deferred to the ticket details work and a future session.

**The app record's Knowledge tab becomes a gallery (17 Sep 2026, not yet numbered/indexed).**
The client's ruling, verbatim, from a consultation: *"In the Knowledge tab, replicate what
we have in the general knowledge. This should just be a gallery with all the knowledge we
have about this, with a toolbar that I can search and filter, blah, blah, blah, and a
button to ask about this. This should open a conversation with the assistant only about
this app."* The tab's own inline "ask a question" box (`AskTheAssistant`) is gone; it now
mounts the SAME shared gallery component the general Knowledge screen does
(`web/components/knowledge/knowledge-screen.tsx`'s `KnowledgeScreen`, parameterised by a
`scope` prop), filtered to this app's own material — a mirror of its own rows plus
anything filed under it by hand (`SourceFilters.appId`,
`workers/content/src/lib/knowledge.ts`). The Ask button opens a NEW assistant conversation
scoped to this app (`AgentTabScope` gained `"app"`, `web/lib/agent-conversation-tabs.ts`),
carrying the app's own id into the retrieval door (`retrieve()`'s new `appId` parameter,
narrowing the READ-BACK only, per R26). Applies R14 (bounded/paged read), R16 (the tab's
badge is now a real server count, not the old "not a collection" exemption — see
`shared/rules/registry.ts`'s `RECORD_TAB_COUNT_EXCEPTIONS`), R48/R50 (the toolbar, search
included, stands down only when the collection is genuinely empty), and R84 (the Ask
button is mango in the general screen's own `CollectionHeading`, and `variant="inverse"`
on the app tab, which has no title component of its own). **Status: shipped, this
session** — not yet folded into the numbered K-series above; a future documentation pass
should give it its own line and cross-reference.

**CLOSED, 18 Sep 2026 (Round 20) — the assistant's attach affordance.** Was: "DECISION
PENDING — the assistant's attach affordance, 13 Sep vs. 18 Sep." The side-by-side artifact
this row called for was built and shown; the client's pick, verbatim, *"assistant a1,"* is
now [L30](#l30-the-assistants-attach-affordance-is-a-paperclip-that-reads-a-file-for-one-conversation-only).
**Artifact:** <https://claude.ai/artifact/Nbwa6qGJTnCiGAaG5YrEgf>.

**CLOSED, 18 Sep 2026 — a title's maximum length.** Was: "DECISION PENDING — a title's
maximum length, computed at N=50." The ceiling this row recorded as computed-but-unwired is
now [F18](#f18-a-title-fits-one-line-on-a-macbook-air): `TITLE_MAX_CHARS = 50`, wired into
every title-shaped field's `maxLength` and live counter, and into the matching write door,
positionally (R20/R87). F18's own status line already reads "ruled, in build, 18 Sep 2026" —
this row is closed rather than restated. **Artifact:**
<https://claude.ai/artifact/TYmJqr1byzjS9oiLosyFaL>.

**CLOSED, 18 Sep 2026 (Round 21) — an imported title's length.** Was: "DECISION PENDING —
imported knowledge titles over 50 (clamp on import / leave / refuse)," open since round 18.
Shown the three options, the client's pick, verbatim, *"l1,"* is now
[F18](#f18-a-title-fits-one-line-on-a-macbook-air)'s own 18 Sep 2026 amendment (I1): the cap
binds what a person types, and a title arriving from a file name or a Google import is kept
whole.

**CLOSED, 18 Sep 2026 (Round 21) — ticket facts shown nowhere.** Was: "DECISION PENDING —
ticket facts now shown nowhere (Raised by/on/from, another language's title, the screen
recording link)," open since round 13 (17 Sep 2026). Asked to confirm whether these facts are
reachable anywhere on the page, the client's ruling, verbatim: *"yes, they do. It shows on the
footer, so do nothing as it is right now."* No change: the record's own audit footer
([D1](#d1-a-detail-screen-has-exactly-four-regions-in-this-order)'s own fourth region) already
carries them.

**STILL OPEN, 18 Sep 2026 (Round 21) — the emails artifact's accuracy.** Shown the "Every
Email Kwapso Sends" artifact, the client's ruling, verbatim: *"not sure they are accurate.
Make sure that you reproduce 100% accuracy."* The page is regenerated straight from the real
templates the app actually sends, rather than hand-summarised copy, so nothing on it can drift
from what a person receives. Not yet re-shown for her sign-off — the row stays open until she
sees the regenerated page.

**STILL PARKED, 19 Sep 2026 (Round 22) — Main Page Views.** Open, unchanged, since at least
round five (16 Sep 2026). Asked again this round, the client's ruling, verbatim: *"Continue
parked."* No artifact shown, no pick made; carried forward exactly as it was — the same answer
as Round 21 (18 Sep 2026): *"continue parked."*

**CLOSED, 19 Sep 2026 (Round 22) — the five untyped Smoke-team stories.** Was: "ANSWERED, WRITE
PENDING HER SIGN-OFF, 18 Sep 2026 (Round 21) — five untyped stories," open since round eight
(16 Sep 2026). The five proposals, read off each story's own content, were handed back for her
sign-off; her ruling this round, verbatim: *"You do it."* Written on the Kwapso staging team:
B0307 Data, B0315 Feature, B0128 Feature, B0025 Change, B0026 Tech.

**VALIDATED IN ROUND 22, 19 Sep 2026.** Six items confirmed live on staging this round: the
assistant tab strip fits its own pane
([K50](#k50-the-assistant-tab-strip-fits-its-own-pane-no-clipped-tab--never-pushed-out-of-view)),
the assistant composer holds one row at rest
([K48](#k48-the-assistant-composer-holds-one-row-at-rest-at-every-pane-width)), the rail's brand
mark ([K49](#k49-the-rails-brand-mark-steps-up-one-more-rung-still-centred-on-the-strip-row)),
the empty-state single door
([D22](#d22-an-empty-section-draws-exactly-one-door-in-no-header-no-second-)), the new-tab
search field's one icon
([K51](#k51-the-new-tab-search-field-carries-one-icon-not-two)), and the imported title's
length (F18's I1 amendment, [F18](#f18-a-title-fits-one-line-on-a-macbook-air)) — her ruling on
the last of these, verbatim: *"Validated."*

---
