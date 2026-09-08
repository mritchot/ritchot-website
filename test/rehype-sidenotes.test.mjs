import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raw } from 'hast-util-raw';
import { toHtml } from 'hast-util-to-html';
import rehypeSidenotes from '../src/lib/rehype-sidenotes.ts';

// Minimal GFM output shape, per mdast-util-to-hast: the backref anchor sits
// INSIDE the definition's last <p>.
const el = (tagName, properties = {}, children = []) => ({ type: 'element', tagName, properties, children });
const txt = (value) => ({ type: 'text', value });
const backref = (n) =>
  el('a', { dataFootnoteBackref: true, href: `#user-content-fnref-${n}` }, [txt('↩')]);
const ref = (n) =>
  el('sup', {}, [el('a', { dataFootnoteRef: true, href: `#user-content-fn-${n}` }, [txt(String(n))])]);

const fixture = () => ({
  type: 'root',
  children: [
    el('p', {}, [txt('Sentence'), ref(1), txt(' and'), ref(2), txt('.')]),
    el('section', { dataFootnotes: true, className: ['footnotes'] }, [
      el('ol', {}, [
        el('li', { id: 'user-content-fn-1' }, [
          el('p', {}, [txt('Single-paragraph note. '), backref(1)]),
        ]),
        el('li', { id: 'user-content-fn-2' }, [
          el('p', {}, [txt('First paragraph.')]),
          el('p', {}, [txt('Second paragraph. '), backref(2)]),
        ]),
      ]),
    ]),
  ],
});

const sidenotesIn = (tree) => {
  const found = [];
  (function walk(n) {
    if (n.tagName === 'small') found.push(n);
    (n.children || []).forEach(walk);
  })(tree);
  return found;
};

test('inserts one copy per reference, none carrying a backref arrow', () => {
  const tree = fixture();
  rehypeSidenotes()(tree);
  const copies = sidenotesIn(tree);
  assert.equal(copies.length, 2);
  assert.ok(!JSON.stringify(copies).includes('dataFootnoteBackref'));
});

test('the endnote section keeps its backref arrows', () => {
  const tree = fixture();
  rehypeSidenotes()(tree);
  const section = JSON.stringify(tree.children[1]);
  assert.equal(section.split('dataFootnoteBackref').length - 1, 2);
});

test('a single-paragraph definition unwraps to inline content', () => {
  const tree = fixture();
  rehypeSidenotes()(tree);
  assert.ok(!JSON.stringify(sidenotesIn(tree)[0]).includes('"tagName":"p"'));
});

test('a multi-paragraph definition keeps its breaks as block spans, never a nested <p>', () => {
  const tree = fixture();
  rehypeSidenotes()(tree);
  const copy = sidenotesIn(tree)[1];
  const spans = copy.children.filter((c) => c.tagName === 'span');
  assert.equal(spans.length, 2);
  assert.ok(spans.every((s) => s.properties.className.includes('sidenote-p')));
  assert.ok(!JSON.stringify(copy).includes('"tagName":"p"'));
});

test('the host paragraph survives HTML tree construction in one piece', () => {
  // Astro runs rehype-raw after this plugin. A <p> inside the copy would end
  // the host paragraph there and strand the prose after the reference.
  const tree = fixture();
  rehypeSidenotes()(tree);
  const html = toHtml(raw(tree));
  assert.ok(html.startsWith('<p>Sentence<sup>'), html);
  assert.ok(html.includes('</small>.</p><section'), html);
  assert.equal((html.match(/<p>/g) ?? []).length, 4, html);
  assert.doesNotMatch(html, /<p><\/p>/);
});

test('backref arrows get the text-presentation selector, and only once', () => {
  const tree = fixture();
  tree.children[1].children[0].children[0].children[0].children[1].children[0].value = '↩\uFE0E';
  rehypeSidenotes()(tree);
  const arrows = [];
  (function walk(n) {
    if (n.properties?.dataFootnoteBackref !== undefined) arrows.push(n.children[0].value);
    (n.children || []).forEach(walk);
  })(tree.children[1]);
  assert.deepEqual(arrows, ['↩\uFE0E', '↩\uFE0E']);
});

test('a reference to an undefined footnote inserts no copy', () => {
  const tree = fixture();
  tree.children[0].children.push(ref(9));
  rehypeSidenotes()(tree);
  assert.equal(sidenotesIn(tree).length, 2);
});

test('a document without footnotes is untouched', () => {
  const tree = { type: 'root', children: [el('p', {}, [txt('Plain.')])] };
  const before = JSON.stringify(tree);
  rehypeSidenotes()(tree);
  assert.equal(JSON.stringify(tree), before);
});
