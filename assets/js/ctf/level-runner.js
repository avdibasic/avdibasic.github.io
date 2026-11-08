(() => {
  "use strict";
  const C = window.CTF;

  const W = 10, H = 6, BX = 4.35, BY = 2.45, PR = 0.3;
  const SPAWN_Z = -105, KILL_Z = 14, TUNNEL_LEN = 240;

  const COL = { bg: 0x070b16, amber: 0xf2b33d, teal: 0x6fd3c4, coral: 0xff6b5b, wall: 0x16223d, ink: 0xdce2ee, gold: 0xffd166 };
  function setPalette() {}
  const isLight = () => false;
  const TINT = 0x3fb6a8;

  const ZONES = [
    { zone: "Public", labels: ["Public internet", "Edge firewall", "NAT boundary"] },
    { zone: "Office", labels: ["Office VLAN", "Corporate IT", "Proxy / egress FW"] },
    { zone: "DMZ",    labels: ["IT/OT DMZ", "DMZ firewall", "Jump host"] },
    { zone: "OT",     labels: ["OT firewall", "SCADA VLAN", "PLC network"] }
  ];

  const rand = C.rand, clamp = C.clamp, pick = (a) => a[(Math.random() * a.length) | 0];

  let THREE, renderer, scene, camera, composer, ctx;
  let G = {}, M = {}, tunnel = [], stream, player, trail, trailHist = [], gridTex;
  let objects = [], time = 0, labelCache = new Map(), wallSeq = 0;
  const st = {};
  const keys = new Set();
  const pointer = { active: false, x: 0, y: 0 };

  const LEN = 760, SPEED = 21, SPACING = [30, 40], GAP = [3.2, 2.6];

  function makeGridTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "#fff"; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
    g.globalAlpha = 0.35; g.lineWidth = 1;
    g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke();
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
  }
  function dotTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "#fff"); r.addColorStop(0.35, "rgba(255,255,255,.6)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  }
  function labelSprite(text, color = "#6fd3c4") {
    const key = text + color;
    if (!labelCache.has(key)) {
      const c = document.createElement("canvas"), g = c.getContext("2d");
      const font = '600 44px "Martian Mono", ui-monospace, Menlo, monospace';
      g.font = font; const w = Math.ceil(g.measureText(text).width) + 40;
      c.width = w; c.height = 76; g.font = font; g.textBaseline = "middle";
      g.fillStyle = isLight() ? "rgba(238,241,246,.82)" : "rgba(7,11,22,.75)"; g.fillRect(0, 0, w, 76);
      g.strokeStyle = color; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, 73);
      g.fillStyle = color; g.fillText(text, 20, 40);
      labelCache.set(key, { tex: new THREE.CanvasTexture(c), aspect: w / 76 });
    }
    const { tex, aspect } = labelCache.get(key);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }));
    s.scale.set(0.42 * aspect, 0.42, 1); return s;
  }
  function flagTexture() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 160;
    const g = c.getContext("2d");
    g.fillStyle = "#f2b33d"; g.fillRect(0, 0, 256, 160);
    g.fillStyle = "#1a1203"; g.font = '800 64px "Martian Mono", monospace';
    g.textBaseline = "middle"; g.textAlign = "center"; g.fillText("FLAG", 128, 82);
    return new THREE.CanvasTexture(c);
  }

  function buildScene(w, h) {
    setPalette(); labelCache.clear();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COL.bg);
    scene.fog = new THREE.Fog(COL.bg, 22, 108);
    camera = new THREE.PerspectiveCamera(w / h < 1 ? 82 : 68, w / h, 0.1, 220);
    camera.position.set(0, 1.1, 6.2);

    G.unit = new THREE.PlaneGeometry(1, 1);
    G.square = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1));
    G.cred = new THREE.TorusGeometry(0.26, 0.07, 8, 24);
    G.credCore = new THREE.OctahedronGeometry(0.12);

    M.wall = new THREE.MeshBasicMaterial({ color: COL.wall, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
    M.wallEdge = new THREE.LineBasicMaterial({ color: COL.coral, transparent: true, opacity: 0.55 });
    M.port = new THREE.LineBasicMaterial({ color: COL.teal });
    M.cred = new THREE.MeshBasicMaterial({ color: COL.gold });

    gridTex = makeGridTexture();
    const mk = (pw, ph, pos, rot, ru, rv) => {
      const tex = gridTex.clone(); tex.needsUpdate = true; tex.repeat.set(ru, rv);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph),
        new THREE.MeshBasicMaterial({ map: tex, color: TINT, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.position.set(...pos); m.rotation.set(...rot); scene.add(m); return m;
    };
    const zc = -TUNNEL_LEN / 2 + 12;
    tunnel = [
      { m: mk(W, TUNNEL_LEN, [0, -H / 2, zc], [-Math.PI / 2, 0, 0], W / 2, TUNNEL_LEN / 2), axis: "y", dir: 1 },
      { m: mk(W, TUNNEL_LEN, [0, H / 2, zc], [Math.PI / 2, 0, 0], W / 2, TUNNEL_LEN / 2), axis: "y", dir: -1 },
      { m: mk(TUNNEL_LEN, H, [-W / 2, 0, zc], [0, Math.PI / 2, 0], TUNNEL_LEN / 2, H / 2), axis: "x", dir: 1 },
      { m: mk(TUNNEL_LEN, H, [W / 2, 0, zc], [0, -Math.PI / 2, 0], TUNNEL_LEN / 2, H / 2), axis: "x", dir: -1 }
    ];

    const N = 380, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = rand(-W / 2 + .2, W / 2 - .2); pos[i * 3 + 1] = rand(-H / 2 + .2, H / 2 - .2); pos[i * 3 + 2] = rand(SPAWN_Z, KILL_Z); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    stream = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x9fb3d9, size: 0.05, transparent: true, opacity: 0.7, depthWrite: false }));
    scene.add(stream);

    player = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), new THREE.MeshBasicMaterial({ color: 0xffe2a3 }));
    const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.46)), new THREE.LineBasicMaterial({ color: COL.amber }));
    player.add(core, shell); player.userData = { shell }; scene.add(player);

    const TN = 22, tp = new Float32Array(TN * 3), tc = new Float32Array(TN * 3);
    for (let i = 0; i < TN; i++) { const k = 1 - i / TN; tc[i * 3] = .95 * k; tc[i * 3 + 1] = .7 * k; tc[i * 3 + 2] = .24 * k; trailHist.push({ x: 0, y: 0 }); }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute("position", new THREE.BufferAttribute(tp, 3));
    tg.setAttribute("color", new THREE.BufferAttribute(tc, 3));
    trail = new THREE.Points(tg, new THREE.PointsMaterial({ size: 0.2, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(trail);
  }

  function addObj(o) { o.obj.position.z = o.z; o.prevZ = o.z; scene.add(o.obj); objects.push(o); }
  function holeFor(moving) {
    const w = GAP[0] - rand(0, .25), h = GAP[1] - rand(0, .2);
    const cy = rand(-H / 2 + h / 2 + .35, H / 2 - h / 2 - .35);
    const xr = W / 2 - w / 2 - .35;
    return { w, h, cy, cx: moving ? 0 : rand(-xr, xr), xr };
  }

  function nextWallLabel() {
    const frac = clamp(st.dist / LEN, 0, 0.9999);
    const z = ZONES[Math.min(ZONES.length - 1, Math.floor(frac * ZONES.length))];
    return z.labels[wallSeq++ % z.labels.length];
  }
  function spawnWall(z, moving) {
    const hole = holeFor(moving);
    const g = new THREE.Group();
    const rects = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(G.unit, M.wall); g.add(m); return m; });
    const outline = new THREE.LineSegments(G.square, M.wallEdge); outline.scale.set(W, H, 1); g.add(outline);
    const frame = new THREE.LineSegments(G.square, M.port); g.add(frame);
    const label = labelSprite(nextWallLabel()); g.add(label);
    const o = { kind: "wall", obj: g, z, hole, rects, frame, label, move: moving ? { amp: hole.xr * rand(.6, 1), freq: rand(1.1, 1.8), ph: rand(0, 6.28) } : null };
    layoutWall(o); addObj(o);
    if (!moving && Math.random() < .45) spawnCred(hole.cx, hole.cy, z - .01);
  }
  function layoutWall(o) {
    const h = o.hole;
    if (o.move) h.cx = Math.sin(time * o.move.freq + o.move.ph) * o.move.amp;
    const l = h.cx - h.w / 2, r = h.cx + h.w / 2, t = h.cy + h.h / 2, b = h.cy - h.h / 2;
    const set = (m, x0, x1, y0, y1) => { const w = x1 - x0, hh = y1 - y0; m.visible = w > .01 && hh > .01; m.scale.set(Math.max(w, .001), Math.max(hh, .001), 1); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); };
    set(o.rects[0], -W / 2, l, -H / 2, H / 2); set(o.rects[1], r, W / 2, -H / 2, H / 2);
    set(o.rects[2], l, r, t, H / 2); set(o.rects[3], l, r, -H / 2, b);
    o.frame.scale.set(h.w, h.h, 1); o.frame.position.set(h.cx, h.cy, .01);
    o.label.position.set(h.cx, t + .38 > H / 2 - .2 ? b - .38 : t + .38, .02);
  }
  function spawnCred(x, y, z) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(G.cred, M.cred), new THREE.Mesh(G.credCore, M.cred));
    g.position.set(x, y, z); addObj({ kind: "cred", obj: g, z, x, y });
  }
  function spawnFlag(z) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, .07, 10, 64), new THREE.MeshBasicMaterial({ color: COL.teal }));
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.6, .03, 8, 64), new THREE.MeshBasicMaterial({ color: COL.amber }));
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .75, 12, 4), new THREE.MeshBasicMaterial({ map: flagTexture(), side: THREE.DoubleSide }));
    cloth.position.set(.12, .7, -.5);
    g.add(ring, ring2, cloth); addObj({ kind: "flag", obj: g, z, ring, ring2, cloth });
  }
  function spawnNext() {
    spawnWall(SPAWN_Z, Math.random() < 0.4);
    const gapZ = SPAWN_Z + rand(SPACING[0], SPACING[1]) * .5;
    if (Math.random() < .45) { const x = rand(-BX + .6, BX - .6), y = rand(-BY + .4, BY - .4); for (let i = 0; i < 3; i++) spawnCred(clamp(x, -BX, BX), y, gapZ - i * 3); }
  }
  function clearObjects() { objects.forEach((o) => scene.remove(o.obj)); objects = []; }

  function hit() {
    if (st.inv > 0) return;
    st.lives--; st.inv = 1.4; C.decayShake; if (ctx) ctx.shake();
    C.sfx.hit(); ctx.flash("bad"); ctx.setLives(st.lives, 3);
    if (st.lives <= 0) ctx.lose();
  }

  const MAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down" };

  const level = {
    id: "segmentation", order: 2, name: "Network Security", target: "Segmentation & firewalls",
    kind: "Runner", kind3d: true, tint: TINT, bonus: 800,
    cta: "Pivot inward",
    brief: "Pivot from the public internet inward, through the office network, the IT/OT DMZ, and finally into OT production. Flat networks let an attacker roam freely, and good segmentation and firewalls force you through narrow, monitored choke points. Thread the one allowed rule in each firewall and keep pivoting until you reach OT.",
    flag: "FLAG{segment_everything}",
    real: "Once an attacker is inside, flat networks let them reach everything. Segmentation and internal firewalls force traffic through a few controlled, logged choke points, which contains a breach and makes it visible.",
    legend: [
      { icon: "lg-port", text: "Fly through the allowed firewall rule" },
      { icon: "lg-cred", text: "Collect credentials, +100" }
    ],

    mount(context) {
      ctx = context; THREE = context.THREE;
      Object.assign(st, { dist: 0, nextSpawn: 12, flagSpawned: false, lives: 3, inv: 0, speed: 8, px: 0, py: 0, vx: 0, vy: 0 });
      time = 0; objects = []; trailHist = []; wallSeq = 0;
      renderer = context.getRenderer();
      const r = context.stage.getBoundingClientRect();
      buildScene(Math.max(1, r.width), Math.max(1, r.height));
      C.mountCanvas(renderer.domElement);
      renderer.setSize(r.width, r.height, false);
      composer = context.makeComposer(renderer, scene, camera, r.width, r.height);
      ctx.setLives(3, 3); ctx.hudLabel("2/5 Network Security"); ctx.setStatus("");
      bindPointer();
    },
    resize(w, h) {
      if (!renderer) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.fov = w / h < 1 ? 82 : 68; camera.updateProjectionMatrix();
      if (composer) composer.setSize(w, h);
    },
    onKey(e) { const k = MAP[e.code]; if (k) { keys.add(k); e.preventDefault(); } },
    onKeyUp(e) { const k = MAP[e.code]; if (k) keys.delete(k); },
    onBlur() { keys.clear(); pointer.active = false; },
    update(dt) {
      time += dt;
      const playing = ctx.isPlaying();
      const target = playing ? SPEED : 9;
      st.speed += (target - st.speed) * Math.min(1, dt * 2);
      const v = st.speed * dt;

      if (playing) {
        let ix = 0, iy = 0;
        if (keys.has("left")) ix -= 1; if (keys.has("right")) ix += 1;
        if (keys.has("up")) iy += 1; if (keys.has("down")) iy -= 1;
        if (pointer.active) { st.vx = clamp((pointer.x * BX - st.px) * 8, -14, 14); st.vy = clamp((pointer.y * BY - st.py) * 8, -14, 14); }
        else { const k = Math.min(1, dt * 11); st.vx += (ix * 10 - st.vx) * k; st.vy += (iy * 9 - st.vy) * k; }
        st.px = clamp(st.px + st.vx * dt, -BX, BX); st.py = clamp(st.py + st.vy * dt, -BY, BY);
        st.dist += v; ctx.addScore(Math.round(v)); st.inv = Math.max(0, st.inv - dt);
        ctx.setProgress(st.dist / LEN);
        if (!st.flagSpawned) {
          if (st.dist >= LEN) { spawnFlag(SPAWN_Z); st.flagSpawned = true; }
          else if (st.dist >= st.nextSpawn) { spawnNext(); st.nextSpawn = st.dist + rand(SPACING[0], SPACING[1]); }
        }
      } else { st.vx *= .9; st.vy *= .9; st.px += (Math.sin(time * .6) * 1.2 - st.px) * Math.min(1, dt * 1.5); st.py += (Math.cos(time * .8) * .5 - st.py) * Math.min(1, dt * 1.5); }

      tunnel.forEach((t) => { t.m.material.map.offset[t.axis] += t.dir * v / 2; });
      const sp = stream.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) { let z = sp.getZ(i) + v * 1.6; if (z > KILL_Z) z = SPAWN_Z + rand(0, 10); sp.setZ(i, z); }
      sp.needsUpdate = true;

      for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i]; o.prevZ = o.z; o.z += v; o.obj.position.z = o.z;
        const crossed = o.prevZ < 0 && o.z >= 0;
        if (o.kind === "wall") {
          if (o.move) layoutWall(o);
          if (crossed && playing) {
            const h = o.hole;
            const inside = Math.abs(st.px - h.cx) < h.w / 2 - PR * .6 && Math.abs(st.py - h.cy) < h.h / 2 - PR * .6;
            if (inside) { C.sfx.pass(); ctx.addScore(25); } else hit();
          }
        } else if (o.kind === "cred") {
          o.obj.rotation.y += dt * 3; o.obj.rotation.x += dt * 1.3;
          if (playing && Math.abs(o.z) < .7 && Math.hypot(st.px - o.x, st.py - o.y) < .8) { ctx.addScore(100); C.sfx.pickup(); scene.remove(o.obj); objects.splice(i, 1); continue; }
        } else if (o.kind === "flag") {
          o.ring.rotation.z += dt * .8; o.ring2.rotation.z -= dt * .5;
          const p = o.cloth.geometry.attributes.position;
          for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setZ(k, Math.sin(time * 6 + x * 4) * .06 * (x + .6)); }
          p.needsUpdate = true;
          if (crossed && playing) ctx.win();
        }
        if (o.z > KILL_Z) { scene.remove(o.obj); objects.splice(i, 1); }
      }

      player.position.set(st.px, st.py, 0);
      player.rotation.z = -st.vx * .045; player.rotation.x = st.vy * .035;
      player.userData.shell.rotation.z += dt * 1.6; player.userData.shell.rotation.y += dt * .9;
      player.visible = !(st.inv > 0 && Math.floor(time * 16) % 2 === 0);

      trailHist.unshift({ x: st.px, y: st.py }); trailHist.length = 22;
      const tp = trail.geometry.attributes.position;
      for (let i = 0; i < tp.count; i++) tp.setXYZ(i, trailHist[i].x, trailHist[i].y, .35 + i * .12 * (st.speed / 30));
      tp.needsUpdate = true;

      const cx = st.px * .55, cy = 1.05 + st.py * .45;
      camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 5);
      camera.position.y += (cy - camera.position.y) * Math.min(1, dt * 5);
      camera.lookAt(st.px * .55, st.py * .45, -14);
      camera.rotateZ(-st.vx * .006);
      const sh = C.activeShake(); C.decayShake(dt);
      if (sh > 0) { camera.position.x += rand(-1, 1) * sh * .4; camera.position.y += rand(-1, 1) * sh * .4; }

      if (composer) composer.render(); else renderer.render(scene, camera);
    },
    unmount() {
      clearObjects();
      if (scene) { scene.traverse((o) => { if (o.geometry) o.geometry.dispose && o.geometry.dispose(); }); }
      keys.clear(); pointer.active = false;
      scene = null; composer = null;
    }
  };

  function bindPointer() {
    const canvas = renderer.domElement;
    const set = (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = clamp((((e.clientX - r.left) / r.width) * 2 - 1) * 1.15, -1, 1);
      pointer.y = clamp(-(((e.clientY - r.top) / r.height) * 2 - 1) * 1.25, -1, 1);
    };
    canvas.onpointerdown = (e) => { if (!ctx.isPlaying()) return; pointer.active = true; set(e); canvas.setPointerCapture(e.pointerId); };
    canvas.onpointermove = (e) => { if (pointer.active) set(e); };
    canvas.onpointerup = canvas.onpointercancel = () => { pointer.active = false; };
  }

  C.register(level);
})();
