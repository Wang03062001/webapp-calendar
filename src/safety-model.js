import {cardMoney,cardDate,validMonth,roundCard,statementNumbers} from './card-model.js';
import {accountBalances,accountSource,isInternalMovement} from './account-model.js';
const sources=['bank','cash','savings'];
const fail=message=>{throw Error(message);};
const text=x=>String(x??'').trim();
const rate=x=>{const n=Number(x);if(!['string','number'].includes(typeof x)||typeof x==='string'&&!x.trim()||x==null||!Number.isFinite(n)||n<0||n>1000)fail('Lãi suất không hợp lệ.');return n;};
export const addDays=(date,days)=>{if(!cardDate(date))fail('Ngày không hợp lệ.');return new Date(Math.min(Date.parse('9999-12-31T00:00:00Z'),Date.parse(date+'T00:00:00Z')+days*86400000)).toISOString().slice(0,10);};
export const remainingDebt=(debt,date)=>roundCard(debt.amount-debt.payments.filter(p=>!p.voided&&p.date<=date).reduce((s,p)=>s+p.amount,0));
export function normalizeSafety(raw,data){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Thiết lập an toàn không hợp lệ.');
 const currency=data.currencies?.cash||'JPY';if(raw.currency!==undefined&&raw.currency!==currency)fail('Tiền tệ kế hoạch không khớp sổ.');
 const result={currency,funds:[],budgets:[],obligations:[],debtTerms:[],essentialMonthly:cardMoney(raw.essentialMonthly??0),reserveMonths:Number(raw.reserveMonths??3),monthlyDebtBudget:cardMoney(raw.monthlyDebtBudget??0),cardSource:raw.cardSource||'bank'};
 if(!Number.isInteger(result.reserveMonths)||result.reserveMonths<1||result.reserveMonths>120||!sources.includes(result.cardSource))fail('Thiết lập dự phòng không hợp lệ.');
 for(const key of ['funds','budgets','obligations','debtTerms'])if(raw[key]!==undefined&&!Array.isArray(raw[key]))fail('Danh sách an toàn không hợp lệ.');
 for(const f of raw.funds||[]){
  if(!f||!text(f.id)||result.funds.some(x=>x.id===text(f.id))||!text(f.name)||!sources.includes(f.source)||!['goal','emergency'].includes(f.kind)||!Array.isArray(f.entries))fail('Quỹ không hợp lệ.');
  const fund={id:text(f.id),name:text(f.name).slice(0,160),source:f.source,kind:f.kind,target:cardMoney(f.target),archived:f.archived===true,entries:[]};
  if(fund.kind==='goal'&&fund.target<=0)fail('Mục tiêu quỹ phải lớn hơn 0.');
  for(const e of f.entries){if(!e||!text(e.id)||fund.entries.some(x=>x.id===text(e.id))||!cardDate(e.date)||!['allocate','release'].includes(e.direction)||cardMoney(e.amount)<=0)fail('Phân bổ quỹ không hợp lệ.');fund.entries.push({id:text(e.id),date:e.date,direction:e.direction,amount:cardMoney(e.amount),note:String(e.note||'').slice(0,500)});}
  result.funds.push(fund);
 }
 for(const b of raw.budgets||[]){if(!b||!validMonth(b.month)||!text(b.category)||result.budgets.some(x=>x.month===b.month&&x.category===text(b.category).slice(0,100)))fail('Ngân sách bị trùng hoặc không hợp lệ.');result.budgets.push({month:b.month,category:text(b.category).slice(0,100),amount:cardMoney(b.amount)});}
 const obligationLinks=new Set();
 for(const o of raw.obligations||[]){
  const matches=data.days[o?.date]?.items.filter(i=>i.id===o.expenseId)||[],item=matches[0];
  if(!o||!text(o.id)||result.obligations.some(x=>x.id===text(o.id))||!cardDate(o.date)||matches.length!==1||!item||item.amount<=0||item.obligationId!==text(o.id)||item.cardFeeMonth||item.cardPaymentMonth||item.debtPaymentId||item.paymentMethod==='card'||isInternalMovement(item)||obligationLinks.has(o.date+':'+o.expenseId))fail('Khoản phải trả không khớp giao dịch.');
  obligationLinks.add(o.date+':'+o.expenseId);if(o.dueDate&&(!cardDate(o.dueDate)||item.status==='planned'&&o.date!==o.dueDate))fail('Ngày đến hạn không hợp lệ.');
  const history=[];if(o.history!==undefined&&!Array.isArray(o.history))fail('Lịch sử phải trả không hợp lệ.');for(const h of o.history||[]){if(!h||!text(h.id)||history.some(x=>x.id===text(h.id))||!cardDate(h.date)||!['paid','undo'].includes(h.action)||h.source&&!sources.includes(h.source)||h.expenseDate&&!cardDate(h.expenseDate))fail('Lịch sử phải trả không hợp lệ.');history.push({id:text(h.id),date:h.date,action:h.action,...(h.amount!==undefined?{amount:cardMoney(h.amount)}:{}),...(h.source?{source:h.source}:{}),...(h.expenseDate?{expenseDate:h.expenseDate}:{})});}
  result.obligations.push({id:text(o.id),date:o.date,expenseId:String(o.expenseId),...(o.dueDate?{dueDate:o.dueDate}:{}),...(o.history?{history}:{})});
 }
 for(const [date,day] of Object.entries(data.days))for(const item of day.items)if(item.obligationId&&!result.obligations.some(o=>o.id===item.obligationId&&o.date===date&&o.expenseId===item.id))fail('Thiếu lịch phải trả liên kết.');
 for(const t of raw.debtTerms||[]){if(!t||!data.debts.some(d=>d.id===t.debtId)||result.debtTerms.some(x=>x.debtId===t.debtId)||!sources.includes(t.source)||t.nextDueDate&&!cardDate(t.nextDueDate))fail('Điều kiện trả nợ không hợp lệ.');result.debtTerms.push({debtId:t.debtId,apr:t.apr==null||String(t.apr).trim()===''?null:rate(t.apr),minimum:t.minimum==null||String(t.minimum).trim()===''?null:cardMoney(t.minimum),source:t.source,...(t.nextDueDate?{nextDueDate:t.nextDueDate}:{})});}
 return result;
}
export function fundBalance(data,id,date){
 const f=data.safety?.funds.find(f=>f.id===id);if(!f)return 0;
 const allocated=f.entries.filter(e=>e.date<=date).reduce((s,e)=>s+(e.direction==='allocate'?e.amount:-e.amount),0);
 const spent=Object.entries(data.days).filter(([day])=>day<=date).reduce((s,[,entry])=>s+entry.items.filter(i=>i.fundId===id&&i.status!=='planned').reduce((v,i)=>v+i.amount,0),0);
 return roundCard(allocated-spent);
}
export function reservedBySource(data,date){const result={bank:0,cash:0,savings:0};for(const f of data.safety?.funds||[])result[f.source]+=fundBalance(data,f.id,date);for(const key of sources)result[key]=roundCard(result[key]);return result;}
export function validateFunds(data){
 const funds=data.safety?.funds||[],dates=new Set();
 for(const f of funds){for(const e of f.entries)dates.add(e.date);}
 for(const [date,day]of Object.entries(data.days))for(const item of day.items){
  if(item.fundId){const f=funds.find(f=>f.id===item.fundId);if(!f||item.paymentMethod!==f.source||item.cardPaymentMonth||item.cardFeeMonth||item.debtPaymentId||isInternalMovement(item))fail('Nguồn chi không khớp quỹ.');}
  dates.add(date);
 }
 if(!funds.length)return;
 for(const r of data.receipts||[])dates.add(r.date);
 for(const t of data.accounts?.transfers||[])dates.add(t.date);
 for(const r of data.accounts?.reconciliations||[])dates.add(r.date);
 for(const [month,i]of Object.entries(data.incomes))dates.add(i.receivedOn||month+'-15');
 for(const s of data.cards?.statements||[])if(s.status==='paid')dates.add(s.paidOn);
 for(const date of dates){
  for(const f of funds)if(fundBalance(data,f.id,date)<0)fail('Quỹ không đủ tiền.');
  const reserved=reservedBySource(data,date),balances=accountBalances(data,date);
  for(const source of sources)if(reserved[source]>Math.max(0,balances?.[source]??0))fail('Tiền dành cho quỹ vượt số dư nguồn. Hãy giải phóng quỹ hoặc chọn đúng quỹ khi chi.');
 }
 for(const f of funds)if(f.archived&&fundBalance(data,f.id,'9999-12-31')!==0)fail('Chỉ đóng quỹ khi đã giải phóng hết tiền.');
}
export function emergencySummary(data,date){const saved=roundCard((data.safety?.funds||[]).filter(f=>f.kind==='emergency').reduce((s,f)=>s+fundBalance(data,f.id,date),0));const essential=data.safety?.essentialMonthly||0,months=data.safety?.reserveMonths||3;return {saved,essential,target:roundCard(essential*months),monthsCovered:essential>0?saved/essential:null,targetMonths:months};}
export function budgetRows(data,month){return (data.safety?.budgets||[]).filter(b=>b.month===month).map(b=>{
 let spent=0,planned=0;
 for(const [date,day]of Object.entries(data.days))if(date.startsWith(month+'-'))for(const item of day.items)if((item.category||(item.debtPaymentId?'Trả nợ':'Khác'))===b.category&&!item.cardFeeMonth&&!item.cardPaymentMonth&&!isInternalMovement(item)){if(item.status==='planned')planned+=item.amount;else spent+=item.amount;}
 return {...b,spent:roundCard(spent),planned:roundCard(planned),remaining:roundCard(b.amount-spent),over:roundCard(Math.max(0,spent-b.amount))};
});}
export function upcomingObligations(data,asOf){
 const rows=[];
 for(const [date,day]of Object.entries(data.days))for(const item of day.items)if(item.status==='planned'&&item.amount>0&&item.paymentMethod!=='card'&&!item.cardFeeMonth&&!item.cardPaymentMonth&&!isInternalMovement(item))rows.push({id:'expense:'+date+':'+item.id,type:'expense',date,title:item.title||'Khoản dự kiến',amount:item.amount,source:accountSource(item),fundId:item.fundId||null,obligationId:item.obligationId||null});
 for(const d of data.debts){
  const term=data.safety?.debtTerms.find(t=>t.debtId===d.id),due=term?.nextDueDate||d.dueDate;if(!due||remainingDebt(d,asOf)<=0)continue;
  const paid=d.payments.filter(p=>!p.voided&&p.date<=asOf&&p.date>=due.slice(0,7)+'-01').reduce((s,p)=>s+p.amount+(p.interest||0),0);
  const amount=term&&term.minimum!=null?roundCard(Math.min(remainingDebt(d,asOf),Math.max(0,term.minimum-paid))):null;
  if(amount!==0)rows.push({id:'debt:'+d.id,type:'debt',date:due,title:d.title,amount,source:term?.source||null,debtId:d.id});
 }
 for(const s of data.cards?.statements||[])if(s.status!=='paid')rows.push({id:'card:'+s.month,type:'card',date:s.dueDate,title:'Sao kê '+s.month,amount:statementNumbers(s).total,source:data.safety?.cardSource||'bank',estimated:s.status==='draft'});
 return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
export function forecast30(data,asOf){
 const initial=accountBalances(data,asOf);if(!initial)return {ready:false,days:[],unknown:[],obligations:[]};
 const end=addDays(asOf,30),events=[],unknown=[];
 const push=e=>{if(e.date>asOf&&e.date<=end)events.push(e);};
 const obligations=upcomingObligations(data,asOf).filter(o=>o.date<=end);
 // Planned expenses are represented by exactly one obligation row, not twice.
 for(const o of obligations){if(o.amount==null||!o.source){unknown.push(o);continue;}push({...o,date:o.date<=asOf?addDays(asOf,1):o.date,delta:-o.amount,overdue:o.date<=asOf});}
 for(const [month,i]of Object.entries(data.incomes))push({date:i.receivedOn||month+'-15',source:i.account||'bank',delta:(i.salary||0)+(i.bonus||0),title:'Lương & thưởng'});
 for(const r of data.receipts||[])push({date:r.date,source:r.source,delta:r.amount,title:r.note||'Tiền nhận'});
 for(const [date,day]of Object.entries(data.days))for(const i of day.items){
  if(i.status==='planned'||i.paymentMethod==='card'||i.cardPaymentMonth||i.cardFeeMonth)continue;
  if(isInternalMovement(i)){const from=i.movement==='withdraw'?'bank':'cash',to=from==='bank'?'cash':'bank';push({date,source:from,delta:-i.amount,title:i.title});push({date,source:to,delta:i.amount,title:i.title});}
  else push({date,source:accountSource(i),delta:-i.amount,title:i.title,fundId:i.fundId||null});
 }
 for(const t of data.accounts.transfers){push({date:t.date,source:t.from,delta:-t.amount,title:'Chuyển nguồn'});push({date:t.date,source:t.to,delta:t.amount,title:'Chuyển nguồn'});}
 for(const s of data.cards?.statements||[])if(s.status==='paid')push({date:s.paidOn,source:s.paymentSource||'bank',delta:-statementNumbers(s).total,title:'Trả sao kê'});
 // A future actual loan payment already entered replaces its forecast minimum.
 for(const o of obligations.filter(o=>o.type==='debt'&&o.amount!=null)){
  const d=data.debts.find(d=>d.id===o.debtId);const future=d.payments.filter(p=>!p.voided&&p.date>asOf&&p.date<=end&&p.date>=o.date.slice(0,7)+'-01').reduce((s,p)=>s+p.amount+(p.interest||0),0);
  const event=events.find(e=>e.id===o.id);if(event)event.delta=-roundCard(Math.max(0,o.amount-future));
 }
 const balances={bank:initial.bank,cash:initial.cash,savings:initial.savings||0},days=[];
 const plannedFundSpending=new Map();
 for(let n=1;n<=30;n++){
  const date=addDays(asOf,n);if(date<=asOf||date===days.at(-1)?.date)break;const today=events.filter(e=>e.date===date&&e.delta!==0);
  for(const e of today){balances[e.source]=roundCard(balances[e.source]+e.delta);if(e.fundId&&e.type==='expense')plannedFundSpending.set(e.fundId,(plannedFundSpending.get(e.fundId)||0)+Math.max(0,-e.delta));}
  const earmarked={bank:0,cash:0,savings:0};let fundShortage=false;
  for(const f of data.safety?.funds||[]){const left=roundCard(fundBalance(data,f.id,date)-(plannedFundSpending.get(f.id)||0));if(left<0)fundShortage=true;earmarked[f.source]+=Math.max(0,left);}
  const free=Object.fromEntries(sources.map(s=>[s,roundCard(balances[s]-earmarked[s])]));
  days.push({date,...balances,total:roundCard(balances.bank+balances.cash+balances.savings),free,shortage:sources.some(s=>balances[s]<0),fundShortage,reservedShortage:sources.some(s=>free[s]<0)||fundShortage,events:today});
 }
 return {ready:true,initial,days,unknown,obligations,firstShortage:days.find(d=>d.shortage||d.reservedShortage)?.date||null};
}
export function debtCandidates(data,asOf){
 const candidates=data.debts.filter(d=>remainingDebt(d,asOf)>0).map(d=>{const t=data.safety?.debtTerms.find(t=>t.debtId===d.id);return {id:d.id,title:d.title,balance:remainingDebt(d,asOf),apr:t?.apr??null,minimum:t?.minimum??null};});
 if(data.cards?.safetyPlan){const p=data.cards.safetyPlan;candidates.push({id:'@card',title:'Thẻ tín dụng',balance:p.principal,apr:p.apr,minimum:p.minimum,stale:p.asOf!==asOf});}
 else if((data.cards?.statements||[]).some(s=>s.status!=='paid'&&statementNumbers(s).total>0)||((accountBalances(data,asOf)?.creditDebt||0)>0))candidates.push({id:'@card',title:'Thẻ tín dụng',balance:null,apr:null,minimum:null});
 return candidates;
}
export function simulatePayoff(candidates,budget,strategy='avalanche'){
 if(!['avalanche','snowball'].includes(strategy))fail('Chiến lược không hợp lệ.');budget=cardMoney(budget);
 const missing=candidates.filter(c=>c.balance!==0&&(c.balance==null||c.apr==null||c.minimum==null||c.stale));
 if(missing.length)return {status:'missing',missing:missing.map(c=>c.title)};
 const debts=candidates.filter(c=>c.balance>0).map(c=>({...c,balance:cardMoney(c.balance),apr:rate(c.apr),minimum:cardMoney(c.minimum)}));
 if(!debts.length)return {status:'paid',months:0,interest:0,totalPaid:0,schedule:[]};
 if(budget<=0)return {status:'budget',months:0,schedule:[]};
 let interest=0,totalPaid=0;const schedule=[];
 for(let month=1;month<=600;month++){
  const previous=debts.map(d=>d.balance);
  let accrued=0;for(const d of debts){const charge=roundCard(d.balance*d.apr/1200);d.balance=roundCard(d.balance+charge);accrued+=charge;}
  interest=roundCard(interest+accrued);const required=roundCard(debts.reduce((s,d)=>s+Math.min(d.minimum,d.balance),0));
  if(required>budget)return {status:'minimum',required,months:month-1,interest,totalPaid,schedule};
  let left=budget,paid=0;
  for(const d of debts){const amount=Math.min(d.minimum,d.balance);d.balance=roundCard(d.balance-amount);left=roundCard(left-amount);paid+=amount;}
  const order=[...debts].sort((a,b)=>strategy==='avalanche'?b.apr-a.apr||a.balance-b.balance:a.balance-b.balance||b.apr-a.apr);
  for(const d of order){const amount=Math.min(left,d.balance);d.balance=roundCard(d.balance-amount);left=roundCard(left-amount);paid+=amount;}
  totalPaid=roundCard(totalPaid+paid);const balance=roundCard(debts.reduce((s,d)=>s+d.balance,0));schedule.push({month,paid:roundCard(paid),interest:roundCard(accrued),balance});
  if(balance>0&&debts.every((d,i)=>d.balance>=previous[i]))return {status:'nonamortizing',months:month,interest,totalPaid,schedule};
  if(balance===0)return {status:'complete',months:month,interest,totalPaid,schedule};
 }
 return {status:'limit',months:600,interest,totalPaid,schedule};
}
