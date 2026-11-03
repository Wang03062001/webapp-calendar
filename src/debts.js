import { currencyLabel } from './preferences.js';
import { MAX_AMOUNT, formatAmount, addDebt, updateDebt, removeDebt, repayDebt, cancelDebtPayment, debtBalance, debtDueStatus } from './model.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const money = value => `${formatAmount(value)} ${currencyLabel()}`;
const types = ['Vay cá nhân', 'Thẻ tín dụng', 'Trả góp', 'Vay ngân hàng', 'Khác'];
const localDate = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const dateLabel = date => date.split('-').reverse().join('/');

export function debtsPanel(data, filter = 'all') {
  const today = localDate(), status = debt => debtDueStatus(debt, today);
  const filters = [['all', 'Tất cả'], ['overdue', 'Quá hạn'], ['soon', 'Đến hạn trong 7 ngày'], ['paid', 'Đã trả hết']];
  const totals = data.debts.reduce((sum, debt) => {
    const balance = debtBalance(debt);
    sum.principal += debt.amount; sum.paid += balance.paid; sum.remaining += balance.remaining;
    return sum;
  }, { principal: 0, paid: 0, remaining: 0 });
  const visible = data.debts.filter(debt => filter === 'all' || status(debt) === filter);
  return `<section class="debt-overview" aria-label="Tổng nợ __CASH__"><div><span>Tổng nợ gốc</span><strong>${money(totals.principal)}</strong></div><div><span>Gốc đã trả</span><strong>${money(totals.paid)}</strong></div><div><span>Còn phải trả</span><strong id="debt-total">${money(totals.remaining)}</strong></div></section>
    <section class="card debts-panel"><div class="card-heading"><div><h2>Các khoản nợ</h2><p>Thanh toán được ghi vào chi tiêu __CASH__ đúng ngày trả.</p></div><button class="button save-button" data-action="add-debt">+ Thêm khoản nợ</button></div>
    <div class="debt-filters" aria-label="Lọc khoản nợ">${filters.map(([key, label]) => `<button class="filter-chip ${key === filter ? 'active' : ''}" data-debt-filter="${key}" aria-pressed="${key === filter}">${label} <span>${key === 'all' ? data.debts.length : data.debts.filter(debt => status(debt) === key).length}</span></button>`).join('')}</div>
    <div class="debt-list">${visible.length ? visible.map(debt => {
      const balance = debtBalance(debt), done = balance.remaining === 0, due = status(debt), active = debt.payments.filter(payment => !payment.voided).length;
      const dueText = done ? 'Đã hoàn tất' : due === 'overdue' ? 'Quá hạn' : due === 'soon' ? 'Sắp đến hạn' : 'Đến hạn';
      return `<article class="debt-row ${done ? 'debt-paid' : ''}" data-debt="${escape(debt.id)}"><div class="debt-title"><span class="tag">${escape(debt.type)}</span><h3>${escape(debt.title)}</h3><span class="debt-status">${done ? 'Đã trả hết' : balance.paid ? 'Đã trả một phần' : 'Chưa thanh toán'}</span><div class="debt-due ${due}">${debt.dueDate ? `${dueText} · <time datetime="${debt.dueDate}">${dateLabel(debt.dueDate)}</time>` : 'Chưa đặt ngày đến hạn'}</div></div>
        <div class="debt-amounts"><span>Nợ gốc<strong>${money(debt.amount)}</strong></span><span>Gốc đã trả<strong>${money(balance.paid)}</strong></span><span>Còn lại<strong>${money(balance.remaining)}</strong></span></div>
        <div class="debt-actions"><label class="debt-tick"><input type="checkbox" data-debt-pay="${escape(debt.id)}" aria-label="Trả nợ ${escape(debt.title)}" ${done ? 'checked disabled data-debt-complete' : ''} />${done ? 'Hoàn tất' : 'Trả nợ'}</label><button class="text-button" data-edit-debt="${escape(debt.id)}" aria-label="Sửa khoản nợ ${escape(debt.title)}">Sửa</button>${debt.payments.length ? '' : `<button class="text-button danger" data-remove-debt="${escape(debt.id)}" aria-label="Xóa khoản nợ ${escape(debt.title)}">Xóa</button>`}</div>
        ${debt.payments.length ? `<details class="debt-history"><summary>Lịch sử · ${active} lần trả${active !== debt.payments.length ? ` · ${debt.payments.length - active} đã hủy` : ''}</summary><ul>${debt.payments.map(payment => `<li class="${payment.voided ? 'payment-voided' : ''}"><time datetime="${payment.date}">${dateLabel(payment.date)}</time><strong data-money-kind="${payment.source==='bank'?'bank':payment.source==='savings'?'savings':'cash'}">${money(payment.amount+(payment.interest||0))}</strong>${payment.interest?`<span>Gốc: ${money(payment.amount)} · Lãi/phí: ${money(payment.interest)}</span>`:''}${payment.voided ? '<span>Đã hủy</span>' : `<button class="text-button danger" data-cancel-payment="${escape(payment.id)}" data-debt-id="${escape(debt.id)}" aria-label="Hủy lần trả ${money(payment.amount)} ngày ${dateLabel(payment.date)}">Hủy lần trả</button>`}</li>`).join('')}</ul></details>` : ''}</article>`;
    }).join('') : `<div class="annual-empty">${data.debts.length ? 'Không có khoản nợ khớp bộ lọc.' : 'Chưa có khoản nợ. Thêm khoản nợ để bắt đầu theo dõi.'}</div>`}</div></section>`;
}

