export class CloudError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

export class SupabaseClient {
  constructor(config, storage, fetcher = globalThis.fetch.bind(globalThis)) {
    this.url = config.url.replace(/\/$/, ''); this.key = config.key;
    this.storage = storage; this.fetcher = fetcher;
    this.sessionKey = `lich-auth:${new URL(this.url).hostname}`;
    try { this.session = JSON.parse(storage.getItem(this.sessionKey)) || null; } catch { this.session = null; }
  }
  async request(path, { method = 'GET', body, token } = {}) {
    let response;
    try {
      response = await this.fetcher(`${this.url}${path}`, {
        method, headers: { apikey: this.key, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
      });
    } catch { throw new CloudError('Không kết nối được Supabase. Bản nháp vẫn được giữ trên máy; hãy kiểm tra mạng và thử lại.', 'NETWORK'); }
    const text = await response.text();
    let result; try { result = text ? JSON.parse(text) : null; } catch { result = null; }
    if (!response.ok) {
      const rawCode = String(result?.code || result?.error_code || response.status);
      const code = path === '/rest/v1/rpc/save_calendar_document' && (rawCode === 'PT409' || response.status === 409 && rawCode === '409') ? '40001' : rawCode;
      if (path === '/rest/v1/rpc/calendar_username_available') throw new CloudError('Chưa thiết lập tên tài khoản. Chủ project cần chạy admin-setup.sql.', code);
      let message = 'Không thể đồng bộ. Hãy kiểm tra cấu hình Supabase và thử lại.';
      if (code === '40001') message = 'Dữ liệu đã thay đổi trên thiết bị khác. Bản nháp của bạn được giữ lại; hãy xuất bản nháp trước khi tải bản trên đám mây.';
      else if (['PGRST205', 'PGRST202', '42P01', '42883'].includes(code)) message = 'Chưa có bảng đồng bộ. Chủ project cần chạy file supabase/setup.sql trong SQL Editor.';
      else if (code === 'invalid_credentials') message = 'Email hoặc mật khẩu chưa đúng.';
      else if (code === 'email_not_confirmed') message = 'Hãy xác nhận email trước khi đăng nhập.';
      else if (code === 'over_email_send_rate_limit' || response.status === 429) message = 'Bạn đã thử quá nhiều lần. Hãy chờ một lát rồi thử lại.';
      else if (code === 'weak_password') message = 'Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 8 ký tự.';
      else if (code === 'otp_expired') message = 'Mã xác nhận không đúng hoặc đã hết hạn. Hãy yêu cầu mã mới.';
      else if (path.startsWith('/auth/v1/signup') && response.status >= 400) message = 'Chưa tạo được tài khoản. Tên tài khoản có thể đã được dùng, bị dành riêng, hoặc chưa chạy admin-setup.sql.';
      else if (response.status === 401) message = 'Phiên đăng nhập hoặc cấu hình public key không hợp lệ. Hãy đăng nhập lại.';
      else if (response.status === 403) message = 'Supabase từ chối truy cập. Hãy kiểm tra xác nhận email và quyền truy cập dữ liệu.';
      if (path.startsWith('/functions/v1/')) message = response.status === 404 ? 'Chưa triển khai Edge Function cần thiết. Hãy xem hướng dẫn trong README.' : typeof result?.message === 'string' ? result.message : 'Không thực hiện được thao tác.';
      throw new CloudError(message, code);
    }
    return result;
  }
  setSession(session) {
    this.session = session;
    if (session) this.storage.setItem(this.sessionKey, JSON.stringify(session));
    else this.storage.removeItem(this.sessionKey);
  }
  acceptSession(result) {
    if (result?.access_token) this.setSession({ ...result, expires_at: result.expires_at || Math.floor(Date.now() / 1000) + result.expires_in });
    return result;
  }
  async token() {
    if (!this.session) throw new CloudError('Hãy đăng nhập để đồng bộ.', 'AUTH');
    if (this.session.expires_at <= Date.now() / 1000 + 60) {
      if (!this.refreshing) this.refreshing = this.request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: this.session.refresh_token } }).then(result => this.acceptSession(result)).finally(() => { this.refreshing = null; });
      await this.refreshing;
    }
    return this.session.access_token;
  }
  async signIn(email, password) {
    if (!email.includes('@')) return this.acceptSession(await this.request('/functions/v1/account-login', { method: 'POST', body: { username: email.toLowerCase(), password } }));
    return this.acceptSession(await this.request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } }));
  }
  async signUp(email, password, redirectTo, username) {
    const available = await this.request('/rest/v1/rpc/calendar_username_available', { method: 'POST', body: { p_username: username } });
    if (available !== true) throw new CloudError('Tên tài khoản đã được dùng, bị dành riêng hoặc không hợp lệ.', 'USERNAME_TAKEN');
    return this.acceptSession(await this.request(`/auth/v1/signup${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''}`, { method: 'POST', body: { email, password, data: { username } } }));
  }
  async user() { return this.request('/auth/v1/user', { token: await this.token() }); }
  async isAdmin() { return this.request('/rest/v1/rpc/calendar_is_admin', { method: 'POST', body: {}, token: await this.token() }); }
  async accountAction(body) { return this.request('/functions/v1/account-settings', { method: 'POST', body, token: await this.token() }); }
  async adminAction(body) { return this.request('/functions/v1/admin-accounts', { method: 'POST', body, token: await this.token() }); }
  async updatePassword(password) { return this.request('/auth/v1/user', { method: 'PUT', body: { password }, token: await this.token() }); }
  async requestRecovery(email) { return this.request('/auth/v1/recover', { method: 'POST', body: { email } }); }
  async verifyRecovery(email, token) { return this.acceptSession(await this.request('/auth/v1/verify', { method: 'POST', body: { email, token, type: 'recovery' } })); }
  async profile() { const user = await this.user(); return (await this.request(`/rest/v1/calendar_profiles?user_id=eq.${user.id}&select=username,display_name&limit=1`, { token: await this.token() }))[0] || null; }
  async signOut() {
    const session = this.session;
    this.setSession(null);
    if (session) try { await this.request('/auth/v1/logout?scope=local', { method: 'POST', token: session.access_token }); } catch { /* Local session is cleared even when offline. */ }
  }
  async load(userId) {
    const rows = await this.request(`/rest/v1/calendar_documents?user_id=eq.${encodeURIComponent(userId)}&select=data,revision&limit=1`, { token: await this.token() });
    return rows[0] || null;
  }
  async save(data, revision) {
    return this.request('/rest/v1/rpc/save_calendar_document', { method: 'POST', token: await this.token(), body: { p_data: data, p_expected_revision: revision } });
  }
}
