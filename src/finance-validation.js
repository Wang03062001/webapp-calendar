import {isCardPaymentCategory} from './credit-types.js';
import {wholeCurrencyMoney} from './money.js';
import {statementProgress} from './card-ledger.js';
import {shiftMonth} from './card-model.js';
const moneyFields=new Set(['amount','salary','bonus','bank','cash','savings','creditDebt','creditLimit','oneOff','priorBalance','newRibo','principal','fees','interest','target','essentialMonthly','monthlyDebtBudget','minimum','expectedBank','expectedCash','expectedSavings','deltaBank','deltaCash','deltaSavings','statementAmount','estimatedPrincipal','estimatedFees','monthlyPrincipal']);
export function validateMoneyChanges(before,next){
 const compatible=new Set();for(const bill of next.cards?.statements||[]){const prior=before?.cards?.statements?.find(s=>s.month===bill.month);if(!prior)continue;const remaining=statementProgress(prior).remaining;if(Number.isInteger(remaining))continue;for(const p of bill.payments||[])if(!prior.payments?.some(old=>old.id===p.id)&&p.amount===remaining){compatible.add(p.id);compatible.add(p.expenseId);}}
 const currency=next.currencies?.cash||'JPY',legacyCurrency=next.currencies?.savings||'VND';
 function visit(value,old,key='',legacy=false,compat=false){
  if(value?.id&&compatible.has(value.id))compat=true;
  if(typeof value==='number'&&(moneyFields.has(key)||legacy)){wholeCurrencyMoney(value,legacy?legacyCurrency:currency,compat?value:old);return;}
  if(Array.isArray(value)){for(const [index,row]of value.entries()){const prior=Array.isArray(old)?old.find((r,i)=>row?.id?r?.id===row.id:row?.month?r?.month===row.month:i===index):undefined;visit(row,prior,key,legacy,compat);}return;}
  if(value&&typeof value==='object')for(const [name,row]of Object.entries(value)){if(name==='regional')continue;visit(row,old?.[name],name,legacy,compat);}
 }
 visit(next,before);for(const key of ['savings','goals'])visit(next[key],before?.[key],key,true);
}
export function validateCreditEdits(before,next){
 for(const [date,entry]of Object.entries(next.days))for(const item of entry.items)if(isCardPaymentCategory(item.category)&&(item.paymentMethod==='card'||item.movement||item.debtPaymentId||item.obligationId)){const old=before.days[date]?.items.find(i=>i.id===item.id);if(!old||JSON.stringify(old)!==JSON.stringify(item))throw Error('Thanh toán thẻ phải dùng ngân hàng, tiền mặt hoặc tiết kiệm; không dùng nguồn tín dụng.');}
 for(const [date,entry]of Object.entries(before.days))for(const item of entry.items)if(item.paymentMethod==='card'&&!item.cardFeeMonth&&!['planned','draft','cancelled'].includes(item.status)){
  const bill=before.cards?.statements.find(s=>s.month===(item.billingMonth||shiftMonth(date.slice(0,7),1))),adjusted=before.cards?.adjustments?.some(r=>r.purchaseDate===date&&r.purchaseId===item.id);
  if(!adjusted&&(item.creditTracking||!bill||bill.status==='draft'))continue;
  const candidate=next.days[date]?.items.find(i=>i.id===item.id),fields=['amount','paymentMethod','status','settlement','billingMonth'];
  if(!candidate||fields.some(k=>candidate[k]!==item[k]))throw Error('Giao dịch đã liên kết sao kê hoặc hoàn tiền. Dùng điều chỉnh / hoàn tiền trong Thẻ & sao kê.');
 }
}

export function validateActualDates(before,next,today){
 const same=(a,b,fields)=>a&&b&&fields.every(key=>a[key]===b[key]);
 for(const [date,entry]of Object.entries(next.days))if(date>today)for(const item of entry.items)if(!['planned','draft','cancelled'].includes(item.status)){
  const old=before.days[date]?.items.find(i=>i.id===item.id);
  if(!same(old,item,['amount','paymentMethod','status','movement','cardPaymentMonth']))throw Error('Ngày thực trả / phát sinh chưa đến. Hãy giữ trạng thái Dự kiến.');
 }
 for(const [month,row]of Object.entries(next.incomes))if(row.status!=='planned'&&(row.receivedOn||month+'-15')>today&&!same(before.incomes[month],row,['salary','bonus','receivedOn','status','account']))throw Error('Chưa đến ngày thực nhận. Hãy chọn Dự kiến chưa nhận.');
 for(const row of next.receipts||[])if(row.date>today&&!same((before.receipts||[]).find(r=>r.id===row.id),row,['amount','date','source','type']))throw Error('Chưa thể ghi tiền thực nhận cho ngày tương lai.');
}
