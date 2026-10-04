import { LoroDoc } from "loro-crdt";
import { describe, expect, it } from "vitest";
import { CLIP_CHOICES, CLIP_OPTIONS, chosenClip, clipChoiceOf, clipSourceOf } from "./clips";
import { makeComponent } from "./componentActions";
import { DesignDocument } from "./document";
import type { Layer, LayerFields, LayerId } from "./layer";
import { parseEnvelope, serializeEnvelope } from "./envelope";
import { nodeOf } from "./path";
import { DOCUMENT_SCOPE } from "./variable";
import type { Variable } from "./variable";
import type { LayerNode } from "./subtree";

const SHAPE: LayerFields = {
	x: 0,
	y: 0,
	width: 100,
	height: 80,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "ellipse" },
};

interface Scene {
	doc: DesignDocument;
	photo: LayerId;
	blob: LayerId;
}

function layerOf(doc: DesignDocument, id: LayerId): Layer {
	const layer = doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

function subtreeOf(doc: DesignDocument, id: LayerId): LayerNode {
	const node = doc.readSubtree(id);
	if (node === null) {
		throw new Error("the subtree is missing");
	}
	return node;
}

function sceneOf(): Scene {
	const doc = DesignDocument.create();
	const photo = doc.createLayer({ ...SHAPE, name: "Photo" });
	const blob = doc.createLayer({ ...SHAPE, name: "Blob" });
	doc.commit("draw");
	return { doc, photo, blob };
}

describe("the clip layer of a layer", () => {
	it("is kept after a write, and an undo takes it away", () => {
		const { doc, photo, blob } = sceneOf();
		doc.update(photo, { clip: false, clipLayer: blob });
		doc.commit("clip to layer");

		expect(doc.layer(photo)?.clipLayer).toBe(blob);
		doc.undo();
		expect(doc.layer(photo)?.clipLayer).toBeNull();
	});

	it("wins over the own-shape clip, so the layer never holds both", () => {
		const { doc, photo, blob } = sceneOf();
		doc.update(photo, { clip: true, clipLayer: blob });

		expect(doc.layer(photo)).toMatchObject({ clip: false, clipLayer: blob });
		doc.update(photo, { clipLayer: null });
		expect(doc.layer(photo)).toMatchObject({ clip: true, clipLayer: null });
	});

	it("reads a value that is not a layer id as no clip layer", () => {
		const { doc, photo } = sceneOf();
		const peer = new LoroDoc();
		peer.setPeerId(77);
		peer.import(doc.snapshot());
		peer.getTree("layers").getNodeByID(nodeOf(photo))?.data.set("clipLayer", "far away");
		peer.commit();
		doc.merge(peer.export({ mode: "update" }));

		expect(layerOf(doc, photo).clipLayer).toBeNull();
	});
});

describe("the clip targets of a source", () => {
	it("lists the layers that a source clips, and follows each change", () => {
		const { doc, photo, blob } = sceneOf();
		expect(doc.clipTargetsOf(blob)).toEqual([]);

		doc.update(photo, { clipLayer: blob });
		expect(doc.clipTargetsOf(blob)).toEqual([photo]);

		doc.deleteLayer(photo);
		expect(doc.clipTargetsOf(blob)).toEqual([]);
	});

	it("does not list a layer that names itself or a lost layer", () => {
		const { doc, photo, blob } = sceneOf();
		doc.update(photo, { clipLayer: photo });
		doc.update(blob, { clipLayer: "99@99" });
		const read = (id: LayerId) => doc.layer(id);

		expect(doc.clipTargetsOf(photo)).toEqual([]);
		expect(clipSourceOf(read, layerOf(doc, photo))).toBeNull();
		expect(clipSourceOf(read, layerOf(doc, blob))).toBeNull();
	});

	it("give no source that holds the target, so the target never hides with it", () => {
		const { doc, photo } = sceneOf();
		const frame = doc.createLayer({ ...SHAPE, name: "Frame" });
		doc.move(photo, frame);
		doc.update(photo, { clipLayer: frame });

		expect(doc.clipTargetsOf(frame)).toEqual([]);
	});

	it("give no source in a cycle, so two layers that clip each other both stay", () => {
		const { doc, photo, blob } = sceneOf();
		doc.update(photo, { clipLayer: blob });
		doc.update(blob, { clipLayer: photo });

		expect(doc.clipTargetsOf(photo)).toEqual([]);
		expect(doc.clipTargetsOf(blob)).toEqual([]);
	});

	it("tell each subscriber when a clip changes", () => {
		const { doc, photo, blob } = sceneOf();
		let calls = 0;
		doc.subscribeClips(() => {
			calls += 1;
		});
		doc.update(photo, { fill: "#000000" });
		doc.update(photo, { clipLayer: blob });

		expect(calls).toBe(1);
	});
});

describe("a copy of clipped layers", () => {
	it("clips the copy to the copy of its source, also through the clipboard text", () => {
		const doc = DesignDocument.create();
		const frame = doc.createLayer({ ...SHAPE, name: "Frame" });
		const photo = doc.createLayer({ ...SHAPE, name: "Photo" }, frame);
		const blob = doc.createLayer({ ...SHAPE, name: "Blob" }, frame);
		doc.update(photo, { clipLayer: blob });
		const node = parseEnvelope(
			serializeEnvelope({
				sourceParent: null,
				sourceIds: [frame],
				layers: [subtreeOf(doc, frame)],
				components: {},
			}),
		)?.layers[0];
		if (node === undefined) {
			throw new Error("the clipboard text lost the tree");
		}

		const copy = doc.createSubtree(node, null);
		const [copyPhoto, copyBlob] = doc.childIds(copy);

		expect(copyBlob).not.toBe(blob);
		expect(copyPhoto === undefined ? null : layerOf(doc, copyPhoto).clipLayer).toBe(copyBlob);
	});
});

describe("a clip inside a component", () => {
	it("clips each copy to the copy of its source, and hides each copied source", () => {
		const doc = DesignDocument.create();
		const frame = doc.createLayer({
			...SHAPE,
			name: "Card",
			clip: true,
			geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
		});
		const photo = doc.createLayer({ ...SHAPE, name: "Photo" }, frame);
		const blob = doc.createLayer({ ...SHAPE, name: "Blob" }, frame);
		doc.update(photo, { clipLayer: blob });
		doc.commit("draw");
		makeComponent(doc, frame);
		doc.commit("make component");
		const [copyPhoto, copyBlob] = doc.childIds(frame);
		if (copyPhoto === undefined || copyBlob === undefined) {
			throw new Error("the copy lost its children");
		}
		const read = (id: LayerId) => doc.layer(id);

		expect(clipSourceOf(read, layerOf(doc, copyPhoto))?.id).toBe(copyBlob);
		expect(doc.clipTargetsOf(copyBlob)).not.toEqual([]);
	});
});

function cut(initial: string): Variable {
	return {
		id: "cut",
		name: "cut",
		type: "choice",
		initial,
		options: CLIP_OPTIONS,
	};
}

describe("a clip bound to a choice variable", () => {
	it("follows each of the three options, and keeps the picked layer for Layer", () => {
		const { doc, photo, blob } = sceneOf();
		doc.update(photo, { clipLayer: blob });
		const scope = doc.components.scope(DOCUMENT_SCOPE);
		scope.put(cut(CLIP_CHOICES.shape));
		doc.update(photo, { bindings: { clip: { var: "cut" } } });
		doc.commit("bind");
		expect(layerOf(doc, photo)).toMatchObject({ clip: true, clipLayer: null });

		scope.put(cut(CLIP_CHOICES.layer));
		expect(layerOf(doc, photo)).toMatchObject({ clip: false, clipLayer: blob });
		expect(clipChoiceOf(layerOf(doc, photo))).toBe(CLIP_CHOICES.layer);

		scope.put(cut(CLIP_CHOICES.none));
		expect(layerOf(doc, photo)).toMatchObject({ clip: false, clipLayer: null });
	});

	it("still reads a boolean variable as the own-shape clip", () => {
		expect(chosenClip({ clip: false, clipLayer: "4@1" }, true)).toEqual({
			clip: true,
			clipLayer: null,
		});
		expect(chosenClip({ clip: true, clipLayer: null }, "Sideways")).toBeNull();
	});
});
