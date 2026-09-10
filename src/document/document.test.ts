import { LoroDoc } from "loro-crdt";
import type { LoroMap } from "loro-crdt";
import { describe, expect, it, vi } from "vitest";
import { DesignDocument } from "./document";
import { firstId } from "./documentFixtures";
import type { LayerFields, LayerId } from "./layer";
import { readString } from "./read";

const DRAWN: LayerFields = {
	x: 12,
	y: 34,
	width: 56,
	height: 78,
	fill: "#ffffff",
	name: "Artboard 1",
	clip: true,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
};

function geometryBag(doc: LoroDoc, id: LayerId): LoroMap {
	const node = doc.getTree("layers").getNodeByID(id);
	if (node === undefined) {
		throw new Error("layer is missing");
	}
	return node.data.ensureMergeableMap("geometry");
}

describe("DesignDocument", () => {
	it("starts with one black rectangle", () => {
		const doc = DesignDocument.create();
		expect(doc.layerIds()).toHaveLength(1);
		expect(doc.layer(firstId(doc))).toMatchObject({
			x: 420,
			y: 260,
			width: 240,
			height: 160,
			fill: "#000000",
			geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0 },
		});
	});

	it("reads a moved position back before the move is committed", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.move(id, 11, 22);
		expect(doc.layer(id)).toMatchObject({ x: 11, y: 22 });
	});

	it("writes the box of a resize and the angle of a rotation", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);

		doc.resize(id, { x: 10, y: 20, width: 30, height: 40 });
		doc.rotate(id, 45);

		expect(doc.layer(id)).toMatchObject({ x: 10, y: 20, width: 30, height: 40, rotation: 45 });
	});

	it("reads a layer that no peer has turned as a layer at zero degrees", () => {
		const doc = DesignDocument.create();
		expect(doc.layer(firstId(doc))).toMatchObject({ rotation: 0 });
	});

	it("records one change per drag, not one per pointer move", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const before = doc.changeCount();
		for (let step = 0; step < 200; step += 1) {
			doc.move(id, step, step * 2);
		}
		doc.commit("move layer");
		expect(doc.changeCount()).toBe(before + 1);
		expect(doc.layer(id)).toMatchObject({ x: 199, y: 398 });
	});

	it("notifies only the layer that changed", () => {
		const doc = DesignDocument.create();
		const source = new LoroDoc();
		source.import(doc.snapshot());
		const second = source.getTree("layers").createNode();
		second.data.set("x", 0);
		source.commit();
		doc.merge(source.export({ mode: "update" }));

		const [first, other] = doc.layerIds();
		if (first === undefined || other === undefined) {
			throw new Error("expected two layers");
		}
		const firstListener = vi.fn<() => void>();
		const otherListener = vi.fn<() => void>();
		doc.subscribeLayer(first, firstListener);
		doc.subscribeLayer(other, otherListener);

		doc.move(first, 1, 1);

		expect(firstListener).toHaveBeenCalled();
		expect(otherListener).not.toHaveBeenCalled();
	});

	it("does not notify the layer list when a layer property changes", () => {
		const doc = DesignDocument.create();
		const structure = vi.fn<() => void>();
		doc.subscribeStructure(structure);
		doc.move(firstId(doc), 5, 5);
		doc.commit("move layer");
		expect(structure).not.toHaveBeenCalled();
	});

	it("returns a stable snapshot object so React does not re-render without a change", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		expect(doc.layer(id)).toBe(doc.layer(id));
		doc.move(id, 1, 2);
		expect(doc.layer(id)).not.toBe(null);
		expect(doc.layer(id)).toMatchObject({ x: 1, y: 2 });
	});

	it("notifies a layer subscriber when a remote peer moves it", async () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const listener = vi.fn<() => void>();
		doc.subscribeLayer(id, listener);

		const peer = new LoroDoc();
		peer.setPeerId(99);
		peer.import(doc.snapshot());
		const remoteNode = peer.getTree("layers").getNodeByID(id);
		remoteNode?.data.set("x", 777);
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));

		await vi.waitFor(() => {
			expect(listener).toHaveBeenCalled();
		});
		expect(doc.layer(id)).toMatchObject({ x: 777 });
	});

	it("stops notifying after unsubscribe", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const listener = vi.fn<() => void>();
		const unsubscribe = doc.subscribeLayer(id, listener);
		unsubscribe();
		doc.move(id, 3, 4);
		expect(listener).not.toHaveBeenCalled();
	});

	it("keeps the moved position through a snapshot round trip", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.move(id, 640, 480);
		doc.commit("move layer");
		expect(DesignDocument.open(doc.snapshot()).layer(id)).toMatchObject({ x: 640, y: 480 });
	});

	it("keeps the corner radius when a peer changes the kind to an ellipse", async () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.subscribeLayer(id, vi.fn<() => void>());

		const peer = new LoroDoc();
		peer.setPeerId(99);
		peer.import(doc.snapshot());
		const bag = geometryBag(peer, id);
		bag.ensureMergeableMap("rectangle").set("cornerRadius", 24);
		bag.set("kind", "ellipse");
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));
		await vi.waitFor(() => {
			expect(doc.layer(id)).toMatchObject({ geometry: { kind: "ellipse" } });
		});

		bag.set("kind", "rectangle");
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));
		await vi.waitFor(() => {
			expect(doc.layer(id)).toMatchObject({ geometry: { kind: "rectangle", cornerRadius: 24 } });
		});
	});

	it("reads a geometry that a newer build wrote as unsupported, and keeps it through a snapshot round trip", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);

		const peer = new LoroDoc();
		peer.setPeerId(77);
		peer.import(doc.snapshot());
		const bag = geometryBag(peer, id);
		bag.set("kind", "shader");
		bag.ensureMergeableMap("shader").set("source", "noise");
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));

		expect(DesignDocument.open(doc.snapshot()).layer(id)).toMatchObject({
			geometry: { kind: "unsupported" },
		});
		const roundTrip = new LoroDoc();
		roundTrip.import(doc.snapshot());
		expect(readString(geometryBag(roundTrip, id).ensureMergeableMap("shader"), "source", "")).toBe(
			"noise",
		);
	});
});

