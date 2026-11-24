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

  /* Plain-JS SHA-256, used where the browser's built-in crypto isn't available
     (e.g. the page was opened over http:// or in an in-app browser) */
  const sha256js = (text) => {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const bytes = [...new TextEncoder().encode(text)];
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
    let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) w[i] = (bytes[o+i*4] << 24) | (bytes[o+i*4+1] << 16) | (bytes[o+i*4+2] << 8) | bytes[o+i*4+3];
      for (let i = 16; i < 64; i++) {
        const s0 = r(w[i-15], 7) ^ r(w[i-15], 18) ^ (w[i-15] >>> 3);
        const s1 = r(w[i-2], 17) ^ r(w[i-2], 19) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, k] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (k + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h = h.map((v, i) => (v + [a, b, c, d, e, f, g, k][i]) | 0);
    }
    return h.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
  };
  const sha256 = async (text) => {
    if (window.crypto && crypto.subtle) {
      try {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (e) { /* fall through */ }
    }
    return sha256js(text);
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
