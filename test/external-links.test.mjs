import { test } from 'node:test';
import assert from 'node:assert/strict';
import { externalAttrs, isExternalHref } from '../src/lib/rehype-external-links.ts';

test('a different origin is external — subdomains included', () => {
  assert.equal(isExternalHref('https://example.com/x'), true);
  assert.equal(isExternalHref('https://ai-literacy.ritchot.me/'), true);
});

test('the site origin is internal', () => {
  assert.equal(isExternalHref('https://ritchot.me/writing/x/'), false);
});

test('a protocol change is a different origin (current contract)', () => {
  assert.equal(isExternalHref('http://ritchot.me/x'), true);
});

test('non-http(s) and relative references are never external', () => {
  assert.equal(isExternalHref('mailto:michael@ritchot.me'), false);
  assert.equal(isExternalHref('/writing/x/'), false);
  assert.equal(isExternalHref('#fragment'), false);
  assert.equal(isExternalHref('//example.com/x'), false);
});

test('externalAttrs yields the new-tab pair for external, nothing for internal', () => {
  assert.deepEqual(externalAttrs('https://example.com/'), {
    target: '_blank',
    rel: 'noopener noreferrer',
  });
  assert.deepEqual(externalAttrs('/docs/x.pdf'), {});
});
