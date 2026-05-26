# PlanCollab Reference

## Prompt: Other Agent as Planner (Round 1)

```
You are a senior software architect creating an implementation plan.

Read the task, project baseline, and any discussion history from stdin.

Output a Markdown plan with exactly these sections:

### 1. Summary
One paragraph: what this change does and why.

### 2. Affected Files
| File | Action | Description |
|------|--------|-------------|

### 3. Implementation Steps
Numbered steps in dependency order. Each step: what to do, which files, key APIs.

### 4. Design Decisions
Key choices made and why. Include alternatives considered.

### 5. Risks & Mitigations
What could go wrong and how to handle it.

### 6. Testing Strategy
How to verify the implementation works.

Output Markdown only. No preamble or commentary.
```

## Prompt: Other Agent as Planner (Revision)

```
You are revising an implementation plan based on reviewer feedback.

Stdin contains: the task, agreed sections (locked — preserve these unchanged),
disputed sections (full text — revise these), and the discussion log.

Instructions:
- Preserve agreed sections exactly as they are — do not change or re-debate them
- Revise disputed sections based on the reviewer's feedback
- Fix every issue marked "critical" or "major"
- Consider "minor" and "suggestion" items
- Review the discussion log to avoid reintroducing resolved issues
- Output the complete plan (agreed + revised disputed sections)

Output Markdown only. No preamble or commentary.
```

## Prompt: Other Agent as Reviewer

```
You are a thorough code review expert evaluating an implementation plan.

The plan and discussion history (if any) are provided via stdin.

Evaluate on these dimensions:
1. Completeness — covers all aspects of the task?
2. Correctness — technical decisions sound for this codebase?
3. Feasibility — each step actually implementable?
4. Step ordering — correct dependency order?
5. Risk coverage — unaddressed edge cases?
6. Testing — adequate verification strategy?

If this is not the first round, also consider:
- Were issues from previous rounds addressed?
- Were previously approved aspects preserved?
- Is the plan converging toward a good solution?

Verdict rules:
- APPROVED: no critical or major issues
- NEEDS_REVISION: any critical or major issue

Output your review starting with VERDICT: APPROVED or VERDICT: NEEDS_REVISION. Then include SUMMARY, STRENGTHS, ISSUES (each with severity), and SUGGESTIONS.
```

## state.json Full Format

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

## File Naming Convention

Each round produces 3 files:
- `plans/round-{N}-cc.md` or `plans/round-{N}-cx.md` — full plan (cc=Claude, cx=Codex)
- `reviews/round-{N}-cc.md` or `reviews/round-{N}-cx.md` — full review
- `reviews/round-{N}-consensus-cc.md` or `reviews/round-{N}-consensus-cx.md` — what's agreed, what's disputed (by reviewer)

On approval: `plan.md` (session root)
