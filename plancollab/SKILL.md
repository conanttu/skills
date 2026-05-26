---
name: plancollab
description: >-
  Cross-agent planning and review between Claude Code and Codex. One agent
  creates an implementation plan, the other reviews it, iterating until
  approved. Use when the user wants a second opinion on a plan, wants two
  AI agents to collaborate, or wants Codex to review or create a plan.
  Also auto-invokes when you have just generated a non-trivial implementation
  plan (multiple files, architectural decisions, or significant changes) and
  auto-review is enabled.
when_to_use: >-
  "plancollab", "cross review", "codex review", "plan with codex",
  "let codex plan", "agent collaboration", "cross-agent",
  "互相 review", "交叉审查", "让 codex 审查",
  "list plans", "delete plan", "列出计划", "删除计划",
  also auto-invoke after generating an implementation plan if auto-review
  is enabled in .plancollab/config.json
argument-hint: "<task description>"
metadata:
  version: "1.0.0"
allowed-tools: Bash(*) Write(*) Read(*)
---

# PlanCollab: Cross-Agent Planning & Review

You orchestrate a plan-review loop between Claude Code (🐶) and Codex (🐱).

**REQUIRED on startup:** Silently run `echo $CLAUDECODE` to detect environment (never show this to the user). All subsequent behavior depends on this result:
- `1` → you are 🐶, other agent is 🐱, call via `codex exec`
- otherwise → you are 🐱, other agent is 🐶, call via `claude -p`

**Defaults:** You are the planner, the other agent is the reviewer, max 3 rounds.
The user can override by saying "swap roles" or "let {other} plan".

**Identity markers (fixed):**
- 🐶 = Claude (always)
- 🐱 = Codex (always)

## Step 0: Auto-Review Check

This step runs **before** Step 1, and determines how the skill was triggered.

**If triggered by user (`/plancollab ...`):** Skip to Step 1.

**If auto-invoked after generating a plan:**

1. Check if `.plancollab/config.json` exists and read `auto_review` setting.
2. Based on the setting:
   - `auto_review: true` → proceed to Step 1 with the plan you just generated as TASK
   - `auto_review: false` → do nothing, stop
   - **File doesn't exist (first time):** Ask the user:
     "I just generated an implementation plan. Would you like Codex to automatically review it? I can enable auto-review for future plans too."
     - "Yes, always" → write `.plancollab/config.json`: `{ "auto_review": true }`, proceed to Step 1
     - "Yes, just this once" → proceed to Step 1, don't write config
     - "No" → write `.plancollab/config.json`: `{ "auto_review": false }`, stop

The user can change this anytime by saying "enable auto review" or "disable auto review" — update `.plancollab/config.json` accordingly.

**When to auto-invoke:** Only when the plan you generated is non-trivial — involves multiple files, architectural decisions, or significant changes. Do not auto-invoke for small fixes, single-file changes, or simple tasks.

## Step 1: Parse & Prepare

Determine the sub-command from `$ARGUMENTS` and conversation context:

- **plan** (default): start a new collaboration → continue to rest of Step 1
- **list**: list all sessions → skip to Session Management below
- **delete**: delete session(s) → skip to Session Management below
- **status**: show current session state → skip to Session Management below
- **resume**: resume an in-progress session → skip to Session Management below

For `plan`, extract:
- **TASK**: the task description (or the plan you just generated, if auto-invoked)
- **PLANNER**: defaults to you (the current agent). User can override.
- **REVIEWER**: defaults to the other agent. User can override.
- **MAX_ROUNDS**: 3 unless user says otherwise

Verify the other agent is available:
- If you are 🐶 Claude → run `codex --version`
- If you are 🐱 Codex → run `claude --version`

If the command fails, tell the user the other agent is not available and stop.

Display a session start header:

```
🐶 🐱 PlanCollab Started
Task:     {TASK}
Planner:  🐶 Claude
Reviewer: 🐱 Codex
Rounds:   max {MAX_ROUNDS}
```

(Swap 🐶/🐱 labels if roles are reversed.)

Throughout the session, use clear full labels at key moments:
- `🐶 Claude generating plan...` / `🐱 Codex generating plan...`
- `Sending plan to 🐱 Codex for review...` / `Sending plan to 🐶 Claude for review...`
- `🐱 Codex review received` / `🐶 Claude review received`
- `🐶 🐱 Agreed:` / `🐶 ⚡ 🐱 Disputed:`
- `🐶 🐱 ✅ Plan APPROVED`
- `🐶 ⚡ 🐱 Unresolved — asking user`

When the session ends (approved, conflict escalated, or abandoned), display:

