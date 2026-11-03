// All authentication and finance API calls are mocked. No real accounts/data.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
import assert from 'node:assert/strict';
import {newRegionalBook} from '../src/region-model.js';
import {normalizeData,monthSummary,addDebt,repayDebt} from '../src/model.js';
import {accountBalances} from '../src/account-model.js';
import {saveStatement,settleStatement} from '../src/card-model.js';
import {fundBalance} from '../src/safety-model.js';
const date='2026-01-15';
let doc=newRegionalBook('JP'),revision=1,admin=true,user='expense-fixture',saves=0,failure=null,holdSave=null,holdRole=null;
doc.accounts={openedOn:'2026-01-01',bank:1000,cash:100,savings:500,creditDebt:0,creditLimit:5000,transfers:[]};
doc.days[date]={note:'Keep this note',items:[
 {id:'saved',title:'Saved ordinary',amount:12.345,paymentMethod:'bank',status:'paid',category:'Khác'},
 {id:'card',title:'Saved card',amount:20,paymentMethod:'card',settlement:'oneoff',billingMonth:'2026-02',status:'paid'},
 {id:'bill',title:'Linked obligation',amount:5,paymentMethod:'bank',status:'planned',obligationId:'obligation'}]};
doc.safety={funds:[{id:'fund',name:'Savings fund',source:'savings',kind:'goal',target:100,entries:[{id:'allocate',date:'2026-01-01',direction:'allocate',amount:50,note:'Keep fund history'}]}],obligations:[{id:'obligation',date,expenseId:'bill',history:[]}]};
addDebt(doc,{id:'debt',title:'Linked loan',type:'Khác',amount:100});repayDebt(doc,'debt',{id:'payment',date,amount:10,source:'bank'});
saveStatement(doc,{month:'2026-01',priorBalance:0,newRibo:0,principal:0,fees:2,oneOff:10,dueDate:date,confirmedOn:date,status:'confirmed',note:'Keep statement note'});settleStatement(doc,'2026-01',date,'bank');
doc.regional={vietnam:newRegionalBook('VN')};doc.regional.vietnam.days[date]={note:'Vietnam note',items:[{id:'saved',title:'Vietnam saved',amount:10000,status:'paid',paymentMethod:'cash'}]};doc=normalizeData(doc);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(10000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{const req=route.request(),url=req.url();let body;
 if(url.includes('/auth/v1/logout'))body={};
 else if(url.includes('/auth/v1/token'))body={access_token:'mock',refresh_token:'mock',expires_in:3600};
 else if(url.includes('/auth/v1/user'))body={id:user,email:'fixture@example.test',email_confirmed_at:'2026-01-01'};
 else if(url.includes('calendar_is_admin')){if(holdRole)await holdRole;body=admin;}
 else if(url.includes('calendar_profiles'))body=[{username:'fixture',display_name:'fixture'}];
 else if(url.includes('calendar_documents'))body=[{data:doc,revision}];
 else if(url.includes('save_calendar_document')){
  saves++;const payload=req.postDataJSON();if(holdSave)await holdSave;
  if(failure){await route.fulfill({status:failure==='40001'?409:503,json:{code:failure,message:'Mock '+failure}});return;}
  assert.equal(payload.p_expected_revision,revision);doc=normalizeData(payload.p_data);body={revision:++revision};
 }else throw Error('Unexpected remote: '+url);
 await route.fulfill({json:body});});
