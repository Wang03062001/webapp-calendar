import test from 'node:test';
import assert from 'node:assert/strict';
import {resetFinancialDocument} from '../src/reset-model.js';
import {normalizeData,monthSummary} from '../src/model.js';
import {SyncController} from '../src/sync.js';
import {accountBalances} from '../src/account-model.js';
import {cashPeriodDetails} from '../src/cash-model.js';
import {reportSheets} from '../src/excel-report.js';
import {excelFixture} from '../scripts/fixtures/excel.mjs';
const reset=()=>resetFinancialDocument(excelFixture(),'2026-11-01','2026-11-05');
function setup(){
 const map=new Map([['another-account','keep']]);const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 let revision=4,remote=excelFixture(),fail=false,hold=null,calls=[];
 const client={url:'https://reset.example.test',user:async()=>({id:'owner'}),load:async()=>({data:remote,revision}),save:async(next,expected)=>{calls.push(structuredClone(next));if(hold)await hold;if(fail)throw Object.assign(Error('Synthetic failure'),{code:fail});assert.equal(expected,revision);remote=structuredClone(next);return {revision:++revision};}};
 const sync=new SyncController(client,storage,{onData:()=>{},onStatus:()=>{}});
 return {sync,map,client,calls,remote:()=>remote,fail:v=>fail=v,hold:v=>hold=v};
}
test('explicit reset clears all financial years/history and both books, retains currency/country and invents no money',()=>{
 const before=excelFixture(),snapshot=structuredClone(before),next=resetFinancialDocument(before,'2026-11-01','2026-11-05');
 for(const book of [next,next.regional.vietnam]){assert.equal(book.trackingStart,'2026-11-01');for(const key of ['days','incomes','savings','goals'])assert.deepEqual(book[key],{});assert.deepEqual(book.debts,[]);for(const key of ['accounts','cards','safety','receipts','receivables'])assert.equal(book[key],undefined);assert.equal(accountBalances(book,'2026-11-05'),null);assert.equal(book.bookSettings.modules.cards,false);}
 assert.deepEqual(next.currencies,before.currencies);assert.deepEqual(next.regional.vietnam.currencies,before.regional.vietnam.currencies);assert.deepEqual(before,snapshot);assert.deepEqual(normalizeData(next),next);
 assert.throws(()=>resetFinancialDocument(before,'2026-11-06','2026-11-05'));assert.throws(()=>resetFinancialDocument(before,'2026-11-31','2026-12-01'));
 const custom=structuredClone(before);delete custom.bookSettings;custom.currencies={cash:'USD',savings:'EUR'};assert.deepEqual(resetFinancialDocument(custom).currencies,custom.currencies);
});
test('opening assets are stock, income is dated, credit purchases are separate from month expense and cash source balance',()=>{
 const d=reset();d.accounts={openedOn:'2026-11-01',bank:90000,cash:10000,savings:5000,creditDebt:0,creditLimit:null,transfers:[]};d.days['2026-11-02']={note:'Keep new note',items:[{id:'credit',title:'Credit purchase',amount:3000,paymentMethod:'card',creditTracking:true,status:'paid'},{id:'bank',title:'Cash spending',amount:2000,paymentMethod:'bank',status:'paid'}]};d.incomes['2026-11']={salary:190000,bonus:0,receivedOn:'2026-11-15'};
 const n=normalizeData(d),r=cashPeriodDetails(n,{year:2026,month:10,asOf:'2026-11-05',creditAllowed:true});assert.equal(r.openingCash,105000);assert.equal(r.actualCashIn,0);assert.equal(r.actualCashOut,2000);assert.equal(r.creditTotal,3000);assert.equal(accountBalances(n,'2026-11-05').creditDebt,0);assert.equal(r.closingCash,103000);assert.equal(monthSummary(n,2026,10).expense,2000);assert.equal(accountBalances(n,'2026-11-15').bank,278000);
 const sheets=reportSheets(n,{asOf:'2026-11-05',creditAllowed:true});assert(sheets.some(s=>s.name==='Giao dịch tín dụng'));assert(!sheets.some(s=>/Sao kê|hạn mức|リボ|Theo dõi tín dụng/.test(s.name)));assert(!reportSheets(n,{asOf:'2026-11-05',creditAllowed:false}).some(s=>s.name==='Giao dịch tín dụng'));assert(!JSON.stringify(sheets).includes('PayPay'));
});
test('new tracking boundary rejects earlier money records, leaves earned salary month independent, disallows PayPay metadata returning',()=>{
 for(const add of [d=>d.days['2026-10-31']={note:'Old note',items:[]},d=>d.accounts={openedOn:'2026-10-31',bank:0,cash:0,creditDebt:0,creditLimit:null,transfers:[]},d=>d.incomes['2026-10']={salary:100,bonus:0},d=>d.savings['2026-10']=100]){const d=reset();add(d);assert.throws(()=>normalizeData(d),/trước ngày bắt đầu/);}
 const d=reset();d.incomes['2026-11']={salary:190000,bonus:0,receivedOn:'2026-11-15',earnedMonth:'2026-10'};assert.equal(normalizeData(d).incomes['2026-11'].earnedMonth,'2026-10');d.cards={name:'PayPay',paymentDay:27,weekend:'none',statements:[]};assert.throws(()=>normalizeData(d),/không lưu dữ liệu PayPay/);
});
test('reset writes exactly once without flushing old drafts, retains all data until ACK, then clears only current account drafts',async()=>{
 const h=setup();await h.sync.open();const draft=structuredClone(h.sync.data);draft.days['2026-11-02']={note:'Unsent',items:[]};h.sync.save(draft);h.sync.expenseInputs={old:{amount:{value:'.'}}};h.sync.cache();const oldCache=h.map.get(h.sync.cacheKey);let release;h.hold(new Promise(r=>release=r));const promise=h.sync.resetConfirmed(reset());await new Promise(r=>setImmediate(r));assert.equal(h.calls.length,1);assert(h.sync.resetting);assert.equal(h.map.get(h.sync.cacheKey),oldCache);assert.deepEqual(h.sync.data,draft);assert.throws(()=>h.sync.save(draft),/Đang đặt lại/);await assert.rejects(h.sync.commit(),/Đang đặt lại/);release();await promise;assert.deepEqual(h.sync.data,reset());assert.deepEqual(h.sync.expenseInputs,{});assert.equal(h.sync.queued,null);assert.equal(h.sync.dirty,false);assert.equal(h.map.get('another-account'),'keep');assert.deepEqual(JSON.parse(h.map.get(h.sync.cacheKey)).expenseInputs,{});await h.sync.open();assert.deepEqual(h.sync.data,reset());assert.equal(h.calls.length,1);
});
test('network/conflict reset failures preserve full owner data, local drafts, raw input, confirmed snapshot and revision',async()=>{
 for(const code of ['NETWORK','40001']){const h=setup();await h.sync.open();const draft=structuredClone(h.sync.data);draft.days['2026-11-02']={note:'Keep draft',items:[]};h.sync.save(draft);h.sync.expenseInputs={raw:{title:'Keep raw'}};h.sync.cache();const cached=h.map.get(h.sync.cacheKey),confirmed=structuredClone(h.sync.confirmedData),remote=h.remote();h.fail(code);await assert.rejects(h.sync.resetConfirmed(reset()));assert.equal(h.map.get(h.sync.cacheKey),cached);assert.deepEqual(h.sync.data,draft);assert.deepEqual(h.sync.confirmedData,confirmed);assert.deepEqual(h.remote(),remote);assert.equal(h.sync.revision,4);assert.equal(h.sync.resetting,false);assert.equal(h.sync.status,code==='40001'?'conflict':'error');}
});
test('reset rechecks server identity and refuses an active save before any deletion',async()=>{
 const h=setup();await h.sync.open();h.client.user=async()=>({id:'other'});await assert.rejects(h.sync.resetConfirmed(reset()),/Phiên đăng nhập/);assert.equal(h.calls.length,0);h.sync.inFlight=Promise.resolve();await assert.rejects(h.sync.resetConfirmed(reset()));assert.equal(h.calls.length,0);
});
