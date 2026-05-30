# Examples (seal-commit)

## File Selection Examples

### Example: Committing all files
```
📝 Changed files:
1. src/auth.ts (modified)
2. src/api.ts (modified)
3. tests/auth.test.ts (new file)
4. README.md (modified)

❓ Which files do you want to commit?
User: all

✅ Will commit 4 file(s)
```

### Example: Committing specific files
```
📝 Changed files:
1. src/auth.ts (modified)
2. src/api.ts (modified)
3. tests/auth.test.ts (new file)
4. README.md (modified)
5. package.json (modified)

❓ Which files do you want to commit?
User: 1,3,5

✅ Will commit 3 file(s):
- src/auth.ts
- tests/auth.test.ts
- package.json
```

### Example: Partial commit workflow
When you want to split changes into multiple commits:
- First commit: `1,2` (implementation files)
- Second commit: `3,4` (tests and docs)

---

## Commit Message Examples

## Example 1 — feature
A) feat(auth): add passkey sign-in entrypoint
B) feat(auth): support WebAuthn passkey login flow
C) refactor(auth): extract passkey helpers for reuse

## Example 2 — fix
A) fix(api): handle null token in request guard
B) fix(api): prevent crash when token is missing
C) refactor(api): tighten request guard validation

## Example 3 — refactor
A) refactor(trading): simplify PnL aggregation pipeline
B) refactor(trading): reduce duplicated aggregation logic
C) perf(trading): cut redundant scans in PnL aggregation
