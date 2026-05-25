---
name: skill-insp
description: 'Score and improve a skill folder (must contain SKILL.md). Triggers on: "评估/inspect/audit/score this skill", "detailed mode/展开", "apply recommendations/应用推荐", "run evals/跑测试", "revert". Not for general code review.'
metadata:
  version: "1.0.0"
allowed-tools:
  - Bash(mkdir -p *)
  - Bash(node *)
  - Bash(find *)
  - Bash(shasum *)
  - Bash(cp *)
  - Bash(cat *)
  - Read
  - Edit
  - Write
---

# Skill Insp

Evaluate a skill folder as a compact coach: whether it is usable, safe, maintainable, and worth improving.

## Workflow

**At the start, output**: `✨ skill-insp ✨`

**Language**: Match the user's language.

1. **Locate the target skill.** It should contain `SKILL.md`. If the user omits a path, check if the current directory has one; otherwise ask one concise question.

2. **Gather facts yourself.** Use tools directly — do not rely on external scripts for data collection:
   - Run `find <skill_path> -type f` (excluding `.git`, `node_modules`, `cache`, etc.) to get the file tree.
   - Read `SKILL.md` in full. Parse the YAML frontmatter yourself — extract `name`, `description`, `metadata` (including `version`), `allowed-tools`, and any other fields.
   - Read `README.md` if present, all files under `scripts/`, `references/`, `evals/`, and any other text files relevant to understanding the skill.
   - Note all URLs/endpoints found in source files.
   - For large skills, prioritize: SKILL.md → README.md → scripts → references → evals → other files.

3. **Analyze.** Read `references/rubric.md` for scoring dimensions. Evaluate each dimension by understanding the actual content — context, intent, and semantics. Do not pattern-match.

4. **Write results.** Create the cache directory `<this-skill>/cache/<skill-slug>/` where `<this-skill>` is the directory containing this SKILL.md, and `<skill-slug>` is the `name` field from frontmatter, lowercased, with non-alphanumeric runs replaced by `-`. Write `analysis.json` following the schema in `references/output-format.md`.

5. **Generate HTML report.** Run `node <this-skill>/scripts/render-html.js <cache_dir>/analysis.json` to produce `latest.html`. If this fails (e.g., node unavailable), report the error and proceed — `analysis.json` is still usable for direct inspection.

6. **Present the terminal report** following the Default Report format below.

7. **End with**: the HTML report path and available next actions.

**At the end, output**: `✨ skill-insp ✨`

## What You Analyze

Evaluate all 8 dimensions defined in `references/rubric.md`: Structure, Triggering, Usability, Completeness, Progressive Disclosure, Testability, Maintainability, and Safety & Trust.

For Safety & Trust — the most important dimension for semantic analysis — read the actual code and distinguish:
- **Documentation/examples** (describing what to check for) vs **real executable code** (actually doing it)
- **Disclosed behavior** (mentioned in SKILL.md) vs **hidden behavior** (only in scripts)

Check for: hardcoded secrets, destructive operations without confirmation, privilege escalation, undisclosed network endpoints, unsafe execution patterns (eval/exec), supply chain risks, and prompt injection.

## Analysis Output Format

Write JSON to `<cache_dir>/analysis.json` following the schema in `references/output-format.md`.

## Default Report

Present in this order:

1. **Overall assessment**: one sentence with total score, risk level, readiness.
2. **Key strengths**: up to 3 bullets.
3. **Scorecard**: all 8 dimensions in order.
4. **Safety & Trust**: near the end; only mention what's relevant.
5. **Recommendations**: High (up to 3), Medium (up to 3), Low (up to 2). One compact sentence each.
6. **Next actions**: HTML report **absolute path** (so the user can `open` it directly), then prompt user with numbered actions:
   1. "详细模式" or "detailed mode" to expand evidence
   2. "应用推荐" or "apply recommendations" to modify the skill
   3. "跑测试" or "run evals" to verify the skill with eval scenarios (note: each scenario spawns a sub-agent, full run may take several minutes)
   4. "revert" to undo the last apply (if applicable)

## Detailed Mode

**At the start, output**: `✨ skill-insp ✨`

When the user says `detailed mode`, `展开`, `继续`, `show evidence`:

1. Reuse `analysis.json` if it exists and the user confirms the skill has not changed. If unsure, re-inspect.
2. Expand evidence in **table format**:
   - **Scoring rationale table**: one row per dimension with score, max, and rationale
   - **Findings table**: priority, dimension, title, file:line, and detail
3. Keep sensitive values redacted — do not print secrets from source files.

**At the end, output**: `✨ skill-insp ✨`

## Recommendation Style

Follow the compactness rules defined in `references/rubric.md`.

## Apply Recommendations

**At the start, output**: `✨ skill-insp ✨`

Only modify a target skill after the user explicitly asks.

1. Apply High-priority recommendations by default, unless the user names others.
2. Re-read the target files before editing.
3. Create `<cache_dir>/last-apply/` with backups only for files you will modify. Copy each file before editing.
4. Record `<cache_dir>/last-apply/manifest.json` with relative paths, which recommendations were applied, and for each file run `shasum -a 256` to record before/after hashes.
5. Make minimal, reversible changes.
6. After editing, rerun the analysis to verify improvements.

**At the end, output**: `✨ skill-insp ✨`

## Revert Last Apply

**At the start, output**: `✨ skill-insp ✨`

When the user asks to revert:

1. Read `<cache_dir>/last-apply/manifest.json`.
2. For each file: verify current hash with `shasum -a 256` matches the recorded after-hash. If it matches, restore from backup. If not, report conflict.
3. Never use `git reset --hard` or `git checkout --`.

**At the end, output**: `✨ skill-insp ✨`

## Run Evals

**At the start, output**: `✨ skill-insp ✨`

When the user says `run evals`, `跑测试`, `验证`, or `test the skill`:

This is a **functional test** — it verifies the skill's logic produces correct outputs, not platform integration (permissions, triggering).

1. Locate the target skill path (the skill being tested).
2. Run `node <this-skill>/scripts/run-evals.js <target-skill-path> list` to show available scenarios.
3. Ask the user to confirm whether to proceed. If the user declines, end here.
4. For each eval (or a specific one if the user names it), execute steps 5–8.
5. Run `node <this-skill>/scripts/run-evals.js <target-skill-path> setup <id>` to create fixtures. The output includes `sub_agent_prompt`, `fixture_dir`, `skill_home`, and `expectations`. The `skill_home` is an isolated copy of the target skill's resources inside the fixture dir — the sub-agent will write outputs there.
6. Spawn a sub-agent with the `sub_agent_prompt` from setup output. If the platform does not support sub-agents, tell the user to manually trigger the target skill with the prompt against the fixture directory, then continue to step 7.
7. After the sub-agent completes, verify each expectation:
   - For file-related expectations (e.g., "analysis.json is written"): use `find` on the fixture directory (including `_skill_home/cache/`) to confirm.
   - For content expectations (e.g., "high-priority finding is raised"): read the output files and check.
   - For behavioral expectations (e.g., "the model reports an error"): judge from the sub-agent's text output.
8. Record each expectation as pass or fail with a brief reason.
9. After all evals complete, update the existing `analysis.json` (or create it if absent) — add/overwrite the `eval_results` array following the schema in `references/output-format.md`. Then regenerate `latest.html` with `node <this-skill>/scripts/render-html.js`.
10. Present a summary table: eval id, scenario prompt, pass/fail, reasons.

**At the end, output**: `✨ skill-insp ✨`
