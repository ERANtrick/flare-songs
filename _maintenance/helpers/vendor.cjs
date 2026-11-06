const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {site}=require('./paths.cjs');
const manifest=require('../fixtures/vendor-manifest.json');
const assets=new Map(manifest.files.filter(f=>f.path.startsWith('assets/vendor/')).map(f=>[f.path,f]));
const runtimeAssets=[...assets.values()].filter(f=>f.role==='runtime');
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function assetForURL(value,origin){
  const url=new URL(value);if(url.origin!==origin)return null;
  const relative=url.pathname.replace(/^\/flare-songs\//,'/').replace(/^\//,'');
  return !url.search ? assets.get(relative) || null : null;
}
function verifyAsset(entry,status,bytes){
  if(status!==200)throw Error(`Vendor HTTP ${status}: ${entry.path}`);
  if(bytes.length!==entry.bytes||sha256(bytes)!==entry.sha256)throw Error(`Vendor bytes/hash mismatch: ${entry.path}`);
}
function verifyFiles(){
  for(const entry of manifest.files){
    const bytes=fs.readFileSync(path.join(site,entry.path));verifyAsset(entry,200,bytes);
    if(['bootstrap','papaparse','@popperjs/core'].includes(entry.package)){
      const root=path.dirname(require.resolve(entry.package+'/package.json'));
      if(!bytes.equals(fs.readFileSync(path.join(root,entry.source))))throw Error('Vendor differs from pinned npm file: '+entry.path);
      if(require(path.join(root,'package.json')).version!==entry.version)throw Error('Vendor package version mismatch: '+entry.package);
    }
  }
}
module.exports={manifest,assets,runtimeAssets,assetForURL,verifyAsset,verifyFiles,sha256};
