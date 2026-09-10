import { LoroDoc } from "loro-crdt";
import type { LoroMap, LoroTree } from "loro-crdt";
import type { Geometry, Layer, LayerId, Rect } from "./layer";
import { readNumber, readString, readVariant } from "./read";
import { writeVariant } from "./write";

export type Unsubscribe = () => void;

const LAYERS = "layers";
const GEOMETRY = "geometry";

const GEOMETRY_READERS: Readonly<
	Record<Exclude<Geometry["kind"], "unsupported">, (fields: LoroMap | null) => Geometry>
> = {
	rectangle: (fields) => ({
		kind: "rectangle",
		cornerRadius: readNumber(fields, "cornerRadius", 0),
		cornerSmoothing: readNumber(fields, "cornerSmoothing", 0),
	}),
	ellipse: () => ({ kind: "ellipse" }),
	path: (fields) => ({ kind: "path", d: readString(fields, "d", "") }),
};

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
		const rectangle: Geometry = { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0 };
		writeVariant(node.data.ensureMergeableMap(GEOMETRY), rectangle);
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
			rotation: readNumber(node.data, "rotation", 0),
			fill: readString(node.data, "fill", "#000000"),
			geometry: readVariant<Geometry>(node.data.get(GEOMETRY), GEOMETRY_READERS, {
				kind: "unsupported",
			}),
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
		this.#write(id, { x, y });
	}

	resize(id: LayerId, rect: Rect): void {
		this.#write(id, rect);
	}

	rotate(id: LayerId, rotation: number): void {
		this.#write(id, { rotation });
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

	#write(id: LayerId, fields: Readonly<Record<string, number>>): void {
		const node = this.#tree().getNodeByID(id);
		if (node === undefined) {
			return;
		}
		for (const [key, value] of Object.entries(fields)) {
			node.data.set(key, value);
		}
		this.#invalidate(id);
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
