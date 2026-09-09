"use client"

// THE KNOWLEDGE BASE, AS ONE PICTURE — every source we hold, grouped and
// coloured by the account it is filed under.
//
// ── THE ARGUMENT THIS FILE HAS TO ANSWER ────────────────────────────────────
//
// `workers/content/src/lib/record-map.ts` opens by refusing to draw exactly
// this: a whole graph is a hairball, and the question a map is asked — "what is
// this connected to?" — is the one a hairball answers worst. That is right, and
// it is right about an UNCLUSTERED graph. It is answered rather than overruled,
// in one sentence: THE CLUSTER IS THE PICTURE. What a reader sees here is not
// four thousand dots, it is a hundred and thirty-four blobs of visibly different
// sizes, and the question this screen exists for — where is the knowledge, and
// where is there none — is answered by their sizes before a single label is
// read. Take the clustering away and `record-map.ts` wins.
//
// ── WHY THE LAYOUT IS ARITHMETIC AND NOT A SIMULATION ───────────────────────
//
// `relationship-map.tsx` next door settles a neighbourhood with a force
// simulation, which is right at a hundred nodes and wrong at fifteen hundred:
// that simulation is O(n²) per pass, so the same three hundred passes would be
// seven hundred million operations before the first paint.
//
// It is also the wrong SHAPE of answer. A force layout discovers structure it
// was not told about — which is the point when you do not know the structure,
// and pure cost when you do. Here the structure is GIVEN: the door hands back
// clusters with their sizes. So each cluster is a disc whose AREA is its count
// (√ of the total, so twice the radius is four times the material — the honest
// encoding, and the one a reader already knows from every bubble chart), the
// discs are packed biggest-first along a spiral, and the dots inside one are
// laid out by phyllotaxis — the sunflower arrangement, which fills a disc evenly
// with no two points ever landing on top of each other. All of it is O(n), it is
// deterministic, and the same payload draws the same picture every time.
//
// Nothing settles, so nothing animates, so there is no convergence anybody
// watches and `prefers-reduced-motion` has nothing to switch off — the same
// property `relationship-map.tsx` argues for, arrived at from the other side.
//
// ── NO NEW DEPENDENCY, AND THAT IS R39 RATHER THAN THRIFT ───────────────────
//
// The kit draws no node-link graph — `map` is a geographic plate, `flowchart` is
// a top-down decision tree, `tree` is a disclosure outline. So the choice was a
// graph library behind a `UI_PACKAGE_EXEMPT` line, or arithmetic. It is
// arithmetic: the layout below is sixty lines of trigonometry, and every control
// around it — the buttons, the badge, the glyphs, the empty register — is the
// kit's. There is nothing to exempt.
//
// ── AND THE HALF A PICTURE CANNOT DO ────────────────────────────────────────
//
// POSITION IS THE INFORMATION HERE, AND POSITION DOES NOT NARRATE. So the same
// payload is rendered a second time underneath, as a list of accounts with their
// true counts — reachable rather than hidden, because a text equivalent nobody
// without a screen reader can find is one nobody checks. It is also the half
// that actually answers the owner's question in words ("Confia, 450 sources"),
// and the half you click to go somewhere. One payload, two renderings, one
// fence — the same split `relationship-map.tsx` makes.
//
// THE FENCE IS NOT THIS FILE'S. A source the caller may not read never arrives;
// an app or sprint hub whose module they cannot open never arrives; and when
// they may not read accounts at all the payload comes back with `clustered`
// false and NO clusters, because a dense named blob is the fact that right was
// withholding. This file draws what it is given and says what it was not.

import * as React from "react"

import { Badge } from "@shared/ui/components/badge/badge"
import { Button } from "@shared/ui/components/button/button"
import { ArrowsOut, Minus, Plus } from "@shared/ui/foundations/icons"

import { InAppLink } from "@/components/shell/in-app-link"
// Where a node's own record lives — shared, so the two pictures of these
// records cannot disagree about where a click goes.
import { RECORD_PATH } from "@/components/records/relationship-map"
import { softNavigate } from "@/lib/nav"
import { useT } from "@shared/web/language"
import { CollectionEmptyState } from "@shared/web/screen-engine/collection-frame"

