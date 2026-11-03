// Card principal is a liability; settling a statement is a bank movement, not a second purchase.
export const roundCard = value => Math.round(value * 1000) / 1000;
export const validMonth = value => /^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(value);
export const cardDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && validMonth(value.slice(0, 7)) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export function cardMoney(value) {
  const number = Number(typeof value === 'string' ? value.replace(/,/g, '').trim() : value);
  if (!Number.isFinite(number) || number < 0 || number > 1e12 || roundCard(number) !== number) throw new Error('Số tiền không âm, tối đa 3 chữ số thập phân.');
  return number;
}
export function shiftMonth(month, offset) {
  if (!validMonth(month)) throw new Error('Tháng không hợp lệ.');
  const [year, number] = month.split('-').map(Number), index = year * 12 + number - 1 + offset;
  const nextYear = Math.floor(index / 12), nextMonth = index % 12 + 1;
  return nextYear >= 1 && nextYear <= 9999 ? `${String(nextYear).padStart(4,'0')}-${String(nextMonth).padStart(2,'0')}` : '';
}
export const defaultCards = () => ({ name: 'PayPay Card', paymentDay: 27, weekend: 'previous', statements: [] });
export function expectedPaymentDate(month, settings = defaultCards()) {
  const [year, number] = month.split('-').map(Number);
  if (!validMonth(month)) throw new Error('Tháng không hợp lệ.');
  const date = new Date(Date.UTC(year, number - 1, Math.min(settings.paymentDay, new Date(Date.UTC(year, number, 0)).getUTCDate())));
  const weekday = date.getUTCDay();
  if (settings.weekend === 'previous' && [0, 6].includes(weekday)) date.setUTCDate(date.getUTCDate() - (weekday === 6 ? 1 : 2));
  if (settings.weekend === 'next' && [0, 6].includes(weekday)) date.setUTCDate(date.getUTCDate() + (weekday === 6 ? 2 : 1));
  return date.toISOString().slice(0, 10);
}
export function statementNumbers(statement) {
  return { total: roundCard(statement.oneOff + statement.principal + statement.fees), carry: roundCard(statement.priorBalance + statement.newRibo - statement.principal) };
}
export function normalizeCards(raw) {
  if (!raw || !Array.isArray(raw.statements)) throw new Error('Dữ liệu thẻ không hợp lệ.');
  const result = defaultCards(); result.name = String(raw.name || result.name).slice(0, 80);
  if (!Number.isInteger(raw.paymentDay) || raw.paymentDay < 1 || raw.paymentDay > 31 || !['previous', 'next', 'none'].includes(raw.weekend)) throw new Error('Lịch thanh toán thẻ không hợp lệ.');
  result.paymentDay = raw.paymentDay; result.weekend = raw.weekend;
  for (const source of raw.statements) {
    if (!source || !validMonth(source.month) || result.statements.some(item => item.month === source.month) || !['draft', 'confirmed', 'paid'].includes(source.status) || !cardDate(source.dueDate) || (source.status !== 'draft' ? !cardDate(source.confirmedOn) : Boolean(source.confirmedOn) && !cardDate(source.confirmedOn)) || (source.status === 'paid' && !cardDate(source.paidOn))) throw new Error('Sao kê không hợp lệ.');
    const statement = { month: source.month, dueDate: source.dueDate, confirmedOn: source.confirmedOn || '', status: source.status, note: String(source.note || '').slice(0, 2000) };
    for (const field of ['priorBalance', 'newRibo', 'principal', 'fees', 'oneOff']) statement[field] = cardMoney(source[field]);
    if (statementNumbers(statement).carry < 0) throw new Error('Gốc trả vượt tổng dư nợ リボ.');
    if (source.status === 'paid') { statement.paidOn = source.paidOn; if (source.paymentSource !== undefined) { if (!['bank','cash'].includes(source.paymentSource)) throw new Error('Nguồn thanh toán không hợp lệ.'); statement.paymentSource = source.paymentSource; } }
    result.statements.push(statement);
  }
  return result;
}
export function cardPurchases(data, month, settlement = 'oneoff') {
  return Object.entries(data.days).flatMap(([date, entry]) => entry.items.map(item => ({ ...item, date }))).filter(item => item.paymentMethod === 'card' && !item.movement && item.status !== 'planned' && (item.settlement || 'oneoff') === settlement && (item.billingMonth || shiftMonth(item.date.slice(0, 7), 1)) === month);
}
export function projectedStatement(data, month) {
  const cards = data.cards || defaultCards(), previous = cards.statements.filter(item => item.month < month && item.status !== 'draft').sort((a, b) => b.month.localeCompare(a.month))[0];
  return { month, priorBalance: previous ? previous.status === 'paid' ? statementNumbers(previous).carry : roundCard(previous.priorBalance + previous.newRibo) : 0, newRibo: roundCard(cardPurchases(data, month, 'ribo').reduce((sum, item) => sum + item.amount, 0)), principal: 0, fees: 0, oneOff: roundCard(cardPurchases(data, month).reduce((sum, item) => sum + item.amount, 0)), dueDate: expectedPaymentDate(month, cards), confirmedOn: '', status: 'draft', note: '' };
}
function feeId(month) { return `card-fee-${month}`; }
export function saveStatement(data, source) {
  const cards = normalizeCards({ ...(data.cards || defaultCards()), statements: [source] }), next = cards.statements[0];
  const current = data.cards?.statements.find(item => item.month === next.month);
  if (current?.status === 'paid' || next.status === 'paid') throw new Error('Hủy xác nhận thanh toán trước khi sửa sao kê.');
  // Remove only the app-generated fee; preserve all other entries and notes.
  for (const entry of Object.values(data.days)) entry.items = entry.items.filter(item => !(item.cardFeeMonth === next.month && item.id === feeId(next.month)));
  if (next.status === 'confirmed' && next.fees) {
    const entry = data.days[next.confirmedOn] ||= { note: '', items: [] };
    entry.items.push({ id: feeId(next.month), title: 'Phí / lãi thẻ tín dụng', amount: next.fees, category: 'Phí / lãi thẻ', status: 'paid', paymentMethod: 'card', settlement: 'fee', billingMonth: next.month, cardFeeMonth: next.month });
  }
  data.cards ||= defaultCards(); data.cards.statements = data.cards.statements.filter(item => item.month !== next.month); data.cards.statements.push(next);
  for (const date of [next.confirmedOn, next.dueDate]) if (date && !data.years.includes(Number(date.slice(0, 4)))) data.years.push(Number(date.slice(0, 4)));
}
function paymentId(month) { return `card-payment-${month}`; }
function addPaymentRow(data, statement) {
  if(Object.values(data.days).some(entry=>entry.items.some(item=>item.id===paymentId(statement.month)||item.cardPaymentMonth===statement.month)))throw new Error('Thanh toán sao kê đã tồn tại.');
  const entry=data.days[statement.paidOn] ||= {note:'',items:[]};
  entry.items.push({id:paymentId(statement.month),title:`Thanh toán ${data.cards?.name||'PayPay Card'} · ${statement.month}`,amount:statementNumbers(statement).total,category:'Thanh toán thẻ',status:'paid',paymentMethod:statement.paymentSource,cardPaymentMonth:statement.month});
}
export function migrateLegacyPayments(data) {
  for(const statement of data.cards?.statements||[])if(statement.status==='paid' && statement.paymentSource===undefined){
    statement.paymentSource='bank';addPaymentRow(data,statement);
  }
}
export function settleStatement(data, month, paidOn, paymentSource = 'bank') {
  const statement = data.cards?.statements.find(item => item.month === month);
  if (statement?.status !== 'confirmed' || !cardDate(paidOn)) throw new Error('Cần sao kê đã chốt và ngày thanh toán hợp lệ.');
  if(!['bank','cash'].includes(paymentSource))throw new Error('Nguồn thanh toán không hợp lệ.');
  const next={...statement,status:'paid',paidOn,paymentSource};addPaymentRow(data,next);
  Object.assign(statement,next);
  if (!data.years.includes(Number(paidOn.slice(0, 4)))) data.years.push(Number(paidOn.slice(0, 4)));
}
export function undoSettlement(data, month) {
  const statement = data.cards?.statements.find(item => item.month === month);
  if (statement?.status !== 'paid') throw new Error('Sao kê chưa được xác nhận thanh toán.');
  const matches=Object.entries(data.days).flatMap(([date,entry])=>entry.items.filter(i=>i.cardPaymentMonth===month).map(item=>({date,entry,item})));
  if(matches.length!==1 || matches[0].date!==statement.paidOn || matches[0].item.id!==paymentId(month) || matches[0].item.amount!==statementNumbers(statement).total || matches[0].item.paymentMethod!==statement.paymentSource)throw new Error('Thanh toán liên kết không khớp sao kê.');
  matches[0].entry.items=matches[0].entry.items.filter(i=>i!==matches[0].item);
  statement.status = 'confirmed'; delete statement.paidOn; delete statement.paymentSource;
}
export function cardCashflow(data, month) {
  const cards = data.cards || defaultCards(), statement = cards.statements.find(item => item.month === month), estimate = statement || projectedStatement(data, month);
  const income = data.incomes[month] || {}, earned = Number(income.salary || 0) + Number(income.bonus || 0);
  const direct = roundCard(Object.entries(data.days).filter(([date]) => date.startsWith(`${month}-`)).reduce((sum, [, entry]) => sum + entry.items.filter(item => item.status !== 'planned' && item.paymentMethod !== 'card' && !item.cardPaymentMonth && !item.movement).reduce((total, item) => total + item.amount, 0), 0));
  const paid = roundCard(cards.statements.filter(item => item.status === 'paid' && item.paidOn.startsWith(`${month}-`)).reduce((sum, item) => sum + statementNumbers(item).total, 0));
  const reserved = roundCard(cards.statements.filter(item => item.status === 'confirmed' && item.dueDate.startsWith(`${month}-`)).reduce((sum, item) => sum + statementNumbers(item).total, 0));
  const estimatedReserve = (!statement || statement.status === 'draft') && estimate.dueDate.startsWith(`${month}-`) ? statementNumbers(estimate).total : 0;
  return { estimatedReserve, statement, estimate, income: earned, direct, paid, reserved, afterReserve: roundCard(earned - direct - paid - reserved - estimatedReserve), nextPurchases: roundCard((shiftMonth(month, 1) ? cardPurchases(data, shiftMonth(month, 1)) : []).reduce((sum, item) => sum + item.amount, 0)) };
}
export function validateCardLinks(data) {
  const payments = new Set();
  for(const [date,entry] of Object.entries(data.days))for(const item of entry.items)if(item.cardPaymentMonth){
    const statement=data.cards?.statements.find(s=>s.month===item.cardPaymentMonth);
    if(!statement || statement.status!=='paid' || date!==statement.paidOn || item.id!==paymentId(statement.month) || item.amount!==statementNumbers(statement).total || item.paymentMethod!==statement.paymentSource || item.status!=='paid' || item.cardFeeMonth || item.debtPaymentId || payments.has(statement.month))throw new Error('Thanh toán liên kết không khớp sao kê.');
    payments.add(statement.month);
  }
  for(const statement of data.cards?.statements||[])if(statement.status==='paid'&&!payments.has(statement.month))throw new Error('Thiếu thanh toán liên kết sao kê.');
  const seen = new Set();
  for (const [date, entry] of Object.entries(data.days)) for (const item of entry.items) if (item.cardFeeMonth) {
    const statement = data.cards?.statements.find(record => record.month === item.cardFeeMonth);
    if (!statement || statement.status === 'draft' || date !== statement.confirmedOn || item.amount !== statement.fees || item.id !== feeId(statement.month) || seen.has(statement.month) || item.paymentMethod !== 'card' || item.status !== 'paid' || item.settlement !== 'fee') throw new Error('Phí thẻ không khớp sao kê.');
    seen.add(statement.month);
  }
  for (const statement of data.cards?.statements || []) if (statement.status !== 'draft' && statement.fees && !seen.has(statement.month)) throw new Error('Thiếu khoản phí liên kết sao kê.');
}
