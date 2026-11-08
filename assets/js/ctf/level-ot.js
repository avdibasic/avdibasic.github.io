/* Level 5, OT / ICS. A water tank controlled by a PLC over Modbus TCP, port 502.
   Modbus has no authentication and no encryption: anyone who can reach the PLC on
   the OT network can read and write its coils and registers directly, including
   the safety logic. You are on that network. Overflow the tank.

   The high-level interlock would normally stop the pump before the tank overfills,
   but the interlock is just another coil, so you can switch it off over Modbus like
   anything else. Disable it, close the drain, start the pump, and raise the setpoint
   until the tank spills. Do this quickly, before the operators notice the safety
   system is off. Never do this to a real plant. This is a simulation. */
(() => {
  "use strict";
  const C = window.CTF, clamp = C.clamp;

  const st = {};
  let ctx, root, canvas, g, raf, W = 0, H = 0, dpr = 1, last = 0, time = 0, wave = 0;
  const isLight = () => document.documentElement.dataset.theme === "light";

  const level = {
    id: "ot", order: 5, name: "OT / ICS", target: "Water treatment PLC",
    kind: "Modbus abuse", bonus: 1200, cta: "Open the Modbus client",
    brief: "A PLC runs a water tank and answers Modbus TCP on port 502. Modbus has no authentication, so your client can write any coil or register on it. The high-level interlock that stops the pump before an overflow is itself just a coil you can switch off. Disable the interlock, close the drain, start the pump, and drive the level past 100 percent to overflow the tank. Move fast, because operators notice when the safety system goes dark. Never do this to a real plant. This is a simulation.",
    flag: "FLAG{modbus_has_no_authentication}",
    real: "Modbus, and many other OT protocols such as DNP3, EtherNet/IP and S7, were designed decades ago for trusted serial links. They carry no authentication and no encryption. Anyone who can reach a PLC on the network can read and write its coils and registers directly, including safety related logic, exactly as this level disables the high-level interlock. That is why OT network segmentation, protocol aware firewalls, and independent hardwired safety instrumented systems matter so much. Never do this to a live system.",
    legend: [
      { icon: "lg-port", text: "Modbus TCP on port 502 needs no credentials to write" },
      { icon: "lg-laser", text: "Switch off the high-level interlock coil, then fill the tank" },
      { icon: "lg-cred", text: "Overflow before the operators re-arm the safety system" }
    ],

    mount(context) {
      ctx = context;
      Object.assign(st, {
        level: 42, pump: false, drain: true, interlock: true, setpoint: 50,
        attention: 0, over: false, alarm: 0, flashT: 0, spill: 0, tripped: false
      });
      root = document.createElement("div");
      root.className = "lv lv-ot";
      root.innerHTML = `
        <div class="lv-top">
          <div class="lv-stat"><span>Objective</span><b>Overflow the tank via Modbus</b></div>
          <div class="lv-stat"><span>Tank level</span><b id="ot-lvl" class="ok">42%</b></div>
          <div class="lv-stat"><span>Operator attention</span><b id="ot-att" class="ok">0%</b></div>
        </div>
        <div class="ot-stage"><canvas id="ot-canvas"></canvas><div class="ot-susp"><span id="ot-susp-fill"></span></div></div>
        <div class="ot-ctrls">
          <div class="ot-tile"><span class="ot-tl">Coil 00001 · Pump</span><button class="ot-toggle" id="ot-pump">STOPPED</button></div>
          <div class="ot-tile"><span class="ot-tl">Coil 00002 · Drain valve</span><button class="ot-toggle" id="ot-drain">OPEN</button></div>
          <div class="ot-tile"><span class="ot-tl">Coil 00009 · High-level interlock</span><button class="ot-toggle" id="ot-ilk">ENABLED</button></div>
          <div class="ot-tile"><span class="ot-tl">Reg 40001 · Pump setpoint</span>
            <div class="ot-row"><button class="ot-btn" id="ot-dn">−</button><span class="ot-rv" id="ot-sp">50%</span><button class="ot-btn up" id="ot-up">＋</button></div></div>
        </div>
        <div class="lv-log" id="ot-log"><span class="dim">$ connected to PLC 10.20.0.11:502 (Modbus TCP). no authentication requested or required.</span></div>`;
      ctx.layer.appendChild(root);
      canvas = root.querySelector("#ot-canvas");
      g = canvas.getContext("2d");
      bind();
      ctx.setLives(null); ctx.hudLabel("5/6 OT / ICS"); ctx.setStatus("write the PLC over Modbus"); ctx.setProgress(0);
      const r = ctx.stage.getBoundingClientRect(); this.resize(r.width, r.height);
      last = performance.now(); time = 0; raf = requestAnimationFrame(loop);
    },

    onKey(e) {
      if (!ctx.isPlaying() || st.over) return;
      const k = e.key.toLowerCase();
      if (k === "1") { e.preventDefault(); togglePump(); }
      else if (k === "2") { e.preventDefault(); toggleDrain(); }
      else if (k === "3") { e.preventDefault(); toggleInterlock(); }
      else if (k === "arrowright" || k === "d" || k === "+" || k === "=") { e.preventDefault(); setSp(10); }
      else if (k === "arrowleft" || k === "a" || k === "-") { e.preventDefault(); setSp(-10); }
    },
    onResume() { last = performance.now(); },
    resize(w, h) {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = w; H = h; canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    update() {},
    unmount() { if (raf) cancelAnimationFrame(raf); root && root.remove(); }
  };

  /* ---------------- helpers ---------------- */
  function log(msg, cls) {
    const el = root && root.querySelector("#ot-log");
    if (!el) return;
    const s = document.createElement("span");
    if (cls) s.className = cls;
    s.textContent = msg;
    el.appendChild(s); el.scrollTop = el.scrollHeight;
    while (el.children.length > 6) el.removeChild(el.firstChild);
  }
  // show the actual Modbus write that each control sends, to make the "no auth" point
  function modbus(fc, addr, val, label) {
    log(`→ ${fc} write ${addr} = ${val}   202 OK  (${label})`, fc === "FC05" && val === 0 && addr === "coil 00009" ? "err" : "");
  }
  function bind() {
    root.querySelector("#ot-pump").addEventListener("click", togglePump);
    root.querySelector("#ot-drain").addEventListener("click", toggleDrain);
    root.querySelector("#ot-ilk").addEventListener("click", toggleInterlock);
    root.querySelector("#ot-up").addEventListener("click", () => setSp(10));
    root.querySelector("#ot-dn").addEventListener("click", () => setSp(-10));
  }
  function togglePump() {
    if (st.over) return; st.pump = !st.pump; st.tripped = false; C.sfx.type();
    const b = root.querySelector("#ot-pump"); b.textContent = st.pump ? "RUNNING" : "STOPPED"; b.classList.toggle("danger", st.pump);
    modbus("FC05", "coil 00001", st.pump ? 1 : 0, "pump");
  }
  function toggleDrain() {
    if (st.over) return; st.drain = !st.drain; C.sfx.type();
    const b = root.querySelector("#ot-drain"); b.textContent = st.drain ? "OPEN" : "CLOSED"; b.classList.toggle("danger", !st.drain);
    modbus("FC05", "coil 00002", st.drain ? 1 : 0, "drain valve");
  }
  function toggleInterlock() {
    if (st.over) return; st.interlock = !st.interlock; C.sfx.type();
    const b = root.querySelector("#ot-ilk"); b.textContent = st.interlock ? "ENABLED" : "DISABLED"; b.classList.toggle("danger", !st.interlock);
    modbus("FC05", "coil 00009", st.interlock ? 1 : 0, "high-level interlock");
    if (!st.interlock) { log("$ safety interlock is OFF. nothing will stop the pump now.", "err"); ctx.addScore(80); }
    else log("$ interlock re-armed.");
  }
  function setSp(d) {
    if (st.over) return; st.setpoint = clamp(st.setpoint + d, 0, 100); C.sfx.type();
    root.querySelector("#ot-sp").textContent = Math.round(st.setpoint) + "%";
    modbus("FC06", "reg 40001", Math.round(st.setpoint), "pump setpoint");
  }
  function setBadge(id, txt, cls) { const e = root.querySelector("#" + id); if (e) { e.textContent = txt; e.className = cls || ""; } }

  /* ---------------- simulation ---------------- */
  function overflow() {
    st.over = true; st.alarm = 1; st.spill = 1;
    C.sfx.hit(); ctx.flash("bad"); ctx.shake && ctx.shake();
    setBadge("ot-lvl", "OVERFLOW", "warn");
    log("$ tank level exceeded 100%. OVERFLOW. containment breached, spill in progress.", "err");
    log("$ an unauthenticated Modbus write defeated a safety interlock. that is the whole point.", "err");
    ctx.setProgress(1); setTimeout(() => ctx.win(), 1150);
  }

  function sim(dt) {
    // interlock: a real high-level interlock cuts the pump near the top. it only works while armed.
    if (st.interlock && st.level >= 85 && st.pump) {
      st.pump = false; st.tripped = true;
      const b = root.querySelector("#ot-pump"); b.textContent = "STOPPED"; b.classList.remove("danger");
      log("$ INTERLOCK tripped at high level. pump stopped by safety logic.", "ok");
    }
    // flow model, percent per second
    const inflow = st.pump ? (st.setpoint / 100) * 14 : 0;
    const outflow = st.drain ? 10 : 0.8;
    st.level = clamp(st.level + (inflow - outflow) * dt, 0, 101);
    if (st.level >= 100 && !st.over) { overflow(); return; }

    // operator attention rises while the safety interlock is disabled, decays while it is armed
    if (!st.interlock) st.attention = clamp(st.attention + dt * 11, 0, 100);
    else st.attention = clamp(st.attention - dt * 8, 0, 100);
    if (st.attention >= 100) {
      st.over = true;
      log("$ operators saw the interlock drop, re-armed it and traced your writes. access revoked.", "err");
      ctx.flash("bad"); setTimeout(() => ctx.lose("Operators re-armed the safety interlock in time"), 450); return;
    }

    setBadge("ot-lvl", Math.round(st.level) + "%", st.level >= 85 ? "warn" : "ok");
    setBadge("ot-att", Math.round(st.attention) + "%", st.attention > 60 ? "warn" : "ok");
    const f = root.querySelector("#ot-susp-fill"); if (f) { f.style.width = st.attention + "%"; f.classList.toggle("warn", st.attention > 60); }
    ctx.setProgress(clamp(st.level / 100 * 0.8 + (st.interlock ? 0 : 0.1), 0, 0.96));
  }

  /* ---------------- rendering ---------------- */
  function draw() {
    const light = isLight();
    const col = light
      ? { bg: "#e7ecf4", grid: "rgba(15,118,110,.06)", tank: "#d6dde8", wall: "#6f7c95", water: "#2496be", water2: "#15719a", pipe: "#7f8ca4", teal: "#0f766e", amber: "#9a5b00", coral: "#c0392b", ink: "#2c3750", mut: "#5a647d" }
      : { bg: "#070c18", grid: "rgba(111,211,196,.05)", tank: "#101a2c", wall: "#2a3a58", water: "#2f8fb5", water2: "#1d6f90", pipe: "#2a3a58", teal: "#6fd3c4", amber: "#f2b33d", coral: "#ff6b5b", ink: "#9fb0cb", mut: "#8792ab" };
    g.clearRect(0, 0, W, H);
    g.fillStyle = col.bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = col.grid; g.lineWidth = 1;
    for (let x = 0; x < W; x += 34) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

    // tank geometry
    const tw = Math.min(W * 0.42, 260), th = H * 0.62;
    const tx = (W - tw) / 2, ty = H * 0.16;
    const lvl = clamp(st.level, 0, 101) / 100;
    const waterTop = ty + th * (1 - Math.min(lvl, 1));

    // inflow pipe (top-left into the tank) and its flow
    g.strokeStyle = col.pipe; g.lineWidth = Math.max(8, tw * 0.05); g.lineCap = "round";
    g.beginPath(); g.moveTo(tx - tw * 0.42, ty - 8); g.lineTo(tx + tw * 0.28, ty - 8); g.lineTo(tx + tw * 0.28, ty + 6); g.stroke();
    if (st.pump) {
      g.strokeStyle = col.teal; g.lineWidth = 3;
      const off = (time * 60) % 16;
      for (let y = ty + 6; y < waterTop; y += 16) { g.beginPath(); g.moveTo(tx + tw * 0.28, y + off); g.lineTo(tx + tw * 0.28, y + off + 7); g.stroke(); }
    }

    // tank body
    g.fillStyle = col.tank; roundRect(tx, ty, tw, th, 8); g.fill();
    // water
    g.save(); roundRect(tx, ty, tw, th, 8); g.clip();
    const grd = g.createLinearGradient(0, waterTop, 0, ty + th);
    grd.addColorStop(0, col.water); grd.addColorStop(1, col.water2);
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(tx, waterTop);
    for (let x = tx; x <= tx + tw; x += 8) g.lineTo(x, waterTop + Math.sin((x * 0.06) + wave) * 3);
    g.lineTo(tx + tw, ty + th); g.lineTo(tx, ty + th); g.closePath(); g.fill();
    g.restore();

    // high-level mark (HH alarm at 85%)
    const hhY = ty + th * (1 - 0.85);
    g.strokeStyle = st.interlock ? col.amber : col.coral; g.setLineDash([6, 5]); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(tx - 6, hhY); g.lineTo(tx + tw + 6, hhY); g.stroke(); g.setLineDash([]);
    g.fillStyle = st.interlock ? col.amber : col.coral; g.font = `600 ${Math.round(Math.max(8, W * 0.011))}px "Martian Mono", monospace`; g.textAlign = "left";
    g.fillText(st.interlock ? "HH interlock 85%" : "HH interlock OFF", tx + tw + 10, hhY + 4);

    // tank outline
    g.strokeStyle = col.wall; g.lineWidth = 2; roundRect(tx, ty, tw, th, 8); g.stroke();

    // drain pipe (bottom-right)
    g.strokeStyle = col.pipe; g.lineWidth = Math.max(8, tw * 0.05);
    g.beginPath(); g.moveTo(tx + tw * 0.7, ty + th); g.lineTo(tx + tw * 0.7, ty + th + 16); g.lineTo(tx + tw + 30, ty + th + 16); g.stroke();
    if (st.drain) {
      g.strokeStyle = col.teal; g.lineWidth = 3; const off = (time * 60) % 14;
      for (let x = tx + tw * 0.7; x < tx + tw + 26; x += 14) { g.beginPath(); g.moveTo(x + off, ty + th + 16); g.lineTo(x + off + 6, ty + th + 16); g.stroke(); }
    }

    // level readout on the tank
    g.fillStyle = col.ink; g.font = `800 ${Math.round(Math.max(16, tw * 0.13))}px "Martian Mono", monospace`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(Math.round(st.level) + "%", tx + tw / 2, ty + th + 44);
    g.textBaseline = "alphabetic";

    // overflow spill
    if (st.spill > 0) {
      g.fillStyle = col.water;
      for (let i = 0; i < 10; i++) { const x = tx + Math.random() * tw; g.fillRect(x, ty - 6 + Math.random() * 10, 3, 10 + Math.random() * 18); }
    }

    // alarm beacon top-left
    alarm(col);
    if (st.flashT > 0) { g.fillStyle = `rgba(${light ? "192,57,43" : "255,70,60"},${0.22 * clamp(st.flashT, 0, 1)})`; g.fillRect(0, 0, W, H); }
  }
  function roundRect(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function alarm(col) {
    const x = 26, y = 24, on = st.alarm > 0 ? (0.5 + Math.abs(Math.sin(time * 10)) * 0.5) : 0.16;
    g.save();
    if (st.alarm > 0) { const rg = g.createRadialGradient(x, y, 2, x, y, 40); rg.addColorStop(0, `rgba(255,60,50,${0.5 * on})`); rg.addColorStop(1, "rgba(255,60,50,0)"); g.fillStyle = rg; g.beginPath(); g.arc(x, y, 40, 0, 7); g.fill(); }
    g.fillStyle = `rgba(255,70,60,${0.22 + on * 0.78})`; g.beginPath(); g.arc(x, y - 2, 9, Math.PI, 0); g.fill();
    g.strokeStyle = col.coral; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = col.mut; g.font = `600 ${Math.round(Math.max(8, W * 0.011))}px "Martian Mono", monospace`; g.textAlign = "left";
    g.fillText(st.alarm > 0 ? "OVERFLOW ALARM" : "SAFETY", x + 16, y + 3);
    g.restore();
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    if (st.alarm > 0) { st.flashT = st.alarm; st.alarm = Math.max(0, st.alarm - dt * 0.4); }
    if (ctx.isPlaying() && !st.over) { time += dt; wave += dt * 2.2; sim(dt); }
    else { time += dt; wave += dt * 2.2; }
    draw();
  }

  C.register(level);
})();
