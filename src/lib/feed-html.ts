/** Feed-content HTML transforms. Astro-free on purpose: `npm test` runs this
 * module under plain Node, where writing.ts's astro:content import cannot
 * resolve. writing.ts re-exports feedHtml for the feed endpoints. */

/** Feed content is the build-rendered page HTML minus its page-only markup:
 * the inline sidenote copies rehype-sidenotes injects for the margin-note
 * layout (feed readers load no site CSS, so both copies of every footnote
 * would render, one spliced mid-sentence) and the baked soft hyphens.
 * Root-relative href/src values then resolve against the site origin, and
 * fragment-only anchors (e.g. footnote links like #user-content-fn-1) against
 * the page's own permalink — feed readers handle relative references
 * unreliably. Page HTML is untouched. */
export function feedHtml(html: string, site: URL | string, pageUrl: string): string {
  // The copies are build-generated with exactly this shape, and the corpus
  // holds no raw <small>, so the non-greedy match cannot end early.
  const stripped = html
    .replace(/<small class="sidenote">[\s\S]*?<\/small>/g, '')
    .replaceAll('\u00ad', '');
  return absolutizeHtml(stripped, site, pageUrl);
}

/** XML-escapes text for element and attribute context. One unescaped `&`
 * invalidates a whole Atom document, and readers drop it wholesale. */
export function escapeXml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function absolutizeHtml(html: string, site: URL | string, pageUrl?: string): string {
  const origin = String(site).replace(/\/+$/, '');
  let out = html.replace(/(href|src)="\/(?!\/)/g, `$1="${origin}/`);
  if (pageUrl) out = out.replace(/(href|src)="(#[^"]*)"/g, `$1="${pageUrl}$2"`);
  return out;
}
