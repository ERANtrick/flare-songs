const {test,runtime}=require('../../helpers/browser.cjs').suite();
const {site,maintenance,snapshot,artifact,localAsset}=require('../../helpers/paths.cjs');
const baseURL=()=>runtime.origin;
const url=()=>runtime.origin+'/';
const idsByName={
  "初期表示・検索と抽選の独立・抽選後の情報表示": "BASE-B01",
  "YouTube頭出しURL・別タブへの遷移（遷移先はテスト応答）": "BASE-B02",
  "既存お気に入りの維持・抽選結果と一覧の双方向同期": "BASE-B03",
  "完全一致の全公開歌唱履歴・他フィルタ解除・新しい順・開閉とスクロール": "BASE-B04",
  "カテゴリ変更で結果を閉じる・言語切替で選択条件と抽選結果を保持・イベント重複なし": "BASE-B05",
  "4分類の選択肢・抽選対象・変更時の結果消去と共通履歴・日英切替": "BASE-B06",
  "抽選→閉じる→再抽選・結果内の再抽選・検索リセット・履歴表示からの閉じる": "BASE-B07",
  "新機能のボタンは選択言語のみ・PC／375pxのボタンサイズと両テーマ": "BASE-B08",
  "6画面幅と992pxの境界・日英×両テーマ×通常／長い文字列のレスポンシブ表示": "BASE-B09",
  "高速な連続操作・直近10曲回避・再抽選時にフォーカスとスクロールを維持": "BASE-B10",
  "データ文字列のHTMLを実行しない・375pxの長い文字列・ライト／ダーク": "BASE-B11",
  "同一タブの再読込で抽選履歴を保持": "BASE-B12",
  "候補ゼロ・CSV通信失敗の補助メッセージ": "BASE-B13",
  "実データで4分類の対象記録を照合し、各分類から連続抽選": "BASE-B14",
  "実際の公開CSVで抽選・履歴表示・PC／375pxと両テーマのスクリーンショット": "BASE-B15"
};
function check(name,fn){if(!idsByName[name])throw Error('Unmapped case: '+name);test(idsByName[name]+' '+name,fn);}
// 実行方法・検証用依存の置き場所はREADME-MAINTENANCE.mdを参照。サイトの依存は増やさない。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {measureActions, assertActions, probeActionChecks} = require('../../helpers/action-layout.cjs');
const validation=maintenance;

const Papa = require('papaparse');

const output=artifact();
fs.mkdirSync(output, { recursive: true });
let rowID = 0;
function song(title, category = '歌枠', extra = {}) {
  const id = rowID++;
  return { '曲名': title, '日付': '2020/06/02', '配信日': '2020年6月2日配信', '配信タイトル': 'テスト用配信 ' + id, '配信URL': 'https://youtu.be/zhGqJdOEcS4', 'リンク': 'https://www.youtube.com/watch?v=zhGqJdOEcS4&t=' + (321 + id) + 's', '公開': '公開', Category: category, ThumbnailURL: 'https://img.youtube.com/vi/zhGqJdOEcS4/maxresdefault.jpg', ...extra };
}
const rows = [song('テスト曲'), song('テスト曲', 'オリジナルMV', { '日付': '2026/01/01', '配信日': '2026年1月1日配信' }), song('テスト曲 remix', 'カバー曲'), song('テスト曲', '歌枠', { '公開': '非公開' }), ...Array.from({length: 12}, (_, i) => song('別の曲 ' + i, ['歌枠', '歌枠(コラボ)', '3Dライブ', '3D配信'][i % 4])), song('<img src=x onerror="window.__xss=true">', '将来の分類', { '備考': '<script>window.__xss=true</script>' })];
const checks = [];
const errors = [];
let browser;

