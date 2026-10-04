# Tooling

The tools that hold the quality standard, and the items that stay open. AGENTS.md gives the rules. STACK.md gives the architecture.

## Decisions

- **TypeScript 7.0**, pinned. Move to 7.1 when it is stable, in November 2026.
- **oxlint and oxfmt.** No ESLint, no Prettier. Type-aware rules need TypeScript 7 and `oxlint-tsgolint`.
- **bun** for the package manager, the script runner, and the lock file. Node runs Vitest.
- **pstack** and **ponytail** run in Claude Code. `/setup-pstack` writes a Cursor rules file that Claude Code does not read. Copy the role lines into `~/.claude/CLAUDE.md`.

## Gates

Each gate is a separate CI job, and each job blocks a merge.

| Gate | Tool | Limit |
| --- | --- | --- |
| Format | oxfmt | — |
| Lint | oxlint with type-aware rules | see below |
| Types | tsc | strict, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` |
| Tests | Vitest | — |
| Dead code | knip | no unused file, export, or dependency |
| Duplication | jscpd | no clone |
| Layout | Playwright, headless Chromium | the drag invariants, see below |

Lint limits: cyclomatic complexity 10, cognitive complexity 15 (both from `oxlint-plugin-complexity`), depth 3, 4 parameters, 60 lines for each function, 400 lines for each file.

The lint rules also hold the module boundaries from AGENTS.md. `src/document/` imports no React, no Electron, and no Node module.

`bun run test:e2e:chromium` builds the website and opens `out/web` in headless Chromium. The Playwright project `chromium` in `e2e/chromium/` serves the build through `page.route`, so no server runs. It holds the invariants that need real layout: the center of the bounding client rect of a dragged layer moves by the mouse delta, through a turn, a corner origin, a change of parent, and a change of size. The Playwright project `electron` in `e2e/` keeps the menu, the clipboard, and the window. CI runs the `chromium` project and not the `electron` project.

lefthook runs the format, the lint, and the typecheck before each commit. CI is the gate that counts, because a user can skip a hook.

## Website

The renderer also runs in a browser, with no Electron. `vite.config.ts` gives the renderer configuration to Electron and to the website.

| Command | Result |
| --- | --- |
| `bun run dev:web` | starts a development server at http://localhost:5173 |
| `bun run start:web` | builds the website to `out/web` and serves it at http://localhost:4173 |
| `bun run build:web` | builds the website to `out/web`. Put the folder on a static host. |

When `window.botframe` is not there, `src/renderer/bridge.ts` uses the browser:
- Open uses a file input. Save downloads the file. The first save and Save As ask for a name.
- The clipboard uses `navigator.clipboard`. The layer flavor needs a browser that writes a `web ` custom format, for example Chromium.
- The browser keeps Ctrl+T and Ctrl+W. Use the tab buttons.

`.github/workflows/pages.yml` builds the website on each push to `main` and publishes it to GitHub Pages. The workflow tries to turn on Pages. If the first run fails at `configure-pages`, set Settings → Pages → Source to "GitHub Actions", and run the workflow again.

## Review

- **CodeRabbit** reviews each pull request. It is free for a public repository, and it reads AGENTS.md, REVIEW.md, and STACK.md.
- **`/code-review high`** before each pull request. **`/security-review`** for a change to the main process, the preload, the IPC, or the CSP.
- **`/ponytail-review`** finds code to delete.

## Open items

- [ ] The Electron suite runs in no CI job. Add coverage in the Chromium project as features arrive.
- [ ] Add performance checks in CI for the STACK.md targets.
- [ ] Make each CI job a required check in the GitHub settings.
- [ ] Add Stryker mutation tests on the difference, as a report, not as a gate.
- [ ] Add `dependency-cruiser` and `type-coverage` when they support TypeScript 7.
