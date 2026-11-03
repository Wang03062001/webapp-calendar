import test from 'node:test';
import assert from 'node:assert/strict';
import {currentWallet,currentWalletContent,localToday} from '../src/current-wallet.js';
import {newRegionalBook} from '../src/region-model.js';
import {normalizeData,monthSummary} from '../src/model.js';
import {setSourceOpening} from '../src/account-model.js';
import {saveStatement,settleStatement,setAvailableCredit} from '../src/card-model.js';
const fixture=()=>{
 const d=newRegionalBook('JP');d.currencies.savings='VND';d.accounts={openedOn:'2026-10-01',bank:1000,cash:100,savings:200,creditDebt:200,creditLimit:5000,transfers:[]};
 d.incomes['2026-10']={salary:200,bonus:10,account:'bank',receivedOn:'2026-10-15',earnedMonth:'2026-09',note:'Keep salary note'};
 d.incomes['2026-11']={salary:300,bonus:5,account:'bank',note:'Default 15th'};
 d.days['2026-10-20']={note:'Old note',items:[{id:'oct-bank',title:'Old bank cost',amount:50,status:'paid',paymentMethod:'bank'},{id:'oct-cash',title:'Old cash cost',amount:10,status:'paid',paymentMethod:'cash'}]};
 d.days['2026-11-03']={note:'Keep note',items:[{id:'bank',title:'Bank cost',amount:20,status:'paid',paymentMethod:'bank'},{id:'cash',title:'Cash cost',amount:5,status:'paid',paymentMethod:'cash'},{id:'move',title:'Internal withdrawal',amount:10,status:'paid',paymentMethod:'bank',movement:'withdraw'},{id:'planned',title:'Planned cost',amount:999,status:'planned',paymentMethod:'bank'}]};
 d.receipts=[{id:'gift',date:'2026-11-01',amount:25,type:'gift',source:'cash',note:'Gift'}];d.savings['2026-11']=1000000;d.goals['2026']=5000000;
 return normalizeData(d);
};
const read=(data,date)=>currentWallet(data,{asOf:date,creditAllowed:true});

test('salary/bonus enter assets exactly on the 15th, carry across months, and are never added twice',()=>{
 const d=fixture(),before=structuredClone(d),early=read(d,'2026-11-14'),payday=read(d,'2026-11-15'),after=read(d,'2026-11-16');
 assert.equal(early.bank,1130);assert.equal(early.cash,120);assert.equal(early.assets,1450);assert.equal(early.pendingIncome[0].date,'2026-11-15');
 assert.equal(payday.bank,1435);assert.equal(payday.assets,1755);assert.equal(payday.pendingIncome.length,0);assert.equal(after.assets,1755);assert.deepEqual(read(d,'2026-11-15'),payday);assert.deepEqual(d,before);
 assert.equal(read(d,'2026-12-01').assets,1755);assert.equal(read(d,'2026-12-15').assets,1755); // no unentered recurring salary
});

test('income follows explicit received date and bank/cash/savings source, increasing assets once',()=>{
 for(const source of ['bank','cash','savings']){
  const d=fixture();d.incomes['2026-11'].account=source;d.incomes['2026-11'].receivedOn='2026-11-17';
  const before=read(d,'2026-11-16'),after=read(d,'2026-11-17');assert.equal(after.assets-before.assets,305);assert.equal(after[source]-before[source],305);
 }
});

test('monthly deficit before payday does not reset or replace carried source assets',()=>{
 const d=fixture();delete d.incomes['2026-11'];delete d.receipts;
 assert.equal(monthSummary(d,2026,10).balance,-25);assert.equal(read(d,'2026-11-04').assets,1425);
 d.incomes['2026-11']={salary:305,bonus:0,note:''};assert.equal(read(d,'2026-11-04').assets,1425);assert.equal(read(d,'2026-11-15').assets,1730);
});

test('opening close already includes older salaries; only later paydays enter sources',()=>{
 const d=fixture();setSourceOpening(d,{id:'close',date:'2026-10-31',timing:'end',bank:1100,cash:90,savings:200,confirmedOn:'2026-11-04',note:'Carryover'},{today:'2026-11-04'});
 assert.equal(read(d,'2026-11-14').assets,1390);assert.equal(read(d,'2026-11-15').assets,1695);assert.equal(d.incomes['2026-10'].salary,200);
});

test('card purchases do not debit bank; actual statement pays once and available PayPay remains separate',()=>{
 const d=fixture();d.days['2026-11-05']={note:'',items:[{id:'card',title:'PRIVATE CARD',amount:20,status:'paid',paymentMethod:'card',settlement:'oneoff',billingMonth:'2026-12'}]};
 saveStatement(d,{month:'2026-10',priorBalance:200,newRibo:0,principal:10,fees:2,oneOff:50,dueDate:'2026-11-04',confirmedOn:'2026-10-25',status:'confirmed',note:'PRIVATE STATEMENT'});settleStatement(d,'2026-10','2026-11-04','bank');
 const result=read(d,'2026-11-06');assert.equal(result.bank,1068);assert.equal(result.assets,1388);assert.equal(result.creditDebt,160);assert.equal(result.paypay,4840);
 setAvailableCredit(d,{id:'available',date:'2026-11-06',amount:4000});assert.equal(read(d,'2026-11-06').paypay,4000);assert.equal(read(d,'2026-11-06').assets,1388);
});

test('ordinary and non-JP configured books hide PayPay; separate books/currencies and guest state stay private',()=>{
 const d=fixture();d.regional={vietnam:newRegionalBook('VN')};d.regional.vietnam.accounts={openedOn:'2026-01-01',bank:1000000,cash:100000,savings:0,creditDebt:0,creditLimit:null,transfers:[]};
 const ordinary=currentWallet(d,{asOf:'2026-11-15',creditAllowed:'true'});assert.equal(ordinary.paypayVisible,false);assert.equal(ordinary.paypay,null);assert.equal(ordinary.creditDebt,null);
 assert(!currentWalletContent(d,{asOf:'2026-11-15',signedIn:true,creditAllowed:false}).includes('PayPay'));
 assert.equal(read(d.regional.vietnam,'2026-11-15').currency,'VND');assert.equal(read(d.regional.vietnam,'2026-11-15').assets,1100000);assert.equal(read(d.regional.vietnam,'2026-11-15').paypayVisible,false);
 const guest=currentWalletContent(d,{asOf:'2026-11-15',signedIn:false,creditAllowed:true});assert(!guest.includes('1755'));assert(!guest.includes('data-current-balance'));
});

test('missing/future opening stays unknown, manual PayPay observations remain independent, local date and invalid date rules',()=>{
 const d=newRegionalBook('JP');setAvailableCredit(d,{id:'available',date:'2026-11-01',amount:1234.567});const missing=read(d,'2026-11-04');assert.equal(missing.assets,null);assert.equal(missing.paypay,1234.567);
 d.accounts={openedOn:'2026-12-01',bank:1000,cash:100,creditDebt:0,creditLimit:null,transfers:[]};assert.equal(read(d,'2026-11-04').reason,'future');assert.equal(read(d,'2026-11-04').assets,null);
 assert.equal(localToday(new Date(2026,10,15,0,0)),'2026-11-15');assert.throws(()=>read(d,'2026-02-30'));
});
