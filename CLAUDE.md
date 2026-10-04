@AGENTS.md

INTERFACES.md gives the rules for a control on the screen.

# MCP

Each feature that the user can use in the editor must also be available to an agent through the MCP server. TOOLING.md tells how the server works.

- A new kind of document data: make sure that `read_data` and `write_data` can read and write it, and that `get_layer` or `list_components` shows it.
- A new action, for example a command in a menu: add a tool in `src/shared/agent.ts` and a handler in `src/renderer/agent/`. Add a test in `src/renderer/agent/tools.test.ts`.
- A new field of a layer: make sure that `update_layer` and `create_layers` accept it, and add the field to the layer text in `src/shared/agent.ts`.

# Claude Code

- The hooks in `.claude/settings.json` format and lint each changed file. They also run the typecheck and the lint before the turn ends. A hook failure stops the work.
- The `pstack` plugin gives `/poteto-mode`. The settings in `.claude/settings.json` name the marketplace and enable the plugin. If a session does not have `/poteto-mode`, run `/plugin marketplace add michael-denyer/pstack-claude` and `/plugin install pstack@pstack-claude`.
- `.claude/skills/ponytail-review/` gives `/ponytail-review`. It is a copy of the skill from https://github.com/DietrichGebert/ponytail. The copy is in the repository because a cloud session did not install the plugin.
- Use `/poteto-mode` for a task that changes more than one file.
- Run `/ponytail-review` and `/code-review high` on the difference before you open a pull request.
- Give `subagent_type: pstack:poteto-agent` to each subagent that writes code. The plugin registers the agent under its name, and the bare name `poteto-agent` fails.
