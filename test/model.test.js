import test from 'node:test';
import assert from 'node:assert/strict';
import { YEARS, getYears, addYear, removeYear, amount, formatAmount, dayKey, daysInMonth, monthSummary, yearSummary, savingsProgress, emptyData, normalizeData, MAX_AMOUNT, addDebt, repayDebt, debtBalance, updateDebt, removeDebt, cancelDebtPayment, debtDueStatus, expenseRows, expenseStatus } from '../src/model.js';

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
  assert.deepEqual(monthSummary(data,2026,0), {salary:10000000,bonus:2000000,expense:850000,savings:0,balance:11150000,count:3,planned:0,plannedCount:0});
  assert.deepEqual(yearSummary(data,2026), {salary:22000000,bonus:2000000,expense:3850000,savings:0,balance:20150000,count:4,planned:0,plannedCount:0});
  data.days['2026-01-01'].items.splice(0,1);
  assert.equal(monthSummary(data,2026,0).expense,650000);
  assert.deepEqual(yearSummary(data,2033), {salary:0,bonus:0,expense:0,savings:0,balance:0,count:0,planned:0,plannedCount:0});
});
test('negative balances are retained; monetary input is finite and nonnegative with three decimals', () => {
  for (const invalid of [-1,NaN,Infinity,'abc']) assert.equal(amount(invalid),0);
  assert.equal(amount(1.7),1.7);
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
  assert.deepEqual(monthSummary(data,2026,0), {salary:10000000,bonus:1000000,expense:2000000,savings:3000000,balance:9000000,count:1,planned:0,plannedCount:0});
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

test('money uses comma thousands and only necessary decimal digits without changing its unit', () => {
 assert.equal(formatAmount(1000000),'1,000,000');assert.equal(formatAmount(0),'0');
 assert.equal(formatAmount(1234.5),'1,234.5');assert.equal(formatAmount(-1234.567),'-1,234.567');
 assert.equal(amount('1,000,000.123'),1000000.123);assert.equal(amount('1,234.5678'),1234.568);
 assert.equal(amount('invalid'),0);assert.equal(amount('-1,000'),0);
});
test('fractional amounts total to three decimals and survive backups', () => {
 const data=emptyData();data.days['2026-01-01']={note:'',items:[{id:'a',title:'A',amount:0.1},{id:'b',title:'B',amount:0.2}]};
 data.incomes['2026-01']={salary:1.1,bonus:0.2,note:''};data.savings['2026-01']=0.123;data.goals['2026']=1.234;
 assert.equal(monthSummary(data,2026,0).expense,0.3);assert.equal(yearSummary(data,2026).balance,1);
 assert.equal(savingsProgress(data,2026).remaining,1.111);assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(data))),data);
});

test('multiple debt types retain separate balances and payments become dated JPY expenses', () => {
 const data=emptyData();
 addDebt(data,{id:'loan',title:'Mua xe',type:'Vay cá nhân',amount:1000.125});
 addDebt(data,{id:'card',title:'Thẻ A',type:'Thẻ tín dụng',amount:2000});
 data.incomes['2026-01']={salary:5000,bonus:0,note:''};data.savings['2026-01']=1000000;
 assert.deepEqual(repayDebt(data,'loan',{id:'p1',date:'2026-01-15',amount:'250.125'}),{paid:250.125,remaining:750});
 assert.equal(data.debts[0].payments[0].expenseId,data.days['2026-01-15'].items[0].id);
 assert.equal(monthSummary(data,2026,0).expense,250.125);assert.equal(monthSummary(data,2026,0).balance,4749.875);
 assert.equal(monthSummary(data,2026,0).savings,1000000);assert.equal(monthSummary(data,2026,1).expense,0);
 assert.deepEqual(debtBalance(data.debts[1]),{paid:0,remaining:2000});
 assert.deepEqual(repayDebt(data,'loan',{id:'p2',date:'2026-02-01',amount:750}),{paid:1000.125,remaining:0});
 assert.equal(monthSummary(data,2026,1).expense,750);assert.equal(yearSummary(data,2026).expense,1000.125);
 assert.equal(yearSummary(data,2027).expense,0);
 const restored=normalizeData(JSON.parse(JSON.stringify(data)));assert.deepEqual(restored,data);
 assert.equal(yearSummary(normalizeData(restored),2026).expense,1000.125);
});

