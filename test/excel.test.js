import test from 'node:test';
import assert from 'node:assert/strict';
import {writeXlsx} from '../src/xlsx.js';
import {reportSheets,excelReport} from '../src/excel-report.js';
import {excelFixture,exportAsOf} from '../scripts/fixtures/excel.mjs';
import {monthSummary} from '../src/model.js';
import {financeView} from '../src/credit-access.js';
import {accountBalances,moneyOut} from '../src/account-model.js';
import {cashPeriodDetails} from '../src/cash-model.js';
import {salaryCycleDetails} from '../src/stats-model.js';
import {salaryCycleFixture} from '../scripts/fixtures/salary-cycle.mjs';
const options={asOf:exportAsOf,creditAllowed:true};
const sheet=(sheets,name)=>sheets.find(s=>s.name===name).rows;
const records=(sheets,name)=>{const [columns,...rows]=sheet(sheets,name);return rows.map(row=>Object.fromEntries(columns.map((column,i)=>[column,row[i]])));};
function unpack(bytes){
 const data=Buffer.from(bytes),result=new Map();let offset=0;
 while(data.readUInt32LE(offset)===0x04034b50){
  const size=data.readUInt32LE(offset+18),names=data.readUInt16LE(offset+26),extra=data.readUInt16LE(offset+28),name=data.subarray(offset+30,offset+30+names).toString(),start=offset+30+names+extra;
  assert.equal(data.readUInt16LE(offset+8),0);result.set(name,data.subarray(start,start+size).toString());offset=start+size;
 }
 assert.equal(data.readUInt32LE(offset),0x02014b50);assert.equal(data.readUInt32LE(data.length-22),0x06054b50);assert.equal(data.readUInt16LE(data.length-12),result.size);return result;
}
test('xlsx is an OOXML ZIP with numeric money, unicode, text IDs and no executable formulas',()=>{
 const files=unpack(writeXlsx([{name:'Thử Excel',rows:[['ID','Text','Money'],['00123','=1+2 日本語 😀 & <tag>',1234.567],['x','@SUM(A1:A2)\n_x0000_\u0001',0]]}]));
 assert(files.has('[Content_Types].xml'));assert.match(files.get('xl/workbook.xml'),/Thử Excel/);
 const xml=files.get('xl/worksheets/sheet1.xml');assert.match(xml,/<c r="C2" s="2" t="n"><v>1234.567<\/v>/);assert.match(xml,/<c r="A2"[^>]*t="inlineStr"[^>]*>.*00123/);assert.match(xml,/日本語 😀 &amp; &lt;tag&gt;/);assert.match(xml,/_x005F_x0000_/);assert.match(xml,/_x0001_/);assert(!/<f[\s>]/.test(xml));assert(![...files.values()].some(text=>/externalLink|vbaProject|hyperlink/.test(text)));assert.match(xml,/<autoFilter/);assert.match(xml,/state="frozen"/);
});

test('all regions/archived records/currencies and monthly financial totals match existing model',()=>{
 const data=excelFixture(),before=structuredClone(data),sheets=reportSheets(data,options),totals=records(sheets,'Tổng hợp tháng');
 for(const [label,book]of [['Sổ nước ngoài',data],['Sổ Việt Nam',data.regional.vietnam]]){
  const row=totals.find(r=>r['Khu vực']===label&&r['Tháng']==='2026-10'),expected=cashPeriodDetails(book,{year:2026,month:9,asOf:exportAsOf,creditAllowed:true});
  assert.equal(row['Tổng tiền thực chi'],expected.actualCashOut);assert.equal(row['Dự kiến thanh toán đã biết'],expected.plannedTotal);assert.equal(row['Biến động tài sản'],expected.cashChange);assert.equal(row['Tiền vào thực tế'],expected.actualCashIn);
 }
 assert(records(sheets,'Giao dịch').some(r=>r.ID==='archived'));assert(records(sheets,'Tiết kiệm cũ và mục tiêu').some(r=>r['Tiền tệ']==='VND'&&r['Kỳ']==='2024'));
 const vn=records(sheets,'Giao dịch').find(r=>r.ID==='vn');assert.equal(vn['Tiền tệ'],'VND');assert.equal(vn['Số tiền giao dịch'],123456.789);assert.deepEqual(data,before);
});

