import test from 'node:test';
import assert from 'node:assert/strict';
import {newRegionalBook,writeBook,readBook} from '../src/region-model.js';
import {normalizeData,dayTotal} from '../src/model.js';
import {projectedStatement} from '../src/card-model.js';
import {accountBalances} from '../src/account-model.js';
import {cashPeriodDetails} from '../src/cash-model.js';
import {trackingMonth,trackingBalances,saveTrackingMonth,saveTrackingBalances} from '../src/credit-tracking.js';
import {currentWallet,currentWalletContent} from '../src/current-wallet.js';
import {validateCreditEdits} from '../src/finance-validation.js';
import {financeView,creditSnapshot} from '../src/credit-access.js';
import {confirmedExpenses,expenseConfirmed} from '../src/expense-model.js';
const base=()=>{const d=newRegionalBook('JP');d.accounts={openedOn:'2026-09-01',bank:100000,cash:1000,savings:0,creditDebt:0,creditLimit:500000,transfers:[]};d.regional={vietnam:newRegionalBook('VN')};return d;};
const cash=d=>cashPeriodDetails(d,{year:2026,month:9,asOf:'2026-10-31',creditAllowed:true});
test('credit purchases are tracked by calendar date only, no cash debit and no mandatory bill metadata',()=>{
 const d=base();d.days['2026-10-26']={note:'Keep note',items:[{id:'buy',title:'Credit purchase',amount:10000,status:'paid',paymentMethod:'card',creditTracking:true},{id:'cash',title:'Cash',amount:5000,status:'paid',paymentMethod:'bank'}]};
 const normalized=normalizeData(d);assert.deepEqual(normalized,d);assert.equal(expenseConfirmed(confirmedExpenses(normalized),'foreign','2026-10-26',d.days['2026-10-26'].items[0]),true);
 const r=trackingMonth(d,'2026-10',{asOf:'2026-10-31'});assert.equal(r.purchaseTotal,10000);assert.equal(r.paymentTotal,0);assert.equal(projectedStatement(d,'2026-11').oneOff,0);assert.equal(cash(d).actualCashOut,5000);assert.equal(accountBalances(d,'2026-10-31').bank,95000);
 d.days['2026-11-01']={note:'',items:[{id:'next',title:'Next month',amount:999,status:'paid',paymentMethod:'card',creditTracking:true}]};assert.equal(trackingMonth(d,'2026-10',{asOf:'2026-11-30'}).purchaseTotal,10000);
});
test('daily bank expense category Thanh toán thẻ appears in payment month, is counted once, and can reference an earlier bill',()=>{
 const d=base();d.days['2026-10-27']={note:'Keep payment note',items:[{id:'payment',title:'Pay September bill',amount:31320,status:'paid',paymentMethod:'bank',category:'Thanh toán thẻ',creditPeriod:'2026-09'}]};
 assert.equal(cash(d).actualCashOut,31320);assert.equal(cash(d).cardPaid,31320);assert.equal(cash(d).directTotal,0);assert.equal(accountBalances(d,'2026-10-31').bank,68680);assert.equal(dayTotal(d.days['2026-10-27'],'paid'),0);
 const r=trackingMonth(d,'2026-10',{asOf:'2026-10-31'});assert.equal(r.paymentTotal,31320);assert.equal(r.payments[0].creditPeriod,'2026-09');assert.equal(trackingMonth(d,'2026-09',{asOf:'2026-10-31'}).paymentTotal,0);assert.deepEqual(normalizeData(d),d);
 const edited=structuredClone(d);edited.days['2026-10-27'].items[0].amount=30000;assert.equal(cash(edited).actualCashOut,30000);edited.days['2026-10-27'].items[0].status='cancelled';assert.equal(cash(edited).actualCashOut,0);assert.equal(trackingMonth(edited,'2026-10',{asOf:'2026-10-31'}).paymentTotal,0);
});
test('fees and monthly revolving amount are manual tracking fields, never a predicted payment or a cash expense',()=>{
 const d=base(),before=structuredClone(d),balances=accountBalances(d,'2026-10-31');saveTrackingMonth(d,{month:'2026-10',fees:3000,monthlyPrincipal:20000,note:'Manual figures'});const r=trackingMonth(d,'2026-10',{asOf:'2026-10-31'});assert.equal(r.fees,3000);assert.equal(r.monthlyPrincipal,20000);assert.equal(r.paymentTotal,0);assert.deepEqual(accountBalances(d,'2026-10-31'),balances);assert.equal(cash(d).actualCashOut,0);assert.deepEqual(d.days,before.days);assert.deepEqual(normalizeData(d),d);
 saveTrackingMonth(d,{month:'2026-11',fees:null,monthlyPrincipal:null,note:''});assert.equal(trackingMonth(d,'2026-11',{asOf:'2026-11-30'}).fees,null);assert.equal(trackingMonth(d,'2026-10',{asOf:'2026-10-31'}).fees,3000);
});
test('available and revolving balances are manual dated observations, not automatically changed by purchases or category payments',()=>{
 const d=base();saveTrackingBalances(d,{id:'observed',date:'2026-10-01',available:42153,ribo:245832});d.days['2026-10-27']={note:'',items:[{id:'purchase',title:'New purchase',amount:1000,status:'paid',paymentMethod:'card',creditTracking:true},{id:'pay',title:'Bill',amount:31320,status:'paid',paymentMethod:'bank',category:'Thanh toán thẻ'}]};
 const r=currentWallet(d,{asOf:'2026-10-31',creditAllowed:true});assert.equal(r.paypay,42153);assert.equal(r.credit.ribo,245832);assert.equal(r.bank,68680);assert.equal(trackingBalances(d,'2026-09-30').available,null);assert.deepEqual(normalizeData(d),d);
 const html=currentWalletContent(d,{asOf:'2026-10-31',creditAllowed:true,signedIn:true,creditExpanded:false});assert(!html.includes('current-credit'));assert(!html.includes('PayPay'));assert(!html.includes('245,832'));assert(!html.includes('data-current-balance="liability"'));assert(!html.includes('Tổng nghĩa vụ thẻ'));assert(!html.includes('Sao kê 2026-'));
});
test('role filtering, region isolation and editing safeguards cover category-based payments and tracking observations',()=>{
 const d=base();d.days['2026-10-27']={note:'',items:[{id:'pay',title:'PRIVATE PAYMENT',amount:31320,status:'paid',paymentMethod:'bank',category:'Thanh toán thẻ'}]};saveTrackingBalances(d,{id:'balance',date:'2026-10-01',available:40000,ribo:200000});const projected=financeView(d,false);assert.equal(projected.days['2026-10-27'].items.length,0);assert(!projected.cards);assert.equal(cashPeriodDetails(d,{year:2026,month:9,asOf:'2026-10-31',creditAllowed:false}).actualCashOut,0);assert(creditSnapshot(d).includes('PRIVATE PAYMENT'));
 const vn=structuredClone(d.regional.vietnam),combined=writeBook(d,'foreign',readBook(d,'foreign'));assert.deepEqual(combined.regional.vietnam,vn);
 const wrong=structuredClone(d);wrong.days['2026-10-27'].items[0].paymentMethod='card';assert.throws(()=>validateCreditEdits(d,wrong));
});