export function showDebtDialog({ getData, getUserId, canEdit, onChange, commit, getStatus, canUseCredit, verifyCreditAccess }, debtId, mode = debtId ? 'pay' : 'create', paymentId) {
  if (!canEdit()) return;
  const currencies = JSON.stringify(getData().currencies);
  const userId = getUserId(), original = getData().debts.find(debt => debt.id === debtId);
  if (debtId && !original) return;
  if(original?.type==='Thẻ tín dụng'&&!canUseCredit())return;
  const documentSnapshot=JSON.stringify(getData()),snapshot = JSON.stringify(original), remaining = original ? debtBalance(original).remaining : 0;
  const payment = original?.payments.find(item => item.id === paymentId);
  if ((mode === 'pay' && !remaining) || (mode === 'cancel' && (!payment || payment.voided))) return;
  const editing = mode === 'edit' || mode === 'create', paying = mode === 'pay';
  const titles = { pay: 'Xác nhận trả nợ', create: 'Thêm khoản nợ', edit: 'Sửa khoản nợ', cancel: 'Hủy lần trả nợ', delete: 'Xóa khoản nợ' };
  document.querySelector('#debt-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'debt-dialog'; dialog.className = 'account-dialog debt-dialog'; dialog.setAttribute('aria-labelledby', 'debt-dialog-title');
  const fields = editing ? `<label>Tên khoản nợ<input name="title" maxlength="500" required value="${escape(original?.title || '')}" placeholder="Ví dụ: Vay mua xe" /></label><label>Loại nợ<input name="type" list="debt-types" maxlength="100" required value="${escape(original?.type || types[0])}" /></label><datalist id="debt-types">${types.filter(type=>type!=='Thẻ tín dụng'||canUseCredit()).map(type => `<option value="${type}"></option>`).join('')}</datalist><label>Ngày đến hạn (không bắt buộc)<input type="date" name="dueDate" min="1900-01-01" max="9999-12-31" value="${original?.dueDate || ''}" /></label>` : paying ? `<fieldset class="repayment-options"><legend>Cách thanh toán</legend><label><input type="radio" name="mode" value="full" checked />Trả hết</label><label><input type="radio" name="mode" value="partial" />Trả một phần</label></fieldset><label>Nguồn tiền<select name=source><option value=bank>Tài khoản ngân hàng</option><option value=cash>Tiền mặt</option>${getData().accounts?.savings!==undefined?'<option value=savings>Tiết kiệm</option>':''}</select></label><label>Ngày trả<input type="date" name="date" min="1900-01-01" max="9999-12-31" value="${localDate()}" required /></label>` : '';
  dialog.innerHTML = `<button class="dialog-close" aria-label="Đóng">×</button><h2 id="debt-dialog-title">${titles[mode]}</h2>${original ? `<p><strong translate="no">${escape(original.title)}</strong> · Còn nợ ${money(remaining)}</p>` : ''}${mode === 'cancel' ? `<p>Hủy lần trả <strong data-money-kind="${payment.source==='bank'?'bank':payment.source==='savings'?'savings':'cash'}">${money(payment.amount+(payment.interest||0))}</strong>${payment.interest?`<span>Gốc: ${money(payment.amount)} · Lãi/phí: ${money(payment.interest)}</span>`:''} ngày ${dateLabel(payment.date)}? Dư nợ sẽ tăng lại và khoản chi liên kết được gỡ. Lịch sử vẫn được giữ.</p>` : mode === 'delete' ? '<p>Xóa khoản nợ chưa có lịch sử thanh toán này?</p>' : ''}
    <form>${fields}${editing || paying ? `<label>${paying ? 'Gốc trả kỳ này' : 'Nợ gốc'} · __CASH__<input name="amount" type="text" inputmode="decimal" data-money required maxlength="32" placeholder="0" value="${paying ? formatAmount(remaining) : original ? formatAmount(original.amount) : ''}" ${paying ? 'readonly' : ''} /></label>` : ''}${paying?'<label>Lãi/phí thực trả · __CASH__<input name="interest" data-money inputmode="decimal" required value="0" maxlength="32"></label><p>Tiền nguồn giảm bằng gốc + lãi/phí. Chỉ gốc làm giảm dư nợ; không nhập lại lãi/phí thành khoản chi khác.</p>':''}<button type="submit" class="account-submit">${paying ? 'Xác nhận thanh toán' : mode === 'cancel' ? 'Xác nhận hủy lần trả' : mode === 'delete' ? 'Xác nhận xóa' : mode === 'edit' ? 'Lưu khoản nợ' : 'Thêm khoản nợ'}</button><button type="button" class="button secondary debt-cancel">Hủy</button></form><p role="status" aria-live="polite"></p>`;
  document.body.append(dialog); dialog.showModal();
  let busy = false;
  const close = () => { if (!busy) dialog.close(); };
  dialog.querySelector('.dialog-close').onclick = close; dialog.querySelector('.debt-cancel').onclick = close;
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => dialog.remove());
  const input = dialog.querySelector('[name=amount]');
  input?.addEventListener('input', () => {
    const value = input.value.trim(), numeric = Number(value.replace(/,/g, ''));
    input.setCustomValidity(!/^\d[\d,]*(?:\.\d{0,3})?$/.test(value) || !Number.isFinite(numeric) || (paying?numeric<0:numeric<=0) || numeric > MAX_AMOUNT ? (paying?'Gốc không âm; tổng gốc và lãi/phí phải lớn hơn 0.':'Nhập số tiền lớn hơn 0, tối đa 3 chữ số thập phân.') : paying && numeric > remaining ? 'Số tiền trả vượt số nợ còn lại.' : '');
  });
  input?.addEventListener('blur', () => { if (input.validity.valid && input.value) input.value = formatAmount(input.value.replace(/,/g, '')); });
  dialog.querySelectorAll('[name=mode]').forEach(radio => radio.onchange = () => {
    input.readOnly = radio.value === 'full'; input.value = input.readOnly ? formatAmount(remaining) : ''; input.setCustomValidity(''); if (!input.readOnly) input.focus();
  });
  dialog.querySelector('form').onsubmit = async event => {
    event.preventDefault(); if (busy || !canEdit() || getUserId() !== userId) { close(); return; }
    const message = dialog.querySelector('[role=status]');
    try {
      if (JSON.stringify(getData().currencies) !== currencies) throw new Error('Tiền tệ đã thay đổi. Đóng và mở lại để kiểm tra.');
      if(JSON.stringify(getData())!==documentSnapshot)throw Error('Dữ liệu đã thay đổi. Đóng và mở lại để kiểm tra.');
      const next = structuredClone(getData()), form = event.target.elements;
      if (original && JSON.stringify(next.debts.find(debt => debt.id === debtId)) !== snapshot) throw new Error('Khoản nợ đã thay đổi. Đóng và mở lại để kiểm tra.');
      if(original?.type==='Thẻ tín dụng'||form.type?.value==='Thẻ tín dụng'){if(!await verifyCreditAccess()||getUserId()!==userId)throw Error('Chức năng Thẻ & sao kê chỉ dành cho admin.');}
      let balance;
      if (paying) balance = repayDebt(next, debtId, { id: crypto.randomUUID(), date: form.date.value, amount: input.value, source: form.source.value,interest:form.interest.value });
      else if (mode === 'cancel') balance = cancelDebtPayment(next, debtId, paymentId);
      else if (mode === 'delete') removeDebt(next, debtId);
      else {
        const changes = { title: form.title.value, type: form.type.value, amount: input.value, dueDate: form.dueDate.value };
        if (mode === 'edit') updateDebt(next, debtId, changes); else addDebt(next, { ...changes, id: crypto.randomUUID() });
      }
      if(!canEdit()||getUserId()!==userId||JSON.stringify(getData())!==documentSnapshot)throw Error('Dữ liệu đã thay đổi. Đóng và mở lại để kiểm tra.');
      onChange(next); busy = true; dialog.querySelectorAll('button').forEach(button => button.disabled = true); message.textContent = 'Đang lưu…';
      try { await commit(); } catch { /* The draft and sync error remain available. */ }
      if (!canEdit() || getUserId() !== userId) { busy = false; dialog.close(); return; }
      dialog.querySelector('form').remove();
      dialog.querySelector('#debt-dialog-title').textContent = paying ? balance.remaining === 0 ? 'Chúc mừng! 🎉' : 'Đã ghi nhận trả một phần' : mode === 'cancel' ? 'Đã hủy lần trả nợ' : mode === 'delete' ? 'Đã xóa khoản nợ' : mode === 'edit' ? 'Đã cập nhật khoản nợ' : 'Đã thêm khoản nợ';
      message.textContent = balance ? paying && balance.remaining === 0 ? `Bạn đã trả hết khoản nợ “${original.title}”. Số nợ còn lại: ${money(0)}.` : `Số nợ còn lại: ${money(balance.remaining)}.` : mode === 'delete' ? 'Khoản nợ đã được xóa.' : 'Thông tin khoản nợ đã được ghi nhận.';
      if (getStatus() !== 'ready') message.textContent += ' Bản nháp đã được giữ trên máy; kiểm tra trạng thái đồng bộ trước khi đóng trang.';
      dialog.insertAdjacentHTML('beforeend', '<button class="account-submit debt-finish">Đóng</button>'); busy = false; dialog.querySelector('.dialog-close').disabled = false; dialog.querySelector('.debt-finish').onclick = close;
    } catch (error) { message.textContent = error.message; }
  };
}
