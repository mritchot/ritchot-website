import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  browserOf,
  classify,
  isBot,
  isPrefetch,
  normalizePath,
  referrerHost,
  utcDay,
  visitorHash,
} from '../src/worker/lib.ts';

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0';

test('classify: feeds and documents by path, pages by content type, else nothing', () => {
  assert.equal(classify('/feed.xml', 'application/rss+xml'), 'feed');
  assert.equal(classify('/docs/x.pdf', 'application/pdf'), 'doc');
  assert.equal(classify('/resume.pdf', 'application/pdf'), 'doc');
  assert.equal(classify('/writing/a-post/', 'text/html; charset=utf-8'), 'page');
  assert.equal(classify('/theme.js', 'text/javascript'), null);
});

test('isBot: declared crawlers and libraries yes, real browsers no', () => {
  assert.equal(isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), true);
  assert.equal(isBot('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2)'), true);
  assert.equal(isBot('curl/8.7.1'), true);
  assert.equal(isBot(null), true);
  for (const ua of [CHROME, SAFARI, FIREFOX]) assert.equal(isBot(ua), false);
});

test('browserOf: client hints win, then the user agent', () => {
  assert.equal(browserOf(CHROME, '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"'), 'Chrome');
  assert.equal(browserOf(CHROME, '"Brave";v="140", "Chromium";v="140", "Not-A.Brand";v="99"'), 'Brave');
  assert.equal(browserOf(CHROME, '"Chromium";v="140", "Not/A)Brand";v="8"'), 'Chromium');
  assert.equal(browserOf(`${CHROME} Edg/140.0.0.0`, null), 'Edge');
  assert.equal(browserOf(SAFARI, null), 'Safari');
  assert.equal(browserOf(FIREFOX, null), 'Firefox');
  assert.equal(browserOf('Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) CriOS/140.0 Mobile/15E148 Safari/604.1', null), 'Chrome');
  assert.equal(browserOf(`${CHROME} SamsungBrowser/28.0`, null), 'Samsung Internet');
});

test('referrerHost: own host and subdomains are direct, www is stripped', () => {
  assert.equal(referrerHost(null, 'ritchot.me'), null);
  assert.equal(referrerHost('https://ritchot.me/writing/', 'ritchot.me'), null);
  assert.equal(referrerHost('https://ai-literacy.ritchot.me/', 'ritchot.me'), null);
  assert.equal(referrerHost('https://www.google.com/', 'ritchot.me'), 'google.com');
  assert.equal(referrerHost('android-app://com.google.android.gm', 'ritchot.me'), 'com.google.android.gm');
  assert.equal(referrerHost('not a url', 'ritchot.me'), null);
});

test('visitorHash: stable within a day, rotates across days, 16 hex chars', async () => {
  const a = await visitorHash('s', '2026-09-07', '203.0.113.9', CHROME);
  const b = await visitorHash('s', '2026-09-07', '203.0.113.9', CHROME);
  const c = await visitorHash('s', '2026-09-08', '203.0.113.9', CHROME);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{16}$/);
});

test('isPrefetch: speculative loads by either header, nothing else', () => {
  assert.equal(isPrefetch(new Headers({ 'sec-purpose': 'prefetch' })), true);
  assert.equal(isPrefetch(new Headers({ 'sec-purpose': 'prefetch;anonymous-client-ip' })), true);
  assert.equal(isPrefetch(new Headers({ 'sec-purpose': 'prerender' })), true);
  assert.equal(isPrefetch(new Headers({ purpose: 'prefetch' })), true);
  assert.equal(isPrefetch(new Headers()), false);
});

test('browserOf: user-agent fallbacks and the client-hint edge cases', () => {
  assert.equal(browserOf(null, null), 'Other');
  assert.equal(browserOf(`${CHROME} OPR/120.0.0.0`, null), 'Opera');
  assert.equal(browserOf(`${CHROME} EdgA/140.0.0.0`, null), 'Edge');
  const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
  assert.equal(browserOf(`${IOS} FxiOS/143.0 Mobile/15E148 Safari/605.1.15`, null), 'Firefox');
  assert.equal(browserOf(`${IOS} Mobile/15E148 DuckDuckGo/7 Safari/605.1.15`, null), 'DuckDuckGo');
  assert.equal(browserOf('Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15', null), 'Other');
  // a hint naming only the placeholder brand falls through to the user agent
  assert.equal(browserOf(FIREFOX, '"Not=A?Brand";v="24"'), 'Firefox');
  assert.equal(browserOf(CHROME, '"Vivaldi";v="7", "Chromium";v="140"'), 'Vivaldi');
  assert.equal(browserOf(CHROME, `"${'A'.repeat(40)}";v="1"`).length, 32);
});

test('referrerHost: lowercases, drops the port, caps the host at 253 characters', () => {
  assert.equal(referrerHost('https://News.Ycombinator.com:8443/item?id=1', 'ritchot.me'), 'news.ycombinator.com');
  assert.equal(referrerHost(`https://${'a.'.repeat(150)}com/`, 'ritchot.me').length, 253);
});

test('normalizePath caps at 512 characters; utcDay is the UTC calendar day', () => {
  assert.equal(normalizePath(`/${'x'.repeat(600)}`).length, 512);
  assert.equal(normalizePath('/writing/a/'), '/writing/a/');
  assert.equal(utcDay(new Date('2026-09-07T23:59:59.999Z')), '2026-09-07');
});
