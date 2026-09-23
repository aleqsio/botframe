import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import { firstId } from "../../document/documentFixtures";
import type { Layer, LayerFields, LayerId, Rect } from "../../document/layer";
import type { Point } from "../state/camera";
import { hullOf } from "./layerSpace";
import { boundsOf, canvasContentHullOf, canvasCornersOf, rectCorners } from "./selectionBounds";

const SQUARE: Omit<LayerFields, "x" | "y" | "width" | "height"> = {
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
};

function scene(): {
	doc: DesignDocument;
	read: (id: LayerId) => ReturnType<DesignDocument["layer"]>;
} {
	const doc = DesignDocument.create();
	return { doc, read: (id) => doc.layer(id) };
}

function layerOf(doc: DesignDocument, id: LayerId): Layer {
	const layer = doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

function cornerHull(points: readonly Point[]): Rect {
	const [first, ...rest] = points;
	if (first === undefined) {
		throw new Error("the layer has no corner");
	}
	return hullOf([first, ...rest]);
}

describe("rectCorners", () => {
	it("gives the four corners of the box", () => {
		expect(rectCorners({ x: 1, y: 2, width: 10, height: 20 })).toEqual([
			{ x: 1, y: 2 },
			{ x: 11, y: 2 },
			{ x: 11, y: 22 },
			{ x: 1, y: 22 },
		]);
	});
});

describe("canvasCornersOf", () => {
	it("turns the corners of a rotated layer about its pivot", () => {
		const { doc, read } = scene();
		const id = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 100, height: 100 });
		doc.update(id, { rotation: 45 });
		const box = cornerHull(canvasCornersOf(read, layerOf(doc, id)));

		expect(box.width).toBeCloseTo(Math.SQRT2 * 100);
		expect(box.height).toBeCloseTo(Math.SQRT2 * 100);
	});

	it("carries the corners of a child through the turn of its parent", () => {
		const { doc, read } = scene();
		const parent = firstId(doc);
		doc.update(parent, { x: 0, y: 0, width: 200, height: 200, rotation: 90 });
		const child = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 20, height: 10 }, parent);
		const box = cornerHull(canvasCornersOf(read, layerOf(doc, child)));

		expect(box.width).toBeCloseTo(10);
		expect(box.height).toBeCloseTo(20);
	});
});

describe("canvasContentHullOf", () => {
	it("takes the padding off each side of the box", () => {
		const { doc, read } = scene();
		const id = doc.createLayer({ ...SQUARE, x: 100, y: 50, width: 200, height: 100 });
		const inset = { top: 5, right: 20, bottom: 15, left: 10 };

		expect(canvasContentHullOf(read, layerOf(doc, id), inset)).toEqual({
			x: 110,
			y: 55,
			width: 170,
			height: 80,
		});
	});

	it("keeps an empty box inside a layer that the padding fills", () => {
		const { doc, read } = scene();
		const id = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 20, height: 20 });
		const inset = { top: 30, right: 30, bottom: 30, left: 30 };

		expect(canvasContentHullOf(read, layerOf(doc, id), inset)).toEqual({
			x: 20,
			y: 20,
			width: 0,
			height: 0,
		});
	});
});

describe("boundsOf", () => {
	it("gives nothing when no layer is named", () => {
		const { read } = scene();

		expect(boundsOf(read, [])).toBeNull();
	});

	it("holds each layer of the selection in one box", () => {
		const { doc, read } = scene();
		const one = doc.createLayer({ ...SQUARE, x: 10, y: 10, width: 20, height: 20 });
		const other = doc.createLayer({ ...SQUARE, x: 100, y: 50, width: 40, height: 30 });

		expect(boundsOf(read, [one, other])).toEqual({ x: 10, y: 10, width: 130, height: 70 });
	});

	it("takes in the turned box of a rotated layer, not its layout box", () => {
		const { doc, read } = scene();
		const one = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 10, height: 10 });
		const turned = doc.createLayer({ ...SQUARE, x: 100, y: 100, width: 100, height: 100 });
		doc.update(turned, { rotation: 45 });

		const box = boundsOf(read, [one, turned]);

		expect(box?.width).toBeCloseTo(150 + (Math.SQRT2 * 100) / 2);
		expect(box?.height).toBeCloseTo(150 + (Math.SQRT2 * 100) / 2);
	});

	it("passes over a layer that the document lost", () => {
		const { doc, read } = scene();
		const one = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 10, height: 10 });

		expect(boundsOf(read, [one, "404@9"])).toEqual({ x: 0, y: 0, width: 10, height: 10 });
	});
});
