const fs = require('node:fs');
const path = require('node:path');
const maintenance = path.resolve(__dirname, '..');
const site = path.resolve(maintenance, '..');
// The checkout containing this file is always the target. No historical fallback.
for (const file of ['index.html', 'script.js', 'styles.css']) {
  if (!fs.statSync(path.join(site, file)).isFile()) throw Error(`Missing target: ${file}`);
}
const snapshot = name => path.join(maintenance, 'fixtures', 'snapshots', name);
const artifact = () => {
  const dir = process.env.FLARE_RUN_DIR;
  if (!dir) throw Error('Run via npm scripts: FLARE_RUN_DIR is required');
  fs.mkdirSync(dir, {recursive: true});
  return dir;
};
const localAsset = name => {
  const assets = {
    'bootstrap.min.css': require.resolve('bootstrap/dist/css/bootstrap.min.css'),
    'bootstrap.bundle.min.js': require.resolve('bootstrap/dist/js/bootstrap.bundle.min.js'),
    'papaparse.min.js': require.resolve('papaparse/papaparse.min.js'),
    'sample-thumbnail.jpg': path.join(maintenance, 'fixtures/synthetic/thumbnail.jpg'),
    'songs.csv': snapshot('songs.csv')
  };
  if (!assets[name]) throw Error(`Unregistered local asset: ${name}`);
  return assets[name];
};
module.exports = {site, maintenance, snapshot, artifact, localAsset};
