(() => {
  "use strict";
  const C = window.CTF, esc = C.esc, rand = C.rand, clamp = C.clamp;

  const SCENARIOS = [
    {
      ws: ["WS-FIN-07", "WS-HR-12"], wsSub: "workstation",
      fs: "FILES01", fsSub: "file server",
      svc: "svc-sql", svcSub: "service account",
      roast: "svc-sql (hash)", host: "SQL01", hostSub: "database server",
      dc: "DC01",
      techWs: "Dump LSASS → cached local-admin creds.",
      techFs: "Reachable with the local-admin creds. A share leaks the service account.",
      techRoast: "Kerberoast the SPN, crack the hash offline → Kerberos ticket.",
      techHost: "The service account is local admin here. Dump a cached Domain Admin token.",
      decoy: { label: "a.dev", sub: "developer" }
    },
    {
      ws: ["WS-DEV-03", "WS-OPS-09"], wsSub: "workstation",
      fs: "APP01", fsSub: "app server",
      svc: "svc-iis", svcSub: "service account",
      roast: "svc-iis (hash)", host: "MSSQL02", hostSub: "database server",
      dc: "DC02",
      techWs: "Pass-the-hash material cached from a prior admin logon.",
      techFs: "App config on this server exposes the service account name.",
      techRoast: "Request the service ticket and crack it → Kerberos ticket.",
      techHost: "svc-iis has admin on this DB host. Loot a Domain Admin credential.",
      decoy: { label: "helpdesk", sub: "support group" }
    },
    {
      ws: ["WS-SALES-11", "WS-FIN-02"], wsSub: "workstation",
      fs: "PRINT01", fsSub: "print server",
      svc: "svc-backup", svcSub: "service account",
      roast: "svc-backup (hash)", host: "VEEAM01", hostSub: "backup server",
      dc: "DC01",
      techWs: "Credential Manager blob → cached local-admin creds.",
      techFs: "A spooler share leaks the backup service account.",
      techRoast: "Kerberoast svc-backup, crack offline → Kerberos ticket.",
      techHost: "Backup service runs as Domain Admin. Dump its token.",
      decoy: { label: "intern", sub: "temp account" }
    }
  ];

  function buildGraph() {
    const sc = SCENARIOS[(Math.random() * SCENARIOS.length) | 0];
    const N = [
      { id: "foot", t: "user", label: "j.walker", sub: "phished user", col: 0, y: 1, tech: "Your foothold. A standard domain user." },
      { id: "ws1", t: "computer", label: sc.ws[0], sub: sc.wsSub, col: 1, y: 0.3, loot: "SMB", tech: sc.techWs },
      { id: "ws2", t: "computer", label: sc.ws[1], sub: sc.wsSub, col: 1, y: 1.7, loot: "SMB", tech: sc.techWs + " (same reused password)" },
      { id: "fs", t: "server", label: sc.fs, sub: sc.fsSub, col: 2, y: 0.3, lock: "SMB", tech: sc.techFs },
      { id: "share", t: "user", label: sc.svc, sub: sc.svcSub, col: 2, y: 1.7, tech: "A kerberoastable service account (SPN set). Free to inspect." },
      { id: "decoy", t: "user", label: sc.decoy.label, sub: sc.decoy.sub, col: 2, y: 2.9, tech: "A dead end, no useful access from here." },
      { id: "roast", t: "user", label: sc.roast, sub: "kerberoast", col: 3, y: 0.3, lock: "SMB", loot: "TICKET", tech: sc.techRoast },
      { id: "sql", t: "server", label: sc.host, sub: sc.hostSub, col: 3, y: 1.7, lock: "TICKET", loot: "ADMIN", tech: sc.techHost },
      { id: "da", t: "user", label: "DOMAIN ADMIN", sub: "Administrator", col: 4, y: 0.4, lock: "ADMIN", goal: true, tech: "Authenticate as Domain Admin. Game over for the domain." },
      { id: "dc", t: "dc", label: sc.dc, sub: "domain controller", col: 4, y: 1.6, lock: "ADMIN", goal: true, tech: "DCSync from the domain controller with admin rights." }
    ];
    const E = [
      ["foot", "ws1"], ["foot", "ws2"],
      ["ws1", "fs"], ["ws2", "fs"], ["ws1", "share"], ["ws2", "share"],
      ["ws2", "decoy"], ["decoy", "share"],
      ["fs", "roast"], ["share", "roast"], ["share", "sql"],
      ["roast", "sql"],
      ["sql", "da"], ["sql", "dc"]
    ];
    const map = Object.fromEntries(N.map((n) => [n.id, n]));
    N.forEach((n) => { n.adj = []; });
    E.forEach(([a, b]) => { map[a].adj.push(b); });
    return { nodes: N, edges: E, map };
  }

  const st = {};
  let ctx, root, svg, hud, raf, t = 0;
  const DET_MAX = 100;

  const level = {
    id: "ad", order: 4, name: "Active Directory", target: "Windows domain",
    kind: "Attack path", bonus: 1000, cta: "Break in",
    brief: "You have one low-privilege foothold. Active Directory attacks are a chain: dump cached credentials from a workstation, use them to reach a server, kerberoast a service account for a ticket, then use that to grab Domain Admin credentials and own the domain controller. Each node names the real technique and the key it gives you. Follow the chain to Domain Admin before the detection sweep catches you. Hover a node to see what it does.",
    flag: "FLAG{kerberoast_to_domain_admin}",
    real: "Active Directory attacks chain small wins: a cached local-admin password, a kerberoastable service account, a reused credential. Each step is a real technique (LSASS dumping, Kerberoasting, DCSync). Tools like BloodHound map these exact paths so defenders can break the chain, tiering admins, managed service accounts, and credential hygiene.",
    legend: [
      { icon: "lg-cred", text: "Click a connected node to move. ✦ loot gives you a key" },
      { icon: "lg-port", text: "🔒 locks need the matching key, follow the chain" },
      { icon: "lg-laser", text: "Reach Domain Admin or the DC before detection hits 100%" }
    ],

    mount(context) {
      ctx = context;

      Object.keys(st).forEach((k) => delete st[k]);
      const g = buildGraph();
      Object.assign(st, {
        g, cur: "foot", keys: new Set(), hops: 0,
        detection: 0, over: false, owned: new Set(["foot"]), path: ["foot"]
      });
      root = document.createElement("div");
      root.className = "lv lv-ad";
      root.innerHTML = `
        <div class="lv-top">
          <div class="lv-stat"><span>Current</span><b id="ad-cur">j.walker</b></div>
          <div class="lv-stat"><span>Loot</span><b id="ad-loot">none</b></div>
          <div class="lv-stat"><span>Detection</span><b id="ad-det">0%</b></div>
        </div>
        <div class="ad-board">
          <svg id="ad-svg" preserveAspectRatio="xMidYMid meet" aria-label="Active Directory attack graph"></svg>
          <div class="ad-det-bar"><span id="ad-det-fill"></span></div>
        </div>
        <div class="lv-log" id="ad-log"><span class="dim">$ bloodhound, ingested. You are j.walker. Find a path to Domain Admin.</span></div>`;
      ctx.layer.appendChild(root);
      svg = root.querySelector("#ad-svg");
      layout();
      draw();
      ctx.setLives(null); ctx.hudLabel("4/5 Active Directory"); ctx.setStatus("map the paths"); ctx.setProgress(0);
      t = 0; raf = requestAnimationFrame(loop);
      window.addEventListener("resize", layout);
    },

    onResume() {},
    unmount() { if (raf) cancelAnimationFrame(raf); window.removeEventListener("resize", layout); root && root.remove(); },
    resize() { layout(); },
    update() {}
  };

  const VW = 1000, VH = 560, COLS = 5;
  function layout() {
    svg.setAttribute("viewBox", `0 0 ${VW} ${VH}`);
    const padX = 90, padY = 70;
    const colW = (VW - padX * 2) / (COLS - 1);

    const byCol = {};
    st.g.nodes.forEach((n) => { (byCol[n.col] = byCol[n.col] || []).push(n); });
    st.g.nodes.forEach((n) => {
      const ys = byCol[n.col].map((m) => m.y);
      const maxY = Math.max(...ys), minY = Math.min(...ys);
      const span = maxY - minY || 1;
      n.x = padX + n.col * colW;
      n.y2 = padY + ((n.y - minY) / span) * (VH - padY * 2);
      if (byCol[n.col].length === 1) n.y2 = VH / 2;
    });
  }

  function reachable(id) { return st.g.map[st.cur].adj.includes(id) || st.g.map[id].adj.includes(st.cur); }
  function isOpen(node) { return !node.lock || st.keys.has(node.lock); }
  const KEY_LABEL = { SMB: "local-admin creds", TICKET: "a Kerberos ticket", ADMIN: "Domain Admin creds" };
  const KEY_SHORT = { SMB: "SMB creds", TICKET: "Kerberos ticket", ADMIN: "DA creds" };

  function draw() {
    const g = st.g;
    const edgesSvg = g.edges.map(([a, b]) => {
      const A = g.map[a], B = g.map[b];
      const active = (st.cur === a) || (st.cur === b);
      const used = st.owned.has(a) && st.owned.has(b);
      return `<line x1="${A.x}" y1="${A.y2}" x2="${B.x}" y2="${B.y2}" class="ad-edge ${used ? "used" : ""} ${active ? "active" : ""}"/>`;
    }).join("");

    const nodesSvg = g.nodes.map((n) => {
      const owned = st.owned.has(n.id);
      const canMove = reachable(n.id) && n.id !== st.cur;
      const open = isOpen(n);
      const cls = ["ad-node", "t-" + n.t, owned ? "owned" : "", n.id === st.cur ? "cur" : "", canMove ? "move" : "", (canMove && !open) ? "locked" : "", n.goal ? "goal" : ""].join(" ");
      const r = n.t === "dc" || n.goal ? 40 : 32;
      const lockTxt = { SMB: "🔒 SMB creds", TICKET: "🔒 ticket", ADMIN: "🔒 admin" };
      const lockIcon = n.lock && !owned ? `<text x="${n.x}" y="${n.y2 - r - 8}" class="ad-lock">${lockTxt[n.lock]}</text>` : "";
      const lootTxt = { SMB: "✦ creds", TICKET: "✦ ticket", ADMIN: "✦ DA creds" };
      const lootIcon = (n.loot && !st["looted_" + n.id]) ? `<text x="${n.x}" y="${n.y2 + 32}" class="ad-loot-mark">${lootTxt[n.loot]}</text>` : "";
      const tip = n.tech ? `<title>${esc(n.label)}, ${esc(n.tech)}</title>` : "";
      return `<g class="${cls}" data-node="${n.id}" tabindex="${canMove ? 0 : -1}" role="button" aria-label="${esc(n.label)}: ${esc(n.tech || n.sub)}">
        ${tip}
        ${nodeShape(n, r)}
        <text x="${n.x}" y="${n.y2 + 2}" class="ad-label">${esc(n.label)}</text>
        <text x="${n.x}" y="${n.y2 + 18}" class="ad-sub">${esc(n.sub)}</text>
        ${lockIcon}${lootIcon}
      </g>`;
    }).join("");

    const cur = g.map[st.cur];
    const intruder = `<g class="ad-intruder" transform="translate(${cur.x},${cur.y2})">${burglar()}</g>`;

    svg.innerHTML = `<g class="ad-edges">${edgesSvg}</g><g class="ad-nodes">${nodesSvg}</g>${intruder}`;
    svg.querySelectorAll(".ad-node.move").forEach((el) => {
      el.addEventListener("click", () => move(el.dataset.node));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); move(el.dataset.node); } });
    });

    hud = { cur: root.querySelector("#ad-cur"), loot: root.querySelector("#ad-loot"), det: root.querySelector("#ad-det"), fill: root.querySelector("#ad-det-fill") };
    hud.cur.textContent = cur.label;
    hud.loot.textContent = st.keys.size ? [...st.keys].map((k) => KEY_SHORT[k]).join(" · ") : "none";
  }

  function nodeShape(n, r) {
    if (n.t === "computer") return `<rect x="${n.x - r}" y="${n.y2 - r}" width="${r * 2}" height="${r * 2}" rx="5" class="ad-shape"/>`;
    if (n.t === "server") return `<rect x="${n.x - r}" y="${n.y2 - r * .8}" width="${r * 2}" height="${r * 1.6}" rx="3" class="ad-shape"/>`;
    if (n.t === "dc") return `<path d="${hexPath(n.x, n.y2, r)}" class="ad-shape"/>`;
    return `<circle cx="${n.x}" cy="${n.y2}" r="${r}" class="ad-shape"/>`;
  }
  function hexPath(cx, cy, r) {
    let d = "";
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); }
    return d + "Z";
  }

  function burglar() {
    return `
      <g transform="scale(0.9)">
        <ellipse cx="0" cy="20" rx="13" ry="4" class="bg-shadow"/>
        <path d="M-9 2 Q0 -4 9 2 L8 16 Q0 20 -8 16 Z" class="bg-body"/>
        <circle cx="0" cy="-8" r="9" class="bg-head"/>
        <path d="M-9 -9 Q0 -20 9 -9 Z" class="bg-hat"/>
        <rect x="-9" y="-11" width="18" height="2.4" class="bg-hat"/>
        <rect x="-8" y="-9" width="16" height="4.5" rx="1.2" class="bg-mask"/>
        <circle cx="-3.4" cy="-6.8" r="1.1" class="bg-eye"/>
        <circle cx="3.4" cy="-6.8" r="1.1" class="bg-eye"/>
      </g>`;
  }

  function move(id) {
    if (st.over) return;
    const node = st.g.map[id];
    if (!reachable(id)) return;
    if (st.owned.has(id)) {

      st.cur = id; st.path.push(id); C.sfx.type(); bumpDetection(3);
      log(`$ moved back to ${node.label}.`, "dim");
      ctx.setProgress(node.col / 4); draw(); return;
    }
    if (!isOpen(node)) {
      C.sfx.bad(); ctx.flash("bad");
      log(`$ ${node.label}: access denied, needs ${KEY_LABEL[node.lock]}. ${node.tech || ""}`, "err");
      bumpDetection(4);
      return;
    }

    st.cur = id; st.owned.add(id); st.hops++; st.path.push(id);
    C.sfx.pickup(); ctx.addScore(120);
    bumpDetection(rand(4.5, 7));

    if (node.loot && !st["looted_" + id]) {
      st["looted_" + id] = true;
      st.keys.add(node.loot);
      log(`$ ${node.label}: ${node.tech || "looted " + KEY_SHORT[node.loot]} → got ${KEY_SHORT[node.loot]}.`, "ok");
      ctx.addScore(120);
    } else {
      log(`$ ${node.label}: ${node.tech || "moved."}`, "dim");
    }

    ctx.setProgress(node.col / 4);

    if (node.goal) { st.over = true; C.sfx.good(); ctx.flash("good"); log(`$ ${node.label}: OWNED. Domain compromised.`, "ok"); setTimeout(() => ctx.win(), 700); return; }
    draw();
  }

  function bumpDetection(amount) {
    st.detection = clamp(st.detection + amount, 0, DET_MAX);
    if (st.detection >= DET_MAX && !st.over) { st.over = true; log("$ detection threshold reached, the SOC isolated your session.", "err"); setTimeout(() => ctx.lose(), 400); }
  }

  function log(msg, cls = "") { const l = root.querySelector("#ad-log"); const s = document.createElement("span"); if (cls) s.className = cls; s.textContent = msg; l.appendChild(s); l.scrollTop = l.scrollHeight; }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!ctx.isPlaying() || st.over) return;
    t += 1 / 60;

    st._acc = (st._acc || 0) + 1 / 60;
    if (st._acc >= 1.5) { st._acc = 0; bumpDetection(1.4); }
    if (hud) {
      hud.det.textContent = Math.round(st.detection) + "%";
      hud.det.classList.toggle("warn", st.detection > 65);
      hud.fill.style.width = st.detection + "%";
      hud.fill.classList.toggle("warn", st.detection > 65);
    }
  }

  C.register(level);
})();
