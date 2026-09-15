// THE ICON A MEETING TYPE CARRIES — the vocabulary the write door checks
// against, and the first place this app stores an icon name as DATA in a
// database row rather than in a hardcoded table (`TAB_ICONS`, `CONCEPT_ICON`)
// a person never edits.
//
// Kebab-case, the app's own storage convention for an icon named by data
// (shared/web/screen-engine/icon-names.ts: "clock-counter-clockwise", never
// "ClockCounterClockwise" — `kitExportName` Pascals it on the way to the kit).
// Every name here is one of Phosphor's own (shared/ui/foundations/icons,
// ATTRIBUTION.md), verified by hand against the kit's generated exports at the
// eight names' introduction (`ClockCounterClockwise`, `CalendarBlank`,
// `CheckCircle`, `ArrowsClockwise`, `RocketLaunch`, `ArrowClockwise`,
// `CalendarDots`, `Target` all exist in shared/ui/foundations/icons/*.svg).
//
// CLOSED TO THE EIGHT THE CLIENT KEPT, 15 Sep 2026 (migration 0092's own header
// carries her ruling verbatim) — not the whole 1,512-glyph pack. A meeting
// type is a settled, hand-curated taxonomy (delivery.ts's own header: "27
// rows... revises a few times a year"), so a worker-side validator against the
// FULL kit would mean either shipping the kit's ~150 KB glyph manifest into a
// Cloudflare Worker to check one short field, or trusting an unchecked string
// — the smallest shape that still refuses a typo is a short, explicit list.
// Extending it later (a ninth type, a different pick) is one line here, kept
// beside the row that would draw it: add the kebab name only once the kit
// actually draws it (shared/ui/foundations/icons/<PascalName>.svg exists).
export const MEETING_TYPE_ICONS = [
  "clock-counter-clockwise",
  "calendar-blank",
  "check-circle",
  "arrows-clockwise",
  "rocket-launch",
  "arrow-clockwise",
  "calendar-dots",
  "target",
] as const

export type MeetingTypeIcon = (typeof MEETING_TYPE_ICONS)[number]

/** Whether a string names one of the vocabulary's own icons — the check the
 * write door runs before it lets a value reach the column. */
export function isMeetingTypeIcon(value: string): value is MeetingTypeIcon {
  return (MEETING_TYPE_ICONS as readonly string[]).includes(value)
}
