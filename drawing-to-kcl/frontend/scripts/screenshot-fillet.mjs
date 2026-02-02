import { chromium } from 'playwright';

const baseUrl = 'http://localhost:3001';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  // Test: Box with fillet on edge 0
  console.log('Taking screenshot: Box with fillet...');
  const code = encodeURIComponent(`let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
let filleted = fillet(box1.edge[0], radius: 0.3, segments: 8)`);
  
  await page.goto(`${baseUrl}?code=${code}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="kcl-preview-3d"]', { timeout: 15000 });
  await page.waitForTimeout(3000); // Wait for Three.js to render
  
  await page.screenshot({ path: '/tmp/forge-fillet-v2.png', fullPage: false });
  console.log('Screenshot saved: /tmp/forge-fillet-v2.png');

  await browser.close();
  console.log('Done!');
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
