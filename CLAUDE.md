# Pocket Universe

A single-page interactive spiral galaxy: thousands of glowing stars that
slowly swirl and react to touch (or the mouse). Hosted on GitHub Pages.

The owner is a beginner. Explain changes in plain language and keep the
code readable, with short comments on anything non-obvious.

## Rules

- Plain HTML, CSS and JavaScript only. No build step, no frameworks, no
  npm packages, no external libraries or CDN links.
- Everything must work by opening `index.html` directly or serving the
  repository root as static files (that is how GitHub Pages serves it).
- Phone first: touch is the main input, and it must stay smooth on a
  mid-range phone. Mouse support is secondary.

## Files

- `index.html` — the page; one full-screen `<canvas>`, a "touch the stars" hint
  that fades on first touch, and links to the two files below.
- `style.css` — full-screen canvas, black background, `touch-action: none`
  so dragging does not scroll or zoom the page.
- `galaxy.js` — creates the stars, updates them each frame, draws them.

## How it works

- Rendering uses the Canvas 2D API (not WebGL), chosen for readability.
- Each star has a "home" position and a current position. About 75% of
  stars sit on the spiral arms and all turn at the same speed, so the
  spiral keeps its shape (different speeds would wind the arms into a
  smear). The rest are loose "dust" stars that turn faster near the centre.
- Stars start at the centre, so the galaxy bursts open on page load.
- The tunable numbers (arms, twist, speed, spring, push) are the settings
  block at the top of `galaxy.js`.
- A spring pulls each star toward its home; a touch pushes nearby stars
  away and sideways, so they swirl and then settle back.
- Glow: a soft dot image is drawn once to an offscreen canvas, then stamped
  per star with `globalCompositeOperation = "lighter"` so overlaps brighten.
- Star count scales with screen size (2,500-5,000).
- The canvas is sized by `devicePixelRatio` (capped at 2) and resized on
  window resize / rotation.
- Animation runs on `requestAnimationFrame`; use Pointer Events for input
  so one code path covers touch and mouse.

## Running and testing

No commands needed. Open `index.html` in a browser, or run
`python3 -m http.server` in this folder and visit `http://localhost:8000`.
Check it at phone size (browser dev tools device mode) before finishing.

## Deploying

GitHub Pages: Settings -> Pages -> Deploy from a branch -> root folder.
Use relative paths (`style.css`, not `/style.css`) so the page works under
the `/pocket-universe/` sub-path.