describe("the layer writer", () => {
	it("reads a layer that an older build wrote with no name, no clip, and no artboard flag", () => {
		const source = new LoroDoc();
		const node = source.getTree("layers").createNode();
		node.data.set("x", 10);
		node.data.set("y", 20);
		node.data.set("width", 30);
		node.data.set("height", 40);
		node.data.set("fill", "#123456");
		node.data.ensureMergeableMap("geometry").set("kind", "rectangle");
		source.commit();

		const doc = DesignDocument.open(source.export({ mode: "snapshot" }));

		expect(doc.layer(node.id)).toMatchObject({
			name: "",
			clip: false,
			geometry: { kind: "rectangle", artboard: false },
		});
	});

	it("creates a layer that reads back with each field", () => {
		const doc = DesignDocument.create();

		const id = doc.createLayer(DRAWN);

		expect(doc.layerIds()).toContain(id);
		expect(doc.layer(id)).toMatchObject({ id, rotation: 0, ...DRAWN });
	});

	it("records the create and each resize of one draw as one change", () => {
		const doc = DesignDocument.create();
		const before = doc.changeCount();

		const id = doc.createLayer(DRAWN);
		for (let step = 1; step <= 200; step += 1) {
			doc.resize(id, { x: 0, y: 0, width: step, height: step });
		}
		doc.commit("create artboard");

		expect(doc.changeCount()).toBe(before + 1);
		expect(doc.layer(id)).toMatchObject({ width: 200, height: 200 });
	});

	it("deletes a layer and drops it from the layer ids", () => {
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);

		doc.deleteLayer(id);

		expect(doc.layerIds()).not.toContain(id);
		expect(doc.layer(id)).toBeNull();
	});

	it("writes nothing to a layer that a delete took away", () => {
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);
		doc.deleteLayer(id);

		doc.resize(id, { x: 0, y: 0, width: 10, height: 10 });

		expect(doc.layer(id)).toBeNull();
	});

	it("notifies a subscriber of a live layer and none of a layer that a delete took away", () => {
		const doc = DesignDocument.create();
		const live = doc.createLayer(DRAWN);
		const gone = doc.createLayer(DRAWN);
		doc.deleteLayer(gone);
		const liveListener = vi.fn<() => void>();
		const goneListener = vi.fn<() => void>();
		doc.subscribeLayer(live, liveListener);
		doc.subscribeLayer(gone, goneListener);

		doc.resize(live, { x: 0, y: 0, width: 10, height: 10 });
		doc.resize(gone, { x: 0, y: 0, width: 10, height: 10 });

		expect(doc.layer(live)).toMatchObject({ width: 10, height: 10 });
		expect(doc.layer(gone)).toBeNull();
		expect(liveListener).toHaveBeenCalled();
		expect(goneListener).not.toHaveBeenCalled();
	});

	it("notifies the layer list on a create and on a delete", () => {
		const doc = DesignDocument.create();
		const structure = vi.fn<() => void>();
		doc.subscribeStructure(structure);

		const id = doc.createLayer(DRAWN);
		expect(structure).toHaveBeenCalled();

		structure.mockClear();
		doc.deleteLayer(id);
		expect(structure).toHaveBeenCalled();
	});
});

