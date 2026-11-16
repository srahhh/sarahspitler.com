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
    fade();
  }

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

  /* ---------- Process & Takeaways carousel ---------- */
  document.querySelectorAll(".process").forEach((section) => {
    const track = section.querySelector(".process__track");
    const slides = [...track.children];
    const dots = section.querySelector(".process__dots");
    if (!slides.length) return;

    const goTo = (i) => {
      const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft - pad, behavior: reduceMotion ? "auto" : "smooth" });
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
      setActive(atEnd && track.scrollLeft > 0 ? slides.length - 1 : best);
    };
    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    update();

    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(Math.min(active + 1, slides.length - 1)); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(Math.max(active - 1, 0)); }
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
    const targetAt = (x, y) => {
      const i = slideAt(x, y);
      if (i !== -1 && i !== active) return i;
      const inTrack = y >= track.getBoundingClientRect().top && y <= track.getBoundingClientRect().bottom;
      if (inTrack && active > 0 && x - track.getBoundingClientRect().left < 72) return active - 1;
      return -1;
    };
    const refreshArrow = () => {
      hoverIndex = mouse && !track.classList.contains("is-dragging") ? targetAt(mouse.x, mouse.y) : -1;
      const show = hoverIndex !== -1;
      if (show) {
        const prev = hoverIndex < active;
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
    let startX = 0, startLeft = 0, dragging = false, downIndex = -1;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true; startX = e.clientX; startLeft = track.scrollLeft;
      downIndex = targetAt(e.clientX, e.clientY);
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
      if (Math.abs(moved) <= 4 && downIndex !== -1 && e.type === "pointerup") goTo(downIndex);
      else if (Math.abs(moved) > 60) goTo(Math.max(0, Math.min(slides.length - 1, active + (moved < 0 ? 1 : -1))));
      else goTo(active);
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
