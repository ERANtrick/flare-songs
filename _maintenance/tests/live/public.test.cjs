const {test,expect}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Papa=require('papaparse');
const {startServer}=require('../../helpers/server.cjs');
const {artifact}=require('../../helpers/paths.cjs');
const {csvURL}=require('../../helpers/browser.cjs');
const {runtimeAssets,verifyAsset}=require('../../helpers/vendor.cjs');
const {settle}=require('../../helpers/view.cjs');
let server;
test.beforeAll(async({browser})=>{server=await startServer();fs.writeFileSync(path.join(artifact(),'browser-version.txt'),browser.version()+'\n');});
test.afterAll(async()=>{if(server)await server.close();});
for(const width of [1280,375])test(`LIVE-${width} 公開CSV・同一originライブラリ・画像を実通信で確認`,async({browser},info)=>{
 const context=await browser.newContext({viewport:{width,height:1000}});
 const runtimeErrors=[],responses=[],vendorResponses=[];
 context.on('page',p=>p.on('pageerror',error=>runtimeErrors.push(error.message)));
 // Analytics is intentionally suppressed. All functional resources use real network.
 await context.route(/https:\/\/(?:www\.)?(?:googletagmanager|google-analytics)\.com\//,route=>route.abort());
 const page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(45000);
 page.on('response',r=>{responses.push({url:r.url(),status:r.status()});if(runtimeAssets.some(e=>r.url()===server.origin+'/flare-songs/'+e.path))vendorResponses.push(r);});
 page.on('requestfailed',r=>responses.push({url:r.url(),failure:r.failure()?.errorText}));
 try{
  const [response]=await Promise.all([page.waitForResponse(r=>{
    let request=r.request();while(request.redirectedFrom())request=request.redirectedFrom();
    return request.url()===csvURL&&r.status()===200;
  },{timeout:45000}),page.goto(server.origin+'/flare-songs/',{waitUntil:'domcontentloaded'})]);assert.equal(response.status(),200);
  const bytes=await response.body(),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(path.join(artifact(),`live-${width}.csv`),bytes);
  const parsed=Papa.parse(bytes.toString('utf8'),{header:true,delimiter:',',skipEmptyLines:true});assert.deepEqual(parsed.errors,[]);
  const publicRows=parsed.data.filter(s=>s['公開']==='公開'),titles=new Set(publicRows.map(s=>s['曲名'])),sessions=new Set(publicRows.map(s=>s['配信URL']));
  await settle(page);const diagnostics=await page.evaluate(()=>flareSongsDiagnostics());
  assert.equal(diagnostics.acceptedPublicRows,publicRows.length);assert.equal(diagnostics.excludedRows,0);
  assert.equal(await page.locator('#song-list .card').count(),Math.min(publicRows.length,20));
  for(const entry of runtimeAssets){const response=vendorResponses.find(r=>r.url()===server.origin+'/flare-songs/'+entry.path);assert(response,'Missing local vendor: '+entry.path);verifyAsset(entry,response.status(),await response.body());}
  assert.equal(responses.some(r=>new URL(r.url).hostname==='cdn.jsdelivr.net'),false);
  if(publicRows.length){await expect.poll(()=>page.locator('#song-list img').evaluateAll(ns=>ns.some(n=>n.complete&&n.naturalWidth>0))).toBe(true);}
  await page.click('#surprise-pick');if(publicRows.length)await expect(page.locator('#surprise-result')).toBeVisible();
  await page.selectOption('#mode-select','song');await settle(page);assert.equal(await page.locator('#song-list .accordion-item').count(),titles.size);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert.deepEqual(runtimeErrors,[]);
  const result={checkedAt:new Date().toISOString(),width,url:csvURL,sha256,bytes:bytes.length,records:parsed.data.length,publicRecords:publicRows.length,titles:titles.size,sessions:sessions.size,diagnostics,responses};
  fs.writeFileSync(path.join(artifact(),`live-${width}.json`),JSON.stringify(result,null,2));await info.attach('live-data',{body:Buffer.from(JSON.stringify(result,null,2)),contentType:'application/json'});
 }catch(error){
  fs.writeFileSync(path.join(artifact(),`live-${width}-failure.json`),JSON.stringify({width,error:String(error.stack),responses,runtimeErrors},null,2));throw error;
 }finally{if(context.browser()?.isConnected())await context.close();}
});
