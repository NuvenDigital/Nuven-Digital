/* NuvenDigital · comportamiento
   Todo es mejora progresiva: sin JavaScript la web se ve y funciona igual (la historia se muestra estática). */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = root.classList.contains("rm");
  var finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };

  /* ---------- Intro: una vez por sesión, se puede saltar ---------- */
  if (root.classList.contains("intro-active")) {
    var done = false;
    var endIntro = function () {
      if (done) return;
      done = true;
      root.classList.remove("intro-active");
      try { sessionStorage.setItem("nd-intro", "1"); } catch (e) {}
      removeEventListener("keydown", endIntro);
      removeEventListener("pointerdown", endIntro);
    };
    setTimeout(endIntro, 2100);
    addEventListener("keydown", endIntro);
    addEventListener("pointerdown", endIntro);
  }

  /* ---------- Luz del cursor (puntero fino) ---------- */
  var glow = document.querySelector(".glow");
  var tx = 0, ty = 0, hasPointer = false;
  if (finePointer && !reduce) {
    var gx = 0, gy = 0, glowRun = false;
    var glowFrame = function () {
      gx += (tx - gx) * 0.16;
      gy += (ty - gy) * 0.16;
      glow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
      if (Math.abs(tx - gx) > 0.4 || Math.abs(ty - gy) > 0.4) {
        requestAnimationFrame(glowFrame);
      } else { glowRun = false; }
    };
    addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!hasPointer) { hasPointer = true; gx = tx; gy = ty; glow.classList.add("on"); }
      if (!glowRun) { glowRun = true; requestAnimationFrame(glowFrame); }
    }, { passive: true });
    document.addEventListener("pointerleave", function () { glow.classList.remove("on"); });
    document.addEventListener("pointerenter", function () { if (hasPointer) glow.classList.add("on"); });
  } else if (glow) {
    glow.style.display = "none";
  }

  /* ---------- Campo de cubos iluminado por la luz (inicio) ---------- */
  var hero = document.getElementById("inicio");
  var cv = document.getElementById("field");
  if (hero && cv && cv.getContext) {
    var ctx = cv.getContext("2d");
    var W = 0, H = 0, S = 38, cols = 0, rows = 0;
    var lx = 0, ly = 0, vis = true, running = false, last = 0;
    var coarse = !finePointer;

    var size = function () {
      var r = hero.getBoundingClientRect();
      W = Math.round(r.width); H = Math.round(r.height);
      S = W < 640 ? 30 : 38;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / S) + 1; rows = Math.ceil(H / S) + 1;
      if (!lx && !ly) { lx = W * 0.7; ly = H * 0.45; }
    };

    var draw = function (t) {
      ctx.clearRect(0, 0, W, H);
      var R = Math.max(130, Math.min(W, H) * 0.32), R2 = R * R, w = S - 3;
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          var x = i * S, y = j * S;
          var dx = x + S / 2 - lx, dy = y + S / 2 - ly;
          var lit = Math.exp(-(dx * dx + dy * dy) / R2);
          var wave = 0.5 + 0.5 * Math.sin(i * 0.33 + j * 0.27 + t / 1500);
          var h = (0.1 + 0.9 * lit) * (0.75 + 0.25 * wave);
          var g = Math.round(14 + 50 * lit + 5 * wave);
          var k = h * 7, ax = x - k, ay = y - k;
          var gs = g >> 1;
          ctx.fillStyle = "rgb(" + gs + "," + gs + "," + gs + ")";
          ctx.beginPath();
          ctx.moveTo(ax + w, ay); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + w);
          ctx.lineTo(x, y + w); ctx.lineTo(ax, ay + w);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = "rgb(" + g + "," + g + "," + g + ")";
          ctx.fillRect(ax, ay, w, w);
        }
      }
      // Halo de la luz
      var grd = ctx.createRadialGradient(lx, ly, 0, lx, ly, R * 1.1);
      grd.addColorStop(0, "rgba(255,255,255,.08)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    };

    var loop = function (t) {
      if (!vis || document.hidden) { running = false; return; }
      if (coarse && t - last < 33) { requestAnimationFrame(loop); return; } // 30 fps en móvil
      last = t;
      var gx2, gy2;
      if (!coarse && hasPointer) {
        var r = hero.getBoundingClientRect();
        gx2 = tx - r.left; gy2 = ty - r.top;
      } else {
        gx2 = W * (0.5 + 0.4 * Math.sin(t / 2700));
        gy2 = H * (0.5 + 0.36 * Math.sin(t / 2000 + 1));
      }
      lx += (gx2 - lx) * 0.12; ly += (gy2 - ly) * 0.12;
      draw(t);
      requestAnimationFrame(loop);
    };
    var start = function () { if (!running && !reduce) { running = true; requestAnimationFrame(loop); } };

    var init = function () {
      size();
      if (reduce) { draw(0); return; }
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (en) { vis = en[0].isIntersecting; if (vis) start(); }, { threshold: 0 }).observe(hero);
      }
      document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
      start();
    };
    var rt;
    addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { size(); if (reduce) draw(0); }, 150);
    });
    // Se arranca cuando el navegador está libre, para no frenar la primera carga
    if ("requestIdleCallback" in window) { requestIdleCallback(init, { timeout: 600 }); } else { setTimeout(init, 50); }
  }

  /* ---------- Historia: la escena cambia con el scroll ---------- */
  var story = document.getElementById("historia");
  var live = root.classList.contains("live") && story;
  var phone = document.getElementById("phone");
  var caps = story ? story.querySelectorAll(".cap") : [];
  var dots = story ? story.querySelectorAll(".dots i") : [];
  var scene = -1;
  var setScene = function (n) {
    if (n === scene) return;
    scene = n;
    phone.setAttribute("data-scene", String(n));
    for (var i = 0; i < caps.length; i++) caps[i].classList.toggle("on", i === n);
    for (var j = 0; j < dots.length; j++) dots[j].classList.toggle("on", j <= n);
  };

  /* ---------- Mockup del ejemplo real: se inclina con el scroll ---------- */
  var tilt = document.querySelector("[data-progress]");

  var ticking = false;
  var update = function () {
    ticking = false;
    var vh = innerHeight;
    if (live) {
      var r = story.getBoundingClientRect();
      var p = clamp(-r.top / Math.max(1, r.height - vh), 0, 0.999);
      setScene(Math.min(3, Math.floor(p * 4)));
    }
    if (tilt && !reduce) {
      var b = tilt.getBoundingClientRect();
      tilt.style.setProperty("--p", clamp(1 - (b.top + b.height / 2) / vh, 0, 1).toFixed(3));
    }
  };
  var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  if (live || (tilt && !reduce)) {
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    update();
  }

  /* ---------- Demo: elige un oficio ---------- */
  var TRADES = {
    fontaneria: { name: "Fontanería Ejemplo", tag: "Urgencias 24 h", s1: "Fugas y atascos", s2: "Calentadores", s3: "Reformas de baño", zone: "Costa Brava" },
    electricidad: { name: "Electricidad Ejemplo", tag: "Averías e instalaciones", s1: "Cuadros y enchufes", s2: "Iluminación", s3: "Revisión de la instalación", zone: "Costa Brava" },
    pintura: { name: "Pintura Ejemplo", tag: "Interior y fachadas", s1: "Pisos y casas", s2: "Fachadas", s3: "Alisado de paredes", zone: "Costa Brava" },
    reformas: { name: "Reformas Ejemplo", tag: "Baños, cocinas y reformas integrales", s1: "Baños y cocinas", s2: "Reformas integrales", s3: "Terrazas y exteriores", zone: "Costa Brava" }
  };
  var mw = document.getElementById("mw");
  var chips = document.querySelectorAll(".chip");
  if (mw && chips.length) {
    var binds = {};
    Array.prototype.forEach.call(mw.querySelectorAll("[data-b]"), function (el) { binds[el.getAttribute("data-b")] = el; });
    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener("click", function () {
        var d = TRADES[chip.getAttribute("data-trade")];
        if (!d) return;
        Array.prototype.forEach.call(chips, function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
        for (var k in d) { if (binds[k]) binds[k].textContent = d[k]; }
      });
    });
  }

  /* ---------- Formulario: abre WhatsApp con el mensaje escrito ---------- */
  var form = document.getElementById("waForm");
  if (form) {
    var phoneNum = new URL(form.action).pathname.replace("/", "");
    var fields = [
      { input: document.getElementById("f-nombre"), err: document.getElementById("e-nombre") },
      { input: document.getElementById("f-oficio"), err: document.getElementById("e-oficio") }
    ];
    fields.forEach(function (f) {
      f.input.addEventListener("input", function () {
        if (f.input.value.trim()) {
          f.input.removeAttribute("aria-invalid");
          f.input.removeAttribute("aria-describedby");
          f.err.hidden = true;
        }
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (f) {
        var bad = !f.input.value.trim();
        f.err.hidden = !bad;
        if (bad) {
          f.input.setAttribute("aria-invalid", "true");
          f.input.setAttribute("aria-describedby", f.err.id);
          if (!firstBad) firstBad = f.input;
        }
      });
      if (firstBad) { firstBad.focus(); return; }
      var nombre = fields[0].input.value.trim();
      var oficio = fields[1].input.value.trim();
      var extra = document.getElementById("f-msg").value.trim();
      var text = "Hola, soy " + nombre + " y me dedico a: " + oficio + ". Quiero una web para mi negocio." + (extra ? " " + extra : "");
      var url = "https://wa.me/" + phoneNum + "?text=" + encodeURIComponent(text);
      var w = window.open(url, "_blank", "noopener");
      if (!w) location.href = url;
    });
  }
})();
