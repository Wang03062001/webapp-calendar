import test from 'node:test';
import assert from 'node:assert/strict';
import {newRegionalBook} from '../src/region-model.js';
import {normalizeData} from '../src/model.js';
import {saveStatement,settleStatement,undoSettlement} from '../src/card-model.js';
import {recordCardPayment,voidCardPayment,recordCardAdjustment,voidCardAdjustment,statementProgress} from '../src/card-ledger.js';
import {accountBalances,moneyOut} from '../src/account-model.js';
import {cashPeriodDetails,cashDayDetails} from '../src/cash-model.js';
import {sumMoney} from '../src/money.js';
import {salaryDate,plannedSalaryCycle,tokyoToday} from '../src/finance-date.js';
const base=()=>{const d=newRegionalBook('JP');d.accounts={openedOn:'2026-10-01',bank:100000,cash:20000,savings:0,creditDebt:100000,creditLimit:500000,transfers:[]};return d;};
const read=(d,m)=>cashPeriodDetails(d,{year:2026,month:m-1,asOf:'2026-12-31',creditAllowed:true});
function bill(d){saveStatement(d,{month:'2026-11',priorBalance:100000,newRibo:0,principal:20000,fees:3000,oneOff:10000,dueDate:'2026-11-27',confirmedOn:'2026-11-20',status:'confirmed',note:'Synthetic statement'});}
const purchase=(d)=>{d.days['2026-10-26']={note:'Keep note',items:[{id:'cash',title:'Cash purchase',amount:5000,paymentMethod:'cash',status:'paid'},{id:'card',title:'Card purchase',amount:10000,paymentMethod:'card',status:'paid',settlement:'oneoff',billingMonth:'2026-11'}]};};
test('A/B: credit purchase stays in history, confirmation creates no cash expense, actual bill paid once',()=>{
 const d=base();purchase(d);assert.equal(cashDayDetails(d,'2026-10-26',{asOf:'2026-12-31',creditAllowed:true}).actualCashOut,5000);assert.equal(read(d,10).creditTotal,10000);assert.equal(accountBalances(d,'2026-10-26').bank,100000);assert.equal(accountBalances(d,'2026-10-26').cash,15000);
 bill(d);assert.equal(read(d,11).actualCashOut,0);assert.equal(accountBalances(d,'2026-11-20').bank,100000);
 recordCardPayment(d,'2026-11',{id:'bill-pay',date:'2026-11-27',source:'bank',amount:33000});assert.equal(accountBalances(d,'2026-11-27').bank,67000);assert.equal(accountBalances(d,'2026-11-27').creditDebt,80000);assert.equal(read(d,11).actualCashOut,33000);assert.equal(read(d,10).actualCashOut,5000);assert.equal(d.cards.statements[0].status,'paid');assert.equal(statementProgress(d.cards.statements[0]).paidParts.principal,20000);
 assert.equal(moneyOut(d,'2026-11'),33000);assert.deepEqual(normalizeData(d),d);const before=structuredClone(d);assert.throws(()=>recordCardPayment(d,'2026-11',{id:'bill-pay',date:'2026-11-27',source:'bank',amount:33000}));assert.deepEqual(d,before);
});
test('C/D: internal transfers never change assets or cash-in/out; salary follows actual receipt date',()=>{
 const d=base();d.accounts.bank=100000;d.accounts.cash=0;d.incomes['2026-10']={salary:200000,bonus:0,receivedOn:'2026-10-15'};d.days['2026-10-26']={note:'',items:[{id:'cash',title:'Direct',amount:50000,status:'paid',paymentMethod:'bank'},{id:'credit',title:'Credit',amount:30000,status:'paid',paymentMethod:'card'},{id:'move',title:'Withdrawal',amount:20000,status:'paid',paymentMethod:'bank',movement:'withdraw'}]};
 const m=read(d,10);assert.equal(m.openingCash,100000);assert.equal(m.actualCashIn,200000);assert.equal(m.actualCashOut,50000);assert.equal(m.closingCash,250000);assert.equal(m.cashChange,150000);assert.equal(m.adjustment,0);assert.equal(m.creditTotal,30000);assert.equal(m.usageRatio,16.67);assert.equal(accountBalances(d,'2026-10-14').bank,100000);
});
test('E: partial and multiple/late payments preserve component allocations, source debits, history and undo',()=>{
 const d=base();purchase(d);bill(d);recordCardPayment(d,'2026-11',{id:'partial',date:'2026-11-25',source:'bank',amount:15000});assert.equal(d.cards.statements[0].status,'partial');assert.equal(statementProgress(d.cards.statements[0]).remaining,18000);assert.equal(accountBalances(d,'2026-11-25').bank,85000);assert.equal(read(d,11).actualCashOut,15000);
 recordCardPayment(d,'2026-11',{id:'rest',date:'2026-12-01',source:'bank',amount:18000});assert.equal(read(d,12).actualCashOut,18000);assert.equal(d.cards.statements[0].status,'paid');assert.equal(accountBalances(d,'2026-11-27').creditDebt,98000);assert.equal(accountBalances(d,'2026-12-01').creditDebt,80000);
 voidCardPayment(d,'2026-11','partial');assert.equal(d.cards.statements[0].status,'partial');assert.equal(read(d,11).actualCashOut,0);assert(d.cards.statements[0].payments[0].voided);assert.equal(statementProgress(d.cards.statements[0]).remaining,15000);assert.deepEqual(normalizeData(d),d);
});
test('bank link is adopted instead of creating duplicate outflow; repeated reference rejects and undo restores original',()=>{
 const d=base();bill(d);const row={id:'bank-import',title:'Imported bank transfer',amount:15000,paymentMethod:'bank',status:'paid',category:'Khác'};d.days['2026-11-25']={note:'Keep bank note',items:[structuredClone(row)]};
 recordCardPayment(d,'2026-11',{id:'linked',date:'2026-11-25',source:'bank',amount:15000,bankExpenseId:'bank-import',reference:'BANK-001'});assert.equal(read(d,11).actualCashOut,15000);assert.equal(d.days['2026-11-25'].items.length,1);assert.throws(()=>recordCardPayment(d,'2026-11',{id:'duplicate',date:'2026-11-25',source:'bank',amount:1000,reference:'BANK-001'}));voidCardPayment(d,'2026-11','linked');assert.deepEqual(d.days['2026-11-25'].items,[row]);assert.equal(read(d,11).actualCashOut,15000);
});
test('refund to card changes credit only, bank refund changes cash only; bill credit and void retain audit',()=>{
 const unbilled=base();purchase(unbilled);recordCardAdjustment(unbilled,{id:'unbilled-refund',date:'2026-10-28',type:'card-refund',amount:1000,purchaseId:'card',purchaseDate:'2026-10-26'});assert.equal(accountBalances(unbilled,'2026-10-28').bank,100000);assert.equal(accountBalances(unbilled,'2026-10-28').creditDebt,109000);
 const d=base();purchase(d);bill(d);recordCardAdjustment(d,{id:'refund-card',date:'2026-11-21',type:'card-refund',amount:2000,purchaseId:'card',purchaseDate:'2026-10-26',month:'2026-11',component:'oneOff'});assert.equal(accountBalances(d,'2026-11-21').bank,100000);assert.equal(accountBalances(d,'2026-11-21').creditDebt,111000);assert.equal(statementProgress(d.cards.statements[0]).remaining,31000);assert.equal(read(d,11).actualCashOut,0);
 recordCardAdjustment(d,{id:'refund-bank',date:'2026-11-22',type:'bank-refund',source:'bank',amount:1000,purchaseId:'card',purchaseDate:'2026-10-26'});assert.equal(accountBalances(d,'2026-11-22').bank,101000);assert.equal(read(d,11).actualCashIn,1000);assert.equal(read(d,11).economicIncome,0);
 voidCardAdjustment(d,'refund-card');assert.equal(statementProgress(d.cards.statements[0]).remaining,33000);assert.equal(accountBalances(d,'2026-11-22').creditDebt,113000);assert.deepEqual(normalizeData(d),d);
});
test('F: weekend proposal is Nov 13, ending prior cycle Nov 12; unknown holidays never become verified actual income',()=>{
 assert.deepEqual(salaryDate('2026-11'),{date:'2026-11-13',verified:false,manual:false});assert.equal(plannedSalaryCycle('2026-10').end,'2026-11-12');assert.equal(salaryDate('2026-11',{holidays:['2026-11-13']}).date,'2026-11-12');assert.equal(tokyoToday(new Date('2026-11-03T16:00:00Z')),'2026-11-04');
});
test('G: legacy full payments round trip without migration duplication; malformed new links fail closed',()=>{
 const d=base();purchase(d);bill(d);settleStatement(d,'2026-11','2026-11-27');const before=structuredClone(d);assert.deepEqual(normalizeData(d),before);assert.equal(read(normalizeData(d),11).actualCashOut,33000);undoSettlement(d,'2026-11');assert.equal(read(d,11).actualCashOut,0);
 recordCardPayment(d,'2026-11',{id:'new-pay',date:'2026-11-27',amount:15000,source:'bank'});const corrupt=structuredClone(d);corrupt.days['2026-11-27'].items[0].cardPaymentId='wrong';assert.throws(()=>normalizeData(corrupt));assert.equal(sumMoney([0.1,0.2,0.005]),0.305);assert.equal(sumMoney(Array(12).fill(1000000000000)),12000000000000);
});

