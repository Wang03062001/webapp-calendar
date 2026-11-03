import test from 'node:test';
import assert from 'node:assert/strict';
import {writeXlsx} from '../src/xlsx.js';
import {reportSheets,excelReport} from '../src/excel-report.js';
import {excelFixture,exportAsOf} from '../scripts/fixtures/excel.mjs';
import {monthSummary} from '../src/model.js';
import {financeView} from '../src/credit-access.js';
import {accountBalances,moneyOut} from '../src/account-model.js';
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
  const row=totals.find(r=>r['Khu vực']===label&&r['Tháng']==='2026-10'),expected=monthSummary(book,2026,9);
  assert.equal(row['Chi phí đã chi'],expected.expense);assert.equal(row['Chi phí dự kiến'],expected.planned);assert.equal(row['Chênh lệch theo chi phí'],expected.balance);assert.equal(row['Tiền ra các nguồn'],moneyOut(book,'2026-10'));
 }
 assert(records(sheets,'Giao dịch').some(r=>r.ID==='archived'));assert(records(sheets,'Tiết kiệm cũ và mục tiêu').some(r=>r['Tiền tệ']==='VND'&&r['Kỳ']==='2024'));
 const vn=records(sheets,'Giao dịch').find(r=>r.ID==='vn');assert.equal(vn['Tiền tệ'],'VND');assert.equal(vn['Số tiền giao dịch'],123456.789);assert.deepEqual(data,before);
});

test('protected payments/transfers/fees do not double count costs; notes/history/nulls survive',()=>{
 const sheets=reportSheets(excelFixture(),options),rows=records(sheets,'Giao dịch');
 for(const row of rows.filter(r=>r['Loại giao dịch']==='Thanh toán sao kê'||r['Loại giao dịch']==='Chuyển nội bộ'))assert.equal(row['Chi phí đã chi'],0);
 assert(!rows.some(r=>r['Loại giao dịch']==='Phí sao kê'));assert.equal(records(sheets,'Sao kê thẻ')[0]['Tổng sao kê'],31.5);const summary=records(sheets,'Tổng hợp tháng').find(r=>r['Khu vực']==='Sổ nước ngoài'&&r['Tháng']==='2026-10');assert.equal(summary['Chênh lệch thu chi'],summary['Chênh lệch theo chi phí']-31.5);
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
 const data=excelFixture(),before=structuredClone(data);const sheets=reportSheets(data,{...options,draft:true});assert.match(sheet(sheets,'Hướng dẫn').find(r=>r[0]==='Trạng thái dữ liệu')[1],/bản nháp/);excelReport(data,options);assert.deepEqual(data,before);
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
