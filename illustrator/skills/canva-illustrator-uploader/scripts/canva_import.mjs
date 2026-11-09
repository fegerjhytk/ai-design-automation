import { readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';

// Check for direct Canva Connect API token or local token
let token = process.env.CANVA_ACCESS_TOKEN;
if (!token) {
  const tokenFile = '/Users/admin/.mcp-auth/accounts/personal/mcp-remote-v1/67a2071180bfcf76a3985779a9a38813_tokens.json';
  if (fs.existsSync(tokenFile)) {
    token = JSON.parse(fs.readFileSync(tokenFile, 'utf8')).access_token;
  }
}

const API = 'https://api.canva.com/rest/v1';

async function request(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
    signal: options.signal ?? AbortSignal.timeout(300_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Canva HTTP ${response.status}: ${text}`);
  return JSON.parse(text);
}

export async function waitForImport(token, jobId, {
  initialJob,
  timeoutMs = 600_000,
  pollMs = 3_000,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let job = initialJob;
  while (true) {
    if (job?.status === 'success') {
      if (!job.result?.designs?.length) throw new Error(`Import ${jobId} returned no designs`);
      return job.result.designs;
    }
    if (job?.status === 'failed') {
      throw new Error(`Import ${jobId}: ${job.error?.code}: ${job.error?.message}`);
    }
    if (job && job.status !== 'in_progress') {
      throw new Error(`Unexpected import status: ${job.status}`);
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(`Polling timed out; resume GET /imports/${jobId}. Do not upload again.`);
    }
    await sleep(Math.min(pollMs, remaining));
    const requestBudget = deadline - Date.now();
    if (requestBudget <= 0) continue;
    ({ job } = await request(`/imports/${encodeURIComponent(jobId)}`, token, {
      signal: AbortSignal.timeout(Math.min(60_000, requestBudget)),
    }));
    if (!job) throw new Error(`Missing job in response for ${jobId}`);
  }
}

export async function importCanvaFile({ filePath, token, title, onJob = () => {} }) {
  if (!token) throw new Error('A Canva user OAuth token with design:content:write is required');
  const extension = extname(filePath).toLowerCase();
  const mimeType = { '.ai': 'application/illustrator', '.pdf': 'application/pdf' }[extension];
  if (!mimeType) throw new Error('Expected an .ai or .pdf file');
  title ??= basename(filePath, extname(filePath));
  if (!title.trim() || [...title].length > 50) throw new Error('Title must be 1–50 characters');
  const bytes = await readFile(filePath);

  const { job } = await request('/imports', token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(bytes.length),
      'Import-Metadata': JSON.stringify({
        title_base64: Buffer.from(title, 'utf8').toString('base64'),
        mime_type: mimeType,
      }),
    },
    body: bytes,
  });
  if (!job?.id) throw new Error('Canva did not return an import job ID');
  onJob(job.id);
  return waitForImport(token, job.id, { initialJob: job });
}

const filePath = process.argv[2] || '/Users/admin/Desktop/Ig stories - Singapore roadshow_v7_CanvaReady.ai';
console.log(`Testing Canva /imports implementation with: ${filePath}`);

try {
  const designs = await importCanvaFile({
    filePath,
    token,
    title: 'Singapore Roadshow Stories',
    onJob: id => console.log(`Created Import Job ID: ${id}`),
  });
  console.log('Import successful! Generated Designs:', JSON.stringify(designs, null, 2));
} catch (error) {
  console.error('Import Execution Error:', error.message);
}
