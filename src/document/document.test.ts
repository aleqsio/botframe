import { LoroDoc } from "loro-crdt";
import type { LoroMap } from "loro-crdt";
import { describe, expect, it, vi } from "vitest";
import { DesignDocument } from "./document";
import type { LayerId } from "./layer";
import { readString } from "./read";

function firstId(doc: DesignDocument): LayerId {
	const [id] = doc.layerIds();
	if (id === undefined) {
		throw new Error("document has no layers");
	}
	return id;
}

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
