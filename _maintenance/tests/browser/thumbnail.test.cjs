const assert = require('node:assert/strict');
const {test:base, expect} = require('@playwright/test');
const {thumbnailServer} = require('../../helpers/thumbnail.cjs');
const {assetForURL, runtimeAssets, verifyAsset} = require('../../helpers/vendor.cjs');
const {settle} = require('../../helpers/view.cjs');

const image = '#surprise-thumbnail', frame = '.surprise-artwork', status = '#surprise-thumbnail-status';
const test = base.extend({
  app:async ({page, context}, use, info) => {
    const server = await thumbnailServer(), issues = [], checks = [], seen = new Set();
    context.on('request', r => {if (new URL(r.url()).origin !== server.origin) issues.push('External request: ' + r.url());});
    page.on('pageerror', e => issues.push(e.message));
    page.on('response', r => {
      const entry = assetForURL(r.url(), server.origin);
      if (entry) checks.push(r.body().then(body => {verifyAsset(entry, r.status(), body); seen.add(entry.path);}).catch(e => issues.push(e.message)));
    });
    await context.addInitScript(() => {
      Math.random = () => 0;
      // Start in the existing collapsed song-list mode, so ordinary card images
      // cannot prefetch the controlled surprise images before the draw.
      document.addEventListener('DOMContentLoaded', () => {document.getElementById('mode-select').value = 'song';});
    });
    await page.goto(server.origin + '/'); await settle(page);
    try {await use(server);} finally {
      await Promise.all(checks);
      await info.attach('thumbnail-requests', {body:JSON.stringify({requests:server.requests, issues}, null, 2), contentType:'application/json'});
      await server.close();
      assert.deepEqual(issues, []);
      assert.deepEqual([...seen].sort(), runtimeAssets.map(e => e.path).sort());
    }
  }
});
async function draw(page, first = false) {
  await page.locator(first ? '#surprise-pick' : '#surprise-again').evaluate(button => button.click());
}
async function ready(page) {await expect(page.locator(frame)).toHaveAttribute('data-thumbnail-state', 'ready');}
async function pending(app, name) {await expect.poll(() => app.requests.includes(name)).toBe(true);}
async function clock(page) {
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2030-01-01T00:00:01Z'));
}
async function box(page) {
  return page.locator(frame).evaluate(el => {
    const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};
  });
}
async function shot(page, info, label) {
  await info.attach(label, {body:await page.locator('#surprise-result').screenshot(), contentType:'image/png'});
}

test('THUMB-B01 別曲の旧画像を直ちに隠し、16:9枠と位置を維持して新画像を表示', async ({page, app}, info) => {
  await draw(page, true); await ready(page); const before = await box(page);
  app.mode('b', 'hold'); await draw(page); await pending(app, 'b');
  await expect(page.locator(image)).toHaveCSS('opacity', '0');
  await expect(page.locator(image)).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#surprise-song-title')).toHaveText('曲 B');
  assert.deepEqual(await box(page), before); assert(Math.abs(before.width / before.height - 16/9) < .001);
  await shot(page, info, 'old-hidden');
  app.release('b'); await ready(page);
  await expect(page.locator(image)).toHaveCSS('opacity', '1');
  await expect(page.locator(image)).toHaveAttribute('src', app.origin + '/test-thumb/b.svg');
  assert.deepEqual(await box(page), before); await shot(page, info, 'new-ready');
});

test('THUMB-B02 150ms未満の成功にはマークを出さず、後からタイマーが残らない', async ({page, app}) => {
  app.mode('a', 'hold'); await clock(page); await draw(page, true); await pending(app, 'a');
  await page.clock.runFor(100); await expect(page.locator(status)).toBeHidden();
  app.release('a'); await ready(page); await page.clock.runFor(200);
  await expect(page.locator(status)).toBeHidden(); await expect(page.locator(frame)).toHaveAttribute('aria-busy', 'false');
});

