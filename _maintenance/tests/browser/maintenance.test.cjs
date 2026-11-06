const assert=require('node:assert/strict'),fs=require('node:fs');
const {test,runtime}=require('../../helpers/browser.cjs').suite();
const {mockData,settle}=require('../../helpers/view.cjs');
const {snapshot}=require('../../helpers/paths.cjs');
test.beforeAll(async({browser})=>runtime.start(browser));
test('F07-B01 /flare-songs/からCSS・JS・SVGが解決し初期表示・テーマ・曲名表示が動作',async()=>{
 const c=await runtime.browser.newContext({viewport:{width:375,height:1000}});await mockData(c,fs.readFileSync(snapshot('songs.csv'),'utf8'),runtime.origin);
 const p=await c.newPage(),failed=[];p.on('response',r=>{if(new URL(r.url()).origin===runtime.origin&&r.status()!==200)failed.push(r.url());});
 await p.goto(runtime.origin+'/flare-songs/');await settle(p);assert.equal(await p.locator('#song-list .card').count(),20);
 const theme=await p.locator('html').getAttribute('data-bs-theme');await p.click('#dark-mode-btn');assert.notEqual(await p.locator('html').getAttribute('data-bs-theme'),theme);
 await p.selectOption('#mode-select','song');await settle(p);assert.equal(await p.locator('#song-list .accordion-item').count(),681);assert.deepEqual(failed,[]);await c.close();
});
