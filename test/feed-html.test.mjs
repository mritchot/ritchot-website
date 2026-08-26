import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeXml, feedHtml } from '../src/lib/feed-html.ts';

const SITE = 'https://ritchot.me';
const PAGE = 'https://ritchot.me/writing/example/';

test('strips the injected sidenote copy, keeps the endnote text', () => {
  const html =
    '<p>Watching it<sup><a href="#user-content-fn-1">1</a></sup>' +
    '<small class="sidenote"><sup>1</sup> The note.</small>, it felt.</p>' +
    '<section data-footnotes><p>The note.</p></section>';
  const out = feedHtml(html, SITE, PAGE);
  assert.ok(!out.includes('sidenote'));
  assert.ok(out.includes(', it felt.'));
  assert.equal(out.match(/The note\./g).length, 1);
});

test('strips a sidenote copy whose content spans lines and elements', () => {
  const html = '<p>x<small class="sidenote"><sup>1</sup> a\n<a href="/y">b</a> c</small>y</p>';
  assert.equal(feedHtml(html, SITE, PAGE), '<p>xy</p>');
});

test('leaves small elements without the sidenote class alone', () => {
  const html = '<p><small>fine print</small></p>';
  assert.equal(feedHtml(html, SITE, PAGE), html);
});

test('removes baked soft hyphens', () => {
  assert.equal(feedHtml('<p>jus\u00ADti\u00ADfied</p>', SITE, PAGE), '<p>justified</p>');
});

test('absolutizes root-relative href and src against the origin', () => {
  const out = feedHtml('<a href="/writing/x/">x</a><img src="/images/a.png">', SITE, PAGE);
  assert.equal(out, '<a href="https://ritchot.me/writing/x/">x</a><img src="https://ritchot.me/images/a.png">');
});

test('leaves protocol-relative URLs untouched', () => {
  const html = '<a href="//example.com/x">x</a>';
  assert.equal(feedHtml(html, SITE, PAGE), html);
});

test('anchors fragment-only links to the page permalink', () => {
  const out = feedHtml('<a href="#user-content-fn-1">1</a>', SITE, PAGE);
  assert.equal(out, `<a href="${PAGE}#user-content-fn-1">1</a>`);
});

test('leaves absolute URLs untouched and tolerates a trailing-slash site', () => {
  const html = '<a href="https://example.com/">x</a>';
  assert.equal(feedHtml(html, 'https://ritchot.me/', PAGE), html);
});

test('escapeXml covers the four XML metacharacters, ampersand first', () => {
  assert.equal(escapeXml('a & b <c> "d"'), 'a &amp; b &lt;c&gt; &quot;d&quot;');
  assert.equal(escapeXml('&lt;'), '&amp;lt;');
});
