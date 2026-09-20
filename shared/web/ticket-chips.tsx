"use client"

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { RecordRef } from "@shared/web/record-ref"
import { richTextPlain, safeHref } from "@shared/web/rich-text"
import { orderChips } from "@shared/web/chip-order"

/** THE CHIP LINE — the number, the type, the app, and — on the ticket
 * DETAIL screen only, since 17 Sep 2026 — the STATUS. (It carried a fourth
 * fact, the date, from 2026-09-06 to 17 Sep 2026 — see "THE DATE CHIP IS
 * RETIRED" below for where it went; the status chip that replaced that slot
 * is a different ruling, on a different day, covered in `statusDot`'s own
 * comment on the component below.)
 *
 * MOVED HERE FROM `web/components/tickets/tickets-collection.tsx` (where it was
 * `TriageChips`), 2026-09-06, BECAUSE THE CLIENT ASKED FOR IT TWICE IN ONE
 * SENTENCE. Her own words, reading the ticket DETAIL screen next to the
 * triage card: "replicate the pills that we have on the view outside. These
 * are: ID, type, app, date. Remove the rest, and everywhere else where
 * tickets have pills, reuse this." The triage card already drew exactly that
 * line; the fix is not a second implementation that happens to match it, it
 * is deleting the question of whether two ticket screens agree by making
 * agreement structural — one component, every ticket surface that shows
 * these facts imports it.
 *
 * ── WHAT THE CLIENT MOVED, AND WHY IT IS A RULE RATHER THAN A TIDY-UP ───────
 * (held over verbatim from the triage card, because the ruling did not
 * change when the file did)
 *
 * This line used to carry four chips — number, type, CLIENT, PERSON WHO ASKED
 * — and the date sat on its own line under the description. Round nine of the
 * design review swapped those: "the chips above the title become number,
 * type, date. Nothing else up there", and the client, the app, the module and
 * the author go BELOW the content as links, on whatever screen has a "below
 * the content" to put them (the triage card's `TriageMeta`; the ticket
 * detail's own Overview tab / footer).
 *
 * THE CUT IS NOT ARBITRARY AND IT IS WORTH NAMING, because it is the thing
 * that keeps this line from growing back. What sits here are the ticket's own
 * FACTS — its number and its kind — none of which is a record you could go
 * and open. What goes below is every RECORD the ticket points at, all of
 * them navigable. A chip is a fact; a link is a record. Once that is the
 * rule, "should the app be a chip?" has an answer instead of a preference —
 * except the app is the one record that gets BOTH treatments at once (see
 * below), because the client asked for it back up here by name.
 *
 * THE NUMBER IS A BLACK CHIP because she asked for one, and `variant="inverse"`
 * is the kit's word for it: charcoal fill, off-beige label, and it FLIPS with
 * the palette — so "black chip" is still the loudest thing on the screen in
 * dark mode, where an actual black would disappear into the paper. It KEEPS
 * that fill wherever this line is dropped, untouched by whatever paper sits
 * under it. R32 is satisfied by construction: the fill is a token pair the
 * kit owns, and this file names no colour at all.
 *
 * A TICKET WITH NO NUMBER DRAWS NO CHIP. `ref` is null on a ticket whose
 * client has no reference code yet, and an empty black lozenge is worse than
 * nothing.
 *
 * THE APP IS BACK IN THE CHIPS, WITHOUT ITS LOGO — client, 2026-09-06: "bring
 * the app back in the chips at the top, without the icon". It is a FACT about
 * the ticket in the same breath as its number and its type, which is how she
 * reads a ticket. No logo: the row is chips scanned at speed and a picture in
 * the middle of them is a third kind of mark competing with the type's glyph.
 *
 * STILL A LINK, because navigating to the app was the whole reason she asked
 * for these to be clickable in the first place, and it is UNDERLINED now too
 * — client ruling, 18 Sep 2026, verbatim, naming this exact chip: "when its a
 * link make it underlined (for exmaple the app name)." THE BADGE IS THE LINK:
 * `<Badge asChild><AppLink>…</AppLink></Badge>`, the shape `badge.tsx`'s own
 * docs name, so the kit's own `LINK_UNDERLINE` draws the underline and this
 * file names no decoration at all. Radix `Slot` merges the badge's classes,
 * `data-slot="badge"` and ref onto `AppLink`'s real anchor — which is why
 * `AppLink` has to spread the props it does not name (see its prop doc,
 * below): a link component that only forwarded `className` would drop the
 * `data-slot` every chip census in `web/test/` counts by.
 *
 * IT WAS NOT ALWAYS THIS SHAPE. `Badge` took no `asChild` until kit v1.2.116,
 * and when this file first tried it (v1.2.118) it THREW — "Slot failed to
 * slot onto its children" — because `Badge`'s render always spent three JSX
 * child slots (icon, dot, label) and `React.Children.count` counts a `null`
 * placeholder like an element, so `Slot` never saw the one child it demands.
 * Nobody in the app had called `<Badge asChild>` before, so the kit shipped
 * the path untested. `shared/ui/` is never hand-edited from this repo
 * (CLAUDE.md: "kit changes live in the kit repo only"), so for one tag this
 * file drew the underline by hand (`AppLink` wrapping a plain `<Badge>` with
 * `badge.tsx`'s own `LINK_UNDERLINE` string copied in) and filed the defect.
 * Kit v1.2.121 fixed it — the label sits in Radix's `Slottable` under
 * `asChild`, and `check-badge.mjs` now MOUNTS that shape rather than grepping
 * for it — and this file swapped back the same day. Zero pixels changed.
 * The black `#ref` chip stays the only `variant="inverse"` lozenge in the
 * row either way.
 *
 * ── THE DATE CHIP IS RETIRED, 17 SEP 2026 ───────────────────────────────────
 *
 * The client's ruling, verbatim: "On tickets: Remove the 'Raised On' chip
 * from the QE view, but also from the detail page in the QE view. Add it
 * under 'Raised By' as 'Raised On' and put the date and, in brackets, how
 * many days ago." So the fourth chip — the one this header used to spend six
 * paragraphs defending, including an `omitDate` prop for the one surface that
 * drew it elsewhere — is gone from every caller: the list row, the board
 * card, the type picker's own surfaces, and this component's own signature,
 * which no longer takes a date at all. The FACT moved rather than
 * disappeared: it is a "Raised on" line beside "Raised by" in the ticket
 * detail's own Overview facts (`help-detail.tsx`'s `overviewItems`), reading
 * the date and the day count together — `formatDate` plus a whole-day count,
 * one translated sentence with two holes so a translator can reorder them
 * (`{date} ({count} days ago)`, `shared/i18n-seed.ts`). `omitDate` is gone
 * with it: the board's own caption line under a card's title (`KanbanCard
 * .description`, "raised {date}") is untouched — that line was never the
 * chip this ruling names, and the argument the OLD header made for keeping
 * it a subtraction rather than a position never applied to it either.
 *
 * ── WHY THE PAPER IS NEVER NAMED HERE (dependency injection, not an
 *    oversight) ──────────────────────────────────────────────────────────
 *
 * The triage card's own paper is a client-named colour (`--surface-panel`,
 * `#F7F2EB`), rebound onto `--badge-quiet-fill` so every quiet chip in the
 * row reads against it instead of the kit's default. A ticket DETAIL screen
 * sits its identity row on a different band, with its own rebind already set
 * one level up (`record-chrome.tsx`'s `IDENTITY_ROW`) — so this component
 * does not set `--badge-quiet-fill` itself. Doing so here would either fight
 * whatever the call site already set (two rebinds on the same property, the
 * closer one winning by CSS inheritance rather than by anyone's decision) or
 * silently duplicate a value that happens to agree today and drift the next
 * time either surface's paper changes on its own schedule. Each call site
 * rebinds the property on ITS OWN wrapper, over the exact same span this
 * component renders into — a fill is data about the screen, not about the
 * facts above.
 *
 * ── WHY THE TYPE GLYPH AND `InAppLink` ARE PROPS, NOT IMPORTS ───────────────
 *
 * `shared/web/` is read by BOTH front doors (`web/` and `web-portal/`), and
 * nothing in this directory imports an app-side `@/...` module — the
 * established shape is a render prop, exactly the reason
 * `shared/web/screen-engine/screen-renderer.tsx` used to take a
 * `renderActivity` prop instead of importing
 * `web/components/records/activity-panel.tsx` directly: `@/` resolves to two different
 * folders depending on which door is compiling. (That particular prop is gone —
 * it existed for the Activity tabs the client killed on 2026-09-06 — but the
 * REASON it had that shape is the reason these two are props, and it is the
 * clearest worked example of it in the codebase.)
 * `typeDot` USED TO BE A COLOURED DOT (`Swatch` + `ticketTypeColour`, both
 * `web/`-only) AND ISN'T ANY MORE — the client's 17 Sep 2026 ruling retired
 * ticket type's colour ("the one that gets the chip with the color is always
 * the status … for tickets, we need to find icons for the ticket type"), so
 * every caller now hands in an icon element (`ticketTypeIconName` +
 * `iconComponent()`, @shared/ticket-types, the same seam `storyTypeChip`
 * already resolves through). The PROP KEPT ITS NAME rather than forcing a
 * rename across every call site for a shape that is still exactly "the
 * glyph already drawn, handed in as a node" — this file never inspects what
 * `typeDot` actually is, so a dot and an icon are the identical contract
 * from here. `InAppLink` (the only legal way to write a link inside the app,
 * R37) lives under `web/` today, so a caller hands in the anchor COMPONENT
 * itself (`AppLink`) rather than this file importing it. Nothing here
 * assumes which door is asking — a portal ticket surface, should one ever
 * draw these same four facts, hands in its own glyph and its own link
 * component and gets the identical chip line for free. */
