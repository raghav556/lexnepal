import fs from "node:fs";
import { spawnSync } from "node:child_process";

// Reuse existing role fixtures, real route navigation and complete write interception.
const out = ".local/qa/session-17f";
fs.mkdirSync(out, { recursive: true });
const shared = fs
  .readFileSync("scripts/qa/verify-account-profile.mjs", "utf8")
  .replaceAll("\r\n", "\n");
const boundary = shared.indexOf("if (publicContrastOnly) {\n  assert.equal(prior.results.length");
const paging = fs
  .readFileSync("scripts/qa/verify-staff-pagination.mjs", "utf8")
  .replaceAll("\r\n", "\n");
const start = paging.indexOf("async function paginationAudit()"),
  end = paging.indexOf("  async function exercise(label)");
if (boundary < 0 || start < 0 || end < 0)
  throw new Error("Review committed QA fixture boundaries.");
const fixtures = paging
  .slice(start, end)
  .replace("async function paginationAudit()", "async function courtAudit()")
  .replace(
    'description: "Synthetic matter.",',
    'description: "Synthetic matter.", court: courtFixture,',
  )
  .replaceAll('court: "Supreme Court",', "court: courtFixture,")
  .replace('waitUntil: "domcontentloaded"', 'waitUntil: "commit", timeout: 90000');
