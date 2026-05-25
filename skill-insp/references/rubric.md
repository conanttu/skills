# Skill Insp Rubric

Scoring framework for skill analysis. Total: 100 points.

## Report Order

1. Overall assessment
2. Key strengths
3. Scorecard
4. Safety & Trust
5. Recommendations: High, Medium, Low
6. Detailed mode prompt and HTML path

## Scoring Dimensions

| Dimension | Points | What Good Looks Like |
| --- | ---: | --- |
| Structure | 10 | Valid `SKILL.md`, clean frontmatter, sensible folders, useful README if present |
| Triggering | 15 | `description` says what the skill does and when to use it with realistic trigger contexts |
| Usability | 15 | Clear workflow, concrete steps, resource navigation, usable outputs |
| Completeness | 15 | Covers core cases, inputs/outputs, failure handling, dependencies, edge cases |
| Progressive Disclosure | 10 | `SKILL.md` stays lean, details move to references, resources are discoverable |
| Testability | 10 | Success criteria, evals, validation scripts, or clear ways to verify outputs |
| Maintainability | 10 | Minimal duplication, no stale placeholders, clear names, extensible organization |
| Safety & Trust | 15 | Transparent permissions, no secret leakage, endpoints disclosed, scripts reviewed |

## Priority Levels

**High**: prevents use, causes serious mis-triggering, creates meaningful safety risk, or breaks the core workflow.

**Medium**: noticeably improves reliability or clarity but does not block safe basic use.

**Low**: polish, human orientation, optional examples, naming cleanup, or README suggestions.

## Compactness Rules

- Prefer replacing vague text over adding new sections
- Prefer a one-sentence disclosure over a generic safety chapter
- Prefer references for long details
- Prefer scripts for deterministic behavior
- Do not recommend safety boilerplate unless the skill performs risky operations
- Missing README is Low priority only

## README Rule

`README.md` is optional. If missing, suggest as Low priority. If present, flag only when it conflicts with `SKILL.md`, repeats too much, or contains risky information.

## Safety Analysis Guidance

This is where semantic understanding matters most. When analyzing safety:

1. **Read the actual code**, not just patterns. Understand what the code does in context.
2. **Distinguish documentation from execution**. A SKILL.md that says "check for `rm -rf`" is not itself dangerous.
3. **Check disclosure**. A script that calls an API is fine if SKILL.md discloses it. Undisclosed network access is a finding.
4. **Assess real risk**. A test fixture that creates and deletes temp files is not the same as `rm -rf /`.
5. **Use cautious language**. Say "possible", "appears", or "needs review" for ambiguous cases.

Safety subdimensions:
1. Permission boundaries: high privileges, system paths, production systems
2. Sensitive information: secrets, tokens, credentials, private keys
3. Network access: endpoints, protocols, disclosed vs hidden
4. Destructive actions: delete, overwrite, git reset, DB drops
5. External dependencies: downloads, installers, supply chain
6. Script execution: injection, eval/exec, unsafe parsing
7. Prompt injection: hidden behavior, ignoring instructions
8. Transparency: user confirmation, disclosed side effects

## Apply and Revert

Apply only after explicit user request. Default to High-priority suggestions. Back up only changed files. Revert only the latest apply and only when current hashes match recorded after-hashes.
