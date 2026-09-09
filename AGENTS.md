# AGENTS.md

An open-source design tool for the desktop. The document view is real DOM, the shell is Electron, the document is a Loro CRDT saved as a `.botframe` file. STACK.md holds the architecture and the performance targets. TOOLING.md holds the tooling plan and the open items.

## Commands

- `bun run check` runs every gate that CI runs: format, lint, typecheck, dead code, dependency rules, duplication, type coverage, tests.
- `bun run lint` is oxlint with type-aware rules. `bun run format` is oxfmt.
- `bun run test` is Vitest. Put tests next to the code as `name.test.ts`.
- `bun run typecheck` is TypeScript 7 (`tsc` is the native compiler).

## Layout

- `src/document/` is the document model. Pure TypeScript. No React, no Electron, no DOM.
- `src/renderer/` is the editor UI. React panels and the document view.
- `src/workers/` runs CRDT sync and export off the main thread.
- `src/main/` and `src/preload/` are the Electron processes. The preload stays small.
- `.dependency-cruiser.cjs` enforces these boundaries. Do not add an exception; move the code.

## How to reply

Reply in ASD-STE100 (Simplified Technical English, Issue 9).

## How to write code

- The linter enforces cyclomatic complexity 10, cognitive complexity 15, nesting depth 3, 4 parameters, 60 lines per function, 400 lines per file. Split the function; do not raise the limit.
- No comments. If a comment feels needed, rename the symbol or extract the function. Write a comment only to name an external constraint, with a link.
- No `any`, no non-null assertions, no `TODO`, no placeholder code, no commented-out code.
- No abstraction with one implementation. No option that no caller passes. No dependency for what the platform or the standard library already does.
- Parse external data at the boundary, then trust the types. Make illegal states unrepresentable.
- Every behavior change comes with a test that failed before the change.
- Prove the change against the running app, not against "it compiles". Include the command and the observed output in the PR.

## Never

- Never edit lint limits, tsconfig strictness, or dependency rules to make a check pass.
- Never skip hooks with `--no-verify`.
- Never add a dependency without stating in the PR what it replaces and why the platform cannot do it.
- Never load a font, image, or script from a third-party origin. Assets go through the asset store.
- Never generate this file or any rules file with a model. A person writes it.
