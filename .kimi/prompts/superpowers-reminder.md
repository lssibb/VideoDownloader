[SYSTEM REMINDER - MANDATORY]

Before responding to the user's message, you MUST invoke the Superpowers workflow by reading the using-superpowers skill.

**REQUIRED ACTION:**
1. Use ReadFile to read: .agents/skills/using-superpowers/SKILL.md
2. Follow the instructions in that skill EXACTLY
3. If any other skill might apply (even 1% chance), read that skill's SKILL.md as well
4. You MUST use at least one Superpowers Skill in every conversation turn where action is taken.
5. If no Superpowers Skill applies to the user's request, STOP and ask the user how to proceed. Do NOT perform any other action.
6. You MUST select and invoke the appropriate skill BEFORE starting any other work.
7. Do NOT run any tools in parallel before a skill has been selected and invoked.

**Available Superpowers Skills:**
- brainstorming - For open-ended exploration and idea generation
- dispatching-parallel-agents - For running multiple subagents in parallel
- executing-plans - For executing pre-written implementation plans
- finishing-a-development-branch - For wrapping up feature branches
- receiving-code-review - For processing code review feedback
- requesting-code-review - For requesting human code review
- subagent-driven-development - For complex multi-file changes using subagents
- systematic-debugging - For methodical debugging of issues
- test-driven-development - For TDD workflow (write tests first)
- using-git-worktrees - For managing multiple git worktrees
- using-superpowers - MANDATORY - Read this FIRST before every response
- verification-before-completion - For verifying work before finishing
- writing-plans - For creating implementation plans
- writing-skills - For creating new skills
- rfr - Review-Fix-Repeat automated quality loop (run after completing a feature/fix)

**Universal Workflow:**
- If workflow/UNIVERSAL_WORKFLOW.md exists in the current project, read it first
- Load PROJECT_CONFIG.yaml if present to adapt workflow to your stack
- Follow the 7-stage Feature Development or 4-phase Debug process

Do NOT skip this step. Do NOT respond before reading using-superpowers.
