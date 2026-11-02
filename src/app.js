import { YEARS, MIN_YEAR, MAX_YEAR, getYears, addYear, removeYear, MAX_AMOUNT, amount, formatAmount, dayKey, monthKey, daysInMonth, dayTotal, monthSummary, yearSummary, savingsProgress, emptyData, normalizeData } from './model.js';
import { supabaseConfig } from './config.js';
import { SupabaseClient } from './supabase.js';
import { SyncController } from './sync.js';
import { showAdmin, showPasswordReset, showRecovery } from './admin.js';

const money = (number, currency = 'JPY') => formatAmount(number) + (currency === 'VND' ? ' VNĐ' : ' JPY');
const dong = number => money(number, 'VND');
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icons = {
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-14 4h3v3H7z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  wallet: '<path d="M20 8V5a2 2 0 0 0-2-2L5 6a3 3 0 0 0-2 3v10a2 2 0 0 0 2 2h15V8H6a3 3 0 0 1-3-2"/><path d="M20 12h-6v5h6m-3-2.5h.01"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  down: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  up: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>', trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  note: '<path d="M14 3H5v18h14V8l-5-5v5h5M8 12h8m-8 4h6"/>',
  chart: '<path d="M4 3v18h17M8 16v-4m5 4V8m5 8V5"/>',
  spark: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.calendar}</svg>`;
const now = new Date();
let year = Math.min(2033, Math.max(2026, now.getFullYear())), month = now.getMonth(), day = now.getDate(), view = 'calendar';
let data = emptyData(), savedTimer;
const root = document.querySelector('#app');
const years = () => getYears(data);
const selectedKey = () => dayKey(year, month, day);
const currentDay = () => data.days[selectedKey()] || { note: '', items: [] };
function ensureDay() { return data.days[selectedKey()] ||= { note: '', items: [] }; }
function ensureIncome() { return data.incomes[monthKey(year, month)] ||= { salary: 0, bonus: 0, note: '' }; }
function notify(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('visible');
  clearTimeout(savedTimer); savedTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}
function persist() {
  if (!canEdit()) { notify('Hãy đăng nhập trước khi nhập dữ liệu.'); return false; }
  try { cloud.save(data); return true; }
  catch { notify('Không thể lưu trên trình duyệt. Hãy xuất dữ liệu để tránh mất thay đổi.'); return false; }
}
function canEdit() { return Boolean(cloud.user) && cloud.status !== 'loading'; }
function formatMoneyInput(input) { if (input.validity.valid && input.value.trim()) input.value = formatAmount(amount(input.value)); }
async function saveChanges() {
  if (!canEdit()) return;
  try {
    for (const input of root.querySelectorAll('[data-money]')) { if (!input.reportValidity()) return; formatMoneyInput(input); }
    await cloud.commit();
    if (cloud.status === 'ready') notify('Đã lưu thay đổi.');
    else if (['error', 'conflict'].includes(cloud.status)) notify(cloud.message);
  } catch (error) { notify(error.message); }
}
function render() {
  if (!years().includes(year)) { year = years()[0]; day = Math.min(day, daysInMonth(year, month)); }
  const totals = yearSummary(data, year);
  root.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="Lịch của tôi">${icon('calendar')}<span>Lịch của tôi<span class="brand-sub">TÀI CHÍNH CÁ NHÂN</span></span></a>
      <div class="workspace-label">KHÔNG GIAN CÁ NHÂN</div>
      <nav aria-label="Điều hướng chính">
        <button class="nav-item ${view === 'calendar' ? 'active' : ''}" data-view="calendar">${icon('calendar')} Lịch chi tiêu</button>
        <button class="nav-item ${view === 'year' ? 'active' : ''}" data-view="year">${icon('chart')} Tổng kết năm</button>
      </nav>
      <div class="year-heading"><span>KẾ HOẠCH THEO NĂM</span><span>${String(years().length).padStart(2, '0')}</span></div>
      <div class="years">${years().map(y => `<button class="year-button ${year === y ? 'selected' : ''}" data-year="${y}" aria-pressed="${year === y}"><span><i></i>${y}</span>${year === y ? icon('arrow') : ''}</button>`).join('')}</div>
      <div class="sidebar-bottom"><div class="local-badge">${icon('check')} Dữ liệu lưu trên thiết bị</div><p>Một chút kế hoạch hôm nay.<br>Thảnh thơi hơn ngày mai.</p><div class="profile"><span class="avatar">T</span><div>Tài chính của tôi<small>Không gian riêng của bạn</small></div></div></div>
    </aside>
    <main>
      <header class="topbar"><div class="breadcrumb">Không gian cá nhân <span>/</span> <strong>${view === 'calendar' ? 'Lịch chi tiêu' : 'Tổng kết năm'}</strong></div><div class="top-actions"><button class="button secondary small" data-action="account">${icon('wallet')} <span id="account-label">Đăng nhập</span></button><button class="button secondary small" data-action="register">Đăng ký</button><button class="button small save-button" data-action="save" hidden>${icon('check')} Lưu thay đổi</button><button class="button secondary small" data-action="export" aria-label="Xuất dữ liệu">${icon('down')} <span class="button-text">Xuất dữ liệu</span></button><button class="icon-button" title="Nhập bản sao lưu JSON" aria-label="Nhập bản sao lưu JSON" data-action="import">${icon('up')}</button><input type="file" id="import-file" accept="application/json,.json" hidden /></div></header>
      <div id="cloud-notice" aria-live="polite"></div>
      <div class="page">
        <div class="dashboard-welcome"><section class="welcome-card"><div class="welcome-copy"><div class="eyebrow">KHÔNG GIAN TÀI CHÍNH CỦA BẠN</div><h1>${view === 'calendar' ? 'Chủ động hôm nay,<br>thảnh thơi ngày mai.' : `Tổng kết năm ${year}`}</h1><p>Thu chi rõ ràng. Tiết kiệm có mục tiêu.</p><div class="currency-chips"><span>¥ Thu chi · JPY</span><span>₫ Tiết kiệm · VNĐ</span></div></div><div class="welcome-art" aria-hidden="true"><span>${icon('wallet')}</span><span>${icon('chart')}</span><span>${icon('spark')}</span><i></i></div></section><section class="quick-card card"><h2>Thao tác nhanh</h2><div class="quick-grid"><button data-action="quick-expense"><span class="purple">${icon('plus')}</span>Thêm khoản chi</button><button data-action="quick-income"><span class="green">${icon('wallet')}</span>Nhập thu nhập</button><button data-action="quick-savings"><span class="amber">${icon('spark')}</span>Tiết kiệm</button><button data-view="year"><span class="blue">${icon('chart')}</span>Tổng kết năm</button></div></section></div>
        <div class="page-heading"><h2>${view === 'calendar' ? 'Tổng quan tài chính' : 'Bức tranh cả năm'}</h2><div class="year-tools"><div class="year-select-wrap">${icon('calendar')}<select id="year-select" aria-label="Chọn năm">${years().map(y => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></div><button class="icon-button" data-action="add-year" aria-label="Thêm năm" title="Thêm năm">${icon('plus')}</button><button class="icon-button remove-year" data-action="remove-year" aria-label="Xóa năm" title="Xóa năm" ${years().length <= 1 ? 'disabled' : ''}>${icon('trash')}</button></div></div>
        <div class="stats">${statsContent(totals)}</div>
        <div class="dashboard-charts" id="dashboard-charts">${dashboardCharts()}</div>
        ${savingsPanel()}
        ${view === 'calendar' ? calendarView() : yearView()}
        <footer><span>${icon('calendar')} Lịch của tôi <span class="footer-divider">/</span> Cho những kế hoạch của bạn</span><span id="storage-description">Thu chi JPY · Tiết kiệm VNĐ</span></footer>
      </div>
    </main>`;
  renderCloud();
}
function statsContent(totals) {
  return stat('wallet', 'Tổng lương', totals.salary, 'Thu nhập trong năm · JPY', 'purple')
    + stat('spark', 'Thưởng & thu thêm', totals.bonus, 'Khoản thu bổ sung · JPY', 'green')
    + stat('down', 'Tổng chi tiêu', totals.expense, `${totals.count} khoản đã lên kế hoạch · JPY`, 'orange')
    + stat('chart', 'Còn lại', totals.balance, 'Thu nhập − chi tiêu · JPY', 'blue')
    + stat('spark', 'Đã tiết kiệm', totals.savings, 'Quỹ tích lũy trong năm · VNĐ', 'pink', 'VND');
}
function dashboardCharts() {
  const months = Array.from({ length: 12 }, (_, index) => monthSummary(data, year, index));
  const max = Math.max(1, ...months.flatMap(item => [item.salary + item.bonus, item.expense]));
  const total = yearSummary(data, year), progress = savingsProgress(data, year);
  const income = total.salary + total.bonus;
  const spent = income ? Math.round(total.expense / income * 100) : 0;
  const donut = (percent, text, label, color) => `<div class="donut" style="--progress:${Math.min(100, Math.max(0, percent))}%;--ring:${color}" role="img" aria-label="${escape(text + ' · ' + label)}"><div><strong>${text}</strong><small>${escape(label)}</small></div></div>`;
  return `<section class="card chart-card cashflow-card"><div class="chart-heading"><h2>${icon('chart')} Thu nhập & chi tiêu</h2><span class="tag">JPY · ${year}</span></div><div class="chart-legend"><span><i class="income-dot"></i>Thu nhập</span><span><i class="expense-dot"></i>Chi tiêu</span></div><div class="bar-chart">${months.map((item, index) => `<button class="bar-column" data-open-month="${index}" title="Tháng ${index + 1}: Thu ${money(item.salary + item.bonus)}, chi ${money(item.expense)}" aria-label="Tháng ${index + 1}: thu ${money(item.salary + item.bonus)}, chi ${money(item.expense)}"><span class="bar-pair"><i class="income-bar" style="height:${(item.salary + item.bonus) / max * 100}%"></i><i class="expense-bar" style="height:${item.expense / max * 100}%"></i></span><small>${String(index + 1).padStart(2, '0')}</small></button>`).join('')}</div></section>
    <section class="card chart-card"><div class="chart-heading"><h2>${icon('wallet')} Phân bổ thu nhập</h2><span class="tag">JPY</span></div>${donut(spent, income ? `${spent}%` : '—', income ? 'Dành cho chi tiêu' : 'Chưa có thu nhập', '#f69a43')}<div class="chart-foot"><span>Chi tiêu</span><strong>${money(total.expense)}</strong></div></section>
    <section class="card chart-card"><div class="chart-heading"><h2>${icon('spark')} Mục tiêu tiết kiệm</h2><span class="tag">VNĐ</span></div>${donut(progress.percent, progress.goal ? `${progress.percent}%` : '—', progress.goal ? 'Đã hoàn thành' : 'Chưa đặt mục tiêu', '#7960d9')}<div class="chart-foot"><span>Đã tích lũy</span><strong>${dong(progress.saved)}</strong></div></section>`;
}
function focusEditor(selector) {
  const element = document.querySelector(selector);
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' }); element?.focus({ preventScroll: true });
}
function showYearDialog() {
  document.querySelector('#year-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'year-dialog'; dialog.className = 'account-dialog';
  dialog.innerHTML = `<button class="dialog-close" aria-label="Đóng">×</button><h2>Thêm năm</h2><form><label>Năm<input name="year" type="number" min="${MIN_YEAR}" max="${MAX_YEAR}" step="1" required value="${Math.min(MAX_YEAR, years().at(-1) + 1)}" /></label><button class="account-submit" type="submit">Thêm năm</button></form><p role="status" aria-live="polite"></p>`;
  document.body.append(dialog); dialog.showModal(); dialog.querySelector('.dialog-close').onclick = () => dialog.close();
  dialog.querySelector('form').onsubmit = event => {
    event.preventDefault(); if (!canEdit()) { dialog.close(); return; }
    try { const value = Number(event.target.elements.year.value); addYear(data, value); year = value; day = Math.min(day, daysInMonth(year, month)); persist(); render(); dialog.close(); }
    catch (error) { dialog.querySelector('[role="status"]').textContent = error.message; }
  };
}
function stat(symbol, label, value, detail, color, currency = 'JPY') {
  return `<section class="stat"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}">${icon(symbol)}</span></div><strong class="${value < 0 ? 'negative' : ''}">${money(value, currency)}</strong><small>${detail}</small></section>`;
}
function savingsPanel() {
  return `<section class="card savings-panel" aria-label="Kế hoạch tiết kiệm"><div class="card-heading"><div class="income-heading"><span class="stat-icon green">${icon('spark')}</span><div><h2>Quỹ tiết kiệm của bạn</h2><p>Góp từng tháng, tiến gần hơn đến mục tiêu năm ${year}.</p></div></div><span class="tag">TIẾT KIỆM</span></div>
    <div class="savings-layout"><div class="savings-inputs">
      ${view === 'calendar' ? `<label for="monthly-savings">Tiết kiệm tháng ${String(month + 1).padStart(2, '0')} <span>VNĐ</span><input id="monthly-savings" type="text" inputmode="decimal" data-money maxlength="32" placeholder="0.000" value="${amount(data.savings[monthKey(year, month)]) ? formatAmount(data.savings[monthKey(year, month)]) : ''}" /></label>` : ''}
      <label for="annual-savings-goal">Mục tiêu tiết kiệm năm ${year} <span>VNĐ</span><input id="annual-savings-goal" type="text" inputmode="decimal" data-money maxlength="32" placeholder="0.000" value="${amount(data.goals[year]) ? formatAmount(data.goals[year]) : ''}" /></label>
    </div><div id="savings-progress">${savingsProgressContent()}</div></div>
    <p class="savings-hint">Quỹ tiết kiệm VNĐ được theo dõi riêng với thu chi JPY.</p></section>`;
}
function savingsProgressContent() {
  const progress = savingsProgress(data, year);
  const percent = Math.min(100, progress.percent);
  return `<div class="savings-progress-heading"><span>Đã tiết kiệm trong năm</span><strong id="year-savings-total">${dong(progress.saved)}</strong></div>
    <div class="savings-progress-track" role="progressbar" aria-label="Tiến độ tiết kiệm năm ${year}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-valuetext="${progress.goal ? `${progress.percent}% mục tiêu, đã tiết kiệm ${dong(progress.saved)}` : 'Chưa đặt mục tiêu'}"><span style="width:${percent}%"></span></div>
    <div class="savings-progress-caption"><strong>${progress.goal ? `${progress.percent}% mục tiêu` : 'Chưa đặt mục tiêu'}</strong><span>${!progress.goal ? 'Đặt mục tiêu để theo dõi tiến độ' : progress.remaining ? `Còn thiếu ${dong(progress.remaining)}` : 'Đã đạt mục tiêu năm!'}</span></div>`;
}
function calendarView() {
  return `<div class="section-title"><h2>${icon('grid')} Các tháng trong năm <span>${year}</span></h2><span>Chọn tháng để xem kế hoạch chi tiêu</span></div>
    <div class="month-grid" aria-label="Chọn tháng">${Array.from({ length: 12 }, (_, m) => {
      const summary = monthSummary(data, year, m);
      return `<button class="month-card ${m === month ? 'active' : ''}" data-month="${m}" aria-pressed="${m === month}"><span>Tháng ${String(m + 1).padStart(2, '0')}${m === month ? '<i></i>' : ''}</span><strong>${money(summary.expense)}</strong></button>`;
    }).join('')}</div>
    <div class="workspace-grid"><div class="calendar-column">${calendarPanel()}${incomePanel()}</div><div class="day-panel card">${dayPanel()}</div></div>`;
}
function calendarPanel() {
  const start = (new Date(year, month, 1).getDay() + 6) % 7;
  const length = daysInMonth(year, month);
  const summary = monthSummary(data, year, month);
  return `<section class="card calendar-panel"><div class="card-heading"><div><h2>Tháng ${String(month + 1).padStart(2, '0')} <span class="muted">/ ${year}</span></h2><p>Mỗi ngày một kế hoạch nhỏ</p></div><div class="calendar-controls"><button class="button secondary small" data-action="today">Hôm nay</button><button class="icon-button rotate" data-action="prev" aria-label="Tháng trước" ${year === years()[0] && month === 0 ? 'disabled' : ''}>${icon('arrow')}</button><button class="icon-button" data-action="next" aria-label="Tháng sau" ${year === years().at(-1) && month === 11 ? 'disabled' : ''}>${icon('arrow')}</button></div></div>
    <div class="weekdays">${['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CN'].map(d => `<span>${d}</span>`).join('')}</div>
    <div class="calendar-days">${Array.from({ length: start }, () => '<span class="empty-day" aria-hidden="true"></span>').join('')}${Array.from({ length }, (_, i) => {
      const n = i + 1, entry = data.days[dayKey(year, month, n)], total = dayTotal(entry);
      const today = n === now.getDate() && month === now.getMonth() && year === now.getFullYear();
      return `<button class="calendar-day ${n === day ? 'selected' : ''} ${today ? 'today' : ''} ${(i + start) % 7 > 4 ? 'weekend' : ''}" data-day="${n}" aria-pressed="${n === day}" aria-label="Ngày ${n} tháng ${month + 1}, ${money(total)}"><span class="day-number">${String(n).padStart(2, '0')}</span>${total ? `<small title="${money(total)}">${money(total)}</small>` : ''}${entry?.note ? '<i class="note-indicator" title="Có ghi chú"></i>' : ''}</button>`;
    }).join('')}</div><div class="calendar-bottom"><span><i></i> Ngày đang chọn <b class="today-legend"></b> Hôm nay</span><strong>Tổng tháng <span>${money(summary.expense)}</span></strong></div></section>`;
}
function incomePanel() {
  const income = data.incomes[monthKey(year, month)] || {};
  const summary = monthSummary(data, year, month);
  return `<section class="card income-panel"><div class="card-heading"><div class="income-heading"><span class="stat-icon green">${icon('wallet')}</span><div><h2>Thu nhập tháng ${String(month + 1).padStart(2, '0')}</h2><p>Ghi lại lương và những khoản thưởng của bạn</p></div></div><span class="tag">${year}</span></div>
    <div class="income-fields"><label>Lương tháng <span>JPY</span><input inputmode="decimal" type="text" data-money maxlength="32" placeholder="0.000" value="${amount(income.salary) ? formatAmount(income.salary) : ''}" data-income="salary" /></label><label>Thưởng & thu nhập thêm <span>JPY</span><input inputmode="decimal" type="text" data-money maxlength="32" placeholder="0.000" value="${amount(income.bonus) ? formatAmount(income.bonus) : ''}" data-income="bonus" /></label></div>
    <label class="income-note-label" for="income-note">Ghi chú thu nhập</label><textarea id="income-note" class="income-note" data-income="note" maxlength="20000" rows="2" placeholder="Ví dụ: Lương cơ bản, thưởng dự án, ngày nhận lương…">${escape(income.note || '')}</textarea>
    <div class="income-total"><span>Tổng thu nhập tháng</span><strong id="income-total">${money(summary.salary + summary.bonus)}</strong></div></section>`;
}
function dayPanel() {
  const entry = currentDay();
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(new Date(year, month, day));
  return `<div class="day-panel-header"><div class="eyebrow">KẾ HOẠCH TRONG NGÀY</div><h2>${String(day).padStart(2, '0')} <span>/ ${String(month + 1).padStart(2, '0')} / ${year}</span></h2><p>${weekday.charAt(0).toUpperCase() + weekday.slice(1)} <span class="day-pill">${entry.items.length} khoản chi</span></p></div>
    <div class="note-section"><label for="day-note">${icon('note')} Ghi chú của bạn</label><textarea id="day-note" maxlength="20000" placeholder="Hôm nay bạn có kế hoạch gì?\nGhi lại những điều cần nhớ…" rows="4">${escape(entry.note)}</textarea></div>
    <div class="expense-heading"><h3>Bảng chi tiêu</h3><span>JPY</span></div>
    <div class="expense-table-wrap"><table class="expense-table"><thead><tr><th>Nội dung cần chi</th><th>Số tiền</th><th><span class="sr-only">Thao tác</span></th></tr></thead><tbody>${entry.items.map((item, index) => `<tr data-item="${index}"><td><input aria-label="Nội dung khoản chi ${index + 1}" placeholder="Nhập nội dung…" maxlength="500" data-field="title" value="${escape(item.title)}" /></td><td><input aria-label="Số tiền khoản chi ${index + 1}" type="text" data-money maxlength="32" inputmode="decimal" placeholder="0.000" data-field="amount" value="${item.amount ? formatAmount(item.amount) : ''}" /></td><td><button class="delete-button" data-delete="${index}" aria-label="Xóa khoản chi ${index + 1}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>
    ${entry.items.length ? '' : `<div class="empty-expenses"><span>${icon('wallet')}</span><strong>Một ngày mới, một kế hoạch mới</strong><p>Thêm món cần mua hoặc khoản cần chi<br>để bắt đầu sắp xếp ngày của bạn.</p></div>`}
    <button class="add-expense" data-action="add">${icon('plus')} Thêm khoản chi</button>
    <div class="day-total"><span>Tổng chi trong ngày</span><strong id="day-total">${money(dayTotal(entry))}</strong></div><div class="day-hint">${icon('check')} Enter hoặc Lưu thay đổi để đồng bộ.<br>Shift+Enter để xuống dòng.</div>`;
}
function yearView() {
  const total = yearSummary(data, year);
  return `<section class="card annual-panel"><div class="card-heading"><div><h2>Bức tranh tài chính ${year}</h2><p>Nhấn vào tháng để xem và chỉnh sửa kế hoạch.</p></div><span class="tag">12 tháng</span></div><div class="annual-table-wrap"><table class="annual-table"><thead><tr><th>Tháng</th><th>Lương · JPY</th><th>Thưởng · JPY</th><th>Cần chi · JPY</th><th>Tiết kiệm · VNĐ</th><th>Còn lại · JPY</th></tr></thead><tbody>${Array.from({ length: 12 }, (_, m) => { const s = monthSummary(data, year, m); return `<tr><td><button data-open-month="${m}">Tháng ${String(m + 1).padStart(2, '0')} ${icon('arrow')}</button></td><td>${money(s.salary)}</td><td>${money(s.bonus)}</td><td>${money(s.expense)}</td><td>${dong(s.savings)}</td><td class="${s.balance < 0 ? 'negative' : ''}">${money(s.balance)}</td></tr>`; }).join('')}</tbody><tfoot><tr><th>Tổng năm</th><td>${money(total.salary)}</td><td>${money(total.bonus)}</td><td>${money(total.expense)}</td><td>${dong(total.savings)}</td><td class="${total.balance < 0 ? 'negative' : ''}">${money(total.balance)}</td></tr></tfoot></table></div></section>
    <section class="card annual-details"><div class="card-heading"><div><h2>Nội dung cần chi trong năm</h2><p>Tất cả các khoản đã lên kế hoạch, sắp xếp theo ngày.</p></div><span class="tag">${total.count} khoản</span></div>${annualExpenses()}</section>`;
}
function annualExpenses() {
  const rows = Object.entries(data.days).filter(([key]) => key.startsWith(`${year}-`)).sort(([a], [b]) => a.localeCompare(b)).flatMap(([key, entry]) => entry.items.map(item => ({ key, ...item })));
  if (!rows.length) return '<div class="annual-empty">Chưa có khoản chi nào trong năm này. Thêm kế hoạch từ Lịch chi tiêu để xem tổng hợp tại đây.</div>';
  return `<div class="annual-table-wrap"><table class="annual-table details-table"><thead><tr><th>Ngày</th><th>Nội dung cần chi</th><th>Số tiền · JPY</th></tr></thead><tbody>${rows.map(row => `<tr><td><button data-open-day="${row.key}">${row.key.split('-').reverse().join('/')} ${icon('arrow')}</button></td><td>${escape(row.title || 'Chưa đặt tên')}</td><td>${money(row.amount)}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="2">Tổng số tiền cần chi</th><td>${money(yearSummary(data, year).expense)}</td></tr></tfoot></table></div>`;
}
function refreshTotals() {
  const totals = yearSummary(data, year), summary = monthSummary(data, year, month);
  document.querySelector('.stats').innerHTML = statsContent(totals);
  document.querySelector('#dashboard-charts').innerHTML = dashboardCharts();
  document.querySelector('#savings-progress').innerHTML = savingsProgressContent();
  if (view === 'year') return;
  document.querySelector('.month-card.active strong').textContent = money(summary.expense);
  document.querySelector('#day-total').textContent = money(dayTotal(currentDay()));
  document.querySelector('#income-total').textContent = money(summary.salary + summary.bonus);
  document.querySelector('.calendar-panel').outerHTML = calendarPanel();
}
root.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if ((button.dataset.delete !== undefined || ['add', 'quick-expense', 'quick-income', 'quick-savings', 'add-year', 'remove-year', 'import', 'export', 'save', 'cloud-remote', 'cloud-retry'].includes(button.dataset.action)) && !canEdit()) return;
  if (button.dataset.year) { year = +button.dataset.year; day = Math.min(day, daysInMonth(year, month)); render(); }
  if (button.dataset.month !== undefined) { month = +button.dataset.month; day = Math.min(day, daysInMonth(year, month)); render(); }
  if (button.dataset.day) { day = +button.dataset.day; render(); }
  if (button.dataset.view) { view = button.dataset.view; render(); }
  if (button.dataset.openMonth !== undefined) { month = +button.dataset.openMonth; day = Math.min(day, daysInMonth(year, month)); view = 'calendar'; render(); }
  if (button.dataset.openDay) { [year, month, day] = button.dataset.openDay.split('-').map(Number); month--; view = 'calendar'; render(); }
  if (button.dataset.delete !== undefined) { ensureDay().items.splice(+button.dataset.delete, 1); persist(); render(); }
  switch (button.dataset.action) {
    case 'save': await saveChanges(); break;
    case 'add-year': showYearDialog(); break;
    case 'remove-year': {
      if (years().length <= 1 || !confirm(`Xóa năm ${year} khỏi danh sách? Dữ liệu được giữ lại và sẽ xuất hiện khi thêm lại năm này.`)) break;
      removeYear(data, year); year = years().find(value => value >= year) || years().at(-1); day = Math.min(day, daysInMonth(year, month)); persist(); render(); break;
    }
    case 'quick-expense': view = 'calendar'; ensureDay().items.push({ id: crypto.randomUUID(), title: '', amount: 0 }); persist(); render(); focusEditor('.expense-table tr:last-child input'); break;
    case 'quick-income': view = 'calendar'; render(); focusEditor('[data-income="salary"]'); break;
    case 'quick-savings': view = 'calendar'; render(); focusEditor('#monthly-savings'); break;
    case 'account': showAccount(); break;
    case 'register': if (!cloud.user) showAccount('signup'); break;
    case 'cloud-retry': await cloud.refresh(); break;
    case 'cloud-remote': {
      if (!confirm('Thay bản nháp trên máy bằng dữ liệu đám mây? Hãy xuất dữ liệu trước nếu cần giữ bản nháp.')) break;
      try { await cloud.useRemote(); } catch (error) { notify(error.message); }
      break;
    }
    case 'add': ensureDay().items.push({ id: crypto.randomUUID(), title: '', amount: 0 }); persist(); render(); document.querySelector('.expense-table tr:last-child input')?.focus(); break;
    case 'prev': case 'next': {
      const direction = button.dataset.action === 'next' ? 1 : -1;
      let targetMonth = month + direction, index = years().indexOf(year);
      if (targetMonth < 0) { index--; targetMonth = 11; }
      if (targetMonth > 11) { index++; targetMonth = 0; }
      if (index < 0 || index >= years().length) return;
      year = years()[index]; month = targetMonth; day = Math.min(day, daysInMonth(year, month)); render(); break;
    }
    case 'today': {
      if (!years().includes(now.getFullYear())) { notify('Thêm năm hiện tại để xem hôm nay.'); break; }
      year = now.getFullYear(); month = now.getMonth(); day = now.getDate(); render(); break;
    }
    case 'export': {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `lich-cua-toi-${dayKey(year, month, day)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); break;
    }
    case 'import': document.querySelector('#import-file').click(); break;
  }
});
root.addEventListener('input', event => {
  if (!canEdit()) return;
  const target = event.target;
  if (target.hasAttribute('data-money')) {
    const value = target.value.trim();
    target.setCustomValidity(value && !/^\d[\d,]*(?:\.\d{0,3})?$/.test(value) ? 'Nhập số tiền dạng 1,000,000.000, tối đa 3 chữ số thập phân.' : Number(value.replace(/,/g, '')) > MAX_AMOUNT ? 'Số tiền vượt giới hạn cho phép.' : '');
    if (!target.validity.valid) return;
  }
  if (target.id === 'monthly-savings') { data.savings[monthKey(year, month)] = amount(target.value); persist(); refreshTotals(); }
  if (target.id === 'annual-savings-goal') { data.goals[year] = amount(target.value); persist(); refreshTotals(); }
  if (target.id === 'day-note') { ensureDay().note = target.value; persist(); document.querySelector('.calendar-panel').outerHTML = calendarPanel(); }
  if (target.dataset.field) {
    const item = ensureDay().items[+target.closest('tr').dataset.item];
    item[target.dataset.field] = target.dataset.field === 'amount' ? amount(target.value) : target.value;
    persist(); refreshTotals();
  }
  if (target.dataset.income) {
    ensureIncome()[target.dataset.income] = target.dataset.income === 'note' ? target.value : amount(target.value);
    persist(); refreshTotals();
  }
});
root.addEventListener('change', async event => {
  if (!canEdit()) return;
  const target = event.target;
  if (target.id === 'year-select') { year = +target.value; day = Math.min(day, daysInMonth(year, month)); render(); }
  if (target.hasAttribute('data-money')) formatMoneyInput(target);
  if (target.id === 'import-file' && target.files[0]) {
    try {
      const file = target.files[0];
      if (file.size > 10_000_000) throw new Error('Bản sao lưu phải nhỏ hơn 10 MB.');
      const userId = cloud.user.id;
      const imported = normalizeData(JSON.parse(await file.text()));
      if (!canEdit() || cloud.user.id !== userId) return;
      if (!confirm('Nhập bản sao lưu sẽ thay thế toàn bộ dữ liệu hiện tại trên trình duyệt này. Bạn đã xuất dữ liệu cần giữ chưa?')) return;
      const previous = data;
      data = imported;
      if (!persist()) { data = previous; return; }
      render(); notify('Đã nhập bản nháp. Nhấn Lưu thay đổi để đồng bộ.');
    } catch (error) { notify(`Không thể nhập dữ liệu. ${error.message}`); }
    finally { target.value = ''; }
  }
});
root.addEventListener('focusout', event => { if (event.target.matches('[data-money]')) formatMoneyInput(event.target); });
root.addEventListener('keydown', event => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || !event.target.matches('.page input, .page textarea') || !canEdit()) return;
  event.preventDefault(); saveChanges();
});
const authClient = new SupabaseClient(supabaseConfig, localStorage);
const cloud = new SyncController(authClient, localStorage, {
  onData: next => {
    data = next;
    render();
  }, onStatus: () => renderCloud(),
});

function renderCloud() {
  if (!document.querySelector('#account-label')) return;
  const labels = { guest: 'Chưa đăng nhập', loading: 'Đang kết nối…', draft: 'Chưa lưu thay đổi', pending: 'Chờ đồng bộ', saving: 'Đang lưu…', ready: 'Đã đồng bộ', error: 'Chưa đồng bộ', conflict: 'Cần xử lý thay đổi' };
  document.querySelector('#account-label').textContent = cloud.user ? 'Tài khoản' : 'Đăng nhập';
  document.querySelector('[data-action="account"]').disabled = cloud.status === 'loading';
  document.querySelector('[data-action="register"]').hidden = Boolean(cloud.user) || cloud.status === 'loading';
  document.querySelector('[data-action="import"]').disabled = !canEdit();
  document.querySelector('[data-action="export"]').disabled = !canEdit();
  document.querySelector('.page').inert = !canEdit();
  document.querySelectorAll('.page input, .page textarea, .page select, .page [data-action="add"], .page [data-action="add-year"], .page .quick-grid button, .page [data-delete]').forEach(input => input.disabled = !canEdit());
  document.querySelector('[data-action="remove-year"]').disabled = !canEdit() || years().length <= 1;
  document.querySelector('[data-action="save"]').hidden = !cloud.user;
  document.querySelector('[data-action="save"]').disabled = !canEdit() || !cloud.dirty;
  document.querySelector('#storage-description').textContent = cloud.user ? `JPY / VNĐ · ${labels[cloud.status]} · ${cloud.user.email}` : 'Đăng nhập để nhập và lưu dữ liệu';
  document.querySelector('.local-badge').innerHTML = `${icon('check')} ${labels[cloud.status]}`;
  let message = '', actions = '';
  if (['error', 'conflict'].includes(cloud.status)) {
    message = escape(cloud.message);
    actions = cloud.status === 'conflict' ? '<button data-action="export">Xuất bản nháp</button><button data-action="cloud-remote">Tải bản đám mây</button>' : `<button data-action="${cloud.user ? 'cloud-retry' : 'account'}">${cloud.user ? 'Thử đồng bộ lại' : 'Đăng nhập'}</button>`;
  } else if (cloud.status === 'loading') message = 'Đang tải dữ liệu tài khoản. Vui lòng chờ trước khi chỉnh sửa.';
  document.querySelector('#cloud-notice').innerHTML = message ? `<div class="cloud-notice ${['error', 'conflict'].includes(cloud.status) ? 'cloud-warning' : ''}"><span>${message}</span><div>${actions}</div></div>` : '';
}

function showAccount(initialMode = 'signin') {
  document.querySelector('#account-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'account-dialog'; dialog.className = 'account-dialog'; dialog.setAttribute('aria-labelledby', 'account-title');
  dialog.innerHTML = `<button class="dialog-close" aria-label="Đóng">×</button><h2 id="account-title">${cloud.user ? 'Tài khoản' : 'Đăng nhập'}</h2>
    ${cloud.user ? `<p>Đang đăng nhập: <strong>${escape(cloud.user.email)}</strong></p><p>Bản nháp chưa đồng bộ sẽ được giữ riêng cho tài khoản này trên trình duyệt.</p><button class="account-submit" id="sign-out">Đăng xuất</button>` : `<div class="auth-tabs"><button class="active" data-mode="signin">Đăng nhập</button><button data-mode="signup">Đăng ký</button></div><form id="auth-form"><label class="signup-username" hidden>Tên tài khoản<input name="username" type="text" disabled minlength="3" maxlength="30" pattern="[a-z][a-z0-9_]{2,29}" autocomplete="username" placeholder="Ví dụ: quang_01" /></label><label><span id="login-label">Tên tài khoản hoặc email</span><input name="email" type="text" required autocomplete="username" placeholder="Tên tài khoản hoặc email" /></label><label>Mật khẩu<input name="password" type="password" required minlength="6" autocomplete="current-password" placeholder="Mật khẩu" /></label><button class="account-submit" type="submit">Đăng nhập</button></form><button class="forgot-password" type="button">Quên mật khẩu?</button>`}
    <p id="auth-message" role="status" aria-live="polite"></p>`;
  document.body.append(dialog); dialog.showModal();
  if (cloud.user) {
    const userId = cloud.user.id;
    const passwordButton = document.createElement('button'); passwordButton.className = 'account-submit'; passwordButton.textContent = 'Đổi mật khẩu';
    dialog.querySelector('#sign-out').before(passwordButton);
    passwordButton.onclick = () => { dialog.close(); showPasswordReset(authClient); };
    authClient.profile().then(profile => { if (profile && dialog.isConnected) { const info = document.createElement('p'); info.textContent = `Tên tài khoản: ${profile.username} · ${profile.display_name || 'Chưa có tên hiển thị'}`; dialog.querySelector('#sign-out').before(info); } }).catch(() => {});
    const adminButton = document.createElement('button'); adminButton.className = 'account-submit'; adminButton.textContent = 'Quản lý tài khoản'; adminButton.hidden = true;
    dialog.querySelector('#sign-out').before(adminButton);
    adminButton.onclick = () => { dialog.close(); showAdmin(authClient, userId); };
    authClient.isAdmin().then(isAdmin => { if (isAdmin === true && cloud.user?.id === userId && dialog.isConnected) adminButton.hidden = false; }).catch(() => {});
  }
  dialog.querySelector('.dialog-close').onclick = () => dialog.close();
  dialog.querySelector('.forgot-password')?.addEventListener('click', () => { dialog.close(); showRecovery(authClient, () => cloud.open(), showAccount); });
  let mode = 'signin';
  dialog.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => {
    mode = button.dataset.mode;
    dialog.querySelector('.signup-username').hidden = mode !== 'signup';
    dialog.querySelector('[name="username"]').required = mode === 'signup';
    dialog.querySelector('[name="username"]').disabled = mode !== 'signup';
    dialog.querySelector('#account-title').textContent = mode === 'signup' ? 'Đăng ký' : 'Đăng nhập';
    dialog.querySelector('[name="email"]').type = mode === 'signup' ? 'email' : 'text';
    dialog.querySelector('#login-label').textContent = mode === 'signup' ? 'Email' : 'Tên tài khoản hoặc email';
    dialog.querySelectorAll('[data-mode]').forEach(tab => tab.classList.toggle('active', tab === button));
    dialog.querySelector('.account-submit').textContent = mode === 'signin' ? 'Đăng nhập' : 'Đăng ký';
    dialog.querySelector('[name="password"]').autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
    dialog.querySelector('[name="password"]').minLength = mode === 'signin' ? 6 : 8;
    dialog.querySelector('[name="email"]').placeholder = mode === 'signup' ? 'Email' : 'Tên tài khoản hoặc email';
    dialog.querySelector('[name="password"]').placeholder = mode === 'signup' ? 'Ít nhất 8 ký tự' : 'Mật khẩu';
    dialog.querySelector('#auth-message').textContent = '';
  });
  if (!cloud.user && initialMode === 'signup') dialog.querySelector('[data-mode="signup"]').click();
  dialog.querySelector('#auth-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const form = event.target, email = form.elements.email.value.trim(), password = form.elements.password.value;
    const controls = [...dialog.querySelectorAll('button,input')]; controls.forEach(control => control.disabled = true);
    const message = dialog.querySelector('#auth-message'); message.textContent = 'Đang kết nối…';
    try {
      const result = mode === 'signin' ? await authClient.signIn(email, password) : await authClient.signUp(email, password, new URL('.', location.href).href, form.elements.username.value.trim().toLowerCase());
      form.elements.password.value = '';
      if (result?.access_token) { await cloud.open(); dialog.close(); }
      else message.textContent = 'Kiểm tra email để xác nhận tài khoản.';
    } catch (error) { message.textContent = error.message; }
    finally { controls.forEach(control => control.disabled = false); form.elements.username.disabled = mode !== 'signup'; }
  });
  dialog.querySelector('#sign-out')?.addEventListener('click', async event => {
    event.target.disabled = true;
    try {
      if (cloud.dirty && !confirm('Có bản nháp chưa đồng bộ. Đăng xuất và giữ bản nháp trên máy để đồng bộ khi đăng nhập lại?')) return;
      await cloud.logout(); dialog.close();
    } catch (error) { dialog.querySelector('#auth-message').textContent = error.message; }
    finally { event.target.disabled = false; }
  });
}

// Supabase email confirmation redirects back with a session in the URL fragment.
const authHash = new URLSearchParams(location.hash.slice(1));
if (authHash.has('access_token') && authHash.has('refresh_token')) {
  authClient.acceptSession({ access_token: authHash.get('access_token'), refresh_token: authHash.get('refresh_token'), expires_in: Number(authHash.get('expires_in')) || 3600 });
  history.replaceState(null, '', location.pathname + location.search);
}
render();
if (authClient.session) cloud.open().then(() => { if (authHash.get('type') === 'recovery' && cloud.user) showPasswordReset(authClient); });
window.addEventListener('online', () => cloud.refresh());
document.addEventListener('visibilitychange', () => { if (!document.hidden) cloud.refresh(); });
setInterval(() => { if (!document.hidden && cloud.user && !cloud.dirty && cloud.status !== 'loading') cloud.refresh(); }, 30000);
window.addEventListener('beforeunload', event => { if (cloud.user && cloud.dirty) { event.preventDefault(); event.returnValue = ''; } });
