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
  return { salary, bonus, expense, savings, balance: salary + bonus - expense, count: entries.reduce((sum, [, day]) => sum + day.items.length, 0) };
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
export const emptyData = () => ({ version: 2, years: [...YEARS], days: {}, incomes: {}, savings: {}, goals: {} });
export function normalizeData(input) {
  if (!input || ![1, 2].includes(input.version) || typeof input.days !== 'object' || !input.days || typeof input.incomes !== 'object' || !input.incomes) throw new Error('Dữ liệu không đúng định dạng.');
  const result = emptyData();
  for (const [key, day] of Object.entries(input.days)) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(key);
    if (!match || !validYear(+match[1]) || +match[3] > daysInMonth(+match[1], +match[2] - 1) || !day || !Array.isArray(day.items)) continue;
    result.days[key] = { note: String(day.note || '').slice(0, 20000), items: day.items.map((item, i) => ({ id: String(item.id || i), title: String(item.title || '').slice(0, 500), amount: amount(item.amount) })) };
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
  if (input.years !== undefined) {
    if (!Array.isArray(input.years) || !input.years.length || input.years.some(year => !validYear(year))) throw new Error('Danh sách năm không hợp lệ.');
    result.years = getYears(input);
  } else {
    result.years = [...new Set([...YEARS, ...Object.keys(result.days).map(key => +key.slice(0, 4)), ...Object.keys(result.incomes).map(key => +key.slice(0, 4)), ...Object.keys(result.savings).map(key => +key.slice(0, 4)), ...Object.keys(result.goals).map(Number)])].sort((a, b) => a - b);
  }
  return result;
}
