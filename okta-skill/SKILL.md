---
name: okta-skill
description: >
  Okta SSO auto-login via Push MFA. Use this skill whenever the user needs to log in to any environment, mentions Okta/SSO authentication, or wants to open any internal tool requiring SSO. Trigger for requests like "login to QA", "okta login dev", "log into my-app", "authenticate to project X", or "switch to prod environment" — even without explicit /okta mention.
  
  Also use this skill to HELP USERS SET UP their config.json configuration interactively — auto-detect Okta domain from URL redirect, collect credentials, and write the config file automatically.
argument-hint: "[--project <name>] [--env <name>] [--url <url>] [--save]"
compatibility: Requires node (18+) and agent-browser. config.json is auto-generated on first use.
---

# Okta SSO Auto-Login Skill

Authenticate via Okta API + Push MFA, then inject session cookie via agent-browser.

## Instructions

When this skill is invoked, execute the helper script:

```bash
node <skill-dir>/scripts/cli.js $ARGUMENTS
```

---

## AI-Guided Setup

If `<skill-dir>/config.json` doesn't exist or the user asks to set up Okta login, **automate everything — only ask the user for username and password**.

### Step 1: Auto-detect Okta domain

The user provides a target URL (e.g. "help me login to https://my-app.qa.example.com/"). Open it with agent-browser:

```bash
agent-browser open "<user-provided-url>" --session okta-setup
```

The app will redirect to the Okta login page. Extract the Okta domain from the redirect URL:

```bash
agent-browser get url --session okta-setup
# Example: https://yourcompany.okta.com/login/login.htm?...
# Extract: yourcompany.okta.com
```

### Step 2: Ask username and password

This is the **only user input required**. Ask for:
1. Username (email)
2. Password

### Step 3: Auto-infer project and environment

Infer from the user-provided URL — do NOT ask the user:
- **Project name**: extract from hostname (e.g. `https://admin-panel.qa.example.com/` → `admin-panel`)
- **Environment name**: extract from URL pattern (e.g. `qa.example.com` → `qa`, `dev.example.com` → `dev`, `example.com` → `prod`; or fall back to the subdomain segment)

### Step 4: Write config

**IMPORTANT**: Use `cli.js --write-config` to write config via stdin. Do NOT use the Write/Edit tool — this avoids file edit permission prompts. The command merges into existing config if present.

```bash
echo '{"username":"<collected>","password":"<collected>","okta_domain":"<auto-detected>","push_factor_id":"","projects":{"<inferred-project>":{"<inferred-env>":"<user-provided-url>"}}}' | node <skill-dir>/scripts/cli.js --write-config
```

### Step 5: Auto-discover and save push_factor_id

Run `--list-factors`, parse the output, and auto-select the factor with `type=push provider=OKTA`:

```bash
node <skill-dir>/scripts/cli.js --list-factors
```

Parse the output, find the push factor ID, and save it to config:

```bash
echo '{"push_factor_id":"<auto-selected push factor id>"}' | node <skill-dir>/scripts/cli.js --write-config
```

### Step 6: Login

Run the login command. The script will send a Push notification — the user just taps their phone:

```bash
node <skill-dir>/scripts/cli.js --project <name> --env <name>
```

Inform the user: "Push notification sent to your phone, please approve."

### Adding more projects/environments

When the user provides a new URL later, read the existing `config.json`, auto-infer project/environment from the URL, add the entry, and write it back. No need to re-collect credentials or Okta domain.

---

## Usage

```bash
/okta --project my-app --env qa          # Specific project + env
/okta --project my-app --env dev
/okta --url https://app.example.com/login  # Direct URL
/okta --project my-app --env qa --save   # Login + save browser session
/okta --list-factors                     # Find MFA factor IDs
```

---

## Configuration (`<skill-dir>/config.json`)

Copy `config.example.json` to `config.json` and fill in your details.

```json
{
  "username": "your.name@company.com",
  "password": "your_password",
  "okta_domain": "yourcompany.okta.com",
  "push_factor_id": "opfXXXXXXXXXXXXXX",
  "projects": {
    "my-app": {
      "dev":  "https://my-app.dev.example.com/login",
      "qa":   "https://my-app.qa.example.com/login",
      "prod": "https://my-app.example.com/login"
    },
    "admin-panel": {
      "qa":   "https://admin.qa.example.com/login",
      "prod": "https://admin.example.com/login"
    }
  }
}
```

**Security**: `config.json` is excluded from version control via `.gitignore`. Set permissions to `chmod 600 config.json`.

---

## Options

| Option | Description |
|--------|-------------|
| `--project <name>` | Target project (required if multiple projects configured) |
| `--env <name>` | Target environment (required if multiple environments configured) |
| `--url <url>` | Direct URL override (skips project/env lookup) |
| `--save` | Save browser session state after login |
| `--list-factors` | List MFA factor IDs |
| `--timeout <sec>` | Push MFA polling timeout (default: 120) |

---

## Technical Flow

```
config.json
    |
[Check cached session] -> valid -> inject cookie -> navigate -> done
    | expired
POST /api/v1/authn -> stateToken
    |
Push MFA (phone tap)
    |
POST /api/v1/sessions -> sessionId (cached)
    |
agent-browser inject sid cookie -> open target URL
    |
done
```
