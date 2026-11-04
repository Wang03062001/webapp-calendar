import test from 'node:test';
import assert from 'node:assert/strict';
import {salaryCycleDetails,salaryCycleRange,salaryCycleEnabled,statsDetails} from '../src/stats-model.js';
import {accountBalances} from '../src/account-model.js';
import {monthSummary} from '../src/model.js';
import {undoSettlement} from '../src/card-model.js';
import {salaryCycleFixture} from '../scripts/fixtures/salary-cycle.mjs';
import {statsFixture} from '../scripts/fixtures/stats.mjs';
const read=(d,asOf,creditAllowed=true)=>salaryCycleDetails(d,{asOf,creditAllowed});

test('prior payday funds the cycle across day 1; 190000 salary minus 5871 costs is 184129',()=>{
  const d=salaryCycleFixture(),before=structuredClone(d),b=accountBalances(d,'2026-11-04');
  const result=read(d,'2026-11-04');assert.deepEqual(result.cycle,{start:'2026-10-15',end:'2026-11-14',asOf:'2026-11-04'});
  assert.equal(result.income,190000);assert.equal(result.summary.expense,5871);assert.equal(result.activityDifference,184129);
  assert.equal(read(d,'2026-10-31').activityDifference,188800);assert.equal(read(d,'2026-11-01').activityDifference,187300);assert.equal(read(d,'2026-11-14').activityDifference,184129);
  assert.equal(read(d,'2026-11-15').activityDifference,189974.5);assert.equal(read(d,'2026-11-15').paid.length,1);
  assert.deepEqual(statsDetails(d,{year:2026,month:10}).summary,monthSummary(d,2026,10));assert.deepEqual(accountBalances(d,'2026-11-04'),b);assert.deepEqual(d,before);
});

test('receipt dates override month keys and earned month; late/early salary and bonuses are never assumed',()=>{
  const d=salaryCycleFixture();d.incomes['2026-10'].receivedOn='2026-10-17';d.incomes['2026-10'].bonus=0.125;
  assert.equal(read(d,'2026-10-16').income,0);assert.equal(read(d,'2026-10-17').income,190000.125);
  d.incomes['2026-11'].receivedOn='2026-11-17';assert.equal(read(d,'2026-11-15').income,0);assert.equal(read(d,'2026-11-15').activityDifference,-25.5);assert.equal(read(d,'2026-11-17').income,190000);
  d.incomes['2026-11'].receivedOn='2026-11-14';assert.equal(read(d,'2026-11-14').income,380000.125);assert.equal(read(d,'2026-11-15').income,0);
  assert.equal(read(d,'2026-12-15').income,0);delete d.incomes['2026-10'];assert.equal(read(d,'2026-11-04').income,0);assert.equal(read(d,'2026-11-04').activityDifference,-5871);
});

test('cycle counts paid purchases and actual statement payments once, excludes fees, transfers and non-income receipts',()=>{
  const d=statsFixture(),before=structuredClone(d),detail=read(d,'2026-11-04');
  assert.equal(detail.income,143.335);assert.equal(detail.summary.expense,70.25);assert.equal(detail.settlementTotal,100);assert.equal(detail.activityDifference,-26.915);assert.equal(detail.outflow,150.25);assert.equal(detail.cashDifference,-6.915);
  assert.equal(read(d,'2026-11-03').settlementTotal,0);assert.equal(detail.plannedTotal,12.5);assert.equal(detail.upcomingStatements.length,0);assert.equal(detail.unknownStatements.length,0);assert.deepEqual(d,before);
  undoSettlement(d,'2026-10');assert.equal(read(d,'2026-11-04').settlementTotal,0);assert.equal(read(d,'2026-11-04').activityDifference,73.085);assert.equal(read(d,'2026-11-04').summary.expense,70.25);
});

test('role projection and separate books/currencies remain isolated; module toggles do not erase recorded salary',()=>{
  const d=statsFixture(),result=read(d,'2026-11-04',false);assert.equal(result.activityDifference,93.085);assert.equal(result.settlements.length,0);assert(!JSON.stringify(result).includes('PRIVATE'));assert.deepEqual(read(d,'2026-11-04','true'),result);
  assert(salaryCycleEnabled(d));assert(!salaryCycleEnabled(d.regional.vietnam));d.bookSettings.modules.salary=false;assert(salaryCycleEnabled(d));
  const vn=structuredClone(d.regional.vietnam);vn.bookSettings.modules.salary=true;assert.equal(read(vn,'2026-11-04').activityDifference,-123456.789);assert.deepEqual(d.regional.vietnam.days,vn.days);
});

test('pay cycle supports year/month/leap boundaries and hidden years without changing the document',()=>{
  const d=salaryCycleFixture();d.years=[2027];d.incomes={'2026-12':{salary:10,bonus:0,note:''}};d.days={'2027-01-01':{note:'',items:[{id:'new-year',title:'New year',amount:0.005,status:'paid',paymentMethod:'bank'}]}};
  assert.deepEqual(read(d,'2027-01-01').cycle,{start:'2026-12-15',end:'2027-01-14',asOf:'2027-01-01'});assert.equal(read(d,'2027-01-01').activityDifference,9.995);
  assert.deepEqual(salaryCycleRange('2028-02-29'),{start:'2028-02-15',end:'2028-03-14',asOf:'2028-02-29'});
  assert.equal(salaryCycleRange('1900-01-01').start,'1899-12-15');assert.equal(salaryCycleRange('9999-12-31').end,'9999-12-31');
  for(const invalid of ['2026-02-30','not-a-date',null])assert.throws(()=>salaryCycleRange(invalid));
});
