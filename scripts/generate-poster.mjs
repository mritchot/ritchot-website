// Generates src/components/SuminagashiPoster.astro — the frozen-marble hero
// poster (§4.8). Real drop-displacement marbling (Jaffer's model): each drop
// pushes every earlier edge outward, so rings nest and deform around each
// other and never cross; a final tine pass gives the field a soft current.
// Deterministic (seeded); rerun after parameter changes:
//   node scripts/generate-poster.mjs
import { writeFileSync } from 'node:fs';

const SEED = 20260714;
const W = 1600;
const H = 1000;
const PTS = 44;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);
const between = (lo, hi) => lo + rand() * (hi - lo);

// --- marbling core (same math the live sim uses) ---

/** displace existing point P by a new drop (center c, radius r) */
function displace(p, c, r) {
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  const d2 = dx * dx + dy * dy;
  if (d2 === 0) return p;
  const s = Math.sqrt(1 + (r * r) / d2);
  return [c[0] + dx * s, c[1] + dy * s];
}

/** tine line: directional current u through point a, strength z, falloff c */
function tine(p, a, u, z, c) {
  const n = [-u[1], u[0]];
  const d = Math.abs((p[0] - a[0]) * n[0] + (p[1] - a[1]) * n[1]);
  const f = z * Math.exp(-d / c);
  return [p[0] + u[0] * f, p[1] + u[1] * f];
}

const drops = []; // { pts, fill, opacity, stroke? }

function addDrop(cx, cy, r, style) {
  // every earlier drop is displaced by this one
  for (const d of drops) d.pts = d.pts.map((p) => displace(p, [cx, cy], r));
  // slight harmonic irregularity so edges feel hand-poured, not compass-drawn
  const wob = [
    { h: 3, A: between(0.006, 0.02), phi: between(0, 6.283) },
    { h: 5, A: between(0.004, 0.012), phi: between(0, 6.283) },
  ];
  const pts = [];
  for (let i = 0; i < PTS; i++) {
    const th = (i / PTS) * Math.PI * 2;
    let rr = r;
    for (const { h, A, phi } of wob) rr += A * r * Math.sin(h * th + phi);
    pts.push([cx + rr * Math.cos(th), cy + rr * Math.sin(th)]);
  }
  drops.push({ pts, ...style });
}

// --- composition ---
const INK = (o) => ({ fill: 'var(--ink)', opacity: o });
const GROUND = { fill: 'var(--ground)', opacity: 1 };

// main bloom, low-left of center — alternating ink/water, fat/thin cadence
const M = [670, 520];
addDrop(...M, 250, INK(0.62));
addDrop(...M, 105, GROUND);
addDrop(...M, 205, INK(0.5));
addDrop(...M, 190, GROUND);
addDrop(...M, 200, INK(0.78));
addDrop(...M, 120, GROUND);
addDrop(...M, 90, INK(0.35));
addDrop(...M, 185, GROUND);
addDrop(...M, 110, INK(0.88));
addDrop(...M, 60, GROUND);
// ember accent: one slender ring carried outward by later drops
addDrop(...M, 85, { fill: 'var(--hero-accent)', opacity: 0.62 });
addDrop(...M, 70, GROUND);
// quiet heart
addDrop(...M, 55, INK(0.82));
addDrop(...M, 24, GROUND);

// signal hairline: unfilled stroked edge, carried by everything after it
addDrop(...M, 130, { fill: 'none', stroke: 'var(--signal)', opacity: 0.6 });

// second bloom upper-right — close enough to shove the main bloom's rings
const S = [1210, 300];
addDrop(...S, 160, INK(0.4));
addDrop(...S, 110, GROUND);
addDrop(...S, 95, INK(0.72));
addDrop(...S, 50, GROUND);
addDrop(...S, 45, INK(0.85));
addDrop(...S, 20, GROUND);

// whisper at the lower-right horizon, mostly cropped
const T = [1520, 950];
addDrop(...T, 190, INK(0.2));
addDrop(...T, 110, GROUND);
addDrop(...T, 70, INK(0.4));
addDrop(...T, 32, GROUND);

// clearing pour: reserves quiet water for the lower-third overlay (§4.8) —
// later drops of plain water push the field away from where the name sits
addDrop(400, 830, 230, GROUND);
addDrop(700, 900, 150, GROUND);

// satellite flecks
addDrop(360, 240, 16, INK(0.5));
addDrop(1060, 760, 11, INK(0.42));
addDrop(930, 130, 8, INK(0.3));

// current: two shallow tine passes, opposing diagonals — the S-flow
const u1 = [Math.cos(-0.22), Math.sin(-0.22)];
const u2 = [Math.cos(2.75), Math.sin(2.75)];
for (const d of drops) {
  d.pts = d.pts.map((p) => tine(p, [200, 820], u1, 130, 520));
  d.pts = d.pts.map((p) => tine(p, [1520, 100], u2, 90, 430));
}

// --- emit: relative integer cubics, drift-corrected (compact path data) ---
function toPath(pts) {
  const n = pts.length;
  const R = Math.round;
  let cx = R(pts[0][0]);
  let cy = R(pts[0][1]);
  let d = `M${cx} ${cy}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    // deltas from the ROUNDED current point so rounding never accumulates
    const ex = R(p2[0]) - cx;
    const ey = R(p2[1]) - cy;
    d += `c${R(c1x) - cx} ${R(c1y) - cy} ${R(c2x) - cx} ${R(c2y) - cy} ${ex} ${ey}`;
    cx += ex;
    cy += ey;
  }
  return d + 'Z';
}

const els = drops
  .map((d) => {
    const path = toPath(d.pts);
    if (d.stroke) {
      return `  <path fill="none" stroke="${d.stroke}" stroke-opacity="${d.opacity}" stroke-width="1.5" d="${path}"/>`;
    }
    return `  <path fill="${d.fill}" fill-opacity="${d.opacity}" d="${path}"/>`;
  })
  .join('\n');

const svg = `---
/**
 * Frozen suminagashi poster — generated by scripts/generate-poster.mjs
 * (seed ${SEED}); do not hand-edit path data. LCP element and the permanent
 * no-JS / reduced-motion / island-failure state (§4.8).
 */
---

<svg
  class="poster"
  viewBox="0 0 ${W} ${H}"
  preserveAspectRatio="xMidYMid slice"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
>
${els}
</svg>

<style>
  .poster {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
`;

writeFileSync(
  new URL('../src/components/SuminagashiPoster.astro', import.meta.url),
  svg,
);
console.log(`poster written: ${drops.length} drops, ~${Math.round(svg.length / 1024)} KB component`);
