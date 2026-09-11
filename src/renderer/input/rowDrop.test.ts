import { describe, expect, it } from "vitest";
import type { Layer, LayerId } from "../../document/layer";
import { centerOf, fromParentPoint } from "./layerSpace";
import { carriedPlacement, rowMarkOf, rowMoveOf, rowPlaceOf } from "./rowDrop";
import type { RowPlace, RowTree } from "./rowDrop";

const ROOT_IDS: readonly LayerId[] = ["1@1", "2@1", "3@1"];
const [FIRST = "1@1", BRANCH = "2@1", LAST = "3@1"] = ROOT_IDS;
const LEAF: LayerId = "4@1";
const SHOOT: LayerId = "5@1";
const DEEP: LayerId = "6@1";
const GONE: LayerId = "9@9";
const TURNED_BRANCH: LayerId = "7@1";

const CHILDREN: Readonly<Record<string, readonly LayerId[]>> = {
	[FIRST]: [],
	[BRANCH]: [LEAF, SHOOT],
	[LAST]: [],
	[LEAF]: [],
	[SHOOT]: [DEEP],
	[DEEP]: [],
};

const PARENTS: Readonly<Record<string, LayerId | null>> = {
	[FIRST]: null,
	[BRANCH]: null,
	[LAST]: null,
	[LEAF]: BRANCH,
	[SHOOT]: BRANCH,
	[DEEP]: SHOOT,
};

const ARTBOARDS: ReadonlySet<LayerId> = new Set([BRANCH, LAST]);

function geometryOf(id: LayerId): Layer["geometry"] {
	if (!ARTBOARDS.has(id)) {
		return { kind: "ellipse" };
	}
	return { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true };
}

function read(id: LayerId): Layer | null {
	const parent = PARENTS[id];
	if (parent === undefined) {
		return null;
	}
	return {
		id,
		x: 0,
		y: 0,
		width: 10,
		height: 10,
		rotation: 0,
		fill: "#000000",
		geometry: geometryOf(id),
		name: "",
		clip: false,
		parent,
	};
}

const TREE: RowTree = {
	read,
	childIds: (parent) => (parent === null ? ROOT_IDS : (CHILDREN[parent] ?? [])),
};

function moveOf(dragged: LayerId, id: LayerId, place: RowPlace) {
	return rowMoveOf(dragged, { id, place }, TREE);
}

describe("rowPlaceOf", () => {
	const HEIGHT = 24;

	it("takes the top quarter of a row that takes children as before", () => {
		expect(rowPlaceOf(0, HEIGHT, true)).toBe("before");
		expect(rowPlaceOf(5.9, HEIGHT, true)).toBe("before");
	});

	it("takes the middle half of a row that takes children as inside", () => {
		expect(rowPlaceOf(6, HEIGHT, true)).toBe("inside");
		expect(rowPlaceOf(12, HEIGHT, true)).toBe("inside");
		expect(rowPlaceOf(17.9, HEIGHT, true)).toBe("inside");
	});

	it("takes the bottom quarter of a row that takes children as after", () => {
		expect(rowPlaceOf(18, HEIGHT, true)).toBe("after");
		expect(rowPlaceOf(HEIGHT, HEIGHT, true)).toBe("after");
	});

	it("splits a row that takes no children in half, so it gives no inside", () => {
		expect(rowPlaceOf(0, HEIGHT, false)).toBe("before");
		expect(rowPlaceOf(11.9, HEIGHT, false)).toBe("before");
		expect(rowPlaceOf(12, HEIGHT, false)).toBe("after");
		expect(rowPlaceOf(HEIGHT, HEIGHT, false)).toBe("after");
	});

	it("holds the ends when the pointer passes the row", () => {
		expect(rowPlaceOf(-8, HEIGHT, true)).toBe("before");
		expect(rowPlaceOf(40, HEIGHT, true)).toBe("after");
	});
});

