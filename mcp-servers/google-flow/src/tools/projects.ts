import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BrowserManager } from '../browser.js';
import { FlowPage } from '../page-objects/flow-page.js';
import { logger } from '../logger.js';

export function registerProjectTools(server: McpServer): void {
  // 1. flow_list_projects
  server.tool(
    'flow_list_projects',
    'List all existing projects in your Google Flow library',
    {},
    async () => {
      logger.info('Executing tool: flow_list_projects');
      const browserManager = BrowserManager.getInstance();
      const page = await browserManager.ensurePage(true);

      if (!page) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  message: 'Browser not connected. Use flow_login first to connect to Google Flow.',
                  projects: [],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const flowPage = new FlowPage(page);
      const projects = await flowPage.listProjects();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                count: projects.length,
                projects,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 2. flow_open_project
  server.tool(
    'flow_open_project',
    'Open an existing Google Flow project by ID or title, or create a new project workspace',
    {
      projectId: z
        .string()
        .optional()
        .describe('Project ID or exact title to open. Omit or pass "new" to create a new project.'),
    },
    async ({ projectId }) => {
      logger.info('Executing tool: flow_open_project (projectId=%s)', projectId);
      const browserManager = BrowserManager.getInstance();
      const page = await browserManager.ensurePage(true);

      if (!page) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  message: 'Browser not connected. Use flow_login first to connect to Google Flow.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const flowPage = new FlowPage(page);
      const result = await flowPage.openProject(projectId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // 3. flow_get_credits
  server.tool(
    'flow_get_credits',
    'Check remaining Google Flow generation credits and active subscription plan',
    {},
    async () => {
      logger.info('Executing tool: flow_get_credits');
      const browserManager = BrowserManager.getInstance();
      const page = await browserManager.ensurePage(true);

      if (!page) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  available: false,
                  message: 'Browser not connected. Use flow_login first.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const flowPage = new FlowPage(page);
      const credits = await flowPage.getCredits();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(credits, null, 2),
          },
        ],
      };
    }
  );
}
