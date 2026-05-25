#!/usr/bin/env node
/**
 * Eval runner for skill folders.
 *
 * Commands:
 *   node run-evals.js <skill-path> list              — List eval scenarios
 *   node run-evals.js <skill-path> setup <eval-id>   — Create fixtures, output sub-agent prompt
 */
const fs = require('fs');
const path = require('path');

const skillPath = process.argv[2];
const cmd = process.argv[3];
const evalId = parseInt(process.argv[4], 10);

if (!skillPath || !cmd) {
  console.log('Usage:');
  console.log('  node run-evals.js <skill-path> list');
  console.log('  node run-evals.js <skill-path> setup <eval-id>');
  process.exit(1);
}

const absSkillPath = path.resolve(skillPath);
const evalsPath = path.join(absSkillPath, 'evals', 'evals.json');
const skillMdPath = path.join(absSkillPath, 'SKILL.md');

if (!fs.existsSync(skillMdPath)) {
  console.error(`Not a skill folder (no SKILL.md): ${absSkillPath}`);
  process.exit(1);
}

if (!fs.existsSync(evalsPath)) {
  console.error(`No evals found: ${evalsPath}`);
  process.exit(1);
}

const { skill_name, evals } = JSON.parse(fs.readFileSync(evalsPath, 'utf8'));

function getEval(id) {
  const ev = evals.find(e => e.id === id);
  if (!ev) {
    console.error(`Eval #${id} not found. Available: ${evals.map(e => e.id).join(', ')}`);
    process.exit(1);
  }
  return ev;
}

function fixtureDir(id) {
  const scriptDir = path.resolve(__dirname, '..');
  return path.join(scriptDir, 'cache', '_fixtures', String(id));
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function setup(id) {
  const ev = getEval(id);
  const dir = fixtureDir(id);

  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  fs.mkdirSync(dir, { recursive: true });

  // Create fixture files (the "target" being inspected)
  if (ev.files && ev.files.length > 0) {
    for (const f of ev.files) {
      const fp = path.join(dir, f.path);
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, f.content, 'utf8');
    }
  }

  // Copy skill resources into _skill_home/ so sub-agent can resolve <this-skill>
  const skillHome = path.join(dir, '_skill_home');
  fs.mkdirSync(skillHome, { recursive: true });

  // Copy SKILL.md
  fs.copyFileSync(skillMdPath, path.join(skillHome, 'SKILL.md'));

  // Copy all directories except excluded ones
  const excludeDirs = new Set(['cache', 'node_modules', '.git', 'evals']);
  const entries = fs.readdirSync(absSkillPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !excludeDirs.has(entry.name)) {
      copyDirRecursive(path.join(absSkillPath, entry.name), path.join(skillHome, entry.name));
    }
  }

  const skillContent = fs.readFileSync(skillMdPath, 'utf8');

  const subAgentPrompt = [
    'You are executing a skill. Follow these instructions exactly:',
    '',
    skillContent,
    '',
    `Your working directory for this task is: ${dir}`,
    `The skill's own directory (for resolving <this-skill> references) is: ${skillHome}`,
    '',
    'Now execute the following user request:',
    ev.prompt
  ].join('\n');

  console.log(JSON.stringify({
    eval_id: id,
    skill_name,
    skill_path: absSkillPath,
    fixture_dir: dir,
    skill_home: skillHome,
    prompt: ev.prompt,
    files_created: (ev.files || []).map(f => f.path),
    expectations: ev.expectations,
    sub_agent_prompt: subAgentPrompt
  }, null, 2));
}

function list() {
  console.log(`\nSkill: ${skill_name}`);
  console.log(`Path:  ${absSkillPath}`);
  console.log(`Evals: ${evals.length}\n`);
  for (const ev of evals) {
    const fixtures = (ev.files || []).length;
    console.log(`  [${ev.id}] ${ev.prompt.slice(0, 65)}`);
    console.log(`      expectations: ${ev.expectations.length}, fixtures: ${fixtures}`);
  }
}

if (cmd === 'list') {
  list();
} else if (cmd === 'setup') {
  if (!evalId) { console.error('Usage: run-evals.js <skill-path> setup <eval-id>'); process.exit(1); }
  setup(evalId);
} else {
  console.log('Usage:');
  console.log('  node run-evals.js <skill-path> list');
  console.log('  node run-evals.js <skill-path> setup <eval-id>');
  process.exit(1);
}
