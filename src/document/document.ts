import { LoroDoc } from "loro-crdt";
import type { LoroEventBatch, LoroTree, LoroTreeNode, TreeDiffItem } from "loro-crdt";
import { basisOf } from "./basis";
import { DocumentHistory } from "./history";
import type { Layer, LayerFields, LayerId, LayerPatch, LayerTraits } from "./layer";
import { readLayerData, writePatch } from "./layerData";
import { hasRelativeLength, settledLengths } from "./length";
import type { Basis, LayerLengths } from "./length";
import { sameCell } from "./layout";
import { LayoutTable } from "./layoutTable";
import { canMove } from "./moveRules";
import type { MoveRules } from "./moveRules";
import { createSubtree, readSubtree } from "./subtree";
import type { LayerNode } from "./subtree";

export type Unsubscribe = () => void;

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
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
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

function resized(stale: Layer, next: Layer): boolean {
	return next.width !== stale.width || next.height !== stale.height;
}

function flowChanged(stale: Layer, next: Layer): boolean {
	return resized(stale, next) || !sameCell(stale.cell, next.cell);
}

function notify(listeners: Iterable<() => void>): void {
	for (const listener of listeners) {
		listener();
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
	readonly #wantedLengths = new Map<LayerId, LayerLengths>();
	readonly #layouts: LayoutTable;
	readonly #rules: MoveRules = {
		live: (id) => this.#liveNode(id),
		siblings: (parent) => this.siblingIds(parent),
	};
	#ids: readonly LayerId[] | null = null;
	#roots: readonly LayerId[] | null = null;

	constructor(doc: LoroDoc) {
		this.#doc = doc;
		this.#history = new DocumentHistory(doc);
		this.#layouts = new LayoutTable({
			layer: (id) => this.layer(id),
			childIds: (parent) => this.childIds(parent),
			traitsOf: (id, parent) => {
				const node = this.#liveNode(id);
				return node === null ? null : this.#traitsOf(node, parent);
			},
			invalidate: (id) => {
				this.#invalidate(id);
			},
		});
		this.#doc.subscribe((event) => {
			const items = treeItems(event);
			if (items.length === 0) {
				return;
			}
			if (event.by !== "local") {
				this.#dropStale(items);
			}
			this.#notifyStructure();
			if (event.by !== "local") {
				this.#layouts.refreshAround(items);
			}
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
		const layer: Layer = {
			id,
			parent,
			...this.#traitsOf(node, parent),
			...this.#layouts.placementOf(parent, id),
		};
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
		this.#layouts.refresh(parent);
		return node.id;
	}

	readSubtree(id: LayerId): LayerNode | null {
		return readSubtree(this, id);
	}

	createSubtree(node: LayerNode, parent: LayerId | null): LayerId {
		return createSubtree(this, node, parent);
	}

	deleteLayer(id: LayerId): void {
		const node = this.#liveNode(id);
		if (node === null) {
			return;
		}
		const parent = node.parent()?.id ?? null;
		this.#tree().delete(id);
		this.#forget(id);
		this.#notifyStructure();
		this.#layouts.refresh(parent);
	}

	move(id: LayerId, parent: LayerId | null, index?: number): boolean {
		if (!canMove(this.#rules, id, parent, index)) {
			return false;
		}
		const before = this.layer(id);
		this.#tree().move(id, parent ?? undefined, index);
		this.#forget(id);
		this.#notifyStructure();
		this.#layouts.refresh(before?.parent ?? null);
		this.#layouts.refresh(parent);
		if (before !== null) {
			this.#settleUnits(id, before);
		}
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
		return basisOf((id) => this.layer(id), parent);
	}

	#traitsOf(node: LoroTreeNode, parent: LayerId | null): LayerTraits {
		return readLayerData(node.data, this.#basisOf(parent));
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
		this.#layouts.clear();
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
				this.#refreshLayer(item.target);
			}
		}
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
		const next = this.layer(id);
		if (next === null) {
			return;
		}
		if (stale === undefined || flowChanged(stale, next)) {
			this.#layouts.refresh(next.parent);
		}
		if (stale !== undefined && resized(stale, next)) {
			this.#dropRelativeBelow(this.#tree().getNodeByID(id));
		}
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
		this.#layouts.refresh(id);
	}
}
