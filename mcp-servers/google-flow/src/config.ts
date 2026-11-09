import path from 'node:path';
import os from 'node:os';

export interface ServerConfig {
  cdpUrl: string;
  userDataDir: string;
  downloadDir: string;
  headless: boolean;
  flowUrl: string;
  timeoutMs: number;
}

export function loadConfig(): ServerConfig {
  const homeDir = os.homedir();

  const cdpUrl = process.env.GOOGLE_FLOW_CDP_URL || process.env.CDP_URL || 'http://127.0.0.1:9222';
  const userDataDir =
    process.env.GOOGLE_FLOW_USER_DATA_DIR ||
    path.join(homeDir, '.google-flow-mcp', 'chrome-profile');
  const downloadDir =
    process.env.GOOGLE_FLOW_DOWNLOAD_DIR ||
    path.join(homeDir, 'Downloads');
  const headless = process.env.GOOGLE_FLOW_HEADLESS === 'true';
  const flowUrl = process.env.GOOGLE_FLOW_URL || 'https://flow.google';
  const timeoutMs = parseInt(process.env.GOOGLE_FLOW_TIMEOUT_MS || '60000', 10);

  return {
    cdpUrl,
    userDataDir,
    downloadDir,
    headless,
    flowUrl,
    timeoutMs,
  };
}
