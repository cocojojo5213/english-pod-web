import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir:'./tests',testMatch:'**/*.spec.ts',use:{browserName:'chromium'},outputDir:'/tmp/english-pod-browser-results' });
