import { LoroDoc } from "loro-crdt";
import type { LoroMap } from "loro-crdt";
import { describe, expect, it } from "vitest";
import { DesignDocument } from "./document";
import { DRAWN } from "./documentFixtures";
import type { LayerFields, LayerId } from "./layer";

const PLAIN: LayerFields = {
	...DRAWN,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

function loaded(snapshot: Uint8Array): LoroDoc {
	const doc = new LoroDoc();
	doc.import(snapshot);
	return doc;
}

function rectangleBag(doc: LoroDoc, id: LayerId): LoroMap {
	const node = doc.getTree("layers").getNodeByID(id);
	if (node === undefined) {
		throw new Error("layer is missing");
	}
	return node.data.ensureMergeableMap("geometry").ensureMergeableMap("rectangle");
}

describe("the stored layer format", () => {
	it("carries the frame flag of a rectangle through a save and a load", () => {
		const doc = DesignDocument.create();
		const frame = doc.createLayer(DRAWN);
		const plain = doc.createLayer(PLAIN);
		doc.commit("create frame");

		const reopened = DesignDocument.open(doc.snapshot());

		expect(reopened.layer(frame)).toMatchObject({
			geometry: { kind: "rectangle", artboard: true },
		});
		expect(reopened.layer(plain)).toMatchObject({
			geometry: { kind: "rectangle", artboard: false },
		});
	});

	it("writes the frame flag under the stored key that a saved file uses", () => {
		const doc = DesignDocument.create();
		const frame = doc.createLayer(DRAWN);
		doc.commit("create frame");

		expect(rectangleBag(loaded(doc.snapshot()), frame).get("artboard")).toBe(true);
	});

	it("reads the frame flag of a file that only holds the stored key", () => {
		const doc = DesignDocument.create();
		const id = doc.createLayer(PLAIN);
		doc.commit("create rectangle");

		const saved = loaded(doc.snapshot());
		rectangleBag(saved, id).set("artboard", true);
		saved.commit();

		expect(DesignDocument.open(saved.export({ mode: "snapshot" })).layer(id)).toMatchObject({
			geometry: { kind: "rectangle", artboard: true },
		});
	});
});
