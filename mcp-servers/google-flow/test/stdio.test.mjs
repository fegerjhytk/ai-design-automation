import { spawn } from 'node:child_process';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.resolve(__dirname, '../dist/index.js');

console.log('[TEST] Starting stdio smoke test against:', serverPath);

const proc = spawn(process.execPath, [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let stdoutBuffer = '';
const incomingMessages = [];

proc.stdout.on('data', (chunk) => {
  stdoutBuffer += chunk.toString('utf8');
  const lines = stdoutBuffer.split('\n');
  stdoutBuffer = lines.pop(); // keep partial line

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      incomingMessages.push(parsed);
      console.log('[TEST] Received valid JSON-RPC message ID:', parsed.id ?? '(notification)');
    } catch (err) {
      console.error('[TEST ERROR] Corrupted stdout line received (not valid JSON):', line);
      process.exit(1);
    }
  }
});

proc.stderr.on('data', (chunk) => {
  // Stderr is diagnostic logger output, which is expected and permitted
  process.stderr.write(`[SERVER STDERR] ${chunk.toString('utf8')}`);
});

function sendMessage(msg) {
  proc.stdin.write(JSON.stringify(msg) + '\n');
}

function waitForMessage(predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const found = incomingMessages.find(predicate);
      if (found) {
        clearInterval(interval);
        resolve(found);
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for message matching predicate after ${timeoutMs}ms`));
      }
    }, 50);
  });
}

async function run() {
  try {
    // 1. Send initialize
    console.log('[TEST] Sending initialize...');
    sendMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-harness',
          version: '1.0.0',
        },
      },
    });

    const initResp = await waitForMessage((m) => m.id === 1);
    assert(initResp.result, 'Initialize response should have result');
    assert.strictEqual(initResp.result.serverInfo.name, 'google-flow-mcp');
    console.log('[TEST] ✅ Initialize handshake passed!');

    // 2. Send initialized notification
    sendMessage({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });

    // 3. Send tools/list
    console.log('[TEST] Sending tools/list...');
    sendMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    });

    const toolsResp = await waitForMessage((m) => m.id === 2);
    assert(toolsResp.result && Array.isArray(toolsResp.result.tools), 'tools/list should return tools array');
    const statusTool = toolsResp.result.tools.find((t) => t.name === 'flow_status');
    assert(statusTool, 'tools/list MUST contain flow_status tool');
    console.log('[TEST] ✅ tools/list found flow_status tool:', statusTool.description);

    const loginTool = toolsResp.result.tools.find((t) => t.name === 'flow_login');
    assert(loginTool, 'tools/list MUST contain flow_login tool');
    console.log('[TEST] ✅ tools/list found flow_login tool:', loginTool.description);

    const listProjTool = toolsResp.result.tools.find((t) => t.name === 'flow_list_projects');
    assert(listProjTool, 'tools/list MUST contain flow_list_projects tool');
    console.log('[TEST] ✅ tools/list found flow_list_projects tool:', listProjTool.description);

    const openProjTool = toolsResp.result.tools.find((t) => t.name === 'flow_open_project');
    assert(openProjTool, 'tools/list MUST contain flow_open_project tool');
    console.log('[TEST] ✅ tools/list found flow_open_project tool:', openProjTool.description);

    const creditsTool = toolsResp.result.tools.find((t) => t.name === 'flow_get_credits');
    assert(creditsTool, 'tools/list MUST contain flow_get_credits tool');
    console.log('[TEST] ✅ tools/list found flow_get_credits tool:', creditsTool.description);

    const imageTool = toolsResp.result.tools.find((t) => t.name === 'flow_generate_image');
    assert(imageTool, 'tools/list MUST contain flow_generate_image tool');
    console.log('[TEST] ✅ tools/list found flow_generate_image tool:', imageTool.description);

    const videoTool = toolsResp.result.tools.find((t) => t.name === 'flow_generate_video');
    assert(videoTool, 'tools/list MUST contain flow_generate_video tool');
    console.log('[TEST] ✅ tools/list found flow_generate_video tool:', videoTool.description);

    const animateTool = toolsResp.result.tools.find((t) => t.name === 'flow_animate_image');
    assert(animateTool, 'tools/list MUST contain flow_animate_image tool');
    console.log('[TEST] ✅ tools/list found flow_animate_image tool:', animateTool.description);

    const jobStatusTool = toolsResp.result.tools.find((t) => t.name === 'flow_get_job_status');
    assert(jobStatusTool, 'tools/list MUST contain flow_get_job_status tool');
    console.log('[TEST] ✅ tools/list found flow_get_job_status tool:', jobStatusTool.description);

    const downloadTool = toolsResp.result.tools.find((t) => t.name === 'flow_download_media');
    assert(downloadTool, 'tools/list MUST contain flow_download_media tool');
    console.log('[TEST] ✅ tools/list found flow_download_media tool:', downloadTool.description);

    assert.strictEqual(toolsResp.result.tools.length, 10, 'Total registered MCP tools must be exactly 10');
    console.log('[TEST] ✅ All 10 Google Flow MCP tools verified in tools/list!');

    // 4. Send tools/call for flow_status
    console.log('[TEST] Calling flow_status...');
    sendMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'flow_status',
        arguments: { verbose: true },
      },
    });

    const callResp = await waitForMessage((m) => m.id === 3);
    assert(callResp.result && Array.isArray(callResp.result.content), 'tools/call should return content array');
    const contentText = callResp.result.content[0].text;
    const statusObj = JSON.parse(contentText);
    assert.strictEqual(statusObj.server.name, 'google-flow-mcp');
    assert.strictEqual(statusObj.session.connected, false);
    assert(statusObj.config, 'Verbose status should include config block');
    console.log('[TEST] ✅ flow_status call returned valid payload!');

    console.log('[TEST] 🎉 All smoke tests passed successfully!');
    proc.kill('SIGTERM');
    process.exit(0);
  } catch (err) {
    console.error('[TEST FAILED]', err);
    proc.kill('SIGKILL');
    process.exit(1);
  }
}

run();
