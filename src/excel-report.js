import {readBook,countryOf} from './region-model.js';
import {financeView} from './credit-access.js';
import {monthSummary,categoryOf,expenseStatus,debtBalance} from './model.js';
import {accountBalances,accountSource,isCardPayment,isInternalMovement,moneyOut,sourceOpening} from './account-model.js';
import {statementNumbers,roundCard,cardDate,shiftMonth,availableCredit} from './card-model.js';
import {normalizeCurrencies} from './preferences.js';
import {receivableRemaining,RECEIPT_TYPES} from './receipt-model.js';
import {fundBalance,budgetRows} from './safety-model.js';
import {writeXlsx} from './xlsx.js';
const source=value=>({bank:'Ngân hàng',cash:'Tiền mặt',savings:'Tiết kiệm',card:'Thẻ tín dụng'}[value]||value||'');
const status=item=>expenseStatus(item)==='paid'?'Đã chi':'Dự kiến';
const paymentSource=(book,payment)=>{if(payment.source)return source(payment.source);const item=book.days[payment.date]?.items.find(i=>i.id===payment.expenseId);return item?source(accountSource(item)):'';};
const entries=object=>Object.entries(object||{}).sort(([a],[b])=>a.localeCompare(b));
const kind=item=>item.cardFeeMonth?'Phí sao kê':isCardPayment(item)?'Thanh toán sao kê':isInternalMovement(item)?'Chuyển nội bộ':item.debtPaymentId?'Trả nợ':item.obligationId?'Khoản phải trả':'Chi tiêu';

