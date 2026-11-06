const {test,runtime}=require('../../helpers/browser.cjs').suite();
const {site,maintenance,snapshot,artifact,localAsset}=require('../../helpers/paths.cjs');
const baseURL=()=>runtime.origin;
const url=()=>runtime.origin+'/';
const idsByName={
  "実CSVの初期表示は20カード以下・保存領域の読み込みは1回・PC/375px": "LAZY-B01",
  "実スクロールで追加表示し、配信枠を分割しても見出し・曲順を維持": "LAZY-B02",
  "実CSVの全2,733件へ到達し、欠落・順序混在・余分な重複がない": "LAZY-B03",
  "未表示の古い歌唱も検索・4分類の抽選・完全一致の全履歴の対象": "LAZY-B04",
  "曲名一覧は開く時だけ生成し、閉じると破棄・再開時のお気に入りも正しい": "LAZY-B05",
  "抽選では一覧の星を走査・更新せず、同一形式の保存とstorageイベントに対応": "LAZY-B06",
  "追加描画予約と検索・並べ替えの競合をキャンセルし、連続変更は最後の条件のみ": "LAZY-B07",
  "IntersectionObserverがない環境も手動追加で全件を表示できる": "LAZY-B08"
};
function check(name,fn){if(!idsByName[name])throw Error('Unmapped case: '+name);test(idsByName[name]+' '+name,fn);}
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dev=maintenance;


const Papa=require('papaparse');
const {orderedLinks}=require('../../helpers/session-order-reference.cjs');
const csv=fs.readFileSync(snapshot('songs.csv'),'utf8');
const output=artifact();fs.mkdirSync(output,{recursive:true});
let browser;
const passed=[],errors=[];
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=','base64');
const instrumentation=`
;(() => {
  window.__counts={favoriteReads:0,scans:0,updates:0,created:0};
  const get=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key==='favorites')__counts.favoriteReads++;return get.call(this,key)};
  const query=document.querySelectorAll.bind(document);document.querySelectorAll=function(value){if(value==='[data-favorite-key]')__counts.scans++;return query(value)};
  const update=updateFavoriteButton;updateFavoriteButton=function(...args){__counts.updates++;return update(...args)};
  const card=createCardCol;createCardCol=function(...args){__counts.created++;return card(...args)};
})();`;

