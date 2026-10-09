/** Pure helpers for the edge collector. Nothing here touches a binding or a
 *  Workers-only type, so the file runs under node:test with
 *  --experimental-strip-types as well as inside the Worker. */

export type Kind = 'page' | 'feed' | 'doc';

const FEEDS = new Set(['/feed.xml', '/atom.xml', '/feed.json']);

/** What a successful GET at this path counts as; null means do not count. */
export function classify(pathname: string, contentType: string | null): Kind | null {
  if (FEEDS.has(pathname)) return 'feed';
  if (pathname.startsWith('/docs/') || pathname === '/resume.pdf') return 'doc';
  if (contentType && /^text\/html\b/i.test(contentType)) return 'page';
  return null;
}

// Declared crawlers, previewers, HTTP libraries, and monitors. Verified-bot
// data is not exposed to Workers on the Free plan, so declared bots are
// matched by user agent; isNavigation and isHosting below catch the ones that
// pose as browsers. Feed readers are matched here too, which is why feed rows
// skip these checks.
const BOT =
  /bot|crawl|spider|slurp|scrap|fetch|headless|phantom|python|curl\/|wget|httpclient|java\/|go-http|okhttp|libwww|monitor|uptime|pingdom|lighthouse|pagespeed|preview|externalhit|whatsapp|telegram|discord|slack|embedly|pinterest|ahrefs|semrush|mj12|dotbot|petalbot|bytespider|gptbot|claude|anthropic|openai|perplexity|ccbot|applebot|amazonbot|dataforseo|feed|rss|yandex|baidu|ia_archiver|archive\.org/i;

export function isBot(ua: string | null): boolean {
  if (!ua || ua.length < 20) return true;
  return BOT.test(ua);
}

// Cloud and web-hosting networks, matched on Cloudflare's AS organization
// name. Readers almost never browse from one; crawlers and scanners that
// pose as browsers mostly do. Cloudflare, Akamai, and Fastly stay off the
// list because iCloud Private Relay and WARP carry real readers through
// them, and consumer VPN hosts stay off for the same reason.
const HOSTING =
  /amazon|google(?! fiber)|microsoft|oracle|alibaba|tencent|huawei.?cloud|digitalocean|linode|vultr|choopa|hetzner|ovh|contabo|scaleway|leaseweb|ionos|hostinger|hostpapa|godaddy|kamatera|meta platforms|facebook|zenlayer|colocrossing|hostwinds|netcup|bytedance/i;

export function isHosting(asOrganization: unknown): boolean {
  return typeof asOrganization === 'string' && HOSTING.test(asOrganization);
}

/** Whether the request carries what a browser sends when a reader opens a
 *  page: an Accept-Language header and Sec-Fetch-Dest "document". Safari
 *  before 16.4 sends no Sec-Fetch headers, so their absence counts against
 *  a request only when the user agent claims Chrome or Firefox, which have
 *  sent them since 2020 and 2021. */
export function isNavigation(headers: Headers, ua: string): boolean {
  if (!headers.get('accept-language')) return false;
  const dest = headers.get('sec-fetch-dest');
  if (dest) return dest === 'document';
  return !/Chrome\/|Firefox\//.test(ua);
}

export function isPrefetch(headers: Headers): boolean {
  const purpose = headers.get('sec-purpose') ?? headers.get('purpose') ?? '';
  return /prefetch|prerender/i.test(purpose);
}

const CH_BRANDS: [RegExp, string][] = [
  [/^Microsoft Edge$/i, 'Edge'],
  [/^Google Chrome$/i, 'Chrome'],
  [/^Brave$/i, 'Brave'],
  [/^Opera( GX)?$/i, 'Opera'],
  [/^Samsung Internet$/i, 'Samsung Internet'],
  [/^Chromium$/i, 'Chromium'],
];

/** Browser family. Chromium browsers name themselves in Sec-CH-UA, which is
 *  the only place Brave is visible; everything else falls back to the UA. */
export function browserOf(ua: string | null, secChUa: string | null): string {
  if (secChUa) {
    const brands = [...secChUa.matchAll(/"([^"]+)";\s*v="[^"]*"/g)].map((m) => m[1] ?? '');
    const named = brands.filter((b) => !/not.?a.?brand/i.test(b) && !/^chromium$/i.test(b));
    const pick = named[0] ?? brands.find((b) => /^chromium$/i.test(b));
    if (pick) {
      for (const [re, name] of CH_BRANDS) if (re.test(pick)) return name;
      return pick.slice(0, 32);
    }
  }
  if (!ua) return 'Other';
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser\//.test(ua)) return 'Samsung Internet';
  if (/DuckDuckGo\//.test(ua)) return 'DuckDuckGo';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'Firefox';
  if (/CriOS\/|Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari';
  return 'Other';
}

/** External referring host, or null for direct and same-site traffic. */
export function referrerHost(referer: string | null, selfHost: string): string | null {
  if (!referer) return null;
  let host: string;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host || host === selfHost || host.endsWith(`.${selfHost}`)) return null;
  return host.replace(/^www\./, '').slice(0, 253);
}

export function normalizePath(pathname: string): string {
  return pathname.slice(0, 512);
}

export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Sixteen hex characters of SHA-256 over the secret, the UTC day, the
 *  address, and the user agent. The day in the preimage rotates the value
 *  every 24 hours, so a stored hash cannot be joined across days or reversed
 *  to an address. The same scheme Bear, GoatCounter, and Plausible use. */
export async function visitorHash(secret: string, day: string, ip: string, ua: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${secret}|${day}|${ip}|${ua}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
