import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// Serve only generated, synthetic Staff Home evidence on loopback. No Next/API/database process.
const worktree = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const artifacts = path.join(worktree, ".local/qa/session-04");
if (!fs.existsSync(path.join(artifacts, "after/results.json")))
  throw new Error("Run verify-staff-home.mjs before and after successfully first.");
const port = 3414;
const identity = {
  preview: "Isolated actual-component fixture preview",
  worktree,
  branch: execFileSync("git", ["branch", "--show-current"], {
    cwd: worktree,
    encoding: "utf8",
  }).trim(),
  checkpoint: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: worktree,
    encoding: "utf8",
  }).trim(),
  database: "none",
  network: "local generated assets only",
};
const gallery = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Staff Home owner review</title>
<style>body{font:16px system-ui;margin:32px;max-width:1300px;color:#172033;background:#f5f7fa}a{color:#5b21b6}select{padding:8px}section{margin:24px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}img{width:100%;border:1px solid #b4bcc8}label{margin-right:16px}@media(max-width:600px){.pair{grid-template-columns:1fr}}</style>
<h1>Staff Home owner review</h1><p><strong>Isolated actual-component fixture preview</strong> — synthetic data, fixed clock and pinned substitute font. Authentication, API operations and other pages are not exercised.</p>
<p><a href="/preview?theme=light&state=populated">Open interactive light preview</a> · <a href="/preview?theme=dark&state=populated">Open interactive dark preview</a> · <a href="/__identity">Verify server identity</a></p>
<p>Resize the preview to 1440, 1024, 768, 390 or 360px. Links model browser history within this fixture; they do not load other application pages. Review layout and hierarchy before extending this design to another Staff page.</p>
<label>Theme <select id="theme"><option>light</option><option>dark</option></select></label>
<label>Width <select id="width"><option>1440</option><option>1024</option><option>768</option><option>390</option><option>360</option></select></label>
<label>State <select id="state"><option>populated</option><option>loading</option><option>empty</option></select></label>
<p>Viewport captures preserve the application shell sizing. Full-content captures expand shell scroll containers solely to show every section; use the interactive preview to assess scrolling and fixed navigation.</p>
<section class="pair"><div><h2>Before</h2><a id="before"><img id="before-image" alt="Staff Home before"></a><p><a id="before-viewport">Viewport capture</a></p></div><div><h2>After</h2><a id="after"><img id="after-image" alt="Redesigned Staff Home"></a><p><a id="after-viewport">Viewport capture</a></p></div></section>
<p id="variants"></p><script>function update(){const theme=document.getElementById('theme').value,width=document.getElementById('width').value,state=document.getElementById('state').value;for(const phase of ['before','after']){const base='/'+phase+'/staff-'+theme+'-'+width+'-'+state;document.getElementById(phase).href=base+'-content.png';document.getElementById(phase+'-image').src=base+'-content.png';document.getElementById(phase+'-viewport').href=base+'.png';}document.getElementById('variants').innerHTML='<a href="/preview?theme='+theme+'&state='+state+'">Open this interactive state</a>';};for(const id of ['theme','width','state'])document.getElementById(id).addEventListener('change',update);update();</script></html>`;
fs.writeFileSync(path.join(artifacts, "owner-review.html"), gallery);
const preview = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Isolated actual-component Staff Home preview</title><link rel="stylesheet" href="/after/fixture.css"></head><body><div id="root"></div>
<script>const FixtureDate=Date;const frozen=FixtureDate.parse('2026-09-18T04:15:00Z');window.Date=class extends FixtureDate{constructor(...args){super(...(args.length?args:[frozen]));}static now(){return frozen;}};const options=new URLSearchParams(location.search);document.documentElement.classList.toggle('dark',options.get('theme')==='dark');history.replaceState({},'','/staff'+location.search);</script>
<script src="/after/fixture.js"></script><script>window.renderStaffHome(['loading','empty'].includes(options.get('state'))?options.get('state'):'populated');</script></body></html>`;
const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (url.pathname === "/__identity") {
    response.writeHead(200, { "Content-Type": "application/json" });
    return response.end(JSON.stringify(identity));
  }
  if (["/preview", "/staff"].includes(url.pathname)) {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return response.end(preview);
  }
  if (url.pathname === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return response.end(gallery);
  }
  // Allow only the explicit generated bundles and screenshots, never source/env/database files.
  if (
    !/^\/(before|after)\/(fixture\.(js|css)|staff-(light|dark)-(1440|1024|768|390|360)-(populated|loading|empty)(-content)?\.png)$/.test(
      url.pathname,
    )
  ) {
    response.writeHead(404);
    return response.end();
  }
  const file = path.join(artifacts, url.pathname);
  if (!fs.existsSync(file)) {
    response.writeHead(404);
    return response.end();
  }
  const mime = file.endsWith(".png")
    ? "image/png"
    : file.endsWith(".js")
      ? "text/javascript"
      : "text/css";
  response.writeHead(200, { "Content-Type": mime });
  fs.createReadStream(file).pipe(response);
});
server.listen(port, "127.0.0.1", () =>
  console.log(JSON.stringify({ ...identity, url: `http://127.0.0.1:${port}/` })),
);
