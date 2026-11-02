import test from 'node:test';
import assert from 'node:assert/strict';
import { YEARS, amount, dayKey, daysInMonth, monthSummary, yearSummary, emptyData, normalizeData, MAX_AMOUNT } from '../src/model.js';

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
  assert.deepEqual(monthSummary(data,2026,0), {salary:10000000,bonus:2000000,expense:850000,balance:11150000,count:3});
  assert.deepEqual(yearSummary(data,2026), {salary:22000000,bonus:2000000,expense:3850000,balance:20150000,count:4});
  data.days['2026-01-01'].items.splice(0,1);
  assert.equal(monthSummary(data,2026,0).expense,650000);
  assert.deepEqual(yearSummary(data,2033), {salary:0,bonus:0,expense:0,balance:0,count:0});
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
  assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(data))),data);
  data.days['2026-02-29'] = {note:'invalid',items:[]};
  data.days['2034-01-01'] = {items:[]};
  assert.equal(Object.keys(normalizeData(data).days).length,1);
  assert.throws(() => normalizeData({version:2,days:{},incomes:{}}));
  assert.throws(() => normalizeData(null));
});