/* ------------------------------- the layout ------------------------------- */

export type ShapeCluster = { id: string; label: string; total: number; drawn: number }
export type ShapeNode = {
  id: string
  kind: string
  label: string
  cluster: string
  table: string
  recordId: string
}
export type ShapeLink = { from: string; to: string }

/** The box the layout is computed in. A viewBox, not pixels: one set of
 * coordinates is right at every panel size, and the zoom is a window onto it
 * rather than a second layout. */
const W = 1600
const H = 1000
/** The smallest a cluster may be drawn, so an account with one source is still a
 * mark somebody can see rather than a rounding error. */
const MIN_R = 26
/** Radius per √source. Set so the biggest cluster on the agency's own base (450
 * sources on staging, 2026-09-08) lands near a fifth of the canvas — big enough
 * to read as the dense one, small enough that the rest are not crushed. */
const R_PER_ROOT = 9
/** The golden angle, which is what makes a phyllotaxis spiral fill a disc evenly
 * instead of forming arms. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
/** THE UNCLUSTERED FIELD'S OWN ID. A NUL byte, because every other string is a
 * possible cluster id — `""` is the agency's own, which is exactly the collision
 * this replaced — and `shared/workers/validate.ts` strips NUL from anything a
 * caller sends, so nothing can arrive wearing it. */
const LOOSE = "\u0000"

type PlacedCluster = ShapeCluster & { x: number; y: number; r: number }
type PlacedNode = ShapeNode & { x: number; y: number }

const clusterRadius = (total: number) => MIN_R + R_PER_ROOT * Math.sqrt(total)

/** PACK THE CLUSTERS, biggest first, along an Archimedean spiral out from the
 * middle: for each one, step along the spiral until it sits clear of every
 * cluster already placed. O(k²) at k clusters, and k is capped at 200 by the
 * door, so the worst case is forty thousand distance checks — arithmetic, once,
 * off the render path.
 *
 * Biggest first is what makes the result readable rather than merely
 * non-overlapping: the dense accounts land in the middle where the eye starts. */
function packClusters(clusters: ShapeCluster[]): PlacedCluster[] {
  const placed: PlacedCluster[] = []
  const gap = 14
  for (const c of [...clusters].sort((a, b) => b.total - a.total)) {
    const r = clusterRadius(c.total)
    let x = W / 2
    let y = H / 2
    for (let step = 0; step < 20_000; step++) {
      // The spiral: angle grows steadily, distance grows with it, so successive
      // candidates sweep outward without ever revisiting a ring.
      const a = step * 0.35
      const d = 3 * a
      x = W / 2 + d * Math.cos(a)
      y = H / 2 + d * Math.sin(a)
      if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + gap)) break
    }
    placed.push({ ...c, x, y, r })
  }
  return placed
}

/** LAY THE DOTS OUT INSIDE THEIR CLUSTER — phyllotaxis, the sunflower
 * arrangement: the i-th of n sits at angle i × the golden angle and radius
 * √(i/n), which fills a disc evenly and never collides.
 *
 * HUBS FIRST, so an app or a sprint lands near the middle of the cluster with
 * its sources around it — the reason a hub is drawn at all is that several dots
 * point at it, and a hub on the rim with its lines crossing the disc says the
 * opposite of what it means. */
