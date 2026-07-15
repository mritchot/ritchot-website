/**
 * Knuth–Plass line breaking over measured items — the optimization core of
 * the pretext-justify island (D22). Adapted from the MIT-licensed
 * justification-comparison demo shipped inside @chenglou/pretext 0.0.8
 * (pages/demos/justification-comparison.model.ts): same dynamic program,
 * badness curve, and river/tight-space penalties, generalized from
 * single-font segment arrays to mixed-font item lists. Box widths carry
 * their own fonts' measurements, so justification is expressed as one
 * word-spacing delta per line rather than an absolute space width.
 */

const HUGE_BADNESS = 1e8;
const SHORT_LINE_RATIO = 0.6;
const RIVER_THRESHOLD = 1.5;
const INFEASIBLE_SPACE_RATIO = 0.4;
const OVERFLOW_SPACE_RATIO = 0.2;
const TIGHT_SPACE_RATIO = 0.65;

/** A run of whitespace in an original text node. */
export type GlueRef = { node: Text; start: number; end: number };
/** A soft hyphen character in an original text node. */
export type ShyRef = { node: Text; off: number };

/**
 * Items: boxes carry shaped text widths; glue is breakable space; 'shy' is
 * a soft-hyphen break (costs a rendered hyphen); 'brk' is a zero-width
 * UAX14 break opportunity inside a word (after a visible hyphen, dash,
 * slash…) — the browser may break there, so the optimizer must know it.
 */
export type Item =
  | { k: 'box'; w: number }
  | { k: 'glue'; w: number; ref: GlueRef }
  | { k: 'shy'; w: number; ref: ShyRef }
  | { k: 'brk'; ref: ShyRef };

export type LineEnd =
  | { kind: 'space'; ref: GlueRef }
  | { kind: 'shy'; ref: ShyRef }
  | { kind: 'brk'; ref: ShyRef }
  | { kind: 'paragraph' };

export type Line = {
  /** glue items interior to the line, each to carry `delta` */
  glue: GlueRef[];
  /** uniform word-spacing delta in px; 0 means leave natural */
  delta: number;
  /** false for the last line and deliberately ragged short lines */
  justify: boolean;
  end: LineEnd;
};

type Cand = {
  /** first content item of a line starting at this candidate */
  startItem: number;
  /** end of content for a line ending at this candidate (exclusive) */
  endItem: number;
  kind: 'start' | 'space' | 'shy' | 'brk' | 'end';
  itemIndex: number;
};

