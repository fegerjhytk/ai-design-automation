#!/usr/bin/env node
/**
 * Canva MCP Multi-Account Runner
 * Dynamically routes Canva MCP to either 'personal' or 'company' account.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const accountsDir = path.join(os.homedir(), '.mcp-auth', 'accounts');
const activeFile = path.join(accountsDir, 'active.json');

// Ensure accounts directory exists
if (!fs.existsSync(accountsDir)) {
  fs.mkdirSync(accountsDir, { recursive: true });
}

let activeAccount = 'personal';
if (fs.existsSync(activeFile)) {
  try {
    const data = JSON.parse(fs.readFileSync(activeFile, 'utf8'));
    if (data.active) {
      activeAccount = data.active;
    }
  } catch (err) {
    // fallback to personal
  }
}

const targetDir = path.join(accountsDir, activeAccount);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Set MCP_REMOTE_CONFIG_DIR for mcp-remote
const env = {
  ...process.env,
  MCP_REMOTE_CONFIG_DIR: targetDir
};

const child = spawn('npx', ['-y', 'mcp-remote', 'https://mcp.canva.com/mcp'], {
  env,
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
