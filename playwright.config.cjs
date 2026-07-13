const {defineConfig,devices}=require('@playwright/test');

module.exports=defineConfig({
  testDir:'./tests/e2e',
  fullyParallel:true,
  forbidOnly:Boolean(process.env.CI),
  retries:process.env.CI?1:0,
  workers:process.env.CI?2:undefined,
  reporter:process.env.CI?'line':'html',
  use:{
    baseURL:'http://127.0.0.1:4173',
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  webServer:{
    command:'npm run serve:dist',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI,
    timeout:30000
  },
  projects:[
    {
      name:'desktop-chromium',
      use:{browserName:'chromium',viewport:{width:1440,height:1000}}
    },
    {
      name:'mobile-chromium',
      use:{...devices['iPhone 13'],browserName:'chromium'}
    }
  ]
});
