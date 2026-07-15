/**
 * Rehype plugin: mirror GFM footnotes as inline sidenote elements so pure CSS
 * can render margin notes ≥ 1200px (inline copy shown, endnotes hidden) and
 * numbered endnotes below that width (inline copy hidden). Zero runtime JS;
 * the small duplication is build-time HTML only.
 */
import type { Element, ElementContent, Root, RootContent } from 'hast';

type Parent = Root | Element;

const isElement = (n: { type: string }): n is Element => n.type === 'element';

function footnoteInline(li: Element): ElementContent[] {
  // Drop the backref arrow; unwrap a single leading paragraph to inline content.
  const kept = li.children.filter(
    (c) => !(isElement(c) && c.properties?.dataFootnoteBackref !== undefined),
  );
  const first = kept.find(isElement);
  if (kept.length >= 1 && first && first.tagName === 'p' && kept.filter(isElement).length === 1) {
    return first.children.filter(
      (c) => !(isElement(c) && c.properties?.dataFootnoteBackref !== undefined),
    );
  }
  return kept;
}

export default function rehypeSidenotes() {
  return (tree: Root): void => {
    // 1. Find the GFM footnotes section and collect definitions by id.
    const defs = new Map<string, ElementContent[]>();

    const findSection = (node: Parent): Element | null => {
      for (const child of node.children as RootContent[]) {
        if (!isElement(child)) continue;
        if (child.properties?.dataFootnotes !== undefined) return child;
        const found = findSection(child);
        if (found) return found;
      }
      return null;
    };

    const section = findSection(tree);
    if (!section) return;

    // iOS renders the bare return arrow (U+21A9) as emoji; the variation
    // selector U+FE0E forces text presentation everywhere (5c finding 8)
    const fixBackrefs = (node: Parent): void => {
      for (const child of node.children as RootContent[]) {
        if (!isElement(child)) continue;
        if (child.properties?.dataFootnoteBackref !== undefined) {
          for (const c of child.children) {
            if (c.type === 'text' && c.value.includes('\u21A9') && !c.value.includes('\uFE0E')) {
              c.value = c.value.replaceAll('\u21A9', '\u21A9\uFE0E');
            }
          }
        } else {
          fixBackrefs(child);
        }
      }
    };
    fixBackrefs(section);

    const collectLis = (node: Parent): void => {
      for (const child of node.children as RootContent[]) {
        if (!isElement(child)) continue;
        if (child.tagName === 'li' && typeof child.properties?.id === 'string') {
          defs.set(child.properties.id, footnoteInline(child));
        } else {
          collectLis(child);
        }
      }
    };
    collectLis(section);

    // 2. After each footnote reference, insert the inline sidenote copy.
    const insertions: Array<{ parent: Parent; index: number; node: Element }> = [];

    const walk = (node: Parent): void => {
      const children = node.children as RootContent[];
      children.forEach((child, index) => {
        if (!isElement(child)) return;

        const ref =
          child.tagName === 'sup'
            ? child.children.find(
                (c): c is Element =>
                  isElement(c) && c.properties?.dataFootnoteRef !== undefined,
              )
            : undefined;

        if (ref && typeof ref.properties?.href === 'string') {
          const id = ref.properties.href.slice(1);
          const content = defs.get(id);
          const number = ref.children
            .map((c) => (c.type === 'text' ? c.value : ''))
            .join('');
          if (content) {
            insertions.push({
              parent: node,
              index: index + 1,
              node: {
                type: 'element',
                tagName: 'small',
                properties: { className: ['sidenote'] },
                children: [
                  {
                    type: 'element',
                    tagName: 'sup',
                    properties: {},
                    children: [{ type: 'text', value: number }],
                  },
                  { type: 'text', value: ' ' },
                  ...structuredClone(content),
                ],
              },
            });
          }
          return;
        }

        walk(child);
      });
    };
    walk(tree);

    // Apply insertions in reverse so earlier indices stay valid.
    for (const { parent, index, node } of insertions.reverse()) {
      (parent.children as RootContent[]).splice(index, 0, node);
    }
  };
}
