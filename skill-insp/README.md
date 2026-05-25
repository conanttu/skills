# Skill Insp

Score and improve skill folders, producing reports with actionable recommendations.

## What It Does

- **Inspect** a skill across 8 dimensions (structure, triggering, usability, completeness, progressive disclosure, testability, maintainability, safety & trust) — scoring 0–100
- **Generate** an HTML report viewable in browsers
- **Recommend** prioritized improvements
- **Apply** recommendations with automatic backup and rollback
- **Run Evals** to functionally test a skill by executing its eval scenarios via sub-agents

## Usage

```
Inspect the skill at ./my-skill
Show detailed mode
Apply recommendations to ./my-skill
Revert the last apply
Run evals for ./my-skill
```

## How It Works

The LLM reads the target skill's files directly using its tools, then evaluates against the rubric. No intermediate data-collection scripts — the model is the analyzer.

For eval runs, the `run-evals.js` script sets up isolated fixture environments and generates sub-agent prompts. The LLM spawns a sub-agent to execute the target skill, then verifies expectations from the output.

## File Structure

```
SKILL.md                       → Workflow and instructions
references/rubric.md           → Scoring dimensions and criteria
references/output-format.md    → JSON schema for analysis.json
scripts/render-html.js         → Turns analysis.json into HTML report
scripts/run-evals.js           → Eval fixture setup and sub-agent prompt generation
assets/report_template.html    → HTML template for the report
evals/evals.json               → Eval scenarios for this skill
```

## Requirements

- Node.js (for `render-html.js` and `run-evals.js`)

## Limitations

- Run Evals is a functional test — it verifies skill logic, not platform integration (permissions, triggering)
- Sub-agent execution requires platform support; falls back to manual triggering otherwise
