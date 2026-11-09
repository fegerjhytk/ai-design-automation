import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools/index.js';
import { logger } from './logger.js';

export function createServer(): McpServer {
  logger.info('Initializing Google Flow McpServer instance...');
  const server = new McpServer({
    name: 'google-flow-mcp',
    version: '1.0.0',
  });

  registerTools(server);
  return server;
}
