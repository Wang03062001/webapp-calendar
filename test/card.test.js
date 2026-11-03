import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, normalizeData, monthSummary } from '../src/model.js';
import { shiftMonth, expectedPaymentDate, cardDate, defaultCards, projectedStatement, statementNumbers, saveStatement, settleStatement, undoSettlement, cardCashflow } from '../src/card-model.js';
const source = overrides => ({ month:'2026-02', priorBalance:1000, newRibo:50, principal:100, fees:15, oneOff:200, dueDate:'2026-02-27', confirmedOn:'2026-02-20', status:'confirmed', note:'Đối chiếu', ...overrides });

test('statement separates one-off, revolving principal and fees; principal alone reduces liability',()=>{
 const data=emptyData();data.incomes['2026-02']={salary:2000,bonus:0,note:''};
 data.days['2026-01-10']={note:'Giữ lại',items:[{id:'buy',title:'Mua hàng',amount:200,status:'paid',paymentMethod:'card',settlement:'oneoff',billingMonth:'2026-02'}]};
 saveStatement(data,source());assert.deepEqual(statementNumbers(data.cards.statements[0]),{total:315,carry:950});
 assert.equal(monthSummary(data,2026,0).expense,200);assert.equal(monthSummary(data,2026,1).expense,0);
 assert.equal(cardCashflow(data,'2026-02').reserved,315);assert.equal(cardCashflow(data,'2026-02').afterReserve,1685);
 settleStatement(data,'2026-02','2026-02-27');assert.equal(monthSummary(data,2026,1).expense,0);assert.equal(cardCashflow(data,'2026-02').paid,315);
 assert.equal(data.days['2026-01-10'].items.length,1);assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(data))),data);
 assert.throws(()=>settleStatement(data,'2026-02','2026-02-27'));assert.throws(()=>saveStatement(data,source()));
 undoSettlement(data,'2026-02');assert.equal(cardCashflow(data,'2026-02').paid,0);assert.equal(cardCashflow(data,'2026-02').reserved,315);assert.deepEqual(normalizeData(data),data);
});

test('fee editing moves one linked expense, preserves notes, and draft does not recognize a fee',()=>{
 const data=emptyData();data.days['2026-02-20']={note:'Ghi chú',items:[{id:'x',title:'Khác',amount:7}]};saveStatement(data,source());saveStatement(data,source({fees:12,confirmedOn:'2026-02-21'}));
 assert.equal(data.days['2026-02-20'].note,'Ghi chú');assert.equal(data.days['2026-02-20'].items.length,1);assert.equal(data.days['2026-02-21'].items.length,1);assert.equal(monthSummary(data,2026,1).expense,7);
 saveStatement(data,source({status:'draft',confirmedOn:''}));assert.equal(monthSummary(data,2026,1).expense,7);assert.deepEqual(normalizeData(data),data);
 const before=structuredClone(data);assert.throws(()=>saveStatement(data,source({principal:2000})));assert.deepEqual(data,before);
});

test('new card purchases default to next-month one-off; explicit ribo is separate and planned excluded',()=>{
 const data=emptyData();data.days['2026-12-05']={note:'',items:[{id:'one',title:'Mua',amount:200,status:'paid',paymentMethod:'card'},{id:'ribo',title:'Ribo',amount:50,status:'paid',paymentMethod:'card',settlement:'ribo'},{id:'planned',title:'Dự kiến',amount:900,status:'planned',paymentMethod:'card'}]};
 const projection=projectedStatement(data,'2027-01');assert.equal(projection.oneOff,200);assert.equal(projection.newRibo,50);assert.equal(projection.principal,0);assert.equal(cardCashflow(data,'2027-01').estimatedReserve,200);
 assert.equal(monthSummary(data,2026,11).expense,250);assert.equal(cardCashflow(data,'2026-12').direct,0);assert.equal(shiftMonth('2026-12',1),'2027-01');
 assert.deepEqual(normalizeData(data),{...data,days:{...data.days,'2026-12-05':{...data.days['2026-12-05'],items:data.days['2026-12-05'].items.map(item=>({...item,settlement:item.settlement||'oneoff'}))}}});
});

test('bank payment is assigned to its actual month, not purchase or billing month',()=>{
 const data=emptyData();saveStatement(data,source({dueDate:'2026-03-02'}));settleStatement(data,'2026-02','2026-03-02');
 assert.equal(cardCashflow(data,'2026-02').paid,0);assert.equal(cardCashflow(data,'2026-03').paid,315);assert.equal(monthSummary(data,2026,2).expense,0);
 assert.equal(projectedStatement(data,'2026-03').priorBalance,950);
 undoSettlement(data,'2026-02');assert.equal(projectedStatement(data,'2026-03').priorBalance,1050);
});

test('calendar date helpers support month boundaries and configurable weekend policy',()=>{
 assert.equal(expectedPaymentDate('2026-06'),'2026-06-26');assert.equal(expectedPaymentDate('2026-09'),'2026-09-25');
 assert.equal(expectedPaymentDate('2026-09',{...defaultCards(),weekend:'next'}),'2026-09-28');assert.equal(expectedPaymentDate('2026-09',{...defaultCards(),weekend:'none'}),'2026-09-27');
 assert.equal(cardDate('2026-02-30'),false);assert.equal(cardDate('2026-02-99'),false);assert.equal(cardDate('2028-02-29'),true);
});

test('credit and salary metadata survive backups; malformed links and duplicate statements reject',()=>{
 const data=emptyData();data.incomes['2026-02']={salary:2000,bonus:0,note:'Lương cũ',earnedMonth:'2026-01',receivedOn:'2026-02-15'};saveStatement(data,source());assert.deepEqual(normalizeData(data),data);
 const broken=structuredClone(data);broken.days['2026-02-20'].items[0].amount=1;assert.throws(()=>normalizeData(broken),/không khớp/);
 const missing=structuredClone(data);delete missing.days['2026-02-20'];assert.throws(()=>normalizeData(missing),/Thiếu/);
 const duplicate=structuredClone(data);duplicate.cards.statements.push(source());assert.throws(()=>normalizeData(duplicate));
 const legacy=emptyData();assert.deepEqual(normalizeData(legacy),legacy);
});
