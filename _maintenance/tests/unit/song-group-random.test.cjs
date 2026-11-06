const {snapshot}=require('../../helpers/paths.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const site = require('../../helpers/paths.cjs').site;
const source = fs.readFileSync(path.join(site, 'script.js'), 'utf8').replaceAll('\r\n', '\n');
const plain = value => JSON.parse(JSON.stringify(value));
function app(songs, random = () => 0) {
  const a = {URL, console, document: {}, window: {addEventListener() {}}, __songs: songs, __random: random};
  vm.createContext(a);vm.runInContext(source, a);
  vm.runInContext('allSongs=__songs;Math.random=__random', a);
  return {a, ranks: () => a.getRandomSongTitleRanks(), clear: () => vm.runInContext('randomSongTitleRanks=new WeakMap()', a), set: rows => {a.__songs=rows;vm.runInContext('allSongs=__songs', a);}};
}
const row = (title, extra={}) => ({'曲名':title,'公開':'公開',...extra});
const five = ['A','B','C','D','E'].map(title=>row(title));
test('F05-U01 固定乱数0でFisher-Yatesの期待順と乱数呼出し回数を検証', () => {
  let calls=0;const x=app(five,()=>{calls++;return 0;});
  assert.deepEqual(plain([...x.ranks().keys()]),['B','C','D','E','A']);assert.equal(calls,4);
});
test('F05-U02 結果が元と同じ順になる正常な乱数も受理し、重複・欠落なし', () => {
  const x=app(five,()=>.999999999);assert.deepEqual(plain([...x.ranks().keys()]),['A','B','C','D','E']);
  assert.deepEqual(plain([...x.ranks().values()]),[0,1,2,3,4]);
});
test('F05-U03 曲名の重複を1グループとし非公開を除き、元データを変更しない', () => {
  const rows=[...five,row('A'),row('Hidden',{'公開':'非公開'}),row('B')],before=JSON.stringify(rows);
  const x=app(rows);assert.equal(x.ranks().size,5);assert.equal(x.ranks().has('Hidden'),false);assert.equal(JSON.stringify(rows),before);
});
test('F05-U04 繰り返し取得でも同じMapを返し、再シャッフルしない', () => {
  let calls=0;const x=app(five,()=>{calls++;return .5;});const first=x.ranks();for(let i=0;i<20;i++)assert.equal(x.ranks(),first);assert.equal(calls,4);
});
test('F05-U05 部分集合は全曲の順位に従い、解除すると元の順に復帰できる', () => {
  const x=app(five),ranks=x.ranks();const sort=titles=>titles.sort((a,b)=>ranks.get(a)-ranks.get(b));
  assert.deepEqual(sort(['E','A','C']),['C','E','A']);assert.deepEqual(sort(['A','B','C','D','E']),['B','C','D','E','A']);
});
test('F05-U06 選び直しによる無効化後は新しい乱数列で順序を生成', () => {
  let value=0,calls=0;const x=app(five,()=>{calls++;return value;});const old=x.ranks();value=.999999999;x.clear();const next=x.ranks();
  assert.notEqual(old,next);assert.deepEqual(plain([...next.keys()]),['A','B','C','D','E']);assert.equal(calls,8);
});
test('F05-U07 CSVデータ配列が置き換わると新しい曲名集合へ追従', () => {
  const x=app(five),old=x.ranks();x.set([row('New1'),row('New2')]);assert.notEqual(x.ranks(),old);assert.deepEqual(plain([...x.ranks().keys()]),['New2','New1']);
});
test('F05-U08 0件・1曲でも正しく扱い、乱数を消費しない', () => {
  for(const rows of [[],[row('One')],[row('Private',{'公開':'非公開'})]]){let calls=0;const x=app(rows,()=>{calls++;return 0;});assert.equal(x.ranks().size,rows[0]?.['公開']==='公開'?1:0);assert.equal(calls,0);}
});
test('F05-U09 特殊な曲名もMapで安全に扱い、曲名の表記を変えない', () => {
  const titles=['__proto__','constructor','01','1','<img>',' A ','Ａ'];const x=app(titles.map(t=>row(t)));
  assert.equal(x.ranks().size,titles.length);assert.deepEqual(new Set(plain([...x.ranks().keys()])),new Set(titles));
});
