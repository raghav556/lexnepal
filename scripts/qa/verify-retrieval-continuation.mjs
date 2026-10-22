import fs from "node:fs";
import { spawnSync } from "node:child_process";
const out = ".local/qa/session-17d";
fs.mkdirSync(out, { recursive: true });
const common = fs.readFileSync("scripts/qa/verify-account-profile.mjs", "utf8").replaceAll("\r\n", "\n");
const paging = fs.readFileSync("scripts/qa/verify-staff-pagination.mjs", "utf8").replaceAll("\r\n", "\n");
const boundary = common.indexOf("if (publicContrastOnly) {\n  assert.equal(prior.results.length");
const start = paging.indexOf("async function paginationAudit()"), end = paging.indexOf("  async function exercise(label)");
if (boundary < 0 || start < 0 || end < 0) throw new Error("Review committed fixture boundaries");
const retrievalFixtures = String.raw`
      if (['/api/v1/documents','/api/v1/documents/search','/api/v1/users/me/audit-events','/api/v1/notifications'].includes(p)) {
        const kind=p.includes('/documents')?'documents':p.includes('audit-events')?'events':'notifications';
        const entries=Array.from({length:count},(_,i)=>{
          const key='85000000-0000-4000-8000-'+String(count-i).padStart(12,'0');
          return {id:key,_id:key,title:kind==='documents'?'Pagination document '+(i+1)+'.pdf':'Notification '+(i+1),fileName:'document-'+(i+1)+'.pdf',
            body:'Synthetic authorized update '+(i+1),type:kind==='documents'?'evidence':'hearing',caseId:kind==='documents'&&generalDocs?undefined:caseId,uploadedBy:id,mimeType:'application/pdf',sizeBytes:1000,
            isTemplate:u.searchParams.get('isTemplate')==='true',isDeleted:u.searchParams.get('inTrash')==='true',isPrivileged:false,confidentialityLevel:'public',tags:['verified'],
            createdAt:stamp,updatedAt:stamp,_creationTime:Date.parse(stamp),isRead:readAll||readIds.has(key),link:null,
            action:'profile.updated',...(role==='client'?{}:{details:'PRIVATE_SYNTHETIC_AUDIT',ipAddress:'192.0.2.123'})};
        });
        const cursor=u.searchParams.get('cursor');
        if (failure===p && (failureInitial || cursor))return r.fulfill({status:failureStatus,json:{error:{code:failureStatus===403?'FORBIDDEN':'SERVICE_UNAVAILABLE',message:'Synthetic retrieval failure'}}});
        let filtered=entries;
        if (p.endsWith('/search')){const q=(u.searchParams.get('query')??'').toLowerCase();filtered=entries.filter(e=>e.title.toLowerCase().includes(q));}
        const offset=cursor?filtered.findIndex(e=>e.id===JSON.parse(Buffer.from(cursor,'base64url').toString()).i)+1:0;
        const limit=Number(u.searchParams.get('limit')??(kind==='events'?30:50));
        const items=filtered.slice(offset,offset+limit),last=items.at(-1);
        const nextCursor=offset+items.length<filtered.length&&last?Buffer.from(JSON.stringify({t:stamp,i:last.id})).toString('base64url'):null;
        requests.push({path:p,cursor,offset,limit,returned:items.length,page:u.searchParams.get('page'),nextCursor,query:u.searchParams.get('query'),inTrash:u.searchParams.get('inTrash')});
        return r.fulfill({json:{data:u.searchParams.get('page')==='true'?{items,nextCursor,total:null}:items}});
      }
`;
const fixtures = paging.slice(start, end).replace("async function paginationAudit()", "async function retrievalAudit()")
  .replace('      if (p === "/api/v1/users/me/audit-events" && auditCount !== null)', retrievalFixtures+'\n      if (p === "/api/v1/users/me/audit-events" && auditCount !== null)')
  .replace('      if (req.method() !== "GET") {', String.raw`      if (req.method() !== "GET" && p.startsWith('/api/v1/notifications')) {
        writes.push({path:p,method:req.method(),intercepted:true,payload:req.postDataJSON()});
        if(p==='/api/v1/notifications')readAll=true;else readIds.add(p.split('/').at(-1));
        return r.fulfill({json:{data:{success:true}}});
      }
      if (req.method()==='PATCH' && p.startsWith('/api/v1/tasks/')) {
        const payload=req.postDataJSON();writes.push({path:p,method:'PATCH',intercepted:true,payload});
        return r.fulfill({json:{data:{id:p.split('/').at(-1),...payload}}});
      }
      if (req.method() !== "GET") {`)
  .replace('waitUntil: "domcontentloaded"', 'waitUntil: "commit", timeout: 90000');
