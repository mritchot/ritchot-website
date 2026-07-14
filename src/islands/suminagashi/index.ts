/**
 * Suminagashi hero island — vanilla TS, zero runtime dependencies, decorative.
 * Same drop/tine mathematics as the static poster generator: new drops push
 * every earlier edge outward (rings nest, never cross); tine passes are the
 * current. The canvas paints its own ground and crossfades in over the poster;
 * the poster remains the no-JS / reduced-motion / failure state.
 *
 * Discipline (§3.8/§4.8): devicePixelRatio ≤ 2; pauses when the tab is hidden
 * or the hero leaves the viewport; ~30fps idle, 60fps only while stirring;
 * aria-hidden, pointer-events: none (stirring listens on the host).
 */

type Pt = [number, number];

interface Drop {
  pts: Pt[];
  fill: string | null;
  stroke: string | null;
  alpha: number;
}

interface Palette {
  ground: string;
  ink: string;
  accent: string;
  signal: string;
}

const TAU = Math.PI * 2;
const EDGE_PTS = 64;
const MAX_DROPS = 70;

function displace(p: Pt, cx: number, cy: number, r: number): Pt {
  const dx = p[0] - cx;
  const dy = p[1] - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 === 0) return p;
  const s = Math.sqrt(1 + (r * r) / d2);
  return [cx + dx * s, cy + dy * s];
}

function tine(p: Pt, ax: number, ay: number, ux: number, uy: number, z: number, c: number): Pt {
  const d = Math.abs((p[0] - ax) * -uy + (p[1] - ay) * ux);
  const f = z * Math.exp(-d / c);
  return [p[0] + ux * f, p[1] + uy * f];
}

function circle(cx: number, cy: number, r: number): Pt[] {
  const pts: Pt[] = [];
  const w3 = 0.008 + Math.random() * 0.014;
  const w5 = 0.005 + Math.random() * 0.009;
  const p3 = Math.random() * TAU;
  const p5 = Math.random() * TAU;
  for (let i = 0; i < EDGE_PTS; i++) {
    const th = (i / EDGE_PTS) * TAU;
    const rr = r * (1 + w3 * Math.sin(3 * th + p3) + w5 * Math.sin(5 * th + p5));
    pts.push([cx + rr * Math.cos(th), cy + rr * Math.sin(th)]);
  }
  return pts;
}

