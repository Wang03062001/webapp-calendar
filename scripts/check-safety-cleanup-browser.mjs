// All identities/documents are synthetic; every external request is intercepted.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {cleanupFixture} from './fixtures/safety-cleanup.mjs';
import {normalizeData} from '../src/model.js';
import {readBook} from '../src/region-model.js';
import {accountBalances} from '../src/account-model.js';
import {creditSnapshot} from '../src/credit-access.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
let doc=cleanupFixture(),revision=1,saves=0,requests=0,fail=null,hold=null,admin=false,user='cleanup-fixture';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();page.setDefaultTimeout(10000);await page.clock.install({time:new Date('2026-11-05T03:00:00Z')});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{const req=route.request(),url=req.url();let body;
 if(url.includes('/auth/v1/user'))body={id:user,email:'cleanup@example.test',email_confirmed_at:'2026-01-01'};
 else if(url.includes('/auth/v1/token'))body={access_token:'mock',refresh_token:'mock',expires_in:3600};
 else if(url.includes('/auth/v1/logout'))body={};
 else if(url.includes('calendar_is_admin'))body=admin;
 else if(url.includes('calendar_profiles'))body=[{username:'cleanup-fixture'}];
 else if(url.includes('calendar_documents'))body=[{data:doc,revision}];
 else if(url.includes('save_calendar_document')){requests++;if(hold)await hold;if(fail){await route.fulfill({status:fail==='40001'?409:503,json:{code:fail}});return;}const p=req.postDataJSON();assert.equal(p.p_expected_revision,revision);doc=normalizeData(p.p_data);body={revision:++revision};saves++;}
 else throw Error('Unexpected remote '+url);await route.fulfill({json:body});
});
await page.addInitScript(()=>localStorage.setItem('lich-auth:mjgxzzxmfifhoymvdaoe.supabase.co',JSON.stringify({access_token:'mock',refresh_token:'mock',expires_at:Date.now()/1000+3600})));
const dialog=()=>page.locator('#safety-dialog'),input=name=>dialog().locator(`[name=${name}]`),balance=()=>page.locator('[data-current-balance=assets]');
async function open(action,id){let b=page.locator(`[data-safety-action=${action}]`);if(id!==undefined)b=b.and(page.locator(`[data-safety-id=${JSON.stringify(id)}]`));b=b.first();await b.evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await b.click();await dialog().waitFor();}
async function submit(){await dialog().locator('.account-submit').click();await dialog().waitFor({state:'detached'});}
async function close(){await dialog().locator('[data-cancel],.dialog-close').first().click();await dialog().waitFor({state:'detached'});}
async function fresh(){doc=cleanupFixture();revision++;await page.reload();await balance().filter({hasText:'1,079 JPY'}).waitFor();await page.locator('nav [data-view=safety]').click();}
const body=()=>JSON.stringify(doc);
try{
 await page.goto(process.env.CALENDAR_URL||'http://127.0.0.1:5186');await balance().filter({hasText:'1,079 JPY'}).waitFor();await page.locator('nav [data-view=safety]').click();assert.match(await page.locator('#summary-period').innerText(),/Nền tảng an toàn/);
 const original=structuredClone(doc),stock=accountBalances(doc,'2026-11-05');
 await open('removeFund','fund');await dialog().locator('form').evaluate(f=>window.canceled=f);await close();await page.evaluate(()=>window.canceled.requestSubmit());assert.equal(saves,0);assert.deepEqual(doc,original);
 await open('resetSafety');assert.match(await dialog().innerText(),/cleanup@example.test/);assert.match(await dialog().innerText(),/Nước ngoài/);await input('confirmation').fill('reset');await dialog().locator('.account-submit').click();assert.equal(requests,0);
 const downloading=page.waitForEvent('download');await dialog().locator('[data-safety-backup]').click();const download=await downloading;await download.saveAs('/tmp/safety-before-reset.json');assert.deepEqual(JSON.parse(await readFile('/tmp/safety-before-reset.json','utf8')),doc);
 await input('confirmation').fill('RESET');fail='NETWORK';await dialog().locator('.account-submit').click();await dialog().locator('[role=status]').filter({hasText:'Không thể đồng bộ'}).waitFor();assert.equal(await input('confirmation').inputValue(),'RESET');assert.equal(await input('removePlanned').isChecked(),true);assert.deepEqual(doc,original);assert.equal(await balance().innerText(),'1,079 JPY');
 fail=null;let release;hold=new Promise(r=>release=r);await dialog().locator('.account-submit').click();await page.waitForFunction(()=>document.querySelector('#safety-dialog .account-submit')?.disabled);assert.equal(saves,0);assert.equal(await page.locator('.fund-card').count(),2);assert.equal(await balance().innerText(),'1,079 JPY');release();hold=null;await dialog().waitFor({state:'detached'});
 assert.equal(saves,1);assert.equal(doc.safety.funds.length,0);assert.equal(doc.safety.obligations.length,0);assert.equal(doc.days['2026-11-13'].items.length,0);assert.equal(doc.days['2026-11-13'].note,'Keep planned day note');assert.equal(doc.days['2026-11-02'].items[1].status,'paid');assert.equal(doc.safety.cleanupHistory.length,1);assert.deepEqual(doc.regional,original.regional);assert.deepEqual(doc.debts,original.debts);assert.equal(creditSnapshot(doc),creditSnapshot(original));assert.deepEqual(accountBalances(doc,'2026-11-05'),stock);assert.equal(await page.locator('.fund-card').count(),0);
 await page.reload();await page.locator('nav [data-view=safety]').click();assert.equal(await page.locator('[data-safety-action=removeObligation]').count(),0);await page.screenshot({path:'/tmp/safety-reset-desktop.png'});
 console.log('PASS scoped reset, typed confirmation/local backup, cancel/failure/held ACK, unchanged exact stock/credit/debts/notes/inactive region and persistent deletion audit');
 await fresh();await open('resetSafety');await input('confirmation').fill('RESET');fail='40001';const beforeConflict=body();await dialog().locator('.account-submit').click();await dialog().locator('[role=status]').filter({hasText:'thiết bị khác'}).waitFor();assert.equal(body(),beforeConflict);assert.equal(await input('confirmation').inputValue(),'RESET');fail=null;await close();await fresh();
 await open('removeFund','fund');await submit();assert(!doc.days['2026-11-02'].items[0].fundId);assert.equal(doc.days['2026-11-02'].items[0].amount,25.125);assert.equal(doc.days['2026-11-02'].items[1].obligationId,'paid');assert.deepEqual(accountBalances(doc,'2026-11-05'),stock);
 await open('removeObligation','paid');assert.equal(await input('removePlanned').count(),0);await submit();assert.equal(doc.days['2026-11-02'].items[1].status,'paid');assert.equal(JSON.parse(doc.safety.cleanupHistory.at(-1).snapshot).obligations[0].history[0].id,'paid-audit');
 await open('removeObligation','bill');await input('removePlanned').uncheck();await submit();assert.equal(doc.days['2026-11-13'].items.length,1);assert(!doc.days['2026-11-13'].items[0].obligationId);await open('removePlanned',JSON.stringify(['2026-11-13','bill-row']));await submit();assert.equal(doc.days['2026-11-13'].items.length,0);
 await open('removeBudget','Food');await submit();assert.equal(doc.safety.budgets.length,1);await open('removeDebtTerms','loan');await submit();assert.deepEqual(doc.debts,original.debts);assert.equal(doc.safety.debtTerms.length,1);assert.deepEqual(accountBalances(doc,'2026-11-05'),stock);
 console.log('PASS conflict preserves form/data, individual fund/paid bill/planned bill/budget/repayment-assumption deletion and retained audit');
 await fresh();await open('resetSafety');await input('confirmation').fill('RESET');await dialog().locator('form').evaluate(f=>window.oldRegion=f);await page.locator('[data-region=vietnam]').evaluate(b=>b.click());await page.locator('[data-region=foreign]').click();const beforeStale=saves;await page.evaluate(()=>window.oldRegion.requestSubmit());assert.equal(saves,beforeStale);assert.equal(doc.safety.funds.length,2);
 const jp=readBook(doc,'foreign');await page.locator('[data-region=vietnam]').click();await page.locator('nav [data-view=safety]').click();await open('resetSafety');assert.match(await dialog().innerText(),/Việt Nam/);await input('confirmation').fill('RESET');await submit();assert.deepEqual(readBook(doc,'foreign'),jp);assert.equal(doc.regional.vietnam.days['2026-11-02'].items[0].amount,5000);
 console.log('PASS stale region epochs and reset within Vietnam preserves foreign records');
 // A legacy tracked card-payment row changes creditSnapshot if detached: reverify.
 await page.locator('[data-region=foreign]').click();doc=cleanupFixture();doc.days['2026-11-02'].items[1].category='Thanh toán thẻ';revision++;admin=true;await page.reload();await page.locator('nav [data-view=safety]').click();await open('resetSafety');await input('confirmation').fill('RESET');admin=false;const beforeRevoke=body(),writes=saves;await dialog().locator('.account-submit').click();await dialog().waitFor({state:'detached'});assert.equal(body(),beforeRevoke);assert.equal(saves,writes);
 console.log('PASS fresh server role check prevents deleting protected legacy credit links on admin revocation');
 await fresh();await page.setViewportSize({width:390,height:844});await open('resetSafety');await input('confirmation').fill('RESET');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await dialog().evaluate(e=>e.scrollWidth<=e.clientWidth));await page.screenshot({path:'/tmp/safety-reset-mobile.png'});await close();await page.locator('[data-action=theme]').click();await open('removeFund','fund');assert(await dialog().evaluate(e=>e.scrollWidth<=e.clientWidth));await page.screenshot({path:'/tmp/safety-delete-mobile-dark.png'});await dialog().locator('form').evaluate(f=>window.oldAccount=f);await page.locator('.topbar [data-action=account]').evaluate(b=>b.click());await page.locator('#sign-out').click();await dialog().waitFor({state:'detached'});const beforeLogout=saves;await page.evaluate(()=>window.oldAccount.requestSubmit());assert.equal(saves,beforeLogout);assert.deepEqual(errors,[]);
 console.log('PASS desktop/mobile light/dark, no overflow, canceled and signed-out forms cannot write; no real financial API calls');
}finally{await browser.close();}
