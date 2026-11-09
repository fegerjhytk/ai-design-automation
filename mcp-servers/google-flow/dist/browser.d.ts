import { type Page } from 'playwright-core';
import type { FlowSessionStatus } from './types.js';
export declare class BrowserManager {
    private static instance;
    private context;
    private activePage;
    private browserType;
    private constructor();
    static getInstance(): BrowserManager;
    /**
     * Attempts connection to an existing Chrome instance via CDP.
     */
    connectCDP(cdpUrl?: string): Promise<boolean>;
    /**
     * Launches a dedicated persistent Chrome browser context.
     */
    launchPersistentContext(userDataDir?: string, headless?: boolean): Promise<boolean>;
    /**
     * Ensures an active browser page is ready, attempting CDP first then fallback launch if requested.
     */
    ensurePage(autoLaunch?: boolean): Promise<Page | null>;
    /**
     * Locates an existing page opened to Google Flow or opens a new tab.
     */
    private acquireFlowPage;
    /**
     * Evaluates authentication status on the current page.
     */
    checkAuthStatus(): Promise<{
        authenticated: boolean;
        details: string;
    }>;
    /**
     * Assisted login flow: navigates to Google Flow and waits for human authentication.
     */
    login(timeoutMs?: number): Promise<{
        authenticated: boolean;
        message: string;
    }>;
    /**
     * Returns live session status summary.
     */
    getStatus(): Promise<FlowSessionStatus>;
    /**
     * Returns current active page or null.
     */
    getPage(): Page | null;
    /**
     * Closes browser resources.
     */
    close(): Promise<void>;
}
//# sourceMappingURL=browser.d.ts.map