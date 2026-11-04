import {isCardPaymentCategory} from './credit-types.js';
import {amount, MAX_AMOUNT} from './model.js';
import {isCreditItem} from './credit-access.js';
import {isInternalMovement} from './account-model.js';
import {protectedExpense} from './expense-model.js';
import {t} from './i18n.js';

export function showExpenseDialog(context, date, id, editor) {
  if (!context.canEdit()) return;
  const original = context.getData().days[date]?.items.find(item => item.id === id);
  if (!original || protectedExpense(original) || !context.isExpenseConfirmed(date, original) || isCreditItem(original) && !context.canUseCredit()) return;
  const actor = context.getUserId(), before = JSON.stringify(context.getDocument());
  let draft = structuredClone(original), busy = false;
  document.querySelector('#expense-dialog')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'expense-dialog'; dialog.className = 'account-dialog ledger-dialog';
  dialog.setAttribute('aria-labelledby', 'expense-dialog-title');
  dialog.innerHTML = `<button class="dialog-close" aria-label="Đóng">×</button><h2 id="expense-dialog-title">Sửa nội dung</h2><p>${date.split('-').reverse().join('/')}</p><form><div class="expense-dialog-fields"></div><div class="expense-dialog-actions"><button type="submit" class="account-submit">Lưu</button><button type="button" class="button secondary" data-cancel>Hủy</button><button type="button" class="text-button danger" data-remove>Xóa khoản chi</button></div></form><p role="status" aria-live="polite"></p>`;
  const fields = dialog.querySelector('.expense-dialog-fields'), status = dialog.querySelector('[role=status]');
  function renderFields() {
    fields.innerHTML = editor(draft, 0, date);
    fields.querySelector('[data-delete]').remove();
  }
  renderFields(); document.body.append(dialog); dialog.showModal();
  const close = () => { if (!busy) dialog.close(); };
  dialog.querySelector('.dialog-close').onclick = close;
  dialog.querySelector('[data-cancel]').onclick = close;
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => dialog.remove());
  fields.addEventListener('input', event => {
    const target = event.target, field = target.dataset.field;
    if (!field || busy) return;
    if (field === 'amount') {
      const raw = target.value.trim();
      target.setCustomValidity(raw && !/^\d[\d,]*(?:\.\d{0,3})?$/.test(raw) ? t('Nhập số tiền dạng 1,000,000; có thể nhập tối đa 3 chữ số thập phân.') : Number(raw.replace(/,/g, '')) > MAX_AMOUNT ? t('Số tiền vượt giới hạn cho phép.') : '');
      if (target.validity.valid) draft.amount = amount(raw);
      return;
    }
    if (!target.checkValidity()) return;
    if (field === 'fundId') {
      const fund = context.getData().safety?.funds.find(f => f.id === target.value && (!f.archived || f.id === original.fundId));
      if (target.value && !fund) return;
      if (fund) { draft.fundId = fund.id; draft.paymentMethod = fund.source;delete draft.creditTracking;delete draft.creditPeriod; delete draft.movement; delete draft.settlement; delete draft.billingMonth; }
      else delete draft.fundId;
    } else if (field === 'movement') {
      if (draft.fundId && target.value) { status.textContent = t('Bỏ quỹ trước khi chuyển nguồn nội bộ.'); renderFields(); return; }
      if (target.value) {
        delete draft.creditTracking;delete draft.creditPeriod;draft.movement = target.value; draft.paymentMethod = target.value === 'withdraw' ? 'bank' : 'cash'; draft.status = 'paid'; draft.category = 'Chuyển tiền nội bộ';
        if (!draft.title || ['Rút tiền mặt', 'Nạp tiền vào ngân hàng'].includes(draft.title)) draft.title = target.value === 'withdraw' ? 'Rút tiền mặt' : 'Nạp tiền vào ngân hàng';
        delete draft.settlement; delete draft.billingMonth;
      } else { delete draft.movement; draft.category = 'Khác'; }
    } else if (field === 'paymentMethod') {
      if (isInternalMovement(draft) || draft.fundId || target.value === 'card' && !context.canUseCredit() || target.value === 'savings' && context.getData().accounts?.savings === undefined) return;
      draft.paymentMethod = target.value;
      if (target.value === 'card') { draft.creditTracking=true;delete draft.settlement;delete draft.billingMonth;delete draft.creditPeriod; }
      else { delete draft.creditTracking;delete draft.settlement; delete draft.billingMonth; }
    } else if (['title', 'category', 'status', 'settlement', 'billingMonth','creditPeriod'].includes(field)) draft[field] = target.value;
    if(field==='category'&&!isCardPaymentCategory(target.value))delete draft.creditPeriod;
    if (['fundId', 'movement', 'paymentMethod','category'].includes(field)) renderFields();
  });
  const check = () => {
    if (!dialog.open || !context.canEdit() || context.getUserId() !== actor || JSON.stringify(context.getDocument()) !== before) throw Error('Dữ liệu, khu vực hoặc tài khoản đã thay đổi. Đóng và mở lại để kiểm tra.');
  };
  async function submit(remove = false) {
    if (busy) return;
    try {
      check();
      if (!remove && !dialog.querySelector('form').reportValidity()) return;
      if (remove && !globalThis.confirm(t('Xóa khoản chi đã lưu này?'))) return;
      busy = true; dialog.querySelectorAll('input,select,button').forEach(control => control.disabled = true);
      // Always reverify, including an admin changing a card purchase to cash.
      await context.verifyCreditAccess(); check();
      if ((isCreditItem(original) || isCreditItem(draft)) && !context.canUseCredit()) throw Error('Chức năng Thẻ & sao kê chỉ dành cho admin.');
      const next = structuredClone(context.getData()), items = next.days[date].items;
      const index = items.findIndex(item => item.id === id);
      if (index < 0 || protectedExpense(items[index])) throw Error('Khoản chi đã thay đổi.');
      if (remove) items.splice(index, 1); else items[index] = structuredClone(draft);
      // Full normalization validates linked rows, historical source/fund stock,
      // precision and both books before the optimistic server write.
      await context.commitConfirmed(next); dialog.close();
    } catch (error) { status.textContent = t(error.message); }
    finally {
      busy = false; dialog.querySelectorAll('input,select,button').forEach(control => control.disabled = false);
      const source = fields.querySelector('[data-field=paymentMethod]');
      if (source) source.disabled = Boolean(draft.fundId || isInternalMovement(draft));
    }
  }
  dialog.querySelector('form').onsubmit = event => { event.preventDefault(); void submit(); };
  dialog.querySelector('[data-remove]').onclick = () => void submit(true);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.target.matches('input,select')) { event.preventDefault(); void submit(); }
  });
}
