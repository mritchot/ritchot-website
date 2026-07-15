/**
 * Rehype plugin: stamp intrinsic width/height onto site-local images
 * (`/images/…`, `/docs/…`). Content images bypass the asset pipeline —
 * the format ruling (5c: no WebP/AVIF) serves originals from public/ —
 * so the dimensions that reserve layout space (CLS 0) are read from the
 * files at build time; `img { height: auto }` then preserves the ratio
 * at every width.
 */
import { join } from 'node:path';
import sharp from 'sharp';
import type { Element, Root, RootContent } from 'hast';

type Parent = Root | Element;

const cache = new Map<string, { width: number; height: number } | null>();

async function dimensions(src: string): Promise<{ width: number; height: number } | null> {
  let dims = cache.get(src);
  if (dims === undefined) {
    try {
      const meta = await sharp(join(process.cwd(), 'public', src)).metadata();
      dims = meta.width && meta.height ? { width: meta.width, height: meta.height } : null;
    } catch {
      dims = null;
    }
    cache.set(src, dims);
  }
  return dims;
}

export default function rehypeImgDims() {
  return async (tree: Root): Promise<void> => {
    const jobs: Promise<void>[] = [];
    const walk = (node: Parent): void => {
      for (const child of node.children as RootContent[]) {
        if (child.type !== 'element') continue;
        if (
          child.tagName === 'img' &&
          typeof child.properties?.src === 'string' &&
          child.properties.src.startsWith('/') &&
          child.properties.width === undefined
        ) {
          const el = child;
          const src = child.properties.src;
          jobs.push(
            dimensions(src).then((dims) => {
              if (dims) {
                el.properties.width = dims.width;
                el.properties.height = dims.height;
              }
            }),
          );
        }
        walk(child);
      }
    };
    walk(tree);
    await Promise.all(jobs);
  };
}
