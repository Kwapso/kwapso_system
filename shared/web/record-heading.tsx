import * as React from "react"

/** A RECORD'S OWN NAME, AT THE HEADING STEP, TRUNCATED TO ONE LINE.
 *
 * THE FAULT, 1 Sep 2026. A ticket detail opened with roughly 1,800 characters of
 * German prose set at the h3 heading step, filling the whole viewport before a
 * single field of the record. Measured rather than guessed: on staging's Kwapso
 * team database the `help` table holds 2,050 rows, 1,040 of them with no
 * English title and 286 with no title in either language — and the screen falls
 * back to the DESCRIPTION when a ticket has no title. Genuinely long titles barely
 * exist (six over 120 characters in the whole table). So this is a MISSING-TITLE
 * problem wearing a long-title costume, and the two halves get two fixes: the
 * backfill is its own item, and this is the one that stops any record — today's
 * or tomorrow's — from spending a screen on its own first line.
 *
 * ONE LINE, NOT TWO — R87 (title-length, RULES.md), 18 Sep 2026, SUPERSEDING
 * THIS FUNCTION'S OWN ORIGINAL `line-clamp-2`. The client's ruling that day set
 * a hard CHARACTER ceiling on every title field (`TITLE_MAX_CHARS`,
 * shared/types.ts) and asked every renderer that draws a title on one line —
 * named explicitly as "the record head" among them — to truncate with an
 * ellipsis rather than wrap. Two clamps on one record's own name would have been
 * the exact drift this codebase's own laws exist to catch, so this is now the
 * ONE mechanism for both the 1 Sep problem (a description standing in for a
 * missing title, arbitrarily long) and the 18 Sep one (an ordinary title that
 * predates the 50-character ceiling) — a single line is a STRICTER bound than
 * two, so nothing the 1 Sep fix protected against stopped being protected.
 *
 * STILL ONE LINE, 19 Sep 2026 — read against Aurora's own narrower ruling the
 * same day, on the ticket head fold: "…the title is capped at 50 characters
 * and wraps to at most two lines." That sentence is NOT wired here.
 * `title-length.test.ts` and `record-heading-clamps.test.tsx` both assert
 * this span carries `.truncate` and NOT `.line-clamp-2` — a checked Law of
 * the Base (R87), not a style preference this file can quietly trade for a
 * different one. What the 19 Sep ticket-head defect actually needed —
 * "nothing ever covers the title" — turned out not to need two lines at
 * all: the cover was `display:inline` silently dropping this span's own
 * `overflow`/`text-overflow` (CSS never applies either to a non-replaced
 * inline box), not a shortage of lines to wrap into. Fixed below by adding
 * `block`, so the ONE line this function has always promised actually clips
 * and ellipsizes at its column's real width instead of painting past it. If
 * a two-line title is still wanted somewhere, that is a new R87 amendment —
 * this function, `title-length.test.ts` and `record-heading-clamps.test.tsx`
 * would all need to move together, in one change a reviewer can see move.
 *
 * THE RULE IT OBEYS: a truncated name stays reachable in full. Two ways, both
 * here rather than argued per screen — the record's own body still renders the
 * whole text (a ticket's description is the conversation's first message), and
 * the truncated node carries the full string as its `title` attribute, so a
 * pointer reveals it and a screen reader still reads the record's own name.
 *
 * WHY A STRING AND NOT EVERY NODE. The record heading slot takes a ReactNode,
 * and a loading screen passes a `<Skeleton>` through the same prop. Truncating
 * that would set `overflow:hidden` on a sized placeholder for no reason.
 * A record's NAME is a string; anything else in that slot is chrome, so the
 * discriminator is positional exactly as R20's is — no call site has to
 * remember which of the two it is passing.
 *
 * NO KIT EDIT. `shared/ui/` is a pinned dependency (a hand-edit turns the build
 * red), and the kit's `Title` deliberately sets `min-w-0` and does not clamp —
 * a section header is not always a record's name. So the truncation is applied
 * APP-SIDE, on the node the app hands the kit, in the two places the app has a
 * record heading at all: `web/components/records/record-chrome.tsx` (the twelve bespoke
 * detail screens) and `shared/web/screen-engine/screen-renderer.tsx` (every
 * recipe-driven detail, on both front doors).
 *
 * `truncate` is a plain Tailwind utility (`overflow:hidden; text-overflow:
 * ellipsis; white-space:nowrap`) — no colour (R32), no radius (R31), no page
 * width (R29) and no UI package (R39).
 *
 * `block`, ADDED 19 Sep 2026 — THE ACTUAL FAULT BEHIND "THE BUTTONS COVER THE
 * TITLE". A bare `<span>` is `display:inline` by default, and CSS does not
 * apply `overflow`/`text-overflow` to a non-replaced inline box at all (the
 * UA is required to ignore both — https://www.w3.org/TR/css-overflow-3/,
 * "this property applies to block containers, flex containers, and grid
 * containers"; an inline span is none of the three). So `truncate`'s
 * `white-space:nowrap` alone was taking effect — the text never wrapped —
 * while `overflow:hidden`/`text-overflow:ellipsis` were silently no-ops: the
 * span kept its own max-content width (its FULL, untruncated text, ~980px
 * for an ordinary ticket title) and painted straight past the 320–430px
 * column `TITLE_ACTIONS_SPLIT` below hands it, ink-overlapping whatever sat
 * in normal flow to its right — the head's own Close/Start timer/Edit/"…"
 * row. Confirmed live (three states, `page.addStyleTag`, before this edit):
 * forcing `display:block` on this exact span was the whole fix — every
 * other layer (`min-w-0 flex-1 max-w-[80%]` on the title column,
 * `shrink-0` on the actions column, both already in `TITLE_ACTIONS_SPLIT`
 * below) was already correct and needed no change. `block` fills the
 * column's own width (a block box with no explicit width takes 100% of its
 * containing block), which is exactly the width `overflow`/`text-overflow`
 * need to have something to measure against. */
