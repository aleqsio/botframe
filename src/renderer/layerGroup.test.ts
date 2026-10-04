import { describe, expect, it } from "vitest";
import { makeComponent } from "../document/componentActions";
import { DesignDocument } from "../document/document";
import { DRAWN, firstId } from "../document/documentFixtures";
import type { Layer, LayerId } from "../document/layer";
import { canGroup, canUngroup, groupSelection, ungroupSelection } from "./layerGroup";
import { UserState } from "./state/userState";

const SQUARE = { ...DRAWN, width: 10, height: 10 };

interface Squares {
	doc: DesignDocument;
	user: UserState;
	a: LayerId;
	b: LayerId;
	c: LayerId;
}

function layerOf(doc: DesignDocument, id: LayerId): Layer {
	const layer = doc.layer(id);
	if (layer === null) {
		throw new Error(`no layer with the id ${id}`);
	}
	return layer;
}

function present<T>(held: T | null): T {
	if (held === null) {
		throw new Error("the value is missing");
	}
	return held;
}

function onlyId(ids: readonly LayerId[]): LayerId {
	const [id, other] = ids;
	if (id === undefined || other !== undefined) {
		throw new Error("the list does not hold one layer");
	}
	return id;
}

function threeSquares(): Squares {
	const doc = DesignDocument.create();
	const a = doc.createLayer({ ...SQUARE, x: 100, y: 50, name: "A" });
	const b = doc.createLayer({ ...SQUARE, x: 300, y: 300, name: "B" });
	const c = doc.createLayer({ ...SQUARE, x: 120, y: 80, name: "C" });
	doc.commit("create squares");
	return { doc, user: new UserState(), a, b, c };
}

function grouped(): Squares & { group: LayerId } {
	const squares = threeSquares();
	squares.user.selection.set([squares.c, squares.a]);
	groupSelection(squares.doc, squares.user);
	return { ...squares, group: onlyId(squares.user.selection.get()) };
}

describe("groupSelection", () => {
	it("wraps the selection in one group that fits it", () => {
		const { doc, a, c, group } = grouped();

		expect(layerOf(doc, group)).toMatchObject({ x: 100, y: 50, width: 30, height: 40 });
		expect(doc.childIds(group)).toEqual([a, c]);
		expect(layerOf(doc, a)).toMatchObject({ x: 0, y: 0, parent: group });
		expect(layerOf(doc, c)).toMatchObject({ x: 20, y: 30, parent: group });
	});

	it("puts the group where the top selected layer was", () => {
		const { doc, b, group } = grouped();

		expect(doc.rootIds().slice(-2)).toEqual([b, group]);
	});

	it("undoes the group in one step", () => {
		const { doc, a, b, c } = grouped();

		doc.undo();

		expect(doc.rootIds().slice(-3)).toEqual([a, b, c]);
		expect(layerOf(doc, c)).toMatchObject({ x: 120, y: 80, parent: null });
	});

	it("refuses layers in different parents", () => {
		const { doc, user, a } = grouped();
		user.selection.set([a, firstId(doc)]);

		expect(canGroup(doc, user)).toBe(false);
		expect(groupSelection(doc, user)).toBe(false);
	});

	it("refuses an empty selection", () => {
		const { doc, user } = threeSquares();

		expect(canGroup(doc, user)).toBe(false);
	});
});

function layerInCopy(): { doc: DesignDocument; inside: LayerId } {
	const doc = DesignDocument.create();
	const frame = doc.createLayer(DRAWN);
	doc.createLayer(SQUARE, frame);
	makeComponent(doc, frame);
	const copy = doc.createSubtree(present(doc.readSubtree(frame)), null);
	doc.commit("place copy");
	return { doc, inside: onlyId(doc.childIds(copy)) };
}

describe("a layer inside a component copy", () => {
	it("cannot be grouped or ungrouped", () => {
		const { doc, inside } = layerInCopy();
		const user = new UserState();
		user.selection.set([inside]);

		expect(canGroup(doc, user)).toBe(false);
		expect(groupSelection(doc, user)).toBe(false);
		expect(canUngroup(doc, user)).toBe(false);
	});
});

describe("ungroupSelection", () => {
	it("puts the children back where they were and selects them", () => {
		const { doc, user, a, b, c, group } = grouped();

		expect(canUngroup(doc, user)).toBe(true);
		expect(ungroupSelection(doc, user)).toBe(true);

		expect(doc.layer(group)).toBeNull();
		expect(user.selection.get()).toEqual([a, c]);
		expect(doc.rootIds().slice(-3)).toEqual([b, a, c]);
		expect(layerOf(doc, a)).toMatchObject({ x: 100, y: 50, parent: null });
		expect(layerOf(doc, c)).toMatchObject({ x: 120, y: 80, parent: null });
	});

	it("keeps the place of each child when the group turns", () => {
		const { doc, user, a, group } = grouped();
		doc.update(group, { rotation: 90 });
		doc.commit("turn group");

		ungroupSelection(doc, user);

		const lifted = layerOf(doc, a);
		expect(lifted.rotation).toBeCloseTo(90);
		expect(lifted.x).toBeCloseTo(125);
		expect(lifted.y).toBeCloseTo(55);
	});

	it("selects each child one time when the selection also holds a child", () => {
		const { doc, user, a, c, group } = grouped();
		user.selection.set([group, a]);

		ungroupSelection(doc, user);

		expect(user.selection.get()).toEqual([a, c]);
	});

	it("keeps the width of a child that fills the group", () => {
		const { doc, user, a } = grouped();
		doc.update(a, { layout: { width: "fill" } });
		doc.commit("fill group");

		ungroupSelection(doc, user);

		expect(layerOf(doc, a)).toMatchObject({ width: 10, layout: { width: "fixed" } });
	});

	it("refuses a frame that holds children", () => {
		const { doc, user } = threeSquares();
		const frame = doc.createLayer(DRAWN);
		doc.createLayer(SQUARE, frame);
		doc.commit("create frame");
		user.selection.set([frame]);

		expect(canUngroup(doc, user)).toBe(false);
	});

	it("refuses a layer with no children", () => {
		const { doc, user, b } = threeSquares();
		user.selection.set([b]);

		expect(canUngroup(doc, user)).toBe(false);
		expect(ungroupSelection(doc, user)).toBe(false);
	});
});
