// Only synthetic accounts/documents; every external request is intercepted.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {newRegionalBook} from '../src/region-model.js';
import {normalizeData} from '../src/model.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
function fixture(){
 const d=newRegionalBook('JP');d.accounts={openedOn:'2026-11-01',bank:500,cash:100,savings:200,creditDebt:0,creditLimit:null,transfers:[]};
 d.days['2026-11-04']={note:'Confirmed note',items:[{id:'paid',title:'Confirmed expense',amount:20,status:'paid',paymentMethod:'bank'}]};
 d.regional={vietnam:newRegionalBook('VN')};d.regional.vietnam.accounts={openedOn:'2026-11-01',bank:2000,cash:500,savings:1000,creditDebt:0,creditLimit:null,transfers:[]};return normalizeData(d);
}
let doc=fixture(),revision=1,user='connection-a',offline=false,reads=0,writes=0,attempts=0;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();page.setDefaultTimeout(10000);await page.clock.install({time:new Date('2026-11-05T03:00:00Z')});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{const req=route.request(),url=req.url();let body;
 if(url.includes('/auth/v1/user'))body={id:user,email:'connection@example.test',email_confirmed_at:'2026-01-01'};
 else if(url.includes('/auth/v1/token'))body={access_token:'mock',refresh_token:'mock',expires_in:3600};
 else if(url.includes('calendar_is_admin'))body=false;
 else if(url.includes('calendar_profiles'))body=[{username:'connection-fixture'}];
 else if(url.includes('calendar_documents')){reads++;if(offline){await route.abort('internetdisconnected');return;}body=[{data:doc,revision}];}
 else if(url.includes('save_calendar_document')){attempts++;if(offline){await route.abort('internetdisconnected');return;}const p=req.postDataJSON();assert.equal(p.p_expected_revision,revision);doc=normalizeData(p.p_data);body={revision:++revision};writes++;}
 else throw Error('Unexpected remote '+url);await route.fulfill({json:body});
});
await page.addInitScript(()=>localStorage.setItem('lich-auth:mjgxzzxmfifhoymvdaoe.supabase.co',JSON.stringify({access_token:'mock',refresh_token:'mock',expires_at:Date.now()/1000+3600})));
const banner=()=>page.locator('#cloud-notice'),retry=()=>banner().locator('[data-action=cloud-retry]'),entry=()=>page.locator('.day-panel .expense-entry').last(),field=k=>entry().locator(`[data-field=${k}]`),assets=()=>page.locator('[data-current-balance=assets]');
async function networkError(){offline=true;await page.evaluate(()=>window.dispatchEvent(new Event('online')));await banner().filter({hasText:'Không kết nối được Supabase'}).waitFor();}
async function draft(title,amount){await page.locator('[data-action=quick-expense]').click();await field('title').fill(title);await field('amount').fill(String(amount));await field('status').selectOption('paid');}
async function newAccount(id){user=id;offline=false;doc=fixture();revision=1;await page.reload();await assets().filter({hasText:'580 JPY'}).waitFor();}
try{
 await page.goto(process.env.CALENDAR_URL||'http://127.0.0.1:5186');await assets().filter({hasText:'580 JPY'}).waitFor();const original=structuredClone(doc);
 await networkError();await draft('Unsaved retry entry',37);assert.equal(await field('title').inputValue(),'Unsaved retry entry');assert.match(await banner().innerText(),/Không kết nối được Supabase/);
 const beforePoll=reads;await page.evaluate(()=>window.dispatchEvent(new Event('online')));assert.equal(reads,beforePoll);assert.match(await banner().innerText(),/Không kết nối được Supabase/);
 const beforeRetry=reads;await retry().click();await page.waitForFunction(()=>document.querySelector('#cloud-notice')?.textContent.includes('Không kết nối được Supabase'));assert(reads>beforeRetry);assert.equal(attempts,0);assert.equal(await field('amount').inputValue(),'37');assert.equal(await assets().innerText(),'580 JPY');
 const downloading=page.waitForEvent('download');await banner().locator('[data-action=backup]').click();const download=await downloading;const backup=JSON.parse(await readFile(await download.path(),'utf8'));assert(Object.values(backup.days).some(d=>d.items.some(i=>i.title==='Unsaved retry entry'&&i.amount===37)));assert.deepEqual(backup.regional,original.regional);
 offline=false;await retry().click();await retry().waitFor({state:'detached'});assert.equal(await field('title').inputValue(),'Unsaved retry entry');assert.equal(await field('amount').inputValue(),'37');assert.equal(await assets().innerText(),'580 JPY');assert.equal(writes,0);assert.equal(attempts,0);assert.deepEqual(doc,original);assert.equal(await page.locator('[data-action=save]').isEnabled(),true);
 await page.reload();await field('title').filter({visible:true}).waitFor();assert.equal(await field('title').inputValue(),'Unsaved retry entry');assert.equal(await field('amount').inputValue(),'37');assert.equal(await assets().innerText(),'580 JPY');
 console.log('PASS real fetch failure simulation, warning survives draft typing/polling, Retry makes a read, local backup includes both books, recovered connection never submits unsaved typing, reload/confirmed assets preserved');
 await newAccount('connection-b');await networkError();await draft('Keep conflicting draft',41);doc.days['2026-11-04'].note='Remote update';revision++;offline=false;await retry().click();await banner().filter({hasText:'thiết bị khác'}).waitFor();assert.equal(await field('title').inputValue(),'Keep conflicting draft');assert.equal(await field('amount').inputValue(),'41');assert.equal(await assets().innerText(),'580 JPY');assert.equal(attempts,0);assert.equal(await banner().locator('[data-action=cloud-remote]').count(),1);assert.equal(await banner().locator('[data-action=backup]').count(),1);
 console.log('PASS changed remote revision shows conflict, no overwrite/upload, draft retained and recovery actions shown');
 await newAccount('connection-c');await draft('Previously submitted expense',40);offline=true;await page.locator('[data-action=save]').click();await banner().filter({hasText:'Không kết nối được Supabase'}).waitFor();assert.equal(attempts,1);await field('title').fill('Later unsaved typing');await field('amount').fill('55');offline=false;await retry().click();await retry().waitFor({state:'detached'});assert.equal(writes,1);assert(Object.values(doc.days).some(d=>d.items.some(i=>i.title==='Previously submitted expense'&&i.amount===40)));assert(!JSON.stringify(doc).includes('Later unsaved typing'));assert.equal(await field('title').inputValue(),'Later unsaved typing');assert.equal(await field('amount').inputValue(),'55');assert.equal(await assets().innerText(),'540 JPY');assert.deepEqual(doc.regional,original.regional);
 console.log('PASS queued retry sends only the last explicitly submitted snapshot, ACK retains newer input and exact confirmed balances');
 await newAccount('connection-d');await networkError();await draft('Mobile offline draft',12);await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await banner().scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/calendar-connection-mobile.png'});await page.locator('[data-action=theme]').click();await banner().scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/calendar-connection-mobile-dark.png'});assert.deepEqual(errors,[]);
 console.log('PASS desktop/mobile light/dark, backup/retry controls fit, no real Supabase requests or financial writes');
}finally{await browser.close();}
