const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
import assert from 'node:assert/strict';
import {newRegionalBook} from '../src/region-model.js';
import {addDebt,monthSummary} from '../src/model.js';
import {accountBalances} from '../src/account-model.js';
import {fundBalance,forecast30} from '../src/safety-model.js';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
let data=newRegionalBook('JP'),revision=1,admin=true,saves=0;
data.accounts={openedOn:'2026-01-01',bank:1000,cash:100,savings:500,creditDebt:0,creditLimit:null,transfers:[]};addDebt(data,{id:'loan',title:'Loan fixture',type:'Khác',amount:100,dueDate:'2026-01-10'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{const req=route.request(),url=req.url();let body;
 if(url.includes('/auth/v1/user'))body={id:'safety-fixture',email:'fixture@example.test',email_confirmed_at:'2026-01-01'};
 else if(url.includes('calendar_is_admin'))body=admin;
 else if(url.includes('calendar_profiles'))body=[{username:'fixture',display_name:'fixture'}];
 else if(url.includes('calendar_documents'))body=[{data,revision}];
 else if(url.includes('save_calendar_document')){const payload=req.postDataJSON();assert.equal(payload.p_expected_revision,revision);data=payload.p_data;saves++;body={revision:++revision};}
 else throw Error('Unexpected external request: '+url);
 await route.fulfill({json:body});});
await page.addInitScript(()=>localStorage.setItem('lich-auth:mjgxzzxmfifhoymvdaoe.supabase.co',JSON.stringify({access_token:'mock',refresh_token:'mock',expires_at:Date.now()/1000+3600})));
await page.goto(process.env.CALENDAR_URL||'http://127.0.0.1:5173/');await page.locator('nav [data-view=safety]').click();
async function date(value='2026-01-01'){await page.locator('#safety-date').fill(value);await page.locator('#safety-date').dispatchEvent('change');}
async function open(action,id){let locator=page.locator(`[data-safety-action="${action}"]`);if(id)locator=page.locator(`[data-safety-action="${action}"][data-safety-id="${id}"]`);if(!await locator.first().isVisible())await locator.first().evaluate(e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await locator.first().click();await page.locator('#safety-dialog').waitFor();}
async function fill(name,value){await page.locator(`#safety-dialog [name=${name}]`).fill(String(value));}
async function confirm(){await page.locator('#safety-dialog .account-submit').click();await page.locator('#safety-dialog').waitFor({state:'detached'});}
await date();const baseline=structuredClone(data.accounts);
await open('fund');await fill('name','Quỹ dự phòng Nhật');await page.locator('#safety-dialog [name=source]').selectOption('bank');await page.locator('#safety-dialog [name=kind]').selectOption('emergency');await confirm();const fundId=data.safety.funds[0].id;
await open('allocate',fundId);await fill('amount',200);await confirm();assert.deepEqual(data.accounts,baseline);assert.equal(fundBalance(data,fundId,'2026-01-01'),200);
await open('reserve');await fill('essential',100);await fill('months',3);await confirm();assert.match(await page.locator('.safety-metrics').innerText(),/300 JPY/);
await open('budget');await fill('category','Ăn uống');await fill('amount',50);await confirm();
await open('obligation');await fill('title','Food bill');await fill('date','2026-01-02');await fill('amount',60);await fill('category','Ăn uống');await confirm();const obligationId=data.safety.obligations[0].id;assert.equal(data.days['2026-01-02'].items.length,1);assert.match(await page.locator('.budget-warning').first().innerText(),/vượt/);
await open('payObligation',obligationId);await fill('date','2026-01-02');await confirm();assert.equal(accountBalances(data,'2026-01-02').bank,940);assert.equal(monthSummary(data,2026,0).expense,60);assert.equal(data.safety.obligations[0].history.length,1);
await open('undoObligation',obligationId);await confirm();assert.equal(accountBalances(data,'2026-01-02').bank,1000);assert.equal(data.safety.obligations[0].history.length,2);
await open('payObligation',obligationId);await fill('date','2026-01-03');await confirm();assert.equal(data.safety.obligations[0].date,'2026-01-03');assert.equal(data.safety.obligations[0].dueDate,'2026-01-02');assert.equal(data.days['2026-01-02'].items.length,0);
await open('obligation');await fill('title','Emergency bill');await fill('date','2026-01-04');await fill('amount',50);await page.locator('#safety-dialog [name=fundId]').selectOption(fundId);await confirm();const funded=data.safety.obligations.find(o=>o.id!==obligationId).id;
await open('payObligation',funded);await fill('date','2026-01-04');await confirm();assert.equal(accountBalances(data,'2026-01-04').bank,890);assert.equal(fundBalance(data,fundId,'2026-01-04'),150);
await date('2026-01-04');const beforeFailure=saves;await open('release',fundId);await fill('amount',151);await page.locator('#safety-dialog .account-submit').click();await page.locator('#safety-dialog [role=status]').filter({hasText:'không đủ'}).waitFor();assert.equal(saves,beforeFailure);await page.locator('#safety-dialog .dialog-close').click();
await open('debtTerms','loan');await fill('apr',0);await fill('minimum',10);await fill('due','2026-01-10');await confirm();
await open('plan');await fill('budget',30);await confirm();assert.match(await page.locator('.strategy-grid').innerText(),/4 tháng/);assert.equal(forecast30(data,'2026-01-04').days.find(d=>d.date==='2026-01-10').bank,880);
await page.locator('[data-safety-action=payDebt]').click();await page.locator('#debt-dialog').waitFor();await page.locator('#debt-dialog [name=date]').fill('2026-01-05');await page.locator('#debt-dialog [name=interest]').fill('5');await page.locator('#debt-dialog .account-submit').click();await page.locator('#debt-dialog .debt-finish').waitFor();await page.locator('#debt-dialog .debt-finish').click();assert.equal(data.debts[0].payments[0].amount,100);assert.equal(data.debts[0].payments[0].interest,5);assert.equal(accountBalances(data,'2026-01-05').bank,785);
await page.locator('[data-region=vietnam]').click();await page.locator('nav [data-view=safety]').click();assert.equal(await page.locator('.fund-card').count(),0);await open('fund');await fill('name','Quỹ Việt');await fill('target',1000000);await confirm();assert.equal(data.regional.vietnam.safety.funds.length,1);assert.equal(data.safety.funds[0].id,fundId);
await page.reload();await page.locator('nav [data-view=safety]').click();await date('2026-01-04');assert.match(await page.locator('.fund-grid').innerText(),/150 JPY/);assert.equal(data.safety.obligations[0].history.length,3);
await page.screenshot({path:'/tmp/safety-desktop.png',fullPage:true});await page.locator('.safety-metrics').screenshot({path:'/tmp/safety-metrics.png'});
admin=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('nav [data-view=credit]').waitFor({state:'detached'});assert.equal(await page.locator('[data-safety-action=cardPlan]').count(),0);assert(!/thẻ|PayPay|sao kê/i.test(await page.locator('.page').innerText()));
await page.locator('[data-action=safety-receivables]').click();await page.locator('.receivables-panel').waitFor();
await page.locator('nav [data-view=safety]').click();await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/safety-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
console.log('PASS F: funds/reserve coverage, budget alerts, pay/undo/actual date, earmarked bill, insufficient fund, 30-day forecast, loan strategies, separate VN book, reload/audit, ordinary role, receivables link and mobile.');await browser.close();
