/* ============================================================================
   FileUpload — the drop zone and the list of what was dropped (8 direct call
   sites).

   DESIGN SOURCE
   CH16 · "Filters, search, upload" — the artifact DRAWS this. The header used
   to open "The kit draws NO file upload … there is no dashed rule anywhere in
   the system to borrow", and both halves are false against the 2026-08-23
   artifact: CH16 draws a `Dropzone` block and an `Upload list` block, and its
   declaration set contains the system's one and only `border: 1px dashed
   var(--hair2)`. GAPS-C.md FUP-1 was written against the older reading and is
   superseded for the zone's own skin; the parts it assembled that the artifact
   does NOT draw (the browse control, the per-file error message) still stand.
     · the box — `--radius` (24), card fill, and a 1px DASHED `--hair-strong`
       edge, all three CH16's own (`padding: 32px 24px`, `gap: 8px`,
       `border: 1px dashed var(--hair2)`).
     · the drag-over wash — `.motion-drop-target[data-over="true"]` from
       motion/motion.css, which is already `--accent`, the neutral row/item
       wash. Nothing new is defined here.
     · the rows — CH16's own "Upload list", one `--card` box per file at the
       24 radius, `padding: 14px 16px`. Three registers, drawn as the chapter
       draws them (client re-audit 2026-08-26, "reference to the pdf"):
         uploading — name beside a tabular percentage, a 4px `Progress` bar
                     under them (charcoal fill on the quiet track);
         done      — an 8px forest dot, the name, the size, and `Remove`
                     as a WORD at the badge step in tertiary ink;
         error     — an 8px poppy dot, the name with the failure INLINE in
                     tertiary ink, and `Retry` as the same word-action.
       The word-actions are `Button variant="link"` — the archive's Restore
       precedent: "one word, no button". The old drawing (a `FileText` glyph
       on the faint fill, a ghost icon ×, the error as a field message under
       the name) was the build's own and is gone; the artifact draws none of
       it. SUPERSEDED FOR ROWS BY OPTION B, below — the row list only draws
       any more while the zone is empty; the moment a file lands, this
       section's geometry belongs to the tile grid instead.

   THE LAW THIS FILE OBEYS
   · THE ZONE'S EDGE IS THE ONE `border` PROPERTY IN `primitives/`, because it
     is the one DASHED stroke the artifact draws and a dash cannot be an inset
     shadow. Everything else in this file — and every other edge in the system
     — is still an inset shadow (review 1A · fix 2). A BUTTON still carries no
     edge at all, which is why the browse control is a real `Button` and not an
     outlined box. THE ADD TILE BELOW (Option B) is the same reasoning applied
     a second time: it is a plain `<button>` ELEMENT, never the kit's `Button`
     component, precisely because it needs the edge `Button` refuses to carry.
   · Disabled is a fill and an ink (`--hair-faint` / `--ink-disabled`), never
     an opacity, and the hover shift is suppressed.
   · Error is the 65% poppy hairline chapter 9 states, through `color-mix` so
     dark re-resolves to poppy-lift — the same expression `input.tsx` uses.
     The MESSAGE stays ink; poppy is the hairline and the dot. A FAILED TILE
     (Option B) reuses the exact same expression as `--hairline-error`, an
     inset shadow rather than a second dashed edge — a file tile is not a drop
     target, so it never borrows the zone's one `border`.
   · Focus is ONE global rule (tokens.css §8). The zone defines no ring; the
     file input inside it is visually hidden but NOT display:none, so it stays
     focusable and the global rule can reach it. The Add tile and each tile's
     hover remove control are plain focusable elements for the same rule to
     reach — neither defines a ring of its own.
   · Every user-facing string is a prop with a default.
   · No new colour and no new radius anywhere in this file, Option B included:
     every fill is a token already spent above (`--card`, `--surface-quiet`,
     `--destructive`), and every rounded corner is `--radius`, the one this
     file has always taken.

   OPTION B — THE ZONE BECOMES A TILE (client ruling, 17 Sep 2026, verbatim)
   *"I like the status when it's empty, like 'Drop files here' or 'Choose.'
   That really works, but when I already drop something, I don't like that
   what I dropped is so small and the other remains the same big. … My goal
   would be that the 'Drop files' becomes smaller and that I can really see
   the images that I have already uploaded. They don't show only as the name,
   but I also see the image itself, or, if it's a document, a preview."* Then,
   choosing among the drawings this put in front of her: *"upload zone option
   B."* Option B is "the zone becomes a tile":

     · EMPTY — UNCHANGED. `rows.length === 0` renders exactly the box CH16
       draws and this file already built: the well, the prompt, the browse
       control, the hint. Nothing above moved.
     · ONE FILE LANDS — the SAME `data-slot="file-upload-zone"` element stops
       being the padded flex column and becomes a CSS grid instead: `grid-
       template-columns: repeat(auto-fill, minmax(5.5rem, 1fr))`, `gap-3`
       (`--space-3`, the token table's own "card grid gap" figure, spelled as
       Tailwind's default because the two already agree at 0.75rem). The zone
       stays the drop target — same four drag handlers, same element — it has
       just stopped drawing a box and started drawing a wall.

       `auto-fill`, never `auto-fit`, and that is the one CSS decision this
       whole redesign turns on. `auto-fit` collapses empty tracks and hands
       their space to whatever tiles exist, so two files in a wide zone would
       each stretch to fill half the row — which is the exact complaint
       restated in CSS ("what I dropped is so small and the other remains the
       same big" was the OLD list row's problem; a stretchy grid would trade
       it for a NEW one, tiles that balloon whenever there are few of them).
       `auto-fill` reserves the tracks a full-width row could hold whether or
       not a tile occupies them, so a tile is 5.5rem (88px) — the size the
       ruling asks for, "I can really see the images" — regardless of how many
       siblings it has.
     · THE ADD TILE is the dashed box's own next form, not a new control: same
       `state` (`default`/`error`/`disabled`), same edge classes
       (`ZONE_EDGE_CLASSES`, shared with the full-size zone so the two cannot
       drift into two different dashes), shrunk to one 5.5rem square and
       placed FIRST — top-left in reading order, which a CSS grid gives for
       free from DOM order and mirrors correctly under `dir="rtl"` without
       this file naming a side. `addLabel` ("Add") is a short caption INSIDE
       the tile, distinct from `browseLabel` ("Choose a file"), which is the
       empty zone's full-sentence button and would not fit an 88px square.
     · EVERY FILE IS A TILE. `preview`, given, draws the actual picture —
       `Image`, this file's existing sibling primitive, at its own default
       `fit="cover"` — filling the square exactly the way an avatar or a media
       card already does elsewhere in the kit; RULES.md's images law needs no
       exemption here because `cover` is already its default and this file
       asks for nothing else. No `preview`: the tile falls back to a
       `KIND_ICON` glyph on `--surface-quiet` (`Image`'s own placeholder
       ground) plus a small `Badge` type tag ("PDF", "XLS", …) — "a file-type
       icon tile with a small type tag," in the ruling's own vocabulary carried
       over from before this pass. `kind` is either given outright or derived
       from `type` (a MIME string, e.g. a picked `File`'s own `.type`) by
       `deriveKind`; with neither, a row honestly resolves to `"other"` rather
       than guessing from the file's name.
     · REMOVE IS AN "×" ON HOVER/FOCUS for a done or listed tile — `X` at the
       tile's top-right corner, `opacity-0` until `group-hover/tile` or
       `group-focus-within/tile`. This is a DELIBERATE departure from CH16's
       own "one word, no button" convention for the row list above, which
       still governs the empty-zone's browse control and every other word-
       action in this kit: an 88px square has no room to print "Remove," and
       the ruling's own drawing for Option B asks for the icon specifically.
       It does not reopen the row-list convention anywhere else.
     · UPLOADING draws the existing `Progress` bar — this file's only
       determinate-progress primitive, and the kit has no separate ring — laid
       across the tile's own bottom edge rather than beside a name there is no
       longer room to print a percentage next to. `formatProgress` still
       reaches assistive technology, through `Progress`'s own `formatValue`.
     · FAILED draws the poppy hairline (`--hairline-error`, the exact
       expression `input.tsx`'s own invalid state already spends) over the
       tile, and — because a hover-only "×" would hide the one action a failed
       file most needs — a visible `Retry` word beneath the caption, reusing
       the same fallback this file already had: no `onRetry` handed in, the
       word falls back to `removeLabel` so a dead file someone cannot re-send
       is still dismissible.
     · THE CAPTION is the file's `name`, one line, ellipsised, under the
       square — not beside it, the way the old row printed name and size on
       one line. Size is not printed in a tile: there is no room for a second
       line the ruling never asked to keep, and the file's own failure text
       (`file.error`, when it is a string) moves to the tile's native `title`
       instead of an inline sentence, so it is still reachable on hover/focus
       without costing the one line the caption owns.
     · READ-ONLY keeps its own law unchanged — "a system-set value loses its
       box" — except the box that goes away is now the Add tile and the drag
       handlers, not a whole zone: a read-only `FileUpload` with files still
       renders them as the SAME tile grid, just without `data-slot="file-
       upload-zone"`'s interactivity, because a client who cannot add or
       remove files can still be shown, at last, the pictures they already
       sent.

   RENDERING CONTEXT
   `"use client"`. Drag state, a ref to the hidden input, and four pointer
   handlers — unchanged by Option B, which only changes what the SAME zone
   element draws once `rows.length > 0`.
   ========================================================================= */

