# hit

Analytics beacon. After the reader's first scroll, tap, key press, or
pointer movement, it posts the page path and the external referrer to
`/hit`, where the edge collector in `src/worker/` records one view per
visitor, page, and UTC day. Browsers that report `navigator.webdriver`
send nothing. The page works the same without it: no cookie, no storage,
no third-party request.
