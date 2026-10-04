# Review standard

This file sets the standard for each reviewer, human or model.

## Severity

- **Blocker.** Incorrect behavior, data loss, a security fault, a missed performance target from STACK.md, or a disabled check.
- **Major.** A broken rule from AGENTS.md, no test for changed behavior, a dependency with no reason, an abstraction with one implementation, or a new editor feature that an agent cannot use through the MCP server.
- **Nit.** Names, format that the formatter does not control, and word choice.

## Rules for reviewers

- Report a maximum of 5 nits. Put the other nits in one line.
- Give the file, the line, the failure condition, and the smallest correction.
- Do not repeat what the change does. The author wrote the description.
- Do not give praise. If you find nothing, write "No findings."
- The pull request must show a command and the output of that command. If it does not, this is a Major.
- Prefer deletion. If deletion of code corrects a finding, say so first.

## Out of scope

- Format that oxfmt or oxlint controls. Correct the tool, not the pull request.
- Architecture. Open an issue that refers to STACK.md.
