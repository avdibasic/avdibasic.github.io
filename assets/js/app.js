(() => {
  "use strict";
  const S = window.SITE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SUMMARY = "Offensive security specialist conducting in-depth penetration tests across industrial infrastructure, Active Directory, internal networks, external attack surfaces, and web applications. Focused on exposure mapping, network security, and validating blue team detection against MITRE ATT&CK. Other areas of expertise include red teaming, secure code reviews, network segmentation assessments, social engineering, and security awareness training.";
  const contactLines = () => {
    const L = (window.SITE && window.SITE.links) || {}, rows = [];
    const link = (label, url, text) => `<span class="dim">${label.padEnd(10)}</span><a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>`;
    if (L.email) rows.push(link("email:", L.email, L.email.replace(/^mailto:/, "")));
    if (L.github) rows.push(link("github:", L.github, L.github.replace(/^https?:\/\//, "")));
    if (L.linkedin) rows.push(link("linkedin:", L.linkedin, L.linkedin.replace(/^https?:\/\//, "")));
    return rows.join("\n");
  };
  const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  /* ---------------- Theme ---------------- */
  $("#themeBtn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  /* ---------------- whoami ---------------- */
  function renderWhoami() {
    const now = S.experience[0];
    $("#heroRole").textContent = SUMMARY;
    $("#nowRole").innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(now.role)} at ${esc(now.org)}`;
    $("#nowPlace").textContent = S.location;

    const L = S.links, links = [];
    if (L.github) links.push(`<a class="btn primary" href="${esc(L.github)}" rel="me noopener" target="_blank">GitHub</a>`);
    if (L.linkedin) links.push(`<a class="btn" href="${esc(L.linkedin)}" rel="me noopener" target="_blank">LinkedIn</a>`);
    if (L.email) links.push(`<a class="btn" href="${esc(L.email)}">Email</a>`);
    $("#heroLinks").innerHTML = links.join("");

    // escape first, then turn [label](https://url) into a safe link (brackets survive escaping)
    const linkify = (s) => esc(s).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, label, url) => `<a href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`);
    $("#bio").innerHTML = S.bio.map((p) => `<p>${linkify(p)}</p>`).join("");
    $("#focus").innerHTML = S.focus.map((f) => `<li>${esc(f)}</li>`).join("");

    $("#experience").innerHTML = S.experience.map((e, i) => `
      <li class="${i === 0 && e.to === "Present" ? "current" : ""}">
        <div class="when">${esc(e.from)} – ${esc(e.to)}</div>
        <div class="what">${esc(e.role)}</div>
        <div class="where"><b>${esc(e.org)}</b>${e.place ? ", " + esc(e.place) : ""}</div>
      </li>`).join("");

    $("#education").innerHTML = S.education.map((e) => `
      <li>
        <div class="when">${esc(e.from)} – ${esc(e.to)}</div>
        <div class="what">${esc(e.degree)}</div>
        <div class="where"><b>${esc(e.org)}</b>${e.place ? ", " + esc(e.place) : ""}${e.note ? " · " + esc(e.note) : ""}</div>
      </li>`).join("");
  }

  /* The one orchestrated moment: type `whoami`, then decode the name. */
  let heroPlayed = false;
  function playHero() {
    if (heroPlayed) return;
    heroPlayed = true;
    const typed = $("#typed"), nameEl = $("#heroName"), role = $("#heroRole");
    const cmd = "whoami", final = S.name;
    if (reduceMotion) { typed.textContent = cmd; return; }

    nameEl.style.visibility = "hidden";
    role.style.opacity = "0";
    let i = 0;
    const typeNext = () => {
      typed.textContent = cmd.slice(0, ++i);
      if (i < cmd.length) setTimeout(typeNext, 70 + Math.random() * 60);
      else setTimeout(decode, 280);
    };
    const pool = "!<>-_\\/[]{}=+*^?#01ABCDEFabcdef";
    const decode = () => {
      nameEl.style.visibility = "visible";
      const start = performance.now(), dur = 900;
      const frame = (t) => {
        const p = Math.min(1, (t - start) / dur);
        const fixed = Math.floor(p * final.length);
        let out = "";
        for (let k = 0; k < final.length; k++) {
          const ch = final[k];
          out += k < fixed || ch === " " ? ch : pool[(Math.random() * pool.length) | 0];
        }
        nameEl.textContent = out;
        if (p < 1) requestAnimationFrame(frame);
        else {
          nameEl.textContent = final;
          role.style.transition = "opacity .5s ease";
          role.style.opacity = "1";
        }
      };
      requestAnimationFrame(frame);
    };
    setTimeout(typeNext, 350);
  }

  /* ---------------- Blog ---------------- */
  let activeTag = "all";
  function renderBlog() {
    const tags = ["all", ...new Set(S.posts.flatMap((p) => p.tags))];
    $("#tagFilter").innerHTML = tags.map((t) =>
      `<button type="button" data-tag="${esc(t)}" aria-pressed="${t === activeTag}">${t === "all" ? "All posts" : esc(t)}</button>`).join("");
    const list = S.posts
      .filter((p) => activeTag === "all" || p.tags.includes(activeTag))
      .sort((a, b) => b.date.localeCompare(a.date));
    $("#posts").innerHTML = list.length ? list.map((p) => `
      <a class="post-row" href="#blog/${esc(p.slug)}">
        <time datetime="${esc(p.date)}">${fmtDate(p.date)}</time>
        <div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.summary)}</p>
          <div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </div>
      </a>`).join("") : `<p class="empty">No posts tagged ${esc(activeTag)} yet.</p>`;
  }
  $("#tagFilter").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tag]");
    if (!b) return;
    activeTag = b.dataset.tag;
    renderBlog();
  });

  function readTime(html) {
    const words = String(html || "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  function renderPost(slug) {
    const p = S.posts.find((x) => x.slug === slug);
    $("#article").innerHTML = p ? `
      <a class="btn back" href="#blog">Back to blog</a>
      <div class="meta"><time datetime="${esc(p.date)}">${fmtDate(p.date)}</time> / ${p.tags.map(esc).join(", ")} / ${readTime(p.body)} min read</div>
      <h1>${esc(p.title)}</h1>
      ${p.body}` : `
      <a class="btn back" href="#blog">Back to blog</a>
      <h1>Post not found</h1>
      <p>No post lives at <code>${esc(slug)}</code>. It may have been renamed; the blog lists everything that is published.</p>`;
    document.title = (p ? p.title : "Not found") + " · Tarik Avdibasic";
    if (p) inlineSvgImages($("#article"));
  }

  // Replace <img> SVG figures with the inline SVG so they inherit the page's
  // theme CSS variables and flip with the light/dark toggle. Falls back to the
  // plain <img> if the fetch or parse fails.
  function inlineSvgImages(scope) {
    if (!scope) return;
    scope.querySelectorAll('img.post-img[src$=".svg"]').forEach(async (img) => {
      try {
        const res = await fetch(img.getAttribute("src"), { cache: "no-cache" });
        if (!res.ok) return;
        const doc = new DOMParser().parseFromString(await res.text(), "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!svg || doc.querySelector("parsererror")) return;
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("class", "post-svg");
        if (img.alt) { svg.setAttribute("role", "img"); svg.setAttribute("aria-label", img.alt); }
        img.replaceWith(svg);
      } catch (e) { /* keep the <img> fallback */ }
    });
  }

  /* ---------------- Research ---------------- */
  function renderResearch() {
    $("#research").innerHTML = S.research.map((r) => {
      const cls = r.status.replace(/\s+/g, "-");
      const inner = `
        <div class="top"><span>${esc(r.area)} / ${esc(r.year)}</span><span class="state ${esc(cls)}">${esc(r.status)}</span></div>
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.summary)}</p>`;
      return r.url
        ? `<a class="rcard" href="${esc(r.url)}" target="_blank" rel="noopener" style="text-decoration:none">${inner}</a>`
        : `<div class="rcard">${inner}</div>`;
    }).join("");
  }

  /* ---------------- Tools ---------------- */
  let reposLoaded = false;
  async function loadRepos() {
    if (reposLoaded) return;
    reposLoaded = true;
    const box = $("#repos");
    // pinned (private / in-progress) repos always show, they are not on the public API
    const pinned = (S.pinnedRepos || []).map((r) => `
      <div class="repo is-pinned">
        <span class="rn">${esc(r.name)}${r.status ? ` <span class="repo-badge">${esc(r.status)}</span>` : ""}</span>
        <span class="rd">${esc(r.description || "")}</span>
        <span class="rm">${r.private ? "<span>Private</span>" : ""}<span>not yet public</span></span>
      </div>`).join("");
    box.innerHTML = pinned + '<div class="skeleton"></div>'.repeat(3);
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(S.github)}/repos?sort=updated&per_page=100`);
      if (!res.ok) throw new Error("GitHub answered " + res.status);
      const repos = (await res.json())
        .filter((r) => !r.fork && r.name.toLowerCase() !== `${S.github}.github.io`)
        .sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at))
        .slice(0, 9);
      const live = repos.map((r) => `
        <a class="repo" href="${esc(r.html_url)}" target="_blank" rel="noopener">
          <span class="rn">${esc(r.name)}</span>
          <span class="rd">${esc(r.description || "No description yet.")}</span>
          <span class="rm">${r.language ? `<span>${esc(r.language)}</span>` : ""}<span>★ ${r.stargazers_count}</span><span>updated ${fmtDate(r.pushed_at.slice(0, 10))}</span></span>
        </a>`).join("");
      box.innerHTML = pinned + (live || (pinned ? "" : `<p class="empty">No public repositories yet. New ones on github.com/${esc(S.github)} appear here automatically.</p>`));
    } catch (err) {
      reposLoaded = false;
      box.innerHTML = pinned + `<p class="empty">Could not load the public repositories (${esc(err.message)}). <a href="${esc(S.links.github)}" target="_blank" rel="noopener">Open GitHub profile</a> or reload the tab to try again.</p>`;
    }
  }
  function renderArsenal() {
    $("#arsenal").innerHTML = S.arsenal.map((g) => `
      <div><h3>${esc(g.area)}</h3><ul>${g.tools.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>`).join("");
  }

  /* ---------------- Certs ---------------- */
  let certGroup = "all";
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function issuedTime(c) {
    const m = String(c.issued || "").trim().match(/([A-Za-z]{3})\w*\s+(\d{4})/);
    if (!m) return 0;
    return new Date(+m[2], MONTHS[m[1].toLowerCase()] ?? 0, 1).getTime();
  }
  function renderCerts() {
    $("#certs").innerHTML = S.certs
      .filter((c) => certGroup === "all" || c.group === certGroup)
      .slice()
      .sort((a, b) => issuedTime(b) - issuedTime(a))   // newest first
      .map((c) => `
      <article class="cert ${esc(c.group)}">
        <div class="badge" aria-hidden="true">${esc(c.short)}</div>
        <div>
          <h3>${esc(c.name)}</h3>
          <p class="iss">${esc(c.issuer)}</p>
          <dl>
            <dt>issued</dt><dd>${esc(c.issued)}</dd>
            ${c.expires ? `<dt>expires</dt><dd>${esc(c.expires)}</dd>` : ""}
            ${c.id ? `<dt>id</dt><dd>${esc(c.id)}</dd>` : ""}
          </dl>
          ${c.url ? `<a class="verify" href="${esc(c.url)}" target="_blank" rel="noopener">Verify credential</a>` : ""}
        </div>
      </article>`).join("");
  }
  $("#certFilter").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-g]");
    if (!b) return;
    certGroup = b.dataset.g;
    $$("#certFilter button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    renderCerts();
  });

  /* ---------------- Shell ---------------- */
  const out = $("#termOut"), input = $("#termInput");
  const hist = []; let hIdx = 0;
  let shellUser = "guest";                         // becomes "avdibasic" after privesc
  const ROOT_SHELL_FLAG = "FLAG{priv_esc_to_avdibasic}";
  function setPrompt() {
    const p = $("#termPrompt");
    if (p) p.textContent = `${shellUser}@avdibasic:~$`;
  }
  const secretFiles = {
    "note.txt": () =>
`# left here by a lazy admin
guest is allowed to run exactly one thing as the avdibasic user: the
backup script /opt/backup.sh (check sudo -l). the script is world-
writable, so whatever it contains runs as avdibasic, a classic sudo-
entry abuse:

    sudo -l                           # confirm the one command you may run
    sudo -u avdibasic /opt/backup.sh  # run it as that user

then read root.flag.`,
    "root.flag": () => shellUser === "avdibasic"
      ? `<span class="ok">${esc(ROOT_SHELL_FLAG)}</span>\nNice, you found a way to escalate yourself from guest to avdibasic. You definitely demonstrate the skills needed in the cyber industry ;) Keep up the good work!`
      : "cat: secrets/root.flag: Permission denied (you are guest). Escalate first."
  };
  function escalate(viaWhat) {
    if (shellUser === "avdibasic") { print("you are already avdibasic.", "dim"); return; }
    shellUser = "avdibasic"; setPrompt();
    print(`<span class="ok">[+] privilege escalation succeeded${viaWhat ? " via " + esc(viaWhat) : ""}.</span> you are now <b>avdibasic</b>.`);
    print(`run <b>cat secrets/root.flag</b> to grab the flag.`, "dim");
  }
  const files = {
    "about.txt": () => S.bio.join("\n\n"),
    "contact.txt": () => Object.entries(S.links).filter(([, v]) => v).map(([k, v]) => `${k.padEnd(9)} ${v.replace("mailto:", "")}`).join("\n"),
    "focus.txt": () => S.focus.map((f) => "- " + f).join("\n")
  };
  const print = (html, cls = "") => {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    d.innerHTML = html;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  };
  const tabsList = ["whoami", "blog", "research", "approach", "tools", "certs", "shell", "ctf"];
  const commands = {
    help: () => print(
`<span class="dim">available commands</span>
  whoami          who runs this site
  contact         how to reach me
  experience      engagement history
  education       degrees
  certs           certifications (certs --verify for links)
  posts           list blog posts
  read &lt;n&gt;        open blog post number n
  research        current research
  ls [dir]        list files (try: ls secrets/)
  cat &lt;file&gt;      print a file
  sudo -l         what can you run?  (there's a way from guest to root…)
  open &lt;tab&gt;      switch tab: ${tabsList.join(", ")}
  play            launch the CTF range
  theme           toggle light / dark
  history         previous commands
  clear           clear the screen`),
    whoami: () => print(shellUser === "avdibasic"
      ? `avdibasic\n<span class="ok">${esc(S.name)}</span>\n<span class="dim">${esc(SUMMARY)}</span>\n${contactLines()}`
      : `guest\n<span class="dim">read-only visitor. there may be a way up… try: ls secrets/</span>`),
    contact: () => print(contactLines() || "no contact listed"),
    experience: () => print(S.experience.map((e) => `<span class="ok">${esc((e.from + " – " + e.to).padEnd(22))}</span>${esc(e.role)} @ ${esc(e.org)}`).join("\n")),
    education: () => print(S.education.map((e) => `<span class="ok">${esc((e.from + " – " + e.to).padEnd(22))}</span>${esc(e.degree)}, ${esc(e.org)}`).join("\n")),
    certs: (args) => print(S.certs.map((c) =>
      `<span class="ok">${esc(c.short.padEnd(8))}</span>${esc(c.name)} <span class="dim">(${esc(c.issuer)}, ${esc(c.issued)})</span>` +
      (args[0] === "--verify" && c.url ? `\n${" ".repeat(8)}<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.url)}</a>` : "")).join("\n")),
    posts: () => print(S.posts.map((p, i) => `[${i + 1}] ${esc(p.date)}  ${esc(p.title)}`).join("\n") + `\n<span class="dim">read &lt;n&gt; to open one</span>`),
    read: (args) => {
      const p = S.posts[parseInt(args[0], 10) - 1];
      if (!p) return print(`read: give a post number between 1 and ${S.posts.length}. Run posts to list them.`, "err");
      location.hash = "blog/" + p.slug;
    },
    research: () => print(S.research.map((r) => `<span class="ok">[${esc(r.status)}]</span> ${esc(r.title)}`).join("\n")),
    ls: (args) => {
      const d = args[0] && args[0].replace(/\/$/, "");
      if (d === "secrets") return print(Object.keys(secretFiles).join("    "));
      print(Object.keys(files).join("    ") + `    <span class="dim">secrets/</span>`);
    },
    cat: (args) => {
      let f = args[0];
      if (!f) return print("cat: name a file. Run ls to list them.", "err");
      if (f.startsWith("secrets/")) {
        const name = f.slice("secrets/".length);
        if (!secretFiles[name]) return print(`cat: ${esc(f)}: No such file. Try: ls secrets/`, "err");
        return print(secretFiles[name]());  // may contain safe markup
      }
      if (f === "secrets") return print("cat: secrets: Is a directory. Try: ls secrets/", "err");
      if (!files[f]) return print(`cat: ${esc(f)}: No such file. Run ls to list them.`, "err");
      print(esc(files[f]()));
    },
    "sudo-l": () => {},  // placeholder (handled in sudo)
    sudo: (args) => {
      const sub = args.join(" ").trim();
      if (sub === "-l") return print(
`User guest may run the following commands on avdibasic.github.io:
    (avdibasic) NOPASSWD: /opt/backup.sh
<span class="dim"># that's the only thing guest may run as avdibasic, and it's world-writable. run it, as that user.</span>`);
      // Intended path: abuse the one permitted (world-writable) script by running it as avdibasic.
      if (/^-u\s+avdibasic\s+(\/opt\/)?backup\.sh$/.test(sub)) return escalate("sudo -u avdibasic /opt/backup.sh");
      // Right script, but no runas user means root, which this entry does not permit. Nudge.
      if (/^(\/opt\/)?backup\.sh$/.test(sub)) return print(`sudo: you may run /opt/backup.sh as <b>avdibasic</b>, not root. Try: sudo -u avdibasic /opt/backup.sh`, "err");
      // Trying to run anything else as avdibasic is blocked, reinforces "only what sudo -l allows".
      if (/^-u\s+avdibasic\b/.test(sub)) {
        const what = sub.replace(/^-u\s+avdibasic\s*/, "").trim() || "that command";
        return print(`sudo: sorry, user guest is not allowed to execute ${esc(what)} as avdibasic.\nguest may only run <b>/opt/backup.sh</b>. Try: sudo -l`, "err");
      }
      print("guest may run very little. Try: sudo -l", "err");
    },
    su: () => {
      // su needs a password guest doesn't have, the sudo misconfig is the real way up.
      print(`su: Authentication failure.\n<span class="dim">you don't have avdibasic's password. check what guest is allowed to run instead: sudo -l</span>`, "err");
    },
    open: (args) => {
      if (!tabsList.includes(args[0])) return print(`open: unknown tab. Choose one of: ${tabsList.join(", ")}`, "err");
      location.hash = args[0];
    },
    play: () => { location.hash = "ctf"; },
    theme: () => { $("#themeBtn").click(); print("theme switched", "dim"); },
    history: () => print(hist.map((h, i) => `${String(i + 1).padStart(4)}  ${esc(h)}`).join("\n") || "no history yet", "dim"),
    clear: () => { out.innerHTML = ""; },
    nmap: () => print("Starting Nmap against avdibasic.github.io\n443/tcp open  https  (GitHub Pages)\n<span class=\"dim\">Nothing else to see. Out of scope anyway.</span>"),
    exit: () => { location.hash = "whoami"; }
  };
  commands.ll = commands.ls;
  commands["?"] = commands.help;

  function runCmd(raw) {
    const line = raw.trim();
    if (!line) return;
    print(esc(line), "cmd");
    hist.push(line); hIdx = hist.length;
    const [name, ...args] = line.split(/\s+/);
    const fn = commands[name.toLowerCase()];
    if (fn) fn(args);
    else print(`${esc(name)}: command not found. Type help to see the commands.`, "err");
  }
  $("#termForm").addEventListener("submit", (e) => { e.preventDefault(); runCmd(input.value); input.value = ""; });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp" && hIdx > 0) { input.value = hist[--hIdx]; e.preventDefault(); }
    else if (e.key === "ArrowDown") { hIdx = Math.min(hist.length, hIdx + 1); input.value = hist[hIdx] || ""; e.preventDefault(); }
    else if (e.key === "Tab") {
      e.preventDefault();
      const v = input.value.toLowerCase();
      const m = Object.keys(commands).filter((c) => c.startsWith(v) && c.length > 1);
      if (m.length === 1) input.value = m[0] + " ";
      else if (m.length > 1) print(m.join("  "), "dim");
    }
  });
  $("#term").addEventListener("click", (e) => { if (!e.target.closest("a")) input.focus(); });
  let shellBooted = false;
  function bootShell() {
    setPrompt();
    if (shellBooted) return;
    shellBooted = true;
    print(`<span class="ok">avdibasic.github.io</span> <span class="dim">interactive shell. Type help to begin.</span>`);
  }

  /* ---------------- CTF3D (loaded only when the tab opens) ---------------- */
  const GAME_SCRIPTS = [
    "assets/vendor/three/three.min.js",
    "assets/vendor/three/Pass.js",
    "assets/vendor/three/CopyShader.js",
    "assets/vendor/three/LuminosityHighPassShader.js",
    "assets/vendor/three/ShaderPass.js",
    "assets/vendor/three/MaskPass.js",
    "assets/vendor/three/EffectComposer.js",
    "assets/vendor/three/RenderPass.js",
    "assets/vendor/three/UnrealBloomPass.js",
    "assets/js/ctf/core.js",
    "assets/js/ctf/level-recon.js",
    "assets/js/ctf/level-runner.js",
    "assets/js/ctf/level-webapp.js",
    "assets/js/ctf/level-ad.js",
    "assets/js/ctf/level-ot.js",
    "assets/js/ctf/level-physical.js"
  ];
  const BUILD = "20261109c";   // bump to force browsers past cached game scripts
  const loadScript = (src) => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src + (src.includes("?") ? "&" : "?") + "v=" + BUILD;
    s.onload = res; s.onerror = () => rej(new Error("could not load " + src));
    document.head.appendChild(s);
  });
  let gameLoad = null;
  async function openGame() {
    if (!gameLoad) gameLoad = GAME_SCRIPTS.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve());
    try {
      await gameLoad;
      if (location.hash.replace("#", "") === "ctf") window.CTF3D.show($("#game"));
    } catch (err) {
      gameLoad = null;
      $("#game").innerHTML = `<p class="empty">The game did not load (${esc(err.message)}). Check that the assets/vendor folder was uploaded, then reload this tab.</p>`;
    }
  }

  /* ---------------- Career Road (3D CV) — loads three on demand ---------------- */
  const CV_SCRIPTS = [
    "assets/vendor/three/three.min.js",
    "assets/vendor/three/Pass.js",
    "assets/vendor/three/CopyShader.js",
    "assets/vendor/three/LuminosityHighPassShader.js",
    "assets/vendor/three/ShaderPass.js",
    "assets/vendor/three/MaskPass.js",
    "assets/vendor/three/EffectComposer.js",
    "assets/vendor/three/RenderPass.js",
    "assets/vendor/three/UnrealBloomPass.js"
  ];
  let cvLoad = null;
  async function mountCareerRoad() {
    const stageEl = document.getElementById("cvStage");
    if (!stageEl || !window.CV) return;
    if (window.THREE) { window.CV.mount(stageEl); return; }
    if (!cvLoad) cvLoad = CV_SCRIPTS.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve());
    try {
      await cvLoad;
      if ((location.hash.replace("#", "") || "whoami") === "whoami") window.CV.mount(stageEl);
    } catch (err) {
      cvLoad = null;
      const wrap = document.getElementById("cvCanvasWrap");
      if (wrap) wrap.innerHTML = `<p class="empty" style="padding:1.5rem">The 3D career road needs WebGL and the assets/vendor folder. ${esc(err.message)}</p>`;
    }
  }

  /* ---------------- Router ---------------- */
  function route() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, "")) || "whoami";
    let view = hash, tab = hash;
    if (hash.startsWith("blog/")) { view = "post"; tab = "blog"; renderPost(hash.slice(5)); }
    if (hash === "approach" || hash.startsWith("approach/")) { view = "approach"; tab = "approach"; if (window.Approach) window.Approach.render(hash); }
    if (!$(`[data-view="${view}"]`)) { view = tab = "whoami"; }

    $$(".view").forEach((v) => { v.hidden = v.dataset.view !== view; });
    $$(".tabs a").forEach((a) => {
      if (a.dataset.tab === tab) { a.setAttribute("aria-current", "page"); a.scrollIntoView({ block: "nearest", inline: "nearest" }); }
      else a.removeAttribute("aria-current");
    });
    $("#promptPath").textContent = "~/" + (view === "post" ? hash : tab);
    if (view !== "post") document.title = (tab === "whoami" ? "Tarik Avdibasic · Penetration Tester" : tab[0].toUpperCase() + tab.slice(1) + " · Tarik Avdibasic");

    if (tab === "whoami") { playHero(); mountCareerRoad(); }
    if (tab === "tools") loadRepos();
    if (tab === "shell") { bootShell(); setTimeout(() => input.focus(), 0); }
    if (tab === "ctf") openGame(); else if (window.CTF3D) window.CTF3D.hide();
    window.scrollTo(0, 0);
  }

  /* ---------------- Boot ---------------- */
  renderWhoami(); renderBlog(); renderResearch(); renderArsenal(); renderCerts();
  $("#year").textContent = new Date().getFullYear();
  window.addEventListener("hashchange", route);
  route();

  // Pull Markdown content (blog/research/about) and re-render once it's in.
  if (typeof window.loadContent === "function") {
    window.loadContent(() => {
      renderWhoami(); renderBlog(); renderResearch();
      const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
      if (hash.startsWith("blog/")) renderPost(hash.slice(5));  // refresh an open post
    });
  }
})();
