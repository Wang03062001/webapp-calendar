import test from 'node:test';
import assert from 'node:assert/strict';
import { YEARS, getYears, addYear, removeYear, amount, dayKey, daysInMonth, monthSummary, yearSummary, savingsProgress, emptyData, normalizeData, MAX_AMOUNT } from '../src/model.js';

test('calendar covers 2026–2033 and handles leap years', () => {
  assert.deepEqual(YEARS, [2026,2027,2028,2029,2030,2031,2032,2033]);
  assert.equal(daysInMonth(2026, 1), 28);
  assert.equal(daysInMonth(2028, 1), 29);
  assert.equal(daysInMonth(2032, 1), 29);
  assert.equal(daysInMonth(2033, 3), 30);
  assert.equal(dayKey(2028, 1, 29), '2028-02-29');
});
test('monthly and yearly totals isolate years, aggregate salary, bonus and expenses', () => {
  const data = emptyData();
  data.days['2026-01-01'] = {note: '', items: [{title:'Gạo',amount:200000},{title:'Sách',amount:150000}]};
  data.days['2026-01-02'] = {note: '', items: [{title:'Điện',amount:500000}]};
  data.days['2026-02-28'] = {note: '', items: [{title:'Nhà',amount:3000000}]};
  data.days['2027-01-01'] = {note: '', items: [{title:'Khác',amount:99000000}]};
  data.incomes['2026-01'] = {salary:10000000,bonus:2000000};
  data.incomes['2026-02'] = {salary:12000000,bonus:0};
  assert.deepEqual(monthSummary(data,2026,0), {salary:10000000,bonus:2000000,expense:850000,savings:0,balance:11150000,count:3});
  assert.deepEqual(yearSummary(data,2026), {salary:22000000,bonus:2000000,expense:3850000,savings:0,balance:20150000,count:4});
  data.days['2026-01-01'].items.splice(0,1);
  assert.equal(monthSummary(data,2026,0).expense,650000);
  assert.deepEqual(yearSummary(data,2033), {salary:0,bonus:0,expense:0,savings:0,balance:0,count:0});
});
test('negative balances are retained; monetary input is finite, whole and nonnegative', () => {
  for (const invalid of [-1,NaN,Infinity,'abc']) assert.equal(amount(invalid),0);
  assert.equal(amount(1.7),2);
  assert.equal(amount(1e20),MAX_AMOUNT);
  const data = emptyData();
  data.days['2026-01-01'] = {items:[{amount:500}]};
  assert.equal(yearSummary(data,2026).balance,-500);
});
test('backup round trips notes and rows, rejects invalid dates and versions', () => {
  const data = emptyData();
  data.days['2028-02-29'] = {note:'Ghi chú tiếng Việt <b>',items:[{id:'1',title:'Mua sách',amount:100000}]};
  data.incomes['2028-02'] = {salary:10000000,bonus:500000,note:'Thưởng Tết'};
  data.savings['2028-02'] = 2000000;
  data.goals['2028'] = 24000000;
  assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(data))),data);
  data.days['2026-02-29'] = {note:'invalid',items:[]};
  data.days['10000-01-01'] = {items:[]};
  assert.equal(Object.keys(normalizeData(data).days).length,1);
  assert.throws(() => normalizeData({version:3,days:{},incomes:{}}));
  assert.throws(() => normalizeData(null));
});
test('VND savings aggregate separately and never reduce a JPY balance', () => {
  const data = emptyData();
  data.incomes['2026-01'] = {salary:10000000,bonus:1000000};
  data.days['2026-01-01'] = {items:[{amount:2000000}]};
  data.savings = {'2026-01':3000000,'2026-02':1000000,'2027-01':9000000};
  assert.deepEqual(monthSummary(data,2026,0), {salary:10000000,bonus:1000000,expense:2000000,savings:3000000,balance:9000000,count:1});
  assert.equal(monthSummary(data,2026,1).balance,0);
  assert.equal(yearSummary(data,2026).savings,4000000);
  assert.equal(yearSummary(data,2026).balance,9000000);
  assert.equal(yearSummary(data,2026).expense,2000000);
});
test('annual savings progress handles no goal, partial, reached, exceeded and separate years', () => {
  const data = emptyData();
  assert.deepEqual(savingsProgress(data,2026),{saved:0,goal:0,remaining:0,percent:0});
  data.savings['2026-01'] = 3000000;
  data.goals['2026'] = 12000000;
  assert.deepEqual(savingsProgress(data,2026),{saved:3000000,goal:12000000,remaining:9000000,percent:25});
  data.savings['2026-02'] = 9000000;
  assert.equal(savingsProgress(data,2026).percent,100);
  data.savings['2026-03'] = 3000000;
  assert.equal(savingsProgress(data,2026).percent,125);
  assert.equal(savingsProgress(data,2026).remaining,0);
  assert.equal(savingsProgress(data,2027).saved,0);
  data.goals['2026'] = 0;
  assert.deepEqual(savingsProgress(data,2026),{saved:15000000,goal:0,remaining:0,percent:0});
});
test('version 1 storage and backups migrate without losing financial data', () => {
  const legacy = {version:1,days:{'2026-01-01':{note:'Cũ',items:[{id:'a',title:'Điện',amount:500000}]}},incomes:{'2026-01':{salary:10000000,bonus:0,note:'Lương'}}};
  const migrated = normalizeData(legacy);
  assert.equal(migrated.version,2);
  assert.deepEqual(migrated.days,legacy.days);
  assert.deepEqual(migrated.incomes,legacy.incomes);
  assert.deepEqual(migrated.savings,{});
  assert.deepEqual(migrated.goals,{});
  assert.equal(yearSummary(migrated,2026).balance,9500000);
  const sanitized = normalizeData({...migrated,savings:{'2026-01':-1,'10000-01':100,'2026-02':'2000'},goals:{'2026':Infinity,'10000':10}});
  assert.deepEqual(sanitized.savings,{'2026-01':0,'2026-02':2000});
  assert.deepEqual(sanitized.goals,{'2026':0});
});

