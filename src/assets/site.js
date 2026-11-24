// Small bits of interaction for loukiah.com: menu, film filter + viewer,
// photo series viewer, click-to-play Vimeo, booking form.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const play = (v) => { if (!v) return; v.muted = true; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---- mobile menu
  const menu = $(".mmenu");
  const openMenu = () => { menu.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("open"))); };
  const closeMenu = () => { menu.classList.remove("open"); setTimeout(() => { if (!menu.classList.contains("open")) menu.hidden = true; }, 450); };
  $$("[data-menu-open]").forEach((b) => b.addEventListener("click", openMenu));
  $$("[data-menu-close]").forEach((b) => b.addEventListener("click", closeMenu));
  if (menu) $$("a", menu).forEach((a) => a.addEventListener("click", closeMenu));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menu && !menu.hidden) closeMenu(); });

  // ---- background videos: start them, pause when off screen
  const vids = $$("video.vid");
  vids.forEach(play);
  // iOS Low Power Mode blocks autoplay until the first touch: start whatever is on screen then
  const kick = () => $$("video[autoplay]").forEach((v) => { const r = v.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) play(v); });
  ["touchstart", "pointerdown", "scroll"].forEach((e) => addEventListener(e, kick, { once: true, passive: true }));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const it = e.target.closest(".it");
      if (e.isIntersecting && !(it && it.classList.contains("off"))) play(e.target); else e.target.pause();
    }), { rootMargin: "200px" });
    vids.forEach((v) => io.observe(v));
  }

  // ---- Vimeo: load the player only when someone clicks (privacy)
  function mountEmbed(frame, src, poster, title) {
    if (!src) return;
    frame.innerHTML = '<button type="button" class="lb-play" aria-label="Play ' + esc(title) + '">' +
      (poster ? '<img src="' + esc(poster) + '" alt="">' : "") + "<span>Play</span></button>";
    frame.firstChild.addEventListener("click", () => startEmbed(frame, src, title));
  }
  function startEmbed(frame, src, title) {
    frame.innerHTML = '<iframe src="' + esc(src) + '" title="' + esc(title) + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
  }

  // film page (static)
  const fp = $(".filmpage");
  if (fp) {
    const frame = $("[data-frame]", fp);
    const title = ($("h1", fp) || {}).textContent || "";
    const btn = $(".lb-play", frame);
    if (btn) btn.addEventListener("click", () => startEmbed(frame, btn.dataset.embed, title));
    const partBtns = $$(".lb-parts button", fp);
    partBtns.forEach((b) => b.addEventListener("click", () => {
      partBtns.forEach((x) => x.classList.toggle("pt-on", x === b));
      startEmbed(frame, b.dataset.embed, title + " — " + b.textContent);
    }));
  }

  // ---- films page: filter + viewer
  const dataEl = $("#film-data");
  if (dataEl) {
    const films = JSON.parse(dataEl.textContent);
    const items = $$(".ed .it");
    $$(".tab").forEach((t) => t.addEventListener("click", () => {
      const cat = t.dataset.cat;
      $$(".tab").forEach((x) => { const on = x === t; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
      items.forEach((it) => {
        const on = cat === "all" || it.dataset.cat === cat;
        it.classList.toggle("on", on); it.classList.toggle("off", !on);
        const v = $("video", it); if (v) { if (on) play(v); else v.pause(); }
      });
    }));
    items.forEach((it) => {
      it.addEventListener("mouseenter", () => play($("video", it)));
      it.addEventListener("mouseleave", () => { if (it.classList.contains("off")) { const v = $("video", it); if (v) v.pause(); } });
    });

    const lb = $(".lb"), frame = $("[data-frame]", lb);
    let cur = null, pv = 0, lastFocus = null;
    function render() {
      const f = films[cur];
      const parts = f.parts || [];
      const p = parts.length ? parts[((pv % parts.length) + parts.length) % parts.length] : null;
      const src = p ? p.embed : f.embed;
      if (src) startEmbed(frame, src, f.c + (p ? " — " + p.n : ""));
      else frame.innerHTML = f.loop ? '<img src="' + esc(f.poster) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><video src="' + esc(f.loop) + '" autoplay muted loop playsinline style="object-fit:cover"></video>' : "";
      $("[data-lb-title]", lb).textContent = f.c;
      const pe = $("[data-lb-parts]", lb);
      pe.innerHTML = parts.length ? '<button type="button" class="pv-a" data-d="-1" aria-label="Previous video">←</button>' +
        parts.map((q, k) => '<button type="button" data-k="' + k + '" class="' + (q === p ? "pt-on" : "") + '">' + esc(q.n) + "</button>").join("") +
        '<button type="button" class="pv-a" data-d="1" aria-label="Next video">→</button>' : "";
      $$("button", pe).forEach((b) => b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (b.dataset.d) pv += +b.dataset.d; else pv = +b.dataset.k;
        render();
      }));
      $("[data-lb-about]", lb).textContent = f.about || "";
      $("[data-lb-credits]", lb).innerHTML = (f.client ? '<p class="cl"><span class="r">Client</span><span class="nm">' + (f.client.u ? '<a class="ext" href="' + esc(f.client.u) + '" target="_blank" rel="noopener">' + esc(f.client.n) + "</a>" : esc(f.client.n)) + "</span></p>" : "") + (f.credits || []).map((c) => '<p><span class="r">' + esc(c.r) + '</span><span class="nm">' + esc(c.n) + "</span></p>").join("");
      $("[data-lb-fest]", lb).innerHTML = (f.laurels || []).map((l) => '<img src="' + esc(l.img) + '" alt="' + esc(l.t) + '" title="' + esc(l.t) + '">').join("");
      lb.setAttribute("aria-label", f.c);
    }
    function open(i) {
      cur = i; pv = 0; lastFocus = document.activeElement;
      render(); lb.hidden = false; document.body.style.overflow = "hidden";
      $(".lb-x", lb).focus();
      if (history.replaceState) history.replaceState(null, "", films[i].url);
    }
    function close() {
      lb.hidden = true; frame.innerHTML = ""; document.body.style.overflow = "";
      if (history.replaceState) history.replaceState(null, "", document.querySelector(".tabs").dataset.base);
      if (lastFocus) lastFocus.focus();
    }
    items.forEach((it) => it.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let people open the film page in a new tab
      e.preventDefault(); open(+it.dataset.i);
    }));
    function step(d) {
      const vis = items.filter((it) => !it.classList.contains("off")).map((it) => +it.dataset.i);
      let k = vis.indexOf(cur); if (k < 0) k = 0;
      cur = vis[(k + d + vis.length) % vis.length]; pv = 0; render();
      if (history.replaceState) history.replaceState(null, "", films[cur].url);
    }
    $$("[data-lb-nav]", lb).forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); step(+b.dataset.lbNav); }));
    document.addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    });
    $("[data-lb-close]").addEventListener("click", close);
    lb.addEventListener("click", (e) => { if (!e.target.closest("[data-lb-in]")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lb.hidden) close(); });
  }

  // ---- photography: viewer (steps through every photo; series grouping later)
  const sv = $(".sv");
  if (sv) {
    const urls = {};
    $$(".fp[data-i]").forEach((b) => { urls[b.dataset.i] = $("img", b).getAttribute("src"); });
    const all = Object.keys(urls).map(Number).sort((a, b) => a - b).map((i) => urls[i]);
    let ser = [], si = 0, lastFocus = null;
    const show = () => {
      si = ((si % ser.length) + ser.length) % ser.length;
      $("[data-sv-img]", sv).src = ser[si];
      $("[data-sv-count]", sv).textContent = (si + 1) + " / " + ser.length;
    };
    $$(".fp[data-i]").forEach((b) => b.addEventListener("click", () => {
      ser = all; si = Math.max(0, all.indexOf(urls[b.dataset.i])); lastFocus = b;
      show(); sv.hidden = false; document.body.style.overflow = "hidden";
    }));
    const close = () => { sv.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); };
    $$("[data-sv-next]", sv).forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); si++; show(); }));
    $$("[data-sv-prev]", sv).forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); si--; show(); }));
    $("[data-sv-close]", sv).addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (sv.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") { si++; show(); }
      if (e.key === "ArrowLeft") { si--; show(); }
    });
  }

  // ---- booking form (Formspree)
  $$("form[data-book]").forEach((f) => {
    if (!/formspree\.io/.test(f.action)) return; // until a Formspree form is set, it falls back to email
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("button", f); btn.disabled = true;
      try {
        const r = await fetch(f.action, { method: "POST", body: new FormData(f), headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error();
        f.hidden = true; const ok = f.nextElementSibling; if (ok) ok.hidden = false;
      } catch (err) { btn.disabled = false; btn.textContent = "Try again"; }
    });
  });
})();

(function(){var p=document.querySelector("[data-bookpill]"),b=document.getElementById("book");if(!p||!b||!("IntersectionObserver" in window))return;new IntersectionObserver(function(e){p.classList.toggle("gone",e[0].isIntersecting)}).observe(b);})();
