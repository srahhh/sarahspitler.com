# sarahspitler.com

Static site: plain HTML, CSS and a little JavaScript. No build step, no dependencies.
Open `index.html` in a browser, or serve the folder (`python3 -m http.server`) and deploy it as-is (GitHub Pages works).

## Pages
- `index.html` – Work (home): project list with hover state
- `work/bnsf.html` – the model project page; the other `work/*.html` files are stubs that follow it
- `about.html`, `contact.html`, `dogs.html`

## Where things live
- `assets/css/style.css` – all styles. Design tokens are at the top. Sizes are written as Figma pixels: `calc(140 * var(--u))` = 140px in the 1920 frame.
- `assets/js/main.js` – menu, waving hand, Process & Takeaways carousel, About word trail
- `assets/fonts/` – IBM Plex Sans / Mono (self-hosted, SIL Open Font License)
- `assets/img/` – images

## Common edits
- **Project hover colour**: `style="--accent: #f85c12"` on each `.work-row` (home, and the "next" row at the bottom of each project page) and on the project page's `<body>`.
- **Project illustration**: replace `assets/img/train-placeholder.png` in each `.work-row__art` with that project's artwork (SVG ideal).
- **Video instead of a still**: copy a `<div class="video" data-video>` block from `work/bnsf.html`. Videos live in `assets/video/` as .mp4, each with a poster image in `assets/img/`. They autoplay muted while on screen; the play/pause button and scrubber are added by `main.js`.
- **Several videos in one frame**: copy the `data-media-carousel` figure in `work/bnsf.html`. Add a `.media__slide` and a matching caption `<span>` (with `hidden`) for each extra item, in the same order.
- **Process slides**: add or remove `<li class="process__slide">` items; the dots update themselves.
- **About interaction**: remove `data-word-trail` from `.about__statement` to turn it off.

## Password
- The whole site sits behind a password screen (`assets/js/gate.js`). It is a soft lock, not encryption.
- Change the password: open `tools/set-password.html`, type the new one, paste the line it gives you into `gate.js`.
- Lock only project pages, or turn it off: set `PROTECT` in `gate.js` to `"work"` or `"off"`.
- Pages carry `<meta name="robots" content="noindex">` so search engines skip them. Remove it if you take the password off.

## Still to do
Search the HTML for `TODO` and "To come": LinkedIn/GitHub URLs, contact email, stub project content.
