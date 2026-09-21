import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { Layer, LayerFields, LayerId } from "../../document/layer";
import { quadsTouch, touchedIds } from "./marqueeHit";
import { rectCorners } from "./selectionBounds";

const SQUARE: Omit<LayerFields, "x" | "y" | "width" | "height"> = {
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

function readerOf(doc: DesignDocument): (id: LayerId) => Layer | null {
	return (id) => doc.layer(id);
}

describe("quadsTouch", () => {
	it("says two boxes that overlap touch", () => {
		const one = rectCorners({ x: 0, y: 0, width: 10, height: 10 });
		const other = rectCorners({ x: 5, y: 5, width: 10, height: 10 });

		expect(quadsTouch(one, other)).toBe(true);
	});

	it("says two boxes that share one edge touch", () => {
		const one = rectCorners({ x: 0, y: 0, width: 10, height: 10 });
		const other = rectCorners({ x: 10, y: 0, width: 10, height: 10 });

		expect(quadsTouch(one, other)).toBe(true);
	});

	it("says two boxes apart on one axis do not touch", () => {
		const one = rectCorners({ x: 0, y: 0, width: 10, height: 10 });
		const other = rectCorners({ x: 11, y: 0, width: 10, height: 10 });

		expect(quadsTouch(one, other)).toBe(false);
	});

	it("keeps a turned quad apart from a box that its hull covers", () => {
		const box = rectCorners({ x: 0, y: 0, width: 4, height: 4 });
		const diamond = [
			{ x: 10, y: 0 },
			{ x: 20, y: 10 },
			{ x: 10, y: 20 },
			{ x: 0, y: 10 },
		];

		expect(quadsTouch(box, diamond)).toBe(false);
	});

	it("says a box that reaches the edge of a turned quad touches it", () => {
		const box = rectCorners({ x: 0, y: 6, width: 5, height: 5 });
		const diamond = [
			{ x: 10, y: 0 },
			{ x: 20, y: 10 },
			{ x: 10, y: 20 },
			{ x: 0, y: 10 },
		];

		expect(quadsTouch(box, diamond)).toBe(true);
	});
});

describe("touchedIds", () => {
	it("takes a layer that the marquee only touches, not one it covers", () => {
		const doc = DesignDocument.create();
		const inside = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 10, height: 10 });
		const edge = doc.createLayer({ ...SQUARE, x: 20, y: 0, width: 10, height: 10 });
		const away = doc.createLayer({ ...SQUARE, x: 200, y: 0, width: 10, height: 10 });

		const touched = touchedIds(readerOf(doc), [inside, edge, away], {
			x: -5,
			y: -5,
			width: 30,
			height: 30,
		});

		expect(touched).toEqual([inside, edge]);
	});

	it("passes over a rotated layer that the marquee misses but its layout box would hit", () => {
		const doc = DesignDocument.create();
		const turned = doc.createLayer({ ...SQUARE, x: 100, y: 100, width: 100, height: 100 });
		doc.update(turned, { rotation: 45 });
		doc.commit("turn the layer");

		const corner = { x: 96, y: 96, width: 8, height: 8 };
		const middle = { x: 140, y: 96, width: 20, height: 20 };

		expect(touchedIds(readerOf(doc), [turned], corner)).toEqual([]);
		expect(touchedIds(readerOf(doc), [turned], middle)).toEqual([turned]);
	});

	it("passes over a layer that the document lost", () => {
		const doc = DesignDocument.create();

		expect(touchedIds(readerOf(doc), ["404@9"], { x: 0, y: 0, width: 999, height: 999 })).toEqual(
			[],
		);
	});
});
