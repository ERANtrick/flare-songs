const {defineConfig} = require('@playwright/test');
const path = require('node:path');
const {artifact} = require('./helpers/paths.cjs');
const live = process.env.FLARE_TEST_MODE === 'live';
module.exports = defineConfig({
  testDir: live ? './tests/live' : './tests/browser',
  testMatch:'**/*.test.cjs',
  fullyParallel:false, workers:1, retries:0,
  timeout:180000, globalTimeout:15 * 60 * 1000,
  forbidOnly:true,
  outputDir:path.join(artifact(), live ? 'live-output' : 'browser-output'),
  reporter:[['list'], ['json', {outputFile:path.join(artifact(), 'playwright.json')}],
    ['junit', {outputFile:path.join(artifact(), 'playwright.xml')}]],
  use:{browserName:'chromium', headless:true, trace:'retain-on-failure', screenshot:'only-on-failure', serviceWorkers:'block'}
});
