(() => {
  "use strict";
  const F = window.FRAMEWORKS;
  if (!F) return;

  const root = document.getElementById("approachRoot");
  if (!root) return;

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = (id) => F.frameworks[id];

  function resolve(hash) {
    const parts = (hash || "approach").split("/");
    let cat = F.categories.find((c) => c.id === parts[1]) || F.categories[0];
    let fwId = parts[2] && cat.frameworks.includes(parts[2]) ? parts[2] : cat.frameworks[0];
    return { cat, fwId };
  }

  function itemExpandable(it) {
    return !!(it.detail || (it.points && it.points.length) || (it.sub && it.sub.length) || it.code || it.ref);
  }

  function renderItemBody(fw, it) {
    const out = [];
    if (it.detail) out.push(`<p class="fx-detail">${esc(it.detail)}</p>`);
    if (it.points && it.points.length) {
      out.push(`<div class="fx-block"><span class="fx-block__label">${esc(fw.pointsLabel || "Controls")}</span><ul class="fx-points">${it.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>`);
    }
    if (it.sub && it.sub.length) {
      out.push(`<div class="fx-block"><span class="fx-block__label">${esc(fw.techLabel || "Techniques")}</span><ul class="fx-sub">${
        it.sub.map((s) => `<li><code>${esc(s.id)}</code> ${esc(s.name)}${s.summary ? ` <span class="fx-sub__s">, ${esc(s.summary)}</span>` : ""}</li>`).join("")
      }</ul></div>`);
    }
    if (it.code) {
      out.push(`<div class="fx-block"><span class="fx-block__label">${esc(fw.techLabel || "Query")}</span><pre class="fx-code"><code>${esc(it.code)}</code></pre></div>`);
    }
    if (it.note) out.push(`<p class="fx-note">${esc(it.note)}</p>`);
    if (it.ref) out.push(`<a class="fx-ref" href="${esc(it.ref)}" target="_blank" rel="noopener">Reference ↗</a>`);
    return out.join("");
  }

  function renderItem(fw, it) {
    const expandable = itemExpandable(it);
    const head =
      `<div class="fx-card__head"${expandable ? ' role="button" tabindex="0" aria-expanded="false"' : ""}>
         <span class="fx-id">${esc(it.id)}</span>
         <span class="fx-card__text"><span class="fx-title">${esc(it.title)}</span><span class="fx-summary">${esc(it.summary)}</span></span>
         ${expandable ? '<span class="fx-chev" aria-hidden="true"></span>' : ""}
       </div>`;
    const body = expandable ? `<div class="fx-card__body">${renderItemBody(fw, it)}</div>` : "";
    return `<article class="fx-card${expandable ? " is-expandable" : ""}">${head}${body}</article>`;
  }

  function render(hash) {
    const { cat, fwId } = resolve(hash);
    const fw = byId(fwId);
    if (!fw) { root.innerHTML = '<p class="empty">Framework not found.</p>'; return; }

    const subtabs = F.categories.map((c) =>
      `<a class="fx-tab${c.id === cat.id ? " is-active" : ""}" href="#approach/${esc(c.id)}"${c.id === cat.id ? ' aria-current="true"' : ""}>${esc(c.label)}</a>`
    ).join("");

    const chips = cat.frameworks.length > 1
      ? `<div class="fx-chips" role="tablist">${cat.frameworks.map((id) => {
          const f = byId(id);
          return `<a class="fx-chip${id === fwId ? " is-active" : ""}" href="#approach/${esc(cat.id)}/${esc(id)}"${id === fwId ? ' aria-current="true"' : ""}>${esc(f.title)}</a>`;
        }).join("")}</div>`
      : "";

    const panel =
      `<div class="fx-panel">
         <div class="fx-panel__head">
           <div>
             <h2 class="fx-panel__title">${esc(fw.title)}</h2>
             ${fw.version ? `<span class="fx-ver">${esc(fw.version)}</span>` : ""}
           </div>
           ${fw.source ? `<a class="fx-src" href="${esc(fw.source.url)}" target="_blank" rel="noopener">${esc(fw.source.name)} ↗</a>` : ""}
         </div>
         ${fw.blurb ? `<p class="fx-blurb">${esc(fw.blurb)}</p>` : ""}
         <div class="fx-grid${fw.kind === "matrix" ? " is-matrix" : ""}${fw.kind === "query" ? " is-query" : ""}">
           ${fw.items.map((it) => renderItem(fw, it)).join("")}
         </div>
       </div>`;

    root.innerHTML =
      `<nav class="fx-subtabs" aria-label="Framework categories">${subtabs}</nav>
       ${chips}
       ${panel}
       <p class="fx-attrib">${esc(F.attribution)}</p>`;
  }

  function toggle(head) {
    const card = head.closest(".fx-card.is-expandable");
    if (!card) return;
    const open = card.classList.toggle("is-open");
    head.setAttribute("aria-expanded", String(open));
  }
  root.addEventListener("click", (e) => {
    const head = e.target.closest(".fx-card__head[role='button']");
    if (head && root.contains(head)) toggle(head);
  });
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const head = e.target.closest(".fx-card__head[role='button']");
    if (head && root.contains(head)) { e.preventDefault(); toggle(head); }
  });

  window.Approach = { render };
})();
