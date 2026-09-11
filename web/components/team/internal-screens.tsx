"use client"

// THE AGENCY'S OWN HOUSEKEEPING, as screens — the two list pages behind the
// Brand library and the Meeting purposes.
//
// Its own file, so the deep-link collection switch stays a switch — the same
// reason processes-screen.tsx exists. Everything below is the standard
// arrangement said twice rather than abstracted into one loop, and that is
// deliberate: R16 (ii) requires each collection to render a
// `<CollectionHeading sectionKey="…">` naming its own section, so a generic
// component parameterised by key would satisfy nobody reading it and nothing
// checking it. Two short, obvious blocks beat one clever one.

import * as React from "react"

import {
  ScreenRenderer,
  type ScreenActionContext,
  type ScreenIntent,
} from "@shared/web/screen-engine/screen-renderer"
import type { ScreenRecipe, ScreenRights } from "@shared/web/screen-engine/recipe"

import { CollectionHeading } from "@/components/records/collection-heading"
import { ModuleSettingsGear } from "@/components/screens/module-settings-screen"
import { SectionWithCreate } from "@/components/deep-link/screen-bits"
import { shapeBrandList, shapePurposesList } from "@/components/deep-link/shape"
import { withDataDrivenCollection } from "@/lib/screens"
import type { BrandAsset, MeetingPurpose } from "@shared/types"
import { useT } from "@shared/web/language"

/** Everything one of these screens needs from the host. The same bundle twice,
 * because they are the same screen twice. */
type InternalScreenProps<T> = {
  rows: T[]
  recipe: ScreenRecipe
  rights: ScreenRights
  total: number | undefined
  canCreate: boolean
  /** where the create button's `?panel=add` lands (the current section path). */
  onCreate: () => void
  /** the contextual "Import CSV" jump, when the caller may import. */
  onImport?: () => void
  /** the full-field CSV export door — export needs READ, which seeing this
   * screen already implies. */
  exportHref: string
  onAction: (actionId: string, ctx: ScreenActionContext) => void
  onIntent: (intent: ScreenIntent) => void
}

/** The shared body: heading with the exact server count, then the collection
 * with its create / import / export row. Takes already-shaped rows so each
 * caller keeps its own shaper (they read differently and that is the point). */
function InternalCollection({
  createLabel,
  data,
  recipe,
  rights,
  canCreate,
  onCreate,
  onImport,
  exportHref,
  onAction,
  onIntent,
  heading,
}: {
  createLabel: string
  data: ReturnType<typeof shapeBrandList>
  heading: React.ReactNode
} & Omit<InternalScreenProps<never>, "rows" | "total">) {
  const t = useT()
  const tuned = withDataDrivenCollection(recipe, data.rows ?? [])
  return (
    <div className="flex flex-col gap-6">
      {heading}
      <SectionWithCreate
        show={canCreate}
        label={createLabel}
        icon="plus"
        secondary={onImport ? { show: canCreate, label: t("Import CSV"), onClick: onImport } : undefined}
        download={{ show: (data.rows?.length ?? 0) > 0, label: t("Export CSV"), href: exportHref }}
        // R50 — nothing at all in the toolbar over a collection with no rows in
        // it, import included. The act is still published to the empty body
        // below (`CollectionEmptyState`'s "Import a list"), which is where a
        // brand-new team should meet it; this only stops the same button being
        // drawn twice on the one screen that has nothing else on it.
        empty={(data.rows?.length ?? 0) === 0}
        onCreate={onCreate}
        useKitPanel
      >
        <ScreenRenderer
          recipe={tuned}
          data={data}
          rights={rights}
          onAction={onAction}
          onIntent={onIntent}
          useKitPanel
        />
      </SectionWithCreate>
    </div>
  )
}

/** THE BRAND LIBRARY, and the one of the two that has settings.
 *
 * `teamId` IS ITS OWN PROP RATHER THAN A FIELD ON `InternalScreenProps`, because
 * the bundle above is "the same screen twice" and this is the half where the two
 * stop being the same: a brand asset's CATEGORY is stored on
 * `brand_assets.category` (`shared/selectable-homes.ts`), so this module owns a
 * vocabulary and Meeting purposes does not. Putting the prop on the shared type
 * would hand `PurposesScreen` a value it has nothing to do with. */
export function BrandLibraryScreen(
  props: InternalScreenProps<BrandAsset> & { teamId: string | null }
) {
  const { rows, teamId, ...rest } = props
  return (
    <InternalCollection
      {...rest}
      createLabel="New asset"
      data={shapeBrandList(rows)}
      heading={
        /* THE MODULE'S OWN DOOR INTO ITS SETTINGS (R61) — the categories the
           library is shelved by. In the heading's `action` slot and never the
           toolbar: `SectionWithCreate` below draws nothing at all over an empty
           collection (R50), which is exactly when the shelves matter. */
        /* ONE LINE, and R16's own census is why: it looks for the literal
           `<CollectionHeading sectionKey="brand"` to prove this collection
           names itself, and a prettier break after the tag makes that substring
           vanish while the screen renders identically. */
        <CollectionHeading sectionKey="brand" total={props.total} action={<ModuleSettingsGear teamId={teamId} segment="brand" />} />
      }
    />
  )
}

export function PurposesScreen(props: InternalScreenProps<MeetingPurpose>) {
  const { rows, ...rest } = props
  return (
    <InternalCollection
      {...rest}
      createLabel="New meeting purpose"
      data={shapePurposesList(rows)}
      heading={<CollectionHeading sectionKey="purposes" total={props.total} />}
    />
  )
}