/** WHAT A TICKET IS CALLED — ONE FUNCTION, EVERYWHERE, AND THAT IS THE POINT.
 *
 * ── THE SPLIT THIS CLOSES ──────────────────────────────────────────────────
 *
 * There were two answers in the app, on two tables of the same collection.
 * `ticketTitle` (web/components/tickets/tickets-collection.tsx) read `titleEn ||
 * titleDe || the first line of the description`, and it was right; the ticket
 * COLLECTION'S own rows, shaped by `shapeHelpList`
 * (web/components/deep-link/shape.tsx), named every row by the DESCRIPTION
 * alone — so a ticket carrying a real title showed it in the triage list and
 * showed the first sentence of its body in the list beside it. Two names for
 * one ticket, on one screen, one tab apart.
 *
 * That was already a live inconsistency. It became untenable the moment the
 * triage list's table was lifted out to be the table EVERY row tab draws
 * (2026-09-06): the same component, over the same collection, would have had to
 * pick one of the two answers, and picking silently is how the other one rots.
 * So the answer is written once, here, and both callers read it.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 *
 * A ticket's NAME is part of its face, exactly as its four chips are (R35), and
 * this is the file the client already ruled owns that face: "replicate the pills
 * that we have on the view outside … and everywhere else where tickets have
 * pills, reuse this." It is `shared/web/`, which both front doors read, so the
 * portal can name a ticket the same way the day it needs to — and it needs
 * nothing app-side to do its job, which is what kept it out of `web/lib/`.
 *
 * ── THE THREE STEPS, AND WHY THAT ORDER ───────────────────────────────────
 *
 * ENGLISH FIRST because the app's own language is English and a translation
 * SETS `titleEn` while leaving the German the person actually wrote. GERMAN
 * SECOND because 788 tickets imported from Glide have only that. THE FIRST LINE
 * OF THE BODY LAST, because a ticket raised through this app has no title at
 * all — the form does not ask for one.
 *
 * THE LAST CASE REPEATS THE PARAGRAPH IT IS TAKEN FROM wherever the body is
 * shown underneath, and that is the right trade rather than an oversight: the
 * alternative is a row whose biggest text is empty, and the repetition reads
 * visibly as a truncation rather than as a second fact.
 *
 * IT TAKES PLAIN TEXT, NOT A RENDERER. `richTextPlain` lives one file along in
 * this same directory and is what both callers already used, so the description
 * is flattened here rather than at each call site — a title is a string, and a
 * caller that had to remember to strip the markup first is a caller that will
 * one day print `<p>` into a table cell.
 *
 * THE FALLBACK BRANCH ONLY MAY READ THE DESCRIPTION IN THE READER'S OWN
 * LANGUAGE — B0302/T3661. `titleEn`/`titleDe` are the ticket's own fixed
 * words (a real translation SETS `titleEn`, it never reads through this),
 * so they are never run through a per-viewer reader; only the LAST-RESORT
 * branch, the body itself, is — and `readDescriptionAs` is called ONLY on
 * that branch, never when a title already answers, so a ticket that has one
 * never even asks the reader for the body. `readDescriptionAs` defaults to
 * identity so every caller that has no reader (the collection row, the
 * picker, every caller before this one) keeps exactly today's behaviour —
 * see `useHumanTranslation`'s `of` in
 * `web/components/records/translate-human-text.tsx`, the one shape this
 * parameter is built to accept. */
