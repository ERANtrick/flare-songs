const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {startServer}=require('../../helpers/server.cjs');
const {site,maintenance,localAsset}=require('../../helpers/paths.cjs');
const {classify,csvURL}=require('../../helpers/browser.cjs');
const {assets,verifyFiles}=require('../../helpers/vendor.cjs');
test('F07-U01 動的ポートの独立serverは対象checkoutとproject subpathを同じ内容で返す',async()=>{
 const a=await startServer(),b=await startServer();try{assert.notEqual(a.origin,b.origin);for(const name of ['index.html','script.js','styles.css','assets/icons/shuffle.svg'])for(const prefix of ['/','/flare-songs/']){
  const r=await fetch(a.origin+prefix+name);assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),fs.readFileSync(path.join(site,name)));
 }}finally{await a.close();await b.close();}
});
test('F07-U02 保守・dotfile・traversal・未知ファイルをpreviewから配信しない',async()=>{
 const s=await startServer();try{for(const name of ['_maintenance/package.json','.git/config','unknown.txt','%2e%2e%2fpackage.json','/flare-songs/_maintenance/fixtures/snapshots/songs.csv'])assert.equal((await fetch(s.origin+'/'+name)).status,404,name);
 assert.equal((await fetch(s.origin+'/',{method:'POST'})).status,405);
 }finally{await s.close();}
});
test('F07-U03 CDN・不明なlocal vendor・CSVホスト偽装・未知の外部通信を拒否',()=>{
 const origin='http://127.0.0.1:12345';for(const value of ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css','https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css','https://docs.google.com/other.csv','https://docs.google.com.evil.test/data','https://example.org/a',origin+'/assets/vendor/bootstrap-5.3.3/bootstrap.min.css',origin+'/assets/vendor/unknown.js'])assert.throws(()=>classify(value,origin),/Unexpected/);
 for(const value of assets.keys())assert.equal(classify(origin+'/flare-songs/'+value,origin),'vendor');assert.equal(classify(csvURL,origin),'csv');
});
test('F07-U04 local vendorの完全パス・byte/hashと固定npm配布物が対応し、未知assetへfallbackしない',()=>{
 verifyFiles();for(const value of assets.keys())assert.ok(value.includes('-5.3.2/'));
 assert.throws(()=>localAsset('unknown.js'),/Unregistered/);
});
test('F07-U05 固定CSVのバイト列・SHA-256・期待件数をmanifestで保護',()=>{
 for(const e of require('../../fixtures/snapshots/manifest.json').files){const data=fs.readFileSync(path.join(maintenance,'fixtures/snapshots',e.name));assert.equal(data.length,e.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),e.sha256);assert.deepEqual([e.expected.records,e.expected.public,e.expected.titles,e.expected.sessions],[2763,2733,681,205]);}
});
test('F07-U06 174旧IDの移行先は実テスト定義に存在し、ソース一致への依存を残さない',()=>{
 const map=require('../../docs/migration-map.json');assert.equal(map.length,174);
 const source=fs.readdirSync(path.join(maintenance,'tests/unit')).filter(n=>n.endsWith('.test.cjs')).map(n=>fs.readFileSync(path.join(maintenance,'tests/unit',n),'utf8')).join('\n')+
 fs.readdirSync(path.join(maintenance,'tests/browser')).filter(n=>n.endsWith('.test.cjs')).map(n=>fs.readFileSync(path.join(maintenance,'tests/browser',n),'utf8')).join('\n');
 for(const e of map)for(const id of e.destination)assert.ok(source.includes(id),e.id+' -> '+id);
 // Check imports, not incidental prose in this test or historical case titles.
 assert.ok(!/require\(['"][^'"]*(?:scope|baseline)/.test(source));
});