export function clampRecordHeading(title: React.ReactNode): React.ReactNode {
  if (typeof title !== "string") return title
  return (
    <span className="block min-w-0 truncate" title={title}>
      {title}
    </span>
  )
}

/** THE RECORD TITLE'S OWN STEP — h1/44, the "Record heading" rung.
 *
 * MOVED HERE FROM `web/components/records/record-chrome.tsx`, 2026-09-06, BECAUSE IT
 * WAS ONLY EVER APPLIED ON ONE OF THE TWO PATHS. This app draws a record
 * detail two ways — thirteen hand-composed `*-detail.tsx` screens through
 * `RecordScreen` (`web/components/records/record-chrome.tsx`), and five recipe-driven
 * ones through `renderDetail` (`shared/web/screen-engine/screen-renderer.tsx`)
 * — and the class below lived as a private constant inside the FIRST one. So
 * the recipe path fell through to the kit's own `titleSize = "h3"` default and
 * drew its record names at 24px where the bespoke path drew them at 44px. One
 * of the five is `team.detail`, the app's own landing screen. Nobody chose
 * that; it is simply what a per-call-site patch does the moment a second call
 * site exists. R52 is the law that now censuses it.
 *
 * THIS FILE IS THE HOME BECAUSE IT ALREADY WAS. `clampRecordHeading` above
 * names the exact same two files as the only places this app has a record
 * heading at all, and both already import it. A constant every record title
 * must wear belongs beside the function every record title already goes
 * through — not in one of the two consumers, where the other cannot see it.
 *
 * ── WHY THE CLASS LOOKS LIKE THIS (held over verbatim from record-chrome.tsx,
 * because the reasoning did not change when the constant moved) ──
 *
 * CLIENT CORRECTION, 2026-08-31, verbatim: "title on main screens still way too
 * small! it's currently smaller than in detail screens. makes no sense." True,
 * and the reference "Kwapso UI Kit.dc.html" scale says exactly why: display-m/56
 * is named "Page title" (a main screen's own heading, collection-heading.tsx's
 * own note) and h1/44 is named "Record heading" — a MAIN screen's title is meant
 * to be the LARGER of the two.
 *
 * THIS IS A VENDORED KIT BUG, NOT AN APP CHOICE, AND IT GOES DEEPER THAN
 * `SHAPE_HEADING_SIZE` (states.tsx). `RecordChrome` (the vendored template,
 * compositions/templates/record-chrome.tsx) feeds `RecordDetail` a `titleSize`
 * capped at `SHAPE_HEADING_SIZE`'s own "h2" | "h3" union — but the REAL ceiling
 * is one layer down: `RecordDetail` renders the title through the kit's `Title`
 * primitive (components/title/title.tsx), and `Title`'s own `size` ladder has
 * ONLY THREE RUNGS — h2 (32), h3 (24), h4 (20) — with no h1 (44) and no
 * display-m (56) rung AT ALL. `Headline` (components/typography/typography.tsx),
 * the OTHER kit primitive this app already uses for every main-screen title, has
 * both — so the same 44/56 steps exist in the token system and in one kit
 * component, and are simply unreachable from the other. Filed upstream
 * (kwapso-design / kwapso-ui-ux): `Title` needs an `h1` (and ideally
 * `display-m`) rung added to its own `size` variant, matching `Headline`'s
 * ladder exactly, so `RecordDetail` can ask for one directly. THE DAY THAT
 * LANDS, this constant becomes a `titleSize="h1"` prop on both call sites and
 * R52's census follows it there — one edit, in one file, for both paths, which
 * is the whole reason it is one constant.
 *
 * `shared/ui/` is vendored and pinned (CLAUDE.md, R39) and cannot be
 * hand-edited here, so this reaches the kit's OWN rendered heading from
 * outside — `[data-slot=title-heading]` is `Title`'s own stable hook — the
 * exact precedent `auth-card.tsx` sets for the sign-in screen's centring: a
 * descendant selector targeting the kit's own data-slot, never a class edited
 * into the vendored file. `text-4xl` is the h1 step's OWN Tailwind utility —
 * tokens.css's `@theme inline` block bridges its font-size, line-height AND
 * letter-spacing together (the same bridge `text-3xl` already gets), so one
 * class is the whole step, not a raw `text-[length:…]` that would silently
 * drop the other two (typography.tsx's own warning). No `!` needed: the
 * attribute-selector descendant this compiles to already outweighs `Title`'s
 * own bare `.text-3xl`/`.text-2xl` class on specificity alone.
 *
 * IT WORKS FROM EITHER ROOT, which is what makes one constant serve two
 * differently-shaped call sites. `RecordChrome` puts its `className` on a
 * wrapper ABOVE `[data-slot=record-detail]`; `renderDetail` puts its className
 * on `RecordDetail`'s own root, which IS that node. `[data-slot=title-heading]`
 * is a descendant of both, so the same descendant selector lands on the same
 * element either way. */