async function settle(page) { await page.waitForFunction(() => !document.querySelector('#song-list .spinner-border')); }
async function contextWith(csv, options = {}) {
  const context = await browser.newContext({ viewport: options.viewport || {width: 1280, height: 960}, colorScheme: options.theme || 'light' });
  await context.addInitScript(value => {
    if (location.hostname === '127.0.0.1' && localStorage.getItem('favorites') === null) {
      localStorage.setItem('favorites', JSON.stringify(value));
    }
  }, [rows[1]['リンク']]);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();

    if (url.hostname === 'docs.google.com') {
      if (options.failCSV) return route.abort('failed');
      return route.fulfill({ body: csv, contentType: 'text/csv; charset=utf-8', headers: {'access-control-allow-origin': '*'} });
    }
    if (url.hostname === 'img.youtube.com' && url.pathname.includes('zhGqJdOEcS4')) return route.fulfill({path: localAsset('sample-thumbnail.jpg'), contentType: 'image/jpeg'});
    if (['www.youtube.com', 'youtu.be'].includes(url.hostname)) return route.fulfill({ body: '<title>Navigation target test</title>', contentType: 'text/html' });
    return route.abort('blockedbyclient');
  });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(20000);
  await page.goto(baseURL());
  if (!options.failCSV) { await page.waitForFunction(() => songsLoaded); await settle(page); }
  return { context, page };
}
async function noOverflow(page, context = '') {
  const overflow = await page.evaluate(() => ({ width:innerWidth, scroll:document.documentElement.scrollWidth,
    elements:[...document.querySelectorAll('body *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1).slice(0,5).map(node => ({tag:node.tagName,id:node.id,className:node.className})) }));
  assert.ok(overflow.scroll <= overflow.width, context + ': ' + JSON.stringify(overflow));
}


let context,page;const fixture=Papa.unparse(rows);
test.beforeAll(async({browser:native})=>{await runtime.start(native);browser=runtime.browser;({context,page}=await contextWith(fixture));});
check('初期表示・検索と抽選の独立・抽選後の情報表示', async () => {
    assert.equal(await page.locator('#surprise-result').isVisible(), false);
    assert.equal(await page.locator('#surprise-category').inputValue(), 'all');
    assert.equal(await page.locator('#surprise-category option').count(), 4);
    await page.selectOption('#category-select', 'カバー曲'); await settle(page);
    await page.fill('#search-input', '一致しない'); await settle(page);
    await page.evaluate(() => { sessionStorage.clear(); Math.random = () => 0; });
    await page.click('#surprise-pick');
    assert.equal(await page.locator('#surprise-song-title').innerText(), 'テスト曲');
    assert.equal(await page.locator('#surprise-result').isVisible(), true);
    assert.equal(await page.locator('#surprise-play').getAttribute('href'), rows[0]['リンク']);
    assert.equal(await page.locator('#surprise-date').innerText(), rows[0]['配信日']);
    assert.equal(await page.locator('#surprise-history').isVisible(), true);
    assert.ok((await page.locator('#surprise-history').innerText()).includes('全2件'));
    assert.equal(await page.locator('#search-input').inputValue(), '一致しない');
  });
  check('YouTube頭出しURL・別タブへの遷移（遷移先はテスト応答）', async () => {
    const popupPromise = context.waitForEvent('page');
    await page.click('#surprise-play');
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(popup.url(), rows[0]['リンク']);
    assert.equal(await popup.evaluate(() => window.opener === null), true);
    await popup.close();
  });
  check('既存お気に入りの維持・抽選結果と一覧の双方向同期', async () => {
    await page.click('#reset-btn'); await settle(page);
    await page.click('#surprise-favorite');
    assert.equal(await page.locator('#surprise-favorite').getAttribute('aria-pressed'), 'true');
    const key = rows[0]['リンク'];
    const star = page.locator('[data-favorite-key="' + key + '"]');
    assert.equal(await star.getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('favorites'))), [rows[1]['リンク'], key]);
    await star.click();
    assert.equal(await page.locator('#surprise-favorite').getAttribute('aria-pressed'), 'false');
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('favorites'))), [rows[1]['リンク']]);
    await page.click('#fav-only-btn'); await settle(page);
    assert.equal(await page.locator('#song-list .card').count(), 1);
  });
  check('完全一致の全公開歌唱履歴・他フィルタ解除・新しい順・開閉とスクロール', async () => {
    await page.selectOption('#category-select', 'カバー曲'); await settle(page);
    await page.click('#surprise-history'); await settle(page);
    await page.waitForFunction(() => document.activeElement?.classList.contains('accordion-button'));
    assert.equal(await page.locator('#mode-select').inputValue(), 'song');
    assert.equal(await page.locator('#category-select').inputValue(), '');
    assert.equal(await page.evaluate(() => favOnlyMode), false);
    assert.equal(await page.locator('#sort-session').inputValue(), 'date-desc');
    assert.equal(await page.locator('#song-list .accordion-item').count(), 1);
    assert.equal(await page.locator('#song-list .card').count(), 2);
    assert.deepEqual(await page.locator('#song-list .card-title').allTextContents(), ['テスト曲', 'テスト曲']);
    assert.ok((await page.locator('#song-list .card-body p').first().innerText()).startsWith('2026'));
    assert.equal(await page.locator('#song-list .accordion-collapse').evaluate(node => node.classList.contains('show')), true);
    assert.equal(await page.locator('#surprise-song-title').innerText(), 'テスト曲');
    const top = await page.locator('#song-list .accordion-item').evaluate(node => node.getBoundingClientRect().top);
    // 短い一覧はページ末尾でスクロール量が制限されるため、画面内への移動を確認。
    assert.ok(top >= 0 && top < await page.evaluate(() => innerHeight - 100), String(top));
    assert.ok(await page.evaluate(() => scrollY > 0));
    await page.locator('#song-list .accordion-button').click();
    await page.waitForFunction(() => !document.querySelector('#song-list .accordion-collapse').classList.contains('show') && !document.querySelector('#song-list .collapsing'));
    await page.locator('#song-list .accordion-button').click();
    await page.waitForFunction(() => document.querySelector('#song-list .accordion-collapse').classList.contains('show'));
    await page.fill('#search-input', 'テスト曲 '); await settle(page);
    assert.equal(await page.evaluate(() => exactSongTitle), null);
    assert.equal(await page.locator('#song-list .accordion-item').count(), 2);
    await page.click('#reset-btn'); await settle(page);
    assert.equal(await page.locator('#mode-select').inputValue(), 'session');
    assert.equal(await page.locator('#song-list .card').count(), rows.filter(s => s['公開'] === '公開').length);
  });
  check('カテゴリ変更で結果を閉じる・言語切替で選択条件と抽選結果を保持・イベント重複なし', async () => {
    const previousHistory = await page.evaluate(() => getDrawHistory());
    await page.selectOption('#surprise-category', 'mv');
    assert.equal(await page.locator('#surprise-result').isVisible(), false);
    assert.deepEqual(await page.evaluate(() => getDrawHistory()), previousHistory);
    await page.click('#surprise-pick');
    const title = await page.locator('#surprise-song-title').innerText();
    assert.equal(title, 'テスト曲 remix'); // テスト曲はカテゴリ変更前の履歴に残っている。
    await page.selectOption('#sort-session', 'random'); await settle(page);
    for (const lang of ['en', 'ja', 'en', 'ja']) { await page.selectOption('#lang-select', lang); await settle(page); }
    assert.equal(await page.locator('#surprise-category').inputValue(), 'mv');
    assert.equal(await page.locator('#surprise-song-title').innerText(), title);
    assert.equal(await page.locator('#sort-session').inputValue(), 'random');
    const before = await page.evaluate(() => viewRevision);
    await page.selectOption('#category-select', 'カバー曲'); await settle(page);
    assert.equal(await page.evaluate(() => viewRevision), before + 1);
    const beforeSort = await page.evaluate(() => viewRevision);
    await page.selectOption('#sort-session', 'date-asc'); await settle(page);
    assert.equal(await page.evaluate(() => viewRevision), beforeSort + 1);
  });
  check('4分類の選択肢・抽選対象・変更時の結果消去と共通履歴・日英切替', async () => {
    const sample = await contextWith(fixture);
    const labels = {
      ja: ['すべて', 'MV・カバー曲', '歌枠', '3Dライブ・配信'],
      en: ['All categories', 'MVs & covers', 'Singing streams', '3D live shows & streams']
    };
    assert.equal(await sample.page.locator('#surprise-category').inputValue(), 'all');
    for (const [category, allowed] of [
      ['all', null], ['mv', ['オリジナルMV', 'カバー曲']],
      ['singing', ['歌枠', '歌枠(コラボ)']], ['live', ['3Dライブ', '3D配信']]
    ]) {
      const history = await sample.page.evaluate(() => getDrawHistory());
      await sample.page.selectOption('#surprise-category', category);
      assert.equal(await sample.page.locator('#surprise-result').isVisible(), false);
      assert.equal(await sample.page.locator('#surprise-pick').getAttribute('aria-expanded'), 'false');
      assert.deepEqual(await sample.page.evaluate(() => getDrawHistory()), history);
      const expected = rows.filter(row => row['公開'] === '公開' && (!allowed || allowed.includes(row.Category)));
      const actualLinks = await sample.page.evaluate(category => [...getSurpriseGroups(allSongs, category).values()].flat().map(row => row['リンク']), category);
      assert.deepEqual(actualLinks.sort(), expected.map(row => row['リンク']).sort());
      await sample.page.click('#surprise-pick');
      const selected = await sample.page.evaluate(() => ({link: currentSurprise['リンク'], category: currentSurprise.Category}));
      assert.ok(expected.some(row => row['リンク'] === selected.link));
      if (allowed) assert.ok(allowed.includes(selected.category));
      const drawnHistory = await sample.page.evaluate(() => getDrawHistory());
      for (const lang of ['en', 'ja']) {
        await sample.page.selectOption('#lang-select', lang); await settle(sample.page);
        assert.deepEqual(await sample.page.locator('#surprise-category option').allTextContents(), labels[lang]);
        assert.equal(await sample.page.locator('#surprise-category').inputValue(), category);
        assert.equal(await sample.page.locator('#surprise-result').isVisible(), true);
        assert.equal(await sample.page.evaluate(() => currentSurprise['リンク']), selected.link);
        assert.deepEqual(await sample.page.evaluate(() => getDrawHistory()), drawnHistory);
      }
    }
    await sample.context.close();
  });
  check('抽選→閉じる→再抽選・結果内の再抽選・検索リセット・履歴表示からの閉じる', async () => {
    const sample = await contextWith(fixture);
    const p = sample.page;
    await p.evaluate(() => { sessionStorage.clear(); Math.random = () => 0; });
    await p.selectOption('#surprise-category', 'singing');
    await p.selectOption('#category-select', 'カバー曲'); await settle(p);
    await p.fill('#search-input', 'テスト曲'); await settle(p);
    assert.equal(await p.locator('[data-surprise-label="pick"]').innerText(), '1曲選ぶ');
    await p.click('#surprise-pick');
    const first = await p.locator('#surprise-song-title').innerText();
    assert.equal(await p.locator('[data-surprise-label="pick"]').innerText(), '閉じる');
    assert.equal(await p.locator('#surprise-pick').evaluate(node => node.classList.contains('btn-primary')), false);
    assert.equal(await p.locator('#surprise-pick').evaluate(node => node.classList.contains('btn-outline-secondary')), true);
    assert.equal(await p.locator('#surprise-pick .surprise-icon').isVisible(), false);
    const history = await p.evaluate(() => getDrawHistory());
    const revision = await p.evaluate(() => viewRevision);
    await p.locator('#surprise-pick').press('Enter');
    assert.equal(await p.locator('#surprise-result').isVisible(), false);
    assert.equal(await p.locator('#surprise-pick').getAttribute('aria-expanded'), 'false');
    assert.equal(await p.locator('[data-surprise-label="pick"]').innerText(), '1曲選ぶ');
    assert.equal(await p.locator('#surprise-pick').evaluate(node => node.classList.contains('btn-primary')), true);
    assert.equal(await p.locator('#surprise-pick .surprise-icon').isVisible(), true);
    assert.equal(await p.evaluate(() => document.activeElement.id), 'surprise-pick');
    assert.equal(await p.locator('#surprise-category').inputValue(), 'singing');
    assert.deepEqual(await p.evaluate(() => getDrawHistory()), history);
    assert.equal(await p.evaluate(() => viewRevision), revision);
    assert.equal(await p.locator('#search-input').inputValue(), 'テスト曲');
    assert.equal(await p.locator('#category-select').inputValue(), 'カバー曲');
    await p.click('#surprise-pick');
    const second = await p.locator('#surprise-song-title').innerText();
    assert.notEqual(second, first);
    assert.equal((await p.evaluate(() => getDrawHistory())).length, history.length + 1);
    await p.click('#surprise-again');
    assert.notEqual(await p.locator('#surprise-song-title').innerText(), second);
    assert.equal(await p.locator('[data-surprise-label="pick"]').innerText(), '閉じる');
    const selected = await p.evaluate(() => currentSurprise['リンク']);
    const afterAgain = await p.evaluate(() => getDrawHistory());
    await p.click('#reset-btn'); await settle(p);
    assert.equal(await p.locator('#search-input').inputValue(), '');
    assert.equal(await p.locator('#category-select').inputValue(), '');
    assert.equal(await p.locator('#mode-select').inputValue(), 'session');
    assert.equal(await p.locator('#surprise-result').isVisible(), true);
    assert.equal(await p.evaluate(() => currentSurprise['リンク']), selected);
    assert.equal(await p.locator('#surprise-category').inputValue(), 'singing');
    assert.deepEqual(await p.evaluate(() => getDrawHistory()), afterAgain);
    await p.selectOption('#surprise-category', 'mv');
    assert.equal(await p.locator('#surprise-result').isVisible(), false);
    assert.equal(await p.locator('[data-surprise-label="pick"]').innerText(), '1曲選ぶ');
    assert.deepEqual(await p.evaluate(() => getDrawHistory()), afterAgain);
    await p.evaluate(() => sessionStorage.clear());
    await p.selectOption('#surprise-category', 'singing');
    await p.click('#surprise-pick');
    await p.click('#surprise-history'); await settle(p);
    await p.waitForFunction(() => document.activeElement?.classList.contains('accordion-button'));
    const historyTitle = await p.locator('#surprise-song-title').innerText();
    const historyRevision = await p.evaluate(() => viewRevision);
    await p.click('#surprise-pick');
    assert.equal(await p.locator('#surprise-result').isVisible(), false);
    assert.equal(await p.evaluate(() => exactSongTitle), historyTitle);
    assert.equal(await p.evaluate(() => viewRevision), historyRevision);
    assert.equal(await p.locator('#song-list .accordion-collapse.show').count(), 1);
    assert.equal(await p.locator('#song-list .card').count(), 2);
    await sample.context.close();
  });
  check('新機能のボタンは選択言語のみ・PC／375pxのボタンサイズと両テーマ', async () => {
    const sample = await contextWith(fixture);
    const p = sample.page;
    const heading = await p.locator('h1').innerText();
    const originalModeLabels = await p.locator('#mode-select option').allTextContents();
    await p.evaluate(() => { sessionStorage.clear(); Math.random = () => 0; });
    await p.selectOption('#surprise-category', 'singing');
    await p.click('#surprise-pick');
    const selected = await p.evaluate(() => currentSurprise['リンク']);
    const history = await p.evaluate(() => getDrawHistory());
    const labels = {
      ja: { pick: '閉じる', listen: 'YouTubeで聴く', favorite: 'お気に入りに登録', history: 'この曲の歌唱履歴を見る（全2件）', again: '別の曲を選ぶ' },
      en: { pick: 'Close', listen: 'Listen on YouTube', favorite: 'Add to favorites', history: 'See all performances (2)', again: 'Pick another song' }
    };
    for (const width of [1280, 375]) {
      await p.setViewportSize({width, height:1100});
      for (const theme of ['light', 'dark']) {
        await p.evaluate(theme => document.documentElement.setAttribute('data-bs-theme', theme), theme);
        for (const lang of ['en', 'ja']) {
          await p.selectOption('#lang-select', lang); await settle(p);
          for (const [name, text] of Object.entries(labels[lang])) {
            const label = p.locator('[data-surprise-label="' + name + '"]');
            assert.equal(await label.innerText(), text);
            assert.equal(await label.getAttribute('lang'), lang);
          }
          assert.equal(await p.locator('#surprise-area [data-surprise-secondary]').count(), 0);
          assert.equal(await p.locator('#surprise-area small').count(), 0);
          assert.equal(await p.evaluate(() => currentSurprise['リンク']), selected);
          assert.equal(await p.locator('#surprise-category').inputValue(), 'singing');
          assert.deepEqual(await p.evaluate(() => getDrawHistory()), history);
          assert.equal(await p.locator('h1').innerText(), heading);
          if (lang === 'ja') assert.deepEqual(await p.locator('#mode-select option').allTextContents(), originalModeLabels);
          await noOverflow(p);
          const buttons = await p.locator('#surprise-area .surprise-action').evaluateAll(nodes => nodes.filter(node => !node.hidden).map(node => {
            const rect = node.getBoundingClientRect();
            return {height: rect.height, width: rect.width, limit: node.closest('.surprise-area').clientWidth};
          }));
          for (const button of buttons) {
            assert.ok(button.height >= (width === 375 ? 48 : 44), JSON.stringify(button));
            assert.ok(button.width <= button.limit, JSON.stringify(button));
          }
        }
      }
    }
    await p.selectOption('#lang-select', 'en'); await settle(p);
    await p.click('#surprise-favorite');
    assert.equal(await p.locator('[data-surprise-label="favorite"]').innerText(), 'Remove from favorites');
    await p.click('#surprise-favorite');
    assert.equal(await p.locator('[data-surprise-label="favorite"]').innerText(), 'Add to favorites');
    await p.click('#surprise-pick');
    assert.equal(await p.locator('[data-surprise-label="pick"]').innerText(), 'Pick a song');
    await p.selectOption('#lang-select', 'ja'); await settle(p);
    assert.equal(await p.locator('[data-surprise-label="pick"]').innerText(), '1曲選ぶ');
    assert.equal(await p.locator('#surprise-result').isVisible(), false);
    await sample.context.close();
  });
  check('6画面幅と992pxの境界・日英×両テーマ×通常／長い文字列のレスポンシブ表示', async () => {
    const sample = await contextWith(fixture);
    const p = sample.page;
    const responsive = [];
    const widths = [375, 576, 640, 768, 900, 991, 992, 1280];
    for (const content of ['normal', 'long']) {
      await p.evaluate(content => {
        if (content === 'long') {
          for (const row of allSongs.slice(0, 2)) {
            row['曲名'] = '長い曲名LongSongTitle'.repeat(6);
            row['配信タイトル'] = '長い配信タイトルVeryLongStreamTitle'.repeat(6);
          }
        }
        currentSurprise = allSongs[0];
        renderSurpriseResult();
      }, content);
      await p.locator('#surprise-thumbnail').evaluate(image => image.decode());
      if (content === 'normal') {
        const probes = await probeActionChecks(p);
        fs.writeFileSync(path.join(artifact(), 'responsive-probes.json'), JSON.stringify(probes, null, 2));
      }
      for (const width of widths) {
        await p.setViewportSize({width, height:1200});
        for (const theme of ['light', 'dark']) {
          await p.evaluate(theme => document.documentElement.setAttribute('data-bs-theme', theme), theme);
          for (const lang of ['ja', 'en']) {
            await p.selectOption('#lang-select', lang); await settle(p);
            if (content === 'normal') await noOverflow(p, JSON.stringify({width, lang, theme, content}));
            const layout = await p.evaluate(() => {
              const area = document.querySelector('.surprise-area');
              const image = document.querySelector('.surprise-artwork').getBoundingClientRect();
              const info = document.querySelector('.surprise-details').getBoundingClientRect();
              const textOverflow = ['surprise-song-title', 'surprise-session'].some(id => {
                const node = document.getElementById(id);
                return node.scrollWidth > node.clientWidth;
              });
              const areaRect = area.getBoundingClientRect();
              const outsideSearch = [...document.querySelectorAll('body *')].filter(node =>
                node.getBoundingClientRect().right > innerWidth + 1 && !node.closest('.filter-bar')
              ).map(node => node.id || node.className);
              return { stacked:info.top >= image.bottom, thumbnail:Math.round(image.width),
                sideways:info.left >= image.right, areaOverflow:area.scrollWidth > area.clientWidth,
                fitsViewport:areaRect.left >= -1 && areaRect.right <= innerWidth + 1,
                pageOverflow:document.documentElement.scrollWidth > innerWidth, outsideSearch, textOverflow };
            });
            assert.equal(layout.stacked, width < 992, JSON.stringify({width, lang, content, layout}));
            if (width < 992) assert.ok(layout.thumbnail <= 280);
            else { assert.equal(layout.thumbnail, 260); assert.equal(layout.sideways, true); }
            assert.equal(layout.areaOverflow, false);
            assert.equal(layout.fitsViewport, true);
            // 極端な配信タイトルで既存検索selectが広がる問題は別の領域。今回変更しない。
            assert.deepEqual(layout.outsideSearch, [], '検索領域以外にはみ出しがある: ' + JSON.stringify(layout));
            assert.equal(layout.textOverflow, false);
            const beforeToggle = await measureActions(p);
            assertActions(beforeToggle, width, {width, lang, theme, content, state:'before favorite toggle'});
            // Both favorite labels must fit in both dimensions; wrapping is allowed.
            await p.click('#surprise-favorite');
            const afterToggle = await measureActions(p);
            assertActions(afterToggle, width, {width, lang, theme, content, state:'after favorite toggle'});
            const favoriteBefore = beforeToggle.buttons.find(b => b.id === 'surprise-favorite');
            const favoriteAfter = afterToggle.buttons.find(b => b.id === 'surprise-favorite');
            assert.ok(['true','false'].includes(favoriteBefore.pressed));
            assert.equal(favoriteAfter.pressed, favoriteBefore.pressed === 'true' ? 'false' : 'true');
            assert.notEqual(favoriteAfter.text, favoriteBefore.text);
            await p.click('#surprise-favorite');
            const restored = await measureActions(p);
            assertActions(restored, width, {width, lang, theme, content, state:'favorite restored'});
            assert.equal(restored.buttons.find(b => b.id === 'surprise-favorite').pressed, favoriteBefore.pressed);
            responsive.push({width, lang, theme, content, layout:layout.stacked ? 'vertical' : 'horizontal', thumbnail:layout.thumbnail,
              existingSearchOverflow:layout.pageOverflow, beforeToggle, afterToggle, restored});
            if ([375,991,992,1280].includes(width) || (content === 'normal' || (lang === 'en' && theme === 'dark'))) {
              await p.locator('#surprise-area').screenshot({path:path.join(output, 'responsive-' + width + '-' + lang + '-' + theme + '-' + content + '.png')});
            }
          }
        }
        // 縦配置でも再抽選・閉じる・履歴へ移動できることを実操作で確認。
        const historyLength = await p.evaluate(() => getDrawHistory().length);
        await p.click('#surprise-again');
        assert.equal(await p.locator('#surprise-result').isVisible(), true);
        assert.equal(await p.evaluate(() => getDrawHistory().length), Math.min(10, historyLength + 1));
        const history = await p.evaluate(() => getDrawHistory());
        await p.click('#surprise-pick');
        assert.equal(await p.locator('#surprise-result').isVisible(), false);
        assert.deepEqual(await p.evaluate(() => getDrawHistory()), history);
        await p.evaluate(() => { currentSurprise = allSongs[0]; renderSurpriseResult(); });
        await p.click('#surprise-history'); await settle(p);
        await p.waitForFunction(() => document.activeElement?.classList.contains('accordion-button'));
        assert.equal(await p.locator('#song-list .accordion-collapse.show').count(), 1);
        assert.equal(await p.locator('#song-list .card').count(), 2);
        await p.click('#reset-btn'); await settle(p);
      }
    }
    fs.writeFileSync(path.join(artifact(), 'responsive-results.json'), JSON.stringify(responsive, null, 2));
    console.log('Responsive matrix:', responsive.length + ' combinations passed; favorite toggle states:', responsive.length * 3);
    console.log('Responsive multiline labels:', responsive.flatMap(r => r.beforeToggle.buttons).filter(b => b.lines > 1).length);
    await sample.context.close();
  });
  check('高速な連続操作・直近10曲回避・再抽選時にフォーカスとスクロールを維持', async () => {
    await page.selectOption('#surprise-category', 'all');
    await page.click('#surprise-pick');
    await page.evaluate(() => scrollTo(0, 0));
    const titles = await page.evaluate(() => {
      const values = [];
      for (let i = 0; i < 40; i++) { drawSurprise(); values.push(currentSurprise['曲名']); }
      return values;
    });
    for (let i = 0; i < titles.length; i++) assert.ok(!titles.slice(Math.max(0, i - 10), i).includes(titles[i]));
    const again = page.locator('#surprise-again');
    await again.focus();
    const before = await page.evaluate(() => scrollY);
    await again.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'surprise-again');
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - before) < 3);
    assert.equal((await page.evaluate(() => getDrawHistory())).length, 10);
  });
  check('データ文字列のHTMLを実行しない・375pxの長い文字列・ライト／ダーク', async () => {
    await page.click('#reset-btn'); await settle(page);
    assert.equal(await page.evaluate(() => window.__xss), undefined);
    assert.equal(await page.locator('#song-list script').count(), 0);
    await page.setViewportSize({width: 375, height: 1000});
    await page.evaluate(() => {
      currentSurprise = { ...allSongs[0], '曲名': '長い曲名LongSongTitle'.repeat(18), '配信タイトル': '長い配信タイトルVeryLongStreamTitle'.repeat(15) };
      renderSurpriseResult();
      scrollTo(0, 0);
    });
    await noOverflow(page);
    assert.equal(await page.locator('#surprise-area').evaluate(node => node.scrollWidth <= node.clientWidth), true);
    await page.click('#dark-mode-btn');
    assert.equal(await page.locator('html').getAttribute('data-bs-theme'), 'dark');
    await noOverflow(page);
    await page.click('#dark-mode-btn');
    assert.equal(await page.locator('html').getAttribute('data-bs-theme'), 'light');
    await page.evaluate(() => { currentSurprise = { ...allSongs[2], ThumbnailURL: '', '配信日': '', '日付': '', '配信タイトル': '', Category: '' }; renderSurpriseResult(); });
    assert.equal(await page.locator('.surprise-artwork').isVisible(), false);
    assert.equal(await page.locator('#surprise-date').isVisible(), false);
    assert.equal(await page.locator('#surprise-history').isVisible(), false);
    assert.equal(await page.locator('#surprise-favorite').isVisible(), true);
  });
  check('同一タブの再読込で抽選履歴を保持', async () => {
    const history = await page.evaluate(() => getDrawHistory());
    await page.reload(); await page.waitForFunction(() => songsLoaded); await settle(page);
    assert.deepEqual(await page.evaluate(() => getDrawHistory()), history);
    assert.equal(await page.locator('#surprise-result').isVisible(), false);
   await context.close();
  });
  check('候補ゼロ・CSV通信失敗の補助メッセージ', async () => {
    const empty = await contextWith(Papa.unparse([song('歌枠曲', '歌枠')]));
    await empty.page.selectOption('#surprise-category', 'mv');
    await empty.page.click('#surprise-pick');
    assert.equal(await empty.page.locator('#surprise-result').isVisible(), false);
    assert.ok((await empty.page.locator('#surprise-status').innerText()).includes('再生できる曲がありません'));
    await empty.page.selectOption('#lang-select', 'en'); await settle(empty.page);
    assert.ok((await empty.page.locator('#surprise-status').innerText()).includes('No playable songs'));
    await empty.context.close();
    const failed = await contextWith('', {failCSV: true});
    await failed.page.waitForFunction(() => document.querySelector('#surprise-status').textContent.includes('読み込めません'));
    assert.equal(await failed.page.locator('#surprise-pick').isDisabled(), true);
    await failed.context.close();
  });
  check('実データで4分類の対象記録を照合し、各分類から連続抽選', async () => {
    const real = await contextWith(fs.readFileSync(snapshot('songs.csv'), 'utf8'));
    const summaries = [];
    for (const [category, allowed] of [
      ['all', null], ['mv', ['オリジナルMV', 'カバー曲']],
      ['singing', ['歌枠', '歌枠(コラボ)']], ['live', ['3Dライブ', '3D配信']]
    ]) {
      const history = await real.page.evaluate(() => getDrawHistory());
      await real.page.selectOption('#surprise-category', category);
      assert.equal(await real.page.locator('#surprise-result').isVisible(), false);
      assert.deepEqual(await real.page.evaluate(() => getDrawHistory()), history);
      const summary = await real.page.evaluate(({category, allowed}) => {
        // URLの妥当性は別テストで検証済み。分類の期待値を元のCategoryから独立に求める。
        const expected = allSongs.filter(row => row['公開'] === '公開' && row['曲名']?.trim() && isPlayableYouTubeLink(row['リンク']) && (!allowed || allowed.includes(row.Category)));
        const groups = getSurpriseGroups(allSongs, category);
        const actual = [...groups.values()].flat();
        return { category, rows: actual.length, titles: groups.size,
          actual: actual.map(row => allSongs.indexOf(row)).sort((a,b) => a-b),
          expected: expected.map(row => allSongs.indexOf(row)).sort((a,b) => a-b),
          categories: [...new Set(actual.map(row => row.Category))].sort() };
      }, {category, allowed});
      assert.deepEqual(summary.actual, summary.expected, category);
      assert.ok(summary.rows > 0, category);
      if (allowed) assert.deepEqual(summary.categories, [...allowed].sort());
      await real.page.click('#surprise-pick');
      for (let i = 0; i < 25; i++) {
        if (i) await real.page.click('#surprise-again');
        const selectedIndex = await real.page.evaluate(() => allSongs.indexOf(currentSurprise));
        assert.ok(summary.expected.includes(selectedIndex), category + ': selected record outside category');
      }
      const {actual, expected, ...counts} = summary;
      summaries.push(counts);
    }
    console.log('Real CSV categories:', JSON.stringify(summaries));
    fs.writeFileSync(path.join(artifact(), 'category-results.json'), JSON.stringify(summaries, null, 2));
    await real.context.close();
  });
  check('実際の公開CSVで抽選・履歴表示・PC／375pxと両テーマのスクリーンショット', async () => {
    const realCSV = fs.readFileSync(snapshot('songs.csv'), 'utf8');
    const real = await contextWith(realCSV);
    console.log('Live CSV:', await real.page.evaluate(() => ({rows: allSongs.length, eligible: [...getSurpriseGroups(allSongs, 'all').values()].reduce((n, list) => n + list.length, 0), titles: getSurpriseGroups(allSongs, 'all').size})));
    await real.page.evaluate(() => {
      sessionStorage.clear();
      const groups = getSurpriseGroups(allSongs, 'all');
      const titles = [...groups.keys()];
      const index = titles.findIndex(title => getPublicHistory(title).length > 1 && groups.get(title)[0].ThumbnailURL?.includes('zhGqJdOEcS4'));
      if (index < 0) throw new Error('No multi-performance sample with cached thumbnail');
      const samples = [(index + 0.1) / titles.length, 0];
      Math.random = () => samples.shift() ?? 0;
      scrollTo(0, 0);
    });
    await real.page.screenshot({path: path.join(output, 'desktop-initial.png')});
    await real.page.click('#surprise-pick');
    await real.page.locator('#surprise-thumbnail').evaluate(image => image.decode());
    for (const [name, viewport, theme] of [
      ['desktop-light', {width:1280,height:960}, 'light'],
      ['desktop-dark', {width:1280,height:960}, 'dark'],
      ['mobile-light', {width:375,height:1100}, 'light'],
      ['mobile-dark', {width:375,height:1100}, 'dark']
    ]) {
      await real.page.setViewportSize(viewport);
      await real.page.evaluate(theme => { document.documentElement.setAttribute('data-bs-theme', theme); scrollTo(0,0); }, theme);
      await noOverflow(real.page);
      await real.page.screenshot({path: path.join(output, name + '.png')});
    }
    await real.page.click('#surprise-history'); await settle(real.page);
    await real.page.waitForFunction(() => document.activeElement?.classList.contains('accordion-button'));
    assert.equal(await real.page.locator('#song-list .accordion-item').count(), 1);
    assert.equal(await real.page.locator('#song-list .accordion-collapse.show').count(), 1);
    await real.page.screenshot({path: path.join(output, 'mobile-history.png')});
    await real.context.close();
  });

test.afterAll(()=>{assert.deepEqual(errors,[]);});