test('invalid, repeated and excess repayments cannot mutate debts or expenses', () => {
 const data=emptyData();addDebt(data,{id:'a',title:'Khoản vay',type:'Khác',amount:100});
 for(const payment of [{id:'p',date:'2026-02-29',amount:10},{id:'p',date:'2026-01-01',amount:101},{id:'p',date:'2026-01-01',amount:-1},{id:'p',date:'2026-01-01',amount:0},{id:'p',date:'2026-01-01',amount:0.1234}]) {
  const before=structuredClone(data);assert.throws(()=>repayDebt(data,'a',payment));assert.deepEqual(data,before);
 }
 repayDebt(data,'a',{id:'p',date:'2026-01-01',amount:40});const before=structuredClone(data);
 assert.throws(()=>repayDebt(data,'a',{id:'p',date:'2026-01-01',amount:40}),/đã được ghi nhận/);assert.deepEqual(data,before);
 assert.throws(()=>addDebt(data,{id:'a',title:'Trùng',type:'Khác',amount:100}));
 repayDebt(data,'a',{id:'rest',date:'2026-01-01',amount:60});const paid=structuredClone(data);
 assert.throws(()=>repayDebt(data,'a',{id:'extra',date:'2026-01-02',amount:1}));assert.deepEqual(data,paid);
});

test('debt history crosses years, restores archived payment years and validates linked backups', () => {
 const data=emptyData();addDebt(data,{id:'a',title:'Dài hạn',type:'Vay ngân hàng',amount:1000});
 repayDebt(data,'a',{id:'p',date:'2034-02-01',amount:100});assert.equal(getYears(data).includes(2034),true);
 assert.equal(yearSummary(data,2034).expense,100);assert.equal(yearSummary(data,2026).expense,0);
 removeYear(data,2034);const restored=normalizeData(data);assert.equal(getYears(restored).includes(2034),false);
 assert.deepEqual(debtBalance(restored.debts[0]),{paid:100,remaining:900});assert.deepEqual(restored,data);
 const broken=structuredClone(data);broken.days['2034-02-01'].items[0].amount=1;
 assert.throws(()=>normalizeData(broken),/không khớp/);
 const duplicate=structuredClone(data);duplicate.days['2034-02-02']={note:'',items:[{...duplicate.days['2034-02-01'].items[0]}]};
 assert.throws(()=>normalizeData(duplicate),/không khớp/);
 const orphan=structuredClone(data);orphan.debts=[];assert.throws(()=>normalizeData(orphan),/không khớp/);
 assert.throws(()=>normalizeData({...emptyData(),debts:{}}));
 const legacy=emptyData();delete legacy.debts;assert.deepEqual(normalizeData(legacy).debts,[]);
});

test('planned expenses stay outside actual spending and balance; legacy records keep their totals', () => {
 const data=emptyData();data.incomes['2026-01']={salary:1000,bonus:100,note:''};
 data.days['2026-01-03']={note:'',items:[{id:'old',title:'Cũ',amount:100},{id:'new',title:'Mới',amount:200,status:'planned',category:'Nhà ở'}]};
 assert.equal(expenseStatus(data.days['2026-01-03'].items[0]),'paid');
 assert.equal(monthSummary(data,2026,0).expense,100);assert.equal(monthSummary(data,2026,0).planned,200);
 assert.equal(monthSummary(data,2026,0).balance,1000);assert.equal(monthSummary(data,2026,0).plannedCount,1);
 assert.equal(yearSummary(data,2026).planned,200);assert.equal(monthSummary(data,2026,1).planned,0);
 assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(data))),data);
 data.days['2026-01-03'].items[1].status='paid';
 assert.equal(monthSummary(data,2026,0).expense,300);assert.equal(monthSummary(data,2026,0).planned,0);assert.equal(monthSummary(data,2026,0).balance,800);
});

test('expense search is accent insensitive and combines period, category and status filters', () => {
 const data=emptyData();data.days['2026-01-01']={note:'',items:[{id:'a',title:'Đóng tiền nhà',amount:100,category:'Nhà ở',status:'planned'},{id:'b',title:'Ăn sáng',amount:10,category:'Ăn uống',status:'paid'}]};
 data.days['2026-02-01']={note:'',items:[{id:'c',title:'Tiền nhà',amount:200,category:'Nhà ở'}]};
 data.days['2027-01-01']={note:'',items:[{id:'d',title:'Tiền nhà',amount:300,category:'Nhà ở'}]};
 assert.deepEqual(expenseRows(data,2026,0,{query:'dong tien nha',category:'Nhà ở',status:'planned'}).map(item=>item.id),['a']);
 assert.equal(expenseRows(data,2026,0,{query:'ăn',category:'Nhà ở'}).length,0);
 assert.deepEqual(expenseRows(data,2026,null,{category:'Nhà ở'}).map(item=>item.id),['c','a']);
});

