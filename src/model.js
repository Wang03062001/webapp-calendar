export const YEARS = Array.from({ length: 8 }, (_, i) => 2026 + i);
export const MAX_AMOUNT = 1_000_000_000_000;
export const amount = value => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(MAX_AMOUNT, Math.max(0, Math.round(number))) : 0;
};
export const dayKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
export const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;
export const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
export const dayTotal = day => (day?.items || []).reduce((sum, item) => sum + amount(item.amount), 0);
export function monthSummary(data, year, month) {
  const prefix = monthKey(year, month);
  const entries = Object.entries(data.days).filter(([key]) => key.startsWith(`${prefix}-`));
  const expense = entries.reduce((sum, [, day]) => sum + dayTotal(day), 0);
  const income = data.incomes[prefix] || {};
  const salary = amount(income.salary), bonus = amount(income.bonus);
  const savings = amount(data.savings?.[prefix]);
  return { salary, bonus, expense, savings, balance: salary + bonus - expense - savings, count: entries.reduce((sum, [, day]) => sum + day.items.length, 0) };
}
export function yearSummary(data, year) {
  return Array.from({ length: 12 }, (_, month) => monthSummary(data, year, month)).reduce((all, item) => {
    for (const key of Object.keys(all)) all[key] += item[key];
    return all;
  }, { salary: 0, bonus: 0, expense: 0, savings: 0, balance: 0, count: 0 });
}
export function savingsProgress(data, year) {
  const saved = yearSummary(data, year).savings;
  const goal = amount(data.goals?.[year]);
  return { saved, goal, remaining: Math.max(0, goal - saved), percent: goal ? Math.round(saved / goal * 100) : 0 };
}
export const emptyData = () => ({ version: 2, days: {}, incomes: {}, savings: {}, goals: {} });
export function normalizeData(input) {
  if (!input || ![1, 2].includes(input.version) || typeof input.days !== 'object' || !input.days || typeof input.incomes !== 'object' || !input.incomes) throw new Error('Dữ liệu không đúng định dạng.');
  const result = emptyData();
  for (const [key, day] of Object.entries(input.days)) {
    const match = /^(202[6-9]|203[0-3])-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(key);
    if (!match || +match[3] > daysInMonth(+match[1], +match[2] - 1) || !day || !Array.isArray(day.items)) continue;
    result.days[key] = { note: String(day.note || '').slice(0, 20000), items: day.items.map((item, i) => ({ id: String(item.id || i), title: String(item.title || '').slice(0, 500), amount: amount(item.amount) })) };
  }
  for (const [key, income] of Object.entries(input.incomes)) {
    if (/^(202[6-9]|203[0-3])-(0[1-9]|1[0-2])$/.test(key) && income) result.incomes[key] = { salary: amount(income.salary), bonus: amount(income.bonus), note: String(income.note || '').slice(0, 20000) };
  }
  for (const [key, value] of Object.entries(input.savings || {})) {
    if (/^(202[6-9]|203[0-3])-(0[1-9]|1[0-2])$/.test(key)) result.savings[key] = amount(value);
  }
  for (const [key, value] of Object.entries(input.goals || {})) {
    if (YEARS.includes(Number(key))) result.goals[key] = amount(value);
  }
  return result;
}
