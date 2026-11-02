const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function showProfile(client, user, onUpdated) {
  document.querySelector('#profile-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'profile-dialog'; dialog.className = 'account-dialog';
  dialog.innerHTML = `<button class="dialog-close" aria-label="Đóng">×</button><h2>Thông tin tài khoản</h2><p translate="no" class="current-email">${esc(user.email)}</p><form id="profile-form"><label>Tên tài khoản<input name="username" value="${esc(user.username || '')}" required pattern="[a-z][a-z0-9_]{2,29}" minlength="3" maxlength="30" autocomplete="username" /></label><label>Tên hiển thị<input name="display_name" value="${esc(user.display_name || '')}" maxlength="100" /></label><button class="account-submit">Lưu hồ sơ</button></form><hr><h3>Đổi email</h3><ol class="email-steps"><li>Xác nhận email cũ</li><li>Nhập email mới</li><li>Xác nhận email mới</li></ol><p>Email hiện tại chỉ thay đổi sau khi xác nhận email mới thành công.</p><form id="email-form"><div class="email-fields"></div><button class="account-submit">Gửi mã đến email cũ</button></form><button type="button" class="text-button email-restart" hidden>Bắt đầu lại / gửi lại mã</button><p role="status" aria-live="polite"></p>`;
  document.body.append(dialog); dialog.showModal(); dialog.querySelector('.dialog-close').onclick = () => dialog.close(); dialog.addEventListener('close',()=>dialog.remove());
  let stage = 'start', id = null, busy = false, sessionUser = client.session?.user?.id;
  const status = dialog.querySelector('[role=status]'), emailForm = dialog.querySelector('#email-form'), fields = dialog.querySelector('.email-fields'), submit = emailForm.querySelector('button'), restart = dialog.querySelector('.email-restart');
  const labels = { start:'Gửi mã đến email cũ', verify_old:'Xác nhận mã email cũ', new:'Gửi mã đến email mới', verify_new:'Xác nhận email mới và hoàn tất' };
  function showStage() {
    fields.innerHTML = stage === 'new' ? '<label>Email mới<input name="email" type="email" required maxlength="254" autocomplete="email" /></label>' : stage.startsWith('verify') ? `<label>${stage === 'verify_old' ? 'Mã từ email cũ' : 'Mã từ email mới'}<input name="code" inputmode="numeric" autocomplete="one-time-code" required pattern="[0-9]{6}" maxlength="6" /></label>` : '';
    submit.textContent = labels[stage]; restart.hidden = stage === 'start';
    fields.querySelector('input')?.focus();
  }
  async function run(task) {
    if (busy) return; busy = true; status.textContent = 'Đang xử lý…'; dialog.querySelectorAll('button').forEach(b=>b.disabled=true);
    try {
      if (sessionUser && client.session?.user?.id !== sessionUser) throw new Error('Phiên đăng nhập đã thay đổi.');
      await task();
    } catch(error) { status.textContent = error.message; }
    finally { busy = false; dialog.querySelectorAll('button').forEach(b=>b.disabled=false); }
  }
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.querySelector('#profile-form').onsubmit = event => { event.preventDefault(); const form=event.target; void run(async()=>{
    await client.accountAction({action:'profile',user_id:user.id,username:form.elements.username.value.trim().toLowerCase(),display_name:form.elements.display_name.value.trim()});
    await onUpdated?.(); status.textContent='Đã cập nhật tài khoản.';
  }); };
  restart.onclick = () => { stage='start'; id=null; showStage(); status.textContent=''; };
  emailForm.onsubmit = event => { event.preventDefault(); void run(async()=>{
    const result=await client.accountAction({action:stage,user_id:user.id,...(id?{id}:{}),...(stage==='new'?{email:emailForm.elements.email.value.trim()}:stage.startsWith('verify')?{code:emailForm.elements.code.value.trim()}: {})});
    if (stage==='verify_new') {
      if(result.stage!=='done')throw new Error('Chưa hoàn tất xác nhận email mới.');
      dialog.querySelector('.current-email').textContent=result.email; emailForm.remove(); restart.remove();
      await onUpdated?.(); status.textContent='Đã xác nhận và đổi email thành công.'; return;
    }
    id=result.id; stage=stage==='start'?'verify_old':stage==='verify_old'?'new':'verify_new'; showStage();
    status.textContent=stage==='new'?'Đã xác nhận email cũ. Hãy nhập email mới.':'Đã gửi mã xác nhận. Mã có hiệu lực 10 phút.';
  }); };
}
