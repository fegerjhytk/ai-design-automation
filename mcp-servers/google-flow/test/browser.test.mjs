import assert from 'node:assert';
import { BrowserManager } from '../dist/browser.js';

console.log('[TEST] Running BrowserManager unit tests...');

async function runBrowserTests() {
  const manager = BrowserManager.getInstance();
  assert(manager, 'BrowserManager instance should exist');

  const manager2 = BrowserManager.getInstance();
  assert.strictEqual(manager, manager2, 'BrowserManager must be a singleton');

  // Test status when not connected
  const initialStatus = await manager.getStatus();
  assert.strictEqual(initialStatus.connected, false, 'Initial status should be disconnected');
  assert.strictEqual(initialStatus.authenticated, false, 'Initial status should not be authenticated');
  assert.strictEqual(initialStatus.browserType, 'none', 'Initial browserType should be none');
  console.log('[TEST] ✅ Initial status test passed');

  // Test connectCDP with unreachable port (should return false cleanly without uncaught exception)
  const cdpResult = await manager.connectCDP('http://127.0.0.1:59999');
  assert.strictEqual(cdpResult, false, 'Unreachable CDP endpoint should gracefully return false');
  console.log('[TEST] ✅ Unreachable CDP graceful fallback test passed');

  // Test checkAuthStatus when disconnected
  const authStatus = await manager.checkAuthStatus();
  assert.strictEqual(authStatus.authenticated, false, 'Auth status should be false when disconnected');
  console.log('[TEST] ✅ Disconnected authStatus check passed');

  console.log('[TEST] 🎉 All BrowserManager unit tests passed!');
}

runBrowserTests().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
