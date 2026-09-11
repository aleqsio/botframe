import { LoroDoc } from "loro-crdt";
import type { LoroEventBatch, LoroMap, LoroTree, LoroTreeNode, TreeDiffItem } from "loro-crdt";
import { DocumentHistory } from "./history";
import type { Geometry, Layer, LayerFields, LayerId, LayerPatch } from "./layer";
import { readBoolean, readNumber, readString, readVariant } from "./read";
import { createSubtree, readSubtree } from "./subtree";
import type { LayerNode } from "./subtree";
import { writeVariant } from "./write";

export type Unsubscribe = () => void;

const LAYERS = "layers";
const NO_IDS: readonly LayerId[] = [];
const GEOMETRY = "geometry";

const SEED_RECTANGLE: LayerFields = {
	x: 420,
	y: 260,
	width: 240,
	height: 160,
	fill: "#000000",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

const GEOMETRY_READERS: Readonly<
	Record<Exclude<Geometry["kind"], "unsupported">, (fields: LoroMap | null) => Geometry>
> = {
	rectangle: (fields) => ({
		kind: "rectangle",
		cornerRadius: readNumber(fields, "cornerRadius", 0),
		cornerSmoothing: readNumber(fields, "cornerSmoothing", 0),
		artboard: readBoolean(fields, "artboard", false),
	}),
	ellipse: () => ({ kind: "ellipse" }),
	path: (fields) => ({ kind: "path", d: readString(fields, "d", "") }),
};

function sameIds(cached: readonly LayerId[], next: readonly LayerId[]): boolean {
	return cached.length === next.length && cached.every((id, index) => id === next[index]);
}

function refreshed(cached: readonly LayerId[], next: readonly LayerId[]): readonly LayerId[] {
	return sameIds(cached, next) ? cached : next;
}

function treeItems(event: LoroEventBatch): TreeDiffItem[] {
	return event.events.flatMap((entry) => (entry.diff.type === "tree" ? entry.diff.diff : []));
}

function childIdsOf(node: LoroTreeNode): readonly LayerId[] {
	return node.children()?.map((child) => child.id) ?? NO_IDS;
}

function subscribeTo(listeners: Set<() => void>, listener: () => void): Unsubscribe {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function notify(listeners: Iterable<() => void>): void {
	for (const listener of listeners) {
		listener();
	}
}

function writePatch(data: LoroMap, patch: LayerPatch): void {
	const { geometry, ...fields } = patch;
	for (const [key, value] of Object.entries(fields)) {
		data.set(key, value);
	}
	if (geometry !== undefined) {
		writeVariant(data.ensureMergeableMap(GEOMETRY), geometry);
	}
}

export class DesignDocument {
	readonly #doc: LoroDoc;
	readonly #history: DocumentHistory;
	readonly #layers = new Map<LayerId, Layer>();
	readonly #listeners = new Map<LayerId, Set<() => void>>();
	readonly #nodeSubscriptions = new Map<LayerId, Unsubscribe>();
	readonly #structureListeners = new Set<() => void>();
	readonly #historyListeners = new Set<() => void>();
	readonly #children = new Map<LayerId, readonly LayerId[]>();
	#ids: readonly LayerId[] | null = null;
	#roots: readonly LayerId[] | null = null;

	constructor(doc: LoroDoc) {
		this.#doc = doc;
		this.#history = new DocumentHistory(doc);
		this.#doc.subscribe((event) => {
			const items = treeItems(event);
			if (items.length === 0) {
				return;
			}
			if (event.by !== "local") {
				this.#dropStale(items);
			}
			this.#notifyStructure();
		});
	}

	static create(): DesignDocument {
		const document = new DesignDocument(new LoroDoc());
		document.createLayer(SEED_RECTANGLE);
		document.commit("create rectangle");
		document.#clearHistory();
		return document;
	}

	static open(snapshot: Uint8Array): DesignDocument {
		const doc = new LoroDoc();
		doc.import(snapshot);
		return new DesignDocument(doc);
	}

	layerIds(): readonly LayerId[] {
		this.#ids ??= this.#tree()
			.getNodes()
			.map((node) => node.id);
		return this.#ids;
	}

	rootIds(): readonly LayerId[] {
		this.#roots ??= this.#readRoots();
		return this.#roots;
	}

	childIds(parent: LayerId): readonly LayerId[] {
		const cached = this.#children.get(parent);
		if (cached !== undefined) {
			return cached;
		}
		const node = this.#liveNode(parent);
		if (node === null) {
			return NO_IDS;
		}
		const ids = childIdsOf(node);
		this.#children.set(parent, ids);
		return ids;
	}

	layer(id: LayerId): Layer | null {
		const cached = this.#layers.get(id);
		if (cached !== undefined) {
			return cached;
		}
		const node = this.#liveNode(id);
		if (node === null) {
			return null;
		}
		const layer: Layer = {
			id,
			x: readNumber(node.data, "x", 0),
			y: readNumber(node.data, "y", 0),
			width: readNumber(node.data, "width", 0),
			height: readNumber(node.data, "height", 0),
			rotation: readNumber(node.data, "rotation", 0),
			fill: readString(node.data, "fill", "#000000"),
			geometry: readVariant<Geometry>(node.data.get(GEOMETRY), GEOMETRY_READERS, {
				kind: "unsupported",
			}),
			name: readString(node.data, "name", ""),
			clip: readBoolean(node.data, "clip", false),
			parent: node.parent()?.id ?? null,
		};
		this.#layers.set(id, layer);
		return layer;
	}

	createLayer(fields: LayerFields, parent: LayerId | null = null): LayerId {
		const node = this.#tree().createNode(parent ?? undefined);
		writePatch(node.data, fields);
		this.#notifyStructure();
		return node.id;
	}

	readSubtree(id: LayerId): LayerNode | null {
		return readSubtree(this, id);
	}

	createSubtree(node: LayerNode, parent: LayerId | null): LayerId {
		return createSubtree(this, node, parent);
	}

	deleteLayer(id: LayerId): void {
		if (this.#liveNode(id) === null) {
			return;
		}
		this.#tree().delete(id);
		this.#forget(id);
		this.#notifyStructure();
	}

	move(id: LayerId, parent: LayerId | null, index?: number): boolean {
		if (!this.#canMove(id, parent)) {
			return false;
		}
		this.#tree().move(id, parent ?? undefined, index);
		this.#forget(id);
		this.#notifyStructure();
		return true;
	}

	subscribeStructure(listener: () => void): Unsubscribe {
		return subscribeTo(this.#structureListeners, listener);
	}

	subscribeLayer(id: LayerId, listener: () => void): Unsubscribe {
		const listeners = this.#listeners.get(id) ?? this.#trackLayer(id);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
			if (listeners.size === 0) {
				this.#untrackLayer(id);
			}
		};
	}

	update(id: LayerId, patch: LayerPatch): void {
		const node = this.#liveNode(id);
		if (node === null) {
			return;
		}
		writePatch(node.data, patch);
		this.#invalidate(id);
	}

	commit(message: string): void {
		this.#doc.commit({ message });
		this.#refreshHistory();
	}

	undo(): boolean {
		return this.#applyHistory(() => this.#history.undo());
	}

	redo(): boolean {
		return this.#applyHistory(() => this.#history.redo());
	}

	canUndo(): boolean {
		return this.#history.flags().canUndo;
	}

	canRedo(): boolean {
		return this.#history.flags().canRedo;
	}

	subscribeHistory(listener: () => void): Unsubscribe {
		return subscribeTo(this.#historyListeners, listener);
	}

	snapshot(): Uint8Array {
		return this.#doc.export({ mode: "snapshot" });
	}

	merge(update: Uint8Array): void {
		this.#doc.import(update);
		this.#refreshHistory();
	}

	subscribeLocalUpdates(listener: (update: Uint8Array) => void): Unsubscribe {
		return this.#doc.subscribeLocalUpdates(listener);
	}

	changeCount(): number {
		return this.#doc.exportJsonUpdates().changes.length;
	}

	#applyHistory(step: () => boolean): boolean {
		const stepped = step();
		if (stepped) {
			this.#forgetEveryCache();
		}
		this.#refreshHistory();
		return stepped;
	}

	#forgetEveryCache(): void {
		this.#layers.clear();
		this.#children.clear();
		for (const listeners of this.#listeners.values()) {
			notify(listeners);
		}
		this.#notifyStructure();
	}

	#clearHistory(): void {
		this.#history.clear();
		this.#refreshHistory();
	}

	#refreshHistory(): void {
		if (this.#history.refresh()) {
			notify(this.#historyListeners);
		}
	}

	#notifyStructure(): void {
		this.#ids = null;
		this.#roots = this.#roots === null ? null : refreshed(this.#roots, this.#readRoots());
		this.#refreshChildren();
		notify(this.#structureListeners);
	}

	#readRoots(): readonly LayerId[] {
		return this.#tree()
			.roots()
			.map((node) => node.id);
	}

	#refreshChildren(): void {
		for (const [parent, cached] of this.#children) {
			const node = this.#liveNode(parent);
			if (node === null) {
				this.#children.delete(parent);
			} else {
				this.#children.set(parent, refreshed(cached, childIdsOf(node)));
			}
		}
	}

	#dropStale(items: readonly TreeDiffItem[]): void {
		for (const item of items) {
			if (item.action === "delete") {
				this.#forget(item.target);
			} else {
				this.#invalidate(item.target);
			}
		}
	}

	#canMove(id: LayerId, parent: LayerId | null): boolean {
		if (this.#liveNode(id) === null) {
			return false;
		}
		if (parent === null) {
			return true;
		}
		return this.#liveNode(parent) !== null && !this.#insideSubtree(id, parent);
	}

	#insideSubtree(id: LayerId, parent: LayerId): boolean {
		let node = this.#tree().getNodeByID(parent);
		while (node !== undefined) {
			if (node.id === id) {
				return true;
			}
			node = node.parent();
		}
		return false;
	}

	#forget(id: LayerId): void {
		this.#forgetNode(this.#tree().getNodeByID(id));
	}

	#forgetNode(node: LoroTreeNode | undefined): void {
		if (node === undefined) {
			return;
		}
		for (const child of node.children() ?? []) {
			this.#forgetNode(child);
		}
		const id = node.id;
		this.#invalidate(id);
		this.#children.delete(id);
	}

	#tree(): LoroTree {
		return this.#doc.getTree(LAYERS);
	}

	#liveNode(id: LayerId): LoroTreeNode | null {
		const node = this.#tree().getNodeByID(id);
		return node === undefined || node.isDeleted() ? null : node;
	}

	#trackLayer(id: LayerId): Set<() => void> {
		const listeners = new Set<() => void>();
		this.#listeners.set(id, listeners);
		const node = this.#liveNode(id);
		if (node !== null) {
			this.#nodeSubscriptions.set(
				id,
				node.data.subscribe(() => {
					this.#invalidate(id);
				}),
			);
		}
		return listeners;
	}

	#untrackLayer(id: LayerId): void {
		this.#nodeSubscriptions.get(id)?.();
		this.#nodeSubscriptions.delete(id);
		this.#listeners.delete(id);
	}

	#invalidate(id: LayerId): void {
		this.#layers.delete(id);
		notify(this.#listeners.get(id) ?? []);
	}
}
