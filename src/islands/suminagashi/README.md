# suminagashi

Homepage-only WebGL2 hero: a real-time ink-dissolution simulation,
dependency-free and hand-written. The typographic page is the permanent
state — the field crossfades in over the plain ground once the page has
loaded and the browser is idle, and every failure path (no JS, reduced
motion, missing float-render support, lost GL context, script error)
simply leaves the plain page.

## How it works

- **Stable fluids**: a low-resolution velocity field (semi-Lagrangian
  advection, 20-iteration Jacobi pressure projection) drives a
  higher-resolution dye field. Slow wandering stirrers keep an ambient
  current; autonomous pours land anywhere in the field every few seconds.
- **Pigment, not light**: dye accumulates as optical density. Light mode
  composites by Beer–Lambert absorption over the paper ground; dark mode
  screen-blends pale ink over the sumi ground — matte in both, never neon.
  The five pigments are read from the live design tokens and drawn through
  a shuffle bag so no hue streaks.
- **Instant theme flips**: on a theme change the existing dye is remapped
  through a least-squares 3×3 matrix in density space (densities mix
  additively, so one matrix recolors any mixture consistently) — the
  composition survives the flip in the same frame the page changes.
- **Interaction**: pointer traces pour ink and impart velocity; taps pour.
  Both defer the autonomous scheduler.
- **Discipline**: mounts after `load` + idle; DPR capped at 2; pauses
  when the tab is hidden or the hero is off-screen (`wake()` recomputes
  visibility rather than trusting a latch); an adaptive degrade ladder
  steps dye resolution, velocity resolution, and Jacobi iterations down
  on slow renderers. On coarse-pointer devices the dye dissolves more
  slowly, since no hover exists to stir the water.

The canvas is `aria-hidden` and paints behind ground-tinted content
panels that guarantee text contrast at all times.
