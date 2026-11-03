import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeData,monthSummary,addDebt,repayDebt,cancelDebtPayment} from '../src/model.js';
import {newRegionalBook,readBook,writeBook} from '../src/region-model.js';
import {accountBalances} from '../src/account-model.js';
import {defaultCards,saveStatement,settleStatement} from '../src/card-model.js';
import {financeView,creditSnapshot} from '../src/credit-access.js';
import {normalizeSafety,fundBalance,emergencySummary,reservedBySource,budgetRows,forecast30,upcomingObligations,debtCandidates,simulatePayoff} from '../src/safety-model.js';
const fixture=()=>{const d=newRegionalBook('JP');d.accounts={openedOn:'2026-01-01',bank:1000,cash:100,savings:500,creditDebt:0,creditLimit:null,transfers:[]};return d;};
const fund=(id='f',source='savings',amount=200)=>({id,name:'Dự phòng',source,kind:'emergency',target:0,archived:false,entries:[{id:'allocation',date:'2026-01-01',direction:'allocate',amount,note:'Giữ riêng'}]});
const expense=(id,amount,extra={})=>({id,title:id,amount,status:'paid',paymentMethod:'bank',category:'Ăn uống',...extra});
const setSafety=(d,patch={})=>{d.safety=normalizeSafety(patch,d);return d;};

