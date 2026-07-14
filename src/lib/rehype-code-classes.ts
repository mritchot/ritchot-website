/**
 * Rehype plugin: replace markdown code fences with class-based Shiki output
 * (astro.config.ts sets markdown.syntaxHighlight: false; this takes over so
 * no inline style attributes reach the page — the CSP forbids them).
 */
import type { Element, Root, RootContent } from 'hast';
import { highlightHtml } from './highlight';

type Parent = Root | Element;

export default function rehypeCodeClasses() {
  return async (tree: Root): Promise<void> => {
    const jobs: Array<Promise<void>> = [];

    const walk = (node: Parent): void => {
      const children = node.children as RootContent[];
      children.forEach((child, index) => {
        if (child.type !== 'element') return;

        if (child.tagName === 'pre') {
          const code = child.children.find(
            (c): c is Element => c.type === 'element' && c.tagName === 'code',
          );
          const classNames = code?.properties?.className;
          const langClass = Array.isArray(classNames)
            ? classNames.map(String).find((c) => c.startsWith('language-'))
            : undefined;

          if (code && langClass) {
            const text = code.children
              .map((c) => (c.type === 'text' ? c.value : ''))
              .join('');
            const lang = langClass.slice('language-'.length);
            jobs.push(
              highlightHtml(text, lang).then((html) => {
                children[index] = { type: 'raw', value: html } as unknown as RootContent;
              }),
            );
            return;
          }
        }

        walk(child);
      });
    };

    walk(tree);
    await Promise.all(jobs);
  };
}
