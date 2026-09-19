import { describe, expect, it } from "vitest";
import { pixelBox } from "../../document/documentFixtures";
import type { Layer, LayerId } from "../../document/layer";
import type { LayerMove } from "../state/userState";
import { droppedInto } from "./dropHighlight";
import type { RowDrag } from "./rowDrop";

const LAYER: LayerId = "1@1";
const ARTBOARD: LayerId = "2@1";
const ROOT_ARTBOARD: LayerId = "3@1";

const SHAPE: Layer = {
	id: LAYER,
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	...pixelBox({ x: 0, y: 0, width: 100, height: 100 }),
	rotation: 0,
	fill: "#000000",
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
	name: "",
	clip: false,
	parent: null,
};

const WORLD: readonly Layer[] = [
	SHAPE,
	{
		...SHAPE,
		id: ARTBOARD,
		parent: ROOT_ARTBOARD,
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
	},
	{
		...SHAPE,
		id: ROOT_ARTBOARD,
		geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
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
		start: { x: 0, y: 0, rotation: 0, position: "flow" },
		offset: { x: 0, y: 0 },
	};
}

function rowDragOnto(target: RowDrag["target"]): RowDrag {
	return { id: LAYER, target };
}

describe("droppedInto", () => {
	it("gives the artboard that the move drag found", () => {
		expect(droppedInto(moveInto(ARTBOARD), null, read)).toBe(ARTBOARD);
	});

	it("gives no layer when the move drag holds the layer at the root", () => {
		expect(droppedInto(moveInto(null), null, read)).toBeNull();
	});

	it("gives the parent that holds the layer when the move drag keeps the first parent", () => {
		expect(droppedInto(moveInto(ARTBOARD, ARTBOARD), null, read)).toBe(ARTBOARD);
	});

	it("gives no layer for an artboard at the root of the document", () => {
		expect(droppedInto(moveInto(ROOT_ARTBOARD), null, read)).toBeNull();
		expect(droppedInto(null, rowDragOnto({ id: ROOT_ARTBOARD, place: "inside" }), read)).toBeNull();
	});

	it("gives the row of a row drag that drops inside it", () => {
		expect(droppedInto(null, rowDragOnto({ id: ARTBOARD, place: "inside" }), read)).toBe(ARTBOARD);
	});

	it("gives no layer for a row drag that drops beside a row", () => {
		expect(droppedInto(null, rowDragOnto({ id: ARTBOARD, place: "before" }), read)).toBeNull();
		expect(droppedInto(null, rowDragOnto({ id: ARTBOARD, place: "after" }), read)).toBeNull();
		expect(droppedInto(null, rowDragOnto(null), read)).toBeNull();
	});

	it("gives no layer when no drag is in progress, and none for a layer the document lost", () => {
		expect(droppedInto(null, null, read)).toBeNull();
		expect(droppedInto(moveInto("9@9"), null, read)).toBe("9@9");
	});
});
