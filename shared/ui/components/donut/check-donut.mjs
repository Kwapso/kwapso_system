#!/usr/bin/env node
/* ============================================================================
   THE DONUT CHECK — pins Aurora's 23 Sep 2026 ruling, and the kit gap that
   ruling exposed, against every way either could come back. Run by
   `npm run check` beside the other `check-*.mjs` component pins.

   THE RULING, VERBATIM: "make the where as a donut graphic (when hover
   show)."

   WHAT WAS WRONG. `donut.tsx` drew the ring INSIDE itself and exposed no way
   in or out: no per-segment callback, no active-segment prop, and its own
   state table said hover was "switched off here" and the SVG "is not
   focusable". So the consuming application answered her ruling by drawing a
   SECOND legend of its own — real `<button>`s under a `HoverCard`, beside a
   `legend={false}` ring — and restating this file's private `SEGMENT_COLOURS`
   sequence by hand so the two keyed alike. That is an app-side patch of a kit
   gap, which the standing rule (the kit is the only UI input) makes a defect
   HERE.

   WHAT THIS CHECK GUARDS, IN THE ORDER IT GUARDS IT

     1 · THE CONTROLLED/UNCONTROLLED RESOLUTION is `activeId !== undefined` —
         the PRESENCE of the prop, so `activeId={null}` is a real controlled
         answer ("nothing is active") and not a fall-through into this
         component's own state.
     2 · THE RING ANSWERS THE POINTER — `<Pie>` carries recharts' own
         `onMouseEnter`/`onMouseLeave` and both route through `activate`.
     3 · THE ROW ANSWERS THE POINTER *AND* THE KEYBOARD — every legend row is
         a real `<button type="button">` carrying `onPointerEnter`,
         `onPointerLeave`, `onFocus` and `onBlur`, all four through the same
         `activate`, with the whole readout as its accessible name. A donut
         nobody can reach by keyboard is not finished, and an accessible name
         that said less than the pointer reveals would hand a screen reader a
         smaller picture.

   SECTIONS 4 AND 5 MOUNT IT FOR REAL, and that is the point of them. A static
   pin can prove a line exists; only a render proves the line works — the
   lesson `check-badge.mjs` §6 records from the day four green static pins sat
   over an `asChild` that threw. There is no jsdom or testing-library in this
   repository, so:

     · SECTION 4 renders through vite SSR + `react-dom/server`, exactly
       `check-badge.mjs` §6's loader, and reads the HTML back: what is printed
       at rest, what a controlled `activeId` prints, what `figures="always"`
       still prints (no existing caller moved), and that `interactive={false}`
       draws no control at all.
     · SECTION 5 RUNS THE STATE MACHINE. `Donut` is a `forwardRef`, so its
       `.render(props, ref)` can be called from inside a probe component's own
       render — the hooks then resolve against the PROBE's slots, and a call
       to one of the captured handlers is a render-phase state update on the
       probe, which React answers by rendering it again. So the pointer enter,
       the focus, the pointer leave, the blur and the ring's own sector enter
       are each CALLED FOR REAL and the tree is read back afterwards. That is
       a genuine run of the same handlers the browser calls, without a DOM.

   THE BOOK IS THE DOM-MEASURED COUNTERPART, and it was measured before any of
   this was believed. `demo/collections/data-viz.tsx`'s donut section draws the
   `figures="active"` reading; run `npm run dev`, open `#/charts/circular`, and
   in the preview frame:

     · at rest, row 2 of that donut reads "In review" and its own
       `aria-label` reads "In review · 29% · 29h" — the figure is in the NAME
       and not on the screen;
     · a real `mouseover` on `path.recharts-sector[1]` puts `data-active` on
       that row, prints "In review 29% 29h" and paints it `--surface-quiet`
       (measured: `rgb(58, 56, 51)` in dark, `rgb(226, 221, 212)` in light,
       label 6.66:1 and figure 4.86:1 against it) — so recharts really does
       call the sector handler;
     · `focusin` on a row does the same and `focusout` puts it back;
     · the legend's own dot does not move between the two states (measured at
       x = 182 in both), because the row's padding is paid back by an equal
       negative margin — only the column's width grows, 63 to 123, as the
       figures arrive.
   ========================================================================= */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, "donut.tsx");