export function ticketTitle(
  ticket: {
    titleEn: string | null
    titleDe: string | null
    description: string
  },
  readDescriptionAs: (text: string) => string = (text) => text
): string {
  const titled = ticket.titleEn?.trim() || ticket.titleDe?.trim()
  if (titled) return titled
  const plain = richTextPlain(readDescriptionAs(ticket.description))
  // EIGHTY, WHICH IS THE NUMBER THE TRIAGE CARD HAS ALWAYS USED. The list's
  // own cells truncate with an ellipsis in CSS on top of this, so the cap is
  // not what makes a row fit — it is what stops a whole paragraph reaching an
  // `aria-label`, a `title` attribute or a Kanban card, none of which clip.
  return plain.length > 80 ? `${plain.slice(0, 80)}…` : plain
}

export interface TicketChipFacts {
  /** The client's own reference code — the black chip's whole content. `null`
   * on a ticket that has not been given one yet, which draws no chip at all. */
  ref: string | null
  /** The team's own `Ticket type` vocabulary, or `null` on an untyped ticket
   * (still drawn, saying so with an em dash — see the header above). */
  helpType: string | null
  appId: string | null
  appName: string | null
  /** NO LONGER READ BY `TicketChips` ITSELF (the date chip retired 17 Sep
   * 2026, see the header) — kept on this shape because callers still need
   * it: the board card's own caption line ("raised {date}") and the ticket
   * detail's new "Raised on" fact both read a ticket's `createdAt` straight,
   * outside this component. */
  createdAt: string
}

