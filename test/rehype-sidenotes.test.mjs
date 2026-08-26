import { test } from 'node:test';
import assert from 'node:assert/strict';
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

test('a multi-paragraph definition keeps its paragraphs in the copy', () => {
  const tree = fixture();
  rehypeSidenotes()(tree);
  assert.ok(JSON.stringify(sidenotesIn(tree)[1]).includes('"tagName":"p"'));
});

test('a document without footnotes is untouched', () => {
  const tree = { type: 'root', children: [el('p', {}, [txt('Plain.')])] };
  const before = JSON.stringify(tree);
  rehypeSidenotes()(tree);
  assert.equal(JSON.stringify(tree), before);
});
