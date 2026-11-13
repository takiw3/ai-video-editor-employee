/* Agentic Cut runtime: builds one paused, seekable GSAP timeline from window.AC (written by compose.mjs).
   Everything here is deterministic: no clocks, no randomness, no network. */
(function () {
  var C = window.AC;
  var T = C.total;
  var U = C.u;
  var tl = gsap.timeline({ paused: true });
  var clamp = function (t) { return Math.max(0, Math.min(T, t)); };
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var seed = 7;
  var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  /* ---------- captions ---------- */
  var cap = C.captions || {};
  var style = cap.style || "none";
  $$(".ac-g").forEach(function (g) {
    var gs = +g.dataset.s, ge = +g.dataset.e, inner = g.firstElementChild;
    tl.set(g, { autoAlpha: 1 }, clamp(gs));
    tl.set(g, { autoAlpha: 0 }, clamp(ge));
    if (style === "one-word") tl.fromTo(inner, { scale: 1.35 }, { scale: 1, duration: 0.14, ease: "power3.out", immediateRender: false }, clamp(gs));
    else if (style === "minimal" || style === "subtitle") tl.fromTo(inner, { opacity: 0 }, { opacity: 1, duration: 0.1, immediateRender: false }, clamp(gs));
    else if (style !== "pop" && style !== "typewriter") tl.fromTo(inner, { scale: 0.9, y: 8 * U }, { scale: 1, y: 0, duration: 0.14, ease: "back.out(2)", immediateRender: false }, clamp(gs));
    if (style === "pop") $$(".ac-w", g).forEach(function (w) {
      tl.fromTo(w, { scale: 0.55 }, { scale: 1, duration: 0.16, ease: "back.out(3)", immediateRender: false }, clamp(+w.dataset.s));
    });
  });
  // Word states (upcoming / on / said) are a pure function of the playhead, so any seek order gives the same frame.
  var GROUPS = $$(".ac-g").map(function (g) {
    return { s: +g.dataset.s, e: +g.dataset.e, w: $$(".ac-w", g).map(function (w) { return { el: w, s: +w.dataset.s, e: Math.max(+w.dataset.s + 0.05, +w.dataset.e), st: null }; }) };
  });
  var paint = function (t) {
    for (var i = 0; i < GROUPS.length; i++) {
      var G = GROUPS[i];
      if (t < G.s - 0.1 || t > G.e + 0.1) continue;
      for (var j = 0; j < G.w.length; j++) {
        var W = G.w[j], st = t < W.s ? "" : t < W.e ? "on" : "said";
        if (st !== W.st) { W.st = st; if (st) W.el.setAttribute("data-st", st); else W.el.removeAttribute("data-st"); }
      }
    }
  };
  (cap.hide || []).forEach(function (h) {
    tl.set("#caps", { autoAlpha: 0 }, clamp(h[0]));
    tl.set("#caps", { autoAlpha: 1 }, clamp(h[1]));
  });

  /* ---------- camera: moves on the cuts ---------- */
  var cs = C.cuts || {};
  var every = Math.max(1, cs.every || 1);
  (C.cutTimes || []).forEach(function (c, i) {
    if (i % every !== 0) return;
    var kind = cs.style || "none";
    var odd = Math.floor(i / every) % 2 === 0;
    if (kind === "punch" || kind === "punch-soft" || kind === "flash") tl.set("#cam", { scale: odd ? (kind === "punch-soft" ? 1.07 : 1.13) : 1 }, c);
    if (kind === "zoom") tl.fromTo("#cam", { scale: 1.16 }, { scale: 1, duration: 0.4, ease: "power3.out", immediateRender: false }, c);
    if (kind === "flash") tl.fromTo("#flash", { opacity: 0.8 }, { opacity: 0, duration: 0.2, ease: "power1.out", immediateRender: false }, c);
    if (kind === "whip") tl.fromTo("#cam", { xPercent: odd ? 9 : -9, filter: "blur(16px)" }, { xPercent: 0, filter: "blur(0px)", duration: 0.2, ease: "power2.out", immediateRender: false }, c);
    if (kind === "glitch") {
      tl.to("#cam", { keyframes: [{ x: -22 * U, skewX: 7, duration: 0.033 }, { x: 16 * U, skewX: -5, duration: 0.033 }, { x: -7 * U, skewX: 2, duration: 0.033 }, { x: 0, skewX: 0, duration: 0.033 }] }, c);
      tl.set("#cam", { filter: "hue-rotate(80deg) saturate(2.2) contrast(1.3)" }, c).set("#cam", { filter: "none" }, c + 0.1);
    }
  });

  /* ---------- zooms, shakes, flashes ---------- */
  (C.zooms || []).forEach(function (z) {
    var a = clamp(z.at), b = clamp(z.end != null ? z.end : z.at + 2), d = Math.max(0.1, b - a), s = z.scale || 1.2;
    tl.set("#zoom", { transformOrigin: ((z.x != null ? z.x : 0.5) * 100) + "% " + ((z.y != null ? z.y : C.faceY) * 100) + "%" }, a);
    if (z.kind === "snap") { tl.set("#zoom", { scale: s }, a); tl.set("#zoom", { scale: 1 }, b); }
    else if (z.kind === "push") { tl.fromTo("#zoom", { scale: 1 }, { scale: s, duration: d, ease: "none", immediateRender: false }, a); tl.set("#zoom", { scale: 1 }, b); }
    else {
      tl.fromTo("#zoom", { scale: 1 }, { scale: s, duration: Math.min(0.45, d / 2), ease: "power3.out", immediateRender: false }, a);
      tl.to("#zoom", { scale: 1, duration: Math.min(0.35, d / 3), ease: "power2.inOut" }, b - Math.min(0.35, d / 3));
    }
  });
  (C.shake || []).forEach(function (k) {
    var a = clamp(k.at), d = k.dur || 0.4, s = (k.strength || 1) * 18 * U, frames = [], n = Math.max(3, Math.round(d / 0.04));
    for (var i = 0; i < n; i++) { var f = 1 - i / n; frames.push({ x: (rnd() - 0.5) * 2 * s * f, y: (rnd() - 0.5) * 2 * s * f, rotation: (rnd() - 0.5) * 1.6 * f, duration: d / n }); }
    frames.push({ x: 0, y: 0, rotation: 0, duration: 0.03 });
    tl.to("#shake", { keyframes: frames }, a);
  });
  (C.flash || []).forEach(function (f) {
    tl.set("#flash", { backgroundColor: f.color || "#ffffff" }, clamp(f.at));
    tl.fromTo("#flash", { opacity: f.opacity || 0.85 }, { opacity: 0, duration: f.dur || 0.2, ease: "power1.out", immediateRender: false }, clamp(f.at));
  });

  /* ---------- text on screen ---------- */
  var ENTER = {
    pop: [{ scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2.2)" }],
    slide: [{ y: 70 * U, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" }],
    drop: [{ y: -90 * U, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "bounce.out" }],
    fade: [{ opacity: 0 }, { opacity: 1, duration: 0.3 }],
    slam: [{ scale: 1.9, opacity: 0, filter: "blur(14px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "power4.out" }],
    spin: [{ rotation: -14, scale: 0.4, opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.8)" }],
    blur: [{ opacity: 0, filter: "blur(20px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.35, ease: "power2.out" }],
  };
  $$(".ac-t").forEach(function (el) {
    var a = clamp(+el.dataset.s), b = clamp(+el.dataset.e), anim = el.dataset.anim || "pop", inner = el.firstElementChild;
    tl.set(el, { autoAlpha: 1 }, a);
    if (anim === "type") {
      var chars = $$(".ch", el);
      tl.set(chars, { opacity: 0 }, 0);
      chars.forEach(function (ch, i) { tl.set(ch, { opacity: 1 }, a + Math.min(0.045 * i, Math.max(0.2, (b - a) * 0.6) * i / chars.length)); });
    } else if (ENTER[anim]) {
      var e = ENTER[anim];
      tl.fromTo(inner, e[0], Object.assign({ immediateRender: false }, e[1]), a);
      if (anim === "slam") tl.to("#shake", { keyframes: [{ x: 10 * U, y: -6 * U, duration: 0.04 }, { x: -8 * U, y: 5 * U, duration: 0.04 }, { x: 0, y: 0, duration: 0.05 }] }, a + 0.15);
    }
    if (el.dataset.wiggle) tl.to(inner, { keyframes: [{ rotation: 6, duration: 0.25 }, { rotation: -6, duration: 0.5 }, { rotation: 0, duration: 0.25 }], ease: "sine.inOut" }, a + 0.3);
    var num = el.querySelector(".num");
    if (num) {
      var o = { v: +num.dataset.from }, to = +num.dataset.to, dec = +num.dataset.dec || 0;
      var show = function () { num.textContent = (num.dataset.pre || "") + o.v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (num.dataset.suf || ""); };
      tl.to(o, { v: to, duration: Math.min(1.3, (b - a) * 0.6), ease: "power2.out", onUpdate: show }, a + 0.1);
    }
    $$(".it", el).forEach(function (it) {
      tl.fromTo(it, { opacity: 0, x: -50 * U }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out", immediateRender: false }, clamp(+it.dataset.s));
    });
    if (el.dataset.hold !== "1") {
      tl.to(inner, { opacity: 0, scale: 0.94, duration: 0.18, ease: "power1.in" }, Math.max(a + 0.3, b - 0.18));
      tl.set(el, { autoAlpha: 0 }, b);
    }
  });

  /* ---------- b-roll ---------- */
  var IN = {
    fade: [{ opacity: 0 }, { opacity: 1, duration: 0.25 }],
    slide: [{ xPercent: 100, opacity: 1 }, { xPercent: 0, duration: 0.38, ease: "power3.out" }],
    up: [{ yPercent: 100, opacity: 1 }, { yPercent: 0, duration: 0.38, ease: "power3.out" }],
    zoom: [{ scale: 1.35, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "power3.out" }],
    pop: [{ scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.8)" }],
    whip: [{ xPercent: 40, opacity: 0, filter: "blur(22px)" }, { xPercent: 0, opacity: 1, filter: "blur(0px)", duration: 0.22, ease: "power2.out" }],
    cut: [{ opacity: 1 }, { opacity: 1, duration: 0.01 }],
    flash: [{ opacity: 1 }, { opacity: 1, duration: 0.01 }],
  };
  var OUT = {
    fade: { opacity: 0, duration: 0.25 },
    slide: { xPercent: -100, duration: 0.35, ease: "power3.in" },
    up: { yPercent: -100, duration: 0.35, ease: "power3.in" },
    zoom: { scale: 1.3, opacity: 0, duration: 0.3, ease: "power2.in" },
    pop: { scale: 0.6, opacity: 0, duration: 0.25, ease: "back.in(1.8)" },
    whip: { xPercent: -40, opacity: 0, filter: "blur(22px)", duration: 0.2, ease: "power2.in" },
    cut: { opacity: 0, duration: 0.01 },
    flash: { opacity: 0, duration: 0.01 },
  };
  $$(".ac-br").forEach(function (el) {
    var a = clamp(+el.dataset.s), b = clamp(+el.dataset.e), i = el.dataset.in || "fade", o = el.dataset.out || i;
    var e = IN[i] || IN.fade;
    tl.fromTo(el, e[0], Object.assign({ immediateRender: false }, e[1]), a);
    var od = (OUT[o] || OUT.fade).duration;
    tl.to(el, Object.assign({}, OUT[o] || OUT.fade), Math.max(a + 0.3, b - od));
    if (i === "flash") tl.fromTo("#flash", { opacity: 0.85 }, { opacity: 0, duration: 0.2, immediateRender: false }, a);
    if (o === "flash") tl.fromTo("#flash", { opacity: 0.85 }, { opacity: 0, duration: 0.2, immediateRender: false }, b);
    if (el.dataset.kb) tl.fromTo(el.firstElementChild, { scale: 1 }, { scale: 1.12, duration: b - a, ease: "none", immediateRender: false }, a);
  });

  /* ---------- progress bar ---------- */
  if ($("#progress")) tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: T, ease: "none", immediateRender: false }, 0);

  tl.set({}, {}, T);
  if (GROUPS.length) { tl.eventCallback("onUpdate", function () { paint(tl.time()); }); paint(0); }
  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = tl;
})();
