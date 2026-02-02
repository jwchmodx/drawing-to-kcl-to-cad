/**
 * Screenshot script for fillet testing
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshot() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  // Test 1: Box without fillet
  console.log('Taking screenshot 1: Box without fillet...');
  const code1 = encodeURIComponent('let box1 = box(size: [2, 2, 2], center: [0, 0, 0])');
  await page.goto(`http://localhost:3001?code=${code1}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="kcl-preview-3d"]', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000)); // Wait for Three.js render
  await page.screenshot({ path: '/tmp/forge-fillet-before.png' });
  console.log('Screenshot 1 saved: /tmp/forge-fillet-before.png');
  
  // Test 2: Box with single edge fillet
  console.log('Taking screenshot 2: Box with single edge fillet (edge 0)...');
  const code2 = encodeURIComponent(`let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
let filleted = fillet(box1.edge[0], radius: 0.3)`);
  await page.goto(`http://localhost:3001?code=${code2}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="kcl-preview-3d"]', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/tmp/forge-fillet-edge0.png' });
  console.log('Screenshot 2 saved: /tmp/forge-fillet-edge0.png');
  
  // Test 3: Box with larger radius fillet
  console.log('Taking screenshot 3: Box with larger radius fillet...');
  const code3 = encodeURIComponent(`let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
let filleted = fillet(box1.edge[2], radius: 0.5, segments: 16)`);
  await page.goto(`http://localhost:3001?code=${code3}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="kcl-preview-3d"]', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/tmp/forge-fillet-edge2.png' });
  console.log('Screenshot 3 saved: /tmp/forge-fillet-edge2.png');
  
  // Test 4: Different edge (vertical edge)
  console.log('Taking screenshot 4: Vertical edge fillet (edge 10)...');
  const code4 = encodeURIComponent(`let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
let filleted = fillet(box1.edge[10], radius: 0.4)`);
  await page.goto(`http://localhost:3001?code=${code4}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="kcl-preview-3d"]', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/tmp/forge-fillet-edge10.png' });
  console.log('Screenshot 4 saved: /tmp/forge-fillet-edge10.png');
  
  // Final combined screenshot for main output
  console.log('Taking final combined screenshot...');
  const codeFinal = encodeURIComponent(`let box1 = box(size: [2, 2, 2], center: [0, 0, 0])
let filleted = fillet(box1.edge[0], radius: 0.3, segments: 8)`);
  await page.goto(`http://localhost:3001?code=${codeFinal}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="kcl-preview-3d"]', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/tmp/forge-fillet-v2.png' });
  console.log('Final screenshot saved: /tmp/forge-fillet-v2.png');
  
  await browser.close();
  console.log('Done!');
}

takeScreenshot().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
