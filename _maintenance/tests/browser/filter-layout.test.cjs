const assert=require('node:assert/strict'),fs=require('node:fs');
const {test,runtime}=require('../../helpers/browser.cjs').suite();
const {snapshot,artifact}=require('../../helpers/paths.cjs');
const {measure,assertFits}=require('../../helpers/f02-layout.cjs');
const {mockData,settle}=require('../../helpers/view.cjs');
const csv=fs.readFileSync(snapshot('known-csv-f02.csv'),'utf8');
test.beforeAll(async({browser})=>{await runtime.start(browser);});
for(const width of [320,375,576,640,768,900,991,992,1280])for(const lang of ['ja','en'])for(const theme of ['light','dark']){
 test('F02-'+width+'-'+lang+'-'+theme+' 長い配信選択と操作・幅・折返し',async({},info)=>{
 const context=await runtime.browser.newContext({viewport:{width,height:1000},colorScheme:theme});await mockData(context,csv,runtime.origin);
 const page=await context.newPage();await page.goto(runtime.origin+'/');await settle(page);await page.selectOption('#lang-select',lang);await settle(page);
 const options=await page.locator('#session-select option').evaluateAll(ns=>ns.map(n=>({value:n.value,text:n.textContent})));
 assert.equal(options.length,206);
 const longest=await page.locator('#session-select').evaluate(s=>{const ctx=document.createElement('canvas').getContext('2d');ctx.font=getComputedStyle(s).font;return [...s.options].filter(o=>o.value).sort((a,b)=>ctx.measureText(b.textContent).width-ctx.measureText(a.textContent).width)[0].value;});
 const result={longestOption:options.find(o=>o.value===longest)};
 const initial=await measure(page);await page.selectOption('#session-select',longest);await settle(page);const selected=await measure(page);
 assert.equal(selected.selectedText,result.longestOption.text);assert.equal(selected.options,options.length);assertFits(initial);assertFits(selected);
 const count=await page.evaluate(()=>allSongs.filter(s=>s['公開']==='公開'&&s['配信URL']===document.getElementById('session-select').value).length);
 assert.equal(await page.locator('#song-list .card').count(),Math.min(count,20));
   await page.locator('#session-select').focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');await settle(page);assert.equal(await page.locator('#session-select').inputValue(),'');await page.selectOption('#session-select',longest);await settle(page);
   const category=await page.evaluate(()=>allSongs.find(s=>s['公開']==='公開'&&s['配信URL']===document.getElementById('session-select').value).Category);await page.selectOption('#category-select',category);await settle(page);
   const title=await page.evaluate(()=>allSongs.find(s=>s['公開']==='公開'&&s['配信URL']===document.getElementById('session-select').value&&s.Category===document.getElementById('category-select').value)['曲名']);await page.fill('#search-input',title);await settle(page);assert.ok(await page.locator('#song-list .accordion-item').count()>0);await page.locator('#song-list .accordion-button').first().click();await page.waitForFunction(()=>!!document.querySelector('#song-list .accordion-collapse.show'));assert.ok(await page.locator('#song-list .card').count()>0);
   await page.selectOption('#sort-session','date-asc');await settle(page);assert.equal(await page.locator('#sort-session').inputValue(),'date-asc');await page.click('#reset-btn');await settle(page);assert.equal(await page.locator('#session-select').inputValue(),'');assert.equal(await page.locator('#category-select').inputValue(),'');assert.equal(await page.locator('#search-input').inputValue(),'');assert.equal(await page.locator('#sort-session').inputValue(),'date-desc');
   const star=page.locator('#song-list .fav-btn').first();const active=await star.getAttribute('aria-pressed');if(active==='true')await star.click();await star.click();assert.equal(await star.getAttribute('aria-pressed'),'true');await page.click('#fav-only-btn');await settle(page);assert.ok(await page.locator('#song-list .card').count()>0);await page.click('#reset-btn');await settle(page);
   await page.selectOption('#surprise-category','all');await page.click('#surprise-pick');assert.equal(await page.locator('#surprise-result').isVisible(),true);await page.click('#surprise-favorite');await page.click('#surprise-again');assert.equal(await page.locator('#surprise-result').isVisible(),true);assertFits(await measure(page));await page.click('#surprise-pick');
   await page.selectOption('#session-select',longest);await settle(page);await page.evaluate(()=>scrollTo(0,0));
 await info.attach('layout',{body:Buffer.from(JSON.stringify({width,lang,theme,initial,selected},null,2)),contentType:'application/json'});
 await context.close();
 });
}
