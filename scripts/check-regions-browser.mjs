// Optional browser check: supply PLAYWRIGHT_MODULE when playwright-core is installed outside this checkout.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
import assert from 'node:assert/strict';
import {newRegionalBook} from '../src/region-model.js';
import {accountBalances} from '../src/account-model.js';
import {monthSummary} from '../src/model.js';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:1440,height:1000}}), page=await ctx.newPage();
let doc=newRegionalBook('JP'),revision=1,admin=true,saves=0;
doc.accounts={openedOn:'2026-01-01',bank:50000,cash:10000,savings:100000,creditDebt:0,creditLimit:500000,transfers:[]};
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{const req=route.request(),url=req.url();let body;
 if(url.includes('/auth/v1/user'))body={id:'fixture-admin',email:'fixture@example.test',email_confirmed_at:'2026-01-01'};
 else if(url.includes('calendar_is_admin'))body=admin;
 else if(url.includes('calendar_profiles'))body=[{username:'fixture',display_name:'fixture'}];
 else if(url.includes('calendar_documents'))body=[{data:doc,revision}];
 else if(url.includes('save_calendar_document')){const p=req.postDataJSON();assert.equal(p.p_expected_revision,revision);doc=p.p_data;saves++;body={revision:++revision};}
 else throw Error('Unexpected remote: '+url);
 await route.fulfill({json:body});});
await page.addInitScript(()=>localStorage.setItem('lich-auth:mjgxzzxmfifhoymvdaoe.supabase.co',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Date.now()/1000+3600})));
await page.goto((process.env.CALENDAR_URL||'http://127.0.0.1:5173/'));await page.locator('nav [data-view=credit]').waitFor();
async function date(value='2026-01-15'){await page.locator('#day-select').fill(value);await page.locator('#day-select').dispatchEvent('change');}
await date();
await page.locator('.accounts-panel').screenshot({path:'/tmp/calendar-regions-accounts.png'});
assert.match(await page.locator('[data-balance=assets]').innerText(),/^160,000 /);
await page.locator('[data-action=quick-expense]').click();
await page.locator('.expense-entry [data-field=title]').fill('Gửi tiền về Việt Nam');
await page.locator('.expense-entry [data-field=paymentMethod]').selectOption('savings');
await page.locator('.expense-entry [data-field=amount]').fill('100001');
await page.locator('.expense-entry [data-field=status]').selectOption('paid');assert.equal(await page.locator('.expense-entry [data-field=status]').inputValue(),'planned');assert.match(await page.locator('[data-balance=savings]').innerText(),/^100,000 /);
await page.locator('.expense-entry [data-field=amount]').fill('100000');
await page.locator('.expense-entry [data-field=status]').selectOption('paid');
assert.match(await page.locator('[data-balance=savings]').innerText(),/^0 /);assert.match(await page.locator('[data-balance=assets]').innerText(),/^60,000 /);assert.equal(saves,0);
await page.locator('[data-region=vietnam]').click();assert.equal(await page.locator('[data-income=salary]').count(),0);assert.match(await page.locator('.region-tabs [aria-pressed=true]').innerText(),/Việt Nam/);
await page.locator('[data-action=account-balances]').click();await page.getByRole('button',{name:'Yêu cầu thêm',exact:true}).click();
await page.locator('#ledger-dialog [name=openedOn]').fill('2026-01-01');
for(const key of ['bank','cash','savings'])await page.locator('#ledger-dialog [name='+key+']').fill('0');
assert.equal(await page.locator('#ledger-dialog [name=creditDebt]').count(),0);
await page.locator('#ledger-dialog .account-submit').click();await page.locator('#ledger-dialog').waitFor({state:'detached'});
assert.equal(accountBalances(doc,'2026-01-15').savings,0);assert.equal(doc.regional.vietnam.accounts.savings,0);
async function receipt(type,value,source='bank',loan=''){
 await page.locator('[data-action=add-receipt]').click();await page.locator('#cash-entry-dialog [name=type]').selectOption(type);await page.locator('#cash-entry-dialog [name=date]').fill('2026-01-15');await page.locator('#cash-entry-dialog [name=source]').selectOption(source);await page.locator('#cash-entry-dialog [name=amount]').fill(String(value));if(loan)await page.locator('#cash-entry-dialog [name=receivableId]').selectOption(loan);await page.locator('#cash-entry-dialog .account-submit').click();await page.locator('#cash-entry-dialog').waitFor({state:'detached'});
}
await receipt('own',16000000,'savings');assert.match(await page.locator('[data-balance=savings]').innerText(),/^16,000,000 /);assert.equal(monthSummary(doc.regional.vietnam,2026,0).salary,0);assert.equal(monthSummary(doc.regional.vietnam,2026,0).balance,0);
await receipt('gift',100000);assert.equal(monthSummary(doc.regional.vietnam,2026,0).otherIncome,100000);
const giftId=doc.regional.vietnam.receipts.find(r=>r.type==='gift').id;
await page.locator(`[data-edit-receipt="${giftId}"]`).click();await page.locator('#cash-entry-dialog [name=amount]').fill('200000');await page.locator('#cash-entry-dialog .account-submit').click();await page.locator('#cash-entry-dialog').waitFor({state:'detached'});assert.equal(monthSummary(doc.regional.vietnam,2026,0).otherIncome,200000);
await page.locator(`[data-edit-receipt="${giftId}"]`).click();await page.locator('#cash-entry-dialog [name=amount]').fill('100000');await page.locator('#cash-entry-dialog .account-submit').click();await page.locator('#cash-entry-dialog').waitFor({state:'detached'});

