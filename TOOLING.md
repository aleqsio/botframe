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
| Export | Playwright, Electron, on Linux and macOS | each export format agrees with the render, see below |

Lint limits: cyclomatic complexity 10, cognitive complexity 15 (both from `oxlint-plugin-complexity`), depth 3, 4 parameters, 60 lines for each function, 400 lines for each file.

The lint rules also hold the module boundaries from AGENTS.md. `src/document/` imports no React, no Electron, and no Node module.

`bun run test:e2e:chromium` builds the website and opens `out/web` in headless Chromium. The Playwright project `chromium` in `e2e/chromium/` serves the build through `page.route`, so no server runs. It holds the invariants that need real layout: the center of the bounding client rect of a dragged layer moves by the mouse delta, through a turn, a corner origin, a change of parent, and a change of size. The Playwright project `electron` in `e2e/` keeps the menu, the clipboard, and the window. CI runs the `chromium` project and not the `electron` project.

`bun run test:e2e:export` is the export check, in `e2e/export/`. It builds each example in `e2e/fixtures/export/` through the MCP tools, exports the example in each format and option, and turns each file into a picture: PNG and JPG are decoded, SVG, HTML, and ZIP are drawn in a hidden offscreen window, and PDF is drawn with pdf.js. On macOS, Quartz (`sips`) also draws the PDF, because Preview uses Quartz. The check compares each picture with the `render` picture at scale 2. `e2e/export/limits.ts` holds the limits for each format. A connected area of changed pixels larger than the limit fails at each format. CI uploads a contact sheet, `test-results/export-check/index.html`, as the `export-check-<os>` artifact. CI runs this check, not the local computer.

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

`.github/workflows/preview.yml` builds each pull request from this repository and commits the build to `pr/<number>/` on the `pages-previews` branch. A comment on the pull request gives the link. When the `preview` run ends, `pages.yml` publishes `main` and each folder in `pr/` together. When the pull request closes, its folder goes away. A pull request from a fork gets no preview.

## Agents

An MCP server lets an agent read and change each open document. The server uses Streamable HTTP at `http://127.0.0.1:7341/mcp`. The tools operate on the document API, as STACK.md says. Each tool call is one undo step.

| Shell | Server | Page |
| --- | --- | --- |
| Desktop | The application starts the server. | The window connects through IPC. |
| Website | Run `bun run agent`. | Open the Agent button in the tab bar and press Connect. The page polls the server. |

The Agent button in the tab bar gives these steps and copies each command. Add the server to Claude Code:

```bash
claude mcp add --transport http botframe http://127.0.0.1:7341/mcp
```

- `get_outline`, `get_layer`, `create_layers`, `update_layer`, and the other layer tools validate each value.
- `render` gives a PNG of one layer, or of the visible canvas, as an MCP `image` item. The long side is 2048 px or less. `export_layer` gives PNG, JPG, SVG, PDF, or HTML as an MCP resource. HTML is one page with everything embedded, or separate HTML, CSS, and asset files in a ZIP. Both tools use the same export path as the Export section of the inspector. The editor sends a copy of the document to a hidden offscreen window. That window draws the same layer view. The main process captures it with `webContents.capturePage` for PNG and JPG, and prints it with `webContents.printToPDF` for PDF. Chromium paints `background-clip: text` into a PDF with soft masks, and macOS Preview draws them incorrectly. Before it prints, the window gives a text with a solid fill a plain `color`, and it replaces a text with a gradient or image fill with a picture of that text. For HTML, ZIP, and SVG, the window serializes the drawn layer, with the CSS rules that it uses, its fonts, and its media. The SVG holds the HTML in a `foreignObject`, so it shows in a browser but not in a vector editor. The scale applies to PNG and JPG only. The editor does not change during an export. The website cannot capture the page, so the export works only in the desktop app.
- `read_data` and `write_data` read and write each CRDT value at a path. Use them for each change that the other tools do not give. The model ignores a value that it cannot read.
- The server refuses a request on `/mcp` that has an `Origin` header, and a request to a host name that is not loopback. The page channel accepts only the development and preview origins (ports 5173 and 4173) and the GitHub Pages origin.
- Each new editor feature must also be available through the MCP server. CLAUDE.md tells what to add. A review gives a Major for a feature that an agent cannot use.

## Fonts

`src/renderer/fonts/googleFonts.json` is the list of families in the font picker. `scripts/google-fonts.sh` makes the list from the metadata in https://github.com/google/fonts. Run the script to get new families.

When a text layer uses a font that is not in the file, the renderer downloads the font from Google Fonts and puts each file in the asset store. The canvas loads each font from the file, not from Google. The application ships Inter, with its license, in `src/renderer/fonts/inter/`. A new text layer uses Inter, so it needs no network.

## Review

- **CodeRabbit** reviews each pull request. It is free for a public repository, and it reads AGENTS.md, REVIEW.md, and STACK.md.
- **`/code-review high`** before each pull request. **`/security-review`** for a change to the main process, the preload, the IPC, or the CSP.
- **`/ponytail-review`** finds code to delete.

## Open items

- [ ] Only the export check of the Electron suite runs in CI. Add coverage in the Chromium project as features arrive.
- [ ] Add performance checks in CI for the STACK.md targets.
- [ ] Make each CI job a required check in the GitHub settings.
- [ ] Add Stryker mutation tests on the difference, as a report, not as a gate.
- [ ] Add `dependency-cruiser` and `type-coverage` when they support TypeScript 7.