export function TicketChips({
  ticket,
  /** THE STATUS CHIP, AFTER THE ID — client ruling, 17 Sep 2026: "Add the
   * status chip with the color after the ID on the title." A caller-built
   * node, the same "hand in what is already drawn" shape `typeDot` takes
   * (this file's own header explains why: `shared/web/` reaches neither
   * `useLanguage` nor an app-side status map). `undefined` on a surface that
   * has not asked for one yet (the triage card, today) — no chip, not an
   * empty one. */
  statusDot,
  /** The glyph already drawn for this ticket's type — an icon element
   * (`ticketTypeIconName` + `iconComponent()`, @shared/ticket-types) since
   * the client's 17 Sep 2026 ruling retired ticket type's colour; the same
   * element the type picker and every other ticket surface draws, so the
   * icon a person clicks and the icon they read back afterwards are one
   * object, never two maps that happen to agree today. Kept the name
   * `typeDot` (see this file's header) — this component never inspects the
   * node, so a caller handing in the old `<Swatch colour={…} />` still works
   * exactly as before. `undefined` draws the type chip with no glyph. */
  typeDot,
  /** Where the app chip's `AppLink` should point — built by the caller
   * (`/t/<teamId>/apps/<appId>`), because this component knows nothing about
   * routing on either front door. No app chip renders without both this and
   * `ticket.appId`/`ticket.appName`. */
  appHref,
  /** The in-app link component the app chip's badge renders AS — `InAppLink`
   * on the agency side today. See the header comment for why this is a prop
   * and not an import. It sits inside `<Badge asChild>`, so at runtime Radix
   * `Slot` hands it MORE than this type names — the badge's own `className`,
   * `data-slot="badge"`, `data-dot` and ref, merged in — and the component
   * must spread those onto its real anchor (Radix's own `asChild` contract,
   * stated in `badge.tsx`'s `asChild` prop doc). `InAppLink` does; a
   * replacement that only forwards `className` would render a chip with no
   * `data-slot` and no fill. */
  AppLink,
}: {
  ticket: TicketChipFacts
  statusDot?: React.ReactNode
  typeDot?: React.ReactNode
  appHref?: string
  AppLink: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>
}) {
  // THE DATE CHIP IS RETIRED (17 Sep 2026) — see the header. This component
  // no longer formats a date at all, so `useLanguage()` is gone with it.
  // THE URL SEAM, EVEN THOUGH EVERY CALLER BUILDS THIS FROM A TEAM ID AND A
  // ROW ID. `web/test/rich-text.test.ts`'s URL census reads every `href=`
  // JSX attribute off disk and demands a literal, a `safeHref`/`safeSrc` call,
  // or a reasoned exemption — it has no way to know, from inside THIS file,
  // that `appHref` arrived pre-built by a trusted caller rather than typed by
  // a person, so it asks for the seam here regardless. A plain local assigned
  // from the seam (rather than the call inlined at the attribute) is the
  // shape the census itself recognises and the shape `InAppLink` uses for the
  // identical reason.
  const safeAppHref = safeHref(appHref ?? "")
  // R94 (chip-order, shared/web/chip-order.ts): id, status, type, main
  // parent, secondary parent — every one of the four chips this component
  // ever draws is tagged with WHICH of those it is and handed to the one
  // shared seam, so the order is a property of `orderChips` and can never
  // drift one edit at a time the way a hand-written JSX sequence can. This
  // ticket line has no secondary-parent chip (a sprint) of its own — that
  // fact lives on the ticket's Overview facts instead, not this line.
  return (
    <span className="flex flex-wrap items-center gap-2">
      {orderChips([
        {
          kind: "id",
          // THE NUMBER, THROUGH THE ONE COMPONENT THAT DRAWS IT
          // (record-ref.tsx). This file used to spell the black chip out
          // itself, and by 6 Sep 2026 three other surfaces spelled the same
          // lozenge out beside it — two of them carrying `shrink-0
          // tabular-nums` and this one not, which is drift nobody would
          // ever file as a bug. `RecordRef` also owns the absent case ("A
          // TICKET WITH NO NUMBER DRAWS NO CHIP", above): it returns
          // nothing at all for a null, so the guard that used to stand here
          // is inside it now, where every OTHER kind's row gets it for
          // free.
          node: <RecordRef key="id" value={ticket.ref} />,
        },
        { kind: "status", node: <React.Fragment key="status">{statusDot}</React.Fragment> },
        {
          kind: "type",
          // THE GLYPH RIDES BADGE'S OWN `icon` SLOT, NOT A PLAIN CHILD —
          // client ruling, 18 Sep 2026 ("all chips / pills" need the
          // leading-mark gap "wether its a dot or an icno"): `badge.tsx`'s
          // own header names this exact chip as one of the two call sites
          // the ruling was written about (`tickets-collection.tsx`'s type
          // cell is the other). A bare JSX child is what
          // `web/test/chips-are-badges.test.ts` now refuses past Badge's
          // own boundary.
          node: (
            <Badge key="type" variant="secondary" size="pill" icon={typeDot}>
              {/* A TYPE THE TICKET DOES NOT HAVE STILL GETS A CHIP, saying
                  so. An absent chip here would leave a hole where the other
                  chips have a fact. */}
              {ticket.helpType ?? null}
            </Badge>
          ),
        },
        {
          kind: "mainParent",
          node:
            ticket.appId && ticket.appName && safeAppHref ? (
              /* THE BADGE IS THE ANCHOR — `asChild` hands the badge's
                 classes, `data-slot="badge"`, `data-dot` and ref to
                 `AppLink`'s real `<a>` through Radix `Slot`, and the kit's
                 own `LINK_UNDERLINE` draws the underline the client ruled
                 on (18 Sep 2026, "when its a link make it underlined (for
                 exmaple the app name)"). No `className` on `AppLink` any
                 more: the alignment fix the old anchor-wraps-badge shape
                 needed (`inline-flex items-center`, so an inline anchor's
                 line box did not stand taller than the badge inside it —
                 client: "what's wrong with alignment chips??") is moot when
                 the anchor IS the badge and carries the badge's own
                 `inline-flex … h-[…]` classes, and the radius the shared
                 focus ring follows is the badge's own `rounded-pill` on the
                 same element. This shape threw on kit v1.2.118–120 and was
                 swapped back in on v1.2.121 — the header tells that story;
                 `check-badge.mjs` section 6 in the kit renders exactly this
                 shape headlessly so it cannot regress silently again. */
              <Badge key="mainParent" asChild variant="secondary" size="pill">
                <AppLink href={safeAppHref}>{ticket.appName}</AppLink>
              </Badge>
            ) : null,
        },
      ])}
    </span>
  )
}