await page.locator('[data-action=add-receivable]').click();await page.locator('#cash-entry-dialog [name=title]').fill('Bạn nợ');await page.locator('#cash-entry-dialog [name=amount]').fill('200000');await page.locator('#cash-entry-dialog .account-submit').click();await page.locator('#cash-entry-dialog').waitFor({state:'detached'});
await receipt('repayment',50000,'bank',doc.regional.vietnam.receivables[0].id);assert.equal(monthSummary(doc.regional.vietnam,2026,0).otherIncome,100000);assert.equal(accountBalances(doc.regional.vietnam,'2026-01-15').bank,150000);
await page.locator('[data-remove-receivable]').click();await page.locator('#cash-entry-dialog .account-submit').click();await page.locator('#cash-entry-dialog [role=status]').filter({hasText:'không thể xóa'}).waitFor();await page.locator('#cash-entry-dialog .dialog-close').click();assert.equal(doc.regional.vietnam.receivables.length,1);
await page.locator('nav [data-view=credit]').click();assert.equal(await page.locator('[data-credit-action]').count(),0);assert(!/PayPay|リボ/.test(await page.locator('.page').innerText()));
await page.locator('[data-simple-card=statement]').click();await page.locator('#credit-dialog [name=total]').fill('5000000');await page.locator('#credit-dialog [name=dueDate]').fill('2026-01-20');await page.locator('#credit-dialog .account-submit').click();await page.locator('#credit-dialog').waitFor({state:'detached'});
await page.locator('.statement-panel').screenshot({path:'/tmp/calendar-regions-statement.png'});await page.locator('[data-simple-card=pay]').click();await page.locator('#credit-dialog [name=source]').selectOption('savings');await page.locator('#credit-dialog .account-submit').click();await page.locator('#credit-dialog').waitFor({state:'detached'});assert.equal(accountBalances(doc.regional.vietnam,'2026-01-20').savings,11000000);
await page.locator('[data-region=foreign]').click();await date();assert.match(await page.locator('[data-balance=savings]').innerText(),/^0 /);assert.equal(doc.days['2026-01-15'].items.length,1);
await page.locator('[data-action=region-settings]').click();await page.locator('#region-dialog [name=country]').selectOption('GB');await page.locator('#region-dialog .account-submit').click();await page.locator('#region-dialog [role=status]').filter({hasText:'Không thể đổi'}).waitFor();await page.locator('#region-dialog .dialog-close').click();
await page.reload();await page.locator('nav [data-view=credit]').waitFor();await page.locator('[data-region=vietnam]').click();await date('2026-01-20');assert.match(await page.locator('[data-balance=savings]').innerText(),/^11,000,000 /);
await page.locator('[data-action=region-settings]').click();await page.locator('#region-dialog [name=salary]').check();await page.locator('#region-dialog [name=savings]').uncheck();await page.locator('#region-dialog .account-submit').click();await page.locator('#region-dialog').waitFor({state:'detached'});assert.equal(await page.locator('[data-income=salary]').count(),1);assert.equal(await page.locator('[data-balance=savings]').count(),0);assert.match(await page.locator('[data-balance=assets]').innerText(),/^11,150,000 /);
admin=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('nav [data-view=credit]').waitFor({state:'detached'});assert.equal(await page.locator('option[value=card]').count(),0);
await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/regions-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
console.log('PASS region integration: savings expense, unsaved region switch, VND zero salary, own/gift/principal receipts, simple statement pay from savings, legacy isolation, reload, module toggles, admin revoke and mobile.');// Fresh account setup chooses country/currency and modules without relabeling old data.
const {emptyData}=await import('../src/model.js');doc=emptyData();revision++;admin=true;
await page.reload();await page.locator('#region-dialog').waitFor();await page.locator('#region-dialog [name=country]').selectOption('GB');await page.locator('#region-dialog [name=salary]').uncheck();await page.locator('#region-dialog .account-submit').click();await page.locator('#region-dialog').waitFor({state:'detached'});
assert.equal(doc.currencies.cash,'GBP');assert.equal(doc.currencies.savings,'GBP');assert.equal(doc.bookSettings.modules.salary,false);assert.equal(await page.locator('[data-income=salary]').count(),0);
assert.match(await page.locator('.region-tabs [aria-pressed=true]').innerText(),/GBP/);assert(!/PayPay|リボ/.test(await page.locator('.page').innerText()));assert.deepEqual(errors,[]);
console.log('PASS fresh account: country GBP, independent language, matching savings currency, selected modules.');await browser.close();
