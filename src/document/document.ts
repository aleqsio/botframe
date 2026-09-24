import { LoroDoc } from "loro-crdt";
import type { LoroEventBatch, LoroTree, LoroTreeNode, TreeDiffItem } from "loro-crdt";
import { AssetStore } from "./assets";
import { DocumentHistory } from "./history";
import type { Layer, LayerFields, LayerId, LayerPatch } from "./layer";
import { readLayerData, writePatch } from "./layerData";
import { NO_BASIS, hasRelativeLength, settledLengths } from "./length";
import type { Basis, LayerLengths, Size } from "./length";
import { createSubtree, readSubtree } from "./subtree";
import type { LayerNode } from "./subtree";
import { notify, subscribeTo } from "./listeners";
import type { Unsubscribe } from "./listeners";

export type { Unsubscribe } from "./listeners";

const LAYERS = "layers";
const NO_IDS: readonly LayerId[] = [];

const SEED_RECTANGLE: LayerFields = {
	x: 420,
	y: 260,
	width: 240,
	height: 160,
	fill: "#000000",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
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

function sizeOf(layer: Layer): Size {
	return { width: layer.width, height: layer.height };
}

export class DesignDocument {
	readonly #doc: LoroDoc;
	readonly #history: DocumentHistory;
	readonly assets: AssetStore;
	readonly #layers = new Map<LayerId, Layer>();
	readonly #listeners = new Map<LayerId, Set<() => void>>();
	readonly #nodeSubscriptions = new Map<LayerId, Unsubscribe>();
	readonly #structureListeners = new Set<() => void>();
	readonly #changeListeners = new Set<() => void>();
	readonly #historyListeners = new Set<() => void>();
	readonly #children = new Map<LayerId, readonly LayerId[]>();
	readonly #wantedLengths = new Map<LayerId, LayerLengths>();
	#ids: readonly LayerId[] | null = null;
	#roots: readonly LayerId[] | null = null;

	constructor(doc: LoroDoc) {
		this.#doc = doc;
		this.#history = new DocumentHistory(doc);
		this.assets = new AssetStore(doc);
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

	siblingIds(parent: LayerId | null): readonly LayerId[] {
		return parent === null ? this.rootIds() : this.childIds(parent);
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
		const parent = node.parent()?.id ?? null;
		const layer: Layer = { id, parent, ...readLayerData(node.data, this.#basisOf(parent)) };
		this.#layers.set(id, layer);
		return layer;
	}

	basisOf(id: LayerId): Basis {
		return this.#basisOf(this.layer(id)?.parent ?? null);
	}

	createLayer(fields: LayerFields, parent: LayerId | null = null): LayerId {
		const node = this.#tree().createNode(parent ?? undefined);
		writePatch(node.data, fields, this.#basisOf(parent));
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
		if (!this.#canMove(id, parent, index)) {
			return false;
		}
		const before = this.layer(id);
		this.#tree().move(id, parent ?? undefined, index);
		this.#forget(id);
		this.#notifyStructure();
		if (before !== null) {
			this.#settleUnits(id, before);
		}
		return true;
	}

	subscribeStructure(listener: () => void): Unsubscribe {
		return subscribeTo(this.#structureListeners, listener);
	}

	subscribeChanges(listener: () => void): Unsubscribe {
		return subscribeTo(this.#changeListeners, listener);
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
		writePatch(node.data, patch, this.#basisOf(node.parent()?.id ?? null));
		this.#refreshLayer(id);
	}

	commit(message: string): void {
		this.#wantedLengths.clear();
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

	version(): string {
		return JSON.stringify(this.#doc.oplogFrontiers());
	}

	changeCount(): number {
		return this.#doc.exportJsonUpdates().changes.length;
	}

	#settleUnits(id: LayerId, before: Layer): void {
		const node = this.#liveNode(id);
		if (node === null) {
			return;
		}
		const wanted = this.#wantedLengths.get(id) ?? before.lengths;
		if (hasRelativeLength(wanted)) {
			this.#wantedLengths.set(id, wanted);
		}
		const basis = this.#basisOf(node.parent()?.id ?? null);
		const box = { lengths: before.lengths, pixels: before };
		this.update(id, { lengths: settledLengths(wanted, box, basis) });
	}

	#basisOf(parent: LayerId | null): Basis {
		const container = parent === null ? null : this.layer(parent);
		if (container === null) {
			return NO_BASIS;
		}
		return { container: sizeOf(container), root: this.#rootSize(container) };
	}

	#rootSize(container: Layer): Size {
		let held = container;
		while (held.parent !== null) {
			const above = this.layer(held.parent);
			if (above === null) {
				break;
			}
			held = above;
		}
		return sizeOf(held);
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
		this.#wantedLengths.clear();
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
		notify(this.#changeListeners);
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
				this.#refreshLayer(item.target);
			}
		}
	}

	#canMove(id: LayerId, parent: LayerId | null, index: number | undefined): boolean {
		if (this.#liveNode(id) === null) {
			return false;
		}
		if (parent !== null && (this.#liveNode(parent) === null || this.#insideSubtree(id, parent))) {
			return false;
		}
		return index === undefined || this.#fitsIndex(id, parent, index);
	}

	#fitsIndex(id: LayerId, parent: LayerId | null, index: number): boolean {
		const siblings = this.siblingIds(parent);
		const room = siblings.length - (siblings.includes(id) ? 1 : 0);
		return Number.isInteger(index) && index >= 0 && index <= room;
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
					this.#refreshLayer(id);
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

	#refreshLayer(id: LayerId): void {
		const stale = this.#layers.get(id);
		this.#invalidate(id);
		if (stale !== undefined && this.#resized(stale, id)) {
			this.#dropRelativeBelow(this.#tree().getNodeByID(id));
		}
	}

	#resized(stale: Layer, id: LayerId): boolean {
		const next = this.layer(id);
		return next !== null && (next.width !== stale.width || next.height !== stale.height);
	}

	#dropRelativeBelow(node: LoroTreeNode | undefined): void {
		for (const child of node?.children() ?? []) {
			const cached = this.#layers.get(child.id);
			if (cached !== undefined && hasRelativeLength(cached.lengths)) {
				this.#invalidate(child.id);
			}
			this.#dropRelativeBelow(child);
		}
	}

	#invalidate(id: LayerId): void {
		this.#layers.delete(id);
		notify(this.#listeners.get(id) ?? []);
		notify(this.#changeListeners);
	}
}
