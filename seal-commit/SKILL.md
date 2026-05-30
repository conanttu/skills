---
name: seal-commit
description: "Use when the user wants to commit changes safely with automatic change review documentation. Provides a stash-based safety net, numbered file selection (only user interaction), auto-generated commit message (conventional commits), and dual-format change review docs (human.html + ai.md) included in the same commit. Triggers on '/seal', '/commit', 'commit', 'create commit', 'save my changes', or when user discusses what they changed and seems ready to commit. Use '/seal doc' or '生成变更文档' or 'generate change doc' for docs-only mode without committing."
metadata:
  version: "1.0.0"
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - Bash
allowed-prompts:
  - tool: Bash
    prompt: run git stash commands
  - tool: Bash
    prompt: run git status and diff commands
  - tool: Bash
    prompt: run git add and commit commands
  - tool: Bash
    prompt: run git branch and mkdir commands
---

# Seal Commit Skill

## Safety Constraints

This skill restricts itself to a small set of git commands. The reason: commands like `reset`, `checkout`, `restore`, or `stash drop` can irreversibly destroy uncommitted work. By limiting to read + add + commit operations, the stash safety net (Step 0) always remains intact and the user's working tree stays recoverable.

**Allowed git commands:**
- `git stash save "<msg>"` / `git stash apply`
- `git status` / `git status --porcelain`
- `git diff` / `git diff -- <files>` / `git diff HEAD~1`
- `git branch --show-current` (for Step 3 folder naming)
- `git add .` / `git add <file1> <file2> ...`
- `git commit -m "<message>"`

**Also allowed:**
- `mkdir -p .change-review/<folder-name>` (output directory for Step 3)
- Read/Grep/Glob to understand the changes

**Not allowed** (anything outside the list above — particularly `log`, `stash list`, `reset`, `checkout`, `restore`, `rebase`). If an edge case genuinely requires a command not on this list, stop and ask the user rather than running it.

**Output integrity:**
- Only describe changes supported by `git diff` or code reading — never fabricate content.
- End every response with the footer watermark `✨✨ seal-commit` (last line, nothing after it). This makes it easy for users and automation to identify skill-generated output.

## Default Commit Style
- Prefer Conventional Commits:
  `type(scope): subject`
- `scope` is optional; use it when clearly inferable from file paths.
- Subject rules:
  - imperative mood
  - no trailing period
  - concise and specific

## Workflow (Always follow in order)

### Step 0 — Safety snapshot (stash save)
1) First run `git status` briefly to understand what files are changed
2) Create a descriptive stash message that includes:
   - Current timestamp (format: YYYY-MM-DD HH:MM)
   - Number of files changed
   - List up to 2 most important files (e.g., package.json, config files)
   - If more than 2 files, add "..." at the end

   Examples:
   - `git stash save "snapshot-2024-01-16-23:45: 2 files (package.json, webpack.js)"`
   - `git stash save "snapshot-2024-01-16-23:45: 5 files (package.json, SKILL.md, ...)"`

3) Immediately run:
   - `git stash apply`

Notes:
- The purpose is to create a safety snapshot with readable context, then re-apply changes.
- If apply results in conflicts, STOP and explain what you can observe from `git status` and `git diff` only. Do not attempt conflict resolution with forbidden git commands.

### Step 1 — List files & user selection

File selection happens BEFORE any analysis. This ensures the commit message accurately reflects only the selected scope.

1) Run `git status --porcelain` to get all changed/untracked entries.

2) List ALL entries with numbers, including untracked directories:
   - For `??` directories: expand them by listing files inside (use the Glob tool to enumerate)
   - Display in this format:
     ```
     📝 Changed files:
     1. path/to/file1.js (modified)
     2. path/to/file2.ts (modified)
     3. path/to/new-file.md (untracked)
     4. path/to/dir/fileA.ts (untracked)
     5. path/to/dir/fileB.ts (untracked)
     6. path/to/deleted.py (deleted)
     ```
   - File status indicators:
     - M = modified
     - A = new file (staged)
     - D = deleted
     - R = renamed
     - ?? = untracked

3) Ask user which files to commit:
   ```
   ❓ Which files do you want to commit?

   Options:
   - Type "all" or "a" to commit all files
   - Type file numbers (e.g., "1,3,5" or "1 3 5") to commit specific files
   - Type "cancel" to abort
   ```