"use client";

import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { Button } from "../button/button";
import { Badge } from "../badge/badge";
import { Image } from "../image/image";
import { fieldErrorClasses } from "../field/field";
import { Progress } from "../progress/progress";
import {
  UploadSimple,
  Plus,
  X,
  File,
  FileImage,
  FilePdf,
  FileDoc,
  FileXls,
  FileZip,
  FileAudio,
  FileVideo,
  type IconComponent,
} from "../../foundations/icons";

/**
 * What kind of file a row is, for the tile grid's fallback icon and small
 * type tag when there is no `preview` — OPTION B, in the file header above.
 * A closed set rather than an open string: each one maps to exactly one
 * Phosphor glyph and one short type tag, and an unmatched or absent MIME
 * type both resolve honestly to `"other"` rather than guessing a label this
 * component has no grounds for.
 */
export type FileUploadFileKind =
  | "image"
  | "pdf"
  | "doc"
  | "sheet"
  | "archive"
  | "audio"
  | "video"
  | "other";

/** One row in the list under the zone — a row while the zone is empty, a tile
 *  the moment a file lands (OPTION B, in the file header above). */
export interface FileUploadItem {
  /** Stable key, and the handle `onRemove` / `onRetry` is called with. */
  id: string;
  /** What the row says. Comes from the file, so it is never translated. */
  name: string;
  /** Bytes. Rendered through `formatSize`; omit and the row shows no size. */
  size?: number;
  /**
   * This one file failed — too large, wrong type, the upload broke. CH16
   * draws it INLINE after the name in tertiary ink ("Shift-handover.docx
   * — unsupported format"), with the row's 8px dot going poppy. Setting it
   * puts the row in the `error` register whatever `status` says. A tile
   * (OPTION B) has no room for the sentence on its one caption line, so a
   * STRING `error` moves to the tile's native `title` instead — still
   * reachable on hover/focus, never lost.
   */
  error?: React.ReactNode;
  /**
   * How far up it is, 0–100. Defined and not yet failed, the row is the
   * `uploading` register: the tabular percentage beside the name and CH16's
   * 4px bar under them (or, once tiled, the same bar laid across the tile's
   * own bottom edge). Rendered through `formatProgress`.
   */
  progress?: number;
  /**
   * The row's register, when the caller wants to say it outright. Undefined
   * derives: `error` set → `error`; `progress` set → `uploading`; otherwise
   * a plain listed row — no dot, which is all a component can honestly draw
   * for a file it was only handed the name of. `done` adds CH16's forest dot.
   */
  status?: "uploading" | "done" | "error";
  /**
   * An image, or a rendered first page, to draw INSIDE the tile instead of a
   * generic file-type icon — the actual pixels the client asked for ("I also
   * see the image itself, or, if it's a document, a preview") rather than
   * only the name. A caller-supplied URL — an object URL for a picked image,
   * a thumbnail the server rendered for a PDF or a doc. This component never
   * creates one itself: it has no access to file bytes, only to what
   * `FileUploadItem` is handed. Ignored while the zone is still the empty
   * box (OPTION B never applies before the first file lands).
   */
  preview?: string;
  /**
   * The file's MIME type, straight off a picked `File`'s own `.type` —
   * `"image/png"`, `"application/pdf"`. Consulted ONLY to derive `kind` when
   * `kind` is not given directly; a row that states its own `kind` is never
   * second-guessed by this.
   */
  type?: string;
  /**
   * What kind of file this is, for the tile's fallback icon and small type
   * tag when there is no `preview`. Undefined derives from `type` (the MIME
   * type, through `deriveKind`); with neither set, the row falls back to
   * `"other"` — the generic file glyph — which is the honest answer for a
   * row this component was handed nothing to classify.
   */
  kind?: FileUploadFileKind;
}

