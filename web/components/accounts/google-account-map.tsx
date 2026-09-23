"use client"

// THE REAL GOOGLE MAP — Aurora's ruling, 23 Sep 2026, verbatim: "how do we
// get a google map there? … build with the google maps api." This is the
// application's own map surface, handed to the kit's `Map` (`shared/ui/
// components/map/map.tsx`) through its `children` slot exactly the way that
// component's own header anticipates ("The application's own renderer,
// handed the plate"): the kit still supplies the loading/empty/error
// registers and the plate's own paper frame (R39 — nothing here reinvents
// that chrome), and this file supplies only what the kit explicitly does not:
// the tiles themselves, which "no mapping library is on the permitted
// dependency list" for the KIT to draw. Loading the Google Maps JavaScript
// SDK by `<script>` tag (never an npm import) is the one exception her
// ruling asked for, and it is scoped to this one file.
//
// THE INTERACTION SHE ASKED FOR: "remove the side panel, when i click in one
// i want a slight little overlay card with name and loogo and full adress
// (including ountry) then if i click there it takes me to detail screen."
// So: no list (the placement's own `missingCount` still rides the caption
// below the plate — see `account-map.ts`'s header for why that is not the
// same thing as losing the list silently); a marker click opens a small
// `Card` (the app's own — `RecordMark` for the logo, `CardTitle` for the
// name) anchored to the pin via a `google.maps.InfoWindow`; a click on the
// card itself (not its own close button) calls `onOpenAccount`, the same
// `onIntent({ kind: "open", … })` door every other record surface in this
// screen already uses.
//
// WHY AN INFOWINDOW, AND WHY REACT RENDERS INTO IT. Google's markers paint
// through the Maps SDK's own renderer, not through React's tree, so there is
// no JSX element to anchor a kit popover to. `InfoWindow` is the SDK's own
// answer to "a small card anchored to a marker, dismissible, repositioned on
// pan/zoom for free" — exactly the job description — and its `content` slot
// takes a real DOM node, which is what lets `AccountMapCard` below be an
// ordinary `Card`/`CardContent`/`RecordMark` composition (her own ask: "the
// app's own card, logo and typography") rendered into that node with
// `createRoot`, rather than a hand-built HTML string standing in for one.
//
// COST AND PRIVACY, both asked for in the brief and answered in full in this
// round's own report rather than repeated here as a comment: the short
// version is that loading this component fetches Google's own map tiles for
// whatever the browser pans across (Google's normal, metered tile-serving,
// not an extra cost this file invents) and sends each PIN's `lat`/`lng` to
// render a marker — never an account's name, logo or address, which stay
// entirely client-side until a person opens the card.
import * as React from "react"
import { createRoot, type Root } from "react-dom/client"

// Aliased — the bare name `Map` would shadow JavaScript's own built-in `Map`
// class, which this file uses two lines below for the script-load cache.
import { Map as KitMap } from "@shared/ui/components/map/map"
import { Card, CardContent, CardTitle } from "@shared/ui/components/card/card"
import { Button } from "@shared/ui/components/button/button"
import { X } from "@shared/ui/foundations/icons"
import { RecordMark } from "@shared/web/record-mark"
import type { Vars } from "@shared/i18n"

import type { AccountMapPin } from "./account-map"

type Translate = (english: string, vars?: Vars) => string

/* ── THE GOOGLE MAPS SDK, TYPED LOCALLY ───────────────────────────────────
 * Just enough of `window.google.maps` to type-check the calls this file
 * makes, kept local rather than pulling in `@types/google.maps` as a new
 * dependency for four constructors and a handful of methods (R4 — the
 * smallest shape that solves the problem). Every method below is real,
 * documented Maps JavaScript API surface; nothing here is invented. */
type LatLngLiteral = { lat: number; lng: number }
interface GoogleMapsMarker {
  addListener(event: "click", handler: () => void): void
  setMap(map: GoogleMapsMap | null): void
}
interface GoogleMapsInfoWindow {
  setContent(node: Node): void
  open(options: { map: GoogleMapsMap; anchor: GoogleMapsMarker }): void
  close(): void
  addListener(event: "closeclick", handler: () => void): void
}
interface GoogleMapsLatLngBounds {
  extend(position: LatLngLiteral): void
}
interface GoogleMapsMap {
  setCenter(position: LatLngLiteral): void
  setZoom(zoom: number): void
  fitBounds(bounds: GoogleMapsLatLngBounds, padding?: number): void
  addListener(event: "click", handler: () => void): void
}
interface GoogleMapsNamespace {
  Map: new (el: HTMLElement, options: Record<string, unknown>) => GoogleMapsMap
  Marker: new (options: Record<string, unknown>) => GoogleMapsMarker
  InfoWindow: new (options: Record<string, unknown>) => GoogleMapsInfoWindow
  LatLngBounds: new () => GoogleMapsLatLngBounds
}
declare global {
  interface Window {
    google?: { maps: GoogleMapsNamespace }
  }
}

