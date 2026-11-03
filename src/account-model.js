import { financeView } from './credit-access.js';
import { cardMoney, cardDate, roundCard, statementNumbers, validMonth } from './card-model.js';
export const accountSource = item => item.paymentMethod === 'card' ? 'card' : item.paymentMethod === 'bank' ? 'bank' : item.paymentMethod==='savings'?'savings':'cash';
export const isInternalMovement = item => ['withdraw','deposit'].includes(item.movement);
export const monthEnd = month => { if(!validMonth(month))throw Error('Tháng không hợp lệ.'); const [year,m]=month.split('-').map(Number); return `${month}-${String(new Date(Date.UTC(year,m,0)).getUTCDate()).padStart(2,'0')}`; };
const signedMoney=value=>{const n=Number(value);if(!Number.isFinite(n)||roundCard(n)!==n)throw Error('Số tiền đối chiếu không hợp lệ.');return n;};
export const moneyKind = item => item.cardPaymentMonth ? 'payment' : accountSource(item);
export const isCardPayment = item => Boolean(item.cardPaymentMonth);
export function normalizeAccounts(raw) {
  if (!raw || !cardDate(raw.openedOn) || !Array.isArray(raw.transfers)) throw new Error('Sổ nguồn tiền không hợp lệ.');
  const result = { openedOn:raw.openedOn, bank:cardMoney(raw.bank), cash:cardMoney(raw.cash), creditDebt:cardMoney(raw.creditDebt), creditLimit:raw.creditLimit == null ? null : cardMoney(raw.creditLimit), transfers:[] };
  if(raw.savings!==undefined){result.savings=cardMoney(raw.savings);if(raw.savingsOpenedOn!==undefined){if(!cardDate(raw.savingsOpenedOn)||raw.savingsOpenedOn<raw.openedOn)throw Error('Ngày tiết kiệm không hợp lệ.');result.savingsOpenedOn=raw.savingsOpenedOn;}}
  for(const item of raw.transfers) {
    if(!item || !String(item.id||'').trim() || result.transfers.some(t=>t.id===String(item.id)) || !cardDate(item.date) || !['bank','cash','savings'].includes(item.from) || !['bank','cash','savings'].includes(item.to) || item.from===item.to || cardMoney(item.amount)<=0) throw new Error('Chuyển tiền không hợp lệ.');
    result.transfers.push({id:String(item.id),date:item.date,from:item.from,to:item.to,amount:cardMoney(item.amount)});
  }
  if(raw.reconciliations!==undefined){
    if(!Array.isArray(raw.reconciliations))throw Error('Lịch sử đối chiếu không hợp lệ.');
    result.reconciliations=[];
    for(const row of raw.reconciliations){
      if(!row||!String(row.id||'').trim()||result.reconciliations.some(r=>r.id===String(row.id))||!cardDate(row.date)||(row.kind!=='manual'&&row.date!==monthEnd(row.date.slice(0,7)))||row.date<result.openedOn)throw Error('Đối chiếu cuối tháng không hợp lệ.');
      const r={id:String(row.id),date:row.date,bank:cardMoney(row.bank),cash:cardMoney(row.cash),expectedBank:signedMoney(row.expectedBank),expectedCash:signedMoney(row.expectedCash),deltaBank:signedMoney(row.deltaBank),deltaCash:signedMoney(row.deltaCash),note:String(row.note||'').slice(0,20000)};
      if(r.deltaBank!==roundCard(r.bank-r.expectedBank)||r.deltaCash!==roundCard(r.cash-r.expectedCash))throw Error('Chênh lệch đối chiếu không khớp.');
      if(row.savings!==undefined){r.savings=cardMoney(row.savings);r.expectedSavings=signedMoney(row.expectedSavings);r.deltaSavings=signedMoney(row.deltaSavings);if(r.deltaSavings!==roundCard(r.savings-r.expectedSavings))throw Error('Chênh lệch tiết kiệm không khớp.');}
      if(row.kind!==undefined){if(row.kind!=='manual'||!cardDate(row.confirmedOn)||row.date>row.confirmedOn||row.date===monthEnd(row.date.slice(0,7)))throw Error('Cập nhật số dư không hợp lệ.');r.kind='manual';r.confirmedOn=row.confirmedOn;}
      result.reconciliations.push(r);
    }
  }
  for(const month of new Set((result.reconciliations||[]).filter(r=>r.kind==='manual').map(r=>r.confirmedOn.slice(0,7))))if(balanceUpdateCount(result,month)>3)throw Error('Đã dùng hết 3 lượt cập nhật số dư trong tháng.');
  return result;
}
export function moneyOut(data, prefix) {
  const direct = Object.entries(data.days).filter(([date])=>date.startsWith(prefix)).reduce((sum,[,entry])=>sum+entry.items.filter(i=>i.status!=='planned' && accountSource(i)!=='card' && !isCardPayment(i) && !isInternalMovement(i)).reduce((s,i)=>s+i.amount,0),0);
  const card = (data.cards?.statements||[]).filter(s=>s.status==='paid' && s.paidOn.startsWith(prefix)).reduce((sum,s)=>sum+statementNumbers(s).total,0);
  return roundCard(direct+card);
}
export function accountBalances(data, through, {ignoreReconciliationOn} = {}) {
  if(!data.accounts)return null;
  if(!cardDate(through))throw new Error('Ngày không hợp lệ.');
  const a=normalizeAccounts(data.accounts);if(through<a.openedOn)return null;
  const balances={bank:a.bank,cash:a.cash,creditDebt:a.creditDebt,available:null};
  const closing=(a.reconciliations||[]).filter(r=>r.date<=through&&r.date!==ignoreReconciliationOn).reduce((last,r)=>!last||r.date>=last.date?r:last,null);
  if(closing){balances.bank=closing.bank;balances.cash=closing.cash;}
  const savingClosing=(a.reconciliations||[]).filter(r=>r.savings!==undefined&&r.date<=through&&r.date!==ignoreReconciliationOn).reduce((last,r)=>!last||r.date>=last.date?r:last,null);
  const savingsStart=a.savingsOpenedOn||a.openedOn;
  if(a.savings!==undefined)balances.savings=through<savingsStart?0:(savingClosing?.savings??a.savings);
  const includes=date=>date>=a.openedOn && date<=through;
  const includesMoney=date=>includes(date)&&(!closing||date>closing.date);
  const includesSource=(source,date)=>source==='savings'?date>=savingsStart&&date<=through&&(!savingClosing||date>savingClosing.date):includesMoney(date);
  for(const [month,income] of Object.entries(data.incomes))if(includesSource(income.account||'bank',income.receivedOn||`${month}-15`)){const source=income.account==='cash'?'cash':income.account==='savings'?'savings':'bank';if(source==='savings'&&a.savings===undefined)throw Error('Chưa thiết lập nguồn tiết kiệm.');balances[source]+=(income.salary||0)+(income.bonus||0);}
  for(const [date,entry] of Object.entries(data.days))if(includes(date))for(const item of entry.items) {
    if(item.status==='planned'||isCardPayment(item))continue;
    if(isInternalMovement(item)){
      if(includesMoney(date)){const from=item.movement==='withdraw'?'bank':'cash',to=from==='bank'?'cash':'bank';balances[from]-=item.amount;balances[to]+=item.amount;}
      continue;
    }
    const source=accountSource(item);if(source==='card')balances.creditDebt+=item.amount;else if(includesSource(source,date)){if(source==='savings'&&a.savings===undefined)throw Error('Chưa thiết lập nguồn tiết kiệm.');balances[source]-=item.amount;}
  }
  for(const statement of data.cards?.statements||[])if(statement.status==='paid'&&includes(statement.paidOn)) {
    const value=statementNumbers(statement).total;if(includesSource(statement.paymentSource||'bank',statement.paidOn))balances[statement.paymentSource||'bank']-=value;balances.creditDebt-=value;
  }
  for(const item of a.transfers){if((item.from==='savings'||item.to==='savings')&&a.savings===undefined)throw Error('Chưa thiết lập nguồn tiết kiệm.');if(includesSource(item.from,item.date))balances[item.from]-=item.amount;if(includesSource(item.to,item.date))balances[item.to]+=item.amount;}
  for(const r of data.receipts||[])if(includesSource(r.source,r.date)){if(r.source==='savings'&&a.savings===undefined)throw Error('Chưa thiết lập nguồn tiết kiệm.');balances[r.source]+=r.amount;}
  for(const key of ['bank','cash','creditDebt',...(a.savings!==undefined?['savings']:[])])balances[key]=roundCard(balances[key]);
  if(a.creditLimit!==null && balances.creditDebt>=0)balances.available=roundCard(a.creditLimit-balances.creditDebt);
  return balances;
}

