import type { APIRoute } from 'astro';
import { ogImage } from '../../lib/og';

export const GET: APIRoute = async () => {
  const png = await ogImage('Michael Ritchot');
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
