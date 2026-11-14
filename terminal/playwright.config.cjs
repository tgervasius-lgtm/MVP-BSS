const {defineConfig} = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', testMatch: 'ui.spec.cjs', workers: 1, timeout: 30000,
  outputDir: '../test-results/terminal',
  use: {baseURL: 'http://127.0.0.1:8766', viewport: {width:800,height:480},
    ...(process.env.BSS_TERMINAL_CHROMIUM ? {launchOptions:{executablePath:process.env.BSS_TERMINAL_CHROMIUM,args:['--no-sandbox']}} : {})},
  webServer: {command: `${process.env.BSS_PYTHON || 'python3'} -m terminal.tests.ui_fixture`,
    cwd: require('node:path').resolve(__dirname, '..'), url:'http://127.0.0.1:8766/state', reuseExistingServer:false}
});