/* THE DASHED EDGE, BY STATE — the one `border` property in `primitives/`
   (see the law above), shared VERBATIM between the full-size empty zone and
   the tile grid's own Add tile (OPTION B): shrinking the box down to a tile
   keeps the same dashed identity alive rather than inventing a second one.
   Read once here so the two cva blocks that spend it — `zoneVariants` and
   `addTileVariants` — cannot drift into two different dashes. */
const ZONE_EDGE_CLASSES = {
  default: [
    /* UPL-C1 — THE EDGE IS A 1px DASHED `--hair-strong`, AND IT IS A
       REAL `border`. Not a slip and not an extension of the pattern:
       `border: 1px dashed var(--hair2)` is a declaration the ARTIFACT
       ITSELF draws, in CH16, on this exact shape, alongside the
       `padding: 32px 24px` and the `gap: 8px` this file already takes
       from the same block. It is the only dashed declaration anywhere
       in the artifact's twenty-seven chapters, and p06 renders it.

       What this replaces is the reasoning, not just the class. The
       block used to read the no-border law as forbidding it, citing
       ch26's "the dashed '+ filter' slot is the only bordered control
       in the system". Two things are wrong with that citation. First,
       ch26 draws no border at all — the sentence is prose, and CH11,
       which actually draws `+ filter`, gives it no edge in any of its
       88 declarations. Second, a drop zone is not a control: it is a
       region, and the sentence ch26 writes is about controls. The one
       dashed stroke the artifact draws is this one.

       Dashed cannot be an inset shadow, so this is the single place in
       `primitives/` that writes a `border` property. The stroke is the
       token, not a literal: `--hair-strong` IS the artifact's
       `var(--hair2)`. */
    "border border-dashed border-[var(--hair-strong)] text-foreground",
    /* NO HOVER. The zone used to sit at 8% and promote to 20% on
       pointer, which is the same inversion override 42 removed from
       every field: 20% is the RESTING edge the artifact draws, and
       there is nowhere above it to go. CH16 draws this zone at rest and
       draws no hover for it. The next thing it does is state `over`. */
    // Over: the edge goes to ink. The fill is motion.css's. This is a
    // drag state, not a focus state.
    "data-[over=true]:border-[var(--foreground)]",
  ],
  /** Chapter 9's 65%, token-driven so dark re-resolves to poppy-lift.
   *  Spelled as the mix rather than as `--hairline-error`, because that
   *  token is an inset SHADOW and this edge has to be dashed; the
   *  expression is the token's own, so no second value exists. */
  error: [
    "border border-dashed",
    "border-[color-mix(in_srgb,var(--destructive)_65%,transparent)]",
    "text-foreground",
  ],
  /** A fill and an ink. Never looks droppable, so hover does not move. */
  disabled: [
    "cursor-not-allowed border border-dashed border-[var(--hair)]",
    "bg-hair-faint text-ink-disabled",
  ],
};

