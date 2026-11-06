const {test,runtime}=require('../../helpers/browser.cjs').suite();
const {site,maintenance,snapshot,artifact,localAsset}=require('../../helpers/paths.cjs');
const baseURL=()=>runtime.origin;
const url=()=>runtime.origin+'/';
const idsByName={
  "固定乱数0で曲名グループが期待順になり、同名履歴を分割しない": "F05-B01",
  "ランダムでも全グループの歌唱履歴が新しい順、閉じるとカードを解放": "F05-B02",
  "検索の絞り込み・該当なし・解除でも順位と乱数呼出し回数を維持": "F05-B03",
  "カテゴリ・配信絞り込みと解除でも元のランダム順位を維持": "F05-B04",
  "お気に入り絞り込み・storage同期と解除でも順位を維持し保存形式は従来どおり": "F05-B05",
  "日英切替・テーマ切替後も元のランダム順位と乱数回数を維持": "F05-B06",
  "絞り込み中にランダムを選んでも全曲名の順序を作り、解除後に復元": "F05-B07",
  "別の並び順からランダムへ再選択すると新しい順、元と同順も正常": "F05-B08",
  "新しい順・古い順のグループ代表日と歌唱履歴は起点mainと同じ": "F05-B09",
  "配信枠一覧のランダムを維持し、検索結果の曲名グループだけ順位を保持": "F05-B10",
  "この曲の歌唱履歴を見るは従来どおり全履歴を新しい順で開き、再ランダムも動作": "F05-B11",
  "連続した検索・並び順の変更でも最後の条件だけを描画": "F05-B12",
  "現行CSVの2,733記録・681曲名・205配信と全履歴を保持し、遅延生成・解放を維持": "F05-B13",
  "CSV再取得でデータ集合が変わっても順位を再作成し古い曲名を残さない": "F05-B14"
};
function check(name,fn){if(!idsByName[name])throw Error('Unmapped case: '+name);test(idsByName[name]+' '+name,fn);}
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const kit=maintenance,out=artifact();
const Papa=require('papaparse');
const actualCSV=fs.readFileSync(snapshot('songs.csv'),'utf8');
const T=['Song A','Song B','Tune C','Song D','Tune E'],shuffled=[T[1],T[2],T[3],T[4],T[0]];
const ids=['zhGqJdOEcS4','Y-Kwrj8KpH0','JUXIXgRI-TY'];
const fixture=[[0,0,'歌枠'],[1,2,'カバー曲'],[2,1,'歌枠'],[3,2,'歌枠'],[4,0,'カバー曲'],[0,2,'歌枠'],[1,0,'カバー曲'],[2,2,'カバー曲'],[4,2,'歌枠'],[4,1,'カバー曲'],[0,1,'歌枠'],[2,0,'歌枠']].map(([t,d,cat],i)=>({'曲名':T[t],'日付':(2024+d)+'/01/01','配信日':(2024+d)+'年1月1日','配信タイトル':'Session '+d,'配信URL':'https://youtu.be/'+ids[d],'リンク':'https://youtu.be/'+ids[d]+'?t='+(i+1)*10,'備考':'',VideoID:ids[d],ThumbnailURL:'https://img.youtube.com/vi/'+ids[d]+'/maxresdefault.jpg','公開':'公開',Category:cat,Tags:''}));
const csv=Papa.unparse(fixture),passed=[],errors=[],measurements=[];let browser;