4) Wait for user response and validate:
   - If user types "all" or "a": Set FILES_TO_ADD to all files
   - If user types numbers: Parse and validate the numbers
     - Check that all numbers are within valid range (1 to N)
     - Convert numbers to actual file paths
     - Set FILES_TO_ADD to selected files only
   - If user types "cancel": Stop the commit flow
   - If invalid input: Ask again with clear error message

5) Display confirmation:
   ```
   ✅ Will commit N file(s):
   - path/to/file1.js
   - path/to/file2.ts
   ```

If `git status --porcelain` returns empty (no changes at all), say there are no changes to commit and stop.

### Step 2 — Analyze selected file changes

After user selects files, inspect the actual content changes for ONLY the selected files (FILES_TO_ADD):

1) **Tracked files** (M/D/R status): Run `git diff -- <file1> <file2> ...` to see code changes.
2) **Untracked/new files** (??/A status): Use the Read tool to read the full file content.

This two-pronged approach ensures nothing is missed — diff covers modifications, Read covers new files.

Optionally use Grep/Glob to understand broader context if needed.

### Step 3 — Generate change review document

This step generates the change review docs BEFORE the commit, so the docs are included in the same commit.

For **standalone mode** (`/seal doc` or "生成变更文档"): skip Steps 0–2, jump directly here to generate doc from current diff.

#### 3.1 Gather information

1) Get the code changes:
   - Use the diff/read results already gathered in Step 2 (no need to re-run).
   - For **standalone mode** (Steps 0–2 were skipped):
     1. Run `git status --porcelain` to identify all changed files.
     2. For tracked modifications (M/D/R): Run `git diff -- <files>` to get code changes.
     3. For untracked/new files (??/A): Use the Read tool to read full file content.
     4. If `git status --porcelain` is empty (changes already committed): fall back to `git diff HEAD~1`.
2) From the conversation context, extract:
   - **Why**: problem statement, Jira ticket, requirement discussion
   - **API docs**: any interface documentation referenced
   - **Design decisions**: approach discussed, trade-offs considered
   - **Known limitations**: caveats mentioned in discussion
3) Group changes into logical modules based on:
   - File paths (e.g., all changes in `src/pages/admin-user/` = one module)
   - Functional purpose (e.g., pagination, filtering, sorting = separate modules)

#### 3.2 Output structure

Create a folder: `.change-review/<branch-name>-<yyyy-mm-dd>/` (sanitize `/` to `-` in branch name). If the directory does not exist, create it with `mkdir -p`.

The folder contains two files:
- `human.html` — visual change review for humans (rich HTML with sidebar, cards, checklist)
- `ai.md` — structured markdown for LLM consumption (context for code review, test generation, PR description, etc.)

#### 3.3 Generate `human.html`

1) Read the template: `.claude/skills/seal-commit/resources/change-review-template.html`
2) Fill each section:

| Section | How to fill |
|---------|-------------|
| `{{TITLE}}` | From Jira ticket title or a concise summary derived from Step 2 analysis (e.g., "PROJ-123: Add user pagination feature") |
| `SECTION:LINKS` | Links mentioned in conversation (Jira, Confluence, etc.) as `<a>` tags |
| `SECTION:TOC` | Auto-generate from the sections you include (toc-group-title + toc-list items) |
| `SECTION:TLDR` | 3-4 bullet `<li>` summarizing: problem, solution, scope, impact |
| `SECTION:FILES` | One `<li>` per file from git status, with badge (modified/new/deleted) + description |
| `SECTION:MODULES` | For each logical module: `<h2>` + `<div class="card card-accent-{color}">` containing reason, compare (before/after code), and key-points table. Cycle colors: blue, amber, emerald, violet. |
| `SECTION:FLOW` | If architectural: `<h2>` + `<div class="card">` with flow-init items + operation table + param-grid. Skip if simple change. |
| `SECTION:API` | If types/endpoints changed: `<h2>` + `<div class="section-flat">` with tables listing field changes. |
| `SECTION:REMOVED` | If code was removed: `<h2>` + `<div class="section-flat">` with table of what was removed and why. |
| `SECTION:NOTES` | `<h2>` + `<div class="section-flat">` with table of behavioral changes, known limitations, compatibility notes. |
| `SECTION:CHECKLIST` | `<h2>` + `<div class="section-flat">` with grouped checklist tables. Each row: `<td><span class="check" onclick="this.classList.toggle('checked')">&#10003;</span></td><td>scenario</td><td>expected</td>` |