const KIT_ROOT = path.resolve(HERE, "..", "..");
const rel = path.relative(KIT_ROOT, FILE).split(path.sep).join("/");

const src = fs.readFileSync(FILE, "utf8");
const findings = [];

/* Comments carry the WORDS this check looks for ("activeId !== undefined",
   "onPointerEnter") in prose, so every static section reads the code with the
   comments stripped rather than matching the file's own explanation of
   itself. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
const code = stripComments(src);

/* ── 1 · THE RESOLUTION IS THE PROP'S PRESENCE ───────────────────────────── */
if (!/const\s+controlled\s*=\s*activeId\s*!==\s*undefined\s*;/.test(code)) {
  findings.push(
    `${rel}: the controlled/uncontrolled resolution is not \`activeId !== undefined\` — ` +
      "a call site that passes `activeId={null}` must own the value (nothing active), " +
      "not fall through into this component's own state.",
  );
}
if (!/const\s+active\s*=\s*controlled\s*\?\s*activeId\s*:\s*ownActive\s*;/.test(code)) {
  findings.push(
    `${rel}: the active segment is no longer \`controlled ? activeId : ownActive\` — ` +
      "one of the two paths (the call site's, or this component's own) has been dropped.",
  );
}
if (!/if\s*\(\s*!controlled\s*\)\s*setOwnActive\(next\)\s*;/.test(code)) {
  findings.push(
    `${rel}: \`activate\` no longer writes its own state only when uncontrolled — ` +
      "either the uncontrolled path stopped working or a controlled call site's value is being overwritten.",
  );
}
if (!/onActiveChange\?\.\(next\)\s*;/.test(code)) {
  findings.push(`${rel}: \`activate\` no longer reports through \`onActiveChange\`.`);
}