const zoneVariants = cva(
  [
    /* LEFT-ALIGNED, and never centred. CH16 draws the dropzone
       `display: flex; flex-direction: column; gap: 8px; align-items: flex-start`
       and writes no `text-align` on it at all. This block used to say
       `items-center justify-center text-center`, which is the same fault
       DEF-2 found on `CollectionRegister` and which 27.21 answers in one
       line — "left-aligned like everything else". A zone that centres its
       prompt also centres it against every left-aligned form it sits in.
       Audited 2026-08-23, GAPS-FIDELITY-BC UPL-B1. */
    "flex w-full flex-col items-start gap-2",
    // The box: 24 radius, 32 block / 24 inline inset (CH16's `32px 24px`),
    // card fill, one dashed edge. The fill moves with FLD-B5: the artifact
    // draws its surfaces on `var(--card)` and the two are identical in light,
    // so this is a dark-only correction — on the page tone the zone read as a
    // hole punched in the panel instead of as paper laid on it.
    "rounded-[var(--radius)] px-6 py-8 bg-card",
    "transition-[box-shadow,background-color,color]",
    "duration-[var(--duration-colour)] ease-kwapso",
    // motion.css owns the drag-over fill; this file writes no keyframe and no
    // duration of its own for it.
    "motion-drop-target",
  ],
  {
    /** Mutually exclusive. Resolved once, in JS, below. */
    variants: { state: ZONE_EDGE_CLASSES },
    defaultVariants: { state: "default" },
  },
);

/* addTileVariants — OPTION B's Add tile. The SAME `ZONE_EDGE_CLASSES` as the
   full-size empty zone, on a base shrunk to one 5.5rem grid cell instead of
   the 32×24 box — see the header's "OPTION B" section for why this is a
   plain `<button>` element and not the kit's `Button`. */
const addTileVariants = cva(
  [
    "relative flex aspect-square w-full flex-col items-center justify-center gap-1",
    "rounded-[var(--radius)] bg-card p-1 text-center",
    "transition-[box-shadow,background-color,color]",
    "duration-[var(--duration-colour)] ease-kwapso",
  ],
  {
    variants: { state: ZONE_EDGE_CLASSES },
    defaultVariants: { state: "default" },
  },
);

/* OPTION B's fallback tile — one Phosphor glyph and one short tag per
   `FileUploadFileKind`. Every icon is already in the kit
   (`foundations/icons/`); nothing new is drawn here. `File`, the bare-page
   glyph, is `"other"`'s — the honest generic for a row this component was
   given nothing to classify. */
const KIND_ICON: Record<FileUploadFileKind, IconComponent> = {
  image: FileImage,
  pdf: FilePdf,
  doc: FileDoc,
  sheet: FileXls,
  archive: FileZip,
  audio: FileAudio,
  video: FileVideo,
  other: File,
};

/* The type tag under the fallback glyph. Three to five letters, the same
   register a file's own extension already speaks in — data, like `name`
   above, never a phrase that would need translating. */
const KIND_TAG: Record<FileUploadFileKind, string> = {
  image: "IMG",
  pdf: "PDF",
  doc: "DOC",
  sheet: "XLS",
  archive: "ZIP",
  audio: "AUDIO",
  video: "VIDEO",
  other: "FILE",
};

/* MIME → kind, consulted only when a row gives no `kind` of its own — see
   `FileUploadItem.type` and `deriveKind` below. Deliberately narrow: an
   unrecognised or absent MIME type resolves to `"other"` rather than
   sniffing the file name's extension, a guess this component is not in a
   position to make responsibly. */
const DOC_MIME = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
]);
const SHEET_MIME = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/csv",
]);
const ARCHIVE_MIME = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/gzip",
  "application/x-tar",
]);

/** `FileUploadItem.type` (a MIME string) → `FileUploadFileKind`. Called only
 *  when a row's own `kind` is undefined. */
function deriveKind(type: string | undefined): FileUploadFileKind {
  if (!type) return "other";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (DOC_MIME.has(type)) return "doc";
  if (SHEET_MIME.has(type)) return "sheet";
  if (ARCHIVE_MIME.has(type)) return "archive";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  return "other";
}

/* The wrapping grid OPTION B replaces the row list with, once a file has
   landed. `auto-fill` (never `auto-fit` — see the header's "OPTION B"
   section) so two files in a wide zone stay two 5.5rem tiles instead of
   stretching to fill the row. `--space-3` is the token table's own "card
   grid gap" figure, spelled as Tailwind's `gap-3` because the two already
   agree (0.75rem). */
