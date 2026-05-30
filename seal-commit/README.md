# seal-commit

Safety-first git commit skill with automatic change review document generation.

## What it does

1. Creates a stash snapshot before any operation (safety net)
2. Lists changed files and lets you select which to commit (only interaction)
3. Analyzes the diff
4. Generates change review documents (included in the commit)
5. Auto-generates the best commit message and commits everything together

## Output structure

```
.change-review/<branch>-<yyyy-mm-dd>/
  human.html
  ai.md
```

## Triggers

| Input | Behavior |
|-------|----------|
| `/seal` or `/commit` or "commit" | Full flow: file selection → analyze → generate docs → auto-commit |
| `/seal doc` or "生成变更文档" | Docs only (no commit) |

## Prerequisites

- Must be in a git repository with uncommitted changes
- No special dependencies required

## Key design decisions

- **Restricted git command allowlist**: Only safe, read-oriented git commands plus `add` and `commit` are allowed. This prevents accidental data loss from commands like `reset`, `checkout`, or `restore`.
- **Stash-based safety net**: A descriptive stash is created before any operation so work can always be recovered.
- **Minimal interaction**: Only file selection requires user input. Commit message is auto-generated.
- **Docs before commit**: Change review documents are generated before the commit so they are included in the same commit.
- **Dual-output format**: HTML for human review (rich visuals, interactive checklist) and Markdown for LLM context injection (dense, factual, code-rich).
