import { describe, expect, it } from "vitest";
import type { LayerId } from "../../document/layer";
import { firstId } from "./toolFixtures";
import { coveredTarget, dragOver, nestedTarget, tapAt, targetOf } from "./toolFixtures";
import { behaviorFor } from "./toolBehavior";

const PRESS = { x: 440, y: 280 };
const RELEASE = { x: 540, y: 350 };
const CLIENT = { x: 120, y: 80 };
const CENTER = { x: 540, y: 340 };
const EMPTY = { x: 300, y: 200 };

describe("the select tool", () => {
	it("moves the layer under the pointer with one change for the drag", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const changes = target.doc.changeCount();

		dragOver(behaviorFor("select"), target, { press: PRESS, release: RELEASE });

		expect(target.doc.layer(id)).toMatchObject({ x: 520, y: 330 });
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.selection.get()).toEqual([id]);
	});

	it("holds the grab of one gesture inside that gesture", () => {
		const first = targetOf(true);
		const second = targetOf(true);

		dragOver(behaviorFor("select"), first, { press: PRESS, release: RELEASE });
		dragOver(behaviorFor("select"), second, { press: { x: 500, y: 300 }, release: RELEASE });

		expect(first.doc.layer(firstId(first.doc))).toMatchObject({ x: 520, y: 330 });
		expect(second.doc.layer(firstId(second.doc))).toMatchObject({ x: 460, y: 310 });
	});

	it("selects the layer under the press and clears the selection on the empty canvas", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);

		tapAt(behaviorFor("select"), target, CENTER);
		expect(target.user.selection.get()).toEqual([id]);

		tapAt(behaviorFor("select"), { ...target, layerIds: [] }, EMPTY);
		expect(target.user.selection.get()).toEqual([]);
	});

	it("clears the selection when the drag starts on the empty canvas", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(behaviorFor("select"), target, CENTER);

		dragOver(
			behaviorFor("select"),
			{ ...target, layerIds: [] },
			{
				press: EMPTY,
				release: RELEASE,
			},
		);

		expect(target.user.selection.get()).toEqual([]);
		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260 });
	});

	it("holds the selection and moves it when the press finds no layer inside its box", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(behaviorFor("select"), target, CENTER);
		const clipped = { ...target, layerIds: [] };

		tapAt(behaviorFor("select"), clipped, CENTER);
		expect(target.user.selection.get()).toEqual([id]);

		dragOver(behaviorFor("select"), clipped, { press: PRESS, release: RELEASE });
		expect(target.user.selection.get()).toEqual([id]);
		expect(target.doc.layer(id)).toMatchObject({ x: 520, y: 330 });
	});

	it("takes the topmost layer under the pointer and leaves the layers below it", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const below = "9@9" as LayerId;

		tapAt(behaviorFor("select"), { ...target, layerIds: [id, below] }, CENTER);

		expect(target.user.selection.get()).toEqual([id]);
	});

	it("moves the selected layer when the drag starts on a layer above it", () => {
		const { target, above, below } = coveredTarget();

		dragOver(behaviorFor("select"), target, { press: PRESS, release: RELEASE });

		expect(target.user.selection.get()).toEqual([below]);
		expect(target.doc.layer(below)).toMatchObject({ x: 520, y: 330 });
		expect(target.doc.layer(above)).toMatchObject({ x: 420, y: 260 });
	});

	it("takes the layer above on a tap, even when the layer below it holds the selection", () => {
		const { target, above } = coveredTarget();

		tapAt(behaviorFor("select"), target, CENTER);

		expect(target.user.selection.get()).toEqual([above]);
	});

	it("opens the menu with each layer under the secondary press", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const below = "9@9" as LayerId;

		behaviorFor("select").context?.({ ...target, layerIds: [id, below] }, CLIENT);

		expect(target.user.menu.get()).toEqual({ client: CLIENT, layerIds: [id, below] });
		expect(target.user.selection.get()).toEqual([id]);
	});

	it("moves the layer under the press, not the parent that holds the selection", () => {
		const { target, child } = nestedTarget(0);
		const parent = firstId(target.doc);
		target.user.selection.set([parent]);

		dragOver(behaviorFor("select"), target, {
			press: { x: 450, y: 290 },
			release: { x: 470, y: 310 },
		});

		expect(target.user.selection.get()).toEqual([child]);
		expect(target.doc.layer(child)).toMatchObject({ x: 40, y: 40 });
		expect(target.doc.layer(parent)).toMatchObject({ x: 420, y: 260 });
	});

	it("moves the layer of the press when the selection holds more than one layer", () => {
		const { target, above, below } = coveredTarget();
		target.user.selection.set([below, above]);

		dragOver(behaviorFor("select"), target, { press: PRESS, release: RELEASE });

		expect(target.doc.layer(above)).toMatchObject({ x: 520, y: 330 });
		expect(target.doc.layer(below)).toMatchObject({ x: 420, y: 260 });
	});

	it("selects the layer under the secondary press, not the parent that holds it", () => {
		const { target, child } = nestedTarget(0);
		target.user.selection.set([firstId(target.doc)]);

		behaviorFor("select").context?.(target, CLIENT);

		expect(target.user.selection.get()).toEqual([child]);
	});

	it("keeps the selection when the secondary press finds it under the pointer", () => {
		const { target, below } = coveredTarget();

		behaviorFor("select").context?.(target, CLIENT);

		expect(target.user.selection.get()).toEqual([below]);
	});

	it("opens the menu with no layer, and holds the selection, on the empty canvas", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		target.user.selection.set([id]);

		behaviorFor("select").context?.({ ...target, layerIds: [] }, CLIENT);

		expect(target.user.menu.get()).toEqual({ client: CLIENT, layerIds: [] });
		expect(target.user.selection.get()).toEqual([id]);
	});
});
