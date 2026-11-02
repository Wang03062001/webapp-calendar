const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const failure = { forbidden:'Không có quyền sửa tài khoản này.', rate:'Hãy chờ 60 giây trước khi gửi mã mới.', expired:'Mã hết hạn hoặc đã nhập sai 5 lần. Hãy bắt đầu lại.', stale:'Email tài khoản đã thay đổi. Hãy bắt đầu lại.', email:'Email mới không hợp lệ hoặc đã được dùng.', invalid:'Mã xác nhận không đúng.', order:'Hãy thực hiện các bước xác nhận theo thứ tự.', applying:'Yêu cầu trước đang xử lý. Hãy thử xác nhận mã mới lại hoặc liên hệ quản trị.' };
export function createAccountHandler({ url, serviceKey, publicKey, mailKey, mailFrom, sendEmail, fetcher = globalThis.fetch.bind(globalThis), allowedOrigins = ['https://wang03062001.github.io'] }) {
  return async request => {
    const origin = request.headers.get('origin'), authorization = request.headers.get('authorization');
    const headers = { 'Content-Type':'application/json', 'Cache-Control':'no-store', Vary:'Origin', ...(allowedOrigins.includes(origin) ? { 'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Headers':'authorization, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS' } : {}) };
    const reply = (status, body) => new Response(JSON.stringify(body), {status, headers});
    if (origin && !allowedOrigins.includes(origin)) return reply(403,{message:'Website không được phép.'});
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (request.method !== 'POST') return reply(405,{message:'Chỉ hỗ trợ POST.'});
    if (!url || !serviceKey || !publicKey) return reply(503,{message:'Chưa cấu hình chức năng tài khoản.'});
    if (!authorization?.startsWith('Bearer ')) return reply(401,{message:'Hãy đăng nhập trước.'});
    try {
      const raw = await request.text(); if (raw.length > 4096) return reply(413,{message:'Nội dung quá lớn.'});
      let input; try { input = JSON.parse(raw); } catch { return reply(400,{message:'Yêu cầu không hợp lệ.'}); }
      const actions = { profile:['username','display_name'], start:[], verify_old:['id','code'], new:['id','email'], verify_new:['id','code'] };
      if (!input || !Object.hasOwn(actions,input.action) || Object.keys(input).some(key => !['action','user_id',...actions[input.action]].includes(key))) return reply(400,{message:'Trường dữ liệu không hợp lệ.'});
      const call = async (path, options = {}, asUser = false) => {
        const response = await fetcher(`${url}${path}`,{...options,headers:{apikey:asUser?publicKey:serviceKey,Authorization:asUser?authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});
        const text = await response.text(); let body; try { body = JSON.parse(text); } catch { body = null; } return {response,body};
      };
      const actor = await call('/auth/v1/user',{},true);
      if (!actor.response.ok || !UUID.test(actor.body?.id || '')) return reply(401,{message:'Phiên đăng nhập không hợp lệ.'});
      const targetId = input.user_id || actor.body.id;
      if (!UUID.test(targetId)) return reply(400,{message:'Tài khoản không hợp lệ.'});
      const account = await call(`/auth/v1/admin/users/${actor.body.id}`);
      if (!account.response.ok || Date.parse(account.body?.banned_until || '') > Date.now()) return reply(403,{message:'Tài khoản đang bị khóa.'});
      if (targetId !== actor.body.id) {
        const roles = await call(`/rest/v1/calendar_admins?user_id=eq.${actor.body.id}&select=user_id&limit=1`);
        if (!roles.response.ok || !roles.body?.some(row => row.user_id === actor.body.id)) return reply(403,{message:failure.forbidden});
      }
      const target = targetId === actor.body.id ? account : await call(`/auth/v1/admin/users/${targetId}`);
      if (!target.response.ok || target.body?.id !== targetId) return reply(404,{message:'Không tìm thấy tài khoản.'});
      if (input.action === 'profile') {
        if (typeof input.username !== 'string' || !/^[a-z][a-z0-9_]{2,29}$/.test(input.username) || typeof input.display_name !== 'string' || input.display_name.length > 100) return reply(400,{message:'Tên tài khoản cần 3–30 ký tự chữ thường, số hoặc dấu gạch dưới.'});
        if (input.username === 'admin') {
          const current = await call(`/rest/v1/calendar_profiles?user_id=eq.${targetId}&select=username`);
          if (!current.response.ok || current.body?.[0]?.username !== 'admin') return reply(400,{message:'Tên admin được dành riêng.'});
        }
        const updated = await call(`/rest/v1/calendar_profiles?user_id=eq.${targetId}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({username:input.username,display_name:input.display_name.trim()})});
        return updated.response.ok && updated.body?.length ? reply(200,{ok:true}) : reply(409,{message:'Tên tài khoản đã được dùng hoặc hồ sơ chưa được thiết lập.'});
      }
      if (!sendEmail && (!mailKey || !mailFrom)) return reply(503,{message:'Chưa cấu hình gửi mã đổi email. Admin cần triển khai account-settings và cấu hình SMTP_USER, SMTP_PASS (Gmail) hoặc RESEND_API_KEY, EMAIL_FROM.'});
      const id = input.action === 'start' ? crypto.randomUUID() : input.id;
      if (!UUID.test(id || '')) return reply(400,{message:'Yêu cầu xác nhận không hợp lệ.'});
      const hash = async code => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${id}:${code}`))),b=>b.toString(16).padStart(2,'0')).join('');
      const step = async (action, email = '', codeHash = '') => {
        const result = await call('/rest/v1/rpc/calendar_email_step',{method:'POST',body:JSON.stringify({p_action:action,p_actor:actor.body.id,p_target:targetId,p_id:id,p_email:email,p_hash:codeHash})});
        if (!result.response.ok) throw new Error('Chưa thiết lập xác nhận email. Admin cần chạy account-settings.sql.');
        return result.body;
      };
      if (['start','new'].includes(input.action)) {
        const email = input.action === 'start' ? target.body.email?.toLowerCase() : typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
        if (!EMAIL.test(email || '') || email.length > 254) return reply(400,{message:'Email không hợp lệ.'});
        const random = new Uint32Array(1); let value; do { crypto.getRandomValues(random); value = random[0]; } while(value >= 4294000000);
        const code = String(value % 1000000).padStart(6,'0');
        const result = await step(input.action,email,await hash(code));
        if (!result?.ok) return reply(result?.error==='rate'?429:400,{message:failure[result?.error] || 'Không thể bắt đầu xác nhận.'});
        const message = {to:email,subject:'Mã xác nhận đổi email / Email change verification',text:`Mã xác nhận / Verification code: ${code}\nMã có hiệu lực 10 phút. Không chia sẻ mã này. / Expires in 10 minutes. Do not share this code.\n${input.action === 'start' ? 'Xác nhận email hiện tại trước khi chọn email mới.' : 'Xác nhận email mới để hoàn tất thay đổi.'}`};
        let delivered = false;
        try {
          if (sendEmail) delivered = await sendEmail(message) === true;
          else {
            const mail = await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${mailKey}`,'Content-Type':'application/json'},body:JSON.stringify({...message,from:mailFrom,to:[email]}),signal:AbortSignal.timeout(12000)});
            delivered = mail.ok;
          }
        } catch { /* Provider errors may contain credentials; never return or log them. */ }
        if (!delivered) return reply(502,{message:'Chưa gửi được mã. Kiểm tra cấu hình gửi email và thử lại sau 60 giây.'});
        return reply(200,{id,stage:result.stage});
      }
      if (!/^\d{6}$/.test(input.code || '')) return reply(400,{message:'Nhập mã gồm 6 chữ số.'});
      const result = await step(input.action,'',await hash(input.code));
      if (!result?.ok) return reply(400,{message:failure[result?.error] || 'Xác nhận không hợp lệ.'});
      if (input.action === 'verify_old') return reply(200,{id,stage:'old_verified'});
      // Only a consumed, server-verified code for the new mailbox can reach Auth update.
      const latest = await call(`/auth/v1/admin/users/${targetId}`);
      if (!latest.response.ok) return reply(502,{message:'Chưa kiểm tra được email. Hãy thử lại mã vừa nhập.'});
      if (latest.body.email?.toLowerCase() === result.new_email) { const finished = await step('finish'); if (!finished?.ok) return reply(409,{message:'Hãy thử lại để hoàn tất xác nhận email.'}); return reply(200,{stage:'done',email:result.new_email}); }
      if (latest.body.email?.toLowerCase() !== result.old_email) { await step('failed'); return reply(409,{message:failure.stale}); }
      const updated = await call(`/auth/v1/admin/users/${targetId}`,{method:'PUT',body:JSON.stringify({email:result.new_email,email_confirm:true})});
      if (!updated.response.ok) { await step('failed'); return reply(409,{message:'Email mới đã được dùng hoặc không thể cập nhật. Email cũ được giữ nguyên; hãy bắt đầu lại.'}); }
      const finished = await step('finish');
      if (!finished?.ok || updated.body?.email?.toLowerCase() !== result.new_email) return reply(409,{message:'Hãy thử lại để hoàn tất xác nhận email.'});
      return reply(200,{stage:'done',email:result.new_email});
    } catch (error) { return reply(502,{message:error.message?.startsWith('Chưa thiết lập') ? error.message : 'Chưa kết nối được dịch vụ tài khoản. Hãy thử lại.'}); }
  };
}
