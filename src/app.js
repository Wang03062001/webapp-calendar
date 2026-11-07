import {showResetDialog} from './reset-ui.js';
import {isCardPaymentCategory} from './credit-types.js';
import {validateMoneyChanges,validateCreditEdits,validateActualDates,validateSpendingSources} from './finance-validation.js';
import {cashPeriodDetails,cashDayDetails,cashEvents,actualItem} from './cash-model.js';
import {addMoney,sumMoney,wholeCurrencyMoney} from './money.js';
import {salaryDate,plannedSalaryCycle} from './finance-date.js';
import {currentWalletContent,localToday} from './current-wallet.js';
import {showStatsDialog} from './stats-ui.js';
import {downloadFile,showExportDialog} from './export-ui.js';
import {expenseConfirmed, protectedExpense} from './expense-model.js';
import {showExpenseDialog} from './expense-ui.js';
import {safetyPanel,showSafetyDialog,budgetWarnings} from './safety-ui.js';
import {COUNTRIES,countryOf,moduleEnabled,simpleCards,readBook,writeBook,availableRegions,setRegionVisible} from './region-model.js';
import {regionBar,showRegionManager,showRegionSettings,receiptsPanel,receivablesPanel,showCashEntry} from './region-ui.js';
import { financeView, isCreditItem, creditSnapshot } from './credit-access.js';
import { accountsPanel, showAccountLedger, showMonthReconciliation, showBalanceRequest, showSavingsOpening, sourceName } from './accounts-ui.js';
import { accountSource, moneyKind, moneyOut, isCardPayment, isInternalMovement, transferRows } from './account-model.js';
import { setCurrencies, currencyLabel, normalizeCurrencies, readDisplay, saveDisplay, installMoneyFormatting } from './preferences.js';
import { startTranslations, setLanguage, t } from './i18n.js';
import { showSettings, needsCurrencySetup } from './settings-ui.js';
import { showProfile } from './profile-ui.js';
import { YEARS, MIN_YEAR, MAX_YEAR, getYears, addYear, removeYear, MAX_AMOUNT, amount, formatAmount, dayKey, monthKey, daysInMonth, monthSummary, yearSummary, savingsProgress, savingsToDate, emptyData, normalizeData, CATEGORIES, categoryOf, expenseStatus, expenseRows } from './model.js';
import { supabaseConfig } from './config.js';
import { SupabaseClient } from './supabase.js';
import { SyncController } from './sync.js';
import { showAdmin, showPasswordReset, showRecovery } from './admin.js';
import { debtsPanel, showDebtDialog } from './debts.js';
import { salaryTimeline } from './credit-ui.js';
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
const now = new Date(localToday()+'T12:00:00');
let year = Math.min(2033, Math.max(2026, now.getFullYear())), month = now.getMonth(), day = now.getDate(), view = 'calendar';
let data = emptyData(), savedTimer, debtFilter = 'all', expenseQuery = '', expenseCategory = '', expenseFilterStatus = '', calendarExpanded = matchMedia('(min-width: 1001px)').matches, searchExpanded = false, analysisExpanded = false;
const newExpense = () => ({ id: crypto.randomUUID(), title: '', amount: 0, status: 'planned', category: 'Khác', paymentMethod: 'bank' });
let creditRole = { userId: null, allowed: false, checked: false, request: 0, pending: null };
const root = document.querySelector('#app');
const walletMedia=matchMedia('(min-width: 1001px)');
let walletExpanded=walletMedia.matches,ledgerExpanded=false,walletNode=null,walletMarkup='',reportDay=localToday();
let creditWritePending = false, activeRegion='foreign', regionUser=null,regionEpoch=0;
const pendingExpenseEdits = new Set();
const fullDocument=()=>writeBook(cloud.data,activeRegion,data);
const storedBook=()=>readBook(cloud.data,activeRegion);
const creditDocument=d=>JSON.stringify([creditSnapshot(readBook(d,'foreign')),creditSnapshot(readBook(d,'vietnam'))]);
let accountProfile = null, profileUserId = null, currencyPromptUser = null;
let display = readDisplay();
document.documentElement.dataset.theme = display.theme;
startTranslations(display.language);
installMoneyFormatting();
const years = () => getYears(data);
const selectedKey = () => dayKey(year, month, day);
const currentDay = () => data.days[selectedKey()] || { note: '', items: [] };
function ensureDay() { return data.days[selectedKey()] ||= { note: '', items: [] }; }
function ensureIncome() { return data.incomes[monthKey(year, month)] ||= { salary: 0, bonus: 0, note: '',status:monthKey(year,month)+'-15'>localToday()?'planned':'received' }; }
function notify(message) {
  const toast = document.querySelector('#toast'); toast.textContent = t(message); toast.classList.add('visible');
  clearTimeout(savedTimer); savedTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}