test('earmarked funds are not new assets; spending/reversal releases the right amount once',()=>{
 const d=setSafety(fixture(),{funds:[fund()],essentialMonthly:100,reserveMonths:3});const before=accountBalances(d,'2026-01-01');assert.equal(fundBalance(d,'f','2026-01-01'),200);assert.equal(emergencySummary(d,'2026-01-01').monthsCovered,2);assert.equal(emergencySummary(d,'2026-01-01').target,300);assert.deepEqual(accountBalances(d,'2026-01-01'),before);
 d.days['2026-01-02']={note:'',items:[expense('food',50,{fundId:'f',paymentMethod:'savings'})]};const n=normalizeData(d);assert.equal(accountBalances(n,'2026-01-02').savings,450);assert.equal(fundBalance(n,'f','2026-01-02'),150);assert.equal(monthSummary(n,2026,0).expense,50);
 n.days['2026-01-02'].items[0].status='planned';assert.equal(fundBalance(n,'f','2026-01-02'),200);assert.equal(accountBalances(n,'2026-01-02').savings,500);assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(n))),n);
});
test('reject over-allocation across funds, source mismatches, negative funds and historical overbooking',()=>{
 const d=setSafety(fixture(),{funds:[fund('a','savings',300),fund('b','savings',300)]});assert.throws(()=>normalizeData(d),/vượt số dư/);
 d.safety.funds=[fund()];d.days['2026-01-02']={note:'',items:[expense('wrong',1,{fundId:'f'})]};assert.throws(()=>normalizeData(d),/không khớp/);
 d.days['2026-01-02'].items[0]=expense('over',201,{fundId:'f',paymentMethod:'savings'});assert.throws(()=>normalizeData(d),/không đủ/);
 const a=setSafety(fixture(),{funds:[fund('bank','bank',900)]});a.days['2026-01-02']={note:'',items:[expense('unallocated',101)]};assert.throws(()=>normalizeData(a),/vượt số dư/);
 a.safety.funds[0].entries.push({id:'release',date:'2026-01-01',direction:'release',amount:200,note:''});assert.doesNotThrow(()=>normalizeData(a));
});
test('fund source and snapshots survive independent regional books without currency conversion',()=>{
 const jp=setSafety(fixture(),{funds:[fund()],essentialMonthly:100});const vn=newRegionalBook('VN');vn.accounts={...jp.accounts,bank:1000000,savings:5000000};setSafety(vn,{funds:[fund('vn','savings',3000000)],essentialMonthly:1000000});const full=normalizeData(writeBook(jp,'vietnam',vn));assert.equal(emergencySummary(readBook(full,'foreign'),'2026-01-02').saved,200);assert.equal(emergencySummary(readBook(full,'vietnam'),'2026-01-02').saved,3000000);assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(full))),full);
});
test('budget alerts count incurred category costs once, not transfers/card fees/payments',()=>{
 const d=fixture();d.days['2026-01-02']={note:'',items:[expense('paid',120),expense('planned',30,{status:'planned'}),expense('transfer',100,{movement:'withdraw'}),expense('settle',90,{cardPaymentMonth:'2026-01'}),expense('fee',10,{cardFeeMonth:'2026-01'}),expense('other',500,{category:'Khác'})]};setSafety(d,{budgets:[{month:'2026-01',category:'Ăn uống',amount:100},{month:'2026-02',category:'Ăn uống',amount:999}]});const [row]=budgetRows(d,'2026-01');assert.equal(row.spent,120);assert.equal(row.planned,30);assert.equal(row.over,20);assert.equal(row.remaining,-20);assert.throws(()=>normalizeSafety({budgets:[row,row]},d),/trùng/);
});
test('obligation links reject missing/duplicate rows and preserve payment audit data',()=>{
 const d=fixture();d.days['2026-01-05']={note:'Keep',items:[expense('bill',100,{status:'planned',obligationId:'o'})]};setSafety(d,{obligations:[{id:'o',date:'2026-01-05',dueDate:'2026-01-05',expenseId:'bill',history:[]}]});assert.deepEqual(normalizeData(d),d);assert.equal(upcomingObligations(d,'2026-01-01').length,1);
 d.days['2026-01-06']={note:'',items:d.days['2026-01-05'].items};d.days['2026-01-05'].items=[];d.days['2026-01-06'].items[0].status='paid';d.safety.obligations[0].date='2026-01-06';d.safety.obligations[0].history=[{id:'h',date:'2026-01-06',action:'paid',amount:100,source:'bank',expenseDate:'2026-01-06'}];const n=normalizeData(d);assert.equal(n.safety.obligations[0].dueDate,'2026-01-05');assert.equal(upcomingObligations(n,'2026-01-06').length,0);assert.equal(accountBalances(n,'2026-01-06').bank,900);
 const broken=structuredClone(n);broken.days['2026-01-06'].items=[];assert.throws(()=>normalizeData(broken),/không khớp/);
});
test('30-day forecast starts at actual closing balance and does not double count salary, paid bills or transfers',()=>{
 const d=fixture();d.incomes['2026-01']={salary:200,bonus:0,note:'',receivedOn:'2026-01-03'};d.days['2026-01-02']={note:'',items:[expense('planned',100,{status:'planned'}),expense('actual-future',20)]};d.accounts.transfers.push({id:'t',date:'2026-01-04',from:'bank',to:'cash',amount:50});
 const f=forecast30(d,'2026-01-01');assert.equal(f.days.length,30);assert.equal(f.days[0].bank,880);assert.equal(f.days[1].bank,1080);assert.equal(f.days[2].bank,1030);assert.equal(f.days[2].cash,150);assert.equal(f.days[2].total,1680);assert.equal(f.initial.bank,1000);assert.deepEqual(forecast30({...d,accounts:undefined},'2026-01-01').ready,false);
});
test('forecast handles overdue payments, unknown loan minimum, card statement and future actual repayment once',()=>{
 const d=fixture();addDebt(d,{id:'loan',title:'Loan',amount:200,type:'Khác',dueDate:'2026-01-05'});assert.equal(forecast30(d,'2026-01-06').unknown.length,1);
 setSafety(d,{debtTerms:[{debtId:'loan',apr:0,minimum:100,source:'bank',nextDueDate:'2026-01-05'}]});repayDebt(d,'loan',{id:'p',date:'2026-01-10',amount:100,source:'bank'});
 saveStatement(d,{month:'2026-01',priorBalance:0,newRibo:0,principal:0,fees:0,oneOff:50,dueDate:'2026-01-12',confirmedOn:'2026-01-01',status:'confirmed',note:''});
 const f=forecast30(d,'2026-01-06');assert.equal(f.days.find(x=>x.date==='2026-01-12').bank,850);assert.equal(f.days.find(x=>x.date==='2026-01-07').bank,1000);
 cancelDebtPayment(d,'loan','p');const g=forecast30(d,'2026-01-06');assert.equal(g.days[0].bank,900);assert.equal(g.days[0].events[0].overdue,true);
 settleStatement(d,'2026-01','2026-01-12');assert.equal(forecast30(d,'2026-01-06').days.find(x=>x.date==='2026-01-12').bank,850);
});
test('funded planned spending uses earmarks once; forecast flags insufficient fund and source cash separately',()=>{
 const d=setSafety(fixture(),{funds:[fund('bank','bank',200)]});d.days['2026-01-02']={note:'',items:[expense('future',50,{status:'planned',fundId:'bank'})]};let f=forecast30(d,'2026-01-01');assert.equal(f.days[0].bank,950);assert.equal(f.days[0].free.bank,800);
 d.days['2026-01-02'].items[0].amount=201;f=forecast30(d,'2026-01-01');assert.equal(f.days[0].fundShortage,true);assert.equal(f.firstShortage,'2026-01-02');
 d.days['2026-01-02'].items=[expense('cash-short',200,{paymentMethod:'cash',status:'planned'})];f=forecast30(d,'2026-01-01');assert.equal(f.days[0].cash,-100);assert.equal(f.days[0].shortage,true);assert.ok(f.days[0].total>0);
});
test('debt payoff estimates distinguish known zero APR, missing rates, minimum shortfall and non-amortizing debt',()=>{
 const debt={id:'a',title:'A',balance:100,apr:0,minimum:10};let p=simulatePayoff([debt],30);assert.equal(p.status,'complete');assert.equal(p.months,4);assert.equal(p.interest,0);assert.equal(p.totalPaid,100);
 assert.equal(simulatePayoff([{...debt,apr:null}],30).status,'missing');assert.equal(simulatePayoff([debt],5).status,'minimum');assert.equal(simulatePayoff([{...debt,apr:1000,minimum:1}],1).status,'nonamortizing');assert.equal(simulatePayoff([debt],0).status,'budget');assert.equal(simulatePayoff([],0).status,'paid');
 const rows=[{...debt,balance:1000,apr:12,minimum:100},{id:'b',title:'B',balance:100,apr:0,minimum:10}];const before=structuredClone(rows),a=simulatePayoff(rows,200,'avalanche'),b=simulatePayoff(rows,200,'snowball');assert.equal(a.status,'complete');assert.equal(b.status,'complete');assert.ok(a.interest<=b.interest);assert.deepEqual(rows,before);
});
test('card payoff plan requires current explicit data and remains admin-only in projections/snapshots',()=>{
 const d=fixture();d.cards={...defaultCards(),safetyPlan:{asOf:'2026-01-01',principal:100,apr:12,minimum:10}};const n=normalizeData(d);assert.equal(simulatePayoff(debtCandidates(n,'2026-01-01'),50).status,'complete');assert.equal(simulatePayoff(debtCandidates(n,'2026-01-02'),50).status,'missing');assert.equal(debtCandidates(financeView(n,false),'2026-01-01').length,0);const changed=structuredClone(n);changed.cards.safetyPlan.apr=0;assert.notEqual(creditSnapshot(changed),creditSnapshot(n));
});

