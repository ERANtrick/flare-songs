const {csvURL}=require('./browser.cjs');
const {localAsset}=require('./paths.cjs');
async function settle(page){
  await page.waitForFunction(()=>typeof songLoadState!=='undefined'&&songLoadState==='ready'&&!document.querySelector('#song-list .spinner-border'));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function mockData(context,csv,origin){
  await context.route('**/*',async route=>{
    const value=route.request().url(),url=new URL(value);
    if(url.origin===origin)return route.continue();
    if(value===csvURL)return route.fulfill({body:csv,contentType:'text/csv; charset=utf-8',headers:{'access-control-allow-origin':'*'}});
    if(url.hostname==='img.youtube.com')return route.fulfill({path:localAsset('sample-thumbnail.jpg'),contentType:'image/jpeg'});
    return route.abort();
  });
}
module.exports={settle,mockData};
