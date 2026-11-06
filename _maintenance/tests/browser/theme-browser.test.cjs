const {test,runtime}=require('../../helpers/browser.cjs').suite();
const {site,maintenance,snapshot,artifact,localAsset}=require('../../helpers/paths.cjs');
const baseURL=()=>runtime.origin;
const url=()=>runtime.origin+'/';
const idsByName={
  "保存なしの初期テーマは端末のライト／ダークに従い、保存しない": "THEME-B01",
  "端末と保存設定が異なる両方向で、保存設定を優先": "THEME-B02",
  "マウスで両方向の即時切替・専用キー保存、一覧を再描画しない": "THEME-B03",
  "再読み込みと同じブラウザの新しいタブでも両モードを復元": "THEME-B04",
  "不正保存値7種は未設定扱い、次の明示操作で正常値を保存": "THEME-B05",
  "storageの読取・書込・getter例外でも表示・切替・言語変更が動作": "THEME-B06",
  "日英切替とテーマ切替を繰り返しても文言・保存回数は正しい": "THEME-B07",
  "Tab・Enter・Spaceで切替、両モード・両言語で明瞭なフォーカス": "THEME-B08",
  "375pxのタップで1回だけ切替・保存": "THEME-B09",
  "375/1280px・日英・ライト/ダーク8通りで配置・視認性・横幅を維持": "THEME-B10",
  "本体JSの読込待ちでもheadでテーマを適用し、保存値・端末設定を反映": "THEME-B11",
  "CSV通信エラー中もテーマ切替可能、F04のerror状態を維持": "THEME-B12"
};
function check(name,fn){if(!idsByName[name])throw Error('Unmapped case: '+name);test(idsByName[name]+' '+name,fn);}
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const kit=maintenance,out=artifact();



const csv = fs.readFileSync(snapshot('songs.csv'), 'utf8');
const key = 'flare-songs:theme:v1';

let browser;
const passed = [], errors = [], measurements = [];

