import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer, LayerId } from "../../document/layer";
import { dropParentOf, heldPlacement } from "./dropTarget";
import { centerOf, fromParentPoint } from "./layerSpace";

interface Spec {
	id: LayerId;
	parent: LayerId | null;
	frame: boolean;
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
		skewX: 0,
		skewY: 0,
		mirrored: false,
		fill: "#000000",
		geometry: {
			kind: "rectangle",
			cornerRadius: 0,
			cornerSmoothing: 0,
			frame: spec.frame,
		},
		name: "",
		clip: false,
		parent: spec.parent,
	};
}

const DRAGGED = layerOf({ id: "1@1", parent: null, frame: false });
const INSIDE_DRAGGED = layerOf({ id: "2@1", parent: "1@1", frame: true });
const RECTANGLE = layerOf({ id: "3@1", parent: null, frame: false });
const FRAME = layerOf({ id: "4@1", parent: null, frame: true });
const OUTER = layerOf({ id: "5@1", parent: null, frame: true });
const ELLIPSE: Layer = { ...RECTANGLE, id: "6@1", geometry: { kind: "ellipse" } };

const WORLD = [DRAGGED, INSIDE_DRAGGED, RECTANGLE, FRAME, OUTER, ELLIPSE];

function read(id: LayerId): Layer | null {
	return WORLD.find((layer) => layer.id === id) ?? null;
}

function parentOf(ids: readonly LayerId[]): LayerId | null {
	return dropParentOf(ids, read, [DRAGGED.id]);
}

describe("dropParentOf", () => {
	it("takes the deepest frame under the pointer", () => {
		expect(parentOf([DRAGGED.id, FRAME.id, OUTER.id])).toBe(FRAME.id);
	});

	it("passes over a shape, so no shape takes the layer as a child", () => {
		expect(parentOf([RECTANGLE.id, ELLIPSE.id, FRAME.id])).toBe(FRAME.id);
	});

	it("skips the dragged layer and each layer below it", () => {
		expect(parentOf([DRAGGED.id, INSIDE_DRAGGED.id, FRAME.id])).toBe(FRAME.id);
		expect(parentOf([DRAGGED.id, INSIDE_DRAGGED.id])).toBeNull();
	});

	it("gives the root when no frame is under the pointer", () => {
		expect(parentOf([RECTANGLE.id, ELLIPSE.id])).toBeNull();
		expect(parentOf([])).toBeNull();
	});

	it("passes over a layer that the document lost", () => {
		expect(parentOf(["9@9", FRAME.id])).toBe(FRAME.id);
	});
});

function placed(layer: Layer, from: readonly Layer[], to: readonly Layer[]): Layer {
	return { ...layer, ...heldPlacement(layer, from, to, layer) };
}

describe("heldPlacement", () => {
	const TURNED = layerOf({ id: "7@1", parent: null, frame: true, rotation: 90 });
	const CHILD: Layer = {
		...layerOf({ id: "8@1", parent: null, frame: false, rotation: 30 }),
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

	it("mirrors the layer against a mirrored parent, so each corner keeps its place on the screen", () => {
		const mirrored: Layer = { ...TURNED, skewX: 0, skewY: 0, mirrored: true };
		const inside = placed(CHILD, [], [mirrored]);

		expect(inside).toMatchObject({ rotation: 60, skewX: 0, skewY: 0, mirrored: true });
		for (const corner of [
			{ x: 0, y: 0 },
			{ x: 60, y: 20 },
		]) {
			const seen = fromParentPoint([mirrored, inside], corner);
			const before = fromParentPoint([CHILD], corner);
			expect(seen.x).toBeCloseTo(before.x);
			expect(seen.y).toBeCloseTo(before.y);
		}
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
