/** Page-balance measurement, shared verbatim with rescv-pdf-generator.
 *
 * MIRROR COPY. The canonical file is rescv-pdf-generator/src/page-balance.mjs.
 * This header is the only part that differs between the two files, which is
 * why it sits above the marker below and is excluded from the hash.
 */

// === shared region: byte-identical in both repos ===
//
// Both repos hash everything from the marker line above and compare it to the
// SAME recorded constant. That gives one checkable property: if both checks
// pass against the same constant, the two copies are identical.
//
// What it does NOT do is make divergence fail a test. Each repo's constant
// lives in that repo's own check, so a copy that is internally consistent —
// old code, old constant — passes on its own. Editing one side and skipping
// the copy leaves the two repos recording DIFFERENT constants, which is
// visible on inspection but breaks no build. Closing that properly needs a
// real shared dependency, not a mirrored file. Treat this as a tripwire that
// forces the copy to be deliberate.

/** Splits off the bytes both repos must agree on: everything from the marker
 * to the end of file. Exported so each repo's check hashes the same span
 * rather than reimplementing the rule. */
export function sharedRegion(source) {
  const marker = '// === shared region: byte-identical in both repos ===';
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`page-balance.mjs: "${marker}" not found — cannot locate the hashed region.`);
  }
  return source.slice(start);
}

/** Root sizes tried for a resume, largest first.
 *
 * The ladder opens at 8.5pt, the root size in base.css and the size the
 * website prints at, so a resume that fits and balances at that size renders
 * exactly as the site prints it. Only a document that would otherwise spill,
 * or strand a hole at the foot of a page, steps down.
 *
 * Steps are 0.1pt. A coarser ladder is not enough: the main resume clears its
 * page-one hole at 8.4pt, one tenth of a point below the top, and a 0.25 step
 * would have overshot to 8.25pt for no reason.
 *
 * The floor is deliberate. Role entries stay unbreakable (`break-inside:
 * avoid` on `.entry`), which is what makes an over-tall entry push whole and
 * cascade an extra page; shrinking the type shrinks the entry until it fits
 * the space left, collapsing the cascade. Below 7.5pt the secondary line
 * (`--text--1`, 0.8rem) drops under 6pt and stops being comfortably readable
 * in print, so anything that will not fit by then needs its content trimmed
 * rather than its type shrunk further. */
export const RESUME_SIZES = [8.5, 8.4, 8.3, 8.2, 8.1, 8, 7.9, 7.8, 7.7, 7.6, 7.5];

/** How much of the content box may sit empty at the foot of a NON-FINAL page
 * before a size is rejected for balance, as a fraction of content height.
 *
 * A trailing hole only ever appears on a non-final page because something
 * unbreakable would not fit and pushed whole. A short final page is normal and
 * is never judged. Ten percent is about 27mm on this geometry: below it the
 * foot of the page reads as ordinary rag, above it as a mistake.
 *
 * This is a preference, not a gate. If no size satisfies it, the largest size
 * that fits the page limit is used anyway — balance never blocks a write. */
export const MAX_TRAILING_GAP = 0.1;

/** Page geometry both producers print with, so the site's resume, a rescv
 * resume, and its cover letter sit on one grid. A4 portrait; the height
 * constant below pairs with it. */
export const GEOMETRY = {
  format: 'A4',
  margin: { top: '11mm', bottom: '12mm', left: '13mm', right: '13mm' },
  printBackground: false,
};

const PT_PER_MM = 2.8346;

/** '11mm' | '13px' | 11 → points */
function toPoints(value) {
  if (typeof value === 'number') return value;
  const [, n, unit = 'pt'] = String(value).match(/^([\d.]+)\s*([a-z]*)$/i) ?? [];
  const scale = { mm: PT_PER_MM, cm: PT_PER_MM * 10, in: 72, px: 0.75, pt: 1 }[unit] ?? 1;
  return parseFloat(n) * scale;
}

/** A4 portrait height in points as Chromium's PDF writer emits it (MediaBox
 * 842.88 — not ISO's nominal 841.89pt; do not "correct" it, every gap fraction
 * shifts). Both documents only ever print A4. */
const A4_HEIGHT = 842.88;

/** Wraps the last word of every block that can finish a page in a marker link.
 *
 * Chromium emits a /URI annotation per rendered line, and pdf-lib reads
 * annotation rectangles natively, so the foot of each page can be located
 * without extracting text and without an external binary. An inline anchor
 * around an existing word changes colour, not layout, so the instrumented
 * render paginates identically to the clean one.
 *
 * Runs in the page context. */
export function injectMarkers() {
  // only unbreakable blocks and whole sections can be last on a page; a role
  // entry cannot end a page part-way because `.entry` is break-inside: avoid
  const blocks = document.querySelectorAll('.head, .entry, .certgroup, section');
  let n = 0;
  for (const block of blocks) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let last = null;
    while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) last = walker.currentNode;
    if (!last) continue;
    const text = last.nodeValue;
    const match = text.match(/(\S+)(\s*)$/);
    if (!match) continue;
    const anchor = document.createElement('a');
    anchor.href = `https://marker.invalid/${n}`;
    anchor.textContent = match[1];
    last.nodeValue = text.slice(0, match.index);
    last.parentNode.insertBefore(anchor, last.nextSibling);
    anchor.parentNode.insertBefore(document.createTextNode(match[2]), anchor.nextSibling);
    n += 1;
  }
  return n;
}

