import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MediaDownloader } from '../dist/downloader.js';

console.log('[TEST] Running MediaDownloader unit tests...');

async function runDownloaderTests() {
  // 1. Test binary format detection
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const pngFormat = MediaDownloader.detectFormat(pngHeader);
  assert.strictEqual(pngFormat.ext, 'png', 'Should detect PNG format');
  assert.strictEqual(pngFormat.mime, 'image/png', 'Should detect image/png');
  console.log('[TEST] ✅ PNG format detection passed');

  const jpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const jpgFormat = MediaDownloader.detectFormat(jpgHeader);
  assert.strictEqual(jpgFormat.ext, 'jpg', 'Should detect JPG format');
  assert.strictEqual(jpgFormat.mime, 'image/jpeg', 'Should detect image/jpeg');
  console.log('[TEST] ✅ JPEG format detection passed');

  const mp4Header = Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // '....ftyp'
    0x69, 0x73, 0x6f, 0x6d,
  ]);
  const mp4Format = MediaDownloader.detectFormat(mp4Header);
  assert.strictEqual(mp4Format.ext, 'mp4', 'Should detect MP4 format');
  assert.strictEqual(mp4Format.mime, 'video/mp4', 'Should detect video/mp4');
  console.log('[TEST] ✅ MP4 format detection passed');

  // 2. Test downloading a data URL to a test directory
  const testOutputDir = path.join(os.tmpdir(), `flow_mcp_test_${Date.now()}`);
  const downloader = new MediaDownloader(null);

  // 1x1 PNG data URL
  const sampleDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const downloadResult = await downloader.downloadMedia(sampleDataUrl, {
    outputDir: testOutputDir,
    fileName: 'test_pixel.png',
  });

  assert.strictEqual(downloadResult.success, true, 'Download should succeed');
  assert.strictEqual(downloadResult.fileName, 'test_pixel.png');
  assert(fs.existsSync(downloadResult.localPath), 'Downloaded file should exist on disk');
  assert(downloadResult.byteSize > 0, 'Downloaded file size must be > 0 bytes');
  assert.strictEqual(downloadResult.format, 'png', 'Detected format should be png');
  console.log('[TEST] ✅ Data URL download and disk write passed (%d bytes)', downloadResult.byteSize);

  // Clean up test file
  fs.rmSync(testOutputDir, { recursive: true, force: true });

  // 3. Test blob: URL error when page is not available
  try {
    await downloader.downloadMedia('blob:https://flow.google/abc-123');
    assert.fail('Should fail on blob: URL when no page is attached');
  } catch (err) {
    assert(err.message.includes('Browser page is required'), 'Error should mention browser page requirement');
    console.log('[TEST] ✅ Disconnected blob URL error handling passed');
  }

  console.log('[TEST] 🎉 All MediaDownloader unit tests passed!');
}

runDownloaderTests().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
