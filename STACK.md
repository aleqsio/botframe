# Tech stack and performance assumptions

Resolves TOOLING.md decision D1. Everything here is an assumption until a prototype confirms it. Research date: 2026-09-08, revised 2026-09-09. The backend for sync and sharing is still open.

## 1. Decisions

- Document view is real DOM. The browser does layout, text shaping, fonts, and hit testing. No custom render engine. Same bet as Paper: DOM is the language agents already speak, and export is the running markup.
- Shell is Electron with one pinned Chromium. Reasons that still hold without the effects pipeline: identical rendering on every OS, Local Font Access API, the same engine for headless export, and no WebView divergence when the effects pipeline (section 7) arrives.
- Web app is a second target on the same code.
- Panels are React 19.2 with the React Compiler on. Base UI components, Tailwind 4 with tokens, Jotai 3 for state.
- Document is a Loro CRDT. The editor tab, the MCP server, the headless renderer, and collaborators are all peers on one document.
- Files are the primary store. A `.botframe` file is a Loro snapshot: latest state plus the full operation log. HTML and CSS is an export only.
- Shader and filter effects are not in v1. Section 7 holds that plan.

## 2. Stack

Shell and packaging
- Electron on Chromium 150 or newer, pinned. Electron 43 ships Chromium 150, Electron 44 ships 152.
- Build: `electron-vite` 6 for dev and bundling, `electron-builder` for packaging. electron-vite 6 is the only line with Vite 8 support and is in beta; its known bug with the compiler preset has an `await` workaround. Electron Forge's Vite plugin is the fallback if the beta blocks.
- Native integration: native menu bar with standard roles, native context menus, `hiddenInset` title bar, vibrancy on sidebars, `nativeTheme`, window tabbing, persisted window bounds.
- Custom protocol `app://local/` serves the app and every asset from one origin. `protocol.registerSchemesAsPrivileged` with `standard`, `secure`, `supportFetchAPI`, `stream`.
- CSP: `img-src`, `media-src`, `font-src` limited to `app:` and `blob:`. An external URL fails to load instead of loading silently.
- `webSecurity` stays on. `backgroundThrottling: false` on the editor window.

Document view
- One scrollable, zoomable DOM container hosts the document. Each layer is an element. Light-DOM custom elements for layer primitives.
- CSS subset is non-cascading: every rule is resolved to the element by the document model, not by the browser's cascade. The browser only sees per-element resolved styles.
- Drag and resize write `transform` on the element directly inside one `requestAnimationFrame` loop. Commit to the document on pointer up or at a throttled rate.
- In-place text editing through `contenteditable` on the text layer, synced to the document.
- Video layers are `<video>` elements. Cross-origin iframes are opaque layers.
- Selection handles, guides, and marquee live in an overlay layer above the document, positioned from the document model, never from `getBoundingClientRect` in loops.

Panels and UI
- React 19.2 with Vite 8, TypeScript per TOOLING.md D2.
- React Compiler on (`babel-plugin-react-compiler` 1.0, through `@rolldown/plugin-babel` with the compiler preset from `@vitejs/plugin-react` 6; switch to the native Oxc path when it leaves experimental). The compiler rules in `.oxlintrc.json` are the guard. No MobX, no Legend-State, no Preact signals transform: all three break the compiler.
- Components: Base UI (`@base-ui/react`). Menus, context menus, popovers, toolbar, slider, combobox, and a number field with a drag-to-scrub area. shadcn on Base UI for the shell pieces: dialogs, command palette, resizable panels.
- Styling: Tailwind 4 with a strict token layer in `@theme`: light and dark variables, a 4px spacing scale, `tabular-nums` on every numeric field. CSS Modules for the document view and overlay, where Tailwind adds nothing.
- Editor pieces: `react-resizable-panels` 4 for panel layout, `react-arborist` for the layer tree over `@tanstack/react-virtual`, `react-colorful` for color, `tinykeys` for shortcuts. `cmdk` for the palette with the caveat that it has not published since March 2025; replace with a Base UI combobox if it stalls.
- React 19.2 features in use: `<Activity>` keeps collapsed inspector tabs alive without rendering them; `useEffectEvent` reads the latest values inside pointer and keyboard handlers.
- Layer tree and asset panels are virtualized.

State
- Jotai 3. One atom per node and per inspected property. A moving layer updates the inspector's coordinate field and nothing else. React never renders on pointer move.
- Hot state during drag lives outside React: refs written from the pointer handler, applied in one `requestAnimationFrame` loop, committed to the document on pointer up.
- Rejected: MobX 7 (observer conflicts with the compiler), Legend-State (same), Preact signals (same), a hand-written signals library like tldraw's (more code to own for the same result).

