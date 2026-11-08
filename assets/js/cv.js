/* =========================================================================
   Career Road — a 3D, walkable CV under the whoami tab.
   The visitor walks an operative figure UP a road (ArrowUp / W) and back
   (ArrowDown / S). Workplaces (SITE.experience) + studies (SITE.education)
   stand on the LEFT verge, certifications (SITE.certs) on the RIGHT verge,
   placed in chronological order. Turning left/right (ArrowLeft/Right or A/D)
   faces that side and locks onto the nearest marker; its details fill the
   info panel (right on desktop, below the stage on mobile).

   Built on the vendored three.js (r144). app.js loads three, then calls
   window.CV.mount(stageEl). Idempotent; pauses when scrolled off-screen.
   ========================================================================= */
(() => {
  "use strict";
  const S = window.SITE;
  if (!S) return;

  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const _now = new Date();
  const NOW = _now.getFullYear() + _now.getMonth() / 12;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frac(str) {
    if (!str) return null;
    if (/present|now|current/i.test(str)) return NOW;
    const m = String(str).match(/([A-Za-z]{3})[a-z]*\s+(\d{4})/);
    if (m) return +m[2] + (MONTHS[m[1].toLowerCase()] ?? 0) / 12;
    const y = String(str).match(/(\d{4})/);
    return y ? +y[1] : null;
  }

  /* ---------------- Build stations from CV data ---------------- */
  const works = (S.experience || []).map((e) => ({
    kind: "work", t: frac(e.from) ?? 0, tEnd: frac(e.to) ?? NOW,
    title: e.role, org: e.org, from: e.from, to: e.to, place: e.place,
    blurb: e.blurb, tags: e.tags || [], present: /present/i.test(e.to || "")
  })).filter((s) => s.t);

  const edus = (S.education || []).map((e) => ({
    kind: "edu", t: frac(e.from) ?? 0, tEnd: frac(e.to) ?? NOW,
    title: e.degree, org: e.org, place: e.place, from: e.from, to: e.to, note: e.note, blurb: e.detail
  })).filter((s) => s.t);

  const certs = (S.certs || []).map((c) => ({
    kind: "cert", t: frac(c.issued) ?? 0,
    title: c.name, short: c.short, org: c.issuer, issued: c.issued,
    expires: c.expires, learned: c.learned, url: c.url, group: c.group
  })).filter((s) => s.t);

  // Left side (career): works + studies, oldest first. Right side: certs, oldest first.
  const leftStops = works.concat(edus).sort((a, b) => a.t - b.t);
  const rightStops = certs.slice().sort((a, b) => a.t - b.t);
  if (!leftStops.length && !rightStops.length) return;

  /* ---------------- Layout along the road ---------------- */
  // Road runs along -Z. Walking "up" (forward) = more negative Z.
  const SEG = 13, START_Z = -8, SIDE_X = 7.2;
  const laneZ = (i) => START_Z - i * SEG;
  leftStops.forEach((s, i) => { s.z = laneZ(i); s.side = -1; });
  rightStops.forEach((s, i) => { s.z = laneZ(i); s.side = 1; });
  const maxIndex = Math.max(leftStops.length, rightStops.length);
  const ROAD_END = laneZ(maxIndex) - 10;
  const WALK_MIN = ROAD_END + 4, WALK_MAX = 6;

  /* ---------------- three.js scene ---------------- */
  let THREE, renderer, scene, camera, composer, bloom;
  let stage, canvasHolder, panelEl;
  let raf = 0, running = false, mounted = false, built = false;
  let viewW = 0, viewH = 0, io = null;

  const player = { z: WALK_MAX, facing: 0, targetFacing: 0, bob: 0 };
  const keys = new Set();
  let avatar, avatarLegL, avatarLegR, avatarArmL, avatarArmR, avatarVisor, avatarCore;
  const markers = [];
  let selected = null;
  let colorsDark = true;

  // backdrop (sky gradient, stars, galaxy, Earth, distant city) + meteors,
  // pinned ahead of the camera so they read as the horizon.
  const SKY_Z = -150;        // far ahead, down the road
  let stars = null, galaxy = null, earth = null, city = null, skyPlane = null;
  let meteors = [];          // { group, head, trail, size, colorHex, ... }
  let meteorTimer = 0;

  function palette() {
    const light = document.documentElement.dataset.theme === "light";
    colorsDark = !light;
    return light ? {
      bg: 0xeef1f6, fog: 0xdfe4ee, road: 0x9aa3b6, roadEdge: 0x2fb3a0,
      ground: 0xe4e8f0, work: 0xb9741a, cert: 0x7c2db5, edu: 0x2563a8,
      sign: 0xd4dae6, signInk: 0x141b2b, lamp: 0xffcf7a, avatar: 0x1f2740
    } : {
      bg: 0x0a0f1c, fog: 0x0a0f1c, road: 0x141c30, roadEdge: 0x2a3a5e,
      ground: 0x0b1424, work: 0xf2b33d, cert: 0x6fd3c4, edu: 0x5b8cff,
      sign: 0x0e1626, signInk: 0xeef2fb, lamp: 0xffd98a, avatar: 0xdce6f5
    };
  }

  /* ---------- sign texture ---------- */
  function hex(n) { return "#" + n.toString(16).padStart(6, "0"); }
  function roundRect(x, X, Y, w, h, r) {
    x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r);
    x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r);
    x.arcTo(X, Y, X + w, Y, r); x.closePath();
  }
  function wrapText(ctx, text, x, y, maxW, lh, font, maxLines) {
    ctx.font = font;
    const words = String(text).split(/\s+/);
    let line = "", lines = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y); y += lh; line = words[i]; lines++;
        if (lines >= maxLines - 1) {
          let rest = words.slice(i).join(" ");
          const full = rest;
          while (ctx.measureText(rest + "…").width > maxW && rest.length) rest = rest.slice(0, -1);
          ctx.fillText(rest + (full.length > rest.length ? "…" : ""), x, y);
          return;
        }
      } else line = test;
    }
    if (line) ctx.fillText(line, x, y);
  }
  function makeSignTexture(lines, accentHex, inkHex) {
    const W = 512, H = 256, c = document.createElement("canvas");
    c.width = W; c.height = H; const x = c.getContext("2d");
    x.fillStyle = colorsDark ? "rgba(10,18,34,0.96)" : "rgba(255,255,255,0.98)";
    roundRect(x, 6, 6, W - 12, H - 12, 18); x.fill();
    x.lineWidth = 6; x.strokeStyle = hex(accentHex);
    roundRect(x, 6, 6, W - 12, H - 12, 18); x.stroke();
    x.fillStyle = hex(accentHex); roundRect(x, 24, 24, 150, 38, 10); x.fill();
    x.fillStyle = colorsDark ? "#0a1222" : "#ffffff";
    x.font = "700 24px 'Martian Mono', monospace"; x.textBaseline = "middle"; x.textAlign = "left";
    x.fillText(lines.tag || "", 38, 44);
    x.fillStyle = hex(inkHex); x.textAlign = "left"; x.textBaseline = "top";
    wrapText(x, lines.title || "", 30, 82, W - 60, 36, "700 32px 'Hanken Grotesk', system-ui, sans-serif", 3);
    x.fillStyle = colorsDark ? "#9aa6c0" : "#56607a";
    x.font = "400 22px 'Martian Mono', monospace"; x.textBaseline = "alphabetic";
    x.fillText(lines.sub || "", 30, H - 30);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; tex.needsUpdate = true; return tex;
  }
  function textPlaque(text, colorHex, strokeHex) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 96;
    const x = c.getContext("2d");
    x.font = "800 52px 'Martian Mono', monospace"; x.textAlign = "center"; x.textBaseline = "middle";
    // an outline so the label reads over both the pale sky and the dark buildings
    x.lineJoin = "round"; x.miterLimit = 2;
    x.strokeStyle = hex(strokeHex != null ? strokeHex : (colorsDark ? 0x05070d : 0x2a3350));
    x.lineWidth = 7; x.strokeText(text, 256, 52);
    x.fillStyle = hex(colorHex); x.fillText(text, 256, 52);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }

  /* ---------- cyber road grid texture ---------- */
  function makeGridTexture(P) {
    const s = 128, c = document.createElement("canvas"); c.width = c.height = s;
    const x = c.getContext("2d");
    x.fillStyle = colorsDark ? "#0c1730" : "#aeb6c6"; x.fillRect(0, 0, s, s);
    x.strokeStyle = colorsDark ? "rgba(111,211,196,0.5)" : "rgba(47,179,160,0.45)";
    x.lineWidth = 3;
    x.strokeRect(0, 0, s, s);
    x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(s / 2, 0); x.lineTo(s / 2, s); x.moveTo(0, s / 2); x.lineTo(s, s / 2); x.stroke();
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }

  /* ---------- regolith ground: lunar dust at night, Martian dust by day ---------- */
  function makeGroundTexture() {
    const s = 512, c = document.createElement("canvas"); c.width = c.height = s;
    const x = c.getContext("2d");
    // Both skins share a teal crater accent so they read as the same world, tuned per theme:
    // dark = deep navy moon, light = a clearly visible cool slate moon. Teal ties them to the road.
    const T = colorsDark
      ? { base: "#0e1828", lo: "#070d18", hi: "#17273f", rim: "#2a6f66", spk: "rgba(108,150,158,", dune: "rgba(26,46,76," }
      // light theme is lit very brightly (ambient 0.85 + key 0.9), which multiplies colours toward white,
      // so the base is kept deliberately dark here to land as a visible cool-slate moon, with teal craters
      : { base: "#636d80", lo: "#474f61", hi: "#858da1", rim: "#4c8c85",  spk: "rgba(40,52,70,",    dune: "rgba(70,82,104," };
    const gr = x.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, T.lo); gr.addColorStop(0.5, T.base); gr.addColorStop(1, T.lo);
    x.fillStyle = gr; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 14; i++) {
      const y = Math.random() * s, h = 18 + Math.random() * 60;
      x.fillStyle = T.dune + (0.05 + Math.random() * 0.08) + ")";
      x.beginPath(); x.moveTo(0, y);
      for (let px = 0; px <= s; px += 32) x.lineTo(px, y + Math.sin(px / 60 + i) * 10);
      x.lineTo(s, y + h); x.lineTo(0, y + h); x.closePath(); x.fill();
    }
    for (let i = 0; i < 2600; i++) {
      const px = Math.random() * s, py = Math.random() * s, r = Math.random() * 1.4;
      x.fillStyle = T.spk + (0.04 + Math.random() * 0.16) + ")";
      x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    for (let i = 0; i < 22; i++) {
      const cx = Math.random() * s, cy = Math.random() * s, rad = 6 + Math.random() * 30;
      const rg = x.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad);
      rg.addColorStop(0, T.lo); rg.addColorStop(0.72, T.base); rg.addColorStop(0.9, T.rim); rg.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = rg; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
      x.save(); x.globalAlpha = colorsDark ? 0.5 : 0.35; x.fillStyle = T.lo;
      x.beginPath(); x.arc(cx + rad * 0.16, cy + rad * 0.16, rad * 0.82, 0, 7); x.fill(); x.restore();
      x.strokeStyle = T.rim; x.globalAlpha = colorsDark ? 0.55 : 0.7; x.lineWidth = 1.6;
      x.beginPath(); x.arc(cx, cy, rad * 0.92, Math.PI * 1.05, Math.PI * 1.75); x.stroke(); x.globalAlpha = 1;
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  }

  /* ---------- backdrop: sky gradient + Earth + distant city (both themes),
                 plus stars + galaxy at night ---------- */
  function buildBackdrop(P) {
    buildSkyPlane(P);
    buildEarth(P);
    buildCity(P);
    if (!colorsDark) return;   // stars and galaxies only after dark
    // star field — points scattered on a large dome, biased to the upper hemisphere.
    const N = 1300, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const palettes = [[0.8, 0.86, 1.0], [0.75, 0.95, 0.95], [1.0, 0.9, 0.78], [0.9, 0.82, 1.0], [1, 1, 1]];
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 320;
      const y = 6 + Math.random() * 90;              // above the horizon, well into view
      const z = SKY_Z - Math.random() * 90;          // spread in depth
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      const cc = palettes[(Math.random() * palettes.length) | 0], b = 0.5 + Math.random() * 0.5;
      col[i * 3] = cc[0] * b; col[i * 3 + 1] = cc[1] * b; col[i * 3 + 2] = cc[2] * b;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sg.setAttribute("color", new THREE.BufferAttribute(col, 3));
    stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, map: dotTexture(), blending: THREE.AdditiveBlending }));
    stars.renderOrder = -2; scene.add(stars);
    stars.userData.skyZ = SKY_Z;

    // soft galaxy clouds across the upper sky, in view down the road
    galaxy = new THREE.Group();
    const g1 = galaxySprite(0x6fd3c4, 0xa98bff, 150);
    g1.position.set(-55, 42, SKY_Z + 10); g1.scale.set(70, 70, 1); g1.material.rotation = 0.4; galaxy.add(g1);
    const g2 = galaxySprite(0xf2b33d, 0xff6fa5, 120);
    g2.position.set(60, 30, SKY_Z - 20); g2.scale.set(55, 55, 1); g2.material.rotation = -0.6; galaxy.add(g2);
    const g3 = galaxySprite(0x8fa0ff, 0x6fd3c4, 130);
    g3.position.set(5, 58, SKY_Z - 40); g3.scale.set(90, 60, 1); g3.material.rotation = 1.1; galaxy.add(g3);
    galaxy.renderOrder = -3; galaxy.userData.skyZ = SKY_Z; scene.add(galaxy);
  }

  /* ---------- gradient sky plane, so the backdrop reads on both themes ---------- */
  function skyGradient(dark) {
    const W = 8, H = 256, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, H);
    if (dark) { g.addColorStop(0, "#04060d"); g.addColorStop(0.58, "#081020"); g.addColorStop(1, "#0b1c30"); }
    else { g.addColorStop(0, "#c6d3ee"); g.addColorStop(0.5, "#dfe7f4"); g.addColorStop(1, "#eef1ec"); }
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    return new THREE.CanvasTexture(c);
  }
  function buildSkyPlane(P) {
    const tex = skyGradient(colorsDark);
    skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(760, 380),
      new THREE.MeshBasicMaterial({ map: tex, depthWrite: false, depthTest: false, fog: false }));
    skyPlane.position.set(0, 60, SKY_Z - 60);
    skyPlane.renderOrder = -10;
    skyPlane.userData.baseZ = SKY_Z - 60;
    scene.add(skyPlane);
  }

  /* ---------- cyber Earth: a globe turned toward Europe, with an atmosphere glow ---------- */
  function earthTexture() {
    const W = 1024, H = 512, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    // Europe (~15E) centred toward the camera (u = 0.25)
    const xOf = (lon) => (((((lon - 15) / 360) + 0.25) % 1) + 1) % 1 * W;
    const yOf = (lat) => (90 - lat) / 180 * H;
    const og = x.createLinearGradient(0, 0, 0, H);
    og.addColorStop(0, "#061322"); og.addColorStop(0.5, "#0a2038"); og.addColorStop(1, "#061322");
    x.fillStyle = og; x.fillRect(0, 0, W, H);
    x.strokeStyle = "rgba(111,211,196,0.10)"; x.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) { const px = xOf(lon); x.beginPath(); x.moveTo(px, 0); x.lineTo(px, H); x.stroke(); }
    for (let lat = -60; lat <= 60; lat += 30) { const py = yOf(lat); x.beginPath(); x.moveTo(0, py); x.lineTo(W, py); x.stroke(); }
    const AFRICA = [[-17,21],[-16,14],[-11,6],[-4,5],[4,6],[9,2],[9,-1],[13,-6],[12,-16],[17,-29],[20,-35],[27,-34],[33,-27],[40,-16],[41,-3],[51,12],[44,10],[43,13],[44,16],[37,21],[33,27],[32,31],[25,32],[12,34],[10,37],[0,36],[-7,34],[-12,25],[-17,21]];
    const EURASIA = [[-10,36],[-9,43],[-1,44],[-2,49],[2,51],[8,54],[8,58],[5,58],[9,63],[14,68],[22,70],[28,71],[34,70],[30,66],[40,67],[55,70],[70,73],[100,77],[135,73],[160,69],[170,66],[180,62],[160,60],[145,45],[140,34],[130,34],[122,40],[122,30],[108,21],[105,9],[100,5],[92,21],[88,22],[80,8],[77,8],[73,20],[66,25],[57,26],[48,30],[48,13],[43,12],[44,25],[36,37],[26,40],[28,41],[18,40],[16,38],[12,44],[8,44],[0,43],[-10,36]];
    const NAMERICA = [[-168,66],[-150,70],[-125,70],[-95,73],[-82,73],[-62,60],[-55,52],[-66,46],[-70,41],[-75,35],[-81,25],[-97,26],[-106,30],[-117,32],[-124,40],[-126,48],[-131,54],[-150,60],[-168,66]];
    const SAMERICA = [[-80,9],[-60,11],[-50,0],[-35,-7],[-40,-23],[-58,-35],[-67,-46],[-74,-53],[-71,-40],[-70,-20],[-79,-4],[-80,9]];
    const AUS = [[114,-22],[130,-12],[142,-11],[150,-25],[146,-38],[135,-35],[123,-34],[114,-22]];
    const GREENLAND = [[-45,60],[-30,70],[-18,76],[-45,83],[-60,76],[-50,66],[-45,60]];
    const draw = (poly) => {
      x.beginPath();
      poly.forEach((p, i) => { const px = xOf(p[0]), py = yOf(p[1]); i ? x.lineTo(px, py) : x.moveTo(px, py); });
      x.closePath();
      x.save(); x.shadowColor = "rgba(120,235,190,0.9)"; x.shadowBlur = 16;
      x.fillStyle = "rgba(26,120,96,0.55)"; x.fill(); x.restore();
      x.strokeStyle = "rgba(130,240,200,0.95)"; x.lineWidth = 2; x.stroke();
    };
    [AFRICA, EURASIA, NAMERICA, SAMERICA, AUS, GREENLAND].forEach(draw);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  function haloTexture(dark) {
    const s = 256, c = document.createElement("canvas"); c.width = c.height = s;
    const x = c.getContext("2d"), g = x.createRadialGradient(s / 2, s / 2, s * 0.30, s / 2, s / 2, s * 0.5);
    const col = dark ? "111,211,196" : "96,150,225";
    g.addColorStop(0, "rgba(" + col + ",0)");
    g.addColorStop(0.56, "rgba(" + col + ",0.55)");
    g.addColorStop(0.74, "rgba(" + col + ",0.16)");
    g.addColorStop(1, "rgba(" + col + ",0)");
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }
  function buildEarth(P) {
    const R = 12, tex = earthTexture();
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 48),
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex,
        emissiveIntensity: colorsDark ? 0.72 : 0.42, roughness: 1, metalness: 0, fog: false }));
    globe.position.set(0, 46, SKY_Z + 18);       // smaller, centred above the vanishing point
    globe.rotation.x = -0.28;   // tilt the north pole toward the viewer a touch (Europe faces us)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(colorsDark),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      opacity: colorsDark ? 0.95 : 0.5, fog: false }));
    halo.scale.set(R * 3.0, R * 3.0, 1); halo.position.set(0, 46, SKY_Z + 16);
    earth = new THREE.Group();
    earth.add(halo); earth.add(globe); earth.renderOrder = -4;
    earth.userData.globe = globe;
    scene.add(earth);
  }

  /* ---------- distant cyberpunk skyline on the horizon ---------- */
  function windowTexture(dark, accent) {
    const W = 64, H = 128, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = dark ? "#060c17" : "#2a3550"; x.fillRect(0, 0, W, H);
    const acc = "#" + (accent || 0x6fd3c4).toString(16).padStart(6, "0");
    const cols = [acc, acc, acc, "#ffffff"];   // mostly the building's accent, a few white
    for (let gy = 6; gy < H - 4; gy += 9) {
      for (let gx = 5; gx < W - 4; gx += 9) {
        if (Math.random() < 0.55) continue;
        x.globalAlpha = dark ? (0.45 + Math.random() * 0.5) : (0.3 + Math.random() * 0.35);
        x.fillStyle = cols[(Math.random() * cols.length) | 0];
        x.fillRect(gx, gy, 3, 4);
      }
    }
    x.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function buildCity(P) {
    city = new THREE.Group();
    const accents = [0x6fd3c4, 0xf2b33d, 0x5b8cff, 0xff6fa5, 0xa98bff];
    // a few slate body tones so the skyline is not one flat colour
    const tones = colorsDark ? [0x0b1322, 0x0e1a31, 0x121d36] : [0x58637f, 0x646f8b, 0x4e586f];
    const N = 50;
    const antMat = new THREE.MeshStandardMaterial({ color: colorsDark ? 0x4a5468 : 0x6a7486, roughness: 0.6, metalness: 0.4, fog: false });
    for (let i = 0; i < N; i++) {
      const bx = (Math.random() - 0.5) * 230;
      if (Math.abs(bx) < 9) continue;                 // keep the road's vanishing point clear
      const w = 2.0 + Math.random() * 3.4;
      const h = 4 + Math.random() * 14;
      const d = 2.0 + Math.random() * 3.2;
      const bz = SKY_Z - 14 + Math.random() * 26;     // pushed much further back, smaller skyline
      const accent = accents[(Math.random() * accents.length) | 0];
      const tone = tones[(Math.random() * tones.length) | 0];
      const b = new THREE.Group(); b.position.set(bx, 0, bz);
      const mat = new THREE.MeshStandardMaterial({ color: tone, roughness: 1, metalness: 0.15,
        emissive: accent, emissiveIntensity: colorsDark ? 0.1 : 0.05, fog: false });
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); body.position.y = h / 2 - 1; b.add(body);
      // lit window face
      const wt = windowTexture(colorsDark, accent);
      wt.repeat.set(Math.max(1, Math.round(w / 2)), Math.max(2, Math.round(h / 3)));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, h * 0.9),
        new THREE.MeshBasicMaterial({ map: wt, transparent: true, depthWrite: false,
          blending: colorsDark ? THREE.AdditiveBlending : THREE.NormalBlending,
          opacity: colorsDark ? 0.9 : 0.6, fog: false }));
      face.position.set(0, h / 2 - 1, d / 2 + 0.02); b.add(face);
      // glowing rooftop crown strip
      const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 1.03, 0.5, d * 1.03),
        new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: colorsDark ? 0.9 : 0.35, roughness: 0.4, fog: false }));
      crown.position.y = h - 1; b.add(crown);
      // taller towers get a setback top, a mast and a red aircraft beacon
      if (h > 13 && Math.random() < 0.6) {
        const w2 = w * 0.6, h2 = 2 + Math.random() * 4;
        const top = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d * 0.6), mat); top.position.y = h - 1 + h2 / 2; b.add(top);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), antMat); mast.position.y = h - 1 + h2 + 1.1; b.add(mast);
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0xff5a5a, emissive: 0xff5a5a, emissiveIntensity: colorsDark ? 1.1 : 0.4, fog: false }));
        beacon.position.y = h - 1 + h2 + 2.3; b.add(beacon);
      }
      city.add(b);
    }
    city.renderOrder = -3; scene.add(city);
  }

  function dotTexture() {
    const s = 32, c = document.createElement("canvas"); c.width = c.height = s;
    const x = c.getContext("2d"), grd = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.5, "rgba(255,255,255,0.6)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = grd; x.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }
  function galaxySprite(c1, c2, size) {
    const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
    const x = cv.getContext("2d");
    const col = (h) => "#" + h.toString(16).padStart(6, "0");
    // soft elliptical nebula with a few spiral wisps
    const grd = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "rgba(255,255,255,0.9)");
    grd.addColorStop(0.25, col(c1) + "cc");
    grd.addColorStop(0.55, col(c2) + "66");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = grd; x.beginPath(); x.ellipse(s / 2, s / 2, s / 2, s / 3.2, 0, 0, 7); x.fill();
    // sprinkle stars inside
    x.globalCompositeOperation = "lighter";
    for (let i = 0; i < 140; i++) {
      const a = Math.random() * 7, rr = Math.random() * (s / 2.4);
      const px = s / 2 + Math.cos(a) * rr, py = s / 2 + Math.sin(a) * rr * 0.6;
      x.fillStyle = "rgba(255,255,255," + (Math.random() * 0.8) + ")";
      x.fillRect(px, py, Math.random() < 0.15 ? 2 : 1, 1);
    }
    const tex = new THREE.CanvasTexture(cv);
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  }

  /* ---------- meteors with a fading binary trail (top of the view) ---------- */
  function digitTexture(ch, colorHex) {
    const s = 48, c = document.createElement("canvas"); c.width = c.height = s;
    const x = c.getContext("2d");
    x.font = "700 40px 'Martian Mono', monospace"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "#" + colorHex.toString(16).padStart(6, "0");
    x.fillText(ch, s / 2, s / 2 + 2);
    const t = new THREE.CanvasTexture(c); return t;
  }
  let _digitCache = {}, _emberTex = null;
  function emberTex() { if (!_emberTex) _emberTex = dotTexture(); return _emberTex; }
  function digitSprite(ch, colorHex) {
    const k = ch + colorHex;
    if (!_digitCache[k]) _digitCache[k] = digitTexture(ch, colorHex);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: _digitCache[k], transparent: true, opacity: 1, depthWrite: false, blending: colorsDark ? THREE.AdditiveBlending : THREE.NormalBlending }));
    return sp;
  }
  function spawnMeteor() {
    // dark theme: bright neon streaks; light theme: darker streaks that read on a pale sky
    const colorHex = colorsDark
      ? (Math.random() < 0.5 ? 0x6fd3c4 : 0xf2b33d)
      : (Math.random() < 0.5 ? 0x0f766e : 0xb9741a);
    const group = new THREE.Group();
    const fromLeft = Math.random() < 0.5;
    const startX = (fromLeft ? -1 : 1) * (40 + Math.random() * 18);
    const startY = 28 + Math.random() * 26;
    const startZ = camera.position.z - 70 - Math.random() * 40;   // down the road, in view
    group.position.set(startX, startY, startZ);
    const vx = (fromLeft ? 1 : -1) * (26 + Math.random() * 16);
    const vy = -(5 + Math.random() * 5);
    const vz = (Math.random() - 0.5) * 8;
    // size varies, but stays modest
    const size = 0.55 + Math.random() * 1.0;          // ~0.55 .. 1.55
    // head reads as a ball of fire that the numbers trail behind
    const headColor = colorsDark ? 0xff7a2a : 0xb9741a;
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: emberTex(), color: headColor, transparent: true, depthWrite: false, blending: colorsDark ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: colorsDark ? 1 : 0.9 }));
    const hs = 3.4 * size; head.scale.set(hs, hs, 1); group.add(head);
    if (colorsDark) {
      const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: 0xffd27a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95 }));
      const cs = 1.7 * size; core.scale.set(cs, cs, 1); group.add(core);
    }
    scene.add(group);
    meteors.push({ group, head, colorHex, vx, vy, vz, size, trail: [], emitAcc: 0, life: 0, maxLife: 3.6, dir: new THREE.Vector3(vx, vy, vz).normalize() });
  }
  function updateMeteors(dt) {
    if (!colorsDark) { if (meteors.length) clearMeteors(); return; }   // night only
    meteorTimer -= dt;
    if (meteorTimer <= 0 && meteors.length < 6) { spawnMeteor(); meteorTimer = 1 + Math.random() * 0.5; }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.life += dt;
      m.group.position.x += m.vx * dt;
      m.group.position.y += m.vy * dt;
      m.group.position.z += m.vz * dt;
      // emit a short stream behind the body: the newest ~6 are bright binary digits,
      // anything older drops back into a dim fire tail (fire in shadow). Capped length.
      m.emitAcc += dt;
      const step = 0.06;
      while (m.emitAcc >= step) {
        m.emitAcc -= step;
        const d = digitSprite(Math.random() < 0.5 ? "0" : "1", m.colorHex);
        d.position.copy(m.group.position);
        const ds = 2.0 * m.size; d.scale.set(ds, ds, 1);
        d.userData.age = 0; d.userData.fire = false;
        scene.add(d); m.trail.push(d);
        while (m.trail.length > 16) { const o = m.trail.shift(); scene.remove(o); o.material.dispose(); }
      }
      for (let j = m.trail.length - 1; j >= 0; j--) {
        const d = m.trail[j]; d.userData.age += dt;
        const fromHead = (m.trail.length - 1) - j;   // 0 = closest to the body
        const k = 1 - d.userData.age / 1.5;
        if (k <= 0) { scene.remove(d); d.material.dispose(); m.trail.splice(j, 1); continue; }
        if (fromHead >= 6 && !d.userData.fire) {       // past the 6th digit it becomes an ember
          d.userData.fire = true;
          d.material.map = emberTex();
          d.material.color = new THREE.Color(colorsDark ? 0x9a4a16 : 0x6b3a14);
          d.material.needsUpdate = true;
        }
        if (d.userData.fire) {
          d.material.opacity = (colorsDark ? 0.5 : 0.42) * k;     // dim, in shadow
          const sc = 2.6 * m.size * (0.5 + k * 0.6); d.scale.set(sc, sc, 1);
        } else {
          d.material.opacity = (colorsDark ? 1 : 0.85) * Math.min(1, k + 0.25);
          const sc = 2.0 * m.size * (0.75 + k * 0.25); d.scale.set(sc, sc, 1);
        }
      }
      m.head.material.opacity = clamp(1 - (m.life - m.maxLife + 1), 0, 1);
      if (m.life > m.maxLife && m.trail.length === 0) {
        scene.remove(m.group); m.head.material.dispose(); meteors.splice(i, 1);
      }
    }
  }
  function clearMeteors() {
    meteors.forEach((m) => { m.trail.forEach((d) => { scene.remove(d); d.material.dispose(); }); scene.remove(m.group); });
    meteors = []; meteorTimer = 1.5;
  }

  /* ---------- build scene ---------- */
  function build() {
    const P = palette();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(P.bg);
    // deeper fog in the dark theme so the galaxy reads against it
    scene.fog = new THREE.Fog(P.fog, colorsDark ? 26 : 32, colorsDark ? 90 : 92);
    camera = new THREE.PerspectiveCamera(58, viewW / viewH || 1.6, 0.1, 400);
    camera.position.set(0, 4.2, avatar ? avatar.position.z + 7.5 : WALK_MAX + 7.5);

    scene.add(new THREE.AmbientLight(0xffffff, colorsDark ? 0.5 : 0.85));
    const key = new THREE.DirectionalLight(0xffffff, colorsDark ? 0.85 : 0.9); key.position.set(-6, 14, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(colorsDark ? 0x6fd3c4 : 0xffffff, colorsDark ? 0.55 : 0.25); rim.position.set(8, 6, -10); scene.add(rim);

    // backdrop (sky, Earth, city, stars, galaxy) and meteors live behind the road
    buildBackdrop(P);

    // lunar/regolith dust skin on both themes: dark moon at night, neutral grey moon by day
    const groundTex = makeGroundTexture();
    groundTex.repeat.set(10, (Math.abs(ROAD_END) + 120) / 24);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, Math.abs(ROAD_END) + 120),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, map: groundTex }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = ROAD_END / 2; scene.add(ground);

    // cyber road with a scrolling grid texture
    const roadLen = Math.abs(ROAD_END) + 60;
    const roadTex = makeGridTexture(P);
    roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(3, roadLen / 2);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(6.2, roadLen),
      new THREE.MeshStandardMaterial({ color: P.road, roughness: 0.55, metalness: 0.5, map: roadTex,
        emissive: colorsDark ? 0x0a1830 : 0x000000, emissiveMap: roadTex, emissiveIntensity: colorsDark ? 0.8 : 0 }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, ROAD_END / 2); scene.add(road);
    scene.userData.roadTex = roadTex;

    // center dashes (emissive)
    const dashMat = new THREE.MeshBasicMaterial({ color: colorsDark ? 0x8fe8dc : P.roadEdge });
    const dashGeo = new THREE.PlaneGeometry(0.2, 1.6);
    for (let z = WALK_MAX; z > ROAD_END; z -= 3.2) {
      const d = new THREE.Mesh(dashGeo, dashMat); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.04, z); scene.add(d);
    }
    // glowing neon edge strips (two per side for a thicker glow)
    const edgeC = colorsDark ? 0x6fd3c4 : P.roadEdge;
    const edgeMat = new THREE.MeshBasicMaterial({ color: edgeC });
    [-3.18, 3.18].forEach((x) => {
      const e = new THREE.Mesh(new THREE.PlaneGeometry(0.14, roadLen), edgeMat);
      e.rotation.x = -Math.PI / 2; e.position.set(x, 0.05, ROAD_END / 2); scene.add(e);
      // faint wider under-glow laid flat
      const g2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, roadLen),
        new THREE.MeshBasicMaterial({ color: edgeC, transparent: true, opacity: colorsDark ? 0.18 : 0.1 }));
      g2.rotation.x = -Math.PI / 2; g2.position.set(x, 0.035, ROAD_END / 2); scene.add(g2);
    });

    addSideHeader("WORK & STUDY", -1, P.work);
    // certifications header in neon pink/magenta: distinct from the amber work label and the teal road, and reads on both themes with its outline
    addSideHeader("CERTIFICATIONS", 1, colorsDark ? 0x5fe6cf : 0x0f766e, colorsDark ? 0x06231d : 0xeafff9);

    leftStops.forEach((s) => addMarker(s, P));
    rightStops.forEach((s) => addMarker(s, P));

    for (let i = 0; i <= maxIndex; i++) { addLamp(-3.8, laneZ(i) + SEG / 2, P); addLamp(3.8, laneZ(i) + SEG / 2, P); }

    avatar = buildAvatar(P); avatar.position.z = player.z; scene.add(avatar);

    try {
      if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        bloom = new THREE.UnrealBloomPass(new THREE.Vector2(viewW, viewH), colorsDark ? 0.32 : 0.1, 0.6, 0.85);
        composer.addPass(bloom);
      }
    } catch (e) { composer = null; }

    built = true;
    selectStop(selected || leftStops[0] || rightStops[0], true);
  }

  function addSideHeader(text, side, colorHex, strokeHex) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 0.92),
      new THREE.MeshBasicMaterial({ map: textPlaque(text, colorHex, strokeHex), transparent: true, depthWrite: false }));
    // smaller and pulled in from the edges so the full word sits on screen with a margin
    m.position.set(side * (SIDE_X - 0.4), 3.3, START_Z + 5);
    m.rotation.y = side < 0 ? Math.PI * 0.12 : -Math.PI * 0.12;
    scene.add(m);
  }

  function addMarker(s, P) {
    const accent = s.kind === "work" ? P.work : s.kind === "edu" ? P.edu : P.cert;
    const group = new THREE.Group();
    group.position.set(s.side * SIDE_X, 0, s.z);

    const h = s.kind === "cert" ? 1.8 : (s.present ? 4.6 : 3.4);
    const w = s.kind === "cert" ? 2.4 : 3.2;
    const depth = s.kind === "cert" ? 2.4 : 3.0;

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth),
      new THREE.MeshStandardMaterial({ color: P.sign, roughness: 0.7, metalness: 0.1 }));
    body.position.y = h / 2; group.add(body);
    // outline so the white cards stay defined on the light theme
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),
      new THREE.LineBasicMaterial({ color: colorsDark ? 0x33456b : 0x9aa2b4 }));
    edges.position.copy(body.position); group.add(edges);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.26, depth + 0.04),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: colorsDark ? 0.9 : 0.2, roughness: 0.4 }));
    stripe.position.y = h - 0.3; group.add(stripe);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(s.present ? 0.32 : 0.22, 16, 16),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: colorsDark ? 1.3 : 0.5 }));
    beacon.position.y = h + 0.5; group.add(beacon);

    const tag = s.kind === "cert" ? (s.short || "CERT") : (s.kind === "edu" ? "STUDY" : "WORK");
    const sub = s.from ? (s.from + (s.to ? " – " + s.to : "")) : (s.issued || "");
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 2.0),
      new THREE.MeshBasicMaterial({ map: makeSignTexture({ tag, title: s.org || s.title, sub }, accent, P.signInk), transparent: true }));
    sign.position.set(s.side * -(w / 2 + 0.06), h * 0.62, 0);
    sign.rotation.y = s.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(sign);

    const ring = new THREE.Mesh(new THREE.RingGeometry(w * 0.72, w * 0.84, 40),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; group.add(ring);

    scene.add(group);
    markers.push({ stop: s, group, beacon, ring, accent, baseBeaconY: h + 0.5 });
  }

  function addLamp(x, z, P) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 8),
      new THREE.MeshStandardMaterial({ color: P.roadEdge, roughness: 0.6 }));
    pole.position.y = 2; g.add(pole);
    // lamps only glow at night; by day they are unlit grey glass
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshStandardMaterial({ color: colorsDark ? P.lamp : 0x9aa2b4, emissive: colorsDark ? P.lamp : 0x000000, emissiveIntensity: colorsDark ? 1.0 : 0, roughness: 0.5, metalness: 0.2 }));
    head.position.y = 4; g.add(head);
    g.position.set(x, 0, z); scene.add(g);
  }

  function buildAvatar(P) {
    const g = new THREE.Group();
    // realistic robot: brushed gunmetal body with charcoal joints and a single
    // controlled glowing accent (visor / core). Mid metalness so it reads metallic
    // without blowing out to white under bloom.
    const chassis = new THREE.MeshStandardMaterial({ color: colorsDark ? 0x5b6472 : 0x8a95a8, roughness: 0.45, metalness: 0.6 });
    const plate = new THREE.MeshStandardMaterial({ color: colorsDark ? 0x2b313c : 0x4c566b, roughness: 0.6, metalness: 0.5 });
    const glowC = colorsDark ? 0x6fd3c4 : 0x0f766e;      // cyber teal
    const glow = new THREE.MeshStandardMaterial({ color: glowC, emissive: glowC, emissiveIntensity: colorsDark ? 0.8 : 0.4, roughness: 0.3 });
    const glowA = new THREE.MeshStandardMaterial({ color: P.work, emissive: P.work, emissiveIntensity: colorsDark ? 0.65 : 0.35, roughness: 0.3 });

    const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    const cap = (r, l, m) => new THREE.Mesh(THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(r, l, 5, 10) : new THREE.CylinderGeometry(r, r, l + r * 2, 12), m);

    // pelvis
    const pelvis = box(0.5, 0.26, 0.34, plate); pelvis.position.y = 0.92; g.add(pelvis);
    // torso: layered plates
    const torso = box(0.66, 0.72, 0.4, chassis); torso.position.y = 1.42; g.add(torso);
    const chestPlate = box(0.54, 0.46, 0.06, plate); chestPlate.position.set(0, 1.5, 0.21); g.add(chestPlate);
    // chest reactor core (pulses)
    avatarCore = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), glow);
    avatarCore.position.set(0, 1.5, 0.26); g.add(avatarCore);
    const collar = box(0.5, 0.1, 0.34, glow); collar.position.y = 1.82; g.add(collar);
    // shoulders
    [-1, 1].forEach((s) => { const sh = box(0.2, 0.26, 0.36, plate); sh.position.set(s * 0.44, 1.66, 0); g.add(sh); });

    // head: angular visor
    const neck = box(0.18, 0.12, 0.18, plate); neck.position.y = 1.92; g.add(neck);
    const head = box(0.42, 0.4, 0.4, chassis); head.position.y = 2.16; g.add(head);
    avatarVisor = box(0.46, 0.14, 0.06, glow); avatarVisor.position.set(0, 2.18, 0.2); g.add(avatarVisor);
    // antenna
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), plate); ant.position.set(0.14, 2.5, -0.02); g.add(ant);
    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), glowA); antTip.position.set(0.14, 2.66, -0.02); g.add(antTip);

    // back pack / thrusters
    const pack = box(0.46, 0.5, 0.2, plate); pack.position.set(0, 1.42, -0.3); g.add(pack);
    [-0.14, 0.14].forEach((x) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 10), glowA); t.position.set(x, 1.14, -0.4); g.add(t); });

    // arms (shoulder-pivoted groups so they swing)
    const makeArm = (side) => {
      const arm = new THREE.Group();
      const upper = cap(0.1, 0.3, chassis); upper.position.y = -0.22; arm.add(upper);
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), glow); elbow.position.y = -0.44; arm.add(elbow);
      const fore = cap(0.09, 0.28, plate); fore.position.y = -0.66; arm.add(fore);
      const hand = box(0.14, 0.16, 0.16, chassis); hand.position.y = -0.86; arm.add(hand);
      arm.position.set(side * 0.46, 1.66, 0);
      g.add(arm);
      return arm;
    };
    avatarArmL = makeArm(-1); avatarArmR = makeArm(1);

    // legs (hip-pivoted groups)
    const makeLeg = (side) => {
      const leg = new THREE.Group();
      const thigh = cap(0.12, 0.34, chassis); thigh.position.y = -0.28; leg.add(thigh);
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), glow); knee.position.y = -0.54; leg.add(knee);
      const shin = cap(0.1, 0.32, plate); shin.position.y = -0.78; leg.add(shin);
      const foot = box(0.18, 0.12, 0.32, chassis); foot.position.set(0, -1.0, 0.07); leg.add(foot);
      leg.position.set(side * 0.18, 0.92, 0);
      g.add(leg);
      return leg;
    };
    avatarLegL = makeLeg(-1); avatarLegR = makeLeg(1);

    return g;
  }

  /* ---------------- selection + panel ---------------- */
  function selectStop(stop, instant) {
    if (!stop) { renderPanel(null); return; }
    selected = stop;
    markers.forEach((m) => {
      const on = m.stop === stop;
      m.ring.material.opacity = on ? (colorsDark ? 0.9 : 0.6) : 0;
      m.beacon.material.emissiveIntensity = on ? (colorsDark ? 2.0 : 0.8)
        : (m.stop.present ? (colorsDark ? 1.3 : 0.5) : (colorsDark ? 1.0 : 0.35));
    });
    renderPanel(stop);
  }
  function nearestOnSide(side) {
    let best = null, bestD = Infinity;
    for (const m of markers) {
      if (m.stop.side !== side) continue;
      const d = Math.abs(m.stop.z - player.z);
      if (d < bestD) { bestD = d; best = m.stop; }
    }
    return best;
  }
  function renderPanel(stop) {
    if (!panelEl) return;
    if (!stop) {
      panelEl.innerHTML = `<div class="cvp-empty"><span class="cvp-kind">// career road</span>
        <p>Walk with <kbd>↑</kbd>/<kbd>↓</kbd>. Turn <kbd>←</kbd> toward work &amp; study, <kbd>→</kbd> toward certifications. Details appear here.</p></div>`;
      return;
    }
    const kindLabel = stop.kind === "work" ? "Experience" : stop.kind === "edu" ? "Education" : "Certification";
    const kc = stop.kind;
    let h = `<div class="cvp-card cvp-${kc}">`;
    h += `<span class="cvp-kind cvp-kind--${kc}">${esc(kindLabel)}</span>`;
    if (kc === "cert") {
      h += `<h3>${esc(stop.title)}</h3>`;
      h += `<div class="cvp-meta">${esc(stop.org || "")}${stop.issued ? " · " + esc(stop.issued) : ""}${stop.expires ? " – " + esc(stop.expires) : ""}</div>`;
      if (stop.learned) h += `<p>${esc(stop.learned)}</p>`;
      if (stop.url) h += `<a href="${esc(stop.url)}" target="_blank" rel="noopener">Verify credential ↗</a>`;
    } else {
      h += `<h3>${esc(stop.title)}</h3>`;
      h += `<div class="cvp-meta">${esc(stop.org || "")}${stop.place ? " · " + esc(stop.place) : ""}</div>`;
      h += `<div class="cvp-dates">${esc(stop.from || "")}${stop.to ? " – " + esc(stop.to) : ""}</div>`;
      if (stop.note) h += `<div class="cvp-note">${esc(stop.note)}</div>`;
      if (stop.blurb) h += `<p>${esc(stop.blurb)}</p>`;
      if (stop.tags && stop.tags.length) h += `<div class="cvp-tags">${stop.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`;
    }
    h += `</div>`;
    panelEl.innerHTML = h;
  }

  /* ---------------- input ---------------- */
  const WATCH = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];
  function norm(k) { return k.toLowerCase().replace("arrow", ""); }
  function onKeyDown(e) {
    if (!running) return;
    const kl = e.key.toLowerCase();
    if (!WATCH.includes(kl)) return;
    keys.add(norm(e.key)); e.preventDefault();
  }
  function onKeyUp(e) { keys.delete(norm(e.key)); }
  function steer(side) { player.targetFacing = side * 0.5; const s = nearestOnSide(side); if (s) selectStop(s); }

  /* ---------------- loop ---------------- */
  let lastTS = 0;
  function frameLoop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(frameLoop);
    const dt = Math.min(0.05, (ts - lastTS) / 1000 || 0.016);
    lastTS = ts;

    let move = 0;
    if (keys.has("up") || keys.has("w")) move -= 1;
    if (keys.has("down") || keys.has("s")) move += 1;
    const turnL = keys.has("left") || keys.has("a");
    const turnR = keys.has("right") || keys.has("d");
    if (turnL) player.targetFacing = -0.5;
    else if (turnR) player.targetFacing = 0.5;
    else if (move) player.targetFacing = 0;   // walking straightens the view down the road
    // (if idle and not steering, keep the last facing so the panel selection stays put)

    const SPEED = 9;
    const prevZ = player.z;
    player.z = clamp(player.z + move * SPEED * dt, WALK_MIN, WALK_MAX);
    if (move) player.bob += dt * 10;

    player.facing += (player.targetFacing - player.facing) * Math.min(1, dt * 8);
    if (player.facing < -0.25) { const s = nearestOnSide(-1); if (s && s !== selected) selectStop(s); }
    else if (player.facing > 0.25) { const s = nearestOnSide(1); if (s && s !== selected) selectStop(s); }

    avatar.position.z += (player.z - avatar.position.z) * Math.min(1, dt * 10);
    avatar.rotation.y = player.facing * -1.3;
    const moving = Math.abs(move) > 0;
    const t = ts / 1000;
    // robot idle hover + walk cycle
    avatar.position.y = reduceMotion ? 0 : (Math.sin(t * 2) * 0.03 + Math.sin(player.bob) * 0.05 * (moving ? 1 : 0));
    if (avatarLegL && avatarLegR) {
      const sw = reduceMotion ? 0 : Math.sin(player.bob) * 0.5 * (moving ? 1 : 0);
      avatarLegL.rotation.x = sw; avatarLegR.rotation.x = -sw;
      if (avatarArmL && avatarArmR) { avatarArmL.rotation.x = -sw * 0.8; avatarArmR.rotation.x = sw * 0.8; }
    }
    // pulsing reactor core + visor flicker
    if (avatarCore && !reduceMotion) {
      const pulse = 0.55 + Math.sin(t * 4) * 0.25;
      avatarCore.material.emissiveIntensity = colorsDark ? pulse + 0.2 : pulse * 0.4;
      if (avatarVisor) avatarVisor.material.emissiveIntensity = colorsDark ? 0.8 + Math.sin(t * 6) * 0.2 : 0.42;
    }

    const camBackZ = avatar.position.z + 7.5, camX = player.facing * 5.5;
    camera.position.x += (camX - camera.position.x) * Math.min(1, dt * 6);
    camera.position.y += (4.2 - camera.position.y) * Math.min(1, dt * 6);
    camera.position.z += (camBackZ - camera.position.z) * Math.min(1, dt * 6);
    camera.lookAt(avatar.position.x + player.facing * 7, 1.6, avatar.position.z - 2);

    // keep the backdrop ahead of the camera so sky, Earth and city stay on the horizon
    if (stars) { stars.position.z = camera.position.z; }
    if (galaxy) { galaxy.position.z = camera.position.z; galaxy.children.forEach((g, i) => { g.material.rotation += dt * (0.008 + i * 0.003); }); }
    if (skyPlane) skyPlane.position.z = camera.position.z + skyPlane.userData.baseZ;
    if (earth) earth.position.z = camera.position.z;
    if (city) city.position.z = camera.position.z;

    // scroll the road grid only while walking, so it reads as the ground
    // passing underneath rather than drifting when the figure is standing still
    const roadTex = scene.userData && scene.userData.roadTex;
    if (roadTex && !reduceMotion && moving) roadTex.offset.y = (roadTex.offset.y + move * dt * 0.25 + 1) % 1;

    // meteors with fading binary trails
    if (!reduceMotion) updateMeteors(dt);

    if (!reduceMotion) markers.forEach((m, i) => { m.beacon.position.y = m.baseBeaconY + Math.sin(t * 2 + i) * 0.12; });

    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  /* ---------------- sizing / lifecycle ---------------- */
  function resize() {
    if (!canvasHolder || !renderer) return;
    const r = canvasHolder.getBoundingClientRect();
    viewW = Math.max(1, r.width); viewH = Math.max(1, r.height || 420);
    renderer.setSize(viewW, viewH, false);
    camera.aspect = viewW / viewH; camera.updateProjectionMatrix();
    if (composer) composer.setSize(viewW, viewH);
  }
  function start() { if (running) return; running = true; lastTS = performance.now(); raf = requestAnimationFrame(frameLoop); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  function disposeScene() {
    if (!scene) return;
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose && o.geometry.dispose();
      if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose && m.map.dispose(); m.dispose && m.dispose(); }); }
    });
    clearMeteors();
    markers.length = 0; composer = null; bloom = null; built = false;
    avatar = null; avatarArmL = avatarArmR = avatarLegL = avatarLegR = avatarVisor = avatarCore = null;
    stars = null; galaxy = null; earth = null; city = null; skyPlane = null;
  }
  function themeChanged() {
    if (!built) return;
    const keepZ = player.z, keepSel = selected;
    disposeScene(); build();
    player.z = keepZ; if (avatar) avatar.position.z = keepZ;
    if (keepSel) selectStop(keepSel, true);
    resize();
  }

  /* ---------------- public mount ---------------- */
  window.CV = {
    mount(stageEl) {
      if (!stageEl) return;
      stage = stageEl;
      if (mounted) { resize(); start(); return; }
      THREE = window.THREE;
      if (!THREE) return;

      canvasHolder = stage.querySelector("#cvCanvasWrap") || stage;
      panelEl = document.getElementById("cvPanel");

      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.id = "cvCanvas";
      canvasHolder.appendChild(renderer.domElement);

      const r = canvasHolder.getBoundingClientRect();
      viewW = Math.max(1, r.width); viewH = Math.max(1, r.height || 440);
      build(); resize();

      window.addEventListener("keydown", onKeyDown, { passive: false });
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("resize", resize);

      stage.querySelectorAll("[data-cv]").forEach((btn) => {
        const dir = btn.getAttribute("data-cv");
        const press = (e) => { e.preventDefault(); if (dir === "up" || dir === "down") keys.add(dir); else steer(dir === "left" ? -1 : 1); };
        const release = () => { keys.delete("up"); keys.delete("down"); if (dir === "left" || dir === "right") player.targetFacing = 0; };
        btn.addEventListener("pointerdown", press);
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointerleave", release);
        btn.addEventListener("pointercancel", release);
      });

      const themeBtn = document.getElementById("themeBtn");
      if (themeBtn) themeBtn.addEventListener("click", () => setTimeout(themeChanged, 40));

      if ("IntersectionObserver" in window) {
        io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) start(); else stop(); }), { threshold: 0.08 });
        io.observe(stage);
      }
      mounted = true; start();
    },
    pause() { stop(); },
    resume() { start(); }
  };
})();
