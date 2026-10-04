import { LoroDoc } from "loro-crdt";
import type { LoroEventBatch, TreeDiffItem, TreeID } from "loro-crdt";
import { AssetStore } from "./assets";
import { FontStore } from "./fonts";
import { clipTargetsIn } from "./clips";
import { readPath } from "./dataPath";
import type { DataPath } from "./dataPath";
import { deleteChecked, writeChecked } from "./dataEdit";
import { ComponentStore } from "./components";
import { DocumentHistory, KEPT_ORIGIN } from "./history";
import { fitGroups } from "./groupFit";
import { scaleGroup } from "./groupScale";
import type { GroupStart } from "./groupScale";
import { isGroup } from "./layer";
import type { Layer, LayerFields, LayerId, LayerPatch } from "./layer";
import { readLayer, unbindGeometry, writeLayer } from "./layerIo";
import { LayerTree, touchedNodes } from "./layerTree";
import { basisIn } from "./basis";
import { hasRelativeLength, settledLengths } from "./length";
import type { Basis, LayerLengths } from "./length";
import { notify, subscribeTo } from "./listeners";
import { nodeOf } from "./path";
import type { Unsubscribe } from "./listeners";
import { createSubtree, readSubtree } from "./subtree";
import type { LayerNode } from "./subtree";

export type { Unsubscribe } from "./listeners";

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

const NO_CLIP_TARGETS: readonly LayerId[] = [];

