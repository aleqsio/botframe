import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer, LayerId, Rect } from "../../document/layer";
import { rectMap, shiftBy, turnAbout } from "./affine";
import { boundsOf, canvasCornersOf, groupFrameOf, posedOf, transformedPlace } from "./groupFrame";
import type { Placed } from "./layerSpace";

const ARTBOARD: LayerId = "1@1";
const CHILD: LayerId = "2@1";
const APART: LayerId = "3@1";
const TURNED: LayerId = "4@1";

function layerOf(id: LayerId, parent: LayerId | null, box: Rect, rotation: number): Layer {
	return {
		id,
		...box,
		...pixelBox(box),
		rotation,
		fill: "#000000",
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: parent === null },
		name: "",
		clip: false,
		parent,
	};
}

const LAYERS: Readonly<Record<string, Layer>> = {
	[ARTBOARD]: layerOf(ARTBOARD, null, { x: 100, y: 100, width: 200, height: 100 }, 0),
	[CHILD]: layerOf(CHILD, ARTBOARD, { x: 20, y: 10, width: 40, height: 20 }, 0),
	[APART]: layerOf(APART, null, { x: 400, y: 300, width: 100, height: 50 }, 0),
	[TURNED]: layerOf(TURNED, null, { x: 0, y: 0, width: 100, height: 40 }, 90),
};

function read(id: LayerId): Layer | null {
	return LAYERS[id] ?? null;
}

function posed(id: LayerId): ReturnType<typeof posedOf> & object {
	const entry = posedOf(read, id);
	if (entry === null) {
		throw new Error("no layer");
	}
	return entry;
}

function near(value: number): number {
	return Math.round(value * 100) / 100 + 0;
}

function rounded(placed: Placed): Placed {
	return {
		x: near(placed.x),
		y: near(placed.y),
		width: near(placed.width),
		height: near(placed.height),
		rotation: near(placed.rotation),
	};
}

describe("boundsOf", () => {
	it("gives the box around the points", () => {
		expect(
			boundsOf([
				{ x: 3, y: 9 },
				{ x: -1, y: 2 },
				{ x: 5, y: 4 },
			]),
		).toEqual({ x: -1, y: 2, width: 6, height: 7 });
	});

	it("gives null for no point", () => {
		expect(boundsOf([])).toBeNull();
	});
});

describe("canvasCornersOf", () => {
	it("gives the corners of a child on the canvas", () => {
		expect(canvasCornersOf(posed(CHILD))).toEqual([
			{ x: 120, y: 110 },
			{ x: 160, y: 110 },
			{ x: 160, y: 130 },
			{ x: 120, y: 130 },
		]);
	});

	it("turns the corners of a turned layer", () => {
		const corners = canvasCornersOf(posed(TURNED)).map((corner) => ({
			x: Math.round(corner.x),
			y: Math.round(corner.y),
		}));

		expect(corners).toEqual([
			{ x: 70, y: -30 },
			{ x: 70, y: 70 },
			{ x: 30, y: 70 },
			{ x: 30, y: -30 },
		]);
	});
});

describe("groupFrameOf", () => {
	it("gives the canvas box around each selected layer", () => {
		expect(groupFrameOf(read, [CHILD, APART])).toEqual({
			x: 120,
			y: 110,
			width: 380,
			height: 240,
		});
	});

	it("passes over a layer the document lost", () => {
		expect(groupFrameOf(read, ["9@9", APART])).toEqual({ x: 400, y: 300, width: 100, height: 50 });
		expect(groupFrameOf(read, [])).toBeNull();
	});
});

describe("transformedPlace", () => {
	it("moves a child by the delta inside its parent", () => {
		expect(transformedPlace(posed(CHILD), shiftBy({ x: 5, y: -5 }))).toEqual({
			x: 25,
			y: 5,
			width: 40,
			height: 20,
			rotation: 0,
		});
	});

	it("scales a layer with the box around the group", () => {
		const affine = rectMap(
			{ x: 120, y: 110, width: 380, height: 240 },
			{ x: 120, y: 110, width: 760, height: 240 },
		);

		expect(transformedPlace(posed(APART), affine)).toEqual({
			x: 680,
			y: 300,
			width: 200,
			height: 50,
			rotation: 0,
		});
		expect(transformedPlace(posed(CHILD), affine)).toEqual({
			x: 20,
			y: 10,
			width: 80,
			height: 20,
			rotation: 0,
		});
	});

	it("turns a layer around the pivot and adds the turn to the layer", () => {
		const affine = turnAbout({ x: 400, y: 300 }, 90);

		expect(rounded(transformedPlace(posed(APART), affine))).toEqual({
			x: 325,
			y: 325,
			width: 100,
			height: 50,
			rotation: 90,
		});
	});

	it("scales a turned layer along its own axes", () => {
		const affine = rectMap(
			{ x: 0, y: 0, width: 100, height: 100 },
			{ x: 0, y: 0, width: 100, height: 200 },
		);

		expect(rounded(transformedPlace(posed(TURNED), affine))).toEqual({
			x: -50,
			y: 20,
			width: 200,
			height: 40,
			rotation: 90,
		});
	});

	it("keeps the turn of a turned layer when the box stretches on one axis", () => {
		const affine = rectMap(
			{ x: 0, y: 0, width: 100, height: 100 },
			{ x: 0, y: 0, width: 200, height: 100 },
		);
		const apart = posed(APART);
		const tilted = { ...apart, drawn: { ...apart.drawn, rotation: 45 } };

		expect(rounded(transformedPlace(tilted, affine)).rotation).toBe(45);
	});

	it("holds a layer at the smallest size", () => {
		const affine = rectMap(
			{ x: 0, y: 0, width: 100, height: 100 },
			{ x: 0, y: 0, width: 0.001, height: 100 },
		);

		expect(transformedPlace(posed(APART), affine).width).toBe(1);
	});
});
