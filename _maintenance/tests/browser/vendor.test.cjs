const assert=require('node:assert/strict'),fs=require('node:fs');
const {test,runtime}=require('../../helpers/browser.cjs').suite();
const {runtimeAssets,manifest,verifyAsset}=require('../../helpers/vendor.cjs');
const {snapshot}=require('../../helpers/paths.cjs');
const {mockData,settle}=require('../../helpers/view.cjs');
const data=fs.readFileSync(snapshot('songs.csv'),'utf8');
test.beforeAll(async({browser})=>runtime.start(browser));
test('F10-B01 同一originの実ファイル3件が200・正規hashで、CDNなし・8表示条件とaccordion開閉',async()=>{
 for(const width of [375,1280])for(const lang of ['ja','en'])for(const theme of ['light','dark']){
  const context=await runtime.browser.newContext({viewport:{width,height:1000},colorScheme:theme});await mockData(context,data,runtime.origin);
  const page=await context.newPage(),responses=[],requests=[],errors=[];page.on('response',r=>responses.push(r));page.on('request',r=>requests.push(r.url()));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('googletagmanager.com'))errors.push(m.text());});
  await page.goto(runtime.origin+'/');await settle(page);await page.selectOption('#lang-select',lang);await settle(page);
  for(const entry of runtimeAssets){const response=responses.find(r=>r.url()===runtime.origin+'/'+entry.path);assert(response,entry.path);verifyAsset(entry,response.status(),await response.body());}
  assert.equal(requests.some(u=>new URL(u).hostname==='cdn.jsdelivr.net'),false);assert.equal(await page.evaluate(()=>bootstrap.Collapse.VERSION),'5.3.2');assert.deepEqual(await page.evaluate(()=>Papa.parse('a,b\n1,2',{header:true}).data),[{a:'1',b:'2'}]);
  await page.selectOption('#mode-select','song');await settle(page);const accordion=page.locator('#song-list .accordion-button').first();await accordion.click();await page.waitForFunction(()=>!!document.querySelector('#song-list .accordion-collapse.show')&&!document.querySelector('#song-list .collapsing'));assert(await page.locator('#song-list .card').count()>0);await accordion.click();await page.waitForFunction(()=>!document.querySelector('#song-list .accordion-collapse.show')&&!document.querySelector('#song-list .collapsing'));assert.equal(await page.locator('#song-list .card').count(),0);assert.deepEqual(errors,[]);await context.close();
 }
});
test('F10-B02 /flare-songs/で全vendor・map・LICENSEが200/hash一致、map sourcesは自己完結',async()=>{
 const context=await runtime.browser.newContext();await mockData(context,data,runtime.origin);const page=await context.newPage(),requests=[];page.on('request',r=>requests.push(r.url()));await page.goto(runtime.origin+'/flare-songs/');await settle(page);
 for(const entry of manifest.files){const response=await page.request.get(runtime.origin+'/flare-songs/'+entry.path);verifyAsset(entry,response.status(),await response.body());if(entry.role==='source-map'){const map=await response.json();assert.equal(map.sources.length,map.sourcesContent.length);assert(map.sourcesContent.every(s=>typeof s==='string'));}}
 for(const entry of runtimeAssets)assert(requests.includes(runtime.origin+'/flare-songs/'+entry.path));assert.equal(requests.some(u=>new URL(u).hostname==='cdn.jsdelivr.net'),false);await context.close();
});
test('F10-B03 ローカルPapaParseの404は一覧と抽選のerrorとなり、成功表示しない',async()=>{
 const entry=runtimeAssets.find(e=>e.package==='papaparse');const context=await runtime.browser.newContext({expectedVendorFaults:[entry.path]});await mockData(context,data,runtime.origin);await context.route('**/'+entry.path,route=>route.fulfill({status:404,body:'Not found',contentType:'text/javascript'}));const page=await context.newPage();await page.goto(runtime.origin+'/');await page.waitForFunction(()=>songLoadState==='error');assert.equal(await page.evaluate(()=>songsLoaded),false);assert.equal(await page.locator('#surprise-pick').isDisabled(),true);assert.equal(await page.locator('#song-list .card').count(),0);assert.equal(await page.locator('[data-reload-songs]').count(),1);await context.close();
});