export const RECORD_TITLE_SIZE = "[&_[data-slot=title-heading]]:text-4xl"

/** THE TITLE COLUMN NEVER YIELDS THE WHOLE ROW TO A LONG NAME — CLIENT RULING,
 * 2026-09-01, verbatim: "i want that the space in screen for title is, f.e. 80%
 * of the width. that we always reserve a % on the left for the buttons (so the
 * current behaviour when long titles that the buttons go under is wrong)."
 * `actions` sharing the title's own row is what put Edit "aligned with the
 * title" in the first place; a title long enough could still push it onto a
 * SECOND line underneath, which is the defect this fixes — and a wrapped
 * actions row makes the whole header band taller, which moves the tab strip
 * below it, which is the client's 2026-09-06 sentence about tab height.
 *
 * MOVED HERE ALONGSIDE `RECORD_TITLE_SIZE`, SAME DAY, SAME REASON: it was a
 * private constant on the bespoke path, so the five recipe screens never got
 * the ruling at all. Both constants govern the ONE heading row the kit's
 * `Title` primitive draws, so they travel together as
 * `RECORD_TITLE_TREATMENT` below rather than as two things a call site could
 * apply one of.
 *
 * WHY A DESCENDANT SELECTOR. `title`/`actions` are threaded into the kit's
 * `Title` primitive (shared/ui/components/title/title.tsx), one layer below
 * `RecordDetail` — vendored and pinned (R39), so neither call site can
 * hand-edit it, the same constraint `RECORD_TITLE_SIZE` above already explains.
 * `Title`'s own row is a plain `flex flex-wrap items-end gap-4`: the
 * eyebrow+heading wrapper is a bare `<div className="min-w-0">` with no
 * `data-slot` of its own, and `actions` renders as `[data-slot=title-actions]`
 * only when given. `[&_[data-slot=title]>div:not([data-slot=title-actions])]`
 * reaches the FIRST kind of child by ruling OUT the one child that DOES carry
 * a name, rather than by counting on it being first — `Title`'s own source
 * always renders the heading wrapper before `actions` today, but "not the
 * actions div" describes the same element without leaning on that order.
 *
 * THE MECHANICS. A wrapping flex row decides whether its items fit on ONE
 * line using each item's flex-basis, not its post-shrink width — an item
 * whose basis is `auto` (content) gets its own unbroken text width as that
 * basis, so a long single-line title (its max-content width, before
 * `break-words` ever gets a chance to run) can by itself already exceed the
 * row, and `actions` — the sibling with nowhere else to go — is what wraps to
 * a second line UNDER the title, exactly the client's complaint (a `min-w-0`
 * on the title node only lets it SHRINK once placed on a line; it does
 * nothing to the placement decision itself). Setting the heading wrapper's
 * basis to a real, definite value — `0%`, not `auto` — takes it out of that
 * decision entirely (its hypothetical size for the fit test is now zero, so
 * it never causes a wrap by itself); Tailwind's `flex-1` (`flex: 1 1 0%`) is
 * both of those in one utility — grow, shrink, and the zero basis — so it
 * lets the wrapper grow back to fill whatever room `actions` doesn't need,
 * and `max-w-[80%]` is the ceiling the client asked for: even where `actions`
 * is a single small button, the title is never handed the WHOLE row.
 * `actions` keeps its own natural width — `shrink-0` guards it from ever
 * losing the argument the title used to win by growing straight through it.
 * Long text still wraps/clamps WITHIN the title's own shrunk column, via
 * `clampRecordHeading` above and the caller's own `min-w-0 break-words` —
 * this class only changes how much of the ROW that column may claim. */
