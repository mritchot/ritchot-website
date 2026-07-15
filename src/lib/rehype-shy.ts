/**
 * Rehype plugin: bake en-US soft hyphens (U+00AD) into prose text at build
 * time. The CSS baseline breaks at them via `hyphens: manual`, and the
 * pretext-justify island (D22) reads the same marks as its hyphenation
 * candidates, so baseline and enhanced rendering share one set of break
 * opportunities. Headings, code, links, footnote refs, and the sidenote
 * copies (already `hyphens: none`) are left untouched; the feeds strip the
 * marks on output.
 */
import type { Element, Root, RootContent } from 'hast';
// hyphen ships CommonJS; Vite's runner needs the default-import interop form.
import hyphen from 'hyphen/en-us';

const { hyphenateSync } = hyphen;

const SKIP = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'pre', 'code', 'a', 'sup', 'small', 'script', 'style',
]);

export default function rehypeShy() {
  return (tree: Root): void => {
    const walk = (node: Root | Element): void => {
      for (const child of node.children as RootContent[]) {
        if (child.type === 'text') {
          child.value = hyphenateSync(child.value, {
            hyphenChar: '­',
            minWordLength: 6,
          });
        } else if (child.type === 'element' && !SKIP.has(child.tagName)) {
          walk(child);
        }
      }
    };
    walk(tree);
  };
}
