import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORIES,normalizeData,addDebt,repayDebt} from '../src/model.js';
import {newRegionalBook} from '../src/region-model.js';
import {sourceCategoryDetails} from '../src/stats-model.js';
import {cashPeriodDetails} from '../src/cash-model.js';
import {saveStatement} from '../src/card-model.js';
import {recordCardPayment} from '../src/card-ledger.js';
const fixture=()=>{const d=newRegionalBook('JP');d.accounts={openedOn:'2026-01-01',bank:1000000,cash:100000,savings:10000,creditDebt:0,creditLimit:null,transfers:[]};return d;};
const options={year:2026,month:10,asOf:'2026-11-12',creditAllowed:true};
const group=(rows,source)=>rows.find(r=>r.source===source);
const amount=(rows,source,category)=>group(rows,source).categories.find(r=>r.category===category).amount;
const row=(id,source,category,amount,status='paid')=>({id,title:id,paymentMethod:source,category,amount,status,...(source==='card'?{creditTracking:true}:{})});
test('all default categories, zeros and custom categories appear under each source; exclude plans, transfers, reserve and future dates',()=>{
 const d=fixture();d.days['2026-11-05']={note:'Keep note',items:[row('bank','bank','Ăn uống',100),row('cash','cash','Ăn uống',20),row('card','card','Giải trí',30),row('custom','bank','Học phí',40),row('legacy','cash',undefined,5),row('plan','bank','Planned secret',999,'planned'),row('void','card','Cancelled secret',999,'cancelled'),row('draft','cash','Draft secret',999,'draft'),row('reserve','savings','Reserve secret',50),{...row('move','bank','Transfer secret',100),movement:'withdraw'}]};
 d.days['2026-11-13']={note:'',items:[row('future','bank','Future secret',999)]};d.days['2026-10-01']={note:'',items:[row('outside','bank','Other month',999)]};
 d.incomes['2026-11']={salary:15000,bonus:0,receivedOn:'2026-11-05'};d.receipts=[{id:'loan',type:'borrow',source:'bank',amount:15000,date:'2026-11-05',note:''}];
 d.accounts.transfers.push({id:'save',date:'2026-11-05',from:'bank',to:'savings',amount:100});
 const before=structuredClone(d),groups=sourceCategoryDetails(d,options);
 assert.deepEqual(groups.map(r=>r.source),['bank','cash','card']);
 for(const g of groups)assert.deepEqual(g.categories.map(r=>r.category),[...CATEGORIES,'Học phí']);
 assert.equal(amount(groups,'bank','Ăn uống'),100);assert.equal(amount(groups,'cash','Ăn uống'),20);assert.equal(amount(groups,'card','Ăn uống'),0);assert.equal(amount(groups,'cash','Khác'),5);assert.equal(amount(groups,'card','Giải trí'),30);
 assert.deepEqual(groups.map(r=>r.total),[140,25,30]);assert.equal(groups[0].total+groups[1].total,cashPeriodDetails(d,options).actualCashOut);assert.deepEqual(d,before);
});
test('debt principal plus interest and partial legacy card payments are categorized once under their actual source',()=>{
 const d=fixture();addDebt(d,{id:'loan',title:'Debt',type:'Khác',amount:1000});repayDebt(d,'loan',{id:'p',date:'2026-11-05',source:'cash',amount:100,interest:5});
 d.days['2026-11-05'].items.push(row('daily-card-payment','bank','Thanh toán thẻ',200));
 saveStatement(d,{month:'2026-11',priorBalance:1000,newRibo:0,principal:200,fees:30,oneOff:300,dueDate:'2026-11-27',confirmedOn:'2026-11-01',status:'confirmed',note:''});
 recordCardPayment(d,'2026-11',{id:'first',date:'2026-11-06',source:'bank',amount:150});recordCardPayment(d,'2026-11',{id:'second',date:'2026-11-07',source:'cash',amount:100});
 const normalized=normalizeData(d),before=structuredClone(normalized),groups=sourceCategoryDetails(normalized,options);
 assert.equal(amount(groups,'cash','Trả nợ'),105);assert.equal(amount(groups,'bank','Thanh toán thẻ'),350);assert.equal(amount(groups,'cash','Thanh toán thẻ'),100);assert.deepEqual(groups.map(g=>g.total),[350,205,0]);assert.equal(groups[0].total+groups[1].total,cashPeriodDetails(normalized,options).actualCashOut);assert.deepEqual(normalized,before);
});
test('year aggregates use exact legacy fractions and include archived months only through cutoff; month remains isolated',()=>{
 const d=fixture();d.years=[2027];for(const [date,id,value]of [['2026-01-05','jan',0.1],['2026-11-05','nov',0.2],['2026-11-06','nov2',0.001],['2026-12-05','dec',100],['2025-11-05','old',100]])d.days[date]={note:'',items:[row(id,'bank','Ăn uống',value)]};
 assert.equal(sourceCategoryDetails(d,options)[0].total,0.201);assert.equal(sourceCategoryDetails(d,{...options,month:null})[0].total,0.301);
 const empty=sourceCategoryDetails(fixture(),options);assert.equal(empty.length,3);for(const g of empty){assert.equal(g.total,0);assert.equal(g.categories.length,CATEGORIES.length);}
});
test('permissions fail closed and custom credit categories never leak into ordinary source lists',()=>{
 const d=fixture();d.days['2026-11-05']={note:'',items:[row('bank','bank','Ăn uống',100),row('credit','card','PRIVATE CREDIT CATEGORY',900),row('payment','cash','Thanh toán thẻ',500)]};
 for(const creditAllowed of [false,undefined,'true',1]){
  const groups=sourceCategoryDetails(d,{...options,creditAllowed});assert.deepEqual(groups.map(r=>r.source),['bank','cash']);assert.equal(groups[0].total,100);assert.equal(groups[1].total,0);assert(!JSON.stringify(groups).includes('PRIVATE'));
 }
 assert.equal(amount(sourceCategoryDetails(d,options),'card','PRIVATE CREDIT CATEGORY'),900);
});
