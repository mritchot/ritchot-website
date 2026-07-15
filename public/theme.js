/* ritchot.me theme control (D23). One localStorage key ("theme") holding
   "light" or "dark"; absence means follow the system. Loaded synchronously
   in <head> so the attribute lands before first paint — no FOUC. With JS
   off nothing runs: no attribute, no control, pure prefers-color-scheme. */
(function () {
  'use strict';
  var KEY = 'theme';
  var root = document.documentElement;

  function stored() {
    var t = null;
    try {
      t = localStorage.getItem(KEY);
    } catch (e) {
      /* storage blocked: behave as system */
    }
    return t === 'light' || t === 'dark' ? t : 'system';
  }

  function apply(mode) {
    try {
      if (mode === 'system') {
        delete root.dataset.theme;
        localStorage.removeItem(KEY);
      } else {
        root.dataset.theme = mode;
        localStorage.setItem(KEY, mode);
      }
    } catch (e) {
      /* storage blocked: the attribute still applies for this page */
    }
  }

  apply(stored());

  /* header control: cycle system → light → dark */
  var GLYPH = { system: '◐', light: '○', dark: '●' };
  var NEXT = { system: 'light', light: 'dark', dark: 'system' };

  function label(mode) {
    return 'Theme: ' + mode + '. Activate for ' + NEXT[mode] + '.';
  }

  document.addEventListener('DOMContentLoaded', function () {
    // the button is statically reserved in the header (zero layout shift);
    // wiring it up and making it visible is this script's job
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    var mode = stored();
    function set(m) {
      mode = m;
      apply(m);
      btn.textContent = GLYPH[m];
      btn.setAttribute('aria-label', label(m));
      btn.title = label(m);
    }
    btn.addEventListener('click', function () {
      set(NEXT[mode]);
    });
    set(mode);
    btn.style.visibility = 'visible';
  });
})();