const TILE_GRID_CLASS = "grid w-full grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3";

/**
 * One tile in OPTION B's grid — a picture, a rendered first page, or a
 * file-type icon and its tag, the caption underneath, and whichever action
 * the row's register calls for. Not exported: the grid above is this file's
 * only public shape, the same way the old row markup never had its own
 * component either.
 */
function FileUploadTile({
  file,
  inert,
  onRemove,
  onRetry,
  removeLabel,
  retryLabel,
  formatProgress,
  sizeUnits,
  formatSize,
}: {
  file: FileUploadItem;
  inert: boolean;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  removeLabel: string;
  retryLabel: string;
  formatProgress: (value: number) => string;
  sizeUnits: readonly string[];
  formatSize?: (bytes: number) => string;
}) {
  /* The register, derived once — identical to the row list's own derivation,
     unchanged by Option B. `error` wins whatever `status` says, because a
     failure a row carries must never be drawn as anything quieter. */
  const status = file.error
    ? "error"
    : (file.status ?? (file.progress !== undefined ? "uploading" : undefined));
  const uploading = status === "uploading";
  /* Unchanged from the row list: a failed file with no `onRetry` falls back
     to the remove word, so it can still be dismissed. An uploading tile
     carries no action at all — nothing here is cancellable mid-flight. */
  const word =
    inert || uploading
      ? null
      : status === "error" && onRetry
        ? { label: retryLabel, act: () => onRetry(file.id) }
        : onRemove
          ? { label: removeLabel, act: () => onRemove(file.id) }
          : null;

  const kind = file.kind ?? deriveKind(file.type);
  const KindIcon = KIND_ICON[kind];
  /* The caption prints only `name` — the tile has no second line to spend on
     `size` (OPTION B, in the file header above), so `formatSize`/`sizeUnits`
     move here instead of going dead: the tooltip a hover or a focus still
     reaches, alongside a string `file.error`, so neither is truly lost. */
  const sizeText =
    file.size !== undefined
      ? (formatSize ?? ((bytes: number) => formatSizeDefault(bytes, sizeUnits)))(file.size)
      : undefined;
  const titleText = [
    file.name,
    sizeText,
    typeof file.error === "string" ? file.error : undefined,
  ]
    .filter((part): part is string => part !== undefined)
    .join(" · ");

  return (
    <div
      data-slot="file-upload-item"
      data-status={status}
      data-invalid={status === "error" ? "" : undefined}
      className="group/tile flex min-w-0 flex-col gap-1"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius)] bg-surface-quiet">
        {file.preview ? (
          // `fit` is left at its own default (`cover`) — RULES.md's images
          // law needs no exemption here, because that is already what "the
          // image itself" (the ruling's own words) means.
          <Image src={file.preview} alt="" ratio={null} className="absolute inset-0" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1">
            <KindIcon size={28} aria-hidden="true" className="text-ink-tertiary" />
            <Badge variant="secondary" size="counter">
              {KIND_TAG[kind]}
            </Badge>
          </div>
        )}

        {/* CH16's bar, laid over the tile's own bottom edge — there is no
            longer a name beside it to print a percentage next to, so the
            bar alone is the signal and `formatProgress` still reaches
            assistive technology through `Progress`'s own `formatValue`. */}
        {uploading ? (
          <div className="absolute inset-x-0 bottom-0 p-1">
            <Progress
              value={file.progress ?? null}
              label={file.name}
              formatValue={(value) => formatProgress(value)}
              className="h-1"
            />
          </div>
        ) : null}

        {/* The poppy hairline — `--hairline-error`, `input.tsx`'s own
            expression. A tile is not a drop target, so a failure here is
            never a second dashed edge. */}
        {status === "error" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[var(--radius)] shadow-[var(--hairline-error)]"
          />
        ) : null}

        {/* Remove, as an "×" on hover/focus — the header's documented
            departure from "one word, no button" for the tile grid only. Not
            drawn for a failed tile: that register's action is `Retry`,
            below, and is never hover-gated. */}
        {word && status !== "error" ? (
          <button
            type="button"
            aria-label={word.label}
            onClick={word.act}
            className={cn(
              "absolute right-1 top-1 grid size-5 place-content-center rounded-pill",
              "bg-surface-inverse text-ink-on-inverse",
              "opacity-0 transition-opacity duration-[var(--duration-colour)] ease-kwapso",
              "group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 focus-visible:opacity-100",
            )}
          >
            <X size={12} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* The one-line caption. A string `file.error` moves to `title` rather
          than a second line — see `FileUploadItem.error`'s own note. */}
      <p className="truncate text-badge text-ink-tertiary" title={titleText}>
        {file.name}
      </p>

      {/* `Retry` (or its `removeLabel` fallback), visible rather than
          hover-gated — a failed file must never depend on a hover a touch
          reader cannot make. */}
      {word && status === "error" ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto justify-start p-0 text-badge text-destructive"
          onClick={word.act}
        >
          {word.label}
        </Button>
      ) : null}
    </div>
  );
}

