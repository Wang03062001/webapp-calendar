import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeData,savingsTargets,savingsToDate,monthSummary,yearSummary} from '../src/model.js';
import {newRegionalBook,readBook,writeBook,configureBook} from '../src/region-model.js';
import {accountBalances} from '../src/account-model.js';
import {cashPeriodDetails} from '../src/cash-model.js';
import {validateMoneyChanges} from '../src/finance-validation.js';
import {resetFinancialDocument} from '../src/reset-model.js';
import {reportSheets} from '../src/excel-report.js';
const fixture=()=>{const d=newRegionalBook('JP');d.currencies.savings='VND';d.savings={'2026-10':1000,'2026-11':2000};d.goals={'2026':12000};d.accounts={openedOn:'2026-01-01',bank:100000,cash:1000,savings:500,creditDebt:0,creditLimit:null,transfers:[]};return d;};
test('monthly targets are independent of annual goals, exact, nonnegative and optional for old documents',()=>{
 const d=fixture(),old=normalizeData(d);assert.equal(old.monthlySavingsGoals,undefined);
 assert.deepEqual(savingsTargets(old,2026,10),{month:{goal:null,saved:2000,remaining:null},year:{goal:12000,saved:3000,remaining:9000}});
 d.monthlySavingsGoals={'2026-11':5000,'2026-12':99999};const n=normalizeData(d);
 assert.deepEqual(savingsTargets(n,2026,10).month,{goal:5000,saved:2000,remaining:3000});assert.equal(savingsTargets(n,2026,10).year.goal,12000);
 n.monthlySavingsGoals['2026-11']=1000;assert.equal(savingsTargets(n,2026,10).month.remaining,0);
 n.savings['2026-11']=0.222;n.monthlySavingsGoals['2026-11']=1.111;assert.equal(savingsTargets(n,2026,10).month.remaining,0.889);
 assert.throws(()=>savingsTargets(n,2026,12));
});
test('adding or editing targets changes no saved totals, cash events, credit or source stock; both books round trip',()=>{
 const d=fixture();d.regional={vietnam:newRegionalBook('VN')};d.regional.vietnam.monthlySavingsGoals={'2026-11':800000};const before=structuredClone(d);
 let n=normalizeData({...d,monthlySavingsGoals:{'2026-11':5000}});
 for(const read of [x=>accountBalances(x,'2026-11-16'),x=>cashPeriodDetails(x,{year:2026,month:10,asOf:'2026-11-16',creditAllowed:true}),x=>savingsToDate(x,'2026-11-16'),x=>monthSummary(x,2026,10),x=>yearSummary(x,2026)])assert.deepEqual(read(n),read(before));
 assert.deepEqual(readBook(n,'vietnam'),before.regional.vietnam);assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(n))),n);
 const foreign=readBook(n,'foreign'),vn=readBook(n,'vietnam');vn.monthlySavingsGoals['2026-11']=900000;n=normalizeData(writeBook(n,'vietnam',vn));assert.deepEqual(readBook(n,'foreign'),foreign);
 assert.equal(resetFinancialDocument(n,'2026-11-01','2026-11-16').monthlySavingsGoals,undefined);
 assert.throws(()=>configureBook({...newRegionalBook('JP'),monthlySavingsGoals:{'2026-11':100}},'GB',{}),/Không thể đổi/);
});
test('invalid imported targets fail without mutation; money validation uses savings currency and preserves legacy fractions',()=>{
 for(const raw of [null,[],1,{'2026-13':1},{'2026-1':1},{'2026-11':-1},{'2026-11':NaN},{'2026-11':Infinity},{'2026-11':'100'},{'2026-11':0.0001}])assert.throws(()=>normalizeData({...fixture(),monthlySavingsGoals:raw}));
 const before=fixture(),next={...fixture(),monthlySavingsGoals:{'2026-11':1.111}};assert.throws(()=>validateMoneyChanges(before,next));validateMoneyChanges(next,structuredClone(next));
 const euro={...fixture(),currencies:{cash:'JPY',savings:'EUR'}};validateMoneyChanges(euro,{...euro,monthlySavingsGoals:{'2026-11':1.111}});
});
test('Excel includes monthly plans in each savings currency without altering accumulated savings',()=>{
 const d=fixture();d.monthlySavingsGoals={'2026-11':5000};d.regional={vietnam:newRegionalBook('VN')};d.regional.vietnam.monthlySavingsGoals={'2026-11':800000};
 const sheets=reportSheets(d,{asOf:'2026-11-16',creditAllowed:false}),rows=sheets.find(s=>s.name==='Tiết kiệm cũ và mục tiêu').rows;
 assert(rows.some(r=>r[2]==='Mục tiêu tháng'&&r[1]==='VND'&&r[4]===5000));assert(rows.some(r=>r[2]==='Mục tiêu tháng'&&r[4]===800000));
 const total=sheets.find(s=>s.name==='Tổng tiết kiệm').rows;assert.equal(total[1][4],3000);assert.equal(total[2][4],0);
});
