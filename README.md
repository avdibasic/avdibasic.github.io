# avdibasic.github.io

Personal site of Tarik Avdibašić: penetration tester and security researcher.
Plain static HTML, CSS and JavaScript. No build step, no framework.

## Edit content

Everything you will want to change lives in `assets/js/data.js`:

| What | Key |
|---|---|
| Name, handle, links, email | `name`, `handle`, `links` |
| Bio | `bio` (fallback for `content/about.md`) |
| Jobs and degrees | `experience`, `education` (each takes `place`, `tags`, `blurb`/`detail`) |
| Certifications | `certs` |
| Blog posts | `content.posts` (Markdown under `content/blog/`) |
| Research entries | `research` (status: `published`, `in progress`, `disclosure pending`) |
| Pinned repos | `pinnedRepos` (private / in-progress work) |
| Tool list | `arsenal` |

The display name (`name`) shows as **Tarik Avdibašić**; the username/handle used in
the shell prompt, the GitHub link and the email stays `avdibasic`. Repositories on
the Tools tab are pulled live from the GitHub API, so new public repos appear
automatically.

## Structure

```
index.html            page shell and tabs
404.html              not-found page
assets/css/style.css  design tokens, layout, light/dark themes
assets/css/game.css   CTF shell styles
assets/css/levels.css CTF per-level styles
assets/js/data.js     all content
assets/js/content.js  runtime Markdown loader (blog/research/about)
assets/js/app.js      tabs, rendering, shell, GitHub fetch, read time
assets/js/frameworks.js  Approach tab data (frameworks + categories)
assets/js/approach.js    Approach tab renderer
assets/js/cv.js          Career Odyssey game under whoami
assets/js/ctf/*.js        CTF range shell + six levels
assets/img/blog/          blog figures (theme-aware SVG)
assets/img/favicon.svg
assets/vendor/three/      vendored three.js (MIT)
.nojekyll
```

## Editing content with Markdown

Blog posts, research entries and the About text come from Markdown files under
`content/`, loaded at runtime. No build step — add or edit a file, list it in
`assets/js/data.js` under `SITE.content`, and it appears.

```
content/
  about.md                 # the whoami bio + role (front-matter: role)
  blog/<slug>.md           # one file per post
  research/<name>.md       # one file per research entry
```

Each file starts with front-matter between `---` fences, then Markdown body:

```markdown
---
title: Your supply chain is a trust graph
date: 2026-10-14
tags: supply-chain, red-team
summary: One-line teaser shown in the blog list.
---

## A heading

Body text with **bold**, *italic*, `code` and [links](https://example.com).
- bullet one
- bullet two

![alt text](assets/img/blog/figure.svg)

    ```
    fenced code block
    ```
```

The renderer supports headings, bullet lists, bold/italic, inline code, links,
images and fenced code blocks. Each post also shows an estimated **read time** at
the top, computed from its word count.

To publish a new post, drop `content/blog/my-post.md` and add `"my-post.md"` to
`SITE.content.posts` in `assets/js/data.js`. Research works the same via
`SITE.content.research`. Blog posts are listed newest-first by their `date`.

Blog figures: an `<img>` pointing at a `.svg` under `assets/img/blog/` is inlined
into the page after render, so it inherits the site's theme CSS variables and
recolours with the light/dark toggle. Build such SVGs with `var(--text)`,
`var(--accent)`, `var(--signal)` etc. rather than hard-coded colours.

If the Markdown can't be fetched (for example opening `index.html` straight from
disk in a browser that blocks local file reads), the site falls back to the inline
defaults in `data.js`, so it always renders. Running a local server
(`python3 -m http.server`) always works.

## Approach — pentesting workflow + framework explorer

The **approach** tab has two parts.

**Pentesting Approach** is a six-phase walkthrough of how an engagement runs —
Scoping & Rules of Engagement, Reconnaissance & OSINT, Enumeration & Scanning,
Exploitation & Initial Access, Post-Exploitation, Reporting & Remediation — each a
card with a theme-aware inline SVG icon. Markup and icons live in `index.html`;
styles are the `.pa-*` rules in `style.css`.

**Frameworks & Common Vulnerabilities** is a reference map of the security
frameworks on the site: OWASP (Top 10 2025, API Top 10 2023, WSTG, CI/CD Top 10,
LLM Top 10 2025, Kubernetes Top 10), MITRE ATT&CK for IT (Enterprise, 15 tactics)
and OT (ICS, 12 tactics), MITRE ATLAS, and Active Directory / Entra ID attack-path
review checks. Pick a domain (subtab), open a framework, and click any entry to
expand its detail. Every framework links to its source.

The MITRE technique lists are generated straight from MITRE's official
`attack-stix-data` bundles (ATT&CK v20.1) by `scripts/generate_frameworks.py` (kept
out of the published site), so they stay exact and complete. Re-run that script to
refresh them.

Content lives in `assets/js/frameworks.js`; the renderer is `assets/js/approach.js`.
To add or edit a framework, edit the `frameworks` map:

```js
"my-framework": {
  title: "My Framework", version: "2026", kind: "list", // list | matrix | query
  source: { name: "example.org", url: "https://example.org/" },
  blurb: "One or two sentences.",
  items: [
    { id: "X01", title: "Risk name", summary: "One line.",
      points: ["control a", "control b"],        // optional bullets (list)
      sub: [{ id: "T1234", name: "Technique" }],  // optional sub-items (matrix)
      code: "MATCH (n) RETURN n",                 // optional query block (query)
      ref: "https://example.org/x01" }            // optional external link
  ]
}
```

