// UI acknowledgement state is local to the verified account, never financial data.
const fingerprint = item => JSON.stringify(Object.keys(item).filter(key => key !== 'date').sort().map(key => [key, item[key]]));
export const protectedExpense = item => Boolean(item.debtId || item.debtPaymentId || item.cardFeeMonth || item.cardPaymentMonth || item.obligationId || item.legacyTransferId);
export function confirmedExpenses(document) {
  const books = {foreign: document, vietnam: document.regional?.vietnam};
  return Object.fromEntries(Object.entries(books).map(([region, book]) => [region,
    Object.fromEntries(Object.entries(book?.days || {}).map(([date, entry]) => [date,
      Object.fromEntries(entry.items.map(item => [item.id, fingerprint(item)]))]))]));
}
export const expenseConfirmed = (confirmed, region, date, item) => confirmed?.[region]?.[date]?.[item.id] === fingerprint(item);
