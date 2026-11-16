/* Password screen.
   This is a soft lock: it keeps casual visitors and search engines out, but the
   page files themselves are not encrypted. Don't rely on it for anything truly confidential.

   To change the password: open tools/set-password.html in a browser, type the new
   password, and paste the line it gives you over PASSWORD_HASH below. */
(() => {
  const PASSWORD_HASH = "2d24e3366950c0e9eed3971cda40356d120581830d80657b4dd34b886dcb6ccc";
  const PROTECT = "all";            // "all" = whole site, "work" = project pages only, "off" = no password
  const SALT = "sarahspitler.com::";
  const KEY = "ss-unlock";
  const root = document.documentElement;
  const scriptSrc = document.currentScript ? document.currentScript.src : location.href;

  /* Easter eggs: replies to a few predictable guesses, and a side door to /Dogs. */
  const MISSES = [
    "That's not it — try again.",
    "Nope. Close only counts in card sorting.",
    "Still no. Consider this a usability test of your patience.",
    "At this point, just ask Sarah for it.",
  ];
  const EGGS = {
    "password": "Bold choice. No.",
    "please": "Manners noted. Still no.",
    "1234": "This isn't luggage.",
    "123456": "This isn't luggage.",
    "admin": "Nice try, admin.",
    "open sesame": "Wrong cave.",
    "hello": "Hello! Still need the password, though.",
    "hi": "Hello! Still need the password, though.",
    "letmein": "No, but points for directness.",
  };
  const DOGS_KEY = "ss-dogs";
  const onDogsPage = /\/dogs\.html$/.test(location.pathname);
  let dogPass = false;
  try { dogPass = sessionStorage.getItem(DOGS_KEY) === "1"; } catch (e) {}

  const isProtected = PROTECT === "all" || (PROTECT === "work" && /\/work\//.test(location.pathname));
  let memory = null;
  const read = () => {
    try { return localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || memory; } catch (e) { return memory; }
  };
  const save = (v) => { memory = v; try { localStorage.setItem(KEY, v); } catch (e) { try { sessionStorage.setItem(KEY, v); } catch (e2) {} } };
  const unlock = () => { root.classList.remove("locked"); document.querySelector(".gate")?.remove(); };

  if (!isProtected || read() === PASSWORD_HASH || (onDogsPage && dogPass)) { root.classList.remove("locked"); return; }

  const sha256 = async (text) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  document.addEventListener("DOMContentLoaded", () => {
    const gate = document.createElement("div");
    gate.className = "gate";
    gate.innerHTML = `
      <form class="gate__form" novalidate>
        <h1 class="gate__title">Sarah Spitler<br><span>This work is password protected.</span></h1>
        <div class="gate__field">
          <label class="sr-only" for="gate-input">Password</label>
          <input id="gate-input" type="password" placeholder="Password" autocomplete="current-password" autocapitalize="off" spellcheck="false" required>
          <button type="submit" aria-label="Unlock">
            <svg viewBox="0 0 20 16" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M0 8h19M12 1l7 7-7 7"/></svg>
          </button>
        </div>
        <p class="gate__msg" role="alert" aria-live="polite"></p>
      </form>`;
    document.body.prepend(gate);
    const form = gate.querySelector("form");
    const input = gate.querySelector("input");
    const msg = gate.querySelector(".gate__msg");
    let misses = 0;
    input.focus();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!window.crypto || !crypto.subtle) { msg.textContent = "This browser can't check the password here — try the live site."; return; }
      const hash = await sha256(SALT + input.value);
      if (hash === PASSWORD_HASH) { save(hash); unlock(); return; }
      const guess = input.value.trim().toLowerCase();
      if (guess === "dogs" || guess === "dog") {
        try { sessionStorage.setItem(DOGS_KEY, "1"); } catch (e2) {}
        msg.textContent = "Wrong password, right priorities. ";
        const a = document.createElement("a");
        a.href = new URL("../../dogs.html", scriptSrc).href;
        a.textContent = "The dogs are this way →";
        msg.append(a);
        if (onDogsPage) { unlock(); return; }
      } else {
        msg.textContent = EGGS[guess] || MISSES[Math.min(misses, MISSES.length - 1)];
        if (!EGGS[guess]) misses += 1;
      }
      form.classList.remove("is-wrong"); void form.offsetWidth; form.classList.add("is-wrong");
      input.select();
    });
  });
})();
