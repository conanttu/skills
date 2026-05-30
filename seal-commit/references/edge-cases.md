# Edge Cases Handling (Strict allowlist)

## 1) git diff is empty
- Say: "No changes detected to commit."
- Stop (do not run add/commit).

## 2) Conflicts after stash apply
Allowed actions:
- `git status`
- `git diff`
- Read files to identify conflict markers

What to say:
- Explain conflicts exist (based on status output)
- Point out conflicted files
- Do NOT attempt to resolve via forbidden git commands
- Ask user to resolve conflicts manually, then come back and rerun the flow

## 3) Commit fails
- Show the git commit error output
- Suggest likely reasons in plain language:
  - nothing to commit
  - hooks failing
  - message format rejected
  - unresolved conflicts
- Do NOT run additional git commands beyond allowlist
