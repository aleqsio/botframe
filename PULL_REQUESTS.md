# Pull requests

Put a change with more than one part in a stack. Refer to the [gh-stack skill](https://github.com/github/gh-stack/blob/main/skills/gh-stack/SKILL.md).

```bash
gh extension install github/gh-stack
git config rerere.enabled true
git config remote.pushDefault origin
```

If `origin` is not on `github.com`, start each `gh` command with `GH_REPO=aleqsio/botframe`.

A bare `gh stack` command waits for input. Give the arguments:

- `gh stack init <branch>...` and `gh stack add <branch>`
- `gh stack submit --auto`, then `gh pr edit`
- `gh stack view --json`
- `gh stack merge <number> --yes`
- Never `gh stack switch` or `gh stack modify`.

Run `gh stack sync` before you open the stack and before you merge it. For a worktree, use `gh stack link <bottom> ... <top>`.

If `gh stack` fails, push the branches and give the user the `gh stack link` command.
