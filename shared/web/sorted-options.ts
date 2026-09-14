// THE OPTIONS A PERSON PICKS FROM ARE A→Z, IN THEIR OWN LANGUAGE — everywhere.
//
// The client's ruling, 2026-09-14, over Settings › Automations' own Module
// filter: *"In settings, automations, make sure that in the sort component,
// in the modules component, you sort it A to Z. This here, but everywhere in
// the app, make it a law."* A CHOICE a control offers — a filter facet's
// options, a `<Select>`'s items, a picker's list — is not a collection row:
// it has no sort control of its own, so nothing narrows it into an order for
// the reader except whoever built the screen remembering to. This is the one
// seam that remembers instead of every screen having to.
//
// LOCALE-AWARE, not a plain `.sort()`: `localeCompare(lang)`, so "Ä"/"ä"
// sorts where a German reader expects it and not where the code point puts
// it. `lang` is the app's CURRENT language (`useLanguage().lang`,
// `shared/web/language.tsx`) — never the browser's own locale, which may
// disagree with what the reader chose in Settings › Appearance.
//
// STABLE AND NON-MUTATING: a fresh array, the input's own order untouched —
// so a caller holding another reference to the same list is never surprised
// by an in-place sort.
//
// `labelOf` DEFAULTS TO READING `.label`, which is every `FacetOption` and
// every `SortOption` in the app (`shared/web/screen-engine/config.ts`) — so
// `sortedOptions(options, lang)` is the whole call at the app's one central
// filter seam (`shared/web/screen-engine/filter-bar.tsx`). A caller sorting
// something that is not already `{ label: string }` shaped — a row of
// people, a bare list of group names — passes its own accessor instead of
// reshaping the array first.
//
// THE ONE ESCAPE HATCH IS DATA, NOT A SECOND FUNCTION: `ORDERED_OPTIONS_OK`
// (`shared/rules/registry.ts`) names a control whose list is not a naming
// vocabulary at all — a status PIPELINE, a size SCALE, a step's place in a
// workflow someone actually designed — reasoned per entry, rot-checked both
// ways. See that registry's own comment before reaching for it.

import type { Language } from "../i18n"

export function sortedOptions<T>(
  options: readonly T[],
  lang: Language,
  labelOf: (option: T) => string = (o) => (o as { label: string }).label
): T[] {
  return [...options].sort((a, b) => labelOf(a).localeCompare(labelOf(b), lang))
}
