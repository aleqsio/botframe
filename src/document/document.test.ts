import { LoroDoc } from "loro-crdt";
import type { LoroMap } from "loro-crdt";
import { describe, expect, it, vi } from "vitest";
import { DesignDocument } from "./document";
import { DRAWN, firstId } from "./documentFixtures";
import { SKEW_LIMIT } from "./layer";
import type { LayerId } from "./layer";
import { readString } from "./read";

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
		doc.update(id, { x: 11, y: 22 });
		expect(doc.layer(id)).toMatchObject({ x: 11, y: 22 });
	});

	it("writes the box of a resize and the angle of a rotation", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);

		doc.update(id, { x: 10, y: 20, width: 30, height: 40 });
		doc.update(id, { rotation: 45 });

		expect(doc.layer(id)).toMatchObject({ x: 10, y: 20, width: 30, height: 40, rotation: 45 });
	});

	it("holds a skew that a peer wrote inside the limit, so the layer stays drawable", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);

		doc.update(id, { skewX: 89, skewY: 0 });
		expect(doc.layer(id)?.skewX).toBe(SKEW_LIMIT);

		doc.update(id, { skewX: -30, skewY: 0 });
		expect(doc.layer(id)?.skewX).toBe(-30);

		doc.update(id, { skewX: Number.NaN, skewY: 0 });
		expect(doc.layer(id)?.skewX).toBe(0);
	});

	it("reads a layer that no peer has turned as a layer at zero degrees", () => {
		const doc = DesignDocument.create();
		expect(doc.layer(firstId(doc))).toMatchObject({ rotation: 0 });
	});

	it("turns a layer about its center until a peer moves the origin, one axis at a time", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		expect(doc.layer(id)).toMatchObject({ origin: { x: 0.5, y: 0.5 } });

		doc.update(id, { origin: { x: 0 } });
		expect(doc.layer(id)).toMatchObject({ origin: { x: 0, y: 0.5 } });

		doc.update(id, { origin: { x: 0.5, y: 1 } });
		expect(doc.layer(id)).toMatchObject({ origin: { x: 0.5, y: 1 } });
	});

	it("records one change per drag, not one per pointer move", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const before = doc.changeCount();
		for (let step = 0; step < 200; step += 1) {
			doc.update(id, { x: step, y: step * 2 });
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

		doc.update(first, { x: 1, y: 1 });

		expect(firstListener).toHaveBeenCalled();
		expect(otherListener).not.toHaveBeenCalled();
	});

	it("does not notify the layer list when a layer property changes", () => {
		const doc = DesignDocument.create();
		const structure = vi.fn<() => void>();
		doc.subscribeStructure(structure);
		doc.update(firstId(doc), { x: 5, y: 5 });
		doc.commit("move layer");
		expect(structure).not.toHaveBeenCalled();
	});

	it("returns a stable snapshot object so React does not re-render without a change", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		expect(doc.layer(id)).toBe(doc.layer(id));
		doc.update(id, { x: 1, y: 2 });
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
		doc.update(id, { x: 3, y: 4 });
		expect(listener).not.toHaveBeenCalled();
	});

	it("keeps the moved position through a snapshot round trip", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.update(id, { x: 640, y: 480 });
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

describe("a remote delete or move", () => {
	it("forgets a parent and its child when a remote peer deletes the parent", async () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const child = doc.createLayer(DRAWN, parent);
		doc.commit("create frame");
		expect(doc.layer(parent)).not.toBeNull();
		expect(doc.layer(child)).not.toBeNull();

		const peer = new LoroDoc();
		peer.setPeerId(99);
		peer.import(doc.snapshot());
		peer.getTree("layers").delete(parent);
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));

		await vi.waitFor(() => {
			expect(doc.layer(parent)).toBeNull();
			expect(doc.layer(child)).toBeNull();
		});
		expect(doc.layerIds()).not.toContain(parent);
		expect(doc.layerIds()).not.toContain(child);
	});

	it("notifies the subscriber of a layer that a remote peer deletes", async () => {
		const doc = DesignDocument.create();
		const parent = doc.createLayer(DRAWN);
		const child = doc.createLayer(DRAWN, parent);
		doc.commit("create frame");
		const listener = vi.fn<() => void>();
		doc.subscribeLayer(child, listener);

		const peer = new LoroDoc();
		peer.setPeerId(99);
		peer.import(doc.snapshot());
		peer.getTree("layers").delete(parent);
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));

		await vi.waitFor(() => {
			expect(listener).toHaveBeenCalled();
		});
	});

	it("reads the new parent of a layer that a remote peer moves and notifies its subscriber", async () => {
		const doc = DesignDocument.create();
		const from = doc.createLayer(DRAWN);
		const to = doc.createLayer(DRAWN);
		const child = doc.createLayer(DRAWN, from);
		doc.commit("create frame");
		expect(doc.layer(child)).toMatchObject({ parent: from });
		const listener = vi.fn<() => void>();
		doc.subscribeLayer(child, listener);

		const peer = new LoroDoc();
		peer.setPeerId(99);
		peer.import(doc.snapshot());
		peer.getTree("layers").move(child, to);
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));

		await vi.waitFor(() => {
			expect(listener).toHaveBeenCalled();
		});
		expect(doc.layer(child)).toMatchObject({ parent: to });
		expect(doc.childIds(from)).toEqual([]);
		expect(doc.childIds(to)).toEqual([child]);
	});

	it("deletes nothing and throws nothing for a layer that a peer deleted", () => {
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);
		doc.commit("create frame");
		const peer = new LoroDoc();
		peer.setPeerId(99);
		peer.import(doc.snapshot());
		peer.getTree("layers").delete(id);
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));

		expect(() => {
			doc.deleteLayer(id);
		}).not.toThrow();
		expect(doc.layerIds()).not.toContain(id);
	});
});

