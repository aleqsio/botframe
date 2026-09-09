@AGENTS.md

Claude Code specifics

- Hooks in `.claude/settings.json` format and lint every edited file and run typecheck plus lint before a turn ends. A hook failure is a blocker, not a warning.
- Use `/poteto-mode` for any task that changes more than one file. Use `/ponytail-review` and `/code-review high` on the diff before you open a PR.
- Subagents for code use `subagent_type: poteto-agent`.
