// Synthetic documents only; all external requests, including errors, are mocked.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeData} from '../src/model.js';
import {newRegionalBook} from '../src/region-model.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
function fixture(){
 const d=newRegionalBook('JP');d.accounts={openedOn:'2026-11-01',bank:500,cash:100,savings:200,creditDebt:0,creditLimit:null,transfers:[]};d.days['2026-11-04']={note:'Confirmed note',items:[{id:'paid',title:'Confirmed expense',amount:20,status:'paid',paymentMethod:'bank'}]};d.regional={vietnam:newRegionalBook('VN')};d.regional.vietnam.accounts={openedOn:'2026-11-01',bank:2000,cash:500,savings:1000,creditDebt:0,creditLimit:null,transfers:[]};return normalizeData(d);
}
let doc=fixture(),revision=1,user='conflict-owner',mode=null,readOffline=false,attempts=0;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();page.setDefaultTimeout(10000);await page.clock.install({time:new Date('2026-11-06T03:00:00Z')});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{const req=route.request(),url=req.url();let body;
 if(url.includes('/auth/v1/user'))body={id:user,email:'conflict@example.test',email_confirmed_at:'2026-01-01'};
 else if(url.includes('/auth/v1/token'))body={access_token:'mock',refresh_token:'mock',expires_in:3600};
 else if(url.includes('calendar_is_admin'))body=false;
 else if(url.includes('calendar_profiles'))body=[{username:'conflict-fixture'}];
 else if(url.includes('calendar_documents')){if(readOffline){await route.abort('internetdisconnected');return;}body=[{data:doc,revision}];}
 else if(url.includes('save_calendar_document')){
  attempts++;const p=req.postDataJSON();
  if(mode==='conflict'||p.p_expected_revision!==revision){await route.fulfill({status:500,json:{code:'40001',message:'Document changed on another device'}});return;}
  if(mode==='opaque-conflict'){doc.regional.vietnam.days['2026-11-06']={note:'Other device updated VN',items:[]};revision++;await route.abort('failed');return;}
  doc=normalizeData(p.p_data);body={revision:++revision};if(mode==='lost-ack'){await route.abort('failed');return;}
 }else throw Error('Unexpected remote '+url);await route.fulfill({json:body});
});
await page.addInitScript(()=>localStorage.setItem('lich-auth:mjgxzzxmfifhoymvdaoe.supabase.co',JSON.stringify({access_token:'mock',refresh_token:'mock',expires_at:Date.now()/1000+3600})));
const banner=()=>page.locator('#cloud-notice'),field=k=>page.locator('.day-panel .expense-entry').last().locator(`[data-field=${k}]`),assets=()=>page.locator('[data-current-balance=assets]');
async function draft(title,amount){await page.locator('[data-action=quick-expense]').click();await field('title').fill(title);await field('amount').fill(String(amount));await field('status').selectOption('paid');}
async function submit(){await page.locator('[data-action=save]').click();}
async function conflict(){await banner().filter({hasText:'thiết bị khác'}).waitFor();}
async function backup(){const pending=page.waitForEvent('download');await banner().locator('[data-action=backup]').click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));}
async function newAccount(id){user=id;mode=null;readOffline=false;doc=fixture();revision=1;await page.reload();await assets().filter({hasText:'580 JPY'}).waitFor();}
try{
 await page.goto(process.env.CALENDAR_URL||'http://127.0.0.1:5186');await assets().filter({hasText:'580 JPY'}).waitFor();const original=structuredClone(doc);
 await draft('Keep conflicted draft',37);mode='conflict';await submit();await conflict();assert.equal(attempts,1);assert.equal(await page.locator('[data-action=save]').isDisabled(),true);assert.equal(await assets().innerText(),'580 JPY');assert.deepEqual(doc,original);
 for(let n=0;n<3;n++){await page.clock.runFor(30000);await page.evaluate(()=>{dispatchEvent(new Event('online'));document.dispatchEvent(new Event('visibilitychange'));});await page.reload();await conflict();assert.equal(await field('title').inputValue(),'Keep conflicted draft');assert.equal(await field('amount').inputValue(),'37');await field('title').press('Enter');assert.equal(attempts,1);}
 const saved=await backup();assert(Object.values(saved.days).some(d=>d.items.some(i=>i.title==='Keep conflicted draft'&&i.amount===37)));assert.deepEqual(saved.regional,original.regional);
 await page.screenshot({path:'/tmp/calendar-conflict-desktop.png'});await page.setViewportSize({width:390,height:844});await banner().scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/calendar-conflict-mobile.png'});await page.locator('[data-action=theme]').click();await banner().scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/calendar-conflict-mobile-dark.png'});
 console.log('PASS real PostgREST HTTP 500/40001, durable block across three reloads, polling/online/Enter never resubmit, exact draft/both books/confirmed balance retained, mobile light/dark');
 page.once('dialog',d=>d.dismiss());await banner().locator('[data-action=cloud-remote]').click();await conflict();assert.equal(await field('title').inputValue(),'Keep conflicted draft');
 readOffline=true;page.once('dialog',d=>d.accept());await banner().locator('[data-action=cloud-remote]').click();await banner().filter({hasText:'Không kết nối được Supabase'}).waitFor();assert.equal(await banner().locator('[data-action=cloud-remote]').count(),1);assert.equal(await field('amount').inputValue(),'37');
 readOffline=false;mode=null;page.once('dialog',d=>d.accept());await banner().locator('[data-action=cloud-remote]').click();await banner().locator('[data-action=cloud-remote]').waitFor({state:'detached'});await draft('After explicit recovery',15);await submit();await assets().filter({hasText:'565 JPY'}).waitFor();assert.equal(attempts,2);assert.deepEqual(doc.regional,original.regional);
 console.log('PASS backup-before-recovery, cancel/failure keeps draft and block, explicit successful remote recovery permits a new revision');
 await newAccount('legacy-conflict-owner');const legacy=fixture();legacy.days['2026-11-06']={note:'Legacy note',items:[{id:'legacy',title:'Legacy queued draft',amount:25,status:'paid',paymentMethod:'bank'}]};await page.evaluate(d=>localStorage.setItem('lich-cloud:mjgxzzxmfifhoymvdaoe.supabase.co:legacy-conflict-owner',JSON.stringify({data:d,revision:1,dirty:true,counter:1,queued:{data:d,counter:1}})),legacy);doc.days['2026-11-06']={note:'Remote note',items:[]};revision=2;const beforeLegacy=attempts;await page.reload();await conflict();assert.equal(attempts,beforeLegacy);assert.equal(await field('title').inputValue(),'Legacy queued draft');
 console.log('PASS old queued caches use a revision read instead of replaying an already-stale save');
 await newAccount('lost-ack-owner');await draft('Captured expense',40);mode='lost-ack';await submit();await banner().filter({hasText:'Không kết nối được Supabase'}).waitFor();const afterLoss=attempts;assert.equal(revision,2);assert.equal(await assets().innerText(),'580 JPY');await field('title').fill('Later unsent title');await field('amount').fill('55');mode=null;await banner().locator('[data-action=cloud-retry]').click();await banner().locator('[data-action=cloud-retry]').waitFor({state:'detached'});assert.equal(attempts,afterLoss);assert.equal(revision,2);assert.equal(await assets().innerText(),'540 JPY');assert.equal(await field('title').inputValue(),'Later unsent title');assert.equal(await field('amount').inputValue(),'55');await page.reload();await field('title').filter({visible:true}).waitFor();assert.equal(await field('title').inputValue(),'Later unsent title');await submit();await assets().filter({hasText:'525 JPY'}).waitFor();assert.equal(revision,3);assert.equal(doc.days['2026-11-06'].items.length,1);assert.deepEqual(doc.regional,original.regional);
 console.log('PASS lost response after server commit: read-only ACK recovery, no duplicate write/expense, later typing survives reload and next explicit save');
 await newAccount('opaque-conflict-owner');await draft('Opaque conflict draft',30);mode='opaque-conflict';await submit();await banner().filter({hasText:'Không kết nối được Supabase'}).waitFor();const beforeOpaque=attempts;mode=null;await banner().locator('[data-action=cloud-retry]').click();await conflict();assert.equal(attempts,beforeOpaque);assert.equal(await field('title').inputValue(),'Opaque conflict draft');assert.equal(doc.regional.vietnam.days['2026-11-06'].note,'Other device updated VN');assert.equal(await assets().innerText(),'580 JPY');assert.deepEqual(errors,[]);
 console.log('PASS ambiguous network failure followed by differing VN data stops before another write; no real financial API calls');
}finally{await browser.close();}
