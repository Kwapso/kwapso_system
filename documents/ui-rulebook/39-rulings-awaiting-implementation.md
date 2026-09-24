# Rulings awaiting implementation

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

## Rulings awaiting implementation

**The Logs dashboard, her review (2026-09-24):** four rulings over the tab built the day
before, verbatim: *"add full toolbar, even if search is diasbled. kpi need background. put who
logged it next to where they went 1/2 and 1/2. HOURS A WEEK, show multiple lines, one per staff
and area for total."* **Status: built.**

1. **A full toolbar, with the search shown and off.** It drew two filters and nothing else, and
   a toolbar missing its most recognisable control reads as broken rather than deliberate. It is
   the KIT'S OWN `SearchInput` in the kit's own disabled state (its state 5: `--hair-faint` fill,
   `--ink-disabled` ink, no shadow, clear control withdrawn), so nothing here fakes a field with
   a div, and there is no kit gap to report. The placeholder says where search does live ("Search
   is on the Entries tab") so the control is not a dead end. `TOOLBAR_EXEMPT` no longer names this
   screen; the list shrank, which is the only direction it may move. **The sort slot is still
   empty and still reasoned** (`TOOLBAR_SORT_EXEMPT`): a donut is ordered by share, a line by
   time, a rank by hours, so a sort chip would have to pick one picture to reorder and leave the
   other five.

2. **The KPI figures get their background, and it is Effort's.** Her word was "like effort", so
   the tile is `effort-card.tsx`'s part for part: `<Card variant="default">` + `<CardContent>` +
   `<StatGrid surface="bare">`, on the same `gap-[var(--space-4)]` grid. A FILL, never a stroke
   (R67 as amended forbids the box drawn as an outline), and the four are written out as literal
   elements rather than mapped, because R65 reads a keyed kit `<Card>` as a per-record row. This
   is her own "unless explicitly said" clause in R97, said: `COUNT_REGISTER_EXEMPT` records it as
   SETTLED rather than pending, beside the identical Effort entry.

3. **Where the hours went sits beside Who logged it, half and half.** One `lg:grid-cols-2` row at
   `gap-6`, the same arrangement the accounts overview uses for country beside industry. The
   weekly chart keeps its own full-width row: a line is read across the whole measure.

4. **Hours a week is one line per person over an area for the total.** The door already hands
   back every person's own share of the same eight windows from ONE grouped read, so this costs
   no second round trip and emphatically no read per person. **The cap is five, and it is the
   palette's rather than a taste:** `--chart-1..5` is how many hues this system can tell apart, so
   a sixth line would repeat one (two people drawn identically) or invent one (R32 forbids it).
   **Nobody is quietly dropped.** The AREA is everybody, because it is the door's exact total
   computed without the grouping cap, so an undrawn person is still inside the shape their
   colleagues' lines sit under; the legend then carries "and N others, in the total but not
   drawn", and each week's hover carries those others' own hours so the rows add up to the total
   above them. N comes from the door's exact `activePeople`, not from the capped array, so it
   does not under-report past `WORK_LOG_GROUP_CAP`. Who is drawn is ranked by hours IN THE WINDOW,
   never by the all-time total the door sorts on, or a chart of eight weeks could draw five flat
   lines at zero.

**A stale kit comment found on the way:** `chart.tsx`'s header still warns that `--chart-4` and
`--chart-5` "currently resolve to `--chart-1` and `--chart-2`". At the pinned kit (v1.2.167)
`tokens.css` resolves them to `--kw-lavender` #B1A3CF and `--kw-orange` #F7953E, both admitted
2026-09-02 and both distinct. Reported upstream; nothing app-side works around it.

**The Logs module (2026-09-23):** five rulings, verbatim: *"tabs: dahsbaord, entries."* ·
*"word is logs only"* · *"kind of work is what its related to"* · *"implement everything you
suggested for dashboard - exclude running now. add toolbar w filters by person, account."* ·
and, later the same day, *"on logs this kind of work shoudl not be manual, but automatic to
where it was created: if it was creted in a story its stories, in a ticket its a ticke, in a
meeting its a meeting, etc"*. **Status: built.**

1. **Two tabs, Dashboard first and default.** Exactly two, and nothing else becomes one. The
   same place Tickets' and Accounts' own Dashboard tabs hold on their strips; a Logs URL with
   no `tab` lands on Dashboard, and pressing back onto it drops `tab` from the address.
   Entries is the timesheet that was the whole screen until today, its rows unchanged.

2. **One word: Logs.** One concept had been wearing FOUR: "Logs" on the rail, "Work logs" on
   the Home tile and a meeting's own tab, "Time log" on a story, a ticket and a task, and
   "Work log" in the glossary. It is **Logs** everywhere now and a single entry is a **Log**;
   the glossary term, the glossary knowledge seed and the translation seeds moved with it.
   **This REVERSES ticket B0386 of 22 Sep 2026** ("Inside stories and tickets, let's rename
   'effort' to 'time log'"), which was itself an approved rename. Her ruling is the newer one
   and its date is recorded beside it in `shared/glossary.ts` so nobody reverts it next week on
   the strength of the older note. **One string still owed:** the meeting detail's own tab
   (`web/components/meetings/meeting-detail.tsx`), owned by another lane;
   `web/test/logs-dashboard.test.tsx` pins that it is the ONLY one left.

2b. **"Wipe them" (2026-09-24).** Asked what to do with the words people had
   already typed into "Kind of work" before it became automatic, she ruled:
   *"wipe them"*. Team migration **0122** clears them, backing every one up first
   in `work_log_kinds_backup` (restorable with one statement, safe to run twice,
   touches nothing else). **One set is spared on purpose:** `target_table =
   'meetings' AND kind = 'Meeting'`. That literal is what the transcript capture
   stamps, and a person could have typed the same word on a meeting themselves,
   so no column tells them apart. Sparing costs a handful of invisible words;
   wiping cost the capture's de-duplication guard 18.25 hours across 21 work logs
   nobody worked, once already. `target_table` is the discriminator everywhere
   else, so a hand-typed "Meeting" on a story IS wiped. **The two readers moved
   off the column the same day:** the "with or without meeting time" filter now
   asks `target_table` (NOT NULL, so the awkward `kind IS NULL OR ...` arm is
   gone), and the capture's guard now matches target + person, which is tighter,
   not looser. The constant itself stays until Aurora rules on the spared rows.

3. **"Kind of work" is the related record type, and nobody types it.** It now means what the
   time was logged AGAINST: Story, Ticket, Task or Meeting (`work_logs.target_table`, NOT NULL
   on every row). The free-text `kind` text box is gone from the log form and the correction
   sheet, the badge on an Entries row draws the related type instead, and the record panel's
   old "Hours by kind of work" card is deleted (on one record that split can only have a single
   bar). **The column and its stored data survive**: the meetings door still stamps its own
   constant, the `meetingTime` filter still reads it, and a correction that sends no kind falls
   back to the stored value, so a row that already carries a typed word keeps it and simply
   stops being shown it.

4. **The dashboard, six sections and no "running now".** Four figures across the top (hours
   this week with the change on last week, hours today with how many people, how many people
   logged nothing last week, and how many records were worked on), a donut by related record
   type, a line of the last eight weeks whose hover names who logged them, a bar per person
   with their face, a bar per client **plus a row for our own work**, and the records with the
   most hours against them. She excluded "running now" by name: the header bar already carries
   every running timer on every screen. **`work_logs.account_id` had never been displayed
   anywhere in the app** - written on every row since migration 0015, inherited from the
   target, indexed, and read back by nothing until this tab.

5. **The denominator is printed, not implied.** "How many people logged nothing last week"
   cannot be answered against a roster this door cannot see (members live in the global core
   database behind the tenancy worker), so it is answered over the people it CAN see - everyone
   with time in the last eight weeks - and the figure prints "of N who logged in the last eight
   weeks" beside itself, every time.

6. **The toolbar: two filters, person and account, narrowing every section.** Declared through
   the shared facet table (`web/lib/collection-filters.ts`) and drawn through the shared filter
   seam; the filters ride the dashboard's own cache key, so two narrowings can never share one
   answer. Both tabs offer the same two. The Dashboard row draws no search box and no sort, and
   both are named, reasoned lines in `TOOLBAR_EXEMPT` / `TOOLBAR_SORT_EXEMPT` rather than
   silent omissions: there is nothing on a tab of grouped pictures for a browser to sieve, and
   each picture already carries its own order.


**The Accounts dashboard, her second pass (2026-09-23):** four rulings over the tab she had
ordered that same morning, verbatim: *"on accounts oevrview, fix how the kpis cards look, and
add the median tenure"* · *"make the where as a donut graphic (when hover show)"* · *"make the
how long weve had this account a line graphic, and when hover show who (like tickets
tendency)"* · *"on accounts dashbard, the mandatory space between tabs and content is
missing"*. **Status: built.**

1. **The figures.** They were a wrapping baseline row (a `text-3xl` figure beside a grey word,
   `gap-8`), which reads as one run-on sentence rather than a set of figures. They are the
   kit's own stat register now, borrowed from `stat-grid.tsx` without its box: a `text-micro`
   uppercase eyebrow over a `text-4xl` figure, on a real `sm:grid-cols-3` so three figures line
   up. **Still not cards and still not `<StatGrid>`** - R97 is explicit that a count never gets
   one, and the kit's own primitive is a number-and-label card by construction. The third
   figure is the new median tenure.

2. **Median tenure.** A TRUE median, taken by the database over the active company book
   (`readAccountsDashboard`, `workers/tenancy/src/lib/accounts.ts`): an even count answers the
   mean of the two middles, one account answers its own tenure, and no accounts answers `null`
   rather than 0. Handed over in DAYS, the only unit the database measures exactly; the screen
   spells it in MONTHS, because the picture under it has one point per calendar month and a
   figure should share its neighbour's ruler. Proved in `workers/tenancy/test/
   accounts-dashboard.test.ts` (odd, even, one, none, and the fence).

3. **Where they are, as a donut.** The ring is the KIT's own `Donut`. **The legend is not, and
   that is a kit gap rather than a preference**: `donut.tsx`'s own state table says "hover -
   none drawn", it exposes no per-segment callback, and the ring is rendered inside the
   component, so her "(when hover show)" cannot be answered through the kit's legend today. So
   the rows are drawn app-side as real `<button>`s under the kit's `HoverCard`, the same hover
   language `tickets-dashboard.tsx` already uses. At rest every country is named with its own
   colour; the COUNT and the share are what hover reveals. The legend's colour sequence is
   pinned to the kit donut's own, read off both files, so a key can never drift from its ring.
   **Open upstream:** give `Donut` an optional per-segment hover, then this legend collapses
   back into `legend`/`showPercent`.

4. **How long we have had them, as a line.** The arrivals bars became a line plus a filled
   area, drawn in `ClosureTrend`'s exact language (unit-square `viewBox` under
   `preserveAspectRatio="none"`, months as rules behind the mark, one HTML hit area per month
   over the plot, each a real button so the hover card opens on focus too, the readout carried
   as the button's accessible name). Her "show who" is the account NAMES behind each month,
   which the door now hands back bounded (`ACCOUNTS_ARRIVAL_NAMES_PER_MONTH`, eight) with the
   exact count beside them, so a busier month says how many more it could not name. A single
   month is still a dot rather than nothing.

5. **The gap is R83, and it was missing app-wide.** Since 21 Sep the strip pays nothing and the
   content pays the whole `--toolbar-lead-gap`, but the only payer written was
   `[data-slot="card"]` - so every collection tab collected it and every DASHBOARD tab, being
   bare panels, collected zero. Fixed at the law in `web/app/globals.css`, never in the screen
   (R83's own census forbids the caller a `gap-*`, and a margin in the component would be the
   per-screen hard-code the 2026-09-03 ruling refuses). See RULES.md R83's own amendment for
   why the STRIP pays it in the non-card case and why `--pinned-chrome-h` moves with it.
   **Corrected the same day, and the correction is worth reading:** the first landing wrote both
   exclusions into one condition, `:has(+ *:not([data-slot="card"]):not(:has(> …)))`, which the
   grammar forbids - `:has()` may not contain `:has()` - so every browser discarded the rule and
   the lead stayed 0px everywhere, including the dashboard it was written for. Nothing complained:
   the stylesheet loaded, lightningcss parsed and emitted it, and the check that shipped with it
   was a string search over the text of `globals.css`, so it passed against a fix that did
   nothing. It is two possible selectors now, a paying rule and a cancelling one, and
   `web/test/tab-content-gap.test.ts` asks a real selector engine what each rule MATCHES over the
   four real bodies a tab can have (bare column, bare `<section>`, card sibling, wrapper around a
   card) rather than only that it is written.

6. **Industry joins the row, beside "Where they are"** (her later ruling the same day:
   *"add metric industry (side of where they are , so in the same row country & industry)"*).
   The two splits are one `SplitDonut` drawn twice, in a `lg:grid-cols-2` row that stacks into
   one column below `lg` - the same arrangement every panel row on `tickets-dashboard.tsx`
   already keeps, rather than a stacking rule invented for this screen. The door gained
   `byIndustry`, read through the identical fence and the identical "a word nobody set is not a
   row" clause as `byCountry`. The section title is **"What they do"**, a question because its
   neighbour is one; the FIELD is still called Industry everywhere a person sets one.

7. **Industry stops being free text** (*"make it a drop down, adjustable on settings"*).
   **Status: built.** It was already half a dropdown, which is why it drifted: the form has
   picked from an "Industry" group since it was built, `VOCABULARY_HOMES` has named
   `accounts.industry` as its home, and Settings > Accounts > "Industries and countries" has
   edited it - but the WRITE DOOR took free text, and the group was never seeded from the
   column. Three parts landed together, and the order matters:
   - **The seed first.** Team migration **0120** back-fills the `Industry` and `Country` groups
     from the distinct non-blank words already stored on `accounts`. Measured against the
     22 Sep 2026 account backup, ten of the eleven live industries and two of the six live
     countries were outside the team's own seeded vocabulary, so closing the door first would
     have made those accounts uneditable.
   - **Then the door.** `requirePickedAccountValues` (`workers/tenancy/src/lib/accounts.ts`)
     refuses a word that is not a currently active option, on create and on edit, through the
     shared `requireActiveSelectableValue` (moved to `shared/workers/vocabulary.ts` so tenancy
     can reach it; the content worker re-exports it and no call site there changed). An edit
     that re-sends the word the row ALREADY holds is never re-checked - retiring a word must
     stop it being set, not make an existing record uneditable.
   - **Country gets the identical fix**, because it is the same field twice and its door had
     been open longer.
   **Nothing is merged.** Every distinct stored spelling becomes its own option, near-duplicates
   included: "Insurance" / "Insurance Broker", "Events" / "Event & Sport", "Austria" /
   "Osterreich". A migration runs once, per team, with nobody watching, and these may be real
   distinctions. Merging two of them is an ordinary rename on the Choices screen, which rewrites
   the stored words through `storedWordColumns` - Aurora's call, and safe to make whenever she
   wants. Checked by `workers/tenancy/test/accounts-picked-vocabulary.test.ts` (the seed and the
   door, called for real) and `web/test/account-fields-are-picked.test.ts` (the wiring).

**Her review of the built overview (2026-09-23, same tab).** Verbatim: *"the cards kpi need some
kind of background, like effort. also there's margin missing under tabs. make industry a bar
chart. when hover in donut in country, show which aacounts with name adn logo"*, and separately
*"needs to be a bit mor ein case withous toolbar!"* **Status: built.**

8. **The KPI tiles get Effort's own background.** `<Card variant="default">` around a bare
   `<StatGrid>`, which is `effort-card.tsx`'s own treatment rather than a third one that nearly
   agrees with it. **It is a tone, not a box** - checked against the kit's newest law rather than
   assumed, because "give it a background" is the one instruction a reader could answer with an
   outline: §2.8 (her own "by rule no borders nowhere in the kit", the same day) forbids a
   container told from its ground by a STROKE, and `variant="default"` is soft paper, a fill.
   **It also overturns R97 for this tab, which is her call and not the lane's**: R97 reads "a
   count never gets its own card, UNLESS EXPLICITLY SAID", and every line in its exemption table
   has said "pending her word" since it shipped. She has now said it, so
   `accounts-dashboard.tsx` joins that table with her sentence as the reason, and joins
   `PAPER_ON_PURPOSE` beside Effort's own tiles.

9. **Industry becomes a bar chart; country stays a donut; they still share the row.** A donut
   answers "what share of the whole", which is the question about where clients are; a ranked bar
   answers "which is biggest and by how much", which is the question about what they do - and an
   industry list is longer with longer words, so eleven named bars read where eleven legend
   colours would not. One neutral ink, not the chart sequence: the name is beside every bar, so a
   hue would encode a fact already written down. The count sits at the end of its own row rather
   than behind a hover, because a bar has somewhere to write it and a slice does not.

10. **Hovering a country slice names the accounts in it, with their faces.** The kit's `Donut`
    reports the active segment since v1.2.167 (`activeId`/`onActiveChange`), so the readout is
    driven by the ring rather than by a second control beside it; the legend rows stay real
    buttons and set the same state on focus. The door now returns the accounts per country,
    **bounded** by `ACCOUNTS_COUNTRY_FACES_PER_ROW` (8, the same ceiling an arrival month's names
    carry, because both are "who is behind this mark" read in a panel that cannot scroll) while
    `n` stays exact - so a country with more says "and N more" rather than showing eight and
    implying that is all. **A company with no logo falls back to the app's own letter tile**:
    the readout draws `RecordMark`, the same face every account list already draws, and invents
    no second fallback. The readout sits under the picture rather than in a popover, because a
    floating panel would cover the ring the pointer is on.

11. **The tab-to-content lead is now two numbers, and the smaller one was never her complaint.**
    Measured in a browser against the real compiled stylesheet before changing anything: the lead
    was **not missing** - it was 10px, correctly, on all four shapes including the Accounts
    dashboard and Settings > Appearance. Her two sentences read together say what that means:
    10px is the number she ruled for the space **above a toolbar** (21 Sep, "the 10pc above and
    below"), and a tab with no toolbar under the strip inherited it by accident. So the law splits
    three ways by what follows the strip: a body that is a card, or a wrapper around one, is
    unchanged (the card pays 10px on its own `card-content`); a bare body that **leads with a
    toolbar** (`[data-slot="toolbar-row-pin"]`, Settings > Team) keeps the ruled 10px; and a bare
    body with **no toolbar** (every dashboard, Settings > Appearance) gets 20px -
    `--tab-content-gap`, which is the number this exact relationship carried until the toolbar
    ruling took it from every strip. No new token. Measured after: 18.75px, 18.75px, 9.375px,
    9.375px, 9.375px across the five shapes at the app's own 15px root.


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