/* ── 2 · THE RING ANSWERS THE POINTER ────────────────────────────────────── */
const pieStart = code.indexOf("<Pie");
const pieEnd = code.indexOf("</Pie>", pieStart);
if (pieStart === -1 || pieEnd === -1) {
  findings.push(`${rel}: could not find the \`<Pie>\` element to read its handlers from.`);
} else {
  const pie = code.slice(pieStart, pieEnd);
  for (const handler of ["onMouseEnter", "onMouseLeave"]) {
    if (!pie.includes(handler)) {
      findings.push(
        `${rel}: \`<Pie>\` no longer carries ${handler} — pointing at the RING would stop ` +
          "activating its segment, which is the half of her ruling the app could not reach.",
      );
    }
  }
  if (!/activate\(segments\[index\]\?\.id/.test(pie)) {
    findings.push(
      `${rel}: the ring's own pointer enter no longer activates \`segments[index]\` — ` +
        "the sector and its row would name different segments.",
    );
  }
  if (!/operable\s*\n?\s*\?/.test(pie) && !/operable\s*\?/.test(pie)) {
    findings.push(`${rel}: \`<Pie>\`'s handlers are not gated on \`operable\` — an inert picture would still report.`);
  }
}

/* ── 3 · THE ROW IS A REAL CONTROL, POINTER AND KEYBOARD ─────────────────── */
const rowStart = code.indexOf('data-slot="donut-segment"\n                  data-active');
const buttonStart = code.lastIndexOf("<button", rowStart === -1 ? code.length : rowStart);
const buttonEnd = code.indexOf("</button>", buttonStart === -1 ? 0 : buttonStart);
if (buttonStart === -1 || buttonEnd === -1) {
  findings.push(`${rel}: the legend row is no longer rendered as a \`<button>\` — the keyboard route is gone.`);
} else {
  const button = code.slice(buttonStart, buttonEnd);
  for (const handler of ["onPointerEnter", "onPointerLeave", "onFocus", "onBlur"]) {
    if (!button.includes(handler)) {
      findings.push(
        `${rel}: the legend row no longer carries ${handler} — ` +
          (handler === "onFocus" || handler === "onBlur"
            ? "the KEYBOARD stops activating a segment, and a donut nobody can reach by keyboard is not finished."
            : "the pointer stops activating a segment from the legend side."),
      );
    }
  }
  if (!/aria-label=\{readoutFor\(/.test(button)) {
    findings.push(
      `${rel}: the legend row's accessible name is no longer its whole readout — ` +
        "a screen reader would be told less than the pointer reveals.",
    );
  }
  if (/tabIndex/.test(button)) {
    findings.push(
      `${rel}: the legend row sets its own tabIndex — every segment is its own tab stop here ` +
        "(`sankey.tsx`'s arrangement); a roving stop would hide segments from the keyboard.",
    );
  }
}
if (!/const\s+printFigures\s*=\s*figures\s*===\s*"always"\s*\|\|\s*isActive\s*;/.test(code)) {
  findings.push(
    `${rel}: the figure gate is no longer \`figures === "always" || isActive\` — ` +
      'either every caller\'s resting drawing moved, or `figures="active"` stopped revealing anything.',
  );
}

/* ── 4 · MOUNTED: WHAT IS PRINTED, AND WHEN ──────────────────────────────
   vite SSR + `react-dom/server`, `check-badge.mjs` §6's own loader. */
const SEGMENTS = [
  { id: "open", label: "Open", value: 50 },
  { id: "done", label: "Done", value: 30 },
  { id: "held", label: "Held", value: 20 },
];
const HOURS = (v) => `${String(v)}h`;

let DonutComponent = null;
let React = null;
let renderToStaticMarkup = null;
let server = null;

try {
  const [vite, react, dom] = await Promise.all([
    import("vite"),
    import("react"),
    import("react-dom/server"),
  ]);
  React = react;
  renderToStaticMarkup = dom.renderToStaticMarkup;
  server = await vite.createServer({
    root: KIT_ROOT,
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  ({ Donut: DonutComponent } = await server.ssrLoadModule("/" + rel));
} catch (e) {
  findings.push(
    `${rel}: sections 4 and 5 could not load <Donut> at all (${e instanceof Error ? e.message : String(e)}) — ` +
      "the hover contract is unproven; fix the loader before trusting the static pins above.",
  );
}

if (DonutComponent && React && renderToStaticMarkup) {
  const h = React.createElement;
  const html = (name, props) => {
    try {
      return renderToStaticMarkup(h(DonutComponent, props));
    } catch (e) {
      findings.push(`${rel}: rendering <Donut> "${name}" THREW — ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  };
  /* The rows, as HTML, in DOM order. One per segment whether it is drawn as a
     button or as a plain line. */
  const rows = (markup) => [...markup.matchAll(/<(button|span)[^>]*data-slot="donut-segment"[^>]*>[\s\S]*?<\/\1>/g)].map((m) => m[0]);

  // a. AT REST, UNDER `figures="active"` — the picture reads, the figure does not.
  const rest = html("figures=active, at rest", {
    data: SEGMENTS,
    figures: "active",
    formatValue: HOURS,
    label: "Ticket status split",
  });
  if (rest !== null) {
    for (const s of SEGMENTS) {
      if (!rest.includes(`>${s.label}<`)) {
        findings.push(`${rel}: at rest the legend does not print "${s.label}" — the picture must READ whole at rest.`);
      }
    }
    if (/>\d+%</.test(rest)) {
      findings.push(
        `${rel}: a percentage is printed at rest under figures="active" — her ruling is "(when hover show)": ` +
          `${/>\d+%</.exec(rest)?.[0] ?? ""}`,
      );
    }
    if (/>\d+h</.test(rest)) {
      findings.push(`${rel}: a value is printed at rest under figures="active" — her ruling is "(when hover show)".`);
    }
    const restRows = rows(rest);
    if (restRows.length !== SEGMENTS.length) {
      findings.push(`${rel}: expected ${String(SEGMENTS.length)} legend rows at rest, read ${String(restRows.length)}.`);
    }
    for (const row of restRows) {
      if (!row.startsWith("<button")) {
        findings.push(`${rel}: a legend row is not a <button> — there is no keyboard route to that segment: ${row}`);
      }
      if (!/aria-label="[^"]*%[^"]*"/.test(row)) {
        findings.push(
          `${rel}: a legend row's accessible name carries no figure while the row prints none — ` +
            `a screen reader would get LESS than the pointer reveals: ${row}`,
        );
      }
      if (/data-active/.test(row)) {
        findings.push(`${rel}: a row is already active at rest with no defaultActiveId: ${row}`);
      }
    }
  }

  // b. CONTROLLED — the call site's `activeId` owns which row is active.
  const controlledMarkup = html("controlled activeId=done", {
    data: SEGMENTS,
    figures: "active",
    formatValue: HOURS,
    activeId: "done",
  });
  if (controlledMarkup !== null) {
    const activeRows = rows(controlledMarkup).filter((r) => /data-active/.test(r));
    if (activeRows.length !== 1 || !activeRows[0]?.includes(">Done<")) {
      findings.push(
        `${rel}: controlled activeId="done" did not mark exactly the Done row active ` +
          `(${String(activeRows.length)} active rows).`,
      );
    }
    if (!activeRows[0]?.includes(">30h<") || !activeRows[0]?.includes(">30%<")) {
      findings.push(`${rel}: the active row prints no figures — the hover reveals nothing: ${activeRows[0] ?? ""}`);
    }
    const idle = rows(controlledMarkup).filter((r) => !/data-active/.test(r));
    for (const row of idle) {
      if (/>\d+(%|h)</.test(row)) findings.push(`${rel}: an INACTIVE row prints its figures: ${row}`);
    }
  }

  // c. `activeId={null}` IS A REAL ANSWER, and beats `defaultActiveId`.
  const nulled = html("controlled activeId=null over defaultActiveId", {
    data: SEGMENTS,
    figures: "active",
    formatValue: HOURS,
    defaultActiveId: "done",
    activeId: null,
  });
  if (nulled !== null && /data-active/.test(nulled)) {
    findings.push(
      `${rel}: activeId={null} did not win over defaultActiveId — passing the prop at all must hand the ` +
        "value to the call site, so a controlled donut cannot be forced active by its own default.",
    );
  }

  // d. UNCONTROLLED — the component's own state drives the same output path.
  const seeded = html("uncontrolled defaultActiveId=held", {
    data: SEGMENTS,
    figures: "active",
    formatValue: HOURS,
    defaultActiveId: "held",
  });
  if (seeded !== null) {
    const activeRows = rows(seeded).filter((r) => /data-active/.test(r));
    if (activeRows.length !== 1 || !activeRows[0]?.includes(">Held<")) {
      findings.push(`${rel}: uncontrolled defaultActiveId="held" did not render the Held row active.`);
    }
  }

  // e. THE DEFAULT DRAWING DID NOT MOVE — `figures="always"` prints at rest.
  const always = html("default figures", { data: SEGMENTS, formatValue: HOURS });
  if (always !== null) {
    for (const percent of [">50%<", ">30%<", ">20%<"]) {
      if (!always.includes(percent)) {
        findings.push(
          `${rel}: the DEFAULT donut stopped printing ${percent} at rest — chapter 18's own drawing, and ` +
            "every existing call site, would move.",
        );
      }
    }
  }

  // f. `interactive={false}` — the picture, inert.
  const inert = html("interactive=false", { data: SEGMENTS, interactive: false });
  if (inert !== null) {
    if (/<button/.test(inert)) findings.push(`${rel}: interactive={false} still draws a control.`);
    if (rows(inert).length !== SEGMENTS.length) {
      findings.push(`${rel}: interactive={false} lost the legend rows themselves.`);
    }
  }

  /* ── 5 · THE STATE MACHINE, RUN FOR REAL ──────────────────────────────
     See this file's header. The probe calls `Donut.render` inside its own
     render, so the component's hooks live in the probe's slots and calling a
     captured handler is a render-phase update React answers by rendering the
     probe again. Every handler below is the same function the browser calls. */
  const walk = (node, out) => {
    if (Array.isArray(node)) {
      for (const n of node) walk(n, out);
      return out;
    }
    if (!node || typeof node !== "object" || !("props" in node)) return out;
    out.push(node);
    walk(node.props?.children, out);
    return out;
  };

  /** Render the donut with `props`, optionally firing one handler on the first
   *  pass, and hand back the element tree as it stands afterwards. */
  const drive = (name, props, fire) => {
    let tree = null;
    let pass = 0;
    const Probe = () => {
      pass += 1;
      tree = DonutComponent.render(props, null);
      if (pass === 1 && fire) fire(walk(tree, []));
      return null;
    };
    try {
      renderToStaticMarkup(h(Probe));
    } catch (e) {
      findings.push(`${rel}: driving <Donut> "${name}" THREW — ${e instanceof Error ? e.message : String(e)}`);
      return { nodes: [], passes: pass };
    }
    return { nodes: walk(tree, []), passes: pass };
  };

  const rowNodes = (nodes) => nodes.filter((n) => n.props?.["data-slot"] === "donut-segment");
  const activeIds = (nodes) =>
    rowNodes(nodes)
      .filter((n) => n.props?.["data-active"] !== undefined)
      .map((n) => n.props?.["aria-label"] ?? "");
  const pieNode = (nodes) => nodes.find((n) => n.props?.dataKey === "value");

  const base = { data: SEGMENTS, figures: "active", formatValue: HOURS };

  // 5a. HOVER BY POINTER, on the legend row — uncontrolled, for real.
  {
    const reported = [];
    const run = drive("pointer enter on a row", { ...base, onActiveChange: (id) => reported.push(id) }, (nodes) => {
      rowNodes(nodes)[1].props.onPointerEnter();
    });
    if (run.passes < 2) {
      findings.push(`${rel}: a pointer enter on a legend row did not re-render the donut — nothing would change on hover.`);
    }
    if (reported.join(",") !== "done") {
      findings.push(`${rel}: a pointer enter on the Done row reported [${reported.join(",")}] instead of "done".`);
    }
    const marked = activeIds(run.nodes);
    if (marked.length !== 1 || !marked[0].startsWith("Done")) {
      findings.push(
        `${rel}: after a REAL pointer enter, the active row is [${marked.join(" | ")}] — expected the Done row alone.`,
      );
    }
    if (!marked[0]?.includes("30h") || !marked[0]?.includes("30%")) {
      findings.push(`${rel}: the row activated by the pointer carries no figure in its name: ${marked[0] ?? ""}`);
    }
  }

  // 5b. HOVER BY KEYBOARD — the same, through focus.
  {
    const reported = [];
    const run = drive("focus on a row", { ...base, onActiveChange: (id) => reported.push(id) }, (nodes) => {
      rowNodes(nodes)[2].props.onFocus();
    });
    if (reported.join(",") !== "held") {
      findings.push(`${rel}: focusing the Held row reported [${reported.join(",")}] instead of "held".`);
    }
    const marked = activeIds(run.nodes);
    if (marked.length !== 1 || !marked[0].startsWith("Held")) {
      findings.push(
        `${rel}: after a REAL focus, the active row is [${marked.join(" | ")}] — a keyboard must reach exactly ` +
          "what a pointer reaches.",
      );
    }
  }

  // 5c. THE RING ITSELF — recharts' own sector enter.
  {
    const reported = [];
    const run = drive("pointer enter on a ring sector", { ...base, onActiveChange: (id) => reported.push(id) }, (nodes) => {
      const pie = pieNode(nodes);
      if (!pie?.props?.onMouseEnter) {
        findings.push(`${rel}: the ring carries no onMouseEnter — hovering the RING would do nothing.`);
        return;
      }
      pie.props.onMouseEnter({}, 0);
    });
    if (reported.join(",") !== "open") {
      findings.push(`${rel}: a pointer on ring sector 0 reported [${reported.join(",")}] instead of "open".`);
    }
    const marked = activeIds(run.nodes);
    if (marked.length !== 1 || !marked[0].startsWith("Open")) {
      findings.push(
        `${rel}: pointing at the RING did not light its own legend row (active: [${marked.join(" | ")}]) — ` +
          "the sector and the row must be one segment.",
      );
    }
  }

  // 5d. LEAVING PUTS IT BACK — pointer leave and blur both clear.
  for (const [name, index, handler] of [
    ["pointer leave", 1, "onPointerLeave"],
    ["blur", 1, "onBlur"],
  ]) {
    const reported = [];
    const run = drive(name, { ...base, defaultActiveId: "done", onActiveChange: (id) => reported.push(id) }, (nodes) => {
      rowNodes(nodes)[index].props[handler]();
    });
    if (reported.length !== 1 || reported[0] !== null) {
      findings.push(`${rel}: ${name} reported [${reported.join(",")}] instead of null — the figure would never go away.`);
    }
    if (activeIds(run.nodes).length !== 0) {
      findings.push(`${rel}: ${name} left a row active — the donut never returns to rest.`);
    }
  }

  // 5e. CONTROLLED — it REPORTS but does not move itself.
  {
    const reported = [];
    const run = drive(
      "controlled: a row reports but does not take the value",
      { ...base, activeId: "open", onActiveChange: (id) => reported.push(id) },
      (nodes) => {
        rowNodes(nodes)[2].props.onPointerEnter();
      },
    );
    if (reported.join(",") !== "held") {
      findings.push(`${rel}: a controlled donut did not report the hovered segment ([${reported.join(",")}]).`);
    }
    const marked = activeIds(run.nodes);
    if (marked.length !== 1 || !marked[0].startsWith("Open")) {
      findings.push(
        `${rel}: a controlled donut moved its own active segment (active: [${marked.join(" | ")}], expected Open) — ` +
          "the call site owns it, and an outside legend would fight the ring.",
      );
    }
  }

  // 5f. RE-ENTERING THE SAME SEGMENT SAYS NOTHING TWICE.
  {
    const reported = [];
    drive("re-enter the active segment", { ...base, defaultActiveId: "done", onActiveChange: (id) => reported.push(id) }, (nodes) => {
      rowNodes(nodes)[1].props.onPointerEnter();
    });
    if (reported.length !== 0) {
      findings.push(
        `${rel}: re-entering the already-active segment reported [${reported.join(",")}] — an outside legend ` +
          "would be sprayed with the answer it already has.",
      );
    }
  }
}

if (server) await server.close();

if (findings.length > 0) {
  console.error("FAIL donut check:\n" + findings.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "OK donut check: the active segment resolves on the PRESENCE of `activeId` (so `null` is a real controlled " +
    "answer), `activate` writes its own state only when uncontrolled and reports through `onActiveChange` either " +
    "way, the ring carries recharts' own onMouseEnter/onMouseLeave gated on `operable`, and every legend row is a " +
    "real <button> carrying onPointerEnter/onPointerLeave/onFocus/onBlur with its whole readout as its accessible " +
    "name and no tabIndex of its own. MOUNTED through vite SSR + react-dom/server: under figures=\"active\" the " +
    "resting picture prints every label and NO figure while each row's name still carries one; a controlled " +
    "activeId marks exactly its own row and prints its figures there alone; activeId={null} beats " +
    "defaultActiveId; defaultActiveId drives the uncontrolled render; the DEFAULT donut still prints every " +
    "percentage at rest (no existing call site moved); and interactive={false} draws rows but no control. DRIVEN " +
    "FOR REAL (the component's own handlers called inside a probe's render, React re-rendering on the state " +
    "update): a pointer enter on a row, a FOCUS on a row, and a pointer enter on a RING SECTOR each activate " +
    "exactly that segment and report it; pointer leave and blur each clear it; a controlled donut reports without " +
    "moving; and re-entering the active segment reports nothing.",
);
