#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { logger } from './logger.js';

async function main(): Promise<void> {
  logger.info('Starting Google Flow MCP server on stdio...');

  const server = createServer();
  const transport = new StdioServerTransport();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await server.close();
      logger.info('MCP server closed cleanly.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });

  await server.connect(transport);
  logger.info('Google Flow MCP server successfully connected and listening for requests.');
}

main().catch((err) => {
  logger.error('Fatal initialization error:', err);
  process.exit(1);
});