3) Write to: `.change-review/<branch-name>-<yyyy-mm-dd>/human.html`

#### 3.4 Generate `ai.md`

Write a structured markdown file optimized for LLM context injection. Use the following template:

````markdown
# <Title>

## Meta
- **Date**: YYYY-MM-DD
- **Branch**: <branch-name>
- **Links**: [Jira](url), [API Doc](url) (if available, otherwise omit)

## Summary
<2-3 sentences: what changed and why>

## Changed Files
| File | Status | Purpose |
|------|--------|---------|
| path/to/file | modified/new/deleted | one-line description |

## Modules

### <Module Name>
**Why**: <reason for this change>
**What**: <what was done, concisely>
**Key decisions**:
- decision 1
- decision 2

**Before** (key snippet):
```<lang>
<old code>
```

**After** (key snippet):
```<lang>
<new code>
```

## API Changes
| Field | Type | Change | Note |
|-------|------|--------|------|
| fieldName | type | new/modified/removed | description |

## Removed Code
| What | Why |
|------|-----|
| item | reason |

## Behavioral Notes
- note 1
- note 2

## Test Scenarios
| Category | Scenario | Expected |
|----------|----------|----------|
| group | test case | expected result |
````

Rules for `ai.md`:
- Keep it factual and dense — no decorative text, no filler
- Include actual code snippets (before/after) for key changes — LLMs need concrete examples
- All field names, function names, and paths should be in backticks
- Omit empty sections entirely (don't write "N/A" or empty tables)
- Section inclusion follows the same complexity rules as `human.html`

Write to: `.change-review/<branch-name>-<yyyy-mm-dd>/ai.md`

#### 3.5 Include docs in FILES_TO_ADD

After generating the docs, add the `.change-review/<branch-name>-<yyyy-mm-dd>/` directory to FILES_TO_ADD so the docs are committed together with the code changes.

#### Section inclusion rules

Not all sections are required. Include based on change complexity:

| Change type | Sections to include |
|-------------|-------------------|
| Simple fix (1-2 files) | TLDR + FILES + 1 MODULE + CHECKLIST |
| Feature (3-5 files) | TLDR + FILES + MODULES + NOTES + CHECKLIST |
| Architecture change | All sections |

### Step 4 — Auto-generate commit message and execute

After Step 3, proceed automatically without asking the user to pick a message.

1) Based on Step 2 analysis, generate the BEST commit message automatically:
   - **Subject line**: Conventional Commits format `type(scope): subject`
   - **Detail list**: 3-5 bullet points of key changes
   - Rules: imperative mood, no trailing period, concise and specific
   - Scope is optional; use when clearly inferable from file paths
   - If breaking change: prefix subject with "BREAKING" or add "(breaking)"

2) Add files (FILES_TO_ADD from Step 1 + change-review docs from Step 3):
   - If FILES_TO_ADD is "all": Run `git add .`
   - If FILES_TO_ADD is specific files: Run `git add <file1> <file2> ... .change-review/<folder>/`

3) Run the commit command using heredoc format:
   ```
   git commit -m "$(cat <<'EOF'
   subject line

   - detail 1
   - detail 2
   - detail 3
   EOF
   )"
   ```

4) Reply with:
   - The exact commit message used
   - Number of files committed
   - "变更文档已生成: `.change-review/<branch-name>-<yyyy-mm-dd>/`"
   - The result (success/failure) in plain language

## Trigger Modes Summary

| Trigger | Behavior |
|---------|----------|
| `/seal` or `/commit` or "commit" | Steps 0–4: file selection (only interaction) → analyze → generate docs → auto-commit all together |
| `/seal doc` or `/commit doc` | Step 3 only (no commit, analyze current diff + conversation context to generate doc) |
| "生成变更文档" / "generate change doc" / "写变更说明" | Step 3 only (no commit, analyze current diff + conversation context to generate doc) |

## References
- See `references/commit-style.md` for commit style rules and decision heuristics.
- See `references/examples.md` for file selection and commit message examples.
- See `references/edge-cases.md` for common failure handling.
- See `resources/change-review-template.html` for the `human.html` template (CSS + structure placeholders).
- See `resources/change-review-example.html` for a complete real-world example of `human.html` output.
- The `ai.md` template is defined inline in Step 3.4 above (no external template file needed).
✨✨ seal-commit