describe("rowMoveOf", () => {
	it("gives the parent and the index of the row for before and after", () => {
		expect(moveOf(LEAF, FIRST, "before")).toEqual({ parent: null, index: 0 });
		expect(moveOf(LEAF, FIRST, "after")).toEqual({ parent: null, index: 1 });
		expect(moveOf(LEAF, DEEP, "before")).toEqual({ parent: SHOOT, index: 0 });
		expect(moveOf(LEAF, DEEP, "after")).toEqual({ parent: SHOOT, index: 1 });
	});

	it("counts the index after the dragged row leaves its own place", () => {
		expect(moveOf(FIRST, LAST, "after")).toEqual({ parent: null, index: 2 });
		expect(moveOf(FIRST, LAST, "before")).toEqual({ parent: null, index: 1 });
		expect(moveOf(LAST, FIRST, "before")).toEqual({ parent: null, index: 0 });
		expect(moveOf(LEAF, SHOOT, "after")).toEqual({ parent: BRANCH, index: 1 });
	});

	it("puts an inside drop at the end of the child list", () => {
		expect(moveOf(FIRST, BRANCH, "inside")).toEqual({ parent: BRANCH, index: 2 });
		expect(moveOf(LEAF, BRANCH, "inside")).toEqual({ parent: BRANCH, index: 1 });
	});

	it("takes a drop inside a row that holds no children", () => {
		expect(moveOf(FIRST, LAST, "inside")).toEqual({ parent: LAST, index: 0 });
	});

	it("refuses a drop inside a row that is no artboard", () => {
		expect(moveOf(LEAF, FIRST, "inside")).toBeNull();
		expect(moveOf(FIRST, DEEP, "inside")).toBeNull();
	});

	it("refuses a drop on the dragged row itself", () => {
		expect(moveOf(BRANCH, BRANCH, "before")).toBeNull();
		expect(moveOf(BRANCH, BRANCH, "after")).toBeNull();
		expect(moveOf(BRANCH, BRANCH, "inside")).toBeNull();
	});

	it("refuses a drop inside the subtree of the dragged row", () => {
		expect(moveOf(BRANCH, LEAF, "before")).toBeNull();
		expect(moveOf(BRANCH, SHOOT, "inside")).toBeNull();
		expect(moveOf(BRANCH, DEEP, "after")).toBeNull();
	});

	it("refuses a drop on a row that the document lost", () => {
		expect(moveOf(FIRST, GONE, "before")).toBeNull();
		expect(moveOf(FIRST, GONE, "inside")).toBeNull();
	});
});

describe("rowMarkOf", () => {
	it("marks the dragged row and the row under the pointer", () => {
		const drag = { id: FIRST, target: { id: BRANCH, place: "inside" as const } };

		expect(rowMarkOf(drag, FIRST)).toBe("dragged");
		expect(rowMarkOf(drag, BRANCH)).toBe("inside");
		expect(rowMarkOf(drag, LAST)).toBeNull();
	});

	it("marks nothing without a drag and nothing without a target", () => {
		expect(rowMarkOf(null, FIRST)).toBeNull();
		expect(rowMarkOf({ id: FIRST, target: null }, BRANCH)).toBeNull();
	});
});

const PLACED: Readonly<Record<string, { x: number; y: number; rotation: number }>> = {
	"1@1": { x: 300, y: 200, rotation: 0 },
	"2@1": { x: 100, y: 50, rotation: 0 },
	"7@1": { x: 100, y: 50, rotation: 90 },
};

function placedRead(id: LayerId): Layer | null {
	const base = read(id === "7@1" ? BRANCH : id);
	const placed = PLACED[id];
	if (base === null || placed === undefined) {
		return base;
	}
	return {
		...base,
		id,
		x: placed.x,
		y: placed.y,
		rotation: placed.rotation,
		width: 80,
		height: 60,
	};
}

function placedLayer(id: LayerId): Layer {
	const layer = placedRead(id);
	if (layer === null) {
		throw new Error("the fixture has no layer with this id");
	}
	return layer;
}

describe("carriedPlacement", () => {
	it("gives no placement when the parent does not change", () => {
		expect(carriedPlacement(placedRead, FIRST, null)).toBeNull();
	});

	it("takes the placement into the space of a flat new parent", () => {
		expect(carriedPlacement(placedRead, FIRST, BRANCH)).toEqual({ x: 200, y: 150, rotation: 0 });
	});

	it("turns the layer against a turned new parent, so it keeps its place on the screen", () => {
		const layer = placedLayer(FIRST);
		const placement = carriedPlacement(placedRead, FIRST, TURNED_BRANCH);

		const center = fromParentPoint(
			[placedLayer(TURNED_BRANCH)],
			centerOf({ ...layer, ...placement }),
		);
		expect(center.x).toBeCloseTo(centerOf(layer).x);
		expect(center.y).toBeCloseTo(centerOf(layer).y);
		expect(placement?.rotation).toBeCloseTo(270);
	});

	it("gives no placement for a layer the document lost", () => {
		expect(carriedPlacement(placedRead, GONE, BRANCH)).toBeNull();
	});
});
