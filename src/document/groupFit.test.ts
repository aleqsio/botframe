import { describe, expect, it } from "vitest";
import { DesignDocument } from "./document";
import { DRAWN } from "./documentFixtures";
import { GROUP_GEOMETRY } from "./layer";
import type { Layer, LayerId } from "./layer";

const SQUARE = { ...DRAWN, width: 10, height: 10 };

function layerOf(doc: DesignDocument, id: LayerId): Layer {
	const layer = doc.layer(id);
	if (layer === null) {
		throw new Error(`no layer with the id ${id}`);
	}
	return layer;
}

function groupOfTwo(): { doc: DesignDocument; group: LayerId; a: LayerId; b: LayerId } {
	const doc = DesignDocument.create();
	const group = doc.createLayer({
		...SQUARE,
		x: 100,
		y: 50,
		width: 30,
		height: 40,
		name: "Group",
		geometry: { kind: "group" },
	});
	const a = doc.createLayer(SQUARE, group);
	doc.update(a, { x: 0, y: 0 });
	const b = doc.createLayer(SQUARE, group);
	doc.update(b, { x: 20, y: 30 });
	doc.commit("create group");
	return { doc, group, a, b };
}

describe("a group", () => {
	it("reads its geometry back", () => {
		const { doc, group } = groupOfTwo();

		expect(layerOf(doc, group).geometry).toEqual(GROUP_GEOMETRY);
	});

	it("fits its children again when a child moves", () => {
		const { doc, group, a, b } = groupOfTwo();

		doc.update(b, { x: 50, y: -10 });
		doc.commit("move child");

		expect(layerOf(doc, group)).toMatchObject({ x: 100, y: 40, width: 60, height: 20 });
		expect(layerOf(doc, a)).toMatchObject({ x: 0, y: 10 });
		expect(layerOf(doc, b)).toMatchObject({ x: 50, y: 0 });
	});

	it("scales its children when its size changes", () => {
		const { doc, group, a, b } = groupOfTwo();

		doc.update(group, { width: 60, height: 80 });
		doc.commit("resize group");

		expect(layerOf(doc, group)).toMatchObject({ x: 100, y: 50, width: 60, height: 80 });
		expect(layerOf(doc, a)).toMatchObject({ x: 0, y: 0, width: 20, height: 20 });
		expect(layerOf(doc, b)).toMatchObject({ x: 40, y: 60, width: 20, height: 20 });
	});

	it("goes away when its last child goes away", () => {
		const { doc, group, a, b } = groupOfTwo();

		doc.deleteLayer(a);
		doc.deleteLayer(b);
		doc.commit("delete children");

		expect(doc.layer(group)).toBeNull();
	});

	it("undoes a fit together with the change that made it", () => {
		const { doc, group, b } = groupOfTwo();
		doc.update(b, { x: 50, y: -10 });
		doc.commit("move child");

		doc.undo();

		expect(layerOf(doc, group)).toMatchObject({ x: 100, y: 50, width: 30, height: 40 });
		expect(layerOf(doc, b)).toMatchObject({ x: 20, y: 30 });
	});

	it("scales from the size at the start of a resize, not from each step", () => {
		const { doc, group, a, b } = groupOfTwo();

		for (const width of [20, 3, 1, 3, 20, 30]) {
			doc.update(group, { width, height: width + 10 });
		}
		doc.commit("resize group");

		expect(layerOf(doc, group)).toMatchObject({ x: 100, y: 50, width: 30, height: 40 });
		expect(layerOf(doc, a)).toMatchObject({ x: 0, y: 0, width: 10, height: 10 });
		expect(layerOf(doc, b)).toMatchObject({ x: 20, y: 30, width: 10, height: 10 });
	});

	it("stretches a turned child along the axes of the group", () => {
		const { doc, group, a } = groupOfTwo();
		doc.update(a, { width: 20, height: 10, x: -5, y: 5, rotation: 90 });
		doc.commit("turn child");
		const before = layerOf(doc, a);

		doc.update(group, { height: layerOf(doc, group).height * 2 });

		expect(layerOf(doc, a)).toMatchObject({ width: 40, height: before.height });
	});

	it("writes nothing on a commit that changes nothing in a turned group", () => {
		const { doc, a } = groupOfTwo();
		doc.update(a, { rotation: 33 });
		doc.commit("turn child");
		const changes = doc.changeCount();

		doc.commit("nothing");

		expect(doc.changeCount()).toBe(changes);
	});
});
