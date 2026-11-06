const fs = require('node:fs');
const path = require('node:path');
const {startServer} = require('./server.cjs');
const {site} = require('./paths.cjs');

// No Playwright routes: native HTTP caching remains enabled. Only the test response
// replaces CSV_URL and removes the analytics network tag; product files stay intact.
async function thumbnailServer() {
  const pending = new Map(), modes = new Map(), requests = [];
  const colors = {a:'#b01020', b:'#1040b0', c:'#108040'};
  const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8')
    .replace(/<script async src="https:\/\/www\.googletagmanager\.com[^<]+<\/script>/, '');
  const script = fs.readFileSync(path.join(site, 'script.js'), 'utf8');
  const server = await startServer(site, (req, res) => {
    const url = new URL(req.url, 'http://' + req.headers.host);
    const send = (body, type, status = 200, cache = 'no-store') => {
      res.writeHead(status, {'content-type':type, 'cache-control':cache,
        'content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"});
      res.end(body);
    };
    if (url.pathname === '/') {send(html, 'text/html; charset=utf-8'); return true;}
    if (url.pathname === '/script.js') {
      send(script.replace(/const CSV_URL = '[^']+';/, `const CSV_URL = '${url.origin}/test-data.csv';`), 'text/javascript; charset=utf-8');
      return true;
    }
    if (url.pathname === '/test-data.csv') {
      const header = ',曲名,日付,配信日,配信タイトル,配信URL,リンク,備考,VideoID,ThumbnailURL,公開,Category,Tags';
      const rows = ['a','b','c','c',''].map((image, i) =>
        [i + 1, '曲 ' + 'ABCDE'[i], '2020/06/02', '2020年6月2日配信', 'テスト配信',
          'https://youtu.be/zhGqJdOEcS4', 'https://youtu.be/zhGqJdOEcS4?t=' + i,
          '', 'zhGqJdOEcS4', image ? url.origin + '/test-thumb/' + image + '.svg' : '', '公開', '歌枠', ''].join(','));
      send([header, ...rows].join('\n'), 'text/csv; charset=utf-8'); return true;
    }
    const match = url.pathname.match(/^\/test-thumb\/([abc])\.svg$/);
    if (!match) return false;
    const name = match[1]; requests.push(name);
    const finish = mode => {
      if (res.destroyed) return;
      if (mode === 'disconnect') {res.destroy(); return;}
      if (mode === '404') {send('Not found', 'text/plain', 404); return;}
      send(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="144"><path fill="${colors[name]}" d="M0 0h256v144H0z"/></svg>`,
        'image/svg+xml', 200, 'public, max-age=3600');
    };
    if (modes.get(name) === 'hold') pending.set(name, finish);
    else finish(modes.get(name));
    return true;
  });
  return {...server, requests,
    mode:(name, mode) => modes.set(name, mode),
    release:(name, mode) => {
      const finish = pending.get(name);
      if (!finish) throw Error('Image request not pending: ' + name);
      pending.delete(name); finish(mode);
    }};
}
module.exports = {thumbnailServer};
