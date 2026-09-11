import { describe, expect, it } from "vitest";
import type { Layer, LayerId } from "../../document/layer";
import { dropParentOf, heldOffset } from "./dropTarget";
import { toParentPoint } from "./layerSpace";

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

function parentOf(ids: readonly LayerId[], alt: boolean): LayerId | null {
	return dropParentOf(ids, read, DRAGGED.id, alt);
}

describe("dropParentOf", () => {
	it("takes the deepest artboard under the pointer", () => {
		expect(parentOf([DRAGGED.id, ARTBOARD.id, OUTER.id], false)).toBe(ARTBOARD.id);
	});

	it("passes over a layer that is no artboard", () => {
		expect(parentOf([RECTANGLE.id, ELLIPSE.id, ARTBOARD.id], false)).toBe(ARTBOARD.id);
	});

	it("takes the deepest rectangle under the pointer with alt", () => {
		expect(parentOf([RECTANGLE.id, ARTBOARD.id], true)).toBe(RECTANGLE.id);
		expect(parentOf([ELLIPSE.id, ARTBOARD.id], true)).toBe(ARTBOARD.id);
	});

	it("skips the dragged layer and each layer below it", () => {
		expect(parentOf([DRAGGED.id, INSIDE_DRAGGED.id, ARTBOARD.id], false)).toBe(ARTBOARD.id);
		expect(parentOf([DRAGGED.id, INSIDE_DRAGGED.id], false)).toBeNull();
		expect(parentOf([DRAGGED.id, INSIDE_DRAGGED.id], true)).toBeNull();
	});

	it("gives the root when no artboard is under the pointer", () => {
		expect(parentOf([RECTANGLE.id, ELLIPSE.id], false)).toBeNull();
		expect(parentOf([], false)).toBeNull();
	});

	it("passes over a layer that the document lost", () => {
		expect(parentOf(["9@9", ARTBOARD.id], false)).toBe(ARTBOARD.id);
	});
});

describe("heldOffset", () => {
	const TURNED = layerOf({ id: "7@1", parent: null, artboard: true, rotation: 90 });
	const POINTER = { x: 260, y: 180 };
	const OFFSET = { x: 30, y: 20 };

	function cornerOn(chain: readonly Layer[], offset: { x: number; y: number }) {
		const point = toParentPoint(chain, POINTER);
		return { x: point.x - offset.x, y: point.y - offset.y };
	}

	it("holds the corner on the screen when the layer joins a turned parent", () => {
		const held = heldOffset([], [TURNED], OFFSET);

		const moved = cornerOn([TURNED], held);
		const same = toParentPoint([TURNED], cornerOn([], OFFSET));
		expect(moved.x).toBeCloseTo(same.x);
		expect(moved.y).toBeCloseTo(same.y);
	});

	it("holds the corner on the screen when the layer leaves a turned parent", () => {
		const inside = heldOffset([], [TURNED], OFFSET);

		const held = heldOffset([TURNED], [], inside);

		const moved = cornerOn([], held);
		const same = cornerOn([], OFFSET);
		expect(moved.x).toBeCloseTo(same.x);
		expect(moved.y).toBeCloseTo(same.y);
	});

	it("leaves the offset alone when the two chains turn by the same angle", () => {
		expect(heldOffset([TURNED], [TURNED], OFFSET)).toEqual(OFFSET);
	});
});
