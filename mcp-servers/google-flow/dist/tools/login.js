import { z } from 'zod';
import { BrowserManager } from '../browser.js';
import { logger } from '../logger.js';
export function registerLoginTool(server) {
    server.tool('flow_login', 'Open Google Flow in a visible browser window and assist in signing into Google account without exposing credentials', {
        timeoutSeconds: z
            .number()
            .optional()
            .describe('Maximum seconds to wait for user to complete sign-in (default: 120)'),
    }, async ({ timeoutSeconds }) => {
        logger.info('Executing tool: flow_login (timeoutSeconds=%s)', timeoutSeconds);
        const browserManager = BrowserManager.getInstance();
        const timeoutMs = (timeoutSeconds || 120) * 1000;
        const result = await browserManager.login(timeoutMs);
        const status = await browserManager.getStatus();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: result.authenticated,
                        message: result.message,
                        session: status,
                    }, null, 2),
                },
            ],
        };
    });
}
//# sourceMappingURL=login.js.map