"use client"

/* ============================================================================
   A SETTINGS SECTION. THE TITLE IS INSIDE THE BOX, AND THERE IS NO SUBTITLE.
   ============================================================================

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
   1.079 in dark. A container that measures 1.000 is not a container. */

import * as React from "react"

import { Headline } from "@shared/ui/components/typography/typography"

export function SettingsSection({
  title,
  children,
}: {
  /** The section's own name, ALREADY TRANSLATED by the host — a string and
   * never a node, which is the whole of this component's guarantee. Handed a
   * `ReactNode` it would accept a `<div>` with a second sentence in it and
   * enforce nothing, which is precisely what the `description` prop it
   * replaces was. */
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius)] bg-surface-panel p-4 lg:p-[var(--space-7)]">
      {/* h2 BECAUSE THE PAGE'S OWN TITLE IS THE h1 — `ModuleSettingsScreen`
          draws `<Headline as="h1" size="display-m">` and every section under
          it is one level down, so a screen reader's outline is the page and
          its parts rather than a flat row of peers. `size="h4"` is the step
          `SelectableScreen` and `ModuleAutomations` already used; Appearance's
          three sections drew a hand-rolled `<h2 className="text-lg
          font-medium">`, which was the same idea at a fourth spelling. */}
      <Headline as="h2" size="h4">
        {title}
      </Headline>
      {children}
    </section>
  )
}