test('protected payments/transfers/fees do not double count costs; notes/history/nulls survive',()=>{
 const sheets=reportSheets(excelFixture(),options),rows=records(sheets,'Giao dịch');
 for(const row of rows.filter(r=>r['Loại giao dịch']==='Chuyển nội bộ'||r['Nguồn tiền']==='Thẻ tín dụng'))assert.equal(row['Tiền thực chi'],0);
 assert.equal(rows.find(r=>r['Loại giao dịch']==='Thanh toán sao kê')['Tiền thực chi'],31.5);
 assert(!rows.some(r=>r['Loại giao dịch']==='Phí sao kê'));assert.equal(records(sheets,'Sao kê thẻ')[0]['Tổng sao kê'],31.5);const summary=records(sheets,'Tổng hợp tháng').find(r=>r['Khu vực']==='Sổ nước ngoài'&&r['Tháng']==='2026-10');assert.equal(summary['Đã thanh toán thẻ'],31.5);assert.equal(summary['Tổng tiền thực chi'],moneyOut(excelFixture(),'2026-10'));
 const payment=records(sheets,'Lịch sử trả nợ').find(r=>r['ID lần trả']==='payment');assert.equal(payment['Tổng thanh toán'],10.125);assert.equal(records(sheets,'Lịch sử trả nợ').find(r=>r['ID lần trả']==='voided')['Đã hủy'],'Có');
 assert.equal(records(sheets,'Kế hoạch').find(r=>r['ID khoản vay']==='loan')['APR %'],0);assert.equal(records(sheets,'Kế hoạch').find(r=>r['ID khoản vay']==='loan')['Mức tối thiểu'],null);
 assert(records(sheets,'Ghi chú ngày').some(r=>r['Ghi chú'].includes('😀 & <tag>\nKeep newline')));assert.equal(records(sheets,'Lịch sử quỹ')[0]['Ghi chú'],'Fund audit');assert.equal(records(sheets,'Mốc số dư').find(r=>r.ID==='opening')['Ghi chú'],'Opening audit');assert.equal(records(sheets,'Khoản phải thu')[0]['Gốc còn lại'],95);assert.equal(records(sheets,'Đối chiếu')[0]['ID'],'close');assert.equal(records(sheets,'Số dư nguồn tiền').find(r=>r['Khu vực']==='Sổ nước ngoài')['Hạn mức khả dụng đang hiển thị'],4000);
});

test('ordinary export filters both books, credit loans/terms/statements/settings and uses projected balances',()=>{
 const data=excelFixture(),sheets=reportSheets(data,{...options,creditAllowed:false}),files=unpack(excelReport(data,{...options,creditAllowed:false})),text=[...files.values()].join('');
 for(const secret of ['PRIVATE CARD PURCHASE','PRIVATE CREDIT LOAN','PRIVATE STATEMENT NOTE','PRIVATE CARD NAME','private-limit','credit-loan','credit-payment'])assert(!text.includes(secret),secret);
 assert(!sheets.some(s=>s.name==='Sao kê thẻ'||s.name==='Lịch sử hạn mức'));assert(!sheet(sheets,'Số dư nguồn tiền')[0].includes('Hạn mức tín dụng'));
 const projected=financeView(data,false),row=records(sheets,'Số dư nguồn tiền').find(r=>r['Khu vực']==='Sổ nước ngoài'),b=accountBalances(projected,exportAsOf);assert.equal(row['Ngân hàng'],b.bank);assert.equal(row['Tiền mặt'],b.cash);
 assert.deepEqual(reportSheets(data,{...options,creditAllowed:'true'}),sheets);
});

test('draft status is explicit and report exports never alter cached/financial objects',()=>{
 const data=excelFixture(),before=structuredClone(data);const sheets=reportSheets(data,{...options,draft:true});assert.match(sheet(sheets,'Hướng dẫn').find(r=>r[0]==='Trạng thái dữ liệu')[1],/bản nháp/i);excelReport(data,options);assert.deepEqual(data,before);
});

test('cash report excludes future salary, retains a separate weekend-aware supplementary salary plan',()=>{
 const data=salaryCycleFixture(),before=structuredClone(data),sheets=reportSheets(data,{asOf:'2026-11-04',creditAllowed:true}),rows=records(sheets,'Kế hoạch kỳ lương');
 assert.equal(rows.length,1);assert.equal(rows[0]['Đầu kỳ dự kiến'],'2026-10-15');assert.equal(rows[0]['Cuối kỳ dự kiến'],'2026-11-12');assert.equal(rows[0]['Tiền vào thực tế đến ngày xem'],190000);assert.equal(rows[0]['Tiền ra thực tế đến ngày xem'],5871);
 const month=records(sheets,'Tổng hợp tháng').find(r=>r['Tháng']==='2026-11'&&r['Khu vực']==='Sổ nước ngoài');assert.equal(month['Tiền vào thực tế'],0);assert.equal(month['Tổng tiền thực chi'],4671);assert.equal(month['Biến động tài sản'],-4671);assert.deepEqual(data,before);
 const ordinary=reportSheets(excelFixture(),{...options,creditAllowed:false});assert(!ordinary.some(s=>s.name==='Thanh toán thẻ'||s.name==='Điều chỉnh thẻ'));assert(!records(ordinary,'Tổng hợp tháng').some(r=>Object.hasOwn(r,'Đã thanh toán thẻ')));
});

