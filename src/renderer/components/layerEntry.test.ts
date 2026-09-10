import { describe, expect, it } from "vitest";
import type { Layer, LayerId } from "../../document/layer";
import { isArtboard, layerEntry, nextLayerName } from "./layerEntry";

function rectangle(id: LayerId, fill: string): Layer {
	return {
		id,
		x: 0,
		y: 0,
		width: 240,
		height: 160,
		rotation: 0,
		fill,
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
		name: "",
		clip: false,
		parent: null,
	};
}

function artboard(id: LayerId): Layer {
	return {
		...rectangle(id, "#ffffff"),
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
		clip: true,
	};
}

describe("layerEntry", () => {
	it("gives a different entry for each of two stacked layers of one kind", () => {
		const top = layerEntry(rectangle("2@1", "#ff0000"));
		const bottom = layerEntry(rectangle("1@1", "#0000ff"));

		expect(top).not.toEqual(bottom);
		expect(top.swatch).toBe("#ff0000");
		expect(bottom.swatch).toBe("#0000ff");
	});

	it("names the kind of the layer", () => {
		const layer = rectangle("1@1", "#000000");

		expect(layerEntry(layer).label).toBe("Rectangle");
		expect(layerEntry({ ...layer, geometry: { kind: "ellipse" } }).label).toBe("Ellipse");
		expect(layerEntry({ ...layer, geometry: { kind: "path", d: "M0 0" } }).label).toBe("Path");
	});

	it("names a rectangle that holds the artboard flag an artboard", () => {
		expect(layerEntry(artboard("1@1")).label).toBe("Artboard");
	});

	it("tells an artboard from a plain rectangle and from a layer that the document lost", () => {
		expect(isArtboard(artboard("1@1"))).toBe(true);
		expect(isArtboard(rectangle("2@1", "#000000"))).toBe(false);
		expect(isArtboard(null)).toBe(false);
	});

	it("takes the name of the layer over the name of the kind", () => {
		const layer = rectangle("1@1", "#000000");

		expect(layerEntry({ ...layer, name: "Header" }).label).toBe("Header");
		expect(layerEntry({ ...artboard("2@1"), name: "Phone" }).label).toBe("Phone");
	});

	it("gives a plain entry for a layer that the document lost", () => {
		expect(layerEntry(null)).toEqual({ label: "Layer", swatch: "transparent" });
	});
});

describe("nextLayerName", () => {
	it("counts the layers of that kind and adds one", () => {
		const layers = [rectangle("1@1", "#000000"), artboard("2@1"), rectangle("3@1", "#d9d9d9")];

		expect(nextLayerName("Rectangle", layers)).toBe("Rectangle 3");
		expect(nextLayerName("Artboard", layers)).toBe("Artboard 2");
	});

	it("counts a layer that a person renamed by its kind", () => {
		const layers = [{ ...rectangle("1@1", "#000000"), name: "Header" }];

		expect(nextLayerName("Rectangle", layers)).toBe("Rectangle 2");
	});

	it("starts at one in an empty document", () => {
		expect(nextLayerName("Artboard", [])).toBe("Artboard 1");
	});
});
