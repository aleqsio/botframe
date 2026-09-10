import { describe, expect, it } from "vitest";
import type { Layer, LayerId } from "../../document/layer";
import { layerEntry } from "./layerEntry";

function rectangle(id: LayerId, fill: string): Layer {
	return {
		id,
		x: 0,
		y: 0,
		width: 240,
		height: 160,
		rotation: 0,
		fill,
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0 },
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

	it("gives a plain entry for a layer that the document lost", () => {
		expect(layerEntry(null)).toEqual({ label: "Layer", swatch: "transparent" });
	});
});
