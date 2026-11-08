/* Level 1, Recon & leaked credentials. External attack surface.
   Scan the target's exposed hosts, pull creds from breach dumps,
   and match the right credential to the right login before time runs out. */
(() => {
  "use strict";
  const C = window.CTF, esc = C.esc, rand = C.rand;

  // Each service has ONE fixed, thematic password tied to what the service does.
  // `clue` is the OSINT note shown on the card so the player can reason it out.
  // These never change: vpn is always SuperSecureVPN!, mail is always KeepMyMail2026, etc.
  const SERVICES = [
    { id: "vpn", host: "vpn.acme.io", port: "443/https", svc: "SSL VPN", user: "j.walker", hint: "Finance VPN portal",
      pw: "SuperSecureVPN!", clue: "Sticky note in a leaked office photo: “secure vpn access”." },
    { id: "mail", host: "mail.acme.io", port: "993/imaps", svc: "Webmail", user: "s.nowak", hint: "Exchange / OWA",
      pw: "KeepMyMail2026", clue: "User joked in a forum post about “keeping my mail” safe this year." },
    { id: "git", host: "git.acme.io", port: "22/ssh", svc: "Git / SSH", user: "deploy", hint: "CI deploy account",
      pw: "DeployAllTheCode", clue: "Hard-coded in an old public pipeline: the deploy motto." },
    { id: "rdp", host: "rdp.acme.io", port: "3389/rdp", svc: "Remote Desktop", user: "admin.ext", hint: "Jump box",
      pw: "LetMeInRemote1", clue: "Helpdesk ticket quoted the external admin's remote-login phrase." },
    { id: "portal", host: "portal.acme.io", port: "443/https", svc: "HR portal", user: "m.fischer", hint: "Self-service HR",
      pw: "MyHRportal2025", clue: "HR welcome email set a default like “my hr portal” + year." },
    { id: "wiki", host: "wiki.acme.io", port: "8080/http", svc: "Internal wiki", user: "t.berg", hint: "Confluence",
      pw: "EditTheWiki!", clue: "Wiki footer credit hinted the admin password is about editing the wiki." }
  ];
  // Decoys are near-misses: right theme, wrong exact string.
  const DECOY_PW = ["SecureVPN123", "KeepMyMail!", "DeployTheCode1", "LetMeInRemote", "MyHRportal!", "EditWiki2025", "VPNaccess2026", "MailKeeper99"];

  const st = {};
  let ctx, root, timerRaf, t0;

  const level = {
    id: "recon", order: 1, name: "Recon", target: "Public attack surface",
    kind: "Recon puzzle", bonus: 700, cta: "Start recon",
    brief: "Every engagement starts from the outside. You scan the target's internet-facing hosts, then dig through leaked password dumps. People reuse passwords, so a credential from an old breach often still opens a live door. Each login has an OSINT note that gives its password away, crack every login to establish your footholds.",
    flag: "FLAG{stop_reusing_passwords}",
    real: "Most breaches don't start with a clever exploit. They start with a password someone reused, exposed in an old breach and still valid on a live service. Multi-factor authentication and not reusing passwords close this door.",
    legend: [
      { icon: "lg-cred", text: "Read the ⌕ OSINT note, then drag the matching leaked password onto the login" },
      { icon: "lg-port", text: "Crack every login to finish the stage" },
      { icon: "lg-laser", text: "Wrong guesses and time cost you attempts" }
    ],

    mount(context) {
      ctx = context;
      // Deterministic: five fixed services are shown and ALL are crackable with their
      // own themed password. The stage is finished when every credential is guessed.
      const SHOWN = ["vpn", "git", "portal", "mail", "rdp"];
      const targets = SERVICES.filter((s) => SHOWN.includes(s.id)).map((s) => ({ ...s, cracked: false }));
      const logins = targets.slice();

      // Dump = the real passwords for every shown login + near-miss decoys, shuffled
      // so the correct passwords are not lined up in the same order as the logins.
      const DECOYS = ["SecureVPN123", "KeepMyMail!", "DeployTheCode1", "MyHRportal!", "EditWiki2025"];
      const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
      const dump = shuffle([...targets.map((t) => t.pw), ...DECOYS]).map((pw) => ({ pw, used: false }));

      Object.assign(st, { logins, dump, targets, need: targets.length, got: 0, attempts: 6, time: 0, over: false });

      root = document.createElement("div");
      root.className = "lv lv-recon";
      root.innerHTML = `
        <div class="lv-top">
          <div class="lv-stat"><span>Credentials cracked</span><b id="r-foot">0 / ${st.need}</b></div>
          <div class="lv-stat"><span>Attempts</span><b id="r-att">${st.attempts}</b></div>
          <div class="lv-stat"><span>Time</span><b id="r-time">0s</b></div>
        </div>
        <div class="lv-recon-grid">
          <section class="lv-panel">
            <h4>Exposed logins · acme.io</h4>
            <p class="lv-note">Each login shows an OSINT note (⌕). Work out the password from the user and system, then drag the matching leak onto it. Crack every login to finish.</p>
            <div class="r-logins" id="r-logins"></div>
          </section>
          <section class="lv-panel">
            <h4>Breach dump · 2024 leak</h4>
            <p class="lv-note">Reused passwords hide among decoys.</p>
            <div class="r-dump" id="r-dump"></div>
          </section>
        </div>
        <div class="lv-log" id="r-log"><span class="dim">$ recon --target acme.io, surface mapped, ${st.logins.length} logins found.</span></div>`;
      ctx.layer.appendChild(root);

      renderLogins(); renderDump();
      ctx.setLives(st.attempts, 6); ctx.hudLabel("1/6 Recon"); ctx.setStatus("map the attack surface"); ctx.setProgress(0);
      root.querySelector("#r-foot").textContent = `0 / ${st.need}`;
      wireDnD();
      t0 = performance.now();
      tick();
    },

    onResume() { t0 = performance.now() - st.time * 1000; },

    update() { /* timer handled by its own rAF via tick for pause-awareness */ },

    unmount() { if (timerRaf) cancelAnimationFrame(timerRaf); root && root.remove(); },

    resize() {}
  };

  function tick() {
    timerRaf = requestAnimationFrame(tick);
    if (!ctx.isPlaying() || st.over) { t0 = performance.now() - st.time * 1000; return; }
    st.time = (performance.now() - t0) / 1000;  // elapsed, informational only
    root.querySelector("#r-time").textContent = st.time.toFixed(0) + "s";
    ctx.setProgress(st.got / st.need);
  }

  function renderLogins() {
    const box = root.querySelector("#r-logins");
    box.innerHTML = st.logins.map((l, i) => `
      <div class="r-login ${l.cracked ? "done" : ""}" data-login="${i}" ${l.cracked ? "" : 'data-drop="1"'}>
        <div class="r-login-h"><span class="r-host">${esc(l.host)}</span><span class="r-port">${esc(l.port)}</span></div>
        <div class="r-svc">${esc(l.svc)} · <span class="dim">${esc(l.hint)}</span></div>
        <div class="r-user">user: <b>${esc(l.user)}</b></div>
        ${l.clue ? `<div class="r-clue">⌕ ${esc(l.clue)}</div>` : ""}
        <div class="r-pwslot">${l.cracked ? `<span class="ok">● access granted, ${esc(l.pw)}</span>` : `<span class="dim">password: ········</span>`}</div>
      </div>`).join("");
  }
  function renderDump() {
    const box = root.querySelector("#r-dump");
    box.innerHTML = st.dump.map((d, i) => d.used ? "" : `
      <div class="r-chip" draggable="true" data-pw="${i}">
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="1.6"/></svg>
        ${esc(d.pw)}
      </div>`).join("");
  }
  function log(msg, cls = "") { const l = root.querySelector("#r-log"); const s = document.createElement("span"); if (cls) s.className = cls; s.textContent = msg; l.appendChild(s); l.scrollTop = l.scrollHeight; }

  function attempt(loginIdx, pwIdx) {
    if (st.over) return;
    const login = st.logins[loginIdx], chip = st.dump[pwIdx];
    if (!login || login.cracked || !chip || chip.used) return;
    if (login.pw && login.pw === chip.pw) {
      login.cracked = true; chip.used = true; st.got++;
      C.sfx.good(); ctx.flash("good"); ctx.addScore(300);
      log(`$ login ${login.host} as ${login.user} … OK  [${login.svc}]`, "ok");
      renderLogins(); renderDump(); wireDnD();
      root.querySelector("#r-foot").textContent = `${st.got} / ${st.need}`;
      ctx.setProgress(st.got / st.need);
      if (st.got >= st.need) { st.over = true; log(`$ all ${st.need} credentials cracked, footholds established, pivoting inward.`, "ok"); setTimeout(() => ctx.win(), 700); }
    } else {
      st.attempts--; C.sfx.bad(); ctx.flash("bad"); ctx.setLives(st.attempts, 6);
      log(`$ login ${login.host} as ${login.user} … FAILED (auth log +1)`, "err");
      const node = root.querySelector(`[data-login="${loginIdx}"]`);
      if (node) { node.classList.remove("shake"); void node.offsetWidth; node.classList.add("shake"); }
      if (st.attempts <= 0) fail("Too many failed logins, the account lockout policy locked you out and alerted the SOC.");
    }
  }

  function fail(msg) { if (st.over) return; st.over = true; ctx.lose(); }

  function wireDnD() {
    const chips = root.querySelectorAll(".r-chip");
    const drops = root.querySelectorAll('[data-drop="1"]');
    chips.forEach((chip) => {
      chip.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/pw", chip.dataset.pw); chip.classList.add("dragging"); });
      chip.addEventListener("dragend", () => chip.classList.remove("dragging"));
      // tap-to-select fallback for touch
      chip.addEventListener("click", () => {
        root.querySelectorAll(".r-chip.sel").forEach((c) => c !== chip && c.classList.remove("sel"));
        chip.classList.toggle("sel");
      });
    });
    drops.forEach((d) => {
      d.addEventListener("dragover", (e) => { e.preventDefault(); d.classList.add("over"); });
      d.addEventListener("dragleave", () => d.classList.remove("over"));
      d.addEventListener("drop", (e) => { e.preventDefault(); d.classList.remove("over"); attempt(+d.dataset.login, +e.dataTransfer.getData("text/pw")); });
      d.addEventListener("click", () => {
        const sel = root.querySelector(".r-chip.sel");
        if (sel) { attempt(+d.dataset.login, +sel.dataset.pw); sel.classList.remove("sel"); }
      });
    });
  }

  C.register(level);
})();
