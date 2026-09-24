"use client"

/* ============================================================================
   A SETTINGS SECTION. THERE IS NO BOX ANY MORE, AND THERE IS NO SUBTITLE.
   ============================================================================

   ── THE BOX IS GONE, 23 SEP 2026 — AURORA, VERBATIM ────────────────────────

     "settings appearacne shoudl not have card - thats not minimal."

   She had already ruled it over the whole module the same day — "the whole
   settings module does not have the minimal aspect! Make minimal the whole
   app, not only tickets anymore" — and `web/test/settings-minimal.test.ts`
   took eleven files plain on that ruling. THIS FILE WAS NOT ONE OF THE
   ELEVEN: that census reads `web/components/screens/**` and
   `web/components/team/**`, and the last box in the settings module was not
   in either folder. It was here, one hop away, in `shared/web/`, drawn for
   the one screen this component still has a call site on — Settings ›
   Appearance. So the screen she is looking at kept its paper while the
   module around it went plain, and she named it.

   WHAT WENT: `rounded-[var(--radius)] bg-surface-panel p-4
   lg:p-[var(--space-7)]` — the fill, the radius and the inset, the three
   things that made this a card. WHAT STAYS: the `<section>` landmark, its
   accessible name, and the `flex flex-col gap-4` column. NOTHING REPLACED
   THE BOX, which is the point of the ruling and also the only shape left
   open to it: a law minted the same day (the kit's own container-box law,
   `foundations/rules/boxes.mjs`, off her sentence "by rule no borders
   nowhere in the kit") forbids a four-edge stroke around a container in
   either spelling, so an outline is not the way to keep an edge here. The
   rows inside separate themselves the way the app already separates rows
   that stand on the page — one kit `<Separator>` between adjacent rows
   (R107, `web/components/work/effort-card.tsx`'s own work-log list) — and
   `appearance-panel.tsx` draws them, not this file.

   THE PARAGRAPHS BELOW ARE THE RECORD OF THE BOX AND OF THE FIVE RULINGS
   THAT BUILT IT. They are kept verbatim, unreconciled, because the title
   contract they argue for is the half of this component that still stands:
   a call site may still not PLACE a heading, only hand over a string. Read
   "the box" in them as history.

   THE CLIENT, 2026-09-11, over a screenshot of Settings › Ticket settings:

     "ticket types should be on top of the searchbar inside the container
      without subtitle, make this. always"

   "Always" is the whole brief, and it is the fifth time in three days she has
   said one sentence about one thing (R67 carries the other four). What she is
   looking at is the shape every settings section in this app drew until today:

       Ticket types                    ← <Headline as="h2">, on the page ground
       The kinds a ticket can be…      ← <p>, on the page ground
       ┌──────────────────────────┐
       │ [search] [status]    [+] │    ← the container
       │ …rows…                   │
       └──────────────────────────┘

   Two lines standing on the white above a box that could have held them.

   ── WHY THIS IS A COMPONENT AND NOT A CONVENTION ───────────────────────────

   Because the same fault was fixed at a screen four times already and arrived
   a fifth. The heading is not something a call site may PLACE any more: this
   component takes the section's title as a STRING and draws it itself, inside
   the paper, as the first thing in the box. There is no position left for a
   call site to get wrong, which is the move `<ToolbarRow>` already made for
   the sort control (R53: "the row draws the control and the call site hands it
   the answers") and the move `FolderTabStrip` made for the tab strip. A rule a
   call site can forget is not a rule.

   A collection with a TOOLBAR does not use this component — its title belongs
   inside the pinned band with the toolbar, or the two come apart the moment
   the list is scrolled, so `<ToolbarRow title>` draws it there for exactly the
   same reason and with the same contract (a string, never a node). Between the
   two of them there is no settings section in the app whose heading is written
   at a call site.

   ── AND THERE IS NO SUBTITLE, WHICH IS A DELETION RATHER THAN A MOVE ───────

   She has now said this twice about these very screens:

     2026-09-10: "in ticket settings (or any other module) no subtilte"
     2026-09-11: "ticket types should be … without subtitle, make this. always"

   Between those two she said the opposite ONCE, on 2026-09-10, about the same
   descriptions: "The section description: no, I want to keep it." That line is
   the outlier and it is overruled — by the two clearer statements either side
   of it, and by the fact that the later one came with a screenshot of the
   screen she was ruling on. It is recorded here rather than dropped because
   the next reader is entitled to know it was weighed and not missed.

   SO THE FIELD IS GONE, NOT THE RENDER. `ModuleSettingsSection.description`,
   `SelectableScope.description` and `ModuleAutomations`'s `description` prop
   were all deleted with the sentences, and this component has no such prop
   either. A section cannot declare a subtitle it has nowhere to put, which is
   what stops the seventeenth section from growing one back — the same reason
   `standalone` went rather than being left as a prop nobody passed.

   WHERE A SENTENCE CARRIED A FACT, IT MOVED TO THE CONTROL IT IS ABOUT rather
   than surviving under another name. None of the fourteen module settings
   descriptions did: every one of them is a paraphrase of its own title ("The
   kinds a ticket can be raised as", "The shelves the brand library is sorted
   into") or, for the seven Automations sections, the identical sentence
   fourteen words long, repeated verbatim on seven pages.

   ── THE BOX IS THE ONE `ModuleAutomations` ALREADY DREW ────────────────────

   `rounded-[var(--radius)] bg-surface-panel`, which is `Card`'s own `default`
   variant spelled out (`shared/ui/components/card/card.tsx`: "soft paper. The
   default because it is the tone that is VISIBLE on the page"). Named utility,
   never `bg-[var(--surface-panel)]` — R32, and the reason is in `ToolbarRow`'s
   own note: the kit rebinds `--btn-secondary-fill` off a LIST OF CLASS NAMES,
   so the arbitrary form paints the right colour and silently freezes every
   ground-aware token beneath it.

   MEASURED, BOTH PALETTES, because `--card` and `--background` are the SAME
   hex in light and this law has been fooled by that once already: soft paper
   #F7F2EB on page #FFFEF9 is contrast 1.103 in light; #1C1B18 on #141310 is
   1.079 in dark. A container that measures 1.000 is not a container.

   ── `hideTitle` CAME AND WENT, 2026-09-14 to 2026-09-23 ───────────────────

   The client, over the Appearance tab, on 14 Sep: "please remove the title
   inside the collection. We will use the title only at the top." The tab
   strip already names this panel "Appearance" — `AppearancePanel` mounts
   inside a `TabsView` panel headed by the tab of the same name — so the
   `<Headline>` this component drew was a second, redundant "Appearance" one
   screen-height below the first. That was answered with a `hideTitle` prop:
   skip the visible heading, keep `title` as the `<section>`'s `aria-label`.

   THE PROP IS GONE NOW AND THE BEHAVIOUR IT SELECTED IS THE ONLY ONE LEFT.
   Two things closed the question on 23 Sep 2026. R108 ruled that a section's
   own title is the eyebrow (`text-micro text-muted-foreground uppercase`),
   never a heading size — so the `size="h4"` this component drew is not a
   shape any settings section may ask for any more, hidden or not. And the
   only surviving call site is `AppearancePanel`, which passed `hideTitle`
   from the day the prop existed. A boolean with one value in the whole app
   is not a choice, it is a branch nobody takes: `title` is now, always and
   only, the section's ACCESSIBLE NAME — the route the kit already uses
   throughout (`AppearancePreview`'s own `aria-label`, the overlays'
   `aria-label` props for a rail or a tab strip) rather than a node with
   nothing to read. A future section that wants a VISIBLE name draws the
   eyebrow, which is what every other section in the app already does, and
   it cannot smuggle a heading back in through here. */

import * as React from "react"

export function SettingsSection({
  title,
  children,
}: {
  /** The section's own name, ALREADY TRANSLATED by the host — a string and
   * never a node, which is the whole of this component's guarantee. Handed a
   * `ReactNode` it would accept a `<div>` with a second sentence in it and
   * enforce nothing, which is precisely what the `description` prop it
   * replaces was. It is the `<section>`'s accessible name and nothing is
   * painted from it — see this file's own header. */
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      {children}
    </section>
  )
}
