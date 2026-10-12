/* NuvenDigital · comportamiento
   Todo es mejora progresiva: sin JS la web se ve y funciona igual. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };

  /* ---------- Intro del logo: una vez por sesión, se puede saltar ---------- */
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
    setTimeout(endIntro, 1950);
    addEventListener("keydown", endIntro);
    addEventListener("pointerdown", endIntro);
  }

  /* ---------- Luz del cursor + titular que se enciende ---------- */
  var glow = document.querySelector(".glow");
  var title = document.getElementById("heroTitle");
  var hero = document.getElementById("inicio");

  if (!reduce && title) {
    var radius = clamp(innerWidth * 0.32, 150, 300);
    title.style.setProperty("--r", radius + "px");

    var tx = 0, ty = 0;          // objetivo del puntero (pantalla)
    var gx = 0, gy = 0;          // posición suavizada del brillo
    var lx = 0, ly = 0;          // posición suavizada en el titular
    var hasPointer = false;
    var heroVisible = true;
    var running = false;
    var autopilot = !finePointer; // en móvil la luz se mueve sola

    var frame = function (t) {
      var r = title.getBoundingClientRect();
      var targetX, targetY;

      if (autopilot || !hasPointer) {
        // Recorrido lento por el titular
        targetX = r.width * (0.5 + 0.42 * Math.sin(t / 2300));
        targetY = r.height * (0.5 + 0.45 * Math.sin(t / 1700 + 1));
      } else {
        targetX = tx - r.left;
        targetY = ty - r.top;
      }
      lx += (targetX - lx) * 0.14;
      ly += (targetY - ly) * 0.14;
      title.style.setProperty("--mx", lx.toFixed(1) + "px");
      title.style.setProperty("--my", ly.toFixed(1) + "px");

      if (glow && finePointer && hasPointer) {
        gx += (tx - gx) * 0.16;
        gy += (ty - gy) * 0.16;
        glow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
      }

      var settled = Math.abs(targetX - lx) < 0.4 && Math.abs(targetY - ly) < 0.4 &&
                    (!glow || !hasPointer || (Math.abs(tx - gx) < 0.4 && Math.abs(ty - gy) < 0.4));
      if ((autopilot || !hasPointer) ? heroVisible : !settled) {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
    };
    var start = function () {
      if (!running) { running = true; requestAnimationFrame(frame); }
    };

    if (finePointer) {
      addEventListener("pointermove", function (e) {
        tx = e.clientX; ty = e.clientY;
        if (!hasPointer) { hasPointer = true; gx = tx; gy = ty; if (glow) glow.classList.add("on"); }
        start();
      }, { passive: true });
      document.addEventListener("pointerleave", function () { if (glow) glow.classList.remove("on"); });
      document.addEventListener("pointerenter", function () { if (glow && hasPointer) glow.classList.add("on"); });
    }

    if ("IntersectionObserver" in window && hero) {
      new IntersectionObserver(function (en) {
        heroVisible = en[0].isIntersecting;
        if (heroVisible) start();
      }, { threshold: 0 }).observe(hero);
    }
    start();
  }

  /* ---------- Luz en las filas de "qué incluye" ---------- */
  var rows = document.querySelector(".rows");
  if (rows && finePointer && !reduce) {
    rows.addEventListener("pointermove", function (e) {
      var row = e.target.closest(".row");
      if (!row) return;
      var b = row.getBoundingClientRect();
      row.style.setProperty("--x", (e.clientX - b.left) + "px");
      row.style.setProperty("--y", (e.clientY - b.top) + "px");
    }, { passive: true });
  }

  /* ---------- Scroll: línea del proceso y mockup del ejemplo ---------- */
  var steps = document.getElementById("steps");
  var stepEls = steps ? Array.prototype.slice.call(steps.querySelectorAll(".step")) : [];
  var tilt = document.querySelector("[data-progress]");
  var ticking = false;

  var update = function () {
    ticking = false;
    var vh = innerHeight;

    if (steps) {
      var r = steps.getBoundingClientRect();
      var p = clamp((vh * 0.65 - r.top) / r.height, 0, 1);
      steps.style.setProperty("--p", p.toFixed(3));
      stepEls.forEach(function (s) {
        s.classList.toggle("on", s.getBoundingClientRect().top < vh * 0.65);
      });
    }
    if (tilt && !reduce) {
      var b = tilt.getBoundingClientRect();
      var c = (b.top + b.height / 2) / vh;
      tilt.style.setProperty("--p", clamp(1 - c, 0, 1).toFixed(3));
    }
  };
  var onScroll = function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();

  /* Sin JS de scroll (reducir movimiento): los pasos se ven todos activos */
  if (reduce) {
    stepEls.forEach(function (s) { s.classList.add("on"); });
    if (steps) steps.style.setProperty("--p", "1");
  }

  /* ---------- Formulario: abre WhatsApp con el mensaje escrito ---------- */
  var form = document.getElementById("waForm");
  if (form) {
    var phone = new URL(form.action).pathname.replace("/", "");
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
      var text = "Hola, soy " + nombre + " y me dedico a: " + oficio + ". Quiero una web para mi negocio." +
                 (extra ? " " + extra : "");
      var url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
      var w = window.open(url, "_blank", "noopener");
      if (!w) location.href = url;
    });
  }
})();
