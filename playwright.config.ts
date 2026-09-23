import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:'**/*.spec.ts',use:{browserName:'chromium'},outputDir:'/tmp/english-pod-browser-results',
 webServer:process.env.TEST_URL?undefined:{command:'npm start',url:'http://127.0.0.1:18341/api/health',reuseExistingServer:true,timeout:30000}
});
