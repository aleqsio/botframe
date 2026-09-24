import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer, LayerId } from "../../document/layer";
import type { LayerMove } from "../state/userState";
import { droppedInto } from "./dropHighlight";
import { snapFieldOf } from "./snap";
import type { RowDrag } from "./rowDrop";

const LAYER: LayerId = "1@1";
const FRAME: LayerId = "2@1";
const ROOT_FRAME: LayerId = "3@1";

const SHAPE: Layer = {
	id: LAYER,
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	...pixelBox({ x: 0, y: 0, width: 100, height: 100 }),
	rotation: 0,
	mirrored: false,
	fill: "#000000",
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
	name: "",
	clip: false,
	parent: null,
};

const WORLD: readonly Layer[] = [
	SHAPE,
	{
		...SHAPE,
		id: FRAME,
		parent: ROOT_FRAME,
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
	},
	{
		...SHAPE,
		id: ROOT_FRAME,
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: true },
	},
];

function read(id: LayerId): Layer | null {
	return WORLD.find((layer) => layer.id === id) ?? null;
}

function moveInto(parent: LayerId | null, from: LayerId | null = null): LayerMove {
	return {
		id: LAYER,
		from,
		parent,
		start: {
			x: 0,
			y: 0,
			width: 1,
			height: 1,
			rotation: 0,
			mirrored: false,
			position: "default",
			sizing: { width: "fixed", height: "fixed" },
			cell: { mode: "auto" },
			index: 0,
		},
		anchor: { x: 0, y: 0 },
		pose: { rotation: 0, mirrored: false },
		field: snapFieldOf({ points: [], curves: [], container: null }),
	};
}

function rowDragOnto(target: RowDrag["target"]): RowDrag {
	return { id: LAYER, target };
}

describe("droppedInto", () => {
	it("gives the frame that the move drag found", () => {
		expect(droppedInto(moveInto(FRAME), null, read)).toBe(FRAME);
	});

	it("gives no layer when the move drag holds the layer at the root", () => {
		expect(droppedInto(moveInto(null), null, read)).toBeNull();
	});

	it("gives the parent that holds the layer when the move drag keeps the first parent", () => {
		expect(droppedInto(moveInto(FRAME, FRAME), null, read)).toBe(FRAME);
	});

	it("gives no layer for a frame at the root of the document", () => {
		expect(droppedInto(moveInto(ROOT_FRAME), null, read)).toBeNull();
		expect(droppedInto(null, rowDragOnto({ id: ROOT_FRAME, place: "inside" }), read)).toBeNull();
	});

	it("gives the row of a row drag that drops inside it", () => {
		expect(droppedInto(null, rowDragOnto({ id: FRAME, place: "inside" }), read)).toBe(FRAME);
	});

	it("gives no layer for a row drag that drops beside a row", () => {
		expect(droppedInto(null, rowDragOnto({ id: FRAME, place: "before" }), read)).toBeNull();
		expect(droppedInto(null, rowDragOnto({ id: FRAME, place: "after" }), read)).toBeNull();
		expect(droppedInto(null, rowDragOnto(null), read)).toBeNull();
	});

	it("gives no layer when no drag is in progress, and none for a layer the document lost", () => {
		expect(droppedInto(null, null, read)).toBeNull();
		expect(droppedInto(moveInto("9@9"), null, read)).toBe("9@9");
	});
});
