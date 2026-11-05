import {isTrackingCardPayment,CARD_PAYMENT_CATEGORY} from './credit-types.js';
import {sumMoney,addMoney,subtractMoney} from './money.js';
import {normalizeSafety,validateFunds} from './safety-model.js';
import { normalizeBookSettings,COUNTRIES } from './region-model.js';
import { normalizeCashEntries, normalizeReceivables, receiptTotals } from './receipt-model.js';
import { normalizeAccounts, validateSavingsLedger, isCardPayment, isInternalMovement, transferRows } from './account-model.js';
import { normalizeCurrencies } from './preferences.js';
import { cardMoney, normalizeCards, migrateLegacyPayments, validateCardLinks, validMonth, cardDate } from './card-model.js';
export const YEARS = Array.from({ length: 8 }, (_, i) => 2026 + i);
export const MIN_YEAR = 1900, MAX_YEAR = 9999;
export const validYear = year => Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
export const getYears = data => [...new Set(data.years || YEARS)].filter(validYear).sort((a, b) => a - b);
export function addYear(data, year) {
  if (!validYear(year)) throw new Error(`Năm phải từ ${MIN_YEAR} đến ${MAX_YEAR}.`);
  if (getYears(data).includes(year)) throw new Error('Năm này đã có trong danh sách.');
  data.years = [...getYears(data), year].sort((a, b) => a - b);
}
export function removeYear(data, year) {
  if (getYears(data).length <= 1) throw new Error('Cần giữ ít nhất một năm.');
  data.years = getYears(data).filter(value => value !== year);
}
export const MAX_AMOUNT = 1_000_000_000_000;
const roundMoney = value => Math.round(value * 1000) / 1000;
const moneyFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
export const formatAmount = value => moneyFormatter.format(Number.isFinite(Number(value)) ? Number(value) : 0);
export const amount = value => {
  const number = Number(typeof value === 'string' ? value.replace(/,/g, '').trim() : value);
  return Number.isFinite(number) ? Math.min(MAX_AMOUNT, Math.max(0, roundMoney(number))) : 0;
};
export const dayKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
export const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;
export const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
export const CATEGORIES = ['Ăn uống', 'Nhà ở', 'Đi lại', 'Mua sắm', 'Sức khỏe', 'Giải trí', 'Trả nợ', CARD_PAYMENT_CATEGORY, 'Khác'];
// Records created before status was introduced remain paid, preserving old totals.
export const categoryOf = item => item.category || (item.debtPaymentId ? 'Trả nợ' : 'Khác');
export const expenseStatus = item => ['planned','cancelled','draft'].includes(item.status)?item.status:'paid';
export const dayTotal = (day,status='all')=>sumMoney((day?.items||[]).filter(item=>!(item.paymentMethod==='card'&&item.creditTracking)&&!item.cardFeeMonth&&!isCardPayment(item)&&!isTrackingCardPayment(item)&&!isInternalMovement(item)&&!['cancelled','draft'].includes(expenseStatus(item))&&(status==='all'||expenseStatus(item)===status)).map(item=>amount(item.amount)));
export function expenseRows(data, year, month = null, { query = '', category = '', status = '' } = {}) {
  const prefix = month === null ? `${year}-` : `${monthKey(year, month)}-`;
  const fold = value => String(value).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
  return Object.entries(data.days).filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => b.localeCompare(a))
    .flatMap(([date, day]) => day.items.map(item => ({ ...item, date }))).concat(transferRows(data,prefix)).sort((a,b)=>b.date.localeCompare(a.date))
    .filter(item => !item.cardFeeMonth && (!query || fold(`${item.title} ${categoryOf(item)}`).includes(fold(query))) && (!category || categoryOf(item) === category) && (!status || expenseStatus(item) === status));
}
export function monthSummary(data, year, month) {
  const prefix = monthKey(year, month);
  const entries = Object.entries(data.days).filter(([key]) => key.startsWith(`${prefix}-`));
  const expense = sumMoney(entries.map(([,day])=>dayTotal(day,'paid')));
  const planned = sumMoney(entries.map(([,day])=>dayTotal(day,'planned')));
  const income = data.incomes[prefix] || {};
  const salary = amount(income.salary), bonus = amount(income.bonus);
  const savings = amount(data.savings?.[prefix]);
  const other=receiptTotals(data,prefix);
  const count = entries.reduce((sum, [, day]) => sum + day.items.filter(item => !(item.paymentMethod==='card'&&item.creditTracking) && !item.cardFeeMonth && !isCardPayment(item) && !isTrackingCardPayment(item) && !isInternalMovement(item) && expenseStatus(item) === 'paid').length, 0);
  const plannedCount = entries.reduce((sum, [, day]) => sum + day.items.filter(item => !(item.paymentMethod==='card'&&item.creditTracking) && !item.cardFeeMonth && !isCardPayment(item) && !isTrackingCardPayment(item) && !isInternalMovement(item) && expenseStatus(item) === 'planned').length, 0);
  return { salary, bonus, expense, planned, savings, balance: subtractMoney(addMoney(salary,bonus,other.income),expense), count, plannedCount, ...(data.receipts?{otherIncome:other.income,otherReceipts:other.nonIncome}:{}) };
}
export function yearSummary(data, year) {
  return Array.from({ length: 12 }, (_, month) => monthSummary(data, year, month)).reduce((all, item) => {
    for (const key of Object.keys(all)) all[key] = addMoney(all[key],item[key]);
    return all;
  }, { ...(data.receipts?{otherIncome:0,otherReceipts:0}:{}), salary: 0, bonus: 0, expense: 0, planned: 0, savings: 0, balance: 0, count: 0, plannedCount: 0 });
}
export function savingsProgress(data, year) {
  const saved = yearSummary(data, year).savings;
  const goal = amount(data.goals?.[year]);
  return { saved, goal, remaining: Math.max(0,subtractMoney(goal,saved)), percent: goal ? Math.round(saved / goal * 100) : 0 };
}
export const validDate = value => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(value);
  return Boolean(match && validYear(+match[1]) && +match[3] <= daysInMonth(+match[1], +match[2] - 1));
};
export function debtBalance(debt) {
  const paid = sumMoney(debt.payments.filter(payment => !payment.voided).map(p=>p.amount));
  return { paid, remaining: subtractMoney(debt.amount,paid) };
}
function positiveMoney(value) {
  const numeric = Number(typeof value === 'string' ? value.replace(/,/g, '') : value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > MAX_AMOUNT || roundMoney(numeric) !== numeric) throw new Error('Số tiền phải lớn hơn 0 và có tối đa 3 chữ số thập phân.');
  return numeric;
}
export function addDebt(data, debt) {
  const id = String(debt.id || '');
  if (!id.trim() || data.debts.some(item => item.id === id)) throw new Error('Khoản nợ đã tồn tại.');
  const title = String(debt.title || '').trim().slice(0, 500), type = String(debt.type || '').trim().slice(0, 100);
  if (!title || !type) throw new Error('Nhập tên và loại nợ.');
  if (debt.dueDate && !validDate(debt.dueDate)) throw new Error('Ngày đến hạn không hợp lệ.');
  data.debts.push({ id, title, type, amount: positiveMoney(debt.amount), payments: [], ...(debt.dueDate ? { dueDate: debt.dueDate } : {}) });
}
export function updateDebt(data, debtId, changes) {
  const debt = data.debts.find(item => item.id === debtId);
  if (!debt) throw new Error('Không tìm thấy khoản nợ.');
  const candidate = { debts: [] }; addDebt(candidate, { ...changes, id: debtId });
  const next = candidate.debts[0];
  if (next.amount < debtBalance(debt).paid) throw new Error('Nợ gốc không thể nhỏ hơn tổng tiền đã trả.');
  Object.assign(debt, next, { payments: debt.payments });
  if (!next.dueDate) delete debt.dueDate;
  for (const payment of debt.payments.filter(item => !item.voided && item.expenseId)) {
    const expense = data.days[payment.date]?.items.find(item => item.id === payment.expenseId);
    if (expense) expense.title = `Trả nợ: ${debt.title}`.slice(0, 500);
  }
}
export function removeDebt(data, debtId) {
  const debt = data.debts.find(item => item.id === debtId);
  if (!debt) throw new Error('Không tìm thấy khoản nợ.');
  if (debt.payments.length) throw new Error('Khoản nợ đã có lịch sử thanh toán nên được giữ lại để đối chiếu.');
  data.debts = data.debts.filter(item => item.id !== debtId);
  if(data.safety?.debtTerms)data.safety.debtTerms=data.safety.debtTerms.filter(t=>t.debtId!==debtId);
}
export function cancelDebtPayment(data, debtId, paymentId) {
  const debt = data.debts.find(item => item.id === debtId), payment = debt?.payments.find(item => item.id === paymentId);
  if (!payment || payment.voided) throw new Error('Lần trả nợ không tồn tại hoặc đã hủy.');
  if (payment.expenseId) {
    const entry = data.days[payment.date], index = entry?.items.findIndex(item => item.id === payment.expenseId);
    const item = entry?.items[index];
    if (!item || item.debtId !== debtId || item.debtPaymentId !== paymentId || item.amount !== addMoney(payment.amount,payment.interest||0) || expenseStatus(item)!=='paid' || (payment.source&&item.paymentMethod!==payment.source)) throw new Error('Khoản chi trả nợ không khớp lịch sử thanh toán.');
    entry.items.splice(index, 1);
  }
  payment.voided = true;
  return debtBalance(debt);
}
export function debtDueStatus(debt, today) {
  if (debtBalance(debt).remaining === 0) return 'paid';
  if (!debt.dueDate || !validDate(today)) return 'outstanding';
  const days = (Date.parse(`${debt.dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000;
  return days < 0 ? 'overdue' : days <= 7 ? 'soon' : 'outstanding';
}
export function repayDebt(data, debtId, payment, { recordExpense = true } = {}) {
  const debt = data.debts.find(item => item.id === debtId);
  if (!debt) throw new Error('Không tìm thấy khoản nợ.');
  if(payment.source!==undefined && !['bank','cash','savings'].includes(payment.source))throw new Error('Nguồn thanh toán không hợp lệ.');
  const interest=payment.interest===undefined?0:cardMoney(payment.interest);
  const value = interest>0?cardMoney(payment.amount):positiveMoney(payment.amount);
  const total=addMoney(value,interest);if(total>MAX_AMOUNT)throw Error('Tổng thanh toán vượt giới hạn.');
  const id = String(payment.id || '');
  if (!id.trim() || debt.payments.some(item => item.id === id)) throw new Error('Lần trả nợ này đã được ghi nhận.');
  if (!validDate(payment.date)) throw new Error('Ngày trả nợ không hợp lệ.');
  const voided = !recordExpense && payment.voided === true;
  if (!voided && value > debtBalance(debt).remaining) throw new Error('Số tiền trả vượt số nợ còn lại.');
  const expenseId = recordExpense ? `debt-payment-${id}` : payment.expenseId;
  if (recordExpense) {
    if (Object.values(data.days).some(day => day.items.some(item => item.id === expenseId))) throw new Error('Khoản chi trả nợ này đã tồn tại.');
    const entry = data.days[payment.date] ||= { note: '', items: [] };
    entry.items.push({ id: expenseId, title: `Trả nợ: ${debt.title}`.slice(0, 500), amount: total, category: 'Trả nợ', status: 'paid', ...(payment.source?{paymentMethod:payment.source}:{}), debtId, debtPaymentId: id });
    const paymentYear = Number(payment.date.slice(0, 4));
    if (!getYears(data).includes(paymentYear)) addYear(data, paymentYear);
  }
  debt.payments.push({ id, date: payment.date, amount: value, ...(payment.interest!==undefined?{interest}:{}), ...(payment.source?{source:payment.source}:{}), ...(expenseId ? { expenseId: String(expenseId) } : {}), ...(voided ? { voided: true } : {}) });
  return debtBalance(debt);
}
export const emptyData = () => ({ version: 2, years: [...YEARS], days: {}, incomes: {}, savings: {}, goals: {}, debts: [] });
export function normalizeData(input) {
  if (!input || ![1, 2].includes(input.version) || typeof input.days !== 'object' || !input.days || typeof input.incomes !== 'object' || !input.incomes) throw new Error('Dữ liệu không đúng định dạng.');
  const result = emptyData();
  if(input.trackingStart!==undefined){if(!validDate(input.trackingStart))throw Error('Ngày bắt đầu theo dõi không hợp lệ.');result.trackingStart=input.trackingStart;}
  if (input.currencies !== undefined) result.currencies = normalizeCurrencies(input.currencies);
  for (const [key, day] of Object.entries(input.days)) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(key);
    if (!match || !validYear(+match[1]) || +match[3] > daysInMonth(+match[1], +match[2] - 1) || !day || !Array.isArray(day.items)) continue;
    result.days[key] = { note: String(day.note || '').slice(0, 20000), items: day.items.map((item, i) => ({ id: String(item.id || i), title: String(item.title || '').slice(0, 500), amount: cardMoney(item.amount??0), ...(item.creditTracking===true?{creditTracking:true}:{}),...(item.creditPeriod&&validMonth(item.creditPeriod)?{creditPeriod:item.creditPeriod}:{}),...(item.fundId?{fundId:String(item.fundId)}:{}),...(item.obligationId?{obligationId:String(item.obligationId)}:{}), ...(isInternalMovement(item)?{movement:item.movement}:{}), ...(item.status !== undefined ? { status: expenseStatus(item) } : {}), ...(item.category ? { category: String(item.category).slice(0, 100) } : {}), ...(['bank','cash','savings'].includes(item.paymentMethod) ? {paymentMethod:item.paymentMethod} : {}), ...(item.cardPaymentMonth && validMonth(item.cardPaymentMonth) ? {cardPaymentMonth:item.cardPaymentMonth,...(item.cardPaymentId?{cardPaymentId:String(item.cardPaymentId)}:{})} : {}), ...(item.paymentMethod === 'card' ? { paymentMethod:'card',...(item.creditTracking===true&&item.settlement===undefined?{}:{settlement:['oneoff','ribo','fee'].includes(item.settlement)?item.settlement:'oneoff'}), ...(item.billingMonth && validMonth(item.billingMonth) ? { billingMonth: item.billingMonth } : {}), ...(item.cardFeeMonth && validMonth(item.cardFeeMonth) ? { cardFeeMonth: item.cardFeeMonth } : {}) } : {}), ...(item.debtId && item.debtPaymentId ? { debtId: String(item.debtId), debtPaymentId: String(item.debtPaymentId) } : {}) })) };
  }
  for(const entry of Object.values(result.days)){const ids=new Set();for(const item of entry.items){if(ids.has(item.id))throw Error('Mã giao dịch trong ngày bị trùng.');ids.add(item.id);}}
  for(const entry of Object.values(result.days))for(const item of entry.items)if(isInternalMovement(item)){
    if(item.cardPaymentMonth||item.cardFeeMonth||item.debtPaymentId)throw Error('Chuyển tiền không được gắn với thanh toán nợ.');
    item.paymentMethod=item.movement==='withdraw'?'bank':'cash';delete item.settlement;delete item.billingMonth;
  }
  for (const [key, income] of Object.entries(input.incomes)) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(key) && validYear(+key.slice(0, 4)) && income) result.incomes[key] = { salary: cardMoney(income.salary??0), bonus: cardMoney(income.bonus??0), note: String(income.note || '').slice(0, 20000), ...(['bank','cash','savings'].includes(income.account) ? {account:income.account} : {}), ...(income.earnedMonth && validMonth(income.earnedMonth) ? { earnedMonth: income.earnedMonth } : {}), ...(income.receivedOn && cardDate(income.receivedOn) ? { receivedOn: income.receivedOn } : {}),...(income.status!==undefined?{status:income.status}:{}) };
  }
  for(const income of Object.values(result.incomes))if(income.status!==undefined&&!['planned','received'].includes(income.status))throw Error('Trạng thái nhận thu nhập không hợp lệ.');
  for (const [key, value] of Object.entries(input.savings || {})) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(key) && validYear(+key.slice(0, 4))) result.savings[key] = cardMoney(value);
  }
  for (const [key, value] of Object.entries(input.goals || {})) {
    if (/^\d{4}$/.test(key) && validYear(Number(key))) result.goals[key] = cardMoney(value);
  }
  if (input.debts !== undefined) {
    if (!Array.isArray(input.debts)) throw new Error('Danh sách nợ không hợp lệ.');
    for (const debt of input.debts) {
      if (!debt || !Array.isArray(debt.payments)) throw new Error('Khoản nợ không hợp lệ.');
      addDebt(result, debt);
      for (const payment of debt.payments) {
        if (!payment) throw new Error('Lịch sử trả nợ không hợp lệ.');
        repayDebt(result, String(debt.id), payment, { recordExpense: false });
      }
    }
    const linked = new Map();
    for (const debt of result.debts) for (const payment of debt.payments) {
      if (!payment.expenseId) continue;
      if (linked.has(payment.expenseId)) throw new Error('Khoản chi trả nợ bị trùng.');
      const expense = result.days[payment.date]?.items.find(item => item.id === payment.expenseId);
      if (payment.voided) {
        if (expense) throw new Error('Lần trả nợ đã hủy vẫn có khoản chi liên kết.');
      } else if (!expense || expense.debtId !== debt.id || expense.debtPaymentId !== payment.id || expense.amount !== addMoney(payment.amount,payment.interest||0) || expenseStatus(expense) !== 'paid' || (payment.source && expense.paymentMethod !== payment.source)) throw new Error('Khoản chi trả nợ không khớp lịch sử thanh toán.');
      linked.set(payment.expenseId, payment);
    }
    const seen = new Set();
    for (const [date, day] of Object.entries(result.days)) for (const expense of day.items) {
      if (!expense.debtPaymentId) continue;
      const payment = linked.get(expense.id);
      if (!payment || payment.voided || payment.date !== date || seen.has(expense.id)) throw new Error('Khoản chi trả nợ không khớp lịch sử thanh toán.');
      seen.add(expense.id);
    }
  }
  if (input.years !== undefined) {
    if (!Array.isArray(input.years) || !input.years.length || input.years.some(year => !validYear(year))) throw new Error('Danh sách năm không hợp lệ.');
    result.years = getYears(input);
  } else {
    result.years = [...new Set([...YEARS, ...Object.keys(result.days).map(key => +key.slice(0, 4)), ...Object.keys(result.incomes).map(key => +key.slice(0, 4)), ...Object.keys(result.savings).map(key => +key.slice(0, 4)), ...Object.keys(result.goals).map(Number)])].sort((a, b) => a - b);
  }
  if (input.cards !== undefined) result.cards = normalizeCards(input.cards);
  migrateLegacyPayments(result);
  validateCardLinks(result);
  if(input.accounts !== undefined)result.accounts=normalizeAccounts(input.accounts);
  if(input.bookSettings!==undefined){result.bookSettings=normalizeBookSettings(input.bookSettings);if((result.currencies?.cash||'JPY')!==COUNTRIES[result.bookSettings.country].currency)throw Error('Quốc gia không khớp tiền tệ của sổ.');}
  if(input.receipts!==undefined)result.receipts=normalizeCashEntries(input.receipts);
  if(input.receivables!==undefined||result.receipts?.some(r=>r.type==='repayment'))result.receivables=normalizeReceivables(input.receivables||[],result.receipts||[]);
  if(input.regional!==undefined){
    if(!input.regional||typeof input.regional!=='object'||!input.regional.vietnam||input.regional.vietnam.regional)throw Error('Sổ Việt Nam không hợp lệ.');
    const vn=normalizeData(input.regional.vietnam);
    if(vn.bookSettings?.country!=='VN'||vn.currencies?.cash!=='VND')throw Error('Sổ Việt Nam phải dùng VND.');
    result.regional={vietnam:vn};
  }
  if(input.safety!==undefined||Object.values(result.days).some(d=>d.items.some(i=>i.fundId||i.obligationId)))result.safety=normalizeSafety(input.safety||{},result);
  if(result.trackingStart){
    const start=result.trackingStart,month=start.slice(0,7),a=result.accounts;
    const dates=[...Object.keys(result.days).filter(d=>result.days[d].items.length||result.days[d].note),...Object.entries(result.incomes).map(([m,r])=>r.receivedOn||m+'-15'),...(result.receipts||[]).map(r=>r.date),...result.debts.flatMap(d=>d.payments.map(p=>p.date)),...(a?[a.openedOn,a.savingsOpenedOn,...a.transfers.map(r=>r.date),...(a.reconciliations||[]).map(r=>r.date),...(a.openingHistory||[]).map(r=>r.date)]:[]),...(result.safety?.funds||[]).flatMap(f=>f.entries.map(e=>e.date))].filter(Boolean);
    if(dates.some(d=>d<start)||Object.keys(result.savings).some(m=>m<month)||Object.keys(result.goals).some(y=>y<start.slice(0,4))||(result.safety?.budgets||[]).some(b=>b.month<month))throw Error('Giao dịch hoặc số dư nằm trước ngày bắt đầu theo dõi.');
    if(result.cards)throw Error('Sổ mới chỉ ghi giao dịch tín dụng, không lưu dữ liệu PayPay hoặc sao kê.');
  }
  validateSavingsLedger(result);
  validateFunds(result);
  return result;
}
