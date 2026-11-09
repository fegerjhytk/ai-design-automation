import { z } from 'zod';
import { BrowserManager } from '../browser.js';
import { FlowPage } from '../page-objects/flow-page.js';
import { logger } from '../logger.js';
export function registerImageTools(server) {
    server.tool('flow_generate_image', 'Generate high-fidelity images using Google Flow (Nano Banana 2.1, default count: x4)', {
        prompt: z.string().describe('Text prompt describing the desired image scene, subjects, and details'),
        aspectRatio: z
            .enum(['16:9', '4:3', '1:1', '3:4', '9:16'])
            .describe('Target aspect ratio. MANDATORY: The agent must ask the user every time to choose from: 16:9, 4:3, 1:1, 3:4, or 9:16'),
        model: z
            .string()
            .optional()
            .default('Nano Banana 2.1')
            .describe('Image model (default: "Nano Banana 2.1")'),
        count: z
            .enum(['x1', 'x2', 'x3', 'x4'])
            .optional()
            .default('x4')
            .describe('Number of image variants to generate (default: "x4")'),
        style: z
            .string()
            .optional()
            .describe('Optional visual style keywords (e.g. "cinematic lighting, photorealistic, 35mm film")'),
        waitForCompletion: z
            .boolean()
            .optional()
            .describe('Whether to wait for the image generation to complete before returning (default: true)'),
    }, async ({ prompt, aspectRatio, model, count, style, waitForCompletion }) => {
        logger.info('Executing tool: flow_generate_image for prompt: "%s" [ratio: %s, model: %s, count: %s]', prompt, aspectRatio, model, count);
        const browserManager = BrowserManager.getInstance();
        const page = await browserManager.ensurePage(true);
        if (!page) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            message: 'Browser not connected. Please run flow_login first to establish a session with Google Flow.',
                        }, null, 2),
                    },
                ],
            };
        }
        const flowPage = new FlowPage(page);
        try {
            const asset = await flowPage.generateImage({
                prompt,
                aspectRatio,
                model,
                count,
                style,
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
            logger.error('Failed to generate image on Google Flow:', errMsg);
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
}
//# sourceMappingURL=image.js.map