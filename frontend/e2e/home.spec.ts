import { test, expect } from '@playwright/test';
const sites=[{id:'site-1',name:'Local 1',status:'recommended',is_resting:false}];
test.beforeEach(async({page})=>{await page.route('http://localhost:8000/api/v1/body-map/next-site?user_id=demo-user',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(sites)}));});
test('landing page renders the web architecture',async({page})=>{await page.goto('/');await expect(page.locator('a[href="/"]').first()).toBeVisible();await expect(page.getByRole('heading',{name:/camada inteligente/i})).toBeVisible();await expect(page.locator('a[href="/verify"]').first()).toBeVisible();});
test('verification page keeps the safe verification flow',async({page})=>{await page.goto('/verify');await expect(page.getByRole('heading',{name:/Verifica/})).toBeVisible();});
test('backend health endpoint is reachable',async({request})=>{const response=await request.get('http://127.0.0.1:8000/health');expect(response.ok()).toBeTruthy();expect(await response.json()).toMatchObject({status:'ok',service:'syringe-ai'});});
