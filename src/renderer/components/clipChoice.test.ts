import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import { NO_CONTENT, PLAIN_INSTANCE } from "../../document/layer";
import { DEFAULT_TEXT_STYLE } from "../../document/text";
import type { Layer, LayerFields, LayerId } from "../../document/layer";
import {
	clipCandidates,
	clipLayerTitle,
	clipModeOf,
	clipModeOfValue,
	clipOptions,
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

const FRAME: LayerFields["geometry"] = {
	kind: "rectangle",
	cornerRadius: 0,
	cornerSmoothing: 0,
	frame: true,
};

const COPY: Layer["content"] = {
	kind: "component",
	component: "card",
	props: {},
	values: {},
	instance: PLAIN_INSTANCE,
};

function modesOf(
	geometry: LayerFields["geometry"],
	content: Layer["content"] = NO_CONTENT,
): string[] {
	return clipOptions({ geometry, content }, undefined).map((option) => option.value);
}

function layerOf(doc: DesignDocument, id: LayerId): Layer {
	const layer = doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

describe("clipModeOf", () => {
	it("names the clip a layer holds", () => {
		expect(clipModeOf({ clip: false, clipLayer: null, content: NO_CONTENT, geometry: FRAME })).toBe(
			"none",
		);
		expect(clipModeOf({ clip: true, clipLayer: null, content: NO_CONTENT, geometry: FRAME })).toBe(
			"shape",
		);
		expect(
			clipModeOf({ clip: false, clipLayer: "4@1", content: NO_CONTENT, geometry: BOX.geometry }),
		).toBe("layer");
	});

	it("reads an own-shape clip on a plain shape as no clip", () => {
		expect(
			clipModeOf({ clip: true, clipLayer: null, content: NO_CONTENT, geometry: BOX.geometry }),
		).toBe("none");
		expect(
			clipModeOf({ clip: true, clipLayer: null, content: NO_CONTENT, geometry: { kind: "group" } }),
		).toBe("shape");
	});
});

describe("clipOptions", () => {
	it("offers the own shape to a frame, a group, a text layer, and a component copy", () => {
		const text = { ...DEFAULT_TEXT_STYLE, kind: "text", content: "Hi" } as const;
		expect(modesOf(FRAME)).toEqual(["none", "shape", "layer"]);
		expect(modesOf({ kind: "group" })).toEqual(["none", "shape", "layer"]);
		expect(modesOf(text)).toEqual(["none", "shape", "layer"]);
		expect(modesOf(BOX.geometry, COPY)).toEqual(["none", "shape", "layer"]);
	});

	it("offers no own shape to a plain rectangle, an ellipse, or a path", () => {
		expect(modesOf(BOX.geometry)).toEqual(["none", "layer"]);
		expect(modesOf({ kind: "ellipse" })).toEqual(["none", "layer"]);
		expect(modesOf({ kind: "path", vertices: [] })).toEqual(["none", "layer"]);
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
		expect(clipModeOfValue("Layer")).toBe("layer");
		expect(clipModeOfValue("None")).toBe("none");
		expect(clipModeOfValue(true)).toBe("shape");
		expect(clipModeOfValue("Sideways")).toBeNull();
	});
});
