#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILL_DIR = path.resolve(__dirname, '..');
const CONFIG_FILE = process.env.OKTA_SKILL_CONFIG || path.join(SKILL_DIR, 'config.json');
const SESSION_CACHE = process.env.OKTA_SKILL_SESSION || path.join(SKILL_DIR, '.session-cache.json');
const POLL_INTERVAL = 3000;
let TIMEOUT = parseInt(process.env.OKTA_SKILL_TIMEOUT || '120', 10) * 1000;

let args = { project: '', env: '', url: '', save: false, listFactors: false, writeConfig: false, help: false };
let cfg = {};
let stateToken = '';
let sessionToken = '';
let sessionId = '';

const log = (msg) => console.log(`  ${msg}`);
const ok = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const err = (msg) => { console.error(`  \x1b[31m✗\x1b[0m ${msg}`); };
const dim = (msg) => `\x1b[2m${msg}\x1b[0m`;
const bold = (msg) => `\x1b[1m${msg}\x1b[0m`;
const banner = (title) => {
  console.log(`\n  \x1b[36m━━━ ${title} ━━━\x1b[0m\n`);
};

// ── Args ───────────────────────────────────────────────────────────────────────

function parseArgs() {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--project': case '-p': args.project = argv[++i] || ''; break;
      case '--env': case '-e': args.env = argv[++i] || ''; break;
      case '--url': case '-u': args.url = argv[++i] || ''; break;
      case '--save': args.save = true; break;
      case '--timeout': TIMEOUT = parseInt(argv[++i] || '120', 10) * 1000; break;
      case '--list-factors': args.listFactors = true; break;
      case '--write-config': args.writeConfig = true; break;
      case '--help': case '-h': args.help = true; break;
      default:
        err(`Unknown option: ${argv[i]}`);
        process.exit(1);
    }
  }
}

function printUsage() {
  console.log(`
  ${bold('Okta SSO Auto-Login')}

  ${dim('Usage:')} node cli.js [options]

  ${dim('Options:')}
    --project <name>    Target project
    --env <name>        Target environment
    --url <url>         Direct URL (skips project/env lookup)
    --save              Save browser session state
    --list-factors      List MFA factor IDs
    --write-config      Write config from stdin JSON
    --timeout <sec>     Push timeout ${dim(`(default: ${TIMEOUT / 1000})`)}
    --help              Show this help
`);
}

// ── HTTP ───────────────────────────────────────────────────────────────────────

async function oktaRequest(method, urlPath, body, cookie) {
  const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`https://${cfg.okta_domain}${urlPath}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── Browser ────────────────────────────────────────────────────────────────────

function browser(cmd) {
  try {
    return execSync(`agent-browser ${cmd}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return e.stdout ? e.stdout.trim() : '';
  }
}

// ── Config ─────────────────────────────────────────────────────────────────────