/** Trailing gap on each page of an instrumented render, as a fraction of the
 * content box height. Index 0 is page one.
 *
 * @param {PDFDocument} pdf instrumented document
 * @param {object} pageOpts geometry the document was printed with
 * @returns {number[]}
 */
export function trailingGaps(pdf, pageOpts) {
  const top = toPoints(pageOpts.margin?.top ?? 0);
  const bottom = toPoints(pageOpts.margin?.bottom ?? 0);
  const contentHeight = A4_HEIGHT - top - bottom;

  return pdf.getPages().map((page) => {
    const annots = page.node.Annots();
    let lowest = null;
    if (annots) {
      for (let i = 0; i < annots.size(); i += 1) {
        const annot = annots.lookup(i);
        const action = annot?.lookup?.(annot.context.obj('A'));
        const uri = action?.lookup?.(annot.context.obj('URI'));
        const href = uri?.decodeText ? uri.decodeText() : uri?.asString?.();
        if (!href?.includes('marker.invalid')) continue;
        const rect = annot?.lookup?.(annot.context.obj('Rect'));
        if (!rect) continue;
        const y = rect.asArray()[1].asNumber(); // PDF origin is bottom-left
        if (lowest === null || y < lowest) lowest = y;
      }
    }
    // a page with no marker carries no block that finishes there; treat it as
    // full rather than inventing a hole
    if (lowest === null) return 0;
    return Math.max(0, (lowest - bottom) / contentHeight);
  });
}

/** The fitting policy both PDF producers share: walk candidate sizes largest
 * first, keep the largest that fits the page limit AND leaves no oversized
 * hole at the foot of a non-final page; when none balances, the largest that
 * merely fits stands in. Fit is a gate, balance a preference — the pick is
 * null only when nothing fits at all.
 *
 * Stateful so a driver can stop rendering the moment the winner is known:
 * `consider` returns true when no later (smaller) size can beat what it holds.
 *
 * @param {{maxPages: number, balance: number}} opts
 * @returns {{consider(size: number, pages: number, gaps: number[]): boolean,
 *            result(): {pick: {size: number, gap: number}|null,
 *                       balanced: boolean,
 *                       smallest: {size: number, pages: number}|null}}}
 */
export function fittingPick({ maxPages, balance }) {
  let smallest = null;
  let chosen = null;
  let fallback = null;
  return {
    consider(size, pages, gaps) {
      smallest = { size, pages };
      if (pages > maxPages) return false;
      // the final page is allowed to run short; only a hole mid-document counts
      const nonFinal = gaps.slice(0, -1);
      const gap = nonFinal.length ? Math.max(...nonFinal) : 0;
      // first fitting size seen is the largest, and stands in if none balances
      if (fallback === null) fallback = { size, gap };
      if (gap <= balance) {
        chosen = { size, gap };
        return true;
      }
      return false;
    },
    result() {
      return { pick: chosen ?? fallback, balanced: chosen !== null, smallest };
    },
  };
}

/** Marker annotations present in a document. The shipped artifact must count
 * zero: markers exist only in the instrumented measurement renders, and a
 * clean reprint that still carries one was not clean.
 *
 * @param {PDFDocument} pdf
 * @returns {number}
 */
export function countMarkerAnnotations(pdf) {
  let n = 0;
  for (const page of pdf.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i += 1) {
      const annot = annots.lookup(i);
      const action = annot?.lookup?.(annot.context.obj('A'));
      const uri = action?.lookup?.(annot.context.obj('URI'));
      const href = uri?.decodeText ? uri.decodeText() : uri?.asString?.();
      if (href?.includes('marker.invalid')) n += 1;
    }
  }
  return n;
}

/** Measures one sample string's advance width at weights 400 and 700, in the
 * page context, through the same shaping stack the render uses.
 *
 * A broken font stack can drop a variable font's weight axis and print every
 * bold glyph at regular weight — silently, on a zero exit, invisible to text
 * extraction. Equal widths at the two weights are that failure's geometric
 * signature: healthy instancing of Source Serif 4 measures bold about 4%
 * wider. Callers refuse the render when bold/regular falls below
 * WEIGHT_PROBE_MIN.
 *
 * Runs in the page context. */
export function probeBoldWidths() {
  const ctx = document.createElement('canvas').getContext('2d');
  const sample = 'Hamburgefonstiv Experience 2026';
  ctx.font = '400 32px "Source Serif 4"';
  const regular = ctx.measureText(sample).width;
  ctx.font = '700 32px "Source Serif 4"';
  const bold = ctx.measureText(sample).width;
  return { regular, bold };
}

/** Minimum bold/regular width ratio a render must show before it is trusted
 * with bold text. Healthy environments measure about 1.04; a dropped weight
 * axis measures exactly 1.0. */
export const WEIGHT_PROBE_MIN = 1.01;
