import { z } from 'zod';
import { BrowserManager } from '../browser.js';
import { FlowPage } from '../page-objects/flow-page.js';
import { MediaDownloader } from '../downloader.js';
import { logger } from '../logger.js';
export function registerMediaTools(server) {
    // 1. flow_get_job_status
    server.tool('flow_get_job_status', 'Check generation progress percentage and completion status in Google Flow', {}, async () => {
        logger.info('Executing tool: flow_get_job_status');
        const browserManager = BrowserManager.getInstance();
        const page = await browserManager.ensurePage(true);
        if (!page) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'failed',
                            message: 'Browser not connected. Use flow_login first.',
                        }, null, 2),
                    },
                ],
            };
        }
        const flowPage = new FlowPage(page);
        const status = await flowPage.getJobStatus();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(status, null, 2),
                },
            ],
        };
    });
    // 2. flow_download_media
    server.tool('flow_download_media', 'Download generated images or videos from Google Flow directly to local disk (e.g. ~/Downloads)', {
        mediaUrl: z
            .string()
            .describe('HTTP URL, blob URL, or data URL of the image or video to download'),
        outputDir: z
            .string()
            .optional()
            .describe('Directory to save the media file (defaults to system Downloads directory)'),
        fileName: z
            .string()
            .optional()
            .describe('Custom filename for the downloaded file (e.g. "my_scene_01.mp4")'),
        assetType: z
            .enum(['image', 'video'])
            .optional()
            .describe('Asset type hint ("image" or "video")'),
    }, async ({ mediaUrl, outputDir, fileName, assetType }) => {
        logger.info('Executing tool: flow_download_media for URL: %s', mediaUrl.slice(0, 100));
        const browserManager = BrowserManager.getInstance();
        const page = browserManager.getPage();
        const downloader = new MediaDownloader(page);
        try {
            const result = await downloader.downloadMedia(mediaUrl, {
                outputDir,
                fileName,
                assetType,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            file: result,
                            markdownLink: `[${result.fileName}](file://${result.localPath})`,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger.error('Failed to download media:', errMsg);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: errMsg,
                            mediaUrl: mediaUrl.slice(0, 150),
                        }, null, 2),
                    },
                ],
            };
        }
    });
}
//# sourceMappingURL=media.js.map