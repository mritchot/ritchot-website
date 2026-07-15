/**
 * D24 expressive motion — scroll reveals, ink-divider draw-in, hero
 * parallax/fade. The pre-reveal hidden state (.mo) is applied ONLY here,
 * and only to elements below the initial viewport: with JS off everything
 * is simply visible, nothing visible ever flashes, and CLS stays 0
 * (transform/opacity only). Everything collapses under
 * prefers-reduced-motion — gated here and flattened by the global CSS.
 */
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

const TARGETS =
  'ul.stream > li, .cards > .card, main section > h2, article > h2, .ink-divider, .prevnext';

let hidden: HTMLElement[] = [];

/** Drop the motion states entirely — instantly visible, no transition.
 * Used when reduced-motion flips on and before printing. */
function revealAll(): void {
  for (const el of hidden) {
    el.classList.remove('mo', 'in');
    el.style.transitionDelay = '';
  }
  hidden = [];
}

function setup(): void {
  const fold = window.innerHeight - 1;
  hidden = [...document.querySelectorAll<HTMLElement>(TARGETS)].filter(
    (el) => el.getBoundingClientRect().top > fold,
  );
  if (hidden.length) {
    for (const el of hidden) el.classList.add('mo');
    const io = new IntersectionObserver(
      (entries) => {
        const batch = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        batch.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          el.style.transitionDelay = `${Math.min(i, 5) * 70}ms`;
          el.classList.add('in');
          el.addEventListener(
            'transitionend',
            () => {
              el.style.transitionDelay = '';
            },
            { once: true },
          );
          io.unobserve(el);
        });
      },
      // fixed bottom inset (not a percentage): elements sitting near the
      // very end of a page must still be able to clear it at max scroll.
      // threshold 0, not a ratio: the divider's clip-path shrinks its
      // intersection rect to a sliver, so any ratio floor would never fire.
      { rootMargin: '0px 0px -40px 0px', threshold: 0 },
    );
    for (const el of hidden) io.observe(el);
  }

  // hero: field and content drift up and fade as the page scrolls out
  const hero = document.getElementById('hero');
  if (hero) {
    const inner = hero.querySelector<HTMLElement>('.inner');
    let ticking = false;
    const tick = (): void => {
      ticking = false;
      const height = hero.offsetHeight;
      const y = Math.min(window.scrollY, height);
      const fade = String(Math.max(0, 1 - (y / height) * 1.35));
      if (inner) {
        inner.style.transform = `translateY(${(y * 0.22).toFixed(1)}px)`;
        inner.style.opacity = fade;
      }
      const canvas = hero.querySelector<HTMLElement>('canvas.sumi');
      if (canvas) canvas.style.transform = `translateY(${(y * 0.12).toFixed(1)}px)`;
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(tick);
        }
      },
      { passive: true },
    );
    if (window.scrollY > 0) tick();
  }
}

if (!reduce.matches) setup();

// if the preference flips mid-session, reveal everything immediately
reduce.addEventListener('change', () => {
  if (reduce.matches) revealAll();
});

// print (including the resume PDF pipeline) must never see hidden states
window.addEventListener('beforeprint', revealAll);
