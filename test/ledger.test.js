import test from 'node:test';import assert from 'node:assert/strict';
import {emptyData,normalizeData,monthSummary,yearSummary,expenseRows,dayTotal,repayDebt,addDebt} from '../src/model.js';
import {saveStatement,settleStatement,undoSettlement,cardCashflow} from '../src/card-model.js';
import {normalizeAccounts,accountBalances,moneyOut} from '../src/account-model.js';
function fixture(){const data=emptyData();data.accounts={openedOn:'2026-01-01',bank:2000,cash:100,creditDebt:1000,creditLimit:5000,transfers:[]};data.incomes['2026-02']={salary:2000,bonus:0,note:'',account:'bank',receivedOn:'2026-02-15'};data.days['2026-01-10']={note:'',items:[{id:'one',title:'Food',amount:200,status:'paid',paymentMethod:'card',settlement:'oneoff',billingMonth:'2026-02'},{id:'ribo',title:'Ribo',amount:50,status:'paid',paymentMethod:'card',settlement:'ribo',billingMonth:'2026-02'}]};saveStatement(data,{month:'2026-02',priorBalance:1000,newRibo:50,principal:100,fees:15,oneOff:200,dueDate:'2026-02-27',confirmedOn:'2026-02-20',status:'confirmed',note:''});return data;}
test('statement payment appears on payment day and reduces bank once without duplicating spending',()=>{
 const data=fixture();assert.equal(data.days['2026-02-27'],undefined);assert.equal(accountBalances(data,'2026-02-26').bank,4000);
 settleStatement(data,'2026-02','2026-02-27','bank');const row=data.days['2026-02-27'].items[0];assert.equal(row.amount,315);assert.equal(row.paymentMethod,'bank');assert.equal(row.cardPaymentMonth,'2026-02');assert.match(row.title,/Thanh toán/);
 assert.equal(dayTotal(data.days['2026-02-27'],'paid'),0);assert.equal(monthSummary(data,2026,1).expense,0);assert.equal(moneyOut(data,'2026-02'),315);assert.equal(cardCashflow(data,'2026-02').direct,0);assert.equal(cardCashflow(data,'2026-02').afterReserve,1685);
 assert.deepEqual(accountBalances(data,'2026-02-27'),{bank:3685,cash:100,creditDebt:950,available:4050});assert.deepEqual(normalizeData(data),data);
 const snapshot=structuredClone(data);assert.throws(()=>settleStatement(data,'2026-02','2026-02-27'));assert.deepEqual(data,snapshot);
 undoSettlement(data,'2026-02');assert.equal(data.days['2026-02-27'].items.length,0);assert.deepEqual(accountBalances(data,'2026-02-27'),{bank:4000,cash:100,creditDebt:1265,available:3735});
 settleStatement(data,'2026-02','2026-02-28','cash');assert.equal(moneyOut(data,'2026-02-27'),0);assert.equal(moneyOut(data,'2026-02-28'),315);assert.equal(accountBalances(data,'2026-02-28').cash,-215);assert.equal(accountBalances(data,'2026-02-28').bank,4000);
});
test('source balances respect dates, exclude planned, and transfers preserve net assets',()=>{
 const data=fixture();data.days['2026-02-10']={note:'',items:[{id:'cash',title:'x',amount:10},{id:'bank',title:'y',amount:20,paymentMethod:'bank'},{id:'planned',title:'z',amount:900,status:'planned',paymentMethod:'bank'}]};data.days['2026-03-01']={note:'',items:[{id:'future',title:'later',amount:1000,paymentMethod:'bank'}]};data.accounts.transfers.push({id:'t',date:'2026-02-11',from:'bank',to:'cash',amount:50});
 assert.equal(accountBalances(data,'2025-12-31'),null);assert.equal(accountBalances(data,'2026-02-14').bank,1930);assert.equal(accountBalances(data,'2026-02-15').bank,3930);assert.equal(accountBalances(data,'2026-02-15').cash,140);assert.equal(moneyOut(data,'2026-02'),30);assert.deepEqual(normalizeData(data),data);
 const dup={...data.accounts,transfers:[{id:'1',date:'2026-02-01',from:'bank',to:'cash',amount:1},{id:1,date:'2026-02-02',from:'bank',to:'cash',amount:1}]};assert.throws(()=>normalizeAccounts(dup));
});
test('legacy paid bills migrate once; malformed and missing payment links are rejected',()=>{
 const data=fixture();settleStatement(data,'2026-02','2026-02-27');const broken=structuredClone(data);broken.days['2026-02-27'].items[0].amount=1;assert.throws(()=>normalizeData(broken));const before=structuredClone(broken);assert.throws(()=>undoSettlement(broken,'2026-02'));assert.deepEqual(broken,before);
 const missing=structuredClone(data);missing.days['2026-02-27'].items=[];assert.throws(()=>normalizeData(missing));delete missing.cards.statements[0].paymentSource;const migrated=normalizeData(missing);assert.equal(migrated.days['2026-02-27'].items.length,1);assert.deepEqual(normalizeData(migrated),migrated);assert.equal(monthSummary(migrated,2026,1).expense,0);
 const cashSource=structuredClone(data);cashSource.days['2026-02-27'].items[0].paymentMethod='cash';assert.throws(()=>normalizeData(cashSource));
});
test('debt repayment uses selected account and survives backups',()=>{
 const data=fixture();addDebt(data,{id:'d',title:'Loan',type:'Other',amount:50});repayDebt(data,'d',{id:'p',date:'2026-02-15',amount:20,source:'bank'});assert.equal(accountBalances(data,'2026-02-15').bank,3980);assert.deepEqual(normalizeData(data),data);
});
test('available credit stays unknown without limit or when ledger requires reconciliation',()=>{
 const data=fixture();data.accounts.creditLimit=null;assert.equal(accountBalances(data,'2026-02-15').available,null);data.accounts.creditDebt=0;data.accounts.creditLimit=5000;data.accounts.openedOn='2026-02-27';settleStatement(data,'2026-02','2026-02-27');assert.ok(accountBalances(data,'2026-02-27').creditDebt<0);assert.equal(accountBalances(data,'2026-02-27').available,null);
});

test('fees stay only in statement/internal liability ledger, never spending/search totals',()=>{
 const data=fixture(),fee=data.days['2026-02-20'].items[0];
 assert.equal(expenseRows(data,2026,1,{query:'phí'}).length,0);assert.equal(yearSummary(data,2026).expense,250);
 assert.equal(fee.amount,15);assert.equal(data.cards.statements[0].fees,15);
 assert.equal(dayTotal(data.days['2026-02-20']),0);assert.equal(monthSummary(data,2026,1).expense,0);assert.equal(monthSummary(data,2026,1).count,0);
 assert.equal(accountBalances(data,'2026-02-20').creditDebt,1265);
 settleStatement(data,'2026-02','2026-02-27');
 assert.equal(accountBalances(data,'2026-02-27').creditDebt,950);assert.equal(accountBalances(data,'2026-02-27').bank,3685);
 const restored=normalizeData(JSON.parse(JSON.stringify(data)));assert.deepEqual(accountBalances(restored,'2026-02-27'),accountBalances(data,'2026-02-27'));
});
