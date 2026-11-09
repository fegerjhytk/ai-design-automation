import { z } from 'zod';
import fs from 'node:fs';
import { BrowserManager } from '../browser.js';
import { FlowPage } from '../page-objects/flow-page.js';
import { logger } from '../logger.js';
export function registerVideoTools(server) {
    // 1. flow_generate_video
    server.tool('flow_generate_video', 'Generate cinematic video clips using Google Flow (Omni 1.1 Flash, 360p, 10s duration, Ingredients mode, default count: x1)', {
        prompt: z.string().describe('Text prompt describing video subjects, scene, actions, and lighting'),
        aspectRatio: z
            .enum(['16:9', '9:16'])
            .describe('Target video aspect ratio. MANDATORY: The agent must ask the user every time to choose from: 16:9 or 9:16'),
        mode: z
            .enum(['Frames', 'Ingredients'])
            .optional()
            .default('Ingredients')
            .describe('Generation mode tab: "Ingredients" or "Frames" (default: "Ingredients")'),
        model: z
            .string()
            .optional()
            .default('Omni 1.1 Flash')
            .describe('Video generation model (default: "Omni 1.1 Flash")'),
        resolution: z
            .enum(['360p', '720p'])
            .optional()
            .default('360p')
            .describe('Video resolution (default: "360p")'),
        duration: z
            .enum(['4s', '6s', '8s', '10s'])
            .optional()
            .default('10s')
            .describe('Video duration in seconds (default: "10s")'),
        count: z
            .enum(['x1', 'x2', 'x3', 'x4'])
            .optional()
            .default('x1')
            .describe('Number of video variants to generate (default: "x1")'),
        cameraMotion: z
            .enum(['static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'zoom_in', 'zoom_out'])
            .optional()
            .describe('Camera motion behavior (e.g. pan_left, zoom_in, static)'),
        waitForCompletion: z
            .boolean()
            .optional()
            .describe('Whether to poll until video generation completes (default: true)'),
    }, async ({ prompt, aspectRatio, mode, model, resolution, duration, count, cameraMotion, waitForCompletion, }) => {
        logger.info('Executing tool: flow_generate_video for prompt: "%s" [ratio: %s, mode: %s, model: %s, res: %s, duration: %s, count: %s]', prompt, aspectRatio, mode, model, resolution, duration, count);
        const browserManager = BrowserManager.getInstance();
        const page = await browserManager.ensurePage(true);
        if (!page) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            message: 'Browser not connected. Run flow_login first to connect to Google Flow.',
                        }, null, 2),
                    },
                ],
            };
        }
        const flowPage = new FlowPage(page);
        try {
            const asset = await flowPage.generateVideo({
                prompt,
                aspectRatio,
                mode,
                model,
                resolution,
                duration,
                count,
                cameraMotion,
                waitForCompletion: waitForCompletion ?? true,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            asset,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger.error('Failed to generate video on Google Flow:', errMsg);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: errMsg,
                            prompt,
                        }, null, 2),
                    },
                ],
            };
        }
    });
    // 2. flow_animate_image
    server.tool('flow_animate_image', 'Animate a static image into a video using Google Flow (Omni 1.1 Flash, 360p, 10s, Ingredients, default count: x1)', {
        imagePathOrUrl: z.string().describe('Local file path or URL of the image to animate'),
        prompt: z.string().describe('Animation directions describing movement, dynamics, and scene evolution'),
        aspectRatio: z
            .enum(['16:9', '9:16'])
            .describe('Target video aspect ratio. MANDATORY: The agent must ask the user every time to choose from: 16:9 or 9:16'),
        mode: z
            .enum(['Frames', 'Ingredients'])
            .optional()
            .default('Ingredients')
            .describe('Generation mode tab: "Ingredients" or "Frames" (default: "Ingredients")'),
        model: z
            .string()
            .optional()
            .default('Omni 1.1 Flash')
            .describe('Video generation model (default: "Omni 1.1 Flash")'),
        resolution: z
            .enum(['360p', '720p'])
            .optional()
            .default('360p')
            .describe('Video resolution (default: "360p")'),
        duration: z
            .enum(['4s', '6s', '8s', '10s'])
            .optional()
            .default('10s')
            .describe('Video duration (default: "10s")'),
        count: z
            .enum(['x1', 'x2', 'x3', 'x4'])
            .optional()
            .default('x1')
            .describe('Number of video variants to generate (default: "x1")'),
        cameraMotion: z
            .enum(['static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'zoom_in', 'zoom_out'])
            .optional()
            .describe('Camera motion behavior for the animated video'),
        waitForCompletion: z
            .boolean()
            .optional()
            .describe('Whether to poll until animation completes (default: true)'),
    }, async ({ imagePathOrUrl, prompt, aspectRatio, mode, model, resolution, duration, count, cameraMotion, waitForCompletion, }) => {
        logger.info('Executing tool: flow_animate_image for image: %s [ratio: %s, mode: %s, model: %s, res: %s, duration: %s, count: %s]', imagePathOrUrl, aspectRatio, mode, model, resolution, duration, count);
        // Verify file existence if given a local path
        if (!imagePathOrUrl.startsWith('http://') && !imagePathOrUrl.startsWith('https://')) {
            if (!fs.existsSync(imagePathOrUrl)) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: `Local image file not found at: ${imagePathOrUrl}`,
                            }, null, 2),
                        },
                    ],
                };
            }
        }
        const browserManager = BrowserManager.getInstance();
        const page = await browserManager.ensurePage(true);
        if (!page) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            message: 'Browser not connected. Run flow_login first to connect to Google Flow.',
                        }, null, 2),
                    },
                ],
            };
        }
        const flowPage = new FlowPage(page);
        try {
            const asset = await flowPage.animateImage({
                imagePathOrUrl,
                prompt,
                aspectRatio,
                mode,
                model,
                resolution,
                duration,
                count,
                cameraMotion,
                waitForCompletion: waitForCompletion ?? true,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            asset,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger.error('Failed to animate image on Google Flow:', errMsg);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: errMsg,
                            imagePathOrUrl,
                        }, null, 2),
                    },
                ],
            };
        }
    });
}
//# sourceMappingURL=video.js.map