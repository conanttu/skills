# PlanCollab：让两个 AI Agent 互相做计划和 Review

> 版本 1.0.0 | 适用于 Claude Code + Codex

## 这是什么

PlanCollab 是一个 Agent Skill，让 Claude Code（🐶）和 Codex（🐱）在同一个项目中协作——一个出方案，另一个审查，自动迭代直到达成共识，或者把分歧提交给你裁决。

核心理念：**用不同模型家族的"对抗性协作"来提升方案质量。**

## 解决什么问题

单个 AI 出方案容易有盲区——它不会质疑自己的决策。让第二个 AI 来 review，能暴露：
- 技术选型的替代方案没被考虑
- 步骤遗漏或依赖顺序错误
- 风险评估不充分
- 测试策略覆盖不全

两个不同模型家族（Claude 和 GPT）的视角差异越大，review 的价值越高。

## 使用方式

### 手动触发

```
/plancollab 实现用户认证模块
```

就这一行。默认当前 agent 做计划，对方做 review。

### 自动触发

正常和 AI 讨论需求，当它生成了一个较复杂的方案时，会自动问你：

> "我刚生成了一个实现方案，要让对方 review 吗？"

选"总是"之后，后续不再问。

### 管理已有方案

```
/plancollab list          # 列出所有方案
/plancollab status        # 查看当前进度
/plancollab resume        # 恢复中断的协作
/plancollab delete        # 删除指定方案
```

也可以用自然语言："列出所有计划"、"删除第 2 个"。

## 核心流程

```
你提出需求
    ↓
Baseline 检查（首次扫描项目架构，后续复用）
    ↓
┌─ 🐶 出方案 ──────────────────────────────┐
│    ↓                                      │
│ 🐱 Review（自动进行）                      │
│    ↓                                      │
│ 达成一致的部分锁定，分歧部分继续讨论          │
│    ↓                                      │
│ 通讯时只传分歧部分（已一致的一行带过）         │
│    ↓                                      │
│ 下一轮只聚焦分歧 ────────────────────────→┘
    ↓
结果：达成共识 / 提交冲突给你裁决
```

### 关键设计

**投影通讯**：每轮传给对方的不是完整方案，而是一个"投影"——已经达成一致的部分只用一行结论带过，仍在分歧的部分才传全文。这样随着共识增加，通讯量递减，不会因为多轮讨论导致 context 溢出。

**共识追踪**：每轮 review 后产出一份 consensus 文件，记录哪些 section 已达成一致、哪些仍在争。这驱动了投影通讯和冲突提炼。

**讨论日志**：记录每轮讨论了什么、解决了什么、还剩什么。不是方案内容的摘要，而是讨论过程的记录。下一轮的 reviewer 通过它了解对话脉络，避免重复提出已解决的问题。

## 冲突处理

如果 3 轮（默认）讨论后仍未完全一致，PlanCollab 会：

1. 提炼出具体的分歧点
2. 用表格展示双方立场和让步记录
3. 用有序列表展示双方理由
4. 引用原始文件供你查证

示例：

```
🐶 ⚡ 🐱 3 轮讨论未达成完全一致，需要你来裁决。

1. Token 存储方式

|        | 🐶 Claude              | 🐱 Codex                          |
|--------|------------------------|------------------------------------|
| 立场   | httpOnly cookie         | localStorage                       |
| 让步   | Round 2 加了 SameSite   | Round 3 承认安全性但认为过度设计     |

🐶 理由：
1. XSS 无法读取 cookie，天然防护
2. 配合 SameSite=Strict 防 CSRF
3. 服务端可控过期，强制登出更可靠

🐱 理由：
1. 实现简单，不需要后端配合 set-cookie
2. 跨域场景下 cookie 有 SameSite 限制
3. 配合短过期 + refresh token 风险可控

文件：plans/round-3-cc.md, reviews/round-3-cx.md
```

你可以选择：
- **逐个裁决** — 对每个分歧点做决定
- **继续讨论** — 让它们再聊几轮
- **接受当前版本** — 直接用最新的方案

