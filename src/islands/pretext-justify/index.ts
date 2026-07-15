/**
 * pretext-justify — Knuth–Plass paragraph justification island (D22).
 *
 * Progressive enhancement over the CSS baseline (text-align: justify with
 * build-time soft hyphens). Per eligible paragraph:
 *
 *  1. measure — every text node is normalized (whitespace collapsed, with
 *     an offset map back to the original) and measured with pretext
 *     prepareWithSegments under its own computed font, so links, emphasis,
 *     code, and footnote references are all style-correct;
 *  2. optimize — the Knuth–Plass core in kp.ts picks globally optimal
 *     breaks over space and soft-hyphen candidates;
 *  3. apply — text-node surgery only. Chosen breaks become newline
 *     characters under `white-space: pre-line`; interior spaces are
 *     wrapped in .kp-s spans carrying the line's word-spacing delta
 *     (CSSOM, CSP-safe); soft hyphens are stripped so copied text is
 *     clean; a .kp-h span renders the break hyphen as CSS content. No
 *     element is ever cloned or split — links stay single focusable
 *     elements and sidenote floats keep their native anchors.
 *
 * Honesty guards: a paragraph is restored to its untouched clone whenever
 * the rendered geometry disagrees with the plan (unexpected line count or
 * horizontal overflow). Paragraphs at or above the initial viewport are
 * never touched, so the swap is invisible and CLS is 0 by construction.
 * Printing restores every paragraph to the baseline first.
 */
import { prepareWithSegments } from '@chenglou/pretext';
import { breakParagraph, type GlueRef, type Item, type ShyRef } from './kp';

const SHY = '­';
const WS = /[\t\n\r\f ]/;
const GLUE_SEG = /^[\t\n\r\f ]+$/;
// Two-pass fitting. Pass 1 plans against a measure shrunk by SAFETY so that
// no engine's sub-pixel drift (span-boundary rounding, ligature deltas) can
// push a planned line past the real edge. Pass 2 measures each rendered
// line and corrects its spans to end TARGET from the edge — closed-loop,
// so the precision comes from the engine's own output, not our model.
const SAFETY = 2.5;
const TARGET = 0.4;

type Candidate = {
  p: HTMLParagraphElement;
  clone: HTMLParagraphElement;
  enhanced: boolean;
};

type NodeEdit = {
  start: number;
  end: number;
  type: 'br' | 'brhy' | 'brk' | 'sp';
  delta: number;
};

type Stats = {
  enhanced: number;
  reverted: number;
  skipped: number;
  ms: number;
  why: Record<string, number>;
  lastRevert?: Record<string, unknown>;
};

const stats: Stats = { enhanced: 0, reverted: 0, skipped: 0, ms: 0, why: {} };
(window as Window & { __kp?: Stats }).__kp = stats;

const fontCache = new Map<Element, string>();
const spaceCache = new Map<string, number>();
let measureCtx: CanvasRenderingContext2D | null = null;

