import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright-core';
import { loadConfig } from './config.js';
import { logger } from './logger.js';
import type { DownloadResult } from './types.js';

export interface DownloadOptions {
  outputDir?: string;
  fileName?: string;
  assetType?: 'image' | 'video';
}

export class MediaDownloader {
  constructor(private page?: Page | null) {}

  /**
   * Inspects binary buffer headers to determine the file extension and MIME type.
   */
  public static detectFormat(buffer: Buffer): { ext: string; mime: string } {
    if (buffer.length >= 8) {
      // PNG signature: \x89PNG\r\n\x1a\n
      if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      ) {
        return { ext: 'png', mime: 'image/png' };
      }

      // JPEG signature: \xff\xd8\xff
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { ext: 'jpg', mime: 'image/jpeg' };
      }

      // WebP signature: RIFF....WEBP
      if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      ) {
        return { ext: 'webp', mime: 'image/webp' };
      }

      // MP4 signature: bytes 4-7 are 'ftyp'
      const ftypBox = buffer.subarray(4, 8).toString('ascii');
      if (ftypBox === 'ftyp' || ftypBox === 'moov') {
        return { ext: 'mp4', mime: 'video/mp4' };
      }
    }

    // Default fallback
    return { ext: 'bin', mime: 'application/octet-stream' };
  }

  /**
   * Downloads a media asset from a URL (HTTP, blob, or data URL) to local storage.
   */
  public async downloadMedia(
    mediaUrl: string,
    options: DownloadOptions = {}
  ): Promise<DownloadResult> {
    const config = loadConfig();
    const destDir = options.outputDir || config.downloadDir;

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    logger.info('Starting download for media: %s...', mediaUrl.slice(0, 100));

    let buffer: Buffer;

    // 1. Handle in-browser blob: URLs
    if (mediaUrl.startsWith('blob:')) {
      if (!this.page || this.page.isClosed()) {
        throw new Error('Browser page is required to extract blob: URLs, but page is closed or not available.');
      }

      logger.info('Resolving in-browser blob URL via Page evaluate...');
      const base64Data = await this.page.evaluate(async (url) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64Portion = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64Portion);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }, mediaUrl);

      buffer = Buffer.from(base64Data, 'base64');
    }
    // 2. Handle data URLs
    else if (mediaUrl.startsWith('data:')) {
      const base64Portion = mediaUrl.includes(',') ? mediaUrl.split(',')[1] : mediaUrl;
      buffer = Buffer.from(base64Portion, 'base64');
    }
    // 3. Handle standard HTTP/HTTPS URLs
    else {
      const response = await fetch(mediaUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download media: HTTP ${response.status} ${response.statusText}`);
      }

      const arrayBuf = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    }

    if (buffer.length === 0) {
      throw new Error('Downloaded media payload was 0 bytes.');
    }

    // Detect format from buffer magic numbers
    let { ext, mime } = MediaDownloader.detectFormat(buffer);

    // If detected as bin, fallback to requested assetType extension
    if (ext === 'bin' && options.assetType) {
      ext = options.assetType === 'video' ? 'mp4' : 'png';
      mime = options.assetType === 'video' ? 'video/mp4' : 'image/png';
    }

    const typePrefix = options.assetType || (mime.startsWith('video') ? 'video' : 'image');
    const finalFileName =
      options.fileName ||
      `flow_${typePrefix}_${Date.now()}.${ext}`;

    const filePath = path.join(destDir, finalFileName);
    fs.writeFileSync(filePath, buffer);

    const stats = fs.statSync(filePath);
    logger.info('Media downloaded successfully to %s (%d bytes, %s)', filePath, stats.size, mime);

    return {
      success: true,
      localPath: filePath,
      fileName: finalFileName,
      byteSize: stats.size,
      format: ext,
      mimeType: mime,
    };
  }
}