Document and sync
- Loro (`loro-crdt` 1.16). Movable tree for the layer hierarchy, one map per node for properties, undo from the operation log, `checkout` for version history. Yjs rejected: no move operation, so concurrent reparenting duplicates or loses nodes.
- Local-first. The Loro doc in memory is the source of truth. The last document opens from disk before any network.
- Drag commits on pointer up, not per frame, so the operation log stays proportional to edits rather than to pointer events.
- History compaction: a shallow snapshot drops history older than a chosen version when a file grows past a size budget. The budget is a number in one place, set after measurement.
- Sync backend is open. Requirements: durable log of Loro update bytes per document, pub/sub relay per document, auth, sharing, asset storage. Leading candidate is Convex using its documented pattern for CRDT change rows with periodic snapshot rows. Alternative is a Cloudflare Durable Object per document, the tldraw sync design. Neither is in v1.

File formats
- `.botframe`: Loro binary snapshot, `doc.export({ mode: "snapshot" })`. Contains the latest state and the operation log with commit messages. Open with `import`. Binary, so git stores versions but does not diff them; version history lives inside the file instead.
- HTML and CSS export: one file, custom elements for layers, resolved styles inline, design semantics in attributes. Opens in any browser. Deterministic serialization so two exports of the same state are byte-identical. Export only.
- Asset files travel next to the `.botframe` file in a sibling folder keyed by content hash, or embedded on explicit "package" export.
- Every `.botframe` file carries a format version. Migrations run on open.

Assets
- Import copies every asset into a managed store keyed by content hash. The document holds asset ids, never raw URLs. Ids resolve to `app://` URLs (Electron) or blob URLs (web) at render time.
- Fonts are bundled into the asset store, not loaded from third-party origins. Local Font Access API for system fonts, Chrome only.

Headless renderer and export
- Headless Chromium runs the same document view on the server or in CI. Produces PNG, PDF, and video export, and MCP screenshots without an open tab.

MCP
- Remote MCP server hosted with the sync server, if one exists: streamable HTTP, OAuth. Works when the app is closed. Same pattern as Figma.
- Tools operate on the document API: read tree, query selection, get and set resolved styles, insert component, render.
- Local companion started with `npx`, MCP over stdio, connected to the open tab over a localhost WebSocket for live selection context. In Electron the same server can run in the main process.

Workers
- CRDT sync, export, and document queries run off the main thread.

## 3. Performance targets

| Metric | Target | Condition |
| --- | --- | --- |
| Warm launch to window visible | under 300 ms | macOS, framework cached |
| Cold launch to window visible | under 1 s | first launch after install |
| Last document visible after window | under 100 ms | from local store, no network |
| Pointer to pixel latency during drag | 1 frame | 16 ms at 60 Hz, 8 ms at 120 Hz |
| Drag frame rate | display refresh rate | 500 layers |
| Layer tree panel | scrolls at refresh rate | 10 000 nodes, virtualized |
| Main thread work per pointer move | under 2 ms | excluding compositor |
| Renderer memory | under 1 GB | 500-layer document with 50 raster assets |

## 4. Performance rules

- Show the window first, load everything after first paint. Nothing synchronous in the main process before the window exists. Preload script stays tiny.
- One bundled renderer entry, code-split panels that are not visible at launch, Electron code cache on. Custom V8 snapshot only if measurements demand it.
- Measure from process creation time, not from application code. Chromium tracing for the rest.
- Batch layout reads and writes per frame. No `getBoundingClientRect` in loops.
- Use `getCoalescedEvents` and drive updates from `requestAnimationFrame`, never per pointer event.
- `content-visibility: auto` on artboards outside the viewport.
- Undo and redo through the CRDT, no snapshot copies.

## 5. Known constraints found by building

- The main process entry must not use top-level `await app.whenReady()`. Electron waits for the ESM module to finish evaluating before it emits `ready`, so the module waits for an event that waits for the module. Use `app.on("ready", ...)`. The `unicorn/prefer-top-level-await` lint warning is wrong here.
- The renderer CSP needs `'wasm-unsafe-eval'` in `script-src`. Loro is WebAssembly and does not compile without it. This is narrower than `'unsafe-eval'` and does not permit JavaScript `eval`.
- Loro's WebAssembly binary is 3.2 MB in the renderer bundle. Measure its effect on the 300 ms warm launch target before adding anything else large.
- Chromium normalises `translate3d(x, y, 0)` to `translate3d(x, y, 0px)` in the style attribute. Assertions on transform strings must expect the normalised form.