/** SI symbols, not words — but still a prop, because not every locale uses them. */
const DEFAULT_SIZE_UNITS = ["B", "kB", "MB", "GB", "TB"] as const;

function formatSizeDefault(bytes: number, units: readonly string[]): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const rounded = unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

export interface FileUploadProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "onChange" | "children"> {
  /** The words in the middle of the zone. Translatable. */
  prompt?: React.ReactNode;
  /** The browse control's label. Translatable. */
  browseLabel?: string;
  /**
   * The Add tile's short caption, once the zone has shrunk to a grid
   * (OPTION B, in the file header above). Translatable; distinct from
   * `browseLabel`, which is the empty zone's full-sentence button and would
   * not fit an 88px square.
   */
  addLabel?: string;
  /** A quiet line under the control — "PDF or PNG, up to 10 MB". No default. */
  hint?: React.ReactNode;
  /** Passed to the hidden input. `image/*`, `.pdf`, whatever the app allows. */
  accept?: string;
  /** More than one file at a time. */
  multiple?: boolean;
  /** Native `name`, so the zone works inside an uncontrolled form. */
  name?: string;
  /** Called with everything the reader dropped or picked. */
  onFilesSelected?: (files: File[]) => void;
  /** What has been picked so far. Rendered as tiles under the zone once the
   *  first one lands (OPTION B, in the file header above). */
  files?: FileUploadItem[];
  /** Called with a row's `id`. The remove control appears only when given. */
  onRemove?: (id: string) => void;
  /** The remove word. Translatable. Also the failed-tile fallback when no
   *  `onRetry` is given — see `onRetry` below. */
  removeLabel?: string;
  /**
   * Called with a failed row's `id`. A failed tile draws `Retry`, visibly,
   * beneath its caption; without this handler it falls back to the remove
   * word instead, because a dead file someone cannot re-send must still be
   * dismissible.
   */
  onRetry?: (id: string) => void;
  /** The retry word. Translatable. */
  retryLabel?: string;
  /**
   * The uploading register's percentage, reached through `Progress`'s own
   * `formatValue` so assistive technology still hears it even though the
   * tile grid (OPTION B) no longer prints it beside the name.
   */
  formatProgress?: (value: number) => string;
  /** Nothing has been picked yet and the call site wants to say so. No default. */
  emptyLabel?: React.ReactNode;
  /**
   * Byte-size units, in ascending order. Translatable. A tile's caption
   * (OPTION B) has no second line to print a size on, so once a file has
   * landed this reaches the tile's `title` instead — still there on hover
   * or focus, never simply dropped.
   */
  sizeUnits?: readonly string[];
  /** Replace the size formatting wholesale, for a locale the units cannot express. */
  formatSize?: (bytes: number) => string;
  /**
   * The zone as a whole failed — nothing was accepted, the batch was too
   * large. A node is the message; `true` marks it invalid silently. A single
   * file's failure belongs on that file's row instead.
   */
  error?: React.ReactNode | boolean;
  /** An upload is in flight. The browse control spins and `aria-busy` is set. */
  loading?: boolean;
  /** Nothing may be added. A fill and an ink, and drops are refused. */
  disabled?: boolean;
  /**
   * The list may be read but not changed. The Add tile and the drag handlers
   * are withdrawn — chapter 9's rule that a system-set value loses its box —
   * but a picked file still renders as a tile (OPTION B): a client who
   * cannot add or remove files can still be shown the pictures they sent.
   */
  readOnly?: boolean;
}

