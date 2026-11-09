import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerStatusTool } from './status.js';
import { registerLoginTool } from './login.js';
import { registerProjectTools } from './projects.js';
import { registerImageTools } from './image.js';
import { registerVideoTools } from './video.js';
import { registerMediaTools } from './media.js';
import { logger } from '../logger.js';

export function registerTools(server: McpServer): void {
  logger.info('Registering MCP tools...');
  registerStatusTool(server);
  registerLoginTool(server);
  registerProjectTools(server);
  registerImageTools(server);
  registerVideoTools(server);
  registerMediaTools(server);
  logger.info('Tools registration completed.');
}
