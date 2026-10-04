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
const WITH_SHIFT = { shift: true, alt: false, control: false };
const WITH_CONTROL = { shift: false, alt: false, control: true };

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

	it("sweeps a marquee over the layer it touches when the drag starts on the empty canvas", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(behaviorFor("select"), target, CENTER);

		dragOver(
			behaviorFor("select"),
			{ ...target, layerIds: [] },
			{ press: EMPTY, release: RELEASE },
		);

		expect(target.user.selection.get()).toEqual([id]);
		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260 });
	});

	it("clears the selection when the marquee touches no layer", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(behaviorFor("select"), target, CENTER);

		dragOver(
			behaviorFor("select"),
			{ ...target, layerIds: [] },
			{ press: EMPTY, release: { x: 320, y: 220 } },
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

	it("moves the selected parent, not the child under the press", () => {
		const { target, child } = nestedTarget(0);
		const parent = firstId(target.doc);
		target.user.selection.set([parent]);

		dragOver(behaviorFor("select"), target, {
			press: { x: 450, y: 290 },
			release: { x: 470, y: 310 },
		});

		expect(target.user.selection.get()).toEqual([parent]);
		expect(target.doc.layer(child)).toMatchObject({ x: 20, y: 20 });
		expect(target.doc.layer(parent)).toMatchObject({ x: 440, y: 280 });
	});

	it("carries the whole selection when the press lands on a layer it holds", () => {
		const { target, above, below } = coveredTarget();
		target.user.selection.set([below, above]);
		const changes = target.doc.changeCount();

		dragOver(behaviorFor("select"), target, { press: PRESS, release: RELEASE });

		expect(target.doc.layer(above)).toMatchObject({ x: 520, y: 330 });
		expect(target.doc.layer(below)).toMatchObject({ x: 520, y: 330 });
		expect(target.doc.changeCount()).toBe(changes + 1);
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

describe("the select tool with a modifier", () => {
	it("adds the layer under a shift press to the selection", () => {
		const { target, above, below } = coveredTarget();

		tapAt(behaviorFor("select"), target, CENTER, WITH_SHIFT);

		expect(target.user.selection.get()).toEqual([below, above]);
	});

	it("takes a selected layer out of the selection on a shift press", () => {
		const { target, above, below } = coveredTarget();
		target.user.selection.set([below, above]);

		tapAt(behaviorFor("select"), target, CENTER, WITH_SHIFT);

		expect(target.user.selection.get()).toEqual([below]);
	});

	it("adds the layer under a control press to the selection", () => {
		const { target, above, below } = coveredTarget();

		tapAt(behaviorFor("select"), target, CENTER, WITH_CONTROL);

		expect(target.user.selection.get()).toEqual([below, above]);
	});

	it("takes the parent out of the selection on a shift press on its child", () => {
		const { target, child } = nestedTarget(0);
		target.user.selection.set([firstId(target.doc)]);

		tapAt(behaviorFor("select"), target, CENTER, WITH_SHIFT);

		expect(target.user.selection.get()).toEqual([child]);
	});

	it("holds the selection on a shift press on the empty canvas", () => {
		const { target, below } = coveredTarget();

		tapAt(behaviorFor("select"), { ...target, layerIds: [] }, EMPTY, WITH_SHIFT);

		expect(target.user.selection.get()).toEqual([below]);
	});
});