test('cash usage is N/A for nonpositive funds; reconciliation delta is separate from genuine flows',()=>{
 const d=base();d.accounts.bank=0;d.accounts.cash=0;d.days['2026-10-05']={note:'',items:[{id:'overdraft',title:'Direct',amount:10,status:'paid',paymentMethod:'bank'}]};let m=read(d,10);assert.equal(m.actualCashOut,10);assert.equal(m.usageRatio,null);assert.equal(m.cashChange,-10);
 d.accounts.bank=100;d.accounts.reconciliations=[{id:'close',date:'2026-10-31',bank:95,cash:0,expectedBank:90,expectedCash:0,deltaBank:5,deltaCash:0,note:'Actual balance check'}];m=read(d,10);assert.equal(m.actualCashIn,0);assert.equal(m.actualCashOut,10);assert.equal(m.adjustment,5);assert.equal(m.closingCash,95);
});
test('cancel, edit and reassign an unbilled purchase change credit only; new JPY/VND amounts must be whole',async()=>{
 const {validateMoneyChanges,validateCreditEdits}=await import('../src/finance-validation.js');
 const d=base();purchase(d);const cancelled=structuredClone(d);cancelled.days['2026-10-26'].items[1].status='cancelled';assert.equal(read(cancelled,10).creditTotal,0);assert.equal(read(cancelled,10).actualCashOut,5000);assert.equal(accountBalances(cancelled,'2026-10-26').creditDebt,100000);validateCreditEdits(d,cancelled);assert.deepEqual(normalizeData(cancelled),cancelled);
 const fractional=structuredClone(d);fractional.days['2026-10-26'].items[0].amount=0.1;assert.throws(()=>validateMoneyChanges(d,fractional));d.days['2026-10-26'].items[0].amount=0.125;const legacy=structuredClone(d);legacy.days['2026-10-26'].items[0].title='Title only';validateMoneyChanges(d,legacy);assert.equal(normalizeData(legacy).days['2026-10-26'].items[0].amount,0.125);
 bill(d);const bad=structuredClone(d);bad.days['2026-10-26'].items[1].billingMonth='2026-12';assert.throws(()=>validateCreditEdits(d,bad));
});
test('refund/link imports fail closed; legacy numeric fractions remain exact and imported overflow never clamps silently',()=>{
 const d=base();purchase(d);bill(d);recordCardAdjustment(d,{id:'refund',type:'card-refund',date:'2026-11-21',amount:1000,purchaseDate:'2026-10-26',purchaseId:'card',month:'2026-11'});
 const corrupt=structuredClone(d);corrupt.cards.adjustments[0].amount=11000;assert.throws(()=>normalizeData(corrupt));const missing=structuredClone(d);missing.cards.adjustments=[];assert.throws(()=>normalizeData(missing));
 const overflow=structuredClone(d);overflow.days['2026-10-26'].items[0].amount=1e15;assert.throws(()=>normalizeData(overflow));const ids=structuredClone(d);ids.days['2026-10-26'].items.push({...ids.days['2026-10-26'].items[0]});assert.throws(()=>normalizeData(ids));
});
test('savings/fund validation is atomic for partial payments; paid legacy fractions can be settled without rounding',async()=>{
 const {validateMoneyChanges}=await import('../src/finance-validation.js');const d=base();bill(d);const before=structuredClone(d);assert.throws(()=>recordCardPayment(d,'2026-11',{id:'bad-source',date:'2026-11-27',source:'savings',amount:1000}));assert.deepEqual(d,before);
 const legacy=base();saveStatement(legacy,{month:'2026-11',priorBalance:0,newRibo:0,principal:0,fees:0.125,oneOff:10,dueDate:'2026-11-27',confirmedOn:'2026-11-20',status:'confirmed',note:''});const next=structuredClone(legacy);recordCardPayment(next,'2026-11',{id:'legacy-exact',date:'2026-11-27',source:'bank',amount:10.125});validateMoneyChanges(legacy,next);assert.equal(read(next,11).actualCashOut,10.125);
});

