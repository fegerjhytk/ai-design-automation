import assert from 'node:assert';
import { FlowPage } from '../dist/page-objects/flow-page.js';

console.log('[TEST] Running Video unit tests...');

async function runVideoTests() {
  let currentUrl = 'https://flow.google/studio';
  const mockPage = {
    url: () => currentUrl,
    goto: async (url) => {
      currentUrl = url;
    },
    waitForTimeout: async () => {},
    waitForLoadState: async () => {},
    $$: async () => [],
    $: async () => null,
  };

  const flowPage = new FlowPage(mockPage);

  // 1. Test generateVideo missing input error handling
  try {
    await flowPage.generateVideo({
      prompt: 'Cinematic drone flythrough of a neon waterfall',
      aspectRatio: '16:9',
      cameraMotion: 'pan_left',
    });
    assert.fail('Should have thrown when prompt input missing');
  } catch (err) {
    assert(err.message.includes('prompt input'), 'Error should mention prompt input');
    console.log('[TEST] ✅ FlowPage generateVideo error handling test passed');
  }

  // 2. Test animateImage missing input error handling
  try {
    await flowPage.animateImage({
      imagePathOrUrl: 'non_existent_file.png',
      prompt: 'Waves crashing softly on the beach',
      cameraMotion: 'zoom_in',
    });
    assert.fail('Should have thrown when prompt input missing');
  } catch (err) {
    assert(err.message.includes('prompt input'), 'Error should mention prompt input');
    console.log('[TEST] ✅ FlowPage animateImage error handling test passed');
  }

  console.log('[TEST] 🎉 All Video unit tests passed!');
}

runVideoTests().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
