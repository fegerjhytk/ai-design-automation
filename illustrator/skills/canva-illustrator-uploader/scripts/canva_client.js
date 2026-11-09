/**
 * canva_client.js
 * Programmatic JSON-RPC client to call Canva MCP tools directly from Node.js.
 */
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

function callCanvaTool(toolName, toolArgs = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(os.homedir(), '.gemini/config/plugins/canva/server.js');
    const proc = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let msgId = 1;
    let buffer = '';
    let result = null;
    let initialized = false;

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Canva tool '${toolName}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const res = JSON.parse(line);
          if (res.id === 1) {
            // Initialized - send initialized notification and the actual tool call
            proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
            const toolCall = {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: toolName,
                arguments: toolArgs
              }
            };
            proc.stdin.write(JSON.stringify(toolCall) + '\n');
          } else if (res.id === 2) {
            clearTimeout(timer);
            result = res.result;
            proc.kill();
            
            // Format result
            if (result && result.content && result.content[0] && result.content[0].text) {
              try {
                resolve(JSON.parse(result.content[0].text));
              } catch (e) {
                resolve(result.content[0].text);
              }
            } else {
              resolve(result);
            }
            return;
          }
        } catch (e) {}
      }
    });

    proc.stderr.on('data', () => {});

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    // Send initialize
    const initReq = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'canva-client', version: '1.0.0' }
      }
    };
    proc.stdin.write(JSON.stringify(initReq) + '\n');
  });
}

module.exports = { callCanvaTool };
