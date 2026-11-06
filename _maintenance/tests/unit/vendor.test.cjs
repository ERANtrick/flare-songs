const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {site}=require('../../helpers/paths.cjs');
const {manifest,assets,runtimeAssets,verifyFiles,verifyAsset}=require('../../helpers/vendor.cjs');

test('F10-U01 vendor・map・LICENSEのbyte/hashと正規npmファイルを保持',()=>{verifyFiles();assert.equal(assets.size,5);assert.equal(runtimeAssets.length,3);assert.equal(manifest.files.filter(e=>e.role==='license').length,5);});
test('F10-U02 相対参照・CSS/Papa/bundleの順序・async/defer契約を維持しCDN fallbackなし',()=>{
 const html=fs.readFileSync(path.join(site,'index.html'),'utf8');assert(!html.includes('cdn.jsdelivr.net'));
 const css=html.indexOf('href="'+runtimeAssets.find(e=>e.path.endsWith('.css')).path+'"');
 const papa=html.match(/<script\b[^>]*src="assets\/vendor\/papaparse-5\.3\.2\/papaparse\.min\.js"[^>]*><\/script>/)[0];
 const bundle=html.match(/<script\b[^>]*src="assets\/vendor\/bootstrap-5\.3\.2\/bootstrap\.bundle\.min\.js"[^>]*><\/script>/)[0];
 assert(css>html.indexOf('id="theme-init"'));assert(css<html.indexOf('href="styles.css"'));assert(css<html.indexOf(papa));assert(html.indexOf(papa)<html.indexOf('www.googletagmanager.com'));assert(html.indexOf(papa)<html.indexOf(bundle));
 assert(!/\b(?:async|defer)\b/.test(papa));assert(!/\b(?:async|defer)\b/.test(bundle));assert(html.indexOf(bundle)<html.indexOf('<script src="script.js" defer>'));assert(/<script async src="https:\/\/www.googletagmanager.com/.test(html));
});
test('F10-U03 map参照先・全embedded source・Popper2.11.8とRFS10.0.0の由来を検証',()=>{
 for(const entry of runtimeAssets){const code=fs.readFileSync(path.join(site,entry.path),'utf8'),ref=code.match(/sourceMappingURL=([^\s*]+)/);if(entry.package==='papaparse'){assert.equal(ref,null);assert(code.startsWith('/* @license\nPapa Parse\nv5.3.2'));continue;}
  assert.match(code.slice(0,512),/\/\*![\s\S]*Bootstrap\s+v5\.3\.2[\s\S]*Copyright 2011-2023[\s\S]*Licensed under MIT/);assert(ref);const target=path.posix.join(path.posix.dirname(entry.path),ref[1]);assert(assets.has(target));const map=JSON.parse(fs.readFileSync(path.join(site,target),'utf8'));assert.equal(map.sources.length,map.sourcesContent.length);assert(map.sourcesContent.every(s=>typeof s==='string'&&s.length>0));
 }
 const map=JSON.parse(fs.readFileSync(path.join(site,'assets/vendor/bootstrap-5.3.2/bootstrap.bundle.min.js.map'),'utf8'));let n=0;
 for(let i=0;i<map.sources.length;i++)if(map.sources[i].includes('@popperjs/core/')){assert.equal(map.sourcesContent[i],fs.readFileSync(path.join(path.dirname(require.resolve('@popperjs/core/package.json')),map.sources[i].split('@popperjs/core/')[1]),'utf8'));n++;}assert.equal(n,55);assert.equal(require('@popperjs/core/package.json').version,'2.11.8');
 const cssMap=JSON.parse(fs.readFileSync(path.join(site,'assets/vendor/bootstrap-5.3.2/bootstrap.min.css.map'),'utf8'));assert.equal(Buffer.byteLength(cssMap.sourcesContent[cssMap.sources.findIndex(s=>s.endsWith('/vendor/_rfs.scss'))]),10012);
});
test('F10-U04 ローカル資産のHTTP失敗・破損・別内容を正常成功として扱わない',()=>{
 for(const entry of assets.values()){const bytes=fs.readFileSync(path.join(site,entry.path));for(const status of [0,404,500])assert.throws(()=>verifyAsset(entry,status,bytes),/Vendor HTTP/);assert.throws(()=>verifyAsset(entry,200,Buffer.concat([bytes,Buffer.from('tampered')])) ,/bytes\/hash mismatch/);const changed=Buffer.from(bytes);changed[Math.floor(changed.length/2)]^=1;assert.throws(()=>verifyAsset(entry,200,changed),/bytes\/hash mismatch/);verifyAsset(entry,200,bytes);}
});
test('F10-U05 vendorと著作権・MIT全文を公開一覧へ含め、既存Icons表示を保持',()=>{
 const published=require('../../fixtures/public-files.json'),readme=fs.readFileSync(path.join(site,'licenses/README.md'),'utf8');
 for(const entry of manifest.files){assert(published.includes(entry.path),entry.path);if(entry.role==='license'){const text=fs.readFileSync(path.join(site,entry.path),'utf8');assert(text.includes('Permission is hereby granted'));assert(text.includes('Copyright'));assert(readme.includes(path.basename(entry.path)));}}
 assert(readme.startsWith('Bootstrap Icons v1.11.3'));assert(readme.includes('Copyright (c) 2019-2024 The Bootstrap Authors.'));assert(published.includes('licenses/bootstrap-icons-LICENSE.txt'));
});
