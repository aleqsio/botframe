import type { DesignDocument } from "../document/document";
import { parseEnvelope, serializeEnvelope } from "../document/envelope";
import type { LayerEnvelope } from "../document/envelope";
import type { LayerId } from "../document/layer";
import { componentIdsOf } from "../document/subtree";
import type { LayerNode } from "../document/subtree";
import { bridge } from "./bridge";
import { verifiedSources } from "./componentImport";
import { layerMarkup } from "./layerMarkup";
import type { Bridge } from "./bridge";
import { PASTE_OFFSET, pasteParent, shiftLayer } from "./paste";
import type { UserState } from "./state/userState";
import type { Workspace } from "./state/workspace";

function selectedNodes(doc: DesignDocument, user: UserState): LayerNode[] {
	return user.selection.get().flatMap((id) => doc.readSubtree(id) ?? []);
}

function sourceParentOf(doc: DesignDocument, user: UserState): LayerId | null {
	const [selected] = user.selection.get();
	return selected === undefined ? null : (doc.layer(selected)?.parent ?? null);
}

function markupOf(doc: DesignDocument, nodes: readonly LayerNode[]): string {
	return nodes.map((node) => layerMarkup(node, (id) => doc.components.component(id))).join("");
}

async function sendToClipboard(
	shell: Bridge,
	user: UserState,
	html: string,
	layers: string | null,
): Promise<void> {
	await shell.writeClipboard({ html, layers });
	user.pasteReady.set(layers !== null);
}

function write(user: UserState, html: string, layers: string | null): boolean {
	const shell = bridge();
	if (shell === null) {
		return false;
	}
	void sendToClipboard(shell, user, html, layers);
	return true;
}

function pastedId(
	doc: DesignDocument,
	node: LayerNode,
	parent: LayerId | null,
	offset: number,
): LayerId {
	const id = doc.createSubtree(node, parent);
	shiftLayer(doc, id, offset);
	return id;
}

function createLayers(doc: DesignDocument, user: UserState, envelope: LayerEnvelope): void {
	if (envelope.layers.length === 0) {
		return;
	}
	doc.components.adopt(envelope.components);
	const parent = pasteParent((id) => doc.layer(id), user.selection.get(), envelope.sourceIds);
	const offset = parent === envelope.sourceParent ? PASTE_OFFSET : 0;
	const ids = envelope.layers.map((node) => pastedId(doc, node, parent, offset));
	user.selection.set(ids);
	doc.commit("paste layers");
}

async function readClipboard(shell: Bridge, doc: DesignDocument, user: UserState): Promise<void> {
	const raw = await shell.readClipboardLayers();
	const envelope = raw === null ? null : parseEnvelope(raw);
	if (envelope !== null) {
		createLayers(doc, user, {
			...envelope,
			components: await verifiedSources(envelope.components),
		});
	}
}

export function copySelection(doc: DesignDocument, user: UserState): boolean {
	const nodes = selectedNodes(doc, user);
	if (nodes.length === 0) {
		return false;
	}
	const envelope = {
		sourceParent: sourceParentOf(doc, user),
		sourceIds: user.selection.get(),
		layers: nodes,
		components: doc.components.sourcesOf(componentIdsOf(nodes)),
	};
	return write(user, markupOf(doc, nodes), serializeEnvelope(envelope));
}

export function copyAsHtml(doc: DesignDocument, user: UserState): boolean {
	const nodes = selectedNodes(doc, user);
	return nodes.length > 0 && write(user, markupOf(doc, nodes), null);
}

export function cutSelection(doc: DesignDocument, user: UserState): boolean {
	if (!copySelection(doc, user)) {
		return false;
	}
	for (const id of user.selection.get()) {
		doc.deleteLayer(id);
	}
	doc.commit("cut layers");
	return true;
}

export function pasteFromClipboard(doc: DesignDocument, user: UserState): boolean {
	const shell = bridge();
	if (shell === null) {
		return false;
	}
	void readClipboard(shell, doc, user);
	return true;
}

async function refreshPasteReady(shell: Bridge, user: UserState): Promise<void> {
	user.pasteReady.set(await shell.hasClipboardLayers());
}

export function watchClipboard(workspace: Workspace): void {
	const shell = bridge();
	if (shell === null) {
		return;
	}
	const refresh = (): void => {
		void refreshPasteReady(shell, workspace.active.get().user);
	};
	window.addEventListener("focus", refresh);
	workspace.active.subscribe(refresh);
	refresh();
}