const checks = String.raw`
  async function languageChoice(language) {
    const control = page.getByRole('button', { name: language === 'ne' ? 'Switch language to Nepali' : 'Switch language to English', exact: true }).filter({ visible: true });
    if (await control.count()) await control.click();
  }
  async function scan(label, selector) {
    const result = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    scans.push({ label, selector, violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
  }
  const plans = [
    { role: 'staff', label: 'staff-create', path: '/staff/cases', open: /new case|create case/i, field: '#case-court' },
    { role: 'admin', label: 'admin-create', path: '/admin/cases', open: /new case|create case/i, field: '#case-court' },
    { role: 'staff', label: 'staff-edit', path: '/staff/cases/' + caseId, open: /^Edit details$/, field: '#detail-court' },
    { role: 'admin', label: 'admin-edit', path: '/admin/cases/' + caseId, open: /^Edit details$/, field: '#detail-court' },
    { role: 'staff', label: 'staff-schedule', path: '/staff/cases/' + caseId, open: /^Schedule hearing$/, field: '#case-hearing-court' },
    { role: 'admin', label: 'admin-schedule', path: '/admin/cases/' + caseId, open: /^Schedule hearing$/, field: '#case-hearing-court' },
    { role: 'staff', label: 'hearings-create', path: '/staff/hearings', open: /add hearing|new hearing/i, field: '#hearing-create-court' },
    { role: 'staff', label: 'hearings-filter', path: '/staff/hearings', field: '#hearing-court-filter' },
  ];
  async function matrix() {
    for (const plan of plans.filter(plan => !process.argv.includes('--smoke') || ['staff-create', 'hearings-filter'].includes(plan.label))) for (const language of ['en', 'ne']) {
      courtFixture = 'High Court — Butwal';
      await open(plan.path, 1440, 'light', 1, plan.role); await languageChoice(language);
      if (plan.label.endsWith('-schedule')) await page.getByRole('tab', { name: /hearings/i }).click();
      if (plan.open) await page.getByRole('button', { name: plan.open }).first().click();
      const input = page.locator(plan.field), field = input.locator('xpath=ancestor::*[@data-slot="court-select"]');
      await expect(input).toBeVisible();
      for (const width of process.argv.includes('--smoke') || process.argv.includes('--layout-final') ? [360,1440] : [360,390,768,1024,1280,1440]) for (const theme of ['light','dark']) {
        await page.setViewportSize({ width, height: 900 }); currentTheme = theme; capturedTheme = theme; await applyTheme();
        await input.scrollIntoViewIfNeeded(); await field.getByRole('button', { name: /Open courts|अदालतहरू खोल्नुहोस्/ }).click();
        const popup = page.locator('.court-select-popup'), list = page.getByRole('listbox', { name: /Verified courts|प्रमाणित अदालतहरू/ });
        await expect(popup).toBeVisible(); await expect(list.getByRole('option')).toHaveCount(110);
        if(plan.label==='staff-create'&&width===1440&&theme==='light') {
          await expect(page.getByRole('dialog',{name:'Create New Case',exact:true})).toHaveAttribute('aria-owns',/case-court-popup/);
          await popup.focus();await page.keyboard.press('PageDown');await expect.poll(()=>popup.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
          await scan('Full Case popup keyboard scroll '+language,'.court-select-popup');
          await page.keyboard.press('Tab');await expect(popup).toHaveCount(0);
          assert(await page.getByRole('dialog',{name:'Create New Case',exact:true}).evaluate(e=>e.contains(document.activeElement)));
          await field.getByRole('button',{name:/Open courts|अदालतहरू खोल्नुहोस्/}).click();
        }
        assert.equal(await list.getByRole('option', { name: /^(Other|Unknown|Unverified courts)$/ }).count(), 0);
        await expect(input).toBeFocused();
        const bounds = await popup.boundingBox(); assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y >= 0 && bounds.y + bounds.height <= 901);
        await input.fill('Butwal'); await expect(list.getByRole('option')).toHaveCount(1);
        await expect(list.getByRole('option')).toContainText(language === 'en' ? 'High Court Tulsipur, Butwal Bench' : 'उच्च अदालत तुलसीपुर, बुटवल इजलास');
        await input.fill('बुटवल'); await expect(list.getByRole('option')).toHaveCount(1);
        await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await expect(popup).toHaveCount(0);
        await expect(field).toHaveAttribute('data-court-value', 'High Court Tulsipur, Butwal Bench');
        await expect(input).toHaveValue(language === 'en' ? 'High Court Tulsipur, Butwal Bench' : 'उच्च अदालत तुलसीपुर, बुटवल इजलास');
        const selectedCopy=field.locator('[data-court-selection]');await expect(selectedCopy).toHaveText(language==='en'?'High Court Tulsipur, Butwal Bench':'उच्च अदालत तुलसीपुर, बुटवल इजलास');
        assert(await selectedCopy.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
        await field.getByRole('button', { name: /Open courts|अदालतहरू खोल्नुहोस्/ }).click();
        await input.fill('definitely absent'); await expect(popup.getByRole('status')).toBeVisible();
        await page.keyboard.press('Escape'); await expect(popup).toHaveCount(0); await expect(input).toBeFocused();
        assert.equal((await geometry()).overflow,0); assert.equal((await geometry()).bodyRange,0);
        if ([360,1440].includes(width)) {
          await scan(plan.label + language + width + theme, '[data-slot="court-select"]');
          await field.getByRole('button', { name: /Open courts|अदालतहरू खोल्नुहोस्/ }).click();
          await input.fill('Butwal'); if(!process.argv.includes('--layout-final'))await scan('Open ' + plan.label + language + width + theme, '.court-select-popup');
          if ((width===360&&theme==='dark')||(width===1440&&theme==='light')) await capture('court-'+plan.label+'-'+language+'-'+width+'-'+theme);
          await page.keyboard.press('Escape');
        }
        pass('Real court combobox / bilingual aliases / canonical value / keyboard / containment', { plan: plan.label, role: plan.role, language, width, theme });
      }
    }
  }
  async function selectCourt(selector, language) {
    const input = page.locator(selector), field = input.locator('xpath=ancestor::*[@data-slot="court-select"]');
    await field.getByRole('button',{name:/Open courts|अदालतहरू खोल्नुहोस्/}).click();
    await input.fill(language === 'ne' ? 'बुटवल' : 'Butwal');
    try { await page.locator('.court-select-popup').getByRole('option').click({timeout:5000}); }
    catch(error){await capture('court-command-diagnostic');fs.writeFileSync(out+'/command-diagnostic.json',JSON.stringify({selector,language,input:await input.inputValue(),field:await field.getAttribute('data-court-value'),popup:await page.locator('.court-select-popup').allTextContents(),focused:await page.evaluate(()=>document.activeElement?.outerHTML),dialog:await page.getByRole('dialog').allTextContents()},null,2));throw error;}
    await expect(field).toHaveAttribute('data-court-value', 'High Court Tulsipur, Butwal Bench');
  }
  async function commands() {
    if(process.argv.includes('--commands-resume')) {
      const prior=JSON.parse(fs.readFileSync(out+'/browser-evidence-commands-before-hearing-fix.json','utf8'));
      assert.equal(prior.errors.length,0);assert(prior.scans.every(scan=>!scan.violations.length));
      results.push(...prior.results);writes.push(...prior.writes);scans.push(...prior.scans);
    }
    for (const role of process.argv.includes('--hearing-command')||process.argv.includes('--client-only')||process.argv.includes('--correction-only')?[]:['staff','admin']) for (const language of ['en','ne']) for (const legacy of ['High Court — Butwal','Revenue Tribunal','Family Court, Lalitpur','High Court, Kathmandu','']) {
      if(results.some(r=>r.check.startsWith('Unrelated case PATCH')&&r.role===role&&r.language===language&&r.legacy===legacy))continue;
      courtFixture = legacy;
      await open('/'+role+'/cases/'+caseId, language==='en'?1440:360, language==='en'?'light':'dark',1,role);
      await languageChoice(language); await page.getByRole('button',{name:'Edit details',exact:true}).click();
      const input=page.locator('#detail-court'), field=input.locator('xpath=ancestor::*[@data-slot="court-select"]');
      await expect(field).toHaveAttribute('data-court-value',legacy);
      if (legacy && legacy !== 'High Court — Butwal') await expect(field).toContainText(language==='en'?'Needs verification':'प्रमाणीकरण आवश्यक');
      const requests=[];
      await page.route('**/api/v1/cases/'+caseId,async route=>{
        if(route.request().method()!=='PATCH')return route.fallback();
        const payload=route.request().postDataJSON();requests.push(payload);writes.push({path:'/api/v1/cases/'+caseId,method:'PATCH',intercepted:true,payload});
        await route.fulfill({json:{data:{id:caseId,...payload}}});
      });
      await page.getByText('Judge Name',{exact:true}).locator('..').locator('input').fill('Synthetic unrelated judge edit');
      await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>requests.length).toBe(1);
      assert.equal(requests[0].court,legacy||undefined);assert.equal(requests[0].judge,'Synthetic unrelated judge edit');
      pass('Unrelated case PATCH preserves exact original court, including ambiguous/empty values',{role,language,legacy});
    }
    for(const plan of plans.filter(plan=>process.argv.includes('--client-only')||process.argv.includes('--correction-only')?false:process.argv.includes('--hearing-command')?plan.label==='hearings-create':plan.label.endsWith('-create')||plan.label.endsWith('-schedule'))) for(const language of ['en','ne']) {
      if(results.some(r=>r.check.startsWith('New record requires')&&r.plan===plan.label&&r.language===language))continue;
      courtFixture='Family Court, Lalitpur';
      await open(plan.path, language==='en'?1440:390,language==='en'?'light':'dark',1,plan.role);await languageChoice(language);
      if(plan.label.endsWith('-schedule'))await page.getByRole('tab',{name:/hearings/i}).click();
      await page.getByRole('button',{name:plan.open}).first().click();
      const api=plan.label.endsWith('-schedule')||plan.label==='hearings-create'?'/api/v1/hearings':'/api/v1/cases', requests=[];
      await page.route('**'+api,async route=>{if(route.request().method()!=='POST')return route.fallback();const payload=route.request().postDataJSON();requests.push(payload);writes.push({path:api,method:'POST',intercepted:true,payload});await route.fulfill({json:{data:{id:caseId,...payload}}});});
      if(api==='/api/v1/hearings') {
        if(plan.label==='hearings-create')await page.locator('#hearing-create-case').selectOption(caseId);
        assert.equal(await page.locator(plan.field).evaluate(e=>e.checkValidity()),false);
      }
      await selectCourt(plan.field,language);
      if(api==='/api/v1/cases') {
        await page.locator('#case-number').fill('SYNTHETIC-17F');await page.locator('#case-title').fill('Synthetic registry case');
        await page.locator('#case-client').click();await page.getByRole('option',{name:'Pagination client 1',exact:true}).click();
        await page.locator('#case-lawyer').click();await page.getByRole('option',{name:/Synthetic Profile Reviewer/}).click();
        await page.getByRole('button',{name:'Create Case',exact:true}).click();
      } else {
        const dateId=plan.label==='hearings-create'?'#hearing-create-date':'#case-hearing-bs';
        await page.locator(dateId).fill(language==='en'?'2026-10-20':'२०८३-०७-०३');
        const submitArea=plan.label.endsWith('-schedule')?page.getByRole('dialog',{name:'Schedule hearing',exact:true}):page;
        await submitArea.getByRole('button',{name:plan.label==='hearings-create'?'Schedule Hearing':'Schedule hearing',exact:true}).click();
      }
      await expect.poll(()=>requests.length).toBe(1);assert.equal(requests[0].court,'High Court Tulsipur, Butwal Bench');
      if(api==='/api/v1/hearings')assert.equal(requests[0].dateGregorian,'2026-10-20');
      pass('New record requires verified identity; intercepted canonical string / unchanged date contract',{plan:plan.label,role:plan.role,language});
    }
    for(const role of process.argv.includes('--client-only')?[]:['staff','admin']) {
      courtFixture='Family Court, Lalitpur';await open('/'+role+'/cases/'+caseId,role==='staff'?1440:390,role==='staff'?'light':'dark',1,role);
      await page.getByRole('button',{name:'Edit details',exact:true}).click();
      if(role==='admin')await languageChoice('ne');
      await expect(page.locator('#detail-court-verification')).toBeVisible();await page.locator('#detail-court').scrollIntoViewIfNeeded();await capture('court-legacy-'+role+'-needs-verification');
      await selectCourt('#detail-court',role==='admin'?'ne':'en');
      await languageChoice('ne');await expect(page.locator('#detail-court')).toHaveValue('उच्च अदालत तुलसीपुर, बुटवल इजलास');
      await languageChoice('en');await expect(page.locator('#detail-court')).toHaveValue('High Court Tulsipur, Butwal Bench');
      const requests=[];await page.route('**/api/v1/cases/'+caseId,async route=>{if(route.request().method()!=='PATCH')return route.fallback();const payload=route.request().postDataJSON();requests.push(payload);writes.push({path:'/api/v1/cases/'+caseId,method:'PATCH',intercepted:true,payload});await route.fulfill({json:{data:{id:caseId,...payload}}});});
      await page.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>requests.length).toBe(1);assert.equal(requests[0].court,'High Court Tulsipur, Butwal Bench');
      pass('Real global language switch and explicit verified correction preserve canonical selection/payload',{role,original:'Family Court, Lalitpur'});
    }
    for(const language of process.argv.includes('--client-only')||process.argv.includes('--correction-only')?[]:['en','ne']) {
      courtFixture='High Court — Butwal';await open('/staff/hearings',390,'dark',1);await languageChoice(language);await selectCourt('#hearing-court-filter',language);
      await expect(page.locator('.staff-hearings-list')).toContainText(language==='en'?'High Court Tulsipur, Butwal Bench':'उच्च अदालत तुलसीपुर, बुटवल इजलास');
      pass('Canonical court filter matches historical bench alias',{language});
      courtFixture='Family Court, Lalitpur';await open('/staff/hearings',390,'dark',1);await languageChoice(language);
      await page.getByLabel('Search hearings by case title or number',{exact:true}).fill('Family Court');
      await expect(page.getByText('Family Court, Lalitpur — '+(language==='en'?'Needs verification':'प्रमाणीकरण आवश्यक')).first()).toBeVisible();
      pass('Unrecognized legacy hearings remain accessible through original-text search',{language});
    }
    for(const language of process.argv.includes('--correction-only')?[]:['en','ne']) {
      courtFixture='High Court — Butwal';await open('/client/cases',390,'dark',1,'client');await languageChoice(language);
      await page.getByRole('textbox').first().fill(language==='en'?'Butwal':'बुटवल');
      await expect(page.getByText(language==='en'?'High Court Tulsipur, Butwal Bench':'उच्च अदालत तुलसीपुर, बुटवल इजलास').first()).toBeVisible();
      await page.getByRole('button',{name:'Table',exact:true}).click();
      await expect(page.getByRole('row').filter({hasText:'P-1'})).toContainText(language==='en'?'High Court Tulsipur, Butwal Bench':'उच्च अदालत तुलसीपुर, बुटवल इजलास');
      assert.equal((await geometry()).overflow,0);
      await expect(page.locator('[data-slot="court-select"]')).toHaveCount(0);await scan('Client read-only court '+language,'main');
      await capture('court-client-readonly-'+language+'-390-dark');
      pass('Client bilingual court search/display remains read-only',{language});
      courtFixture='Family Court, Lalitpur';await open('/client/cases',390,'dark',1,'client');await languageChoice(language);
      await page.getByLabel('Search matters',{exact:true}).fill('Family Court');await page.getByRole('button',{name:'Table',exact:true}).click();
      await expect(page.getByRole('row').filter({hasText:'P-1'})).toContainText('Family Court, Lalitpur — '+(language==='en'?'Needs verification':'प्रमाणीकरण आवश्यक'));
      await expect(page.locator('[data-slot="court-select"]')).toHaveCount(0);await scan('Client unresolved court '+language,'main');
      await capture('court-client-unresolved-'+language+'-390-dark');pass('Unresolved Client records remain searchable/read-only and visibly marked',{language});
    }
  }
  async function everyCourt() {
    const courts=JSON.parse(fs.readFileSync('src/lib/nepal-courts.json','utf8'));
    for(const language of ['en','ne']) {
      await open('/staff/hearings',language==='en'?1440:360,language==='en'?'light':'dark',1);await languageChoice(language);
      const input=page.locator('#hearing-court-filter'),field=input.locator('xpath=ancestor::*[@data-slot="court-select"]');
      await field.getByRole('button',{name:/Open courts|अदालतहरू खोल्नुहोस्/}).click();
      const popup=page.locator('.court-select-popup');
      assert.deepEqual((await popup.getByRole('option').evaluateAll(nodes=>nodes.map(n=>n.dataset.courtId))).sort(),courts.map(c=>c.id).sort());
      await popup.focus();await expect(popup).toBeFocused();await page.keyboard.press('PageDown');
      await expect.poll(()=>popup.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
      await scan('Complete registry '+language,'.court-select-popup');await page.keyboard.press('Escape');
      for(const court of courts) {
        await field.getByRole('button',{name:/Open courts|अदालतहरू खोल्नुहोस्/}).click();
        await input.fill(court.name[language]);await popup.locator('[data-court-id="'+court.id+'"]').click();
        await expect(field).toHaveAttribute('data-court-value',court.submissionValue??court.name.en);await expect(input).toHaveValue(court.name[language]);
      }
      await field.getByRole('button',{name:/Open courts|अदालतहरू खोल्नुहोस्/}).click();await input.fill('Birgunj');await expect(popup.locator('[data-court-id="high-birganj"]')).toBeVisible();await page.keyboard.press('Escape');
      pass('Every registry identity is present and selectable with canonical strings',{language,selections:courts.length});
    }
  }
  async function nameReview() {
    if(process.argv.includes('--name-review-resume')) {
      const prior=JSON.parse(fs.readFileSync(out+'/browser-evidence-name-review-before-filter-harness.json','utf8'));
      assert.equal(prior.results.length,14);assert.equal(prior.errors.length,0);assert.equal(prior.writes.length,14);assert(prior.writes.every(w=>w.intercepted));
      const completedScans=prior.scans.filter(s=>!s.label.includes('hearings-filter'));assert.equal(completedScans.length,28);assert(completedScans.every(s=>!s.violations.length));
      results.push(...prior.results);scans.push(...completedScans);writes.push(...prior.writes);
    }
    const courts=JSON.parse(fs.readFileSync('src/lib/nepal-courts.json','utf8'));
    const corrected=courts.filter(c=>c.submissionValue), selected=courts.find(c=>c.id==='district-bhaktapur');
    assert.equal(corrected.length,9);
    for(const plan of plans) for(const language of ['en','ne']) {
      if(results.some(r=>r.plan===plan.label&&r.language===language))continue;
      const width=language==='en'?1440:390,theme=language==='en'?'light':'dark';
      courtFixture=selected.submissionValue;
      await open(plan.path,width,theme,1,plan.role);await languageChoice(language);
      if(plan.label.endsWith('-schedule'))await page.getByRole('tab',{name:/hearings/i}).click();
      if(plan.open)await page.getByRole('button',{name:plan.open}).first().click();
      const input=page.locator(plan.field),field=input.locator('xpath=ancestor::*[@data-slot="court-select"]');
      if(plan.label==='hearings-create')await page.locator('#hearing-create-case').selectOption(caseId);
      if(plan.label.endsWith('-edit')||plan.label.endsWith('-schedule')) {
        await expect(input).toHaveValue(selected.name[language]);
        await expect(field).toHaveAttribute('data-court-value',selected.submissionValue);
      }
      const popup=page.locator('.court-select-popup');
      for(const court of plan.label==='staff-create'?corrected:[selected]) {
        for(const query of [court.submissionValue,court.name[language]]) {
          await field.getByRole('button',{name:/Open courts|अदालतहरू खोल्नुहोस्/}).click();await input.fill(query);
          const option=popup.locator('[data-court-id="'+court.id+'"]');await expect(option).toContainText(court.name[language]);
          await option.click();await expect(input).toHaveValue(court.name[language]);await expect(field).toHaveAttribute('data-court-value',court.submissionValue);
        }
      }
      await field.getByRole('button',{name:/Open courts|अदालतहरू खोल्नुहोस्/}).click();await input.fill(selected.name[language]);
      const option=popup.locator('[data-court-id="'+selected.id+'"]');await expect(option).toBeVisible();
      await scan('Name review popup '+plan.label+language,'.court-select-popup');
      const bounds=await popup.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1&&bounds.y>=0&&bounds.y+bounds.height<=901);
      await input.fill(selected.submissionValue);await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
      await expect(input).toHaveValue(selected.name[language]);await expect(input).toBeFocused();
      if(plan.label==='hearings-filter'){const other=language==='en'?'ne':'en';await languageChoice(other);await expect(input).toHaveValue(selected.name[other]);await expect(field).toHaveAttribute('data-court-value',selected.submissionValue);await languageChoice(language);}
      await field.getByRole('button',{name:/Open courts|अदालतहरू खोल्नुहोस्/}).click();await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);await expect(input).toBeFocused();
      await scan('Name review field '+plan.label+language,'[data-slot="court-select"]');assert.equal((await geometry()).overflow,0);assert.equal((await geometry()).bodyRange,0);
      if(plan.label==='staff-create')await capture('court-name-review-'+language+'-'+width+'-'+theme);
      if(plan.label==='hearings-filter') {
        await expect(page.locator('main')).toContainText('Pagination matter 001');
      } else {
        const edit=plan.label.endsWith('-edit'),hearing=plan.label.endsWith('-schedule')||plan.label==='hearings-create';
        const api=edit?'/api/v1/cases/'+caseId:hearing?'/api/v1/hearings':'/api/v1/cases',method=edit?'PATCH':'POST',requests=[];
        await page.route('**'+api,async route=>{if(route.request().method()!==method)return route.fallback();const payload=route.request().postDataJSON();requests.push(payload);writes.push({path:api,method,intercepted:true,payload});await route.fulfill({json:{data:{id:caseId,...payload}}});});
        if(edit){await page.getByText('Judge Name',{exact:true}).locator('..').locator('input').fill('Synthetic label review');await page.getByRole('button',{name:'Save',exact:true}).click();}
        else if(hearing){const dateId=plan.label==='hearings-create'?'#hearing-create-date':'#case-hearing-bs';await page.locator(dateId).fill(language==='en'?'2026-10-20':'२०८३-०७-०३');await page.locator(dateId).press('Tab');const submitArea=plan.label.endsWith('-schedule')?page.getByRole('dialog',{name:'Schedule hearing',exact:true}):page;await submitArea.getByRole('button',{name:plan.label==='hearings-create'?'Schedule Hearing':'Schedule hearing',exact:true}).click();}
        else {await page.locator('#case-number').fill('SYNTHETIC-NAME-17F');await page.locator('#case-title').fill('Synthetic label review');await page.locator('#case-client').click();await page.getByRole('option',{name:'Pagination client 1',exact:true}).click();await page.locator('#case-lawyer').click();await page.getByRole('option',{name:/Synthetic Profile Reviewer/}).click();await page.getByRole('button',{name:'Create Case',exact:true}).click();}
        await expect.poll(()=>requests.length).toBe(1);assert.equal(requests[0].court,selected.submissionValue);if(hearing)assert.equal(requests[0].dateGregorian,'2026-10-20');
      }
      pass('Corrected labels / original payload / bilingual aliases / locale preservation / keyboard / containment',{plan:plan.label,language,width,theme});
    }
    assert.equal(results.length,16);assert.equal(scans.length,32);assert.equal(writes.length,14);
  }
  try { if(process.argv.includes('--name-review'))await nameReview();else if(process.argv.includes('--registry-only'))await everyCourt();else if(process.argv.includes('--commands'))await commands();else await matrix(); }
  finally {
    fs.writeFileSync(out + '/browser-evidence' + (process.argv.includes('--name-review')?'-name-review':process.argv.includes('--registry-only')?'-registry':process.argv.includes('--correction-only')?'-correction':process.argv.includes('--client-only')?'-client':process.argv.includes('--commands')?'-commands':process.argv.includes('--layout-final')?'-layout-final':process.argv.includes('--smoke')?'-smoke':'') + '.json', JSON.stringify({ results, scans, errors, writes, liveMutations: 0 }, null, 2));
    console.log(JSON.stringify({ checks: results.length, scans: scans.length, exceptions: errors.length, writes: writes.length, liveMutations: 0 }));
    await context?.close(); await browser.close();
  }
  assert.equal(errors.length,0); assert(writes.every(write=>write.intercepted)); if(!process.argv.includes('--commands')&&!process.argv.includes('--name-review'))assert.equal(writes.length,0); assert(scans.every(scan=>!scan.violations.length));
}
await courtAudit();
`;
const worker = out + "/court-worker.mjs";
fs.writeFileSync(
  worker,
  shared
    .slice(0, boundary)
    .replace('const out = ".local/qa/session-17a";', `const out = "${out}";`) +
    '\nlet courtFixture = "High Court — Butwal";\n' +
    fixtures +
    checks,
);
process.exitCode =
  spawnSync(process.execPath, [worker, ...process.argv.slice(2)], { stdio: "inherit" }).status ?? 1;