```
🐶 🐱 PlanCollab Ended
Result:  ✅ approved / ⚡ conflict / ❌ abandoned
Rounds:  {N}/{MAX_ROUNDS}
Final:   .plancollab/{session-name}/plan.md
```

## Step 2: Project Baseline

Check if `.plancollab/baseline.md` exists.

**If it exists:**
Ask the user: "Project baseline found (created {date from file}). Use existing or rescan?"
- Use existing → read `.plancollab/baseline.md`, store as CONTEXT
- Rescan → proceed to scanning below

**If it doesn't exist:**
Ask the user: "Need to scan the project first to understand its architecture. OK to proceed?"
- Yes → proceed to scanning below
- No → fall back to lightweight context: read `package.json` + list source files + pick files relevant to TASK. Store as CONTEXT and skip baseline creation.

**Scanning (performed by PLANNER):**

The planner scans the project and generates `.plancollab/baseline.md` containing:

1. **Project Overview** — name, purpose, one-paragraph description
2. **Tech Stack** — languages, frameworks, key dependencies with versions
3. **Directory Structure** — key directories and their roles (not a full file tree)
4. **Core Modules** — main modules/components, what each one does, how they relate
5. **Architecture Patterns** — layering, routing, adapters, state management, etc.
6. **Key Types/Interfaces** — important type definitions that shape the codebase
7. **Build & Run** — how to build, test, run the project

To gather this information, the planner should:
- Read `package.json` (or equivalent: `pom.xml`, `pyproject.toml`, `go.mod`, etc.)
- Read `README.md`, `CLAUDE.md`, or any project docs
- Run `find` to list source files (exclude `node_modules`, `dist`, `.git`, etc.)
- Read key source files: entry points, type definitions, config files
- Identify architecture patterns from directory structure and imports

Save the result to `.plancollab/baseline.md` with a date header. Store as CONTEXT.

**If PLANNER is the other agent**, invoke via CLI to generate baseline:
- 🐶 calling 🐱: `codex exec --full-auto --skip-git-repo-check -C "$(pwd)" --color never -o .plancollab/baseline.md "Analyze this project and produce a Markdown document with sections: 1. Project Overview, 2. Tech Stack, 3. Directory Structure, 4. Core Modules, 5. Architecture Patterns, 6. Key Types/Interfaces, 7. Build & Run. Be thorough but concise. Markdown only."`
- 🐱 calling 🐶: `claude -p "Analyze this project and produce a Markdown document with sections: 1. Project Overview, 2. Tech Stack, 3. Directory Structure, 4. Core Modules, 5. Architecture Patterns, 6. Key Types/Interfaces, 7. Build & Run. Be thorough but concise. Markdown only." > .plancollab/baseline.md`

## Step 3: Plan-Review Loop

Create a session directory under `.plancollab/`. Name it `{YYYY-MM-DD}-{task-keywords}` (extract 2-3 keywords from TASK, lowercase, hyphenated). Example: `2026-04-25-lru-cache`.

Set SESSION = `.plancollab/{session-name}`.
Create `{SESSION}/temp/`, `{SESSION}/plans/`, `{SESSION}/reviews/` directories.
Set ROUND = 1, AGREED_ITEMS = empty, DISCUSSION_LOG = empty.

Repeat:

### 3a: Generate Plan

The planner always generates a **complete plan** (all sections). This is the single source of truth.

**If you are the planner:** Write the plan directly. Use this structure:

```
## Plan — Round {ROUND}
### Summary
### Affected Files (table: file | action | description)
### Steps (numbered, dependency order)
### Design Decisions
### Risks
### Testing
```

**If the other agent is the planner:** Assemble the communication payload to `{SESSION}/temp/input.md` (see 3c for format), then call the other agent:
- 🐶 calling 🐱: `cat {SESSION}/temp/input.md | codex exec --full-auto --skip-git-repo-check -C "$(pwd)" --color never -o {SESSION}/temp/plan.md "You are a senior software architect. Read the task, context, consensus status, and discussion sections from stdin. Output a complete Markdown implementation plan with sections: Summary, Affected Files (table), Steps (numbered), Design Decisions, Risks, Testing. Preserve agreed sections unchanged. Revise disputed sections based on the discussion. Markdown only, no preamble."`
- 🐱 calling 🐶: `claude -p "You are a senior software architect. Read the task, context, consensus status, and discussion sections. Output a complete Markdown implementation plan with sections: Summary, Affected Files (table), Steps (numbered), Design Decisions, Risks, Testing. Preserve agreed sections unchanged. Revise disputed sections based on the discussion. Markdown only, no preamble." < {SESSION}/temp/input.md > {SESSION}/temp/plan.md`

