import {hasData} from '../src/sync.js';
import {needsCurrencySetup} from '../src/settings-ui.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData} from '../src/model.js';
import {availableCredit,setAvailableCredit,saveStatement,settleStatement,undoSettlement} from '../src/card-model.js';
import {accountBalances,balanceUpdateCount} from '../src/account-model.js';
import {financeView} from '../src/credit-access.js';

test('available credit can be entered repeatedly without bank setup and survives backups',()=>{
 let d=emptyData();assert.equal(availableCredit(d,'2026-01-15'),null);
 for(let i=0;i<5;i++)setAvailableCredit(d,{id:String(i),date:'2026-01-15',amount:1000+i});
 d=normalizeData(JSON.parse(JSON.stringify(d)));assert.equal(availableCredit(d,'2026-01-15'),1004);assert.equal(d.cards.availableCreditHistory.length,5);assert.equal(hasData(d),true);assert.equal(needsCurrencySetup(d),false);assert.equal(d.accounts,undefined);assert.equal(balanceUpdateCount(d.accounts,'2026-01'),0);
 assert.equal(availableCredit(d,'2026-01-14'),null);assert.equal(availableCredit(financeView(d,false),'2026-01-15'),null);
 const snapshot=structuredClone(d);for(const amount of [-1,'bad',1e13])assert.throws(()=>setAvailableCredit(d,{id:'bad',date:'2026-01-15',amount}));assert.throws(()=>setAvailableCredit(d,{id:'0',date:'2026-01-15',amount:1}));assert.deepEqual(d,snapshot);
});
test('observed available credit follows later actual purchases, fees and payments once',()=>{
 const d=emptyData();setAvailableCredit(d,{id:'first',date:'2026-01-15',amount:1000});
 d.days['2026-01-15']={note:'',items:[{id:'before',amount:100,paymentMethod:'card',status:'paid'}]};
 d.days['2026-01-16']={note:'',items:[{id:'buy',amount:50,paymentMethod:'card',status:'paid'},{id:'plan',amount:900,paymentMethod:'card',status:'planned'},{id:'cash',amount:30,paymentMethod:'cash',status:'paid'}]};
 saveStatement(d,{month:'2026-01',priorBalance:100,newRibo:0,principal:10,fees:5,oneOff:0,dueDate:'2026-01-17',confirmedOn:'2026-01-16',status:'confirmed',note:''});
 assert.equal(availableCredit(d,'2026-01-16'),945);settleStatement(d,'2026-01','2026-01-17');assert.equal(availableCredit(d,'2026-01-17'),960);undoSettlement(d,'2026-01');assert.equal(availableCredit(d,'2026-01-17'),945);
 setAvailableCredit(d,{id:'second',date:'2026-01-17',amount:1200});assert.equal(availableCredit(d,'2026-01-17'),1200);assert.equal(availableCredit(d,'2026-01-16'),945);
});
test('available credit edits preserve bank/cash, debt, total limit and monthly correction history',()=>{
 const d=emptyData();d.accounts={openedOn:'2026-01-01',bank:500,cash:30,creditDebt:100,creditLimit:800,transfers:[]};const before=structuredClone(d.accounts),balances=accountBalances(d,'2026-01-15');
 setAvailableCredit(d,{id:'one',date:'2026-01-15',amount:'2,000.5'});assert.equal(availableCredit(d,'2026-01-15',balances.available),2000.5);assert.deepEqual(d.accounts,before);assert.deepEqual(accountBalances(d,'2026-01-15'),balances);
 assert.equal(availableCredit(emptyData(),'2026-01-15',700),700);
});
