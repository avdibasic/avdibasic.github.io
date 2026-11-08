/* Level 6: Physical Access. Original top-down stealth game on a 2D canvas.
   Start outside the factory, enter through the main door, reach the server room
   and open its door, then get back OUT through the entry door undetected. The
   flag only shows once you've exfiltrated. Figures are drawn here (a burglar for
   the player, agents for the guards), no third-party assets.
   This is about tailgating, badges and physical security. Don't do it for real. */
(() => {
  "use strict";
  const C = window.CTF, clamp = C.clamp, rand = C.rand;

  const MAPW = 44, MAPH = 28;

  function buildWorld() {
    const walls = [], cover = [], doors = [];
    walls.push({ x: 0, y: 0, w: MAPW, h: 1 }, { x: 0, y: MAPH - 1, w: MAPW, h: 1 },
      { x: 0, y: 0, w: 1, h: MAPH }, { x: MAPW - 1, y: 0, w: 1, h: MAPH });

    const fx = 10, fy = 2, fw = 32, fh = 24;
    walls.push({ x: fx, y: fy, w: fw, h: 0.6 });
    walls.push({ x: fx, y: fy + fh - 0.6, w: fw, h: 0.6 });
    walls.push({ x: fx + fw - 0.6, y: fy, w: 0.6, h: fh });
    const doorY = 13, doorH = 2.2;
    walls.push({ x: fx, y: fy, w: 0.6, h: doorY - fy });
    walls.push({ x: fx, y: doorY + doorH, w: 0.6, h: fy + fh - (doorY + doorH) });
    const entryDoor = { x: fx + 0.3, y: doorY + doorH / 2, w: 0.9, h: doorH, open: true, kind: "entry" };
    doors.push(entryDoor);

    walls.push({ x: 14, y: 4, w: 7, h: 3 });
    walls.push({ x: 24, y: 4, w: 9, h: 3 });
    walls.push({ x: 14, y: 10, w: 4, h: 4 });
    walls.push({ x: 21, y: 10, w: 5, h: 3 });
    walls.push({ x: 29, y: 9, w: 4, h: 5 });
    walls.push({ x: 14, y: 18, w: 6, h: 4 });
    walls.push({ x: 23, y: 18, w: 5, h: 3 });

    const sx = 34, sy = 16, sw = 7, sh = 8;
    // top, bottom, right walls solid
    walls.push({ x: sx, y: sy, w: sw, h: 0.6 });
    walls.push({ x: sx, y: sy + sh - 0.6, w: sw, h: 0.6 });
    walls.push({ x: sx + sw - 0.6, y: sy, w: 0.6, h: sh });
    // left wall (facing the factory floor) has a door gap in the middle
    const srDoorY = sy + sh / 2 - 1.1;
    walls.push({ x: sx, y: sy, w: 0.6, h: srDoorY - sy });
    walls.push({ x: sx, y: srDoorY + 2.2, w: 0.6, h: sy + sh - (srDoorY + 2.2) });
    const serverDoor = { x: sx + 0.3, y: srDoorY + 1.1, w: 0.9, h: 2.2, open: false, kind: "server" };
    doors.push(serverDoor);
    const serverGoal = { x: sx + sw / 2 + 0.5, y: sy + sh / 2, r: 1.3 };

    [[22, 8, 1, 1], [27, 15, 1, 1], [18, 15, 1, 1], [31, 20, 1, 1], [20, 22, 2, 1],
     [12, 8, 1, 1], [12, 20, 1, 1], [26, 22, 1, 1], [16, 7, 1, 1], [33, 6, 1, 1]
    ].forEach(([x, y, w, h]) => cover.push({ x, y, w, h }));
    [[4, 12, 2, 1], [6, 16, 1, 2], [3, 20, 2, 1], [5, 7, 2, 1]].forEach(([x, y, w, h]) => cover.push({ x, y, w, h }));

    const start = { x: 3, y: 14 };
    const exit = { x: fx - 1.2, y: doorY + doorH / 2, r: 1.1 };

    // Routes run only along open corridors between the buildings above, so agents
    // never clip a wall. Horizontal lanes sit at y≈8.5 and y≈16; vertical lanes at
    // x≈19.5, x≈27.5 and x≈12.
    // Corridors (verified clear of every wall with the agent radius):
    //  upper lane y≈8.5 (between top buildings y4-7 and mid buildings y10-14)
    //  mid lane  y≈16  (between mid buildings and lower buildings y18-22)
    //  verticals x≈19.5 and x≈27.5 run through the gaps between buildings
    const guards = [
      { route: [[15, 8.5], [32, 8.5]], speed: 2.0 },                   // upper corridor, full width
      { route: [[19.5, 8.5], [19.5, 16], [28, 16]], speed: 1.9 },      // centre L into mid lane
      { route: [[30, 16], [32.8, 16], [32.8, 22.8], [30, 22.8]], speed: 2.2 }, // loop just outside server room
      { route: [[12, 8.5], [12, 16.5], [20, 16.5]], speed: 2.0 },      // left vertical + into mid lane
      { route: [[27.5, 8.5], [27.5, 16]], speed: 2.3 },                // vertical between right buildings
      { route: [[21.5, 16], [28, 16]], speed: 1.7 },                   // extra interior agent, mid lane
      { route: [[6, 10], [6, 18]], speed: 1.6 }                        // outside roamer near the gate
    ];
    return { walls, cover, doors, entryDoor, serverDoor, serverGoal, start, exit, guards };
  }

  const st = {};
  let ctx, root, canvas, g2d, raf, W = 0, H = 0, dpr = 1, world;
  const keys = new Set();
  const pointer = { active: false, sx: 0, sy: 0 };
  let last = 0, time = 0;

  const level = {
    id: "physical", order: 6, name: "Physical Access", target: "Factory & server room",
    kind: "Stealth", bonus: 1200, cta: "Approach the factory",
    brief: "Not every attack is remote. You have a cloned badge. Cross the yard, slip through the factory's main door, reach the server room and get inside, then get back out the same way without being seen. Agents patrol with vision cones. Stay in their blind spots and duck behind cover. You only capture the flag once you've exfiltrated.",
    flag: "FLAG{in_and_out_like_a_ghost}",
    real: "Physical security is part of the attack surface. Testers tailgate through doors, clone badges and walk into server rooms, because a hardened network doesn't help if someone carries a server out of the building. Getting in is half of it, a real operation also has to get out clean. Badge checks, mantraps and alert staff are the defence.",
    legend: [
      { icon: "lg-port", text: "WASD / arrows or drag to move the burglar" },
      { icon: "lg-cred", text: "Enter the factory, reach the server room, then exfil through the entry door" },
      { icon: "lg-laser", text: "Stay out of the agents' vision cones and hide behind cover" }
    ],

    mount(context) {
      ctx = context;
      world = buildWorld();
      Object.assign(st, {
        px: world.start.x, py: world.start.y, vx: 0, vy: 0, dir: 0, step: 0,
        exposure: 0, over: false, phase: "enter",
        guards: world.guards.map((gd) => ({ ...gd, seg: 0, t: 0, x: gd.route[0][0], y: gd.route[0][1], face: 0, alert: 0 }))
      });
      world.serverDoor.open = false;
      root = document.createElement("div");
      root.className = "lv lv-phys";
      root.innerHTML = `
        <div class="lv-top">
          <div class="lv-stat"><span>Objective</span><b id="ph-obj">Enter the factory</b></div>
          <div class="lv-stat"><span>Exposure</span><b id="ph-exp" class="ok">hidden</b></div>
        </div>
        <div class="ph-wrap"><canvas id="ph-canvas"></canvas>
          <div class="ph-phases" id="ph-phases">
            <span data-p="enter" class="on">1 · Enter</span>
            <span data-p="toServer">2 · Server room</span>
            <span data-p="exfil">3 · Exfiltrate</span>
          </div>
          <div class="ph-exposure"><span id="ph-exp-fill"></span></div>
        </div>
        <div class="lv-log" id="ph-log"><span class="dim">$ badge cloned. Cross the yard and slip through the main door, don't get seen.</span></div>`;
      ctx.layer.appendChild(root);
      canvas = root.querySelector("#ph-canvas");
      g2d = canvas.getContext("2d");
      ctx.setLives(null); ctx.hudLabel("Physical Access"); ctx.setStatus("infiltrate"); ctx.setProgress(0);
      bindPointer();
      const r = ctx.stage.getBoundingClientRect(); this.resize(r.width, r.height);
      last = performance.now(); time = 0; raf = requestAnimationFrame(loop);
    },

    onKey(e) { const k = MAP[e.code]; if (k) { keys.add(k); e.preventDefault(); } },
    onKeyUp(e) { const k = MAP[e.code]; if (k) keys.delete(k); },
    onBlur() { keys.clear(); pointer.active = false; },
    onResume() { last = performance.now(); },

    resize(w, h) {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = w; H = h;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    update() {},
    unmount() { if (raf) cancelAnimationFrame(raf); keys.clear(); root && root.remove(); }
  };

  const MAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down" };

  function bindPointer() {
    const set = (e) => { const r = canvas.getBoundingClientRect(); pointer.sx = e.clientX - r.left; pointer.sy = e.clientY - r.top; };
    canvas.onpointerdown = (e) => { if (!ctx.isPlaying()) return; pointer.active = true; set(e); canvas.setPointerCapture(e.pointerId); };
    canvas.onpointermove = (e) => { if (pointer.active) set(e); };
    canvas.onpointerup = canvas.onpointercancel = () => { pointer.active = false; };
  }

  function doorOpenAt(x, y) {
    for (const d of world.doors) {
      if (!d.open) continue;
      if (x > d.x - d.w / 2 - 0.3 && x < d.x + d.w / 2 + 0.3 && y > d.y - d.h / 2 - 0.3 && y < d.y + d.h / 2 + 0.3) return true;
    }
    return false;
  }
  function solidAt(x, y) {
    const pr = 0.3;
    if (doorOpenAt(x, y)) return false;
    for (const r of world.walls) if (x + pr > r.x && x - pr < r.x + r.w && y + pr > r.y && y - pr < r.y + r.h) return true;
    // cover crates are solid too, you duck behind them, you don't walk through them
    for (const r of world.cover) if (x + pr > r.x && x - pr < r.x + r.w && y + pr > r.y && y - pr < r.y + r.h) return true;
    return false;
  }
  function moveAxis(nx, ny) {
    if (!solidAt(nx, ny)) { st.px = nx; st.py = ny; return; }
    if (!solidAt(nx, st.py)) st.px = nx;
    if (!solidAt(st.px, ny)) st.py = ny;
  }

  function sightBlocked(ax, ay, bx, by) {
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      for (const r of world.walls) if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) {
        let through = false;
        for (const d of world.doors) if (d.open && x > d.x - d.w / 2 && x < d.x + d.w / 2 && y > d.y - d.h / 2 && y < d.y + d.h / 2) through = true;
        if (!through) return true;
      }
      for (const r of world.cover) if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true;
    }
    return false;
  }

  const FOV = Math.PI * 0.4, VIEW = 7;

  function updateGuards(dt) {
    let seen = false;
    for (const gd of st.guards) {
      if (gd.dir === undefined) gd.dir = 1;
      // ping-pong between waypoints: never traverse a closing segment, so agents
      // only ever walk the corridors we explicitly drew (no phasing through walls).
      let a = gd.route[gd.seg], b = gd.route[gd.seg + gd.dir];
      if (!b) { gd.dir *= -1; b = gd.route[gd.seg + gd.dir]; }
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      gd.t += (gd.speed * dt) / len;
      if (gd.t >= 1) {
        gd.t = 0; gd.seg += gd.dir;
        if (gd.seg <= 0) { gd.seg = 0; gd.dir = 1; }
        else if (gd.seg >= gd.route.length - 1) { gd.seg = gd.route.length - 1; gd.dir = -1; }
      }
      const na = gd.route[gd.seg], nb = gd.route[gd.seg + gd.dir] || na;
      gd.x = na[0] + (nb[0] - na[0]) * gd.t; gd.y = na[1] + (nb[1] - na[1]) * gd.t;
      const tf = Math.atan2(nb[1] - na[1], nb[0] - na[0]);
      let df = ((tf - gd.face + Math.PI) % (Math.PI * 2)) - Math.PI;
      gd.face += df * Math.min(1, dt * 5);
      gd.look = gd.face + Math.sin(time * 1.3 + gd.seg) * 0.25;
      const ddx = st.px - gd.x, ddy = st.py - gd.y, dist = Math.hypot(ddx, ddy);
      if (dist < VIEW) {
        let ang = ((Math.atan2(ddy, ddx) - gd.look + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (Math.abs(ang) < FOV / 2 && !sightBlocked(gd.x, gd.y, st.px, st.py)) { seen = true; gd.alert = Math.min(1, gd.alert + dt * 2.5); }
        else gd.alert = Math.max(0, gd.alert - dt * 1.2);
      } else gd.alert = Math.max(0, gd.alert - dt * 1.2);
    }
    return seen;
  }

  function setObjective(txt) { const o = root.querySelector("#ph-obj"); if (o && o.textContent !== txt) o.textContent = txt; }
  function setPhaseUI() {
    const order = ["enter", "toServer", "exfil"];
    const idx = order.indexOf(st.phase);
    root.querySelectorAll("#ph-phases span").forEach((s) => {
      const si = order.indexOf(s.dataset.p);
      s.classList.toggle("on", si === idx);
      s.classList.toggle("done", si < idx || st.phase === "done");
    });
  }

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (!ctx.isPlaying() || st.over) { draw(); return; }
    time += dt;

    let ix = 0, iy = 0;
    if (keys.has("left")) ix -= 1; if (keys.has("right")) ix += 1;
    if (keys.has("up")) iy -= 1; if (keys.has("down")) iy += 1;
    if (pointer.active) {
      const cam = camera();
      const wx = pointer.sx / cam.scale + cam.x, wy = pointer.sy / cam.scale + cam.y;
      ix = wx - st.px; iy = wy - st.py; const m = Math.hypot(ix, iy) || 1;
      if (m < 0.2) ix = iy = 0; else { ix /= m; iy /= m; }
    } else { const m = Math.hypot(ix, iy) || 1; if (m > 1) { ix /= m; iy /= m; } }
    const SPEED = 4.4;
    if (ix || iy) { st.dir = Math.atan2(iy, ix); st.step += dt * 9; }
    moveAxis(st.px + ix * SPEED * dt, st.py + iy * SPEED * dt);

    const nearServer = Math.hypot(st.px - world.serverGoal.x, st.py - world.serverGoal.y) < world.serverGoal.r;
    const nearExit = Math.hypot(st.px - world.exit.x, st.py - world.exit.y) < world.exit.r;

    if (st.phase === "enter") {
      setObjective("Enter the factory");
      if (st.px > 11) { st.phase = "toServer"; world.serverDoor.open = true; log("$ inside the factory. Head to the server room (door unlocked).", "ok"); setPhaseUI(); }
    } else if (st.phase === "toServer") {
      setObjective("Reach the server room");
      if (nearServer) { st.phase = "exfil"; C.sfx.good(); ctx.flash("good"); log("$ server room breached. Now get OUT the way you came in.", "ok"); setPhaseUI(); ctx.addScore(500); }
    } else if (st.phase === "exfil") {
      setObjective("Exfiltrate through the entry door");
      if (nearExit && st.px < 10) {
        st.phase = "done"; st.over = true; C.sfx.good(); ctx.flash("good");
        log("$ exfiltrated clean. You were never here.", "ok"); setPhaseUI();
        setTimeout(() => ctx.win(), 700); return;
      }
    }

    const pw = { enter: 0, toServer: 0.34, exfil: 0.67, done: 1 }[st.phase];
    ctx.setProgress(pw);

    const seen = updateGuards(dt);
    if (seen) { st.exposure = clamp(st.exposure + dt * 62, 0, 100); if (st.exposure > 30 && Math.floor(time * 6) % 2 === 0) C.sfx.type(); }
    else st.exposure = clamp(st.exposure - dt * 30, 0, 100);
    updateExpHud(seen);
    if (st.exposure >= 100 && !st.over) {
      st.over = true; log("$ spotted, agents converged and escorted you out.", "err");
      C.sfx.hit(); ctx.flash("bad"); ctx.shake && ctx.shake();
      setTimeout(() => ctx.lose("An agent spotted you"), 400); return;
    }
    draw();
  }

  function updateExpHud(seen) {
    const e = root.querySelector("#ph-exp"), f = root.querySelector("#ph-exp-fill");
    const v = Math.round(st.exposure);
    e.textContent = st.exposure < 3 ? "hidden" : seen ? "SPOTTED " + v + "%" : "suspicious " + v + "%";
    e.className = st.exposure < 3 ? "ok" : st.exposure > 55 ? "warn" : "";
    f.style.width = st.exposure + "%"; f.classList.toggle("warn", st.exposure > 55);
  }

  function camera() {
    const s = Math.min(W / 20, H / 13);
    const halfW = W / (2 * s), halfH = H / (2 * s);
    const cx = clamp(st.px, halfW, MAPW - halfW), cy = clamp(st.py, halfH, MAPH - halfH);
    return { scale: s, x: cx - halfW, y: cy - halfH };
  }

  function draw() {
    const cam = camera(), s = cam.scale;
    const toX = (x) => (x - cam.x) * s, toY = (y) => (y - cam.y) * s;
    const L = document.documentElement.dataset.theme === "light";
    const P = L
      ? { bg: "#e7ecf4", room: "#dfe5ef", grid: "rgba(15,118,110,.08)", wall: "#c3ccda", wallEdge: "#8693aa", cover: "#b7d3bd", coverEdge: "#5f9c71" }
      : { bg: "#0a1020", room: "#0e1526", grid: "rgba(111,211,196,.05)", wall: "#16233c", wallEdge: "#2c4066", cover: "#15321f", coverEdge: "#2f6b3f" };
    g2d.clearRect(0, 0, W, H);
    g2d.fillStyle = P.bg; g2d.fillRect(0, 0, W, H);
    g2d.fillStyle = P.room; g2d.fillRect(toX(10), toY(2), 32 * s, 24 * s);
    g2d.strokeStyle = P.grid; g2d.lineWidth = 1;
    for (let x = Math.floor(cam.x); x < cam.x + W / s + 1; x++) { g2d.beginPath(); g2d.moveTo(toX(x), 0); g2d.lineTo(toX(x), H); g2d.stroke(); }
    for (let y = Math.floor(cam.y); y < cam.y + H / s + 1; y++) { g2d.beginPath(); g2d.moveTo(0, toY(y)); g2d.lineTo(W, toY(y)); g2d.stroke(); }

    const gx = toX(world.serverGoal.x), gy = toY(world.serverGoal.y);
    const grad = g2d.createRadialGradient(gx, gy, 0, gx, gy, s * 3);
    grad.addColorStop(0, st.phase === "enter" ? "rgba(140,150,180,.12)" : "rgba(242,179,61,.3)");
    grad.addColorStop(1, "rgba(242,179,61,0)");
    g2d.fillStyle = grad; g2d.beginPath(); g2d.arc(gx, gy, s * 3, 0, 7); g2d.fill();

    for (const r of world.walls) {
      g2d.fillStyle = P.wall; g2d.strokeStyle = P.wallEdge; g2d.lineWidth = 1.2;
      g2d.fillRect(toX(r.x), toY(r.y), r.w * s, r.h * s);
      g2d.strokeRect(toX(r.x), toY(r.y), r.w * s, r.h * s);
    }
    for (const r of world.cover) {
      g2d.fillStyle = P.cover; g2d.strokeStyle = P.coverEdge;
      g2d.fillRect(toX(r.x), toY(r.y), r.w * s, r.h * s);
      g2d.strokeRect(toX(r.x), toY(r.y), r.w * s, r.h * s);
    }
    for (const d of world.doors) {
      const dx = toX(d.x), dy = toY(d.y), horizontal = d.w > d.h;
      g2d.fillStyle = d.open ? "#6fd3c4" : "#ff6b5b";
      const w = (horizontal ? d.w : 0.5) * s, h = (horizontal ? 0.5 : d.h) * s;
      g2d.globalAlpha = 0.9; g2d.fillRect(dx - w / 2, dy - h / 2, w, h); g2d.globalAlpha = 1;
      g2d.fillStyle = d.open ? "#6fd3c4" : "#ff6b5b";
      g2d.font = `600 ${Math.round(s * 0.3)}px "Martian Mono", monospace`;
      g2d.textAlign = "center"; g2d.textBaseline = "middle";
      g2d.fillText(d.kind === "entry" ? (st.phase === "exfil" ? "EXIT" : "DOOR") : (d.open ? "OPEN" : "LOCKED"), dx, dy - h / 2 - s * 0.4);
    }

    g2d.fillStyle = st.phase === "enter" ? "#8f9ab4" : "#f2b33d";
    g2d.font = `700 ${Math.round(s * 0.32)}px "Martian Mono", monospace`;
    g2d.textAlign = "center"; g2d.fillText("SERVER ROOM", gx, toY(16) + s * 0.9);
    drawRack(gx, gy, s, st.phase !== "enter");

    if (st.phase === "exfil") {
      const ex = toX(world.exit.x), ey = toY(world.exit.y);
      g2d.strokeStyle = "#6fd3c4"; g2d.lineWidth = 2; g2d.setLineDash([4, 3]);
      g2d.beginPath(); g2d.arc(ex, ey, world.exit.r * s, 0, 7); g2d.stroke(); g2d.setLineDash([]);
      g2d.fillStyle = "#6fd3c4"; g2d.font = `600 ${Math.round(s * 0.3)}px "Martian Mono", monospace`;
      g2d.fillText("EXFIL", ex, ey - world.exit.r * s - s * 0.3);
    }

    for (const gd of st.guards) {
      const vx = toX(gd.x), vy = toY(gd.y);
      const a0 = gd.look - FOV / 2, a1 = gd.look + FOV / 2, N = 18;
      g2d.beginPath(); g2d.moveTo(vx, vy);
      for (let i = 0; i <= N; i++) {
        const a = a0 + (a1 - a0) * (i / N); let rr = VIEW;
        for (let k = 1; k <= 14; k++) {
          const d = VIEW * (k / 14), wx = gd.x + Math.cos(a) * d, wy = gd.y + Math.sin(a) * d;
          let hit = false;
          for (const r of world.walls) if (wx > r.x && wx < r.x + r.w && wy > r.y && wy < r.y + r.h) {
            let through = false;
            for (const dr of world.doors) if (dr.open && wx > dr.x - dr.w / 2 && wx < dr.x + dr.w / 2 && wy > dr.y - dr.h / 2 && wy < dr.y + dr.h / 2) through = true;
            if (!through) { hit = true; break; }
          }
          if (!hit) for (const r of world.cover) if (wx > r.x && wx < r.x + r.w && wy > r.y && wy < r.y + r.h) { hit = true; break; }
          if (hit) { rr = d; break; }
        }
        g2d.lineTo(toX(gd.x + Math.cos(a) * rr), toY(gd.y + Math.sin(a) * rr));
      }
      g2d.closePath();
      const al = gd.alert || 0;
      g2d.fillStyle = `rgba(${Math.round(255 * (0.45 + al * 0.55))},${Math.round(107 * (1 - al))},${Math.round(91 * (1 - al))},${0.1 + al * 0.22})`;
      g2d.fill();
    }
    for (const gd of st.guards) drawAgent(toX(gd.x), toY(gd.y), s, gd.look, gd.alert > 0.5);
    drawBurglar(toX(st.px), toY(st.py), s, st.dir, st.exposure < 3, st.step);
  }

  function drawRack(cx, cy, s, powered) {
    g2d.save(); g2d.translate(cx, cy);
    const L = document.documentElement.dataset.theme === "light";
    g2d.fillStyle = L ? "#cdd5e2" : "#0c1322"; g2d.strokeStyle = L ? "#8693aa" : "#2c4066"; g2d.lineWidth = 1.5;
    const w = s * 0.9, h = s * 1.3;
    g2d.fillRect(-w / 2, -h / 2, w, h); g2d.strokeRect(-w / 2, -h / 2, w, h);
    for (let i = 0; i < 5; i++) {
      g2d.fillStyle = powered ? (i % 2 ? "#6fd3c4" : "#f2b33d") : "#39445e";
      g2d.fillRect(-w / 2 + s * 0.12, -h / 2 + s * 0.14 + i * (h - s * 0.2) / 5, w - s * 0.24, (h - s * 0.3) / 6);
    }
    g2d.restore();
  }
  function drawAgent(x, y, s, look, alert) {
    g2d.save(); g2d.translate(x, y);
    g2d.fillStyle = "rgba(0,0,0,.4)"; g2d.beginPath(); g2d.ellipse(0, s * 0.28, s * 0.28, s * 0.1, 0, 0, 7); g2d.fill();
    g2d.fillStyle = alert ? "#ff6b5b" : "#3a4866";
    g2d.beginPath(); g2d.moveTo(-s * 0.26, s * 0.18); g2d.lineTo(-s * 0.2, -s * 0.12); g2d.lineTo(s * 0.2, -s * 0.12); g2d.lineTo(s * 0.26, s * 0.18); g2d.closePath(); g2d.fill();
    g2d.fillStyle = "#c7cfe0"; g2d.beginPath(); g2d.arc(0, -s * 0.2, s * 0.16, 0, 7); g2d.fill();
    g2d.fillStyle = alert ? "#fff" : "#6fd3c4"; g2d.beginPath(); g2d.arc(s * 0.12, -s * 0.22, s * 0.045, 0, 7); g2d.fill();
    g2d.fillStyle = "#070b16"; g2d.beginPath(); g2d.arc(Math.cos(look) * s * 0.17, Math.sin(look) * s * 0.17 - s * 0.05, s * 0.05, 0, 7); g2d.fill();
    g2d.restore();
  }
  function drawBurglar(x, y, s, dir, hidden, step) {
    g2d.save(); g2d.translate(x, y);
    g2d.fillStyle = "rgba(0,0,0,.45)"; g2d.beginPath(); g2d.ellipse(0, s * 0.3, s * 0.26, s * 0.1, 0, 0, 7); g2d.fill();
    const bob = Math.sin(step) * s * 0.03;
    g2d.fillStyle = hidden ? "#1b2a3f" : "#243653";
    g2d.beginPath(); g2d.moveTo(-s * 0.22, s * 0.2 + bob); g2d.lineTo(-s * 0.17, -s * 0.1 + bob); g2d.lineTo(s * 0.17, -s * 0.1 + bob); g2d.lineTo(s * 0.22, s * 0.2 + bob); g2d.closePath(); g2d.fill();
    g2d.fillStyle = "#121722"; g2d.beginPath(); g2d.arc(0, -s * 0.18 + bob, s * 0.16, 0, 7); g2d.fill();
    g2d.fillStyle = hidden ? "#6fd3c4" : "#f2b33d";
    g2d.fillRect(-s * 0.15, -s * 0.21 + bob, s * 0.3, s * 0.075);
    g2d.fillStyle = "#070b16";
    g2d.beginPath(); g2d.arc(-s * 0.05, -s * 0.185 + bob, s * 0.02, 0, 7); g2d.arc(s * 0.05, -s * 0.185 + bob, s * 0.02, 0, 7); g2d.fill();
    g2d.fillStyle = hidden ? "#6fd3c4" : "#f2b33d";
    g2d.beginPath(); g2d.arc(Math.cos(dir) * s * 0.26, Math.sin(dir) * s * 0.26 + bob, s * 0.05, 0, 7); g2d.fill();
    g2d.restore();
  }

  function log(msg, cls = "") { const l = root.querySelector("#ph-log"); const s = document.createElement("span"); if (cls) s.className = cls; s.textContent = msg; l.appendChild(s); l.scrollTop = l.scrollHeight; }

  C.register(level);
})();
