import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { loadConfig } from './config.js';
import { logger } from './logger.js';
export class BrowserManager {
    static instance = null;
    context = null;
    activePage = null;
    browserType = 'none';
    constructor() { }
    static getInstance() {
        if (!BrowserManager.instance) {
            BrowserManager.instance = new BrowserManager();
        }
        return BrowserManager.instance;
    }
    /**
     * Attempts connection to an existing Chrome instance via CDP.
     */
    async connectCDP(cdpUrl) {
        const config = loadConfig();
        const endpoint = cdpUrl || config.cdpUrl;
        logger.info('Attempting to connect to Chrome over CDP at %s...', endpoint);
        try {
            const browser = await chromium.connectOverCDP(endpoint, {
                timeout: 5000,
            });
            const contexts = browser.contexts();
            if (contexts.length === 0) {
                logger.warn('CDP connected, but no browser contexts found.');
                return false;
            }
            this.context = contexts[0];
            this.browserType = 'cdp';
            // Attach or create a tab for Google Flow
            await this.acquireFlowPage();
            logger.info('Successfully attached to Chrome via CDP!');
            return true;
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger.info('Could not connect over CDP: %s', errMsg);
            return false;
        }
    }
    /**
     * Launches a dedicated persistent Chrome browser context.
     */
    async launchPersistentContext(userDataDir, headless) {
        const config = loadConfig();
        const profileDir = userDataDir || config.userDataDir;
        const isHeadless = headless !== undefined ? headless : config.headless;
        logger.info('Launching persistent Chrome context at %s (headless: %s)...', profileDir, isHeadless);
        if (!fs.existsSync(profileDir)) {
            fs.mkdirSync(profileDir, { recursive: true });
        }
        try {
            this.context = await chromium.launchPersistentContext(profileDir, {
                channel: 'chrome',
                headless: isHeadless,
                args: [
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-blink-features=AutomationControlled',
                ],
                viewport: { width: 1280, height: 800 },
            });
            this.browserType = 'persistent_context';
            await this.acquireFlowPage();
            logger.info('Persistent Chrome context launched successfully.');
            return true;
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger.error('Failed to launch persistent Chrome context:', errMsg);
            return false;
        }
    }
    /**
     * Ensures an active browser page is ready, attempting CDP first then fallback launch if requested.
     */
    async ensurePage(autoLaunch = false) {
        if (this.activePage && !this.activePage.isClosed()) {
            return this.activePage;
        }
        // Try CDP first
        const cdpOk = await this.connectCDP();
        if (cdpOk && this.activePage && !this.activePage.isClosed()) {
            return this.activePage;
        }
        // Fallback to persistent context if allowed
        if (autoLaunch) {
            const launchOk = await this.launchPersistentContext();
            if (launchOk && this.activePage && !this.activePage.isClosed()) {
                return this.activePage;
            }
        }
        return null;
    }
    /**
     * Locates an existing page opened to Google Flow or opens a new tab.
     */
    async acquireFlowPage() {
        if (!this.context) {
            throw new Error('No active BrowserContext');
        }
        const pages = this.context.pages();
        for (const p of pages) {
            const url = p.url();
            if (url.includes('flow.google')) {
                this.activePage = p;
                logger.info('Reusing existing Google Flow tab: %s', url);
                return p;
            }
        }
        // If none found, use the first blank page or open a new one
        const page = pages.length > 0 && pages[0].url() === 'about:blank' ? pages[0] : await this.context.newPage();
        this.activePage = page;
        return page;
    }
    /**
     * Evaluates authentication status on the current page.
     */
    async checkAuthStatus() {
        if (!this.activePage || this.activePage.isClosed()) {
            return { authenticated: false, details: 'Browser page is not open.' };
        }
        const url = this.activePage.url();
        // Check URL clues
        if (url.includes('accounts.google.com') || url.includes('/signin')) {
            return {
                authenticated: false,
                details: 'On Google sign-in page. Please complete login in browser.',
            };
        }
        try {
            // Check DOM indicators for authenticated session
            const authIndicator = await this.activePage.$('a[href*="SignOutOptions"], img[alt*="Google Account"], button[aria-label*="Account"], button[aria-label*="Google Account"], button:has-text("New project"), button:has-text("Create")');
            if (authIndicator) {
                return { authenticated: true, details: 'User authenticated on Google Flow.' };
            }
            // Check DOM indicators for explicit sign in button
            const signInBtn = await this.activePage.$('a[href*="accounts.google.com"], button:has-text("Sign in"), a:has-text("Sign in")');
            if (signInBtn) {
                return { authenticated: false, details: 'Sign-in prompt detected on page.' };
            }
            // If on flow.google without sign-in prompt, likely authenticated or loading
            if (url.includes('flow.google')) {
                return {
                    authenticated: true,
                    details: 'On Google Flow application page.',
                };
            }
            return {
                authenticated: false,
                details: `Not on Google Flow (current URL: ${url}).`,
            };
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            return { authenticated: false, details: `DOM inspection error: ${errMsg}` };
        }
    }
    /**
     * Assisted login flow: navigates to Google Flow and waits for human authentication.
     */
    async login(timeoutMs = 120000) {
        logger.info('Initiating assisted login flow...');
        // Ensure browser is launched visibly
        const page = await this.ensurePage(true);
        if (!page) {
            return {
                authenticated: false,
                message: 'Could not connect to or launch Chrome. Please check that Chrome is installed.',
            };
        }
        const config = loadConfig();
        const currentUrl = page.url();
        if (!currentUrl.includes('flow.google')) {
            logger.info('Navigating page to %s...', config.flowUrl);
            await page.goto(config.flowUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        }
        const initialCheck = await this.checkAuthStatus();
        if (initialCheck.authenticated) {
            return {
                authenticated: true,
                message: 'Already authenticated on Google Flow!',
            };
        }
        logger.info('Waiting for user to complete sign-in in the open browser window (timeout: %d ms)...', timeoutMs);
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            if (page.isClosed()) {
                return {
                    authenticated: false,
                    message: 'Browser window was closed during login attempt.',
                };
            }
            const status = await this.checkAuthStatus();
            if (status.authenticated) {
                logger.info('Login confirmed! User is authenticated on Google Flow.');
                return {
                    authenticated: true,
                    message: 'Successfully logged into Google Flow!',
                };
            }
            await new Promise((r) => setTimeout(r, 2000));
        }
        return {
            authenticated: false,
            message: `Login timed out after ${Math.floor(timeoutMs / 1000)} seconds. Please complete sign-in and run flow_login again.`,
        };
    }
    /**
     * Returns live session status summary.
     */
    async getStatus() {
        const isConnected = !!(this.context && this.activePage && !this.activePage.isClosed());
        let currentUrl;
        let authenticated = false;
        let message = 'No browser attached.';
        if (isConnected && this.activePage) {
            currentUrl = this.activePage.url();
            const auth = await this.checkAuthStatus();
            authenticated = auth.authenticated;
            message = auth.details;
        }
        return {
            connected: isConnected,
            authenticated,
            currentUrl,
            browserType: this.browserType,
            message,
        };
    }
    /**
     * Returns current active page or null.
     */
    getPage() {
        return this.activePage;
    }
    /**
     * Closes browser resources.
     */
    async close() {
        logger.info('Closing browser session...');
        if (this.context) {
            try {
                await this.context.close();
            }
            catch (err) {
                logger.warn('Error closing context:', err);
            }
            this.context = null;
            this.activePage = null;
            this.browserType = 'none';
        }
    }
}
//# sourceMappingURL=browser.js.map