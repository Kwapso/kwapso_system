// THE CHIP ORDER — R94 (RULES.md, shared/rules/registry.ts). Aurora, verbatim,
// 20 Sep 2026, reading the ticket detail's own chip row back and generalising
// it on the spot: "On story detail, the chips in order: id, status, type, app
// (underlined), sprint (id, underlined). This must always be the order,
// everywhere, for other things too: 1 id, 2 status, 3 (if) type, 4 main
// parent, 5 secondary parent."
//
// ONE SEAM, so "the order" is a property of the LIST rather than a sentence a
// call site has to remember and re-derive per screen — exactly the shape
// `sorted-options.ts` already takes for R75's "options are A→Z" ruling: the
// caller hands in what it has, tagged with WHAT KIND each chip is, and this
// file decides where each one lands.
//
// THE FIVE KINDS, in the fixed order the ruling names. `type` and the two
// parents are OPTIONAL on any given record (a module with no type vocabulary,
// a ticket not yet filed under a sprint) — a caller simply does not push a
// chip for a kind it has nothing to say, and the ones it does push still come
// out in this order, because sorting is stable per KIND, not per how many of
// the five are actually present.
export type ChipKind = "id" | "status" | "type" | "mainParent" | "secondaryParent"

const CHIP_ORDER: readonly ChipKind[] = ["id", "status", "type", "mainParent", "secondaryParent"]

/** One chip, tagged with what it IS rather than where it goes — the caller
 * never picks a position, only a kind, so the row can never drift out of
 * order one edit at a time the way a hand-ordered JSX list can. */
export interface OrderedChip<T> {
  kind: ChipKind
  node: T
}

/** Sorts a record's chips into the one fixed order the law names: id, status,
 * type, main parent, secondary parent. STABLE — two chips of the same kind
 * (which should not happen; each kind is a single slot) keep their relative
 * order rather than being reshuffled — and chips of a kind not present are
 * simply absent from the input, never padded with a placeholder. Every
 * record head and list-row chip group in this app is meant to build its row
 * through this function rather than hand-ordering JSX, so the order is a
 * property of the data, not of which line happens to come first in the file. */
export function orderChips<T>(chips: readonly OrderedChip<T>[]): T[] {
  return [...chips]
    .map((chip, index) => ({ chip, index }))
    .sort((a, b) => {
      const rank = CHIP_ORDER.indexOf(a.chip.kind) - CHIP_ORDER.indexOf(b.chip.kind)
      return rank !== 0 ? rank : a.index - b.index
    })
    .map(({ chip }) => chip.node)
}