test('invalid dates, nonfinite numbers, oversized cells and duplicate/illegal sheet names fail explicitly',()=>{
 assert.throws(()=>reportSheets(excelFixture(),{asOf:'bad'}));assert.throws(()=>writeXlsx([{name:'x',rows:[['n'],[Infinity]]}]));assert.throws(()=>writeXlsx([{name:'x',rows:[['text'],['a'.repeat(32768)]]}]));assert.throws(()=>writeXlsx([{name:'x',rows:[['a']]},{name:'X',rows:[['b']]}]));assert.throws(()=>writeXlsx([{name:'bad/name',rows:[['a']]}]));
});

test('legacy repayment source is derived from its linked expense, and stays blank when not recorded',()=>{
 const data=excelFixture(),debt=data.debts.find(d=>d.id==='loan');delete debt.payments.find(p=>p.id==='payment').source;
 debt.payments.push({id:'legacy-no-link',date:'2026-09-01',amount:1});
 const rows=records(reportSheets(data,options),'Lịch sử trả nợ');
 assert.equal(rows.find(r=>r['ID lần trả']==='payment')['Nguồn'],'Ngân hàng');
 assert.equal(rows.find(r=>r['ID lần trả']==='legacy-no-link')['Nguồn'],'');
});

test('monthly tracking and daily card-payment category export numeric observations without forecasts or duplicate cash',async()=>{
 const {saveTrackingMonth,saveTrackingBalances}=await import('../src/credit-tracking.js');
 const data=excelFixture(),day=data.days['2026-10-27']||={items:[],note:''};day.items.push({id:'daily-card-payment',title:'Pay September bill',category:'Thanh toán thẻ',paymentMethod:'bank',status:'paid',creditPeriod:'2026-09',amount:31320});day.items.push({id:'tracking-purchase',title:'Buy with credit',paymentMethod:'card',creditTracking:true,status:'paid',amount:10000});saveTrackingMonth(data,{month:'2026-10',fees:3000,monthlyPrincipal:20000,note:'Monthly note'});saveTrackingBalances(data,{id:'manual-credit',date:'2026-11-04',available:42153,ribo:245832});
 const sheets=reportSheets(data,options),row=records(sheets,'Theo dõi tín dụng tháng').find(r=>r['Khu vực']==='Sổ nước ngoài'&&r['Tháng']==='2026-10');assert.equal(row['Phí tín dụng đã nhập'],3000);assert.equal(row['Tiền リボ trả hằng tháng đã nhập'],20000);assert.equal(row['Thanh toán thẻ thực tế trong tháng'],31351.5);assert.equal(row['Ghi chú'],'Monthly note');
 assert.equal(records(sheets,'Lịch sử dư nợ リボ')[0]['Dư nợ リボ đã nhập'],245832);assert.equal(records(sheets,'Số dư nguồn tiền')[0]['Hạn mức khả dụng đang hiển thị'],42153);
 const payment=records(sheets,'Giao dịch').find(r=>r.ID==='daily-card-payment');assert.equal(payment['Tiền thực chi'],31320);assert.equal(payment['Kỳ sao kê gốc (tham chiếu)'],'2026-09');assert.equal(payment['Loại giao dịch'],'Thanh toán thẻ');assert.equal(records(sheets,'Thanh toán thẻ').find(r=>r.ID==='daily-card-payment')['Số thực trả'],31320);
 const purchase=records(sheets,'Giao dịch').find(r=>r.ID==='tracking-purchase');assert.equal(purchase['Kỳ sao kê'],'');assert.equal(purchase['Tiền thực chi'],0);
 const ordinary=reportSheets(data,{...options,creditAllowed:false});assert(!ordinary.some(s=>s.name==='Theo dõi tín dụng tháng'||s.name==='Lịch sử dư nợ リボ'));assert(!records(ordinary,'Giao dịch').some(r=>r.ID==='daily-card-payment'||r.ID==='tracking-purchase'));
});

test('cumulative savings report uses each book savings currency and cutoff, including archived months but excluding goals, source balances and future months',()=>{
 const data=excelFixture();data.savings={'2024-12':10.123,'2026-11':20,'2026-12':99999};data.regional.vietnam.savings={'2025-12':1000,'2026-11':2000,'2027-01':999999};data.regional.vietnam.currencies.savings='JPY';const before=structuredClone(data);
 const rows=records(reportSheets(data,{asOf:'2026-11-04',creditAllowed:true}),'Tổng tiết kiệm');assert.deepEqual(rows.map(r=>[r['Khu vực'],r['Tiền tệ'],r['Tổng đã tiết kiệm theo tháng'],r['Số tháng có ghi nhận']]),[['Sổ nước ngoài','VND',30.123,2],['Sổ Việt Nam','JPY',3000,2]]);assert(rows.every(r=>r['Tháng tổng hợp']==='2026-11'&&r['Tính đến']==='2026-11-04'));assert.deepEqual(records(reportSheets(data,{asOf:'2026-11-04',creditAllowed:false}),'Tổng tiết kiệm'),rows);assert.deepEqual(data,before);
});