export function transferRows(data,prefix='') {
  return (data.accounts?.transfers||[]).filter(t=>t.date.startsWith(prefix)).map(t=>({id:`legacy-transfer-${t.id}`,legacyTransferId:t.id,transferTo:t.to,date:t.date,title:t.from==='bank'&&t.to==='cash'?'Rút tiền mặt':t.from==='cash'&&t.to==='bank'?'Nạp tiền vào ngân hàng':`Tiết kiệm: ${t.from} → ${t.to}`,category:'Chuyển tiền nội bộ',movement:t.from==='bank'?'withdraw':'deposit',paymentMethod:t.from,status:'paid',amount:t.amount}));
}
export const balanceUpdateCount=(accounts,month)=>(accounts?.reconciliations||[]).filter(r=>r.kind==='manual'&&r.confirmedOn.startsWith(month+'-')).length;
export function reconcileMonth(data,date,actual,{id,currency='JPY',today,manual=false,creditAllowed=true}={}) {
  if(!cardDate(date)||(!manual&&date!==monthEnd(date.slice(0,7)))||(manual&&(!cardDate(today)||date===monthEnd(date.slice(0,7))))||(today&&date>today))throw Error('Chỉ đối chiếu khi đã đến ngày cuối tháng.');
  if(manual&&balanceUpdateCount(data.accounts,today.slice(0,7))>=3)throw Error('Đã dùng hết 3 lượt cập nhật số dư trong tháng.');
  if(!id||(data.accounts?.reconciliations||[]).some(r=>r.id===id))throw Error('Đối chiếu đã tồn tại.');
  const expected=accountBalances(financeView(data,creditAllowed),date,{ignoreReconciliationOn:date});if(!expected)throw Error('Cần thiết lập số dư đầu ngày trước khi đối chiếu.');
  const row={id,date,bank:cardMoney(actual.bank),cash:cardMoney(actual.cash),expectedBank:expected.bank,expectedCash:expected.cash};
  if(manual){row.kind='manual';row.confirmedOn=today;}
  if(actual.savings!==undefined){if(expected.savings===undefined)throw Error('Chưa thiết lập nguồn tiết kiệm.');row.savings=cardMoney(actual.savings);row.expectedSavings=expected.savings;row.deltaSavings=roundCard(row.savings-row.expectedSavings);}
  row.deltaBank=roundCard(row.bank-row.expectedBank);row.deltaCash=roundCard(row.cash-row.expectedCash);
  const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(n);
  row.note=`[Đối chiếu ${date} · ${currency}] Ngân hàng: sổ ${fmt(row.expectedBank)}, thực tế ${fmt(row.bank)}, chênh lệch ${fmt(row.deltaBank)}. Tiền mặt: sổ ${fmt(row.expectedCash)}, thực tế ${fmt(row.cash)}, chênh lệch ${fmt(row.deltaCash)}. Tổng chênh lệch ${fmt(roundCard(row.deltaBank+row.deltaCash))}. Số dư thực tế được dùng từ cuối ngày đối chiếu.`;
  const note=[data.days[date]?.note,row.note].filter(Boolean).join('\n');if(note.length>20000)throw Error('Ghi chú ngày đã đầy. Hãy rút ngắn ghi chú trước khi xác nhận.');
  const accounts=normalizeAccounts({...data.accounts,reconciliations:[...(data.accounts.reconciliations||[]),row]});
  data.accounts=accounts;const entry=data.days[date] ||= {note:'',items:[]};entry.note=note;
  return row;
}

