// COUNTRY → POSITION — the one honest answer to a dishonest question.
//
// THE PROBLEM. `Account.country` (shared/types.ts) is a country, picked from
// the team's own "Country" vocabulary group (shared/selectable-groups.ts) — a
// PER-TEAM list, editable on the Dropdown values screen, not a closed set in
// code. A country is not a position: `shared/ui/components/map/map.tsx`'s own
// header is explicit that the kit draws no tiles and no projection, and hands
// the plate whatever `x`/`y` (0–100 across it) the APPLICATION worked out —
// "DATA, not a design value." Something in the app has to turn "Germany" into
// a number, and guessing from the free-text street/city fields (shared/types.ts
// `Account.street`/`city`) would be exactly that: a guess, not a fact the door
// ever asked anyone to confirm. A COUNTRY is the one geographic fact the team
// deliberately made a fact (closed vocabulary, exact match) rather than free
// text — so it is the one fact this table is allowed to place.
//
// THE TABLE. A small, hand-kept set of country centroids — NOT every country
// on earth, and NOT fetched from a geocoding service (the map component's own
// law: "no mapping library is on the permitted dependency list"). Coordinates
// are ordinary, publicly known reference values — each country's approximate
// geographic centre, rounded to the nearest degree, the same class of number
// printed on any school atlas or a Natural-Earth-style centroid list — entered
// by hand, not looked up live. They are accurate enough to place a dot on a
// MUTED, tile-less plate; they are not surveyed and were never meant to be.
//
// WHY THIS SET. The team's own seed (`workers/tenancy/src/team-schema/seed.ts`)
// starts every new team with six Country rows — Germany, Austria, Switzerland,
// Spain, Andorra, United Kingdom — the agency's own DACH-plus-Iberia base. This
// table covers those six and widens to the rest of Europe plus the world's
// other common client geographies, so a team that adds "United States" or
// "Brazil" to its own vocabulary is not immediately unplaceable either. It is
// still finite on purpose (R4 of CLAUDE.md's planning ritual: the smallest
// shape that solves the problem) — a country a team picks that is NOT in this
// table is treated exactly like an account with no country at all: it cannot
// be placed, and `placeAccountsOnMap` (`./account-map.ts`) puts it in the
// missing count rather than guessing a position for it.
//
// MATCHED BY EXACT STRING, case- and whitespace-insensitive, THEN by a short
// LOCAL-LANGUAGE ALIAS table below (`COUNTRY_ALIASES`). The vocabulary is
// picked from a dropdown (`account-form-dialog.tsx`'s own `group("Country")`),
// so in the ordinary case the account's `country` field is spelled exactly as
// this table's own key — the same assumption the door's own `country = ?`
// filter (`workers/tenancy/src/lib/accounts.ts`) already makes. But it is a
// PER-TEAM, EDITABLE list and not a closed set this app controls, so a team
// can and did add two rows for one country in two languages — "Austria" and
// "Österreich" both sit on the Kwapso team's own vocabulary today, nine
// companies under the first spelling and one under the second. Neither
// spelling is wrong, so this file does not get to pick one; it places a pin
// for both, and leaves merging the two vocabulary rows into one where it
// belongs — the owner's own data decision, not a lookup table's.
export const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  // ── The seed's own six ──────────────────────────────────────────────────
  Germany: { lat: 51, lng: 9 },
  Austria: { lat: 47.5, lng: 14.5 },
  Switzerland: { lat: 46.8, lng: 8.2 },
  Spain: { lat: 40.4, lng: -3.7 },
  Andorra: { lat: 42.5, lng: 1.5 },
  "United Kingdom": { lat: 54, lng: -2 },

  // ── The rest of Europe ──────────────────────────────────────────────────
  Albania: { lat: 41, lng: 20 },
  Belgium: { lat: 50.5, lng: 4.5 },
  Bulgaria: { lat: 43, lng: 25 },
  Croatia: { lat: 45, lng: 16 },
  Cyprus: { lat: 35, lng: 33 },
  "Czech Republic": { lat: 49.8, lng: 15.5 },
  Denmark: { lat: 56, lng: 10 },
  Estonia: { lat: 59, lng: 26 },
  Finland: { lat: 64, lng: 26 },
  France: { lat: 46.6, lng: 1.9 },
  Greece: { lat: 39, lng: 22 },
  Hungary: { lat: 47, lng: 20 },
  Iceland: { lat: 65, lng: -19 },
  Ireland: { lat: 53, lng: -8 },
  Italy: { lat: 42.8, lng: 12.8 },
  Latvia: { lat: 57, lng: 25 },
  Liechtenstein: { lat: 47.2, lng: 9.5 },
  Lithuania: { lat: 56, lng: 24 },
  Luxembourg: { lat: 49.75, lng: 6 },
  Malta: { lat: 35.9, lng: 14.4 },
  Monaco: { lat: 43.7, lng: 7.4 },
  Netherlands: { lat: 52.1, lng: 5.3 },
  Norway: { lat: 61, lng: 9 },
  Poland: { lat: 52, lng: 19.5 },
  Portugal: { lat: 39.5, lng: -8 },
  Romania: { lat: 46, lng: 25 },
  Serbia: { lat: 44, lng: 21 },
  Slovakia: { lat: 48.7, lng: 19.5 },
  Slovenia: { lat: 46.1, lng: 14.8 },
  Sweden: { lat: 62, lng: 15 },
  Ukraine: { lat: 49, lng: 32 },

  // ── The rest of the world's common client geographies ──────────────────
  Argentina: { lat: -34, lng: -64 },
  Australia: { lat: -25, lng: 135 },
  Brazil: { lat: -10, lng: -55 },
  Canada: { lat: 60, lng: -95 },
  Chile: { lat: -30, lng: -71 },
  China: { lat: 35, lng: 105 },
  Colombia: { lat: 4, lng: -72 },
  Egypt: { lat: 27, lng: 30 },
  India: { lat: 21, lng: 78 },
  Indonesia: { lat: -2, lng: 118 },
  Israel: { lat: 31, lng: 35 },
  Japan: { lat: 36, lng: 138 },
  Mexico: { lat: 23, lng: -102 },
  Morocco: { lat: 32, lng: -5 },
  "New Zealand": { lat: -41, lng: 174 },
  Nigeria: { lat: 9, lng: 8 },
  Pakistan: { lat: 30, lng: 70 },
  Philippines: { lat: 13, lng: 122 },
  Qatar: { lat: 25.3, lng: 51.2 },
  "Saudi Arabia": { lat: 24, lng: 45 },
  Singapore: { lat: 1.35, lng: 103.8 },
  "South Africa": { lat: -29, lng: 24 },
  "South Korea": { lat: 36, lng: 127.8 },
  Thailand: { lat: 15, lng: 101 },
  Turkey: { lat: 39, lng: 35 },
  "United Arab Emirates": { lat: 24, lng: 54 },
  "United States": { lat: 39, lng: -98 },
  Vietnam: { lat: 16, lng: 106 },
}

