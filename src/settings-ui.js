import { CURRENCIES, LANGUAGES, normalizeCurrencies } from './preferences.js';
const hasMoney = (data, group) => group === 'savings' ? [...Object.values(data.savings), ...Object.values(data.goals)].some(Number) : Object.values(data.incomes).some(i => i.salary || i.bonus) || Object.values(data.days).some(d => d.items.some(i => i.amount)) || data.debts.length > 0 || (data.cards?.statements.length || 0) > 0;
export function needsCurrencySetup(data) { return !data.currencies && !hasMoney(data, 'cash') && !hasMoney(data, 'savings'); }
export function showSettings(context, display, onDisplay, onboarding = false) {
  if (document.querySelector('#settings-dialog[open]')) return;
  document.querySelector('#settings-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'settings-dialog'; dialog.className = 'account-dialog settings-dialog';
  const user = context.getUserId(), original = normalizeCurrencies(context.getData().currencies);
  const choices = value => CURRENCIES.map(code => `<option value="${code}" ${code === value ? 'selected' : ''}>${code}</option>`).join('');
  dialog.innerHTML = `<button class="dialog-close" aria-label="Đóng">×</button><h2>${onboarding ? 'Chọn tiền tệ để bắt đầu' : 'Cài đặt'}</h2><form><label>Ngôn ngữ<select name="language">${LANGUAGES.map(([code,label]) => `<option translate="no" value="${code}" ${code === display.language ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Giao diện<select name="theme"><option value="light" ${display.theme === 'light' ? 'selected' : ''}>Sáng</option><option value="dark" ${display.theme === 'dark' ? 'selected' : ''}>Tối</option></select></label>${user ? `<fieldset><legend>Tiền tệ theo nhóm</legend><label>Thu chi, khoản vay và sao kê<select name="cash">${choices(original.cash)}</select></label><p>Lương, thưởng, chi tiêu, khoản vay và sao kê dùng chung một loại tiền tệ.</p><label>Tiết kiệm và mục tiêu tiết kiệm<select name="savings">${choices(original.savings)}</select></label><p>Tiết kiệm tháng và mục tiêu năm dùng chung một loại tiền tệ.</p><div class="currency-existing" hidden><p>Nhóm đã có dữ liệu. Đổi đơn vị sẽ áp dụng cho toàn bộ các năm và giữ nguyên số tiền, không quy đổi tỷ giá.</p><label class="checkbox-label"><input type="checkbox" name="acknowledge" />Tôi muốn giữ số tiền và đổi đơn vị của cả nhóm.</label></div></fieldset>` : ''}<button class="account-submit">${onboarding ? 'Bắt đầu' : 'Lưu cài đặt'}</button></form><p role="status" aria-live="polite"></p>`;
  document.body.append(dialog); dialog.showModal();
  const form = dialog.querySelector('form');
  dialog.querySelector('.dialog-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  const changesExisting = () => user && ['cash','savings'].some(group => form.elements[group].value !== original[group] && hasMoney(context.getData(), group));
  form.onchange = event => {
    if (['cash','savings'].includes(event.target.name)) { form.elements.acknowledge.checked = false; dialog.querySelector('.currency-existing').hidden = !changesExisting(); }
  };
  form.onsubmit = async event => {
    event.preventDefault(); const status = dialog.querySelector('[role=status]'), button = form.querySelector('button');
    try {
      if (user && (!context.canEdit() || context.getUserId() !== user)) throw new Error('Phiên đăng nhập đã thay đổi.');
      if (user && JSON.stringify(normalizeCurrencies(context.getData().currencies)) !== JSON.stringify(original)) throw new Error('Cài đặt đã thay đổi. Đóng và mở lại để kiểm tra.');
      if (changesExisting() && !form.elements.acknowledge.checked) throw new Error('Xác nhận cách đổi đơn vị cho dữ liệu hiện có.');
      button.disabled = true;
      if (user) {
        const currencies = normalizeCurrencies({cash: form.elements.cash.value, savings: form.elements.savings.value});
        if (JSON.stringify(context.getData().currencies) !== JSON.stringify(currencies)) { const next = structuredClone(context.getData()); next.currencies = currencies; context.onChange(next); await context.commit(); }
      }
      onDisplay({ theme: form.elements.theme.value, language: form.elements.language.value });
      dialog.close();
    } catch (error) { status.textContent = error.message; button.disabled = false; }
  };
}