/** Loaded once per browser TAB no matter how many times this component
 * mounts or unmounts — a second `<script>` for the Maps SDK is at best
 * wasted and at worst the console's own "google is already defined" error a
 * remount (switching view, switching tab and back) would otherwise cause
 * every time. Keyed by the script's own URL, which carries the key, so a
 * cache entry can never be reused across two different configurations. */
const scriptCache = new Map<string, Promise<void>>()

function loadGoogleMapsScript(scriptUrl: string): Promise<void> {
  const cached = scriptCache.get(scriptUrl)
  if (cached) return cached
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = scriptUrl
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Google Maps script failed to load"))
    document.head.appendChild(script)
  })
  scriptCache.set(scriptUrl, promise)
  return promise
}

type ScriptStatus = "idle" | "loading" | "ready" | "error"

/** `null` in `scriptUrl` (the honest "no key configured" state) never asks
 * the network for anything — `status` simply stays `"idle"`, which the kit's
 * `Map` reads as its own `empty` register below. */
function useGoogleMapsScript(scriptUrl: string | null): ScriptStatus {
  const [status, setStatus] = React.useState<ScriptStatus>("idle")
  React.useEffect(() => {
    if (!scriptUrl) {
      setStatus("idle")
      return
    }
    let cancelled = false
    setStatus("loading")
    loadGoogleMapsScript(scriptUrl)
      .then(() => {
        if (!cancelled) setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [scriptUrl])
  return status
}

/** THE OVERLAY CARD — her own words, "name and loogo and full adress
 * (including ountry)". Rendered into an `InfoWindow`'s own content node
 * (below), so it is an ordinary composition of the app's own parts: a
 * `Card`, `RecordMark` for the logo (the same mark every other record
 * surface in this app draws — R35), `CardTitle` for the name, and the full
 * address `account-map.ts` already built. A click anywhere on the card
 * except the close button opens the record. */
function AccountMapCard({
  pin,
  t,
  onClose,
  onOpen,
}: {
  pin: AccountMapPin
  t: Translate
  onClose: () => void
  onOpen: (id: string) => void
}) {
  return (
    <Card
      data-slot="account-map-card"
      className="w-64 cursor-pointer"
      onClick={() => onOpen(pin.id)}
    >
      <CardContent className="flex items-start gap-3 p-3">
        <RecordMark picture={pin.logoUrl} name={pin.name} size="row" />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-sm">{pin.name}</CardTitle>
          <p className="m-0 mt-1 text-badge text-ink-tertiary">
            {pin.address || t("No address on file")}
          </p>
          {pin.approximate ? (
            <p className="m-0 mt-1 text-micro uppercase text-ink-tertiary">
              {t("Approximate location")}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("Close")}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <X className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

/** A different marker look for an APPROXIMATE pin — the same honesty the
 * caption under the map carries in words, carried here in the mark itself,
 * so a reader sees the difference before they click, not only after. Both
 * are Google's own stock marker images — a literal URL, not a secret, the
 * same class of public constant `country-centroids.ts` already keeps. */
const MARKER_ICON = {
  exact: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  approximate: "https://maps.google.com/mapfiles/ms/icons/grey-dot.png",
} as const

export function GoogleAccountsMap({
  pins,
  missingCount,
  totalCount,
  scriptUrl,
  t,
  onOpenAccount,
}: {
  pins: AccountMapPin[]
  missingCount: number
  totalCount: number
  /** `tenancy.mapsConfig()`'s own answer: `undefined` while it is still
   * loading, `null` once loaded and `GOOGLE_MAPS_BROWSER_KEY` is unset on
   * this environment. Three states, not two, so "still asking" and "asked,
   * and there is nothing" never collapse into the same UI. */
  scriptUrl: string | null | undefined
  t: Translate
  onOpenAccount: (id: string) => void
}) {
  const configLoading = scriptUrl === undefined
  const status = useGoogleMapsScript(scriptUrl ?? null)

  const mapDivRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<GoogleMapsMap | null>(null)
  const markersRef = React.useRef<GoogleMapsMarker[]>([])
  const infoWindowRef = React.useRef<GoogleMapsInfoWindow | null>(null)
  const cardRootRef = React.useRef<Root | null>(null)

  // ONE PLACE THAT CLOSES THE CARD — the close button, a click elsewhere on
  // the map, and the SDK's own `closeclick` (fired only by ITS built-in close
  // control, which this file never shows) all route through here, so the
  // React root behind the card is unmounted exactly once per open rather than
  // leaking one every time a reader dismisses a card.
  const closeCard = React.useCallback(() => {
    infoWindowRef.current?.close()
    if (cardRootRef.current) {
      cardRootRef.current.unmount()
      cardRootRef.current = null
    }
  }, [])

  // THE MAP INSTANCE — created once the SDK is ready and the div exists, torn
  // down on unmount. Pins are synced by a SEPARATE effect below rather than
  // rebuilding the map itself, so a reader's own pan/zoom survives an
  // ordinary data refresh.
  React.useEffect(() => {
    if (status !== "ready" || !mapDivRef.current || mapRef.current) return
    const maps = window.google?.maps
    if (!maps) return
    const map = new maps.Map(mapDivRef.current, {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    })
    mapRef.current = map
    const infoWindow = new maps.InfoWindow({ content: document.createElement("div") })
    infoWindow.addListener("closeclick", closeCard)
    infoWindowRef.current = infoWindow
    map.addListener("click", closeCard)
    return () => {
      closeCard()
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
      mapRef.current = null
      infoWindowRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mapDivRef is a ref, not reactive state
  }, [status, closeCard])

  // THE PINS — cleared and rebuilt whenever the placement changes. Fewer than
  // twenty accounts sit on this screen today (the Kwapso team's own fourteen
  // active companies), so a full rebuild rather than a diff is the smallest
  // shape that is still correct (R4).
  React.useEffect(() => {
    const map = mapRef.current
    const maps = window.google?.maps
    if (!map || !maps || status !== "ready") return

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    closeCard()

    if (pins.length === 0) return

    const bounds = new maps.LatLngBounds()
    for (const pin of pins) {
      const position = { lat: pin.lat, lng: pin.lng }
      bounds.extend(position)
      const marker = new maps.Marker({
        map,
        position,
        title: pin.name,
        icon: pin.approximate ? MARKER_ICON.approximate : MARKER_ICON.exact,
      })
      marker.addListener("click", () => {
        const infoWindow = infoWindowRef.current
        if (!infoWindow) return
        if (cardRootRef.current) cardRootRef.current.unmount()
        const container = document.createElement("div")
        const root = createRoot(container)
        cardRootRef.current = root
        root.render(<AccountMapCard pin={pin} t={t} onClose={closeCard} onOpen={onOpenAccount} />)
        infoWindow.setContent(container)
        infoWindow.open({ map, anchor: marker })
      })
      markersRef.current.push(marker)
    }

    if (pins.length === 1) {
      map.setCenter({ lat: pins[0].lat, lng: pins[0].lng })
      map.setZoom(11)
    } else {
      map.fitBounds(bounds, 48)
    }
  }, [pins, status, t, onOpenAccount, closeCard])

  // "IT SAYS WHO IS MISSING" — the kit map doc's own law, kept even though
  // the list it used to live beside is gone (her own instruction, this
  // file's header). One honest sentence, near the plate, never a list.
  const caption =
    totalCount === 0
      ? null
      : missingCount === 0
        ? t("All {total} accounts are shown on the map.", { total: totalCount })
        : t("{shown} of {total} accounts are shown on the map — {missing} could not be placed.", {
            shown: totalCount - missingCount,
            total: totalCount,
            missing: missingCount,
          })

  return (
    <div className="flex flex-col gap-2">
      <KitMap
        ratio="16 / 9"
        loading={configLoading || status === "loading"}
        error={status === "error"}
        // THE ABSENT-KEY STATE — the kit's own `empty` register, said
        // honestly rather than drawing a broken plate: `status` stays
        // `"idle"` (never `"loading"`/`"ready"`/`"error"`) whenever
        // `scriptUrl` is `null`, so this label is what a reader sees the
        // moment `GOOGLE_MAPS_BROWSER_KEY` is unset on this environment.
        emptyLabel={t("Connect Google Maps to see accounts here.")}
        loadingLabel={t("Loading map…")}
        errorLabel={t("The map could not be loaded.")}
      >
        {/* THE SURFACE ITSELF — present whenever there is something to wait
            FOR (`scriptUrl` is not the explicit "unset" null), so the kit's
            own `empty` computation (`!embedded && !children && !hasPins`)
            reads `children` as truthy the moment there is a key to load, and
            its `busy` state (driven by `loading` above) is what a reader
            actually sees while the SDK is still on its way — never the empty
            register racing ahead of it. Omitted outright only when
            `scriptUrl === null`: the one state that really has nothing to
            show, which is what turns the kit's `empty` register on. */}
        {scriptUrl !== null ? <div ref={mapDivRef} className="size-full" /> : null}
      </KitMap>
      {caption !== null ? <p className="m-0 text-badge text-ink-tertiary">{caption}</p> : null}
    </div>
  )
}
