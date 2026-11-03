import { cardMoney, cardDate, roundCard, statementNumbers } from './card-model.js';
export const accountSource = item => item.paymentMethod === 'card' ? 'card' : item.paymentMethod === 'bank' ? 'bank' : 'cash';
export const isCardPayment = item => Boolean(item.cardPaymentMonth);
export function normalizeAccounts(raw) {
  if (!raw || !cardDate(raw.openedOn) || !Array.isArray(raw.transfers)) throw new Error('Sổ nguồn tiền không hợp lệ.');
  const result = { openedOn:raw.openedOn, bank:cardMoney(raw.bank), cash:cardMoney(raw.cash), creditDebt:cardMoney(raw.creditDebt), creditLimit:raw.creditLimit == null ? null : cardMoney(raw.creditLimit), transfers:[] };
  for(const item of raw.transfers) {
    if(!item || !String(item.id||'').trim() || result.transfers.some(t=>t.id===String(item.id)) || !cardDate(item.date) || !['bank','cash'].includes(item.from) || !['bank','cash'].includes(item.to) || item.from===item.to || cardMoney(item.amount)<=0) throw new Error('Chuyển tiền không hợp lệ.');
    result.transfers.push({id:String(item.id),date:item.date,from:item.from,to:item.to,amount:cardMoney(item.amount)});
  }
  return result;
}
export function moneyOut(data, prefix) {
  const direct = Object.entries(data.days).filter(([date])=>date.startsWith(prefix)).reduce((sum,[,entry])=>sum+entry.items.filter(i=>i.status!=='planned' && accountSource(i)!=='card' && !isCardPayment(i)).reduce((s,i)=>s+i.amount,0),0);
  const card = (data.cards?.statements||[]).filter(s=>s.status==='paid' && s.paidOn.startsWith(prefix)).reduce((sum,s)=>sum+statementNumbers(s).total,0);
  return roundCard(direct+card);
}
export function accountBalances(data, through) {
  if(!data.accounts)return null;
  if(!cardDate(through))throw new Error('Ngày không hợp lệ.');
  const a=normalizeAccounts(data.accounts);if(through<a.openedOn)return null;
  const balances={bank:a.bank,cash:a.cash,creditDebt:a.creditDebt,available:null};
  const includes=date=>date>=a.openedOn && date<=through;
  for(const [month,income] of Object.entries(data.incomes))if(includes(income.receivedOn||`${month}-15`))balances[income.account==='cash'?'cash':'bank']+=(income.salary||0)+(income.bonus||0);
  for(const [date,entry] of Object.entries(data.days))if(includes(date))for(const item of entry.items) {
    if(item.status==='planned'||isCardPayment(item))continue;
    const source=accountSource(item);if(source==='card')balances.creditDebt+=item.amount;else balances[source]-=item.amount;
  }
  for(const statement of data.cards?.statements||[])if(statement.status==='paid'&&includes(statement.paidOn)) {
    const value=statementNumbers(statement).total;balances[statement.paymentSource||'bank']-=value;balances.creditDebt-=value;
  }
  for(const item of a.transfers)if(includes(item.date)){balances[item.from]-=item.amount;balances[item.to]+=item.amount;}
  for(const key of ['bank','cash','creditDebt'])balances[key]=roundCard(balances[key]);
  if(a.creditLimit!==null && balances.creditDebt>=0)balances.available=roundCard(a.creditLimit-balances.creditDebt);
  return balances;
}
