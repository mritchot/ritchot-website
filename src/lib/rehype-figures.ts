/**
 * Rehype plugin: the migrated caption pattern becomes a proper
 * <figure><img><figcaption>. Two shapes exist in the corpus:
 *
 *   1. one paragraph holding the image AND the emphasized caption
 *      (the common Bear form — no blank line between them), and
 *   2. an image-only paragraph followed by an emphasis-only paragraph.
 *
 * The caption keeps its inline content (links survive); the emphasis
 * wrapper is dropped since figcaption styling carries the distinction.
 * Bare images stay untouched.
 */
import type { Element, ElementContent, Root, RootContent } from 'hast';

type Parent = Root | Element;

const isElement = (n: ElementContent | RootContent): n is Element => n.type === 'element';

const isWhitespace = (n: ElementContent | RootContent): boolean =>
  n.type === 'text' && n.value.trim() === '';

/** meaningful children of a paragraph (whitespace dropped) */
function meaningful(p: Element): ElementContent[] {
  return p.children.filter((c) => !isWhitespace(c));
}

function figureOf(img: Element, captionChildren: ElementContent[]): Element {
  return {
    type: 'element',
    tagName: 'figure',
    properties: {},
    children: [
      img,
      {
        type: 'element',
        tagName: 'figcaption',
        properties: {},
        children: captionChildren,
      },
    ],
  };
}

export default function rehypeFigures() {
  return (tree: Root): void => {
    const walk = (node: Parent): void => {
      const children = node.children as RootContent[];
      for (let i = 0; i < children.length; i++) {
        const child = children[i]!;
        if (!isElement(child)) continue;

        if (child.tagName === 'p') {
          const kids = meaningful(child);

          // shape 1: image and caption in the same paragraph
          if (
            kids.length === 2 &&
            isElement(kids[0]!) && kids[0]!.tagName === 'img' &&
            isElement(kids[1]!) && kids[1]!.tagName === 'em'
          ) {
            children[i] = figureOf(kids[0]!, (kids[1]! as Element).children);
            continue;
          }

          // shape 2: image-only paragraph + emphasis-only paragraph after it
          if (kids.length === 1 && isElement(kids[0]!) && kids[0]!.tagName === 'img') {
            let j = i + 1;
            while (j < children.length && isWhitespace(children[j]!)) j++;
            const next = children[j];
            if (next && isElement(next) && next.tagName === 'p') {
              const nextKids = meaningful(next);
              if (nextKids.length === 1 && isElement(nextKids[0]!) && nextKids[0]!.tagName === 'em') {
                children.splice(i, j - i + 1, figureOf(kids[0]!, (nextKids[0]! as Element).children));
                continue;
              }
            }
          }
        }
        walk(child);
      }
    };
    walk(tree);
  };
}