/**
 * The system's file drop zone.
 *
 * TEN STATES
 *  1. default        — 24 box, one hairline, glyph, prompt, browse control.
 *                      Once a file lands (OPTION B, in the file header
 *                      above), the SAME box becomes a wrapping grid of 5.5rem
 *                      tiles instead — an Add tile carrying this exact edge,
 *                      then one tile per file.
 *  2. hover          — hairline to `--hair-strong`, exactly as a field. A colour
 *                      shift, never a fade. The Add tile shares it.
 *  3. focus-visible  — NOT on the zone itself. tokens.css §8 rings the hidden
 *                      file input, the browse control, the Add tile and each
 *                      tile's hover remove control; none of them adds a ring
 *                      of its own.
 *  4. active/pressed — the browse control's 1-unit nudge, which `button` owns.
 *                      The zone itself is not pressed; its equivalent moment
 *                      is the drag-over below.
 *  5. disabled       — `--hair-faint` fill, `--ink-disabled` ink, hover frozen,
 *                      drops refused, browse control (or Add tile) disabled.
 *  6. loading        — `loading`: `aria-busy` on the zone and the browse
 *                      control keeps its fill and grows a spinner. The zone
 *                      stays droppable — a second file may be added while the
 *                      first is still going up. A tile already uploading
 *                      (`progress` set) draws `Progress`'s bar over its own
 *                      bottom edge instead — a per-file register, not this one.
 *  7. empty          — no rows. The zone alone IS the empty state; no tile is
 *                      invented to fill the space. `emptyLabel` adds a line
 *                      only if the call site asks for one.
 *  8. error          — `error`: 65% poppy hairline on the zone, ink message
 *                      under it. A single file's failure is `item.error`:
 *                      the tile draws `--hairline-error` over itself and a
 *                      visible `Retry` beneath its caption (OPTION B) — never
 *                      a second dashed edge, because a tile is not a drop
 *                      target.
 *  9. selected       — expressed as the grid (OPTION B, in the file header
 *                      above): a picked file is a TILE — its own picture if
 *                      `preview` is given, a file-type icon and tag
 *                      otherwise — never a highlighted zone.
 * 10. read-only      — `readOnly`: the Add tile and the drag handlers are
 *                      withdrawn; a picked file still renders as a tile in
 *                      the same grid, with no remove control.
 *
 * DRAG-OVER — the state the kit has no drawing for and this component cannot
 * do without. `data-over="true"` on the zone; the fill is motion.css's
 * `.motion-drop-target`, the edge goes to ink. The counter is kept in state
 * because `dragleave` fires when the pointer crosses a CHILD's edge, so a
 * naive boolean flickers over the glyph and the words. Once tiled, the same
 * `data-over` reaches the Add tile too, so its edge darkens along with the
 * grid's own wash.
 *
 * THREE BREAKPOINTS
 *  mobile / tablet / desktop — UNCHANGED for the empty zone: it is `w-full`
 *  and its inset is 32 at every width. The tile grid (OPTION B) is the same
 *  `repeat(auto-fill, minmax(5.5rem, 1fr))` at every width too — it simply
 *  fits fewer 5.5rem columns in a narrower zone, which is what `auto-fill`
 *  is for; nothing here reaches for a breakpoint. Drag and drop does not
 *  exist on a touch device, and nothing needs to change for that: the browse
 *  control (or, once tiled, the Add tile) is the whole interaction there.
 *
 * RTL — safe. The empty zone is left-aligned per its own law, the tile grid
 * orders itself from DOM order the way any grid does (the Add tile is
 * simply first), and no side is named for either.
 */
