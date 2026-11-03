import { CURRENCIES, LANGUAGES, normalizeCurrencies, currenciesForLanguage } from './preferences.js';
const hasMoney = (data, group) => group === 'savings' ? [...Object.values(data.savings), ...Object.values(data.goals)].some(Number) : Object.values(data.incomes).some(i => i.salary || i.bonus) || Object.values(data.days).some(d => d.items.some(i => i.amount)) || data.debts.length > 0 || (data.cards?.statements.length || 0) > 0;
export function needsCurrencySetup(data) { return !data.currencies && !hasMoney(data, 'cash') && !hasMoney(data, 'savings'); }
export function showSettings(context, display, onDisplay, onboarding = false) {
  if (document.querySelector('#settings-dialog[open]')) return;
  document.querySelector('#settings-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'settings-dialog'; dialog.className = 'account-dialog settings-dialog';
  const user = context.getUserId(), original = normalizeCurrencies(context.getData().currencies);
  const initialCurrencies = user && needsCurrencySetup(context.getData()) ? currenciesForLanguage(display.language) : original;
  const choices = value => CURRENCIES.map(code => `<option value="${code}" ${code === value ? 'selected' : ''}>${code}</option>`).join('');
  dialog.innerHTML = `<button class="dialog-close" aria-label="Đóng">×</button><h2>${onboarding ? 'Chọn tiền tệ để bắt đầu' : 'Cài đặt'}</h2><form><label>Ngôn ngữ<select name="language">${LANGUAGES.map(([code,label]) => `<option translate="no" value="${code}" ${code === display.language ? 'selected' : ''}>${label}</option>`).join('')}</select></label><p>Đổi ngôn ngữ sẽ chọn tiền tệ tương ứng cho cả hai nhóm. Bạn vẫn có thể chọn tiền tệ khác thủ công trước khi lưu.</p><label>Giao diện<select name="theme"><option value="light" ${display.theme === 'light' ? 'selected' : ''}>Sáng</option><option value="dark" ${display.theme === 'dark' ? 'selected' : ''}>Tối</option></select></label>${user ? `<fieldset><legend>Tiền tệ theo nhóm</legend><label>Thu chi, khoản vay và sao kê<select name="cash">${choices(initialCurrencies.cash)}</select></label><p>Lương, thưởng, chi tiêu, khoản vay và sao kê dùng chung một loại tiền tệ.</p><label>Tiết kiệm và mục tiêu tiết kiệm<select name="savings">${choices(initialCurrencies.savings)}</select></label><p>Tiết kiệm tháng và mục tiêu năm dùng chung một loại tiền tệ.</p><div class="currency-existing" hidden><p>Nhóm đã có dữ liệu. Đổi đơn vị sẽ áp dụng cho toàn bộ các năm và giữ nguyên số tiền, không quy đổi tỷ giá.</p><label class="checkbox-label"><input type="checkbox" name="acknowledge" />Tôi muốn giữ số tiền và đổi đơn vị của cả nhóm.</label></div></fieldset>` : ''}<button class="account-submit">${onboarding ? 'Bắt đầu' : 'Lưu cài đặt'}</button></form><p role="status" aria-live="polite"></p>`;
  document.body.append(dialog); dialog.showModal();
  const form = dialog.querySelector('form');
  let busy = false;
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.querySelector('.dialog-close').onclick = () => { if (!busy) dialog.close(); };
  dialog.addEventListener('close', () => dialog.remove());
  const changesExisting = () => user && ['cash','savings'].some(group => form.elements[group].value !== original[group] && hasMoney(context.getData(), group));
  form.onchange = event => {
    if (event.target.name === 'language' && user) {
      const suggested = currenciesForLanguage(event.target.value);
      form.elements.cash.value = suggested.cash;
      form.elements.savings.value = suggested.savings;
    }
    if (user && ['language','cash','savings'].includes(event.target.name)) { form.elements.acknowledge.checked = false; dialog.querySelector('.currency-existing').hidden = !changesExisting(); }
  };
  form.onsubmit = async event => {
    event.preventDefault(); if (busy) return; const status = dialog.querySelector('[role=status]');
    try {
      if (user && (!context.canEdit() || context.getUserId() !== user)) throw new Error('Phiên đăng nhập đã thay đổi.');
      if (user && JSON.stringify(normalizeCurrencies(context.getData().currencies)) !== JSON.stringify(original)) throw new Error('Cài đặt đã thay đổi. Đóng và mở lại để kiểm tra.');
      if (changesExisting() && !form.elements.acknowledge.checked) throw new Error('Xác nhận cách đổi đơn vị cho dữ liệu hiện có.');
      const selectedDisplay = { theme: form.elements.theme.value, language: form.elements.language.value };
      busy = true; dialog.querySelectorAll('input,select,button').forEach(control => control.disabled = true);
      if (user) {
        const currencies = normalizeCurrencies({cash: form.elements.cash.value, savings: form.elements.savings.value});
        if (JSON.stringify(context.getData().currencies) !== JSON.stringify(currencies)) { const next = structuredClone(context.getData()); next.currencies = currencies; context.onChange(next); await context.commit(); }
      }
      if (user && context.getUserId() !== user) { dialog.close(); return; }
      onDisplay(selectedDisplay);
      dialog.close();
    } catch (error) { status.textContent = error.message; }
    finally { busy = false; dialog.querySelectorAll('input,select,button').forEach(control => control.disabled = false); }
  };
}
