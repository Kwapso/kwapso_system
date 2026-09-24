# 2. Page layout and width (part 1 of 4)

*Split from [documents/UI-RULEBOOK.md](../UI-RULEBOOK.md) — moved verbatim, cut rather than copied.*

## 2. Page layout and width

### L1: one page container, one cap

Replace `max-w-3xl` at `web/components/deep-link/deep-link-screen.tsx:330` with:

```tsx
className="mx-auto flex w-full max-w-[1600px] flex-col gap-6"
```

and set the shell gutters at `web/components/shell/app-shell.tsx:373`:

```tsx
<main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-24 sm:px-6 lg:px-10 md:pb-8">
```

Arithmetic, so the change is checkable. At the 1283 CSS-pixel laptop the screenshots use,
the main region is about 1043px. Today: `px-4` then a 768px cap gives a **138px gutter
each side**. After: `sm:px-6` and no cap reached gives a **24px gutter**, a reduction to
roughly one sixth. At 2560px the 1600px cap keeps a comfortable measure instead of a
1300px void. The owner asked for "roughly a tenth"; this is the honest number that also
survives tablet.

Also delete `rounded-xl transition-shadow` from that same string. It rounds and animates
a container that has no surface, which is the only remaining `transition-shadow` in the
app.

Evidence: [Finding 2](#finding-2-two-thirds-of-a-wide-screen-is-empty-margin);
`A-4.06.36`, `A-4.05.42`, `A-4.08.47` all run edge to edge with a small fixed gutter.
And the brand's own answer, measured: `.nk-container` is `max-width: 1920px` with
`padding: 100px 40px 20px`, computing to a **40px** horizontal page padding at every
desktop width. `lg:px-10` is exactly that 40px, and it is exactly the brand's
`--margin--m` token. The app caps tighter than 1920px only because it carries a 240px
sidebar the marketing site does not; if the owner wants it wider still, raise the cap and
change nothing else.

### L2: prose is capped, the page is not

Line length is a property of the text block, not the page. Any paragraph, article body
or description gets `max-w-[72ch]`. Tables, lists, card grids and calendars take the full
container.

Evidence: `A-4.05.52` puts the description in a roughly 840px column beside a narrow
related-record rail, while the story table on the same screen spans the whole width.
(inferred: the exact `72ch` value; Glide's column is fixed pixels.)

### L3: above roughly 1024px, a detail screen is two columns

Main content left, related records right, at about a 2:1 ratio.

```tsx
<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
```

The right rail holds the related-record cards (see [D8](#d8-a-related-record-is-a-card-not-a-row-of-labels))
and short sub-collections. Below `lg` it stacks, right rail last.

Evidence: `A-4.05.52`, `A-4.06.12`, `A-4.07.25`. Every wide detail screen in the old app
is this shape.

### L4: the collection index screen may be two panes

Where a collection is normally read filtered by one parent (stories by app, tickets by
app), a left selector pane and a right collection pane is allowed at `lg` and above.

Evidence: `A-4.06.36` and `A-4.06.45`, the Planning screen: an App picker on the left,
the Sprints/Tickets/Backlog/Meetings tab strip and its collection on the right.

### L5: the portal keeps its own, narrower cap and larger type

`web-portal/components/portal-shell.tsx:162` stays `max-w-3xl px-5 py-8`. The portal is a
reading surface for one client, not a working surface, and it already sets
`:root { font-size: 17px }` rising to `18px` at `md`
(`web-portal/app/globals.css:25-34`). Do not unify the two caps.

Evidence: `P-4.09.52` and `P-4.10.05` are noticeably narrower and larger-typed than any
agency screen. (inferred: keeping the divergence deliberate rather than accidental.)

### L6: the shell frame never scrolls

The desktop sidebar, the mobile top bar and the mobile bottom tab bar stay fixed; only
`<main>` scrolls. This is already true (`app-shell.tsx:303,345,378`) and is restated here
because [D3](#d3-the-header-and-tabs-stick) adds a second sticky layer inside `<main>`
and the two must not fight. The shell owns `z-20`; the in-content sticky header takes
`z-10`.

### L7: exactly one `<h1>` per screen, and it is the record or collection name

Today `home-screen.tsx`, `settings-screen.tsx` and `invitations-screen.tsx` disagree
(`text-2xl` heading, uppercase `<h2>` labels, and no heading at all respectively), and
`help-detail.tsx:410` renders the ticket title as `<p className="truncate text-sm font-medium">`.
Every screen gets one `<h1>` at the scale set in [T1](#t1-one-heading-scale-per-front-door).

Evidence: `A-4.07.25` gives the ticket the same large title every other record gets.

### L8: a panel that minimises collapses, and a shut panel is shut for the keyboard too

**The rule.** The assistant column closes by COLLAPSING, never by vanishing. Three things
have to be true together, and the third is the one a designer has to remember to ask for:

1. the column stays **mounted** across the open/shut flip. Writing
   `isAsideOpen ? <aside…> : null` throws away the element the exit animation would have
   played on, so there is nothing left to animate;
2. the wrapper that collapses carries `.motion-column-collapse`, a `data-state` bound to
   the open flag, and a `--motion-column-size`
   (`shared/ui/compositions/templates/screen-shell.tsx`,
   `shared/ui/foundations/motion/motion.css`);
3. it also carries **`inert`**, bound to the negation of that flag. A collapsed column is
   zero width and fully transparent and is still in the tab order and the accessibility
   tree. Without `inert`, "closed" is true for the eye and false for a keyboard and a
   screen reader — which is not what the client asked for: *"closed assistant show
   nothing. it's literally only the bar."*

**What it costs, and the trap that earned it.** `.motion-column-collapse` may **not** size
itself with `grid-template-columns` or `fr` units. That is the row-collapse rule with the
axis turned ninety degrees; it reads correctly, it type-checks, it lints, and inside a
flex row it silently does nothing — a flex item's grid is sized under an intrinsic
constraint, and under an intrinsic constraint a `0fr` track is floored at its own base
size instead of resolving to zero. Measured in the verify sandbox, the track never moved
off 356.25px: the panel went fully transparent and kept every pixel of its width. That is
visibly **worse** than the instant disappearance it replaced, and it is only visible to
somebody who measures the settled geometry. The column is sized on `inline-size`.

**Law.** [R51](../RULES.md) (`aside-collapse`).

**Mid-edge close control, 2026-09-15:** When the assistant is OPEN, there is no mid-edge
close control on the right edge of the assistant column. The top-right opener button stays
visible (it never hides), toggling the assistant state. The assistant itself closes only
from its own tab close action (kit v1.2.85 `asideHandleOnOpen`,
`web/components/shell/app-shell.tsx`). This removes ambiguity about what the edge gesture does.

**Assistant strip icon-only tabs (16 Sep 2026):** *"validated, but still gotta fix the shape!"* — client. Icon-only pinned tabs size to the icon, with no 128px text floor (kit v1.2.95 `iconOnly`).

### L9: every section on the team area's strip has a door, or names the screen that took its place

**The rule.** A section that lives on the team area's own strip (`TEAM_SECTIONS` in
`web/lib/pages.ts`, `placement: "tab"`) is reached from exactly one place in the app: the
"This team" list on Settings › Team, which is built from that same table minus the keys it
subtracts. **If you take a section off that list, the capability does not disappear — the
door does.** So the section names the screen that carries its material instead, and that
screen must really make the same door calls the section's own actions made. A section with
`placement: "contextual"` never appears on that list at all, so it needs a literal link
somewhere under `web/` that ends at its segment, or the same written line.

**What it costs.** Only LITERAL paths are visible to the census, so a section reached by a
computed segment reads as unreachable and has to be written down — a reviewer reading a
claim, rather than a build going quiet.

**Why it exists, in one sentence you can check on screen.** The 2026-09-09 Team redesign
left three acts — change a member's role, remove a member, revoke an invitation — on
screens that exactly one thing in the app linked to, and that one link pointed at a
member's RECORD. Somebody with full team-member rights and the wrong commercial right had
no in-app path to any of them, under a green build, with the gallery's own comment telling
the next reader it was fine. And `dropdowns` moved tab → contextual on 2026-09-01: from
that moment nothing in the app opened it, and a screen with an import door, an export and
a record split sat unreachable for ten days.

**Law.** [R64](../RULES.md) (`sections-have-a-door`).

### L10: a screen's title comes from the nav registry, never typed by hand

**The rule.** *"On the page settings accounts, put only the name of the module. You don't
need to put settings. For example, instead of account settings, just accounts. Make sure
you use the name exactly as in the navigation bar. Most of the time, it's a plural."* —
client, 2026-09-14. Every `MODULE_SETTINGS` page's title is `navPageTitle(segment)`
(`web/components/screens/module-settings-screen.tsx`) — a LOOKUP into `TEAM_SECTIONS`
(`web/lib/pages.ts`), the one place a destination's nav word is already decided, since the
sidebar, the team area's own tab strip ([L9](#l9-every-section-on-the-team-areas-strip-has-a-door-or-names-the-screen-that-took-its-place))
and the breadcrumb all read that same table — never a second spelling typed at the settings
page itself. "Ticket settings" and "Account settings" are gone; what is left is "Tickets"
and "Accounts," her own worked example, word for word.

**Throws rather than guessing.** A segment `TEAM_SECTIONS` does not carry is a genuine gap,
not a silent fallback: `navPageTitle` throws, naming the segment, rather than teaching the
lookup to invent something nobody asked for. The one page with no nav word to read
(`"team"`, which never navigated anywhere) states its title as a literal — "Housekeeping" —
with a comment saying why, rather than being taught a fallback that would go stale the day
a second nav-less page appears.

**Nothing censuses this yet.** Unlike [D11](#d11-every-detail-screen-wears-the-same-title-treatment-and-it-comes-from-one-constant),
which a check holds every detail screen to one constant, no check today asks whether every
settings page's title actually IS a `navPageTitle` call rather than a literal string typed
back in agreement with it by hand — this entry states the ruling as she gave it and the
mechanism as it is built, honestly short of a census over every settings page in the app.

### L11: pressing Import opens its own workspace tab, fronted, and never redirects the one you were in

**The rule.** *"Make sure that it opens as a new solo tab on the breadcrumbs, because now
it redirects. In the places where we have import, make sure that's what it does."* —
client, testing Import, 2026-09-14. Every "Import CSV" door, and the generic wizard link on
Home, used to navigate the CURRENT workspace tab straight to the import wizard, so the
collection she pressed it from vanished from the strip until she clicked Back — the "just
redirected me" she was reporting.

**The mechanism.** `openInNewTab` (`web/lib/nav.ts`) is the one door: a SOLO tab is a trail
of one entry, which `visitTrail` (`web/lib/workspace-tabs.ts`, the model behind the
breadcrumb-tab strip) already generalises to on its own terms — no ancestors, one entry,
itself the only and active level. Every import dispatch calls it instead of the plain
`go`/`softNavigate` this section's own `<InAppLink>` inline-interception pattern otherwise
uses. Pressing Import again on the same target fronts the tab already open rather than
opening a second one, and closing it returns to the tab that was open before — the ordinary
tab-strip behaviour [K4](#k4-a-tab-that-reveals-a-collection-carries-the-count-as-a-badge-and-the-heading-stands-down)'s
own model already gives every other tab, extended to this one door.

**Law.** [R74](../RULES.md) (`import-opens-a-tab`).

### L12: a tab is a trail — a plain click or a rail pick pushes a step onto it; only a deliberate gesture opens a new one

**The rule.** Two rulings, eleven days apart, and the second changes what a tab IS.
**2026-09-06, verbatim:** *"regarding the breadcrumbs... would it be possible to
replicate the tab behaviour of chrome? what i mean: i am in a detail app, but i click the
first tab 'apps' see all the apps but the detail where i was stays open / then we'll need
a x icon on the tabs to close them / but the idea is that all tabs i open stay open unless
i close them / is this possible?"* — that built the TAB SET this file still holds.
**17 Sep 2026, verbatim:** *"Unless I do it on purpose to open a new tab, everything
happens on the same tab. This means that I would navigate in the app, and this would just
keep making the breadcrumbs longer. Unless I press Command and click, this would open a
new tab, and the same behavior in Windows, just replicating Google Chrome."* Same
session: *"Yes to Chrome navigation, push the trail on a rail pick."*

**The mechanism.** Until 17 Sep 2026 "opening a tab" and "navigating" were the same
event — every crumb level on a cold address opened its own tab, and clicking deeper
pushed nothing because the trail WAS the URL. A tab is no longer `{path, label}`; it is a
PLACE WITH A PAST — `OpenTab` (`web/lib/workspace-tabs.ts`) now carries `steps:
TrailStep[]` and a `cursor`, Chrome's own back-history model applied per tab instead of
per window. A plain click on an `<InAppLink>` (`web/components/shell/in-app-link.tsx`)
still calls `preventDefault` plus `softNavigate`, and `visitTrail` still owns the push —
but it now reads only the LAST entry of the incoming crumb array (the page just navigated
to) and pushes ONE step with it onto whichever tab is active, rather than minting a tab
per level. A rail pick (`goToSection` in `web/components/shell/app-shell.tsx`) goes
through the identical `navigate` → `softNavigate` → `visitTrail` seam, so it pushes too —
"push the trail on a rail pick" is the same mechanism the ruling already gives every
other click, not a special case. The one exception is the very first call in a freshly
opened tab (no active tab yet, or a cold deep link into an empty scope): there `steps` is
seeded from the whole incoming trail, so landing cold on a nested address still shows the
ancestors above it, and Back still walks out through them — now via the cursor instead of
via a second tab. Identity moved off the path and onto a minted `id`, because two tabs may
now show the exact same path — cmd-clicking the same link twice is Chrome's own "open it
again in a new tab," not "front the one already open" — so the old canonical-key dedupe
(L12's own prior shape) is deleted outright rather than adapted. `MAX_TRAIL_STEPS` (30)
caps one tab's own history, oldest dropped; `MAX_OPEN_TABS` (8, L11's own doc) and its
recency-based eviction are unchanged.

**Only a deliberate gesture opens a second tab.** `openBeside` (`web/lib/workspace-
tabs.ts`) is now the one door a NEW tab is minted through — never `visitTrail`'s default
— and `<InAppLink>` calls it on cmd/ctrl-click (`onClick`) and on a real middle-click
(`onAuxClick`, since a middle-click never reaches `onClick`), inserting the fresh,
one-step tab immediately after the active one (this rule's own insertion order, unchanged)
and fronting it. A plain Shift-click or Alt-click is left to the browser untouched —
save-as, a real new window — because neither is the gesture the ruling names.
`openSoloTab` (L11's own Import door) keeps its own narrower, hand-rolled dedupe,
unaffected by any of this.

**Law.** None registered — `web/test/workspace-tabs.test.ts` and `web/test/nav-memory.
test.ts` pin the store; R37's own census (`web/test/shell-nav.test.ts`) is what makes
`in-app-link.tsx` the only place this behaviour has to be taught.

**AMENDED 17 Sep 2026 — the insertion point is unconditional, and a REUSED tab has to be
repositioned too.** The client's ruling, verbatim: *"When I open a new tab from an
existing tab, every time, it needs to be to the immediate right of the tab that is
active."* A freshly minted tab already landed there (`openBeside`, above); the gap was the
REUSE path — pressing the pinned "+" or cmd/ctrl-T a second time fronts the one already-
open unused `/new` tab ([L24](#l24-a-new-tab-opens-on-a-search-page-never-a-blank-one-one-unused-new-tab-at-most))
rather than opening a second, and until this fix the reused tab's own `touch()` fronted it
wherever it already sat in the array — wherever it happened to land the one time it was
minted — not necessarily beside whichever tab is active now: open "+", switch to a third
tab, press "+" again, and the reused tab surfaced to the ACTIVE tab's left instead of its
right. `moveAdjacentToActive(id)` (`web/lib/workspace-tabs.ts`) is the fix — read
`activeId` before it moves anything, splice the reused tab out and back in immediately
after the (still-correct) active position, then `touch()` fronts it — a no-op when the id
asked for is already the active tab itself (pressing "+" twice in a row before navigating
anywhere else). Every door lands here the same way now: cmd/ctrl-click, a real
middle-click, the pinned "+", cmd/ctrl-T, and a reused unused tab alike.

**Law.** None registered — `web/test/workspace-tabs.test.ts` covers `moveAdjacentToActive`
directly; `web/test/workspace-tabs-are-wired.test.tsx` covers the reuse-and-reposition
case end to end.

**Root-caused and fixed, 17 Sep 2026 — a ticket-row cmd-click was never reaching
`openBeside` at all; it was never Chrome.** The client's report, verbatim: *"the command
that I'm clicking is not opening a new tab. Is this because I'm using it inside of Chrome,
or is it not working"* Reproduced LIVE on `agency-staging.kwapso.app` (Playwright, headless,
the admin test-login door): cmd-clicking a ticket row left the workspace tab strip's own
`<li>` count unchanged (2 before, 2 after) and replaced the address IN PLACE
(`/tickets` → `/tickets/<id>`, same document, same tab) — no in-app tab opened, and no
browser-native tab either, so it was never a Chrome quirk. The real cause: `TicketRowsTable`'s
row (`web/components/tickets/tickets-collection.tsx`) is a plain `<TableRow onClick={() =>
onOpen(w.id)}>` — no `<a href>` anywhere on it, so R37's own census (`shell-nav.test.ts`'s
"in-app-anchors," which reads every raw `<a href="/…">` off disk) could never have caught
it, because there is no anchor to catch. `onOpen` is `onIntent({kind:"open",…})`, whose
"open" case (`deep-link-screen.tsx`) calls `go(path)` directly — a plain function call with
no `MouseEvent` in reach, so no layer downstream of the row could ever have read a held
modifier off it even if it tried. The row is the one place that DOES see the raw click, so
it is now the one place that computes the ticket's own address
(`/t/<teamId>/tickets/<id>`, the same form `RaisedByRow` already hands `<InAppLink>`) and
calls `openBeside` on cmd/ctrl-click or a middle-click, exactly the gesture `<InAppLink>`
already teaches every real anchor — a plain click is unchanged, still `onOpen`, same tab.
Confirmed by a driven render (`web/test/ticket-row-opens-beside.test.tsx`): a plain click
still calls `onOpen` and mints no tab; cmd-click, ctrl-click and a middle-click (`auxclick`,
button 1) each open the row beside the active tab and never call `onOpen`, whether the
click lands on the row's own background or on the title's inner `<Button>`. The same defect
shape — a clickable row with no anchor and no reach to the click event — exists in the
shared `web/components/records/record-table.tsx` (Accounts, Tasks, Waves, Contacts,
Stories, Meetings), left for a dedicated follow-up rather than fixed here: those six
screens are outside this pass's owned files, and each caller's `onRowClick` would need the
same event-forwarding change this file's `TicketRowsTable` just got.

**AMENDED 17 Sep 2026 — a rail pick opens beside the active tab unless its own screen is
already the one showing.** The client's ruling, verbatim: *"without changing anything
else, when I click on something on the navigation bar, it should always open in a new tab
unless it's already open on the main screen. What I mean is, for example, if I go in the
navigation bar to Tickets and then I go inside the ticket, if I click on Tickets again in
the navigation bar, it should open the Tickets screen in a new tab. If I already have the
main ticket screens open, do not open any tab, but open this tab. If, for example, I am in
an app and I click on Tickets, it should open in a new tab. Let me know if this is
clear."* This replaces this rule's own earlier reading of a rail pick — "push the trail on
a rail pick," the sentence two rulings up that made `goToSection` an ordinary push through
`visitTrail` — with a narrower one, now built as `railPick` (`web/lib/workspace-tabs.ts`,
the store's own rail door — `goToSection`, `app-shell.tsx`, is unchanged at every one of its
four call sites, and now hands it the clicked item's own label too): is some open tab's
CURRENT step already that rail destination's own root path, canonicalised exactly as
`openSoloTab` canonicalises (the query string never names a different tab)? If so, the click
activates that tab (`activateTab`, the identical door the strip's own tab click uses) rather
than opening anything. A tab whose current step is DEEPER inside the module — a record, not
the collection — does not count, so the ticket example above opens a new tab. If nothing
qualifies — including when the active tab is on an unrelated screen entirely, or nothing is
open at all — `openBeside` opens the destination AT the module's root, never a recalled
deeper screen: the client's own words are "open the Tickets screen," not wherever she left
off, which retires `nav-memory.ts`'s `sectionClick` as the rail's own door (its export and
its own tests are untouched; nothing calls it from the rail any more).

**Status: shipped, 17 Sep 2026.**

**Law.** None registered — `web/test/workspace-tabs.test.ts`'s `railPick` block covers the
four cases directly (root open → activate; deeper in the module → new tab; a different
module → new tab; nothing open → new tab); `web/test/ticket-row-opens-beside.test.tsx`
covers the cmd-click defect above end to end.

**AMENDED 18 Sep 2026 — the two click grammars this app taught by hand (`InAppLink`
for a real anchor, `rowOpenHandlers` for a row/card with none) are now one function,
and cmd/ctrl-click opens beside IN THE BACKGROUND, not a same-tab navigation too.**
The client's ruling, verbatim, is unchanged from 17 Sep 2026 above — "Unless I press
Command and click, this would open a new tab, and the same behavior in Windows, just
replicating Google Chrome" — but "just replicating Google Chrome" turned out to mean
more than this rule first read it as: Chrome's own grammar leaves focus on the tab she
clicked FROM on a plain cmd/ctrl-click or a middle-click, and only switches her to the
new tab when Shift is added too (cmd/ctrl+Shift-click). `clickGesture`
(`web/lib/row-open.ts`) reads a click into one of `"same" | "beside" | "beside-switch" |
null` and both `InAppLink` and `rowOpenHandlers` now classify through it; `beside` opens
the tab and hands focus straight back to whichever tab was active (`applyClickGesture`,
same file), `beside-switch` opens it and navigates there too.
