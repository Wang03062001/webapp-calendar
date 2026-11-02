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
const moneyFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
export const formatAmount = value => moneyFormatter.format(Number.isFinite(Number(value)) ? Number(value) : 0);
export const amount = value => {
  const number = Number(typeof value === 'string' ? value.replace(/,/g, '').trim() : value);
  return Number.isFinite(number) ? Math.min(MAX_AMOUNT, Math.max(0, roundMoney(number))) : 0;
};
export const dayKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
export const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;
export const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
export const dayTotal = day => roundMoney((day?.items || []).reduce((sum, item) => sum + amount(item.amount), 0));
export function monthSummary(data, year, month) {
  const prefix = monthKey(year, month);
  const entries = Object.entries(data.days).filter(([key]) => key.startsWith(`${prefix}-`));
  const expense = roundMoney(entries.reduce((sum, [, day]) => sum + dayTotal(day), 0));
  const income = data.incomes[prefix] || {};
  const salary = amount(income.salary), bonus = amount(income.bonus);
  const savings = amount(data.savings?.[prefix]);
  return { salary, bonus, expense, savings, balance: roundMoney(salary + bonus - expense), count: entries.reduce((sum, [, day]) => sum + day.items.length, 0) };
}
export function yearSummary(data, year) {
  return Array.from({ length: 12 }, (_, month) => monthSummary(data, year, month)).reduce((all, item) => {
    for (const key of Object.keys(all)) all[key] = roundMoney(all[key] + item[key]);
    return all;
  }, { salary: 0, bonus: 0, expense: 0, savings: 0, balance: 0, count: 0 });
}
export function savingsProgress(data, year) {
  const saved = yearSummary(data, year).savings;
  const goal = amount(data.goals?.[year]);
  return { saved, goal, remaining: roundMoney(Math.max(0, goal - saved)), percent: goal ? Math.round(saved / goal * 100) : 0 };
}
export const validDate = value => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(value);
  return Boolean(match && validYear(+match[1]) && +match[3] <= daysInMonth(+match[1], +match[2] - 1));
};
export function debtBalance(debt) {
  const paid = roundMoney(debt.payments.reduce((sum, payment) => sum + payment.amount, 0));
  return { paid, remaining: roundMoney(debt.amount - paid) };
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
  data.debts.push({ id, title, type, amount: positiveMoney(debt.amount), payments: [] });
}
export function repayDebt(data, debtId, payment, { recordExpense = true } = {}) {
  const debt = data.debts.find(item => item.id === debtId);
  if (!debt) throw new Error('Không tìm thấy khoản nợ.');
  const value = positiveMoney(payment.amount);
  const id = String(payment.id || '');
  if (!id.trim() || debt.payments.some(item => item.id === id)) throw new Error('Lần trả nợ này đã được ghi nhận.');
  if (!validDate(payment.date)) throw new Error('Ngày trả nợ không hợp lệ.');
  if (value > debtBalance(debt).remaining) throw new Error('Số tiền trả vượt số nợ còn lại.');
  const expenseId = recordExpense ? `debt-payment-${id}` : payment.expenseId;
  if (recordExpense) {
    if (Object.values(data.days).some(day => day.items.some(item => item.id === expenseId))) throw new Error('Khoản chi trả nợ này đã tồn tại.');
    const entry = data.days[payment.date] ||= { note: '', items: [] };
    entry.items.push({ id: expenseId, title: `Trả nợ: ${debt.title}`.slice(0, 500), amount: value, debtId, debtPaymentId: id });
    const paymentYear = Number(payment.date.slice(0, 4));
    if (!getYears(data).includes(paymentYear)) addYear(data, paymentYear);
  }
  debt.payments.push({ id, date: payment.date, amount: value, ...(expenseId ? { expenseId: String(expenseId) } : {}) });
  return debtBalance(debt);
}
export const emptyData = () => ({ version: 2, years: [...YEARS], days: {}, incomes: {}, savings: {}, goals: {}, debts: [] });
export function normalizeData(input) {
  if (!input || ![1, 2].includes(input.version) || typeof input.days !== 'object' || !input.days || typeof input.incomes !== 'object' || !input.incomes) throw new Error('Dữ liệu không đúng định dạng.');
  const result = emptyData();
  for (const [key, day] of Object.entries(input.days)) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(key);
    if (!match || !validYear(+match[1]) || +match[3] > daysInMonth(+match[1], +match[2] - 1) || !day || !Array.isArray(day.items)) continue;
    result.days[key] = { note: String(day.note || '').slice(0, 20000), items: day.items.map((item, i) => ({ id: String(item.id || i), title: String(item.title || '').slice(0, 500), amount: amount(item.amount), ...(item.debtId && item.debtPaymentId ? { debtId: String(item.debtId), debtPaymentId: String(item.debtPaymentId) } : {}) })) };
  }
  for (const [key, income] of Object.entries(input.incomes)) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(key) && validYear(+key.slice(0, 4)) && income) result.incomes[key] = { salary: amount(income.salary), bonus: amount(income.bonus), note: String(income.note || '').slice(0, 20000) };
  }
  for (const [key, value] of Object.entries(input.savings || {})) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(key) && validYear(+key.slice(0, 4))) result.savings[key] = amount(value);
  }
  for (const [key, value] of Object.entries(input.goals || {})) {
    if (/^\d{4}$/.test(key) && validYear(Number(key))) result.goals[key] = amount(value);
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
      if (!expense || expense.debtId !== debt.id || expense.debtPaymentId !== payment.id || expense.amount !== payment.amount) throw new Error('Khoản chi trả nợ không khớp lịch sử thanh toán.');
      linked.set(payment.expenseId, payment);
    }
    const seen = new Set();
    for (const [date, day] of Object.entries(result.days)) for (const expense of day.items) {
      if (!expense.debtPaymentId) continue;
      const payment = linked.get(expense.id);
      if (!payment || payment.date !== date || seen.has(expense.id)) throw new Error('Khoản chi trả nợ không khớp lịch sử thanh toán.');
      seen.add(expense.id);
    }
  }
  if (input.years !== undefined) {
    if (!Array.isArray(input.years) || !input.years.length || input.years.some(year => !validYear(year))) throw new Error('Danh sách năm không hợp lệ.');
    result.years = getYears(input);
  } else {
    result.years = [...new Set([...YEARS, ...Object.keys(result.days).map(key => +key.slice(0, 4)), ...Object.keys(result.incomes).map(key => +key.slice(0, 4)), ...Object.keys(result.savings).map(key => +key.slice(0, 4)), ...Object.keys(result.goals).map(Number)])].sort((a, b) => a - b);
  }
  return result;
}
