# Skills

A collection of reusable prompt-driven modules that extend AI agents with specialized capabilities.

## What is a Skill?

A skill is a self-contained folder with a `SKILL.md` that defines a workflow for AI agents. Skills can include reference docs, scripts, eval scenarios, and asset files. They are invoked automatically by trigger phrases or explicitly by name.

## Available Skills

| Skill | Description | Version | Prerequisites |
|---|---|---|---|
| [plancollab](./plancollab/) | Cross-agent planning and review between Claude Code and Codex — one agent creates implementation plans, the other reviews them, iterating until consensus is reached | 1.0.0 | `codex` CLI, `claude` CLI |
| [skill-insp](./skill-insp/) | Evaluate, inspect, and improve skill folders — producing a scored report with safety analysis and actionable recommendations | 1.0.0 | - |

> Version in this table should match the `metadata.version` field in each skill's `SKILL.md`. Update both when releasing.

## Installation

### Using npx skills (Recommended)

Install skills from this repository:

```bash
# Install a specific skill globally
npx skills add conanttu/skills/<skill-name> -g -y

# Examples:
npx skills add conanttu/skills/skill-insp -g -y
npx skills add conanttu/skills/plancollab -g -y
```

Or search and browse available skills:

```bash
npx skills find inspection
```

Browse all skills at: https://skills.sh/

### Manual Installation

Copy a skill folder into your agent's skills directory:

```bash
# Generic
cp -r <skill-name> /path/to/your/agent/skills/

# Example
cp -r skill-insp ~/.claude/skills/
```

Or clone the entire repo and symlink what you need:

```bash
git clone https://github.com/conanttu/skills.git
cd skills

# Symlink to Claude Code
ln -s $(pwd)/<skill-name> ~/.claude/skills/<skill-name>

# For plancollab: also symlink to Codex for bidirectional support
ln -s $(pwd)/plancollab ~/.agents/skills/plancollab
```

## Skill Structure

Each skill follows a standard layout:

```
skill-name/
├── SKILL.md              # Core workflow and instructions (required)
├── README.md             # Human-readable overview
├── references/           # Detailed rules, schemas, rubrics
│   └── reference.md
├── docs/                 # Additional documentation
│   └── product-guide-zh.md
├── scripts/              # Deterministic helper scripts
├── assets/               # Templates, static files
└── evals/                # Validation scenarios
    └── evals.json
```

Only `SKILL.md` is required. Add the other directories when the skill grows enough to need them.

## Contributing

### Adding a New Skill

1. **Folder name**: lowercase kebab-case under the repo root (e.g. `code-review`, `db-migrate`). Should match `name` in the SKILL.md frontmatter.
2. **SKILL.md**: required, with YAML frontmatter containing at minimum:
   - `name` — must match the folder name
   - `description` — what the skill does AND when to trigger it (include realistic trigger phrases)
   - `metadata.version` — semver, start at `1.0.0`
   - `allowed-tools` — minimal scope; prefer glob-restricted `Bash(cmd *)` patterns over unrestricted `Bash`
3. **README.md**: a human-oriented overview (not duplicating SKILL.md). Include usage examples and requirements.
4. **evals/evals.json**: at least one scenario covering the happy path. Add edge cases as you go.
5. **Self-review**: run [`skill-insp`](./skill-insp/) against your skill before opening a PR.
6. **Update the table** in this README with your skill's row and version.

### Versioning

- Each skill versions independently via `metadata.version` in its SKILL.md.
- Follow semver: bump patch for fixes, minor for additions, major for breaking changes to the workflow or output schema.
- Keep the version in this README's table in sync.

### PR Checklist

- [ ] Folder name matches `name` in SKILL.md
- [ ] SKILL.md frontmatter is valid (name, description, version, allowed-tools)
- [ ] At least one eval scenario exists
- [ ] `skill-insp` score is acceptable (no high-priority safety findings)
- [ ] README table updated
- [ ] License header / attribution preserved if adapted from another skill

### Conventions

- **No secrets** in any file (including evals).
- **No network access** unless disclosed in SKILL.md and necessary for the skill's function.
- **Cache outputs** go under each skill's `cache/` directory and are gitignored.
- **Prefer references over long SKILL.md** — keep SKILL.md focused on the workflow.

## License

MIT — see [LICENSE](./LICENSE).
