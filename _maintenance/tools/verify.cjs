const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {maintenance}=require('../helpers/paths.cjs');
const manifest=require('../fixtures/snapshots/manifest.json');
for(const entry of manifest.files){const data=fs.readFileSync(path.join(maintenance,'fixtures/snapshots',entry.name));assert.equal(data.length,entry.bytes,entry.name+' bytes');assert.equal(crypto.createHash('sha256').update(data).digest('hex'),entry.sha256,entry.name+' hash');}
for(const [name,version]of Object.entries(require('../package.json').devDependencies))assert.equal(require(name+'/package.json').version,version);
const map=require('../docs/migration-map.json');assert.equal(map.length,174);assert.equal(new Set(map.map(e=>e.id)).size,174);
for(const entry of map){assert(entry.destination.length,entry.id);for(const id of entry.destination)assert(map.some(e=>e.id===id),id);}
console.log('Fixture bytes/SHA-256, installed dependency versions, and 174 migration entries verified.');
require('../helpers/vendor.cjs').verifyFiles();
console.log('Public vendor/license bytes and pinned npm distribution files verified.');
