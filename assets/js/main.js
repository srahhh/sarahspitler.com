/* sarahspitler.com — small, dependency-free behaviours */
(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Menu ---------- */
  const menu = document.getElementById("site-menu");
  const toggle = document.querySelector(".menu-toggle");
  if (menu && toggle) {
    const setOpen = (open) => {
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      if (open) menu.querySelector(".menu__close").focus({ preventScroll: true });
    };
    toggle.addEventListener("click", () => setOpen(menu.hidden));
    menu.querySelector(".menu__close").addEventListener("click", () => { setOpen(false); toggle.focus(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) { setOpen(false); toggle.focus(); }
    });
    document.addEventListener("click", (e) => {
      if (!menu.hidden && !menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
  }

  /* ---------- Waving hand: once on load, again on hover ---------- */
  const wave = document.querySelector(".wave");
  if (wave && !reduceMotion) {
    const go = () => wave.classList.add("is-waving");
    wave.addEventListener("animationend", () => wave.classList.remove("is-waving"));
    wave.addEventListener("pointerenter", go);
    wave.addEventListener("focus", go);
    setTimeout(go, 700);
  }

  /* ---------- Project intro: fade out as the hero scrolls over it ---------- */
  const intro = document.querySelector(".project-intro");
  const hero = document.querySelector(".project-hero");
  if (intro && hero) {
    const sticky = matchMedia("(min-width: 1100px)");
    let ticking = false;
    const fade = () => {
      ticking = false;
      if (!sticky.matches) { intro.style.removeProperty("--fade"); intro.style.visibility = ""; return; }
      /* 0 at the top of the page, 1 once the hero has reached the header */
      const distance = Math.max(1, hero.offsetTop);       /* = height of the intro block */
      const y = Math.max(0, window.scrollY);          /* ignore Safari's rubber-band overscroll */
      const progress = Math.min(1, y / distance);
      const opacity = Math.max(0, 1 - progress * 1.15); /* fully gone just before it is covered */
      intro.style.setProperty("--fade", opacity.toFixed(3));
      intro.style.visibility = opacity === 0 ? "hidden" : "";
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(fade); } };
    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", request);
    sticky.addEventListener("change", request);
    if ("ResizeObserver" in window) new ResizeObserver(request).observe(hero);
    fade();
  }

  /* ---------- Collage: shapes swing into place as the page scrolls ---------- */
  document.querySelectorAll(".collage").forEach((collage) => {
    const num = (v, d = 0) => (v === undefined ? d : parseFloat(v) || 0);
    const movers = [...collage.querySelectorAll("[data-swing], [data-swing-to], [data-slide], [data-slide-to], [data-slide-y-to]")].map((el) => ({
      el,
      from: num(el.dataset.swing), to: num(el.dataset.swingTo),   /* degrees, whole quarter turns */
      slide: num(el.dataset.slide), slideTo: num(el.dataset.slideTo), /* % of its own width */
      slideYTo: num(el.dataset.slideYTo),                          /* % of its own height */
      delay: num(el.dataset.delay),
    }));
    const fades = [...collage.querySelectorAll("[data-fade]")].map((el) => ({ el, to: num(el.dataset.fade, 1) }));
    const settle = () => {
      movers.forEach(({ el, to, slideTo, slideYTo }) => {
        el.style.transform = [slideTo ? `translateX(${slideTo}%)` : "", slideYTo ? `translateY(${slideYTo}%)` : "", to ? `rotate(${to}deg)` : ""].join(" ").trim();
      });
      fades.forEach(({ el, to }) => el.style.setProperty("--o", to));
    };
    if (reduceMotion) { settle(); return; }            /* everything simply sits in its final place */
    const SPAN = 0.55;                                 /* share of the scroll each shape takes to land */
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);  /* ease in-out, no overshoot */
    /* Progress follows the page's scroll: 0 at the top of the page (whatever the screen size),
       1 once the collage reaches the header. */
    /* [start, end] of the scroll range the animation plays over. Desktop: from the top of the page
       until the collage reaches the header. Small screens, where the collage is short and far down:
       from when it comes into view until its middle is a quarter of the way down the screen. */
    const range = () => {
      const r = collage.getBoundingClientRect();
      const docTop = r.top + scrollY;
      if (innerWidth < 700) {
        const start = Math.max(0, docTop - innerHeight * 0.95);
        const end = docTop + r.height / 2 - innerHeight * 0.25;
        return [start, Math.max(start + 160, end)];
      }
      return [0, Math.max(240, docTop - 66)];
    };
    let ticking = false;
    const render = () => {
      ticking = false;
      if (!collage.offsetParent) return;               /* hidden (password screen) */
      const [a, b] = range(); const p = Math.min(1, Math.max(0, (scrollY - a) / (b - a)));
      movers.forEach(({ el, from, to, slide, slideTo, slideYTo, delay }) => {
        const e = ease(Math.min(1, Math.max(0, (p - delay) / SPAN)));
        const angle = from + (to - from) * e;
        const x = slide + (slideTo - slide) * e;
        const parts = [];
        if (x) parts.push(`translateX(${x.toFixed(2)}%)`);
        const y = slideYTo * e;
        if (y) parts.push(`translateY(${y.toFixed(2)}%)`);
        if (angle) parts.push(`rotate(${angle.toFixed(2)}deg)`);
        el.style.transform = parts.join(" ");
      });
      /* Photographs fade in over the first half of the scroll */
      const f = ease(Math.min(1, p / 0.5));
      fades.forEach(({ el, to }) => el.style.setProperty("--o", (to * f).toFixed(3)));
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } };
    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", request);
    /* Also re-measure when the collage first becomes visible (e.g. after the password screen) */
    if ("ResizeObserver" in window) new ResizeObserver(request).observe(collage);
    render();
  });

  /* ---------- Videos: autoplay in view, with site-styled play / pause and scrubber ---------- */
  document.querySelectorAll("[data-video]").forEach((wrap) => {
    const video = wrap.querySelector("video");
    if (!video) return;
    video.controls = false;
    video.muted = true;
    const bar = document.createElement("div");
    bar.className = "video__controls";
    bar.innerHTML = `
      <button class="video__toggle" type="button" aria-label="Pause video">
        <svg class="icon-pause" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="1.5" y="1" width="3" height="10"/><rect x="7.5" y="1" width="3" height="10"/></svg>
        <svg class="icon-play" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>
      </button>
      <input class="video__scrub" type="range" min="0" max="1000" step="1" value="0" aria-label="Video progress">
      <span class="video__time" aria-hidden="true">0:00 / 0:00</span>`;
    wrap.append(bar);
    const toggle = bar.querySelector(".video__toggle");
    const scrub = bar.querySelector(".video__scrub");
    const time = bar.querySelector(".video__time");
    const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

    let userPaused = reduceMotion;   /* visitors who prefer reduced motion press play themselves */
    let scrubbing = false;
    const play = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
    const sync = () => {
      wrap.classList.toggle("is-paused", video.paused);
      toggle.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");
    };
    const tick = () => {
      const d = video.duration || 0;
      const p = d ? video.currentTime / d : 0;
      if (!scrubbing) scrub.value = Math.round(p * 1000);
      scrub.style.setProperty("--p", (scrub.value / 10) + "%");
      time.textContent = fmt(video.currentTime) + " / " + fmt(d);
    };
    const userToggle = () => { if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); } };
    toggle.addEventListener("click", userToggle);
    video.addEventListener("click", userToggle);
    ["play", "pause"].forEach((ev) => video.addEventListener(ev, sync));
    ["timeupdate", "loadedmetadata", "durationchange"].forEach((ev) => video.addEventListener(ev, tick));
    scrub.addEventListener("input", () => {
      scrubbing = true;
      if (video.duration) video.currentTime = (scrub.value / 1000) * video.duration;
      scrub.style.setProperty("--p", (scrub.value / 10) + "%");
    });
    scrub.addEventListener("change", () => { scrubbing = false; });

    if (reduceMotion) video.pause();
    /* Play only while on screen, unless the visitor paused it */
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { if (!userPaused) play(); }
      else video.pause();
    }, { threshold: 0.35 }).observe(video);
    sync(); tick();
  });

  /* ---------- Media carousel: several items in one frame, caption follows the item in view ---------- */
  document.querySelectorAll("[data-media-carousel]").forEach((fig) => {
    const track = fig.querySelector(".media__track");
    const slides = [...track.children];
    const captions = [...fig.querySelectorAll(".media__captions > span")];
    const arrow = fig.querySelector("figcaption > svg");
    const count = fig.querySelector(".media__count");
    const prev = fig.querySelector(".media__prev");
    const next = fig.querySelector(".media__next");
    let active = 0;
    const goTo = (i) => {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
    };
    /* Items can differ in height: the frame follows the one in view */
    const fit = () => { const el = slides[active].firstElementChild || slides[active]; const h = el.offsetHeight; if (h) track.style.height = h + "px"; };
    addEventListener("resize", fit);
    fig.querySelectorAll("video, img").forEach((m) => { m.addEventListener("loadedmetadata", fit); m.addEventListener("load", fit); });
    const render = (animate) => {
      captions.forEach((c, n) => { c.hidden = n !== active; c.classList.toggle("is-in", animate && n === active); });
      if (count) count.textContent = (active + 1) + " / " + slides.length;
      if (prev) prev.disabled = active === 0;
      if (next) next.disabled = active === slides.length - 1;
      fit();
      if (animate && arrow) { arrow.classList.remove("is-rising"); void arrow.getBoundingClientRect(); arrow.classList.add("is-rising"); }
    };
    const update = () => {
      const w = slides[0].offsetWidth || 1;
      let best = 0, dist = Infinity;
      slides.forEach((s, i) => { const d = Math.abs(s.offsetLeft - track.offsetLeft - track.scrollLeft); if (d < dist) { dist = d; best = i; } });
      if (best !== active && dist < w * 0.5) { active = best; render(true); }
    };
    /* Taller items must never let the frame scroll vertically past the one in view */
    track.addEventListener("scroll", () => { if (track.scrollTop) track.scrollTop = 0; requestAnimationFrame(update); }, { passive: true });
    if (prev) prev.addEventListener("click", () => goTo(active - 1));
    if (next) next.addEventListener("click", () => goTo(active + 1));
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(active + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(active - 1); }
    });
    render(false);
  });

  /* ---------- Process & Takeaways carousel ---------- */
  document.querySelectorAll(".process").forEach((section) => {
    const track = section.querySelector(".process__track");
    const slides = [...track.children];
    const dots = section.querySelector(".process__dots");
    if (!slides.length) return;
    if (slides.length < 2) dots.hidden = true;

    const behavior = reduceMotion ? "auto" : "smooth";
    const padL = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const startOf = (i) => slides[i].offsetLeft - track.offsetLeft - padL();
    const goTo = (i) => {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: startOf(i), behavior });
    };
    /* A slide wider than the view (the "System" strip) scrolls within itself before moving on.
       roomIn(i, dir) = how far the track can still move inside slide i in that direction. */
    const spanOf = (i) => {
      const start = startOf(i);
      const end = Math.min(start + slides[i].offsetWidth - (track.clientWidth - padL() * 2), track.scrollWidth - track.clientWidth);
      return [start, Math.max(start, end)];
    };
    const isWide = (i) => i >= 0 && !!slides[i] && spanOf(i)[1] - spanOf(i)[0] > 4;
    const roomIn = (i, dir) => {
      if (!isWide(i)) return 0;
      const [start, end] = spanOf(i);
      return dir > 0 ? Math.max(0, end - track.scrollLeft) : Math.max(0, track.scrollLeft - start);
    };
    const step = (dir) => {
      const room = roomIn(active, dir);
      if (room > 4) track.scrollBy({ left: dir * Math.min(room, track.clientWidth * 0.6), behavior });
      else goTo(active + dir);
    };
    const buttons = slides.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Show item ${i + 1} of ${slides.length}`);
      b.addEventListener("click", () => goTo(i));
      dots.append(b);
      return b;
    });

    let active = -1;
    const setActive = (i) => {
      if (i === active) return;
      active = i;
      slides.forEach((s, n) => s.classList.toggle("is-active", n === i));
      buttons.forEach((b, n) => b.setAttribute("aria-current", String(n === i)));
    };
    const update = () => {
      const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      let best = 0, bestDist = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs(s.offsetLeft - track.offsetLeft - pad - track.scrollLeft);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      /* While the view is anywhere inside a wide slide, that slide stays the active one */
      slides.forEach((s, i) => {
        if (!isWide(i)) return;
        const [a, b] = spanOf(i);
        if (track.scrollLeft >= a - 4 && track.scrollLeft <= b + 4) best = i;
      });
      setActive(atEnd && track.scrollLeft > 0 ? slides.length - 1 : best);
    };
    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    update();
    /* Slides change width as their images load: recheck which one is active */
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => requestAnimationFrame(update));
      slides.forEach((s) => ro.observe(s));
    }

    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    });

    /* Arrow that follows the mouse over the peeking previous / next slide (mouse only) */
    const arrow = document.createElement("div");
    arrow.className = "process__cursor";
    arrow.setAttribute("aria-hidden", "true");
    arrow.innerHTML = '<svg viewBox="0 0 20 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M0 8h19M12 1l7 7-7 7"/></svg>';
    section.append(arrow);
    let mouse = null, hoverIndex = -1;
    const slideAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const slide = el && el.closest(".process__slide");
      return slide && track.contains(slide) ? slides.indexOf(slide) : -1;
    };
    /* Which slide a click here would go to: the peeking slide under the mouse, or, because the
       previous slide barely shows, the previous one when the mouse is in the strip at the left edge. */
    /* Returns a slide index, "fwd" / "back" (move within a wide slide), or -1 for nothing. */
    const targetAt = (x, y) => {
      const i = slideAt(x, y);
      if (i !== -1 && i !== active) return i;
      const r = track.getBoundingClientRect();
      const inTrack = y >= r.top && y <= r.bottom;
      if (inTrack && i === active && x > r.right - 180 && roomIn(active, 1) > 4) return "fwd";
      if (inTrack && i === active && x < r.left + 180 && roomIn(active, -1) > 4) return "back";
      /* At the end of a wide slide, the right edge still leads on to the next slide */
      if (inTrack && i === active && x > r.right - 180 && active < slides.length - 1) return active + 1;
      if (inTrack && active > 0 && x - r.left < 72) return active - 1;
      return -1;
    };
    const refreshArrow = () => {
      hoverIndex = mouse && !track.classList.contains("is-dragging") ? targetAt(mouse.x, mouse.y) : -1;
      const show = hoverIndex !== -1;
      if (show) {
        const prev = hoverIndex === "back" || (typeof hoverIndex === "number" && hoverIndex < active);
        arrow.classList.toggle("is-prev", prev);
        arrow.style.left = mouse.x + (prev ? -22 : 22) + "px";
        arrow.style.top = mouse.y + 22 + "px";
      }
      arrow.classList.toggle("is-visible", show);
      track.classList.toggle("is-pointing", show);
    };
    track.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      mouse = { x: e.clientX, y: e.clientY };
      refreshArrow();
    });
    track.addEventListener("pointerleave", () => { mouse = null; refreshArrow(); });
    track.addEventListener("scroll", () => requestAnimationFrame(refreshArrow), { passive: true });
    addEventListener("scroll", () => { if (mouse) requestAnimationFrame(refreshArrow); }, { passive: true });

    /* Mouse drag (touch and trackpads scroll natively); a plain click on a peeking slide goes to it */
    let startX = 0, startLeft = 0, dragging = false, downIndex = -1, downActive = 0;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true; startX = e.clientX; startLeft = track.scrollLeft;
      downIndex = targetAt(e.clientX, e.clientY);
      downActive = active;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      if (Math.abs(e.clientX - startX) > 4) { track.classList.add("is-dragging"); refreshArrow(); }
      track.scrollLeft = startLeft - (e.clientX - startX);
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      const moved = e.clientX - startX;
      track.classList.remove("is-dragging");
      const dir = moved < 0 ? 1 : -1;
      if (Math.abs(moved) <= 4) {
        if (e.type === "pointerup" && downIndex === "fwd") step(1);
        else if (e.type === "pointerup" && downIndex === "back") step(-1);
        else if (e.type === "pointerup" && downIndex !== -1) goTo(downIndex);
      }
      /* Dragging around inside a wide slide: stay put (snapping settles on the nearest image) */
      else if (isWide(downActive) && track.scrollLeft >= spanOf(downActive)[0] - 8 && track.scrollLeft <= spanOf(downActive)[1] + 8) { /* free */ }
      else if (Math.abs(moved) > 60) goTo(downActive + dir);
      else goTo(downActive);
      refreshArrow();
    };
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
  });

  /* ---------- About: split the statement into words for the hover trail ---------- */
  document.querySelectorAll("[data-word-trail]").forEach((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(part); return; }
        const span = document.createElement("span");
        span.className = "w";
        span.textContent = part;
        frag.append(span);
      });
      node.replaceWith(frag);
    });
    /* Tap support: light the word, let CSS fade it back */
    root.addEventListener("pointerdown", (e) => {
      const w = e.target.closest(".w");
      if (!w) return;
      w.classList.add("is-lit");
      setTimeout(() => w.classList.remove("is-lit"), 250);
    });
  });
})();