## 6. Assumptions to validate first, in order

1. DOM at scale. A 500-layer document with transforms on drag holds refresh rate. Measure main-thread time per pointer move.
2. Loro movable tree at 10 000 nodes: load time, memory, undo behavior, and `.botframe` file size after 1 000 edits.
3. `contenteditable` inside a transformed, zoomed container: caret, selection, and IME work.
4. Electron warm launch under 300 ms with the renderer bundle and code cache.

## 7. Rejected

- Tauri, Wails, Neutralino: system WebView. Rendering differs per OS, and WKWebView blocks the section 7 effects pipeline. Revisit only if section 7 is dropped for good.
- React Native for macOS: would host Chromium through a hand-written CEF module; more work than a native shell with a CEF document view, which is itself not on the plan.
- PWA as the desktop story: no menu bar integration.
- Custom renderer (WebGPU or CanvasKit) as v1: owns text shaping and layout.
- three.js as a compositor: a 3D scene graph fights a 2D layer stack.
- `webSecurity: false` as a tainting workaround.
- Snapshot hacks (html2canvas, SVG `foreignObject`) for reading layers below.
- HTML import. HTML is an output format. Round-tripping arbitrary HTML into the document model would make every browser feature a document feature.
- Text history file next to the binary. Loro can export the log as JSON, but two files for one document invite drift. The binary file holds the log.

## 8. Future: effects pipeline on HTML-in-Canvas

Not in v1. This section records the plan so the v1 decisions above do not block it.

What it is
- Shader layers that capture the composite of the DOM layers beneath them as a GPU texture, run a shader, and draw the result. Blur, halftone, gradients, image filters.
- Depends on the HTML-in-Canvas API (`layoutsubtree`, `drawable`, `drawElementImage`, `texElementImage2D`, `copyElementImageToTexture`). Blink only. Chrome origin trial 148 to 150, flag `chrome://flags/#canvas-draw-element`, stable ship estimated late 2026.

How it would work
- The document container becomes one `<canvas layoutsubtree>`. Each layer becomes a `drawable` element. The DOM view in section 2 is designed so this is a container swap, not a rewrite.
- WebGPU primary, WebGL2 fallback. A thin compositor over render-to-texture, no three.js.
- The `paint` event marks dirty layers. Only dirty layers are recaptured; everything else uses a cached texture.
- Progressive rendering: half resolution during interaction, full resolution on idle. Target: full-resolution pass under 100 ms after idle on a 500-layer document.
- `captureElementImage` yields a transferable `ElementImage`, so the pipeline can run on an `OffscreenCanvas` in a worker.
- Video is never captured. Video layers upload frames directly with WebGL video textures or WebGPU external textures.
- Cross-origin iframes stay opaque. Shaders cannot read them.
- Electron enables the Blink feature with `app.commandLine.appendSwitch`. The three draw calls sit in one adapter module so an API rename costs one file.
- The web target needs an origin trial token until stable ship, and a no-shader fallback for the gap if the trial ends first.

Prerequisites to validate before starting
1. Capture cost. Measure `paint` event and capture time for a 500-layer document with one backdrop shader. This decides whether the approach holds. Fallback is CanvasKit plus Yoga on a constrained CSS subset.
2. Origin trial timing versus stable ship.
3. Shadow DOM inside `layoutsubtree`: confirm a `drawable` element with a shadow root captures.
4. `contenteditable` inside `layoutsubtree`: caret, selection, and IME for elements laid out but drawn through the canvas.
5. Electron release on Chromium 150 or newer, and the exact Blink feature name behind `canvas-draw-element`.
6. `captureElementImage` exists in shipped Chromium, not only in the explainer.

## Sources

react.dev/blog/2025/10/07/react-compiler-1, base-ui.com/react/overview/releases, ui.shadcn.com/docs/changelog/2026-07-base-ui-default, react.dev/reference/eslint-plugin-react-hooks/lints/incompatible-library, github.com/pmndrs/jotai/releases, github.com/alex8088/electron-vite/issues/902, github.com/WICG/html-in-canvas, developer.chrome.com/blog/html-in-canvas-origin-trial, tympanus.net/codrops/2026/05/13/exploring-the-html-in-canvas-proposal, groups.google.com/a/chromium.org/g/blink-dev/c/t_nGEmJ_v4s, loro.dev/docs/performance, electronjs.org/docs/latest/api/protocol, figma.com/blog/figma-rendering-powered-by-webgpu, paper.design/blog/series-a, releases.electronjs.org/releases.json.
