#!/usr/bin/env node
/**
 * Canva Multi-Account Manager CLI
 * Usage:
 *   node canva_account.js status
 *   node canva_account.js switch <personal|company>
 *   node canva_account.js login <personal|company>
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const accountsDir = path.join(os.homedir(), '.mcp-auth', 'accounts');
const activeFile = path.join(accountsDir, 'active.json');

function getActiveAccount() {
  if (fs.existsSync(activeFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(activeFile, 'utf8'));
      return data.active || 'personal';
    } catch (e) {}
  }
  return 'personal';
}

function setActiveAccount(account) {
  if (!fs.existsSync(accountsDir)) {
    fs.mkdirSync(accountsDir, { recursive: true });
  }
  fs.writeFileSync(activeFile, JSON.stringify({ active: account, updatedAt: new Date().toISOString() }, null, 2));
}

function inspectAccount(name) {
  const dir = path.join(accountsDir, name, 'mcp-remote-v1');
  if (!fs.existsSync(dir)) {
    return { name, exists: false, hasTokens: false };
  }
  const files = fs.readdirSync(dir);
  const tokenFile = files.find(f => f.endsWith('_tokens.json'));
  if (!tokenFile) {
    return { name, exists: true, hasTokens: false };
  }
  try {
    const tokens = JSON.parse(fs.readFileSync(path.join(dir, tokenFile), 'utf8'));
    const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).toLocaleString() : 'N/A';
    return {
      name,
      exists: true,
      hasTokens: true,
      expiresAt,
      scope: tokens.scope ? tokens.scope.split(' ').length + ' permissions granted' : 'N/A'
    };
  } catch (e) {
    return { name, exists: true, hasTokens: false, error: e.message };
  }
}

const command = process.argv[2] || 'status';
const target = process.argv[3];

if (command === 'status') {
  const active = getActiveAccount();
  console.log(`\n========================================`);
  console.log(`  Canva MCP Multi-Account Status`);
  console.log(`========================================`);
  console.log(`Active Account: \x1b[32m${active.toUpperCase()}\x1b[0m\n`);

  for (const acc of ['personal', 'company']) {
    const info = inspectAccount(acc);
    const marker = acc === active ? ' [ACTIVE]' : '';
    console.log(`Account: ${acc.toUpperCase()}${marker}`);
    console.log(`  Status:      ${info.hasTokens ? '✅ Connected / Authenticated' : '❌ Not Logged In'}`);
    if (info.hasTokens) {
      console.log(`  Expires:     ${info.expiresAt}`);
      console.log(`  Permissions: ${info.scope}`);
    }
    console.log('');
  }
  process.exit(0);
}

if (command === 'switch') {
  if (!target || !['personal', 'company'].includes(target.toLowerCase())) {
    console.error('Error: Please specify account to switch to: "personal" or "company"');
    process.exit(1);
  }
  const chosen = target.toLowerCase();
  setActiveAccount(chosen);
  console.log(`\n✅ Switched Canva MCP active account to: \x1b[32m${chosen.toUpperCase()}\x1b[0m`);
  process.exit(0);
}

if (command === 'login') {
  const acc = (target || getActiveAccount()).toLowerCase();
  if (!['personal', 'company'].includes(acc)) {
    console.error('Error: Account must be "personal" or "company"');
    process.exit(1);
  }

  const accDir = path.join(accountsDir, acc);
  const v1Dir = path.join(accDir, 'mcp-remote-v1');
  // If re-logging in, clean existing tokens for that account to force a new OAuth grant
  if (fs.existsSync(v1Dir)) {
    const files = fs.readdirSync(v1Dir);
    for (const f of files) {
      if (f.endsWith('_tokens.json')) {
        fs.unlinkSync(path.join(v1Dir, f));
      }
    }
  } else {
    fs.mkdirSync(v1Dir, { recursive: true });
  }

  setActiveAccount(acc);
  console.log(`\n🔑 Initiating Canva login for account: \x1b[33m${acc.toUpperCase()}\x1b[0m...`);
  console.log(`Please make sure you are logged into Canva with your \x1b[33m${acc.toUpperCase()}\x1b[0m ID in your browser.\n`);

  const child = spawn('npx', ['-y', 'mcp-remote', 'https://mcp.canva.com/mcp'], {
    env: { ...process.env, MCP_REMOTE_CONFIG_DIR: accDir },
    stdio: 'inherit'
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}