function loadCredentials() {
  if (!fs.existsSync(CONFIG_FILE)) {
    err(`Config not found: ${CONFIG_FILE}`);
    log(`Run: cp config.example.json config.json`);
    process.exit(1);
  }
  try {
    const perms = (fs.statSync(CONFIG_FILE).mode & 0o777).toString(8);
    if (perms !== '600' && perms !== '400') log(`${dim(`Warning: permissions ${perms}, recommend chmod 600`)}`);
  } catch {}
  cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function resolveTarget() {
  if (args.url) {
    cfg._target = args.url;
    cfg._project = args.project || 'direct';
    cfg._env = args.env || 'direct';
    return;
  }
  if (!cfg.projects) { err('No projects in config'); process.exit(1); }

  const projects = cfg.projects;
  let proj = args.project;
  let env = args.env;

  if (!proj) {
    const keys = Object.keys(projects);
    if (keys.length === 1) proj = keys[0];
    else { err('--project required'); keys.forEach(k => log(`  ${k}`)); process.exit(1); }
  }
  if (!projects[proj]) { err(`Project '${proj}' not found`); Object.keys(projects).forEach(k => log(`  ${k}`)); process.exit(1); }

  const envs = projects[proj];
  if (!env) {
    const keys = Object.keys(envs);
    if (keys.length === 1) env = keys[0];
    else { err(`--env required for '${proj}'`); keys.forEach(k => log(`  ${k}`)); process.exit(1); }
  }
  if (!envs[env]) { err(`Env '${env}' not found in '${proj}'`); Object.keys(envs).forEach(k => log(`  ${k}`)); process.exit(1); }

  cfg._target = envs[env];
  cfg._project = proj;
  cfg._env = env;
}

// ── Session cache ──────────────────────────────────────────────────────────────

function saveSessionCache(sid) {
  fs.writeFileSync(SESSION_CACHE, JSON.stringify({ sid, saved_at: Math.floor(Date.now() / 1000), okta_domain: cfg.okta_domain }, null, 2));
  try { fs.chmodSync(SESSION_CACHE, 0o600); } catch {}
}

async function restoreSessionCache() {
  if (!fs.existsSync(SESSION_CACHE)) return null;
  try {
    const cached = JSON.parse(fs.readFileSync(SESSION_CACHE, 'utf8'));
    if (!cached.sid) return null;
    const res = await oktaRequest('GET', '/api/v1/sessions/me', null, `sid=${cached.sid}`);
    if (res.status === 'ACTIVE') { ok(`Cached session valid ${dim(`(expires: ${res.expiresAt})`)}`); return cached.sid; }
  } catch {}
  return null;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

async function stepAuthn() {
  log(`Authenticating ${dim(cfg.username)} ...`);
  const res = await oktaRequest('POST', '/api/v1/authn', { username: cfg.username, password: cfg.password });

  switch (res.status) {
    case 'MFA_REQUIRED': case 'MFA_ENROLL_ACTIVATE':
      stateToken = res.stateToken;
      ok('Password verified — MFA required');
      break;
    case 'SUCCESS':
      sessionToken = res.sessionToken; stateToken = '';
      ok('Password verified — no MFA needed');
      break;
    case 'LOCKED_OUT':
      err('Account locked out'); process.exit(1);
    default:
      err(`Auth failed: ${res.status}`);
      console.error(JSON.stringify(res, null, 2).replace(/"password":\s*"[^"]+"/g, '"password": "***"'));
      process.exit(1);
  }
}

async function discoverPushFactor() {
  log('Discovering MFA factors ...');
  const res = await oktaRequest('POST', '/api/v1/authn', { username: cfg.username, password: cfg.password });
  const factors = res._embedded?.factors || [];
  console.log();
  factors.forEach(f => log(`${bold(f.id)}  ${f.factorType}  ${dim(f.provider)}`));
  console.log();
}

async function stepMfa() {
  if (!stateToken) return;

  const pushId = cfg.push_factor_id;
  if (!pushId) { err('No push_factor_id configured. Run with --list-factors first.'); process.exit(1); }

  log('Sending Push notification ...');
  await oktaRequest('POST', `/api/v1/authn/factors/${pushId}/verify`, { stateToken });
  log(`${dim('Approve on your phone')}`);

  const start = Date.now();
  while (Date.now() - start < TIMEOUT) {
    const poll = await oktaRequest('POST', `/api/v1/authn/factors/${pushId}/verify`, { stateToken });
    if (poll.status === 'SUCCESS') { sessionToken = poll.sessionToken; ok('Push approved'); return; }
    const result = poll.factorResult;
    if (result === 'WAITING') {
      const s = Math.floor((Date.now() - start) / 1000);
      process.stdout.write(`\r  \x1b[2mWaiting ... ${s}s\x1b[0m`);
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
    } else if (result === 'REJECTED') { process.stdout.write('\n'); err('Push rejected'); process.exit(1); }
    else if (result === 'TIMEOUT') { process.stdout.write('\n'); err('Push timed out'); process.exit(1); }
    else { process.stdout.write('\n'); err(`Unexpected: ${result}`); process.exit(1); }
  }
  process.stdout.write('\n');
  err(`Timed out (${TIMEOUT / 1000}s)`);
  process.exit(1);
}

async function stepCreateSession() {
  log('Creating session ...');
  const res = await oktaRequest('POST', '/api/v1/sessions', { sessionToken });
  if (res.status !== 'ACTIVE') { err(`Session not active: ${res.status}`); process.exit(1); }
  sessionId = res.id;
  ok('Session active');
  saveSessionCache(sessionId);
}

function stepBrowserLogin() {
  log('Opening browser ...');
  browser(`open "https://${cfg.okta_domain}" --session okta-auth`);
  browser(`cookies set sid "${sessionId}" --session okta-auth`) ||
    browser(`eval "document.cookie='sid=${sessionId}; domain=.okta.com; path=/';" --session okta-auth`);

  log(`Navigating to ${dim(cfg._target)} ...`);
  browser(`open "${cfg._target}" --session okta-auth`);
  execSync('sleep 2');

  const snap = browser('snapshot -i --session okta-auth');
  if (/login with okta|okta connect|sign in with okta/i.test(snap)) {
    log('Clicking Okta login button ...');
    browser('find role button click --name "Login with Okta" --session okta-auth') ||
      browser('find text "Login with Okta" click --session okta-auth') ||
      browser('find text "Okta Connect" click --session okta-auth');
    execSync('sleep 4');
  }

  if (args.save) {
    const f = path.join(process.env.HOME, `.okta-session-${cfg._env}.json`);
    try { browser(`state save "${f}" --session okta-auth`); ok(`Session saved to ${f}`); }
    catch { log(dim('Could not save session state')); }
  }

  const url = browser('get url --session okta-auth') || cfg._target;
  console.log();
  ok(`${bold('Logged in')} — ${url}`);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  parseArgs();
  if (args.help) { printUsage(); return; }

  if (args.writeConfig) {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) chunks.push(chunk);
    const data = JSON.parse(chunks.join(''));
    if (fs.existsSync(CONFIG_FILE)) {
      const existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (data.projects) { existing.projects = existing.projects || {}; Object.assign(existing.projects, data.projects); delete data.projects; }
      Object.assign(existing, data);
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2));
    } else {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
    }
    try { fs.chmodSync(CONFIG_FILE, 0o600); } catch {}
    ok(`Config saved`);
    return;
  }

  try { execSync('which agent-browser', { stdio: 'pipe' }); } catch {
    err("agent-browser not found — npm install -g agent-browser"); process.exit(1);
  }
  if (!process.env.AGENT_BROWSER_HOME) {
    try {
      const r = execSync('npm root -g', { encoding: 'utf8' }).trim();
      const p = path.join(r, 'agent-browser');
      if (fs.existsSync(p)) process.env.AGENT_BROWSER_HOME = p;
    } catch {}
    if (!process.env.AGENT_BROWSER_HOME) { err('AGENT_BROWSER_HOME not set'); process.exit(1); }
  }

  if (args.listFactors) {
    loadCredentials();
    await stepAuthn();
    await discoverPushFactor();
    return;
  }

  loadCredentials();
  resolveTarget();

  const label = cfg._project !== 'direct' ? `${cfg._project}/${cfg._env}` : cfg._env;
  banner(`Okta Login — ${label}`);
  log(`User:    ${dim(cfg.username)}`);
  if (cfg._project && cfg._project !== 'direct') log(`Project: ${dim(cfg._project)}`);
  log(`Target:  ${dim(cfg._target)}`);
  console.log();

  const cachedSid = await restoreSessionCache();
  if (cachedSid) {
    sessionId = cachedSid;
    stepBrowserLogin();
  } else {
    await stepAuthn();
    await stepMfa();
    await stepCreateSession();
    stepBrowserLogin();
  }
  console.log();
}

main().catch(e => { err(e.message); process.exit(1); });