async function ready(p, state = 'ready') {
  await p.waitForFunction(s => typeof songLoadState !== 'undefined' && songLoadState === s, state);
  await p.waitForFunction(() => !document.querySelector('#song-list .spinner-border'));
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}
async function expectTheme(p, theme, lang = 'ja') {
  assert.equal(await p.locator('html').getAttribute('data-bs-theme'), theme);
  const labels = {ja: {light: 'ダークモード', dark: 'ライトモード'}, en: {light: 'Dark Mode', dark: 'Light Mode'}};
  assert.equal(await p.locator('#dark-mode-btn').textContent(), labels[lang][theme]);
}
async function sample({scheme = 'light', saved, fault, width = 1280, touch = false, hold = false, failCSV = false} = {}) {
  const c = await browser.newContext({viewport: {width, height: 1000}, colorScheme: scheme, hasTouch: touch});
  let release;
  const gate = hold ? new Promise(r => { release = r; }) : null;
  await c.addInitScript(({key, saved, fault, origin}) => {
    if (location.origin !== origin) return;
    const nativeStorage = window.localStorage;
    if (saved !== undefined && nativeStorage.getItem(key) === null) nativeStorage.setItem(key, saved);
    if (nativeStorage.getItem('favorites') === null) nativeStorage.setItem('favorites', '["legacy-link"]');
    const historyKey = 'flare-songs:surprise-history:v1';
    if (nativeStorage.getItem(historyKey) === null) nativeStorage.setItem(historyKey, '["previous"]');
    window.__readTheme = () => nativeStorage.getItem(key);
    window.__themeWrites = [];
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function(k) {
      if (k === key && fault === 'read') throw Error('Simulated read failure');
      return get.call(this, k);
    };
    Storage.prototype.setItem = function(k, value) {
      if (k === key) {
        window.__themeWrites.push(value);
        if (fault === 'write') throw Error('Simulated write failure');
      }
      return set.call(this, k, value);
    };
    window.__nativeTheme = () => get.call(nativeStorage, key);
    window.__storedCompatibility = () => [get.call(nativeStorage, 'favorites'), get.call(nativeStorage, historyKey)];
    if (fault === 'unavailable') Object.defineProperty(window, 'localStorage', {get() { throw Error('Simulated storage disabled'); }});
  }, {key, saved, fault, origin:runtime.origin});
  await c.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1') {
      if (hold && u.pathname === '/script.js') await gate;
      return route.continue();
    }
    if (u.hostname === 'cdn.jsdelivr.net') {
      const f = u.pathname.split('/').pop();
      return route.fulfill({path: localAsset(f), contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript'});
    }
    if (u.hostname === 'docs.google.com') {
      if (failCSV) return route.abort('failed');
      return route.fulfill({body: csv, contentType: 'text/csv; charset=utf-8', headers: {'access-control-allow-origin': '*'}});
    }
    if (u.hostname === 'img.youtube.com') return route.fulfill({path: localAsset('sample-thumbnail.jpg'), contentType: 'image/jpeg'});
    return route.abort();
  });
  c.on('page', p => { p.on('pageerror', e => errors.push(e.message)); p.setDefaultTimeout(15000); });
  const p = await c.newPage();
  if (hold) {
    await p.goto(url(), {waitUntil: 'commit'});
    await p.locator('#dark-mode-btn').waitFor({state: 'visible'});
  } else {
    await p.goto(url()); await ready(p, failCSV ? 'error' : 'ready');
  }
  return {p, c, release, close: () => c.close()};
}
async function metrics(p) {
  return p.evaluate(() => {
    const b = document.getElementById('dark-mode-btn');
    const s = document.getElementById('lang-select');
    const rect = e => { const r = e.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
    const style = getComputedStyle(b);
    const contrast = (a,b) => {
      const lum = color => {
        const rgb = color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => {v /= 255; return v <= .04045 ? v / 12.92 : ((v+.055)/1.055)**2.4;});
        return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
      };
      const x=lum(a), y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
    };
    const bg = getComputedStyle(document.body).backgroundColor;
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,button:rect(b),language:rect(s),parent:rect(b.parentElement),
      text:style.color,bg,contrast:contrast(style.color,bg),outline:style.outline,outlineContrast:contrast(style.outlineColor,bg),
      outlineWidth:style.outlineWidth,outlineStyle:style.outlineStyle,focusVisible:b.matches(':focus-visible'),
      border:style.borderWidth,background:style.backgroundColor,scrollY};
  });
}
test.beforeAll(async({browser:native})=>{await runtime.start(native);browser=runtime.browser;});
check('保存なしの初期テーマは端末のライト／ダークに従い、保存しない', async () => {
    for (const scheme of ['light','dark']) {
      const s = await sample({scheme}); await expectTheme(s.p, scheme);
      assert.deepEqual(await s.p.evaluate(() => window.__themeWrites), []);
      assert.equal(await s.p.evaluate(() => window.__nativeTheme()), null); await s.close();
    }
  });
  check('端末と保存設定が異なる両方向で、保存設定を優先', async () => {
    for (const saved of ['light','dark']) {
      const s = await sample({saved, scheme:saved==='light'?'dark':'light'}); await expectTheme(s.p, saved);
      assert.deepEqual(await s.p.evaluate(() => window.__themeWrites), []); await s.close();
    }
  });
  check('マウスで両方向の即時切替・専用キー保存、一覧を再描画しない', async () => {
    const s = await sample();
    const revision = await s.p.evaluate(() => {window.__firstCard=document.querySelector('#song-list .card');return viewRevision;});
    for (const theme of ['dark','light']) {
      await s.p.click('#dark-mode-btn'); await expectTheme(s.p, theme);
      assert.equal(await s.p.evaluate(() => window.__nativeTheme()), theme);
      assert.equal(await s.p.evaluate(() => viewRevision), revision);
      assert.equal(await s.p.evaluate(() => window.__firstCard === document.querySelector('#song-list .card')), true);
    }
    assert.deepEqual(await s.p.evaluate(() => window.__themeWrites), ['dark','light']);
    assert.deepEqual(await s.p.evaluate(() => window.__storedCompatibility()), ['["legacy-link"]','["previous"]']);
    await s.close();
  });
  check('再読み込みと同じブラウザの新しいタブでも両モードを復元', async () => {
    for (const scheme of ['light','dark']) {
      const s = await sample({scheme}); const chosen = scheme==='light'?'dark':'light';
      await s.p.click('#dark-mode-btn'); await expectTheme(s.p, chosen);
      await s.p.reload(); await ready(s.p); await expectTheme(s.p, chosen);
      assert.deepEqual(await s.p.evaluate(() => window.__themeWrites), []);
      const other = await s.c.newPage(); await other.goto(url()); await ready(other); await expectTheme(other, chosen);
      assert.deepEqual(await other.evaluate(() => window.__themeWrites), []); await s.close();
    }
  });
  check('不正保存値7種は未設定扱い、次の明示操作で正常値を保存', async () => {
    for (const saved of ['', 'auto', 'DARK', '"dark"', ' light ', 'null', '<script>']) {
      for (const scheme of ['light','dark']) {
        const s = await sample({scheme,saved}); await expectTheme(s.p, scheme);
        assert.equal(await s.p.evaluate(() => window.__nativeTheme()), saved);
        assert.deepEqual(await s.p.evaluate(() => window.__themeWrites), []);
        await s.p.click('#dark-mode-btn'); const chosen=scheme==='light'?'dark':'light'; await expectTheme(s.p, chosen);
        await s.p.reload(); await ready(s.p); await expectTheme(s.p, chosen); await s.close();
      }
    }
  });
  check('storageの読取・書込・getter例外でも表示・切替・言語変更が動作', async () => {
    for (const fault of ['read','write','unavailable']) {
      const s = await sample({scheme:'dark',saved:'light',fault});
      const initial = fault==='write'?'light':'dark'; await expectTheme(s.p,initial);
      await s.p.click('#dark-mode-btn'); const next=initial==='light'?'dark':'light'; await expectTheme(s.p,next);
      await s.p.selectOption('#lang-select','en'); await expectTheme(s.p,next,'en');
      await s.p.reload(); await ready(s.p); await expectTheme(s.p,initial);
      assert.equal(await s.p.locator('#song-list .card').count(),20); await s.close();
    }
  });
  check('日英切替とテーマ切替を繰り返しても文言・保存回数は正しい', async () => {
    const s = await sample();
    for (let cycle=0;cycle<2;cycle++) {
      for (const lang of ['en','ja']) {
        await s.p.selectOption('#lang-select',lang); await expectTheme(s.p,'light',lang);
        await s.p.click('#dark-mode-btn'); await expectTheme(s.p,'dark',lang);
        await s.p.click('#dark-mode-btn'); await expectTheme(s.p,'light',lang);
      }
    }
    assert.deepEqual(await s.p.evaluate(() => window.__themeWrites), Array(4).fill(['dark','light']).flat()); await s.close();
  });
  check('Tab・Enter・Spaceで切替、両モード・両言語で明瞭なフォーカス', async () => {
    for (const scheme of ['light','dark']) for (const lang of ['ja','en']) {
      const s = await sample({scheme,width:375});
      const b=s.p.locator('#dark-mode-btn');
      assert.equal(await b.evaluate(e=>e.tagName),'BUTTON'); assert.equal(await b.getAttribute('type'),'button');
      assert.equal(await b.getAttribute('aria-pressed'),null);
      if (lang==='ja') {await s.p.keyboard.press('Tab');}
      else {await s.p.selectOption('#lang-select','en');await ready(s.p);await s.p.locator('#lang-select').focus();await s.p.keyboard.press('Shift+Tab');}
      assert.equal(await b.evaluate(e=>e===document.activeElement),true);
      const m=await metrics(s.p); assert.equal(m.focusVisible,true); assert.equal(m.outlineWidth,'2px');assert.equal(m.outlineStyle,'solid');assert(m.outlineContrast>=3);
      await s.p.keyboard.press('Enter'); await expectTheme(s.p,scheme==='light'?'dark':'light',lang);
      assert.equal(await b.evaluate(e=>e===document.activeElement),true);
      await s.p.keyboard.press('Space'); await expectTheme(s.p,scheme,lang);
      assert.equal(await b.evaluate(e=>e===document.activeElement),true);
      assert.deepEqual(await s.p.evaluate(()=>window.__themeWrites),scheme==='light'?['dark','light']:['light','dark']);
      assert.equal(await s.p.evaluate(()=>location.hash),''); assert.equal(await s.p.evaluate(()=>scrollY),m.scrollY);
      await s.p.screenshot({path:path.join(out,`theme-keyboard-${lang}-${scheme}-375.png`)});
      await s.p.keyboard.press('Tab'); assert.equal(await s.p.locator('#lang-select').evaluate(e=>e===document.activeElement),true);
      await s.close();
    }
  });
  check('375pxのタップで1回だけ切替・保存', async () => {
    const s=await sample({width:375,touch:true});await s.p.tap('#dark-mode-btn');await expectTheme(s.p,'dark');
    assert.deepEqual(await s.p.evaluate(()=>window.__themeWrites),['dark']);assert.equal(await s.p.evaluate(()=>location.hash),'');await s.close();
  });
  check('375/1280px・日英・ライト/ダーク8通りで配置・視認性・横幅を維持', async () => {
    for(const width of [375,1280]) for(const lang of ['ja','en']) for(const theme of ['light','dark']) {
      const s=await sample({width,saved:theme,scheme:theme==='light'?'dark':'light'});
      await s.p.selectOption('#lang-select',lang);await ready(s.p);await expectTheme(s.p,theme,lang);
      const m=await metrics(s.p);assert.equal(m.scrollWidth,width);assert(m.button.left>=m.parent.left);assert(m.language.right<=m.parent.right+1);
      assert(m.button.right<m.language.left);assert(Math.abs(m.button.top+m.button.height/2-m.language.top-m.language.height/2)<1);
      assert(m.contrast>=4.5);assert.equal(m.border,'0px');assert.equal(m.background,'rgba(0, 0, 0, 0)');
      assert.equal(await s.p.locator('#dark-mode-btn').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
      measurements.push({lang,theme,...m});await s.p.screenshot({path:path.join(out,`theme-${width}-${lang}-${theme}.png`)});await s.close();
    }
  });
  check('本体JSの読込待ちでもheadでテーマを適用し、保存値・端末設定を反映', async () => {
    for (const options of [{scheme:'light'},{scheme:'dark'},{scheme:'light',saved:'dark'},{scheme:'dark',saved:'light'}]) {
      const s=await sample({...options,hold:true});const expected=options.saved||options.scheme;
      assert.equal(await s.p.locator('html').getAttribute('data-bs-theme'),expected);
      assert.equal(await s.p.evaluate(()=>typeof currentLang),'undefined');
      const bg=await s.p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
      assert.equal(bg,expected==='dark'?'rgb(33, 37, 41)':'rgb(255, 255, 255)');
      assert.deepEqual(await s.p.evaluate(()=>window.__themeWrites),[]);
      s.release();await ready(s.p);await expectTheme(s.p,expected);await s.close();
    }
  });
  check('CSV通信エラー中もテーマ切替可能、F04のerror状態を維持', async () => {
    const s=await sample({failCSV:true});await s.p.click('#dark-mode-btn');await expectTheme(s.p,'dark');
    await s.p.selectOption('#lang-select','en');await expectTheme(s.p,'dark','en');
    assert.equal(await s.p.evaluate(()=>songLoadState),'error');assert.equal(await s.p.locator('#surprise-pick').isDisabled(),true);await s.close();
  });

test.afterAll(()=>{assert.deepEqual(errors,[]);});
