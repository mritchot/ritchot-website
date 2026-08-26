import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breakParagraph } from '../src/islands/pretext-justify/kp.ts';

// breakParagraph never touches ref internals; stubs stand in for DOM nodes.
const glue = (w) => ({ k: 'glue', w, ref: { node: null, start: 0, end: 1 } });
const box = (w) => ({ k: 'box', w });
const words = (count, w, gap) =>
  Array.from({ length: count * 2 - 1 }, (_, i) => (i % 2 === 0 ? box(w) : glue(gap)));

test('empty input yields null — the baseline stands', () => {
  assert.equal(breakParagraph([], 200, 10), null);
});

test('a single box wider than the measure yields null, not an overflowing plan', () => {
  assert.equal(breakParagraph([box(500)], 200, 10), null);
});

test('a paragraph that fits one line yields null — nothing to improve', () => {
  assert.equal(breakParagraph(words(3, 50, 10), 400, 10), null);
});

test('a multi-line paragraph yields justified lines with a ragged last line', () => {
  const lines = breakParagraph(words(12, 50, 10), 180, 10);
  assert.ok(Array.isArray(lines) && lines.length >= 2);
  const last = lines.at(-1);
  assert.equal(last.justify, false);
  assert.equal(last.end.kind, 'paragraph');
  for (const line of lines) {
    assert.ok(Number.isFinite(line.delta));
    assert.ok(Array.isArray(line.glue));
  }
});

test('the plan is deterministic for identical input', () => {
  const a = breakParagraph(words(12, 50, 10), 180, 10);
  const b = breakParagraph(words(12, 50, 10), 180, 10);
  assert.deepEqual(
    a.map((l) => ({ delta: l.delta, justify: l.justify, glue: l.glue.length, end: l.end.kind })),
    b.map((l) => ({ delta: l.delta, justify: l.justify, glue: l.glue.length, end: l.end.kind })),
  );
});
