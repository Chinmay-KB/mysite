/* Tinkerer's Wall interactions — vanilla JS, transform/opacity only. */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* IST clock in the status bar + footer */
  function tick() {
    try {
      var t = new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      });
      var a = document.getElementById("clock");
      var b = document.getElementById("clock2");
      var c = document.getElementById("clock3");
      if (a) a.textContent = t;
      if (b) b.textContent = t;
      if (c) c.textContent = t;
    } catch (e) { /* Intl unavailable: leave placeholder */ }
  }
  tick();
  setInterval(tick, 1000);

  /* Scroll reveals: each group keeps its own vocabulary (rise/slide/swing/stamp
     from data-reveal); stagger stays small so it never blocks reading */
  var step = { ledger: 35, pegboard: 70, "social-ledger": 40, arows: 35 };
  var enter = { ledger: "rise", pegboard: "settle", "social-ledger": "rise", arows: "rise" };
  var groups = document.querySelectorAll(".ledger, .pegboard, .social-ledger, .arows, .timeline");
  groups.forEach(function (g) {
    var key = g.classList.contains("ledger") ? "ledger"
      : g.classList.contains("pegboard") ? "pegboard"
      : g.classList.contains("social-ledger") ? "social-ledger"
      : g.classList.contains("arows") ? "arows" : "ledger";
    Array.prototype.forEach.call(g.children, function (el, i) {
      el.classList.add("reveal");
      el.setAttribute("data-reveal", el.getAttribute("data-reveal") || enter[key] || "rise");
      el.style.transitionDelay = Math.min(i * (step[key] || 40), 280) + "ms";
    });
  });
  var solo = document.querySelectorAll(".reveal:not([style*='transition-delay'])");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }
  void solo;

  /* Pointer-as-light: glow follows the cursor with a lag */
  var glow = document.querySelector(".glow");
  if (glow && fine && !reduced) {
    var gx = -400, gy = -400, tx = gx, ty = gy, shown = false;
    window.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; glow.style.opacity = "1"; }
    }, { passive: true });
    (function loop() {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = "translate(" + gx + "px," + ty + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();
  }

  /* Magnetic nudges on index links (inner shift only — target stays put) */
  if (fine && !reduced) {
    document.querySelectorAll("[data-magnet]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = "translate(" + (dx * 7).toFixed(1) + "px," + (dy * 5).toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* Copy-email button with live feedback */
  var copy = document.getElementById("copyemail");
  var note = document.getElementById("copied");
  if (copy && note) {
    copy.addEventListener("click", function () {
      var done = function () {
        note.textContent = "copied ✓";
        setTimeout(function () { note.textContent = ""; }, 2200);
      };
      var email = copy.getAttribute("data-email");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = email; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta); done();
      }
    });
  }

  /* Reading progress hairline (article pages only) */
  var bar = document.getElementById("progress");
  if (bar) {
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? h.scrollTop / max : 0) + ")";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();
