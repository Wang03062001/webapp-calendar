const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const publicUser = user => ({ id: user.id, email: user.email || '', display_name: user.user_metadata?.display_name || '', created_at: user.created_at, last_sign_in_at: user.last_sign_in_at, banned_until: user.banned_until || null, email_confirmed_at: user.email_confirmed_at || null });

export function createAdminHandler({ url, serviceKey, publicKey, fetcher = globalThis.fetch.bind(globalThis), allowedOrigins = ['https://wang03062001.github.io'], siteUrl = 'https://wang03062001.github.io/webapp-calendar/' }) {
  return async request => {
    const origin = request.headers.get('origin');
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin', ...(allowedOrigins.includes(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } : {}) };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !allowedOrigins.includes(origin)) return reply(403, { message: 'Website này không được phép dùng chức năng quản trị.' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { message: 'Chỉ hỗ trợ POST.' });
    if (!url || !serviceKey || !publicKey) return reply(503, { message: 'Chưa cấu hình môi trường Edge Function.' });
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return reply(401, { message: 'Hãy đăng nhập trước.' });
    try {
      const call = async (path, options = {}, asUser = false) => {
        const response = await fetcher(`${url}${path}`, { ...options, headers: { apikey: asUser ? publicKey : serviceKey, Authorization: asUser ? authorization : `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(12000) });
        const text = await response.text();
        let body; try { body = text ? JSON.parse(text) : null; } catch { body = null; }
        return { response, body };
      };
      // Never trust role flags in user_metadata or in the browser's request.
      const actor = await call('/auth/v1/user', {}, true);
      if (!actor.response.ok || !UUID.test(actor.body?.id || '')) return reply(401, { message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
      const admins = await call(`/rest/v1/calendar_admins?user_id=eq.${actor.body.id}&select=user_id&limit=1`);
      if (!admins.response.ok) return reply(503, { message: 'Chưa thiết lập quyền admin. Chủ project cần chạy supabase/admin-setup.sql.' });
      if (!Array.isArray(admins.body) || !admins.body.some(admin => admin.user_id === actor.body.id)) return reply(403, { message: 'Tài khoản này không có quyền admin.' });
      const actorAccount = await call(`/auth/v1/admin/users/${actor.body.id}`);
      if (!actorAccount.response.ok) return reply(502, { message: 'Không kiểm tra được trạng thái tài khoản admin.' });
      if (Date.parse(actorAccount.body?.banned_until || '') > Date.now()) return reply(403, { message: 'Tài khoản admin này đang bị khóa.' });
      const raw = await request.text();
      if (raw.length > 8192) return reply(413, { message: 'Nội dung quá lớn.' });
      let input; try { input = JSON.parse(raw); } catch { return reply(400, { message: 'Yêu cầu JSON không hợp lệ.' }); }
      if (!input || typeof input !== 'object' || Array.isArray(input)) return reply(400, { message: 'Yêu cầu không hợp lệ.' });
      const action = input.action;
      const actions = { list: ['action', 'page'], profile: ['action', 'user_id', 'username', 'display_name'], role: ['action', 'user_id', 'admin'], ban: ['action', 'user_id', 'banned'], recovery: ['action', 'user_id'], delete: ['action', 'user_id', 'confirmation'] };
      const fields = Object.hasOwn(actions, action) ? actions[action] : null;
      if (!fields || Object.keys(input).some(key => !fields.includes(key))) return reply(400, { message: 'Thao tác hoặc trường dữ liệu không được hỗ trợ.' });
      if (action === 'list') {
        const page = input.page ?? 1;
        if (!Number.isInteger(page) || page < 1 || page > 10000) return reply(400, { message: 'Trang không hợp lệ.' });
        const result = await call(`/auth/v1/admin/users?page=${page}&per_page=50`);
        if (!result.response.ok || !Array.isArray(result.body?.users)) return reply(502, { message: 'Không tải được danh sách tài khoản.' });
        const ids = result.body.users.map(user => user.id).filter(id => UUID.test(id));
        const profiles = ids.length ? await call(`/rest/v1/calendar_profiles?user_id=in.(${ids.join(',')})&select=user_id,username,display_name`) : { response: { ok: true }, body: [] };
        const roles = ids.length ? await call(`/rest/v1/calendar_admins?user_id=in.(${ids.join(',')})&select=user_id`) : { response: { ok: true }, body: [] };
        if (!profiles.response.ok || !roles.response.ok) return reply(503, { message: 'Chưa thiết lập hồ sơ tài khoản.' });
        return reply(200, { users: result.body.users.map(user => { const profile = profiles.body.find(row => row.user_id === user.id); return { ...publicUser(user), username: profile?.username || '', display_name: profile?.display_name || '', is_admin: roles.body.some(row => row.user_id === user.id) }; }), page, has_more: result.body.users.length === 50 });
      }
      if (!UUID.test(input.user_id || '')) return reply(400, { message: 'Mã tài khoản không hợp lệ.' });
      if (action === 'delete' && input.user_id === actor.body.id) return reply(400, { message: 'Không thể tự xóa tài khoản admin đang sử dụng.' });
      if (action === 'delete' && (typeof input.confirmation !== 'string' || input.confirmation.length > 254)) return reply(400, { message: 'Cần xác nhận đúng tài khoản cần xóa.' });
      if (action === 'ban' && (typeof input.banned !== 'boolean' || input.user_id === actor.body.id)) return reply(400, { message: 'Không thể tự khóa tài khoản admin đang sử dụng.' });
      if (action === 'profile' && (typeof input.username !== 'string' || !/^[a-z][a-z0-9_]{2,29}$/.test(input.username) || typeof input.display_name !== 'string' || input.display_name.trim().length > 100)) return reply(400, { message: 'Tên tài khoản cần 3–30 ký tự chữ thường, số hoặc dấu gạch dưới; tên hiển thị tối đa 100 ký tự.' });
      if (action === 'role' && (typeof input.admin !== 'boolean' || input.user_id === actor.body.id)) return reply(400, { message: 'Không thể tự thay đổi quyền admin của tài khoản đang sử dụng.' });
      const target = await call(`/auth/v1/admin/users/${input.user_id}`);
      if (target.response.status === 404) return reply(404, { message: 'Không tìm thấy tài khoản.' });
      if (!target.response.ok || target.body?.id !== input.user_id) return reply(502, { message: 'Không đọc được tài khoản cần chỉnh sửa.' });
      if (action === 'delete') {
        const expected = target.body.email || target.body.id;
        if (input.confirmation !== expected) return reply(409, { message: 'Thông tin tài khoản đã thay đổi. Tải lại danh sách trước khi xóa.' });
        const result = await call(`/auth/v1/admin/users/${input.user_id}`, { method: 'DELETE', body: JSON.stringify({ should_soft_delete: false }) });
        if (!result.response.ok) return reply(502, { message: 'Chưa xóa được tài khoản. Hãy tải lại danh sách và kiểm tra trước khi thử lại.' });
        return reply(200, { ok: true, deleted_user_id: input.user_id });
      }
      if (action === 'profile') {
        const result = await call(`/rest/v1/calendar_profiles?user_id=eq.${input.user_id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ username: input.username, display_name: input.display_name.trim() }) });
        if (!result.response.ok || !result.body?.length) return reply(409, { message: 'Tên tài khoản đã được dùng hoặc hồ sơ không tồn tại.' });
        return reply(200, { ok: true });
      }
      if (action === 'role') {
        const result = input.admin ? await call('/rest/v1/calendar_admins?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ user_id: input.user_id }) }) : await call(`/rest/v1/calendar_admins?user_id=eq.${input.user_id}`, { method: 'DELETE' });
        return result.response.ok ? reply(200, { ok: true }) : reply(502, { message: 'Không thay đổi được quyền admin.' });
      }
      if (action === 'recovery') {
        if (!target.body.email) return reply(400, { message: 'Tài khoản này chưa có email.' });
        const result = await call(`/auth/v1/recover?redirect_to=${encodeURIComponent(siteUrl)}`, { method: 'POST', body: JSON.stringify({ email: target.body.email }) });
        return result.response.ok ? reply(200, { ok: true }) : reply(result.response.status === 429 ? 429 : 502, { message: 'Chưa gửi được email đặt lại mật khẩu. Hãy kiểm tra cấu hình email hoặc thử lại sau.' });
      }
      const changes = { ban_duration: input.banned ? '876000h' : 'none' };
      const result = await call(`/auth/v1/admin/users/${input.user_id}`, { method: 'PUT', body: JSON.stringify(changes) });
      if (!result.response.ok) return reply(result.response.status === 422 ? 422 : 502, { message: 'Không cập nhật được trạng thái tài khoản.' });
      return reply(200, { user: publicUser(result.body) });
    } catch { return reply(502, { message: 'Không kết nối được dịch vụ quản trị. Hãy thử lại sau.' }); }
  };
}
