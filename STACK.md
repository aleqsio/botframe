# Tech stack and performance assumptions

Resolves TOOLING.md decision D1. Everything here is an assumption until the prototype in section 5 confirms it. Research date: 2026-09-08.

## 1. Decisions

- Document view is real DOM. The browser does layout, text shaping, fonts, and hit testing. No custom render engine.
- Effects use the HTML-in-Canvas API (`layoutsubtree`, `drawable`, `drawElementImage`, `texElementImage2D`, `copyElementImageToTexture`). Blink only. Chrome origin trial 148 to 150, flag `chrome://flags/#canvas-draw-element`, stable ship estimated late 2026.
- Shell is Electron, not Tauri. Tauri uses WKWebView on macOS and can never expose this API. Electron pins one Chromium and enables the Blink feature with a startup switch.
- Web app is a second target on the same code, gated to Chrome with an origin trial token until stable ship.
- Panels are React. Native macOS shell (SwiftUI plus CEF document view) is a possible v2 and is not on the plan.
- Document is a CRDT. The editor tab, the MCP server, the headless renderer, and collaborators are all peers on one document.

## 2. Stack

Shell and packaging
- Electron on Chromium 149 or newer, pinned. Blink feature for HTML-in-Canvas enabled with `app.commandLine.appendSwitch`. Wrap the three draw calls in one adapter module so an API rename costs one file.
- Native integration: native menu bar with standard roles, native context menus, `hiddenInset` title bar, vibrancy on sidebars, `nativeTheme`, window tabbing, persisted window bounds.
- Custom protocol `app://local/` serves the app and every asset from one origin. `protocol.registerSchemesAsPrivileged` with `standard`, `secure`, `supportFetchAPI`, `stream`.
- CSP: `img-src`, `media-src`, `font-src` limited to `app:` and `blob:`. An external URL fails to load instead of tainting the canvas.
- `webSecurity` stays on. `backgroundThrottling: false` on the editor window.

Document view
- One `<canvas layoutsubtree>` hosts the document. Each layer is a `drawable` element. Light-DOM custom elements for layer primitives; shadow DOM only after section 5 confirms it captures.
- CSS subset is non-cascading: every rule is resolved to the element by the document model, not by the browser's cascade. The browser only sees per-element resolved styles.
- Drag and resize write `transform` on the element directly inside one `requestAnimationFrame` loop. Commit to the document on pointer up or at a throttled rate.
- In-place text editing through a `contenteditable` overlay synced to the document.
- Video is never captured. Video layers upload frames directly with WebGL video textures or WebGPU external textures.
- Cross-origin iframes are opaque layers. Shaders cannot read them.

Effects pipeline
- WebGPU primary, WebGL2 fallback. No three.js; a thin compositor over render-to-texture. three.js r184 `HTMLTexture` is available if 3D is ever needed.
- A shader layer captures the composite of the layers beneath it as a texture, runs the shader, draws the result.
- The `paint` event marks dirty layers. Only dirty layers are recaptured; everything else uses a cached texture.
- Progressive rendering: half resolution during interaction, full resolution on idle.
- `captureElementImage` yields a transferable `ElementImage`, so the pipeline can run on an `OffscreenCanvas` in a worker.

Panels and state
- React with Vite, TypeScript per TOOLING.md D2.
- Store with fine-grained selectors (Zustand or Jotai). A moving layer updates the inspector's coordinate field and nothing else. React never renders on pointer move.
- Layer tree and asset panels are virtualized.

Document and sync
- Loro. Movable tree CRDT fits a layer tree, ships undo, and has Swift bindings for a possible native shell. Yjs is the fallback if Loro maturity blocks.
- Local-first. Electron stores documents in SQLite; the web app uses IndexedDB. The last document opens from local storage before any network.
- Sync server in Node or Bun over WebSocket, server-authoritative for permissions, CRDT for merge.

Assets
- Import copies every asset into a managed store keyed by content hash. The document holds asset ids, never raw URLs. Ids resolve to `app://` URLs (Electron) or blob URLs (web) at render time.
- Fonts are bundled into the asset store, not loaded from third-party origins. Local Font Access API for system fonts, Chrome only.

Headless renderer and export
- Headless Chromium with the same flag runs the same document view on the server or in CI. Produces PNG, PDF, and video export, and MCP screenshots without an open tab.

MCP
- Remote MCP server hosted with the sync server: streamable HTTP, OAuth. Works when the app is closed. Same pattern as Figma.
- Tools operate on the document API: read tree, query selection, get and set resolved styles, insert component, render.
- Optional local companion started with `npx`, MCP over stdio, connected to the open tab over a localhost WebSocket for live selection context. In Electron the same server can run in the main process.

Workers
- CRDT sync, export, document queries, and the shader pipeline run off the main thread.

## 3. Performance targets

| Metric | Target | Condition |
| --- | --- | --- |
| Warm launch to window visible | under 300 ms | macOS, framework cached |
| Cold launch to window visible | under 1 s | first launch after install |
| Last document visible after window | under 100 ms | from local store, no network |
| Pointer to pixel latency during drag | 1 frame | 16 ms at 60 Hz, 8 ms at 120 Hz |
| Drag frame rate | display refresh rate | 500 drawable layers, one backdrop shader at half resolution |
| Full-resolution shader pass after idle | under 100 ms | same document |
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

## 5. Assumptions to validate first, in order

1. Capture cost. Measure `paint` event and capture time for a 500-layer document with one backdrop shader. This decides whether the DOM approach holds. Fallback is CanvasKit plus Yoga on a constrained CSS subset.
2. Origin trial timing. The trial can end before stable ship. The web target needs a no-shader fallback for that gap. Electron is unaffected.
3. Shadow DOM inside `layoutsubtree`. Confirm a `drawable` element with a shadow root captures. Otherwise light DOM only.
4. `contenteditable` inside `layoutsubtree`. Confirm caret, selection, and IME work for elements that are laid out but drawn through the canvas.
5. Electron release on Chromium 149 or newer, and the exact Blink feature name behind `canvas-draw-element`.
6. Loro movable tree at 10 000 nodes: load time, memory, undo behavior.
7. Worker pipeline with `captureElementImage`. Confirm it exists in the shipped Chromium, not only in the explainer.

## 6. Rejected

- Tauri, Wails, Neutralino: system WebView, no Blink, no HTML-in-Canvas.
- React Native for macOS: would host Chromium through a hand-written CEF module; the native shell option in section 1 is the same work with less on top.
- PWA as the desktop story: no menu bar integration.
- Custom renderer (WebGPU or CanvasKit) as v1: owns text shaping and layout; kept as the section 5 fallback only.
- three.js as the compositor: a 3D scene graph fights a 2D layer stack.
- `webSecurity: false` as a tainting workaround.
- Snapshot hacks (html2canvas, SVG `foreignObject`) for reading layers below.

## Sources

github.com/WICG/html-in-canvas, developer.chrome.com/blog/html-in-canvas-origin-trial, tympanus.net/codrops/2026/05/13/exploring-the-html-in-canvas-proposal, groups.google.com/a/chromium.org/g/blink-dev/c/t_nGEmJ_v4s, loro.dev/docs/performance, electronjs.org/docs/latest/api/protocol, figma.com/blog/figma-rendering-powered-by-webgpu.