function fontOf(el: Element): string {
  let font = fontCache.get(el);
  if (font === undefined) {
    const cs = getComputedStyle(el);
    const style = cs.fontStyle === 'normal' ? '' : `${cs.fontStyle} `;
    font = `${style}${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    fontCache.set(el, font);
  }
  return font;
}

function spaceWidth(font: string): number {
  let w = spaceCache.get(font);
  if (w === undefined && measureCtx) {
    measureCtx.font = font;
    w = measureCtx.measureText(' ').width;
    spaceCache.set(font, w);
  }
  return w ?? 0;
}

/** Collapse whitespace runs to single spaces, keeping an offset map with a
 * trailing sentinel so original runs can be recovered as [map[i], map[i+1]). */
function normalize(data: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  let inRun = false;
  for (let i = 0; i < data.length; i++) {
    const ch = data[i]!;
    if (WS.test(ch)) {
      if (!inRun) {
        map.push(i);
        norm += ' ';
        inRun = true;
      }
    } else {
      map.push(i);
      norm += ch;
      inRun = false;
    }
  }
  map.push(data.length);
  return { norm, map };
}

/** Build the KP item list for a paragraph by walking its inline tree.
 * Elements with horizontal padding, border, or margin (e.g. the footnote
 * ref anchors) are atomic boxes measured by their DOM rect — box extras
 * are invisible to text measurement. Returns null when anything about the
 * content resists reliable measurement — the baseline then stands. */
function buildItems(p: HTMLElement): { items: Item[]; nodes: Text[] } | null {
  const items: Item[] = [];
  const nodes: Text[] = [];
  const ctx = measureCtx!;
  let ok = true;

  const walk = (el: Element): void => {
    for (const child of el.childNodes) {
      if (!ok) return;
      if (child.nodeType === Node.TEXT_NODE) {
        processText(child as Text);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const e = child as Element;
        if (e.classList.contains('sidenote')) continue; // out-of-flow float
        const s = getComputedStyle(e);
        const extra =
          parseFloat(s.paddingLeft) + parseFloat(s.paddingRight) +
          parseFloat(s.borderLeftWidth) + parseFloat(s.borderRightWidth) +
          parseFloat(s.marginLeft) + parseFloat(s.marginRight);
        if (Math.abs(extra) > 0.05) {
          const rects = e.getClientRects();
          if (rects.length !== 1) {
            ok = false; // fragmented (line-split) — cannot treat as atomic
            return;
          }
          const w = rects[0]!.width + parseFloat(s.marginLeft) + parseFloat(s.marginRight);
          const last = items[items.length - 1];
          if (last && last.k === 'box') last.w += w; // glue to the word before it
          else items.push({ k: 'box', w });
        } else {
          walk(e);
        }
      } else {
        ok = false; // comments/unknown: leave the paragraph alone
        return;
      }
    }
  };

  const processText = (node: Text): void => {
    const { norm, map } = normalize(node.data);
    if (norm === '') return;
    const parent = node.parentElement;
    if (!parent) {
      ok = false;
      return;
    }
    nodes.push(node);

    const font = fontOf(parent);
    const prepared = prepareWithSegments(norm, font);
    const segments = prepared.segments;
    const widths = prepared.widths;
    ctx.font = font;

    // Word accumulator: consecutive non-glue segments form one word. Every
    // internal boundary is a break candidate the browser also knows about —
    // a soft hyphen ('shy', costs a rendered hyphen) or a UAX14 opportunity
    // after a visible hyphen or dash ('brk', free). Part widths come from
    // shaped canvas prefixes, so a line ending anywhere inside the word
    // measures exactly what the browser will render.
    let parts: string[] = [];
    let seps: { kind: 'shy' | 'brk'; off: number }[] = [];
    let pending: { kind: 'shy' | 'brk'; off: number } | null = null;

    const flushWord = (): void => {
      let text = '';
      let prev = 0;
      for (let j = 0; j < parts.length; j++) {
        if (j > 0) {
          const sep = seps[j - 1]!;
          if (sep.kind === 'shy') {
            const hw = ctx.measureText(`${text}-`).width - prev;
            items.push({ k: 'shy', w: hw, ref: { node, off: sep.off } });
          } else {
            items.push({ k: 'brk', ref: { node, off: sep.off } });
          }
        }
        text += parts[j]!;
        const w = ctx.measureText(text).width;
        const partW = w - prev;
        prev = w;
        const last = j === 0 ? items[items.length - 1] : undefined;
        if (last && last.k === 'box') last.w += partW; // mid-word style boundary
        else items.push({ k: 'box', w: partW });
      }
      if (pending && parts.length > 0) {
        // trailing soft hyphen at the node edge is still a candidate
        if (pending.kind === 'shy') {
          const hw = ctx.measureText(`${text}-`).width - prev;
          items.push({ k: 'shy', w: hw, ref: { node, off: pending.off } });
        } else {
          items.push({ k: 'brk', ref: { node, off: pending.off } });
        }
      }
      parts = [];
      seps = [];
      pending = null;
    };

    // pretext may drop edge whitespace from the segment list (it measures
    // line-trimmed), so the cursor match tolerates whitespace-only gaps and
    // reconstructs them as glue — the space before a link is a real break
    // candidate. Any non-whitespace mismatch means we misread the text:
    // bail and let the baseline stand.
    const pushGlue = (start: number, end: number, w: number): void => {
      items.push({ k: 'glue', w, ref: { node, start: map[start]!, end: map[end]! } });
    };
    let cursor = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      if (norm.slice(cursor, cursor + seg.length) !== seg) {
        const gap = norm.indexOf(seg, cursor);
        if (gap === -1 || !GLUE_SEG.test(norm.slice(cursor, gap))) {
          ok = false;
          return;
        }
        flushWord();
        pushGlue(cursor, gap, spaceWidth(font));
        cursor = gap;
      }
      const start = cursor;
      cursor += seg.length;

      if (seg === SHY) {
        if (parts.length > 0) pending = { kind: 'shy', off: map[start]! };
      } else if (GLUE_SEG.test(seg)) {
        flushWord();
        pushGlue(start, cursor, widths[i]!);
      } else {
        if (parts.length > 0) {
          seps.push(pending ?? { kind: 'brk', off: map[start]! });
          pending = null;
        }
        parts.push(seg);
      }
    }
    flushWord();
    if (cursor < norm.length) {
      if (!GLUE_SEG.test(norm.slice(cursor))) {
        ok = false;
        return;
      }
      pushGlue(cursor, norm.length, spaceWidth(font));
    }
  };

  walk(p);
  return ok ? { items, nodes } : null;
}

function rebuildNode(node: Text, edits: NodeEdit[]): void {
  const data = node.data;
  edits.sort((a, b) => a.start - b.start);

  const frag = document.createDocumentFragment();
  let buffer = '';
  let last = '';
  const flush = () => {
    if (buffer !== '') {
      frag.appendChild(document.createTextNode(buffer));
      buffer = '';
    }
  };

  let e = 0;
  let i = 0;
  while (i < data.length) {
    const edit = e < edits.length ? edits[e]! : null;
    if (edit && i === edit.start) {
      if (edit.type === 'br' || edit.type === 'brk') {
        // 'brk' is zero-length: the newline lands between characters
        buffer += '\n';
        last = '\n';
      } else if (edit.type === 'brhy') {
        flush();
        const hy = document.createElement('span');
        hy.className = 'kp-h';
        frag.appendChild(hy);
        buffer = '\n';
        last = '\n';
      } else {
        flush();
        const sp = document.createElement('span');
        sp.className = 'kp-s';
        sp.textContent = ' ';
        sp.style.wordSpacing = `${edit.delta}px`;
        frag.appendChild(sp);
        last = ' ';
      }
      i = edit.end;
      e++;
      continue;
    }
    const ch = data[i]!;
    if (ch !== SHY) {
      if (WS.test(ch)) {
        if (last !== ' ' && last !== '\n') {
          buffer += ' ';
          last = ' ';
        }
      } else {
        buffer += ch;
        last = ch;
      }
    }
    i++;
  }
  flush();
  node.replaceWith(frag);
}

function skip(reason: string): void {
  stats.skipped++;
  stats.why[reason] = (stats.why[reason] ?? 0) + 1;
}

function enhance(cand: Candidate): void {
  const p = cand.p;
  const cs = getComputedStyle(p);
  if (!cs.textAlign.startsWith('justify') || cs.letterSpacing !== 'normal') {
    return skip('align');
  }
  if (
    p.querySelector(
      'img,picture,video,audio,iframe,svg,canvas,br,button,input,select,textarea,object,embed,math',
    )
  ) {
    return skip('content');
  }
  // eslint-disable-next-line no-misleading-character-class -- RTL guard
  if (/[֐-ࣿ‏‫‮]/.test(p.textContent ?? '')) {
    return skip('rtl');
  }

  const built = buildItems(p);
  if (!built) {
    return skip('items');
  }
  const { items, nodes } = built;

  const maxWidth = p.clientWidth - SAFETY;
  const lines = breakParagraph(items, maxWidth, spaceWidth(fontOf(p)));
  if (!lines) {
    return skip('lines');
  }

  // Group surgery per text node, then rebuild each node once. Every glue
  // of a justified line gets a span — pass 2 needs a handle on each space.
  const editsByNode = new Map<Text, NodeEdit[]>();
  const push = (node: Text, edit: NodeEdit) => {
    const list = editsByNode.get(node);
    if (list) list.push(edit);
    else editsByNode.set(node, [edit]);
  };
  for (const line of lines) {
    if (line.justify) {
      for (const g of line.glue) {
        push(g.node, { start: g.start, end: g.end, type: 'sp', delta: line.delta });
      }
    }
    if (line.end.kind === 'space') {
      const r = line.end.ref;
      push(r.node, { start: r.start, end: r.end, type: 'br', delta: 0 });
    } else if (line.end.kind === 'shy') {
      const r: ShyRef = line.end.ref;
      push(r.node, { start: r.off, end: r.off + 1, type: 'brhy', delta: 0 });
    } else if (line.end.kind === 'brk') {
      const r: ShyRef = line.end.ref;
      push(r.node, { start: r.off, end: r.off, type: 'brk', delta: 0 });
    }
  }

  p.classList.add('kp');
  for (const node of nodes) {
    const edits = editsByNode.get(node);
    if (edits) {
      rebuildNode(node, edits);
    } else if (/[­\t\n\r\f]| {2,}/.test(node.data)) {
      rebuildNode(node, []);
    }
  }
  cand.enhanced = true;

  // Pass 2: anchor a range on each forced break, measure the rendered
  // lines, and verify the browser agrees with the plan line by line.
  const lineHeight = parseFloat(cs.lineHeight);
  const pr = p.getBoundingClientRect();
  const breaks: { node: Text; off: number }[] = [];
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if ((t.parentElement as Element | null)?.closest('.sidenote')) continue;
    const data = (t as Text).data;
    for (let i = data.indexOf('\n'); i !== -1; i = data.indexOf('\n', i + 1)) {
      breaks.push({ node: t as Text, off: i });
    }
  }
  const fail = (reason: string): void => {
    restore(cand);
    stats.reverted++;
    stats.lastRevert = { reason, planned: lines.length, sample: (p.textContent ?? '').slice(0, 60) };
  };
  if (breaks.length !== lines.length - 1) {
    return fail('breaks');
  }

  const spans = p.querySelectorAll<HTMLSpanElement>('.kp-s');
  const range = document.createRange();
  let spanIdx = 0;
  const corrections: { span: HTMLSpanElement; value: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (i === 0) range.setStart(p, 0);
    else range.setStart(breaks[i - 1]!.node, breaks[i - 1]!.off + 1);
    if (i < breaks.length) range.setEnd(breaks[i]!.node, breaks[i]!.off);
    else range.setEnd(p, p.childNodes.length);

    // Sidenote floats sit past the right edge — exclude their rects, then
    // read the line's true extent from what remains.
    let right = pr.left;
    let top = Infinity;
    let bottom = -Infinity;
    for (const r of range.getClientRects()) {
      if (r.width <= 0 || r.left > pr.right - 1) continue;
      if (r.right > right) right = r.right;
      if (r.top < top) top = r.top;
      if (r.bottom > bottom) bottom = r.bottom;
    }
    if (bottom - top > lineHeight * 1.6) {
      return fail('wrap'); // an unplanned soft wrap inside a planned line
    }
    if (!line.justify) continue;
    const corr = (pr.right - TARGET - right) / line.glue.length;
    const value = `${(line.delta + corr).toFixed(3)}px`;
    for (let j = 0; j < line.glue.length; j++) {
      const span = spans[spanIdx + j];
      if (!span) return fail('spans');
      corrections.push({ span, value });
    }
    spanIdx += line.glue.length;
  }
  // all reads done — apply the corrections in one write burst
  for (const c of corrections) c.span.style.wordSpacing = c.value;
  stats.enhanced++;
}

function restore(cand: Candidate): void {
  if (!cand.enhanced) return;
  cand.p.classList.remove('kp');
  cand.p.replaceChildren(...cand.clone.cloneNode(true).childNodes);
  cand.enhanced = false;
}

const candidates: Candidate[] = [];

function enhanceBelowViewport(): void {
  const fold = window.innerHeight - 1;
  const queue = candidates.filter(
    (c) => !c.enhanced && c.p.getBoundingClientRect().top > fold,
  );
  const idle: (cb: (d?: IdleDeadline) => void) => void =
    'requestIdleCallback' in window
      ? (cb) => requestIdleCallback(cb, { timeout: 2000 })
      : (cb) => setTimeout(cb, 1);

  const work = (deadline?: IdleDeadline) => {
    const t0 = performance.now();
    while (queue.length) {
      if (deadline && deadline.timeRemaining() < 6 && performance.now() - t0 > 4) {
        idle(work);
        return;
      }
      enhance(queue.shift()!);
    }
    stats.ms += performance.now() - t0;
  };
  idle(work);
}

export default async function mount(root: ParentNode): Promise<void> {
  if (new URLSearchParams(location.search).get('kp') === '0') return;
  measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return;
  await document.fonts.ready;

  for (const p of root.querySelectorAll<HTMLParagraphElement>('.prose p')) {
    if (p.closest('.sidenote') || p.closest('table')) continue;
    candidates.push({
      p,
      clone: p.cloneNode(true) as HTMLParagraphElement,
      enhanced: false,
    });
  }
  if (!candidates.length) return;

  enhanceBelowViewport();

  let lastWidth = document.documentElement.clientWidth;
  let timer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const width = document.documentElement.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      for (const c of candidates) restore(c);
      fontCache.clear();
      enhanceBelowViewport();
    }, 150);
  });

  // Print at the baseline: the fixed breaks are wrong for page widths.
  window.addEventListener('beforeprint', () => {
    for (const c of candidates) restore(c);
  });
  window.addEventListener('afterprint', () => enhanceBelowViewport());
}
