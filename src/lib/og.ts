/**
 * Build-time OG image pipeline: satori (layout → SVG) + resvg (SVG → PNG).
 * devDependencies only — nothing here ships to the client. Cards use the
 * washi ground with the canonical ink values (OG images are one-mode).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const COLORS = {
  ground: '#f7f4ef',
  ink: '#1e1c19',
  inkSoft: '#57534b',
  line: '#d9d3c7',
};

// Resolved from the project root: the prerender bundle relocates this module,
// so import.meta.url cannot anchor the path.
const fontFile = (rel: string): Promise<Buffer> =>
  readFile(join(process.cwd(), 'node_modules', rel));

interface SatoriFont {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 600;
  style: 'normal';
}

let fontsPromise: Promise<SatoriFont[]> | null = null;
const fonts = (): Promise<SatoriFont[]> =>
  (fontsPromise ??= Promise.all([
    fontFile('@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff').then(
      (data): SatoriFont => ({ name: 'Source Serif 4', data, weight: 600, style: 'normal' }),
    ),
    fontFile('@fontsource/source-serif-4/files/source-serif-4-latin-500-normal.woff').then(
      (data): SatoriFont => ({ name: 'Source Serif 4', data, weight: 500, style: 'normal' }),
    ),
    fontFile('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff').then(
      (data): SatoriFont => ({ name: 'IBM Plex Mono', data, weight: 400, style: 'normal' }),
    ),
  ]));

type SatoriNode = Parameters<typeof satori>[0];

const el = (
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
): Record<string, unknown> => ({ type, props: { style, children } });

export async function ogImage(title: string, meta?: string): Promise<Uint8Array<ArrayBuffer>> {
  const tree = el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '100%',
      height: '100%',
      backgroundColor: COLORS.ground,
      padding: 72,
    },
    [
      el(
        'div',
        {
          display: 'flex',
          fontFamily: 'Source Serif 4',
          fontWeight: 600,
          fontSize: title.length > 60 ? 54 : 66,
          lineHeight: 1.18,
          color: COLORS.ink,
          maxWidth: 1020,
        },
        title,
      ),
      el(
        'div',
        {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderTop: `1px solid ${COLORS.line}`,
          paddingTop: 28,
        },
        [
          el(
            'div',
            { fontFamily: 'Source Serif 4', fontWeight: 500, fontSize: 30, color: COLORS.ink },
            'Michael Ritchot',
          ),
          el(
            'div',
            { fontFamily: 'IBM Plex Mono', fontWeight: 400, fontSize: 22, color: COLORS.inkSoft },
            meta ?? 'ritchot.me',
          ),
        ],
      ),
    ],
  );

  const svg = await satori(tree as unknown as SatoriNode, {
    width: 1200,
    height: 630,
    fonts: await fonts(),
  });

  // Fresh copy: Response's BodyInit requires an ArrayBuffer-backed view.
  return new Uint8Array(new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng());
}
