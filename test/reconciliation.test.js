import test from 'node:test';import assert from 'node:assert/strict';
import {emptyData,normalizeData,monthSummary,expenseRows} from '../src/model.js';
import {accountBalances,moneyOut,reconcileMonth,monthEnd} from '../src/account-model.js';
import {cardCashflow} from '../src/card-model.js';
function fixture(){const d=emptyData();d.accounts={openedOn:'2026-01-01',bank:1000,cash:100,creditDebt:0,creditLimit:5000,transfers:[]};d.days['2026-01-31']={note:'Ghi chú cũ',items:[{id:'w',title:'ATM',movement:'withdraw',paymentMethod:'bank',status:'paid',amount:200},{id:'d',title:'Deposit',movement:'deposit',paymentMethod:'cash',status:'paid',amount:50},{id:'x',title:'Food',paymentMethod:'cash',status:'paid',amount:20}]};return d;}
test('withdrawals and deposits move both sources once while preserving assets and costs',()=>{
 const d=fixture();assert.deepEqual(accountBalances(d,'2026-01-31'),{bank:850,cash:230,creditDebt:0,available:5000});assert.equal(monthSummary(d,2026,0).expense,20);assert.equal(monthSummary(d,2026,0).count,1);assert.equal(moneyOut(d,'2026-01'),20);assert.equal(cardCashflow(d,'2026-01').direct,20);assert.deepEqual(normalizeData(d),d);
 d.days['2026-01-31'].items[0].status='planned';assert.equal(accountBalances(d,'2026-01-31').bank,1050);assert.equal(accountBalances(d,'2026-01-31').cash,30);assert.equal(monthSummary(d,2026,0).planned,0);
});
test('confirmed close preserves entries and notes, reports signed differences and carries actual balances',()=>{
 const d=fixture(),entries=structuredClone(d.days['2026-01-31'].items);const r=reconcileMonth(d,'2026-01-31',{bank:840,cash:250},{id:'r1',today:'2026-02-01',currency:'JPY'});
 assert.equal(r.deltaBank,-10);assert.equal(r.deltaCash,20);assert.equal(r.expectedBank,850);assert.equal(r.expectedCash,230);assert.equal(monthSummary(d,2026,0).expense,20);assert.deepEqual(d.days['2026-01-31'].items,entries);assert.match(d.days['2026-01-31'].note,/^Ghi chú cũ\n\[Đối chiếu/);assert.match(d.days['2026-01-31'].note,/Tổng chênh lệch 10/);
 assert.equal(accountBalances(d,'2026-01-30').bank,1000);assert.equal(accountBalances(d,'2026-02-01').bank,840);assert.equal(accountBalances(d,'2026-02-01').cash,250);
 d.days['2026-02-01']={note:'',items:[{id:'w2',title:'ATM2',amount:40,status:'paid',paymentMethod:'bank',movement:'withdraw'},{id:'f2',title:'Food2',amount:5,status:'paid',paymentMethod:'cash'}]};
 assert.equal(accountBalances(d,'2026-02-01').bank,800);assert.equal(accountBalances(d,'2026-02-01').cash,285);assert.equal(moneyOut(d,'2026-02'),5);assert.deepEqual(normalizeData(d),d);
});
test('reconfirmation appends history and uses latest actual snapshot, without accumulating corrections',()=>{
 const d=fixture();reconcileMonth(d,'2026-01-31',{bank:840,cash:250},{id:'one'});reconcileMonth(d,'2026-01-31',{bank:845,cash:240},{id:'two'});
 assert.equal(d.accounts.reconciliations.length,2);assert.equal(d.accounts.reconciliations[1].deltaBank,-5);assert.equal(d.accounts.reconciliations[1].deltaCash,10);assert.equal(accountBalances(d,'2026-02-01').bank,845);assert.equal(accountBalances(d,'2026-02-01').cash,240);
 d.days['2026-01-31'].items[2].amount=30;assert.equal(accountBalances(d,'2026-02-01').cash,240);assert.equal(monthSummary(d,2026,0).expense,30);assert.deepEqual(normalizeData(d),d);
});
test('month end handles leap years and year rollover, rejects future/invalid closes atomically',()=>{
 assert.equal(monthEnd('2028-02'),'2028-02-29');assert.equal(monthEnd('2026-02'),'2026-02-28');assert.equal(monthEnd('2026-12'),'2026-12-31');
 for(const [date,today]of[['2026-01-30','2026-02-01'],['2026-01-31','2026-01-15']]){const d=fixture(),before=structuredClone(d);assert.throws(()=>reconcileMonth(d,date,{bank:0,cash:0},{id:'r',today}));assert.deepEqual(d,before);}
 const d=fixture();reconcileMonth(d,'2026-12-31',{bank:500,cash:50},{id:'year'});assert.equal(accountBalances(d,'2027-01-01').bank,500);
 const bad=structuredClone(d);bad.accounts.reconciliations[0].deltaBank=999;assert.throws(()=>normalizeData(bad));
});
test('legacy transfer records show in expense search without duplicate balance changes',()=>{
 const d=fixture();d.accounts.transfers.push({id:'old',date:'2026-01-05',from:'bank',to:'cash',amount:10});assert.equal(expenseRows(d,2026,0,{query:'rút tiền'}).length,1);assert.equal(accountBalances(d,'2026-01-31').bank,840);assert.equal(accountBalances(d,'2026-01-31').cash,240);assert.equal(monthSummary(d,2026,0).expense,20);assert.deepEqual(normalizeData(d),d);
});
