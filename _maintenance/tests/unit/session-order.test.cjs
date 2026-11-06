const {snapshot}=require('../../helpers/paths.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const site=require('../../helpers/paths.cjs').site,Papa=require('papaparse');
const source=fs.readFileSync(path.join(site,'script.js'),'utf8').replaceAll('\r\n','\n');
function context(code){const a={URL,console,document:{documentElement:{getAttribute:()=> 'light'}},window:{addEventListener(){}}};vm.createContext(a);vm.runInContext(code,a);return a}
const app=context(source),url=tail=>'https://youtu.be/zhGqJdOEcS4'+tail;
const row=(title,tail)=>({'曲名':title,'リンク':url(tail)}),plain=v=>JSON.parse(JSON.stringify(v));
test('F08-U01 t/start/#tの数値・複合時刻・指定なしを秒数へ解析',()=>{for(const [tail,seconds]of [['?t=630',630],['?start=630',630],['#t=630',630],['?t=10m30s',630],['?start=1h2m3s',3723],['#t=1h2m3s',3723],['?t=0',0],['',0],['?si=share&feature=shared',0],['?t=1m',60],['?start=2h',7200],['?t=001s',1]])assert.equal(app.getPlaybackStartSeconds(new URL(url(tail))),seconds,tail)});
test('F08-U02 既存のt > start > #tの優先順と不正値の解釈を維持',()=>{for(const [tail,seconds]of [['?t=1&start=2#t=3',1],['?start=2#t=3',2],['?t=&start=2',null],['?t=nope#t=3',null],['?t=-1',null],['?t=1.5',null],['?t=1m2h',null],['?t=9007199254740992',null],['?t=1h2m3',null],['#t=',null]])assert.equal(app.getPlaybackStartSeconds(new URL(url(tail))),seconds,tail)});
test('F08-U03 逆順データを時刻の昇順へ、曲名や架空の開始秒数列は基準にしない',()=>{const input=[{...row('Last','?t=1h2m3s'),'開始秒数':'0'},row('Middle','?start=10m30s'),row('First','#t=1s')],snapshot=JSON.stringify(input);assert.deepEqual(plain(app.sortSessionSongsByStart(input).map(s=>s['曲名'])),['First','Middle','Last']);assert.equal(JSON.stringify(input),snapshot)});
test('F08-U04 同じ時刻は異なるURL表記でもCSV順、時刻なしは0秒',()=>{const input=[row('A','?t=10m30s'),row('B','?start=630'),row('Zero','?si=share'),row('C','#t=630s'),row('Zero2','?t=0')];assert.deepEqual(plain(app.sortSessionSongsByStart(input).map(s=>s['曲名'])),['Zero','Zero2','A','B','C'])});
test('F08-U05 不正時刻を1件でも含む配信は配信内の全件を元順に保つ',()=>{for(const bad of ['?t=nope','?start=-1','#t=','?t=1.5','?t=9007199254740992']){const input=[row('Late','?t=100'),row('Bad',bad),row('Early','?t=1')];assert.equal(app.sortSessionSongsByStart(input),input,bad);assert.deepEqual(plain(app.sortSessionSongsByStart(input)),input)}});
test('F08-U06 空名パラメータや不正URLも保守的に配信単位でCSV順へフォールバック',()=>{for(const bad of ['?=0','?%20=0']){const input=[row('Late','?t=100'),row('Bad',bad),row('Early','?t=1')];assert.equal(app.sortSessionSongsByStart(input),input)}const input=[row('Late','?t=100'),{'曲名':'Bad','リンク':'not-url'},row('Early','?t=1')];assert.equal(app.sortSessionSongsByStart(input),input)});
test('F08-U07 空配列・1件・正常な共有パラメータ付きMVでも動作し、元配列を変更しない',()=>{for(const input of [[],[row('MV','')],[row('MV','?si=share&feature=shared')]]){assert.deepEqual(plain(app.sortSessionSongsByStart(input)),input);assert.equal(app.sortSessionSongsByStart(input).length,input.length)}});
test('F08-U08 getPlaybackPoint：仕様上の動画ID・秒数・優先順を独立した期待値で検証',()=>{
 // Empty query names are warned separately by F01 and trigger session fallback;
 // getPlaybackPoint itself still reads a valid video with no timestamp as zero.
 const cases=[['',0],['?t=0',0],['?t=321s',321],['?start=10m30s',630],['#t=1h2m3s',3723],['?t=&start=1',null],['?t=foo',null],['?start=-1',null],['?t=1.5',null],['?=0',0],['?%20=0',0],['?si=share&feature=shared',0],['?t=9007199254740992',null],['?start=5#t=9',5],['?t=2&start=5#t=9',2]];
 for(let i=0;i<100;i++){const n=i*367;cases.push(['?t='+n,n],['?start='+Math.floor(n/60)+'m'+n%60+'s',n],['#t='+Math.floor(n/3600)+'h'+Math.floor(n%3600/60)+'m'+n%60+'s',n]);}
 for(const [tail,n]of cases)assert.equal(app.getPlaybackPoint(url(tail)),n===null?null:'zhGqJdOEcS4:'+n,tail);
});
test('F08-U09 保存CSVの受理・診断・集合を明示的な期待値で検証',()=>{
 for(const name of ['songs.csv','known-csv-f02.csv']){const parsed=Papa.parse(fs.readFileSync(snapshot(name),'utf8'),{header:true,delimiter:','}),actual=app.validateSongCSV(parsed);
 assert.equal(actual.fatal,false);assert.deepEqual(plain(actual.songs),parsed.data);assert.equal(actual.songs.length,2763);assert.equal(actual.report.acceptedPublicRows,2733);assert.equal(actual.report.excludedRows,0);
 assert.equal(actual.report.issues.length,name==='songs.csv'?0:1);
 if(name!=='songs.csv'){const issue=actual.report.issues[0];assert.equal(issue.code,'empty_query_parameter');assert.equal(issue.row,2763);assert.equal(issue.title,'絶対零度');assert.equal(issue.value,'https://youtu.be/JUXIXgRI-TY?=0');}
 const groups=new Map();for(const s of actual.songs.filter(s=>s['公開']==='公開')){const k=s['配信URL'];if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s);}assert.equal(groups.size,205);
 assert.equal(new Set(actual.songs.filter(s=>s['公開']==='公開').map(s=>s['曲名'])).size,681);
 for(const rows of groups.values())assert.deepEqual(new Set(plain(app.sortSessionSongsByStart(rows))),new Set(rows));
 }});
test('F08-U10 時刻診断のコード・行番号・値を仕様で検証',()=>{
 const data=Papa.parse(fs.readFileSync(snapshot('songs.csv'),'utf8'),{header:true}).data;
 for(const [tail,code]of [['?t=nope','invalid_start_time'],['?t=','invalid_start_time'],['?start=1.5','invalid_start_time'],['?=0','empty_query_parameter'],['?t=321s','duplicate_playback_point'],['?start=5m21s','duplicate_playback_point']]){
 const rows=data.slice(0,2).map((s,i)=>({...s,'配信URL':url(''),'リンク':url(i===0?'?t=321s':tail)})),parsed=Papa.parse(Papa.unparse(rows),{header:true,delimiter:','}),r=app.validateSongCSV(parsed);
 assert.equal(r.fatal,false);assert.deepEqual(plain(r.songs),rows);assert.equal(r.report.excludedRows,0);assert.equal(r.report.counts[code],1);
 const issue=r.report.issues.find(i=>i.code===code);assert.equal(issue.row,2);assert.equal(issue.severity,'warning');if(code==='duplicate_playback_point')assert.deepEqual(plain(issue.relatedRows),[1,2]);
 }});
