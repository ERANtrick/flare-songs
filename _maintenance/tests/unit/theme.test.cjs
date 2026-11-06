const {snapshot}=require('../../helpers/paths.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const site=require('../../helpers/paths.cjs').site;
const read=file=>fs.readFileSync(path.join(site,file),'utf8').replaceAll('\r\n','\n');
const source=read('script.js'),html=read('index.html'),css=read('styles.css');
const early=html.match(/<script id="theme-init">([\s\S]*?)<\/script>/)[1],key='flare-songs:theme:v1';
function app({saved,scheme='light',readError=false,writeError=false,unavailable=false}={}){
 const attrs=new Map([['data-bs-theme','auto']]),values=new Map(),reads=[],writes=[],handlers={};
 if(saved!==undefined)values.set(key,saved);
 values.set('favorites','["legacy-link"]');values.set('flare-songs:surprise-history:v1','["previous"]');
 const storage={getItem(k){reads.push(k);if(readError)throw Error('blocked read');return values.get(k)??null},setItem(k,v){writes.push([k,v]);if(writeError)throw Error('blocked write');values.set(k,v)}};
 const button={textContent:'',addEventListener(name,fn){handlers[name]=fn}};
 const a={URL,console,window:{matchMedia:()=>({matches:scheme==='dark'}),addEventListener(){}},document:{documentElement:{getAttribute:k=>attrs.get(k),setAttribute:(k,v)=>attrs.set(k,v)},getElementById:id=>id==='dark-mode-btn'?button:null},localStorage:storage};
 if(unavailable)Object.defineProperty(a,'localStorage',{get(){throw Error('unavailable')}});
 vm.createContext(a);vm.runInContext(early,a);vm.runInContext(source,a);a.initDarkmodeToggle();a.updateDarkmodeLabel();
 return {a,attrs,values,reads,writes,button,click:()=>handlers.click(),lang:value=>{vm.runInContext('currentLang='+JSON.stringify(value)+';updateDarkmodeLabel()',a)}};
}
test('THEME-U01 保存なしは端末のライト／ダークを初期採用し、自動では保存しない',()=>{for(const scheme of ['light','dark']){const x=app({scheme});assert.equal(x.attrs.get('data-bs-theme'),scheme);assert.equal(x.writes.length,0)}});
test('THEME-U02 保存済みlight/darkは反対の端末設定より優先',()=>{for(const saved of ['light','dark']){const x=app({saved,scheme:saved==='light'?'dark':'light'});assert.equal(x.attrs.get('data-bs-theme'),saved);assert.equal(x.writes.length,0)}});
test('THEME-U03 不正な保存値は未設定として扱い、元の値を勝手に書き換えない',()=>{for(const saved of ['','auto','DARK','"dark"',' light ','null','<script>'])for(const scheme of ['light','dark']){const x=app({saved,scheme});assert.equal(x.attrs.get('data-bs-theme'),scheme);assert.equal(x.values.get(key),saved);assert.equal(x.writes.length,0)}});
test('THEME-U04 クリック直後の表示・保存と日英文言は切替先を示す',()=>{const x=app();assert.equal(x.button.textContent,'ダークモード');x.click();assert.equal(x.attrs.get('data-bs-theme'),'dark');assert.equal(x.button.textContent,'ライトモード');assert.equal(x.values.get(key),'dark');x.lang('en');assert.equal(x.button.textContent,'Light Mode');x.click();assert.equal(x.attrs.get('data-bs-theme'),'light');assert.equal(x.button.textContent,'Dark Mode');x.lang('ja');assert.equal(x.button.textContent,'ダークモード');assert.deepEqual(x.writes,[[key,'dark'],[key,'light']])});
test('THEME-U05 localStorageの読取・保存・アクセス自体が失敗しても表示と切替を継続',()=>{for(const policy of [{readError:true},{writeError:true},{unavailable:true}]){const x=app({...policy,scheme:'dark'});assert.equal(x.attrs.get('data-bs-theme'),'dark');assert.doesNotThrow(()=>x.click());assert.equal(x.attrs.get('data-bs-theme'),'light');assert.equal(x.button.textContent,'ダークモード');x.lang('en');x.click();assert.equal(x.button.textContent,'Light Mode')}});
test('THEME-U06 専用キーだけを保存し、お気に入りと抽選履歴を保持',()=>{const x=app();x.click();assert.deepEqual(x.reads,[key]);assert.equal(x.values.get('favorites'),'["legacy-link"]');assert.equal(x.values.get('flare-songs:surprise-history:v1'),'["previous"]');assert.ok(!['favorites','flare-songs:surprise-history:v1'].includes(key))});
test('THEME-U07 早期処理はCSS・外部スクリプトより前、ネイティブbuttonに不要な状態属性なし',()=>{const at=html.indexOf('<script id="theme-init">');assert.ok(at<html.indexOf('<!-- Bootstrap CSS -->'));assert.ok(at<html.indexOf('<!-- PapaParse -->'));const markup=html.match(/<button id="dark-mode-btn"[^>]*>/)[0];assert.ok(markup.includes('type="button"'));assert.ok(!markup.includes('href=')&&!markup.includes('aria-pressed'));assert.ok(css.includes('#dark-mode-btn:focus-visible'))});