function layout(
  clusters: ShapeCluster[],
  nodes: ShapeNode[]
): { discs: PlacedCluster[]; placed: PlacedNode[] } {
  const discs = packClusters(clusters)
  const byId = new Map(discs.map((d) => [d.id, d]))
  // Everything the door did not put in a cluster: the whole picture when the
  // reader may not read accounts, and any dot whose cluster fell past the door's
  // own anchor cap.
  //
  // ITS ID IS A SENTINEL, NOT THE EMPTY STRING, and that was a real bug rather
  // than tidiness. `""` IS a cluster id — it is what the door calls the agency's
  // own material, whose `account_id` is NULL — so keying the loose field on `""`
  // gave two discs the same identity: React reported duplicate keys, and a second,
  // empty disc was parked below the picture for a group that already had one. A
  // NUL byte cannot occur in a ULID and the validation seam strips it from any
  // input, so nothing a caller sends can ever collide with it.
  const loose: PlacedCluster = {
    id: LOOSE,
    label: "",
    total: 0,
    drawn: 0,
    x: W / 2,
    y: H / 2,
    r: MIN_R,
  }
  const grouped = new Map<string, ShapeNode[]>()
  for (const n of nodes) {
    const key = byId.has(n.cluster) ? n.cluster : LOOSE
    const list = grouped.get(key)
    if (list) list.push(n)
    else grouped.set(key, [n])
  }
  // The loose field is sized by what actually landed in it, and parked clear of
  // the packed discs so it never sits on top of one.
  const looseCount = grouped.get(LOOSE)?.length ?? 0
  if (looseCount) {
    loose.r = clusterRadius(looseCount)
    const furthest = discs.reduce((m, d) => Math.max(m, Math.hypot(d.x - W / 2, d.y - H / 2) + d.r), 0)
    loose.x = W / 2
    loose.y = H / 2 + furthest + loose.r + 40
  }

  const placed: PlacedNode[] = []
  for (const [key, list] of grouped) {
    const disc = byId.get(key) ?? loose
    const ordered = [...list].sort((a, b) => rank(a) - rank(b))
    const n = ordered.length
    ordered.forEach((node, i) => {
      const a = i * GOLDEN
      // 0.78 keeps the outermost ring inside the disc's own edge, so a cluster
      // reads as a filled shape rather than as dots on a boundary.
      const r = disc.r * 0.78 * Math.sqrt((i + 0.5) / n)
      placed.push({ ...node, x: disc.x + r * Math.cos(a), y: disc.y + r * Math.sin(a) })
    })
  }
  return { discs: looseCount ? [...discs, loose] : discs, placed }
}

/** Hubs before sources, so phyllotaxis puts them at the middle. */
const rank = (n: ShapeNode) => (n.kind === "app" || n.kind === "sprint" ? 0 : 1)

/** IS THIS DISC A NAMED ACCOUNT? The one question the colour and the label both
 * ask, and neither may ask it as `d.id ? …` — the agency's own cluster has a real
 * identity and an empty id, so truthiness answers "no" about a group that is
 * really there. Both the agency's material and the unclustered field take the
 * neutral and carry no label; only an account earns a colour from the series. */
const isAccount = (d: PlacedCluster) => d.id !== "" && d.id !== LOOSE

/* ------------------------------- the colours ------------------------------ */

/** THE CHART SERIES, cycled — and the cycle is the honest shape rather than a
 * shortage worked around. `type-colours.ts` states the rule this obeys: a series
 * in this system needs a direct label, a pattern or a shape as well as its
 * colour, because forest and poppy differ in luminance by a ratio of 1.00. So
 * colour here separates NEIGHBOURS — the spiral places clusters in size order,
 * and five colours mean two touching discs are never the same one — and it
 * never IDENTIFIES. What identifies a cluster is its name, on the disc and again
 * in the list below, which is where a reader actually reads it. */
const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

/** The agency's own material, and anything the door left unclustered. Tertiary
 * ink rather than a sixth colour, for `type-colours.ts`'s own reason: the point
 * of the neutral is that it is NOT one of the series. */
const NEUTRAL = "var(--ink-tertiary)"

/* ------------------------------- the control ------------------------------ */