export function mountSuminagashi(host: HTMLElement): void {
  const canvas = document.createElement('canvas');
  canvas.className = 'sumi';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // poster remains

  const drops: Drop[] = [];
  let palette = readPalette();
  let width = 0;
  let height = 0;
  let raf = 0;
  let frame = 0;
  let active = true; // page visible AND hero on screen
  let dirty = true;
  let lastStir = 0;
  let breathe = Math.random() * TAU;
  let pointer: { x: number; y: number; t: number } | null = null;
  let onScreen = true;

  function readPalette(): Palette {
    const cs = getComputedStyle(host);
    return {
      ground: cs.getPropertyValue('--ground').trim(),
      ink: cs.getPropertyValue('--ink').trim(),
      accent: cs.getPropertyValue('--hero-accent').trim(),
      signal: cs.getPropertyValue('--signal').trim(),
    };
  }

  function resize(): void {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  }

  function addDrop(cx: number, cy: number, r: number, style: Partial<Drop>): void {
    for (const d of drops) {
      for (let i = 0; i < d.pts.length; i++) d.pts[i] = displace(d.pts[i]!, cx, cy, r);
    }
    drops.push({
      pts: circle(cx, cy, r),
      fill: style.fill ?? null,
      stroke: style.stroke ?? null,
      alpha: style.alpha ?? 1,
    });
    dirty = true;
  }

  function stirField(ax: number, ay: number, ux: number, uy: number, z: number, c: number): void {
    for (const d of drops) {
      for (let i = 0; i < d.pts.length; i++) d.pts[i] = tine(d.pts[i]!, ax, ay, ux, uy, z, c);
    }
    dirty = true;
  }

  function render(): void {
    ctx!.clearRect(0, 0, width, height);
    ctx!.fillStyle = palette.ground;
    ctx!.fillRect(0, 0, width, height);
    for (const d of drops) {
      ctx!.beginPath();
      const pts = d.pts;
      ctx!.moveTo(pts[0]![0], pts[0]![1]);
      for (let i = 1; i < pts.length; i++) ctx!.lineTo(pts[i]![0], pts[i]![1]);
      ctx!.closePath();
      if (d.fill) {
        ctx!.globalAlpha = d.alpha;
        ctx!.fillStyle = d.fill === 'ground' ? palette.ground : d.fill === 'accent' ? palette.accent : palette.ink;
        ctx!.fill();
      }
      if (d.stroke) {
        ctx!.globalAlpha = d.alpha;
        ctx!.strokeStyle = palette.signal;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
    }
  }

  function loop(): void {
    raf = 0;
    if (!active) return;
    frame++;
    // languid breathing current — imperceptible per frame
    breathe += 0.0011;
    const stirring = performance.now() - lastStir < 300;
    if (frame % 2 === 0 || stirring) {
      stirField(
        width * (0.5 + 0.25 * Math.cos(breathe * 0.6)),
        height * (0.5 + 0.25 * Math.sin(breathe * 0.45)),
        Math.cos(breathe),
        Math.sin(breathe),
        0.13,
        Math.min(width, height) * 0.42,
      );
      if (dirty) {
        render();
        dirty = false;
      }
    }
    raf = requestAnimationFrame(loop);
  }

  function wake(): void {
    // recompute rather than trust the latch — a missed visibility event must
    // never freeze a visible field
    if (document.visibilityState === 'visible' && onScreen) {
      active = true;
      if (!raf) raf = requestAnimationFrame(loop);
    }
  }

  function sleep(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // --- initial pour: two blooms + accents, staggered like a real session ---
  const scale = Math.min(width || host.clientWidth, 900) / 900;
  type Pour = { x: number; y: number; r: number; kind: 'ink' | 'water' | 'accent' | 'trace'; a?: number };
  const pours: Pour[] = [];
  const bloom = (fx: number, fy: number, seq: Array<[number, 'ink' | 'water' | 'accent' | 'trace', number?]>) => {
    for (const [r, kind, a] of seq) pours.push({ x: fx, y: fy, r, kind, a });
  };

  bloom(0.38, 0.46, [
    [150, 'ink', 0.68], [66, 'water'], [122, 'ink', 0.5], [112, 'water'],
    [118, 'ink', 0.8], [72, 'water'], [78, 'trace', 0.6], [55, 'ink', 0.38],
    [98, 'water'], [64, 'ink', 0.86], [36, 'water'],
    [50, 'accent', 0.6], [40, 'water'], [32, 'ink', 0.82], [14, 'water'],
  ]);
  bloom(0.8, 0.3, [
    [95, 'ink', 0.45], [64, 'water'], [56, 'ink', 0.72], [30, 'water'], [26, 'ink', 0.85], [12, 'water'],
  ]);
  bloom(0.14, 0.18, [
    [40, 'ink', 0.4], [22, 'water'], [16, 'ink', 0.6], [7, 'water'],
  ]);
  // clearing pours: reserve quiet water for the overlay, like the poster
  bloom(0.22, 0.88, [[130, 'water']]);
  bloom(0.46, 0.95, [[90, 'water']]);

  let poured = 0;
  function pourNext(): void {
    if (poured >= pours.length) return;
    if (active) {
      const p = pours[poured]!;
      addDrop(p.x * width, p.y * height, p.r * scale, {
        fill: p.kind === 'water' ? 'ground' : p.kind === 'trace' ? null : p.kind === 'accent' ? 'accent' : palette.ink,
        stroke: p.kind === 'trace' ? palette.signal : null,
        alpha: p.a ?? 1,
      });
      poured++;
      if (poured === 4) canvas.classList.add('ready'); // ≥400ms CSS fade begins
      if (poured === pours.length) {
        // settle the field into its current — the poster's S-flow, gently
        stirField(width * 0.15, height * 0.8, Math.cos(-0.22), Math.sin(-0.22), 26, width * 0.32);
        stirField(width * 0.94, height * 0.12, Math.cos(2.75), Math.sin(2.75), 18, width * 0.27);
      }
    }
    window.setTimeout(pourNext, 260 + Math.random() * 160);
  }

  // ambient flecks keep the water breathing without crowding it
  window.setInterval(() => {
    if (!active || drops.length >= MAX_DROPS || poured < pours.length) return;
    const x = 0.08 + Math.random() * 0.84;
    const y = 0.06 + Math.random() * 0.6; // stays clear of the overlay third
    addDrop(x * width, y * height, (4 + Math.random() * 9) * scale, {
      fill: Math.random() < 0.35 ? 'ground' : palette.ink,
      alpha: 0.18 + Math.random() * 0.2,
    });
  }, 5200);

  // pointer stirring — listen on the host; the canvas takes no events
  host.addEventListener(
    'pointermove',
    (e) => {
      const rect = host.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();
      if (pointer) {
        const dt = Math.max(now - pointer.t, 8);
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const speed = Math.hypot(dx, dy) / (dt / 16);
        if (speed > 1.5) {
          const m = Math.hypot(dx, dy) || 1;
          stirField(x, y, dx / m, dy / m, Math.min(speed * 0.14, 4.5), 90);
          lastStir = now;
        }
      }
      pointer = { x, y, t: now };
      wake();
    },
    { passive: true },
  );

  // pause discipline
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && onScreen) {
      wake();
    } else {
      active = false;
      sleep();
    }
  });
  const io = new IntersectionObserver((entries) => {
    onScreen = entries[0]?.isIntersecting ?? true;
    if (onScreen && document.visibilityState === 'visible') {
      wake();
    } else {
      active = false;
      sleep();
    }
  });
  io.observe(host);

  new ResizeObserver(() => {
    resize();
    render();
  }).observe(host);

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    palette = readPalette();
    dirty = true;
    wake();
  });

  // go
  resize();
  host.appendChild(canvas);
  render();
  window.setTimeout(pourNext, 500);
  wake();
}