export class DesignDocument {
	readonly assets: AssetStore;
	readonly components: ComponentStore;
	readonly fonts: FontStore;
	readonly #doc: LoroDoc;
	readonly #history: DocumentHistory;
	readonly #tree: LayerTree;
	readonly #layers = new Map<LayerId, Layer>();
	readonly #listeners = new Map<LayerId, Set<() => void>>();
	readonly #structureListeners = new Set<() => void>();
	readonly #changeListeners = new Set<() => void>();
	readonly #historyListeners = new Set<() => void>();
	readonly #clipListeners = new Set<() => void>();
	#clipTargets: ReadonlyMap<TreeID, readonly LayerId[]> | null = null;
	readonly #children = new Map<LayerId, readonly LayerId[]>();
	readonly #wantedLengths = new Map<LayerId, LayerLengths>();
	readonly #groupStarts = new Map<LayerId, GroupStart>();
	readonly #read = (id: LayerId): Layer | null => this.layer(id);
	readonly #place = (id: LayerId, patch: LayerPatch): void => {
		this.#write(id, patch);
	};
	#ids: readonly LayerId[] | null = null;
	#roots: readonly LayerId[] | null = null;

	constructor(doc: LoroDoc) {
		this.#doc = doc;
		this.#history = new DocumentHistory(doc);
		this.assets = new AssetStore(doc);
		this.fonts = new FontStore(doc, this.assets);
		this.components = new ComponentStore(doc, (message, write) => {
			this.commit(message);
			write();
			this.#doc.commit({ origin: KEPT_ORIGIN, message });
			this.#refreshHistory();
		});
		this.#tree = new LayerTree(doc, this.components);
		this.components.subscribe(() => {
			this.#forgetLayers();
			this.#notifyStructure();
		});
		this.#doc.subscribe((event) => {
			this.#receive(event);
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

	get tree(): LayerTree {
		return this.#tree;
	}

	layerIds(): readonly LayerId[] {
		this.#ids ??= this.#tree.canvasNodes();
		return this.#ids;
	}

	rootIds(): readonly LayerId[] {
		this.#roots ??= this.#tree.canvasRoots();
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
		const ids = this.#tree.childIds(parent);
		this.#children.set(parent, ids);
		return ids;
	}

	layer(id: LayerId): Layer | null {
		const cached = this.#layers.get(id);
		if (cached !== undefined) {
			return cached;
		}
		const parent = this.#tree.parentOf(id);
		const traits = readLayer(this.#tree, id, basisIn(this.#read, parent));
		if (traits === null) {
			return null;
		}
		const layer: Layer = { id, parent, ...traits };
		this.#layers.set(id, layer);
		return layer;
	}

	basisOf(id: LayerId): Basis {
		return basisIn(this.#read, this.layer(id)?.parent ?? null);
	}

	createLayer(fields: LayerFields, parent: LayerId | null = null): LayerId {
		const node = this.#tree.tree().createNode(this.#tree.containerOf(parent));
		writeLayer(this.#tree, node.id, fields, basisIn(this.#read, parent));
		this.#notifyStructure();
		return this.#tree.pathIn(parent, node.id);
	}

	readSubtree(id: LayerId): LayerNode | null {
		return readSubtree(this, id);
	}

	createSubtree(node: LayerNode, parent: LayerId | null): LayerId {
		return createSubtree(this, node, parent);
	}

	deleteLayer(id: LayerId): void {
		const node = this.#tree.live(id);
		if (node === null) {
			return;
		}
		this.#invalidateBranch(node.id);
		this.#tree.tree().delete(node.id);
		this.#notifyStructure();
	}

	move(id: LayerId, parent: LayerId | null, index?: number): boolean {
		if (!this.#tree.canMove(id, parent, { index, siblings: this.siblingIds(parent) })) {
			return false;
		}
		const node = this.#tree.live(id);
		if (node === null) {
			return false;
		}
		const before = this.layer(id);
		const at = parent === null && index !== undefined ? this.#tree.rootIndex(id, index) : index;
		this.#tree.tree().move(node.id, this.#tree.containerOf(parent), at);
		this.#invalidateNode(node.id);
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
		const listeners = this.#listeners.get(id) ?? new Set();
		this.#listeners.set(id, listeners);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
			if (listeners.size === 0) {
				this.#listeners.delete(id);
			}
		};
	}

	update(id: LayerId, patch: LayerPatch): void {
		const before = this.layer(id);
		this.#write(id, patch);
		if (isGroup(before)) {
			scaleGroup(this, this.#groupStarts, before);
		}
	}

	#write(id: LayerId, patch: LayerPatch): void {
		const node = this.#tree.live(id);
		if (node === null) {
			return;
		}
		const allowed = this.#allowedPatch(node.parent()?.id, unbindGeometry(this.layer(id), patch));
		const basis = basisIn(this.#read, this.#tree.parentOf(id));
		for (const target of writeLayer(this.#tree, id, allowed, basis)) {
			this.#refreshNode(target);
		}
		if (patch.clipLayer !== undefined) {
			this.#clipsChanged();
		}
	}

	clipTargetsOf(id: LayerId): readonly LayerId[] {
		this.#clipTargets ??= clipTargetsIn(this);
		return this.#clipTargets.get(nodeOf(id)) ?? NO_CLIP_TARGETS;
	}

	subscribeClips(listener: () => void): Unsubscribe {
		return subscribeTo(this.#clipListeners, listener);
	}

	commit(message: string): void {
		fitGroups(this, this.#place);
		this.#groupStarts.clear();
		this.#wantedLengths.clear();
		this.#doc.commit({ message });
		this.fonts.writeWaiting();
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

	readData(path: DataPath): unknown {
		return readPath(this.#doc, path);
	}

	writeData(path: DataPath, value: unknown): void {
		writeChecked(this.#doc, path, value);
	}

	deleteData(path: DataPath): void {
		deleteChecked(this.#doc, path);
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

	#allowedPatch(container: TreeID | undefined, patch: LayerPatch): LayerPatch {
		const { content } = patch;
		if (content === undefined || content === null) {
			return patch;
		}
		if (this.#tree.canHold(container, content.component)) {
			return patch;
		}
		const { content: _refused, ...rest } = patch;
		return rest;
	}

	#settleUnits(id: LayerId, before: Layer): void {
		const wanted = this.#wantedLengths.get(id) ?? before.lengths;
		if (hasRelativeLength(wanted)) {
			this.#wantedLengths.set(id, wanted);
		}
		const basis = basisIn(this.#read, this.#tree.parentOf(id));
		const box = { lengths: before.lengths, pixels: before };
		this.update(id, { lengths: settledLengths(wanted, box, basis) });
	}

	#applyHistory(step: () => boolean): boolean {
		const stepped = step();
		if (stepped) {
			this.#wantedLengths.clear();
			this.#groupStarts.clear();
			this.#forgetLayers();
			this.#children.clear();
			this.#notifyStructure();
		}
		this.#refreshHistory();
		return stepped;
	}

	#clipsChanged(): void {
		this.#clipTargets = null;
		notify(this.#clipListeners);
	}

	#forgetLayers(): void {
		this.#clipsChanged();
		this.#layers.clear();
		for (const listeners of this.#listeners.values()) {
			notify(listeners);
		}
		notify(this.#changeListeners);
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

	#receive(event: LoroEventBatch): void {
		const touched = touchedNodes(event);
		for (const node of touched) {
			this.#refreshNode(node);
		}
		if (event.by !== "local" && touched.length > 0) {
			this.#clipsChanged();
		}
		const items = treeItems(event);
		if (items.length === 0) {
			return;
		}
		for (const item of items) {
			this.#invalidateBranch(item.target);
		}
		this.#notifyStructure();
	}

	#notifyStructure(): void {
		this.#clipsChanged();
		this.#ids = null;
		this.#roots = this.#roots === null ? null : refreshed(this.#roots, this.#tree.canvasRoots());
		for (const [parent, cached] of this.#children) {
			this.#children.set(parent, refreshed(cached, this.#tree.childIds(parent)));
		}
		notify(this.#structureListeners);
		notify(this.#changeListeners);
	}

	#refreshNode(node: TreeID): void {
		const stale = [...this.#layers.values()].filter((layer) => this.#tree.touches(layer.id, node));
		this.#invalidateNode(node);
		for (const layer of stale) {
			if (this.#resized(layer)) {
				this.#dropRelativeBelow(layer.id);
			}
		}
	}

	#resized(stale: Layer): boolean {
		const next = this.layer(stale.id);
		return next !== null && (next.width !== stale.width || next.height !== stale.height);
	}

	#dropRelativeBelow(id: LayerId): void {
		for (const child of this.childIds(id)) {
			const cached = this.#layers.get(child);
			if (cached !== undefined && hasRelativeLength(cached.lengths)) {
				this.#invalidate(child);
			}
			this.#dropRelativeBelow(child);
		}
	}

	#invalidateBranch(node: TreeID): void {
		const pending = [node];
		for (let held = pending.pop(); held !== undefined; held = pending.pop()) {
			this.#invalidateNode(held);
			pending.push(
				...(this.#tree.tree().getNodeByID(held)?.children() ?? []).map((child) => child.id),
			);
		}
	}

	#invalidateNode(node: TreeID): void {
		const component = this.#tree.definitionOwner(node);
		const ids = new Set([...this.#layers.keys(), ...this.#listeners.keys()]);
		for (const id of ids) {
			const touched = this.#tree.touches(id, node);
			if (touched || (component !== null && this.#tree.isCopyOf(id, component))) {
				this.#invalidate(id);
			}
		}
		this.#children.delete(node);
	}

	#invalidate(id: LayerId): void {
		this.#layers.delete(id);
		notify(this.#listeners.get(id) ?? []);
		notify(this.#changeListeners);
	}
}
