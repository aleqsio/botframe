# Review standard

This file sets the bar for every reviewer, human or model.

## Severity

- Blocker: incorrect behavior, data loss, security, a broken performance target from STACK.md, a skipped or weakened check.
- Major: a violated rule from AGENTS.md, missing tests for changed behavior, a dependency without justification, an abstraction with one implementation.
- Nit: naming, formatting that the formatter did not catch, wording.

## Rules for reviewers

- Report at most 5 nits per review. Put the rest in one summary line.
- Every finding names the file and line, the failure scenario, and the smallest fix.
- Do not restate what the diff does. The author wrote the description.
- Do not praise. A review with no findings says "No findings."
- The verification section of the PR must contain a command and the observed output. A PR without one is a Major.
- Prefer deletion. If removing code fixes a finding, say so first.

## Out of scope

- Style that oxfmt or oxlint owns. Fix the tool, not the PR.
- Architecture debates. Open an issue that references STACK.md.
