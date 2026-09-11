import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer, LayerId } from "../../document/layer";
import { dropParentOf, heldPlacement } from "./dropTarget";
import { centerOf, fromParentPoint } from "./layerSpace";

interface Spec {
	id: LayerId;
	parent: LayerId | null;
	artboard: boolean;
	rotation?: number;
}

function layerOf(spec: Spec): Layer {
	return {
		id: spec.id,
		x: 100,
		y: 100,
		width: 200,
		height: 100,
		...pixelBox({ x: 100, y: 100, width: 200, height: 100 }),
		rotation: spec.rotation ?? 0,
		fill: "#000000",
		geometry: {
			kind: "rectangle",
			cornerRadius: 0,
			cornerSmoothing: 0,
			artboard: spec.artboard,
		},
		name: "",
		clip: false,
		parent: spec.parent,
	};
}

const DRAGGED = layerOf({ id: "1@1", parent: null, artboard: false });
const INSIDE_DRAGGED = layerOf({ id: "2@1", parent: "1@1", artboard: true });
const RECTANGLE = layerOf({ id: "3@1", parent: null, artboard: false });
const ARTBOARD = layerOf({ id: "4@1", parent: null, artboard: true });
const OUTER = layerOf({ id: "5@1", parent: null, artboard: true });
const ELLIPSE: Layer = { ...RECTANGLE, id: "6@1", geometry: { kind: "ellipse" } };

const WORLD = [DRAGGED, INSIDE_DRAGGED, RECTANGLE, ARTBOARD, OUTER, ELLIPSE];

function read(id: LayerId): Layer | null {
	return WORLD.find((layer) => layer.id === id) ?? null;
}

function parentOf(ids: readonly LayerId[]): LayerId | null {
	return dropParentOf(ids, read, DRAGGED.id);
}

describe("dropParentOf", () => {
	it("takes the deepest artboard under the pointer", () => {
		expect(parentOf([DRAGGED.id, ARTBOARD.id, OUTER.id])).toBe(ARTBOARD.id);
	});

	it("passes over a shape, so no shape takes the layer as a child", () => {
		expect(parentOf([RECTANGLE.id, ELLIPSE.id, ARTBOARD.id])).toBe(ARTBOARD.id);
	});

	it("skips the dragged layer and each layer below it", () => {
		expect(parentOf([DRAGGED.id, INSIDE_DRAGGED.id, ARTBOARD.id])).toBe(ARTBOARD.id);
		expect(parentOf([DRAGGED.id, INSIDE_DRAGGED.id])).toBeNull();
	});

	it("gives the root when no artboard is under the pointer", () => {
		expect(parentOf([RECTANGLE.id, ELLIPSE.id])).toBeNull();
		expect(parentOf([])).toBeNull();
	});

	it("passes over a layer that the document lost", () => {
		expect(parentOf(["9@9", ARTBOARD.id])).toBe(ARTBOARD.id);
	});
});

function placed(layer: Layer, from: readonly Layer[], to: readonly Layer[]): Layer {
	return { ...layer, ...heldPlacement(layer, from, to, layer) };
}

describe("heldPlacement", () => {
	const TURNED = layerOf({ id: "7@1", parent: null, artboard: true, rotation: 90 });
	const CHILD: Layer = {
		...layerOf({ id: "8@1", parent: null, artboard: false, rotation: 30 }),
		x: 40,
		y: 10,
		width: 60,
		height: 20,
		...pixelBox({ x: 40, y: 10, width: 60, height: 20 }),
	};

	it("keeps the center and the angle on the screen when the layer joins a turned parent", () => {
		const inside = placed(CHILD, [], [TURNED]);

		const center = fromParentPoint([TURNED], centerOf(inside));
		expect(center.x).toBeCloseTo(centerOf(CHILD).x);
		expect(center.y).toBeCloseTo(centerOf(CHILD).y);
		expect(inside.rotation).toBeCloseTo(300);
	});

	it("gives the first placement back when the layer leaves the turned parent", () => {
		const back = placed(placed(CHILD, [], [TURNED]), [TURNED], []);

		expect(back.x).toBeCloseTo(CHILD.x);
		expect(back.y).toBeCloseTo(CHILD.y);
		expect(back.rotation).toBeCloseTo(CHILD.rotation);
	});

	it("keeps the placement between two chains that turn by the same angle", () => {
		const same = placed(CHILD, [TURNED], [TURNED]);

		expect(same.x).toBeCloseTo(CHILD.x);
		expect(same.y).toBeCloseTo(CHILD.y);
		expect(same.rotation).toBeCloseTo(CHILD.rotation);
	});
});
