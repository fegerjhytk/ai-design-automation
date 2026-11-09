/**
 * Stderr-only logger for MCP server.
 *
 * CRITICAL INVARIANT: The MCP stdio transport communicates over process.stdout.
 * Any log, trace, or warning printed to stdout corrupts JSON-RPC framing.
 * All logging MUST go through process.stderr.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0 ? ' ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') : '';
  return `[${timestamp}] [${level.toUpperCase()}] [GoogleFlowMCP] ${message}${formattedArgs}\n`;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
      process.stderr.write(formatMessage('debug', message, ...args));
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
      process.stderr.write(formatMessage('info', message, ...args));
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
      process.stderr.write(formatMessage('warn', message, ...args));
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) {
      process.stderr.write(formatMessage('error', message, ...args));
    }
  },
};