async function settle(p){await p.waitForFunction(()=>typeof songLoadState!=='undefined'&&songLoadState==='ready'&&!document.querySelector('#song-list .spinner-border'));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function sample({width=1280,data=csv,favorites=[]}={}){
 const c=await browser.newContext({viewport:{width,height:1000},colorScheme:'light'});
 await c.addInitScript(({favorites,origin})=>{if(location.origin!==origin)return;localStorage.setItem('favorites',JSON.stringify(favorites));window.__writes=[];const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){window.__writes.push(k);return set.call(this,k,v);};},{favorites,origin:runtime.origin});
 await c.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname==='docs.google.com')return route.fulfill({body:data,contentType:'text/csv; charset=utf-8',headers:{'access-control-allow-origin':'*'}});if(u.hostname==='img.youtube.com')return route.fulfill({path:localAsset('sample-thumbnail.jpg'),contentType:'image/jpeg'});return route.abort();});
 const p=await c.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));await p.goto(runtime.origin+'/');await settle(p);return {p,c,close:()=>c.close()};
}
async function rng(p,value=0){await p.evaluate(value=>{window.__randomCalls=0;Math.random=()=>{window.__randomCalls++;return value;};},value);}
async function titles(p){return p.locator('#song-list > .accordion-item').evaluateAll(ns=>ns.map(n=>n.dataset.songTitle));}
async function select(p,id,value){await p.selectOption(id,value);await settle(p);}
async function grouped(s){await select(s.p,'#mode-select','song');await rng(s.p);await select(s.p,'#sort-session','random');}
async function search(p,value){await p.fill('#search-input',value);await settle(p);}
function expectedLinks(rows,title,sort='date-desc'){
 const list=rows.filter(r=>r['公開']==='公開'&&r['曲名']===title).slice().sort((a,b)=>new Date(a['日付'])-new Date(b['日付']));
 if(sort!=='date-asc')list.reverse();return list.map(r=>new URL(r['リンク']).href);
}
async function open(p,title){
 const item=p.locator('#song-list > .accordion-item').filter({has:p.locator('.accordion-button',{hasText:title+' （'})});
 await item.locator('.accordion-button').click();await item.locator('.accordion-collapse.show').waitFor();
 await p.waitForFunction(()=>!document.querySelector('#song-list .collapsing'));
 return item;
}
test.beforeAll(async({browser:native})=>{await runtime.start(native);browser=runtime.browser;});
check('固定乱数0で曲名グループが期待順になり、同名履歴を分割しない',async()=>{
  for(const width of [1280,375]){const s=await sample({width});await grouped(s);assert.deepEqual(await titles(s.p),shuffled);assert.equal(await s.p.locator('#song-list .accordion-item').count(),5);assert.equal(await s.p.locator('#song-list .card').count(),0);assert.equal(await s.p.evaluate(()=>window.__randomCalls),4);assert.deepEqual(await s.p.evaluate(()=>window.__writes),[]);await s.close();}
 });
 check('ランダムでも全グループの歌唱履歴が新しい順、閉じるとカードを解放',async()=>{
  const s=await sample();await grouped(s);
  for(const title of shuffled){const item=await open(s.p,title);const links=await item.locator('[data-track="play"]').evaluateAll(ns=>ns.map(n=>n.href));assert.deepEqual(links,expectedLinks(fixture,title));assert.equal(await s.p.locator('#song-list .card').count(),links.length);await item.locator('.accordion-button').click();await item.locator('.accordion-collapse:not(.show):not(.collapsing)').waitFor({state:'attached'});assert.equal(await s.p.locator('#song-list .card').count(),0);}
  assert.deepEqual(await titles(s.p),shuffled);await s.close();
 });
 check('検索の絞り込み・該当なし・解除でも順位と乱数呼出し回数を維持',async()=>{
  const s=await sample();await grouped(s);await search(s.p,'song');assert.deepEqual(await titles(s.p),[T[1],T[3],T[0]]);await search(s.p,'not-found');assert.deepEqual(await titles(s.p),[]);await search(s.p,'');assert.deepEqual(await titles(s.p),shuffled);assert.equal(await s.p.evaluate(()=>window.__randomCalls),4);await s.close();
 });
 check('カテゴリ・配信絞り込みと解除でも元のランダム順位を維持',async()=>{
  const s=await sample();await grouped(s);await select(s.p,'#category-select','カバー曲');assert.deepEqual(await titles(s.p),[T[1],T[2],T[4]]);await select(s.p,'#category-select','');assert.deepEqual(await titles(s.p),shuffled);
  await select(s.p,'#session-select','https://youtu.be/'+ids[1]);assert.deepEqual(await titles(s.p),[T[2],T[4],T[0]]);await select(s.p,'#session-select','');assert.deepEqual(await titles(s.p),shuffled);assert.equal(await s.p.evaluate(()=>window.__randomCalls),4);await s.close();
 });
 check('お気に入り絞り込み・storage同期と解除でも順位を維持し保存形式は従来どおり',async()=>{
  const favs=[fixture[0]['リンク'],fixture[1]['リンク'],fixture[4]['リンク']];const s=await sample({favorites:favs});await grouped(s);await s.p.click('#fav-only-btn');await settle(s.p);assert.deepEqual(await titles(s.p),[T[1],T[4],T[0]]);
  await s.p.evaluate(link=>{localStorage.setItem('favorites',JSON.stringify([link]));window.dispatchEvent(new StorageEvent('storage',{key:'favorites'}));},fixture[3]['リンク']);await settle(s.p);assert.deepEqual(await titles(s.p),[T[3]]);
  await s.p.click('#fav-only-btn');await settle(s.p);assert.deepEqual(await titles(s.p),shuffled);assert.equal(await s.p.evaluate(()=>window.__randomCalls),4);assert.deepEqual(await s.p.evaluate(()=>JSON.parse(localStorage.getItem('favorites'))),[fixture[3]['リンク']]);await s.close();
 });
 check('日英切替・テーマ切替後も元のランダム順位と乱数回数を維持',async()=>{
  const s=await sample();await grouped(s);for(const lang of ['en','ja','en']){await select(s.p,'#lang-select',lang);assert.deepEqual(await titles(s.p),shuffled);await s.p.click('#dark-mode-btn');assert.deepEqual(await titles(s.p),shuffled);}assert.equal(await s.p.evaluate(()=>window.__randomCalls),4);assert.deepEqual(await s.p.evaluate(()=>window.__writes),Array(3).fill('flare-songs:theme:v1'));await s.close();
 });
 check('絞り込み中にランダムを選んでも全曲名の順序を作り、解除後に復元',async()=>{
  const s=await sample();await select(s.p,'#mode-select','song');await search(s.p,'song');await rng(s.p);await select(s.p,'#sort-session','random');assert.deepEqual(await titles(s.p),[T[1],T[3],T[0]]);await search(s.p,'');assert.deepEqual(await titles(s.p),shuffled);assert.equal(await s.p.evaluate(()=>window.__randomCalls),4);await s.close();
 });
 check('別の並び順からランダムへ再選択すると新しい順、元と同順も正常',async()=>{
  const s=await sample();await grouped(s);await select(s.p,'#sort-session','date-asc');await rng(s.p,.999999999);await select(s.p,'#sort-session','random');assert.deepEqual(await titles(s.p),T);assert.equal(await s.p.evaluate(()=>window.__randomCalls),4);await search(s.p,'song');await search(s.p,'');assert.deepEqual(await titles(s.p),T);assert.equal(await s.p.evaluate(()=>window.__randomCalls),4);await s.close();
 });
 check('新しい順・古い順のグループ代表日と歌唱履歴は起点mainと同じ',async()=>{
  const s=await sample();await select(s.p,'#mode-select','song');
  for(const sort of ['date-desc','date-asc']){await select(s.p,'#sort-session',sort);const expected=T.map(title=>({title,date:new Date(fixture.filter(r=>r['曲名']===title).sort((a,b)=>sort==='date-asc'?new Date(a['日付'])-new Date(b['日付']):new Date(b['日付'])-new Date(a['日付']))[0]['日付'])})).sort((a,b)=>sort==='date-asc'?a.date-b.date:b.date-a.date).map(g=>g.title);assert.deepEqual(await titles(s.p),expected);for(const title of T){const item=await open(s.p,title);assert.deepEqual(await item.locator('[data-track="play"]').evaluateAll(ns=>ns.map(n=>n.href)),expectedLinks(fixture,title,sort));}}
  await s.close();
 });
 check('配信枠一覧のランダムを維持し、検索結果の曲名グループだけ順位を保持',async()=>{
  const s=await sample();await rng(s.p);await select(s.p,'#sort-session','random');assert.deepEqual(await s.p.locator('#song-list > .row').evaluateAll(ns=>ns.map(n=>n.dataset.sessionUrl)),[ids[1],ids[2],ids[0]].map(id=>'https://youtu.be/'+id));
  await search(s.p,'song');assert.deepEqual(await titles(s.p),[T[1],T[3],T[0]]);await search(s.p,'');assert.equal(await s.p.locator('#song-list .accordion-item').count(),0);await search(s.p,'song');assert.deepEqual(await titles(s.p),[T[1],T[3],T[0]]);await select(s.p,'#mode-select','song');await search(s.p,'');assert.deepEqual(await titles(s.p),shuffled);await s.close();
 });
 check('この曲の歌唱履歴を見るは従来どおり全履歴を新しい順で開き、再ランダムも動作',async()=>{
  const s=await sample();await grouped(s);await s.p.evaluate(song=>{currentSurprise=allSongs.find(s=>s['曲名']===song);renderSurpriseResult();},T[0]);await s.p.click('#surprise-history');await settle(s.p);assert.deepEqual(await titles(s.p),[T[0]]);assert.equal(await s.p.locator('#sort-session').inputValue(),'date-desc');assert.deepEqual(await s.p.locator('#song-list [data-track="play"]').evaluateAll(ns=>ns.map(n=>n.href)),expectedLinks(fixture,T[0]));assert.equal(await s.p.locator('#song-list .accordion-collapse.show').count(),1);
  await rng(s.p);await select(s.p,'#sort-session','random');await search(s.p,'');assert.deepEqual(await titles(s.p),shuffled);await s.close();
 });
 check('連続した検索・並び順の変更でも最後の条件だけを描画',async()=>{
  const s=await sample();await grouped(s);await s.p.evaluate(()=>{const search=document.getElementById('search-input'),sort=document.getElementById('sort-session');search.value='not-found';search.dispatchEvent(new Event('input'));sort.value='date-asc';sort.dispatchEvent(new Event('change'));sort.value='random';sort.dispatchEvent(new Event('change'));search.value='song';search.dispatchEvent(new Event('input'));});await settle(s.p);assert.deepEqual(await titles(s.p),[T[1],T[3],T[0]]);await search(s.p,'');assert.deepEqual(await titles(s.p),shuffled);await s.close();
 });
 check('現行CSVの2,733記録・681曲名・205配信と全履歴を保持し、遅延生成・解放を維持',async()=>{
  const records=Papa.parse(actualCSV,{header:true}).data.filter(r=>r['公開']==='公開');const names=[...new Set(records.map(r=>r['曲名']))],expected=names.slice(1).concat(names[0]);assert.equal(records.length,2733);assert.equal(names.length,681);assert.equal(new Set(records.map(r=>r['配信URL'])).size,205);
  for(const width of [1280,375]){const s=await sample({width,data:actualCSV});assert.equal(await s.p.locator('#song-list .card').count(),20);await grouped(s);assert.deepEqual(await titles(s.p),expected);assert.equal(await s.p.locator('#song-list .card').count(),0);
   const rendered=await s.p.evaluate(()=>{const result=[];for(const item of document.querySelectorAll('#song-list > .accordion-item')){const collapse=item.querySelector('.accordion-collapse');accordionLoaders.get(collapse)();result.push({title:item.dataset.songTitle,links:[...item.querySelectorAll('[data-track="play"]')].map(n=>n.href)});collapse.dispatchEvent(new Event('hidden.bs.collapse'));if(item.querySelector('.card'))throw Error('Unreleased card');}return result;});
   for(const group of rendered)assert.deepEqual(group.links,expectedLinks(records,group.title));assert.equal(rendered.reduce((sum,g)=>sum+g.links.length,0),2733);assert.equal(await s.p.locator('#song-list .card').count(),0);const diag=await s.p.evaluate(()=>flareSongsDiagnostics());assert.equal(diag.acceptedRows,2763);assert.equal(diag.acceptedPublicRows,2733);assert.equal(diag.excludedRows,0);assert.deepEqual(diag.issues,[]);
   await select(s.p,'#lang-select','en');await s.p.click('#dark-mode-btn');assert.deepEqual(await titles(s.p),expected);assert.equal(await s.p.evaluate(()=>document.documentElement.scrollWidth),width);await s.p.screenshot({animations:'disabled',path:path.join(out,`f05-${width}-en-dark.png`)});await select(s.p,'#lang-select','ja');await s.p.click('#dark-mode-btn');await s.p.screenshot({animations:'disabled',path:path.join(out,`f05-${width}-ja-light.png`)});measurements.push({width,published:2733,titles:681,sessions:205,initialSessionCards:20,closedGroupCards:0,totalHistoryRecords:2733,scrollWidth:await s.p.evaluate(()=>document.documentElement.scrollWidth)});await s.close();}
 });
 check('CSV再取得でデータ集合が変わっても順位を再作成し古い曲名を残さない',async()=>{
  const s=await sample();await grouped(s);const smaller=Papa.unparse(fixture.filter(r=>[T[0],T[2],T[4]].includes(r['曲名'])));await s.c.route('**/pub?output=csv',route=>route.fulfill({body:smaller,contentType:'text/csv',headers:{'access-control-allow-origin':'*'}}));await s.p.evaluate(()=>loadSongs());await settle(s.p);assert.deepEqual(await titles(s.p),[T[2],T[4],T[0]]);assert.equal(await s.p.evaluate(()=>flareSongsDiagnostics().acceptedPublicRows),9);await s.close();
 });

test.afterAll(()=>{assert.deepEqual(errors,[]);});
