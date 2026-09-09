@AGENTS.md

# Claude Code

- The hooks in `.claude/settings.json` format and lint each changed file. They also run the typecheck and the lint before the turn ends. A hook failure stops the work.
- Use `/poteto-mode` for a task that changes more than one file.
- Run `/ponytail-review` and `/code-review high` on the difference before you open a pull request.
- Give `subagent_type: poteto-agent` to each subagent that writes code.
