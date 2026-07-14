/**
 * Suminagashi hero island, D21 revision — real-time ink dissolution.
 * Handwritten WebGL2 stable-fluids sim (no dependencies): a velocity field
 * and a dye field; semi-Lagrangian advection, Jacobi pressure projection,
 * gaussian splats for pours and pointer traces, slow wandering stirrers for
 * the ambient current. Dye composites as PIGMENT, not light: Beer–Lambert
 * absorption over the washi ground in light mode, matte screen-blend of pale
 * ink over sumi in dark — the difference between ink and neon smoke.
 *
 * Idle loop: autonomous pours every ~2–6 s, multi-hue from live tokens
 * (sumi dominant; hero-accent and signal cycling). Pointer traces pour ink
 * and impart velocity, and push the scheduler back. Dye dissolves ~2.4×
 * faster inside the overlay ellipse (reads as drier paper) — that plus
 * scheduler avoidance and the existing CSS scrim keeps the name readable.
 *
 * Kept from 4a (verified): client-idle mount, ≥400 ms crossfade over the
 * poster, DPR ≤ 2, pause on tab-hidden/off-view with recomputing wake(),
 * aria-hidden canvas, poster as no-JS/reduced-motion/failure state.
 * WebGL context loss or missing float-render support → poster.
 */

interface Palette {
  dark: boolean;
  ground: [number, number, number];
  inks: Array<{ vec: [number, number, number]; weight: number }>;
}

const VERT = `#version 300 es
layout(location=0) in vec2 p;
out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = {
  advect: `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D u_src; uniform sampler2D u_vel;
uniform float u_dt; uniform float u_diss;
uniform vec4 u_clear; // ellipse cx, cy, rx, ry (rx<=0 disables)
uniform float u_clearK;
void main(){
  vec2 back = uv - u_dt * texture(u_vel, uv).xy;
  vec4 s = texture(u_src, back);
  float diss = u_diss;
  if (u_clear.z > 0.0) {
    vec2 d = (uv - u_clear.xy) / u_clear.zw;
    float e = exp(-dot(d, d));
    diss = mix(diss, diss * u_clearK, e);
  }
  o = s * diss;
}`,
  splat: `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D u_src;
uniform vec2 u_point; uniform vec3 u_value; uniform float u_radius; uniform float u_aspect;
void main(){
  vec2 d = uv - u_point; d.x *= u_aspect;
  vec3 base = texture(u_src, uv).xyz;
  o = vec4(base + u_value * exp(-dot(d, d) / u_radius), 1.0);
}`,
  divergence: `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D u_vel; uniform vec2 u_texel;
void main(){
  float l = texture(u_vel, uv - vec2(u_texel.x, 0.0)).x;
  float r = texture(u_vel, uv + vec2(u_texel.x, 0.0)).x;
  float b = texture(u_vel, uv - vec2(0.0, u_texel.y)).y;
  float t = texture(u_vel, uv + vec2(0.0, u_texel.y)).y;
  o = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}`,
  pressure: `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D u_prs; uniform sampler2D u_div; uniform vec2 u_texel;
void main(){
  float l = texture(u_prs, uv - vec2(u_texel.x, 0.0)).x;
  float r = texture(u_prs, uv + vec2(u_texel.x, 0.0)).x;
  float b = texture(u_prs, uv - vec2(0.0, u_texel.y)).x;
  float t = texture(u_prs, uv + vec2(0.0, u_texel.y)).x;
  float d = texture(u_div, uv).x;
  o = vec4((l + r + b + t - d) * 0.25, 0.0, 0.0, 1.0);
}`,
  gradient: `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D u_prs; uniform sampler2D u_vel; uniform vec2 u_texel;
void main(){
  float l = texture(u_prs, uv - vec2(u_texel.x, 0.0)).x;
  float r = texture(u_prs, uv + vec2(u_texel.x, 0.0)).x;
  float b = texture(u_prs, uv - vec2(0.0, u_texel.y)).x;
  float t = texture(u_prs, uv + vec2(0.0, u_texel.y)).x;
  vec2 v = texture(u_vel, uv).xy - 0.5 * vec2(r - l, t - b);
  o = vec4(v, 0.0, 1.0);
}`,
  composite: `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D u_dye;