test('years can be added and archived without deleting financial records', () => {
 const data=emptyData();addYear(data,2034);assert.equal(getYears(data).at(-1),2034);
 data.days['2034-01-01']={note:'Giữ lại',items:[{id:'a',title:'JPY',amount:1000}]};
 data.incomes['2034-01']={salary:200000,bonus:10000,note:''};data.savings['2034-01']=1000000;data.goals['2034']=12000000;
 removeYear(data,2034);assert.equal(getYears(data).includes(2034),false);
 const backup=normalizeData(JSON.parse(JSON.stringify(data)));assert.equal(backup.days['2034-01-01'].note,'Giữ lại');
 assert.equal(getYears(backup).includes(2034),false);addYear(backup,2034);
 assert.equal(yearSummary(backup,2034).balance,209000);assert.equal(yearSummary(backup,2034).savings,1000000);
 assert.equal(savingsProgress(backup,2034).goal,12000000);
 assert.throws(()=>addYear(backup,2034),/đã có/);assert.throws(()=>addYear(backup,1899));assert.throws(()=>addYear(backup,10000));
});
test('year lists and new-year data survive backup normalization and legacy import', () => {
 const data=emptyData();data.years=[2028,2036];data.days['2036-02-29']={note:'Nhuận',items:[]};
 assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(data))),data);
 const legacy={version:2,days:{'2040-02-29':{note:'Imported',items:[]}},incomes:{},savings:{},goals:{}};
 assert.equal(getYears(normalizeData(legacy)).includes(2040),true);
 assert.throws(()=>normalizeData({...emptyData(),years:[]}));assert.throws(()=>normalizeData({...emptyData(),years:[2026,'2034']}));
 const single={...emptyData(),years:[2026]};assert.throws(()=>removeYear(single,2026),/ít nhất một năm/);
});