Read `{SESSION}/temp/plan.md` and display to user.

**After plan generation:** Save full plan to `{SESSION}/plans/round-{ROUND}-cc.md` (if Claude planned) or `{SESSION}/plans/round-{ROUND}-cx.md` (if Codex planned). `cc` = Claude, `cx` = Codex, always.

### 3b: Review

**If you are the reviewer:** Evaluate the plan on completeness, correctness, feasibility, step ordering, risk coverage, and testing. Apply verdict:
- **APPROVED** — no critical or major issues
- **NEEDS_REVISION** — any critical or major issue

**If the other agent is the reviewer:** Assemble the communication payload to `{SESSION}/temp/plan.md` (see 3c for format), then call the other agent:
- 🐶 calling 🐱: `cat {SESSION}/temp/plan.md | codex exec --full-auto --skip-git-repo-check -C "$(pwd)" --color never -o {SESSION}/temp/review.md "You are a code review expert. The plan, consensus status, and discussion history are in stdin. Evaluate on: completeness, correctness, feasibility, step ordering, risks, testing. Focus on disputed sections. Verify agreed sections preserved. Output starting with VERDICT: APPROVED or VERDICT: NEEDS_REVISION. Then SUMMARY, STRENGTHS, ISSUES (with severity), SUGGESTIONS."`
- 🐱 calling 🐶: `claude -p "You are a code review expert. The plan, consensus status, and discussion history are provided. Evaluate on: completeness, correctness, feasibility, step ordering, risks, testing. Focus on disputed sections. Verify agreed sections preserved. Output starting with VERDICT: APPROVED or VERDICT: NEEDS_REVISION. Then SUMMARY, STRENGTHS, ISSUES (with severity), SUGGESTIONS." < {SESSION}/temp/plan.md > {SESSION}/temp/review.md`

Read `{SESSION}/temp/review.md`. Extract the VERDICT line. If neither APPROVED nor NEEDS_REVISION is found, treat as NEEDS_REVISION.

Display the review in a readable format.

**After review (both cases):**
1. Save full review to `{SESSION}/reviews/round-{ROUND}-cc.md` (if Claude reviewed) or `{SESSION}/reviews/round-{ROUND}-cx.md` (if Codex reviewed)
2. Reviewer produces a **consensus update** — what is now agreed, what is still disputed. This is based on the review: sections with no issues raised = agreed; sections with critical/major issues = still disputed.
3. Update AGREED_ITEMS and DISCUSSION_LOG based on the consensus update. Save to `{SESSION}/reviews/round-{ROUND}-consensus-cc.md` (if Claude reviewed) or `{SESSION}/reviews/round-{ROUND}-consensus-cx.md` (if Codex reviewed)

### 3c: Communication Payload Format

The payload sent to the other agent is a **projection** of the full plan, not the full plan itself. It is assembled differently depending on consensus state.

**Round 1 (no consensus yet):**

```
## Task
{TASK}

## Project Baseline
(contents of .plancollab/baseline.md, or lightweight context if no baseline)

## Plan
(full plan text)
```

**Round 2+ (with consensus tracking):**

```
## Task
{TASK}

## Agreed Sections (do not re-debate these)
- "{section name}" — agreed in Round N
- "{section name}" — agreed in Round N
(one line each, no full text — these are locked)

## Disputed Sections (full text from current plan)
### {section name}
(full text of this section extracted from the plan)

### {section name}
(full text of this section extracted from the plan)

## Discussion Log
Round 1: {what was discussed, what was resolved, what remains}
Round 2: {what was discussed, what was resolved, what remains}
```

**Key rules:**
- Agreed sections: one-line reference only, not re-sent in full
- Disputed sections: full text extracted from the complete plan
- Discussion log: what happened each round (not a summary of the plan itself, but of the discussion)
- The complete plan always exists on disk at `{SESSION}/plans/round-{ROUND}-cc.md` or `round-{ROUND}-cx.md` — anyone can check it

### 3d: Handle Verdict