const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      className,
      prompt = "Drop files here",
      browseLabel = "Choose a file",
      addLabel = "Add",
      hint,
      accept,
      multiple = false,
      name,
      onFilesSelected,
      files,
      onRemove,
      removeLabel = "Remove",
      onRetry,
      retryLabel = "Retry",
      formatProgress = (value: number) => `${Math.round(value)}%`,
      emptyLabel,
      sizeUnits = DEFAULT_SIZE_UNITS,
      formatSize,
      error,
      loading = false,
      disabled = false,
      readOnly = false,
      ...props
    },
    ref,
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    // A depth counter, not a boolean: `dragleave` fires for every child edge
    // the pointer crosses, and a boolean would flash the wash off and on.
    const depth = React.useRef(0);
    const [over, setOver] = React.useState(false);

    const invalid = error !== undefined && error !== null && error !== false && error !== "";
    const message = typeof error === "boolean" ? undefined : error;
    const inert = disabled || readOnly;

    const state = disabled ? "disabled" : invalid ? "error" : "default";
    const rows = files ?? [];
    const tiled = rows.length > 0;

    const open = () => {
      if (inert) return;
      inputRef.current?.click();
    };

    /* THE ZONE IS CLICK-TO-BROWSE, AND A CONTROL INSIDE IT IS NOT THE ZONE.
       The whole dashed box carries `onClick={open}`, so every click within it
       bubbles up and opens the OS file picker — including a click on something
       a CALLER put there. `hint` renders inside this box, so an anchor or a
       button passed to it opens the picker as well as doing its own job, and
       the caller cannot prevent it because the caller does not own the zone.

       THIS FILE ALREADY KNEW. Its own Browse button calls
       `event.stopPropagation()` before `open()` for exactly this reason — the
       hazard was understood and handled locally, for the one control the kit
       ships, and never extended to the ones a consumer supplies. So this is
       not a new policy; it is the existing one applied where it was missing.

       A click that landed on a control is that control's click. It also stops
       the hidden input's own programmatic `click()` from bubbling back here
       and re-entering `open()`.

       ONLY THE EMPTY ZONE CARRIES THIS HANDLER. Once tiled (OPTION B), the
       zone is a grid of independently-interactive tiles and an Add tile with
       its own `onClick`; wiring the whole grid to open the picker would fire
       it on a click meant for a thumbnail's remove control or a failed
       tile's `Retry`. */
    const openFromZone = (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'a[href], button, input, select, textarea, label, [role="button"], [role="link"]',
        )
      ) {
        return;
      }
      open();
    };

    const emit = (list: FileList | null) => {
      if (!list || list.length === 0) return;
      onFilesSelected?.(Array.from(list));
    };

    const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
      if (inert) return;
      event.preventDefault();
      depth.current += 1;
      setOver(true);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      if (inert) return;
      // Without this the browser navigates to the dropped file.
      event.preventDefault();
    };

    const handleDragLeave = () => {
      if (inert) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
      if (inert) return;
      event.preventDefault();
      depth.current = 0;
      setOver(false);
      emit(event.dataTransfer?.files ?? null);
    };

    return (
      <div
        ref={ref}
        data-slot="file-upload"
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
        className={cn("flex w-full min-w-0 flex-col gap-3", className)}
        {...props}
      >
        {readOnly ? null : (
          <div
            data-slot="file-upload-zone"
            data-state={state}
            data-over={over ? "true" : undefined}
            data-tiled={tiled ? "" : undefined}
            aria-busy={loading || undefined}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={tiled ? undefined : openFromZone}
            className={
              tiled
                ? cn(
                    TILE_GRID_CLASS,
                    "rounded-[var(--radius)] motion-drop-target",
                    "transition-[background-color] duration-[var(--duration-colour)] ease-kwapso",
                  )
                : cn(zoneVariants({ state }))
            }
          >
            {/* Visually hidden rather than `hidden`: a hidden input is not
                focusable, and the global focus rule must be able to reach the
                control a keyboard reader tabs to. Present in both the empty
                and the tiled zone — the Add tile's own `onClick` still opens
                it through the same ref. */}
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept={accept}
              multiple={multiple}
              name={name}
              disabled={inert}
              aria-hidden="true"
              tabIndex={-1}
              onChange={(event) => {
                emit(event.currentTarget.files);
                // Same file twice in a row must still fire a change.
                event.currentTarget.value = "";
              }}
            />

            {tiled ? (
              <>
                {/* OPTION B's Add tile — the dashed box's own next form. See
                    the file header for why this is a plain `<button>` and not
                    the kit's `Button`. */}
                <button
                  type="button"
                  data-slot="file-upload-add-tile"
                  data-over={over ? "true" : undefined}
                  disabled={inert}
                  aria-label={addLabel}
                  onClick={open}
                  className={cn(addTileVariants({ state }))}
                >
                  <Plus
                    size={20}
                    aria-hidden="true"
                    className={disabled ? "text-ink-disabled" : "text-ink-tertiary"}
                  />
                  <span className="text-badge">{addLabel}</span>
                </button>

                {rows.map((file) => (
                  <FileUploadTile
                    key={file.id}
                    file={file}
                    inert={inert}
                    onRemove={onRemove}
                    onRetry={onRetry}
                    removeLabel={removeLabel}
                    retryLabel={retryLabel}
                    formatProgress={formatProgress}
                    sizeUnits={sizeUnits}
                    formatSize={formatSize}
                  />
                ))}
              </>
            ) : (
              <>
                {/* UPL-C2 — the glyph sits in a WELL, and the well is CH16's:
                    `width: 40px; height: 40px; border-radius: 999px;
                    background: var(--sheet)`. The build drew a bare glyph on
                    the zone's own fill, so the one mark in an otherwise empty
                    32×24 box had nothing holding it. 40 is
                    `--control-height-button`, the same box every icon-only
                    control in the system uses, and `--surface-panel` is the
                    artifact's `--sheet`.

                    The glyph itself stays at 24. CH16 draws it at 18, which is
                    not on the icon ladder (16/20/22/24/28/32 — override 20
                    admits 28 and stops), and admitting a seventh size to gain
                    six pixels inside a well that is now the right size is not
                    a trade this pass makes. Logged. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-[var(--control-height-button)] shrink-0 place-content-center",
                    "rounded-pill bg-[var(--surface-panel)]",
                  )}
                >
                  <UploadSimple
                    size={24}
                    className={disabled ? "text-ink-disabled" : "text-ink-tertiary"}
                  />
                </span>

                {/* CH16 draws the prompt at `font-size: 14px; font-weight: 500` —
                    the zone's one line of Medium, and the only thing in the box
                    that is not quiet. GAPS-FIDELITY-BC UPL-B2. */}
                <p className="text-sm font-[var(--font-weight-medium)]">{prompt}</p>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={disabled}
                  loading={loading}
                  onClick={(event) => {
                    event.stopPropagation();
                    open();
                  }}
                >
                  {browseLabel}
                </Button>

                {hint !== undefined && hint !== null ? (
                  <p className="text-badge text-ink-tertiary">{hint}</p>
                ) : null}
              </>
            )}
          </div>
        )}

        {message !== undefined && message !== null ? (
          <p data-slot="file-upload-error" className={cn(fieldErrorClasses)}>
            <span
              aria-hidden="true"
              className="size-[0.375rem] shrink-0 rounded-pill bg-destructive"
            />
            <span className="min-w-0">{message}</span>
          </p>
        ) : null}

        {readOnly && tiled ? (
          <div data-slot="file-upload-list" className={TILE_GRID_CLASS}>
            {rows.map((file) => (
              <FileUploadTile
                key={file.id}
                file={file}
                inert={inert}
                onRemove={onRemove}
                onRetry={onRetry}
                removeLabel={removeLabel}
                retryLabel={retryLabel}
                formatProgress={formatProgress}
                sizeUnits={sizeUnits}
                formatSize={formatSize}
              />
            ))}
          </div>
        ) : !tiled && emptyLabel !== undefined && emptyLabel !== null ? (
          <p data-slot="file-upload-empty" className="text-badge text-ink-tertiary">
            {emptyLabel}
          </p>
        ) : null}
      </div>
    );
  },
);

FileUpload.displayName = "FileUpload";

export { FileUpload, zoneVariants as fileUploadZoneVariants };
