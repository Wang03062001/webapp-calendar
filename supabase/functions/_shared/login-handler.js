export function createLoginHandler({ url, publicKey, serviceKey, fetcher = globalThis.fetch.bind(globalThis) }) {
  return async request => {
    const origin = request.headers.get('origin');
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': 'https://wang03062001.github.io', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
    if (origin && origin !== 'https://wang03062001.github.io') return reply(403, { message: 'Website không được phép.' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { message: 'Chỉ hỗ trợ POST.' });
    if (!url || !publicKey || !serviceKey) return reply(503, { message: 'Chưa cấu hình chức năng đăng nhập.' });
    try {
      const raw = await request.text(); if (raw.length > 4096) return reply(400, { message: 'Yêu cầu quá lớn.' });
      let input; try { input = JSON.parse(raw); } catch { return reply(400, { message: 'Yêu cầu không hợp lệ.' }); }
      if (!input || typeof input.username !== 'string' || !/^[a-z][a-z0-9_]{2,29}$/.test(input.username) || typeof input.password !== 'string' || input.password.length > 1024) return reply(400, { message: 'Tên tài khoản hoặc mật khẩu không hợp lệ.' });
      const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
      const profileResponse = await fetcher(`${url}/rest/v1/calendar_profiles?username=eq.${encodeURIComponent(input.username)}&select=user_id&limit=1`, { headers: serviceHeaders, signal: AbortSignal.timeout(12000) });
      if (!profileResponse.ok) return reply(503, { message: 'Chưa thiết lập đăng nhập bằng tên tài khoản. Hãy chạy admin-setup.sql.' });
      const profiles = await profileResponse.json();
      let email = 'unknown-user@calendar.invalid';
      if (profiles[0]?.user_id) {
        const userResponse = await fetcher(`${url}/auth/v1/admin/users/${profiles[0].user_id}`, { headers: serviceHeaders, signal: AbortSignal.timeout(12000) });
        if (!userResponse.ok) return reply(502, { message: 'Không kiểm tra được tài khoản.' });
        email = (await userResponse.json()).email;
      }
      const response = await fetcher(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: input.password }), signal: AbortSignal.timeout(12000) });
      const session = await response.json();
      if (!response.ok || !profiles.length) return reply(response.status === 429 ? 429 : 401, { message: 'Tên tài khoản hoặc mật khẩu chưa đúng, hoặc tài khoản chưa được kích hoạt.' });
      return reply(200, session);
    } catch { return reply(502, { message: 'Không kết nối được dịch vụ đăng nhập. Hãy thử lại.' }); }
  };
}