describe("the layer tree", () => {
	it("creates a layer inside a parent and keeps it out of the roots", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);

		const child = doc.createLayer(DRAWN, parent);

		expect(doc.childIds(parent)).toEqual([child]);
		expect(doc.rootIds()).not.toContain(child);
		expect(doc.rootIds()).toContain(parent);
		expect(doc.layer(child)).toMatchObject({ parent });
		expect(doc.layer(parent)).toMatchObject({ parent: null });
	});

	it("appends each new child after its siblings and holds that order through a snapshot", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const first = doc.createLayer(DRAWN, parent);
		const second = doc.createLayer(DRAWN, parent);
		doc.commit("create artboard");

		expect(doc.childIds(parent)).toEqual([first, second]);
		expect(DesignDocument.open(doc.snapshot()).childIds(parent)).toEqual([first, second]);
	});

	it("gives no children for a layer that holds none", () => {
		const doc = DesignDocument.create();
		expect(doc.childIds(firstId(doc))).toEqual([]);
	});

	it("returns a stable list of children so React does not re-render without a change", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		doc.createLayer(DRAWN, parent);

		expect(doc.childIds(parent)).toBe(doc.childIds(parent));
		expect(doc.rootIds()).toBe(doc.rootIds());
	});

	it("keeps the children of one layer stable when a layer joins a different parent", () => {
		const doc = DesignDocument.create();
		const a = doc.createLayer(DRAWN);
		const b = doc.createLayer(DRAWN);
		const before = doc.childIds(b);
		const roots = doc.rootIds();

		doc.createLayer(DRAWN, a);

		expect(doc.childIds(b)).toBe(before);
		expect(doc.rootIds()).toBe(roots);
		expect(doc.childIds(a)).toHaveLength(1);
	});

	it("gives a new list of children to the layer that took the new child", () => {
		const doc = DesignDocument.create();
		const a = doc.createLayer(DRAWN);
		const before = doc.childIds(a);

		doc.createLayer(DRAWN, a);

		expect(doc.childIds(a)).not.toBe(before);
	});

	it("keeps the snapshot of each other layer when a layer joins the tree", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const before = doc.layer(id);

		doc.createLayer(DRAWN);

		expect(doc.layer(id)).toBe(before);
	});

	it("takes the whole branch away when a delete takes the parent", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const child = doc.createLayer(DRAWN, parent);

		doc.deleteLayer(parent);

		expect(doc.layerIds()).not.toContain(child);
		expect(doc.layer(child)).toBeNull();
		expect(doc.childIds(parent)).toEqual([]);
	});

	it("notifies the layer list when a layer joins a parent", () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const structure = vi.fn<() => void>();
		doc.subscribeStructure(structure);

		doc.createLayer(DRAWN, parent);

		expect(structure).toHaveBeenCalled();
		expect(doc.childIds(parent)).toHaveLength(1);
	});
});
