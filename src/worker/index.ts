/** Edge collector. Serves every request from the static assets binding
 *  exactly as before, then records successful page, feed, and document GETs
 *  to the shared `ritchot-stats` D1 database in the background. The pages
 *  ship zero measurement bytes; no cookie is set and no address is stored.
 *  Schema and dashboard live in the ritchot-stats repo. */
import {
  browserOf,
  classify,
  isBot,
  isPrefetch,
  normalizePath,
  referrerHost,
  utcDay,
  visitorHash,
  type Kind,
} from './lib.ts';

interface Env {
  ASSETS: Fetcher;
  STATS?: D1Database;
  VISITOR_SALT?: string;
  SITE_HOST?: string;
}

interface Row {
  ts: number;
  day: string;
  kind: Kind;
  path: string;
  referrer: string | null;
  browser: string;
  country: string | null;
}

/** Must match the `schema` row in the database's meta table, which the
 *  ritchot-stats migrations own. A mismatch stops recording, never serving. */
const SCHEMA = '1';
let schemaOk: boolean | undefined;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    try {
      const job = record(request, response, env);
      if (job) ctx.waitUntil(job);
    } catch {
      // Counting never affects serving.
    }
    return response;
  },
} satisfies ExportedHandler<Env>;

function record(request: Request, response: Response, env: Env): Promise<void> | null {
  if (!env.STATS || !env.VISITOR_SALT) return null;
  if (request.method !== 'GET' || response.status !== 200) return null;
  const url = new URL(request.url);
  const host = env.SITE_HOST ?? 'ritchot.me';
  // Preview deployments on workers.dev must not write production rows.
  if (url.hostname !== host) return null;
  const kind = classify(url.pathname, response.headers.get('content-type'));
  if (!kind) return null;
  const ua = request.headers.get('user-agent');
  if (kind !== 'feed' && isBot(ua)) return null;
  if (isPrefetch(request.headers)) return null;

  const cf = request.cf as { country?: unknown } | undefined;
  const now = new Date();
  const row: Row = {
    ts: Math.floor(now.valueOf() / 1000),
    day: utcDay(now),
    kind,
    path: normalizePath(url.pathname),
    referrer: referrerHost(request.headers.get('referer'), host),
    browser: browserOf(ua, request.headers.get('sec-ch-ua')),
    country: typeof cf?.country === 'string' ? cf.country : null,
  };
  const ip = request.headers.get('cf-connecting-ip') ?? '';
  return write(env.STATS, env.VISITOR_SALT, row, ip, ua ?? '');
}

async function write(db: D1Database, salt: string, row: Row, ip: string, ua: string): Promise<void> {
  try {
    if (schemaOk === undefined) {
      const found = await db.prepare("SELECT value FROM meta WHERE key = 'schema'").first<string>('value');
      schemaOk = found === SCHEMA;
      if (!schemaOk) console.warn(`stats: schema ${found ?? 'missing'} is not ${SCHEMA}; not recording`);
    }
    if (!schemaOk) return;
    const visitor = await visitorHash(salt, row.day, ip, ua);
    await db
      .prepare(
        'INSERT INTO views (ts, day, kind, path, visitor, referrer, browser, country) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)',
      )
      .bind(row.ts, row.day, row.kind, row.path, visitor, row.referrer, row.browser, row.country)
      .run();
  } catch (err) {
    console.error('stats: write failed', err);
  }
}