export const TITLE_ACTIONS_SPLIT =
  "[&_[data-slot=title]>div:not([data-slot=title-actions])]:min-w-0 " +
  "[&_[data-slot=title]>div:not([data-slot=title-actions])]:max-w-[80%] " +
  "[&_[data-slot=title]>div:not([data-slot=title-actions])]:flex-1 " +
  "[&_[data-slot=title-actions]]:shrink-0"

/** THE HEAD BAND AS A QUERY CONTAINER — Aurora's ruling, 18 Sep 2026, on the
 * narrow ticket head: the Close / Start timer / pen / "…" row floated over a
 * wrapped title below a certain width. Her pick off a side-by-side options
 * page, verbatim: "h3, and aign the menu to the chips" — at a narrow width
 * only the "…" trigger stays, at the chip row's own right edge, and every
 * other action folds inside it; above the breakpoint, today's layout.
 *
 * A CONTAINER QUERY, NOT A VIEWPORT ONE — so a narrow PANE inside a wide
 * window still folds, the same reasoning the kit's own `ToolbarRow` states
 * for its own fold (shared/ui/components/toolbar-row/toolbar-row.tsx, "A
 * CONTAINER QUERY, NOT A VIEWPORT ONE"). `[data-slot=title]` — the kit's own
 * `Title` row (components/title/title.tsx) — is the ONE element that already
 * holds both halves of the fold as descendants: the chip row rides inside
 * `title` (`RecordScreen`'s own `identityChips`, folded into the node this
 * file's `title` prop carries), and the buttons ride inside `actions`
 * (`[data-slot=title-actions]`, `Title`'s own sibling slot) — so making THAT
 * element the query container, rather than something narrower, is what lets
 * one width answer for both halves of the fold at once.
 *
 * REACHED FROM OUTSIDE, LIKE EVERY OTHER RULE IN THIS FILE. `shared/ui/` is
 * vendored and pinned (CLAUDE.md, R39): neither `Title` nor `RecordDetail`
 * can be handed a `container-type` prop, so this reaches the kit's own
 * rendered row with the same descendant-selector trick `TITLE_ACTIONS_SPLIT`
 * above already uses on the identical element — `record-chrome.tsx`'s own
 * `[&>[role=tablist]]:[border-bottom:…]` is the same "arbitrary variant +
 * arbitrary CSS property" shape, so this is not a new technique, only a new
 * property. `container-type: inline-size` only — no `container-name`, so
 * `shared/web/head-actions.tsx`'s `@min-[…]` variants query the nearest
 * container rather than a name that would have to travel with them.
 *
 * FOLDED INTO `RECORD_TITLE_TREATMENT` BELOW rather than kept separate, so
 * every record head that already wears R52's one constant gets a query
 * container for free — the fold ITSELF is opt-in (a screen has to route its
 * own actions through `shared/web/head-actions.tsx`), but the width it folds
 * against is not something each screen has to remember to wire up. */
