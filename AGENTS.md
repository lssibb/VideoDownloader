# Agent Instructions for VideoDownloader

This project uses **Superpowers** — a workflow system for AI coding assistants that enforces best practices like Test-Driven Development (TDD), systematic debugging, structured planning, and subagent-driven development.

## Custom Agents (Superpowers)

Project-level agents are configured in `.kimi/agents/superpowers/`:

| Agent | Purpose | File |
|-------|---------|------|
| `superpowers` | Base agent with mandatory superpowers rules | `agent.yaml` + `system.md` |
| `superpowers/coder` | Subagent for non-trivial coding tasks | `coder.yaml` |
| `superpowers/explore` | Read-only exploration subagent | `explore.yaml` |
| `superpowers/plan` | Planning and architecture analysis subagent | `plan.yaml` |

To use: `kimi --agent superpowers` or invoke `/agent superpowers` in interactive mode.

## How to Use Superpowers in Kimi Code CLI

Kimi does not have a native `Skill` tool. To invoke a skill, you **MUST** use the `ReadFile` tool to read the skill's `SKILL.md` file from `.agents/skills/<skill-name>/SKILL.md`. After reading the skill content, follow its instructions exactly.

### Mandatory First Step

Before responding to the user's first message in any conversation, you **MUST** use `ReadFile` to read `.agents/skills/using-superpowers/SKILL.md`. Then, if any other skill might apply, use `ReadFile` to read that skill's `SKILL.md` as well. Do not skip this step.

### Available Skills

| Skill | Purpose |
|-------|---------|
| `brainstorming` | Open-ended exploration and idea generation |
| `dispatching-parallel-agents` | Running multiple subagents in parallel |
| `executing-plans` | Executing pre-written implementation plans |
| `finishing-a-development-branch` | Wrapping up feature branches |
| `receiving-code-review` | Processing code review feedback |
| `requesting-code-review` | Requesting human code review |
| `subagent-driven-development` | Complex multi-file changes using subagents |
| `systematic-debugging` | Methodical debugging of issues |
| `test-driven-development` | TDD workflow (write tests first) |
| `using-git-worktrees` | Managing multiple git worktrees |
| `using-superpowers` | **MANDATORY** — Read this FIRST before every response |
| `verification-before-completion` | Verifying work before finishing |
| `writing-plans` | Creating implementation plans |
| `writing-skills` | Creating new skills |
| `rfr` | Review-Fix-Repeat automated quality loop (after feature/fix completion) |

### Universal Workflow

- Read `workflow/UNIVERSAL_WORKFLOW.md` to understand the 7-stage Feature Development or 4-phase Debug process.
- Load `PROJECT_CONFIG.yaml` to adapt the workflow to this project's stack.

## Development Rules

### Commit Convention

All commits **MUST** be feature-based with a type prefix in parentheses:

```
(type): Description of what changed and why
```

Allowed types:

| Prefix | When to use |
|--------|-------------|
| `(feat)` | New feature or significant functionality addition |
| `(fix)` | Bug fix or correction |
| `(refactor)` | Code restructuring without behavior change |
| `(docs)` | Documentation-only changes (README, ADR, comments) |
| `(test)` | Adding or updating tests |
| `(chore)` | Build, tooling, dependency updates, config changes |
| `(style)` | Code style changes (formatting, linting) without logic change |

Examples:
```
(feat): Add IPC bridge for downloadVideo with yt-dlp spawn
(fix): Correct Prisma client path in production build
(docs): Add ADR-002 explaining cookie Netscape format choice
```

One feature / one logical change = one commit. Do not batch unrelated changes into a single commit.

### Architecture Decision Records (ADR)

Whenever an important technical decision is made during development — especially those that affect data flow, security boundaries, binary handling, IPC contracts, or database schema — it **MUST** be documented as an ADR.

- Location: `docs/adr/YYYY-MM-DD-<short-title>.md`
- Template:
  ```markdown
  # ADR-<NNN>: Title

  **Date**: YYYY-MM-DD
  **Status**: Proposed | Accepted | Deprecated | Superseded by ADR-XXX

  ## Context
  What is the issue that we're seeing that is motivating this decision?

  ## Decision
  What is the change that we're proposing or have agreed to?

  ## Consequences
  What becomes easier or more difficult to do because of this change?
  ```

Examples of decisions requiring an ADR:
- Choosing `extraResources` over `asarUnpack` for binary bundling.
- Deciding to run Prisma Client in Main Process only.
- Cookie handling strategy (Netscape format, temp file lifecycle).
- IPC channel design and security boundaries.

## Project Configuration

- `PROJECT_CONFIG.yaml` — Universal workflow configuration for this project.
- `.kimi/config.toml` — Local Kimi CLI hook configuration (auto-injects Superpowers reminder).
