import { describe, expect, it } from "vitest";
import { DesignDocument } from "../document/document";
import type { Layer, LayerId, WritableGeometry } from "../document/layer";
import { SQUARE } from "./input/toolFixtures";
import { shapeLinesOf } from "./shapeLines";

const MASK = "9@1" as LayerId;
const RECTANGLE: WritableGeometry = {
	kind: "rectangle",
	cornerRadius: 0,
	cornerSmoothing: 0,
	frame: false,
};

function layerWith(geometry: WritableGeometry): Layer {
	const doc = DesignDocument.create();
	const id = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 100, height: 50, geometry });
	const layer = doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

describe("the shape lines of a selected layer", () => {
	it("draw the path of a path layer and of an ellipse", () => {
		const path = layerWith({
			kind: "path",
			vertices: [
				{ x: 0, y: 0, before: { x: 0, y: 0 }, after: { x: 0, y: 0 } },
				{ x: 1, y: 1, before: { x: 0, y: 0 }, after: { x: 0, y: 0 } },
				{ x: 0, y: 1, before: { x: 0, y: 0 }, after: { x: 0, y: 0 } },
			],
		});
		const ellipse = layerWith({ kind: "ellipse" });

		expect(shapeLinesOf(path, null, null)).toEqual([{ id: path.id, mask: false }]);
		expect(shapeLinesOf(ellipse, null, null)).toEqual([{ id: ellipse.id, mask: false }]);
	});

	it("draw no line for a sharp rectangle or a frame, because the box is the shape", () => {
		expect(shapeLinesOf(layerWith(RECTANGLE), null, null)).toEqual([]);
		expect(
			shapeLinesOf(layerWith({ ...RECTANGLE, cornerRadius: 8, frame: true }), null, null),
		).toEqual([]);
	});

	it("draw a rounded rectangle", () => {
		const rounded = layerWith({ ...RECTANGLE, cornerRadius: 8 });

		expect(shapeLinesOf(rounded, null, null)).toEqual([{ id: rounded.id, mask: false }]);
	});

	it("add the mask, and leave out each line whose path edit is on", () => {
		const ellipse = layerWith({ kind: "ellipse" });

		expect(shapeLinesOf(ellipse, MASK, null)).toEqual([
			{ id: ellipse.id, mask: false },
			{ id: MASK, mask: true },
		]);
		expect(shapeLinesOf(ellipse, MASK, MASK)).toEqual([{ id: ellipse.id, mask: false }]);
		expect(shapeLinesOf(ellipse, null, ellipse.id)).toEqual([]);
	});
});