## 双向支持

PlanCollab 同时支持从 Claude Code 和 Codex 两侧发起：

| 环境 | 默认角色 | 调用对方 |
|------|---------|---------|
| 在 Claude Code 中 | 🐶 出方案，🐱 review | `codex exec` |
| 在 Codex 中 | 🐱 出方案，🐶 review | `claude -p` |

Skill 启动时通过 `$CLAUDECODE` 环境变量自动检测当前环境，用户无感。

角色可以随时切换——说"swap roles"或"让对方做计划"。

## 文件结构

每次协作产生一个 session 目录，所有历史自动保留：

```
.plancollab/
├── config.json                    # 用户偏好（auto_review）
├── baseline.md                    # 项目架构基线（跨 session 复用）
├── 2026-04-25-lru-cache/          # 一次协作
│   ├── state.json                 # 状态（轮次、共识、时间戳、文件路径）
│   ├── plan.md                    # 最终达成一致的方案
│   ├── plans/
│   │   ├── round-1-cc.md          # 🐶 的第 1 轮方案
│   │   └── round-2-cc.md          # 🐶 的第 2 轮方案（修改后）
│   └── reviews/
│       ├── round-1-cx.md          # 🐱 的第 1 轮 review
│       ├── round-1-consensus-cx.md # 共识：哪些一致、哪些分歧
│       └── round-2-cx.md
└── 2026-04-25-auth/               # 另一次协作
    └── ...
```

文件命名规则：`-cc` = Claude 产出，`-cx` = Codex 产出。看文件名就知道谁写的。

## 标识系统

全程使用固定标识，让你一眼知道谁在说话：

- 🐶 = Claude（永远）
- 🐱 = Codex（永远）

关键节点的输出示例：

```
🐶 🐱 PlanCollab Started
Task:     实现用户认证模块
Planner:  🐶 Claude
Reviewer: 🐱 Codex
Rounds:   max 3
```

```
🐶 Claude generating plan...
Sending plan to 🐱 Codex for review...
🐱 Codex review received
🐶 🐱 Agreed: Summary, Affected Files
🐶 ⚡ 🐱 Disputed: Design Decisions
```

```
🐶 🐱 PlanCollab Ended
Result:  ✅ approved
Rounds:  2/3
Final:   .plancollab/2026-04-25-auth/plan.md
```

## Baseline：项目理解

首次使用时，PlanCollab 会扫描项目生成一份架构基线（`.plancollab/baseline.md`），包含：

1. 项目概览
2. 技术栈
3. 目录结构
4. 核心模块及职责
5. 架构模式
6. 关键类型/接口
7. 构建与运行方式

后续使用直接复用，不重复扫描。你也可以要求重新扫描。

## 部署

Skill 遵循 Agent Skills 开放标准，一份文件同时服务 Claude Code 和 Codex：

```bash
# 已在 Claude Code 的 skills 目录
.claude/skills/plancollab/

# 软链到 Codex 的 skills 目录
ln -s ~/.claude/skills/plancollab ~/.agents/skills/plancollab
```

前提：`codex` CLI 和 `claude` CLI 都已安装并在 PATH 中。

## 与传统 Code Review 的区别

| | 传统 Code Review | PlanCollab |
|--|-----------------|-----------|
| 审查对象 | 代码 | 实现方案（代码之前） |
| 审查者 | 人 | 另一个 AI Agent |
| 迭代方式 | 人工来回 | 自动多轮讨论 |
| 共识管理 | 心里记着 | 文件化的 consensus 追踪 |
| 冲突处理 | 线���沟通 | 结构化展示 + 用户裁决 |
| 历史记录 | 在 PR comments 里 | 独立的 session 目录，完整保留 |

## 局限

- 方案质量取决于两个模型的能力和 baseline 的准确度
- 多轮讨论会消耗 token，复杂任务可能比较贵
- 对方通过 CLI 冷启动，没有当前对话上下文，只能靠传入的 payload 理解背景
- 不负责执行代码——只产出方案，执行由用户决定
