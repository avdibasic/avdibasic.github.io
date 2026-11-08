/* Level 3, Web app. Exploit a vulnerable application endpoint by endpoint.
   Each endpoint has a vuln class; you pick the payload that exploits it from
   a small set. Right payload = breach; a WAF catches obviously wrong tries. */
(() => {
  "use strict";
  const C = window.CTF, esc = C.esc;

  // Each challenge: an endpoint, the vuln, and 4 candidate payloads (one correct).
  const BANK = [
    {
      ep: "POST /api/login", vuln: "Authentication / SQL injection",
      desc: "The login form builds its SQL query by hand. The response leaks a SQL error on bad input.",
      field: "username",
      options: [
        { p: "admin' OR '1'='1' -- ", ok: true, note: "Always-true condition comments out the password check." },
        { p: "<script>alert(1)</script>", why: "That is XSS, wrong class for a login bypass." },
        { p: "../../etc/passwd", why: "Path traversal doesn't help against a SQL login." },
        { p: "admin&password=admin", why: "Guessing credentials, not exploiting the flaw." }
      ],
      got: "logged in as admin"
    },
    {
      ep: "GET /download?file=", vuln: "Path traversal",
      desc: "A file download endpoint takes a filename straight from the URL with no checks.",
      field: "file",
      options: [
        { p: "....//....//etc/shadow", ok: true, note: "Traverses out of the web root to read a sensitive file." },
        { p: "' UNION SELECT NULL--", why: "SQL injection, but this endpoint reads files, not a database." },
        { p: "report.pdf", why: "A legitimate file. No exploit here." },
        { p: "{{7*7}}", why: "Template injection, wrong class for a file read." }
      ],
      got: "read /etc/shadow"
    },
    {
      ep: "GET /profile?name=", vuln: "Reflected XSS",
      desc: "The page echoes the name parameter back into HTML without encoding it.",
      field: "name",
      options: [
        { p: "<img src=x onerror=steal()>", ok: true, note: "Executes script in a victim's browser to steal their session." },
        { p: "admin' -- ", why: "SQL injection, this value is reflected, not queried." },
        { p: "../../../../etc/hosts", why: "Path traversal, wrong class for a reflected value." },
        { p: "%00", why: "A null byte alone does nothing here." }
      ],
      got: "stole an admin session cookie"
    },
    {
      ep: "POST /render", vuln: "Server-side template injection",
      desc: "User input is passed into a server-side template engine before rendering.",
      field: "template",
      options: [
        { p: "{{ config.__class__ }}", ok: true, note: "Breaks out of the template to reach the server runtime." },
        { p: "' OR 1=1 -- ", why: "SQL injection, this reaches a template engine, not a DB." },
        { p: "<b>hi</b>", why: "Harmless HTML. The template engine, not the browser, is the target." },
        { p: "file:///etc/passwd", why: "An SSRF-style URL, not a template break-out." }
      ],
      got: "executed code on the server"
    },
    {
      ep: "GET /api/orders?id=", vuln: "Broken access control (IDOR)",
      desc: "Each order is fetched by a numeric id taken straight from the URL, with no check that the order belongs to you.",
      field: "id",
      options: [
        { p: "1002", ok: true, note: "Swapping your id for another user's returns their order. There is no ownership check." },
        { p: "' OR '1'='1", why: "SQL injection, but the flaw here is missing authorization, not a broken query." },
        { p: "<script>alert(1)</script>", why: "XSS, wrong class. The id is used server-side, not reflected." },
        { p: "../../etc/passwd", why: "Path traversal, but this id selects a record, not a file." }
      ],
      got: "read another customer's order"
    },
    {
      ep: "POST /api/ping", vuln: "OS command injection",
      desc: "The host parameter is dropped straight into a shell ping command on the server.",
      field: "host",
      options: [
        { p: "127.0.0.1; cat /etc/passwd", ok: true, note: "The semicolon chains a second shell command after the ping." },
        { p: "' OR 1=1 -- ", why: "SQL injection, but this value reaches a shell, not a database." },
        { p: "{{7*7}}", why: "Template injection, wrong class for a shell command." },
        { p: "127.0.0.1", why: "A valid host. It pings normally with no injection." }
      ],
      got: "ran commands on the server"
    },
    {
      ep: "POST /api/fetch", vuln: "Server-side request forgery (SSRF)",
      desc: "The server fetches whatever URL you give it to build a link preview, with no allow-list.",
      field: "url",
      options: [
        { p: "http://169.254.169.254/latest/meta-data/", ok: true, note: "Points the server at the cloud metadata service to steal instance credentials." },
        { p: "<img src=x onerror=1>", why: "XSS, but the server makes the request here, not a browser." },
        { p: "https://example.com", why: "A normal external URL. No internal access is gained." },
        { p: "admin' -- ", why: "SQL injection, wrong class for a server-side fetch." }
      ],
      got: "reached the cloud metadata endpoint"
    },
    {
      ep: "POST /api/import", vuln: "XML external entity (XXE)",
      desc: "An uploaded XML document is parsed with external entities left enabled.",
      field: "xml",
      options: [
        { p: "<!DOCTYPE d [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><d>&x;</d>", ok: true, note: "Declares an external entity that the parser expands into a local file." },
        { p: "{{ config }}", why: "Template injection, but this input is parsed as XML." },
        { p: "' UNION SELECT NULL--", why: "SQL injection, wrong class for an XML parser." },
        { p: "<user>bob</user>", why: "Well-formed XML with no entity. It imports normally." }
      ],
      got: "read a server file through the XML parser"
    },
    {
      ep: "GET /api/admin", vuln: "JWT auth bypass (alg: none)",
      desc: "The API accepts JSON Web Tokens but does not pin the signing algorithm, so it trusts an unsigned token.",
      field: "Authorization",
      options: [
        { p: "eyJhbGciOiJub25lIn0.eyJyb2xlIjoiYWRtaW4ifQ.", ok: true, note: "A token with alg none and role admin, accepted with no signature to verify." },
        { p: "Bearer guest", why: "Just a plain word, not a forged token." },
        { p: "' OR '1'='1", why: "SQL injection, wrong class for a token check." },
        { p: "../../../etc/passwd", why: "Path traversal, but the flaw here is token verification." }
      ],
      got: "forged an admin token"
    },
    {
      ep: "POST /api/session", vuln: "NoSQL injection",
      desc: "The login query passes the JSON body straight into a MongoDB find, so operators in the input become query operators.",
      field: "password",
      options: [
        { p: '{"$ne": null}', ok: true, note: "The not-equal operator matches any password, bypassing the check." },
        { p: "admin' -- ", why: "Classic SQL injection, but this backend is MongoDB, not SQL." },
        { p: "<script>alert(1)</script>", why: "XSS, wrong class for a database query." },
        { p: "password123", why: "A literal guess. No operator is injected." }
      ],
      got: "logged in without a valid password"
    }
  ];

  const st = {};
  let ctx, root;

  const level = {
    id: "webapp", order: 3, name: "WebApp", target: "Customer portal",
    kind: "Exploit puzzle", bonus: 900, cta: "Open interception proxy",
    brief: "You proxy the application's traffic and probe each endpoint. Every input is a question: does the server trust what I send it? Read each endpoint, work out the vulnerability class, and choose the payload that exploits it. Send the wrong class and the web application firewall logs you.",
    flag: "FLAG{never_trust_user_input}",
    real: "Web apps accept input from anyone on the internet. When they trust that input, in a SQL query, a file path, a page, or a template, attackers turn it into data theft or code execution. Validating and encoding every input is the fix behind most of the OWASP Top 10.",
    legend: [
      { icon: "lg-port", text: "Pick the payload that matches the endpoint's flaw" },
      { icon: "lg-cred", text: "Breach all endpoints to capture the flag" },
      { icon: "lg-laser", text: "Wrong vulnerability class trips the WAF" }
    ],

    mount(context) {
      ctx = context;
      const order = [...BANK].sort(() => Math.random() - 0.5);
      Object.assign(st, { bank: order, i: 0, lives: 5, done: 0, over: false, answered: false });
      root = document.createElement("div");
      root.className = "lv lv-web";
      root.innerHTML = `
        <div class="lv-top">
          <div class="lv-stat"><span>Endpoint</span><b id="w-prog">1 / ${order.length}</b></div>
          <div class="lv-stat"><span>WAF strikes left</span><b id="w-lives">5</b></div>
        </div>
        <div class="lv-web-main">
          <div class="w-req" id="w-req"></div>
          <div class="w-opts" id="w-opts"></div>
          <div class="w-resp" id="w-resp"><span class="dim">Response pane, pick a payload to send.</span></div>
        </div>`;
      ctx.layer.appendChild(root);
      ctx.setLives(5, 5); ctx.hudLabel("3/6 WebApp"); ctx.setStatus("probing endpoints"); ctx.setProgress(0);
      renderChallenge();
    },

    unmount() { root && root.remove(); },
    resize() {}, update() {}
  };

  function renderChallenge() {
    const ch = st.bank[st.i];
    st.answered = false;
    root.querySelector("#w-prog").textContent = `${st.i + 1} / ${st.bank.length}`;
    root.querySelector("#w-req").innerHTML = `
      <div class="w-ep"><span class="w-verb">${esc(ch.ep.split(" ")[0])}</span> ${esc(ch.ep.split(" ").slice(1).join(" "))}</div>
      <div class="w-vuln">Suspected: <b>${esc(ch.vuln)}</b></div>
      <p class="w-desc">${esc(ch.desc)}</p>
      <div class="w-field">${esc(ch.field)} = <span class="dim">▮</span></div>`;
    // Build a freshly shuffled display list of the option OBJECTS themselves, so the
    // button carries a direct reference to its option (no index bookkeeping that can drift).
    const shown = ch.options.slice();
    for (let k = shown.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; [shown[k], shown[j]] = [shown[j], shown[k]]; }
    st.shown = shown;
    const opts = shown.map((o, pos) => `<button class="w-opt" data-pos="${pos}"><code>${esc(o.p)}</code></button>`).join("");
    root.querySelector("#w-opts").innerHTML = opts;
    root.querySelector("#w-resp").innerHTML = `<span class="dim">Response pane, pick a payload to send.</span>`;
    root.querySelectorAll(".w-opt").forEach((b) => b.addEventListener("click", () => choose(+b.dataset.pos, b)));
  }

  function choose(pos, btn) {
    if (st.answered || st.over) return;
    const ch = st.bank[st.i], opt = st.shown[pos];   // the exact option that was shown in this slot
    st.answered = true;
    const btns = root.querySelectorAll(".w-opt");
    btns.forEach((b) => (b.disabled = true));
    const resp = root.querySelector("#w-resp");
    if (opt.ok) {
      btn.classList.add("good");
      C.sfx.good(); ctx.flash("good"); ctx.addScore(250);
      resp.innerHTML = `<span class="ok">HTTP/1.1 200 OK</span>\n<span class="dim"># ${esc(opt.note)}</span>\n<span class="ok">▶ ${esc(ch.got)}</span>`;
      st.done++;
      setTimeout(() => {
        st.i++;
        ctx.setProgress(st.done / st.bank.length);
        if (st.i >= st.bank.length) { st.over = true; ctx.win(); } else renderChallenge();
      }, 1100);
    } else {
      btn.classList.add("bad");
      st.lives--; C.sfx.bad(); ctx.flash("bad"); ctx.setLives(st.lives, 5);
      resp.innerHTML = `<span class="err">HTTP/1.1 403 Forbidden, WAF</span>\n<span class="dim"># ${esc(opt.why)}</span>`;
      if (st.lives <= 0) { st.over = true; setTimeout(() => ctx.lose(), 500); return; }
      setTimeout(() => { st.answered = false; btns.forEach((b) => { b.disabled = false; b.classList.remove("bad"); }); }, 1100);
    }
  }

  C.register(level);
})();
