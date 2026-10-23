import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import ts from "typescript";

const out = ".local/qa/session-18";
fs.mkdirSync(out, { recursive: true });
const files = execFileSync("rg", ["--files", "src"], { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .map((p) => p.replaceAll("\\", "/"));
const known = new Set(files);
const resolve = (from, spec) => {
  const base = spec.startsWith("@/")
    ? "src/" + spec.slice(2)
    : spec.startsWith(".")
      ? path.posix.normalize(path.posix.join(path.posix.dirname(from), spec))
      : "";
  return [
    base,
    base.replace(/\.(tsx?|jsx?)$/, ""),
    ...[".ts", ".tsx", "/index.ts", "/index.tsx"].map((ext) => base + ext),
  ].find((p) => known.has(p));
};
const graph = new Map();
for (const file of files.filter((p) => /\.[cm]?[jt]sx?$/.test(p))) {
  const text = fs.readFileSync(file, "utf8"),
    ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const imports = [],
    surfaces = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.push(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      ts.isStringLiteral(node.arguments[0])
    )
      imports.push(node.arguments[0].text);
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const component = node.tagName.getText(ast);
      if (
        /^(Dialog|AlertDialog|Sheet|Drawer|form|Tabs|TabsContent|CourtSelect|BsDateField|Select)$/.test(
          component,
        )
      ) {
        const label = node.attributes.properties.find(
          (p) => ts.isJsxAttribute(p) && p.name.getText(ast) === "aria-label",
        );
        surfaces.push({
          file,
          line: ast.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          component,
          label:
            label?.initializer && ts.isStringLiteral(label.initializer)
              ? label.initializer.text
              : null,
          status: "NOT TESTED",
          scope: "Source-reachable declaration; conditional execution needs workflow evidence",
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  graph.set(file, {
    imports: imports.map((spec) => resolve(file, spec)).filter(Boolean),
    text,
    surfaces,
  });
}
const tree = (file) => {
  const seen = new Set();
  const visit = (p) => {
    if (seen.has(p)) return;
    seen.add(p);
    for (const next of graph.get(p)?.imports ?? []) visit(next);
  };
  visit(file);
  return [...seen];
};
const route = (file) =>
  "/" +
  file
    .replace(/^src\/app\//, "")
    .replace(/\/(page\.tsx|route\.ts)$/, "")
    .replace(/^page\.tsx$/, "")
    .split("/")
    .filter((p) => !/^\(.+\)$/.test(p))
    .join("/");
const navSources = [
  "src/lib/operational-navigation.ts",
  "src/lib/client-shell-nav.ts",
  "src/shared/public-routes.ts",
];
const nav = navSources.flatMap((file) =>
  [...fs.readFileSync(file, "utf8").matchAll(/(?:href:\s*|^\s*)["'](\/[^"']*)["']/gm)].map((m) => ({
    href: m[1],
    file,
  })),
);
const role = (url) =>
  url.startsWith("/staff")
    ? "staff"
    : url.startsWith("/admin")
      ? "admin"
      : url.startsWith("/client")
        ? "client"
        : "public";
const pages = files
  .filter((p) => p.startsWith("src/app/") && p.endsWith("/page.tsx"))
  .map((file) => {
    const url = route(file),
      text = graph.get(file).text;
    const ancestors = file.split("/").slice(0, -1);
    const layouts = ancestors
      .map((_, i) => ancestors.slice(0, i + 1).join("/") + "/layout.tsx")
      .filter((p) => known.has(p));
    const dependencies = [...new Set([file, ...layouts].flatMap(tree))];
    return {
      file,
      route: url,
      role: role(url),
      dynamic: url.includes("["),
      permission:
        role(url) === "public"
          ? "Public/token/account contract; token validity where applicable"
          : "Inherited PortalRoleGuard allowed=" +
            role(url) +
            "; API permissions enforced separately",
      navigation: nav.filter((n) => n.href === url).map((n) => n.file),
      layouts,
      dependencies,
      redirect: /\bredirect\(/.test(text),
      nested: dependencies.filter((p) =>
        /(?:dialog|modal|drawer|panel|calendar|selector|court-select|date-field)/i.test(p),
      ),
      workflowDeclarations: dependencies.flatMap((p) => graph.get(p)?.surfaces ?? []),
      status: "NOT TESTED",
      evidence: null,
    };
  })
  .sort((a, b) => a.route.localeCompare(b.route));
assert.equal(new Set(pages.map((p) => p.route)).size, pages.length);
const apis = files
  .filter((p) => p.startsWith("src/app/") && p.endsWith("/route.ts"))
  .map((file) => {
    const text = graph.get(file).text,
      dependencies = tree(file);
    const methods = [
      ...text.matchAll(
        /export\s+(?:async\s+)?(?:const|function)\s+(GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\b/g,
      ),
    ].map((m) => m[1]);
    for (const binding of text.matchAll(/export\s+const\s*\{([^}]+)\}/g))
      methods.push(
        ...binding[1]
          .split(",")
          .map((s) => s.trim())
          .filter((s) => /^(GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)$/.test(s)),
      );
    return {
      file,
      route: route(file),
      methods: [...new Set(methods)],
      directSessionGuard: /requireSession/.test(text),
      capabilitiesInDependencies: [
        ...new Set(
          dependencies.flatMap((p) =>
            [
              ...(graph.get(p)?.text.matchAll(/requireCapability\([^,]+,\s*["']([^"']+)/g) ?? []),
            ].map((m) => m[1]),
          ),
        ),
      ],
      status: "NOT TESTED",
      evidence: null,
    };
  });
const inventory = {
  baseline: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  pages,
  apis,
  navigation: nav,
  interpretation:
    "Import closure lists shared potential nested surfaces, not proof of execution. Capability names in service dependencies are not per-method grants. Route rendering, anonymous API denial, workflow, security and accessibility certification are separate gates.",
};
if (fs.existsSync(out + "/browser-routes.json")) {
  const evidence = JSON.parse(fs.readFileSync(out + "/browser-routes.json"));
  assert.equal(evidence.baseline, inventory.baseline);
  for (const page of pages) {
    const observed = evidence.results.find((r) => r.route === page.route);
    if (observed) {
      page.status = observed.status;
      page.evidence = "browser-routes.json: " + page.route;
      page.accessibility =
        observed.violations == null ? "NOT TESTED" : observed.violations.length ? "FAIL" : "PASS";
      page.workflowScope =
        "Render/navigation evidence only; primary visible controls recorded; execution requires critical/prior evidence.";
    }
  }
}
if (fs.existsSync(out + "/security-anonymous.json")) {
  const evidence = JSON.parse(fs.readFileSync(out + "/security-anonymous.json"));
  for (const api of apis) {
    const observed = evidence.results.find((r) => r.route === api.route);
    if (observed) {
      api.status = observed.status;
      api.evidence = "security-anonymous.json: " + api.route;
      api.scope = "Anonymous GET only; authenticated/action coverage is separate.";
    }
  }
}
fs.writeFileSync(out + "/route-inventory.json", JSON.stringify(inventory, null, 2) + "\n");
console.log(
  JSON.stringify({
    pages: pages.length,
    apis: apis.length,
    roles: pages.reduce((counts, p) => ({ ...counts, [p.role]: (counts[p.role] ?? 0) + 1 }), {}),
  }),
);

if (process.argv.includes("--security")) {
  const origin = process.env.PORTAL_QA_ORIGIN || "http://localhost:3001";
  assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  const targets = apis.filter(
    (p) => p.methods.includes("GET") && p.directSessionGuard && !p.route.includes("..."),
  );
  const evidenceFile = out + "/security-anonymous.json";
  const results = fs.existsSync(evidenceFile)
    ? JSON.parse(fs.readFileSync(evidenceFile)).results.filter((r) => r.status === "PASS")
    : [];
  for (const entry of targets) {
    if (results.some((r) => r.route === entry.route)) continue;
    const actual = entry.route.replace(/\[[^\]]+\]/g, "00000000-0000-4000-8000-000000000099");
    try {
      const response = await fetch(origin + actual + "?page=true&limit=1&cursor=tampered", {
        redirect: "manual",
        signal: AbortSignal.timeout(60000),
      });
      const text = await response.text();
      const expected = entry.route === "/api/v1/users/[userId]/avatar" ? 404 : 401;
      results.push({
        route: entry.route,
        actual,
        status: response.status === expected ? "PASS" : "FAIL",
        httpStatus: response.status,
        expectation:
          expected === 404
            ? "Missing public avatar; private-avatar fallback requires session"
            : "Unauthenticated access denied",
        responseBytes: Buffer.byteLength(text),
        requestId: response.headers.get("x-request-id"),
        contentType: response.headers.get("content-type"),
      });
    } catch (error) {
      results.push({ route: entry.route, status: "BLOCKED", error: String(error) });
    }
    fs.writeFileSync(
      out + "/security-anonymous.json",
      JSON.stringify(
        {
          results,
          authenticatedFixtureEvidence: "full-baseline.json integration suites",
          liveMutations: 0,
        },
        null,
        2,
      ) + "\n",
    );
  }
  console.log(
    JSON.stringify({
      anonymousAPI: results.length,
      statuses: results.reduce((o, r) => ({ ...o, [r.status]: (o[r.status] ?? 0) + 1 }), {}),
    }),
  );
}

if (process.argv.includes("--branding")) {
  const { chromium, expect: baseExpect } = await import("@playwright/test");
  const expect = baseExpect.configure({ timeout: 30000 });
  const browser = await chromium.launch(),
    results = [],
    errors = [],
    writes = [];
  try {
    for (const replacement of [false, true]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const request = route.request();
        if (!["GET", "HEAD"].includes(request.method())) {
          writes.push({ method: request.method(), url: request.url(), intercepted: true });
          return route.abort();
        }
        if (replacement && new URL(request.url()).pathname === "/api/v1/public/cms/settings") {
          const response = await route.fetch();
          const payload = await response.json();
          payload.data.logoUrl = "/images/staff-home-nepal.jpg";
          return route.fulfill({ json: payload });
        }
        return route.continue();
      });
      await page.goto("http://localhost:3001/consultation", {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      const brand = page.locator('header a[title="Srimar Law"]');
      await expect(brand).toBeVisible();
      if (replacement) {
        await expect(brand.locator("img")).toHaveCount(0);
        await page.waitForTimeout(250);
        await page.evaluate(() => window.dispatchEvent(new Event("lexnepal:cms-settings-updated")));
      }
      if (!replacement) {
        await expect(brand.locator("img")).toHaveCount(0);
        await expect(brand.locator("svg")).toBeVisible();
      } else {
        await expect(brand.locator("img")).toHaveAttribute("src", "/images/staff-home-nepal.jpg");
        await expect
          .poll(() => brand.locator("img").evaluate((e) => e.naturalWidth))
          .toBeGreaterThan(1);
      }
      await page.screenshot({
        path: out + "/branding-" + (replacement ? "replacement" : "fallback") + ".png",
      });
      results.push({
        check: replacement
          ? "New valid URL replaces failed SSR logo"
          : "SSR pre-hydration failure displays existing emblem",
        status: "PASS",
      });
      await context.close();
    }
  } finally {
    fs.writeFileSync(
      out + "/branding-evidence.json",
      JSON.stringify({ results, errors, writes, liveMutations: 0 }, null, 2) + "\n",
    );
    await browser.close();
  }
  assert.equal(errors.length, 0);
  assert.equal(writes.length, 0);
}

if (process.argv.includes("--policy")) {
  const { chromium, expect } = await import("@playwright/test");
  const headers = [];
  for (const url of ["/contact", "/consultation", "/client/documents"]) {
    const response = await fetch("http://localhost:3001" + url, {
      signal: AbortSignal.timeout(90000),
    });
    const policy = response.headers.get("content-security-policy");
    assert(policy?.includes("frame-ancestors 'none'"));
    assert.equal(policy.includes("frame-src https://maps.google.com"), url === "/contact");
    headers.push({ url, status: response.status, policy });
  }
  const browser = await chromium.launch(),
    page = await browser.newPage(),
    errors = [];
  const messages = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") messages.push(message.text());
  });
  await page.route("**/*", (route) =>
    ["GET", "HEAD"].includes(route.request().method()) ? route.continue() : route.abort(),
  );
  await page.route("https://maps.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Fixture map</title><p>Synthetic map</p>",
    }),
  );
  await page.goto("http://localhost:3001/contact", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.locator('iframe[title="Office location"]').scrollIntoViewIfNeeded();
  await expect(
    page
      .frameLocator('iframe[title="Office location"]')
      .getByText("Synthetic map", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  assert.equal(messages.filter((m) => /Content Security Policy|Framing/.test(m)).length, 0);
  assert.equal(errors.length, 0);
  fs.writeFileSync(
    out + "/contact-policy-evidence.json",
    JSON.stringify(
      {
        headers,
        mapFrame: "PASS: response fulfilled in browser memory",
        messages,
        errors,
        liveMutations: 0,
        externalMapDelivery: 0,
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
}

if (process.argv.includes("--browser")) {
  const source = fs
    .readFileSync("scripts/qa/verify-retrieval-continuation.mjs", "utf8")
    .replaceAll("\r\n", "\n");
  const start = source.indexOf("const checks = String.raw`"),
    end = source.indexOf('const worker = out + "/retrieval-worker.mjs";');
  assert(start > 0 && end > start);
  const checks = String.raw`
  const inventory=JSON.parse(fs.readFileSync(out+'/route-inventory.json','utf8'));
  const publicSamples=fs.existsSync(out+'/public-samples.json')?JSON.parse(fs.readFileSync(out+'/public-samples.json')):{};
  const priorPath=out+'/browser-routes.json';
  const routeResults=fs.existsSync(priorPath)?JSON.parse(fs.readFileSync(priorPath)).results:[];
  const from=Number(process.argv.find(a=>a.startsWith('--from='))?.split('=')[1]??0);
  const to=process.argv.includes('--critical')||process.argv.includes('--visual-final')||process.argv.includes('--admin-controls')||process.argv.includes('--audit')||process.argv.includes('--loading')?0:Number(process.argv.find(a=>a.startsWith('--to='))?.split('=')[1]??inventory.pages.length);
  const selected=process.argv.find(a=>a.startsWith('--routes='))?.slice(9).split(',')??(process.argv.includes('--hydration-recheck')?routeResults.filter(r=>r.consoleMessages?.some(m=>/hydrat/i.test(m.text))).map(r=>r.route):undefined);
  const representative=new Set(['/staff','/staff/tasks','/staff/cases','/staff/documents','/staff/profile','/admin','/admin/appointments','/admin/users','/client','/client/documents','/client/notifications','/client/booking','/','/consultation','/sign-in']);
  let currentRoute='';const consoleErrors=[],httpFailures=[];
  const resumed=process.argv.includes('--critical-resume')?JSON.parse(fs.readFileSync(out+'/browser-critical-en-passed.json')):null;
  const criticalResults=resumed?resumed.results:[];
  if(resumed){assert.equal(resumed.results.length,4);assert(resumed.results.every(r=>r.language==='en'));assert.equal(resumed.errors.length,0);assert(resumed.scans.every(s=>s.violations.length===0));scans.push(...resumed.scans);writes.push(...resumed.writes);}
  const persist=()=>{if(process.argv.includes('--critical')||process.argv.includes('--visual-final')||process.argv.includes('--admin-controls')||process.argv.includes('--audit')||process.argv.includes('--loading'))fs.writeFileSync(out+(process.argv.includes('--audit')?'/browser-audit.json':process.argv.includes('--visual-final')?'/browser-visual-final.json':process.argv.includes('--loading')?(process.argv.includes('--loading-before')?'/loading-before.json':'/loading-evidence.json'):process.argv.includes('--admin-controls')?'/browser-admin-controls.json':'/browser-critical.json'),JSON.stringify({results:criticalResults,errors,writes,scans,liveMutations:0},null,2));else fs.writeFileSync(priorPath,JSON.stringify({baseline:inventory.baseline,results:routeResults,errors,consoleErrors,httpFailures,writes,scans,liveMutations:0},null,2));};
  try {
    for(let i=from;i<to;i++){
      const entry=inventory.pages[i];if(selected&&!selected.includes(entry.route))continue;if(routeResults.some(r=>r.route===entry.route)&&!process.argv.includes('--repeat'))continue;
      if(process.argv.includes('--repeat')){for(let old=routeResults.length-1;old>=0;old--)if(routeResults[old].route===entry.route)routeResults.splice(old,1);}
      currentRoute=entry.route;const offset=errors.length,logOffset=consoleErrors.length;
      const width=i%2?390:1440,theme=i%2?'dark':'light',language=i%2?'ne':'en';
      const collection={'/blog/[slug]':'blog-posts','/news/[slug]':'news','/resources/[slug]':'resources','/practice-areas/[slug]':'practice-areas','/lawyers/[id]':'team'}[entry.route];
      const sample=collection?publicSamples[collection]?.samples?.[0]:undefined;
      const actual=entry.route.replaceAll('[id]',sample?.id??caseId).replaceAll('[slug]',sample?.slug??'session18-unavailable-fixture').replaceAll('[token]','session18-invalid-token').replaceAll('[portal]','staff');
      let responseStatus=0;const started=Date.now();
      try {
        // Install the same populated domain fixtures used by prior pagination QA.
        await open(actual,width,theme,3,entry.role==='public'?'staff':entry.role);
        await page.addInitScript(value=>{if(window===window.top)localStorage.setItem('lexnepal_lang',value);},language);
        // open() recreates its context; attach listeners to that actual page too.
        page.on('console',m=>{if(m.type()==='error')consoleErrors.push({route:currentRoute,text:m.text()});});
        page.on('response',r=>{if(r.request().isNavigationRequest()&&r.request().frame()===page.mainFrame())responseStatus=r.status();if(r.status()>=400)httpFailures.push({route:currentRoute,url:r.url(),status:r.status()});});
        await page.reload({waitUntil:'domcontentloaded',timeout:90000});await applyTheme();
        await page.locator('h1,h2,[data-portal-gate]').filter({visible:true}).first().waitFor({timeout:15000}).catch(()=>{});
        await page.waitForTimeout(600);
        if(sample?.title)await expect(page.getByText(sample.title,{exact:true}).filter({visible:true}).first()).toBeVisible();
        const geometry=await page.evaluate(()=>({viewport:innerWidth,bodyWidth:document.body.scrollWidth,pageWidth:document.documentElement.scrollWidth,bodyScroll:document.body.scrollHeight-innerHeight,headings:[...document.querySelectorAll('h1,h2')].filter(e=>e.getClientRects().length).map(e=>e.textContent),text:document.body.innerText.slice(0,1000)}));
        const links=await page.locator('a[href^="/"]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('href')))]);
        const controls=await page.getByRole('button').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({name:n.getAttribute('aria-label')||n.textContent,disabled:n.disabled})));
        let violations=null;
        if(representative.has(entry.route)&&!entry.dynamic){const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();violations=scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));scans.push({route:entry.route,width,theme,language,violations});}
        const browserErrors=errors.slice(offset),consoleMessages=consoleErrors.slice(logOffset);
        const runtime=/Application error|Runtime Error|Internal Server Error/.test(geometry.text)||browserErrors.length||consoleMessages.some(m=>/hydrat|unique.*key|Content Security Policy|Framing/i.test(m.text));
        const overflow=Math.max(geometry.bodyWidth,geometry.pageWidth)>width+1;
        const status=runtime||responseStatus>=500||overflow?'FAIL':entry.dynamic&&responseStatus===404?'BLOCKED':responseStatus>=400?'FAIL':'PASS';
        routeResults.push({route:entry.route,actual,role:entry.role,width,theme,language,status,httpStatus:responseStatus,geometry,links,controls,consoleMessages,browserErrors,violations,elapsedMs:Date.now()-started,positiveDynamicContent:entry.dynamic&&responseStatus===404?'NOT TESTED: no published/token fixture supplied':undefined});
        if(representative.has(entry.route))await shot('session18-'+(entry.route.replaceAll('/','-')||'home')+'-'+width);
      } catch(error){for(let old=routeResults.length-1;old>=0;old--)if(routeResults[old].route===entry.route)routeResults.splice(old,1);routeResults.push({route:entry.route,actual,status:'BLOCKED',error:String(error),elapsedMs:Date.now()-started});}
      persist();console.log(JSON.stringify({index:i,route:entry.route,status:routeResults.at(-1).status}));
    }
    if(process.argv.includes('--audit')){
      for(const [width,theme,language] of [[1440,'light','en'],[390,'dark','ne']]){
        await open('/admin/audit',width,theme,3,'admin');const warnings=[];page.on('console',m=>{if(['error','warning'].includes(m.type()))warnings.push(m.text());});const filters=[];
        await page.route('**/api/v1/audit-events*',route=>{const resource=new URL(route.request().url()).searchParams.get('resource');filters.push(resource);const data=[{id:'91000000-0000-4000-8000-000000000001',userId:id,actorName:'Synthetic Admin Actor',actorRole:'associate',action:'documents.uploaded',resource:'documents',resourceId:caseId,details:'Synthetic audit details',ipAddress:'192.0.2.1',requestId:'synthetic',createdAt:stamp}];return route.fulfill({json:{data:resource?data.filter(r=>r.resource===resource):data}});});
        await page.reload({waitUntil:'domcontentloaded'});await page.getByText('Synthetic Admin Actor',{exact:true}).waitFor();await applyTheme();
        if(language==='ne'){await page.getByRole('button',{name:'Switch language to Nepali',exact:true}).filter({visible:true}).first().click();await expect(page.locator('main')).toContainText('२०८३');}else await expect(page.locator('main')).toContainText('2026');
        await expect(page.locator('main')).toContainText(/10:00|१०:००/);await expect(page.locator('main')).toContainText('Events loaded');
        await page.locator('[data-slot="select-trigger"]').click();await page.getByRole('option',{name:/^documents$/i}).click();await expect.poll(()=>filters.at(-1)).toBe('documents');
        const result=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();scans.push({label:'Typed Admin audit '+language,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});assert.equal(result.violations.length,0);assert(!warnings.some(m=>/unique.*key|hydrat/i.test(m)));criticalResults.push({check:'Typed audit IDs, actor, Nepal instant, loaded counts and resource filter',width,theme,language});persist();
      }
      assert.equal(errors.length,0);
    }
    if(process.argv.includes('--loading')){
      await open('/admin/analytics',1440,'light',3,'admin');
      let release;const held=new Promise(resolve=>{release=resolve;});
      await page.route('**/api/v1/analytics/dashboard',async route=>{await held;await route.fulfill({json:{data:{activeCases:0,totalCases:0,activeClients:0,activeStaff:0,openLeads:0,openTasks:0,upcomingHearings:0,mattersByPractice:{},casesByStatus:{},tasksByStatus:{},hearingsByMonth:[]}}});});
      await page.reload({waitUntil:'domcontentloaded'});await page.getByText('Loading operational analytics…',{exact:true}).waitFor();await applyTheme();
      const section=page.locator('[data-slot="dashboard-section"][data-state="loading"]');
      const opacity=await section.evaluate(e=>{for(const animation of e.getAnimations()){animation.pause();animation.currentTime=1000;}return getComputedStyle(e).opacity;});
      const result=await new AxeBuilder({page}).include('[data-slot="portal-page-shell"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();const violations=result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
      scans.push({label:'Admin loading at the actual pulse minimum',violations});criticalResults.push({check:'Loading label remains readable at every animation phase',opacity,status:violations.length?'FAIL':'PASS'});persist();
      release();await expect(page.getByText('Loading operational analytics…',{exact:true})).toHaveCount(0);
      if(process.argv.includes('--loading-before'))assert(violations.some(v=>v.id==='color-contrast'));else assert.equal(violations.length,0);
    }
    if(process.argv.includes('--admin-controls')){
      for(const [width,theme,language] of [[1440,'light','en'],[390,'dark','ne']]){
        await open('/admin/users',width,theme,3,'admin');
        if(language==='ne'){await page.getByRole('button',{name:'Switch language to Nepali',exact:true}).filter({visible:true}).first().click();}
        const staff=page.getByRole('tab',{name:/^Staff/});await staff.focus();await page.keyboard.press('ArrowRight');
        await expect(page.getByRole('tab',{name:/^Clients/})).toHaveAttribute('aria-selected','true');
        await expect(page.getByRole('tabpanel')).toBeVisible();await page.keyboard.press('ArrowLeft');await expect(staff).toHaveAttribute('aria-selected','true');
        await expect(page.getByRole('tabpanel')).toBeVisible();
        for(const url of ['/admin/users','/admin/appointments']){
          if(url.endsWith('appointments')){await open(url,width,theme,3,'admin');if(language==='ne')await page.getByRole('button',{name:'Switch language to Nepali',exact:true}).filter({visible:true}).first().click();}
          const trigger=page.locator('[data-slot="select-trigger"]').first();await expect(trigger).toHaveAttribute('aria-label',/.+/);await trigger.focus();await page.keyboard.press('Enter');await expect(page.getByRole('listbox')).toBeVisible();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
          const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();scans.push({url,width,theme,language,violations:scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});assert.equal(scan.violations.length,0,url);
          criticalResults.push({check:'Admin named select keyboard/Escape and user tab-panel relationship',url,width,theme,language});persist();
        }
      }
      assert.equal(errors.length,0);
    }
    if(process.argv.includes('--critical')||process.argv.includes('--visual-final')){
      const locale=async language=>{await page.getByRole('button',{name:/^Switch language to /}).filter({visible:true}).first().waitFor();const control=page.getByRole('button',{name:language==='ne'?'Switch language to Nepali':'Switch language to English',exact:true}).filter({visible:true});if(await control.count())await control.first().click();await expect(page.getByRole('button',{name:language==='ne'?'Switch language to English':'Switch language to Nepali',exact:true}).filter({visible:true}).first()).toBeVisible();};
      const scan=async(label,selector)=>{const result=await new AxeBuilder({page}).include(selector).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();scans.push({label,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});assert.equal(result.violations.length,0,label);};
      const date=async(selector,language)=>{
        const input=page.locator(selector).first(),root=input.locator('xpath=ancestor::*[@data-slot="bs-date-field"]');
        await expect(root).toHaveAttribute('data-calendar-system',language==='ne'?'bs':'ad');
        await input.fill(language==='ne'?'2083-07-03':'2026-10-20');await expect(root).toHaveAttribute('data-ad-date','2026-10-20');
        const converted=root.locator('[data-date-conversion]');await expect(converted).toHaveAttribute('readonly','');
        const normalize=s=>s.replace(/[\u0966-\u096f]/g,c=>String(c.charCodeAt(0)-0x966));
        await expect.poll(async()=>normalize(await converted.inputValue())).toBe(language==='ne'?'2026-10-20':'2083-07-03');
        await input.fill(language==='ne'?'2082-01-32':'2026-02-30');assert.equal(await input.evaluate(e=>e.checkValidity()),false);
        await input.fill(language==='ne'?'2083-07-03':'2026-10-20');assert(await input.evaluate(e=>e.checkValidity()));
        await root.locator('button[aria-haspopup="dialog"]').click();const cell=page.locator('[data-calendar-popover] button[data-date="2026-10-20"]');
        await cell.focus();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-calendar-popover] button[data-date="2026-10-21"]')).toBeFocused();await page.keyboard.press('ArrowLeft');await expect(cell).toBeFocused();await page.keyboard.press('Enter');
        await expect(root).toHaveAttribute('data-ad-date','2026-10-20');
        const geometry=await root.evaluate(e=>{const a=e.querySelector('[data-date-primary]').getBoundingClientRect(),b=e.querySelector('[data-date-conversion]').getBoundingClientRect();return{first:{x:a.x,y:a.y,w:a.width,h:a.height},second:{x:b.x,y:b.y,w:b.width,h:b.height},viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth};});
        assert(geometry.first.x+geometry.first.w<=geometry.viewport+1);assert(geometry.second.x+geometry.second.w<=geometry.viewport+1);assert(geometry.overflow<=1);
        return geometry;
      };
      const court=async selector=>{const input=page.locator(selector),root=input.locator('xpath=ancestor::*[@data-slot="court-select"]');await root.locator('button').first().click();await input.fill('Butwal');await expect(page.locator('.court-select-popup').getByRole('option')).toHaveCount(1);await page.locator('.court-select-popup').getByRole('option').click();await expect(root).toHaveAttribute('data-court-value','High Court Tulsipur, Butwal Bench');};
      for(const language of ['en','ne']){
        if(resumed&&language==='en')continue;
        const role=language==='en'?'staff':'admin',width=language==='en'?1440:390,theme=language==='en'?'light':'dark';
        await open('/'+role+'/cases',width,theme,55,role);await locale(language);
        await page.getByRole('button',{name:/new case|create case/i}).first().click();
        const geometry=await date('#case-filing-date-bs',language);await court('#case-court');
        await page.locator('#case-number').fill('SYNTHETIC-18');await page.locator('#case-title').fill('Synthetic integrated court and date');
        await page.locator('#case-client').click();await page.getByRole('option',{name:'Pagination client 1',exact:true}).click();await page.locator('#case-lawyer').click();await page.getByRole('option',{name:/Synthetic Profile Reviewer/}).click();
        await page.addStyleTag({content:'html { font-size:200% !important; }'});
        const dialog=page.getByRole('dialog',{name:'Create New Case',exact:true});
        for(const name of ['Cancel','Create Case']){const button=dialog.getByRole('button',{name,exact:true});await button.scrollIntoViewIfNeeded();const b=await button.boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=900+1,name+' accessible at 200% text');}
        await scan('Integrated case at 200% text '+language,'[role="dialog"]');
        await shot('session18-integrated-case-200-'+language);
        if(process.argv.includes('--visual-final')){criticalResults.push({check:'Final hydration-safe 200% text screenshot and dialog accessibility',role,language,width,geometry});persist();continue;}
        const submitted=[];await page.route('**/api/v1/cases',async r=>{if(r.request().method()!=='POST')return r.fallback();const payload=r.request().postDataJSON();submitted.push(payload);writes.push({path:'/api/v1/cases',method:'POST',intercepted:true,payload});await r.fulfill({json:{data:{id:caseId,...payload}}});});
        await dialog.getByRole('button',{name:'Create Case',exact:true}).click();await expect.poll(()=>submitted.length).toBe(1);assert.equal(submitted[0].court,'High Court Tulsipur, Butwal Bench');assert.equal(submitted[0].filingDate,'2026-10-20');
        criticalResults.push({check:'Court alias, bilingual date, invalid recovery, picker keyboard, 200% controls and intercepted case payload',role,language,width,geometry});persist();
        await open('/'+role+'/cases/'+caseId,width,theme,55,role);await locale(language);await page.getByRole('tab',{name:/Misl|Files/i}).click();
        const continuation=page.locator('[data-collection="documents"]:visible').first();await continuation.locator('button').click();await expect.poll(async()=>(await continuation.textContent()).replace(/[\u0966-\u096f]/g,c=>String(c.charCodeAt(0)-0x966))).toContain('55');
        await page.getByRole('tab',{name:/Hearings/i}).click();await page.getByRole('button',{name:'Schedule hearing',exact:true}).click();
        await date('#case-hearing-bs',language);await court('#case-hearing-court');
        const hearing=[];await page.route('**/api/v1/hearings',async r=>{if(r.request().method()!=='POST')return r.fallback();const payload=r.request().postDataJSON();hearing.push(payload);writes.push({path:'/api/v1/hearings',method:'POST',intercepted:true,payload});await r.fulfill({json:{data:{id:caseId,...payload}}});});
        await page.getByRole('dialog',{name:'Schedule hearing',exact:true}).getByRole('button',{name:'Schedule hearing',exact:true}).click();await expect.poll(()=>hearing.length).toBe(1);assert.equal(hearing[0].dateGregorian,'2026-10-20');assert.equal(hearing[0].court,'High Court Tulsipur, Butwal Bench');
        criticalResults.push({check:'Continued Misl plus shared hearing court/date command',role,language,width});persist();
        for(const [url,selector,portal] of [['/client/booking','#client-booking-bs-date','client'],['/consultation','[data-date-primary]','staff']]){
          await open(url==='/consultation'?'/client/booking':url,language==='en'?768:390,theme,3,url==='/consultation'?'client':portal);await locale(language);if(url==='/consultation'){await page.goto(origin+url,{waitUntil:'domcontentloaded'});await applyTheme();}await page.locator(selector).first().scrollIntoViewIfNeeded();await page.waitForTimeout(1000);
          await date(selector,language);await scan('Booking/public integrated field '+url+language,'[data-slot="bs-date-field"]');criticalResults.push({check:'Booking/public locale calendar and counterpart',url,language,width:language==='en'?768:390});persist();
        }
      }
      for(const url of process.argv.includes('--visual-final')?[]:['/admin/users','/staff/documents','/client/documents']){
        const portal=url.split('/')[1];await open(url,390,'dark',3,portal);anonymous=true;await page.reload({waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:/Sign in/i}).or(page.getByRole('link',{name:/Sign in/i})).first()).toBeVisible();criticalResults.push({check:'Stale/anonymous session withholds protected portal',url});persist();
      }
      if(!process.argv.includes('--visual-final')){await open('/staff/cases',390,'dark',3,'staff');user.role='client';await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('[data-portal-gate="wrong-role"]')).toBeVisible();criticalResults.push({check:'Wrong-role Client is denied Staff portal'});}
      assert.equal(errors.length,0);assert(writes.every(w=>w.intercepted));persist();
    }
  } finally {persist();await context?.close();await browser.close();}
}
await retrievalAudit();
`;
  // Adapt only fixture setup: preserve locale preference, reject unexpected non-GET actions,
  // and let account/token pages without a main landmark render for inspection.
  let prefix = source
    .slice(0, start)
    .replace('const out = ".local/qa/session-17d";', `const out = "${out}";`);
  prefix = prefix.replace(
    "const retrievalFixtures = String.raw`",
    'const retrievalFixtures = String.raw`\n      if(p==="/api/v1/analytics/dashboard")return r.fulfill({json:{data:{activeCases:3,totalCases:3,activeClients:3,activeStaff:3,openLeads:3,openTasks:3,upcomingHearings:3,mattersByPractice:{Civil:3},casesByStatus:{active:3},tasksByStatus:{todo:3},hearingsByMonth:[{month:"2026-10",count:3}]}}});',
  );
  prefix = prefix.replace(
    "const retrievalFixtures = String.raw`",
    'const retrievalFixtures = String.raw`\n      if(p==="/api/v1/envelopes/signing-inbox")return r.fulfill({json:{data:{pendingEnvelopes:[],pendingDirect:[],recentlySigned:[]}}});\n      if(p.startsWith("/api/v1/public/leads/intake/")||p.startsWith("/api/v1/public/document-shares/"))return r.continue();',
  );
  if (process.argv.includes("--public-positive") || process.argv.includes("--hydration-recheck"))
    prefix = prefix.replace(
      "const retrievalFixtures = String.raw`",
      'const retrievalFixtures = String.raw`\n      if(p.startsWith("/api/v1/public/cms/")&&req.method()==="GET")return r.continue();',
    );
  prefix = prefix.replace(
    'const common = fs.readFileSync("scripts/qa/verify-account-profile.mjs", "utf8").replaceAll("\\r\\n", "\\n");',
    'const common = fs.readFileSync("scripts/qa/verify-account-profile.mjs", "utf8").replaceAll("\\r\\n", "\\n").replace(\'localStorage.setItem("lexnepal_lang", "en");\',\'if (!localStorage.getItem("lexnepal_lang")) localStorage.setItem("lexnepal_lang", "en");\').replace(\' && !req.headers()["next-action"]\', "");',
  );
  prefix = prefix.replace(
    "const fixtures = paging.slice(start, end)",
    'const fixtures = paging.slice(start, end).replace(/    await page\\n      \\.locator[\\s\\S]*?\\.waitFor\\(\\);/, "")',
  );
  prefix = prefix.replace("const common =", "let common =");
  prefix = prefix.replace("const boundary =", "let boundary =");
  prefix += String.raw`
common=common.replace(/  await page\.goto\(\x60\$\{origin\}\/\$\{role\}\/profile\x60[\s\S]*?  await applyTheme\(\);/, "");
common=common.replace('if (!localStorage.getItem("lexnepal_lang"))','if (window === window.top && !localStorage.getItem("lexnepal_lang"))');
common=common.replace('(theme) => document.documentElement.classList.toggle', '(theme) => document.documentElement?.classList.toggle');
// Read the committed React root before changing a test-only document theme.
// A theme mutation during hydration itself creates a false root-class warning.
common=common.replace('async function applyTheme() {', 'async function applyTheme() {\n  await page.waitForFunction(() => { const key = Object.keys(document.body).find(key => key.startsWith("__reactFiber$")); if (!key) return false; let fiber = document.body[key]; while (fiber.return) fiber = fiber.return; return fiber.stateNode?.current?.memoizedState?.isDehydrated === false; });\n  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));');
boundary=common.indexOf("if (publicContrastOnly) {\n  assert.equal(prior.results.length");
`;
  const tail = source.slice(end);
  const generator = out + "/integration-generator.mjs";
  fs.writeFileSync(generator, prefix + "const checks = " + JSON.stringify(checks) + ";\n" + tail);
  process.exitCode =
    spawnSync(process.execPath, [generator, ...process.argv.slice(2)], { stdio: "inherit" })
      .status ?? 1;
}