uniform vec3 u_ground; uniform int u_dark;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec3 D = max(texture(u_dye, uv).rgb, 0.0);
  vec3 col;
  if (u_dark == 1) {
    col = 1.0 - (1.0 - u_ground) * exp(-D);
  } else {
    col = u_ground * exp(-D);
  }
  col += (hash(gl_FragCoord.xy * 0.7) - 0.5) * 0.012; // paper grain, matte
  o = vec4(col, 1.0);
}`,
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

function cssColor(v: string): [number, number, number] {
  const m = v.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return [0.5, 0.5, 0.5];
  const n = parseInt(m[1]!, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** optical density so that full-strength dye alone reads as the ink color */
function absorbance(c: [number, number, number], dark: boolean): [number, number, number] {
  const f = (x: number): number =>
    dark ? -Math.log(1 - clamp01(x) * 0.92) : -Math.log(Math.max(x, 0.03));
  // in light mode a channel the ink reflects fully should not absorb at all
  return dark ? [f(c[0]), f(c[1]), f(c[2])] : [f(c[0]), f(c[1]), f(c[2])];
}

export function mountSuminagashi(host: HTMLElement): void {
  const canvas = document.createElement('canvas');
  canvas.className = 'sumi';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return; // poster remains

  // --- tiny GL toolkit ---
  const quad = gl.createVertexArray();
  gl.bindVertexArray(quad);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function program(fs: string): WebGLProgram {
    const compile = (type: number, src: string): WebGLShader => {
      const sh = gl!.createShader(type)!;
      gl!.shaderSource(sh, src);
      gl!.compileShader(sh);
      if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
        throw new Error(gl!.getShaderInfoLog(sh) ?? 'shader');
      }
      return sh;
    };
    const p = gl!.createProgram()!;
    gl!.attachShader(p, compile(gl!.VERTEX_SHADER, VERT));
    gl!.attachShader(p, compile(gl!.FRAGMENT_SHADER, fs));
    gl!.linkProgram(p);
    if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) throw new Error('link');
    return p;
  }

  interface Field {
    tex: WebGLTexture;
    fbo: WebGLFramebuffer;
    w: number;
    h: number;
  }

  function field(w: number, h: number, internal: number, format: number): Field {
    const tex = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texStorage2D(gl!.TEXTURE_2D, 1, internal, w, h);
    const fbo = gl!.createFramebuffer()!;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0);
    return { tex, fbo, w, h };
  }

  const P = {
    advect: program(FRAG.advect),
    splat: program(FRAG.splat),
    divergence: program(FRAG.divergence),
    pressure: program(FRAG.pressure),
    gradient: program(FRAG.gradient),
    composite: program(FRAG.composite),
  };
  const U = (p: WebGLProgram, n: string): WebGLUniformLocation | null => gl!.getUniformLocation(p, n);

  function draw(target: Field | null): void {
    if (target) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.fbo);
      gl!.viewport(0, 0, target.w, target.h);
    } else {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      gl!.viewport(0, 0, canvas.width, canvas.height);
    }
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function bind(unit: number, tex: WebGLTexture): void {
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
  }

  // --- fields (sim resolution independent of display resolution) ---
  let simW = 176;
  let simH = 104;
  let dyeW = 416;
  let dyeH = 248;
  let vel0 = field(simW, simH, gl.RG16F, gl.RG);
  let vel1 = field(simW, simH, gl.RG16F, gl.RG);
  let prs0 = field(simW, simH, gl.R16F, gl.RED);
  let prs1 = field(simW, simH, gl.R16F, gl.RED);
  let div = field(simW, simH, gl.R16F, gl.RED);
  let dye0 = field(dyeW, dyeH, gl.RGBA16F, gl.RGBA);
  let dye1 = field(dyeW, dyeH, gl.RGBA16F, gl.RGBA);

  const swapV = (): void => { const t = vel0; vel0 = vel1; vel1 = t; };
  const swapP = (): void => { const t = prs0; prs0 = prs1; prs1 = t; };
  const swapD = (): void => { const t = dye0; dye0 = dye1; dye1 = t; };

  // --- palette from live tokens ---
  function readPalette(): Palette {
    const cs = getComputedStyle(host);
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const v = (name: string): [number, number, number] => cssColor(cs.getPropertyValue(name));
    const ink = absorbance(v('--ink'), dark);
    const accent = absorbance(v('--hero-accent'), dark);
    const signal = absorbance(v('--signal'), dark);
    return {
      dark,
      ground: v('--ground'),
      inks: [
        { vec: ink, weight: 0.6 },
        { vec: accent, weight: 0.24 },
        { vec: signal, weight: 0.16 },
      ],
    };
  }
  let palette = readPalette();

  function pickInk(): [number, number, number] {
    let r = Math.random();
    for (const ink of palette.inks) {
      if ((r -= ink.weight) <= 0) return ink.vec;
    }
    return palette.inks[0]!.vec;
  }

  // --- state ---
  let width = 0;
  let height = 0;
  let aspect = 1;
  let raf = 0;
  let active = true;
  let onScreen = true;
  let last = 0;
  let frameEma = 16;
  let degraded = 0;
  let ready = false;
  const clearZone: [number, number, number, number] = [0.28, 0.22, 0.34, 0.2]; // uv ellipse (y from bottom→gl)
  let pointer: { x: number; y: number; t: number } | null = null;
  let nextPourAt = 0;

  interface ActivePour {
    x: number;
    y: number;
    r: number;
    vec: [number, number, number];
    until: number;
    life: number;
    spin: number;
    step: number;
  }
  const activePours: ActivePour[] = [];

  function resize(): void {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    aspect = width / Math.max(height, 1);
    const overlay = host.querySelector('.overlay');
    if (overlay) {
      const o = overlay.getBoundingClientRect();
      clearZone[0] = (o.left + o.width / 2 - rect.left) / rect.width;
      clearZone[1] = 1 - (o.top + o.height / 2 - rect.top) / rect.height;
      clearZone[2] = (o.width / rect.width) * 0.75;
      clearZone[3] = (o.height / rect.height) * 0.9;
    }
  }

  // --- passes ---
  function splat(target0: Field, target1: Field, x: number, y: number, vec: [number, number, number], radius: number): Field {
    gl!.useProgram(P.splat);
    bind(0, target0.tex);
    gl!.uniform1i(U(P.splat, 'u_src'), 0);
    gl!.uniform2f(U(P.splat, 'u_point'), x, y);
    gl!.uniform3f(U(P.splat, 'u_value'), vec[0], vec[1], vec[2]);
    gl!.uniform1f(U(P.splat, 'u_radius'), radius);
    gl!.uniform1f(U(P.splat, 'u_aspect'), aspect);
    draw(target1);
    return target1;
  }

  const splatV = (x: number, y: number, fx: number, fy: number, radius: number): void => {
    splat(vel0, vel1, x, y, [fx, fy, 0], radius);
    swapV();
  };
  const splatD = (x: number, y: number, vec: [number, number, number], radius: number): void => {
    splat(dye0, dye1, x, y, vec, radius);
    swapD();
  };

  function step(dt: number, now: number): void {
    // ambient current: three slow wandering stirrers (invisible) — enough
    // circulation to stretch blooms into tendrils over tens of seconds
    const t = now * 0.001;
    for (let i = 0; i < 3; i++) {
      const ph = i * 2.1;
      const sx = 0.5 + 0.36 * Math.sin(t * 0.065 + ph) * Math.cos(t * 0.041 + ph * 1.7);
      const sy = 0.5 + 0.32 * Math.cos(t * 0.053 + ph * 0.6);
      const dir = t * (0.16 + i * 0.03) + ph;
      splatV(sx, sy, Math.cos(dir) * 0.28 * dt, Math.sin(dir) * 0.28 * dt, 0.05);
    }

    // ramping pours: dye plus a billow — outward push and a slight swirl so
    // the bloom enters the water like ink, not like an airbrush
    for (let i = activePours.length - 1; i >= 0; i--) {
      const p = activePours[i]!;
      const k = p.step * dt * 60;
      splatD(p.x, p.y, [p.vec[0] * k, p.vec[1] * k, p.vec[2] * k], p.r);
      const age = 1 - Math.max(0, (p.until - now) / p.life);
      const push = 0.4 * dt * (1 - age); // strongest at first contact
      const a = p.spin + age * 2.1;
      splatV(
        p.x + Math.cos(a) * 0.01,
        p.y + Math.sin(a) * 0.01,
        Math.cos(a + 1.7) * push,
        Math.sin(a + 1.7) * push,
        p.r * 3.2,
      );
      if (now > p.until) activePours.splice(i, 1);
    }

    // velocity advection
    gl!.useProgram(P.advect);
    bind(0, vel0.tex); bind(1, vel0.tex);
    gl!.uniform1i(U(P.advect, 'u_src'), 0);
    gl!.uniform1i(U(P.advect, 'u_vel'), 1);
    gl!.uniform1f(U(P.advect, 'u_dt'), dt);
    gl!.uniform1f(U(P.advect, 'u_diss'), Math.pow(0.997, dt * 60));
    gl!.uniform4f(U(P.advect, 'u_clear'), 0, 0, 0, 0);
    gl!.uniform1f(U(P.advect, 'u_clearK'), 1);
    draw(vel1); swapV();

    // projection
    gl!.useProgram(P.divergence);
    bind(0, vel0.tex);
    gl!.uniform1i(U(P.divergence, 'u_vel'), 0);
    gl!.uniform2f(U(P.divergence, 'u_texel'), 1 / simW, 1 / simH);
    draw(div);

    gl!.bindFramebuffer(gl!.FRAMEBUFFER, prs0.fbo);
    gl!.clearColor(0, 0, 0, 1); gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.useProgram(P.pressure);
    gl!.uniform2f(U(P.pressure, 'u_texel'), 1 / simW, 1 / simH);
    for (let i = 0; i < 20; i++) {
      bind(0, prs0.tex); bind(1, div.tex);
      gl!.uniform1i(U(P.pressure, 'u_prs'), 0);
      gl!.uniform1i(U(P.pressure, 'u_div'), 1);
      draw(prs1); swapP();
    }

    gl!.useProgram(P.gradient);
    bind(0, prs0.tex); bind(1, vel0.tex);
    gl!.uniform1i(U(P.gradient, 'u_prs'), 0);
    gl!.uniform1i(U(P.gradient, 'u_vel'), 1);
    gl!.uniform2f(U(P.gradient, 'u_texel'), 1 / simW, 1 / simH);
    draw(vel1); swapV();

    // dye advection + dissolution (faster inside the overlay clearing zone)
    gl!.useProgram(P.advect);
    bind(0, dye0.tex); bind(1, vel0.tex);
    gl!.uniform1i(U(P.advect, 'u_src'), 0);
    gl!.uniform1i(U(P.advect, 'u_vel'), 1);
    gl!.uniform1f(U(P.advect, 'u_dt'), dt);
    gl!.uniform1f(U(P.advect, 'u_diss'), Math.pow(0.998, dt * 60));
    gl!.uniform4f(U(P.advect, 'u_clear'), clearZone[0], clearZone[1], clearZone[2], clearZone[3]);
    gl!.uniform1f(U(P.advect, 'u_clearK'), Math.pow(0.988, dt * 60));
    draw(dye1); swapD();

    // composite to screen
    gl!.useProgram(P.composite);
    bind(0, dye0.tex);
    gl!.uniform1i(U(P.composite, 'u_dye'), 0);
    gl!.uniform3f(U(P.composite, 'u_ground'), palette.ground[0], palette.ground[1], palette.ground[2]);
    gl!.uniform1i(U(P.composite, 'u_dark'), palette.dark ? 1 : 0);
    draw(null);
  }

  // --- pour scheduler: the field is never still ---
  function schedulePour(now: number): void {
    // biased away from the overlay zone (lower-left)
    let x = Math.random();
    let y = Math.random();
    if (x < 0.45 && y < 0.45) y = 0.45 + Math.random() * 0.5; // gl y-up: low y = bottom
    const strength = (1 + Math.random()) * 0.065;
    const vec = pickInk();
    const life = 1100 + Math.random() * 1100;
    activePours.push({
      x, y,
      r: 0.0022 + Math.random() * 0.005, // dense core; advection does the spreading
      vec: [vec[0] * strength, vec[1] * strength, vec[2] * strength],
      until: now + life,
      life,
      spin: Math.random() * Math.PI * 2,
      step: 1,
    });
    nextPourAt = now + 1800 + Math.random() * 2800;
  }

  // --- loop ---
  function loop(now: number): void {
    raf = 0;
    if (!active) return;
    const dt = Math.min(Math.max((now - last) / 1000, 0.006), 0.033);
    last = now;

    frameEma = frameEma * 0.95 + Math.min(now - (loopPrev || now), 50) * 0.05;
    loopPrev = now;
    if (frameEma > 24 && degraded < 2) degrade();

    if (now >= nextPourAt) schedulePour(now);
    step(dt, now);

    if (!ready && activePours.length > 0) {
      ready = true;
      canvas.classList.add('ready');
    }
    raf = requestAnimationFrame(loop);
  }
  let loopPrev = 0;

  function degrade(): void {
    degraded++;
    frameEma = 16;
    dyeW = Math.max(208, dyeW >> 1);
    dyeH = Math.max(124, dyeH >> 1);
    const nd0 = field(dyeW, dyeH, gl!.RGBA16F, gl!.RGBA);
    const nd1 = field(dyeW, dyeH, gl!.RGBA16F, gl!.RGBA);
    // carry the current dye across
    gl!.useProgram(P.splat);
    bind(0, dye0.tex);
    gl!.uniform1i(U(P.splat, 'u_src'), 0);
    gl!.uniform2f(U(P.splat, 'u_point'), -9, -9);
    gl!.uniform3f(U(P.splat, 'u_value'), 0, 0, 0);
    gl!.uniform1f(U(P.splat, 'u_radius'), 1);
    gl!.uniform1f(U(P.splat, 'u_aspect'), 1);
    draw(nd0);
    dye0 = nd0; dye1 = nd1;
  }

  function wake(): void {
    if (document.visibilityState === 'visible' && onScreen) {
      active = true;
      if (!raf) {
        last = performance.now();
        loopPrev = 0;
        raf = requestAnimationFrame(loop);
      }
    }
  }
  function sleep(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // --- interaction: trace pours ink and pushes the scheduler back ---
  host.addEventListener(
    'pointermove',
    (e) => {
      const rect = host.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      const now = performance.now();
      if (pointer) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const speed = Math.hypot(dx, dy);
        if (speed > 0.001) {
          const ink = palette.inks[0]!.vec;
          splatD(x, y, [ink[0] * 0.16, ink[1] * 0.16, ink[2] * 0.16], 0.00045);
          splatV(x, y, dx * 2.2, dy * 2.2, 0.0028);
          nextPourAt = Math.max(nextPourAt, now + 2600);
        }
      }
      pointer = { x, y, t: now };
      wake();
    },
    { passive: true },
  );

  // --- lifecycle ---
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && onScreen) wake();
    else { active = false; sleep(); }
  });
  const io = new IntersectionObserver((entries) => {
    onScreen = entries[0]?.isIntersecting ?? true;
    if (onScreen && document.visibilityState === 'visible') wake();
    else { active = false; sleep(); }
  });
  io.observe(host);

  new ResizeObserver(() => resize()).observe(host);

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    palette = readPalette();
    // fresh water on mode flip: clear both dye buffers
    for (const f of [dye0, dye1]) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, f.fbo);
      gl!.clearColor(0, 0, 0, 1);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
    }
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    sleep();
    canvas.remove(); // the poster underneath is the failure state
  });

  // --- go ---
  resize();
  host.appendChild(canvas);
  const t0 = performance.now();
  nextPourAt = t0 + 350; // first pour almost immediately; crossfade begins on it
  // seed the field with two quick pours so the reveal is already alive
  schedulePour(t0);
  activePours[0]!.x = 0.42; activePours[0]!.y = 0.55;
  nextPourAt = t0 + 900;
  wake();
}