export function breakParagraph(
  items: Item[],
  maxWidth: number,
  normalSpace: number,
): Line[] | null {
  const n = items.length;
  if (n === 0) return null;

  // Prefix sums over item indices: box width, glue width, glue count.
  const pBox = new Float64Array(n + 1);
  const pGlueW = new Float64Array(n + 1);
  const pGlueN = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const item = items[i]!;
    pBox[i + 1] = pBox[i]! + (item.k === 'box' ? item.w : 0);
    pGlueW[i + 1] = pGlueW[i]! + (item.k === 'glue' ? item.w : 0);
    pGlueN[i + 1] = pGlueN[i]! + (item.k === 'glue' ? 1 : 0);
  }

  // A line never starts on glue (pre-line drops leading collapsed spaces),
  // so each candidate records the next non-glue item as its start.
  const nextContent = (from: number): number => {
    let i = from;
    while (i < n && items[i]!.k === 'glue') i++;
    return i;
  };

  const cands: Cand[] = [{ startItem: nextContent(0), endItem: 0, kind: 'start', itemIndex: -1 }];
  for (let i = 0; i < n; i++) {
    const item = items[i]!;
    if (item.k === 'glue' && i + 1 < n) {
      cands.push({ startItem: nextContent(i + 1), endItem: i, kind: 'space', itemIndex: i });
    } else if ((item.k === 'shy' || item.k === 'brk') && i + 1 < n) {
      cands.push({ startItem: i + 1, endItem: i, kind: item.k, itemIndex: i });
    }
  }
  cands.push({ startItem: n, endItem: n, kind: 'end', itemIndex: -1 });

  const cn = cands.length;
  const stats = (from: Cand, to: Cand) => {
    const s = from.startItem;
    const e = to.endItem;
    const hyphen = to.kind === 'shy' ? (items[to.itemIndex]! as { w: number }).w : 0;
    const boxW = pBox[e]! - pBox[s]! + hyphen;
    const glueW = pGlueW[e]! - pGlueW[s]!;
    const glueN = pGlueN[e]! - pGlueN[s]!;
    return { natural: boxW + glueW, glueN, isShy: to.kind === 'shy' || to.kind === 'brk' };
  };

  const badness = (
    natural: number,
    glueN: number,
    isShy: boolean,
    isLast: boolean,
  ): number => {
    if (isLast) return natural > maxWidth ? HUGE_BADNESS : 0;

    if (glueN <= 0) {
      const slack = maxWidth - natural;
      if (slack < 0) return HUGE_BADNESS;
      return slack * slack * 10;
    }

    const delta = (maxWidth - natural) / glueN;
    const space = normalSpace + delta;
    if (space < normalSpace * INFEASIBLE_SPACE_RATIO) return HUGE_BADNESS;

    const ratio = delta / normalSpace;
    const absRatio = Math.abs(ratio);
    let b = absRatio * absRatio * absRatio * 1000;

    const riverExcess = space / normalSpace - RIVER_THRESHOLD;
    if (riverExcess > 0) b += 5000 + riverExcess * riverExcess * 10000;

    const tight = normalSpace * TIGHT_SPACE_RATIO;
    if (space < tight) b += 3000 + (tight - space) * (tight - space) * 10000;

    if (isShy) b += 50;
    return b;
  };

  const dp = new Float64Array(cn).fill(Infinity);
  const prev = new Int32Array(cn).fill(-1);
  dp[0] = 0;

  for (let to = 1; to < cn; to++) {
    const isLast = cands[to]!.kind === 'end';
    for (let from = to - 1; from >= 0; from--) {
      if (dp[from]! === Infinity) continue;
      const st = stats(cands[from]!, cands[to]!);
      if (st.natural > maxWidth * 2) break;
      const total = dp[from]! + badness(st.natural, st.glueN, st.isShy, isLast);
      if (total < dp[to]!) {
        dp[to] = total;
        prev[to] = from;
      }
    }
  }

  if (prev[cn - 1]! === -1) return null;

  const order: number[] = [];
  for (let c = cn - 1; c > 0; c = prev[c]!) {
    if (prev[c]! === -1) return null;
    order.push(c);
  }
  order.reverse();

  const lines: Line[] = [];
  let fromCand = cands[0]!;
  for (const idx of order) {
    const toCand = cands[idx]!;
    const st = stats(fromCand, toCand);
    const isLast = toCand.kind === 'end';

    const glue: GlueRef[] = [];
    for (let i = fromCand.startItem; i < toCand.endItem; i++) {
      const item = items[i]!;
      if (item.k === 'glue') glue.push(item.ref);
    }

    const justify = !isLast && st.glueN > 0 && st.natural >= maxWidth * SHORT_LINE_RATIO;
    let delta = 0;
    if (justify) {
      delta = (maxWidth - st.natural) / st.glueN;
      // never compress a space below the overflow floor
      delta = Math.max(delta, normalSpace * (OVERFLOW_SPACE_RATIO - 1));
    }

    const end: LineEnd =
      toCand.kind === 'space'
        ? { kind: 'space', ref: (items[toCand.itemIndex]! as Item & { k: 'glue' }).ref }
        : toCand.kind === 'shy' || toCand.kind === 'brk'
          ? { kind: toCand.kind, ref: (items[toCand.itemIndex]! as Item & { k: 'shy' }).ref }
          : { kind: 'paragraph' };

    lines.push({ glue, delta, justify, end });
    fromCand = toCand;
  }

  return lines.length > 1 ? lines : null;
}
