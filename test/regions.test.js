import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,normalizeData,monthSummary,yearSummary} from '../src/model.js';
import {newRegionalBook,readBook,writeBook,configureBook,moduleEnabled} from '../src/region-model.js';
import {accountBalances,reconcileMonth,balanceUpdateCount} from '../src/account-model.js';
import {addReceipt,receivableRemaining,receiptTotals} from '../src/receipt-model.js';
import {saveStatement,settleStatement,undoSettlement,statementNumbers} from '../src/card-model.js';
const fixture=()=>{const d=newRegionalBook('JP');d.accounts={openedOn:'2026-01-01',bank:50000,cash:10000,savings:100000,creditDebt:0,creditLimit:null,transfers:[]};return d;};
const paid=(amount,source='savings',status='paid')=>({id:'spend',title:'Gửi tiền về Việt Nam',amount,paymentMethod:source,status});
test('legacy financial records and mixed legacy savings currency are never reinterpreted',()=>{
 const old=emptyData();old.savings={'2026-01':1000000};old.days['2026-01-01']={note:'Keep',items:[paid(20,'bank')]};const before=structuredClone(old);
 let document=writeBook(old,'vietnam',newRegionalBook('VN'));document=normalizeData(JSON.parse(JSON.stringify(document)));assert.deepEqual(readBook(document,'foreign'),before);assert.equal(document.regional.vietnam.currencies.cash,'VND');assert.equal(document.regional.vietnam.currencies.savings,'VND');assert.equal(moduleEnabled(document.regional.vietnam,'salary'),false);
});
test('independent region edits round trip, preserve other-region data and include both in export',()=>{
 let doc=fixture(),vn=newRegionalBook('VN');vn.accounts={openedOn:'2026-01-01',bank:10000000,cash:0,savings:0,creditDebt:0,creditLimit:null,transfers:[]};
 doc=writeBook(doc,'vietnam',vn);const foreign=readBook(doc,'foreign');foreign.days['2026-01-03']={note:'',items:[paid(100000)]};doc=normalizeData(writeBook(doc,'foreign',foreign));
 assert.equal(accountBalances(readBook(doc,'foreign'),'2026-01-03').savings,0);assert.equal(accountBalances(readBook(doc,'vietnam'),'2026-01-03').bank,10000000);assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(doc))),doc);
 const bad=structuredClone(doc);bad.regional.vietnam.currencies.cash='JPY';assert.throws(()=>normalizeData(bad));bad.regional.vietnam=structuredClone(doc);assert.throws(()=>normalizeData(bad));
});
test('countries initialize matching cash/savings and cannot relabel a populated book',()=>{
 for(const [country,currency]of[['JP','JPY'],['GB','GBP'],['KR','KRW'],['CN','CNY']]){const b=configureBook(emptyData(),country,{salary:true});assert.equal(b.currencies.cash,currency);assert.equal(b.currencies.savings,currency);assert.equal(moduleEnabled(b,'salary'),true);assert.deepEqual(normalizeData(b),b);}
 const d=fixture();assert.throws(()=>configureBook(d,'GB',{}));const disabled=configureBook(d,'JP',{salary:false,savings:false});assert.deepEqual(disabled.accounts,d.accounts);assert.equal(moduleEnabled(disabled,'salary'),false);assert.throws(()=>configureBook(emptyData(),'XX',{}));assert.throws(()=>configureBook(emptyData(),'__proto__',{}));
});
test('savings are actual funds: spending once reduces savings and regional assets, internal allocation preserves assets',()=>{
 const d=fixture();const assets=b=>b.bank+b.cash+b.savings;assert.equal(assets(accountBalances(d,'2026-01-03')),160000);
 d.accounts.transfers.push({id:'fund',date:'2026-01-02',from:'bank',to:'savings',amount:20000});assert.equal(assets(accountBalances(d,'2026-01-02')),160000);assert.equal(monthSummary(d,2026,0).expense,0);
 d.days['2026-01-03']={note:'',items:[paid(100000)]};assert.equal(accountBalances(d,'2026-01-03').savings,20000);assert.equal(assets(accountBalances(d,'2026-01-03')),60000);assert.equal(monthSummary(d,2026,0).expense,100000);assert.deepEqual(normalizeData(d),d);
 d.days['2026-01-03'].items[0].status='planned';assert.equal(accountBalances(d,'2026-01-03').savings,120000);assert.equal(monthSummary(d,2026,0).expense,0);
 d.days['2026-01-03'].items=[];assert.equal(assets(accountBalances(d,'2026-01-03')),160000);
});
test('reject overspending or transactions before savings opening, preserve fractional precision',()=>{
 const d=fixture();d.days['2026-01-02']={note:'',items:[paid(100000.001)]};assert.throws(()=>normalizeData(d),/không đủ/);d.days['2026-01-02'].items=[paid(0.123)];assert.equal(accountBalances(normalizeData(d),'2026-01-02').savings,99999.877);
 d.accounts.savingsOpenedOn='2026-01-03';assert.throws(()=>normalizeData(d),/trước ngày/);delete d.accounts.savings;delete d.accounts.savingsOpenedOn;assert.throws(()=>normalizeData(d),/Chưa thiết lập/);
});
test('VND gifts/work/interest are income, own-money and principal recovery are cash inflows only',()=>{
 const d=newRegionalBook('VN');d.accounts={openedOn:'2026-01-01',bank:0,cash:0,savings:0,creditDebt:0,creditLimit:null,transfers:[]};d.receivables=[{id:'loan',title:'Bạn nợ',amount:200000}];
 for(const [type,amount]of[['own',16000000],['gift',500000],['freelance',200000],['interest',10000],['repayment',100000]])addReceipt(d,{id:type,date:'2026-01-03',source:'bank',type,amount,receivableId:'loan',note:''});
 assert.deepEqual(receiptTotals(d,'2026-01'),{income:710000,nonIncome:16100000});assert.equal(monthSummary(d,2026,0).salary,0);assert.equal(monthSummary(d,2026,0).balance,710000);assert.equal(yearSummary(d,2026).otherIncome,710000);assert.equal(accountBalances(d,'2026-01-03').bank,16810000);assert.equal(receivableRemaining(d,'loan'),100000);assert.deepEqual(normalizeData(d),d);
 const before=structuredClone(d);assert.throws(()=>addReceipt(d,{id:'over',type:'repayment',date:'2026-01-04',source:'cash',amount:100001,receivableId:'loan'}));assert.deepEqual(d,before);d.receipts=d.receipts.filter(r=>r.id!=='repayment');assert.equal(receivableRemaining(d,'loan'),200000);
});
test('manual JPY outgoing and VND receipt have no automated link or exchange rate',()=>{
 const jp=fixture();jp.days['2026-01-03']={note:'',items:[paid(100000)]};const vn=newRegionalBook('VN');addReceipt(vn,{id:'receive',date:'2026-01-04',type:'own',source:'bank',amount:16000000,note:'Tiền Nhật gửi về'});const doc=normalizeData(writeBook(jp,'vietnam',vn));assert.equal(monthSummary(readBook(doc,'foreign'),2026,0).expense,100000);assert.equal(monthSummary(readBook(doc,'vietnam'),2026,0).balance,0);assert.equal(doc.regional.vietnam.receipts[0].amount,16000000);
});
test('simple VND statement has only total, settlement reduces selected savings once and undo restores it',()=>{
 const d=fixture();d.bookSettings.country='VN';d.currencies={cash:'VND',savings:'VND'};saveStatement(d,{month:'2026-01',oneOff:50000,priorBalance:0,newRibo:0,principal:0,fees:0,dueDate:'2026-01-20',confirmedOn:'2026-01-20',status:'confirmed',note:''});assert.equal(statementNumbers(d.cards.statements[0]).total,50000);settleStatement(d,'2026-01','2026-01-20','savings');assert.equal(accountBalances(d,'2026-01-20').savings,50000);assert.equal(monthSummary(d,2026,0).expense,0);assert.deepEqual(normalizeData(d),d);undoSettlement(d,'2026-01');assert.equal(accountBalances(d,'2026-01-20').savings,100000);
});
test('three-source reconciliation carries savings independently of legacy bank/cash closes',()=>{
 const d=fixture();reconcileMonth(d,'2026-01-31',{bank:45000,cash:9000,savings:99000},{id:'end'});const b=accountBalances(d,'2026-02-01');assert.equal(b.bank,45000);assert.equal(b.savings,99000);assert.equal(d.accounts.reconciliations[0].deltaSavings,-1000);assert.deepEqual(normalizeData(d),d);
 const vn=newRegionalBook('VN');vn.accounts={openedOn:'2026-01-01',bank:0,cash:0,creditDebt:0,creditLimit:null,transfers:[]};for(let i=0;i<3;i++)reconcileMonth(d,'2026-02-01',{bank:1,cash:1},{id:'r'+i,manual:true,today:'2026-02-02'});assert.equal(balanceUpdateCount(vn.accounts,'2026-02'),0);assert.equal(balanceUpdateCount(d.accounts,'2026-02'),3);
});

