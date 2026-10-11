/** Edge collector. Serves every request from the static assets binding
 *  exactly as before. Page views arrive as a POST to /hit from the page's
 *  beacon (src/islands/hit/) after the reader's first interaction; feed and
 *  document GETs are recorded as they are served. Rows go to the shared
 *  `ritchot-stats` D1 database in the background. No cookie is set and no
 *  address is stored. Schema and dashboard live in the ritchot-stats repo. */
import {
  browserOf,
  classify,
  isBot,
  isHosting,
  isNavigation,
  isPrefetch,
  isStaleChrome,
  normalizePath,
  parseHit,
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
const SCHEMA = '2';
let schemaOk: boolean | undefined;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/hit') return hit(request, url, env, ctx);
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

const HIT_HEADERS = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };

/** Records one page view from the page's beacon. Always answers 204, so a
 *  rejected report looks the same as a counted one. */
async function hit(request: Request, url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST', ...HIT_HEADERS } });
  const done = new Response(null, { status: 204, headers: HIT_HEADERS });
  try {
    if (!env.STATS || !env.VISITOR_SALT) return done;
    const host = env.SITE_HOST ?? 'ritchot.me';
    if (url.hostname !== host) return done;
    // Only the site's own pages report; a cross-site post is a forgery.
    // Chrome and Firefox always send Sec-Fetch-Site; Safari before 16.4 does not.
    const ua = request.headers.get('user-agent');
    const site = request.headers.get('sec-fetch-site');
    const origin = request.headers.get('origin');
    if (site ? site !== 'same-origin' : /Chrome\/|Firefox\//.test(ua ?? '')) return done;
    if (origin && origin !== url.origin) return done;
    if (Number(request.headers.get('content-length') ?? 0) > 4096) return done;
    const cf = request.cf as { country?: unknown; asOrganization?: unknown } | undefined;
    const now = new Date();
    if (isBot(ua) || isHosting(cf?.asOrganization) || isStaleChrome(ua ?? '', now)) return done;
    const report = parseHit(await request.text());
    if (!report) return done;
    // Count only real pages: the path must serve HTML from the assets.
    const page = await env.ASSETS.fetch(new Request(new URL(report.path, url.origin)));
    const isPage = page.status === 200 && /^text\/html\b/i.test(page.headers.get('content-type') ?? '');
    await page.body?.cancel();
    if (!isPage) return done;
    const row: Row = {
      ts: Math.floor(now.valueOf() / 1000),
      day: utcDay(now),
      kind: 'page',
      path: normalizePath(report.path),
      referrer: referrerHost(report.referrer, host),
      browser: browserOf(ua, request.headers.get('sec-ch-ua')),
      country: typeof cf?.country === 'string' ? cf.country : null,
    };
    const ip = request.headers.get('cf-connecting-ip') ?? '';
    ctx.waitUntil(write(env.STATS, env.VISITOR_SALT, row, ip, ua ?? ''));
  } catch {
    // Counting never affects the page.
  }
  return done;
}

function record(request: Request, response: Response, env: Env): Promise<void> | null {
  if (!env.STATS || !env.VISITOR_SALT) return null;
  if (request.method !== 'GET' || response.status !== 200) return null;
  const url = new URL(request.url);
  const host = env.SITE_HOST ?? 'ritchot.me';
  // Preview deployments on workers.dev must not write production rows.
  if (url.hostname !== host) return null;
  const kind = classify(url.pathname, response.headers.get('content-type'));
  // Page views are counted by /hit, never from the HTML request.
  if (!kind || kind === 'page') return null;
  const ua = request.headers.get('user-agent');
  const cf = request.cf as { country?: unknown; asOrganization?: unknown } | undefined;
  const now = new Date();
  // Feed readers are counted as they come; documents only when the request
  // looks like a reader in a current browser.
  if (kind !== 'feed') {
    if (isBot(ua) || !isNavigation(request.headers, ua ?? '') || isHosting(cf?.asOrganization)) return null;
    if (isStaleChrome(ua ?? '', now)) return null;
  }
  if (isPrefetch(request.headers)) return null;

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
    // A page counts once per visitor, path, and UTC day; the (kind, ts)
    // index keeps the check to today's page rows.
    const dayStart = Date.parse(`${row.day}T00:00:00Z`) / 1000;
    await db
      .prepare(
        'INSERT INTO views (ts, day, kind, path, visitor, referrer, browser, country) ' +
          'SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8 WHERE ?3 != \'page\' OR NOT EXISTS (' +
          "SELECT 1 FROM views WHERE kind = 'page' AND ts >= ?9 AND visitor = ?5 AND path = ?4)",
      )
      .bind(row.ts, row.day, row.kind, row.path, visitor, row.referrer, row.browser, row.country, dayStart)
      .run();
  } catch (err) {
    console.error('stats: write failed', err);
  }
}
