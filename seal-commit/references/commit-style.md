# Commit Style Reference (seal-commit)

## Types (recommended)
- feat: new user-facing capability
- fix: bug fix
- refactor: internal change without behavior change
- perf: performance improvement
- docs: documentation only
- test: test only
- build: build system/dependencies
- ci: CI pipeline changes
- chore: maintenance tasks

Pick the most accurate one based on the diff.

## Scope guidance
Use scope when the file paths strongly suggest a module:
- examples:
  - `feat(wallet): ...` for `src/wallet/*`
  - `fix(api): ...` for `packages/api/*`
  - `refactor(ui): ...` for `components/*`

If multiple modules, either:
- omit scope, or
- choose the primary module (the one with the most meaningful change)

## Subject writing rules
- Imperative: "Add", "Fix", "Refactor", "Remove", "Handle"
- Be concrete: name the behavior or component
- Avoid: "update", "misc", "wip"

## Breaking change cues (from diff)
Potential breaking change indicators:
- Removed exports / renamed public APIs
- Changed function signatures used elsewhere
- Config format changes
- Behavior change that requires callers to adapt

If detected:
- Use `type(scope)!: subject`
- Mention a short breaking note in the detail list

## How to pick the best message
Since the commit message is auto-generated (no user selection), aim for:
- **Accuracy**: the subject must truthfully describe the primary intent of the change
- **Specificity**: name the feature/component/behavior, not generic "update code"
- **User-facing framing when possible**: prefer describing what the user gains over internal mechanics
- **Technical framing for refactors**: when no user-facing change, describe the architectural improvement