// This is a report, never a replacement financial document. Each region and
// currency stays on its own rows; archived years are included from records.
export function reportSheets(document,{asOf,creditAllowed=false,draft=false}={}){
  if(!cardDate(asOf))throw Error('Ngày xuất Excel không hợp lệ.');
  const allowed=creditAllowed===true;
  const sheets=[];
  const table=(name,columns)=>{const rows=[columns];sheets.push({name,rows});return rows;};
  const help=table('Hướng dẫn',['Nội dung','Giá trị']);
  help.push(['Ngày xem số dư',asOf],['Phạm vi','Toàn bộ các năm có dữ liệu trong các sổ khu vực, kể cả năm đã ẩn khỏi điều hướng.'],['Trạng thái dữ liệu',draft?'Gồm bản nháp trên trình duyệt chưa được máy chủ xác nhận.':'Dữ liệu trên trình duyệt tại thời điểm xuất.'],['Dữ liệu thẻ',allowed?'Bao gồm theo quyền admin vừa được xác minh.':'Ẩn dữ liệu thẻ và khoản vay tín dụng theo quyền hiện tại.'],['Tiền tệ','Mỗi dòng ghi riêng khu vực và tiền tệ; không quy đổi hoặc cộng tổng các đồng tiền.'],['Chi phí','Không tính chuyển nội bộ, phí sao kê hoặc thanh toán thẻ lần nữa. Chỉ Đã chi được tính vào chi phí thực tế.'],['Số dư','Tính đến ngày xem số dư ở trên; tổng hợp tháng vẫn theo đúng giao dịch của từng tháng.'],['Khôi phục','Excel để xem và tính toán. Dùng Sao lưu JSON trong hộp xuất dữ liệu để nhập lại toàn bộ dữ liệu vào ứng dụng.']);
  const settings=table('Sổ và cài đặt',['Khu vực','Quốc gia','Tiền thu chi','Tiền tiết kiệm cũ','Các năm đang hiện','Chức năng','Giá trị']);
  const summary=table('Tổng hợp tháng',['Khu vực','Tiền tệ','Tháng','Lương','Thưởng','Thu nhập khác','Chi phí đã chi','Chi phí dự kiến','Chênh lệch thu chi','Tiền ra các nguồn','Số khoản đã chi','Số khoản dự kiến']);
  const expenses=table('Giao dịch',['Khu vực','Tiền tệ','Ngày','ID','Nội dung','Danh mục','Trạng thái','Nguồn tiền','Loại giao dịch','Số tiền giao dịch','Chi phí đã chi','Chi phí dự kiến','ID quỹ','ID lịch phải trả','ID khoản vay','ID lần trả nợ',...(allowed?['Cách trả thẻ','Kỳ sao kê','Kỳ thanh toán sao kê']:[])]);
  const notes=table('Ghi chú ngày',['Khu vực','Ngày','Ghi chú']);
  const income=table('Thu nhập',['Khu vực','Tiền tệ','Tháng nhận','Tháng làm việc','Ngày nhận','Nguồn nhận','Lương','Thưởng','Ghi chú']);
  const receipts=table('Tiền vào khác',['Khu vực','Tiền tệ','ID','Ngày','Loại','Nguồn','Số tiền','ID khoản phải thu','Ghi chú']);
  const receivables=table('Khoản phải thu',['Khu vực','Tiền tệ','ID','Nội dung','Gốc phải thu','Gốc còn lại']);
  const balances=table('Số dư nguồn tiền',['Khu vực','Tiền tệ','Ngày xem','Ngày mốc nguồn tiền','Thời điểm mốc','Ngân hàng','Tiền mặt','Tiết kiệm nguồn','Tài sản',...(allowed?['Ngày mốc thẻ','Dư nợ ghi sổ','Hạn mức tín dụng','Hạn mức khả dụng theo sổ','Hạn mức khả dụng đang hiển thị']:[])]);
  const openings=table('Mốc số dư',['Khu vực','Tiền tệ','ID','Ngày mốc','Thời điểm','Ngân hàng','Tiền mặt','Tiết kiệm nguồn','Ngày xác nhận','Ghi chú']);
  const reconciliations=table('Đối chiếu',['Khu vực','Tiền tệ','ID','Ngày','Loại','Ngày xác nhận','Ngân hàng thực tế','Ngân hàng theo sổ','Chênh lệch ngân hàng','Tiền mặt thực tế','Tiền mặt theo sổ','Chênh lệch tiền mặt','Tiết kiệm thực tế','Tiết kiệm theo sổ','Chênh lệch tiết kiệm','Ghi chú']);
  const transfers=table('Chuyển nguồn',['Khu vực','Tiền tệ','ID','Ngày','Từ','Đến','Số tiền','Loại bản ghi']);
  const savings=table('Tiết kiệm cũ và mục tiêu',['Khu vực','Tiền tệ','Loại','Kỳ','Số tiền']);
  const debts=table('Khoản vay',['Khu vực','Tiền tệ','ID','Nội dung','Loại','Gốc ban đầu','Gốc đã trả','Gốc còn lại','Ngày đến hạn']);
  const payments=table('Lịch sử trả nợ',['Khu vực','Tiền tệ','ID khoản vay','ID lần trả','Ngày','Gốc','Lãi phí','Tổng thanh toán','Nguồn','Đã hủy','ID giao dịch liên kết']);
  const funds=table('Quỹ',['Khu vực','Tiền tệ','ID','Tên','Nguồn','Loại','Mục tiêu','Đã đóng','Số dư tại ngày xem']);
  const fundHistory=table('Lịch sử quỹ',['Khu vực','Tiền tệ','ID quỹ','ID lần ghi','Ngày','Thao tác','Số tiền','Ghi chú']);
  const budgets=table('Ngân sách',['Khu vực','Tiền tệ','Tháng','Danh mục','Ngân sách','Đã chi','Dự kiến','Còn lại']);
  const obligations=table('Lịch phải trả',['Khu vực','Tiền tệ','ID','Ngày giao dịch','Hạn gốc','ID giao dịch','Nội dung','Số tiền','Trạng thái']);
  const obligationHistory=table('Lịch sử phải trả',['Khu vực','Tiền tệ','ID lịch','ID lần ghi','Ngày xác nhận','Thao tác','Ngày giao dịch','Nguồn','Số tiền']);
  const plans=table('Kế hoạch',['Khu vực','Tiền tệ','Mục','ID khoản vay','APR %','Mức tối thiểu','Ngày đến hạn','Nguồn','Giá trị','Ngày số liệu']);
  const statements=allowed?table('Sao kê thẻ',['Khu vực','Tiền tệ','Kỳ','Trạng thái','Ngày xác nhận','Ngày đến hạn','Ngày thanh toán','Nguồn thanh toán','Dư nợ trước','Bổ sung dư nợ リボ','Gốc trả','Phí','Mua một lần','Tổng sao kê','Dư nợ chuyển kỳ','Ghi chú']):null;
  const creditHistory=allowed?table('Lịch sử hạn mức',['Khu vực','Tiền tệ','ID','Ngày','Hạn mức khả dụng']):null;
  const regions=['foreign',...(document.regional?.vietnam?['vietnam']:[])];
  for(const region of regions){
    const book=financeView(readBook(document,region),allowed),label=region==='foreign'?(countryOf(book)==='VN'?'Sổ gốc (Việt Nam)':'Sổ nước ngoài'):'Sổ Việt Nam',currencies=normalizeCurrencies(book.currencies),unit=currencies.cash,prefix=[label,unit];
    settings.push([label,countryOf(book),unit,currencies.savings,(book.years||[]).join(', '),'','']);
    for(const [key,value]of entries(book.bookSettings?.modules))settings.push([label,'','','','',key,value?'Có':'Không']);
    const months=new Set([...Object.keys(book.days),...Object.keys(book.incomes),...Object.keys(book.savings),...(book.receipts||[]).map(r=>r.date),...book.debts.flatMap(d=>d.payments.map(p=>p.date)),...(book.cards?.statements||[]).flatMap(s=>[s.month,s.paidOn].filter(Boolean))].map(date=>date.slice(0,7)));
    for(const month of [...months].sort()){
      const [y,m]=month.split('-').map(Number),totals=monthSummary(book,y,m-1);
      summary.push([...prefix,month,totals.salary,totals.bonus,totals.otherIncome||0,totals.expense,totals.planned,totals.balance,moneyOut(book,month),totals.count,totals.plannedCount]);
    }
    for(const [date,entry]of entries(book.days)){
      if(entry.note)notes.push([label,date,entry.note]);
      for(const item of entry.items){
        if(item.cardFeeMonth)continue;
        const cost=!isCardPayment(item)&&!isInternalMovement(item);
        expenses.push([...prefix,date,item.id,item.title,categoryOf(item),status(item),source(accountSource(item)),kind(item),item.amount,cost&&expenseStatus(item)==='paid'?item.amount:0,cost&&expenseStatus(item)==='planned'?item.amount:0,item.fundId||'',item.obligationId||'',item.debtId||'',item.debtPaymentId||'',...(allowed?[item.paymentMethod==='card'?item.settlement||'oneoff':'',item.paymentMethod==='card'?item.billingMonth||shiftMonth(date.slice(0,7),1):'',item.cardPaymentMonth||'']:[])]);
        if(isInternalMovement(item))transfers.push([...prefix,item.id,date,source(item.movement==='withdraw'?'bank':'cash'),source(item.movement==='withdraw'?'cash':'bank'),item.amount,'Giao dịch nội bộ']);
      }
    }
    for(const [month,row]of entries(book.incomes))income.push([...prefix,month,row.earnedMonth||shiftMonth(month,-1),row.receivedOn||month+'-15',source(row.account||'bank'),row.salary,row.bonus,row.note]);
    for(const r of book.receipts||[])receipts.push([...prefix,r.id,r.date,RECEIPT_TYPES[r.type],source(r.source),r.amount,r.receivableId||'',r.note]);
    for(const r of book.receivables||[])receivables.push([...prefix,r.id,r.title,r.amount,receivableRemaining(book,r.id)]);
    if(book.accounts){
      const a=book.accounts,opening=sourceOpening(a),b=accountBalances(book,asOf);
      balances.push([...prefix,asOf,opening.date,opening.timing==='end'?'Cuối tháng':'Đầu ngày',b?.bank,b?.cash,b?.savings,b?roundCard(b.bank+b.cash+(b.savings||0)):null,...(allowed?[a.openedOn,b?.creditDebt,a.creditLimit,b?.available,availableCredit(book,asOf,b?.available??null)]:[])]);
      openings.push([...prefix,'Gốc',a.openedOn,'Đầu ngày',a.bank,a.cash,a.savingsOpenedOn&&a.savingsOpenedOn!==a.openedOn?null:a.savings,'','Mốc ban đầu được giữ nguyên; mốc cập nhật cuối cùng có hiệu lực cho nguồn tiền.']);
      if(a.savingsOpenedOn&&a.savingsOpenedOn!==a.openedOn)openings.push([...prefix,'Tiết kiệm gốc',a.savingsOpenedOn,'Đầu ngày',null,null,a.savings,'','']);
      for(const row of a.openingHistory||[])openings.push([...prefix,row.id,row.date,row.timing==='end'?'Cuối tháng':'Đầu ngày',row.bank,row.cash,row.savings,row.confirmedOn,row.note]);
      for(const r of a.reconciliations||[])reconciliations.push([...prefix,r.id,r.date,r.kind==='manual'?'Cập nhật ngày thường':'Đối chiếu cuối tháng',r.confirmedOn||'',r.bank,r.expectedBank,r.deltaBank,r.cash,r.expectedCash,r.deltaCash,r.savings,r.expectedSavings,r.deltaSavings,r.note]);
      for(const r of a.transfers)transfers.push([...prefix,r.id,r.date,source(r.from),source(r.to),r.amount,'Chuyển nguồn gốc']);
    }
    for(const [month,value]of entries(book.savings))savings.push([label,currencies.savings,'Tiết kiệm tháng (cũ)',month,value]);
    for(const [year,value]of entries(book.goals))savings.push([label,currencies.savings,'Mục tiêu năm (cũ)',year,value]);
    for(const debt of book.debts){
      const b=debtBalance(debt);debts.push([...prefix,debt.id,debt.title,debt.type,debt.amount,b.paid,b.remaining,debt.dueDate||'']);
      for(const p of debt.payments)payments.push([...prefix,debt.id,p.id,p.date,p.amount,p.interest??null,roundCard(p.amount+(p.interest||0)),paymentSource(book,p),p.voided?'Có':'Không',p.expenseId||'']);
    }
    for(const f of book.safety?.funds||[]){
      funds.push([...prefix,f.id,f.name,source(f.source),f.kind,f.target,f.archived?'Có':'Không',fundBalance(book,f.id,asOf)]);
      for(const e of f.entries)fundHistory.push([...prefix,f.id,e.id,e.date,e.direction==='allocate'?'Dành tiền':'Giải phóng',e.amount,e.note]);
    }
    for(const month of new Set((book.safety?.budgets||[]).map(b=>b.month)))for(const b of budgetRows(book,month))budgets.push([...prefix,month,b.category,b.amount,b.spent,b.planned,b.remaining]);
    for(const o of book.safety?.obligations||[]){
      const item=book.days[o.date]?.items.find(i=>i.id===o.expenseId);if(!item)continue;
      obligations.push([...prefix,o.id,o.date,o.dueDate||o.date,o.expenseId,item.title,item.amount,status(item)]);
      for(const h of o.history||[])obligationHistory.push([...prefix,o.id,h.id,h.date,h.action,h.expenseDate||'',source(h.source),h.amount]);
    }
    if(book.safety){
      plans.push([...prefix,'Chi phí thiết yếu','','','','','',book.safety.essentialMonthly], [label,'tháng','Số tháng dự phòng','','','','','',book.safety.reserveMonths],[...prefix,'Ngân sách trả nợ tháng','','','','','',book.safety.monthlyDebtBudget]);
      for(const term of book.safety.debtTerms||[])if(book.debts.some(d=>d.id===term.debtId))plans.push([...prefix,'Điều kiện khoản vay',term.debtId,term.apr,term.minimum,term.nextDueDate||'',source(term.source)]);
      if(allowed)plans.push([...prefix,'Nguồn dự báo sao kê','','','','',source(book.safety.cardSource)]);
    }
    if(allowed&&book.cards){
      settings.push([label,'','','','', 'Tên thẻ',book.cards.name],[label,'','','','','Ngày trả thẻ',book.cards.paymentDay],[label,'','','','','Quy tắc cuối tuần',book.cards.weekend]);
      for(const s of book.cards.statements){const n=statementNumbers(s);statements.push([...prefix,s.month,s.status,s.confirmedOn||'',s.dueDate,s.paidOn||'',s.status==='paid'?source(s.paymentSource||'bank'):'',s.priorBalance??null,s.newRibo??null,s.principal??null,s.fees??null,s.oneOff??null,n.total,n.carry,s.note||'']);}
      for(const h of book.cards.availableCreditHistory||[])creditHistory.push([...prefix,h.id,h.date,h.amount]);
      const p=book.cards.safetyPlan;if(p)plans.push([...prefix,'Kế hoạch thẻ','',p.apr,p.minimum,'','',p.principal,p.asOf]);
    }
  }
  return sheets;
}
export const excelReport=(document,options)=>writeXlsx(reportSheets(document,options));
