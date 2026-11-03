import { cardMoney, cardDate, roundCard, statementNumbers, validMonth } from './card-model.js';
export const accountSource = item => item.paymentMethod === 'card' ? 'card' : item.paymentMethod === 'bank' ? 'bank' : 'cash';
export const isInternalMovement = item => ['withdraw','deposit'].includes(item.movement);
export const monthEnd = month => { if(!validMonth(month))throw Error('Tháng không hợp lệ.'); const [year,m]=month.split('-').map(Number); return `${month}-${String(new Date(Date.UTC(year,m,0)).getUTCDate()).padStart(2,'0')}`; };
const signedMoney=value=>{const n=Number(value);if(!Number.isFinite(n)||roundCard(n)!==n)throw Error('Số tiền đối chiếu không hợp lệ.');return n;};
export const isCardPayment = item => Boolean(item.cardPaymentMonth);
export function normalizeAccounts(raw) {
  if (!raw || !cardDate(raw.openedOn) || !Array.isArray(raw.transfers)) throw new Error('Sổ nguồn tiền không hợp lệ.');
  const result = { openedOn:raw.openedOn, bank:cardMoney(raw.bank), cash:cardMoney(raw.cash), creditDebt:cardMoney(raw.creditDebt), creditLimit:raw.creditLimit == null ? null : cardMoney(raw.creditLimit), transfers:[] };
  for(const item of raw.transfers) {
    if(!item || !String(item.id||'').trim() || result.transfers.some(t=>t.id===String(item.id)) || !cardDate(item.date) || !['bank','cash'].includes(item.from) || !['bank','cash'].includes(item.to) || item.from===item.to || cardMoney(item.amount)<=0) throw new Error('Chuyển tiền không hợp lệ.');
    result.transfers.push({id:String(item.id),date:item.date,from:item.from,to:item.to,amount:cardMoney(item.amount)});
  }
  if(raw.reconciliations!==undefined){
    if(!Array.isArray(raw.reconciliations))throw Error('Lịch sử đối chiếu không hợp lệ.');
    result.reconciliations=[];
    for(const row of raw.reconciliations){
      if(!row||!String(row.id||'').trim()||result.reconciliations.some(r=>r.id===String(row.id))||!cardDate(row.date)||row.date!==monthEnd(row.date.slice(0,7))||row.date<result.openedOn)throw Error('Đối chiếu cuối tháng không hợp lệ.');
      const r={id:String(row.id),date:row.date,bank:cardMoney(row.bank),cash:cardMoney(row.cash),expectedBank:signedMoney(row.expectedBank),expectedCash:signedMoney(row.expectedCash),deltaBank:signedMoney(row.deltaBank),deltaCash:signedMoney(row.deltaCash),note:String(row.note||'').slice(0,20000)};
      if(r.deltaBank!==roundCard(r.bank-r.expectedBank)||r.deltaCash!==roundCard(r.cash-r.expectedCash))throw Error('Chênh lệch đối chiếu không khớp.');
      result.reconciliations.push(r);
    }
  }
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
  const includes=date=>date>=a.openedOn && date<=through;
  const includesMoney=date=>includes(date)&&(!closing||date>closing.date);
  for(const [month,income] of Object.entries(data.incomes))if(includesMoney(income.receivedOn||`${month}-15`))balances[income.account==='cash'?'cash':'bank']+=(income.salary||0)+(income.bonus||0);
  for(const [date,entry] of Object.entries(data.days))if(includes(date))for(const item of entry.items) {
    if(item.status==='planned'||isCardPayment(item))continue;
    if(isInternalMovement(item)){
      if(includesMoney(date)){const from=item.movement==='withdraw'?'bank':'cash',to=from==='bank'?'cash':'bank';balances[from]-=item.amount;balances[to]+=item.amount;}
      continue;
    }
    const source=accountSource(item);if(source==='card')balances.creditDebt+=item.amount;else if(includesMoney(date))balances[source]-=item.amount;
  }
  for(const statement of data.cards?.statements||[])if(statement.status==='paid'&&includes(statement.paidOn)) {
    const value=statementNumbers(statement).total;if(includesMoney(statement.paidOn))balances[statement.paymentSource||'bank']-=value;balances.creditDebt-=value;
  }
  for(const item of a.transfers)if(includesMoney(item.date)){balances[item.from]-=item.amount;balances[item.to]+=item.amount;}
  for(const key of ['bank','cash','creditDebt'])balances[key]=roundCard(balances[key]);
  if(a.creditLimit!==null && balances.creditDebt>=0)balances.available=roundCard(a.creditLimit-balances.creditDebt);
  return balances;
}

export function transferRows(data,prefix='') {
  return (data.accounts?.transfers||[]).filter(t=>t.date.startsWith(prefix)).map(t=>({id:`legacy-transfer-${t.id}`,legacyTransferId:t.id,date:t.date,title:t.from==='bank'?'Rút tiền mặt':'Nạp tiền vào ngân hàng',category:'Chuyển tiền nội bộ',movement:t.from==='bank'?'withdraw':'deposit',paymentMethod:t.from,status:'paid',amount:t.amount}));
}
export function reconcileMonth(data,date,actual,{id,currency='JPY',today}={}) {
  if(!cardDate(date)||date!==monthEnd(date.slice(0,7))||(today&&date>today))throw Error('Chỉ đối chiếu khi đã đến ngày cuối tháng.');
  if(!id||(data.accounts?.reconciliations||[]).some(r=>r.id===id))throw Error('Đối chiếu đã tồn tại.');
  const expected=accountBalances(data,date,{ignoreReconciliationOn:date});if(!expected)throw Error('Cần thiết lập số dư đầu ngày trước khi đối chiếu.');
  const row={id,date,bank:cardMoney(actual.bank),cash:cardMoney(actual.cash),expectedBank:expected.bank,expectedCash:expected.cash};
  row.deltaBank=roundCard(row.bank-row.expectedBank);row.deltaCash=roundCard(row.cash-row.expectedCash);
  const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(n);
  row.note=`[Đối chiếu ${date} · ${currency}] Ngân hàng: sổ ${fmt(row.expectedBank)}, thực tế ${fmt(row.bank)}, chênh lệch ${fmt(row.deltaBank)}. Tiền mặt: sổ ${fmt(row.expectedCash)}, thực tế ${fmt(row.cash)}, chênh lệch ${fmt(row.deltaCash)}. Tổng chênh lệch ${fmt(roundCard(row.deltaBank+row.deltaCash))}. Số dư thực tế được dùng cho tháng mới.`;
  const note=[data.days[date]?.note,row.note].filter(Boolean).join('\n');if(note.length>20000)throw Error('Ghi chú ngày đã đầy. Hãy rút ngắn ghi chú trước khi xác nhận.');
  const accounts=normalizeAccounts({...data.accounts,reconciliations:[...(data.accounts.reconciliations||[]),row]});
  data.accounts=accounts;const entry=data.days[date] ||= {note:'',items:[]};entry.note=note;
  return row;
}
