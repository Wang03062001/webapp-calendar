import test from 'node:test';
import assert from 'node:assert/strict';
import {statsDetails} from '../src/stats-model.js';
import {statsFixture} from '../scripts/fixtures/stats.mjs';
import {accountBalances,moneyOut} from '../src/account-model.js';
import {monthSummary,yearSummary} from '../src/model.js';
import {undoSettlement,saveStatement,settleStatement} from '../src/card-model.js';
const options={year:2026,month:10,creditAllowed:true};

test('selected-period activity includes previous statement principal/fees/one-off paid this month exactly once',()=>{
 const d=statsFixture(),before=structuredClone(d),balances=accountBalances(d,'2026-11-30'),details=statsDetails(d,options);
 assert.equal(details.summary.expense,70.25);assert.equal(details.settlementTotal,100);assert.equal(details.activityTotal,170.25);assert.equal(details.activityDifference,83.21);
 assert.equal(details.settlements.length,1);assert.equal(details.settlements[0].month,'2026-10');assert.equal(details.settlements[0].principal,17.655);assert.equal(details.settlements[0].fees,2.345);
 assert.deepEqual(details.bySource,{bank:150.25,cash:0,savings:0});assert.equal(details.directTotal,50.25);assert.equal(details.purchaseTotal,20);assert.equal(details.outflow,150.25);assert.equal(details.outflow,moneyOut(d,'2026-11'));assert.equal(details.cashDifference,103.21);
 assert(!details.paid.some(r=>r.id==='move'||r.cardFeeMonth||r.cardPaymentMonth));assert.deepEqual(d,before);assert.deepEqual(accountBalances(d,'2026-11-30'),balances);
});

test('income groups sum salary, bonus and true other income; own transfers/principal stay out',()=>{
 const detail=statsDetails(statsFixture(),options);assert.equal(detail.income,253.46);assert.equal(detail.summary.salary,200);assert.equal(detail.summary.bonus,10.125);assert.equal(detail.summary.otherIncome,43.335);
 assert.equal(detail.salaries.length,1);assert.equal(detail.salaries[0].earnedMonth,'2026-10');assert.equal(detail.otherIncome.length,3);assert(!detail.otherIncome.some(r=>r.id==='own'||r.id==='principal'));
});

test('planned detail includes one linked planned expense plus confirmed unpaid statements, with unknown drafts separate',()=>{
 const detail=statsDetails(statsFixture(),options);assert.equal(detail.summary.planned,27.5);assert.equal(detail.plannedSettlementTotal,51);assert.equal(detail.plannedTotal,78.5);assert.equal(detail.planned.filter(r=>r.obligationId).length,1);assert.equal(detail.upcomingStatements.length,1);assert.equal(detail.unknownStatements.length,1);assert.equal(detail.unknownStatements[0].amount,null);
});

test('month/year boundaries follow actual payment date; cost helper and balances keep original semantics',()=>{
 const d=statsFixture(),oct=statsDetails(d,{...options,month:9}),dec=statsDetails(d,{...options,month:11}),year=statsDetails(d,{...options,month:null});
 assert.equal(oct.settlementTotal,0);assert.equal(oct.activityTotal,11.33);assert.equal(dec.activityTotal,99);assert.equal(dec.settlementTotal,0);assert.equal(year.settlementTotal,100);assert.equal(year.activityTotal,280.58);assert.deepEqual(year.summary,yearSummary(d,2026));assert.deepEqual(statsDetails(d,options).summary,monthSummary(d,2026,10));
});

test('ordinary projections and literal verification hide paid, planned and draft card statements',()=>{
 const d=statsFixture();const result=statsDetails(d,{...options,creditAllowed:false});
 assert.equal(result.activityTotal,50.25);assert.equal(result.activityDifference,203.21);assert.equal(result.plannedTotal,27.5);assert.equal(result.settlements.length,0);assert.equal(result.upcomingStatements.length,0);assert.equal(result.unknownStatements.length,0);assert(!JSON.stringify(result).includes('PRIVATE'));
 assert.deepEqual(statsDetails(d,{...options,creditAllowed:'true'}),result);
});

test('undo moves the actual settlement back to planned without changing cost data, and books stay isolated',()=>{
 const d=statsFixture(),before=monthSummary(d,2026,10),vn=structuredClone(d.regional.vietnam);undoSettlement(d,'2026-10');const detail=statsDetails(d,options);assert.equal(detail.activityTotal,70.25);assert.equal(detail.plannedSettlementTotal,151);assert.equal(detail.plannedTotal,178.5);assert.deepEqual(monthSummary(d,2026,10),before);assert.deepEqual(d.regional.vietnam,vn);
 const v=statsDetails(vn,options);assert.equal(v.activityTotal,123456.789);assert.equal(v.income,0);assert.equal(v.settlementTotal,0);assert.equal(v.activityDifference,-123456.789);
});

test('simple statements retain total-only presentation and invalid periods reject',()=>{
 const d=statsFixture().regional.vietnam;saveStatement(d,{month:'2026-10',status:'confirmed',confirmedOn:'2026-11-02',dueDate:'2026-11-02',principal:0,fees:0,oneOff:100,priorBalance:0,newRibo:0});d.cards.name='Thẻ';settleStatement(d,'2026-10','2026-11-02','bank');
 const detail=statsDetails(d,options);assert.equal(detail.settlements[0].simple,true);assert.equal(detail.settlementTotal,100);
 assert.throws(()=>statsDetails(d,{...options,year:0}));assert.throws(()=>statsDetails(d,{...options,month:12}));
});
