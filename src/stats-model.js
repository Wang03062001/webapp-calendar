import {financeView} from './credit-access.js';
import {monthKey,monthSummary,yearSummary,expenseStatus,categoryOf,validYear} from './model.js';
import {accountSource,isCardPayment,isInternalMovement} from './account-model.js';
import {statementNumbers,roundCard,shiftMonth,cardDate} from './card-model.js';
import {simpleCards,moduleEnabled} from './region-model.js';
import {RECEIPT_TYPES} from './receipt-model.js';
const total=rows=>roundCard(rows.reduce((sum,row)=>sum+row.amount,0));

// Read-only period detail. Cost recognition and actual source outflow are kept
// separately: a purchase is a cost; its later statement payment is cashflow.
export function statsDetails(document,{year,month=null,creditAllowed=false}={}){
  if(!validYear(year)||month!==null&&(!Number.isInteger(month)||month<0||month>11))throw Error('Kỳ thống kê không hợp lệ.');
  const book=financeView(document,creditAllowed===true),prefix=month===null?`${year}-`:`${monthKey(year,month)}-`;
  const summary=month===null?yearSummary(book,year):monthSummary(book,year,month);
  return periodDetails(book,date=>date.startsWith(prefix),{summary,incomeKey:key=>key.startsWith(month===null?`${year}-`:monthKey(year,month))});
}

export const salaryCycleEnabled=book=>moduleEnabled(book,'salary')||Object.values(book.incomes).some(row=>row.salary||row.bonus);

// A pay cycle survives the calendar month boundary. Receipt dates, not earned
// months or future salaries, determine income actually recorded by the cutoff.
export function salaryCycleRange(asOf){
  if(!cardDate(asOf))throw Error('Ngày kỳ lương không hợp lệ.');
  const month=asOf.slice(0,7),afterPayday=Number(asOf.slice(8))>=15;
  const startMonth=afterPayday?month:shiftMonth(month,-1),endMonth=afterPayday?shiftMonth(month,1):month;
  return {start:`${startMonth}-15`,end:endMonth?`${endMonth}-14`:'9999-12-31',asOf};
}
export function salaryCycleDetails(document,{asOf,creditAllowed=false}={}){
  const cycle=salaryCycleRange(asOf),inPeriod=date=>date>=cycle.start&&date<=asOf;
  return {...periodDetails(financeView(document,creditAllowed===true),inPeriod),cycle};
}

function periodDetails(book,inPeriod,{summary=null,incomeKey=null}={}){
  const expenseRows=Object.entries(book.days).filter(([date])=>inPeriod(date)).flatMap(([date,entry])=>entry.items
    .filter(item=>!item.cardFeeMonth&&!isCardPayment(item)&&!isInternalMovement(item))
    .map(item=>({...item,date,category:categoryOf(item),status:expenseStatus(item),source:accountSource(item)})))
    .sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const paid=expenseRows.filter(item=>item.status==='paid'),planned=expenseRows.filter(item=>item.status==='planned');
  const purchases=paid.filter(item=>item.source==='card'),direct=paid.filter(item=>item.source!=='card');
  const statementRow=s=>({id:`statement-${s.month}`,date:s.status==='paid'?s.paidOn:s.dueDate,title:`Thanh toán ${book.cards.name||'thẻ tín dụng'} · ${s.month}`,cardName:book.cards.name||'Thẻ tín dụng',amount:s.status==='draft'?null:statementNumbers(s).total,source:s.status==='paid'?s.paymentSource||'bank':null,month:s.month,note:s.note||'',oneOff:s.oneOff,principal:s.principal,fees:s.fees,simple:simpleCards(book)});
  const settlements=(book.cards?.statements||[]).filter(s=>s.status==='paid'&&inPeriod(s.paidOn)).map(statementRow)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const upcomingStatements=(book.cards?.statements||[]).filter(s=>s.status==='confirmed'&&inPeriod(s.dueDate)).map(statementRow);
  const unknownStatements=(book.cards?.statements||[]).filter(s=>s.status==='draft'&&inPeriod(s.dueDate)).map(statementRow);
  const salaries=[],bonuses=[];
  for(const [key,row]of Object.entries(book.incomes).filter(([key,row])=>incomeKey?incomeKey(key):inPeriod(row.receivedOn||key+'-15'))){
    // Calendar reports keep monthSummary's keys; pay cycles use receipt dates.
    const meta={date:row.receivedOn||key+'-15',earnedMonth:row.earnedMonth||shiftMonth(key,-1),source:row.account||'bank',note:row.note||'',generatedTitle:true};
    if(row.salary)salaries.push({...meta,id:`salary-${key}`,title:'Lương',amount:row.salary});
    if(row.bonus)bonuses.push({...meta,id:`bonus-${key}`,title:'Thưởng',amount:row.bonus});
  }
  salaries.sort((a,b)=>a.date.localeCompare(b.date));bonuses.sort((a,b)=>a.date.localeCompare(b.date));
  upcomingStatements.sort((a,b)=>a.date.localeCompare(b.date));unknownStatements.sort((a,b)=>a.date.localeCompare(b.date));
  const otherIncome=(book.receipts||[]).filter(r=>inPeriod(r.date)&&!['own','repayment'].includes(r.type))
    .map(r=>({id:r.id,date:r.date,title:RECEIPT_TYPES[r.type],amount:r.amount,source:r.source,note:r.note,generatedTitle:true})).sort((a,b)=>a.date.localeCompare(b.date));
  if(!summary){
    const salary=total(salaries),bonus=total(bonuses),other=total(otherIncome),expense=total(paid);
    summary={salary,bonus,otherIncome:other,expense,balance:roundCard(salary+bonus+other-expense),count:paid.length,planned:total(planned),plannedCount:planned.length};
  }
  const income=roundCard(summary.salary+summary.bonus+(summary.otherIncome||0));
  const directTotal=total(direct),settlementTotal=total(settlements),outflow=roundCard(directTotal+settlementTotal);
  const activityTotal=roundCard(summary.expense+settlementTotal),plannedSettlementTotal=total(upcomingStatements);
  return {summary,income,salaries,bonuses,otherIncome,paid,planned,direct,purchases,settlements,
    bySource:Object.fromEntries(['bank','cash','savings'].map(source=>[source,total([...direct,...settlements].filter(row=>row.source===source))])),
    directTotal,purchaseTotal:total(purchases),settlementTotal,outflow,upcomingStatements,unknownStatements,plannedSettlementTotal,
    activityTotal,activityDifference:roundCard(income-activityTotal),cashDifference:roundCard(income-outflow),plannedTotal:roundCard(summary.planned+plannedSettlementTotal),
    funds:book.safety?.funds?.map(f=>({id:f.id,name:f.name}))||[]};
}
