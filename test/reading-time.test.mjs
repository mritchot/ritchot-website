import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingTime } from '../src/lib/reading-time.ts';

test('empty input floors at one minute', () => {
  assert.equal(readingTime(''), 1);
});

test('460 words at 230 wpm reads as two minutes', () => {
  assert.equal(readingTime('word '.repeat(460)), 2);
});

test('fenced and inline code do not count as words', () => {
  assert.equal(readingTime('```\nconst a = 1;\nconst b = 2;\n```\nplus `inline`'), 1);
  assert.equal(readingTime('```js\n' + 'code '.repeat(500) + '\n```'), 1);
});

test('footnote markers and definitions do not count as words', () => {
  const withMarkers = 'a body sentence[^1]\n\n[^1]: ' + 'note '.repeat(230);
  const without = 'a body sentence\n\n' + 'note '.repeat(230);
  assert.equal(readingTime(withMarkers), readingTime(without));
});
