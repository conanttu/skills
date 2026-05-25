#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function main() {
  const jsonPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!jsonPath) {
    console.error('Usage: node render-html.js <analysis.json> [output.html]');
    process.exit(1);
  }

  const absJson = path.resolve(jsonPath);
  if (!fs.existsSync(absJson)) {
    console.error(`File not found: ${absJson}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(absJson, 'utf8'));
  if (!data.skill_name || !data.scores) {
    console.error('Invalid analysis.json: missing required fields (skill_name, scores)');
    process.exit(1);
  }
  const templatePath = path.resolve(__dirname, '..', 'assets', 'report_template.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  const safeJson = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  const html = template.replace('__REPORT_DATA__', safeJson);

  const out = outputPath ? path.resolve(outputPath) : path.join(path.dirname(absJson), 'latest.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf8');
  console.log(out);
}

main();
