import { LoroDoc } from "loro-crdt";
import type { LoroMap, LoroTree, TreeID } from "loro-crdt";

export type LayerId = TreeID;

export type Unsubscribe = () => void;

export interface Layer {
	id: LayerId;
	x: number;
	y: number;
	width: number;
	height: number;
	fill: string;
}

const LAYERS = "layers";

function readNumber(data: LoroMap, key: string, fallback: number): number {
	const value = data.get(key);
	return typeof value === "number" ? value : fallback;
}

function readString(data: LoroMap, key: string, fallback: string): string {
	const value = data.get(key);
	return typeof value === "string" ? value : fallback;
}

export class DesignDocument {
	readonly #doc: LoroDoc;
	readonly #layers = new Map<LayerId, Layer>();
	readonly #listeners = new Map<LayerId, Set<() => void>>();
	readonly #nodeSubscriptions = new Map<LayerId, Unsubscribe>();
	readonly #structureListeners = new Set<() => void>();
	#ids: LayerId[] | null = null;

	constructor(doc: LoroDoc) {
		this.#doc = doc;
		this.#doc.subscribe((event) => {
			if (event.events.some((entry) => entry.diff.type === "tree")) {
				this.#ids = null;
				for (const listener of this.#structureListeners) {
					listener();
				}
			}
		});
	}

	static create(): DesignDocument {
		const doc = new LoroDoc();
		const node = doc.getTree(LAYERS).createNode();
		node.data.set("x", 420);
		node.data.set("y", 260);
		node.data.set("width", 240);
		node.data.set("height", 160);
		node.data.set("fill", "#000000");
		doc.commit({ message: "create rectangle" });
		return new DesignDocument(doc);
	}

	static open(snapshot: Uint8Array): DesignDocument {
		const doc = new LoroDoc();
		doc.import(snapshot);
		return new DesignDocument(doc);
	}

	layerIds(): LayerId[] {
		this.#ids ??= this.#tree()
			.getNodes()
			.map((node) => node.id);
		return this.#ids;
	}

	layer(id: LayerId): Layer | null {
		const cached = this.#layers.get(id);
		if (cached !== undefined) {
			return cached;
		}
		const node = this.#tree().getNodeByID(id);
		if (node === undefined) {
			return null;
		}
		const layer: Layer = {
			id,
			x: readNumber(node.data, "x", 0),
			y: readNumber(node.data, "y", 0),
			width: readNumber(node.data, "width", 0),
			height: readNumber(node.data, "height", 0),
			fill: readString(node.data, "fill", "#000000"),
		};
		this.#layers.set(id, layer);
		return layer;
	}

	subscribeStructure(listener: () => void): Unsubscribe {
		this.#structureListeners.add(listener);
		return () => {
			this.#structureListeners.delete(listener);
		};
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

	move(id: LayerId, x: number, y: number): void {
		const node = this.#tree().getNodeByID(id);
		if (node === undefined) {
			return;
		}
		node.data.set("x", x);
		node.data.set("y", y);
		this.#invalidate(id);
	}

	commit(message: string): void {
		this.#doc.commit({ message });
	}

	snapshot(): Uint8Array {
		return this.#doc.export({ mode: "snapshot" });
	}

	merge(update: Uint8Array): void {
		this.#doc.import(update);
	}

	subscribeLocalUpdates(listener: (update: Uint8Array) => void): Unsubscribe {
		return this.#doc.subscribeLocalUpdates(listener);
	}

	changeCount(): number {
		return this.#doc.exportJsonUpdates().changes.length;
	}

	#tree(): LoroTree {
		return this.#doc.getTree(LAYERS);
	}

	#trackLayer(id: LayerId): Set<() => void> {
		const listeners = new Set<() => void>();
		this.#listeners.set(id, listeners);
		const node = this.#tree().getNodeByID(id);
		if (node !== undefined) {
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
		for (const listener of this.#listeners.get(id) ?? []) {
			listener();
		}
	}
}
