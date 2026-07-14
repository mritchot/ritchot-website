import type { APIRoute } from 'astro';
import { sortedWriting, slugOf, formatDate } from '../../lib/writing';
import { ogImage } from '../../lib/og';

interface Props {
  title: string;
  meta: string;
}

export async function getStaticPaths() {
  const entries = await sortedWriting();
  return entries.map((entry) => ({
    params: { slug: `writing/${slugOf(entry)}` },
    props: {
      title: entry.data.title,
      meta: `${entry.data.type} · ${formatDate(entry.data.date)}`,
    } satisfies Props,
  }));
}

export const GET: APIRoute<Props> = async ({ props }) => {
  const png = await ogImage(props.title, props.meta);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
