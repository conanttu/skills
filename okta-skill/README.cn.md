# okta-skill

一个 AI 编程助手 Skill，用于自动化 Okta SSO 登录。通过 Okta API + Push MFA 完成认证，然后使用 agent-browser 注入 session cookie 登录内部工具。

## 功能

- **自动登录** -- 一条命令完成认证并打开配置的环境
- **多项目支持** -- 配置多个项目，每个项目多个环境
- **Session 缓存** -- 复用有效 session，跳过重复认证
- **零配置上手** -- 只需提供用户名和密码，其他全部自动检测

## 目录结构

```
okta-skill/
├── SKILL.md              # Skill 定义
├── config.example.json   # 配置模板（复制为 config.json）
├── config.json           # 你的配置（git 忽略，包含凭据）
├── .gitignore            # 排除 config.json 和 session 缓存
├── .session-cache.json   # 缓存的 session（自动生成，git 忽略）
├── scripts/
│   └── cli.js           # 主认证脚本
├── evals/
│   └── evals.json        # 评估测试用例
├── README.md             # 英文说明
└── README.cn.md          # 中文说明（本文件）
```

## 配置

最简单的方式是直接说：

> "帮我登录 https://my-app.qa.example.com/"

Skill 会：
1. 打开 URL，从重定向中自动检测 Okta 域名
2. 问你用户名和密码（唯一需要输入的内容）
3. 从 URL 自动推断项目名和环境名
4. 写入 `config.json` 并自动发现 MFA factor ID
5. 完成登录（Push 通知 — 手机点一下）

也可以手动配置：

1. 复制配置模板：
   ```bash
   cp config.example.json config.json
   chmod 600 config.json
   ```

2. 编辑 `config.json`，填入你的 Okta 凭据和项目 URL。

3. 获取 Push MFA factor ID：
   ```bash
   node scripts/cli.js --list-factors
   ```


## 配置文件格式

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

- **username/password** -- 所有项目共用的 Okta 凭据
- **projects** -- 每个项目包含多个环境，环境名映射到登录 URL

## 使用方式

| 命令 | 说明 |
|------|------|
| `/okta --project my-app --env qa` | 登录指定项目的指定环境 |
| `/okta --url https://app.example.com/login` | 直接 URL 登录 |
| `/okta --project my-app --env qa --save` | 登录并保存浏览器 session |
| `/okta --list-factors` | 列出 MFA factor ID |

## 依赖

- `node`（18+）
- `agent-browser`（`npm install -g agent-browser`）

## 安全

- `config.json` 包含凭据，通过 `.gitignore` 排除在版本控制之外
- 设置文件权限：`chmod 600 config.json`
- Session 缓存同样被 git 忽略
- 脚本输出中的密码会被过滤
