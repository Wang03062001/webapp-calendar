import { setCurrencies, currencyLabel, readDisplay, saveDisplay, installMoneyFormatting } from './preferences.js';
import { startTranslations, setLanguage, t } from './i18n.js';
import { showSettings, needsCurrencySetup } from './settings-ui.js';
import { showProfile } from './profile-ui.js';
import { YEARS, MIN_YEAR, MAX_YEAR, getYears, addYear, removeYear, MAX_AMOUNT, amount, formatAmount, dayKey, monthKey, daysInMonth, dayTotal, monthSummary, yearSummary, savingsProgress, emptyData, normalizeData, CATEGORIES, categoryOf, expenseStatus, expenseRows } from './model.js';
import { supabaseConfig } from './config.js';
import { SupabaseClient } from './supabase.js';
import { SyncController } from './sync.js';
import { showAdmin, showPasswordReset, showRecovery } from './admin.js';
import { debtsPanel, showDebtDialog } from './debts.js';
import { creditPanel, salaryTimeline, showCreditDialog } from './credit-ui.js';
import { shiftMonth } from './card-model.js';

const ask = message => globalThis.confirm(t(message));

const money = (number, currency = 'cash') => `${formatAmount(number)} ${currencyLabel(currency === 'VND' ? 'savings' : 'cash')}`;
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
let data = emptyData(), savedTimer, debtFilter = 'all', expenseQuery = '', expenseCategory = '', expenseFilterStatus = '', calendarExpanded = matchMedia('(min-width: 1001px)').matches, searchExpanded = false, analysisExpanded = false;
const newExpense = () => ({ id: crypto.randomUUID(), title: '', amount: 0, status: 'planned', category: 'Khác' });
let creditRole = { userId: null, allowed: false, checked: false, request: 0, pending: null };
const root = document.querySelector('#app');
let accountProfile = null, profileUserId = null, currencyPromptUser = null;
let display = readDisplay();
document.documentElement.dataset.theme = display.theme;
startTranslations(display.language);
installMoneyFormatting();
const years = () => getYears(data);
const selectedKey = () => dayKey(year, month, day);
const currentDay = () => data.days[selectedKey()] || { note: '', items: [] };
function ensureDay() { return data.days[selectedKey()] ||= { note: '', items: [] }; }
function ensureIncome() { return data.incomes[monthKey(year, month)] ||= { salary: 0, bonus: 0, note: '' }; }
function notify(message) {
  const toast = document.querySelector('#toast'); toast.textContent = t(message); toast.classList.add('visible');
  clearTimeout(savedTimer); savedTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}