test('THUMB-B03 149ms非表示・150ms表示、直後の成功は最低表示時間なしで隠す', async ({page, app}) => {
  app.mode('a', 'hold'); await clock(page); await draw(page, true); await pending(app, 'a');
  await page.clock.runFor(149); await expect(page.locator(status)).toBeHidden();
  await page.clock.runFor(1); await expect(page.locator(status)).toBeVisible();
  app.release('a'); await ready(page); await expect(page.locator(status)).toBeHidden();
});

test('THUMB-B04 同URLの別曲・言語再描画ではsrc変更・再取得・点滅がない', async ({page, app}) => {
  await draw(page, true); await ready(page); await draw(page); await ready(page); await draw(page); await ready(page);
  await page.evaluate(() => {
    window.thumbnailMutations = [];
    new MutationObserver(records => window.thumbnailMutations.push(...records.map(r => r.attributeName)))
      .observe(document.getElementById('surprise-thumbnail'), {attributes:true, attributeFilter:['src']});
  });
  const before = await box(page); await draw(page);
  await expect(page.locator('#surprise-song-title')).toHaveText('曲 D');
  await expect(page.locator(frame)).toHaveAttribute('data-thumbnail-state', 'ready');
  await page.selectOption('#lang-select', 'en'); await settle(page);
  assert.deepEqual(await page.evaluate(() => window.thumbnailMutations), []);
  assert.deepEqual(app.requests, ['a','b','c']); assert.deepEqual(await box(page), before);
  await expect(page.locator(status)).toBeHidden();
});

test('THUMB-B05 以前表示した画像のHTTPキャッシュを使い、再取得せず正常表示', async ({page, app}) => {
  await draw(page, true); await ready(page); await draw(page); await ready(page);
  // Independently prove native HTTP-cache reuse. Chromium can reuse its decoded
  // image without adding another image ResourceTiming entry on the later revisit.
  await page.evaluate(async url => {
    const response = await fetch(url, {cache:'force-cache'});
    if (!response.ok || !(await response.text()).includes('<svg')) throw Error('Cached image unavailable');
  }, app.origin + '/test-thumb/a.svg');
  await page.evaluate(() => {sessionStorage.clear();}); await draw(page); await ready(page);
  await expect(page.locator(image)).toHaveAttribute('src', app.origin + '/test-thumb/a.svg');
  assert.deepEqual(app.requests, ['a','b']);
  const entries = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter(r => r.name.endsWith('/test-thumb/a.svg')).map(r => ({transferSize:r.transferSize, decodedBodySize:r.decodedBodySize})));
  assert(entries.length >= 2); assert.equal(entries.at(-1).transferSize, 0); assert(entries.at(-1).decodedBodySize > 0);
  await expect(page.locator(status)).toBeHidden();
});

test('THUMB-B06 連続抽選で遅い旧レスポンスが後着しても現曲を変えない', async ({page, app}) => {
  app.mode('a','hold'); app.mode('b','hold'); await draw(page, true); await pending(app,'a');
  await draw(page); await pending(app,'b'); app.release('b'); await ready(page);
  app.release('a');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator(image)).toHaveAttribute('src', app.origin + '/test-thumb/b.svg');
  await expect(page.locator(image)).toHaveCSS('opacity','1');
  await expect(page.locator('#surprise-song-title')).toHaveText('曲 B');
});

test('THUMB-B07 旧decodeの後着完了が新曲の待機表示を解除しない', async ({page, app}) => {
  await page.evaluate(() => {
    const original = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      if (this.id === 'surprise-thumbnail' && this.src.endsWith('/a.svg')) {
        window.oldDecodeStarted = true; return new Promise(resolve => {window.finishOldDecode = resolve;});
      }
      return original.call(this);
    };
  });
  await draw(page, true); await expect.poll(() => page.evaluate(() => !!window.oldDecodeStarted)).toBe(true);
  app.mode('b','hold'); await draw(page); await pending(app,'b');
  await page.evaluate(() => window.finishOldDecode());
  await expect(page.locator(frame)).toHaveAttribute('data-thumbnail-state','loading');
  await expect(page.locator(image)).toHaveCSS('opacity','0');
  app.release('b'); await ready(page);
});

