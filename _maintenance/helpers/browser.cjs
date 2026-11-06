const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test:base} = require('@playwright/test');
const {startServer} = require('./server.cjs');
const {site, artifact} = require('./paths.cjs');
const {assetForURL,assets,runtimeAssets,verifyAsset}=require('./vendor.cjs');
const csvURL = fs.readFileSync(path.join(site, 'script.js'), 'utf8').match(/const CSV_URL = '([^']+)'/)[1];
function classify(value, origin) {
  const u = new URL(value);
  if (u.origin === origin) {
    if(u.pathname.replace(/^\/flare-songs\//,'/').startsWith('/assets/vendor/')){
      if(!assetForURL(value,origin))throw Error('Unexpected local vendor asset: '+value);
      return 'vendor';
    }
    return 'local';
  }
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
      newContext:async ({expectedVendorFaults=[],...options}={}) => {
        for(const name of expectedVendorFaults)if(!assets.has(name))throw Error('Unknown expected vendor fault: '+name);
        const context = await browser.newContext({...options, serviceWorkers:'block'});
        const state={pending:[],seen:new Set(),documentSeen:false,faults:new Set(expectedVendorFaults)};
        runtime.contexts.set(context,state);
        context.on('response',response=>{
          if(response.request().resourceType()==='document'&&new URL(response.url()).origin===runtime.origin&&response.status()===200)state.documentSeen=true;
          const entry=assetForURL(response.url(),runtime.origin);if(!entry)return;
          const task=(async()=>{
            if(!state.faults.has(entry.path))verifyAsset(entry,response.status(),await response.body());
            state.seen.add(entry.path);
          })().catch(error=>runtime.issues.push(error.message));state.pending.push(task);
        });
        context.on('requestfailed',request=>{
          const entry=assetForURL(request.url(),runtime.origin);if(!entry)return;
          if(state.faults.has(entry.path))state.seen.add(entry.path);
          else runtime.issues.push('Vendor request failed: '+entry.path+' '+request.failure()?.errorText);
        });
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
          if(kind==='local'||kind==='vendor') return route.continue();
          runtime.issues.push('Unmocked external request: '+route.request().url());await route.abort('blockedbyclient');
        }));
        const close = context.close.bind(context);
        context.close = async () => {await audit(state);runtime.contexts.delete(context);await close();};
        return context;
      }
    };
  };
  async function audit(state){
    await Promise.all(state.pending);
    if(state.documentSeen)for(const entry of runtimeAssets)if(!state.seen.has(entry.path))runtime.issues.push('Vendor response not verified: '+entry.path);
  }
  test.beforeEach(async({},info)=>{
    runtime.info=info;runtime.issues=[];
  });
  test.afterEach(async({},info)=>{
    for(const state of runtime.contexts.values())await audit(state);
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
    assert.deepEqual(runtime.issues,[], 'Unexpected network or browser errors at cleanup');
  });
  return {test,runtime};
}
module.exports={suite,classify,csvURL};
