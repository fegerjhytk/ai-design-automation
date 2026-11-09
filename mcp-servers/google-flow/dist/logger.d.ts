/**
 * Stderr-only logger for MCP server.
 *
 * CRITICAL INVARIANT: The MCP stdio transport communicates over process.stdout.
 * Any log, trace, or warning printed to stdout corrupts JSON-RPC framing.
 * All logging MUST go through process.stderr.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export declare const logger: {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
};
//# sourceMappingURL=logger.d.ts.map