const {test,runtime}=require('../../helpers/browser.cjs').suite();
const {site,maintenance,snapshot,artifact,localAsset}=require('../../helpers/paths.cjs');
const baseURL=()=>runtime.origin;
const url=()=>runtime.origin+'/';
const idsByName={
  "お気に入り絞り込みのaria-pressedは初期・ON/OFF・言語・リセット・再読込と一致": "F06-B01",
  "キーボード解除は次のカードへ引継ぎ（EnterとSpace）": "F06-B02",
  "次がない最後のカードの解除は前のカードへ引継ぎ": "F06-B03",
  "最後の1件を解除すると上部のお気に入り絞り込みへ戻る": "F06-B04",
  "マウスで解除した場合は別の星や上部ボタンへ移動しない": "F06-B05",
  "別タブ相当のstorage更新ではフォーカスを移動しない": "F06-B06",
  "解除後の非同期描画より新しい検索操作を優先しフォーカスを奪わない": "F06-B07",
  "解除後にTabで別操作へ進んだ場合とpointerdown後は古いフォーカス引継ぎを中止": "F06-B08",
  "曲名一覧の解除は必要なグループだけを再展開して次の星へ引継ぎ": "F06-B09",
  "曲名グループの最後の1件を解除しても次のグループへ引継ぎ": "F06-B10",
  "追加表示後の解除も20件単位を維持して次のカードへ引継ぎ": "F06-B11",
  "通常の星ON/OFFとおまかせ側の操作では元のボタンのフォーカスを保持": "F06-B12",
  "検索・カテゴリ・配信・お気に入り・表示モードの件数がデータと一致": "F06-B13",
  "曲名グループ数と全履歴数はカード未生成でも正しい": "F06-B14",
  "自動追加は画面件数だけ更新し、手動追加でのみ追加を通知": "F06-B15",
  "検索入力が連続しても読み上げ通知は確定後の1回に集約": "F06-B16",
  "状態通知だけではスクロールやフォーカスを変更しない": "F06-B17",
  "結果なし・日英・リセットでも件数と既存該当なし表示が整合": "F06-B18",
  "通信失敗・再試行・再読込中は件数を消し、errorを0件に変えない": "F06-B19",
  "古い検索・追加表示予約を新しいフィルタと通信エラーが上書き": "F06-B20",
  "対象文字と操作状態をライト・ダークで実測し基準を満たす": "F06-B21",
  "Tab・Enter・Spaceによるフィルタ・星・追加表示とフォーカス枠": "F06-B22",
  "1280・768・375px×日英×両テーマで文字切れ・重なり・横スクロールなし": "F06-B23",
  "実CSV全2,763記録・公開2,733・681曲名・205配信と遅延生成を維持": "F06-B24"
};
function check(name,fn){if(!idsByName[name])throw Error('Unmapped case: '+name);test(idsByName[name]+' '+name,fn);}
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const kit=maintenance,out=artifact();
const Papa=require('papaparse');
const ids=['zhGqJdOEcS4','Y-Kwrj8KpH0','JUXIXgRI-TY'];
const rows=Array.from({length:70},(_,i)=>{const d=i<45?0:i<60?1:2;return {'曲名':'Song '+i%7,'日付':(2026-d)+'/01/01','配信日':'Session date '+d,'配信タイトル':'Session '+d,'配信URL':'https://youtu.be/'+ids[d],'リンク':'https://youtu.be/'+ids[d]+'?t='+(i+1)*10,'備考':'',VideoID:ids[d],ThumbnailURL:'https://img.youtube.com/vi/'+ids[d]+'/maxresdefault.jpg','公開':'公開',Category:i%3===0?'カバー曲':'歌枠',Tags:''};});
const fixture=Papa.unparse(rows),actualCSV=fs.readFileSync(snapshot('songs.csv'),'utf8'),passed=[],errors=[],contrasts=[],layouts=[],focusEvidence=[];let browser;

