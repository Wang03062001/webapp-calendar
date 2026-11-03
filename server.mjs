import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const publicFiles = new Set(['/index.html', '/src/app.js', '/src/current-wallet.js', '/src/stats-model.js', '/src/stats-ui.js', '/src/xlsx.js', '/src/excel-report.js', '/src/export-ui.js', '/src/expense-model.js', '/src/expense-ui.js', '/src/credit-access.js', '/src/region-model.js', '/src/region-ui.js', '/src/receipt-model.js', '/src/simple-card-ui.js', '/src/safety-model.js', '/src/safety-ui.js', '/src/model.js', '/src/style.css', '/src/config.js', '/src/supabase.js', '/src/sync.js', '/src/admin.js', '/src/debts.js', '/src/card-model.js', '/src/credit-ui.js', '/src/account-model.js', '/src/accounts-ui.js', '/src/opening-ui.js', '/src/preferences.js', '/src/settings-ui.js', '/src/i18n.js', '/src/translations.js', '/src/profile-ui.js', '/favicon.svg']);
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = pathname === '/' ? '/index.html' : pathname;
  if (!publicFiles.has(file)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(path.join(root, file));
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(500); res.end('Unable to read file'); }
});
server.listen(Number(process.env.PORT || 5173), '0.0.0.0', () => console.log(`Lịch chi tiêu listening on port ${server.address().port}`));