Then add its id to a category in the `categories` array (or add a new category —
each becomes a subtab). Items with no `detail`/`points`/`sub`/`code`/`ref` render as
plain, non-expandable cards. Deep links work: `#approach/<category>/<framework>`.

Editions are current as of November 2026 and credited in the attribution line at the
foot of the tab (MITRE ATT&CK® / ATLAS™ © The MITRE Corporation, ATT&CK content from
v20.1; OWASP © the OWASP Foundation, CC BY-SA; AD / Entra checks reference the
SpecterOps BloodHound Query Library). The AD / Entra sections describe what an
attack-path assessment looks for — not runnable queries — and are for environments
you are authorised to assess.

## The shell game (guest → avdibasic)

The **shell** tab is a browsable terminal with a small privilege-escalation puzzle.
As `guest`, `ls secrets/` reveals `note.txt` and `root.flag`. `sudo -l` shows one
NOPASSWD entry — the world-writable `/opt/backup.sh`, runnable as `avdibasic`.
Running that script as the target user (`sudo -u avdibasic /opt/backup.sh`) escalates
you; `cat secrets/root.flag` then prints `FLAG{priv_esc_to_avdibasic}`. Any other
target (`sudo -u avdibasic bash`, `su avdibasic`) is refused and points back at
`sudo -l`, so the one intended path is the backup-script sudo abuse. Logic lives in
`assets/js/app.js`.

## Career Odyssey — 3D walkable CV (whoami)

The whoami tab has an interactive **3D** CV built on three.js. An operative figure
walks a road built from `SITE.experience`, `SITE.education` and `SITE.certs` in
`data.js`. Work and study stand on the **left** verge, certifications on the
**right**, placed in chronological order. Controls: `↑`/`↓` or `W`/`S` to walk
forward and back, `←`/`→` or `A`/`D` to turn toward a side and select the nearest
marker, plus the on-screen D-pad (touch friendly). The road only scrolls while you
move. The selected entry's details fill the info panel — the reserved right quarter
on desktop, stacked below the stage on mobile so it never blocks the view.
Certifications show their `learned` text and a verify link; engagements and studies
show their `blurb`/`detail`, dates, place and tags (all editable in `data.js`).

three.js is loaded on demand from `assets/vendor/three/` the first time whoami
opens (the same vendored copy the CTF range games use — nothing new to ship). The
scene is dark/light-theme aware, pauses when scrolled off-screen, and respects
`prefers-reduced-motion`. Code is `assets/js/cv.js`; styles are the `.cv-*` /
`.cvp-*` rules in `style.css`. The textual Engagement log and Education list
below it remain the accessible version of the same information.

## CTF range — six mini-games

The **CTF range** tab (`ctf`) is six games, one per engagement stage, sharing one
shell. (It is named "CTF range", not "3D" — only two of the levels are 3D.)

| Stage | File | Game |
|---|---|---|
| 1 Recon | `assets/js/ctf/level-recon.js` | Crack every exposed login using its OSINT clue (fixed, themed passwords) |
| 2 Network Security | `assets/js/ctf/level-runner.js` | 3D tunnel runner; firewalls are labelled public → office → DMZ → OT in order |
| 3 WebApp | `assets/js/ctf/level-webapp.js` | Pick the payload that exploits each of ten endpoints (options shuffled) |
| 4 Active Directory | `assets/js/ctf/level-ad.js` | Follow a realistic attack chain (dump creds → kerberoast → DA) to the DC |
| 5 OT / ICS | `assets/js/ctf/level-ot.js` | Modbus water-tank HMI: no authentication on the control loop — overflow the tank |
| 6 Physical Access | `assets/js/ctf/level-physical.js` | Top-down stealth: get into the factory, reach the server room, exfil |

`assets/js/ctf/core.js` is the shared shell: title, the **Choose a stage** menu,
intros, scoring, pause, sound, per-stage **Restart** (↻) and **Close** (✕) buttons,
and the win/lose screens. Each level registers itself with `CTF.register(...)`.

**Two ways to play.** "Start the engagement" runs all six stages in order; finishing
every one awards the **root flag**. "Choose a stage" practises any single game. Restart
replays the current stage without wiping points earned in earlier stages; Close returns
to the menu. Cleared stages get a tick in the menu. The canvas levels adapt to the
light/dark theme; the two 3D levels (the Network Security runner) stay dark because
their additive-blend bloom washes out on a light background.

Stage notes:
- **Recon** finishes when every login is cracked. Passwords are fixed and themed to the
  service (vpn is always `SuperSecureVPN!`), with an OSINT note on each card.
- **Active Directory** is a solvable chain mirroring real attacks (LSASS dump →
  Kerberoast → cached DA creds → DCSync). Hover a node to see the technique.
- **OT / ICS** is a Modbus HMI for a water tank. Modbus has no authentication, so you
  can freely write coils and registers: disable the safety interlock, close the drain,
  start the pump and raise the setpoint to overflow the tank. Each action logs its
  Modbus write (FC05 / FC06). Flag: `FLAG{modbus_has_no_authentication}`.
- **Physical access** is an original top-down stealth game — all figures drawn in code,
  no third-party game assets. The player is a burglar; the guards are agents.

three.js (MIT) powers the 3D runner and is bundled in `assets/vendor/three/`, loaded
only when the tab opens. To change a level's text, flag, or difficulty, edit the object
near the top of its file.
