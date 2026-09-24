# Stack

This file lists the assumptions of the project. Each assumption must stay true for the life of the project. To change an assumption, change this file first. Do not put version numbers, implementation details, or workarounds here.

## Assumptions

**The browser draws the document.** Each layer is a DOM element. The browser does the layout, the text shape, the fonts, and the hit tests. The project has no renderer of its own.
Result: the export is the same markup that runs, and an agent can read the document.
Cost: the DOM sets a limit on the number of layers. If that limit is too low, replace the view with a GPU renderer and a small CSS subset.

**One browser engine, at one version.** The application uses Electron, not a system WebView. The result must look the same on each operating system. The same engine must also run without a screen, for export.

**The CRDT holds the only copy of the document.** No component, store, or cache keeps a second copy. The editor, the MCP server, the export tool, and each collaborator use one document. The project uses Loro, because a layer tree needs a movable tree type. Two users can move the same layer at the same time, and the result must be correct.

**The file is the product. Sync is an addition.** A document is a file. The user owns the file and opens it offline. The application must work with no network and no account. A sync service can come later, but the file stays the primary copy.

**The document model resolves each style.** The model sets the value of each property on each element. The browser does not cascade or inherit a value. This rule keeps the document easy to serialize, to compare, and for an agent to change. The one exception is the inside of a component.

**A component is markup that the model does not read.** A component is an HTML template, a stylesheet, and a list of props. The document holds the source of the component and the props of each instance. The browser draws the component in a shadow root of the instance layer. A component has no state of its own: each state is a prop.
Result: a user takes a component from a coding project, and the export gives the same markup. An agent reads and writes the props, and copies the source of the components that it needs.
Cost: the model does not know the elements inside a component. The size of an instance that hugs its markup comes from the browser.

## Architecture

**Reactivity.** React reads the document through one subscription for each layer. A change to one layer draws that layer only. This is true for a local change and for a remote change.

**Multiplayer uses three separate channels.** The document merges through the CRDT, and it is durable. Presence data expires, and it must not go into the document. Two users who select different layers do not make a conflict. Identity comes from the login.

**Undo applies to one peer.** A user undoes only the edits of that user. Undo applies an opposite operation. That operation can replace a newer edit from a different user. Decide the product behavior before you release multiplayer.

**Files.** A `.botframe` file holds the current state and the edit history. Each file has a version number, and the application migrates the file when it opens the file. HTML and CSS are an export only. The export is deterministic: two exports of one state give the same bytes. Each asset has a content address. The application does not load an asset from a different site.

**One render path.** The editor window, the export tool, and the CI screenshots use the same document view.

**Agents are clients.** An MCP server operates on the document API. It does not operate on the user interface.

**The main thread is for interaction.** Sync, export, and large queries run in a worker.

## Performance targets

| Metric | Target | Condition |
| --- | --- | --- |
| Warm start to visible window | less than 300 ms | framework in cache |
| Cold start to visible window | less than 1 s | first start after installation |
| Last document visible after the window | less than 100 ms | from local storage, no network |
| Pointer to pixel delay during a drag | 1 frame | 16 ms at 60 Hz, 8 ms at 120 Hz |
| Frame rate during a drag | the refresh rate of the display | 500 layers |
| Layer tree scroll | the refresh rate of the display | 10 000 nodes |
| Main thread for each pointer move | less than 2 ms | compositor not included |
| Renderer memory | less than 1 GB | 500 layers, 50 image assets |

Rules that come from these targets:
- Show the window before you load the document.
- Update from one animation frame. Do not update from each pointer event.
- Do not read the layout in a loop.
- Commit one change for each gesture.
- Use the CRDT for undo.

## Open questions

1. Does the DOM keep the frame rate with 500 layers during a drag? Does the layer tree scroll with 10 000 nodes?
2. How large does a `.botframe` file become in one work session? When must the application compact the history?
3. Which sync service? It must store and send opaque updates. It must also give login, access control, and asset storage.
4. Does text edit correctly in a container that has a transform and a zoom? Test the caret, the selection, and the input method editor.

## Rejected

- **A system WebView** (Tauri, Wails). The result is different on each operating system. It cannot run the effects pipeline.
- **A custom renderer for version 1** (WebGPU, CanvasKit). The project would own the layout and the text shape. Keep it as the alternative if the DOM limit is too low.
- **Yjs.** Yjs has no move operation. Two concurrent moves can duplicate or delete a node.
- **Document data in an observable store** (MobX, Legend-State, signals). The store makes a second copy. It also conflicts with the React Compiler.
- **HTML import.** HTML is an output. An import makes each browser feature a document feature. A component is not an import: the document keeps its markup as one value and does not make layers from it.
- **A separate history file.** Two files for one document become different.
- **A remote database as the primary copy.** The user loses offline use and file ownership.

## Future: effects

A shader layer captures the DOM below it as a GPU texture, applies a filter, and draws the result. Examples are blur, gradient, halftone, and image filters.

This work needs the HTML-in-Canvas API. Only Blink gives this API, and it is not yet stable. The version 1 architecture keeps the change small: the document view becomes a canvas that holds the same elements.

Before you start, measure the capture time for 500 layers. Confirm that text edit and shadow DOM still operate in the canvas. If the capture is too slow, use the custom renderer.