export function KnowledgeShape({
  teamId,
  clusters,
  nodes,
  links,
  total,
  drawn,
  capped,
  clustered,
}: {
  teamId: string
  clusters: ShapeCluster[]
  nodes: ShapeNode[]
  links: ShapeLink[]
  total: number
  drawn: number
  capped: boolean
  clustered: boolean
}) {
  const t = useT()
  const { discs, placed } = React.useMemo(() => layout(clusters, nodes), [clusters, nodes])
  const at = React.useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed])
  const colour = React.useMemo(() => {
    const m = new Map<string, string>()
    discs.forEach((d, i) => m.set(d.id, isAccount(d) ? SERIES[i % SERIES.length] : NEUTRAL))
    return m
  }, [discs])

  // THE WINDOW ONTO THE LAYOUT — zoom and pan as a viewBox, so the coordinates
  // above never move and the picture cannot drift out of agreement with itself.
  // The same seam `relationship-map.tsx` uses, at a different scale.
  const [view, setView] = React.useState({ x: 0, y: 0, z: 1 })
  // THE PAN MUST NOT EAT THE CLICK, and the obvious spelling of a pan does
  // exactly that. `relationship-map.tsx` captures the pointer on pointerDOWN,
  // which is correct there because nothing inside its SVG is clickable — here it
  // meant every node swallowed its own tap: the capture redirects all subsequent
  // pointer events to the SVG, so the `<g>` underneath never sees the release and
  // `onClick` never fires. Measured, not reasoned about: a scripted click on a hub
  // left the URL exactly where it was.
  //
  // So the capture is DEFERRED until the pointer has actually travelled. Under
  // the threshold it is a click and the node gets it; over the threshold it is a
  // pan and the SVG takes the pointer for the rest of the gesture. `panned` then
  // survives to the click event, because a drag that ENDS on a node would
  // otherwise open it — releasing the mouse after moving the picture is not a
  // request to go somewhere.
  const drag = React.useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const panned = React.useRef(false)
  /** A press that never travelled. The one question every node asks before it
   * navigates. */
  const wasATap = () => !panned.current
  const reset = () => setView({ x: 0, y: 0, z: 1 })
  const zoom = (by: number) =>
    setView((v) => ({ ...v, z: Math.min(6, Math.max(0.6, Number((v.z + by).toFixed(2)))) }))
  const box = `${view.x} ${view.y} ${W / view.z} ${H / view.z}`

  const hrefFor = (table: string, id: string) =>
    RECORD_PATH[table] ? `/t/${teamId}/${RECORD_PATH[table]}/${id}` : null

  if (nodes.length === 0)
    return <CollectionEmptyState title={t("Nothing in the knowledge base yet.")} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{t("{count} sources", { count: String(total) })}</Badge>
        {capped && (
          // SAID, NEVER SILENT — and it says which half is the sample. Every
          // cluster is sized by its TRUE total, so the picture's shape is right
          // even where its dots are a selection.
          <span className="text-muted-foreground text-xs">
            {t("Drawing the {drawn} most recently touched. Every group is sized by its full count.", {
              drawn: String(drawn),
            })}
          </span>
        )}
        {!clustered && (
          // The aggregation fence, out loud. Without this the picture looks like
          // a knowledge base nobody has filed, which is a different — and
          // false — statement about the data.
          <span className="text-muted-foreground text-xs">
            {t("Grouping by account is off, because you cannot open accounts.")}
          </span>
        )}
        <div className="ms-auto flex items-center gap-1">
          <Button variant="secondary" size="icon" aria-label={t("Zoom out")} onClick={() => zoom(-0.4)}>
            <Minus className="size-4" />
          </Button>
          <Button variant="secondary" size="icon" aria-label={t("Zoom in")} onClick={() => zoom(0.4)}>
            <Plus className="size-4" />
          </Button>
          <Button variant="secondary" size="icon" aria-label={t("Fit the whole map")} onClick={reset}>
            <ArrowsOut className="size-4" />
          </Button>
        </div>
      </div>

      <div className="bg-muted rounded-[var(--radius)] overflow-hidden">
        <svg
          viewBox={box}
          className="h-[34rem] w-full touch-none"
          role="img"
          aria-label={t("A map of the whole knowledge base, grouped by account")}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, moved: false }
            panned.current = false
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d) return
            if (!d.moved) {
              // Four pixels of slop, so a steady hand on a trackpad still counts
              // as a tap. Below it nothing has happened yet and the pointer is
              // left alone; at it, the gesture becomes a pan and takes the
              // pointer for the rest of its life.
              if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 4) return
              d.moved = true
              panned.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
            }
            const dx = ((e.clientX - d.x) * W) / (e.currentTarget.clientWidth * view.z)
            const dy = ((e.clientY - d.y) * H) / (e.currentTarget.clientHeight * view.z)
            d.x = e.clientX
            d.y = e.clientY
            setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }))
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {/* THE CLUSTER GROUNDS, under everything. A wash rather than an
              outline: the brand allows no border, so a group is a filled shape
              at low opacity and separation is colour, exactly as the kit's own
              components do it. */}
          {discs.map((d) => (
            <circle
              key={`disc-${d.id || "loose"}`}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill={colour.get(d.id) ?? NEUTRAL}
              opacity={0.14}
            />
          ))}
          {links.map((l, i) => {
            const a = at.get(l.from)
            const b = at.get(l.to)
            if (!a || !b) return null
            return (
              <line
                key={`${l.from}-${l.to}-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--hair-strong)"
                strokeWidth={0.8}
              />
            )
          })}
          {placed.map((n) => {
            const isHub = n.kind === "app" || n.kind === "sprint"
            const href = hrefFor(n.table, n.recordId)
            return (
              <g
                key={n.id}
                // R37: the interception is inline. Not an anchor, because an
                // HTML anchor is not what an SVG shape is, and the list below
                // carries the real links for anyone navigating by them.
                role={href ? "link" : undefined}
                tabIndex={href ? 0 : undefined}
                className={href ? "cursor-pointer" : undefined}
                onClick={() => href && wasATap() && softNavigate(href)}
                onKeyDown={(e) => {
                  if (href && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    softNavigate(href)
                  }
                }}
              >
                <title>{n.label}</title>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isHub ? 7 : 3.4}
                  fill={colour.get(n.cluster) ?? NEUTRAL}
                  // The kit's avatar-ring cut-out: the ring matches the surface
                  // it sits on, which here is the panel's own `--muted`, not the
                  // page. `relationship-map.tsx` carries the measurement.
                  stroke="var(--muted)"
                  strokeWidth={isHub ? 2 : 1}
                />
              </g>
            )
          })}
          {/* THE NAMES, on the groups big enough to carry one. A label on all
              hundred and thirty-four is unreadable at rest and the list below
              already names every one of them — so the picture labels what the
              eye has already picked out, and the words live where words are
              read. */}
          {discs
            .filter((d) => isAccount(d) && d.r > 60)
            .map((d) => (
              <text
                key={`label-${d.id}`}
                x={d.x}
                y={d.y - d.r - 8}
                textAnchor="middle"
                className="fill-foreground text-[15px]"
              >
                {d.label.length > 24 ? `${d.label.slice(0, 23)}…` : d.label}
              </text>
            ))}
        </svg>
      </div>

      {/* THE SAME PICTURE, AS SENTENCES — and the half that answers the question
          in words. Biggest first, every account named with its TRUE count, so
          "who are we dense on, and who do we know nothing about" is readable
          rather than inferred from the size of a circle. One payload, two
          renderings; no second query and no second fence. */}
      {clusters.length === 0 ? (
        <CollectionEmptyState title={t("Nothing is filed under an account yet.")} />
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {clusters.map((c) => {
            // NAMED `inAppRecordHref` deliberately: it is the same app-built
            // /t/<team>/<segment>/<id> path from the same fixed segment table
            // that `relationship-map.tsx` binds, and `rich-text.test.ts` already
            // carries one reason for that construction. One reason, both call
            // sites — a second entry saying the same thing is a second thing to
            // keep true.
            const inAppRecordHref = c.id ? hrefFor("accounts", c.id) : null
            return (
              <li key={c.id || "agency"} className="text-muted-foreground">
                {inAppRecordHref ? (
                  <InAppLink href={inAppRecordHref} className="text-foreground underline underline-offset-2">
                    {c.label}
                  </InAppLink>
                ) : (
                  <span className="text-foreground">{c.label || t("The agency")}</span>
                )}{" "}
                {t("{count} sources", { count: String(c.total) })}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
