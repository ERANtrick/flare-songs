const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {site,artifact}=require('../helpers/paths.cjs');
const policy=spawnSync('ruby',[path.join(__dirname,'pages-policy-test.rb')],{encoding:'utf8',windowsHide:true,timeout:10000});
if(policy.status!==0)throw Error('Ruby network policy failed: '+(policy.error?.message||policy.stderr));
process.stdout.write(policy.stdout);
const out=path.join(artifact(),'pages');fs.mkdirSync(out,{recursive:true});
const baseline=path.join(out,'public-only-source');fs.mkdirSync(baseline);
for(const file of require('../fixtures/public-files.json')){
  const to=path.join(baseline,file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(site,file),to);
}
function build(source,label){
  const destination=path.join(out,label),metadata=path.join(out,label+'-build.json');
  const r=spawnSync('ruby',['-S','bundle','exec','ruby',path.join(__dirname,'pages-build.rb'),source,destination,metadata],{encoding:'utf8',env:{...process.env,JEKYLL_ENV:'production'},windowsHide:true,timeout:180000});
  fs.writeFileSync(path.join(out,label+'.log'),(r.stdout||'')+(r.stderr||''));
  if(r.status!==0)throw Error(`Pages build ${label} failed: ${r.error?.message || r.stderr || r.stdout}. See ${out}`);
  return destination;
}
function hashes(dir,root=dir,map={}){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())hashes(file,root,map);else map[path.relative(root,file).split(path.sep).join('/')]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}return map;
}
const a=build(baseline,'reference'),b=build(site,'candidate'),expected=hashes(a),actual=hashes(b);
assert.deepEqual(actual,expected,'Pages output must match a real build containing only the public inputs');
for(const name of Object.keys(actual))assert.ok(!/(^|\/)(?:_maintenance|node_modules|\.github|artifacts|tests|fixtures)(\/|$)|\.(?:csv|cjs|log|zip)$|package(?:-lock)?\.json$|Gemfile/.test(name),'Private output: '+name);
for(const name of ['index.html','script.js','styles.css','favicon.ico','assets/icons/music-note-list.svg','assets/icons/play-fill.svg','assets/icons/shuffle.svg','licenses/bootstrap-icons-LICENSE.txt'])assert.equal(actual[name],crypto.createHash('sha256').update(fs.readFileSync(path.join(site,name))).digest('hex'),name);
fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify({passed:true,files:actual,publicInputs:require('../fixtures/public-files.json')},null,2)+'\n');
console.log('Real GitHub Pages/Jekyll builds match: '+Object.keys(actual).length+' output files; maintenance leakage: 0. '+out);