export const RECORD_HEAD_CONTAINER = "[&_[data-slot=title]]:[container-type:inline-size]"

/** EVERY DETAIL PATH WEARS EXACTLY THIS — R52.
 *
 * The two rules above are one decision about one row: how big a record's own
 * name is set, and how much of its row it may claim before the buttons beside
 * it get pushed onto a second line. Handing them out as ONE string is what
 * makes "the two paths agree" a thing a check can ask, rather than two things a
 * call site can apply one of and pass.
 *
 * Applied by BOTH detail-rendering call sites, and by nothing else:
 *   · `web/components/records/record-chrome.tsx` — `RecordScreen`, the thirteen
 *     hand-composed `*-detail.tsx` screens.
 *   · `shared/web/screen-engine/screen-renderer.tsx` — `renderDetail`, the five
 *     recipe-driven details, on BOTH front doors.
 *
 * What is deliberately NOT in here: `PANEL_BELOW_TABS`, `STICKY_TABS` and
 * `FOOTER_TO_BOTTOM` (record-chrome.tsx). Those are not title treatment and
 * they are not shared geometry — they correct a difference in where the two
 * paths put the TAB STRIP. The bespoke path hands its whole `TabsView` down
 * through `panel`, so its strip renders INSIDE the panel card and has to be
 * floated back out of it; the recipe path uses `RecordDetail`'s own `tabs`
 * prop, so the kit draws the strip as region 2, already a sibling above the
 * card, on page tone, with the same `--tab-content-gap` under it. Applying the
 * bespoke path's escape to the recipe path would push a strip that is already
 * in the right place a whole strip-height further down. Same reason the other
 * way round: the gap between strip and panel is `--tab-content-gap` in both,
 * which is why the client's tab-strip GAP was already uniform and only the
 * title above it was not.
 *
 * CARRIES `RECORD_HEAD_CONTAINER` TOO, SINCE 18 SEP 2026 — see that
 * constant's own comment. It changes nothing visually on its own (a query
 * container with no `@min-[…]` reader anywhere below it draws exactly as
 * before); it only makes every record head's own `[data-slot=title]` row
 * ABLE to host a `shared/web/head-actions.tsx` fold, the day a screen wires
 * one up. */
export const RECORD_TITLE_TREATMENT = `${RECORD_TITLE_SIZE} ${TITLE_ACTIONS_SPLIT} ${RECORD_HEAD_CONTAINER}`