/** LOCAL-LANGUAGE ALIASES — a real, live gap found the day this shipped: the
 * Kwapso team's own fourteen active companies carry Austria spelled TWO ways,
 * "Austria" (9 rows) and "Österreich" (1 row, the German name, ö and all).
 * Neither is wrong. THE COUNTRY VOCABULARY IS A PER-TEAM, EDITABLE LIST
 * (`shared/selectable-groups.ts`'s "Country" group, this file's own header),
 * not a closed set this app controls — a German-speaking team can and did add
 * both rows to its own dropdown, spelling one country two ways, and neither
 * the door nor this table gets a vote in stopping that (merging the two into
 * one vocabulary entry is the OWNER's data decision, made separately — see
 * `accounts-screen.tsx`'s own header). Left unhandled, the case-insensitive
 * match above still fails for "Österreich" (it is not a case variant of
 * "Austria", it is a different word for it), and a company that genuinely
 * CAN be placed would drop onto the missing list for what is really a
 * spelling difference, not an absent fact.
 *
 * So: a second, short table, tried only after BOTH the exact and the
 * case-insensitive match against `COUNTRY_CENTROIDS` have already failed —
 * the team's own spelling always wins first. Keys are the local names a
 * German/Spanish/Serbian-speaking client is likely to type for the six
 * countries this agency's own seed starts every team with, found live on the
 * Kwapso team itself; values are the exact key this alias resolves to in
 * `COUNTRY_CENTROIDS` above.
 *
 * AN ALIAS THIS TABLE DOES NOT CARRY IS NOT A BUG. A country this short list
 * has never seen is exactly the "cannot be placed" case `account-map.ts`
 * already handles honestly: the account stays in the list, the plate simply
 * does not draw it. Widening this table is a judgement call about which
 * spellings are common enough to bother with, not a correctness fix.
 *
 * NEVER NORMALISES OR REWRITES THE STORED VALUE. This table exists to find a
 * PIN POSITION only — `account-map.ts`'s own `items`/`pins` still read
 * `account.country` exactly as spelled on the row; a company filed under
 * "Österreich" still reads "Österreich" in the list and on its own pin,
 * placed at the same point on the plate as a company filed under "Austria". */