test('tracking-only documents remain nonempty and legacy financial links round-trip unchanged',async()=>{
 const {hasData}=await import('../src/sync.js');const {excelFixture}=await import('../scripts/fixtures/excel.mjs');
 for(const apply of [d=>saveTrackingMonth(d,{month:'2026-10',fees:0,monthlyPrincipal:null,note:''}),d=>saveTrackingBalances(d,{id:'only',date:'2026-10-01',ribo:0})]){const d=newRegionalBook('JP');apply(d);assert(hasData(d));}
 const d=excelFixture(),before=structuredClone(d);saveTrackingMonth(d,{month:'2026-10',fees:3000,monthlyPrincipal:20000,note:'Tracking only'});saveTrackingBalances(d,{id:'tracking',date:'2026-10-31',available:42153,ribo:245832});const next=normalizeData(d);assert.deepEqual(next.days,before.days);assert.deepEqual(next.accounts,before.accounts);assert.deepEqual(next.cards.statements,before.cards.statements);assert.deepEqual(next.regional,before.regional);
});

test('daily card payments consume their selected source and earmarked fund once, with historical insufficiency checks',async()=>{
 const {fundBalance}=await import('../src/safety-model.js');
 for(const source of ['bank','cash','savings']){
  const d=base();d.accounts.bank=100000;d.accounts.cash=100000;d.accounts.savings=100000;d.safety={funds:[{id:'reserve',name:'Card reserve',source,kind:'goal',target:100000,entries:[{id:'allocation',date:'2026-09-01',direction:'allocate',amount:60000,note:'Keep audit'}]}]};d.days['2026-10-27']={note:'Payment note',items:[{id:'fund-payment',title:'Pay bill',category:'Thanh toán thẻ',paymentMethod:source,status:'paid',fundId:'reserve',amount:31320}]};
  const next=normalizeData(d);assert.equal(accountBalances(next,'2026-10-31')[source],68680);assert.equal(fundBalance(next,'reserve','2026-10-31'),28680);assert.equal(cash(next).actualCashOut,source==='savings'?0:31320);assert.equal(trackingMonth(next,'2026-10',{asOf:'2026-10-31'}).paymentTotal,31320);next.days['2026-10-27'].items[0].amount=60001;assert.throws(()=>normalizeData(next),/Quỹ không đủ/);
 }
});