async function frames(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function settle(page){await page.waitForFunction(()=>!document.querySelector('#song-list .spinner-border'));await frames(page);}
async function sample(data=csv,{width=1280,noObserver=false}={}){
  const context=await browser.newContext({viewport:{width,height:900}});
  if(noObserver)await context.addInitScript(()=>{window.IntersectionObserver=undefined;});
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='127.0.0.1'){
      if(url.pathname==='/script.js')return route.fulfill({body:fs.readFileSync(path.join(site,'script.js'),'utf8')+instrumentation,contentType:'text/javascript'});
      return route.continue();
    }

    if(url.hostname==='docs.google.com')return route.fulfill({body:data,contentType:'text/csv; charset=utf-8',headers:{'access-control-allow-origin':'*'}});
    if(url.hostname==='img.youtube.com')return route.fulfill({body:pixel,contentType:'image/png'});
    return route.abort();
  });
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto(runtime.origin+'/');await page.waitForFunction(()=>songsLoaded);await settle(page);
  return {page,close:()=>context.close()};
}
function fixture(title,index,session='A',extra={}){
  return {'曲名':title,'公開':'公開','日付':session==='A'?'2026/01/01':'2025/01/01','配信日':'2026年配信','配信タイトル':'配信 '+session,'配信URL':'https://youtu.be/'+(session==='A'?'zhGqJdOEcS4':'Y-Kwrj8KpH0'),'リンク':'https://www.youtube.com/watch?v=zhGqJdOEcS4&t='+(index+100)+'s',ThumbnailURL:'https://img.youtube.com/vi/zhGqJdOEcS4/maxresdefault.jpg',Category:'歌枠','開始秒数':String(index),...extra};
}
async function actualLinks(page){return page.locator('#song-list [data-track="play"]').evaluateAll(nodes=>nodes.map(node=>node.href));}
async function referenceLinks(page,sort='date-desc'){
  return orderedLinks(await page.evaluate(()=>allSongs),sort);
}
test.beforeAll(async({browser:native})=>{await runtime.start(native);browser=runtime.browser;});
check('実CSVの初期表示は20カード以下・保存領域の読み込みは1回・PC/375px',async()=>{
    for(const width of [1280,375]){const s=await sample(csv,{width});const p=s.page;
      const counts=await p.evaluate(()=>({published:allSongs.filter(row=>row['公開']==='公開').length,cards:document.querySelectorAll('#song-list .card').length,nodes:document.querySelectorAll('#song-list *').length,reads:__counts.favoriteReads}));
      assert.ok(counts.published>2700);assert.equal(counts.cards,20);assert.ok(counts.nodes<500);assert.equal(counts.reads,1);
      await s.close();
    }
  });
  check('実スクロールで追加表示し、配信枠を分割しても見出し・曲順を維持',async()=>{
    const rows=[...Array.from({length:35},(_,i)=>fixture('A'+i,i)).reverse(),...Array.from({length:5},(_,i)=>fixture('B'+i,40+i,'B'))];
    const s=await sample(Papa.unparse(rows));const p=s.page;
    assert.equal(await p.locator('#song-list .card').count(),20);
    assert.equal(await p.locator('#song-list h5.mt-4').count(),1);
    await p.locator('#scroll-anchor').scrollIntoViewIfNeeded();
    await p.waitForFunction(()=>document.querySelectorAll('#song-list .card').length===40);
    assert.equal(await p.locator('#song-list h5.mt-4').count(),2);
    assert.deepEqual(await p.locator('#song-list > .row').evaluateAll(nodes=>nodes.map(node=>node.querySelectorAll('.card').length)),[35,5]);
    assert.deepEqual(await actualLinks(p),(await referenceLinks(p)));
    assert.equal(await p.locator('#load-more-btn').isVisible(),false);await s.close();
  });
  check('実CSVの全2,733件へ到達し、欠落・順序混在・余分な重複がない',async()=>{
    const s=await sample();const p=s.page;const expected=await referenceLinks(p);
    const batches=await p.evaluate(async()=>{
      const sizes=[];
      while(!document.getElementById('load-more-btn').hidden){
        const before=document.querySelectorAll('#song-list .card').length;
        document.getElementById('load-more-btn').click();
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        sizes.push(document.querySelectorAll('#song-list .card').length-before);
        if(sizes.length>200)throw Error('Progressive rendering did not finish');
      }
      return sizes;
    });
    assert.ok(batches.every(count=>count>0&&count<=20));
    assert.deepEqual(await actualLinks(p),expected);
    assert.equal(await p.locator('#song-list h5.mt-4').count(),await p.evaluate(()=>new Set(allSongs.filter(row=>row['公開']==='公開').map(row=>row['配信URL'])).size));
    await s.close();
  });
  check('未表示の古い歌唱も検索・4分類の抽選・完全一致の全履歴の対象',async()=>{
    const s=await sample();const p=s.page;
    const target=await p.evaluate(()=>allSongs.filter(row=>row['公開']==='公開'&&isPlayableYouTubeLink(row['リンク'])).at(0));
    assert.ok(!(await actualLinks(p)).includes(new URL(target['リンク']).href));
    await p.fill('#search-input',target['曲名']);await settle(p);
    const expectedGroups=await p.evaluate(()=>new Set(allSongs.filter(row=>row['公開']==='公開'&&row['曲名'].toLowerCase().includes(document.getElementById('search-input').value.toLowerCase())).map(row=>row['曲名'])).size);
    assert.equal(await p.locator('#song-list .accordion-item').count(),expectedGroups);
    assert.equal(await p.locator('#song-list .card').count(),0);
    await p.click('#reset-btn');await settle(p);
    await p.evaluate(title=>{
      sessionStorage.clear();const groups=getSurpriseGroups(allSongs,'all');const index=[...groups.keys()].indexOf(title);let n=0;
      Math.random=()=>n++===0?(index+0.1)/groups.size:0;drawSurprise();
    },target['曲名']);
    assert.equal(await p.locator('#surprise-song-title').innerText(),target['曲名']);
    await p.click('#surprise-favorite');
    await p.click('#fav-only-btn');await settle(p);
    assert.deepEqual(await actualLinks(p),[new URL(target['リンク']).href]);
    await p.click('#fav-only-btn');await settle(p);
    const title=await p.evaluate(()=>[...getSurpriseGroups(allSongs,'all').keys()].find(title=>getPublicHistory(title).length>1));
    await p.evaluate(title=>{currentSurprise=getPublicHistory(title)[0];renderSurpriseResult();},title);
    const expected=await p.evaluate(title=>getPublicHistory(title).slice().sort((a,b)=>new Date(b['日付'])-new Date(a['日付'])).map(row=>new URL(row['リンク']).href),title);
    await p.selectOption('#category-select','カバー曲');await settle(p);await p.click('#fav-only-btn');await settle(p);
    await p.click('#surprise-history');await settle(p);
    await p.waitForFunction(()=>document.activeElement?.classList.contains('accordion-button'));
    assert.equal(await p.locator('#song-list .accordion-item').count(),1);assert.deepEqual(await actualLinks(p),expected);
    assert.equal(await p.locator('#song-list .accordion-collapse.show').count(),1);await s.close();
  });
  check('曲名一覧は開く時だけ生成し、閉じると破棄・再開時のお気に入りも正しい',async()=>{
    const s=await sample();const p=s.page;await p.selectOption('#mode-select','song');await settle(p);
    assert.equal(await p.locator('#song-list .card').count(),0);
    const title=await p.locator('#song-list .accordion-item').first().getAttribute('data-song-title');
    const count=await p.evaluate(title=>getPublicHistory(title).length,title);
    await p.locator('#song-list .accordion-button').first().click();await p.waitForFunction(()=>document.querySelector('#song-list .accordion-collapse').classList.contains('show'));
    assert.equal(await p.locator('#song-list .card').count(),count);
    const star=p.locator('#song-list .fav-btn').first();const key=await star.getAttribute('data-favorite-key');await star.click();
    await p.locator('#song-list .accordion-button').first().click();await p.waitForFunction(()=>document.querySelectorAll('#song-list .card').length===0);
    await p.locator('#song-list .accordion-button').first().click();await p.waitForFunction(()=>document.querySelector('#song-list .accordion-collapse').classList.contains('show'));
    assert.equal(await p.locator('[data-favorite-key="'+key+'"]').first().getAttribute('aria-pressed'),'true');await s.close();
  });
  check('抽選では一覧の星を走査・更新せず、同一形式の保存とstorageイベントに対応',async()=>{
    const s=await sample();const p=s.page;
    const before=await p.evaluate(()=>({...__counts}));await p.click('#surprise-pick');for(let i=0;i<20;i++)await p.click('#surprise-again');
    const after=await p.evaluate(()=>({...__counts}));assert.equal(after.scans,before.scans);assert.equal(after.updates,before.updates);assert.equal(after.favoriteReads,1);
    const key=await p.locator('#song-list .fav-btn').first().getAttribute('data-favorite-key');
    await p.evaluate(key=>{const value=JSON.stringify([key]);localStorage.setItem('favorites',value);window.dispatchEvent(new StorageEvent('storage',{key:'favorites',newValue:value,storageArea:localStorage}));},key);
    assert.equal(await p.locator('#song-list .fav-btn').first().getAttribute('aria-pressed'),'true');
    await p.click('#fav-only-btn');await settle(p);assert.equal(await p.locator('#song-list .card').count(),1);
    assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('favorites'))),[key]);await s.close();
  });
  check('追加描画予約と検索・並べ替えの競合をキャンセルし、連続変更は最後の条件のみ',async()=>{
    const s=await sample();const p=s.page;
    await p.evaluate(()=>{
      document.getElementById('load-more-btn').click();
      const search=document.getElementById('search-input');search.value='の';search.dispatchEvent(new Event('input',{bubbles:true}));
    });await settle(p);assert.equal(await p.locator('#song-list .row[data-session-url]').count(),0);assert.equal(await p.locator('#song-list .card').count(),0);
    const winners=await p.evaluate(async()=>{
      const promises=[];for(let i=0;i<12;i++){
        document.getElementById('search-input').value='';document.getElementById('mode-select').value='session';document.getElementById('sort-session').value=i===11?'date-asc':'date-desc';promises.push(applyView());
      }return Promise.all(promises);
    });await settle(p);assert.equal(winners.filter(Boolean).length,1);
    assert.deepEqual(await actualLinks(p),(await referenceLinks(p,'date-asc')).slice(0,20));
    // 展開アニメーション中の再描画でも、破棄したBootstrap要素のコールバックを残さない。
    await p.selectOption('#mode-select','song');await settle(p);
    await p.locator('#song-list .accordion-button').first().click();
    await p.selectOption('#mode-select','session');await settle(p);await frames(p);
    assert.equal(await p.locator('#song-list .card').count(),20);await s.close();
  });
  check('IntersectionObserverがない環境も手動追加で全件を表示できる',async()=>{
    const rows=Array.from({length:45},(_,i)=>fixture('Fallback '+i,i));const s=await sample(Papa.unparse(rows),{noObserver:true});const p=s.page;
    assert.equal(await p.locator('#song-list .card').count(),20);
    await p.evaluate(()=>document.getElementById('load-more-btn').click());await frames(p);assert.equal(await p.locator('#song-list .card').count(),40);
    await p.evaluate(()=>document.getElementById('load-more-btn').click());await frames(p);assert.equal(await p.locator('#song-list .card').count(),45);assert.equal(await p.locator('#load-more-btn').isVisible(),false);await s.close();
  });

test.afterAll(()=>{assert.deepEqual(errors,[]);});
