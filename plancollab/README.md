# plancollab

Cross-agent planning and review between Claude Code and Codex CLI.

One agent creates an implementation plan, the other reviews it. They iterate until the plan is approved or the round limit is reached.

## Usage

```
/plancollab <task description>
```

Examples:

```
/plancollab 给 CLI 添加 --verbose 参数
/plancollab add JWT authentication to the API
/plancollab 让 codex 做计划，重构 session 模块
/plancollab status
/plancollab resume
```

## Defaults

| Setting | Default | Override |
|---------|---------|----------|
| Planner | You (current agent) | Say "swap roles" or "let {other} plan" |
| Reviewer | Other agent | Say "swap roles" or "I'll review" |
| Max rounds | 3 | Say "max 5 rounds" |
| Auto review | Ask on first use | Say "enable/disable auto review" |

No flags needed. Use natural language to override.

When auto-review is enabled, the current agent automatically sends non-trivial plans to the other agent for review without needing `/plancollab`.

## How It Works

```
User provides task
      |
      v
Baseline exists? ── no ──> planner scans project
      |                     → .plancollab/baseline.md
      yes
      |
      v
Planner generates complete plan ─────────────────────┐
      |                                               |
      v                                               |
Reviewer evaluates → consensus update                 |
      (what's agreed / what's disputed)               |
      |                                               |
      v                                               |
  APPROVED? ── yes ──> present to user for confirm    |
      |                                               |
      no                                              |
      |                                               |
      v                                               |
  Round < max? ── no ──> summarize conflicts          |
      |                    for user to decide          |
      yes                                             |
      |                                               |
      v                                               |
  Next round: only send disputed sections ───────────>┘
  (agreed sections locked as one-liners)
```

- One complete plan per round on disk (single source of truth)
- Communication is a projection: agreed = one-liner, disputed = full text
- When Claude is the active role, it works directly in conversation
- When the other agent is needed, it's invoked via CLI (`codex exec` or `claude -p`)

## Review Criteria

Plans are evaluated on 6 dimensions:

1. **Completeness** — covers all aspects of the task
2. **Correctness** — technically sound for this codebase
3. **Feasibility** — each step implementable as described
4. **Step ordering** — correct dependency order
5. **Risk coverage** — edge cases addressed
6. **Testing** — adequate verification strategy

Verdict: **APPROVED** (no critical/major issues) or **NEEDS_REVISION** (any critical/major issue).

## File Structure

```
.plancollab/                                 # runtime directory (gitignored)
├── config.json                             # global: auto_review setting
├── baseline.md                             # global: project architecture baseline
├── 2026-04-25-lru-cache/                   # session directory
│   ├── state.json                          # session state + agreed/disputed
│   ├── plan.md                            # saved on APPROVED
│   ├── temp/
│   │   ├── input.md                        # communication payload
│   │   ├── plan.md                         # Codex-generated plan
│   │   └── review.md                       # Codex-generated review
│   ├── plans/
│   │   ├── round-1-cc.md                   # plan by Claude (cc)
│   │   └── round-2-cc.md
│   └── reviews/
│       ├── round-1-cx.md                   # review by Codex (cx)
│       ├── round-1-consensus-cx.md         # consensus by reviewer
│       └── round-2-cx.md
└── 2026-04-25-auth/                        # another session
    └── ...
```

One complete plan per round on disk. Communication to the other agent is a projection: agreed sections as one-liners, disputed sections in full text.

## Skill Structure

```
.claude/skills/plancollab/
├── SKILL.md                   # main skill instructions
├── reference.md               # prompt templates, state format, file naming
├── README.md                  # this file
└── evals/
    └── evals.json             # evaluation test cases
```

## Prerequisites

- `codex` CLI and `claude` CLI both installed and in PATH
