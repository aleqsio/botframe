# AGENTS.md

botframe is an open-source design tool for the desktop. The browser draws the document as DOM elements. The shell is Electron. The document is a Loro CRDT in a `.botframe` file.

STACK.md gives the architecture and the performance targets. TOOLING.md gives the tools and the open items.

## Commands

- `bun run check` runs each gate that CI runs: format, lint, typecheck, dead code, duplication, and tests.
- `bun run dev` starts the application.
- `bun run test` runs the unit tests. `bun run test:e2e` runs the Electron tests.
- `bun run lint` is oxlint. `bun run format` is oxfmt. `bun run typecheck` is TypeScript.

## Layout

- `src/document/` is the document model. `DesignDocument` owns the Loro document and gives one subscription for each layer. Pure TypeScript. No React, no Electron, no DOM.
- `src/renderer/` is the user interface. React reads the document with `useSyncExternalStore`, one subscription for each layer.
- `src/main/` is the Electron main process. `src/preload/` is the bridge, and it stays small.
- `src/workers/` runs sync, export, and large queries off the main thread.
- The lint rules hold these limits. Do not add an exception. Move the code.

## How to write

Write each reply and each Markdown file in this repository in ASD-STE100, Simplified Technical English, Issue 9. Keep the text brief and to the point.

## How to write code

- Do not copy document data into React state or into a different store. The Loro document is the only copy.
- The linter sets these limits: cyclomatic complexity 10, cognitive complexity 15, depth 3, 4 parameters, 60 lines for each function, 400 lines for each file. Divide the function. Do not increase the limit.
- Do not write comments. If you want a comment, change the name or extract the function. Write a comment only to record an external constraint, and give the link.
- Do not use `any`, a non-null assertion, a TODO, or code that you comment out.
- Do not add an abstraction that has one implementation. Do not add an option that no caller uses.
- Do not add a dependency for a function that the platform or the standard library gives.
- Validate external data at the boundary. Then trust the types. Make an illegal state impossible.
- Write a test that fails before the change and passes after the change.
- Prove the change against the application that runs. Give the command and the output in the pull request.

## Pull requests

- Use the stacked pull requests of `gh` if the installed version gives them.
- If `gh` does not give them, make each pull request against `main`.
- Rebase the branch on `main` before you open the pull request, and again before you merge it.

## Never

- Never change a lint limit, a tsconfig option, or a dependency rule to make a check pass.
- Never use `--no-verify`.
- Never add a dependency without a reason in the pull request.
- Never load a font, an image, or a script from a different site. Each asset goes through the asset store.
- Never open a pull request against a branch that is not `main`.
- Never let a model write this file. A person writes it.
