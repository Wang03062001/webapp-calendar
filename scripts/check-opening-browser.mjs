// Uses only synthetic books and mocked network endpoints.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
import assert from 'node:assert/strict';
import {newRegionalBook} from '../src/region-model.js';
import {normalizeData,monthSummary} from '../src/model.js';
import {accountBalances,balanceUpdateCount} from '../src/account-model.js';
import {creditSnapshot} from '../src/credit-access.js';
const original=newRegionalBook('JP');original.accounts={openedOn:'2026-11-01',bank:1000,cash:100,savings:500,creditDebt:200,creditLimit:5000,transfers:[]};
original.days={'2026-10-31':{note:'Keep October note',items:[{id:'old',title:'October cost',amount:50,status:'paid',paymentMethod:'bank'}]},'2026-11-02':{note:'Keep November note',items:[{id:'cash',title:'November cash',amount:10,status:'paid',paymentMethod:'cash'},{id:'card',title:'Card purchase',amount:20,status:'paid',paymentMethod:'card',settlement:'oneoff',billingMonth:'2026-12'}]},'2026-11-03':{note:'',items:[{id:'bank',title:'November bank',amount:30,status:'paid',paymentMethod:'bank'}]}};
original.incomes['2026-10']={salary:0,bonus:0,note:'Keep income note',account:'bank',receivedOn:'2026-10-15'};
original.regional={vietnam:newRegionalBook('VN')};original.regional.vietnam.days['2026-10-31']={note:'Keep Vietnam',items:[{id:'vn',title:'Vietnam cost',amount:100,status:'paid',paymentMethod:'cash'}]};
let doc=normalizeData(original),revision=1,admin=true,saves=0,failure=null,user='opening-fixture';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Asia/Tokyo'}),page=await context.newPage();page.setDefaultTimeout(10000);
await page.clock.install({time:new Date('2026-11-04T03:00:00Z')});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{
 const url=route.request().url();let body;
 if(url.includes('/auth/v1/logout'))body={};
 else if(url.includes('/auth/v1/token'))body={access_token:'mock',refresh_token:'mock',expires_in:3600};
 else if(url.includes('/auth/v1/user'))body={id:user,email:'fixture@example.test',email_confirmed_at:'2026-01-01'};
 else if(url.includes('calendar_is_admin'))body=admin;
 else if(url.includes('calendar_profiles'))body=[{username:'fixture'}];
 else if(url.includes('calendar_documents'))body=[{data:doc,revision}];
 else if(url.includes('save_calendar_document')){
  saves++;if(failure){await route.fulfill({status:failure==='40001'?409:503,json:{code:failure}});return;}
  const p=route.request().postDataJSON();assert.equal(p.p_expected_revision,revision);doc=normalizeData(p.p_data);body={revision:++revision};
 }else throw Error('Unexpected external request: '+url);
 await route.fulfill({json:body});
});
await page.addInitScript(()=>localStorage.setItem('lich-auth:mjgxzzxmfifhoymvdaoe.supabase.co',JSON.stringify({access_token:'mock',refresh_token:'mock',expires_at:Date.now()/1000+3600})));
async function date(value='2026-11-04'){await page.locator('#day-select').fill(value);await page.locator('#day-select').dispatchEvent('change');await page.locator('#ledger-tools').evaluate(el=>{el.open=true;el.dispatchEvent(new Event('toggle'));});}
async function menu(action){await page.locator('[data-action=account-balances]').click();if(action)await page.locator(`#ledger-dialog [data-${action}]`).click();}
async function input(name,value){await page.locator(`#opening-dialog [name=${name}]`).fill(String(value));}
async function amounts(bank,cash,savings){await input('bank',bank);await input('cash',cash);await input('savings',savings);}
async function preview(){await page.locator('#opening-dialog form .account-submit').click();await page.locator('#opening-dialog [data-confirm-opening]').waitFor();}
async function confirm(){await page.locator('#opening-dialog [data-confirm-opening]').click();await page.locator('#opening-dialog').waitFor({state:'detached'});}
async function reload(){await page.reload();await page.locator('nav [data-view=safety]').waitFor();await date();}
try{
await page.goto(process.env.CALENDAR_URL||'http://127.0.0.1:5174');await page.locator('nav [data-view=credit]').waitFor();await date('2026-10-31');
await menu();assert.match(await page.locator('#ledger-dialog').innerText(),/trước mốc số dư/);await page.locator('#ledger-dialog [data-selected-closing]').click();assert.equal(await page.locator('#opening-dialog [name=date]').inputValue(),'2026-10-31');assert.equal(await page.locator('#opening-dialog [name=timing]').inputValue(),'end');assert.equal(await page.locator('#opening-dialog [name=bank]').inputValue(),'');await page.locator('#opening-dialog .dialog-close').click();assert.equal(saves,0);
await date();await menu('previous-opening');await amounts('2000.123','200.456','700.789');await input('note','Mock carryover');await preview();assert.equal(saves,0);assert.match(await page.locator('#opening-dialog .opening-preview').innerText(),/2,861.368 JPY/);await page.screenshot({path:'/tmp/calendar-opening-desktop.png'});
const before=structuredClone(doc),credit=creditSnapshot(doc),vn=structuredClone(doc.regional);await confirm();assert.equal(balanceUpdateCount(doc.accounts,'2026-11'),1);assert.deepEqual(doc.days,before.days);assert.deepEqual(doc.incomes,before.incomes);assert.equal(creditSnapshot(doc),credit);assert.deepEqual(doc.regional,vn);assert.equal(accountBalances(doc,'2026-10-31').bank,2000.123);assert.equal(accountBalances(doc,'2026-11-04').bank,1970.123);
await date('2026-10-31');assert.match(await page.locator('[data-balance=bank]').innerText(),/^2,000.123 /);await date();assert.match(await page.locator('[data-balance=assets]').innerText(),/^2,861.368 /);
await reload();assert.match(await page.locator('.reconciliation-history').filter({hasText:'Mock carryover'}).textContent(),/31\/10\/2026/);await page.locator('[data-region=vietnam]').click();assert.equal(doc.regional.vietnam.accounts,undefined);assert.match(await page.locator('[data-balance=bank]').innerText(),/Chưa thiết lập/);await page.locator('[data-region=foreign]').click();assert.match(await page.locator('[data-balance=assets]').innerText(),/^2,861.368 /);
console.log('PASS prior month date guard, carryover preview/cancel/confirm, precision, reload and region isolation');
// Income in the prior month is editable; it does not get added twice to a later known close.
await menu('previous-income');assert.equal(await page.locator('#day-select').inputValue(),'2026-10-01');await page.locator('[data-income=salary]').fill('250');await page.locator('[data-income=salary]').press('Enter');await page.waitForFunction(()=>document.querySelector('.local-badge')?.hidden);assert.equal(doc.incomes['2026-10'].salary,250);assert.equal(monthSummary(doc,2026,9).salary,250);assert.equal(accountBalances(doc,'2026-11-04').bank,1970.123);assert.equal(doc.incomes['2026-10'].note,'Keep income note');
await date('2026-11-04');await menu('edit-opening');await input('date','2026-10-01');await page.locator('#opening-dialog [name=timing]').selectOption('start');await amounts(3000,300,800);await preview();assert.match(await page.locator('.opening-preview').innerText(),/4,260 JPY/);await confirm();assert.equal(accountBalances(doc,'2026-11-04').bank,3170);assert.equal(accountBalances(doc,'2026-11-04').creditDebt,220);assert.equal(doc.accounts.openingHistory.length,2);
console.log('PASS prior-month income and earlier opening include dated transactions once; credit baseline unchanged');
// Failure/conflict never apply a new opening or consume quota.
for(const code of ['NETWORK','40001']){
 await menu('edit-opening');await input('bank',3500);await preview();failure=code;const old=structuredClone(doc);await page.locator('[data-confirm-opening]').click();await page.locator('#opening-dialog [role=status]').filter({hasText:code==='NETWORK'?'Không thể đồng bộ':'thiết bị khác'}).waitFor();assert.deepEqual(doc,old);assert.equal(balanceUpdateCount(doc.accounts,'2026-11'),2);assert.equal(await page.locator('#opening-dialog [name=bank]').inputValue(),'3,500');await page.locator('#opening-dialog .dialog-close').click();failure=null;
 if(code==='40001'){page.once('dialog',d=>d.accept());await page.locator('[data-action=cloud-remote]').click();await page.locator('.cloud-warning').waitFor({state:'detached'});}
 else await reload();
}
await menu('edit-opening');await input('bank',3500);await preview();await confirm();assert.equal(balanceUpdateCount(doc.accounts,'2026-11'),3);await menu('edit-opening');await input('bank',3600);await page.locator('#opening-dialog form .account-submit').click();await page.locator('#opening-dialog [role=status]').filter({hasText:'3 lượt'}).waitFor();assert.equal(doc.accounts.openingHistory.length,3);await page.locator('#opening-dialog .dialog-close').click();
console.log('PASS failure/conflict preservation and shared successful-confirmation quota');
// A known month's normal close remains available after all ordinary slots are used.
await menu('previous-opening');await amounts(400,40,90);await input('note','Mock month close note');await preview();await confirm();assert.equal(balanceUpdateCount(doc.accounts,'2026-11'),3);assert.equal(doc.accounts.openingHistory.length,3);assert.equal(doc.accounts.reconciliations.length,1);assert.match(doc.accounts.reconciliations[0].note,/Mock month close note/);assert.equal(accountBalances(doc,'2026-11-04').bank,370);assert.equal(accountBalances(doc,'2026-11-04').creditDebt,220);assert.match(doc.days['2026-10-31'].note,/^Keep October note/);
console.log('PASS tracked month-end reconciliation remains unlimited and preserves the earlier opening');

// Old popup after region/account/permission changes cannot commit.
doc=normalizeData(original);revision++;await reload();await menu('previous-opening');await amounts(2000,200,700);await preview();await page.locator('[data-confirm-opening]').evaluate(b=>window.oldOpeningButton=b);const stale=saves;await page.locator('[data-region=vietnam]').evaluate(b=>b.click());await page.evaluate(()=>window.oldOpeningButton.click());assert.equal(saves,stale);await page.locator('[data-region=foreign]').click();await date();
await menu('previous-opening');await amounts(2000,200,700);await preview();admin=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('#opening-dialog').waitFor({state:'detached'});assert.equal(saves,stale);assert.equal(await page.locator('nav [data-view=credit]').count(),0);
const hidden=creditSnapshot(doc);await menu('previous-opening');await amounts(2100,210,710);await preview();await confirm();assert.equal(creditSnapshot(doc),hidden);assert.equal(doc.accounts.creditDebt,200);assert.equal(doc.accounts.openedOn,'2026-11-01');
await menu('edit-opening');await preview();await page.locator('[data-confirm-opening]').evaluate(b=>window.oldOpeningButton=b);await page.locator('[data-action=account]').first().evaluate(b=>b.click());await page.locator('#sign-out').click();await page.locator('#opening-dialog').waitFor({state:'detached'});const signedOutSaves=saves;await page.evaluate(()=>window.oldOpeningButton.click());assert.equal(saves,signedOutSaves);
user='other-opening-fixture';doc=newRegionalBook('JP');revision=1;await page.locator('[data-action=account]').first().click();await page.locator('#auth-form [name=email]').fill('other@example.test');await page.locator('#auth-form [name=password]').fill('mock-password');await page.locator('#auth-form .account-submit').click();await page.locator('#account-dialog').waitFor({state:'hidden'});assert.match(await page.locator('[data-current-balance=bank]').textContent(),/Chưa thiết lập/);
console.log('PASS stale region/account popup, role revocation, ordinary-account edits and hidden card preservation');
// Small viewport supports both input and preview.
admin=true;doc=normalizeData(original);revision++;await reload();await page.setViewportSize({width:390,height:844});await menu('previous-opening');await amounts(2200,220,720);await preview();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('#opening-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.screenshot({path:'/tmp/calendar-opening-mobile.png'});await page.locator('[data-confirm-opening]').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/calendar-opening-mobile-preview.png'});await page.locator('#opening-dialog .dialog-close').click();await page.locator('[data-action=theme]').click();await menu('previous-opening');await page.screenshot({path:'/tmp/calendar-opening-mobile-dark.png'});assert.deepEqual(errors,[]);
console.log('PASS desktop/mobile light/dark UI, no browser errors');
}finally{await browser.close();}
