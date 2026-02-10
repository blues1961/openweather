#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function readTemplateKeys(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const keys = [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) {
      keys.push(match[1]);
    }
  });
  return keys;
}

function toStringValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function formatEnvValue(value) {
  const stringValue = toStringValue(value);
  const safeUnquoted = /^[A-Za-z0-9_./:@%+\-,]*$/;
  if (safeUnquoted.test(stringValue)) {
    return stringValue;
  }
  return JSON.stringify(stringValue);
}

function deriveAesKey(userKey, saltBase64) {
  if (saltBase64) {
    const salt = Buffer.from(saltBase64, 'base64');
    return crypto.scryptSync(userKey, salt, 32);
  }

  if (/^[a-f0-9]{64}$/i.test(userKey)) {
    return Buffer.from(userKey, 'hex');
  }

  return crypto.createHash('sha256').update(userKey, 'utf8').digest();
}

function decryptPayload(payload, userKey) {
  const ciphertextBase64 = payload.ciphertext || payload.encrypted;
  const ivBase64 = payload.iv || payload.nonce;
  const tagBase64 = payload.tag;

  if (!ciphertextBase64 || !ivBase64 || !tagBase64) {
    throw new Error('Encrypted payload is missing ciphertext/iv/tag.');
  }

  const key = deriveAesKey(userKey, payload.salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  const parsed = JSON.parse(decrypted);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Decrypted payload does not contain a valid object.');
  }
  return parsed;
}

function extractSecrets(payload, encryptionKey) {
  if (payload && payload.secrets && typeof payload.secrets === 'object' && !Array.isArray(payload.secrets)) {
    return payload.secrets;
  }

  if (payload && payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }

  const hasEncryptedShape = payload && (payload.ciphertext || payload.encrypted);
  if (hasEncryptedShape) {
    if (!encryptionKey) {
      throw new Error('Encrypted payload received but SECRETS_ENCRYPTION_KEY is missing.');
    }
    return decryptPayload(payload, encryptionKey);
  }

  const keys = payload && typeof payload === 'object' ? Object.keys(payload) : [];
  throw new Error(`Unsupported API response format. Top-level keys: ${keys.join(', ')}`);
}

function writeEnvFile(outputPath, content) {
  const dir = path.dirname(outputPath);
  const tmpPath = path.join(dir, `.tmp-env-${process.pid}-${Date.now()}`);

  fs.writeFileSync(tmpPath, content, { mode: 0o600 });
  fs.renameSync(tmpPath, outputPath);
  try {
    fs.chmodSync(outputPath, 0o600);
  } catch (error) {
    // chmod may fail on non-POSIX systems; ignore.
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true' || args.h === 'true') {
    console.log('Usage: node scripts/pull-secrets.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --app <name>            App name (default: openweather)');
    console.log('  --env <name>            Environment name (default: dev)');
    console.log('  --url <url>             Full API URL (overrides baseUrl+endpoint)');
    console.log('  --baseUrl <url>         Base URL (default: https://mdp.mon-site.ca)');
    console.log('  --endpoint <path>       API endpoint path (default: /api/secrets)');
    console.log('  --token <token>         Bearer token');
    console.log('  --encryptionKey <key>   Local decryption key for encrypted payloads');
    console.log('  --output <path>         Output .env path (default: .env)');
    console.log('  --template <path>       Template path (default: .env.example)');
    console.log('  --help                  Print this help');
    return;
  }

  const app = args.app || process.env.SECRETS_APP || 'openweather';
  const envName = args.env || process.env.SECRETS_ENV || 'dev';
  const baseUrl = (args.baseUrl || process.env.SECRETS_BASE_URL || 'https://mdp.mon-site.ca').replace(/\/$/, '');
  const endpoint = args.endpoint || process.env.SECRETS_ENDPOINT || '/api/secrets';
  const outputPath = path.resolve(args.output || process.env.SECRETS_OUTPUT_FILE || '.env');
  const templatePath = path.resolve(args.template || process.env.SECRETS_TEMPLATE_FILE || '.env.example');
  const token = args.token || process.env.SECRETS_ACCESS_TOKEN || '';
  const encryptionKey = args.encryptionKey || process.env.SECRETS_ENCRYPTION_KEY || '';
  const explicitUrl = args.url || process.env.SECRETS_URL || '';

  const url = explicitUrl || `${baseUrl}${endpoint}?app=${encodeURIComponent(app)}&env=${encodeURIComponent(envName)}`;
  const headers = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Secrets API returned ${response.status}: ${errorBody.slice(0, 300)}`);
  }

  const payload = await response.json();
  const rawSecrets = extractSecrets(payload, encryptionKey);

  const templateKeys = readTemplateKeys(templatePath);
  const secretKeys = Object.keys(rawSecrets);

  const missing = templateKeys.filter((key) => !(key in rawSecrets));
  if (missing.length > 0) {
    throw new Error(`Missing keys from API response: ${missing.join(', ')}`);
  }

  const orderedKeys = templateKeys.concat(
    secretKeys.filter((key) => !templateKeys.includes(key)).sort()
  );

  const lines = orderedKeys.map((key) => `${key}=${formatEnvValue(rawSecrets[key])}`);
  const content = `${lines.join('\n')}\n`;
  writeEnvFile(outputPath, content);

  console.log(`Secrets pulled for ${app}/${envName}.`);
  console.log(`Wrote ${orderedKeys.length} variables to ${outputPath}.`);
}

main().catch((error) => {
  console.error(`pull-secrets failed: ${error.message}`);
  process.exit(1);
});