test('editing/deleting receipts adjusts balances and principal, rejects deleting a receivable with history',()=>{
 const d=fixture();d.receivables=[{id:'owed',title:'Nợ gốc',amount:100}];addReceipt(d,{id:'r',date:'2026-01-02',type:'repayment',amount:30,source:'bank',receivableId:'owed'});
 const b=accountBalances(d,'2026-01-02').bank;const next=structuredClone(d);next.receipts[0].amount=40;const restored=normalizeData(next);assert.equal(accountBalances(restored,'2026-01-02').bank,b+10);assert.equal(receivableRemaining(restored,'owed'),60);
 const noLoan=structuredClone(d);noLoan.receivables=[];assert.throws(()=>normalizeData(noLoan));delete restored.receipts;assert.equal(accountBalances(restored,'2026-01-02').bank,b-30);assert.equal(receivableRemaining(restored,'owed'),100);
});
test('legacy savings initialization never guesses stock from monthly savings history',()=>{
 const d=emptyData();d.savings={'2026-01':1000000};d.accounts={openedOn:'2026-01-01',bank:100,cash:0,creditDebt:0,creditLimit:null,transfers:[]};
 assert.equal(accountBalances(d,'2026-01-15').savings,undefined);d.accounts.savings=0;d.accounts.savingsOpenedOn='2026-01-15';d.accounts.transfers.push({id:'allocate',date:'2026-01-16',from:'bank',to:'savings',amount:40});const next=normalizeData(d);assert.equal(accountBalances(next,'2026-01-16').bank,60);assert.equal(accountBalances(next,'2026-01-16').savings,40);assert.equal(next.savings['2026-01'],1000000);
});

test('country metadata cannot silently relabel transaction currency in imported backups',()=>{
 const d=newRegionalBook('GB');d.currencies.cash='JPY';assert.throws(()=>normalizeData(d),/không khớp/);
});