for (const failure of ['404', 'disconnect']) test('THUMB-B08-'+failure+' 実取得エラーは枠・案内を残し、次の正常抽選で復旧', async ({page, app}, info) => {
  app.mode('a', failure); await draw(page, true);
  await expect(page.locator(frame)).toHaveAttribute('data-thumbnail-state','error');
  const bounds = await box(page); assert(Math.abs(bounds.width / bounds.height - 16/9) < .001);
  await expect(page.locator(status)).toHaveText('画像を表示できません');
  await expect(page.locator(status+' .spinner-border')).toBeHidden();
  await expect(page.locator(frame)).toHaveAttribute('aria-busy','false');
  const attempts = app.requests.filter(x => x==='a').length;
  assert(attempts >= 1); if (failure === '404') assert.equal(attempts,1);
  // Chromium can retry a disconnected socket internally; the language redraw
  // must not start another request after that native failure has completed.
  await shot(page, info, failure); await page.selectOption('#lang-select','en'); await settle(page);
  await expect(page.locator(status)).toHaveText('Image unavailable'); assert.equal(app.requests.filter(x => x==='a').length,attempts);
  await draw(page); await ready(page); await expect(page.locator(status)).toBeHidden();
});

test('THUMB-B09 15秒を過ぎてもエラー化せず、20秒後の正常画像を受理', async ({page, app}, info) => {
  app.mode('a','hold'); await clock(page); await draw(page,true); await pending(app,'a');
  await page.clock.runFor(20000); await expect(page.locator(frame)).toHaveAttribute('data-thumbnail-state','loading');
  await expect(page.locator(status)).toHaveText('画像を読み込み中…');
  await page.selectOption('#lang-select','en');
  await expect(page.locator(status)).toHaveText('Loading image…');
  app.release('a'); await ready(page); await expect(page.locator(status)).toBeHidden();
  assert.deepEqual(app.requests,['a']); await shot(page,info,'late-success');
});

for (const elapsed of [50, 200]) test('THUMB-B10-'+elapsed+'ms 閉じると待機を破棄、後着しても再表示せず次回復旧', async ({page, app}) => {
  app.mode('a','hold'); await clock(page); await draw(page,true); await pending(app,'a'); await page.clock.runFor(elapsed);
  await page.locator('#surprise-pick').evaluate(button => button.click());
  app.release('a'); await page.clock.runFor(200);
  await expect(page.locator('#surprise-result')).toBeHidden(); await expect(page.locator(status)).toBeHidden();
  await draw(page,true); await ready(page); await expect(page.locator('#surprise-song-title')).toHaveText('曲 B');
});

test('THUMB-B11 URLなしは従来どおり枠非表示、再抽選で復旧', async ({page, app}) => {
  for (let i=0;i<5;i++) {await draw(page,i===0); if(i<4) await ready(page);}
  await expect(page.locator('#surprise-song-title')).toHaveText('曲 E');
  await expect(page.locator(frame)).toBeHidden(); await expect(page.locator(image)).not.toHaveAttribute('src', /.+/);
  await draw(page); await ready(page);
});

test('THUMB-B12 同URL待機中の別曲・言語・テーマ変更は再取得や150msの再開始なし', async ({page, app}) => {
  await draw(page,true); await ready(page); await draw(page); await ready(page);
  app.mode('c','hold'); await clock(page); await draw(page); await pending(app,'c'); await page.clock.runFor(100);
  await draw(page); await page.selectOption('#lang-select','en');
  await page.locator('#dark-mode-btn').evaluate(button => button.click());
  await page.clock.runFor(50); await expect(page.locator(status)).toHaveText('Loading image…');
  await expect(page.locator(status)).toBeVisible(); assert.deepEqual(app.requests,['a','b','c']);
  app.release('c'); await ready(page); await expect(page.locator(image)).toHaveAttribute('alt','曲 D');
});

