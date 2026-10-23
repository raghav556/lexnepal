// Reuse Session18's retained populated/intercepted worker; no route rediscovery.
import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const source = fs.readFileSync(".local/qa/session-18/retrieval-worker.mjs", "utf8");
const boundary = source.indexOf("  const inventory=JSON.parse(");
assert(boundary > source.indexOf("async function retrievalAudit()"));
const out = ".local/qa/session-18b";
const checks = String.raw`
  const completed=[],a11y=[];const actionsOnly=process.argv.includes('--actions-only'),tooltipOnly=process.argv.includes('--tooltip-only');
  const locale=async language=>{const control=page.getByRole('button',{name:language==='ne'?'Switch language to Nepali':'Switch language to English',exact:true}).filter({visible:true});await page.getByRole('button',{name:/^Switch language to /}).filter({visible:true}).first().waitFor();if(await control.count())await control.first().click();await expect(page.getByRole('button',{name:language==='ne'?'Switch language to English':'Switch language to Nepali',exact:true}).filter({visible:true}).first()).toBeVisible();};
  const persist=()=>fs.writeFileSync(out+(actionsOnly?'/action-evidence.json':tooltipOnly?'/tooltip-evidence.json':'/workflow-evidence.json'),JSON.stringify({completed,a11y,errors,writes,liveMutations:0},null,2));
  const scan=async label=>{const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();a11y.push({label,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});persist();assert.equal(result.violations.length,0,label);};
  try {
    if(!actionsOnly&&!tooltipOnly)for(const role of ['admin','staff','client'])for(const [language,width,theme] of [['en',1440,'light'],['ne',390,'dark']]){
      await open('/'+role,width,theme,3,role);await locale(language);
      await expect(page.locator('main').getByRole('heading',{level:1})).toBeVisible();
      await page.waitForTimeout(700);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await scan(role+' dashboard '+language);
      if(role==='staff'){
        // Approved Staff mobile chrome hides the desktop search below md.
        // Exercise the same Nepali control at its supported tablet breakpoint.
        if(width<768){await expect(page.locator('.staff-admin-topbar')).toBeHidden();await page.setViewportSize({width:768,height:900});}
        const search=page.getByRole('button',{name:/search/i}).filter({visible:true}).first();await search.click();
        const input=page.getByRole('combobox').or(page.getByPlaceholder(/search/i)).filter({visible:true}).first();await expect(input).toBeFocused();await input.fill('case');await page.keyboard.press('Escape');await expect(input).not.toBeVisible();
        completed.push({check:'Staff shared search keyboard open/input/Escape',language,width:Math.max(width,768)});
        if(width<768)await page.setViewportSize({width,height:900});
      }
      completed.push({check:'Semantic dashboard/status primitives, containment and accessibility',role,language,width,theme});persist();
    }
    if(!actionsOnly&&!tooltipOnly)for(const [language,width,theme] of [['en',1440,'light'],['ne',390,'dark']]){
      await open('/client/booking',width,theme,3,'client');await locale(language);
      const field=page.locator('[data-slot="bs-date-field"]').first();await field.scrollIntoViewIfNeeded();
      const inputs=field.locator('input');assert.equal(await inputs.count()>=2,true);
      const control=inputs.filter({visible:true}).first();
      const geometry=await control.evaluate(e=>{const s=getComputedStyle(e);return {border:s.borderColor,background:s.backgroundColor,rect:e.getBoundingClientRect().toJSON()};});
      assert.notEqual(geometry.border,'rgb(215, 221, 230)');
      await control.focus();await expect(control).toBeFocused();
      await scan('Client booking control border/focus '+language);
      completed.push({check:'Client editable control boundary uses existing focus token; readonly counterpart and field retained',language,width,theme,geometry});persist();
    }
    if(actionsOnly)for(const [language,width,theme] of [['en',1440,'light'],['ne',390,'dark']]){
      await open('/admin/users',width,theme,3,'admin');await locale(language);
      let denied=true;const submissions=[];
      await page.route('**/api/v1/users',async route=>{if(route.request().method()!=='POST')return route.fallback();const payload=route.request().postDataJSON();submissions.push(payload);writes.push({path:'/api/v1/users',method:'POST',payload,intercepted:true,status:denied?403:201});if(denied){denied=false;return route.fulfill({status:403,json:{error:{code:'FORBIDDEN',message:'Synthetic permission denial'}}});}return route.fulfill({status:201,json:{data:{id:'91000000-0000-4000-8000-000000000001',...payload}}});});
      await page.getByRole('button',{name:'Invite user',exact:true}).click();
      const dialog=page.getByRole('dialog',{name:'Invite user'});await expect(dialog).toBeVisible();
      const name=dialog.getByPlaceholder('Jane Doe');await name.fill('Synthetic Invite');await dialog.getByPlaceholder('jane@firm.example').fill('qa@example.invalid');
      await dialog.getByRole('combobox',{name:'Invited user role'}).click();await page.getByRole('option',{name:'Paralegal',exact:true}).click();
      await scan('Admin invite dialog '+language);
      assert.equal(await name.evaluate(input=>input.labels.length),1,'Visible label must target the editable name input');
      await dialog.getByRole('button',{name:'Send invitation',exact:true}).click();await expect(name).toHaveValue('Synthetic Invite');await expect(page.getByText('Failed to invite user',{exact:true})).toBeVisible();
      await dialog.getByRole('button',{name:'Send invitation',exact:true}).click();await expect(dialog).not.toBeVisible();
      assert.equal(submissions.length,2);assert.deepEqual(submissions[0],submissions[1]);assert.equal(submissions[1].role,'paralegal');assert.equal(submissions[1].isPublicFacing,false);assert.equal(submissions[1].invite,true);
      completed.push({check:'Admin invitation role selection, 403 preserved draft, retry payload, dialog accessibility',language,width,theme});persist();
    }
    if(tooltipOnly)for(const [language,width,theme] of [['en',1440,'light'],['ne',390,'dark']]){
      await open('/admin',width,theme,3,'admin');await locale(language);
      const dot=page.locator('.recharts-area-dot').first();await expect(dot).toBeVisible();await dot.hover();
      const tooltip=page.locator('.recharts-default-tooltip').filter({visible:true});await expect(tooltip).toBeVisible();
      const colors=await tooltip.evaluate(e=>{const label=e.querySelector('.recharts-tooltip-label')||e;return {foreground:getComputedStyle(label).color,background:getComputedStyle(e).backgroundColor,text:label.textContent};});completed.push({check:'Actual populated Admin hearing chart tooltip',language,width,theme,colors});persist();
      const lum=color=>{const channels=color.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};const fg=lum(colors.foreground),bg=lum(colors.background);const ratio=(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);assert(ratio>=4.5,'Tooltip label contrast '+ratio);await scan('Admin populated tooltip '+language);
      await page.getByRole('heading',{name:'Team Workload',exact:true}).scrollIntoViewIfNeeded();await scan('Admin workload and priorities '+language);
      await page.getByRole('heading',{name:'Audit & Security',exact:true}).scrollIntoViewIfNeeded();await scan('Admin audit cards '+language);
    }
    assert.equal(errors.length,0);assert(writes.every(w=>w.intercepted));
  } finally {persist();await context?.close();await browser.close();}
}
await retrievalAudit();
`;
fs.mkdirSync(out, { recursive: true });
const worker = `${out}/workflow-worker.mjs`;
fs.writeFileSync(
  worker,
  source
    .slice(0, boundary)
    .replace('const out = ".local/qa/session-18";', `const out = "${out}";`) + checks,
);
process.exitCode =
  spawnSync(process.execPath, [worker, ...process.argv.slice(2)], { stdio: "inherit" }).status ?? 1;