function persist() {
  if (!canEdit()) { notify('Hãy đăng nhập trước khi nhập dữ liệu.'); return false; }
  try { validateSpendingSources(readBook(cloud.data,activeRegion),data);validateActualDates(readBook(cloud.data,activeRegion),data,localToday());validateMoneyChanges(readBook(cloud.data,activeRegion),data);validateCreditEdits(readBook(cloud.data,activeRegion),data);if(!hasCreditAccess()&&creditDocument(fullDocument())!==creditDocument(cloud.data))throw Error('Chức năng Thẻ & sao kê chỉ dành cho admin.'); const creditChanged=creditDocument(fullDocument())!==creditDocument(cloud.data); cloud.save(normalizeData(fullDocument())); creditWritePending ||= creditChanged; return true; }
  catch(error) { data=readBook(cloud.data,activeRegion);render();notify(error.message||'Không thể lưu trên trình duyệt. Hãy xuất dữ liệu để tránh mất thay đổi.'); return false; }
}
function canEdit() { return Boolean(cloud.user) && cloud.status !== 'loading'&&!cloud.resetting; }
const visibleData = () => financeView(data, hasCreditAccess());
const actualData=()=>readBook(cloud.confirmedData||emptyData(),activeRegion);
const actualView=()=>financeView(actualData(),hasCreditAccess());
function hasCreditAccess() { return canEdit() && creditRole.userId === cloud.user.id && creditRole.allowed; }
function canUseCredit(){return hasCreditAccess();}
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
    if (!allowed) { document.querySelector('#safety-dialog[data-credit-guard]')?.close(); if(changed)document.querySelectorAll('#expense-dialog,#opening-dialog,#stat-dialog').forEach(d=>d.close()); document.querySelectorAll('#credit-dialog,#credit-limit-dialog,#debt-dialog,#reconcile-dialog,#ledger-dialog').forEach(d=>d.close()); document.querySelector('#ledger-dialog [name=creditDebt]')?.closest('dialog')?.close(); }
    if (changed) render();
    return allowed;
  })();
  creditRole.pending = pending;
  try { return await pending; } finally { if (creditRole.request === request) creditRole.pending = null; }
}
function formatMoneyInput(input) { if (input.validity.valid && input.value.trim()) input.value = formatAmount(amount(input.value)); }
async function saveChanges() {
  if (!canEdit()) return;
  const actor=cloud.user.id,region=activeRegion,epoch=cloud.epoch;
  const current=()=>canEdit()&&actor===cloud.user.id&&region===activeRegion&&epoch===cloud.epoch;
  try {
    // A reload can interrupt a role check after raw text was cached. Replay
    // those restored valid inputs through the usual permission/validation path.
    root.querySelectorAll('[data-restored-expense]').forEach(input=>{
      const item=currentDay().items[+input.closest('[data-item]').dataset.item];
      const raw=item&&cloud.expenseInputs[expenseInputKey(selectedKey(),item)]?.[input.dataset.field];
      delete input.dataset.restoredExpense;
      if(raw&&!raw.message)input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await Promise.all([...pendingExpenseEdits]);
    if(!current())return;
    for (const input of root.querySelectorAll('[data-money], input[type=month], input[type=date]')) { if (!input.reportValidity()) return; if (input.hasAttribute('data-money')) formatMoneyInput(input); }
    if(creditWritePending&&!await refreshCreditRole(true)){notify('Chức năng Thẻ & sao kê chỉ dành cho admin.');return;}
    if(!current())return;
    await cloud.commit();
    if(!current())return;
    if(cloud.status==='ready')creditWritePending=false;
    if (cloud.status === 'ready') notify('Đã lưu thay đổi.');
    else if (['error', 'conflict'].includes(cloud.status)) notify(cloud.message);
  } catch (error) { notify(error.message); }
}
function render() {
  document.querySelector('#stat-dialog')?.close();
  setCurrencies(data.currencies);
  if (view === 'credit' || view==='debts'&&!moduleEnabled(data,'debts') || view==='safety'&&!moduleEnabled(data,'safety')) view = 'calendar';
  if (!years().includes(year)) { year = years()[0]; day = Math.min(day, daysInMonth(year, month)); }
  const totals = view === 'calendar' ? monthSummary(visibleData(), year, month) : yearSummary(visibleData(), year);
  const pageTitle = ({ calendar: 'Thu chi & kỳ lương', year: 'Tổng kết năm', debts: 'Khoản vay khác', credit: 'Thẻ & sao kê', safety:'Nền tảng an toàn' })[view];
  root.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="Lịch của tôi">${icon('calendar')}<span>Lịch của tôi<span class="brand-sub">TÀI CHÍNH CÁ NHÂN</span></span></a>
      <div class="workspace-label">KHÔNG GIAN CÁ NHÂN</div>
      <nav aria-label="Điều hướng chính">
        <button class="nav-item ${view === 'calendar' ? 'active' : ''}" data-view="calendar">${icon('calendar')} Thu chi & kỳ lương</button>
        ${moduleEnabled(data,'debts')?`<button class="nav-item ${view === 'debts' ? 'active' : ''}" data-view="debts">${icon('wallet')} Khoản vay khác</button>`:''}
        ${moduleEnabled(data,'safety')?`<button class="nav-item ${view==='safety'?'active':''}" data-view="safety">${icon('check')} Nền tảng an toàn</button>`:''}
        <button class="nav-item ${view === 'year' ? 'active' : ''}" data-view="year">${icon('chart')} Tổng kết năm</button>
      </nav>
      <div class="year-heading"><span>KẾ HOẠCH THEO NĂM</span><span>${String(years().length).padStart(2, '0')}</span></div>
      <div class="years">${years().map(y => `<button class="year-button ${year === y ? 'selected' : ''}" data-year="${y}" aria-pressed="${year === y}"><span><i></i>${y}</span>${year === y ? icon('arrow') : ''}</button>`).join('')}</div>
      <div class="sidebar-bottom"><div class="local-badge">${icon('check')} Dữ liệu lưu trên thiết bị</div><p>Một chút kế hoạch hôm nay.<br>Thảnh thơi hơn ngày mai.</p><button class="profile" data-action="account"><span class="avatar" translate="no">${escape((accountProfile?.username || cloud.user?.email || '?').slice(0,1).toUpperCase())}</span><span><strong id="profile-name" translate="no">${escape(accountProfile?.username || cloud.user?.email || '')}</strong><small id="profile-email" translate="no">${escape(cloud.user?.email || '')}</small></span></button></div>
    </aside>
    <main>
      <header class="topbar"><div class="breadcrumb">Không gian cá nhân <span>/</span> <strong>${pageTitle}</strong></div><div class="top-actions"><button class="button secondary small" data-action="theme" aria-label="Đổi giao diện sáng tối">${display.theme === 'dark' ? '☀' : '☾'}</button><button class="button secondary small" data-action="settings">⚙ <span>Cài đặt</span></button><button class="button secondary small" data-action="account">${icon('wallet')} <span id="account-label">Đăng nhập</span></button><button class="button secondary small" data-action="register">Đăng ký</button><button class="button small save-button" data-action="save" hidden>${icon('check')} Lưu thay đổi</button><button class="button secondary small" data-action="export" aria-label="Xuất dữ liệu Excel">${icon('down')} <span class="button-text">Xuất Excel</span></button><button class="icon-button" title="Nhập bản sao lưu JSON" aria-label="Nhập bản sao lưu JSON" data-action="import">${icon('up')}</button><input type="file" id="import-file" accept="application/json,.json" hidden /></div></header>
      <div id="cloud-notice" aria-live="polite"></div>
      <div class="page">${regionBar(data,activeRegion,cloud.data)}${data.trackingStart?`<section class="card tracking-start"><p>Theo dõi từ ${data.trackingStart.split('-').reverse().join('/')}. ${!data.accounts?'Chưa thiết lập số dư đầu kỳ.':''}</p>${!data.accounts?'<button class="button" data-action="current-wallet-settings">Nhập số dư đầu kỳ</button>':''}</section>`:''}
        <div class="page-heading"><h2 id="summary-period">${view === 'calendar' ? `Tổng kết tháng ${String(month + 1).padStart(2, '0')} / ${year}` : view === 'year' ? `Tổng kết năm ${year}` : view === 'credit' ? `Thẻ & sao kê · ${String(month + 1).padStart(2, '0')} / ${year}` : view === 'safety' ? 'Nền tảng an toàn · __CASH__' : 'Khoản vay khác · __CASH__'}</h2>${view === 'debts' ? '' : `<div class="year-tools"><div class="year-select-wrap">${icon('calendar')}<select id="year-select" aria-label="Chọn năm">${years().map(y => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></div><button class="icon-button" data-action="add-year" aria-label="Thêm năm" title="Thêm năm">${icon('plus')}</button><button class="icon-button remove-year" data-action="remove-year" aria-label="Xóa năm" title="Xóa năm" ${years().length <= 1 ? 'disabled' : ''}>${icon('trash')}</button></div>`}</div>
        ${view==='safety'?safetyPanel(actualView(),selectedKey()):view === 'debts' ? debtsPanel(visibleData(), debtFilter) : `
          ${view === 'calendar' ? `${monthTabs()}<details id=ledger-tools class="card ledger-tools" ${ledgerExpanded?'open':''}><summary>Thiết lập / đối chiếu nguồn tiền theo ngày lịch</summary><div id=accounts-overview>${accountsPanel(actualView(),selectedKey(),hasCreditAccess())}</div></details>${canUseCredit()&&!simpleCards(data) ? `<div id="cashflow-overview">${salaryTimeline(actualData(), monthKey(year, month))}</div>` : ''}` : ''}
          <div class="stats">${statsContent(totals)}</div>${moduleEnabled(data,'safety')?`<div id="budget-warnings">${budgetWarnings(actualView(),monthKey(year,month))}</div>`:''}
          ${view === 'calendar' ? `<div class="editor-actions"><button class="button save-button" data-action="quick-expense">${icon('plus')} Thêm khoản chi</button>${moduleEnabled(data,'salary')?'<button class="button secondary" data-action="quick-income">Thu nhập</button>':''}${moduleEnabled(data,'savings')?'<button class="button secondary" data-action="quick-savings">Tiết kiệm</button>':''}${moduleEnabled(data,'debts')?'<button class="button secondary" data-view="debts">Nợ phải trả</button>':''}</div>${calendarView()}${expenseBrowser()}${moduleEnabled(data,'receipts')?receiptsPanel(data,monthKey(year,month)):''}${moduleEnabled(data,'receivables')?receivablesPanel(data):''}<div class="finance-panels">${moduleEnabled(data,'salary')?incomePanel():''}${moduleEnabled(data,'savings')?savingsPanel():''}</div>` : `${yearView()}${moduleEnabled(data,'savings')?savingsPanel():''}`}
          <details class="analysis-panel card" ${analysisExpanded ? 'open' : ''}><summary>Biểu đồ phân tích · ${view === 'year' ? year : `tháng ${month + 1} / ${year}`}</summary><div class="dashboard-charts" id="dashboard-charts">${dashboardCharts()}</div></details>`}
        <footer><span>${icon('calendar')} Lịch của tôi <span class="footer-divider">/</span> Cho những kế hoạch của bạn</span><span id="storage-description">Thu chi __CASH__ · Tiết kiệm __SAVINGS__</span></footer>
      </div>
    </main><aside id="current-wallet" class="current-wallet" aria-label="Tài sản và tiết kiệm"></aside>`;
  restoreExpenseInputs();
  renderCloud();
  const tabs = root.querySelector('.month-tabs'), activeTab = tabs?.querySelector('.active');
  if (activeTab) tabs.scrollLeft += activeTab.getBoundingClientRect().left - tabs.getBoundingClientRect().left - (tabs.clientWidth - activeTab.offsetWidth) / 2;
}
function refreshActualDay(){const current=localToday();if(current!==reportDay){reportDay=current;if(['calendar','year'].includes(view)&&root.querySelector('.stats'))refreshTotals();}}
function renderCurrentWallet() {
  const node=document.querySelector('#current-wallet');if(!node)return;
  const markup=currentWalletContent(actualData(),{asOf:localToday(),creditAllowed:hasCreditAccess(),signedIn:canEdit(),draft:cloud.dirty,expanded:walletExpanded,updatedAt:cloud.confirmedAt});
  if(node===walletNode&&markup===walletMarkup)return;
  const active=document.activeElement,restoreFocus=node.contains(active),action=active?.dataset?.action;
  node.innerHTML=markup;walletNode=node;walletMarkup=markup;
  if(restoreFocus)(action?node.querySelector(`[data-action="${action}"]`):node.querySelector('summary'))?.focus({preventScroll:true});
}
function periodCash(){return cashPeriodDetails(actualData(),{year,month:view==='year'?null:month,creditAllowed:hasCreditAccess()});}
function statsContent() {
 const d=periodCash(),credit=hasCreditAccess();
 return stat('wallet','Tiền vào thực tế',d.actualCashIn,'Ngân hàng + tiền mặt · theo ngày thực nhận','purple')
 +stat('down','Tổng tiền thực chi',d.actualCashOut,`${d.outflows.length} dòng tiền ra · gồm trả thẻ và trả nợ thực tế`,'orange')
 +stat('chart','Biến động tài sản chi tiêu',d.cashChange,`Đầu kỳ ${d.openingCash===null?'N/A':money(d.openingCash)} · Cuối kỳ ${d.closingCash===null?'N/A':money(d.closingCash)} · Đã sử dụng ${d.usageRatio===null?'N/A':d.usageRatio+'%'}`,'blue')
 +(credit?stat('credit','Phát sinh tín dụng',d.creditTotal,'Theo ngày mua · không trừ tài sản tiền','purple'):stat('note','Dự kiến thanh toán',d.plannedTotal,'Chưa trừ tài sản tiền','pink'));
}
function dashboardCharts() {
 const d=periodCash(),values=[['Tiền vào thực tế',d.actualCashIn,'income'],['Chi trực tiếp từ ngân hàng',sumMoney(d.outflows.filter(r=>r.type==='direct'&&r.source==='bank').map(r=>r.amount)),'bank'],['Chi tiền mặt',sumMoney(d.outflows.filter(r=>r.type==='direct'&&r.source==='cash').map(r=>r.amount)),'cash'],...(d.savingsDeposited?[['Chuyển vào tiết kiệm',d.savingsDeposited,'savings']]:[]),...(hasCreditAccess()?[['Thanh toán thẻ',d.cardPaid,'payment']]:[]),['Trả nợ khác',d.debtTotal,'payment'],['Tài sản cuối kỳ',d.closingCash,'']];
 const chart=(title,rows)=>{const max=Math.max(1,...rows.map(([,n])=>Math.abs(n||0)));return `<section class="chart-card"><div class="chart-heading"><h2>${title}</h2><span class="tag">__CASH__</span></div><div class="category-chart">${rows.map(([label,value,kind])=>`<div><span>${escape(label)}</span><strong data-money-kind="${kind}">${value===null?'N/A':money(value)}</strong><i data-money-kind="${kind}" style="--share:${Math.abs(value||0)/max*100}%"></i></div>`).join('')}</div></section>`;};
 const groups=new Map();for(const p of d.creditPurchases){const key=categoryOf(p);groups.set(key,addMoney(groups.get(key)||0,p.amount));}
 return chart('Dòng tiền và tài sản',values)+(hasCreditAccess()?chart('Giao dịch tín dụng phát sinh',[...groups].map(([name,value])=>[name,value,'card'])):'');
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
  return `<section class="stat" data-stat="${symbol}"><div class="stat-top"><span>${label}</span><button type="button" class="stat-icon ${color}" data-stat-details="${symbol}" aria-haspopup="dialog" aria-label="Xem chi tiết ${label}" title="Xem chi tiết ${label}">${icon(['credit','upcoming'].includes(symbol)?'wallet':symbol)}</button></div><strong data-money-kind="${({wallet:'income',down:'payment',credit:'card',upcoming:'payment'})[symbol]||''}" class="${value < 0 ? 'negative' : ''}">${value===null?'N/A':money(value, currency)}</strong><small>${detail}</small></section>`;
}
function savingsPanel() {
  return `<section class="card savings-panel" aria-label="Kế hoạch tiết kiệm"><div class="card-heading"><div class="income-heading"><span class="stat-icon green">${icon('spark')}</span><div><h2>Quỹ tiết kiệm của bạn</h2><p>${view === 'year' ? `Mục tiêu tiết kiệm năm ${year}` : `Tiết kiệm tháng ${String(month + 1).padStart(2, '0')} / ${year}`}</p></div></div><span class="tag">TIẾT KIỆM</span></div>
    <div id="savings-cumulative" class="savings-cumulative" aria-live="polite">${savingsCumulativeContent()}</div>
    <div class="savings-layout"><div class="savings-inputs">
      ${view === 'calendar' ? `<label for="monthly-savings">Tiết kiệm tháng ${String(month + 1).padStart(2, '0')} <span>__SAVINGS__</span><input id="monthly-savings" type="text" inputmode="decimal" data-money maxlength="32" placeholder="0" value="${amount(data.savings[monthKey(year, month)]) ? formatAmount(data.savings[monthKey(year, month)]) : ''}" /></label>` : ''}
      ${view === 'year' ? `<label for="annual-savings-goal">Mục tiêu tiết kiệm năm ${year} <span>__SAVINGS__</span><input id="annual-savings-goal" type="text" inputmode="decimal" data-money maxlength="32" placeholder="0" value="${amount(data.goals[year]) ? formatAmount(data.goals[year]) : ''}" /></label>` : ''}
    </div>${view === 'year' ? `<div id="savings-progress">${savingsProgressContent()}</div>` : ''}</div>
    <p class="savings-hint">Số nhập theo tháng là lịch sử tích lũy, không tự tăng số dư nguồn tiết kiệm. Dùng Phân bổ / chuyển nguồn tiền để đưa tiền vào tiết kiệm. Dữ liệu tiết kiệm cũ __SAVINGS__ được giữ nguyên; nguồn tiết kiệm thực dùng __CASH__.</p></section>`;
}
function savingsCumulativeContent(){
  const title='<span>Tổng đã tiết kiệm đến hiện tại</span>';
  if(!cloud.user)return `${title}<p>Đăng nhập để xem tổng tiết kiệm.</p>`;
  if(!cloud.confirmedData)return `${title}<strong>N/A</strong><p>Chưa có dữ liệu đã được máy chủ xác nhận.</p>`;
  const book=actualData(),d=savingsToDate(book,localToday()),unit=normalizeCurrencies(book.currencies).savings;
  return `${title}<strong data-savings-cumulative>${formatAmount(d.total)} ${unit==='VND'?'VNĐ':unit}</strong><p>Đến tháng ${d.through.slice(5)}/${d.through.slice(0,4)} · Tất cả các năm đã lưu</p><small>Cộng các khoản tiết kiệm tháng đã lưu, gồm cả năm trước.</small>`;
}
function savingsProgressContent() {
  if (view === 'calendar') return `<div class="savings-progress-heading"><span>Đã tiết kiệm trong tháng</span><strong>${dong(monthSummary(visibleData(), year, month).savings)}</strong></div>`;
  const progress = savingsProgress(visibleData(), year);
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
  const cash=cashPeriodDetails(actualData(),{year,month,creditAllowed:hasCreditAccess()});
  return `<section class="card calendar-panel"><div class="card-heading"><div><h2>Tháng ${String(month + 1).padStart(2, '0')} <span class="muted">/ ${year}</span></h2><p>Mỗi ngày một kế hoạch nhỏ</p></div><div class="calendar-controls"><button class="button secondary small" data-action="today">Hôm nay</button><button class="icon-button rotate" data-action="prev" aria-label="Tháng trước" ${year === years()[0] && month === 0 ? 'disabled' : ''}>${icon('arrow')}</button><button class="icon-button" data-action="next" aria-label="Tháng sau" ${year === years().at(-1) && month === 11 ? 'disabled' : ''}>${icon('arrow')}</button></div></div>
    <div class="weekdays">${['THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7', 'CN'].map(d => `<span>${d}</span>`).join('')}</div>
    <div class="calendar-days">${Array.from({ length: start }, () => '<span class="empty-day" aria-hidden="true"></span>').join('')}${Array.from({ length }, (_, i) => {
      const n = i + 1, entry = visibleData().days[dayKey(year, month, n)], total = cashDayDetails(actualData(),dayKey(year,month,n),{creditAllowed:hasCreditAccess()}).actualCashOut;
      const today = dayKey(year,month,n)===localToday();
      const amounts=new Map(), labels={receipt:'Tiền vào khác',savings:'Chi từ tiết kiệm',income:'Thu nhập',bank:'Chi từ ngân hàng',cash:'Tiền mặt',card:'Mua bằng thẻ tín dụng',payment:'Thanh toán thẻ tín dụng'};
      for(const item of entry?.items||[])if(!item.cardFeeMonth&&!isInternalMovement(item)){
        const kind=moneyKind(item), mode=item.status==='cancelled'?'cancelled':expenseStatus(item)==='planned'||dayKey(year,month,n)>localToday()?'planned':isExpenseDraft(dayKey(year,month,n),item)?'draft':'',key=kind+(mode?':'+mode:'');
        amounts.set(key,(amounts.get(key)||0)+item.amount);
      }
      for(const r of data.receipts||[])if(r.date===dayKey(year,month,n))amounts.set('receipt',(amounts.get('receipt')||0)+r.amount);
      const income=data.incomes[monthKey(year,month)];
      if(income&&(income.receivedOn||dayKey(year,month,15))===dayKey(year,month,n))amounts.set('income',(amounts.get('income')||0)+amount(income.salary)+amount(income.bonus));
      return `<button class="calendar-day ${n === day ? 'selected' : ''} ${today ? 'today' : ''} ${(i + start) % 7 > 4 ? 'weekend' : ''}" data-day="${n}" aria-pressed="${n === day}" aria-label="Ngày ${n} tháng ${month + 1}, ${money(total)}"><span class="day-number">${String(n).padStart(2, '0')}</span>${[...amounts].filter(([,value])=>value).map(([key,value])=>{const [kind,mode]=key.split(':');return `<small class="${mode==='cancelled'?'cancelled-entry':''}" data-money-kind="${mode==='cancelled'?'':kind}" title="${labels[kind]}${mode?' · '+({planned:'Dự kiến',draft:'Chưa lưu',cancelled:'Đã hủy'})[mode]:''}: ${money(value)}">${mode?({planned:'DK ',draft:'Nháp ',cancelled:'Hủy '})[mode]:['income','receipt'].includes(kind)?'+ ':kind==='payment'?'↗ ':''}${formatAmount(value)}</small>`;}).join('')}${entry?.note?'<i class="note-indicator" title="Có ghi chú"></i>':''}</button>`;
    }).join('')}</div><div class="money-legend">${canUseCredit()?'<span data-money-kind="payment">Thanh toán thẻ tín dụng</span>':''}<span data-money-kind="income">Lương & thưởng</span><span data-money-kind="bank">Chi từ ngân hàng</span><span data-money-kind="cash">Tiền mặt</span>${canUseCredit()?'<span data-money-kind="card">Mua bằng thẻ tín dụng</span>':''}</div><div class="calendar-bottom"><span><i></i> Ngày đang chọn <b class="today-legend"></b> Hôm nay</span><strong>Chi trực tiếp ${money(addMoney(cash.directTotal,cash.debtTotal))} · Trả thẻ ${money(cash.cardPaid)} · Thực chi ${money(cash.actualCashOut)} · Tín dụng ${money(cash.creditTotal)}</strong></div></section>`;
}
function incomePanel() {
  const income = data.incomes[monthKey(year, month)] || {};
  const summary = monthSummary(visibleData(), year, month);
  return `<section class="card income-panel"><div class="card-heading"><div class="income-heading"><span class="stat-icon green">${icon('wallet')}</span><div><h2>Thu nhập tháng ${String(month + 1).padStart(2, '0')}</h2><p>Ghi lại lương và những khoản thưởng của bạn</p></div></div><span class="tag">${year}</span></div>
    <div class="income-fields"><label>Lương thực nhận <span>__CASH__</span><input inputmode="decimal" type="text" data-money maxlength="32" placeholder="0" value="${amount(income.salary) ? formatAmount(income.salary) : ''}" data-money-kind="income" data-income="salary" /></label><label>Thưởng <span>__CASH__</span><input inputmode="decimal" type="text" data-money maxlength="32" placeholder="0" value="${amount(income.bonus) ? formatAmount(income.bonus) : ''}" data-money-kind="income" data-income="bonus" /></label></div>
    <label>Trạng thái nhận tiền<select data-income="status"><option value="planned" ${income.status==='planned'||!data.incomes[monthKey(year,month)]&&monthKey(year,month)+'-15'>localToday()?'selected':''}>Dự kiến chưa nhận</option><option value="received" ${income.status!=='planned'&&(data.incomes[monthKey(year,month)]||monthKey(year,month)+'-15'<=localToday())?'selected':''}>Đã thực nhận</option></select></label><label class="income-note-label">Nơi nhận thu nhập<select data-income="account"><option value="bank" ${!['cash','savings'].includes(income.account)?'selected':''}>Tài khoản ngân hàng</option><option value="cash" ${income.account==='cash'?'selected':''}>Tiền mặt</option>${data.accounts?.savings!==undefined?`<option value="savings" ${income.account==='savings'?'selected':''}>Tiết kiệm</option>`:''}</select></label><div class="salary-period"><label>Lương của tháng<input type="month" data-income="earnedMonth" value="${income.earnedMonth || shiftMonth(monthKey(year,month),-1)}" /></label><label>Ngày nhận tiền<input type="date" data-income="receivedOn" value="${income.receivedOn || dayKey(year,month,15)}" /></label></div>
    <label class="income-note-label" for="income-note">Ghi chú thu nhập</label><textarea id="income-note" class="income-note" data-income="note" maxlength="20000" rows="2" placeholder="Ví dụ: Lương cơ bản, thưởng dự án, ngày nhận lương…">${escape(income.note || '')}</textarea>
    <p class="account-note">Ngày nhận dự kiến ${salaryDate(monthKey(year,month)).date} (đã xét cuối tuần, chưa có lịch nghỉ lễ xác minh). Hãy nhập ngày tiền thực sự về tài khoản; ngày trên phiếu lương không quyết định dòng tiền.</p><div class="income-total"><span>Tổng lương & thưởng tháng</span><strong data-money-kind="income" id="income-total">${money(summary.salary + summary.bonus)}</strong></div></section>`;
}
function categoryOptions(value, any = '') {
  const categories = [...new Set([...CATEGORIES, ...Object.values(visibleData().days).flatMap(entry => entry.items.filter(item=>!item.cardFeeMonth).map(item => categoryOf(item)))])];
  return `${any ? `<option value="">${any}</option>` : ''}${categories.filter(category=>hasCreditAccess()||!isCardPaymentCategory(category)).map(category => `<option value="${escape(category)}" ${category === value ? 'selected' : ''}>${escape(category)}</option>`).join('')}`;
}
function expenseEditor(item, index, date) {
  return `<article class="expense-entry" data-item="${index}"><div class="expense-entry-title"><input aria-label="Mục đích chi tiêu ${index + 1}" placeholder="Mục đích chi tiêu" maxlength="500" data-field="title" ${(item.debtPaymentId || item.cardFeeMonth || item.cardPaymentMonth || item.obligationId) ? `readonly title="${item.cardPaymentMonth ? 'Thanh toán liên kết sao kê' : item.cardFeeMonth ? 'Phí liên kết sao kê' : item.obligationId?'Khoản phải trả liên kết': 'Khoản chi liên kết trả nợ'}"` : ''} value="${escape(item.title)}" /><button class="delete-button" ${(item.debtPaymentId || item.cardFeeMonth || item.cardPaymentMonth || item.obligationId) ? `data-debt-linked disabled title="${item.cardPaymentMonth ? 'Hủy thanh toán trong Thẻ & sao kê' : item.cardFeeMonth ? 'Sửa phí trong Thẻ & sao kê' : item.obligationId?'Sửa hoặc hủy trong Nền tảng an toàn': 'Hủy lần trả trong Khoản vay khác'}"` : ''} data-delete="${index}" aria-label="Xóa khoản chi ${index + 1}">${icon('trash')}</button></div>
      <label>Loại giao dịch<select data-field="movement" ${(item.debtPaymentId||item.cardFeeMonth||item.cardPaymentMonth||item.obligationId)?'disabled data-debt-linked':''}><option value="" ${!item.movement?'selected':''}>Chi tiêu</option><option value="withdraw" ${item.movement==='withdraw'?'selected':''}>Rút tiền mặt</option><option value="deposit" ${item.movement==='deposit'?'selected':''}>Nạp tiền vào ngân hàng</option></select></label><label>Số tiền · __CASH__<input aria-label="Số tiền khoản chi ${index + 1}" type="text" data-money data-money-kind="${moneyKind(item)}" maxlength="32" inputmode="decimal" placeholder="0" data-field="amount" ${(item.debtPaymentId || item.cardFeeMonth || item.cardPaymentMonth || item.obligationId) ? 'readonly' : ''} value="${item.amount ? formatAmount(item.amount) : ''}" /></label>
      <div class="expense-entry-meta"><label>Danh mục<select aria-label="Danh mục khoản chi ${index + 1}" data-field="category" ${(item.debtPaymentId || item.cardFeeMonth || item.cardPaymentMonth || item.obligationId) ? 'data-debt-linked disabled' : ''}>${categoryOptions(categoryOf(item))}</select></label><label>Trạng thái<select aria-label="Trạng thái khoản chi ${index + 1}" data-field="status" ${(item.debtPaymentId || item.cardFeeMonth || item.cardPaymentMonth || item.obligationId) ? 'data-debt-linked disabled' : ''}><option value="planned" ${expenseStatus(item) === 'planned' ? 'selected' : ''}>Dự kiến</option><option value="paid" ${expenseStatus(item) === 'paid' ? 'selected' : ''}>${item.paymentMethod==='card'?'Đã phát sinh':'Đã thanh toán'}</option><option value="cancelled" ${item.status==='cancelled'?'selected':''}>Đã hủy</option></select></label></div>
      <div class="expense-entry-meta">${data.safety?.funds.length?`<label>Quỹ chi (không bắt buộc)<select data-field="fundId" ${item.obligationId||item.debtPaymentId||item.cardFeeMonth||item.cardPaymentMonth?'disabled data-debt-linked':''}><option value="">Không dùng quỹ</option>${data.safety.funds.filter(f=>(!f.archived&&f.source!=='savings')||f.id===item.fundId).map(f=>`<option value="${escape(f.id)}" ${item.fundId===f.id?'selected':''}>${escape(f.name)}</option>`).join('')}</select></label>`:''}<label>Phương thức thanh toán<select aria-label="Phương thức khoản chi ${index+1}" data-field="paymentMethod" ${(item.debtPaymentId || item.cardFeeMonth || item.cardPaymentMonth || item.obligationId) ? 'disabled data-debt-linked' : isInternalMovement(item)?'disabled data-movement-source':item.fundId?'disabled data-fund-source':''}><option value="bank" ${item.paymentMethod === 'bank' ? 'selected' : ''}>Tài khoản ngân hàng</option><option value="cash" ${!['bank','card','savings'].includes(item.paymentMethod) ? 'selected' : ''}>Tiền mặt</option>${item.paymentMethod==='savings'?'<option value="savings" selected>Tiết kiệm · bản ghi cũ</option>':''}${canUseCredit()?`<option value="card" ${item.paymentMethod === 'card' ? 'selected' : ''}>Thẻ tín dụng</option>`:''}</select></label></div>
      ${item.paymentMethod==='card'?'<small class="linked-note">Giao dịch tín dụng được cộng riêng theo ngày mua, không tính vào tiền thực chi.</small>':''}${isInternalMovement(item)?'<small class=linked-note>Chuyển giữa ngân hàng và tiền mặt; tổng tài sản không đổi.</small>':''}${(item.debtPaymentId || item.cardFeeMonth || item.cardPaymentMonth || item.obligationId) ? `<small class="linked-note">${item.cardPaymentMonth ? 'Thanh toán sao kê · không cộng lại chi phí. Sửa/hủy trong Thẻ & sao kê.' : item.cardFeeMonth ? 'Phí liên kết sao kê · sửa trong Thẻ & sao kê.' : item.obligationId?'Khoản phải trả · Sửa/hủy trong Nền tảng an toàn.': 'Liên kết trả nợ · Sửa/hủy trong Khoản vay khác.'}</small>` : ''}</article>`;
}
const expenseInputKey = (date,item) => JSON.stringify([activeRegion,date,item.id]);
const isExpenseDraft = (date,item) => !protectedExpense(item) && (Boolean(cloud.expenseInputs[expenseInputKey(date,item)]) || !expenseConfirmed(cloud.confirmedExpenses,activeRegion,date,item));
function rememberExpenseInput(target) {
  const row=target.closest('.expense-entry[data-item]'), item=row&&currentDay().items[+row.dataset.item];
  if(!item||!target.dataset.field)return;
  const key=expenseInputKey(selectedKey(),item);
  (cloud.expenseInputs[key]||={})[target.dataset.field]={value:target.value,message:target.validationMessage};
  cloud.cache();
}
function restoreExpenseInputs() {
  root.querySelectorAll('.expense-entry[data-item]').forEach(row=>{
    const item=currentDay().items[+row.dataset.item];if(!item)return;
    const inputs=cloud.expenseInputs[expenseInputKey(selectedKey(),item)]||{};
    row.querySelectorAll('[data-field]').forEach(input=>{const raw=inputs[input.dataset.field];if(raw){input.value=raw.value;input.setCustomValidity(raw.message);input.dataset.restoredExpense='true';}});
  });
}
function updateConfirmedExpenses() {
  // Remove only acknowledged rows; keep DOM values/caret/invalid partial input
  // in any row the server has not acknowledged, including later typing.
  root.querySelectorAll('.expense-entry[data-item]').forEach(element => {
    const item=currentDay().items[+element.dataset.item];
    if(item&&!isExpenseDraft(selectedKey(),item))element.remove();
  });
  const results=root.querySelector('#expense-results');if(results)results.innerHTML=expenseResults();
  if(['calendar','year'].includes(view)&&root.querySelector('.stats'))refreshTotals();
}
function dayPanel() {
  const entry = currentDay();
  return `<div class="day-panel-header"><div class="eyebrow">CHI TIÊU TRONG NGÀY</div><h2>${String(day).padStart(2, '0')} <span>/ ${String(month + 1).padStart(2, '0')} / ${year}</span></h2><label class="day-picker-label">Chọn ngày<input id="day-select" aria-label="Chọn ngày nhập chi tiêu" type="date" value="${selectedKey()}" min="${data.trackingStart&&data.trackingStart>`${year}-01-01`?data.trackingStart:`${year}-01-01`}" max="${year}-12-31" /></label></div>
    <div class="expense-heading"><h3>Nhập khoản mới</h3><span>__CASH__</span></div>
    <div class="expense-list">${entry.items.map((item, index) => !isExpenseDraft(selectedKey(),item)||!visibleData().days[selectedKey()]?.items.some(i=>i===item)?'':expenseEditor(item,index,selectedKey())).join('')}</div>
    <button class="add-expense" data-action="add">${icon('plus')} Thêm khoản chi</button>
    <div class="day-total"><span>Tổng tiền thực chi</span><strong id="day-total">${money(cashDayDetails(actualData(),selectedKey(),{creditAllowed:hasCreditAccess()}).actualCashOut)}</strong></div><div class="account-period"><span>Tiền ra các nguồn trong ngày</span><strong id="day-money-out">${money(cashDayDetails(actualData(),selectedKey(),{creditAllowed:hasCreditAccess()}).actualCashOut)}</strong></div><div class="planned-total"><span>Dự kiến</span><strong id="day-planned-total">${money(cashDayDetails(actualData(),selectedKey(),{creditAllowed:hasCreditAccess()}).plannedTotal)}</strong></div>
    <div class="note-section"><label for="day-note">${icon('note')} Ghi chú</label><textarea id="day-note" maxlength="20000" placeholder="Ghi chú trong ngày" rows="2">${escape(entry.note)}</textarea></div>`;
}
function expenseBrowser() {
  return `<details class="card expense-browser" ${searchExpanded ? 'open' : ''}><summary>Khoản chi trong tháng</summary><div class="expense-filters"><label>Tìm nội dung<input type="search" id="expense-search" placeholder="Ví dụ: tiền nhà, ăn uống…" value="${escape(expenseQuery)}" /></label><label>Danh mục<select id="expense-category">${categoryOptions(expenseCategory, 'Tất cả danh mục')}</select></label><label>Trạng thái<select id="expense-status"><option value="">Tất cả</option><option value="paid" ${expenseFilterStatus === 'paid' ? 'selected' : ''}>Đã chi</option><option value="planned" ${expenseFilterStatus === 'planned' ? 'selected' : ''}>Dự kiến</option></select></label></div><div id="expense-results" aria-live="polite">${expenseResults()}</div></details>`;
}
function expenseResults() {
  const rows = expenseRows(visibleData(), year, month, { query: expenseQuery, category: expenseCategory, status: expenseFilterStatus });
  return `<p class="search-summary">${rows.length} giao dịch · Tổng tiền thực chi tháng ${money(periodCash().actualCashOut)} · Tín dụng phát sinh ${money(periodCash().creditTotal)}</p><div class="expense-search-list">${rows.map(item => `<article class="expense-result"><button data-open-day="${item.date}"><time>${item.date.split('-').reverse().join('/')}</time><span><strong translate="no">${escape(item.title || 'Chưa đặt tên')}</strong><small>${sourceName(accountSource(item))} · ${escape(categoryOf(item))} · ${expenseStatus(item)==='cancelled'?'Đã hủy':expenseStatus(item)==='paid'?(item.paymentMethod==='card'?'Đã phát sinh tín dụng':'Đã thanh toán'):'Dự kiến'}</small></span><strong data-money-kind="${moneyKind(item)}">${money(item.amount)}</strong></button>${!protectedExpense(item)&&!isExpenseDraft(item.date,item)?`<button class="text-button edit-expense" data-edit-expense="${escape(item.id)}" data-expense-date="${item.date}">Sửa nội dung</button>`:protectedExpense(item)?`<small class="linked-note">${item.debtPaymentId?'Sửa/hủy trong Khoản vay khác.':item.obligationId?'Sửa/hủy trong Nền tảng an toàn.':item.legacyTransferId?'Chuyển nguồn nội bộ.':'Sửa/hủy trong Thẻ & sao kê.'}</small>`:'<small class="linked-note">Bản nháp chưa được xác nhận lưu.</small>'}</article>`).join('') || '<p>Không có khoản chi khớp bộ lọc.</p>'}</div>`;
}
function yearView() {
  return `<section class="card annual-months"><div class="card-heading"><div><h2>Xem riêng từng tháng</h2><p>Chọn tháng để xem tổng thu, chi và tiết kiệm của tháng đó.</p></div><span class="tag">${year}</span></div><div class="month-grid" aria-label="Tổng kết theo tháng">${Array.from({ length: 12 }, (_, m) => `<button class="month-card" data-open-month="${m}"><span>Tháng ${String(m + 1).padStart(2, '0')}</span>${icon('arrow')}</button>`).join('')}</div></section>`;
}
function refreshTotals() {
  document.querySelector('#stat-dialog')?.close();
  renderCurrentWallet();
  const summary = monthSummary(visibleData(), year, month), totals = view === 'year' ? yearSummary(visibleData(), year) : summary;
  const accounts=document.querySelector('#accounts-overview');if(accounts)accounts.innerHTML=accountsPanel(actualView(),selectedKey(),hasCreditAccess());
  const overview = document.querySelector('#cashflow-overview'); if (overview) overview.innerHTML = salaryTimeline(actualData(), monthKey(year,month));
  document.querySelector('.stats').innerHTML = statsContent(totals);
  if(document.querySelector('#budget-warnings'))document.querySelector('#budget-warnings').innerHTML=budgetWarnings(actualView(),monthKey(year,month));
  document.querySelector('#dashboard-charts').innerHTML = dashboardCharts();
  const progress = document.querySelector('#savings-progress'); if (progress) progress.innerHTML = savingsProgressContent();
  const cumulative=document.querySelector('#savings-cumulative');if(cumulative)cumulative.innerHTML=savingsCumulativeContent();
  if (view === 'year') return;
  document.querySelector('#day-money-out').textContent=money(cashDayDetails(actualData(),selectedKey(),{creditAllowed:hasCreditAccess()}).actualCashOut);
  document.querySelector('#day-total').textContent = money(cashDayDetails(actualData(),selectedKey(),{creditAllowed:hasCreditAccess()}).actualCashOut);
  document.querySelector('#day-planned-total').textContent = money(cashDayDetails(actualData(),selectedKey(),{creditAllowed:hasCreditAccess()}).plannedTotal);
  if(document.querySelector('#income-total'))document.querySelector('#income-total').textContent = money(summary.salary + summary.bonus);
  document.querySelector('.calendar-panel').outerHTML = calendarPanel();
  document.querySelector('#expense-results').innerHTML = expenseResults();
}
root.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if(button.dataset.action==='withdraw-savings'){if(canEdit()&&moduleEnabled(data,'receipts'))showCashEntry(financeContext(),localToday(),'withdrawSavings');return;}
  if(button.dataset.action==='current-wallet-settings'){if(canEdit())showBalanceRequest(financeContext(),localToday());return;}
  if(button.dataset.action==='wallet-manage'){if(!canEdit())return;view='calendar';ledgerExpanded=true;render();focusEditor('#ledger-tools>summary');return;}

  if(button.dataset.statDetails){
    if(!canEdit())return;
    const context=financeContext(),period={year,month:view==='year'?null:month},requestedView=view;
    period.selectedDate=selectedKey();
    await context.verifyCreditAccess();
    if(!context.canEdit()||view!==requestedView||year!==period.year||period.month!==null&&month!==period.month||selectedKey()!==period.selectedDate)return;
    if(button.dataset.statDetails==='credit'&&!context.canUseCredit())return;
    showStatsDialog(context,button.dataset.statDetails,period);return;
  }
  if(button.dataset.editExpense){if(canEdit())showExpenseDialog(financeContext(),button.dataset.expenseDate,button.dataset.editExpense,expenseEditor);return;}
  if(button.dataset.safetyAction){if(!canEdit()||!moduleEnabled(data,'safety'))return;if(button.dataset.safetyAction==='payDebt'){openDebtDialog(button.dataset.safetyId);return;}showSafetyDialog(financeContext(),button.dataset.safetyAction,button.dataset.safetyId||'',selectedKey());return;}
  if(button.dataset.region){if(!canEdit()||cloud.inFlight||!availableRegions(cloud.data).includes(button.dataset.region))return;document.querySelectorAll('dialog').forEach(d=>d.close());regionEpoch++;activeRegion=button.dataset.region;data=readBook(cloud.data,activeRegion);view='calendar';expenseQuery='';expenseCategory='';render();return;}
  if(button.dataset.editReceipt){if(moduleEnabled(data,'receipts'))showCashEntry(financeContext(),selectedKey(),'editReceipt',button.dataset.editReceipt);return;}
  if(button.dataset.editReceivable){if(moduleEnabled(data,'receivables'))showCashEntry(financeContext(),selectedKey(),'editLoan',button.dataset.editReceivable);return;}
  if(button.dataset.removeReceivable){if(moduleEnabled(data,'receivables'))showCashEntry(financeContext(),selectedKey(),'removeLoan',button.dataset.removeReceivable);return;}
  if(button.dataset.removeReceipt){if(moduleEnabled(data,'receipts'))showCashEntry(financeContext(),selectedKey(),'remove',button.dataset.removeReceipt);return;}
  if ((button.dataset.delete !== undefined || ['add-debt', 'add', 'quick-expense', 'quick-income', 'quick-savings', 'add-year', 'remove-year', 'import', 'export', 'backup', 'save', 'cloud-remote', 'cloud-retry'].includes(button.dataset.action)) && !canEdit()) return;
  if(button.dataset.view==='credit'||button.dataset.creditAction||button.dataset.creditMonth||['current-paypay','paypay-available'].includes(button.dataset.action))return;
  if(button.dataset.removeTransfer){showAccountLedger(financeContext(),'delete',decodeURIComponent(button.dataset.removeTransfer));return;}
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
  if(button.dataset.delete!==undefined&&isCreditItem(currentDay().items[+button.dataset.delete]||{})){
    const item=currentDay().items[+button.dataset.delete],region=activeRegion,actor=cloud.user?.id,date=selectedKey();
    if(!await refreshCreditRole(true)||region!==activeRegion||actor!==cloud.user?.id||date!==selectedKey()||currentDay().items[+button.dataset.delete]!==item)return;
  }
  if (button.dataset.delete !== undefined) { if (!isExpenseDraft(selectedKey(),currentDay().items[+button.dataset.delete]||{}) || !visibleData().days[selectedKey()]?.items.includes(currentDay().items[+button.dataset.delete]) || (!canUseCredit() && isCreditItem(currentDay().items[+button.dataset.delete]||{})) || currentDay().items[+button.dataset.delete]?.obligationId || currentDay().items[+button.dataset.delete]?.debtPaymentId || currentDay().items[+button.dataset.delete]?.cardFeeMonth || currentDay().items[+button.dataset.delete]?.cardPaymentMonth) return; delete cloud.expenseInputs[expenseInputKey(selectedKey(),currentDay().items[+button.dataset.delete])];ensureDay().items.splice(+button.dataset.delete, 1); persist(); render(); }
  switch (button.dataset.action) {
    case 'theme': display.theme = display.theme === 'dark' ? 'light' : 'dark'; saveDisplay(display); render(); break;
    case 'safety-receivables': if(!moduleEnabled(data,'receivables')){notify('Bật Khoản phải thu trong Quốc gia & chức năng.');break;}view='calendar';render();focusEditor('.receivables-panel');break;
    case 'region-settings': showRegionSettings(financeContext(),activeRegion);break;
    case 'manage-regions': showRegionManager(financeContext());break;
    case 'remove-region': showRegionManager(financeContext(),activeRegion);break;
    case 'add-receipt': if(moduleEnabled(data,'receipts'))showCashEntry(financeContext(),selectedKey(),'receipt');break;
    case 'add-receivable': if(moduleEnabled(data,'receivables'))showCashEntry(financeContext(),selectedKey(),'receivable');break;
    case 'settings': showSettings(financeContext(), display, next => { display = next; saveDisplay(display); setLanguage(display.language); render(); }); break;
    case 'reconcile-month': {
      const bank=document.querySelector('[data-closing=bank]'),cash=document.querySelector('[data-closing=cash]');
      if(!bank||!cash)break;
      bank.required=cash.required=true;if(!bank.reportValidity()||!cash.reportValidity())break;
      try{showMonthReconciliation(financeContext(),selectedKey(),{bank:bank.value,cash:cash.value,...(document.querySelector('[data-closing=savings]')?{savings:document.querySelector('[data-closing=savings]').value}:{})});}catch(error){notify(error.message);}break;
    }
    case 'account-balances': showBalanceRequest(financeContext(),selectedKey()); break;
    case 'savings-opening': showSavingsOpening(financeContext(),selectedKey());break;
    case 'account-transfer': showAccountLedger(financeContext(),'transfer'); break;
    case 'save': await saveChanges(); break;
    case 'add-debt': openDebtDialog(); break;
    case 'add-year': showYearDialog(); break;
    case 'remove-year': {
      if (years().length <= 1 || !ask(`Xóa năm ${year} khỏi danh sách? Dữ liệu được giữ lại và sẽ xuất hiện khi thêm lại năm này.`)) break;
      removeYear(data, year); year = years().find(value => value >= year) || years().at(-1); day = Math.min(day, daysInMonth(year, month)); persist(); render(); break;
    }
    case 'quick-expense': view = 'calendar'; ensureDay().items.push(newExpense()); persist(); render(); focusEditor(`.expense-entry[data-item="${currentDay().items.length-1}"] [data-field=title]`); break;
    case 'quick-income': view = 'calendar'; render(); focusEditor('[data-income="salary"]'); break;
    case 'quick-savings': view = 'calendar'; render(); focusEditor('#monthly-savings'); break;
    case 'account': showAccount(); break;
    case 'register': if (!cloud.user) showAccount('signup'); break;
    case 'cloud-retry': await cloud.refresh({checkDraft:true}); break;
    case 'cloud-remote': {
      if (!ask('Thay bản nháp trên máy bằng dữ liệu đám mây? Hãy xuất dữ liệu trước nếu cần giữ bản nháp.')) break;
      try { await cloud.useRemote(); } catch (error) { notify(error.message); }
      break;
    }
    case 'add': ensureDay().items.push(newExpense()); persist(); render(); document.querySelector(`.expense-entry[data-item="${currentDay().items.length-1}"] [data-field=title]`)?.focus(); break;
    case 'prev': case 'next': {
      const direction = button.dataset.action === 'next' ? 1 : -1;
      let targetMonth = month + direction, index = years().indexOf(year);
      if (targetMonth < 0) { index--; targetMonth = 11; }
      if (targetMonth > 11) { index++; targetMonth = 0; }
      if (index < 0 || index >= years().length) return;
      year = years()[index]; month = targetMonth; day = Math.min(day, daysInMonth(year, month)); render(); break;
    }
    case 'today': {
      const actual=new Date(localToday()+'T12:00:00');
      if (!years().includes(actual.getFullYear())) { notify('Thêm năm hiện tại để xem hôm nay.'); break; }
      year = actual.getFullYear(); month = actual.getMonth(); day = actual.getDate(); render(); break;
    }
    case 'export': {
      const context=financeContext();
      showExportDialog({...context,getDocument:()=>{context.getData();return fullDocument();},getConfirmedDocument:()=>{context.getData();return cloud.confirmedData||emptyData();},waitForEdits:()=>Promise.all([...pendingExpenseEdits]),isDirty:()=>cloud.dirty},selectedKey());
      break;
    }
    case 'backup': {
      const context=financeContext();
      await Promise.all([...pendingExpenseEdits]);
      if(context.canEdit())downloadFile(JSON.stringify(fullDocument(),null,2),`lich-cua-toi-${selectedKey()}.json`,'application/json');
      break;
    }
    case 'import': document.querySelector('#import-file').click(); break;
  }
});
root.addEventListener('input', event => {
  const pending=handleInput(event);pendingExpenseEdits.add(pending);
  pending.catch(error=>notify(error.message)).finally(()=>pendingExpenseEdits.delete(pending));
});
async function handleInput(event) {
  if (!canEdit()) return;
  const target = event.target;
  if (target.id === 'expense-search') { expenseQuery = target.value; document.querySelector('#expense-results').innerHTML = expenseResults(); return; }
  if(target.dataset.field&&['date','month'].includes(target.type))target.setCustomValidity('');
  if (['date','month'].includes(target.type) && !target.checkValidity()) {rememberExpenseInput(target);return;}
  if (target.hasAttribute('data-money')) {
    const value = target.value.trim();
    target.setCustomValidity(value && !/^\d[\d,]*(?:\.\d{0,3})?$/.test(value) ? 'Nhập số tiền dạng 1,000,000; có thể nhập tối đa 3 chữ số thập phân.' : Number(value.replace(/,/g, '')) > MAX_AMOUNT ? 'Số tiền vượt giới hạn cho phép.' : '');
    if(target.validity.valid&&value){try{const legacy=target.dataset.field==='amount'?currentDay().items[+target.closest('[data-item]').dataset.item]?.amount:target.dataset.income?data.incomes[monthKey(year,month)]?.[target.dataset.income]:target.id==='monthly-savings'?data.savings[monthKey(year,month)]:target.id==='annual-savings-goal'?data.goals[year]:undefined;wholeCurrencyMoney(Number(value.replace(/,/g,'')),data.currencies?.[target.id==='monthly-savings'||target.id==='annual-savings-goal'?'savings':'cash']||'JPY',legacy);}catch(error){target.setCustomValidity(error.message);}}
    if (!target.validity.valid) {rememberExpenseInput(target);return;}
  }
  if (target.id === 'monthly-savings') { data.savings[monthKey(year, month)] = amount(target.value); persist(); refreshTotals(); }
  if (target.id === 'annual-savings-goal') { data.goals[year] = amount(target.value); persist(); refreshTotals(); }
  if (target.id === 'day-note') { ensureDay().note = target.value; persist(); document.querySelector('.calendar-panel').outerHTML = calendarPanel(); }
  if (target.dataset.field) {
    const item = ensureDay().items[+target.closest('[data-item]').dataset.item];
    if(item&&(isCreditItem(item)||['settlement','billingMonth'].includes(target.dataset.field)||target.dataset.field==='paymentMethod'&&target.value==='card')){
      rememberExpenseInput(target);
      const user=cloud.user?.id;
      if(!await refreshCreditRole(true)||user!==cloud.user?.id||currentDay().items[+target.closest('[data-item]').dataset.item]!==item)return;
    }
    if (!item || !isExpenseDraft(selectedKey(),item) || !visibleData().days[selectedKey()]?.items.includes(item) || (!canUseCredit() && isCreditItem(item)) || item.debtPaymentId || item.cardFeeMonth || item.cardPaymentMonth || item.obligationId) return;
    const rawKey=expenseInputKey(selectedKey(),item), rawFields=cloud.expenseInputs[rawKey];
    if(rawFields){delete rawFields[target.dataset.field];if(!Object.keys(rawFields).length)delete cloud.expenseInputs[rawKey];}
    if(target.dataset.field==='fundId'){const f=data.safety?.funds.find(f=>f.id===target.value&&!f.archived);if(target.value&&!f)return;if(f){item.fundId=f.id;item.paymentMethod=f.source;delete item.creditTracking;delete item.creditPeriod;delete item.settlement;delete item.billingMonth;delete item.movement;}else delete item.fundId;persist();render();return;}
    if(target.dataset.field==='movement'){if(item.fundId&&target.value){notify('Bỏ quỹ trước khi chuyển nguồn nội bộ.');render();return;}
      if(target.value){delete item.creditTracking;delete item.creditPeriod;item.movement=target.value;item.paymentMethod=target.value==='withdraw'?'bank':'cash';item.status='paid';item.category='Chuyển tiền nội bộ';if(!item.title||['Rút tiền mặt','Nạp tiền vào ngân hàng'].includes(item.title))item.title=target.value==='withdraw'?'Rút tiền mặt':'Nạp tiền vào ngân hàng';delete item.settlement;delete item.billingMonth;}
      else {delete item.movement;item.category='Khác';if(['Rút tiền mặt','Nạp tiền vào ngân hàng'].includes(item.title))item.title='';}
      persist();render();return;
    }
    if(target.dataset.field==='paymentMethod'&&(isInternalMovement(item)||item.fundId))return;
    if (target.dataset.field === 'paymentMethod') {
      if(target.value==='savings'&&data.accounts?.savings===undefined)return;
      if(target.value==='card'&&!canUseCredit())return;
      item.paymentMethod=target.value;if(target.value==='card'){item.creditTracking=true;delete item.settlement;delete item.billingMonth;delete item.creditPeriod;}else{delete item.creditTracking;delete item.settlement;delete item.billingMonth;}
      persist(); render(); return;
    }
    item[target.dataset.field] = target.dataset.field === 'amount' ? amount(target.value) : target.value;
    if(target.dataset.field==='category'&&!isCardPaymentCategory(target.value)||target.dataset.field==='creditPeriod'&&!target.value)delete item.creditPeriod;
    persist();if(target.dataset.field==='category'){render();return;}refreshTotals();
  }
  if (target.dataset.income) {
    if(!moduleEnabled(data,'salary'))return;
    ensureIncome()[target.dataset.income] = ['note','earnedMonth','receivedOn','account','status'].includes(target.dataset.income) ? target.value : amount(target.value);
    if(target.dataset.income==='receivedOn'&&target.value>localToday()){ensureIncome().status='planned';const state=document.querySelector('[data-income=status]');if(state)state.value='planned';}
    persist(); refreshTotals();
  }
}
root.addEventListener('change', async event => {
  if (!canEdit()) return;
  const target = event.target;
  if (target.id === 'expense-category' || target.id === 'expense-status') { expenseCategory = document.querySelector('#expense-category').value; expenseFilterStatus = document.querySelector('#expense-status').value; document.querySelector('#expense-results').innerHTML = expenseResults(); return; }
  if (target.dataset.debtPay) { target.checked = false; openDebtDialog(target.dataset.debtPay); return; }
  if(target.id==='safety-date'){if(target.reportValidity()&&target.value){const [y,m,d]=target.value.split('-').map(Number);if(!years().includes(y)){notify('Thêm năm vào sổ trước khi xem ngày này.');return;}year=y;month=m-1;day=d;render();}return;}
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
      if(!hasCreditAccess()&&creditDocument(imported)!==creditDocument(cloud.data))throw Error('Chức năng Thẻ & sao kê chỉ dành cho admin.');
      cloud.save(imported);data=readBook(imported,activeRegion);
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
  if(event.target.classList.contains('current-wallet-disclosure'))walletExpanded=event.target.open;
  if(event.target.id==='ledger-tools')ledgerExpanded=event.target.open;
  if (event.target.classList.contains('calendar-disclosure')) calendarExpanded = event.target.open;
  if (event.target.classList.contains('analysis-panel')) analysisExpanded = event.target.open;
  if (event.target.classList.contains('expense-browser')) searchExpanded = event.target.open;
}, true);
const authClient = new SupabaseClient(supabaseConfig, localStorage);
const cloud = new SyncController(authClient, localStorage, {
  onConfirmed: updateConfirmedExpenses,
  onData: next => {
    if(regionUser!==cloud.user?.id){regionUser=cloud.user?.id||null;activeRegion='foreign';}
    if(!availableRegions(next).includes(activeRegion)){
      document.querySelectorAll('dialog').forEach(d=>d.close());regionEpoch++;
      activeRegion=availableRegions(next)[0];view='calendar';expenseQuery='';expenseCategory='';
    }
    data = readBook(next,activeRegion); creditWritePending=false;
    syncAccountProfile(); syncCreditRole(); render();

  }, onStatus: () => { syncAccountProfile(); syncCreditRole(); renderCloud(); queueMicrotask(maybeChooseCurrencies); },
});


function maybeChooseCurrencies() {
  if (!canEdit() || currencyPromptUser === cloud.user.id || data.bookSettings || !needsCurrencySetup(data)) return;
  currencyPromptUser = cloud.user.id;
  showRegionSettings(financeContext(),activeRegion);
}
async function refreshAccountIdentity() {
  const userId = cloud.user?.id;
  if (!userId) return;
  const [user, profile] = await Promise.all([authClient.user(), authClient.profile()]);
  if (cloud.user?.id !== userId || user.id !== userId) return;
  cloud.user = user; accountProfile = profile; profileUserId = userId;
  render();
}
function syncAccountProfile() {
  const id = cloud.user?.id || null;
  if (profileUserId === id) return;
  if (profileUserId && profileUserId !== id) document.querySelectorAll('#profile-dialog,#admin-dialog,#settings-dialog,#credit-dialog,#credit-limit-dialog,#debt-dialog,#ledger-dialog,#reconcile-dialog,#region-dialog,#cash-entry-dialog,#savings-opening-dialog,#safety-dialog,#expense-dialog,#opening-dialog,#export-dialog,#stat-dialog,#reset-dialog').forEach(dialog => dialog.close());
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
  renderCurrentWallet();
  if (!document.querySelector('#account-label')) return;
  const labels = { guest: 'Chưa đăng nhập', loading: 'Đang kết nối…', draft: 'Chưa lưu thay đổi', pending: 'Chờ đồng bộ', saving: 'Đang lưu…', ready: '', error: 'Chưa đồng bộ', conflict: 'Cần xử lý thay đổi' };
  document.querySelector('#account-label').textContent = cloud.user ? 'Tài khoản' : 'Đăng nhập';
  document.querySelectorAll('[data-action="account"]').forEach(button => button.disabled = cloud.status === 'loading');
  document.querySelector('[data-action="register"]').hidden = Boolean(cloud.user) || cloud.status === 'loading';
  document.querySelector('[data-action="import"]').disabled = !canEdit();
  document.querySelector('[data-action="export"]').disabled = !canEdit();
  document.querySelector('.page').inert = !canEdit();
  document.querySelectorAll('.page input, .page textarea, .page select, .page [data-action="add"], .page [data-action="add-year"], .page .quick-grid button, .page [data-delete], .page [data-stat-details]').forEach(input => input.disabled = !canEdit() || input.hasAttribute('data-debt-linked') || input.hasAttribute('data-debt-complete') || input.hasAttribute('data-movement-source') || input.hasAttribute('data-fund-source'));
  const removeYearButton = document.querySelector('[data-action="remove-year"]');
  if (removeYearButton) removeYearButton.disabled = !canEdit() || years().length <= 1;
  document.querySelector('[data-action="save"]').hidden = !cloud.user;
  document.querySelector('[data-action="save"]').disabled = !canEdit() || !cloud.dirty || cloud.conflicted;
  document.querySelector('#storage-description').textContent = cloud.user ? [`${currencyLabel()} / ${currencyLabel('savings')}`, labels[cloud.status]].filter(Boolean).join(' · ') : 'Đăng nhập để nhập và lưu dữ liệu';
  document.querySelector('.local-badge').hidden = cloud.status === 'ready';
  document.querySelector('.local-badge').innerHTML = `${icon('check')} ${labels[cloud.status]}`;
  let message = '', actions = '';
  if (['error', 'conflict'].includes(cloud.status)) {
    message = escape(cloud.message);
    actions = cloud.status === 'conflict' ? '<button data-action="backup">Sao lưu bản nháp JSON</button><button data-action="cloud-remote">Tải bản đám mây</button>' : `${cloud.user?'<button data-action="backup">Sao lưu bản nháp JSON</button>':''}<button data-action="${cloud.user ? 'cloud-retry' : 'account'}">${cloud.user ? 'Thử đồng bộ lại' : 'Đăng nhập'}</button>`;
  } else if (cloud.status === 'loading') message = 'Đang tải dữ liệu tài khoản. Vui lòng chờ trước khi chỉnh sửa.';
  document.querySelector('#cloud-notice').innerHTML = message ? `<div class="cloud-notice ${['error', 'conflict'].includes(cloud.status) ? 'cloud-warning' : ''}"><span>${message}</span><div>${actions}</div></div>` : '';
}

function financeContext() {
  const region=activeRegion, actor=cloud.user?.id, epoch=cloud.epoch,scope=regionEpoch;
  const check=()=>{if(region!==activeRegion||actor!==cloud.user?.id||epoch!==cloud.epoch||scope!==regionEpoch)throw Error('Khu vực hoặc tài khoản đã thay đổi.');};
  return {getData:()=>{check();return data;},getActualData:()=>{check();return actualData();},getFinanceData:()=>{check();return visibleData();},getDocument:()=>{check();return cloud.data;},getUserId:()=>cloud.user?.id,canEdit:()=>scope===regionEpoch&&region===activeRegion&&actor===cloud.user?.id&&epoch===cloud.epoch&&canEdit(),canUseCredit,hasCreditAccess,isExpenseConfirmed:(date,item)=>{check();return !isExpenseDraft(date,item);},verifyCreditAccess:()=>refreshCreditRole(true),
    setRegionVisible:async(key,visible)=>{check();if(cloud.inFlight||cloud.dirty)throw Error('Hãy lưu bản nháp thành công trước khi thay đổi danh sách khu vực.');await cloud.commitConfirmed(setRegionVisible(cloud.data,key,visible));},
    openIncomeMonth:date=>{check();if(!moduleEnabled(data,'salary'))return;const [y,m]=date.split('-').map(Number);if(!years().includes(y)){addYear(data,y);persist();}year=y;month=m-1;day=1;view='calendar';render();focusEditor('[data-income="salary"]');},
    onChange:next=>{check();const previous=data;data=next;if(!persist()){data=previous;throw Error('Chưa lưu được thay đổi.');}render();},
    commitConfirmed:async next=>{check();validateSpendingSources(data,next);validateActualDates(data,next,localToday());validateMoneyChanges(data,next);validateCreditEdits(data,next);const combined=writeBook(cloud.data,region,next);if(!hasCreditAccess()&&creditDocument(combined)!==creditDocument(cloud.data))throw Error('Chức năng Thẻ & sao kê chỉ dành cho admin.');await cloud.commitConfirmed(combined);},
    getUserLabel:()=>{check();return cloud.user?.email||actor;},
    getRegionLabel:()=>{check();return region==='vietnam'?'Việt Nam':'Nước ngoài';},
    openReset:()=>{check();showResetDialog(financeContext());},
    resetDocument:async(next,start)=>{check();if(creditDocument(next)!==creditDocument(cloud.data)&&!hasCreditAccess())throw Error('Cần quyền admin đã xác minh để xóa dữ liệu tín dụng cũ.');document.querySelectorAll('dialog:not(#reset-dialog)').forEach(d=>d.close());await cloud.resetConfirmed(next);regionEpoch++;[year,month,day]=start.split('-').map(Number);month--;view='calendar';expenseQuery='';expenseCategory='';data=readBook(cloud.data,activeRegion);render();},
    commit:()=>{check();return cloud.commit();},getStatus:()=>cloud.status};
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
    profileButton.onclick = () => { dialog.close(); showProfile(authClient, { ...cloud.user, ...accountProfile }, refreshAccountIdentity); };
    const adminButton = document.createElement('button'); adminButton.className = 'account-submit'; adminButton.textContent = 'Quản lý tài khoản'; adminButton.hidden = true;
    dialog.querySelector('#sign-out').before(adminButton);
    adminButton.onclick = () => { dialog.close(); showAdmin(authClient, userId, refreshAccountIdentity); };
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
window.addEventListener('focus', () => { renderCurrentWallet();refreshActualDay();if (cloud.user) void refreshCreditRole(true); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderCurrentWallet();refreshActualDay();cloud.refresh(); if (cloud.user) void refreshCreditRole(true); } });
walletMedia.addEventListener('change',event=>{walletExpanded=event.matches;renderCurrentWallet();});
setInterval(() => { if(!document.hidden){renderCurrentWallet();refreshActualDay();}if (!document.hidden && cloud.user && cloud.status !== 'loading') { if (!cloud.dirty) cloud.refresh(); void refreshCreditRole(true); } }, 30000);
window.addEventListener('beforeunload', event => { if (cloud.user && cloud.dirty) { event.preventDefault(); event.returnValue = ''; } });
