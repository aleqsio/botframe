@AGENTS.md

INTERFACES.md gives the rules for a control on the screen.

# Claude Code

- The hooks in `.claude/settings.json` format and lint each changed file. They also run the typecheck and the lint before the turn ends. A hook failure stops the work.
- The `pstack` plugin gives `/poteto-mode` and the `ponytail` plugin gives `/ponytail-review`. The settings in `.claude/settings.json` name both marketplaces and enable both plugins. If a session does not have `/poteto-mode`, run `/plugin marketplace add michael-denyer/pstack-claude`, `/plugin install pstack@pstack-claude`, `/plugin marketplace add DietrichGebert/ponytail`, and `/plugin install ponytail@ponytail`.
- Use `/poteto-mode` for a task that changes more than one file.
- Run `/ponytail-review` and `/code-review high` on the difference before you open a pull request.
- Give `subagent_type: pstack:poteto-agent` to each subagent that writes code. The plugin registers the agent under its name, and the bare name `poteto-agent` fails.
