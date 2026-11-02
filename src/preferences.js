// Display preferences are local; linked financial currencies travel with account data.
export const CURRENCIES = ['JPY', 'VND', 'USD', 'EUR', 'KRW', 'TWD', 'CNY'];
export const LANGUAGES = [['vi','Tiếng Việt'],['en','English'],['ja','日本語'],['ko','한국어'],['zh-TW','繁體中文（台灣）']];
export const defaultCurrencies = () => ({ cash: 'JPY', savings: 'VND' });
export function normalizeCurrencies(value) {
  if (!value) return defaultCurrencies();
  if (!CURRENCIES.includes(value.cash) || !CURRENCIES.includes(value.savings)) throw new Error('Loại tiền tệ không hợp lệ.');
  return { cash: value.cash, savings: value.savings };
}
let currencies = defaultCurrencies();
export function setCurrencies(value) { currencies = normalizeCurrencies(value); }
export const currencyCode = (group = 'cash') => currencies[group];
export const currencyLabel = (group = 'cash') => currencyCode(group) === 'VND' ? 'VNĐ' : currencyCode(group);
export function readDisplay() {
  try { const value = JSON.parse(localStorage.getItem('calendar-display')) || {}; return { theme: value.theme === 'dark' ? 'dark' : 'light', language: LANGUAGES.some(([key]) => key === value.language) ? value.language : 'vi' }; }
  catch { return { theme: 'light', language: 'vi' }; }
}
export function saveDisplay(value) { localStorage.setItem('calendar-display', JSON.stringify(value)); document.documentElement.dataset.theme = value.theme; }
// Group digits without re-rendering the input or losing the caret during typing.
export function groupMoneyInput(input) {
  const before = input.value;
  if (!/^(?:\d[\d,]*)?(?:\.\d{0,3})?$/.test(before)) return;
  const start = input.selectionStart ?? before.length, end = input.selectionEnd ?? start;
  const logical = position => before.slice(0, position).replace(/,/g, '').length;
  const [whole, fraction] = before.replace(/,/g, '').split('.');
  const after = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`);
  if (before === after) return;
  const locate = count => { let seen = 0; for (let i = 0; i < after.length; i++) { if (seen === count) return i; if (after[i] !== ',') seen++; } return after.length; };
  input.value = after; input.setSelectionRange(locate(logical(start)), locate(logical(end)));
}
export function finishMoneyInput(input) {
  if (!input.validity.valid || !input.value.trim()) return;
  const value = Number(input.value.replace(/,/g, ''));
  if (Number.isFinite(value) && value >= 0 && value <= 1e12) input.value = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value);
}
export function installMoneyFormatting() {
  document.addEventListener('focusout', event => { if (event.target.matches('input[data-money]')) finishMoneyInput(event.target); }, true);
  document.addEventListener('input', event => { if (!event.isComposing && event.target.matches('input[data-money]')) groupMoneyInput(event.target); }, true);
  document.addEventListener('compositionend', event => { if (event.target.matches('input[data-money]')) groupMoneyInput(event.target); }, true);
  // Deleting a grouping comma should delete the adjacent digit, not trap the caret.
  document.addEventListener('beforeinput', event => {
    const input = event.target;
    if (!input.matches('input[data-money]') || input.selectionStart !== input.selectionEnd) return;
    const position = input.selectionStart;
    if (event.inputType === 'deleteContentBackward' && input.value[position - 1] === ',') input.setSelectionRange(Math.max(0,position - 2), position);
    if (event.inputType === 'deleteContentForward' && input.value[position] === ',') input.setSelectionRange(position, position + 2);
  }, true);
}
