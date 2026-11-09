import type { Page } from 'playwright-core';
import type { DownloadResult } from './types.js';
export interface DownloadOptions {
    outputDir?: string;
    fileName?: string;
    assetType?: 'image' | 'video';
}
export declare class MediaDownloader {
    private page?;
    constructor(page?: (Page | null) | undefined);
    /**
     * Inspects binary buffer headers to determine the file extension and MIME type.
     */
    static detectFormat(buffer: Buffer): {
        ext: string;
        mime: string;
    };
    /**
     * Downloads a media asset from a URL (HTTP, blob, or data URL) to local storage.
     */
    downloadMedia(mediaUrl: string, options?: DownloadOptions): Promise<DownloadResult>;
}
//# sourceMappingURL=downloader.d.ts.map