**APPROVED:**
1. Save final plan to `{SESSION}/plan.md` (copy of the latest round's full plan)
2. Update `{SESSION}/state.json` with `"status": "approved"`
3. Tell the user the full path: `🐶 🐱 ✅ Plan APPROVED — saved to .plancollab/{session-name}/plan.md`
4. Present the final plan content to user for confirmation

**NEEDS_REVISION, ROUND < MAX_ROUNDS:**
1. Update `{SESSION}/state.json`
2. Increment ROUND, go to 3a

**NEEDS_REVISION, ROUND >= MAX_ROUNDS:**
1. **Summarize conflict points**: Review all consensus updates and identify sections that were disputed in every round. Present to user as a structured list:
   ```
   ## Unresolved Disagreements

   1. **{section/topic}**
      Table: 立场 + 让步 per agent
      Each agent's reasons as numbered list (1. 2. 3.)
      History: raised in Round N, revisited in Round M
      See: {SESSION}/reviews/round-N-{cc|cx}.md, {SESSION}/plans/round-M-{cc|cx}.md

   2. **{section/topic}**
      ...

   ## Already Agreed (table: section | round | ✅)
   ```
2. Ask the user how to proceed:
   - **逐个裁决** — user decides each conflict point, Claude updates plan accordingly and saves plan.md
   - **继续讨论** — increase MAX_ROUNDS (ask by how many), agents keep negotiating from where they left off
   - **接受当前版本** — save latest plan as plan.md as-is

## Error Handling

| Error | Action |
|-------|--------|
| Other agent not available | Tell user, stop |
| Other agent non-zero exit | Show output, offer: retry / you take over that role / abort |
| Empty output | Offer: retry / switch roles |
| Timeout (5 min) | Offer: retry / switch roles |
| No VERDICT in review | Grep for APPROVED/NEEDS_REVISION in raw text; if not found, treat as NEEDS_REVISION |

## State Persistence

Persisted to `.plancollab/`:

**Global (shared across sessions):**
- `config.json` — user preferences (`auto_review` setting)
- `baseline.md` — project architecture baseline (reusable)

**Per session (under `{YYYY-MM-DD}-{task-keywords}/`):**
- `state.json` — updated after every round
- `plan.md` — saved on APPROVED (session root, not in plans/)
- `plans/round-N-cc.md` or `plans/round-N-cx.md` — full plan (cc=Claude, cx=Codex)
- `reviews/round-N-cc.md` or `reviews/round-N-cx.md` — full review
- `reviews/round-N-consensus-cc.md` or `reviews/round-N-consensus-cx.md` — consensus
- `temp/` — Codex CLI communication intermediates (overwritten each round)

`state.json` format:
```json
{
  "session": "2026-04-25-lru-cache",
  "task": "用 ts 实现一个 lru cache",
  "roles": { "planner": "claude", "reviewer": "codex" },
  "max_rounds": 3,
  "current_round": 2,
  "status": "in_progress",
  "baseline": "scanned",
  "created_at": "2026-04-25T10:30:00Z",
  "updated_at": "2026-04-25T10:35:00Z",
  "agreed": ["Summary", "Affected Files", "Testing"],
  "disputed": ["Design Decisions", "Steps"],
  "rounds": [
    {
      "round": 1,
      "verdict": "NEEDS_REVISION",
      "timestamp": "2026-04-25T10:31:00Z",
      "plan": "plans/round-1-cc.md",
      "review": "reviews/round-1-cx.md",
      "consensus": "reviews/round-1-consensus-cx.md"
    },
    {
      "round": 2,
      "verdict": "NEEDS_REVISION",
      "timestamp": "2026-04-25T10:34:00Z",
      "plan": "plans/round-2-cc.md",
      "review": "reviews/round-2-cx.md",
      "consensus": "reviews/round-2-consensus-cx.md"
    }
  ]
}
```

## Session Management

**list** (`/plancollab list` or "list plans" or "show all sessions"):

Scan `.plancollab/` for directories containing `state.json`, display as table:

| # | Task | Status | Rounds | 🐶/🐱 | Updated |
|---|------|--------|--------|--------|---------|
| 1 | 用 ts 实现 lru cache | ✅ approved | 2/3 | 🐶→🐱 | 04-25 10:35 |
| 2 | 实现用户认证 | 🔄 in_progress | 2/3 | 🐶→🐱 | 04-25 11:20 |
| 3 | 重构 session 模块 | ⚡ conflict | 3/3 | 🐱→🐶 | 04-24 16:00 |

If no sessions exist, say "No collaboration sessions found."

**status** (`/plancollab status`):

If only one in-progress session, show its details (task, roles, round, agreed/disputed lists). If multiple, show the list table above and ask which one.

**resume** (`/plancollab resume`):

If only one in-progress session, resume it. If multiple, show the list table and ask which one. Read `{SESSION}/state.json` and consensus files to restore state.

**delete** (`/plancollab delete` or "delete plan" or "clean up sessions"):

Show the list table, then ask user:
- Delete by number: "delete 2" or "delete 1,3"
- Delete all: "delete all"
- Delete by status: "delete all approved" / "delete all conflict"

Before deleting, confirm: "Delete session '{session-name}'? This removes all plans, reviews, and state. (y/n)"
Delete means `rm -rf` the session directory under `.plancollab/`.