const COUNTRY_ALIASES: Record<string, string> = {
  Österreich: "Austria",
  Deutschland: "Germany",
  Schweiz: "Switzerland",
  Suisse: "Switzerland",
  España: "Spain",
  Srbija: "Serbia",
}

/** The world's own extent, in the same equirectangular projection the
 * positions below use — kept as a constant rather than four magic numbers so
 * the map and its test agree by construction on what "the whole plate" means. */
const LAT_RANGE = { min: -90, max: 90 }
const LNG_RANGE = { min: -180, max: 180 }

/** A margin off every edge, in plate percentage points, so a pin near a pole
 * or the date line is never drawn cut off by the plate's own box. */
const EDGE_MARGIN = 3

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Country name → `{ lat, lng }`. Tried in order: the exact stored spelling
 * against `COUNTRY_CENTROIDS`'s own keys, then a CASE-INSENSITIVE match
 * against those same keys (the one realistic typo — "germany" typed into an
 * import CSV before it was picked through the picker), then a
 * case-insensitive match against `COUNTRY_ALIASES` above (a local-language
 * spelling of a country this table already knows by another name). `null`
 * for anything none of the three carries, which `placeAccountsOnMap`
 * (`./account-map.ts`) treats exactly like a missing country: not a guess,
 * not a crash — a row that belongs in the list and not on the plate. */
export function countryCentroid(country: string | null | undefined): { lat: number; lng: number } | null {
  if (!country) return null
  const key = country.trim()
  if (key === "") return null
  const exact = COUNTRY_CENTROIDS[key]
  if (exact) return exact
  const lower = key.toLowerCase()
  for (const [name, centroid] of Object.entries(COUNTRY_CENTROIDS)) {
    if (name.toLowerCase() === lower) return centroid
  }
  // THE ALIAS PASS — only once the vocabulary's own spelling has had its
  // fair chance, per the header above.
  for (const [alias, canonical] of Object.entries(COUNTRY_ALIASES)) {
    if (alias.toLowerCase() === lower) return COUNTRY_CENTROIDS[canonical] ?? null
  }
  return null
}

/** A country's own centroid, projected onto the plate's flat `x`/`y` — 0–100
 * across, 0–100 down, EQUIRECTANGULAR (longitude straight to `x`, latitude
 * straight to `y`). The plate draws no tiles and no coastline (the kit's own
 * law), so this is not "aligned to a drawn map" — there is no drawn map to
 * align to. It is the simplest projection that keeps two true things true
 * without drawing anything: WEST of another country stays left of it, and
 * NORTH of another country stays above it, which is all an unlabelled, muted
 * plate can honestly promise. `null` in, `null` out. */
export function countryPosition(country: string | null | undefined): { x: number; y: number } | null {
  const centroid = countryCentroid(country)
  if (!centroid) return null
  const x = ((centroid.lng - LNG_RANGE.min) / (LNG_RANGE.max - LNG_RANGE.min)) * 100
  const y = ((LAT_RANGE.max - centroid.lat) / (LAT_RANGE.max - LAT_RANGE.min)) * 100
  return {
    x: clamp(x, EDGE_MARGIN, 100 - EDGE_MARGIN),
    y: clamp(y, EDGE_MARGIN, 100 - EDGE_MARGIN),
  }
}
