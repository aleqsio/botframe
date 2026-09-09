# Stack

The assumptions this project is built on. Each one should hold for the life of the project, or be changed deliberately here. Implementation detail, version numbers, and workarounds do not belong in this file.

## Bets

**The document view is the browser, not a renderer we own.** Layers are real DOM elements. The browser does layout, text shaping, fonts, and hit testing. This is the load-bearing bet: it makes export the running markup, it makes the document legible to agents, and it means we never write a text shaper. The cost is that scene scale is bounded by DOM performance, and the fallback if that bound is hit is a custom GPU renderer with a constrained CSS subset.

**One pinned browser engine.** Electron, not a system WebView. Rendering must be identical on every OS, the same engine must run headless for export, and the effects pipeline needs Blink.

**The document is a CRDT, and it is the only copy of document state.** No component, store, or cache holds design state beside it. The editor, the MCP server, the headless renderer, and any collaborator are peers on that one document. Loro, because a layer tree needs a movable-tree type, and reparenting under concurrency has to be correct rather than merely convergent.

**Files are the product. Sync is additive.** A document is a file the user owns, opens offline, and can hand to someone else. Nothing requires an account. A hosted sync backend may exist later, but the file never stops being canonical, and the app must work with the network switched off.

**Styles are resolved, not cascading.** The document model decides the value of every property on every element. The browser is never asked to cascade, inherit, or resolve a conflict. This is what makes the document serialisable, diffable, and predictable for an agent.

## Architecture

**State and reactivity.** React reads the document through per-layer subscriptions. Editing one layer re-renders that layer, not the tree, whether the edit came from this machine or a collaborator. Anything not in the document, such as the active tool or the viewport, may live in a UI store; document state may not.

**Multiplayer, when it comes, is three separate channels.** The document merges through the CRDT and is durable. Presence is ephemeral, expires on its own, and never enters the document, because two people selecting different things is not a conflict to merge. Identity comes from auth. A relay stores and broadcasts opaque document updates and never parses them.

**Undo is per peer.** You undo your own edits, never a collaborator's. Undo applies an inverse operation, so it can still overwrite a newer concurrent edit to the same property. The product answer to that is owed before multiplayer ships.

**Files.** `.botframe` is the document: current state and its own edit history in one binary file, with a format version and migrations on open. HTML and CSS is an export, never an import, and is deterministic so two exports of one state are byte-identical. Assets are content-addressed, referenced by id, and never fetched from a third-party origin at render time.

**Everything renders from one code path.** The editor window, the headless exporter, and CI screenshots run the same document view. There is no second renderer to keep in sync.

**Agents are first-class clients.** An MCP server operates on the document API, not on the UI, and reaches the same document as the editor.

**The main thread belongs to interaction.** Sync, export, and bulk document queries run in workers.

## Performance targets

| Metric | Target | Condition |
| --- | --- | --- |
| Warm launch to window visible | under 300 ms | framework cached |
| Cold launch to window visible | under 1 s | first launch after install |
| Last document visible after window | under 100 ms | from local storage, no network |
| Pointer to pixel latency during drag | 1 frame | 16 ms at 60 Hz, 8 ms at 120 Hz |
| Drag frame rate | display refresh rate | 500 layers |
| Layer tree | scrolls at refresh rate | 10 000 nodes |
| Main thread per pointer move | under 2 ms | excluding compositor |
| Renderer memory | under 1 GB | 500 layers, 50 raster assets |

Rules that follow from them: show the window before loading anything; drive updates from one animation frame, never per pointer event; never read layout in a loop; commit an edit per gesture, not per frame; undo through the CRDT rather than snapshots.

## Open questions

1. Does the DOM hold at 500 layers under drag, and the layer tree at 10 000 nodes?
2. How large does a `.botframe` file grow over a real editing session, and when does history need compacting?
3. Which sync backend, when sync is built. It must store and relay opaque updates, and carry auth, sharing, and assets.
4. Text editing inside a transformed, zoomed container: caret, selection, and IME.

## Rejected

- **A system WebView shell** (Tauri, Wails). Rendering differs per OS and it cannot run the effects pipeline.
- **A custom renderer for v1** (WebGPU, CanvasKit). It means owning text shaping and layout. Kept as the fallback if the DOM bet fails.
- **Yjs.** No move operation, so concurrent reparenting duplicates or loses nodes.
- **Document state in an observable store** (MobX, Legend-State, signals). It duplicates the document and fights the React Compiler.
- **HTML import.** HTML is an output. Round-tripping arbitrary HTML would make every browser feature a document feature.
- **A separate history file.** Two files for one document drift apart.
- **A remote database as the document's home.** It breaks offline use and file ownership.

## Future: effects pipeline

Shader layers that capture the DOM beneath them as a GPU texture, filter it, and draw the result. Blur, gradients, halftone, image filters.

This depends on the HTML-in-Canvas API, which is Blink-only and not yet shipped stable. The v1 architecture is shaped so adopting it is a container swap rather than a rewrite: the document view becomes a canvas hosting the same elements. WebGPU with a WebGL2 fallback, dirty-layer capture with cached textures, and progressive resolution during interaction.

Before starting it, measure capture cost on a 500-layer document, and confirm text editing and shadow DOM still work inside the canvas. If capture is too slow, the fallback is the custom renderer above.
