// Synthetic identities and documents only; all external calls are intercepted.
import assert from 'node:assert/strict';
import {normalizeData,CATEGORIES} from '../src/model.js';
import {newRegionalBook} from '../src/region-model.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
function fixture(){
 const d=newRegionalBook('JP');d.accounts={openedOn:'2026-01-01',bank:100000,cash:10000,savings:5000,creditDebt:0,creditLimit:null,transfers:[]};
 d.days['2026-11-05']={note:'Keep note',items:CATEGORIES.flatMap((category,i)=>['bank','cash','card'].map(source=>({id:source+i,title:source+i,category,amount:(i+1)*({bank:100,cash:10,card:1})[source],status:'paid',paymentMethod:source,...(source==='card'?{creditTracking:true}:{})})))};
 d.days['2026-01-05']={note:'',items:[{id:'jan',title:'Jan',category:'Ăn uống',amount:200,status:'paid',paymentMethod:'bank'}]};
 d.days['2026-02-05']={note:'',items:[{id:'feb',title:'Feb',category:'Giải trí',amount:123,status:'paid',paymentMethod:'card',creditTracking:true}]};
 d.days['2026-12-05']={note:'',items:[{id:'future',title:'Future',amount:999,status:'paid',paymentMethod:'bank'}]};
 d.regional={vietnam:newRegionalBook('VN')};d.regional.vietnam.accounts={openedOn:'2026-01-01',bank:1000000,cash:0,savings:0,creditDebt:0,creditLimit:null,transfers:[]};return normalizeData(d);
}
let doc=fixture(),revision=1,admin=true,writes=0,hold=null,fail=false;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1600,height:1100}}),page=await context.newPage();page.setDefaultTimeout(10000);await page.clock.install({time:new Date('2026-11-12T03:00:00Z')});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://**/*',async route=>{
 const req=route.request(),url=req.url();let body;
 if(url.includes('/auth/v1/user'))body={id:'category-fixture',email:'fixture@example.test',email_confirmed_at:'2026-01-01'};
 else if(url.includes('/auth/v1/token'))body={access_token:'mock',refresh_token:'mock',expires_in:3600};
 else if(url.includes('calendar_is_admin'))body=admin;
 else if(url.includes('calendar_profiles'))body=[{username:'category-fixture'}];
 else if(url.includes('calendar_documents'))body=[{data:doc,revision}];
 else if(url.includes('save_calendar_document')){if(hold)await hold;if(fail){await route.fulfill({status:503,json:{message:'Mock failure'}});return;}const p=req.postDataJSON();assert.equal(p.p_expected_revision,revision);doc=normalizeData(p.p_data);writes++;body={revision:++revision};}
 else throw Error('Unexpected remote '+url);await route.fulfill({json:body});
});
await page.addInitScript(()=>localStorage.setItem('lich-auth:mjgxzzxmfifhoymvdaoe.supabase.co',JSON.stringify({access_token:'mock',refresh_token:'mock',expires_at:Date.now()/1000+3600})));
const chart=source=>page.locator(`[data-source-chart=${source}]`),total=source=>page.locator(`[data-source-total=${source}]`),cat=(source,name)=>chart(source).locator('[data-chart-category]').filter({has:page.locator('span').filter({hasText:new RegExp('^'+name+'$')})}).locator('strong');
async function amounts(bank,cash,card,currency='JPY'){
 const format=n=>new Intl.NumberFormat('en-US').format(n)+' '+currency;
 assert.equal(await total('bank').innerText(),format(bank));assert.equal(await total('cash').innerText(),format(cash));if(card!==null)assert.equal(await total('card').innerText(),format(card));else assert.equal(await chart('card').count(),0);
}
async function categories(sources=['bank','cash','card']){for(const source of sources){assert.equal(await chart(source).locator('[data-chart-category]').count(),9);assert.deepEqual(await chart(source).locator('[data-chart-category]').evaluateAll(rows=>rows.map(r=>r.dataset.chartCategory)),CATEGORIES);}}
try{
 await page.goto(process.env.CALENDAR_URL||'http://127.0.0.1:5188');await chart('card').waitFor({state:'attached'});await page.locator('.analysis-panel>summary').click();await categories();await amounts(4500,450,45);assert.equal(await cat('bank','Ăn uống').innerText(),'100 JPY');assert.equal(await cat('cash','Thanh toán thẻ').innerText(),'80 JPY');assert.equal(writes,0);const original=structuredClone(doc);
 await page.locator('.analysis-panel').screenshot({path:'/tmp/category-month-desktop.png'});
 await page.locator('[data-view=year]').click();await categories();await amounts(4700,450,168);await page.locator('.analysis-panel').screenshot({path:'/tmp/category-year-desktop.png'});assert.deepEqual(doc,original);assert.equal(writes,0);
 await page.locator('[data-view=calendar]').click();await page.locator('#day-select').fill('2026-03-05');await page.locator('#day-select').dispatchEvent('change');await categories();await amounts(0,0,0);
 await page.locator('#day-select').fill('2026-11-12');await page.locator('#day-select').dispatchEvent('change');await amounts(4500,450,45);
 // A typed and failed/held save must not change acknowledged chart amounts.
 await page.locator('[data-action=quick-expense]').click();const field=k=>page.locator(`.day-panel .expense-entry [data-field=${k}]`).last();await field('title').fill('New bank cost');await field('amount').fill('111');await field('category').selectOption('Ăn uống');await field('status').selectOption('paid');await amounts(4500,450,45);
 fail=true;await page.locator('[data-action=save]').click();await page.locator('#cloud-notice').filter({hasText:'Không thể đồng bộ'}).waitFor();await amounts(4500,450,45);assert.deepEqual(doc,original);
 fail=false;let release;hold=new Promise(r=>release=r);await page.locator('[data-action=save]').click();await amounts(4500,450,45);release();hold=null;await total('bank').filter({hasText:'4,611 JPY'}).waitFor();await amounts(4611,450,45);assert.equal(await cat('bank','Ăn uống').innerText(),'211 JPY');assert.equal(writes,1);
 await page.reload();await chart('card').waitFor({state:'attached'});if(!await page.locator('.analysis-panel').evaluate(d=>d.open))await page.locator('.analysis-panel>summary').click();await amounts(4611,450,45);
 await page.locator('[data-region=vietnam]').click();await categories();await amounts(0,0,0,'VNĐ');await page.locator('[data-region=foreign]').click();await amounts(4611,450,45);
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.analysis-panel').screenshot({path:'/tmp/category-month-mobile.png'});await page.locator('[data-action=theme]').click();await page.locator('.analysis-panel').screenshot({path:'/tmp/category-month-mobile-dark.png'});await page.locator('[data-view=year]').click();await amounts(4811,450,168);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.analysis-panel').screenshot({path:'/tmp/category-year-mobile-dark.png'});
 // Revocation removes credit charts and credit payment amounts from both cash sources.
 admin=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await chart('card').waitFor({state:'detached'});await categories(['bank','cash']);await amounts(4011,370,null);assert.equal(writes,1);assert.deepEqual(errors,[]);
 console.log('PASS source/category charts: all categories/zeros, month/year/cutoff, confirmed snapshots, failed/held saves, reload, two regions/currencies, admin revocation, desktop/mobile light/dark; all APIs mocked');
}catch(error){console.error({errors,writes,charts:await page.locator('#dashboard-charts').innerText()});throw error;}finally{await browser.close();}
