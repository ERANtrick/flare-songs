const {snapshot}=require('../../helpers/paths.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const siteRoot = require('../../helpers/paths.cjs').site;
const code = fs.readFileSync(path.join(siteRoot, 'script.js'), 'utf8');
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}
function app(overrides = {}) {
  const context = {
    URL, console, localStorage: storage(), sessionStorage: storage(),
    document: { documentElement: { getAttribute: () => 'light' } },
    window: { addEventListener() {} }, ...overrides
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}
function song(title, category = '歌枠', extra = {}) {
  return { '曲名': title, '公開': '公開', Category: category, 'リンク': 'https://www.youtube.com/watch?v=zhGqJdOEcS4&t=321s', ...extra };
}
function seededRandom(seed = 20261103) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

test('RS-U01 カテゴリ4択・将来カテゴリ・公開状態・曲名・再生リンクの条件', () => {
  const a = app();
  const rows = [song('A'), song('B', '歌枠(コラボ)'), song('C', '3Dライブ'), song('D', '3D配信'), song('E', 'オリジナルMV'), song('F', 'カバー曲'), song('G', '将来の分類'), song('H', '歌枠', { '公開': '非公開' }), song(' '), song('I', '歌枠', { 'リンク': '' }), song('J', '歌枠', { 'リンク': 'https://example.com/watch?v=zhGqJdOEcS4' })];
  assert.deepEqual([...a.getSurpriseGroups(rows, 'all').keys()], ['A','B','C','D','E','F','G']);
  assert.deepEqual([...a.getSurpriseGroups(rows, 'mv').keys()], ['E','F']);
  assert.deepEqual([...a.getSurpriseGroups(rows, 'singing').keys()], ['A','B']);
  assert.deepEqual([...a.getSurpriseGroups(rows, 'live').keys()], ['C','D']);
  assert.equal(a.getSurpriseGroups(rows, 'invalid').size, 0);
});

test('RS-U02 YouTube URLの基本検証と不正スキーム・偽装ホストの除外', () => {
  const a = app();
  for (const url of ['https://youtu.be/zhGqJdOEcS4?t=321', 'https://www.youtube.com/watch?v=zhGqJdOEcS4&t=321s', 'https://m.youtube.com/shorts/zhGqJdOEcS4', 'https://www.youtube.com/live/zhGqJdOEcS4']) assert.equal(a.isPlayableYouTubeLink(url), true, url);
  for (const url of ['', null, 'javascript:alert(1)', 'data:text/html,test', 'https://youtube.com.evil.test/watch?v=zhGqJdOEcS4', 'https://youtube.com@evil.test/watch?v=zhGqJdOEcS4', 'https://youtube.com/watch?v=short', 'https://youtu.be/', 'https://youtube.com/playlist?list=abc']) assert.equal(a.isPlayableYouTubeLink(url), false, String(url));
});

test('RS-U03 完全一致でグループ化し、表記ゆれ・空白・大小文字を統合しない', () => {
  const a = app();
  const groups = a.getSurpriseGroups([song('Song'), song('Song'), song('song'), song('Song '), song('Song extra')], 'all');
  assert.equal(groups.size, 4);
  assert.equal(groups.get('Song').length, 2);
});

test('RS-U04 歌唱回数1対9でも曲名単位で均等、曲内の歌唱履歴も均等（100,000回）', () => {
  const a = app();
  const rows = [song('A', '歌枠', { id: 'A' }), ...Array.from({length: 9}, (_, i) => song('B', '歌枠', { id: 'B' + i }))];
  const groups = a.getSurpriseGroups(rows, 'all');
  const random = seededRandom();
  const counts = {};
  for (let i = 0; i < 100000; i++) {
    const selected = a.chooseSurpriseSong(groups, [], random);
    counts[selected.id] = (counts[selected.id] || 0) + 1;
  }
  assert.ok(Math.abs(counts.A - 50000) < 1000, JSON.stringify(counts));
  for (let i = 0; i < 9; i++) assert.ok(Math.abs(counts['B' + i] - 50000 / 9) < 350, JSON.stringify(counts));
  console.log('simulation:', JSON.stringify(counts));
});

test('RS-U05 直近10曲を除外し、少数候補では最古から制限解除、直前の重複を回避', () => {
  const a = app();
  const groups = a.getSurpriseGroups(Array.from({length: 11}, (_, i) => song('S' + i)), 'all');
  assert.equal(a.chooseSurpriseSong(groups, Array.from({length: 10}, (_, i) => 'S' + i), () => 0)['曲名'], 'S10');
  const two = a.getSurpriseGroups([song('A'), song('B')], 'all');
  assert.equal(a.chooseSurpriseSong(two, ['A', 'B'], () => 0)['曲名'], 'A');
  assert.equal(a.chooseSurpriseSong(two, ['B', 'A'], () => 0)['曲名'], 'B');
  assert.equal(a.chooseSurpriseSong(a.getSurpriseGroups([song('A')], 'all'), ['A'], () => 0)['曲名'], 'A');
  assert.equal(a.chooseSurpriseSong(new Map(), ['A']), null);
  let history = [];
  const random = seededRandom(42);
  for (let i = 0; i < 10000; i++) {
    const title = a.chooseSurpriseSong(groups, history, random)['曲名'];
    assert.ok(!history.includes(title));
    history = [...history, title].slice(-10);
  }
});

test('RS-U06 カテゴリを跨ぐ履歴・10件上限・同一セッションでの再読込', () => {
  const session = storage();
  const a = app({ sessionStorage: session });
  for (let i = 0; i < 12; i++) a.rememberDraw('S' + i);
  assert.deepEqual([...a.getDrawHistory()], Array.from({length: 10}, (_, i) => 'S' + (i + 2)));
  const b = app({ sessionStorage: session });
  assert.deepEqual([...b.getDrawHistory()], [...a.getDrawHistory()]);
  const rows = [song('S11', 'オリジナルMV'), song('S11', '歌枠'), song('Other', '歌枠'), song('S11', '3Dライブ'), song('Other3D', '3D配信')];
  assert.equal(b.chooseSurpriseSong(b.getSurpriseGroups(rows, 'singing'), b.getDrawHistory(), () => 0)['曲名'], 'Other');
  assert.equal(b.chooseSurpriseSong(b.getSurpriseGroups(rows, 'live'), b.getDrawHistory(), () => 0)['曲名'], 'Other3D');
});

test('RS-U07 保存制限・容量不足・壊れたJSONでも抽選と既存形式のお気に入りを維持', () => {
  for (const kind of ['blocked', 'quota', 'invalid']) {
    const constrained = { getItem() { if (kind === 'blocked') throw Error('blocked'); return kind === 'invalid' ? 'not-json' : null; }, setItem() { throw Error('quota'); } };
    const a = app({ localStorage: constrained, sessionStorage: constrained });
    a.rememberDraw('A'); a.rememberDraw('B');
    assert.deepEqual([...a.getDrawHistory()], ['A', 'B']);
    a.addFavorite('existing-link'); a.addFavorite('new-link'); a.removeFavorite('new-link');
    assert.deepEqual([...a.getFavorites()], ['existing-link']);
  }
  const local = storage();
  local.setItem('favorites', '["old-link"]');
  const a = app({ localStorage: local });
  a.addFavorite('new-link');
  assert.equal(local.getItem('favorites'), '["old-link","new-link"]');
  assert.equal(local.getItem('flare-songs:surprise-history:v1'), null);
});
