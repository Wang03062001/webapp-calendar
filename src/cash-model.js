import {isTrackingCardPayment} from './credit-types.js';
import {financeView} from './credit-access.js';
import {accountBalances,accountSource,isInternalMovement,isCardPayment,sourceOpening,monthEnd} from './account-model.js';
import {cardPayments,statementProgress} from './card-ledger.js';
import {cardDate,shiftMonth} from './card-model.js';
import {sumMoney,addMoney,subtractMoney,moneyUnits} from './money.js';
import {tokyoToday,previousDate} from './finance-date.js';
import {RECEIPT_TYPES,isIncomeReceipt} from './receipt-model.js';
export const actualItem=item=>!['planned','cancelled','draft'].includes(item.status);
// The spending pool is bank + cash. Savings is a separate reserve.
export const cashAssets=balance=>balance?addMoney(balance.bank,balance.cash):null;
const inRange=(date,start,end)=>date>=start&&date<=end;
export function cashEvents(book){
  const rows=[];
  for(const [month,income]of Object.entries(book.incomes))for(const type of ['salary','bonus'])if(income[type]&&income.status!=='planned')rows.push({id:`${type}:${month}`,date:income.receivedOn||month+'-15',direction:'in',type,amount:income[type],source:income.account||'bank',title:type==='salary'?'Lương':'Thưởng',note:income.note||'',economicIncome:true});
  for(const r of book.receipts||[])rows.push({...r,direction:'in',title:RECEIPT_TYPES[r.type],economicIncome:isIncomeReceipt(r)});
  for(const t of book.accounts?.transfers||[]){
    if(t.from==='savings')rows.push({...t,id:'savings-release:'+t.id,direction:'in',source:t.to,type:'savings-withdrawal',title:'Rút tiết kiệm',economicIncome:false,internalTransfer:true});
    if(t.to==='savings')rows.push({...t,id:'savings-deposit:'+t.id,direction:'out',source:t.from,type:'savings-deposit',title:'Chuyển vào tiết kiệm',economicIncome:false,internalTransfer:true,savingsDeposit:true});
  }
  for(const [date,entry]of Object.entries(book.days))for(const item of entry.items)if(actualItem(item)&&item.paymentMethod!=='card'&&!item.cardFeeMonth&&!isCardPayment(item)&&!isInternalMovement(item))rows.push({...item,date,direction:'out',type:item.debtPaymentId?'debt':isTrackingCardPayment(item)?'card-payment':'direct',source:accountSource(item)});
  for(const p of cardPayments(book))rows.push({...p,direction:'out',type:'card-payment',title:`Thanh toán thẻ · ${p.month}`});
  for(const r of book.cards?.adjustments||[])if(!r.voided&&r.type==='bank-refund')rows.push({...r,direction:'in',title:'Hoàn tiền về tài khoản',economicIncome:false});
  return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
export function creditOverview(book,asOf){
  const statements=(book.cards?.statements||[]).filter(s=>s.status!=='draft'&&s.confirmedOn<=asOf).map(s=>({...s,...statementProgress(s,asOf)}));
  const latest=[...statements].sort((a,b)=>b.month.localeCompare(a.month))[0],balance=accountBalances(book,asOf);
  const baseRibo=latest?subtractMoney(addMoney(latest.priorBalance,latest.newRibo),latest.paidParts.principal):null;
  const upcoming=statements.filter(s=>s.remaining>0).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  const billed=new Set(statements.map(s=>s.month));
  const unbilled=Object.entries(book.days).flatMap(([date,entry])=>date<=asOf?entry.items.filter(i=>actualItem(i)&&i.paymentMethod==='card'&&!i.cardFeeMonth&&!billed.has(i.billingMonth||shiftMonth(date.slice(0,7),1))):[]);
  const ribo=baseRibo===null?null:addMoney(baseRibo,sumMoney(unbilled.filter(i=>i.settlement==='ribo').map(i=>i.amount)));
  const extraCredits=sumMoney((book.cards?.adjustments||[]).filter(r=>!r.voided&&r.date<=asOf&&r.type!=='bank-refund').map(r=>subtractMoney(r.amount,r.month?r.statementAmount:0)));
  const liability=latest?subtractMoney(addMoney(baseRibo,sumMoney(statements.map(s=>addMoney(s.remainingParts.oneOff,s.remainingParts.fees))),sumMoney(unbilled.map(i=>i.amount))),extraCredits):balance?.creditDebt??null;
  return {ribo,netLiability:liability,cardCredit:liability===null?null:Math.max(0,-liability),liability:liability===null?null:Math.max(0,liability),ledgerDifference:balance?.creditDebt!==null&&balance?.creditDebt!==undefined&&liability!==null?subtractMoney(liability,balance.creditDebt):null,unpaid:sumMoney(upcoming.map(s=>s.remaining)),upcoming,next:upcoming[0]||null};
}
export function cashPeriodDetails(document,{year,month=null,start,end,asOf=tokyoToday(),creditAllowed=false}={}){
  if(!start){if(!Number.isInteger(year)||year<1900||year>9999||month!==null&&(!Number.isInteger(month)||month<0||month>11))throw Error('Kỳ dòng tiền không hợp lệ.');start=month===null?`${year}-01-01`:`${year}-${String(month+1).padStart(2,'0')}-01`;end=month===null?`${year}-12-31`:monthEnd(start.slice(0,7));}
  if(!cardDate(start)||!cardDate(end)||start>end||!cardDate(asOf))throw Error('Kỳ dòng tiền không hợp lệ.');
  const book=financeView(document,creditAllowed===true),through=asOf<end?asOf:end,range=date=>inRange(date,start,through);
  const allEvents=cashEvents(book).filter(r=>range(r.date)),reserveEvents=allEvents.filter(r=>r.source==='savings'),events=allEvents.filter(r=>r.source!=='savings'),inflows=events.filter(r=>r.direction==='in'),outflows=events.filter(r=>r.direction==='out'&&!r.savingsDeposit),savingsDeposits=events.filter(r=>r.savingsDeposit),savingsDeposited=sumMoney(savingsDeposits.map(r=>r.amount));
  const actualCashIn=sumMoney(inflows.map(r=>r.amount)),actualCashOut=sumMoney(outflows.map(r=>r.amount));
  const opening=sourceOpening(book.accounts),before=cardDate(previousDate(start))?accountBalances(book,previousDate(start)):null;
  let openingBalance=previousDate(start)<=asOf?before:null;
  if(start<=asOf&&!before&&opening?.date===start&&opening.timing==='start')openingBalance={bank:opening.bank,cash:opening.cash,savings:opening.savings||0};
  const openingCash=cashAssets(openingBalance),closingBalance=through>=start?accountBalances(book,through):null,closingCash=cashAssets(closingBalance);
  const availableFunds=through<start||openingCash===null?null:addMoney(openingCash,actualCashIn),expectedClosing=availableFunds===null?null:subtractMoney(availableFunds,actualCashOut,savingsDeposited);
  const cashChange=closingCash===null||openingCash===null?null:subtractMoney(closingCash,openingCash);
  const adjustment=closingCash===null||expectedClosing===null?null:subtractMoney(closingCash,expectedClosing);
  const creditPurchases=Object.entries(book.days).flatMap(([date,entry])=>entry.items.filter(i=>i.paymentMethod==='card'&&!i.cardFeeMonth&&actualItem(i)&&range(date)).map(i=>({...i,date,source:'card'})));
  const planned=Object.entries(book.days).flatMap(([date,entry])=>entry.items.filter(i=>i.status==='planned'&&!['card','savings'].includes(i.paymentMethod)&&!isInternalMovement(i)&&!isCardPayment(i)&&inRange(date,start,end)).map(i=>({...i,date,source:accountSource(i)})));
  const upcoming=(book.cards?.statements||[]).filter(s=>s.status!=='draft'&&s.confirmedOn<=asOf&&inRange(s.dueDate,start,end)&&statementProgress(s,through).remaining>0).map(s=>({...s,...statementProgress(s,through)}));
  const economicIncome=sumMoney(inflows.filter(r=>r.economicIncome).map(r=>r.amount)),nonIncomeIn=subtractMoney(actualCashIn,economicIncome);
  const sourceOut=Object.fromEntries(['bank','cash','savings'].map(source=>[source,sumMoney(outflows.filter(r=>r.source===source).map(r=>r.amount))]));
  return {start,end,asOf:through,future:through<start,events,inflows,outflows,reserveEvents,savingsDeposits,savingsDeposited,actualCashIn,actualCashOut,economicIncome,nonIncomeIn,openingCash,closingCash,openingBalance,closingBalance,cashChange,availableFunds,expectedClosing,adjustment,
    usageRatio:availableFunds!==null&&availableFunds>0?Number((moneyUnits(actualCashOut)*10000n+moneyUnits(availableFunds)/2n)/moneyUnits(availableFunds))/100:null,
    creditPurchases,creditTotal:sumMoney(creditPurchases.map(r=>r.amount)),creditRefunds:(book.cards?.adjustments||[]).filter(r=>!r.voided&&r.type!=='bank-refund'&&range(r.date)),planned,upcoming,plannedTotal:addMoney(sumMoney(planned.map(r=>r.amount)),sumMoney(upcoming.map(s=>s.remaining))),sourceOut,
    directTotal:sumMoney(outflows.filter(r=>r.type==='direct').map(r=>r.amount)),debtTotal:sumMoney(outflows.filter(r=>r.type==='debt').map(r=>r.amount)),cardPaid:sumMoney(outflows.filter(r=>r.type==='card-payment').map(r=>r.amount)),
    credit:creditOverview(book,through)};
}
export const cashDayDetails=(book,date,options={})=>cashPeriodDetails(book,{start:date,end:date,...options});
