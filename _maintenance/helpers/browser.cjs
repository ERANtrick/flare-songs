const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test:base} = require('@playwright/test');
const {startServer} = require('./server.cjs');
const {site, localAsset, artifact} = require('./paths.cjs');
const cdn = new Map([
  ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css', localAsset('bootstrap.min.css')],
  ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js', localAsset('bootstrap.bundle.min.js')],
  ['https://cdn.jsdelivr.net/npm/papaparse@5.3.2/papaparse.min.js', localAsset('papaparse.min.js')]
]);
const csvURL = fs.readFileSync(path.join(site, 'script.js'), 'utf8').match(/const CSV_URL = '([^']+)'/)[1];
function classify(value, origin) {
  const u = new URL(value);
  if (u.origin === origin) return 'local';
  if (cdn.has(value)) return 'cdn';
  if (value === csvURL) return 'csv';
  if (u.origin === 'https://img.youtube.com' && /^\/vi\/[\w-]{11}\/(?:maxresdefault|hqdefault|mqdefault|default)\.jpg$/.test(u.pathname) && !u.search) return 'image';
  if (['https://www.youtube.com','https://youtu.be'].includes(u.origin)) return 'navigation';
  if (['www.googletagmanager.com','www.google-analytics.com'].includes(u.hostname)) return 'analytics';
  throw Error(`Unexpected external request: ${value}`);
}
function suite() {
  const test = base.extend({});
  const runtime = {origin:null, browser:null, issues:[], contexts:new Map(), info:null};
  let server;
  runtime.start = async browser => {
    server = await startServer(); runtime.origin = server.origin;
    fs.writeFileSync(path.join(artifact(),'browser-version.txt'),browser.version()+'\n');
    runtime.browser = {
      version:() => browser.version(),
      newContext:async options => {
        const context = await browser.newContext({...options, serviceWorkers:'block'});
        runtime.contexts.set(context,{});
        context.on('page', p => p.on('pageerror', error => runtime.issues.push('Page exception: '+error.message)));
        const originalRoute = context.route.bind(context);
        const guard = handler => async (route, request) => {
          let kind;
          try {kind=classify(request.url(),runtime.origin);} catch(error) {
            runtime.issues.push(error.message);await route.abort('blockedbyclient');return;
          }
          if (kind==='analytics') {await route.abort('blockedbyclient');return;}
          // All suite routes are guarded, including later per-scenario overrides.
          return handler(route,request);
        };
        context.route = (pattern, handler, options) => originalRoute(pattern,guard(handler),options);
        await originalRoute('**/*',guard(async route => {
          const kind=classify(route.request().url(),runtime.origin);
          if(kind==='local') return route.continue();
          runtime.issues.push('Unmocked external request: '+route.request().url());await route.abort('blockedbyclient');
        }));
        const close = context.close.bind(context);
        context.close = async () => {runtime.contexts.delete(context);await close();};
        return context;
      }
    };
  };
  test.beforeEach(async({},info)=>{
    runtime.info=info;runtime.issues=[];
  });
  test.afterEach(async({},info)=>{
    const failed=info.status!==info.expectedStatus || runtime.issues.length>0;
    if(failed){
      for(const context of runtime.contexts.keys())for(const p of context.pages())if(!p.isClosed()){
        try{await info.attach('failure-screen',{body:await p.screenshot({timeout:3000}),contentType:'image/png'});}catch{}
      }
    }
    assert.deepEqual(runtime.issues,[], 'Unexpected network or browser errors');
  });
  test.afterAll(async()=>{
    for(const context of [...runtime.contexts.keys()])await context.close();
    if(server)await server.close();
  });
  return {test,runtime};
}
module.exports={suite,classify,cdn,csvURL};