export function validateSavingsLedger(data){
 const a=data.accounts,dates=[];
 for(const [date,entry] of Object.entries(data.days))if(entry.items.some(i=>i.paymentMethod==='savings'&&i.status!=='planned'))dates.push(date);
 for(const [month,i] of Object.entries(data.incomes))if(i.account==='savings'&&(i.salary||i.bonus))dates.push(i.receivedOn||`${month}-15`);
 for(const r of data.receipts||[])if(r.source==='savings')dates.push(r.date);
 for(const t of a?.transfers||[])if(t.from==='savings'||t.to==='savings')dates.push(t.date);
 for(const s of data.cards?.statements||[])if(s.status==='paid'&&s.paymentSource==='savings')dates.push(s.paidOn);
 if(dates.length&&a?.savings===undefined)throw Error('Chưa thiết lập nguồn tiết kiệm.');
 if(a?.savings===undefined)return;
 const start=a.savingsOpenedOn||a.openedOn;
 if(dates.some(d=>d<start))throw Error('Giao dịch tiết kiệm có trước ngày bắt đầu nguồn tiền.');
 dates.push(start,...(a.reconciliations||[]).map(r=>r.date));
 for(const date of new Set(dates))if((accountBalances(data,date)?.savings??0)<0)throw Error('Số dư tiết kiệm không đủ cho giao dịch.');
}
