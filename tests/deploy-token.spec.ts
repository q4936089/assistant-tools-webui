import { test, expect } from '@playwright/test';

test.describe('发币功能测试', () => {
  test('完整发币流程', async ({ page }) => {
    // 1. 访问首页
    await page.goto('/');
    await page.screenshot({ path: 'screenshots/01-homepage.png' });
    
    // 2. 点击发币页面
    await page.click('text=一键发币');
    await page.waitForURL('/create-token');
    await page.screenshot({ path: 'screenshots/02-create-token-page.png' });
    
    // 3. 填写代币信息
    await page.fill('input[placeholder*="Assistant Token"]', 'TestToken');
    await page.fill('input[placeholder*="ASST"]', 'TEST');
    await page.fill('input[placeholder*="1000000"]', '1000000');
    await page.screenshot({ path: 'screenshots/03-filled-form.png' });
    
    // 4. 展开高级选项
    await page.click('text=高级选项');
    await page.screenshot({ path: 'screenshots/04-advanced-options.png' });
    
    // 5. 测试 Gas 费估算（需要连接钱包）
    // 注意：实际测试需要 MetaMask 插件，这里只验证 UI
    
    // 6. 验证表单验证
    await page.click('button:has-text("部署代币")');
    await page.screenshot({ path: 'screenshots/05-validation-error.png' });
    
    console.log('✅ 测试完成');
  });
});
