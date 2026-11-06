const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {site} = require('./paths.cjs');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.map':'application/json','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
async function startServer(root = site, respond = () => false) {
  const server = http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {res.writeHead(405).end(); return;}
    // Optional explicit fixture endpoints; normal suites still serve the checkout unchanged.
    if (respond(req, res)) return;
    let file;
    try {
      let url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (url.startsWith('/flare-songs/')) url = url.slice('/flare-songs'.length);
      if (url === '/') url = '/index.html';
      file = path.resolve(root, '.' + url);
      const relative = path.relative(root, file);
      // Test server serves public files only; never dependencies, fixtures, or dotfiles.
      if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(p => p.startsWith('.') || p.startsWith('_'))) throw Error('Private path');
      const data = fs.readFileSync(file);
      res.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream',
        'cache-control':'no-store', 'content-security-policy':"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' https://docs.google.com https://*.googleusercontent.com"});
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {res.writeHead(404).end('Not found');}
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(origin + '/', {signal:AbortSignal.timeout(5000)});
    if (response.status !== 200) throw Error('Preview health probe failed');
  } catch (error) {await new Promise(resolve => server.close(resolve)); throw error;}
  return {origin, close:() => new Promise(resolve => {server.close(resolve); server.closeAllConnections();})};
}
module.exports = {startServer};
