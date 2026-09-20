"use client"

// PHASE BURNDOWN, Aurora's round-28 ruling, verbatim: "Add a burndown chart
// to each sprint/cycle. A burndown chart plots work remaining (story points or
// story count) on the Y-axis against the days of the cycle on the X-axis, with
// a straight 'ideal' line from the starting total down to zero so the team can
// see whether they're ahead or behind. Build a visual artifact that renders
// this per sprint and updates the remaining-work line each day as stories move
// to Completed."
//
// RECOMPUTED AT READ TIME, never pre-drawn or cached per day: the door
// (`POST /api/content/stories/burndown`, team migration 0110) reads
// `story_status_events` fresh on every call, so the remaining-work line is
// always current the moment a story reaches Done, with no second write path
// to keep in step with the first.
//
// TWO LINES, drawn through the kit's own `Chart` (R39: the kit supplies the
// UI, and only the kit): the REMAINING line in ink (`--foreground`), the
// IDEAL line in a lighter tone (`--muted-foreground`). No raw colour, both are
// tokens this app already reads everywhere else (R32).
//
// COUNT/POINTS TOGGLE ONLY WHEN POINTS EXIST. `stories` carries no points
// column today, so the door's own `hasPoints` reads false and the toggle is
// left off entirely rather than offered and disabled, since an offered
// control with nothing behind it is worse than no control. The kit's own
// segmented control (`ToggleGroup`/`ToggleGroupItem`) is what
// `story-form-dialog.tsx`'s own MoSCoW field already reaches for "two options
// that change how the same data is drawn," the same shape here, ready the day
// a points column lands.
//
// EMPTY THROUGH `EmptyGatedPanel` (R88): a phase with no start/end dates, or
// one with no stories at all, has nothing to plot, so the whole header (title,
// and any future action) drops with it rather than standing over an empty
// chart, the same law the ticket's Related-stories panel already carries.

import * as React from "react"

import { Chart, type ChartSeries } from "@shared/ui/components/chart/chart"
import { ToggleGroup, ToggleGroupItem } from "@shared/ui/components/toggle-group/toggle-group"

import { EmptyGatedPanel } from "@/components/deep-link/screen-bits"
import { content as contentApi } from "@/lib/api"
import { useCached } from "@shared/web/store"
import { useLanguage } from "@shared/web/language"
import { formatDate } from "@shared/web/format"
import type { StoryBurndown } from "@shared/types"

export function PhaseBurndownPanel({
  sprintId,
  startsOn,
  endsOn,
  storyCount,
}: {
  sprintId: string
  startsOn: string | null
  endsOn: string | null
  storyCount: number
}) {
  const { t, lang } = useLanguage()
  const [unit, setUnit] = React.useState<"count" | "points">("count")

  // NOTHING TO PLOT, two separate reasons: the door itself refuses one (no
  // dates), and the other is simply nothing to draw (no stories in the phase
  // at all). Both read straight off the phase record already on screen, so no
  // second round trip is needed to know whether there is anything to fetch.
  const canPlot = Boolean(startsOn && endsOn) && storyCount > 0
  const burndownQ = useCached<StoryBurndown>(canPlot ? `phase-burndown:${sprintId}` : null, () =>
    contentApi.storyBurndown(sprintId)
  )

  const showPoints = Boolean(burndownQ.data?.hasPoints) && unit === "points"
  const series: ChartSeries[] = showPoints
    ? [
        { key: "idealPoints", label: t("Ideal"), color: "var(--muted-foreground)" },
        { key: "remainingPoints", label: t("Remaining"), color: "var(--foreground)" },
      ]
    : [
        { key: "idealCount", label: t("Ideal"), color: "var(--muted-foreground)" },
        { key: "remainingCount", label: t("Remaining"), color: "var(--foreground)" },
      ]
  const rows = (burndownQ.data?.days ?? []).map((d) => ({
    x: formatDate(d.date, lang),
    idealCount: d.idealCount,
    remainingCount: d.remainingCount,
    idealPoints: d.remainingPoints === null ? null : d.idealCount,
    remainingPoints: d.remainingPoints,
  }))

  return (
    <EmptyGatedPanel
      title={t("Burndown")}
      empty={!canPlot}
      action={
        burndownQ.data?.hasPoints ? (
          <ToggleGroup
            type="single"
            value={unit}
            onValueChange={(v) => v && setUnit(v as "count" | "points")}
            aria-label={t("Chart unit")}
          >
            <ToggleGroupItem value="count">{t("Count")}</ToggleGroupItem>
            <ToggleGroupItem value="points">{t("Points")}</ToggleGroupItem>
          </ToggleGroup>
        ) : undefined
      }
    >
      {!startsOn || !endsOn ? (
        <p className="text-muted-foreground text-sm">
          {t("This phase has no start and end dates set, so there's nothing to burn down.")}
        </p>
      ) : storyCount === 0 ? (
        <p className="text-muted-foreground text-sm">{t("No work in this phase yet.")}</p>
      ) : (
        <Chart
          type="line"
          data={rows}
          series={series}
          xKey="x"
          loading={burndownQ.data === undefined && !burndownQ.error}
          error={Boolean(burndownQ.error)}
          label={t("Burndown")}
          summary={t("Work remaining in the phase against the ideal pace.")}
        />
      )}
    </EmptyGatedPanel>
  )
}