await page.addInitScript(()=>localStorage.setItem('lich-auth:mjgxzzxmfifhoymvdaoe.supabase.co',JSON.stringify({access_token:'mock',refresh_token:'mock',expires_at:Date.now()/1000+3600})));
async function chooseDate(value=date){await page.locator('#day-select').fill(value);await page.locator('#day-select').dispatchEvent('change');}
async function list(){await page.locator('.expense-browser').evaluate(el=>el.open=true);}
const entries=page.locator('.day-panel .expense-entry');
const edit=id=>page.locator(`[data-edit-expense="${id}"]`);
const field=name=>page.locator(`#expense-dialog [data-field=${name}]`);
async function open(id='saved'){await list();await edit(id).click();await page.locator('#expense-dialog').waitFor();}
async function savePopup(){await page.locator('#expense-dialog .account-submit').click();await page.locator('#expense-dialog').waitFor({state:'detached'});}
async function add(title,value='1.234'){
 await page.locator('[data-action=quick-expense]').click();const row=entries.last();await row.locator('[data-field=title]').fill(title);await row.locator('[data-field=amount]').fill(value);return row;
}
async function reload(){await page.reload();await page.locator('nav [data-view=safety]').waitFor();await chooseDate();await list();}
try{
await page.goto(process.env.CALENDAR_URL||'http://127.0.0.1:5173/');await page.locator('nav [data-view=credit]').waitFor();await chooseDate();await list();
assert.equal(await entries.count(),0);assert.equal(await edit('saved').count(),1);assert.equal(await edit('card').count(),1);
assert.equal(await edit('bill').count(),0);assert(!/Phí/.test(await page.locator('.expense-search-list').innerText()));
const original=structuredClone(doc),vn=structuredClone(doc.regional),protectedRows=doc.days[date].items.filter(i=>i.debtPaymentId||i.cardPaymentMonth||i.cardFeeMonth||i.obligationId);
await page.locator('.expense-result [data-open-day]').first().click();assert.equal(await entries.count(),0);assert.equal(await page.locator('#expense-dialog').count(),0);
await open();await field('title').fill('Canceled edit');await field('amount').fill('99');await page.locator('#expense-dialog [data-cancel]').click();assert.deepEqual(doc,original);assert.equal(saves,0);
await open();await field('title').fill('Edited ordinary');await field('amount').fill('23.456');await field('category').selectOption('Ăn uống');await field('paymentMethod').selectOption('cash');await field('amount').press('Enter');await page.locator('#expense-dialog').waitFor({state:'detached'});
assert.equal(doc.days[date].items.find(i=>i.id==='saved').amount,23.456);assert.equal(accountBalances(doc,date).cash,76.544);assert.equal(await entries.count(),0);assert.deepEqual(doc.regional,vn);
assert.equal(doc.days[date].note,original.days[date].note);assert.deepEqual(doc.days[date].items.filter(i=>i.debtPaymentId||i.cardPaymentMonth||i.cardFeeMonth||i.obligationId),protectedRows);
// Fund source is forced; excessive spending fails without changing server data.
await open();await field('fundId').selectOption('fund');assert.equal(await field('paymentMethod').inputValue(),'savings');assert(await field('paymentMethod').isDisabled());await field('amount').fill('50.001');
const beforeFund=structuredClone(doc),beforeCalls=saves;await page.locator('#expense-dialog .account-submit').click();await page.locator('#expense-dialog [role=status]').filter({hasText:'Quỹ không đủ'}).waitFor();assert.deepEqual(doc,beforeFund);assert.equal(saves,beforeCalls);await field('amount').fill('25.123');await savePopup();assert.equal(fundBalance(doc,'fund',date),24.877);assert.equal(accountBalances(doc,date).savings,474.877);
// Card info is editable only through verified admin popup.
await open('card');await field('settlement').selectOption('ribo');await field('billingMonth').fill('2026-03');await savePopup();assert.equal(doc.days[date].items.find(i=>i.id==='card').settlement,'ribo');
console.log('PASS popup edits/cancel/precision, protected links, source/fund validation and card info');
// Delayed acknowledgement removes only the exact submitted rows.
let release;holdSave=new Promise(r=>release=r);const row=await add('Submitted row');const index=await row.getAttribute('data-item');const beforeDelay=saves;await row.locator('[data-field=title]').press('Enter');await page.waitForFunction(()=>document.querySelector('.local-badge')?.innerText.includes('Đang lưu'));
assert.equal(await entries.count(),1);await page.locator(`.day-panel [data-item="${index}"] [data-field=title]`).fill('Later typing');await add('Later new row','2.345');release();holdSave=null;
await page.waitForFunction(()=>document.querySelector('.local-badge')?.innerText.includes('Chưa lưu'));assert.equal(saves,beforeDelay+1);assert.equal(await entries.count(),2);assert(doc.days[date].items.some(i=>i.title==='Submitted row'));assert(!doc.days[date].items.some(i=>i.title==='Later new row'));
await reload();assert.equal(await entries.count(),2);assert.equal(await entries.first().locator('[data-field=title]').inputValue(),'Later typing');await page.locator('[data-action=save]').click();await page.waitForFunction(()=>document.querySelector('.day-panel .expense-entry')===null);assert(doc.days[date].items.some(i=>i.title==='Later new row'));
await chooseDate('2026-01-16');await chooseDate();await page.locator('[data-region=vietnam]').click();await chooseDate();assert.equal(await entries.count(),0);await page.locator('[data-region=foreign]').click();await chooseDate();assert.equal(await entries.count(),0);await reload();assert.equal(await entries.count(),0);
console.log('PASS delayed save, later edits/new rows, reload/day/region isolation');
// Even invalid partial typing after submission survives acknowledgement/reload.
holdSave=new Promise(r=>release=r);await add('Raw partial','4.567');await entries.last().locator('[data-field=title]').press('Enter');await page.waitForFunction(()=>document.querySelector('.local-badge')?.innerText.includes('Đang lưu'));await entries.last().locator('[data-field=amount]').fill('.');release();holdSave=null;
await page.waitForFunction(()=>document.querySelector('.local-badge')?.hidden);assert.equal(await entries.count(),1);assert.equal(await entries.last().locator('[data-field=amount]').inputValue(),'.');await reload();assert.equal(await entries.count(),1);assert.equal(await entries.last().locator('[data-field=amount]').inputValue(),'.');await entries.last().locator('[data-field=amount]').fill('5.678');await entries.last().locator('[data-field=amount]').press('Enter');await page.waitForFunction(()=>document.querySelector('.day-panel .expense-entry')===null);assert.equal(doc.days[date].items.find(i=>i.title==='Raw partial').amount,5.678);
console.log('PASS unacknowledged invalid partial input survives response and reload');
// A role check for new card typing may finish after the earlier save response.
await add('Card submitted','6.789');await entries.last().locator('[data-field=paymentMethod]').selectOption('card');await entries.last().locator('[data-field=settlement]').waitFor();holdSave=new Promise(r=>release=r);await entries.last().locator('[data-field=title]').press('Enter');await page.waitForFunction(()=>document.querySelector('.local-badge')?.innerText.includes('Đang lưu'));let releaseCardRole;holdRole=new Promise(r=>releaseCardRole=r);await entries.last().locator('[data-field=title]').fill('Card later typing');release();holdSave=null;await page.waitForFunction(()=>document.querySelector('.local-badge')?.hidden);assert.equal(await entries.count(),1);assert.equal(await entries.last().locator('[data-field=title]').inputValue(),'Card later typing');releaseCardRole();holdRole=null;await page.waitForFunction(()=>document.querySelector('.local-badge')?.innerText.includes('Chưa lưu'));await entries.last().locator('[data-field=title]').press('Enter');await page.waitForFunction(()=>document.querySelector('.day-panel .expense-entry')===null);assert(doc.days[date].items.some(i=>i.title==='Card later typing'));
console.log('PASS card typing retained while role verification overlaps save acknowledgement');
// Simulate reload interrupting a card role check after raw input was cached.
const restoredCard=doc.days[date].items.find(i=>i.title==='Card later typing');await page.evaluate(({date,id})=>{const key=Object.keys(localStorage).find(k=>k.startsWith('lich-cloud:'));const cache=JSON.parse(localStorage.getItem(key));cache.expenseInputs[JSON.stringify(['foreign',date,id])]={title:{value:'Restored role input',message:''}};localStorage.setItem(key,JSON.stringify(cache));},{date,id:restoredCard.id});await reload();await page.locator('nav [data-view=credit]').waitFor();assert.equal(await entries.count(),1);assert.equal(await entries.last().locator('[data-field=title]').inputValue(),'Restored role input');await entries.last().locator('[data-field=title]').press('Enter');await page.waitForFunction(()=>document.querySelector('.day-panel .expense-entry')===null);assert.equal(doc.days[date].items.find(i=>i.id===restoredCard.id).title,'Restored role input');



// Failed popup saves keep the entered values; failure never changes full document.
await open();await field('title').fill('Retry popup title');failure='NETWORK';const failedDoc=structuredClone(doc);await page.locator('#expense-dialog .account-submit').click();await page.locator('#expense-dialog [role=status]').filter({hasText:'Không thể đồng bộ'}).waitFor();assert.equal(await field('title').inputValue(),'Retry popup title');assert.deepEqual(doc,failedDoc);failure=null;await savePopup();assert.equal(doc.days[date].items.find(i=>i.id==='saved').title,'Retry popup title');
// Daily network and conflict failures survive reload with unchanged server data.
for(const code of ['NETWORK','40001']){
 failure=code;await add('Failure '+code);await entries.last().locator('[data-field=title]').press('Enter');await page.locator('.cloud-warning').waitFor();assert.equal(await entries.count(),1);await reload();assert.equal(await entries.count(),1);assert(!doc.days[date].items.some(i=>i.title==='Failure '+code));
 failure=null;
 if(code==='NETWORK'){await page.locator('[data-action=cloud-retry]').click();await page.waitForFunction(()=>document.querySelector('.day-panel .expense-entry')===null);}
 else {page.once('dialog',d=>d.accept());await page.locator('[data-action=cloud-remote]').click();await page.waitForFunction(()=>document.querySelector('.day-panel .expense-entry')===null);}
}
console.log('PASS popup/network retry and daily network/conflict draft retention');
// Popup conflicts retain staged values and the original server document.
await open();const conflictDoc=structuredClone(doc);await field('title').fill('Popup conflict draft');failure='40001';await page.locator('#expense-dialog .account-submit').click();await page.locator('#expense-dialog [role=status]').filter({hasText:'thiết bị khác'}).waitFor();assert.equal(await field('title').inputValue(),'Popup conflict draft');assert.deepEqual(doc,conflictDoc);await page.locator('#expense-dialog [data-cancel]').click();failure=null;page.once('dialog',d=>d.accept());await page.locator('[data-action=cloud-remote]').click();await page.locator('.cloud-warning').waitFor({state:'detached'});
// Delete cancellation does nothing; confirmed delete updates balances and funds.
await open();const beforeDelete=structuredClone(doc);page.once('dialog',d=>d.dismiss());await page.locator('#expense-dialog [data-remove]').click();assert.deepEqual(doc,beforeDelete);assert(await page.locator('#expense-dialog').isVisible());page.once('dialog',d=>d.accept());await page.locator('#expense-dialog [data-remove]').click();await page.locator('#expense-dialog').waitFor({state:'detached'});assert(!doc.days[date].items.some(i=>i.id==='saved'));assert.equal(fundBalance(doc,'fund',date),50);assert.equal(accountBalances(doc,date).savings,500);
// A submit waiting for role verification cannot write after switching region.
await open('card');await field('title').fill('Stale region');const staleCalls=saves;let releaseRole;holdRole=new Promise(r=>releaseRole=r);await page.locator('#expense-dialog .account-submit').click();await page.locator('[data-region=vietnam]').evaluate(b=>b.click());releaseRole();holdRole=null;await page.locator('#expense-dialog').waitFor({state:'detached'});await page.locator('[data-region=foreign]').click();await chooseDate();assert.equal(saves,staleCalls);assert(!doc.days[date].items.some(i=>i.title==='Stale region'));assert.deepEqual(doc.regional,vn);
// Server revocation closes popup and no credit mutation is sent.
await open('card');await field('title').fill('Revoked change');admin=false;const revokedCalls=saves;await page.locator('#expense-dialog .account-submit').click();await page.locator('#expense-dialog').waitFor({state:'detached'});assert.equal(saves,revokedCalls);assert.equal(await edit('card').count(),0);assert.equal(await page.locator('nav [data-view=credit]').count(),0);assert.equal(await page.locator('option[value=card]').count(),0);
// Ordinary users can edit cash/bank rows while hidden card data survives.
await add('Ordinary draft','3.456');await entries.last().locator('[data-field=title]').press('Enter');await page.waitForFunction(()=>document.querySelector('.day-panel .expense-entry')===null);const ordinary=doc.days[date].items.find(i=>i.title==='Ordinary draft');const hidden=structuredClone(doc.days[date].items.find(i=>i.id==='card'));await open(ordinary.id);await field('title').fill('Ordinary saved');await savePopup();assert.deepEqual(doc.days[date].items.find(i=>i.id==='card'),hidden);
console.log('PASS confirmed deletion, stale region popup, admin revocation and ordinary-account editing');
// Account change closes saved popup; a retained old form cannot submit afterward.
await open(ordinary.id);await page.locator('#expense-dialog form').evaluate(form=>window.oldExpenseForm=form);await page.locator('[data-action=account]').first().evaluate(b=>b.click());await page.locator('#sign-out').click();await page.locator('#expense-dialog').waitFor({state:'detached'});const logoutCalls=saves;await page.evaluate(()=>window.oldExpenseForm.dispatchEvent(new Event('submit',{cancelable:true})));assert.equal(saves,logoutCalls);assert.equal(await entries.count(),0);
// Fresh login uses a different mock identity and contains no previous drafts.
user='other-fixture';doc=newRegionalBook('VN');revision=1;await page.locator('[data-action=account]').first().click();await page.locator('#auth-form [name=email]').fill('other@example.test');await page.locator('#auth-form [name=password]').fill('mock-password');await page.locator('#auth-form .account-submit').click();await page.locator('#account-dialog').waitFor({state:'hidden'});await chooseDate();assert.equal(await entries.count(),0);assert(!/Ordinary saved|Saved card/.test(await page.locator('.page').innerText()));
console.log('PASS stale account popup and account-scoped drafts');
// Responsive screenshots with mock data, including popup in both themes.
admin=true;doc=original;revision++;await reload();await open();await page.screenshot({path:'/tmp/calendar-expenses-desktop.png',fullPage:true});await page.locator('#expense-dialog [data-cancel]').click();
await page.setViewportSize({width:390,height:844});await list();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/calendar-expenses-mobile.png',fullPage:true});await open();assert(await page.locator('#expense-dialog').evaluate(el=>el.getBoundingClientRect().width<=innerWidth));await page.screenshot({path:'/tmp/calendar-expenses-mobile-popup.png'});await page.locator('#expense-dialog [data-cancel]').click();await page.locator('[data-action=theme]').click();await open();await page.screenshot({path:'/tmp/calendar-expenses-mobile-dark.png'});assert.deepEqual(errors,[]);
console.log('PASS desktop/mobile light/dark layout; no browser errors');
}finally{await browser.close();}
