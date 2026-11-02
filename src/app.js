import { YEARS, MAX_AMOUNT, amount, dayKey, monthKey, daysInMonth, dayTotal, monthSummary, yearSummary, savingsProgress, emptyData, normalizeData } from './model.js';

// Keep the original key so existing browser data is migrated by normalizeData.
const STORAGE_KEY = 'lich-cua-toi.v1';
const money = number => new Intl.NumberFormat('vi-VN').format(number) + ' ₫';
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
let data = emptyData(), storageError = '', savedTimer;
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) data = normalizeData(JSON.parse(stored));
} catch { storageError = 'Không đọc được dữ liệu đã lưu. Hãy xuất bản sao lưu trước khi nhập thêm; dữ liệu cũ chưa bị ghi đè.'; }
const root = document.querySelector('#app');
const selectedKey = () => dayKey(year, month, day);
const currentDay = () => data.days[selectedKey()] || { note: '', items: [] };
function ensureDay() { return data.days[selectedKey()] ||= { note: '', items: [] }; }
function ensureIncome() { return data.incomes[monthKey(year, month)] ||= { salary: 0, bonus: 0, note: '' }; }
function notify(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('visible');
  clearTimeout(savedTimer); savedTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}
function persist() {
  if (storageError) { notify('Chưa lưu: cần khôi phục dữ liệu từ bản sao lưu hoặc tải lại trang.'); return false; }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
  catch { notify('Không thể lưu trên trình duyệt. Hãy xuất dữ liệu để tránh mất thay đổi.'); return false; }
}
function render() {
  const totals = yearSummary(data, year);
  root.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="Lịch của tôi">${icon('calendar')}<span>Lịch của tôi<span class="brand-sub">CHI TIÊU & THU NHẬP</span></span></a>
      <div class="workspace-label">KHÔNG GIAN CÁ NHÂN</div>
      <nav aria-label="Điều hướng chính">
        <button class="nav-item ${view === 'calendar' ? 'active' : ''}" data-view="calendar">${icon('calendar')} Lịch chi tiêu</button>
        <button class="nav-item ${view === 'year' ? 'active' : ''}" data-view="year">${icon('chart')} Tổng kết năm</button>
      </nav>
      <div class="year-heading"><span>KẾ HOẠCH THEO NĂM</span><span>08</span></div>
      <div class="years">${YEARS.map(y => `<button class="year-button ${year === y ? 'selected' : ''}" data-year="${y}" aria-pressed="${year === y}"><span><i></i>${y}</span>${year === y ? icon('arrow') : ''}</button>`).join('')}</div>
      <div class="sidebar-bottom"><div class="local-badge">${icon('check')} Dữ liệu lưu trên thiết bị</div><p>Một chút kế hoạch hôm nay.<br>Thảnh thơi hơn ngày mai.</p><div class="profile"><span class="avatar">T</span><div>Tài chính của tôi<small>Không gian riêng của bạn</small></div></div></div>
    </aside>
    <main>
      <header class="topbar"><div class="breadcrumb">Không gian cá nhân <span>/</span> <strong>${view === 'calendar' ? 'Lịch chi tiêu' : 'Tổng kết năm'}</strong></div><div class="top-actions"><span class="saved-label">${icon('check')} Lưu tự động</span><button class="button secondary small" data-action="export">${icon('down')} Xuất dữ liệu</button><button class="icon-button" title="Nhập bản sao lưu JSON" aria-label="Nhập bản sao lưu JSON" data-action="import">${icon('up')}</button><input type="file" id="import-file" accept="application/json,.json" hidden /></div></header>
      <div class="page">
        ${storageError ? `<div class="warning" role="alert">${escape(storageError)}</div>` : ''}
        <div class="page-heading"><div><div class="eyebrow">KẾ HOẠCH NHỎ · CUỘC SỐNG LỚN</div><h1>${view === 'calendar' ? 'Chủ động từng khoản chi' : `Nhìn lại năm ${year}`}<span class="heading-dot">.</span></h1><p>${view === 'calendar' ? 'Ghi lại điều cần mua, sắp xếp chi tiêu và dành chỗ cho những điều quan trọng.' : 'Lương, thưởng và mọi khoản chi — tất cả trong một bức tranh rõ ràng.'}</p></div><div class="year-select-wrap">${icon('calendar')}<select id="year-select" aria-label="Chọn năm">${YEARS.map(y => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></div></div>
        <div class="stats">
          ${stat('wallet', 'Tổng lương', totals.salary, 'Thu nhập cố định trong năm', 'green')}
          ${stat('spark', 'Tổng thưởng', totals.bonus, 'Những khoản thu thêm', 'amber')}
          ${stat('down', 'Tổng cần chi', totals.expense, `${totals.count} khoản chi đã lên kế hoạch`, 'orange')}
          ${stat('chart', 'Còn lại dự kiến', totals.balance, `Sau chi tiêu & tiết kiệm · Năm ${year}`, 'blue')}
        </div>
        ${savingsPanel()}
        ${view === 'calendar' ? calendarView() : yearView()}
        <footer><span>${icon('calendar')} Lịch của tôi <span class="footer-divider">/</span> Cho những kế hoạch của bạn</span><span>Đơn vị: VNĐ · Dữ liệu chỉ lưu trong trình duyệt này</span></footer>
      </div>
    </main>`;
}
function stat(symbol, label, value, detail, color) {
  return `<section class="stat"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}">${icon(symbol)}</span></div><strong class="${value < 0 ? 'negative' : ''}">${money(value)}</strong><small>${detail}</small></section>`;
}
function savingsPanel() {
  return `<section class="card savings-panel" aria-label="Kế hoạch tiết kiệm"><div class="card-heading"><div class="income-heading"><span class="stat-icon green">${icon('spark')}</span><div><h2>Dành cho những dự định lớn</h2><p>Góp từng tháng, tiến gần hơn đến mục tiêu năm ${year}.</p></div></div><span class="tag">TIẾT KIỆM</span></div>
    <div class="savings-layout"><div class="savings-inputs">
      ${view === 'calendar' ? `<label for="monthly-savings">Tiết kiệm tháng ${String(month + 1).padStart(2, '0')} <span>VNĐ</span><input id="monthly-savings" type="number" inputmode="numeric" min="0" max="${MAX_AMOUNT}" step="1" placeholder="0" value="${amount(data.savings[monthKey(year, month)]) || ''}" /></label>` : ''}
      <label for="annual-savings-goal">Mục tiêu tiết kiệm năm ${year} <span>VNĐ</span><input id="annual-savings-goal" type="number" inputmode="numeric" min="0" max="${MAX_AMOUNT}" step="1" placeholder="Nhập mục tiêu của bạn" value="${amount(data.goals[year]) || ''}" /></label>
    </div><div id="savings-progress">${savingsProgressContent()}</div></div>
    <p class="savings-hint">Nhập số tiền bạn dành riêng để tiết kiệm mỗi tháng. Còn lại dự kiến = lương + thưởng − chi tiêu − tiết kiệm.</p></section>`;
}
function savingsProgressContent() {
  const progress = savingsProgress(data, year);
  const percent = Math.min(100, progress.percent);
  return `<div class="savings-progress-heading"><span>Đã tiết kiệm trong năm</span><strong id="year-savings-total">${money(progress.saved)}</strong></div>
    <div class="savings-progress-track" role="progressbar" aria-label="Tiến độ tiết kiệm năm ${year}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-valuetext="${progress.goal ? `${progress.percent}% mục tiêu, đã tiết kiệm ${money(progress.saved)}` : 'Chưa đặt mục tiêu'}"><span style="width:${percent}%"></span></div>
    <div class="savings-progress-caption"><strong>${progress.goal ? `${progress.percent}% mục tiêu` : 'Chưa đặt mục tiêu'}</strong><span>${!progress.goal ? 'Đặt mục tiêu để theo dõi tiến độ' : progress.remaining ? `Còn thiếu ${money(progress.remaining)}` : 'Đã đạt mục tiêu năm!'}</span></div>`;
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
  return `<section class="card calendar-panel"><div class="card-heading"><div><h2>Tháng ${String(month + 1).padStart(2, '0')} <span class="muted">/ ${year}</span></h2><p>Mỗi ngày một kế hoạch nhỏ</p></div><div class="calendar-controls"><button class="button secondary small" data-action="today">Hôm nay</button><button class="icon-button rotate" data-action="prev" aria-label="Tháng trước" ${year === 2026 && month === 0 ? 'disabled' : ''}>${icon('arrow')}</button><button class="icon-button" data-action="next" aria-label="Tháng sau" ${year === 2033 && month === 11 ? 'disabled' : ''}>${icon('arrow')}</button></div></div>
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
    <div class="income-fields"><label>Lương tháng <span>VNĐ</span><input inputmode="numeric" type="number" min="0" max="${MAX_AMOUNT}" step="1" placeholder="0" value="${amount(income.salary) || ''}" data-income="salary" /></label><label>Thưởng & thu nhập thêm <span>VNĐ</span><input inputmode="numeric" type="number" min="0" max="${MAX_AMOUNT}" step="1" placeholder="0" value="${amount(income.bonus) || ''}" data-income="bonus" /></label></div>
    <label class="income-note-label" for="income-note">Ghi chú thu nhập</label><textarea id="income-note" class="income-note" data-income="note" maxlength="20000" rows="2" placeholder="Ví dụ: Lương cơ bản, thưởng dự án, ngày nhận lương…">${escape(income.note || '')}</textarea>
    <div class="income-total"><span>Tổng thu nhập tháng</span><strong id="income-total">${money(summary.salary + summary.bonus)}</strong></div></section>`;
}
function dayPanel() {
  const entry = currentDay();
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(new Date(year, month, day));
  return `<div class="day-panel-header"><div class="eyebrow">KẾ HOẠCH TRONG NGÀY</div><h2>${String(day).padStart(2, '0')} <span>/ ${String(month + 1).padStart(2, '0')} / ${year}</span></h2><p>${weekday.charAt(0).toUpperCase() + weekday.slice(1)} <span class="day-pill">${entry.items.length} khoản chi</span></p></div>
    <div class="note-section"><label for="day-note">${icon('note')} Ghi chú của bạn</label><textarea id="day-note" maxlength="20000" placeholder="Hôm nay bạn có kế hoạch gì?\nGhi lại những điều cần nhớ…" rows="4">${escape(entry.note)}</textarea></div>
    <div class="expense-heading"><h3>Bảng chi tiêu</h3><span>VNĐ</span></div>
    <div class="expense-table-wrap"><table class="expense-table"><thead><tr><th>Nội dung cần chi</th><th>Số tiền</th><th><span class="sr-only">Thao tác</span></th></tr></thead><tbody>${entry.items.map((item, index) => `<tr data-item="${index}"><td><input aria-label="Nội dung khoản chi ${index + 1}" placeholder="Nhập nội dung…" maxlength="500" data-field="title" value="${escape(item.title)}" /></td><td><input aria-label="Số tiền khoản chi ${index + 1}" type="number" min="0" max="${MAX_AMOUNT}" step="1" inputmode="numeric" placeholder="0" data-field="amount" value="${item.amount || ''}" /></td><td><button class="delete-button" data-delete="${index}" aria-label="Xóa khoản chi ${index + 1}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>
    ${entry.items.length ? '' : `<div class="empty-expenses"><span>${icon('wallet')}</span><strong>Một ngày mới, một kế hoạch mới</strong><p>Thêm món cần mua hoặc khoản cần chi<br>để bắt đầu sắp xếp ngày của bạn.</p></div>`}
    <button class="add-expense" data-action="add">${icon('plus')} Thêm khoản chi</button>
    <div class="day-total"><span>Tổng chi trong ngày</span><strong id="day-total">${money(dayTotal(entry))}</strong></div><div class="day-hint">${icon('check')} Thay đổi được lưu tự động trên trình duyệt.<br>Xuất dữ liệu định kỳ để giữ bản sao lưu.</div>`;
}
function yearView() {
  const total = yearSummary(data, year);
  return `<section class="card annual-panel"><div class="card-heading"><div><h2>Bức tranh tài chính ${year}</h2><p>Nhấn vào tháng để xem và chỉnh sửa kế hoạch.</p></div><span class="tag">12 tháng</span></div><div class="annual-table-wrap"><table class="annual-table"><thead><tr><th>Tháng</th><th>Lương</th><th>Thưởng</th><th>Cần chi</th><th>Tiết kiệm</th><th>Còn lại</th></tr></thead><tbody>${Array.from({ length: 12 }, (_, m) => { const s = monthSummary(data, year, m); return `<tr><td><button data-open-month="${m}">Tháng ${String(m + 1).padStart(2, '0')} ${icon('arrow')}</button></td><td>${money(s.salary)}</td><td>${money(s.bonus)}</td><td>${money(s.expense)}</td><td>${money(s.savings)}</td><td class="${s.balance < 0 ? 'negative' : ''}">${money(s.balance)}</td></tr>`; }).join('')}</tbody><tfoot><tr><th>Tổng năm</th><td>${money(total.salary)}</td><td>${money(total.bonus)}</td><td>${money(total.expense)}</td><td>${money(total.savings)}</td><td class="${total.balance < 0 ? 'negative' : ''}">${money(total.balance)}</td></tr></tfoot></table></div></section>
    <section class="card annual-details"><div class="card-heading"><div><h2>Nội dung cần chi trong năm</h2><p>Tất cả các khoản đã lên kế hoạch, sắp xếp theo ngày.</p></div><span class="tag">${total.count} khoản</span></div>${annualExpenses()}</section>`;
}
function annualExpenses() {
  const rows = Object.entries(data.days).filter(([key]) => key.startsWith(`${year}-`)).sort(([a], [b]) => a.localeCompare(b)).flatMap(([key, entry]) => entry.items.map(item => ({ key, ...item })));
  if (!rows.length) return '<div class="annual-empty">Chưa có khoản chi nào trong năm này. Thêm kế hoạch từ Lịch chi tiêu để xem tổng hợp tại đây.</div>';
  return `<div class="annual-table-wrap"><table class="annual-table details-table"><thead><tr><th>Ngày</th><th>Nội dung cần chi</th><th>Số tiền</th></tr></thead><tbody>${rows.map(row => `<tr><td><button data-open-day="${row.key}">${row.key.split('-').reverse().join('/')} ${icon('arrow')}</button></td><td>${escape(row.title || 'Chưa đặt tên')}</td><td>${money(row.amount)}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="2">Tổng số tiền cần chi</th><td>${money(yearSummary(data, year).expense)}</td></tr></tfoot></table></div>`;
}
function refreshTotals() {
  const totals = yearSummary(data, year), summary = monthSummary(data, year, month);
  document.querySelector('.stats').innerHTML = stat('wallet', 'Tổng lương', totals.salary, 'Thu nhập cố định trong năm', 'green') + stat('spark', 'Tổng thưởng', totals.bonus, 'Những khoản thu thêm', 'amber') + stat('down', 'Tổng cần chi', totals.expense, `${totals.count} khoản chi đã lên kế hoạch`, 'orange') + stat('chart', 'Còn lại dự kiến', totals.balance, `Sau chi tiêu & tiết kiệm · Năm ${year}`, 'blue');
  document.querySelector('#savings-progress').innerHTML = savingsProgressContent();
  if (view === 'year') return;
  document.querySelector('.month-card.active strong').textContent = money(summary.expense);
  document.querySelector('#day-total').textContent = money(dayTotal(currentDay()));
  document.querySelector('#income-total').textContent = money(summary.salary + summary.bonus);
  document.querySelector('.calendar-panel').outerHTML = calendarPanel();
}
root.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.year) { year = +button.dataset.year; day = Math.min(day, daysInMonth(year, month)); render(); }
  if (button.dataset.month !== undefined) { month = +button.dataset.month; day = Math.min(day, daysInMonth(year, month)); render(); }
  if (button.dataset.day) { day = +button.dataset.day; render(); }
  if (button.dataset.view) { view = button.dataset.view; render(); }
  if (button.dataset.openMonth !== undefined) { month = +button.dataset.openMonth; day = Math.min(day, daysInMonth(year, month)); view = 'calendar'; render(); }
  if (button.dataset.openDay) { [year, month, day] = button.dataset.openDay.split('-').map(Number); month--; view = 'calendar'; render(); }
  if (button.dataset.delete !== undefined) { ensureDay().items.splice(+button.dataset.delete, 1); persist(); render(); }
  switch (button.dataset.action) {
    case 'add': ensureDay().items.push({ id: crypto.randomUUID(), title: '', amount: 0 }); persist(); render(); document.querySelector('.expense-table tr:last-child input')?.focus(); break;
    case 'prev': case 'next': {
      const date = new Date(year, month + (button.dataset.action === 'next' ? 1 : -1), 1);
      if (!YEARS.includes(date.getFullYear())) return;
      year = date.getFullYear(); month = date.getMonth(); day = Math.min(day, daysInMonth(year, month)); render(); break;
    }
    case 'today': {
      if (!YEARS.includes(now.getFullYear())) { notify('Hôm nay nằm ngoài giai đoạn 2026–2033.'); break; }
      year = now.getFullYear(); month = now.getMonth(); day = now.getDate(); render(); break;
    }
    case 'export': {
      if (storageError) { notify('Dữ liệu lưu bị lỗi. Bản xuất hiện tại chỉ chứa dữ liệu đang hiển thị.'); }
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `lich-cua-toi-${dayKey(year, month, day)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); break;
    }
    case 'import': document.querySelector('#import-file').click(); break;
  }
});
root.addEventListener('input', event => {
  const target = event.target;
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
  const target = event.target;
  if (target.id === 'year-select') { year = +target.value; day = Math.min(day, daysInMonth(year, month)); render(); }
  if (target.type === 'number') target.value = amount(target.value) || '';
  if (target.id === 'import-file' && target.files[0]) {
    try {
      const file = target.files[0];
      if (file.size > 10_000_000) throw new Error('Bản sao lưu phải nhỏ hơn 10 MB.');
      const imported = normalizeData(JSON.parse(await file.text()));
      if (!confirm('Nhập bản sao lưu sẽ thay thế toàn bộ dữ liệu hiện tại trên trình duyệt này. Bạn đã xuất dữ liệu cần giữ chưa?')) return;
      const previous = data, previousError = storageError;
      data = imported; storageError = '';
      if (!persist()) { data = previous; storageError = previousError; return; }
      render(); notify('Đã khôi phục dữ liệu từ bản sao lưu.');
    } catch (error) { notify(`Không thể nhập dữ liệu. ${error.message}`); }
    finally { target.value = ''; }
  }
});
render();
