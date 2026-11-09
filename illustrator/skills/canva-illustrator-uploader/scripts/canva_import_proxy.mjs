import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { callCanvaTool } from './canva_client.js';

// If Canva MCP provides create-upload-url, let us see if we can register the imported file
console.log("Checking MCP integration...");
