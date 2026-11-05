import {normalizeData} from './model.js';
import {cardDate} from './card-model.js';
import {normalizeSafety} from './safety-model.js';
import {isCreditItem} from './credit-access.js';

const creditDebt=(data,id)=>data.debts.some(d=>d.id===id&&d.type==='Thẻ tín dụng');
const linkedItem=(data,o)=>data.days[o.date]?.items.find(i=>i.id===o.expenseId&&i.obligationId===o.id);
export function safetyCleanupPreview(data){
 const s=data.safety;
 return {funds:s?.funds.length||0,budgets:s?.budgets.length||0,planned:(s?.obligations||[]).filter(o=>linkedItem(data,o)?.status==='planned').length,retained:(s?.obligations||[]).filter(o=>linkedItem(data,o)?.status!=='planned').length,debtTerms:(s?.debtTerms||[]).filter(t=>!creditDebt(data,t.debtId)).length};
}

// A scoped, explicit removal. Snapshots are audit text only, never financial inputs.
// The caller writes the resulting active book through writeBook/commitConfirmed.
export function cleanupSafety(data,{action,id='',date,removePlanned=true,auditId=crypto.randomUUID()}={}){
 if(!cardDate(date)||!auditId||!['reset','fund','obligation','planned','debtTerms'].includes(action))throw Error('Thao tác xóa không hợp lệ.');
 const next=structuredClone(data);next.safety||=normalizeSafety({},next);const s=next.safety;
 const snapshot={funds:[],budgets:[],obligations:[],debtTerms:[],items:[]};let label='';
 const removeLink=o=>{
  const row=linkedItem(next,o);if(!row)throw Error('Khoản phải trả không khớp giao dịch.');
  snapshot.obligations.push(structuredClone(o));snapshot.items.push({date:o.date,item:structuredClone(row)});
  if(removePlanned&&row.status==='planned')next.days[o.date].items=next.days[o.date].items.filter(i=>i!==row);
  else delete row.obligationId;
  s.obligations=s.obligations.filter(x=>x.id!==o.id);
 };
 const removeFund=f=>{
  snapshot.funds.push(structuredClone(f));
  for(const [day,entry] of Object.entries(next.days))for(const row of entry.items)if(row.fundId===f.id){
   if(!snapshot.items.some(x=>x.date===day&&x.item.id===row.id))snapshot.items.push({date:day,item:structuredClone(row)});
   delete row.fundId;
  }
  s.funds=s.funds.filter(x=>x.id!==f.id);
 };
 if(action==='reset'){
  for(const o of [...s.obligations])removeLink(o);
  for(const f of [...s.funds])removeFund(f);
  snapshot.budgets=structuredClone(s.budgets);s.budgets=[];
  snapshot.debtTerms=structuredClone(s.debtTerms.filter(t=>!creditDebt(next,t.debtId)));
  s.debtTerms=s.debtTerms.filter(t=>creditDebt(next,t.debtId));
  snapshot.settings={essentialMonthly:s.essentialMonthly,reserveMonths:s.reserveMonths,monthlyDebtBudget:s.monthlyDebtBudget};
  s.essentialMonthly=0;s.reserveMonths=3;s.monthlyDebtBudget=0;
  // Legacy credit settings are protected by creditSnapshot and their original UI.
 }else if(action==='fund'){
  const f=s.funds.find(x=>x.id===id);if(!f)throw Error('Quỹ đã thay đổi.');label=f.name;removeFund(f);
 }else if(action==='obligation'){
  const o=s.obligations.find(x=>x.id===id);if(!o)throw Error('Lịch phải trả đã thay đổi.');label=linkedItem(next,o)?.title||'';removeLink(o);
 }else if(action==='planned'){
  const [day,itemId]=JSON.parse(id),row=next.days[day]?.items.find(i=>i.id===itemId);
  if(!row||row.status!=='planned'||row.obligationId||row.debtId||row.debtPaymentId||row.cardFeeMonth||row.cardPaymentMonth||row.paymentMethod==='card'||row.movement||row.legacyTransferId)throw Error('Chỉ xóa khoản dự kiến thông thường chưa chi.');
  label=row.title;snapshot.items.push({date:day,item:structuredClone(row)});next.days[day].items=next.days[day].items.filter(i=>i!==row);
 }else{
  const term=s.debtTerms.find(t=>t.debtId===id);if(!term||creditDebt(next,id))throw Error('Không thể xóa điều kiện trả nợ này.');
  label=next.debts.find(d=>d.id===id)?.title||'';snapshot.debtTerms.push(structuredClone(term));s.debtTerms=s.debtTerms.filter(t=>t.debtId!==id);
 }
 const creditProtected=snapshot.items.some(({item})=>isCreditItem(item));
 (s.cleanupHistory||=[]).push({id:auditId,date,action,label,snapshot:JSON.stringify(snapshot),...(creditProtected?{creditProtected:true}:{})});
 return normalizeData(next);
}
