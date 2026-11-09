import { z } from 'zod';
import { loadConfig } from '../config.js';
import { logger } from '../logger.js';
import { BrowserManager } from '../browser.js';
export function registerStatusTool(server) {
    server.tool('flow_status', 'Check Google Flow browser connection status, session state, and server health', {
        verbose: z
            .boolean()
            .optional()
            .describe('Whether to return verbose diagnostic details including configuration and environment'),
        checkBrowser: z
            .boolean()
            .optional()
            .describe('Whether to actively probe or attempt CDP connection if not already connected (default: false)'),
    }, async ({ verbose, checkBrowser }) => {
        logger.info('Executing tool: flow_status (verbose=%s, checkBrowser=%s)', verbose, checkBrowser);
        const config = loadConfig();
        const browserManager = BrowserManager.getInstance();
        if (checkBrowser) {
            await browserManager.ensurePage(false);
        }
        const sessionStatus = await browserManager.getStatus();
        const statusData = {
            server: {
                name: 'google-flow-mcp',
                version: '1.0.0',
                uptimeSeconds: Math.floor(process.uptime()),
                nodeVersion: process.version,
                platform: process.platform,
            },
            session: {
                ...sessionStatus,
                flowUrl: config.flowUrl,
            },
            config: verbose
                ? {
                    cdpUrl: config.cdpUrl,
                    userDataDir: config.userDataDir,
                    downloadDir: config.downloadDir,
                    headless: config.headless,
                    timeoutMs: config.timeoutMs,
                }
                : undefined,
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(statusData, null, 2),
                },
            ],
        };
    });
}
//# sourceMappingURL=status.js.map