import {financeView} from './credit-access.js';
import {monthKey,monthSummary,yearSummary,expenseStatus,categoryOf,validYear} from './model.js';
import {accountSource,isCardPayment,isInternalMovement} from './account-model.js';
import {statementNumbers,roundCard,shiftMonth} from './card-model.js';
import {simpleCards} from './region-model.js';
import {RECEIPT_TYPES} from './receipt-model.js';
const total=rows=>roundCard(rows.reduce((sum,row)=>sum+row.amount,0));

// Read-only period detail. Cost recognition and actual source outflow are kept
// separately: a purchase is a cost; its later statement payment is cashflow.
export function statsDetails(document,{year,month=null,creditAllowed=false}={}){
  if(!validYear(year)||month!==null&&(!Number.isInteger(month)||month<0||month>11))throw Error('Kỳ thống kê không hợp lệ.');
  const book=financeView(document,creditAllowed===true),prefix=month===null?`${year}-`:`${monthKey(year,month)}-`;
  const summary=month===null?yearSummary(book,year):monthSummary(book,year,month);
  const expenseRows=Object.entries(book.days).filter(([date])=>date.startsWith(prefix)).flatMap(([date,entry])=>entry.items
    .filter(item=>!item.cardFeeMonth&&!isCardPayment(item)&&!isInternalMovement(item))
    .map(item=>({...item,date,category:categoryOf(item),status:expenseStatus(item),source:accountSource(item)})))
    .sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const paid=expenseRows.filter(item=>item.status==='paid'),planned=expenseRows.filter(item=>item.status==='planned');
  const purchases=paid.filter(item=>item.source==='card'),direct=paid.filter(item=>item.source!=='card');
  const statementRow=s=>({id:`statement-${s.month}`,date:s.status==='paid'?s.paidOn:s.dueDate,title:`Thanh toán ${book.cards.name||'thẻ tín dụng'} · ${s.month}`,cardName:book.cards.name||'Thẻ tín dụng',amount:s.status==='draft'?null:statementNumbers(s).total,source:s.status==='paid'?s.paymentSource||'bank':null,month:s.month,note:s.note||'',oneOff:s.oneOff,principal:s.principal,fees:s.fees,simple:simpleCards(book)});
  const settlements=(book.cards?.statements||[]).filter(s=>s.status==='paid'&&s.paidOn.startsWith(prefix)).map(statementRow)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const upcomingStatements=(book.cards?.statements||[]).filter(s=>s.status==='confirmed'&&s.dueDate.startsWith(prefix)).map(statementRow);
  const unknownStatements=(book.cards?.statements||[]).filter(s=>s.status==='draft'&&s.dueDate.startsWith(prefix)).map(statementRow);
  const salaries=[],bonuses=[];
  for(const [key,row]of Object.entries(book.incomes).filter(([key])=>key.startsWith(month===null?`${year}-`:monthKey(year,month)))){
    // Month keys match monthSummary, independent of the salary's earned month.
    const meta={date:row.receivedOn||key+'-15',earnedMonth:row.earnedMonth||shiftMonth(key,-1),source:row.account||'bank',note:row.note||'',generatedTitle:true};
    if(row.salary)salaries.push({...meta,id:`salary-${key}`,title:'Lương',amount:row.salary});
    if(row.bonus)bonuses.push({...meta,id:`bonus-${key}`,title:'Thưởng',amount:row.bonus});
  }
  salaries.sort((a,b)=>a.date.localeCompare(b.date));bonuses.sort((a,b)=>a.date.localeCompare(b.date));
  upcomingStatements.sort((a,b)=>a.date.localeCompare(b.date));unknownStatements.sort((a,b)=>a.date.localeCompare(b.date));
  const otherIncome=(book.receipts||[]).filter(r=>r.date.startsWith(prefix)&&!['own','repayment'].includes(r.type))
    .map(r=>({id:r.id,date:r.date,title:RECEIPT_TYPES[r.type],amount:r.amount,source:r.source,note:r.note,generatedTitle:true})).sort((a,b)=>a.date.localeCompare(b.date));
  const income=roundCard(summary.salary+summary.bonus+(summary.otherIncome||0));
  const directTotal=total(direct),settlementTotal=total(settlements),outflow=roundCard(directTotal+settlementTotal);
  const activityTotal=roundCard(summary.expense+settlementTotal),plannedSettlementTotal=total(upcomingStatements);
  return {summary,income,salaries,bonuses,otherIncome,paid,planned,direct,purchases,settlements,
    bySource:Object.fromEntries(['bank','cash','savings'].map(source=>[source,total([...direct,...settlements].filter(row=>row.source===source))])),
    directTotal,purchaseTotal:total(purchases),settlementTotal,outflow,upcomingStatements,unknownStatements,plannedSettlementTotal,
    activityTotal,activityDifference:roundCard(income-activityTotal),cashDifference:roundCard(income-outflow),plannedTotal:roundCard(summary.planned+plannedSettlementTotal),
    funds:book.safety?.funds?.map(f=>({id:f.id,name:f.name}))||[]};
}
