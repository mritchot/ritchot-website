/** Reports this page view to the edge collector once a person interacts
 *  with the page: the first scroll, tap, key press, or pointer movement.
 *  Browsers driven by automation declare navigator.webdriver and are
 *  skipped. Sends the path and the external referrer, nothing else; sets no
 *  cookie and stores nothing. */
const EVENTS = ['pointermove', 'pointerdown', 'scroll', 'keydown', 'touchstart'] as const;

export default function hit(): void {
  if (navigator.webdriver) return;
  const send = (): void => {
    for (const e of EVENTS) removeEventListener(e, send, true);
    const body = new URLSearchParams({ p: location.pathname, r: document.referrer });
    if (!navigator.sendBeacon?.('/hit', body)) {
      fetch('/hit', { method: 'POST', body, keepalive: true }).catch(() => {
        // counting never affects the page
      });
    }
  };
  for (const e of EVENTS) addEventListener(e, send, { capture: true, passive: true });
}
