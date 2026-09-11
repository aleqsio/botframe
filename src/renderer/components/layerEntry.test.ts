import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer, LayerId } from "../../document/layer";
import { glyphOf, inspectorHeading, isArtboard, layerEntry, nextLayerName } from "./layerEntry";

function rectangle(id: LayerId, fill: string): Layer {
	return {
		id,
		x: 0,
		y: 0,
		width: 240,
		height: 160,
		...pixelBox({ x: 0, y: 0, width: 240, height: 160 }),
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

describe("glyphOf", () => {
	it("draws an artboard, an ellipse, and a rectangle with their own glyph", () => {
		const layer = rectangle("1@1", "#000000");

		expect(glyphOf(artboard("2@1"))).toBe("artboard");
		expect(glyphOf({ ...layer, geometry: { kind: "ellipse" } })).toBe("ellipse");
		expect(glyphOf(layer)).toBe("rectangle");
	});

	it("draws a path, an unsupported layer, and a lost layer with the rectangle glyph", () => {
		const layer = rectangle("1@1", "#000000");

		expect(glyphOf({ ...layer, geometry: { kind: "path", d: "M0 0" } })).toBe("rectangle");
		expect(glyphOf({ ...layer, geometry: { kind: "unsupported" } })).toBe("rectangle");
		expect(glyphOf(null)).toBe("rectangle");
	});
});

describe("inspectorHeading", () => {
	it("heads the page when nothing is selected", () => {
		expect(inspectorHeading(null)).toEqual({
			glyph: "page",
			name: "Page",
			kind: "Nothing is selected",
		});
	});

	it("heads a layer with its name and its kind", () => {
		expect(inspectorHeading({ ...artboard("1@1"), name: "Phone" })).toEqual({
			glyph: "artboard",
			name: "Phone",
			kind: "Artboard",
		});
		expect(
			inspectorHeading({ ...rectangle("2@1", "#000000"), geometry: { kind: "ellipse" } }),
		).toEqual({
			glyph: "ellipse",
			name: "Ellipse",
			kind: "Ellipse",
		});
	});
});