function persist() {
  if (!canEdit()) { notify('Hãy đăng nhập trước khi nhập dữ liệu.'); return false; }
  try { cloud.save(data); return true; }
  catch { notify('Không thể lưu trên trình duyệt. Hãy xuất dữ liệu để tránh mất thay đổi.'); return false; }
}
function canEdit() { return Boolean(cloud.user) && cloud.status !== 'loading'; }
function canUseCredit() { return canEdit() && creditRole.userId === cloud.user.id && creditRole.allowed; }
function resetCreditRole(userId = null) { creditRole = { userId, allowed: false, checked: false, request: creditRole.request + 1, pending: null }; }
function syncCreditRole() {
  const userId = cloud.user?.id || null;
  if (userId !== creditRole.userId) resetCreditRole(userId);
  if (userId && cloud.status !== 'loading' && !creditRole.checked) void refreshCreditRole();
}
async function refreshCreditRole(force = false) {
  const userId = cloud.user?.id;
  if (!userId) { resetCreditRole(); return false; }
  if (creditRole.userId !== userId) resetCreditRole(userId);
  if (creditRole.pending) return creditRole.pending;
  if (creditRole.checked && !force) return creditRole.allowed;
  const request = ++creditRole.request;
  const pending = (async () => {
    let allowed = false;
    try { allowed = await authClient.isAdmin() === true; } catch { /* Missing or failed verification denies access. */ }
    if (cloud.user?.id !== userId || creditRole.request !== request) return false;
    const changed = creditRole.allowed !== allowed;
    creditRole.allowed = allowed; creditRole.checked = true;
    if (!allowed) document.querySelector('#credit-dialog')?.close();
    if (changed) render();
    return allowed;
  })();
  creditRole.pending = pending;
  try { return await pending; } finally { if (creditRole.request === request) creditRole.pending = null; }
}
function formatMoneyInput(input) { if (input.validity.valid && input.value.trim()) input.value = formatAmount(amount(input.value)); }
async function saveChanges() {
  if (!canEdit()) return;
  try {
    for (const input of root.querySelectorAll('[data-money], input[type=month], input[type=date]')) { if (!input.reportValidity()) return; if (input.hasAttribute('data-money')) formatMoneyInput(input); }
    await cloud.commit();
    if (cloud.status === 'ready') notify('Đã lưu thay đổi.');
    else if (['error', 'conflict'].includes(cloud.status)) notify(cloud.message);
  } catch (error) { notify(error.message); }
}
function render() {
  setCurrencies(data.currencies);
  if (view === 'credit' && !canUseCredit()) view = 'calendar';
  if (!years().includes(year)) { year = years()[0]; day = Math.min(day, daysInMonth(year, month)); }
  const totals = view === 'calendar' ? monthSummary(data, year, month) : yearSummary(data, year);
  const pageTitle = ({ calendar: 'Thu chi & kỳ lương', year: 'Tổng kết năm', debts: 'Khoản vay khác', credit: 'Thẻ & sao kê' })[view];
  root.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="Lịch của tôi">${icon('calendar')}<span>Lịch của tôi<span class="brand-sub">TÀI CHÍNH CÁ NHÂN</span></span></a>
      <div class="workspace-label">KHÔNG GIAN CÁ NHÂN</div>
      <nav aria-label="Điều hướng chính">
        <button class="nav-item ${view === 'calendar' ? 'active' : ''}" data-view="calendar">${icon('calendar')} Thu chi & kỳ lương</button>
        <button class="nav-item ${view === 'debts' ? 'active' : ''}" data-view="debts">${icon('wallet')} Khoản vay khác</button>
        ${canUseCredit() ? `<button class="nav-item ${view === 'credit' ? 'active' : ''}" data-view="credit">${icon('wallet')} Thẻ & sao kê</button>` : ''}
        <button class="nav-item ${view === 'year' ? 'active' : ''}" data-view="year">${icon('chart')} Tổng kết năm</button>
      </nav>
      <div class="year-heading"><span>KẾ HOẠCH THEO NĂM</span><span>${String(years().length).padStart(2, '0')}</span></div>
      <div class="years">${years().map(y => `<button class="year-button ${year === y ? 'selected' : ''}" data-year="${y}" aria-pressed="${year === y}"><span><i></i>${y}</span>${year === y ? icon('arrow') : ''}</button>`).join('')}</div>
      <div class="sidebar-bottom"><div class="local-badge">${icon('check')} Dữ liệu lưu trên thiết bị</div><p>Một chút kế hoạch hôm nay.<br>Thảnh thơi hơn ngày mai.</p><button class="profile" data-action="account"><span class="avatar" translate="no">${escape((accountProfile?.username || cloud.user?.email || '?').slice(0,1).toUpperCase())}</span><span><strong id="profile-name" translate="no">${escape(accountProfile?.username || cloud.user?.email || '')}</strong><small id="profile-email" translate="no">${escape(cloud.user?.email || '')}</small></span></button></div>
    </aside>
    <main>
      <header class="topbar"><div class="breadcrumb">Không gian cá nhân <span>/</span> <strong>${pageTitle}</strong></div><div class="top-actions"><button class="button secondary small" data-action="theme" aria-label="Đổi giao diện sáng tối">${display.theme === 'dark' ? '☀' : '☾'}</button><button class="button secondary small" data-action="settings">⚙ <span>Cài đặt</span></button><button class="button secondary small" data-action="account">${icon('wallet')} <span id="account-label">Đăng nhập</span></button><button class="button secondary small" data-action="register">Đăng ký</button><button class="button small save-button" data-action="save" hidden>${icon('check')} Lưu thay đổi</button><button class="button secondary small" data-action="export" aria-label="Xuất dữ liệu">${icon('down')} <span class="button-text">Xuất dữ liệu</span></button><button class="icon-button" title="Nhập bản sao lưu JSON" aria-label="Nhập bản sao lưu JSON" data-action="import">${icon('up')}</button><input type="file" id="import-file" accept="application/json,.json" hidden /></div></header>
      <div id="cloud-notice" aria-live="polite"></div>
      <div class="page">
        <div class="page-heading"><h2 id="summary-period">${view === 'calendar' ? `Tổng kết tháng ${String(month + 1).padStart(2, '0')} / ${year}` : view === 'year' ? `Tổng kết năm ${year}` : view === 'credit' ? `Thẻ & sao kê · ${String(month + 1).padStart(2, '0')} / ${year}` : 'Khoản vay khác · __CASH__'}</h2>${view === 'debts' ? '' : `<div class="year-tools"><div class="year-select-wrap">${icon('calendar')}<select id="year-select" aria-label="Chọn năm">${years().map(y => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></div><button class="icon-button" data-action="add-year" aria-label="Thêm năm" title="Thêm năm">${icon('plus')}</button><button class="icon-button remove-year" data-action="remove-year" aria-label="Xóa năm" title="Xóa năm" ${years().length <= 1 ? 'disabled' : ''}>${icon('trash')}</button></div>`}</div>
        ${view === 'debts' ? debtsPanel(data, debtFilter) : view === 'credit' ? `${monthTabs()}${creditPanel(data, monthKey(year, month))}` : `
          ${view === 'calendar' ? `${monthTabs()}${canUseCredit() ? `<div id="cashflow-overview">${salaryTimeline(data, monthKey(year, month))}</div>` : ''}` : ''}
          <div class="stats">${statsContent(totals)}</div>
          ${view === 'calendar' ? `<div class="editor-actions">${canUseCredit() ? '<button class="button secondary" data-view="credit">Thẻ & sao kê</button>' : ''}<button class="button save-button" data-action="quick-expense">${icon('plus')} Thêm khoản chi</button><button class="button secondary" data-action="quick-income">Thu nhập</button><button class="button secondary" data-action="quick-savings">Tiết kiệm</button><button class="button secondary" data-view="debts">Nợ phải trả</button></div>${calendarView()}${expenseBrowser()}<div class="finance-panels">${incomePanel()}${savingsPanel()}</div>` : `${yearView()}${savingsPanel()}`}
          <details class="analysis-panel card" ${analysisExpanded ? 'open' : ''}><summary>Biểu đồ phân tích · ${view === 'year' ? year : `tháng ${month + 1} / ${year}`}</summary><div class="dashboard-charts" id="dashboard-charts">${dashboardCharts()}</div></details>`}
        <footer><span>${icon('calendar')} Lịch của tôi <span class="footer-divider">/</span> Cho những kế hoạch của bạn</span><span id="storage-description">Thu chi __CASH__ · Tiết kiệm __SAVINGS__</span></footer>
      </div>
    </main>`;
  renderCloud();
  const tabs = root.querySelector('.month-tabs'), activeTab = tabs?.querySelector('.active');
  if (activeTab) tabs.scrollLeft += activeTab.getBoundingClientRect().left - tabs.getBoundingClientRect().left - (tabs.clientWidth - activeTab.offsetWidth) / 2;
}
function statsContent(totals) {
  return stat('wallet', 'Thu nhập', totals.salary + totals.bonus, 'Lương + thưởng · __CASH__', 'purple')
    + stat('down', 'Chi tiêu phát sinh', totals.expense, `${totals.count} khoản · gồm chi bằng thẻ`, 'orange')
    + stat('note', 'Dự kiến chi', totals.planned, `${totals.plannedCount} khoản chưa chi · __CASH__`, 'pink')
    + stat('chart', 'Chênh lệch thu − chi', totals.balance, 'Thu nhập − đã chi; chưa tính tiền đầu kỳ', 'blue');
}
function dashboardCharts() {
  const total = view === 'year' ? yearSummary(data, year) : monthSummary(data, year, month);
  const bars = [['Thu nhập', total.salary + total.bonus, 'income'], ['Đã chi', total.expense, 'expense'], ['Dự kiến', total.planned, 'planned']];
  const max = Math.max(1, ...bars.map(([, value]) => value));
  const categories = new Map();
  for (const item of expenseRows(data, year, view === 'year' ? null : month, { status: 'paid' })) categories.set(categoryOf(item), (categories.get(categoryOf(item)) || 0) + item.amount);
  return `<section class="chart-card"><div class="chart-heading"><h2>Thu nhập & chi tiêu</h2><span class="tag">__CASH__</span></div><div class="bar-chart period-bars">${bars.map(([label, value, color]) => `<div class="bar-column"><strong>${money(value)}</strong><span class="bar-pair"><i class="${color}-bar" style="height:${value / max * 100}%"></i></span><small>${label}</small></div>`).join('')}</div></section>
    <section class="chart-card"><div class="chart-heading"><h2>Đã chi theo danh mục</h2><span class="tag">__CASH__</span></div><div class="category-chart">${categories.size ? [...categories].sort((a, b) => b[1] - a[1]).map(([label, value]) => `<div><span>${escape(label)}</span><strong>${money(value)}</strong><i style="--share:${total.expense ? value / total.expense * 100 : 0}%"></i></div>`).join('') : '<p>Chưa có khoản đã chi trong kỳ này.</p>'}</div></section>`;
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
function stat(symbol, label, value, detail, color, currency = 'cash') {
  return `<section class="stat" data-stat="${symbol}"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}">${icon(symbol)}</span></div><strong class="${value < 0 ? 'negative' : ''}">${money(value, currency)}</strong><small>${detail}</small></section>`;
}
function savingsPanel() {
  return `<section class="card savings-panel" aria-label="Kế hoạch tiết kiệm"><div class="card-heading"><div class="income-heading"><span class="stat-icon green">${icon('spark')}</span><div><h2>Quỹ tiết kiệm của bạn</h2><p>${view === 'year' ? `Mục tiêu tiết kiệm năm ${year}` : `Tiết kiệm tháng ${String(month + 1).padStart(2, '0')} / ${year}`}</p></div></div><span class="tag">TIẾT KIỆM</span></div>
    <div class="savings-layout"><div class="savings-inputs">
      ${view === 'calendar' ? `<label for="monthly-savings">Tiết kiệm tháng ${String(month + 1).padStart(2, '0')} <span>__SAVINGS__</span><input id="monthly-savings" type="text" inputmode="decimal" data-money maxlength="32" placeholder="0" value="${amount(data.savings[monthKey(year, month)]) ? formatAmount(data.savings[monthKey(year, month)]) : ''}" /></label>` : ''}
      ${view === 'year' ? `<label for="annual-savings-goal">Mục tiêu tiết kiệm năm ${year} <span>__SAVINGS__</span><input id="annual-savings-goal" type="text" inputmode="decimal" data-money maxlength="32" placeholder="0" value="${amount(data.goals[year]) ? formatAmount(data.goals[year]) : ''}" /></label>` : ''}
    </div>${view === 'year' ? `<div id="savings-progress">${savingsProgressContent()}</div>` : ''}</div>
    <p class="savings-hint">Quỹ tiết kiệm __SAVINGS__ được theo dõi riêng với thu chi __CASH__.</p></section>`;
}
function savingsProgressContent() {
  if (view === 'calendar') return `<div class="savings-progress-heading"><span>Đã tiết kiệm trong tháng</span><strong>${dong(monthSummary(data, year, month).savings)}</strong></div>`;
  const progress = savingsProgress(data, year);
  const percent = Math.min(100, progress.percent);
  return `<div class="savings-progress-heading"><span>Đã tiết kiệm trong năm</span><strong id="year-savings-total">${dong(progress.saved)}</strong></div>
    <div class="savings-progress-track" role="progressbar" aria-label="Tiến độ tiết kiệm năm ${year}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-valuetext="${progress.goal ? `${progress.percent}% mục tiêu, đã tiết kiệm ${dong(progress.saved)}` : 'Chưa đặt mục tiêu'}"><span style="width:${percent}%"></span></div>
    <div class="savings-progress-caption"><strong>${progress.goal ? `${progress.percent}% mục tiêu` : 'Chưa đặt mục tiêu'}</strong><span>${!progress.goal ? 'Đặt mục tiêu để theo dõi tiến độ' : progress.remaining ? `Còn thiếu ${dong(progress.remaining)}` : 'Đã đạt mục tiêu năm!'}</span></div>`;
}
function monthTabs() {
  return `<nav class="month-tabs" aria-label="Chọn tháng">${Array.from({ length: 12 }, (_, m) => `<button class="${m === month ? 'active' : ''}" data-month="${m}" aria-pressed="${m === month}">Tháng ${String(m + 1).padStart(2, '0')}</button>`).join('')}</nav>`;
}
function calendarView() {
  return `<div class="workspace-grid"><div class="calendar-column"><details class="calendar-disclosure card" ${calendarExpanded ? 'open' : ''}><summary>Lịch tháng ${String(month + 1).padStart(2, '0')} / ${year}</summary>${calendarPanel()}</details></div><div class="day-panel card">${dayPanel()}</div></div>`;
}
function calendarPanel() {
  const start = (new Date(year, month, 1).getDay() + 6) % 7;
  const length = daysInMonth(year, month);
  const summary = monthSummary(data, year, month);
  return `<section class="card calendar-panel"><div class="card-heading"><div><h2>Tháng ${String(month + 1).padStart(2, '0')} <span class="muted">/ ${year}</span></h2><p>Mỗi ngày một kế hoạch nhỏ</p></div><div class="calendar-controls"><button class="button secondary small" data-action="today">Hôm nay</button><button class="icon-button rotate" data-action="prev" aria-label="Tháng trước" ${year === years()[0] && month === 0 ? 'disabled' : ''}>${icon('arrow')}</button><button class="icon-button" data-action="next" aria-label="Tháng sau" ${year === years().at(-1) && month === 11 ? 'disabled' : ''}>${icon('arrow')}</button></div></div>
    <div class="weekdays">${['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CN'].map(d => `<span>${d}</span>`).join('')}</div>
    <div class="calendar-days">${Array.from({ length: start }, () => '<span class="empty-day" aria-hidden="true"></span>').join('')}${Array.from({ length }, (_, i) => {
      const n = i + 1, entry = data.days[dayKey(year, month, n)], total = dayTotal(entry, 'paid'), planned = dayTotal(entry, 'planned');
      const today = n === now.getDate() && month === now.getMonth() && year === now.getFullYear();
      return `<button class="calendar-day ${n === day ? 'selected' : ''} ${today ? 'today' : ''} ${(i + start) % 7 > 4 ? 'weekend' : ''}" data-day="${n}" aria-pressed="${n === day}" aria-label="Ngày ${n} tháng ${month + 1}, ${money(total)}"><span class="day-number">${String(n).padStart(2, '0')}</span>${total ? `<small title="Đã chi: ${money(total)}">${money(total)}</small>` : ''}${planned ? `<small class="planned-value" title="Dự kiến: ${money(planned)}">DK ${formatAmount(planned)}</small>` : ''}${entry?.note ? '<i class="note-indicator" title="Có ghi chú"></i>' : ''}</button>`;
    }).join('')}</div><div class="calendar-bottom"><span><i></i> Ngày đang chọn <b class="today-legend"></b> Hôm nay</span><strong>Đã chi tháng <span>${money(summary.expense)}</span></strong></div></section>`;
}
function incomePanel() {
  const income = data.incomes[monthKey(year, month)] || {};
  const summary = monthSummary(data, year, month);
  return `<section class="card income-panel"><div class="card-heading"><div class="income-heading"><span class="stat-icon green">${icon('wallet')}</span><div><h2>Thu nhập tháng ${String(month + 1).padStart(2, '0')}</h2><p>Ghi lại lương và những khoản thưởng của bạn</p></div></div><span class="tag">${year}</span></div>
    <div class="income-fields"><label>Lương thực nhận <span>__CASH__</span><input inputmode="decimal" type="text" data-money maxlength="32" placeholder="0" value="${amount(income.salary) ? formatAmount(income.salary) : ''}" data-income="salary" /></label><label>Thưởng & thu nhập thêm <span>__CASH__</span><input inputmode="decimal" type="text" data-money maxlength="32" placeholder="0" value="${amount(income.bonus) ? formatAmount(income.bonus) : ''}" data-income="bonus" /></label></div>
    <div class="salary-period"><label>Lương của tháng<input type="month" data-income="earnedMonth" value="${income.earnedMonth || shiftMonth(monthKey(year,month),-1)}" /></label><label>Ngày nhận tiền<input type="date" data-income="receivedOn" min="${monthKey(year,month)}-01" max="${dayKey(year,month,daysInMonth(year,month))}" value="${income.receivedOn || dayKey(year,month,15)}" /></label></div>
    <label class="income-note-label" for="income-note">Ghi chú thu nhập</label><textarea id="income-note" class="income-note" data-income="note" maxlength="20000" rows="2" placeholder="Ví dụ: Lương cơ bản, thưởng dự án, ngày nhận lương…">${escape(income.note || '')}</textarea>
    <div class="income-total"><span>Tổng thu nhập tháng</span><strong id="income-total">${money(summary.salary + summary.bonus)}</strong></div></section>`;
}
function categoryOptions(value, any = '') {
  const categories = [...new Set([...CATEGORIES, ...Object.values(data.days).flatMap(entry => entry.items.map(item => categoryOf(item)))])];
  return `${any ? `<option value="">${any}</option>` : ''}${categories.map(category => `<option value="${escape(category)}" ${category === value ? 'selected' : ''}>${escape(category)}</option>`).join('')}`;
}
function dayPanel() {
  const entry = currentDay();
  return `<div class="day-panel-header"><div class="eyebrow">CHI TIÊU TRONG NGÀY</div><h2>${String(day).padStart(2, '0')} <span>/ ${String(month + 1).padStart(2, '0')} / ${year}</span></h2><label class="day-picker-label">Chọn ngày<input id="day-select" aria-label="Chọn ngày nhập chi tiêu" type="date" value="${selectedKey()}" min="${year}-01-01" max="${year}-12-31" /></label></div>
    <div class="expense-heading"><h3>Các khoản chi</h3><span>__CASH__</span></div>
    <div class="expense-list">${entry.items.map((item, index) => `<article class="expense-entry" data-item="${index}"><div class="expense-entry-title"><input aria-label="Nội dung khoản chi ${index + 1}" placeholder="Nội dung khoản chi" maxlength="500" data-field="title" ${(item.debtPaymentId || item.cardFeeMonth) ? `readonly title="${item.cardFeeMonth ? 'Phí liên kết sao kê' : 'Khoản chi liên kết trả nợ'}"` : ''} value="${escape(item.title)}" /><button class="delete-button" ${(item.debtPaymentId || item.cardFeeMonth) ? `data-debt-linked disabled title="${item.cardFeeMonth ? 'Sửa phí trong Thẻ & sao kê' : 'Hủy lần trả trong Khoản vay khác'}"` : ''} data-delete="${index}" aria-label="Xóa khoản chi ${index + 1}">${icon('trash')}</button></div>
      <label>Số tiền · __CASH__<input aria-label="Số tiền khoản chi ${index + 1}" type="text" data-money maxlength="32" inputmode="decimal" placeholder="0" data-field="amount" ${(item.debtPaymentId || item.cardFeeMonth) ? 'readonly' : ''} value="${item.amount ? formatAmount(item.amount) : ''}" /></label>
      <div class="expense-entry-meta"><label>Danh mục<select aria-label="Danh mục khoản chi ${index + 1}" data-field="category" ${(item.debtPaymentId || item.cardFeeMonth) ? 'data-debt-linked disabled' : ''}>${categoryOptions(categoryOf(item))}</select></label><label>Trạng thái<select aria-label="Trạng thái khoản chi ${index + 1}" data-field="status" ${(item.debtPaymentId || item.cardFeeMonth) ? 'data-debt-linked disabled' : ''}><option value="planned" ${expenseStatus(item) === 'planned' ? 'selected' : ''}>Dự kiến</option><option value="paid" ${expenseStatus(item) === 'paid' ? 'selected' : ''}>Đã chi</option></select></label></div>
      <div class="expense-entry-meta"><label>Thanh toán bằng<select aria-label="Phương thức khoản chi ${index+1}" data-field="paymentMethod" ${(item.debtPaymentId || item.cardFeeMonth) ? 'disabled data-debt-linked' : ''}><option value="cash" ${item.paymentMethod !== 'card' ? 'selected' : ''}>Tiền mặt / tài khoản</option><option value="card" ${item.paymentMethod === 'card' ? 'selected' : ''}>Thẻ tín dụng</option></select></label>${item.paymentMethod === 'card' ? `<label>Cách trả<select data-field="settlement" aria-label="Cách trả thẻ khoản chi ${index+1}" ${item.cardFeeMonth ? 'disabled data-debt-linked' : ''}><option value="oneoff" ${item.settlement === 'oneoff' ? 'selected' : ''}>Một lần tháng sau · 1回</option><option value="ribo" ${item.settlement === 'ribo' ? 'selected' : ''}>Bổ sung vào リボ</option>${item.cardFeeMonth ? '<option value="fee" selected>Phí sao kê</option>' : ''}</select></label><label>Kỳ sao kê trả tiền<input aria-label="Kỳ sao kê khoản chi ${index+1}" data-field="billingMonth" type="month" required value="${item.billingMonth || shiftMonth(selectedKey().slice(0,7),1)}" ${item.cardFeeMonth ? 'readonly' : ''} /></label>` : ''}</div>
      ${(item.debtPaymentId || item.cardFeeMonth) ? `<small class="linked-note">${item.cardFeeMonth ? 'Phí liên kết sao kê · sửa trong Thẻ & sao kê.' : 'Liên kết trả nợ · Sửa/hủy trong Khoản vay khác.'}</small>` : ''}</article>`).join('')}</div>
    <button class="add-expense" data-action="add">${icon('plus')} Thêm khoản chi</button>
    <div class="day-total"><span>Đã chi</span><strong id="day-total">${money(dayTotal(entry, 'paid'))}</strong></div><div class="planned-total"><span>Dự kiến</span><strong id="day-planned-total">${money(dayTotal(entry, 'planned'))}</strong></div>
    <div class="note-section"><label for="day-note">${icon('note')} Ghi chú</label><textarea id="day-note" maxlength="20000" placeholder="Ghi chú trong ngày" rows="2">${escape(entry.note)}</textarea></div>`;
}
function expenseBrowser() {
  return `<details class="card expense-browser" ${searchExpanded ? 'open' : ''}><summary>Tìm kiếm khoản chi trong tháng</summary><div class="expense-filters"><label>Tìm nội dung<input type="search" id="expense-search" placeholder="Ví dụ: tiền nhà, ăn uống…" value="${escape(expenseQuery)}" /></label><label>Danh mục<select id="expense-category">${categoryOptions(expenseCategory, 'Tất cả danh mục')}</select></label><label>Trạng thái<select id="expense-status"><option value="">Tất cả</option><option value="paid" ${expenseFilterStatus === 'paid' ? 'selected' : ''}>Đã chi</option><option value="planned" ${expenseFilterStatus === 'planned' ? 'selected' : ''}>Dự kiến</option></select></label></div><div id="expense-results" aria-live="polite">${expenseResults()}</div></details>`;
}
function expenseResults() {
  const rows = expenseRows(data, year, month, { query: expenseQuery, category: expenseCategory, status: expenseFilterStatus });
  return `<p class="search-summary">${rows.length} khoản · ${money(rows.reduce((sum, item) => sum + item.amount, 0))}</p><div class="expense-search-list">${rows.map(item => `<button data-open-day="${item.date}"><time>${item.date.split('-').reverse().join('/')}</time><span><strong translate="no">${escape(item.title || 'Chưa đặt tên')}</strong><small>${escape(categoryOf(item))} · ${expenseStatus(item) === 'paid' ? 'Đã chi' : 'Dự kiến'}</small></span><strong>${money(item.amount)}</strong></button>`).join('') || '<p>Không có khoản chi khớp bộ lọc.</p>'}</div>`;
}
function yearView() {
  return `<section class="card annual-months"><div class="card-heading"><div><h2>Xem riêng từng tháng</h2><p>Chọn tháng để xem tổng thu, chi và tiết kiệm của tháng đó.</p></div><span class="tag">${year}</span></div><div class="month-grid" aria-label="Tổng kết theo tháng">${Array.from({ length: 12 }, (_, m) => `<button class="month-card" data-open-month="${m}"><span>Tháng ${String(m + 1).padStart(2, '0')}</span>${icon('arrow')}</button>`).join('')}</div></section>`;
}
function refreshTotals() {
  const summary = monthSummary(data, year, month), totals = view === 'year' ? yearSummary(data, year) : summary;
  const overview = document.querySelector('#cashflow-overview'); if (overview) overview.innerHTML = salaryTimeline(data, monthKey(year,month));
  document.querySelector('.stats').innerHTML = statsContent(totals);
  document.querySelector('#dashboard-charts').innerHTML = dashboardCharts();
  const progress = document.querySelector('#savings-progress'); if (progress) progress.innerHTML = savingsProgressContent();
  if (view === 'year') return;
  document.querySelector('#day-total').textContent = money(dayTotal(currentDay(), 'paid'));
  document.querySelector('#day-planned-total').textContent = money(dayTotal(currentDay(), 'planned'));
  document.querySelector('#income-total').textContent = money(summary.salary + summary.bonus);
  document.querySelector('.calendar-panel').outerHTML = calendarPanel();
  document.querySelector('#expense-results').innerHTML = expenseResults();
}
root.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if ((button.dataset.delete !== undefined || ['add-debt', 'add', 'quick-expense', 'quick-income', 'quick-savings', 'add-year', 'remove-year', 'import', 'export', 'save', 'cloud-remote', 'cloud-retry'].includes(button.dataset.action)) && !canEdit()) return;
  if ((button.dataset.view === 'credit' || button.dataset.creditAction || button.dataset.creditMonth) && (!canEdit() || !await refreshCreditRole(true))) { notify('Chức năng Thẻ & sao kê chỉ dành cho admin.'); return; }
  if (button.dataset.creditAction) { showCreditDialog(financeContext(), button.dataset.creditAction, monthKey(year,month)); return; }
  if (button.dataset.creditMonth) { [year, month] = button.dataset.creditMonth.split('-').map(Number); month--; day = Math.min(day, daysInMonth(year,month)); view = 'credit'; render(); return; }
  if (button.dataset.debtFilter) { debtFilter = button.dataset.debtFilter; render(); return; }
  if (button.dataset.editDebt) { openDebtDialog(button.dataset.editDebt, 'edit'); return; }
  if (button.dataset.removeDebt) { openDebtDialog(button.dataset.removeDebt, 'delete'); return; }
  if (button.dataset.cancelPayment) { openDebtDialog(button.dataset.debtId, 'cancel', button.dataset.cancelPayment); return; }
  if (button.dataset.year) { year = +button.dataset.year; day = Math.min(day, daysInMonth(year, month)); render(); }
  if (button.dataset.month !== undefined) { month = +button.dataset.month; day = Math.min(day, daysInMonth(year, month)); render(); }
  if (button.dataset.day) { day = +button.dataset.day; render(); }
  if (button.dataset.view) { view = button.dataset.view; render(); }
  if (button.dataset.openMonth !== undefined) { month = +button.dataset.openMonth; day = Math.min(day, daysInMonth(year, month)); view = 'calendar'; render(); }
  if (button.dataset.openDay) { [year, month, day] = button.dataset.openDay.split('-').map(Number); month--; view = 'calendar'; render(); }
  if (button.dataset.delete !== undefined) { if (currentDay().items[+button.dataset.delete]?.debtPaymentId || currentDay().items[+button.dataset.delete]?.cardFeeMonth) return; ensureDay().items.splice(+button.dataset.delete, 1); persist(); render(); }
  switch (button.dataset.action) {
    case 'theme': display.theme = display.theme === 'dark' ? 'light' : 'dark'; saveDisplay(display); render(); break;
    case 'settings': showSettings(financeContext(), display, next => { display = next; saveDisplay(display); setLanguage(display.language); render(); }); break;
    case 'save': await saveChanges(); break;
    case 'add-debt': openDebtDialog(); break;
    case 'add-year': showYearDialog(); break;
    case 'remove-year': {
      if (years().length <= 1 || !ask(`Xóa năm ${year} khỏi danh sách? Dữ liệu được giữ lại và sẽ xuất hiện khi thêm lại năm này.`)) break;
      removeYear(data, year); year = years().find(value => value >= year) || years().at(-1); day = Math.min(day, daysInMonth(year, month)); persist(); render(); break;
    }
    case 'quick-expense': view = 'calendar'; ensureDay().items.push(newExpense()); persist(); render(); focusEditor('.expense-entry:last-child [data-field=title]'); break;
    case 'quick-income': view = 'calendar'; render(); focusEditor('[data-income="salary"]'); break;
    case 'quick-savings': view = 'calendar'; render(); focusEditor('#monthly-savings'); break;
    case 'account': showAccount(); break;
    case 'register': if (!cloud.user) showAccount('signup'); break;
    case 'cloud-retry': await cloud.refresh(); break;
    case 'cloud-remote': {
      if (!ask('Thay bản nháp trên máy bằng dữ liệu đám mây? Hãy xuất dữ liệu trước nếu cần giữ bản nháp.')) break;
      try { await cloud.useRemote(); } catch (error) { notify(error.message); }
      break;
    }
    case 'add': ensureDay().items.push(newExpense()); persist(); render(); document.querySelector('.expense-entry:last-child [data-field=title]')?.focus(); break;
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
  if (target.id === 'expense-search') { expenseQuery = target.value; document.querySelector('#expense-results').innerHTML = expenseResults(); return; }
  if (['date','month'].includes(target.type) && !target.checkValidity()) return;
  if (target.hasAttribute('data-money')) {
    const value = target.value.trim();
    target.setCustomValidity(value && !/^\d[\d,]*(?:\.\d{0,3})?$/.test(value) ? 'Nhập số tiền dạng 1,000,000; có thể nhập tối đa 3 chữ số thập phân.' : Number(value.replace(/,/g, '')) > MAX_AMOUNT ? 'Số tiền vượt giới hạn cho phép.' : '');
    if (!target.validity.valid) return;
  }
  if (target.id === 'monthly-savings') { data.savings[monthKey(year, month)] = amount(target.value); persist(); refreshTotals(); }
  if (target.id === 'annual-savings-goal') { data.goals[year] = amount(target.value); persist(); refreshTotals(); }
  if (target.id === 'day-note') { ensureDay().note = target.value; persist(); document.querySelector('.calendar-panel').outerHTML = calendarPanel(); }
  if (target.dataset.field) {
    const item = ensureDay().items[+target.closest('[data-item]').dataset.item];
    if (item.debtPaymentId || item.cardFeeMonth) return;
    if (target.dataset.field === 'paymentMethod') {
      item.paymentMethod = target.value; if (target.value === 'card') { item.settlement = 'oneoff'; item.billingMonth = shiftMonth(selectedKey().slice(0,7),1); } else { delete item.paymentMethod; delete item.settlement; delete item.billingMonth; }
      persist(); render(); return;
    }
    item[target.dataset.field] = target.dataset.field === 'amount' ? amount(target.value) : target.value;
    persist(); refreshTotals();
  }
  if (target.dataset.income) {
    ensureIncome()[target.dataset.income] = ['note','earnedMonth','receivedOn'].includes(target.dataset.income) ? target.value : amount(target.value);
    persist(); refreshTotals();
  }
});
root.addEventListener('change', async event => {
  if (!canEdit()) return;
  const target = event.target;
  if (target.id === 'expense-category' || target.id === 'expense-status') { expenseCategory = document.querySelector('#expense-category').value; expenseFilterStatus = document.querySelector('#expense-status').value; document.querySelector('#expense-results').innerHTML = expenseResults(); return; }
  if (target.dataset.debtPay) { target.checked = false; openDebtDialog(target.dataset.debtPay); return; }
  if (target.id === 'day-select') { if (target.reportValidity() && target.value) { [year, month, day] = target.value.split('-').map(Number); month--; render(); } return; }
  if (target.id === 'year-select') { year = +target.value; day = Math.min(day, daysInMonth(year, month)); render(); }
  if (target.hasAttribute('data-money')) formatMoneyInput(target);
  if (target.id === 'import-file' && target.files[0]) {
    try {
      const file = target.files[0];
      if (file.size > 10_000_000) throw new Error('Bản sao lưu phải nhỏ hơn 10 MB.');
      const userId = cloud.user.id;
      const imported = normalizeData(JSON.parse(await file.text()));
      if (!canEdit() || cloud.user.id !== userId) return;
      if (!ask('Nhập bản sao lưu sẽ thay thế toàn bộ dữ liệu hiện tại trên trình duyệt này. Bạn đã xuất dữ liệu cần giữ chưa?')) return;
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
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || !event.target.matches('.page input:not([type=search]):not([type=date]), .page textarea, .page select[data-field]') || !canEdit()) return;
  event.preventDefault(); saveChanges();
});
root.addEventListener('toggle', event => {
  if (event.target.classList.contains('calendar-disclosure')) calendarExpanded = event.target.open;
  if (event.target.classList.contains('analysis-panel')) analysisExpanded = event.target.open;
  if (event.target.classList.contains('expense-browser')) searchExpanded = event.target.open;
}, true);
const authClient = new SupabaseClient(supabaseConfig, localStorage);
const cloud = new SyncController(authClient, localStorage, {
  onData: next => {
    data = next;
    syncAccountProfile(); syncCreditRole(); render();

  }, onStatus: () => { syncAccountProfile(); syncCreditRole(); renderCloud(); queueMicrotask(maybeChooseCurrencies); },
});


function maybeChooseCurrencies() {
  if (!canEdit() || currencyPromptUser === cloud.user.id || !needsCurrencySetup(data)) return;
  currencyPromptUser = cloud.user.id;
  showSettings(financeContext(), display, next => { display = next; saveDisplay(display); setLanguage(display.language); render(); }, true);
}
function syncAccountProfile() {
  const id = cloud.user?.id || null;
  if (profileUserId === id) return;
  if (profileUserId && profileUserId !== id) document.querySelectorAll('#profile-dialog,#admin-dialog,#settings-dialog,#credit-dialog,#debt-dialog').forEach(dialog => dialog.close());
  profileUserId = id; accountProfile = null;
  if (!id) currencyPromptUser = null;
  if (!id) return;
  authClient.profile().then(profile => {
    if (cloud.user?.id !== id) return;
    accountProfile = profile;
    const name = document.querySelector('#profile-name'), email = document.querySelector('#profile-email');
    if (name) name.textContent = profile?.username || cloud.user.email;
    if (email) email.textContent = cloud.user.email;
    const avatar = document.querySelector('.profile .avatar'); if (avatar) avatar.textContent = (profile?.username || cloud.user.email).slice(0,1).toUpperCase();
  }).catch(() => { if (cloud.user?.id === id) profileUserId = null; });
}

function renderCloud() {
  if (!document.querySelector('#account-label')) return;
  const labels = { guest: 'Chưa đăng nhập', loading: 'Đang kết nối…', draft: 'Chưa lưu thay đổi', pending: 'Chờ đồng bộ', saving: 'Đang lưu…', ready: '', error: 'Chưa đồng bộ', conflict: 'Cần xử lý thay đổi' };
  document.querySelector('#account-label').textContent = cloud.user ? 'Tài khoản' : 'Đăng nhập';
  document.querySelectorAll('[data-action="account"]').forEach(button => button.disabled = cloud.status === 'loading');
  document.querySelector('[data-action="register"]').hidden = Boolean(cloud.user) || cloud.status === 'loading';
  document.querySelector('[data-action="import"]').disabled = !canEdit();
  document.querySelector('[data-action="export"]').disabled = !canEdit();
  document.querySelector('.page').inert = !canEdit();
  document.querySelectorAll('.page input, .page textarea, .page select, .page [data-action="add"], .page [data-action="add-year"], .page .quick-grid button, .page [data-delete]').forEach(input => input.disabled = !canEdit() || input.hasAttribute('data-debt-linked') || input.hasAttribute('data-debt-complete'));
  const removeYearButton = document.querySelector('[data-action="remove-year"]');
  if (removeYearButton) removeYearButton.disabled = !canEdit() || years().length <= 1;
  document.querySelector('[data-action="save"]').hidden = !cloud.user;
  document.querySelector('[data-action="save"]').disabled = !canEdit() || !cloud.dirty;
  document.querySelector('#storage-description').textContent = cloud.user ? [`${currencyLabel()} / ${currencyLabel('savings')}`, labels[cloud.status]].filter(Boolean).join(' · ') : 'Đăng nhập để nhập và lưu dữ liệu';
  document.querySelector('.local-badge').hidden = cloud.status === 'ready';
  document.querySelector('.local-badge').innerHTML = `${icon('check')} ${labels[cloud.status]}`;
  let message = '', actions = '';
  if (['error', 'conflict'].includes(cloud.status)) {
    message = escape(cloud.message);
    actions = cloud.status === 'conflict' ? '<button data-action="export">Xuất bản nháp</button><button data-action="cloud-remote">Tải bản đám mây</button>' : `<button data-action="${cloud.user ? 'cloud-retry' : 'account'}">${cloud.user ? 'Thử đồng bộ lại' : 'Đăng nhập'}</button>`;
  } else if (cloud.status === 'loading') message = 'Đang tải dữ liệu tài khoản. Vui lòng chờ trước khi chỉnh sửa.';
  document.querySelector('#cloud-notice').innerHTML = message ? `<div class="cloud-notice ${['error', 'conflict'].includes(cloud.status) ? 'cloud-warning' : ''}"><span>${message}</span><div>${actions}</div></div>` : '';
}

function financeContext() {
  return { getData: () => data, getUserId: () => cloud.user?.id, canEdit, canUseCredit, verifyCreditAccess: () => refreshCreditRole(true),
    onChange: next => { const previous = data; data = next; if (!persist()) { data = previous; throw new Error('Chưa lưu được thay đổi. Vui lòng thử lại.'); } render(); },
    commit: () => cloud.commit(), getStatus: () => cloud.status,
  };
}
function openDebtDialog(debtId, mode, paymentId) {
  showDebtDialog(financeContext(), debtId, mode, paymentId);
}

function showAccount(initialMode = 'signin') {
  document.querySelector('#account-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'account-dialog'; dialog.className = 'account-dialog'; dialog.setAttribute('aria-labelledby', 'account-title');
  dialog.innerHTML = `<button class="dialog-close" aria-label="Đóng">×</button><h2 id="account-title">${cloud.user ? 'Tài khoản' : 'Đăng nhập'}</h2>
    ${cloud.user ? `<p>Đang đăng nhập: <strong translate="no">${escape(cloud.user.email)}</strong></p><p>Bản nháp chưa đồng bộ sẽ được giữ riêng cho tài khoản này trên trình duyệt.</p><button class="account-submit" id="sign-out">Đăng xuất</button>` : `<div class="auth-tabs"><button class="active" data-mode="signin">Đăng nhập</button><button data-mode="signup">Đăng ký</button></div><form id="auth-form"><label class="signup-username" hidden>Tên tài khoản<input name="username" type="text" disabled minlength="3" maxlength="30" pattern="[a-z][a-z0-9_]{2,29}" autocomplete="username" placeholder="Ví dụ: quang_01" /></label><label><span id="login-label">Tên tài khoản hoặc email</span><input name="email" type="text" required autocomplete="username" placeholder="Tên tài khoản hoặc email" /></label><label>Mật khẩu<input name="password" type="password" required minlength="6" autocomplete="current-password" placeholder="Mật khẩu" /></label><button class="account-submit" type="submit">Đăng nhập</button></form><button class="forgot-password" type="button">Quên mật khẩu?</button>`}
    <p id="auth-message" role="status" aria-live="polite"></p>`;
  document.body.append(dialog); dialog.showModal();
  if (cloud.user) {
    const userId = cloud.user.id;
    const passwordButton = document.createElement('button'); passwordButton.className = 'account-submit'; passwordButton.textContent = 'Đổi mật khẩu';
    dialog.querySelector('#sign-out').before(passwordButton);
    passwordButton.onclick = () => { dialog.close(); showPasswordReset(authClient); };
    const profileButton = document.createElement('button'); profileButton.className = 'account-submit'; profileButton.textContent = 'Thông tin tài khoản';
    dialog.querySelector('#sign-out').before(profileButton);
    profileButton.onclick = () => { dialog.close(); showProfile(authClient, { ...cloud.user, ...accountProfile }, async () => { accountProfile = await authClient.profile(); cloud.user = await authClient.user(); render(); }); };
    const adminButton = document.createElement('button'); adminButton.className = 'account-submit'; adminButton.textContent = 'Quản lý tài khoản'; adminButton.hidden = true;
    dialog.querySelector('#sign-out').before(adminButton);
    adminButton.onclick = () => { dialog.close(); showAdmin(authClient, userId, () => { profileUserId = null; syncAccountProfile(); }); };
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
      if (cloud.dirty && !ask('Có bản nháp chưa đồng bộ. Đăng xuất và giữ bản nháp trên máy để đồng bộ khi đăng nhập lại?')) return;
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
window.addEventListener('online', () => { cloud.refresh(); void refreshCreditRole(true); });
window.addEventListener('focus', () => { if (cloud.user) void refreshCreditRole(true); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { cloud.refresh(); if (cloud.user) void refreshCreditRole(true); } });
setInterval(() => { if (!document.hidden && cloud.user && cloud.status !== 'loading') { if (!cloud.dirty) cloud.refresh(); void refreshCreditRole(true); } }, 30000);
window.addEventListener('beforeunload', event => { if (cloud.user && cloud.dirty) { event.preventDefault(); event.returnValue = ''; } });
