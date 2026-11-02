import { MAX_AMOUNT, formatAmount, addDebt, repayDebt, debtBalance } from './model.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = value => `${formatAmount(value)} JPY`;
const types = ['Vay cá nhân', 'Thẻ tín dụng', 'Trả góp', 'Vay ngân hàng', 'Khác'];

export function debtsPanel(data) {
  const totals = data.debts.reduce((sum, debt) => {
    const balance = debtBalance(debt);
    sum.principal += debt.amount; sum.paid += balance.paid; sum.remaining += balance.remaining;
    return sum;
  }, { principal: 0, paid: 0, remaining: 0 });
  return `<section class="debt-overview" aria-label="Tổng nợ JPY"><div><span>Tổng nợ gốc</span><strong>${money(totals.principal)}</strong></div><div><span>Đã trả</span><strong>${money(totals.paid)}</strong></div><div><span>Còn phải trả</span><strong id="debt-total">${money(totals.remaining)}</strong></div></section>
    <section class="card debts-panel"><div class="card-heading"><div><h2>Các khoản nợ</h2><p>Mỗi lần trả nợ được ghi vào chi tiêu JPY</p></div><button class="button save-button" data-action="add-debt">+ Thêm khoản nợ</button></div>
    <div class="debt-list">${data.debts.length ? data.debts.map(debt => {
      const balance = debtBalance(debt), done = balance.remaining === 0;
      return `<article class="debt-row ${done ? 'debt-paid' : ''}" data-debt="${escape(debt.id)}"><div class="debt-title"><span class="tag">${escape(debt.type)}</span><h3>${escape(debt.title)}</h3><span class="debt-status">${done ? 'Đã trả hết' : balance.paid ? 'Đã trả một phần' : 'Chưa thanh toán'}</span></div>
        <div class="debt-amounts"><span>Nợ gốc<strong>${money(debt.amount)}</strong></span><span>Đã trả<strong>${money(balance.paid)}</strong></span><span>Còn lại<strong>${money(balance.remaining)}</strong></span></div>
        <label class="debt-tick"><input type="checkbox" data-debt-pay="${escape(debt.id)}" aria-label="Trả nợ ${escape(debt.title)}" ${done ? 'checked disabled data-debt-complete' : ''} />${done ? 'Hoàn tất' : 'Trả nợ'}</label>
        ${debt.payments.length ? `<details class="debt-history"><summary>Lịch sử · ${debt.payments.length} lần trả</summary><ul>${debt.payments.map(payment => `<li><time datetime="${payment.date}">${payment.date.split('-').reverse().join('/')}</time><strong>${money(payment.amount)}</strong></li>`).join('')}</ul></details>` : ''}</article>`;
    }).join('') : '<div class="annual-empty">Chưa có khoản nợ. Thêm khoản nợ để bắt đầu theo dõi.</div>'}</div></section>`;
}

