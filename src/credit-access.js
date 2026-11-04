import {isTrackingCardPayment} from './credit-types.js';
// A display/calculation view only. Never persist this projection over the document.
export const isCreditItem = item => item.paymentMethod === 'card' || isTrackingCardPayment(item) || Boolean(item.cardFeeMonth || item.cardPaymentMonth);
export function financeView(data, allowed) {
  if (allowed === true) return data;
  const creditDebts = new Set(data.debts.filter(d => d.type === 'Thẻ tín dụng').map(d => d.id));
  const { cards, ...view } = data;
  return { ...view, debts: data.debts.filter(d => !creditDebts.has(d.id)),
    days: Object.fromEntries(Object.entries(data.days).map(([date, entry]) => [date, {...entry, items: entry.items.filter(i => !isCreditItem(i) && !creditDebts.has(i.debtId))}])),
    ...(data.accounts ? {accounts: {...data.accounts, creditDebt: 0, creditLimit: null}} : {}) };
}
export function creditSnapshot(data) {
  const debts=data.debts.filter(d=>d.type==='Thẻ tín dụng'), ids=new Set(debts.map(d=>d.id));
  return JSON.stringify({cards:data.cards??null,cardForecastSource:data.safety?.cardSource||'bank',creditTerms:(data.safety?.debtTerms||[]).filter(t=>ids.has(t.debtId)), creditDebt:data.accounts?.creditDebt||0, creditLimit:data.accounts?.creditLimit??null, debts,
    items:Object.entries(data.days).flatMap(([date,entry])=>entry.items.filter(i=>isCreditItem(i)||ids.has(i.debtId)).map(item=>({date,item}))).sort((a,b)=>a.date.localeCompare(b.date)||a.item.id.localeCompare(b.item.id))});
}
