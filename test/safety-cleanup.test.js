import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanupFixture} from '../scripts/fixtures/safety-cleanup.mjs';
import {cleanupSafety,safetyCleanupPreview} from '../src/safety-cleanup.js';
import {normalizeData} from '../src/model.js';
import {readBook,writeBook,newRegionalBook} from '../src/region-model.js';
import {accountBalances} from '../src/account-model.js';
import {reservedBySource,upcomingObligations,forecast30} from '../src/safety-model.js';
import {creditSnapshot,financeView} from '../src/credit-access.js';
import {cashPeriodDetails} from '../src/cash-model.js';
import {validateMoneyChanges,validateSpendingSources,validateCreditEdits} from '../src/finance-validation.js';
const clean=(d,action,id='',extra={})=>cleanupSafety(d,{action,id,date:'2026-11-05',auditId:'audit',...extra});
const book=()=>readBook(cleanupFixture(),'foreign');
const snapshot=d=>JSON.parse(d.safety.cleanupHistory.at(-1).snapshot);
function unchangedCash(before,after){
 for(const date of ['2026-11-01','2026-11-02','2026-11-03','2026-11-05','2026-11-30'])assert.deepEqual(accountBalances(after,date),accountBalances(before,date));
 const details=d=>cashPeriodDetails(d,{start:'2026-11-01',end:'2026-11-30',asOf:'2026-11-30',creditAllowed:true}),a=details(before),b=details(after);
 for(const key of ['actualCashIn','actualCashOut','economicIncome','nonIncomeIn','openingCash','closingCash','cashChange','adjustment','sourceOut','directTotal','debtTotal','cardPaid','creditTotal'])assert.deepEqual(b[key],a[key]);
 const events=rows=>rows.map(({fundId,obligationId,...row})=>row);assert.deepEqual(events(b.events),events(a.events));
 for(const key of ['accounts','incomes','debts','savings','goals','receipts','receivables'])assert.deepEqual(after[key],before[key]);
 validateMoneyChanges(before,after);validateSpendingSources(before,after);validateCreditEdits(before,after);
 assert.equal(creditSnapshot(after),creditSnapshot(before));
 assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(after))),after);
}
test('safety reset removes only linked plans/configuration, keeps source balances and complete audit',()=>{
 const d=book(),before=structuredClone(d),n=clean(d,'reset');assert.deepEqual(d,before);
 assert.deepEqual(safetyCleanupPreview(d),{funds:2,budgets:2,planned:1,retained:1,debtTerms:1});
 assert.equal(n.safety.funds.length,0);assert.equal(n.safety.budgets.length,0);assert.equal(n.safety.obligations.length,0);assert.deepEqual(n.safety.debtTerms,[d.safety.debtTerms[1]]);
 assert.equal(n.safety.essentialMonthly,0);assert.equal(n.safety.reserveMonths,3);assert.equal(n.safety.monthlyDebtBudget,0);
 assert.deepEqual(n.days['2026-11-13'],{note:'Keep planned day note',items:[]});
 assert.deepEqual(n.days['2026-11-14'],d.days['2026-11-14']);
 assert.equal(n.days['2026-11-02'].items[0].amount,25.125);assert.equal(n.days['2026-11-02'].items[1].status,'paid');
 assert(!n.days['2026-11-02'].items[1].obligationId);assert(!n.days['2026-11-02'].items[1].fundId);
 const history=snapshot(n);assert.deepEqual(history.obligations,d.safety.obligations);assert.deepEqual(history.funds,d.safety.funds);assert.deepEqual(history.debtTerms,[d.safety.debtTerms[0]]);
 assert.deepEqual(history.items.find(x=>x.item.id==='paid-row').item,d.days['2026-11-02'].items[1]);
 assert.deepEqual(reservedBySource(n,'2026-11-05'),{bank:0,cash:0,savings:0});
 assert(!upcomingObligations(n,'2026-11-05').some(o=>o.obligationId==='bill'));assert(upcomingObligations(n,'2026-11-05').some(o=>o.debtId==='loan'));assert.equal(forecast30(n,'2026-11-05').firstShortage,null);
 unchangedCash(d,n);
});
test('manual obligation deletion preserves paid expense/history and optionally keeps an unpaid calendar plan',()=>{
 const d=book();for(const id of ['paid','bill']){
  const n=clean(d,'obligation',id);assert(!n.safety.obligations.some(o=>o.id===id));assert.deepEqual(snapshot(n).obligations,[d.safety.obligations.find(o=>o.id===id)]);unchangedCash(d,n);
 }
 const n=clean(d,'obligation','bill',{removePlanned:false});assert.equal(n.days['2026-11-13'].items.length,1);assert(!n.days['2026-11-13'].items[0].obligationId);assert.equal(forecast30(n,'2026-11-05').firstShortage,'2026-11-13');unchangedCash(d,n);
});
test('manual fund deletion frees earmarks without inventing transfers or losing linked expense history',()=>{
 const d=book(),n=clean(d,'fund','fund');assert.equal(n.safety.funds.length,1);assert.equal(reservedBySource(n,'2026-11-05').bank,0);assert.equal(reservedBySource(n,'2026-11-05').cash,20);
 assert.equal(n.days['2026-11-13'].items[0].obligationId,'bill');assert.equal(n.days['2026-11-02'].items[1].obligationId,'paid');assert.deepEqual(snapshot(n).funds,[d.safety.funds[0]]);unchangedCash(d,n);
});
test('manual plan and repayment-assumption deletions leave original loans, actual payments and day notes intact',()=>{
 const d=book(),n=clean(d,'planned',JSON.stringify(['2026-11-14','unlinked']));assert.deepEqual(n.days['2026-11-14'],{note:'Other calendar plan',items:[]});unchangedCash(d,n);
 const m=clean(d,'debtTerms','loan');assert.equal(m.safety.debtTerms.length,1);assert.equal(upcomingObligations(m,'2026-11-05').find(o=>o.debtId==='loan').amount,null);unchangedCash(d,m);
 assert.throws(()=>clean(d,'debtTerms','credit-loan'),/Không thể/);
 for(const [date,id] of [['2026-11-02','ordinary'],['2026-11-02','card'],['2026-11-13','bill-row']])assert.throws(()=>clean(d,'planned',JSON.stringify([date,id])),/Chỉ xóa/);
});
test('safety cleanup preserves inactive book and credit snapshot for ordinary owners in either region',()=>{
 const doc=cleanupFixture(),jp=readBook(doc,'foreign'),vn=readBook(doc,'vietnam');
 const n=normalizeData(writeBook(doc,'foreign',clean(jp,'reset')));assert.deepEqual(readBook(n,'vietnam'),vn);
 const m=normalizeData(writeBook(doc,'vietnam',clean(vn,'reset')));assert.deepEqual(readBook(m,'foreign'),jp);assert.equal(creditSnapshot(readBook(n,'foreign')),creditSnapshot(jp));
});
test('audit snapshots survive subsequent resets/backup without re-entering ledgers or accepting duplicate IDs',()=>{
 const d=book(),n=clean(d,'reset'),m=clean(n,'reset','',{auditId:'second'});assert.equal(m.safety.cleanupHistory.length,2);assert.deepEqual(m.safety.cleanupHistory[0],n.safety.cleanupHistory[0]);unchangedCash(d,m);
 assert.throws(()=>clean(n,'reset'),/Lịch sử xóa/);for(const snapshot of ['invalid','null','[]']){const b=structuredClone(n);b.safety.cleanupHistory[0].snapshot=snapshot;assert.throws(()=>normalizeData(b),/Lịch sử xóa/);}
});
test('standalone calendar plans can be removed without preexisting safety configuration',()=>{
 const d=newRegionalBook('VN');d.days['2026-11-05']={note:'Preserve',items:[{id:'plan',title:'New',amount:10,status:'planned',paymentMethod:'cash'}]};
 const n=clean(normalizeData(d),'planned',JSON.stringify(['2026-11-05','plan']));assert.deepEqual(n.days['2026-11-05'],{note:'Preserve',items:[]});assert.equal(n.safety.cleanupHistory.length,1);
});
test('removed legacy credit links retain admin-only audit visibility',()=>{
 const d=book();d.days['2026-11-02'].items[1].category='Thanh toán thẻ';const n=clean(d,'obligation','paid');
 assert.equal(n.safety.cleanupHistory[0].creditProtected,true);assert.equal(financeView(n,false).safety.cleanupHistory.length,0);assert.equal(financeView(n,true).safety.cleanupHistory.length,1);assert.deepEqual(normalizeData(n),n);
});
