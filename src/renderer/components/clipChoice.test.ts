import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { Layer, LayerFields, LayerId } from "../../document/layer";
import {
	clipCandidates,
	clipLabelOf,
	clipLayerTitle,
	clipModeOf,
	clipModeOfValue,
	clipPatch,
	firstClipSource,
} from "./clipChoice";

const BOX: LayerFields = {
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
};

function layerOf(doc: DesignDocument, id: LayerId): Layer {
	const layer = doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

describe("clipModeOf", () => {
	it("names the clip a layer holds", () => {
		expect(clipModeOf({ clip: false, clipLayer: null })).toBe("none");
		expect(clipModeOf({ clip: true, clipLayer: null })).toBe("shape");
		expect(clipModeOf({ clip: false, clipLayer: "4@1" })).toBe("layer");
	});
});

describe("clipPatch", () => {
	it("writes the two keys together, so a layer never holds two clips", () => {
		expect(clipPatch("none", "4@1")).toEqual({ clip: false, clipLayer: null });
		expect(clipPatch("shape", null)).toEqual({ clip: true, clipLayer: null });
		expect(clipPatch("layer", "4@1")).toEqual({ clip: false, clipLayer: "4@1" });
	});
});

describe("the clip layer choices", () => {
	it("offer each layer but the layer itself and the layers that hold it", () => {
		const doc = DesignDocument.create();
		const [seed] = doc.layerIds();
		const frame = doc.createLayer(BOX);
		const photo = doc.createLayer(BOX, frame);
		const blob = doc.createLayer(BOX, frame);
		const ids = clipCandidates(doc, layerOf(doc, photo)).map((layer) => layer.id);

		expect(ids).toEqual([seed, blob]);
	});

	it("start with the layer just above, else the first choice", () => {
		const doc = DesignDocument.create();
		const photo = doc.createLayer(BOX);
		const blob = doc.createLayer(BOX);
		const target = layerOf(doc, photo);
		const top = layerOf(doc, blob);

		expect(firstClipSource(doc, target, clipCandidates(doc, target))).toBe(blob);
		expect(firstClipSource(doc, top, clipCandidates(doc, top))).toBe(doc.layerIds()[0]);
		expect(firstClipSource(doc, top, [])).toBeNull();
	});

	it("give a reason when no layer can clip", () => {
		const doc = DesignDocument.create();
		const only = layerOf(doc, doc.layerIds()[0] ?? "0@0");

		expect(clipLayerTitle(doc, only, [])).toBe("No other layer to clip to");
		expect(clipLayerTitle(doc, only, [only])).toBeUndefined();
		expect(clipLayerTitle(doc, { ...only, id: "1@1~2@1" }, [only])).toMatch(/component/u);
	});

	it("leave out a layer that would close a cycle, and a layer that a layout places", () => {
		const doc = DesignDocument.create();
		const row = doc.createLayer(BOX);
		doc.update(row, { layout: { display: "row" } });
		const placed = doc.createLayer(BOX, row);
		const photo = doc.createLayer(BOX);
		const blob = doc.createLayer(BOX);
		doc.update(blob, { clipLayer: photo });
		const ids = clipCandidates(doc, layerOf(doc, photo)).map((layer) => layer.id);

		expect(ids).not.toContain(blob);
		expect(ids).not.toContain(placed);
		expect(clipLayerTitle(doc, layerOf(doc, placed), [])).toMatch(/layout/u);
	});
});

describe("the clip value of a variable", () => {
	it("names each mode, and reads a choice or an old boolean back as a mode", () => {
		expect(clipLabelOf({ clip: true, clipLayer: null })).toBe("Own shape");
		expect(clipModeOfValue("Layer")).toBe("layer");
		expect(clipModeOfValue("None")).toBe("none");
		expect(clipModeOfValue(true)).toBe("shape");
		expect(clipModeOfValue("Sideways")).toBeNull();
	});
});