test('editing a debt preserves history, updates linked titles, and rejects invalid changes atomically', () => {
 const data=emptyData();addDebt(data,{id:'a',title:'Cũ',type:'Khác',amount:100,dueDate:'2026-12-31'});repayDebt(data,'a',{id:'p',date:'2026-01-01',amount:40});
 const before=structuredClone(data);assert.throws(()=>updateDebt(data,'a',{title:'Mới',type:'Vay',amount:30}));assert.deepEqual(data,before);
 assert.throws(()=>updateDebt(data,'a',{title:'Mới',type:'Vay',amount:100,dueDate:'2026-02-29'}));assert.deepEqual(data,before);
 updateDebt(data,'a',{title:'Mới',type:'Vay ngân hàng',amount:150,dueDate:'2027-01-01'});
 assert.deepEqual(data.debts[0].payments,before.debts[0].payments);assert.equal(debtBalance(data.debts[0]).remaining,110);
 assert.equal(data.days['2026-01-01'].items[0].title,'Trả nợ: Mới');assert.equal(monthSummary(data,2026,0).expense,40);
 assert.deepEqual(normalizeData(data),data);updateDebt(data,'a',{title:'Mới',type:'Khác',amount:150,dueDate:''});assert.equal(data.debts[0].dueDate,undefined);
});

test('cancelling a payment reverses only its linked expense and retains auditable history across reload', () => {
 const data=emptyData();addDebt(data,{id:'a',title:'Vay',type:'Khác',amount:100});
 data.days['2026-01-01']={note:'Giữ ghi chú',items:[{id:'manual',title:'Trả nợ: Vay',amount:40}]};
 repayDebt(data,'a',{id:'p',date:'2026-01-01',amount:40});repayDebt(data,'a',{id:'rest',date:'2026-02-01',amount:60});
 assert.equal(debtBalance(data.debts[0]).remaining,0);assert.deepEqual(cancelDebtPayment(data,'a','p'),{paid:60,remaining:40});
 assert.equal(data.days['2026-01-01'].note,'Giữ ghi chú');assert.deepEqual(data.days['2026-01-01'].items.map(item=>item.id),['manual']);
 assert.equal(monthSummary(data,2026,0).expense,40);assert.equal(monthSummary(data,2026,1).expense,60);
 assert.equal(data.debts[0].payments[0].voided,true);assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(data))),data);
 const before=structuredClone(data);assert.throws(()=>cancelDebtPayment(data,'a','p'));assert.deepEqual(data,before);
 repayDebt(data,'a',{id:'again',date:'2026-03-01',amount:40});assert.equal(debtBalance(data.debts[0]).remaining,0);assert.deepEqual(normalizeData(data),data);
 assert.throws(()=>removeDebt(data,'a'),/lịch sử/);addDebt(data,{id:'empty',title:'Nhầm',type:'Khác',amount:10});removeDebt(data,'empty');assert.equal(data.debts.length,1);
});

test('payment cancellation refuses a broken link without partially changing either ledger', () => {
 const data=emptyData();addDebt(data,{id:'a',title:'Vay',type:'Khác',amount:100});repayDebt(data,'a',{id:'p',date:'2026-01-01',amount:40});data.days['2026-01-01'].items[0].amount=20;
 const before=structuredClone(data);assert.throws(()=>cancelDebtPayment(data,'a','p'),/không khớp/);assert.deepEqual(data,before);
 const planned=structuredClone(before);planned.days['2026-01-01'].items[0].amount=40;planned.days['2026-01-01'].items[0].status='planned';assert.throws(()=>normalizeData(planned),/không khớp/);
});

test('due-date filters handle today, seven days, overdue, year boundaries and completed debts', () => {
 const data=emptyData();addDebt(data,{id:'a',title:'Vay',type:'Khác',amount:100,dueDate:'2027-01-02'});const debt=data.debts[0];
 assert.equal(debtDueStatus(debt,'2026-12-25'),'outstanding');assert.equal(debtDueStatus(debt,'2026-12-26'),'soon');
 assert.equal(debtDueStatus(debt,'2027-01-02'),'soon');assert.equal(debtDueStatus(debt,'2027-01-03'),'overdue');
 repayDebt(data,'a',{id:'p',date:'2027-01-03',amount:100});assert.equal(debtDueStatus(debt,'2027-01-04'),'paid');
 cancelDebtPayment(data,'a','p');assert.equal(debtDueStatus(debt,'2027-01-04'),'overdue');assert.deepEqual(normalizeData(data),data);
});
