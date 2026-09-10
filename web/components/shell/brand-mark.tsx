import { brand } from "@shared/brand"

// The app's logo lockup, from shared/brand.ts: the logo image if set, else a
// monogram on the accent colour (so it re-skins with the brand). Optionally
// shows the app name beside it. Used on the sign-in / onboarding screens.
export function BrandMark({
  showName = false,
  className = "",
}: {
  showName?: boolean
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="bg-primary text-primary-foreground flex size-10 items-center justify-center overflow-hidden rounded-[var(--radius)] text-lg font-medium">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          // FILL, NEVER FIT (R60, client 2026-09-09: "everywhere for images: do
          // fill, not fit!"). This was `object-contain p-1` — the logo shrunk
          // inside the accent square with a padding ring around it — and the
          // padding went with the contain rather than surviving it: `p-1` under
          // `object-cover` is an inset box that then crops, which is the worst of
          // both readings (a cropped logo AND a gap). "Everywhere" includes the
          // app's OWN lockup: this square sits on the sign-in and onboarding
          // screens beside nothing else, so it is the one mark in the product a
          // person meets before any record, and a letterboxed one there would be
          // the exception teaching the rule wrong. A brand whose logo cannot
          // survive a square crop changes `brand.logoUrl` (shared/brand.ts) for a
          // square asset — the seam is one value in one file — rather than
          // reopening the fit here.
          <img src={brand.logoUrl} alt={brand.name} className="size-full object-cover" />
        ) : (
          brand.name[0]?.toUpperCase()
        )}
      </span>
      {showName && (
        <span className="text-lg font-medium">{brand.name}</span>
      )}
    </div>
  )
}