async function settle(p){await p.waitForFunction(()=>typeof songLoadState!=='undefined'&&songLoadState==='ready'&&!document.querySelector('#song-list .spinner-border'));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function sample({width=1280,theme='light',data=fixture,favorites=[],fail=false,fakeIO=true}={}){
 const c=await browser.newContext({viewport:{width,height:1000},colorScheme:theme});let failNow=fail;
 await c.addInitScript(({favorites,fakeIO,origin})=>{if(location.origin!==origin)return;localStorage.setItem('favorites',JSON.stringify(favorites));
  if(fakeIO){window.__observers=[];window.IntersectionObserver=class{constructor(callback){this.cb=callback;this.active=true;window.__observers.push(this);}observe(){}disconnect(){this.active=false;}};window.__autoMore=()=>{for(const observer of window.__observers)if(observer.active)observer.cb([{isIntersecting:true}]);};}
 },{favorites,fakeIO,origin:runtime.origin});
 await c.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();if(u.hostname==='docs.google.com'){if(failNow)return route.abort('failed');return route.fulfill({body:data,contentType:'text/csv; charset=utf-8',headers:{'access-control-allow-origin':'*'}});}if(u.hostname==='img.youtube.com')return route.fulfill({path:localAsset('sample-thumbnail.jpg'),contentType:'image/jpeg'});return route.abort();});
 const p=await c.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));await p.goto(runtime.origin+'/');
 if(fail)await p.waitForFunction(()=>songLoadState==='error');else await settle(p);
 return {p,c,recover:()=>{failNow=false;},close:()=>c.close()};
}
async function select(p,id,value){await p.selectOption(id,value);await settle(p);}
async function summary(p,text){assert.equal(await p.locator('#result-summary').textContent(),text);assert.equal(await p.locator('#result-summary').isVisible(),true);}
async function focusKey(p){return p.evaluate(()=>document.activeElement?.dataset.favoriteKey||document.activeElement?.id||document.activeElement?.tagName);}
async function waitKey(p,key){await p.waitForFunction(key=>document.activeElement?.dataset.favoriteKey===key,key);}
async function favorites(s){await s.p.click('#fav-only-btn');await settle(s.p);}
async function openFirst(p){await p.locator('#song-list .accordion-button').first().click();await p.waitForFunction(()=>!!document.querySelector('#song-list .accordion-collapse.show')&&!document.querySelector('#song-list .collapsing'));}
async function pause(p,ms=650){await p.waitForTimeout(ms);}
async function styleContrast(p,selector,label,theme,state='normal'){
 const result=await p.locator(selector).first().evaluate(e=>{const style=getComputedStyle(e);
  const rgba=c=>{const v=c.match(/[\d.]+/g).map(Number);return v.length===3?[...v,1]:v;};
  const over=(top,base)=>[...top.slice(0,3).map((v,i)=>v*top[3]+base[i]*(1-top[3])),1];
  const chain=[];for(let node=e;node;node=node.parentElement)chain.push(node);
  let background=[255,255,255,1],outer=background;
  for(const node of chain.reverse()){outer=background;background=over(rgba(getComputedStyle(node).backgroundColor),background);}
  const foreground=over(rgba(style.color),background);
  const lum=c=>{const v=c.slice(0,3).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return .2126*v[0]+.7152*v[1]+.0722*v[2];};
  const ratio=(a,b)=>{a=lum(a);b=lum(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
  if(e.classList.contains('fav-btn'))outer=[255,255,255,1]; // 白いフォーカス用ハローに隣接する枠。
  return {foreground:style.color,effectiveForeground:foreground.slice(0,3),background:background.slice(0,3),ratio:ratio(foreground,background),size:parseFloat(style.fontSize),weight:Number(style.fontWeight),opacity:style.opacity,outline:style.outline,outlineRatio:ratio(rgba(style.outlineColor),outer),outlineWidth:parseFloat(style.outlineWidth)};});
 const required=result.size>=24||result.size>=18.6667&&result.weight>=700?3:4.5;assert(result.ratio>=required,`${label}/${theme}/${state}: ${result.ratio} < ${required}`);assert.equal(result.opacity,'1');contrasts.push({label,theme,state,required,...result});return result;
}
test.beforeAll(async({browser:native})=>{await runtime.start(native);browser=runtime.browser;});
check('お気に入り絞り込みのaria-pressedは初期・ON/OFF・言語・リセット・再読込と一致',async()=>{
  const s=await sample({favorites:[rows[0]['リンク']]});const p=s.p;assert.equal(await p.locator('#fav-only-btn').getAttribute('aria-pressed'),'false');await favorites(s);assert.equal(await p.locator('#fav-only-btn').getAttribute('aria-pressed'),'true');await select(p,'#lang-select','en');assert.equal(await p.locator('#fav-only-btn').getAttribute('aria-pressed'),'true');await p.evaluate(()=>loadSongs());await settle(p);assert.equal(await p.locator('#fav-only-btn').getAttribute('aria-pressed'),'true');await p.click('#fav-only-btn');await settle(p);assert.equal(await p.locator('#fav-only-btn').getAttribute('aria-pressed'),'false');await favorites(s);await p.click('#reset-btn');await settle(p);assert.equal(await p.locator('#fav-only-btn').getAttribute('aria-pressed'),'false');await s.close();
 });
 check('キーボード解除は次のカードへ引継ぎ（EnterとSpace）',async()=>{
  for(const key of ['Enter','Space']){const s=await sample({favorites:rows.slice(0,3).map(r=>r['リンク'])});await favorites(s);const b=s.p.locator('#song-list .fav-btn');await b.first().focus();await s.p.keyboard.press(key);await waitKey(s.p,rows[1]['リンク']);focusEvidence.push({case:'next',key,target:await focusKey(s.p)});assert.equal(await b.count(),2);await s.p.screenshot({path:path.join(out,`f06-focus-next-${key}.png`),animations:'disabled'});await s.close();}
 });
 check('次がない最後のカードの解除は前のカードへ引継ぎ',async()=>{
  const s=await sample({favorites:rows.slice(0,3).map(r=>r['リンク'])});await favorites(s);await s.p.locator('#song-list .fav-btn').last().focus();await s.p.keyboard.press('Space');await waitKey(s.p,rows[1]['リンク']);focusEvidence.push({case:'previous',target:await focusKey(s.p)});await s.close();
 });
 check('最後の1件を解除すると上部のお気に入り絞り込みへ戻る',async()=>{
  const s=await sample({favorites:[rows[0]['リンク']]});await favorites(s);await s.p.locator('#song-list .fav-btn').focus();await s.p.keyboard.press('Enter');await s.p.waitForFunction(()=>document.activeElement.id==='fav-only-btn');await summary(s.p,'歌唱記録 0件（0件表示中）');assert.equal(await s.p.locator('#fav-only-btn').getAttribute('aria-pressed'),'true');focusEvidence.push({case:'last',target:await focusKey(s.p)});await s.p.screenshot({path:path.join(out,'f06-focus-empty.png'),animations:'disabled'});await s.close();
  // 同じ保存キーの重複20記録が一括で消えても、残るカードを優先する。
  const duplicateCSV=Papa.unparse([...Array.from({length:20},()=>({...rows[0]})),rows[1]]);
  const d=await sample({data:duplicateCSV,favorites:[rows[0]['リンク'],rows[1]['リンク']]});await favorites(d);assert.equal(await d.p.locator('#song-list .card').count(),20);await d.p.locator('#song-list .fav-btn').first().focus();await d.p.keyboard.press('Enter');await waitKey(d.p,rows[1]['リンク']);assert.equal(await d.p.locator('#song-list .card').count(),1);await d.close();
 });
 check('マウスで解除した場合は別の星や上部ボタンへ移動しない',async()=>{
  const s=await sample({favorites:rows.slice(0,3).map(r=>r['リンク'])});await favorites(s);await s.p.locator('#song-list .fav-btn').first().click();await settle(s.p);await pause(s.p,150);assert.equal(await focusKey(s.p),'BODY');await s.close();
 });
 check('別タブ相当のstorage更新ではフォーカスを移動しない',async()=>{
  const s=await sample({favorites:rows.slice(0,3).map(r=>r['リンク'])});await favorites(s);await s.p.locator('#song-list .fav-btn').first().focus();await s.p.evaluate(keys=>{localStorage.setItem('favorites',JSON.stringify(keys));window.dispatchEvent(new StorageEvent('storage',{key:'favorites'}));},[rows[1]['リンク']]);await settle(s.p);assert.equal(await focusKey(s.p),'BODY');assert.equal(await s.p.locator('#song-list .card').count(),1);await s.close();
 });
 check('解除後の非同期描画より新しい検索操作を優先しフォーカスを奪わない',async()=>{
  const s=await sample({favorites:rows.slice(0,3).map(r=>r['リンク'])});await favorites(s);await s.p.locator('#song-list .fav-btn').first().focus();await s.p.keyboard.press('Enter');await s.p.locator('#search-input').focus();await s.p.fill('#search-input','Song 2');await settle(s.p);await pause(s.p,150);assert.equal(await focusKey(s.p),'search-input');await summary(s.p,'曲名 1件・歌唱履歴 1件');await s.close();
 });
 check('解除後にTabで別操作へ進んだ場合とpointerdown後は古いフォーカス引継ぎを中止',async()=>{
  for(const action of ['tab','pointer']){const s=await sample({favorites:rows.slice(0,3).map(r=>r['リンク'])});await favorites(s);await s.p.locator('#song-list .fav-btn').first().focus();await s.p.keyboard.press('Enter');if(action==='tab')await s.p.keyboard.press('Tab');else await s.p.evaluate(()=>document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));const target=await focusKey(s.p);await settle(s.p);await pause(s.p,150);assert.equal(await focusKey(s.p),target);await s.close();}
 });
 check('曲名一覧の解除は必要なグループだけを再展開して次の星へ引継ぎ',async()=>{
  const s=await sample({favorites:[rows[0]['リンク'],rows[7]['リンク'],rows[14]['リンク']]});await select(s.p,'#mode-select','song');await favorites(s);await openFirst(s.p);const buttons=s.p.locator('#song-list .fav-btn'),keys=await buttons.evaluateAll(ns=>ns.map(n=>n.dataset.favoriteKey));await buttons.nth(1).focus();await s.p.keyboard.press('Space');await waitKey(s.p,keys[2]);assert.equal(await s.p.locator('#song-list .accordion-collapse.show').count(),1);assert.equal(await s.p.locator('#song-list .card').count(),2);await s.close();
 });
 check('曲名グループの最後の1件を解除しても次のグループへ引継ぎ',async()=>{
  const s=await sample({favorites:[rows[0]['リンク'],rows[1]['リンク']]});await select(s.p,'#mode-select','song');await favorites(s);await openFirst(s.p);await s.p.locator('#song-list .fav-btn').focus();await s.p.keyboard.press('Enter');await waitKey(s.p,rows[1]['リンク']);assert.equal(await s.p.locator('#song-list .card').count(),1);await s.close();
 });
 check('追加表示後の解除も20件単位を維持して次のカードへ引継ぎ',async()=>{
  const s=await sample({favorites:rows.map(r=>r['リンク'])});await favorites(s);await s.p.evaluate(async()=>{document.getElementById('load-more-btn').click();await new Promise(requestAnimationFrame);document.getElementById('load-more-btn').click();});await s.p.waitForFunction(()=>document.querySelectorAll('#song-list .card').length===60);const b=s.p.locator('#song-list .fav-btn').nth(45),expected=await s.p.locator('#song-list .fav-btn').nth(46).getAttribute('data-favorite-key');await b.focus();await s.p.keyboard.press('Enter');await waitKey(s.p,expected);assert.equal(await s.p.locator('#song-list .card').count(),60);await summary(s.p,'歌唱記録 69件（60件表示中）');await s.close();
 });
 check('通常の星ON/OFFとおまかせ側の操作では元のボタンのフォーカスを保持',async()=>{
  const s=await sample();const b=s.p.locator('#song-list .fav-btn').first();await b.focus();await s.p.keyboard.press('Space');assert.equal(await b.getAttribute('aria-pressed'),'true');assert.equal(await b.evaluate(e=>document.activeElement===e),true);await s.p.keyboard.press('Enter');assert.equal(await b.getAttribute('aria-pressed'),'false');await s.p.click('#surprise-pick');await s.p.locator('#surprise-favorite').focus();await s.p.keyboard.press('Space');assert.equal(await focusKey(s.p),'surprise-favorite');await favorites(s);await s.p.locator('#surprise-favorite').focus();await s.p.keyboard.press('Space');await settle(s.p);assert.equal(await focusKey(s.p),'surprise-favorite');await s.close();
 });
 check('検索・カテゴリ・配信・お気に入り・表示モードの件数がデータと一致',async()=>{
  const s=await sample({favorites:rows.slice(0,3).map(r=>r['リンク'])});await summary(s.p,'歌唱記録 70件（20件表示中）');await select(s.p,'#category-select','カバー曲');await summary(s.p,'歌唱記録 24件（20件表示中）');await select(s.p,'#session-select','https://youtu.be/'+ids[0]);await summary(s.p,'歌唱記録 15件（15件表示中）');await select(s.p,'#mode-select','song');await summary(s.p,'曲名 7件・歌唱履歴 15件');await s.p.fill('#search-input','Song 1');await settle(s.p);await summary(s.p,'曲名 1件・歌唱履歴 2件');await s.p.click('#reset-btn');await settle(s.p);await favorites(s);await summary(s.p,'歌唱記録 3件（3件表示中）');await s.close();
 });
 check('曲名グループ数と全履歴数はカード未生成でも正しい',async()=>{
  const s=await sample();await select(s.p,'#mode-select','song');await summary(s.p,'曲名 7件・歌唱履歴 70件');assert.equal(await s.p.locator('#song-list .card').count(),0);await openFirst(s.p);await summary(s.p,'曲名 7件・歌唱履歴 70件');assert.equal(await s.p.locator('#song-list .card').count(),10);await select(s.p,'#lang-select','en');await summary(s.p,'Song titles: 7 · Performances: 70');await s.p.click('#surprise-pick');await s.p.click('#surprise-history');await settle(s.p);await summary(s.p,'Song titles: 1 · Performances: 10');await s.close();
 });
 check('自動追加は画面件数だけ更新し、手動追加でのみ追加を通知',async()=>{
  const s=await sample();await pause(s.p);const before=await s.p.locator('#result-announcement').textContent();await s.p.evaluate(()=>window.__autoMore());await s.p.waitForFunction(()=>document.querySelectorAll('#song-list .card').length===40);await summary(s.p,'歌唱記録 70件（40件表示中）');await pause(s.p);assert.equal(await s.p.locator('#result-announcement').textContent(),before);
  await s.p.evaluate(()=>document.getElementById('load-more-btn').click());await s.p.waitForFunction(()=>document.querySelectorAll('#song-list .card').length===60);await pause(s.p,100);assert.equal(await s.p.locator('#result-announcement').textContent(),'追加表示しました。歌唱記録 70件（60件表示中）');await s.p.evaluate(()=>document.getElementById('load-more-btn').click());await s.p.waitForFunction(()=>document.querySelectorAll('#song-list .card').length===70);await summary(s.p,'歌唱記録 70件（70件表示中）');assert.equal(await s.p.locator('#load-more-btn').isVisible(),false);await s.close();
 });
 check('検索入力が連続しても読み上げ通知は確定後の1回に集約',async()=>{
  const s=await sample();await pause(s.p);await s.p.evaluate(()=>{window.__messages=[];new MutationObserver(()=>{const text=document.getElementById('result-announcement').textContent;if(text)window.__messages.push(text);}).observe(document.getElementById('result-announcement'),{childList:true,subtree:true,characterData:true});});
  for(const text of ['S','So','Song','Song 1']){await s.p.fill('#search-input',text);await pause(s.p,90);}await settle(s.p);await pause(s.p);assert.deepEqual(await s.p.evaluate(()=>window.__messages),['曲名 1件・歌唱履歴 10件']);await s.close();
 });
 check('状態通知だけではスクロールやフォーカスを変更しない',async()=>{
  const s=await sample();await s.p.locator('#search-input').focus();await s.p.evaluate(()=>scrollTo(0,100));const before=await s.p.evaluate(()=>({y:scrollY,focus:document.activeElement.id}));await pause(s.p);await s.p.evaluate(()=>document.getElementById('load-more-btn').click());await s.p.waitForFunction(()=>document.querySelectorAll('#song-list .card').length===40);await pause(s.p,100);assert.deepEqual(await s.p.evaluate(()=>({y:scrollY,focus:document.activeElement.id})),before);await s.close();
 });
 check('結果なし・日英・リセットでも件数と既存該当なし表示が整合',async()=>{
  const s=await sample();await s.p.fill('#search-input','not-found');await settle(s.p);await summary(s.p,'曲名 0件・歌唱履歴 0件');assert.match(await s.p.locator('#song-list').textContent(),/該当曲がありません/);await select(s.p,'#lang-select','en');await summary(s.p,'Song titles: 0 · Performances: 0');await s.p.click('#reset-btn');await settle(s.p);await summary(s.p,'Song records: 70 (20 shown)');await s.close();
 });
 check('通信失敗・再試行・再読込中は件数を消し、errorを0件に変えない',async()=>{
  const s=await sample({fail:true});assert.equal(await s.p.locator('#result-summary').isVisible(),false);assert.equal(await s.p.locator('#result-announcement').textContent(),'');await s.p.fill('#search-input','Song');await s.p.selectOption('#lang-select','en');assert.equal(await s.p.evaluate(()=>songLoadState),'error');assert.equal(await s.p.locator('#result-summary').isVisible(),false);s.recover();await s.p.locator('[data-reload-songs]').click();await settle(s.p);await summary(s.p,'Song titles: 7 · Performances: 70');await s.p.evaluate(()=>loadSongs());assert.equal(await s.p.locator('#result-summary').isVisible(),false);await settle(s.p);await s.close();
 });
 check('古い検索・追加表示予約を新しいフィルタと通信エラーが上書き',async()=>{
  const s=await sample();await s.p.evaluate(()=>{document.getElementById('load-more-btn').click();const input=document.getElementById('search-input');for(const v of ['Song','none','Song 2']){input.value=v;input.dispatchEvent(new Event('input'));}});await settle(s.p);await summary(s.p,'曲名 1件・歌唱履歴 10件');await s.c.route('**/pub?output=csv',route=>route.abort('failed'));await s.p.evaluate(()=>loadSongs());await s.p.waitForFunction(()=>songLoadState==='error');await pause(s.p);assert.equal(await s.p.locator('#result-summary').isVisible(),false);assert.equal(await s.p.locator('#result-announcement').textContent(),'');await s.close();
 });
 check('対象文字と操作状態をライト・ダークで実測し基準を満たす',async()=>{
  for(const theme of ['light','dark']){const s=await sample({theme});const p=s.p;await p.mouse.move(0,0);
   for(const [selector,label]of [['h1','title'],['h1 small','subtitle'],['#result-summary','result-summary'],['#song-list .card-body p','card-meta'],['#song-list [data-track="play"]','play'],['#song-list [data-track="orig"]','original'],['#fav-only-btn','favorites-filter'],['#song-list .fav-btn','star-off'],['#reset-btn','reset'],['#load-more-btn','more'],['#surprise-pick','surprise-existing']])await styleContrast(p,selector,label,theme);
   for(const [selector,label]of [['#song-list [data-track="play"]','play'],['#song-list [data-track="orig"]','original'],['#fav-only-btn','favorites-filter'],['#song-list .fav-btn','star-off'],['#reset-btn','reset'],['#load-more-btn','more']]){await p.locator(selector).first().focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');const result=await styleContrast(p,selector,label,theme,'focus');assert(result.outlineWidth>=2);assert(result.outlineRatio>=3);}
   for(const [selector,label]of [['#song-list [data-track="play"]','play'],['#song-list [data-track="orig"]','original'],['#fav-only-btn','favorites-filter'],['#song-list .fav-btn','star-off'],['footer a','link'],['#reset-btn','reset']]){await p.locator(selector).first().hover();await pause(p,250);await styleContrast(p,selector,label,theme,'hover');}
   await p.mouse.move(0,0);await p.locator('#song-list .fav-btn').first().focus();await p.keyboard.press('Space');await pause(p,250);await styleContrast(p,'#song-list .fav-btn','star-on',theme,'selected');await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert.equal(await p.locator('#song-list .fav-btn').first().evaluate(e=>e.matches(':focus-visible')),true);await styleContrast(p,'#song-list .fav-btn','star-on',theme,'focus');
   await p.click('#fav-only-btn');await settle(p);await pause(p,250);await styleContrast(p,'#fav-only-btn','favorites-filter',theme,'selected');await p.click('#fav-only-btn');await settle(p);await select(p,'#mode-select','song');await openFirst(p);await styleContrast(p,'#song-list .accordion-button:not(.collapsed)','expanded-heading',theme,'expanded');
   const arrow=await p.locator('#song-list .accordion-button:not(.collapsed)').evaluate(e=>{const style=getComputedStyle(e,'::after'),rgb=getComputedStyle(e).backgroundColor.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return {filter:style.filter,ratio:(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]+.05)/.05};});assert.equal(arrow.filter,'brightness(0)');assert(arrow.ratio>=3);contrasts.push({label:'expanded-arrow',theme,state:'expanded',required:3,...arrow});
   await p.locator('#song-list .accordion-button:not(.collapsed)').focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');await styleContrast(p,'#song-list .accordion-button:not(.collapsed)','expanded-heading',theme,'focus');await p.screenshot({path:path.join(out,`f06-expanded-${theme}.png`),animations:'disabled'});await s.close();
  }
 });
 check('Tab・Enter・Spaceによるフィルタ・星・追加表示とフォーカス枠',async()=>{
  const s=await sample({favorites:rows.slice(0,3).map(r=>r['リンク'])});const p=s.p;await p.locator('#reset-btn').focus();await p.keyboard.press('Tab');assert.equal(await focusKey(p),'fav-only-btn');await p.keyboard.press('Space');await settle(p);assert.equal(await p.locator('#fav-only-btn').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#fav-only-btn').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');await p.keyboard.press('Enter');await settle(p);await p.locator('#load-more-btn').focus();await p.keyboard.press('Space');await p.waitForFunction(()=>document.querySelectorAll('#song-list .card').length===40);assert.equal(await focusKey(p),'load-more-btn');assert.equal(await p.locator('#load-more-btn').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');await s.close();
 });
 check('1280・768・375px×日英×両テーマで文字切れ・重なり・横スクロールなし',async()=>{
  for(const width of [1280,768,375])for(const theme of ['light','dark'])for(const lang of ['ja','en']){const s=await sample({width,theme,data:actualCSV});if(lang==='en')await select(s.p,'#lang-select','en');const layout=await s.p.evaluate(()=>{const r=document.getElementById('result-summary').getBoundingClientRect(),list=document.getElementById('song-list').getBoundingClientRect();return {scrollWidth:document.documentElement.scrollWidth,summaryWidth:r.width,summaryHeight:r.height,summaryRight:r.right,listTop:list.top,summaryBottom:r.bottom,cardCount:document.querySelectorAll('#song-list .card').length};});assert.equal(layout.scrollWidth,width);assert(layout.summaryRight<=width);assert(layout.summaryBottom<=layout.listTop);assert.equal(layout.cardCount,20);layouts.push({width,theme,lang,...layout});await s.p.screenshot({path:path.join(out,`f06-${width}-${lang}-${theme}.png`),animations:'disabled'});await s.close();}
 });
 check('実CSV全2,763記録・公開2,733・681曲名・205配信と遅延生成を維持',async()=>{
  const s=await sample({data:actualCSV});const p=s.p;const diag=await p.evaluate(()=>flareSongsDiagnostics());assert.equal(diag.acceptedRows,2763);assert.equal(diag.acceptedPublicRows,2733);assert.equal(diag.excludedRows,0);assert.deepEqual(diag.issues,[]);await summary(p,'歌唱記録 2733件（20件表示中）');await p.evaluate(async()=>{while(!document.getElementById('load-more-btn').hidden){document.getElementById('load-more-btn').click();await new Promise(requestAnimationFrame);}});assert.equal(await p.locator('#song-list .card').count(),2733);assert.equal(await p.locator('#song-list h5.mt-4').count(),205);await summary(p,'歌唱記録 2733件（2733件表示中）');await select(p,'#mode-select','song');await summary(p,'曲名 681件・歌唱履歴 2733件');assert.equal(await p.locator('#song-list .card').count(),0);await s.close();
 });

test.afterAll(()=>{assert.deepEqual(errors,[]);});
