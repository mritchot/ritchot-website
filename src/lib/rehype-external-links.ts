/**
 * Rehype plugin: send cross-origin links to a new tab. An anchor is external
 * when its href is an absolute http(s) URL whose origin differs from the
 * site's — note that `ai-literacy.ritchot.me` is a different origin from
 * `ritchot.me` and so counts as external. Root-relative links (`/writing/…`,
 * `/docs/…`), fragments, and mailto: are left alone.
 *
 * Registered ahead of rehypeSidenotes so the inline footnote copies it clones
 * inherit the attributes rather than needing a second pass.
 */
import type { Element, Root, RootContent } from 'hast';

/** Matches astro.config.ts `site`. */
const SITE_ORIGIN = 'https://ritchot.me';

/** Shared with the components that hand-write anchors (footer, about, resume,
 * quicklinks, hub collections) so one rule governs the whole site. */
export function isExternalHref(href: string): boolean {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return new URL(href).origin !== SITE_ORIGIN;
  } catch {
    return false;
  }
}

/** Spread onto an anchor built from data whose origin isn't known up front. */
export function externalAttrs(
  href: string,
): { target: '_blank'; rel: string } | Record<string, never> {
  return isExternalHref(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

export default function rehypeExternalLinks() {
  return (tree: Root): void => {
    const walk = (node: Root | Element): void => {
      for (const child of node.children as RootContent[]) {
        if (child.type !== 'element') continue;
        if (
          child.tagName === 'a' &&
          typeof child.properties?.href === 'string' &&
          isExternalHref(child.properties.href)
        ) {
          child.properties.target = '_blank';
          child.properties.rel = ['noopener', 'noreferrer'];
        }
        walk(child);
      }
    };
    walk(tree);
  };
}
