import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeData,monthSummary,yearSummary,savingsToDate} from '../src/model.js';
import {newRegionalBook,readBook,writeBook} from '../src/region-model.js';
import {accountBalances,reconcileMonth,setSourceOpening,moneyOut} from '../src/account-model.js';
import {cashPeriodDetails} from '../src/cash-model.js';
import {sourceCategoryDetails} from '../src/stats-model.js';
import {normalizeSafety,budgetRows,forecast30} from '../src/safety-model.js';
import {reportSheets} from '../src/excel-report.js';
const base=()=>{const d=newRegionalBook('JP');d.currencies.savings='VND';d.savings={'2026-11':500000};d.goals={'2026':1000000};d.accounts={openedOn:'2026-11-01',bank:1000,cash:100,savings:200,creditDebt:0,creditLimit:null,transfers:[]};return d;};
const deposit=(amount=100,status='paid')=>({id:'save',title:'Save for a computer',movement:'save',category:'Chuyển tiền nội bộ',paymentMethod:'bank',amount,status});
const add=(d,row=deposit(),date='2026-11-05')=>{d.days[date]={note:'Keep note',items:[row]};return d;};
const period=d=>cashPeriodDetails(d,{year:2026,month:10,asOf:'2026-11-16',creditAllowed:true});
test('daily bank-to-savings transfer moves both sources once, stays outside spending/categories/budgets and retains history',()=>{
 const original=base(),d=normalizeData(add(base())),b=accountBalances(d,'2026-11-05'),p=period(d);
 assert.equal(b.bank,900);assert.equal(b.cash,100);assert.equal(b.savings,300);assert.equal(b.bank+b.cash+b.savings,1300);
 assert.equal(p.actualCashIn,0);assert.equal(p.actualCashOut,0);assert.equal(p.savingsDeposited,100);assert.equal(p.closingCash,1000);assert.equal(p.adjustment,0);assert.equal(moneyOut(d,'2026-11'),0);
 assert.equal(monthSummary(d,2026,10).expense,0);assert.equal(monthSummary(d,2026,10).count,0);assert.equal(yearSummary(d,2026).expense,0);assert(sourceCategoryDetails(d,{year:2026,month:10,asOf:'2026-11-16',creditAllowed:true}).every(g=>g.total===0));
 d.safety=normalizeSafety({budgets:[{month:'2026-11',category:'Chuyển tiền nội bộ',amount:500}]},d);assert.equal(budgetRows(d,'2026-11')[0].spent,0);
 assert.deepEqual(d.savings,original.savings);assert.deepEqual(d.goals,original.goals);assert.deepEqual(savingsToDate(d,'2026-11-16'),savingsToDate(original,'2026-11-16'));assert.equal(d.accounts.transfers.length,0);assert.equal(d.days['2026-11-05'].note,'Keep note');assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(d))),d);
});
test('planned/cancelled/draft transfers do not change balances; edits/deletion reverse both legs and legacy transfers count independently',()=>{
 for(const status of ['planned','cancelled','draft']){const d=normalizeData(add(base(),deposit(100,status)));assert.equal(accountBalances(d,'2026-11-05').bank,1000);assert.equal(accountBalances(d,'2026-11-05').savings,200);assert.equal(period(d).savingsDeposited,0);}
 let d=normalizeData(add(base(),deposit(50)));assert.equal(accountBalances(d,'2026-11-05').bank,950);assert.equal(accountBalances(d,'2026-11-05').savings,250);
 d.accounts.transfers.push({id:'legacy',date:'2026-11-05',from:'bank',to:'savings',amount:25});d=normalizeData(d);assert.equal(accountBalances(d,'2026-11-05').bank,925);assert.equal(accountBalances(d,'2026-11-05').savings,275);assert.equal(period(d).savingsDeposited,75);
 d.days['2026-11-05'].items=[];d=normalizeData(d);assert.equal(accountBalances(d,'2026-11-05').bank,975);assert.equal(accountBalances(d,'2026-11-05').savings,225);assert.equal(period(d).savingsDeposited,25);
});
test('missing sources, historical bank shortage, earmarked funds and deleting deposits needed for later withdrawals fail closed',()=>{
 const missing=add(base());delete missing.accounts.savings;assert.throws(()=>normalizeData(missing),/Chưa thiết lập/);
 assert.throws(()=>normalizeData(add(base(),deposit(1001))),/ngân hàng không đủ/);
 const later=add(base());later.days['2026-11-06']={note:'',items:[{id:'later',amount:950,status:'paid',paymentMethod:'bank'}]};later.incomes['2026-11']={salary:1000,bonus:0,receivedOn:'2026-11-07'};assert.throws(()=>normalizeData(later),/ngân hàng không đủ/);
 const funds=add(base());funds.safety=normalizeSafety({funds:[{id:'f',name:'Reserved',kind:'goal',source:'bank',target:950,entries:[{id:'a',date:'2026-11-01',direction:'allocate',amount:950,note:''}]}]},funds);assert.throws(()=>normalizeData(funds),/vượt số dư nguồn/);
 const needed=add(base());needed.receipts=[{id:'withdraw',date:'2026-11-06',type:'savings-withdrawal',source:'bank',amount:250,note:''}];normalizeData(needed);needed.days['2026-11-05'].items=[];assert.throws(()=>normalizeData(needed),/tiết kiệm không đủ/);
});
test('forced source/category and linked-row guards preserve credit and debt protections',()=>{
 const d=normalizeData(add(base(),{...deposit(),paymentMethod:'cash',category:'Ăn uống'}));assert.equal(d.days['2026-11-05'].items[0].paymentMethod,'bank');assert.equal(d.days['2026-11-05'].items[0].category,'Chuyển tiền nội bộ');
 for(const extra of [{fundId:'f'},{obligationId:'o'},{creditTracking:true},{paymentMethod:'card'},{debtId:'d',debtPaymentId:'p'},{cardPaymentMonth:'2026-11'},{cardFeeMonth:'2026-11'}])assert.throws(()=>normalizeData(add(base(),{...deposit(),...extra})));
});
test('separate reconciliation boundaries and planned forecast apply each bank/savings leg exactly once',()=>{
 const d=normalizeData(add(base()));reconcileMonth(d,'2026-11-06',{bank:800,cash:100},{id:'close',today:'2026-11-06',manual:true});const b=accountBalances(d,'2026-11-07');assert.equal(b.bank,800);assert.equal(b.savings,300);
 const moved=normalizeData(add(base()));setSourceOpening(moved,{id:'new-bank-opening',date:'2026-11-06',timing:'start',bank:800,cash:100,confirmedOn:'2026-11-06',note:'Bank-only baseline'},{today:'2026-11-06'});assert.equal(accountBalances(moved,'2026-11-07').bank,800);assert.equal(accountBalances(moved,'2026-11-07').savings,300);
 const plan=normalizeData(add(base(),deposit(100,'planned'),'2026-11-08'));const forecast=forecast30(plan,'2026-11-05'),day=forecast.days.find(d=>d.date==='2026-11-08');assert.equal(day.bank,900);assert.equal(day.savings,300);assert.equal(period(plan).actualCashOut,0);assert.equal(period(plan).savingsDeposited,0);
 const unknown=add(base(),deposit(100,'planned'),'2026-11-08');delete unknown.accounts.savings;const future=forecast30(normalizeData(unknown),'2026-11-05');assert.equal(future.unknown.length,1);assert.equal(future.days.find(d=>d.date==='2026-11-08').bank,1000);
});
test('regional edits and Excel keep transfer destination, source currency and original saved-month currency',()=>{
 const d=add(base());d.regional={vietnam:newRegionalBook('VN')};const other=readBook(d,'vietnam'),doc=normalizeData(writeBook(d,'foreign',readBook(d,'foreign')));assert.deepEqual(readBook(doc,'vietnam'),other);
 const sheets=reportSheets(doc,{asOf:'2026-11-16',creditAllowed:false}),transfers=sheets.find(s=>s.name==='Chuyển nguồn').rows;
 const row=transfers.find(r=>r[2]==='save');assert.equal(row[1],'JPY');assert.equal(row[4],'Ngân hàng');assert.equal(row[5],'Tiết kiệm');assert.equal(row[6],100);assert.equal(transfers.filter(r=>r[2]==='save').length,1);
});
