const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {maintenance,site}=require('../helpers/paths.cjs');
const mode=process.argv[2];
if(!['fixed','unit','browser','live','pages'].includes(mode))throw Error('Unknown test mode');
const runDir=path.join(maintenance,'artifacts',new Date().toISOString().replace(/[:.]/g,'-')+'-'+mode+'-'+crypto.randomBytes(3).toString('hex'));
fs.mkdirSync(runDir,{recursive:true});
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git=(...args)=>{const r=spawnSync('git',['-C',site,...args],{encoding:'utf8',windowsHide:true});if(r.status!==0)throw Error(r.stderr||'Git failed');return r.stdout.trim();};
const metadata={started:new Date().toISOString(),mode,runDir,target:site,commit:git('rev-parse','HEAD'),dirty:git('status','--porcelain','--untracked-files=all'),node:process.version,os:{platform:process.platform,release:os.release(),arch:os.arch()},
  packageLock:hash(path.join(maintenance,'package-lock.json')),
  product:Object.fromEntries(['index.html','script.js','styles.css'].map(n=>[n,hash(path.join(site,n))])),
  snapshots:Object.fromEntries(['songs.csv','known-csv-f02.csv'].map(n=>[n,hash(path.join(maintenance,'fixtures/snapshots',n))])),
  stages:[{name:'verify',status:'not-run'},...(['fixed','unit'].includes(mode)?[{name:'unit',status:'not-run'}]:[]),...(['fixed','browser','live'].includes(mode)?[{name:mode==='live'?'live':'browser',status:'not-run'}]:[]),...(mode==='pages'?[{name:'pages',status:'not-run'}]:[])],status:'running'};
const metadataFile=path.join(runDir,'run.json');
const write=()=>fs.writeFileSync(metadataFile,JSON.stringify(metadata,null,2)+'\n');write();
console.log('Run artifacts: '+runDir);
const env={...process.env,FLARE_RUN_DIR:runDir,FLARE_TEST_MODE:mode==='live'?'live':'fixed'};
function stage(name,args){
  const log=path.join(runDir,name+'.log'),fd=fs.openSync(log,'w');
  const record=metadata.stages.find(s=>s.name===name);Object.assign(record,{status:'running',started:new Date().toISOString()});write();
  const r=spawnSync(process.execPath,args,{cwd:maintenance,env,stdio:['inherit',fd,fd],windowsHide:true,timeout:17*60*1000});fs.closeSync(fd);
  process.stdout.write(fs.readFileSync(log,'utf8'));
  record.finished=new Date().toISOString();record.exitCode=r.status;if(r.error)record.error=r.error.message;write();
  if(name==='unit'){
    const tap=fs.readFileSync(log,'utf8');
    record.counts=Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(key=>[key,Number(tap.match(new RegExp('^# '+key+' (\\d+)','m'))?.[1]??NaN)]));
    if(r.status===0){
      if(record.counts.tests!==record.counts.pass||record.counts.tests===0)throw Error('Incomplete unit results');
      for(const e of require('../docs/migration-map.json').filter(e=>e.file.startsWith('tests/unit/')&&e.destination.includes(e.id)))if(!tap.includes(e.id+' '))throw Error('Unit case not executed: '+e.id);
    }
  }
  if(['browser','live'].includes(name)){
    const reportFile=path.join(runDir,'playwright.json');
    if(fs.existsSync(reportFile)){
      const report=JSON.parse(fs.readFileSync(reportFile,'utf8'));record.counts=report.stats;
      record.browser={...require(path.join(path.dirname(require.resolve('playwright-core/package.json')),'browsers.json')).browsers.find(b=>b.name==='chromium'),
        actualVersion:fs.existsSync(path.join(runDir,'browser-version.txt'))?fs.readFileSync(path.join(runDir,'browser-version.txt'),'utf8').trim():null};
      if(r.status===0){
        if(report.stats.unexpected||report.stats.skipped||report.stats.flaky||!report.stats.expected)throw Error('Incomplete browser results');
        if(name==='browser')for(const e of require('../docs/migration-map.json').filter(e=>e.file.startsWith('tests/browser/')))if(!JSON.stringify(report.suites).includes(e.id+' '))throw Error('Browser case not executed: '+e.id);
      }
    }else if(r.status===0)throw Error('Missing browser report');
  }
  record.status=r.status===0?'passed':'failed';write();if(r.status!==0)throw Error(name+' failed: '+(r.error?.message||r.status));
}
try{
  stage('verify',['tools/verify.cjs']);
  if(['fixed','unit'].includes(mode)){
    const files=fs.readdirSync(path.join(maintenance,'tests/unit')).filter(n=>n.endsWith('.test.cjs')).sort().map(n=>'tests/unit/'+n);
    stage('unit',['--test','--test-concurrency=1','--test-reporter=tap','--test-reporter=junit','--test-reporter-destination=stdout','--test-reporter-destination='+path.join(runDir,'unit.xml'),...files]);
  }
  if(['fixed','browser','live'].includes(mode)){
    stage(mode==='live'?'live':'browser',[require.resolve('@playwright/test/cli'),'test','--config=playwright.config.cjs']);
  }
  if(mode==='pages')stage('pages',['tools/pages.cjs']);
  metadata.status='passed';
}catch(error){metadata.status='failed';metadata.error=error.message;for(const s of metadata.stages)if(s.status==='running')s.status='failed';console.error(error);process.exitCode=1;}
finally{metadata.finished=new Date().toISOString();write();console.log('Run '+metadata.status+': '+metadataFile);}