test('actual repayments split principal from charges and forecast future cash out once',()=>{
 const d=fixture();addDebt(d,{id:'loan',title:'Loan',type:'Khác',amount:100,dueDate:'2026-01-10'});setSafety(d,{debtTerms:[{debtId:'loan',apr:12,minimum:30,source:'bank',nextDueDate:'2026-01-10'}]});
 repayDebt(d,'loan',{id:'p',date:'2026-01-10',amount:20,interest:10,source:'bank'});const n=normalizeData(d);assert.equal(n.days['2026-01-10'].items[0].amount,30);assert.equal(accountBalances(n,'2026-01-10').bank,970);assert.equal(debtCandidates(n,'2026-01-10')[0].balance,80);assert.equal(forecast30(n,'2026-01-01').days.find(x=>x.date==='2026-01-10').bank,970);assert.equal(upcomingObligations(n,'2026-01-10').length,0);
 const bad=structuredClone(n);bad.days['2026-01-10'].items[0].amount=20;const before=structuredClone(bad);assert.throws(()=>cancelDebtPayment(bad,'loan','p'));assert.deepEqual(bad,before);assert.throws(()=>normalizeData(bad));
 cancelDebtPayment(n,'loan','p');assert.equal(accountBalances(n,'2026-01-10').bank,1000);assert.equal(debtCandidates(n,'2026-01-10')[0].balance,100);assert.deepEqual(normalizeData(n),n);
 repayDebt(n,'loan',{id:'interest-only',date:'2026-01-12',amount:0,interest:5,source:'cash'});assert.equal(accountBalances(n,'2026-01-12').cash,95);assert.equal(debtCandidates(n,'2026-01-12')[0].balance,100);assert.deepEqual(normalizeData(n),n);
});
test('forecast stops safely at the last supported calendar date',()=>{const d=fixture();const f=forecast30(d,'9999-12-30');assert.equal(f.days.length,1);assert.equal(f.days[0].date,'9999-12-31');});

test('partial loan terms permit a known cash minimum without guessing an unknown interest rate',()=>{
 const d=fixture();addDebt(d,{id:'a',title:'Unknown APR',type:'Khác',amount:100,dueDate:'2026-01-10'});setSafety(d,{debtTerms:[{debtId:'a',apr:null,minimum:20,source:'bank',nextDueDate:'2026-01-10'}]});const n=normalizeData(d);assert.equal(upcomingObligations(n,'2026-01-01')[0].amount,20);assert.equal(simulatePayoff(debtCandidates(n,'2026-01-01'),30).status,'missing');assert.equal(forecast30(n,'2026-01-01').days.find(x=>x.date==='2026-01-10').bank,980);
 n.safety.debtTerms[0].minimum=null;assert.equal(upcomingObligations(normalizeData(n),'2026-01-01')[0].amount,null);assert.equal(forecast30(n,'2026-01-01').unknown.length,1);
});

test('safety amounts retain their currency and reject relabeling a regional or legacy book',()=>{
 const d=setSafety(fixture(),{funds:[fund()]});assert.equal(d.safety.currency,'JPY');const changed=structuredClone(d);changed.currencies.cash='VND';delete changed.bookSettings;assert.throws(()=>normalizeData(changed),/không khớp/);assert.deepEqual(normalizeData(d),d);
});
