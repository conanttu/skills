# okta-skill

An AI coding assistant skill for automated Okta SSO login. Authenticates via Okta API with Push MFA, then injects session cookies via agent-browser to log into internal tools.

## Features

- **Auto-login** -- one command to authenticate and open any configured environment
- **Multi-project support** -- configure multiple projects with multiple environments each
- **Session caching** -- reuses valid sessions to skip re-authentication
- **Zero-config setup** -- only username and password needed, everything else is auto-detected

## Directory Structure

```
okta-skill/
├── SKILL.md              # Skill definition
├── config.example.json   # Config template (copy to config.json)
├── config.json           # Your config (git-ignored, contains credentials)
├── .gitignore            # Excludes config.json and session cache
├── .session-cache.json   # Cached session (auto-generated, git-ignored)
├── scripts/
│   └── cli.js           # Main authentication script
├── evals/
│   └── evals.json        # Evaluation test cases
├── README.md             # This file
└── README.cn.md          # Chinese documentation
```

## Setup

The easiest way to set up is to just say:

> "Help me login to https://my-app.qa.example.com/"

The skill will:
1. Open the URL, auto-detect the Okta domain from the redirect
2. Ask you for username and password (only input needed)
3. Auto-infer project name and environment from the URL
4. Write `config.json` and auto-discover MFA factor ID
5. Complete the login (Push notification — tap your phone)

Alternatively, set up manually:

1. Copy the config template:
   ```bash
   cp config.example.json config.json
   chmod 600 config.json
   ```

2. Edit `config.json` with your Okta credentials and project URLs.

3. Get your Push MFA factor ID:
   ```bash
   node scripts/cli.js --list-factors
   ```


## Configuration

```json
{
  "username": "your.name@company.com",
  "password": "your_password",
  "okta_domain": "yourcompany.okta.com",
  "push_factor_id": "opfXXXXXXXXXXXXXX",
  "projects": {
    "my-app": {
      "dev": "https://my-app.dev.example.com/login",
      "qa": "https://my-app.qa.example.com/login",
      "prod": "https://my-app.example.com/login"
    }
  }
}
```

- **username/password** -- shared Okta credentials for all projects
- **projects** -- each project has named environments mapping to login URLs

## Usage

| Command | Description |
|---------|-------------|
| `/okta --project my-app --env qa` | Login to specific project + environment |
| `/okta --url https://app.example.com/login` | Direct URL login |
| `/okta --project my-app --env qa --save` | Login and save browser session |
| `/okta --list-factors` | List MFA factor IDs |

## Dependencies

- `node` (18+)
- `agent-browser` (`npm install -g agent-browser`)

## Security

- `config.json` contains credentials and is excluded from git via `.gitignore`
- Set file permissions: `chmod 600 config.json`
- Session cache is also git-ignored
- Password is filtered from all script output