test('actual reporting snapshot advances only with the acknowledged revision, retaining later drafts and failed saves',async()=>{
 const {SyncController}=await import('../src/sync.js');const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};let release,fail=false,server=base(),revision=1;
 const client={url:'https://mock.example.test',user:async()=>({id:'cash-snapshot'}),load:async()=>({data:server,revision}),save:async data=>{await new Promise(r=>release=r);if(fail)throw Error('Mock network failure');server=structuredClone(data);return {revision:++revision};},signOut:async()=>{}};
 const controller=new SyncController(client,storage,{onData:()=>{},onStatus:()=>{}});await controller.open();const draft=structuredClone(controller.data);purchase(draft);controller.save(draft);assert.equal(read(controller.confirmedData,10).actualCashOut,0);const pending=controller.commit();const later=structuredClone(draft);later.days['2026-10-27']={note:'Later draft',items:[{id:'later',title:'Later',amount:100,status:'paid',paymentMethod:'cash'}]};controller.save(later);release();await pending;assert.equal(read(controller.confirmedData,10).actualCashOut,5000);assert.equal(read(controller.data,10).actualCashOut,5100);assert(controller.dirty);
 fail=true;const bad=controller.commit();release();await bad;assert.equal(read(controller.confirmedData,10).actualCashOut,5000);assert.equal(read(controller.data,10).actualCashOut,5100);assert.equal(controller.status,'error');await controller.logout();assert.equal(controller.confirmedData,null);
});

test('planned income and unconfirmed bills never turn into cash merely because the date passes',async()=>{
 const {validateActualDates}=await import('../src/finance-validation.js');const d=base();d.incomes['2026-10']={salary:200000,bonus:0,status:'planned',receivedOn:'2026-10-15'};bill(d);
 assert.equal(read(d,10).actualCashIn,0);assert.equal(read(d,11).actualCashOut,0);assert.equal(accountBalances(d,'2026-12-31').bank,100000);assert.equal(read(d,11).cardPaid,0);
 const next=structuredClone(d);next.incomes['2026-11']={salary:190000,bonus:0,status:'planned',receivedOn:'2026-11-15'};validateActualDates(d,next,'2026-11-04');next.incomes['2026-11'].status='received';assert.throws(()=>validateActualDates(d,next,'2026-11-04'));validateActualDates(d,next,'2026-11-15');assert.equal(read(next,11).actualCashIn,190000);
 const future=cashPeriodDetails(d,{year:2027,month:0,asOf:'2026-11-04',creditAllowed:true});assert.equal(future.closingCash,null);assert.equal(future.availableFunds,null);assert.equal(future.usageRatio,null);
});
