/* =========================================================================
   CTF3D core, shared shell for five self-contained levels.
   Each level module registers itself via CTF.register(level).
   A level is: { id, name, target, kind, tint, brief, flag, real,
                 legend:[{icon,text}], mount(ctx), unmount(), ...optional
                 three-based levels implement update(dt)/resize(); DOM levels
                 build their own UI inside ctx.layer. Both call ctx.win()/lose()/hit(). }
   Exposes window.CTF3D = { show(container), hide() }.
   ========================================================================= */
(() => {
  "use strict";

  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Audio ---------------- */
  let ac = null, muted = false;
  try { muted = localStorage.getItem("ctf3d-muted") === "1"; } catch (e) {}
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(f, dur, type = "sine", vol = 0.06, when = 0, slide = 0) {
    if (muted) return;
    const a = audio(); if (!a) return;
    const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
  }
  const sfx = {
    start: () => { tone(330, 0.12, "triangle", 0.05); tone(660, 0.2, "triangle", 0.05, 0.1); },
    pass: () => tone(620, 0.05, "triangle", 0.025),
    pickup: () => { tone(880, 0.07, "square", 0.03); tone(1320, 0.1, "square", 0.03, 0.06); },
    type: () => tone(1500, 0.02, "square", 0.015),
    good: () => { tone(660, 0.08, "square", 0.04); tone(990, 0.12, "square", 0.04, 0.07); },
    bad: () => tone(220, 0.22, "sawtooth", 0.05, 0, 120),
    shield: () => tone(300, 0.45, "sine", 0.06, 0, 1200),
    block: () => tone(1200, 0.25, "sine", 0.05, 0, 300),
    hit: () => { tone(160, 0.4, "sawtooth", 0.08, 0, 45); tone(90, 0.3, "square", 0.05); },
    flag: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, "square", 0.04, i * 0.09)),
    over: () => tone(320, 0.9, "sawtooth", 0.06, 0, 50)
  };

  /* ---------------- Registry ---------------- */
  const LEVELS = [];
  const CTF = {
    esc, clamp, rand, reduceMotion, sfx, tone,
    register(level) { LEVELS.push(level); LEVELS.sort((a, b) => a.order - b.order); }
  };
  window.CTF = CTF;

  /* ---------------- Shell state ---------------- */
  let stage, ui = {}, inited = false, visible = false, raf = 0, last = 0;
  let threeRenderer = null;              // shared WebGL renderer, lazily created
  let best = 0;
  try { best = +localStorage.getItem("ctf3d-best") || 0; } catch (e) {}

  const S = {
    mode: "title",      // title | intro | play | paused | done | over | win
    idx: 0,             // current level index
    score: 0,
    levelStartScore: 0,
    flags: {},          // id -> true for captured this run
    run: "engagement",  // "engagement" (sequential, counts toward root flag) | "practice" (single stage)
    active: null        // the live level instance
  };
  const ROOT_FLAG = "FLAG{root-dance-full-domain-ownage}";
  // persistent: which stages the player has ever captured (for the select menu ticks)
  let cleared = {};
  try { cleared = JSON.parse(localStorage.getItem("ctf3d-cleared") || "{}") || {}; } catch (e) {}
  function markCleared(id) { cleared[id] = true; try { localStorage.setItem("ctf3d-cleared", JSON.stringify(cleared)); } catch (e) {} }

  function saveBest() {
    if (S.score > best) { best = S.score; try { localStorage.setItem("ctf3d-best", String(best)); } catch (e) {} }
  }

  /* ---------------- Shared THREE renderer (for 3D levels) ---------------- */
  function getRenderer() {
    if (!threeRenderer && window.THREE) {
      threeRenderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      threeRenderer.domElement.className = "g-canvas";
    }
    return threeRenderer;
  }

  /* ---------------- Context handed to each level ---------------- */
  function makeContext(level) {
    return {
      CTF, THREE: window.THREE, level,
      stage, layer: ui.layer,              // DOM levels build UI here
      getRenderer, makeComposer,           // 3D helpers
      addScore(n) { S.score += n | 0; updateHud(); },
      setProgress(p) { ui.bar.style.transform = `scaleX(${clamp(p, 0, 1)})`; },
      setStatus(txt) { if (ui.status.textContent !== txt) ui.status.textContent = txt; },
      setLives(n, max) { renderPips(n, max); },
      hudLabel(txt) { ui.lvl.textContent = txt; },
      flash(kind) { flash(kind === "good" ? "g-flash-teal" : "g-flash-red"); },
      shake() { if (S.active && S.active._shake !== undefined) S.active._shake = 0.45; },
      sfx, tone, rand, clamp, esc, reduceMotion,
      isPlaying: () => S.mode === "play",
      win: () => levelDone(),
      lose: () => gameOver()
    };
  }
  function makeComposer(renderer, scene, camera, w, h) {
    if (!(THREE.EffectComposer && THREE.UnrealBloomPass)) return null;
    const c = new THREE.EffectComposer(renderer);
    c.addPass(new THREE.RenderPass(scene, camera));
    c.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.9, 0.55, 0.14));
    c.setSize(w, h);
    return c;
  }

  /* ---------------- Flow ---------------- */
  function startRun() { S.run = "engagement"; S.score = 0; S.flags = {}; startLevel(0); }
  function startPractice(i) { S.run = "practice"; S.score = 0; S.flags = {}; startLevel(i); }

  function startLevel(i) {
    teardownActive();
    S.idx = i; S.levelStartScore = S.score;
    showIntro();
  }

  function play() {
    const level = LEVELS[S.idx];
    teardownActive();
    ui.layer.innerHTML = "";
    ui.layer.hidden = false;
    ui.canvasHolder.hidden = true;
    stage.classList.toggle("dom-level", level.kind3d !== true);
    stage.classList.add("in-level");
    const ctx = makeContext(level);
    S.active = { level, ctx, is3D: level.kind3d === true, _shake: 0 };
    S.mode = "play";
    hideScreen();
    ui.hud.hidden = false;
    sfx.start();
    try {
      level.mount(ctx);
    } catch (err) {
      console.error(err);
      screen(`<h2>Level failed to start</h2><p>${esc(err.message)}</p><div class="g-actions"><button class="g-btn primary" data-act="title">Back to menu</button></div>`);
      return;
    }
    resizeActive();
    updateHud(true);
  }

  function teardownActive() {
    if (stage) stage.classList.remove("in-level");
    if (S.active) {
      try { S.active.level.unmount && S.active.level.unmount(S.active.ctx); } catch (e) {}
      S.active = null;
    }
    ui.layer.innerHTML = "";
    ui.layer.hidden = true;
    if (ui.canvasHolder) ui.canvasHolder.hidden = true;
  }

  function pause() {
    if (S.mode !== "play") return;
    S.mode = "paused";
    const L = LEVELS[S.idx];
    screen(`
      <h2>Paused</h2>
      <p>Operation against ${esc(L.target.toLowerCase())} is on hold.</p>
      <div class="g-actions"><button class="g-btn primary" data-act="resume">Resume</button><button class="g-btn" data-act="title">Quit to menu</button></div>`);
  }

  function levelDone() {
    if (S.mode === "done" || S.mode === "win") return;
    const L = LEVELS[S.idx];
    S.flags[L.id] = true;
    markCleared(L.id);
    const bonus = L.bonus || 600;
    S.score += bonus;
    saveBest();
    sfx.flag();
    S.mode = "done";
    teardownActive();
    ui.hud.hidden = true;

    // Practice mode: single stage, then back to the select menu. No root flag.
    if (S.run === "practice") {
      screen(`
        <div class="g-kicker">Practice · ${esc(L.name)}</div>
        <h2>Flag captured</h2>
        <code class="g-flag">${esc(L.flag)}</code>
        <div class="g-real"><h3>What this means in real life</h3><p>${esc(L.real)}</p></div>
        <p class="g-sub">The root flag is only awarded for a full engagement run, all stages, start to finish.</p>
        <div class="g-actions"><button class="g-btn primary" data-act="select">Choose another stage</button><button class="g-btn" data-act="title">Menu</button></div>`);
      return;
    }

    const last = S.idx === LEVELS.length - 1;
    if (last) return win();
    screen(`
      <div class="g-kicker">Objective ${S.idx + 1} of ${LEVELS.length} complete</div>
      <h2>Flag captured</h2>
      <code class="g-flag">${esc(L.flag)}</code>
      <div class="g-real"><h3>What this means in real life</h3><p>${esc(L.real)}</p></div>
      <dl class="g-stats">
        <div><dt>Bonus</dt><dd>+${bonus}</dd></div>
        <div><dt>Score</dt><dd>${S.score.toLocaleString("en-US")}</dd></div>
      </dl>
      <div class="g-actions"><button class="g-btn primary" data-act="next">Next: ${esc(LEVELS[S.idx + 1].name)}</button></div>`);
  }

  function gameOver(msg) {
    if (S.mode === "over") return;
    const L = LEVELS[S.idx];
    teardownActive();
    S.mode = "over"; ui.hud.hidden = true; sfx.over(); saveBest();
    screen(`
      <div class="g-kicker">Caught on ${esc(L.name)}</div>
      <h2>${esc(msg || "The blue team caught you")}</h2>
      <p>That is what defenders are for. On a real engagement, it gets documented how well detection and response worked.</p>
      <dl class="g-stats">
        <div><dt>Score</dt><dd>${S.score.toLocaleString("en-US")}</dd></div>
        <div><dt>Best</dt><dd>${best.toLocaleString("en-US")}</dd></div>
      </dl>
      <div class="g-actions"><button class="g-btn primary" data-act="retry">Retry ${esc(L.name)}</button>${S.run === "practice" ? '<button class="g-btn" data-act="select">Choose stage</button>' : ""}<button class="g-btn" data-act="title">Back to menu</button></div>`);
  }

  function win() {
    saveBest();
    S.mode = "win";
    teardownActive();
    ui.hud.hidden = true;
    screen(`
      <div class="g-kicker">All ${LEVELS.length} objectives complete</div>
      <h2>Full compromise</h2>
      <p>You chained every stage of the engagement into complete ownership. This is where the report starts: each path you took becomes a finding, and each one gets closed.</p>
      <div class="g-rootflag">
        <span class="g-rootflag-label">ROOT FLAG</span>
        <code>${esc(ROOT_FLAG)}</code>
      </div>
      <ul class="g-flags">${LEVELS.map((l) => `<li><span>${esc(l.name)}</span><code>${esc(l.flag)}</code></li>`).join("")}</ul>
      <dl class="g-stats">
        <div><dt>Score</dt><dd>${S.score.toLocaleString("en-US")}</dd></div>
        <div><dt>Best</dt><dd>${best.toLocaleString("en-US")}</dd></div>
      </dl>
      <div class="g-actions"><button class="g-btn primary" data-act="start">Play again</button><a class="g-btn" href="#whoami">Meet the tester</a></div>`);
  }

  /* ---------------- Screens ---------------- */
  function screen(html) {
    ui.screen.innerHTML = `<div class="g-card">${html}</div>`;
    ui.screen.hidden = false; stage.classList.add("has-screen");
    ui.screen.scrollTop = 0;
    const btn = ui.screen.querySelector(".primary");
    if (btn) btn.focus({ preventScroll: true });
  }
  function hideScreen() {
    ui.screen.hidden = true; ui.screen.innerHTML = ""; stage.classList.remove("has-screen");
    stage.focus({ preventScroll: true });
  }
  function flash(cls) { ui.flash.className = "g-flash"; void ui.flash.offsetWidth; ui.flash.className = "g-flash " + cls; }

  function showTitle() {
    S.mode = "title"; ui.hud.hidden = true; teardownActive();
    screen(`
      <div class="g-logo">CTF range</div>
      <p class="g-sub">You are a penetration tester, hired to break in before someone else does. Work through ${LEVELS.length} stages of a real engagement, each one is its own game.</p>
      <ol class="g-route">${LEVELS.map((l) => `<li><b>${esc(l.name)}</b><span>${esc(l.target)}</span></li>`).join("")}</ol>
      <div class="g-actions"><button class="g-btn primary" data-act="start">Start the engagement</button><button class="g-btn" data-act="select">Choose a stage</button>${best ? `<span class="g-best">Best score ${best.toLocaleString("en-US")}</span>` : ""}</div>`);
  }
  function showSelect() {
    S.mode = "title"; ui.hud.hidden = true; teardownActive();
    const items = LEVELS.map((l, i) => `
      <button class="g-pick ${cleared[l.id] ? "done" : ""}" data-pick="${i}">
        <span class="g-pick-n">${i + 1}</span>
        <span class="g-pick-main"><b>${esc(l.name)}</b><em>${esc(l.target)}</em></span>
        <span class="g-pick-kind">${esc(l.kind)}</span>
        <span class="g-pick-tick" aria-hidden="true">${cleared[l.id] ? "✓" : ""}</span>
      </button>`).join("");
    screen(`
      <div class="g-kicker">Practice mode</div>
      <h2>Choose a stage</h2>
      <p class="g-sub">Play any stage on its own to practise. The <b>root flag</b> is only awarded for a full engagement run from stage 1 to ${LEVELS.length}.</p>
      <div class="g-picks">${items}</div>
      <div class="g-actions"><button class="g-btn primary" data-act="start">Run full engagement</button><button class="g-btn" data-act="title">Back</button></div>`);
    ui.screen.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => startPractice(+b.dataset.pick)));
  }
  function showIntro() {
    const L = LEVELS[S.idx];
    S.mode = "intro"; ui.hud.hidden = true;
    const legend = (L.legend || []).map((x) => `<li><i class="${esc(x.icon)}"></i>${esc(x.text)}</li>`).join("");
    screen(`
      <div class="g-kicker">${S.run === "practice" ? "Practice" : "Stage " + (S.idx + 1) + " of " + LEVELS.length} · ${esc(L.kind)}</div>
      <h2>${esc(L.name)}: ${esc(L.target)}</h2>
      <p>${esc(L.brief)}</p>
      ${legend ? `<ul class="g-legend">${legend}</ul>` : ""}
      <div class="g-actions"><button class="g-btn primary" data-act="play">${esc(L.cta || "Begin")}</button>${S.run === "practice" ? '<button class="g-btn" data-act="select">Back</button>' : ""}</div>`);
  }

  /* ---------------- HUD ---------------- */
  function renderPips(n, max) {
    max = max || 3;
    if (ui.pips.childElementCount !== max) {
      ui.pips.innerHTML = Array.from({ length: max }, () => "<i></i>").join("");
    }
    [...ui.pips.children].forEach((p, i) => p.classList.toggle("on", i < n));
    ui.pips.hidden = n === null;
  }
  function updateHud(force) {
    const L = LEVELS[S.idx];
    ui.lvl.textContent = `${S.idx + 1}/${LEVELS.length} ${L.name}`;
    const sc = S.score.toLocaleString("en-US");
    if (force || ui.score.textContent !== sc) ui.score.textContent = sc;
  }

  function onAction(act) {
    audio();
    if (act === "start") startRun();
    else if (act === "select") showSelect();
    else if (act === "play") play();
    else if (act === "next") startLevel(S.idx + 1);
    else if (act === "retry") { S.score = S.levelStartScore; startLevel(S.idx); }
    else if (act === "resume") { S.mode = "play"; hideScreen(); if (S.active && S.active.level.onResume) S.active.level.onResume(S.active.ctx); }
    else if (act === "title") showTitle();
  }

  /* ---------------- DOM ---------------- */
  function buildDom(container) {
    container.innerHTML = `
      <div class="g-stage" tabindex="0" aria-label="CTF3D game">
        <div class="g-canvas-holder" hidden></div>
        <div class="g-layer" hidden></div>
        <div class="g-hud" hidden>
          <div class="g-hud-l"><div class="g-lvl"></div><div class="g-pips" aria-label="Lives"></div><div class="g-status"></div></div>
          <div class="g-prog" aria-hidden="true"><span></span><em>FLAG</em></div>
          <div class="g-hud-r"><div class="g-score">0</div></div>
        </div>
        <div class="g-ctrl">
          <button type="button" data-ui="restart" aria-label="Restart stage" title="Restart this stage"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 11a8 8 0 1 0-.6 3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
          <button type="button" data-ui="pause" aria-label="Pause" title="Pause (P)"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.2" fill="none"/></svg></button>
          <button type="button" data-ui="mute" aria-label="Sound" title="Sound"></button>
          <button type="button" data-ui="fs" aria-label="Full screen" title="Full screen"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="2" fill="none"/></svg></button>
          <button type="button" data-ui="close" aria-label="Close stage" title="Close this stage"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2"/></svg></button>
        </div>
        <div class="g-flash"></div>
        <div class="g-screen" hidden></div>
      </div>`;
    stage = container.querySelector(".g-stage");
    ui = {
      canvasHolder: stage.querySelector(".g-canvas-holder"),
      layer: stage.querySelector(".g-layer"),
      hud: stage.querySelector(".g-hud"), lvl: stage.querySelector(".g-lvl"),
      pips: stage.querySelector(".g-pips"), status: stage.querySelector(".g-status"),
      score: stage.querySelector(".g-score"), bar: stage.querySelector(".g-prog span"),
      screen: stage.querySelector(".g-screen"), flash: stage.querySelector(".g-flash"),
      mute: stage.querySelector('[data-ui="mute"]')
    };
    setMuteIcon();

    stage.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]");
      if (a && a.tagName === "BUTTON") { onAction(a.dataset.act); return; }
      const u = e.target.closest("[data-ui]"); if (!u) return;
      if (u.dataset.ui === "pause") S.mode === "paused" ? onAction("resume") : pause();
      if (u.dataset.ui === "restart") onAction("retry");   // restart this stage; score reverts to the stage's start, not zero
      if (u.dataset.ui === "close") { if (S.run === "practice") showSelect(); else showTitle(); }
      if (u.dataset.ui === "mute") { muted = !muted; try { localStorage.setItem("ctf3d-muted", muted ? "1" : "0"); } catch (e) {} setMuteIcon(); }
      if (u.dataset.ui === "fs") {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
      }
    });

    window.addEventListener("keydown", (e) => {
      if (!visible) return;
      if ((e.code === "KeyP" || e.code === "Escape") && (S.mode === "play" || S.mode === "paused")) {
        e.preventDefault(); S.mode === "play" ? pause() : onAction("resume"); return;
      }
      if (S.active && S.mode === "play" && S.active.level.onKey) S.active.level.onKey(e, S.active.ctx);
    });
    window.addEventListener("keyup", (e) => {
      if (S.active && S.active.level.onKeyUp) S.active.level.onKeyUp(e, S.active.ctx);
    });
    window.addEventListener("blur", () => { if (S.active && S.active.level.onBlur) S.active.level.onBlur(S.active.ctx); pause(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

    new ResizeObserver(resizeActive).observe(stage);
  }

  function resizeActive() {
    if (S.active && S.active.level.resize) {
      const r = stage.getBoundingClientRect();
      try { S.active.level.resize(Math.max(1, r.width), Math.max(1, r.height), S.active.ctx); } catch (e) {}
    }
  }

  function setMuteIcon() {
    ui.mute.innerHTML = muted
      ? '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" stroke="currentColor" stroke-width="2"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
    ui.mute.setAttribute("aria-pressed", String(muted));
  }

  /* expose canvas holder + shake for 3D levels */
  CTF.mountCanvas = (dom) => { ui.canvasHolder.innerHTML = ""; ui.canvasHolder.appendChild(dom); ui.canvasHolder.hidden = false; };
  CTF.activeShake = () => (S.active ? S.active._shake : 0);
  CTF.decayShake = (dt) => { if (S.active && S.active._shake > 0) S.active._shake = Math.max(0, S.active._shake - dt); };

  /* ---------------- Loop ---------------- */
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    if (S.mode !== "paused" && S.active && S.active.level.update) {
      try { S.active.level.update(dt, S.active.ctx); } catch (e) { console.error(e); }
    }
  }

  window.CTF3D = {
    show(container) {
      if (!inited) {
        try { buildDom(container); } catch (e) {
          container.innerHTML = `<p class="empty">The game could not start (${esc(e.message)}).</p>`;
          return;
        }
        inited = true;
        showTitle();
      }
      visible = true;
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    },
    hide() {
      visible = false;
      if (inited && S.mode === "play") pause();
      if (S.active && S.active.level.onBlur) S.active.level.onBlur(S.active.ctx);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
  };
})();