test('THUMB-B13 キーボード・フォーカス・既存の曲名通知を維持、案内は二重通知しない', async ({page, app}) => {
  app.mode('a','hold'); await page.focus('#surprise-pick'); await page.keyboard.press('Enter'); await pending(app,'a');
  await expect(page.locator('#surprise-pick')).toBeFocused();
  await expect(page.locator('#surprise-song-title')).toHaveAttribute('aria-live','polite');
  await expect(page.locator(status)).toHaveAttribute('aria-hidden','true');
  await expect(page.locator(status).locator('button,a,[tabindex]')).toHaveCount(0);
  app.release('a'); await ready(page); await expect(page.locator('#surprise-pick')).toBeFocused();
  await page.focus('#surprise-again'); await page.keyboard.press('Space'); await ready(page);
  await expect(page.locator('#surprise-again')).toBeFocused(); await expect(page.locator('#surprise-song-title')).toHaveText('曲 B');
  await page.keyboard.press('Tab'); assert.notEqual(await page.evaluate(() => document.activeElement?.tagName),'BODY');
});

test('THUMB-B14 カテゴリ変更で閉じる・後着を無視し、抽選やお気に入りを妨げない', async ({page, app}) => {
  app.mode('a','hold'); await draw(page,true); await pending(app,'a');
  await page.selectOption('#surprise-category','singing'); await expect(page.locator('#surprise-result')).toBeHidden();
  app.release('a'); await draw(page,true); await ready(page);
  await page.click('#surprise-favorite'); await expect(page.locator('#surprise-favorite')).toHaveAttribute('aria-pressed','true');
});

test('THUMB-B15 decode APIがなくてもload成功で表示', async ({page, app}) => {
  await page.evaluate(() => {HTMLImageElement.prototype.decode = undefined;});
  await draw(page,true); await ready(page); await expect(page.locator(image)).toHaveCSS('opacity','1');
});

test('THUMB-B16 decode失敗ではマークを止め、次の画像で復旧', async ({page, app}) => {
  await page.evaluate(() => {
    const original = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      return this.id === 'surprise-thumbnail' && this.src.endsWith('/a.svg') ? Promise.reject(new DOMException('decode failed','EncodingError')) : original.call(this);
    };
  });
  await draw(page,true); await expect(page.locator(frame)).toHaveAttribute('data-thumbnail-state','error');
  await expect(page.locator(status+' .spinner-border')).toBeHidden(); await draw(page); await ready(page);
});

test('THUMB-B17 reduced-motionではマークを静止させる', async ({page, app}) => {
  await page.emulateMedia({reducedMotion:'reduce'}); app.mode('a','hold'); await clock(page); await draw(page,true); await pending(app,'a');
  await page.clock.runFor(150); await expect(page.locator(status+' .spinner-border')).toHaveCSS('animation-name','none');
  app.release('a'); await ready(page);
});

for (const width of [375,1280]) for (const lang of ['ja','en']) for (const theme of ['light','dark']) {
  test(`THUMB-B18-${width}-${lang}-${theme} 取得中・完了・エラーの表示とレイアウト`, async ({page, app}, info) => {
    await page.setViewportSize({width,height:1100}); await page.emulateMedia({colorScheme:theme});
    await page.evaluate(theme => document.documentElement.setAttribute('data-bs-theme',theme),theme);
    await page.selectOption('#lang-select',lang); await settle(page);
    app.mode('a','hold'); await draw(page,true); await pending(app,'a');
    await expect(page.locator(status)).toBeVisible(); await shot(page,info,'loading');
    const before = await box(page); assert(Math.abs(before.width / before.height - 16/9)<.001);
    await expect(page.locator(status)).toHaveText(lang==='ja'?'画像を読み込み中…':'Loading image…');
    app.release('a'); await ready(page); assert.deepEqual(await box(page),before); await shot(page,info,'ready');
    app.mode('b','404'); await draw(page); await expect(page.locator(frame)).toHaveAttribute('data-thumbnail-state','error');
    assert.deepEqual(await box(page),before); await shot(page,info,'error');
    const layout = await page.evaluate(() => {
      const status = document.getElementById('surprise-thumbnail-status'), frame = status.parentElement;
      const a=status.getBoundingClientRect(), b=frame.getBoundingClientRect();
      return {scroll:document.documentElement.scrollWidth,width:innerWidth,inside:a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom};
    });
    assert(layout.scroll<=layout.width); assert(layout.inside);
    await expect(page.locator(image)).toHaveAttribute('loading','lazy');
  });
}
