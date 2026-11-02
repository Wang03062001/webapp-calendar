import { t } from './i18n.js';
import { showProfile } from './profile-ui.js';
const ask = message => globalThis.confirm(t(message));

const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const banned = user => Date.parse(user.banned_until || '') > Date.now();

export async function showAdmin(client, currentUserId, onUpdated) {
  document.querySelector('#admin-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'admin-dialog'; dialog.className = 'account-dialog admin-dialog';
  dialog.innerHTML = '<button class="dialog-close" aria-label="Đóng">×</button><div class="eyebrow">QUẢN TRỊ</div><h2>Quản lý tài khoản</h2><p>Chỉnh sửa tên/email, khóa tài khoản hoặc gửi email đặt lại mật khẩu.</p><div class="admin-users"></div><div class="admin-pagination"><button data-page="prev">← Trang trước</button><span></span><button data-page="next">Trang sau →</button></div><p class="admin-status" role="status" aria-live="polite"></p>';
  document.body.append(dialog); dialog.showModal(); dialog.querySelector('.dialog-close').onclick = () => dialog.close();
  const body = dialog.querySelector('.admin-users'), status = dialog.querySelector('.admin-status');
  let page = 1, users = [], hasMore = false, busy = false;
  function disabled(value) { busy = value; dialog.querySelectorAll('button:not(.dialog-close),input').forEach(el => el.disabled = value); }
  async function load() {
    disabled(true); status.textContent = 'Đang tải tài khoản…';
    try {
      const result = await client.adminAction({ action: 'list', page }); users = result.users; hasMore = result.has_more;
      body.innerHTML = users.length ? `<table class="admin-table"><thead><tr><th>Tên tài khoản</th><th>Email</th><th>Tên hiển thị</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${users.map((user, index) => `<tr data-user="${index}"><td><input aria-label="Tên đăng nhập ${index + 1}" maxlength="30" value="${esc(user.username)}" /></td><td><input aria-label="Email tài khoản ${index + 1}" type="email" readonly maxlength="254" value="${esc(user.email)}" /></td><td><input aria-label="Tên tài khoản ${index + 1}" maxlength="100" value="${esc(user.display_name)}" /></td><td>${user.is_admin ? 'Admin · ' : ''}${banned(user) ? 'Đang khóa' : 'Hoạt động'}${user.id === currentUserId ? '<small>Đang đăng nhập</small>' : ''}</td><td><div class="admin-row-actions"><button data-task="profile">Lưu hồ sơ</button><button data-task="update">Đổi email</button><button data-task="role" ${user.id === currentUserId ? 'data-self="true"' : ''}>${user.is_admin ? 'Thu quyền admin' : 'Cấp admin'}</button><button data-task="ban" ${user.id === currentUserId ? 'data-self="true"' : ''}>${banned(user) ? 'Mở khóa' : 'Khóa'}</button><button data-task="recovery">Đặt lại mật khẩu</button></div></td></tr>`).join('')}</tbody></table>` : '<p>Chưa có tài khoản.</p>';
      dialog.querySelector('.admin-pagination span').textContent = `Trang ${page}`; status.textContent = '';
    } catch (error) { status.textContent = error.message; }
    finally { disabled(false); pagination(); }
  }
  function pagination() {
    dialog.querySelector('[data-page="prev"]').disabled = busy || page === 1;
    dialog.querySelector('[data-page="next"]').disabled = busy || !hasMore;
    dialog.querySelectorAll('[data-self]').forEach(button => button.disabled = true);
  }
  dialog.addEventListener('click', async event => {
    const button = event.target.closest('button'); if (!button || button.disabled || busy) return;
    if (button.dataset.page) { page += button.dataset.page === 'next' ? 1 : -1; await load(); return; }
    if (!button.dataset.task) return;
    const row = button.closest('tr'), user = users[Number(row.dataset.user)], action = button.dataset.task;
    const payload = { action, user_id: user.id };
    if (action === 'update') {
      const email = row.querySelectorAll('input')[1]; if (!email.reportValidity()) return;
      showProfile(client, user, async () => { await load(); await onUpdated?.(); }); return;
    } else if (action === 'profile') { const [username,,name] = row.querySelectorAll('input'); payload.username = username.value.trim().toLowerCase(); payload.display_name = name.value.trim(); }
    else if (action === 'role') { payload.admin = !user.is_admin; if (!ask(`${payload.admin ? 'Cấp quyền admin cho' : 'Thu hồi quyền admin của'} ${user.email}?`)) return; }
    else if (action === 'ban') { payload.banned = !banned(user); if (!ask(`${payload.banned ? 'Khóa' : 'Mở khóa'} tài khoản ${user.email}?`)) return; }
    else if (!ask(`Gửi email đặt lại mật khẩu đến ${user.email}?`)) return;
    disabled(true); status.textContent = 'Đang xử lý…';
    try { await client.adminAction(payload); await load(); if (action === 'profile') await onUpdated?.(); status.textContent = action === 'recovery' ? 'Đã yêu cầu gửi email đặt lại mật khẩu.' : 'Đã cập nhật tài khoản.'; }
    catch (error) { status.textContent = error.message; }
    finally { disabled(false); pagination(); }
  });
  await load();
}

export function showPasswordReset(client) {
  const dialog = document.createElement('dialog'); dialog.className = 'account-dialog';
  dialog.innerHTML = '<button class="dialog-close" aria-label="Đóng">×</button><h2>Đặt mật khẩu mới</h2><form><label>Mật khẩu mới<input name="password" type="password" minlength="8" required autocomplete="new-password" /></label><label>Nhập lại mật khẩu<input name="confirm" type="password" minlength="8" required autocomplete="new-password" /></label><button class="account-submit" type="submit">Lưu mật khẩu mới</button></form><p role="status" aria-live="polite"></p>';
  document.body.append(dialog); dialog.showModal(); dialog.querySelector('.dialog-close').onclick = () => dialog.close();
  dialog.querySelector('form').onsubmit = async event => {
    event.preventDefault(); const form = event.target, message = dialog.querySelector('[role="status"]');
    if (form.elements.password.value !== form.elements.confirm.value) { message.textContent = 'Hai mật khẩu chưa khớp.'; return; }
    form.querySelector('button').disabled = true;
    try { await client.updatePassword(form.elements.password.value); form.reset(); form.hidden = true; message.textContent = 'Đã đổi mật khẩu. Bạn có thể đóng cửa sổ này và tiếp tục sử dụng.'; }
    catch (error) { message.textContent = error.message; }
    finally { form.querySelector('button').disabled = false; }
  };
}

export function showRecovery(client, onVerified, onBack) {
  const dialog = document.createElement('dialog'); dialog.className = 'account-dialog';
  dialog.innerHTML = '<button class="dialog-close" aria-label="Đóng">×</button><h2>Quên mật khẩu</h2><form><label>Email<input name="email" type="email" required autocomplete="email" /></label><div class="recovery-code" hidden><label>Mã trong email<input name="code" type="text" inputmode="numeric" autocomplete="one-time-code" /></label></div><button class="account-submit">Gửi mã</button></form><button type="button" class="forgot-password recovery-back">Quay lại đăng nhập</button><p role="status" aria-live="polite"></p>';
  document.body.append(dialog); dialog.showModal(); dialog.querySelector('.dialog-close').onclick = () => dialog.close();
  dialog.querySelector('.recovery-back').onclick = () => { dialog.close(); onBack?.(); };
  let sent = false;
  dialog.querySelector('form').onsubmit = async event => {
    event.preventDefault(); const form = event.target, email = form.elements.email.value.trim(), status = dialog.querySelector('[role="status"]');
    const button = form.querySelector('button'); button.disabled = true;
    try {
      if (!sent) {
        await client.requestRecovery(email); sent = true; form.elements.email.readOnly = true;
        dialog.querySelector('.recovery-code').hidden = false; form.elements.code.required = true;
        button.textContent = 'Xác nhận mã'; status.textContent = 'Mã được gửi nếu email đã đăng ký.';
      } else {
        await client.verifyRecovery(email, form.elements.code.value.trim()); dialog.close();
        await onVerified(); showPasswordReset(client);
      }
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  };
}
