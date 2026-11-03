import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,monthSummary,expenseRows,normalizeData} from '../src/model.js';
import {accountBalances,moneyOut,reconcileMonth} from '../src/account-model.js';
import {saveStatement,settleStatement} from '../src/card-model.js';
import {financeView,creditSnapshot} from '../src/credit-access.js';
const fixture=()=>{
 const d=emptyData();d.accounts={openedOn:'2026-01-01',bank:1000,cash:100,creditDebt:100,creditLimit:5000,transfers:[]};
 d.days['2026-01-15']={note:'Keep',items:[{id:'bank',amount:10,paymentMethod:'bank',status:'paid'},{id:'cash',amount:20,paymentMethod:'cash',status:'paid'},{id:'card',amount:200,paymentMethod:'card',status:'paid'}]};
 saveStatement(d,{month:'2026-01',priorBalance:100,newRibo:0,principal:100,fees:15,oneOff:200,dueDate:'2026-01-15',confirmedOn:'2026-01-15',status:'confirmed',note:''});settleStatement(d,'2026-01','2026-01-15');return d;
};
test('only literal verified admin gets the full credit view; ordinary calculations exclude all credit rows',()=>{
 const d=fixture(),before=structuredClone(d);assert.equal(financeView(d,true),d);
 for(const allowed of [false,null,undefined,'true',1]){
  const v=financeView(d,allowed);assert.equal(v.cards,undefined);assert.equal(monthSummary(v,2026,0).expense,30);assert.equal(moneyOut(v,'2026-01'),30);
  assert.equal(expenseRows(v,2026,0).length,2);assert.deepEqual(accountBalances(v,'2026-01-15'),{bank:990,cash:80,creditDebt:0,available:null});
 }
 assert.equal(monthSummary(d,2026,0).expense,230);assert.equal(moneyOut(d,'2026-01'),345);assert.deepEqual(d,before);
});
test('ordinary reconciliation uses ordinary calculations while preserving hidden credit data',()=>{
 const d=fixture(),credit=creditSnapshot(d);reconcileMonth(d,'2026-01-30',{bank:980,cash:80},{id:'r',manual:true,today:'2026-02-01',creditAllowed:false});
 assert.equal(d.accounts.reconciliations[0].expectedBank,990);assert.equal(d.accounts.reconciliations[0].deltaBank,-10);assert.equal(creditSnapshot(d),credit);assert.deepEqual(normalizeData(d),normalizeData(JSON.parse(JSON.stringify(d))));
});
test('legacy credit-type loans and linked expenses stay hidden without altering ordinary loans',()=>{
 const d=fixture();d.debts=[{id:'credit',type:'Thẻ tín dụng',amount:50},{id:'loan',type:'Khác',amount:60}];d.days['2026-01-15'].items.push({id:'repay',debtId:'credit',amount:5,paymentMethod:'bank'});
 const v=financeView(d,false);assert.equal(v.debts.length,1);assert.equal(v.debts[0].id,'loan');assert.equal(monthSummary(v,2026,0).expense,30);assert.equal(d.debts.length,2);
});
