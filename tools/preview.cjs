// ローカル確認専用。追加パッケージ不要。GitHub Pagesの公開処理は行わない。
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || file.includes('\0')) { res.writeHead(403); return res.end(); }
    const body = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      // localhostでの確認を本番のAnalyticsへ送信しない。
      'Content-Security-Policy': "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net"
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (_) { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log('Prototype preview: http://127.0.0.1:' + port));