const checks = String.raw`
  async function locale(language) {const control=page.getByRole('button',{name:language==='ne'?'Switch language to Nepali':'Switch language to English',exact:true}).filter({visible:true});if(await control.count())await control.click();}
  async function scan(label,selector){const result=await new AxeBuilder({page}).include(selector).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();scans.push({label,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,checks:n.any.map(c=>({id:c.id,message:c.message,data:c.data}))}))}))});}
  const status=(noun)=>page.locator('[data-collection="'+noun+'"]:visible').first();
  async function advance(noun, expected){const box=status(noun);await box.locator('button').filter({hasText:/Load more|\u0925\u092a/}).click();await expect.poll(async()=>(await box.textContent()).replace(/[\u0966-\u096f]/g,ch=>String(ch.charCodeAt(0)-0x966))).toContain(String(expected));}
  const plans=[
    {path:'/staff/documents',role:'staff',kind:'documents',label:'Documents library'},
    {path:'/staff/cases/'+caseId,role:'staff',kind:'documents',tab:/Misl|Files/i,label:'Case Misl'},
    {path:'/staff/cases/'+caseId,role:'staff',kind:'documents',tab:/Timeline/i,label:'Document-derived case history'},
    {path:'/admin/cases/'+caseId,role:'admin',kind:'documents',tab:/Misl|Files/i,label:'Admin case Misl'},
    {path:'/admin/cases/'+caseId,role:'admin',kind:'documents',tab:/Timeline/i,label:'Admin document history'},
    ...['staff','admin','client'].map(role=>({path:'/'+role+'/profile',role,kind:'events',tab:/Data|Activity/i,label:role+' own audit'})),
    {path:'/client/documents',role:'client',kind:'documents',label:'Client Documents'},
    {path:'/client/notifications',role:'client',kind:'notifications',label:'Client notifications'},
    {path:'/client/cases/'+caseId,role:'client',kind:'documents',tab:/Documents/i,label:'Client matter documents'},
    {path:'/client/cases/'+caseId,role:'client',kind:'notifications',tab:/Updates/i,label:'Client matter updates'},
    {path:'/client/cases',role:'client',kind:'notifications',label:'Client matter activity'},
    {path:'/admin/document-generator',role:'admin',kind:'documents',label:'Admin file templates'},
  ];
  try {
    if(process.argv.includes('--resume')){
      const prior=JSON.parse(fs.readFileSync(out+'/browser-core-passed.json','utf8'));assert.equal(prior.results.length,21);assert.equal(prior.errors.length,0);assert(prior.scans.every(s=>!s.violations.length));assert(prior.writes.every(w=>w.intercepted));
      results.push(...prior.results);scans.push(...prior.scans.filter(s=>s.label!=='admin notification menu'));writes.push(...prior.writes);
    }
    for(const plan of process.argv.includes('--menus-only')||process.argv.includes('--extras-only')||process.argv.includes('--actions-only')||process.argv.includes('--filters-only')?[]:plans)for(const language of ['en','ne']){
      if(results.some(r=>r.check===plan.label&&r.language===language))continue;
      failure='';failureInitial=false;readAll=false;readIds.clear();requests=[];
      const width=language==='en'?1440:390,theme=language==='en'?'light':'dark',size=plan.kind==='events'?65:105;
      await open(plan.path,width,theme,size,plan.role);await locale(language);
      if(plan.tab)await page.getByRole('tab',{name:plan.tab}).click();
      const box=status(plan.kind);await expect(box).toBeVisible();const beforeGeometry=await geometry();await expect(box.getByRole('button',{name:/Load more|थप/})).toBeVisible();
      await advance(plan.kind,plan.kind==='events'?60:100);await advance(plan.kind,size);
      await expect(box.getByRole('button')).toHaveCount(0);
      const group=requests.filter(r=>r.path===(plan.kind==='events'?'/api/v1/users/me/audit-events':plan.kind==='notifications'?'/api/v1/notifications':'/api/v1/documents'));
      assert.deepEqual([...new Set(group.map(r=>r.offset))].sort((a,b)=>a-b),plan.kind==='events'?[0,30,60]:[0,50,100]);
      if(plan.role==='client'&&plan.kind==='events')await expect(page.locator('main')).not.toContainText('PRIVATE_SYNTHETIC_AUDIT');
      if(plan.label==='Documents library'){
        await page.locator('.staff-docs-pagination').getByRole('button',{name:'9',exact:true}).click();await expect(page.getByText('Pagination document 105.pdf',{exact:true})).toBeVisible();
        await page.getByLabel('Select all on this page', {exact:false}).check();await expect(page.locator('.staff-docs-bulk-count')).toContainText('selected');
      }
      if(plan.label==='Document-derived case history')await expect(page.locator('main')).toContainText('Document: Pagination document');
      await scan(plan.label+language,'[data-collection="'+plan.kind+'"]');
      const g=await geometry();assert.equal(g.overflow,0);if(plan.role!=='client')assert.equal(g.bodyRange,0);
      await capture('retrieval-'+plan.label.toLowerCase().replaceAll(' ','-')+'-'+language+'-'+width);
      results.push({check:plan.label,language,width,theme,loaded:size,beforeGeometry,afterGeometry:g,offsets:[...new Set(group.map(r=>r.offset))]});
    }
    for(const role of process.argv.includes('--extras-only')||process.argv.includes('--actions-only')||process.argv.includes('--filters-only')?[]:['staff','admin'])for(const language of ['en','ne']){
      if(results.some(r=>r.check===role+' shared notification menu continuation and intercepted mark-all-read'&&r.language===language))continue;
      const width=language==='en'?1440:360,theme=language==='en'?'light':'dark';
      failure='';requests=[];readAll=false;readIds.clear();await open('/'+role,width,theme,55,role);await locale(language);
      await page.getByRole('button',{name:/Open notifications/}).click();await advance('notifications',55);
      await expect(status('notifications').getByRole('button')).toHaveCount(0);await scan(role+' notification menu','[data-collection="notifications"]');
      const semantics=await new AxeBuilder({page}).include('[role="menu"]').withRules(['aria-required-children','aria-required-parent','nested-interactive','button-name','aria-allowed-role']).analyze();scans.push({label:role+' notification menu semantics',violations:semantics.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,checks:n.any.map(c=>({message:c.message,data:c.data}))}))}))});
      await page.getByRole('menuitem',{name:'Mark all read',exact:true}).click();await expect.poll(()=>writes.filter(w=>w.path==='/api/v1/notifications').length).toBeGreaterThan(0);
      const g=await geometry();assert.equal(g.overflow,0);assert.equal(g.bodyRange,0);
      await capture('retrieval-'+role+'-notification-menu-'+language+'-'+width);
      results.push({check:role+' shared notification menu continuation and intercepted mark-all-read',language,width,theme,loaded:55});
    }
    for(const language of process.argv.includes('--menus-only')||process.argv.includes('--extras-only')||process.argv.includes('--actions-only')||process.argv.includes('--filters-only')?[]:['en','ne']){
      failure='';requests=[];await open('/staff/documents',language==='en'?1440:390,language==='en'?'light':'dark',105);await locale(language);
      const search=page.getByPlaceholder('Search documents by content or title...');await search.fill('Pagination document');await search.press('Enter');
      await expect.poll(()=>requests.filter(r=>r.path==='/api/v1/documents/search').length).toBeGreaterThan(0);
      const box=status('documents');await box.getByRole('button',{name:/Load more|थप/}).focus();await page.keyboard.press('Enter');
      await expect.poll(async()=>(await box.textContent()).replace(/[\u0966-\u096f]/g,ch=>String(ch.charCodeAt(0)-0x966))).toContain('100');
      await advance('documents',105);await expect(search).toHaveValue('Pagination document');await expect(box.getByRole('button')).toHaveCount(0);
      await scan('Search continuation keyboard '+language,'[data-collection="documents"]');results.push({check:'Search pagination keeps filters and supports keyboard continuation',language});
    }
    if(!process.argv.includes('--menus-only')&&!process.argv.includes('--extras-only')&&!process.argv.includes('--actions-only')&&!process.argv.includes('--filters-only')) {
    failure='';await open('/staff/documents',390,'dark',55);const docs=status('documents');
    failure='/api/v1/documents';failureStatus=503;await docs.getByRole('button',{name:/Load more/}).click();await expect(docs.getByRole('button',{name:/Retry/})).toBeVisible();await expect(docs).toContainText('50 documents loaded');
    failure='';await docs.getByRole('button',{name:/Retry/}).click();await expect(docs).toContainText('55 documents loaded');results.push({check:'Document continuation failure retains loaded rows and retry restores the same cursor'});
    failure='';await open('/client/profile',390,'dark',31,'client');await page.getByRole('tab',{name:/Data/i}).click();
    failure='/api/v1/users/me/audit-events';failureStatus=403;await status('events').getByRole('button',{name:/Load more/}).click();await expect(status('events').getByRole('button',{name:/Retry/})).toBeVisible();await expect(page.locator('main')).not.toContainText('PRIVATE_SYNTHETIC_AUDIT');await expect(status('events')).not.toContainText('30 events loaded');
    failure='';await status('events').getByRole('button',{name:/Retry/}).click();await expect(status('events')).toContainText('31 events loaded');results.push({check:'Client audit denial withholds cached records/count and retry recovers continuation'});
    }
    if(process.argv.includes('--extras-only')) {
      for(const language of ['en','ne']) {
        failure='';await open('/staff/tasks',language==='en'?1440:360,language==='en'?'light':'dark',55);await locale(language);
        await page.locator('.staff-task-list').getByText('Pagination task 1',{exact:true}).click();
        const field=page.locator('#edit-task-document');await expect(field).toBeVisible();
        const box=status('documents');await expect(box).toBeVisible();
        const fits=await box.evaluate(e=>e.scrollWidth<=e.clientWidth+1);assert(fits,'Continuation must fit the task form column');
        await advance('documents',55);await field.selectOption('85000000-0000-4000-8000-000000000001');
        const save=page.getByRole('button',{name:'Save',exact:true});await save.click();
        await expect.poll(()=>writes.filter(w=>w.path.includes('/api/v1/tasks/')).length).toBeGreaterThan(0);
        const write=writes.filter(w=>w.path.includes('/api/v1/tasks/')).at(-1);assert.equal(write.payload.documentId,'85000000-0000-4000-8000-000000000001');
        results.push({check:'Task older-document selection, narrow control containment and intercepted Save',language});
      }
      for(const [path,noun,tab] of [['/staff/documents','documents',null],['/staff/profile','events',/Data/i],['/client/notifications','notifications',null]])for(const size of [0,1]){
        failure='';await open(path,390,'dark',size,path.startsWith('/client')?'client':'staff');if(tab)await page.getByRole('tab',{name:tab}).click();
        await expect(status(noun)).toContainText(String(size)+' '+noun+' loaded');await expect(status(noun).locator('button')).toHaveCount(0);
        await scan('Empty/single '+noun+size,'[data-collection="'+noun+'"]');results.push({check:'Truthful empty/single retrieval without a false continuation',path,size});
      }
      failure='';requests=[];await open('/staff/cases/'+caseId,1440,'light',55);await page.getByRole('tab',{name:/Misl|Files/i}).click();await advance('documents',55);
      const before=requests.filter(r=>r.path==='/api/v1/documents').length;await page.getByRole('tab',{name:/Timeline/i}).click();await expect(status('documents')).toContainText('55 documents loaded');assert.equal(requests.filter(r=>r.path==='/api/v1/documents').length,before);
      results.push({check:'Misl and document-derived history reuse the same completed retrieval without another request'});
    }
    if(process.argv.includes('--actions-only')) {
      failure='';readAll=false;readIds.clear();await open('/client/notifications',390,'dark',55,'client');
      const box=status('notifications');await box.locator('button').focus();await page.keyboard.press('Enter');await expect(box).toContainText('55 notifications loaded');
      const item=page.getByRole('button',{name:'Notification 55',exact:false});await item.focus();await page.keyboard.press('Enter');
      await expect.poll(()=>writes.filter(w=>w.path.endsWith('/85000000-0000-4000-8000-000000000001')).length).toBe(1);
      await expect(page.getByText('Notification 55',{exact:false}).first()).toBeVisible();await expect(page.getByRole('button',{name:'Notification 55',exact:false})).toHaveCount(0);
      await scan('Older notification read and keyboard continuation','[data-collection="notifications"]');await capture('retrieval-client-older-notification-read-390-dark');results.push({check:'Older-page notification single-read PATCH is intercepted, retains its record and refreshes read state'});
    }
    if(process.argv.includes('--filters-only')) {
      failure='';generalDocs=true;await open('/staff/documents',390,'dark',55);await advance('documents',55);
      await page.getByRole('button',{name:'Folders',exact:true}).click();await page.getByRole('button',{name:/Firm General Internal Documents/}).click();await page.getByRole('button',{name:/^evidence Sub-Folder$/i}).click();
      await expect(page.locator('.staff-docs-count')).toContainText('55 loaded documents');
      await page.locator('.staff-docs-pagination').getByRole('button',{name:'5',exact:true}).click();await expect(page.getByText('Pagination document 55.pdf',{exact:true})).toBeVisible();
      results.push({check:'Firm General folder retains all current documents with absent case IDs'});
      await page.getByRole('button',{name:'Trash',exact:true}).click();await advance('documents',55);
      const search=page.getByPlaceholder('Search documents by content or title...');await search.fill('Pagination document');await search.press('Enter');await expect.poll(()=>requests.filter(r=>r.path==='/api/v1/documents/search').length).toBeGreaterThan(0);await advance('documents',55);
      assert(requests.filter(r=>r.path==='/api/v1/documents/search').every(r=>r.inTrash==='true'));
      await expect(search).toHaveValue('Pagination document');await scan('General folders and trash search continuation','[data-collection="documents"]');await capture('retrieval-general-folder-trash-390-dark');results.push({check:'Trash search propagates its actual filter and continues without losing the draft'});
    }
  } catch(error) {
    await capture('retrieval-failed-attempt');
    throw error;
  } finally {
    fs.writeFileSync(out+(process.argv.includes('--menus-only')?'/browser-menu-evidence.json':process.argv.includes('--extras-only')?'/browser-extra-evidence.json':process.argv.includes('--actions-only')?'/browser-action-evidence.json':process.argv.includes('--filters-only')?'/browser-filter-evidence.json':'/browser-evidence.json'),JSON.stringify({results,scans,errors,writes,requests,liveMutations:0},null,2));
    console.log(JSON.stringify({checks:results.length,scans:scans.length,violations:scans.flatMap(s=>s.violations).length,exceptions:errors.length,writes:writes.length,liveMutations:0}));
    await context?.close();await browser.close();
  }
  assert.equal(errors.length,0);assert(scans.every(s=>!s.violations.length));assert(writes.every(w=>w.intercepted));
}
await retrievalAudit();
`;
const worker = out + "/retrieval-worker.mjs";
fs.writeFileSync(worker, common.slice(0,boundary).replace('const out = ".local/qa/session-17a";',`const out = "${out}";`) + '\nlet failure="",failureStatus=503,failureInitial=false,readAll=false,generalDocs=false,requests=[];const readIds=new Set();\n' + fixtures + checks);
process.exitCode = spawnSync(process.execPath,[worker,...process.argv.slice(2)],{stdio:"inherit"}).status ?? 1;
