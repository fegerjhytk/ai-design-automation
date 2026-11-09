import assert from 'node:assert';
import { FlowPage } from '../dist/page-objects/flow-page.js';

console.log('[TEST] Running FlowPage unit tests...');

async function runFlowPageTests() {
  // Test mock page behavior
  let currentUrl = 'https://flow.google';
  const mockPage = {
    url: () => currentUrl,
    goto: async (url) => {
      currentUrl = url;
    },
    waitForTimeout: async () => {},
    waitForLoadState: async () => {},
    $$: async () => [],
    $: async () => null,
    evaluate: async () => '50 credits',
  };

  const flowPage = new FlowPage(mockPage);

  // 1. Test getCredits with mock
  const credits = await flowPage.getCredits();
  assert.strictEqual(credits.available, true, 'Credits should be available');
  assert.strictEqual(credits.credits, 50, 'Parsed credits should be 50');
  console.log('[TEST] ✅ FlowPage getCredits test passed');

  // 2. Test listProjects with mock returning empty
  const projects = await flowPage.listProjects();
  assert(Array.isArray(projects), 'listProjects should return an array');
  assert.strictEqual(projects.length, 0, 'Mock projects length should be 0');
  console.log('[TEST] ✅ FlowPage listProjects test passed');

  // 3. Test generateImage error handling when prompt input is missing
  try {
    await flowPage.generateImage({
      prompt: 'A futuristic city in neon rain',
      aspectRatio: '16:9',
    });
    assert.fail('Should have thrown when prompt input missing');
  } catch (err) {
    assert(err.message.includes('prompt input'), 'Error should mention prompt input');
    console.log('[TEST] ✅ FlowPage generateImage error handling test passed');
  }

  console.log('[TEST] 🎉 All FlowPage unit tests passed!');
}

runFlowPageTests().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