describe("the layer writer", () => {
	it("reads a layer that an older build wrote with no name, no clip, and no frame flag", () => {
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
			geometry: { kind: "rectangle", frame: false },
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
			doc.update(id, { x: 0, y: 0, width: step, height: step });
		}
		doc.commit("create frame");

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

		doc.update(id, { x: 0, y: 0, width: 10, height: 10 });

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

		doc.update(live, { x: 0, y: 0, width: 10, height: 10 });
		doc.update(gone, { x: 0, y: 0, width: 10, height: 10 });

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

describe("the field writers", () => {
	it("writes the name, the clip flag, and the fill", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);

		doc.update(id, { name: "Cover", clip: true, fill: "#ff0000" });

		expect(doc.layer(id)).toMatchObject({ name: "Cover", clip: true, fill: "#ff0000" });
	});

	it("writes the corner radius and the corner smoothing of the geometry", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);

		doc.update(id, {
			geometry: { kind: "rectangle", cornerRadius: 12, cornerSmoothing: 0.6, frame: true },
		});

		expect(doc.layer(id)).toMatchObject({
			geometry: { kind: "rectangle", cornerRadius: 12, cornerSmoothing: 0.6, frame: true },
		});
	});

	it("notifies the layer of a name change and of a geometry change", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const listener = vi.fn<() => void>();
		doc.subscribeLayer(id, listener);

		doc.update(id, { name: "Cover" });
		expect(listener).toHaveBeenCalled();

		listener.mockClear();
		doc.update(id, {
			geometry: { kind: "rectangle", cornerRadius: 4, cornerSmoothing: 0, frame: false },
		});
		expect(listener).toHaveBeenCalled();
	});

	it("writes nothing to a layer that a delete took away", () => {
		const doc = DesignDocument.create();
		const id = doc.createLayer(DRAWN);
		doc.deleteLayer(id);

		doc.update(id, { name: "Cover" });
		doc.update(id, { clip: false });
		doc.update(id, { fill: "#ff0000" });
		doc.update(id, { geometry: { kind: "ellipse" } });

		expect(doc.layer(id)).toBeNull();
	});

	it("records one change for a name that a person types letter by letter", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		const before = doc.changeCount();

		for (const name of ["C", "Co", "Cov", "Cove", "Cover"]) {
			doc.update(id, { name: name });
		}
		doc.commit("rename layer");

		expect(doc.changeCount()).toBe(before + 1);
		expect(doc.layer(id)).toMatchObject({ name: "Cover" });
	});
});
