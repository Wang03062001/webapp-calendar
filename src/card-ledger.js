import {validateSavingsLedger} from './account-model.js';
import {validateFunds} from './safety-model.js';
import {cardDate,cardMoney,normalizeCards,defaultCards} from './card-model.js';
import {addMoney,subtractMoney,sumMoney} from './money.js';
const components=['oneOff','principal','fees'],sources=['bank','cash','savings'];
const fail=message=>{throw Error(message);};
export function statementParts(statement,asOf='9999-12-31'){
  return Object.fromEntries(components.map(key=>[key,subtractMoney(statement[key]||0,...(statement.adjustments||[]).filter(a=>!a.voided&&a.date<=asOf&&a.component===key).map(a=>a.amount))]));
}
export function statementPayments(statement){
  if(statement.payments!==undefined)return statement.payments.filter(p=>!p.voided);
  if(statement.status!=='paid')return [];
  return [{id:`legacy:${statement.month}`,date:statement.paidOn,source:statement.paymentSource||'bank',amount:sumMoney(Object.values(statementParts(statement))),allocations:statementParts(statement),expenseId:`card-payment-${statement.month}`,legacy:true}];
}
export const cardPayments=data=>(data.cards?.statements||[]).flatMap(s=>statementPayments(s).map(p=>({...p,month:s.month})));
export function statementProgress(statement,asOf='9999-12-31'){
  const parts=statementParts(statement,asOf),payments=statementPayments(statement).filter(p=>p.date<=asOf),paid=sumMoney(payments.map(p=>p.amount));
  const paidParts=Object.fromEntries(components.map(key=>[key,sumMoney(payments.map(p=>p.allocations[key]))]));
  return {total:sumMoney(Object.values(parts)),paid,remaining:subtractMoney(sumMoney(Object.values(parts)),paid),parts,paidParts,remainingParts:Object.fromEntries(components.map(key=>[key,subtractMoney(parts[key],paidParts[key])])),payments};
}
export function normalizePaymentRecords(raw){
  if(!Array.isArray(raw))fail('Lịch sử thanh toán thẻ không hợp lệ.');
  const rows=[];
  for(const p of raw){
    if(!p||!String(p.id||'').trim()||rows.some(r=>r.id===String(p.id))||!cardDate(p.date)||!sources.includes(p.source)||!String(p.expenseId||'').trim())fail('Lần thanh toán thẻ không hợp lệ.');
    if(p.voided!==undefined&&typeof p.voided!=='boolean')fail('Trạng thái hủy thanh toán không hợp lệ.');
    if(p.voided&&(!cardDate(p.voidedOn||p.date)||(p.voidedOn||p.date)<p.date))fail('Ngày hủy thanh toán không hợp lệ.');
    if(p.originalExpense&&(p.originalExpense.id!==p.expenseId||p.originalExpense.amount!==p.amount||p.originalExpense.paymentMethod!==p.source||p.originalExpense.cardPaymentMonth||p.originalExpense.cardFeeMonth||p.originalExpense.debtPaymentId||p.originalExpense.obligationId||p.originalExpense.fundId||p.originalExpense.movement||['planned','cancelled','draft'].includes(p.originalExpense.status)))fail('Giao dịch ngân hàng gốc không hợp lệ.');
    const allocations=Object.fromEntries(components.map(k=>[k,cardMoney(p.allocations?.[k]??0)])),amount=cardMoney(p.amount);
    if(amount<=0||sumMoney(Object.values(allocations))!==amount)fail('Phân bổ gốc, mua một lần và phí không khớp số thực trả.');
    rows.push({id:String(p.id),date:p.date,source:p.source,amount,allocations,expenseId:String(p.expenseId),note:String(p.note||'').slice(0,2000),...(p.reference?{reference:String(p.reference).trim().slice(0,200)}:{}),...(p.originalExpense?{originalExpense:structuredClone(p.originalExpense)}:{}),...(p.voided?{voided:true,voidedOn:p.voidedOn||p.date,voidReason:String(p.voidReason||'').slice(0,2000)}:{})});
  }
  return rows;
}
export function normalizeBillAdjustments(raw){
  if(!Array.isArray(raw))fail('Điều chỉnh sao kê không hợp lệ.');
  const rows=[];
  for(const r of raw){if(!r||!r.id||rows.some(x=>x.id===String(r.id))||!cardDate(r.date)||!['oneOff','fees'].includes(r.component)||cardMoney(r.amount)<=0)fail('Điều chỉnh sao kê không hợp lệ.');rows.push({id:String(r.id),date:r.date,component:r.component,amount:cardMoney(r.amount),note:String(r.note||'').slice(0,2000),...(r.voided?{voided:true}:{})});}
  return rows;
}
export function normalizeCardAdjustments(raw){
  if(!Array.isArray(raw))fail('Lịch sử hoàn tiền thẻ không hợp lệ.');
  const rows=[];
  for(const r of raw){
    if(!r||!String(r.id||'').trim()||rows.some(x=>x.id===String(r.id))||!cardDate(r.date)||!['card-refund','bank-refund','bill-credit'].includes(r.type)||cardMoney(r.amount)<=0||r.type==='bank-refund'&&!sources.includes(r.source)||r.type!=='bill-credit'&&(!r.purchaseId||!cardDate(r.purchaseDate))||r.type==='bill-credit'&&!r.month||r.month&&!cardDate(r.month+'-01')||r.voided!==undefined&&typeof r.voided!=='boolean')fail('Hoàn tiền thẻ không hợp lệ.');
    rows.push({id:String(r.id),date:r.date,type:r.type,amount:cardMoney(r.amount),note:String(r.note||'').slice(0,2000),...(r.source?{source:r.source}:{}),...(r.purchaseId?{purchaseId:String(r.purchaseId),purchaseDate:r.purchaseDate}:{}),...(r.month?{month:r.month,statementAmount:cardMoney(r.statementAmount??r.amount),component:r.component||'oneOff'}:{}),...(r.voided?{voided:true}:{})});
  }
  return rows;
}
function updateStatus(s){
  const progress=statementProgress(s);
  s.status=progress.remaining===0?'paid':progress.paid>0?'partial':'confirmed';
  if(s.status==='paid'&&progress.payments.length){const last=[...progress.payments].sort((a,b)=>a.date.localeCompare(b.date)).at(-1);s.paidOn=last.date;s.paymentSource=last.source;}
  else if(s.status==='paid'){s.paidOn=s.adjustments.filter(a=>!a.voided).map(a=>a.date).sort().at(-1);delete s.paymentSource;}else{delete s.paidOn;delete s.paymentSource;}
}
function apply(data,change){const next=structuredClone(data);next.cards||=defaultCards();change(next);next.cards=normalizeCards(next.cards);validatePaymentLinks(next);validateSavingsLedger(next);validateFunds(next);Object.assign(data,{days:next.days,cards:next.cards,years:next.years});return data;}
export function recordCardPayment(data,month,input){
  return apply(data,next=>{
    const s=next.cards?.statements.find(s=>s.month===month);
    if(!s||s.status==='draft'||!cardDate(input.date)||!sources.includes(input.source))fail('Cần sao kê đã chốt, ngày và nguồn thanh toán hợp lệ.');
    const id=String(input.id||'').trim(),amount=cardMoney(input.amount),progress=statementProgress(s);
    if(!id||amount<=0||amount>progress.remaining||(next.cards.statements||[]).some(b=>(b.payments||[]).some(p=>p.id===id)))fail('Thanh toán bị trùng hoặc vượt số còn phải trả.');
    if(input.reference&&cardPayments(next).some(p=>p.reference===String(input.reference).trim()))fail('Mã giao dịch ngân hàng đã được liên kết.');
    const allocations={oneOff:0,principal:0,fees:0};let remaining=amount;
    for(const key of ['fees','oneOff','principal']){allocations[key]=input.allocations?cardMoney(input.allocations[key]??0):Math.min(remaining,progress.remainingParts[key]);remaining=subtractMoney(remaining,allocations[key]);if(allocations[key]>progress.remainingParts[key])fail('Phân bổ vượt nghĩa vụ còn lại.');}
    if(remaining!==0)fail('Phân bổ gốc, mua một lần và phí không khớp số thực trả.');
    const expenseId=input.bankExpenseId||`card-payment-${id}`;
    if(cardPayments(next).some(p=>p.expenseId===expenseId&&p.date===input.date))fail('Giao dịch đã được liên kết thanh toán.');
    const entry=next.days[input.date]||={note:'',items:[]},existing=entry.items.find(i=>i.id===expenseId);
    let originalExpense;
    if(input.bankExpenseId){if(!existing||existing.amount!==amount||existing.paymentMethod!==input.source||existing.status==='planned'||existing.status==='cancelled'||existing.cardPaymentMonth||existing.cardFeeMonth||existing.debtPaymentId||existing.obligationId||existing.fundId||existing.movement)fail('Giao dịch ngân hàng không khớp lần thanh toán.');originalExpense=structuredClone(existing);}
    else if(Object.values(next.days).some(d=>d.items.some(i=>i.id===expenseId)))fail('Mã giao dịch thanh toán đã tồn tại.');
    const item=existing||{id:expenseId,title:`Thanh toán ${next.cards.name} · ${month}`,category:'Thanh toán thẻ'};
    Object.assign(item,{amount,status:'paid',paymentMethod:input.source,cardPaymentMonth:month,cardPaymentId:id});if(!existing)entry.items.push(item);
    const p={id,date:input.date,source:input.source,amount,allocations,expenseId,note:input.note||'',...(input.reference?{reference:String(input.reference).trim()}:{}),...(originalExpense?{originalExpense}:{})};
    s.payments||=[];s.payments.push(p);updateStatus(s);
    if(!next.years.includes(Number(input.date.slice(0,4))))next.years.push(Number(input.date.slice(0,4)));
  });
}
export function voidCardPayment(data,month,id,{date,reason=''}={}){
  return apply(data,next=>{
    const s=next.cards?.statements.find(s=>s.month===month),p=s?.payments?.find(p=>p.id===id&&!p.voided);
    if(!p)fail('Lần thanh toán không tồn tại hoặc đã hủy.');
    validatePaymentLinks(next);
    const items=next.days[p.date].items,index=items.findIndex(i=>i.id===p.expenseId);
    if(p.originalExpense)items[index]=structuredClone(p.originalExpense);else items.splice(index,1);
    p.voided=true;p.voidedOn=date||p.date;p.voidReason=String(reason);updateStatus(s);
  });
}
export function recordCardAdjustment(data,input){
  return apply(data,next=>{
    const [row]=normalizeCardAdjustments([input]);next.cards.adjustments||=[];
    if(next.cards.adjustments.some(r=>r.id===row.id)||next.cards.statements.some(s=>(s.payments||[]).some(p=>p.id===row.id)))fail('Điều chỉnh này đã tồn tại.');
    if(row.type!=='bill-credit'){
      const purchase=next.days[row.purchaseDate]?.items.find(i=>i.id===row.purchaseId);
      if(!purchase||purchase.paymentMethod!=='card'||['planned','cancelled'].includes(purchase.status)||row.date<row.purchaseDate)fail('Không tìm thấy giao dịch thẻ hợp lệ.');
      const refunded=sumMoney(next.cards.adjustments.filter(r=>!r.voided&&r.purchaseDate===row.purchaseDate&&r.purchaseId===row.purchaseId).map(r=>r.amount));
      if(addMoney(refunded,row.amount)>purchase.amount)fail('Tổng hoàn tiền vượt giá trị giao dịch.');
    }
    if(row.month){
      const s=next.cards.statements.find(s=>s.month===row.month);
      if(!s||s.status==='draft'||row.date<s.confirmedOn||row.type==='bank-refund'||row.statementAmount>row.amount||row.statementAmount>statementProgress(s).remainingParts[row.component])fail('Điều chỉnh vượt nghĩa vụ sao kê chưa trả.');
      s.payments||=[];s.adjustments||=[];s.adjustments.push({id:row.id,date:row.date,component:row.component,amount:row.statementAmount,note:row.note});updateStatus(s);
    }
    next.cards.adjustments.push(row);
  });
}
export function voidCardAdjustment(data,id){
  return apply(data,next=>{const row=next.cards?.adjustments?.find(r=>r.id===id&&!r.voided);if(!row)fail('Không tìm thấy điều chỉnh chưa hủy.');row.voided=true;if(row.month){const s=next.cards.statements.find(s=>s.month===row.month);s.adjustments.find(r=>r.id===id).voided=true;updateStatus(s);}});
}
export function validatePaymentLinks(data){
  const seen=new Set(),ids=new Set(),references=new Set(),rows=Object.entries(data.days).flatMap(([date,d])=>d.items.filter(i=>i.cardPaymentMonth).map(item=>({date,item})));
  for(const p of cardPayments(data)){
    const matches=rows.filter(r=>r.item.cardPaymentMonth===p.month&&r.item.id===p.expenseId);
    if(matches.length!==1||matches[0].date!==p.date||matches[0].item.amount!==p.amount||matches[0].item.paymentMethod!==p.source||matches[0].item.status!=='paid'||!p.legacy&&matches[0].item.cardPaymentId!==p.id||seen.has(p.date+'|'+p.expenseId)||p.reference&&references.has(p.reference))fail('Thanh toán liên kết không khớp sao kê.');
    if(ids.has(p.id))fail('Mã lần thanh toán bị trùng.');ids.add(p.id);
    seen.add(p.date+'|'+p.expenseId);if(p.reference)references.add(p.reference);
  }
  if(rows.some(r=>!seen.has(r.date+'|'+r.item.id)))fail('Dòng thanh toán không có lịch sử liên kết.');
  for(const s of data.cards?.statements||[])for(const a of s.adjustments||[])if(!(data.cards.adjustments||[]).some(r=>r.id===a.id&&r.month===s.month))fail('Thiếu lịch sử điều chỉnh sao kê.');
  for(const r of data.cards?.adjustments||[]){
    if(r.type!=='bill-credit'&&r.date<r.purchaseDate)fail('Ngày hoàn tiền có trước ngày mua.');
    if(r.type!=='bill-credit'&&!data.days[r.purchaseDate]?.items.some(i=>i.id===r.purchaseId&&i.paymentMethod==='card'))fail('Mất liên kết hoàn tiền thẻ.');
    if(r.month){const a=data.cards.statements.find(s=>s.month===r.month)?.adjustments?.find(a=>a.id===r.id);if(!a||a.component!==r.component||a.amount!==r.statementAmount||a.date!==r.date||Boolean(a.voided)!==Boolean(r.voided))fail('Điều chỉnh sao kê không khớp lịch sử.');}
  }
  for(const [date,entry]of Object.entries(data.days))for(const item of entry.items)if(item.paymentMethod==='card'&&!item.cardFeeMonth){const refunded=sumMoney((data.cards?.adjustments||[]).filter(r=>!r.voided&&r.purchaseDate===date&&r.purchaseId===item.id).map(r=>r.amount));if(refunded>item.amount)fail('Tổng hoàn tiền vượt giá trị giao dịch.');}
}
