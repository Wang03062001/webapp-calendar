// All remote traffic is intercepted. No production account or financial data is used.
import assert from 'node:assert/strict';
import {normalizeData} from '../src/model.js';
import {newRegionalBook,readBook,setRegionVisible} from '../src/region-model.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
function fixture(){
 const d=newRegionalBook('JP');d.accounts={openedOn:'2026-11-01',bank:500,cash:100,savings:200,creditDebt:10,creditLimit:100,transfers:[]};
 d.days['2026-11-04']={note:'Keep JP note',items:[{id:'paid',title:'JP expense',amount:20,status:'paid',paymentMethod:'bank'},{id:'credit',title:'Hidden credit',amount:10,status:'paid',paymentMethod:'card',creditTracking:true}]};
 d.regional={vietnam:newRegionalBook('VN')};d.regional.vietnam.accounts={openedOn:'2026-11-01',bank:2000,cash:500,savings:1000,creditDebt:0,creditLimit:null,transfers:[]};
 d.regional.vietnam.days['2026-11-04']={note:'Keep VN note',items:[]};return normalizeData(d);
}
let doc=fixture(),revision=1,user='region-a',fail=null,hold=null,writes=0,attempts=0;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true}),page=await context.newPage();page.setDefaultTimeout(10000);
await page.clock.install({time:new Date('2026-11-05T03:00:00Z')});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{
 const req=route.request(),url=req.url();let body;
 if(url.includes('/auth/v1/user'))body={id:user,email:'fixture@example.test',email_confirmed_at:'2026-01-01'};
 else if(url.includes('/auth/v1/token'))body={access_token:'mock',refresh_token:'mock',expires_in:3600};
 else if(url.includes('calendar_is_admin'))body=false;
 else if(url.includes('calendar_profiles'))body=[{username:'region-fixture'}];
 else if(url.includes('calendar_documents'))body=[{data:doc,revision}];
 else if(url.includes('save_calendar_document')){
  attempts++;if(hold)await hold;
  if(fail){await route.fulfill({status:fail==='PT409'?409:503,json:{code:fail,message:'Mock region failure'}});return;}
  const p=req.postDataJSON();assert.equal(p.p_expected_revision,revision);doc=normalizeData(p.p_data);writes++;body={revision:++revision};
 }else throw Error('Unexpected remote '+url);
 await route.fulfill({json:body});
});
await page.addInitScript(()=>localStorage.setItem('lich-auth:mjgxzzxmfifhoymvdaoe.supabase.co',JSON.stringify({access_token:'mock',refresh_token:'mock',expires_at:Date.now()/1000+3600})));
const manager=()=>page.locator('#region-manager-dialog'),toggle=key=>manager().locator(`[data-region-toggle=${key}]`),submit=()=>manager().locator('.account-submit');
async function open(remove=false){await page.locator(`[data-action=${remove?'remove-region':'manage-regions'}]`).click();await manager().waitFor();}
async function close(){await manager().locator('.dialog-close').click();await manager().waitFor({state:'detached'});}
async function submitDone(){await submit().click();await manager().waitFor({state:'detached'});}
function financialUnchanged(original){assert.deepEqual(readBook(doc,'foreign'),readBook(original,'foreign'));assert.deepEqual(readBook(doc,'vietnam'),readBook(original,'vietnam'));}
try{
 await page.goto(process.env.CALENDAR_URL||'http://127.0.0.1:5187');await page.locator('[data-current-balance=assets]').filter({hasText:'580 JPY'}).waitFor();const original=structuredClone(doc);
 // Cancel, no financial mutation or network write.
 await open(true);assert.equal(await manager().locator('form').isVisible(),true);await manager().locator('[data-cancel-remove]').click();assert.equal(await manager().locator('form').isVisible(),false);await close();assert.equal(attempts,0);
 // A failed server save leaves both books and visible tabs untouched; retry succeeds only on ACK.
 fail='503';await open(true);await submit().click();await manager().locator('[role=status]').filter({hasText:'Không thể đồng bộ'}).waitFor();assert.equal(await page.locator('[data-region]').count(),2);assert.deepEqual(doc,original);
 fail=null;let release;hold=new Promise(r=>release=r);await submit().click();await page.waitForFunction(()=>document.querySelector('#region-manager-dialog').busy===true);assert.equal(await page.locator('[data-region]').count(),2);assert.deepEqual(doc,original);release();hold=null;
 await manager().waitFor({state:'detached'});assert.equal(await page.locator('[data-region=foreign]').count(),0);assert.equal(await page.locator('[data-region=vietnam][aria-pressed=true]').count(),1);financialUnchanged(original);assert.equal(doc.regionVisibility.foreign,false);
 await page.reload();await page.locator('[data-region=vietnam][aria-pressed=true]').waitFor();assert.equal(await page.locator('[data-action=remove-region]').count(),0);
 await open();assert.equal(await toggle('vietnam').isDisabled(),true);await toggle('foreign').click();await manager().waitFor({state:'detached'});assert.equal(await page.locator('[data-region]').count(),2);financialUnchanged(original);
 // Remove inactive region, preserve selected book; enabled/disabled selection survives normal book edits.
 await open();await toggle('foreign').click();await submitDone();assert.equal(await page.locator('[data-region=vietnam][aria-pressed=true]').count(),1);financialUnchanged(original);
 // Raw unsent typing must not be silently submitted by region management.
 await page.locator('[data-action=quick-expense]').click();const field=k=>page.locator(`.day-panel .expense-entry [data-field=${k}]`).last();await field('title').fill('Unsent VN draft');await field('amount').fill('17');
 const beforeDraftWrites=attempts;await open();await toggle('foreign').click();await manager().locator('[role=status]').filter({hasText:'Hãy lưu bản nháp'}).waitFor();assert.equal(attempts,beforeDraftWrites);await close();assert.equal(await field('title').inputValue(),'Unsent VN draft');
 await page.locator('[data-action=save]').click();await page.locator('#toast').filter({hasText:'Đã lưu thay đổi.'}).waitFor();
 await page.reload();await page.locator('[data-region=vietnam][aria-pressed=true]').waitFor();assert.equal(doc.regionVisibility.foreign,false);assert(Object.values(doc.regional.vietnam.days).some(d=>d.items.some(i=>i.title==='Unsent VN draft')));
 await open();await toggle('foreign').click();await manager().waitFor({state:'detached'});
 // Retained closed forms cannot mutate after switching away and back.
 await open(true);await manager().locator('form').evaluate(f=>window.staleRegionForm=f);await page.locator('[data-region=foreign]').evaluate(b=>b.click());await page.locator('[data-region=vietnam]').click();const staleAttempts=attempts;await page.evaluate(()=>window.staleRegionForm.requestSubmit());assert.equal(attempts,staleAttempts);
 // Server-side preference change switches away from hidden book and invalidates its open forms.
 await open(true);await manager().locator('form').evaluate(f=>window.remoteStale=f);doc=setRegionVisible(doc,'vietnam',false);revision++;await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.locator('[data-region=foreign][aria-pressed=true]').waitFor();assert.equal(await manager().count(),0);await page.evaluate(()=>window.remoteStale.requestSubmit());assert.equal(attempts,staleAttempts);
 // Desktop/mobile and theme review while one region remains; restore controls remain available.
 await open();await page.screenshot({path:'/tmp/region-manager-desktop.png'});await close();await page.setViewportSize({width:390,height:844});await open();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await manager().evaluate(d=>d.scrollWidth<=d.clientWidth));await page.screenshot({path:'/tmp/region-manager-mobile.png'});await close();await page.locator('[data-action=theme]').click();await open();await page.screenshot({path:'/tmp/region-manager-mobile-dark.png'});await close();
 // Conflict remains durable; removal never appears as success.
 fail='PT409';await open();await toggle('vietnam').click();await manager().locator('[role=status]').filter({hasText:/thiết bị|xung đột/}).waitFor();assert.equal(doc.regionVisibility.vietnam,false);await close();await page.reload();await page.locator('#cloud-notice').filter({hasText:/thiết bị|xung đột/}).waitFor();const conflictAttempts=attempts;await open();await toggle('vietnam').click();await manager().locator('[role=status]').filter({hasText:/thiết bị|xung đột/}).waitFor();assert.equal(attempts,conflictAttempts);await close();
 // Separate authenticated account defaults to both regions; old form cannot write to it.
 await open();await manager().locator('form').evaluate(f=>window.accountStale=f);user='region-b';doc=fixture();revision=1;fail=null;await page.reload();await page.locator('[data-region=vietnam]').waitFor();assert.equal(await page.locator('[data-region]').count(),2);assert.equal(doc.regionVisibility,undefined);
 assert.deepEqual(errors,[]);console.log('PASS region removal: cancel, failed/delayed ACK, inactive/active removal, one-region guard, restore/reload, raw drafts, normal saves, stale forms, remote changes, conflicts, accounts, hidden credit, desktop/mobile light/dark; no production calls');
}catch(error){console.error({attempts,writes,errors,dialog:await manager().innerText().catch(()=>''),notice:await page.locator('#cloud-notice').innerText()});throw error;}finally{await browser.close();}
