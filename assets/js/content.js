/* =========================================================================
   Content loader, pulls blog posts, research entries and the About text
   from Markdown files under /content, listed in window.SITE.content.
   No build step: files are fetched at runtime. If fetching fails (e.g. opening
   index.html straight from disk in some browsers), the site falls back to the
   inline defaults already in data.js, so it always renders something.
   ========================================================================= */
(() => {
  "use strict";
  const S = window.SITE;

  /* ---- tiny front-matter parser: ---\nkey: value\n---\nbody ---- */
  function parseFrontMatter(text) {
    const m = text.match(/^\uFEFF?---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!m) return { meta: {}, body: text.trim() };
    const meta = {};
    m[1].split("\n").forEach((line) => {
      const i = line.indexOf(":");
      if (i === -1) return;
      const key = line.slice(0, i).trim();
      let val = line.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      meta[key] = val;
    });
    return { meta, body: m[2].trim() };
  }

  /* ---- minimal, safe Markdown → HTML (headings, bold/italic/code, links, lists, paragraphs) ---- */
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, (_, t) => `<code>${t}</code>`);
    s = s.replace(/\*\*([^*]+)\*\*/g, (_, t) => `<strong>${t}</strong>`);
    s = s.replace(/(^|[^*])\*([^*]+)\*/g, (_, a, t) => `${a}<em>${t}</em>`);
    // images ![alt](src), relative or absolute, before the link rule
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img class="post-img" src="${src}" alt="${alt}" loading="lazy">`);
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
    return s;
  }
  function mdToHtml(md) {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let para = [], list = null, code = null;
    const flushPara = () => { if (para.length) { html.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
    const flushList = () => { if (list) { html.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`); list = null; } };
    for (const raw of lines) {
      const line = raw.trimEnd();
      let m;
      if (code !== null) {                                   // inside a fenced code block
        if (/^```/.test(line.trim())) { html.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`); code = null; }
        else code.push(raw);
        continue;
      }
      if (/^```/.test(line.trim())) { flushPara(); flushList(); code = []; continue; }
      if (!line.trim()) { flushPara(); flushList(); continue; }
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flushPara(); flushList(); const lvl = Math.min(m[1].length + 1, 4); html.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`); continue; }
      if ((m = line.match(/^[-*]\s+(.*)$/))) { flushPara(); (list = list || []).push(m[1]); continue; }
      flushList(); para.push(line.trim());
    }
    if (code !== null) html.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
    flushPara(); flushList();
    return html.join("\n");
  }

  async function fetchText(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status + " " + path);
    return res.text();
  }

  async function loadAbout(file) {
    const { meta, body } = parseFrontMatter(await fetchText("content/" + file));
    if (meta.role) S.role = meta.role;
    const paras = body.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
    if (paras.length) S.bio = paras;
  }

  async function loadPost(file) {
    const slug = file.replace(/\.md$/, "").replace(/^.*\//, "");
    const { meta, body } = parseFrontMatter(await fetchText("content/blog/" + file));
    return {
      slug, title: meta.title || slug, date: meta.date || "",
      tags: (meta.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
      summary: meta.summary || "", body: mdToHtml(body)
    };
  }

  async function loadResearch(file) {
    const { meta, body } = parseFrontMatter(await fetchText("content/research/" + file));
    return {
      title: meta.title || file, area: meta.area || "", status: meta.status || "in progress",
      year: meta.year || "", summary: meta.summary || body.split("\n")[0] || "", url: meta.url || ""
    };
  }

  // Load everything listed in SITE.content, then re-render. Each kind degrades
  // independently: a failure in one leaves the data.js fallback for that kind.
  window.loadContent = async function loadContent(rerender) {
    const c = S.content || {};
    const jobs = [];
    if (c.about) jobs.push(loadAbout(c.about).catch((e) => console.warn("about:", e.message)));
    if (Array.isArray(c.posts) && c.posts.length) {
      jobs.push(Promise.all(c.posts.map((f) => loadPost(f).catch((e) => { console.warn("post:", e.message); return null; })))
        .then((posts) => { const ok = posts.filter(Boolean); if (ok.length) S.posts = ok; }));
    }
    if (Array.isArray(c.research) && c.research.length) {
      jobs.push(Promise.all(c.research.map((f) => loadResearch(f).catch((e) => { console.warn("research:", e.message); return null; })))
        .then((rs) => { const ok = rs.filter(Boolean); if (ok.length) S.research = ok; }));
    }
    await Promise.all(jobs);
    if (typeof rerender === "function") rerender();
  };
})();