export function showDebtDialog({ getData, getUserId, canEdit, onChange, commit, getStatus }, debtId) {
  if (!canEdit()) return;
  const userId = getUserId(), original = getData().debts.find(debt => debt.id === debtId);
  if (debtId && !original) return;
  const remaining = original ? debtBalance(original).remaining : 0;
  if (original && !remaining) return;
  document.querySelector('#debt-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'debt-dialog'; dialog.className = 'account-dialog debt-dialog'; dialog.setAttribute('aria-labelledby', 'debt-dialog-title');
  const amountInput = `<input name="amount" type="text" inputmode="decimal" data-money required maxlength="32" placeholder="0.000" ${original ? `value="${formatAmount(remaining)}" readonly` : ''} />`;
  const today = new Date(), date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  dialog.innerHTML = `<button class="dialog-close" aria-label="Đóng">×</button><h2 id="debt-dialog-title">${original ? 'Xác nhận trả nợ' : 'Thêm khoản nợ'}</h2>
    ${original ? `<p><strong>${escape(original.title)}</strong></p><p>Còn nợ <strong>${money(remaining)}</strong></p>` : ''}
    <form>${original ? `<fieldset class="repayment-options"><legend>Cách thanh toán</legend><label><input type="radio" name="mode" value="full" checked />Trả hết</label><label><input type="radio" name="mode" value="partial" />Trả một phần</label></fieldset><p>Khoản trả sẽ được ghi vào chi tiêu của ngày thanh toán.</p><label>Ngày trả<input type="date" name="date" min="1900-01-01" max="9999-12-31" value="${date}" required /></label>` : `<label>Tên khoản nợ<input name="title" maxlength="500" required placeholder="Ví dụ: Vay mua xe" /></label><label>Loại nợ<input name="type" list="debt-types" maxlength="100" required value="${types[0]}" /></label><datalist id="debt-types">${types.map(type => `<option value="${type}"></option>`).join('')}</datalist>`}
      <label>${original ? 'Số tiền trả' : 'Số tiền nợ'} · JPY${amountInput}</label><button type="submit" class="account-submit">${original ? 'Xác nhận thanh toán' : 'Thêm khoản nợ'}</button><button type="button" class="button secondary debt-cancel">Hủy</button></form><p role="status" aria-live="polite"></p>`;
  document.body.append(dialog); dialog.showModal();
  let busy = false;
  const close = () => { if (!busy) dialog.close(); };
  dialog.querySelector('.dialog-close').onclick = close;
  dialog.querySelector('.debt-cancel').onclick = close;
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => dialog.remove());
  const input = dialog.querySelector('[name=amount]');
  input.addEventListener('input', () => {
    const value = input.value.trim(), numeric = Number(value.replace(/,/g, ''));
    input.setCustomValidity(!/^\d[\d,]*(?:\.\d{0,3})?$/.test(value) || !Number.isFinite(numeric) || numeric <= 0 || numeric > MAX_AMOUNT ? 'Nhập số tiền lớn hơn 0, tối đa 3 chữ số thập phân.' : original && numeric > remaining ? 'Số tiền trả vượt số nợ còn lại.' : '');
  });
  input.addEventListener('blur', () => { if (input.validity.valid && input.value) input.value = formatAmount(input.value.replace(/,/g, '')); });
  dialog.querySelectorAll('[name=mode]').forEach(radio => radio.onchange = () => {
    input.readOnly = radio.value === 'full'; input.value = input.readOnly ? formatAmount(remaining) : '';
    input.setCustomValidity(''); if (!input.readOnly) input.focus();
  });
  dialog.querySelector('form').onsubmit = async event => {
    event.preventDefault(); if (busy || !canEdit() || getUserId() !== userId) { close(); return; }
    const message = dialog.querySelector('[role=status]');
    let balance;
    try {
      const next = structuredClone(getData()), form = event.target.elements;
      if (original) {
        const current = next.debts.find(debt => debt.id === debtId);
        if (!current || debtBalance(current).remaining !== remaining) throw new Error('Khoản nợ đã thay đổi. Đóng và mở lại để kiểm tra.');
        balance = repayDebt(next, debtId, { id: crypto.randomUUID(), date: form.date.value, amount: input.value });
      } else addDebt(next, { id: crypto.randomUUID(), title: form.title.value, type: form.type.value, amount: input.value });
      onChange(next); busy = true;
      dialog.querySelectorAll('button').forEach(button => button.disabled = true);
      message.textContent = 'Đang lưu…';
      try { await commit(); } catch { /* The account draft and sync error remain available. */ }
      if (!canEdit() || getUserId() !== userId) { busy = false; dialog.close(); return; }
      dialog.querySelector('form').remove();
      dialog.querySelector('#debt-dialog-title').textContent = !original ? 'Đã thêm khoản nợ' : balance.remaining === 0 ? 'Chúc mừng! 🎉' : 'Đã ghi nhận trả một phần';
      message.textContent = !original ? 'Bạn có thể tiếp tục thêm khoản nợ khác.' : balance.remaining === 0 ? `Bạn đã trả hết khoản nợ “${original.title}”. Số nợ còn lại: ${money(0)}.` : `Số nợ còn lại: ${money(balance.remaining)}.`;
      if (getStatus() !== 'ready') message.textContent += ' Bản nháp đã được giữ trên máy; kiểm tra trạng thái đồng bộ trước khi đóng trang.';
      dialog.insertAdjacentHTML('beforeend', '<button class="account-submit debt-finish">Đóng</button>');
      busy = false; dialog.querySelector('.dialog-close').disabled = false; dialog.querySelector('.debt-finish').onclick = close;
    } catch (error) { message.textContent = error.message; }
  };
}
