import { describe, expect, it, vi } from "vitest";
import type { LayerFields, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { centerOf, fromParentPoint } from "./layerSpace";
import { NO_MODIFIERS } from "./modifiers";
import { cancelMove, changesParent } from "./moveDrag";
import { parentChainOf, parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { NO_HITS, dragOver, dropScene, firstId, nestedTarget, pointAt } from "./toolFixtures";
import type { DropScene } from "./toolFixtures";

const ARTBOARD: LayerFields = {
	x: 100,
	y: 100,
	width: 300,
	height: 200,
	fill: "#ffffff",
	name: "",
	clip: true,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: true },
};

const RECTANGLE: LayerFields = {
	...ARTBOARD,
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

const GRAB = { x: 440, y: 280 };
const OVER_THE_ARTBOARD = { x: 200, y: 160 };
const EMPTY = { x: 700, y: 600 };
const TURNED_GRAB = { x: 580, y: 270 };
const ON_SCREEN = { x: 600, y: 240 };
const PULL = { x: 30, y: 10 };

function canvasCenterOf(target: PointerTarget, id: LayerId): Point {
	const layer = target.doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return fromParentPoint(parentChainOf(target, id), centerOf(layer));
}

interface DropSpec {
	press: Point;
	release: Point;
	hits: readonly LayerId[];
}

function dropOver(scene: DropScene, spec: DropSpec): void {
	const behavior = behaviorFor("select");
	const camera = scene.target.user.camera.get();
	const press = pointAt(camera, spec.press);
	behavior.dragStart?.(scene.target, press, press, NO_MODIFIERS);
	scene.setHits(spec.hits);
	behavior.drag?.(scene.target, pointAt(camera, spec.release), NO_MODIFIERS);
	behavior.dragEnd?.(scene.target, pointAt(camera, spec.release), NO_MODIFIERS);
}

describe("a drop into a new parent", () => {
	it("puts the layer into the artboard under the pointer and holds it on the screen", () => {
		const scene = dropScene(ARTBOARD);

		dropOver(scene, {
			press: GRAB,
			release: OVER_THE_ARTBOARD,
			hits: [scene.layer, scene.into],
		});

		expect(scene.target.doc.layer(scene.layer)).toMatchObject({
			parent: scene.into,
			x: 80,
			y: 40,
		});
		expect(scene.target.doc.childIds(scene.into)).toEqual([scene.layer]);
	});

	it("holds the layer under the pointer when the new parent changes its size", () => {
		const scene = dropScene(ARTBOARD);
		const doc = scene.target.doc;
		const wider = doc.createLayer({ ...ARTBOARD, x: 700, y: 100, width: 600 });
		doc.move(scene.layer, scene.into);
		doc.update(scene.layer, { lengths: { width: { value: 50, unit: "%" } } });
		doc.commit("set width");
		const start = canvasCenterOf(scene.target, scene.layer);

		dropOver(scene, {
			press: start,
			release: { x: start.x + PULL.x, y: start.y + PULL.y },
			hits: [scene.layer, wider],
		});

		expect(doc.layer(scene.layer)).toMatchObject({ parent: wider, width: 300 });
		expect(canvasCenterOf(scene.target, scene.layer).x).toBeCloseTo(start.x + PULL.x);
		expect(canvasCenterOf(scene.target, scene.layer).y).toBeCloseTo(start.y + PULL.y);
	});

	it("commits the whole gesture one time", () => {
		const scene = dropScene(ARTBOARD);
		const changes = scene.target.doc.changeCount();

		dropOver(scene, {
			press: GRAB,
			release: OVER_THE_ARTBOARD,
			hits: [scene.layer, scene.into],
		});

		expect(scene.target.doc.changeCount()).toBe(changes + 1);
	});

	it("takes the layer out to the root when no artboard is under the pointer", () => {
		const scene = dropScene(ARTBOARD);
		const doc = scene.target.doc;
		doc.move(scene.layer, scene.into);
		doc.update(scene.layer, { x: 320, y: 160 });

		dropOver(scene, { press: GRAB, release: EMPTY, hits: [scene.layer] });

		expect(doc.layer(scene.layer)).toMatchObject({ parent: null, x: 680, y: 580 });
		expect(doc.rootIds()).toContain(scene.layer);
	});

	it("leaves the layer at the root over a plain rectangle", () => {
		const scene = dropScene(RECTANGLE);

		dropOver(scene, {
			press: GRAB,
			release: OVER_THE_ARTBOARD,
			hits: [scene.layer, scene.into],
		});

		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ parent: null, x: 180, y: 140 });
	});

	it("does nothing when the drop lands on the layer itself or on a layer inside it", () => {
		const scene = dropScene(ARTBOARD);
		const doc = scene.target.doc;
		const inside = doc.createLayer(ARTBOARD, scene.layer);
		const moved = vi.spyOn(doc, "move");

		dropOver(scene, {
			press: GRAB,
			release: OVER_THE_ARTBOARD,
			hits: [scene.layer, inside],
		});

		expect(doc.layer(scene.layer)).toMatchObject({ parent: null });
		expect(doc.layer(inside)).toMatchObject({ parent: scene.layer });
		expect(moved).not.toHaveBeenCalled();
	});

	it("moves the layer when the target changes, not once for each frame", () => {
		const scene = dropScene(ARTBOARD);
		const behavior = behaviorFor("select");
		const camera = scene.target.user.camera.get();
		const press = pointAt(camera, GRAB);
		const moved = vi.spyOn(scene.target.doc, "move");

		behavior.dragStart?.(scene.target, press, press, NO_MODIFIERS);
		scene.setHits([scene.layer, scene.into]);
		for (const step of [
			{ x: 200, y: 160 },
			{ x: 210, y: 170 },
			{ x: 220, y: 180 },
		]) {
			behavior.drag?.(scene.target, pointAt(camera, step), NO_MODIFIERS);
		}
		behavior.dragEnd?.(scene.target, pointAt(camera, { x: 220, y: 180 }), NO_MODIFIERS);

		expect(moved).toHaveBeenCalledTimes(1);
		expect(moved).toHaveBeenCalledWith(scene.layer, scene.into);
		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ x: 100, y: 60 });
	});
});

describe("a layer inside an artboard", () => {
	it("moves the layer in the space of its parent", () => {
		const { target, child } = nestedTarget(0);

		dragOver(behaviorFor("select"), target, {
			press: { x: 450, y: 290 },
			release: { x: 470, y: 310 },
		});

		expect(target.doc.layer(child)).toMatchObject({ x: 40, y: 40 });
		expect(target.user.selection.get()).toEqual([child]);
	});

	it("moves the layer along the axes of a turned parent", () => {
		const { target, child } = nestedTarget(90);

		dragOver(behaviorFor("select"), target, {
			press: { x: 580, y: 270 },
			release: { x: 580, y: 290 },
		});

		const moved = target.doc.layer(child);
		expect(moved?.x).toBeCloseTo(40);
		expect(moved?.y).toBeCloseTo(20);
	});

	it("holds the layer on the screen when it leaves a turned parent", () => {
		const { target, child } = nestedTarget(90);
		const corner = parentPointOf(target, child, ON_SCREEN);
		expect(corner.x).toBeCloseTo(20);
		expect(corner.y).toBeCloseTo(20);

		dragOver(
			behaviorFor("select"),
			{ ...target, layerIdsAt: NO_HITS },
			{ press: TURNED_GRAB, release: TURNED_GRAB },
		);

		const moved = target.doc.layer(child);
		expect(moved).toMatchObject({ parent: null, rotation: 90 });
		expect(canvasCenterOf(target, child).x).toBeCloseTo(ON_SCREEN.x - 20);
		expect(canvasCenterOf(target, child).y).toBeCloseTo(ON_SCREEN.y + 30);
	});

	it("keeps the grip under the pointer when the layer leaves a turned parent during a drag", () => {
		const { target, child } = nestedTarget(90);
		const start = canvasCenterOf(target, child);

		dragOver(
			behaviorFor("select"),
			{ ...target, layerIdsAt: NO_HITS },
			{ press: TURNED_GRAB, release: { x: TURNED_GRAB.x + PULL.x, y: TURNED_GRAB.y + PULL.y } },
		);

		expect(target.doc.layer(child)).toMatchObject({ parent: null, rotation: 90 });
		expect(canvasCenterOf(target, child).x).toBeCloseTo(start.x + PULL.x);
		expect(canvasCenterOf(target, child).y).toBeCloseTo(start.y + PULL.y);
	});
});

describe("Escape during a move drag", () => {
	it("puts the layer back in the first parent at its first position", () => {
		const scene = dropScene(ARTBOARD);
		const doc = scene.target.doc;
		const behavior = behaviorFor("select");
		const camera = scene.target.user.camera.get();
		const press = pointAt(camera, GRAB);
		const start = doc.layer(scene.layer);

		behavior.dragStart?.(scene.target, press, press, NO_MODIFIERS);
		scene.setHits([scene.layer, scene.into]);
		behavior.drag?.(scene.target, pointAt(camera, OVER_THE_ARTBOARD), NO_MODIFIERS);
		expect(doc.layer(scene.layer)).toMatchObject({ parent: scene.into });

		cancelMove(doc, scene.target.user);

		expect(doc.layer(scene.layer)).toMatchObject({
			parent: null,
			x: start?.x,
			y: start?.y,
		});
		expect(scene.target.user.move.get()).toBeNull();
		expect(changesParent(scene.target.user.move.get())).toBe(false);
	});

	it("gives a layer that left a turned parent its first rotation back", () => {
		const { target, child } = nestedTarget(90);
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const leaving = { ...target, layerIdsAt: NO_HITS };

		behavior.dragStart?.(
			leaving,
			pointAt(camera, TURNED_GRAB),
			pointAt(camera, TURNED_GRAB),
			NO_MODIFIERS,
		);
		behavior.drag?.(leaving, pointAt(camera, ON_SCREEN), NO_MODIFIERS);
		expect(target.doc.layer(child)).toMatchObject({ parent: null, rotation: 90 });

		cancelMove(target.doc, target.user);

		expect(target.doc.layer(child)?.parent).not.toBeNull();
		expect(target.doc.layer(child)).toMatchObject({ x: 20, y: 20, rotation: 0 });
	});

	it("leaves the rest of the gesture without an answer", () => {
		const scene = dropScene(ARTBOARD);
		const doc = scene.target.doc;
		const behavior = behaviorFor("select");
		const camera = scene.target.user.camera.get();
		const press = pointAt(camera, GRAB);

		behavior.dragStart?.(scene.target, press, press, NO_MODIFIERS);
		scene.setHits([scene.layer, scene.into]);
		cancelMove(doc, scene.target.user);
		const changes = doc.changeCount();

		behavior.drag?.(scene.target, pointAt(camera, OVER_THE_ARTBOARD), NO_MODIFIERS);
		behavior.dragEnd?.(scene.target, pointAt(camera, OVER_THE_ARTBOARD), NO_MODIFIERS);

		expect(doc.layer(scene.layer)).toMatchObject({ parent: null, x: 420, y: 260 });
		expect(doc.changeCount()).toBe(changes);
	});
});

function rowScene(): { target: PointerTarget; child: LayerId } {
	const scene = nestedTarget(0);
	scene.target.doc.update(firstId(scene.target.doc), { layout: { display: "row" } });
	scene.target.doc.commit("set display");
	return scene;
}

const ROW_CHILD: LayerFields = {
	x: 10,
	y: 20,
	width: 60,
	height: 40,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

interface RowOfThree {
	target: PointerTarget;
	ids: readonly LayerId[];
}

function rowOfThree(): RowOfThree {
	const { target } = rowScene();
	const doc = target.doc;
	const parent = firstId(doc);
	for (const id of doc.childIds(parent)) {
		doc.deleteLayer(id);
	}
	const ids = [10, 90, 170].map((at) => doc.createLayer({ ...ROW_CHILD, x: at }, parent));
	doc.commit("fill the row");
	const hits = [ids[0] ?? parent, parent];
	return { target: { ...target, layerIds: hits, layerIdsAt: () => hits }, ids };
}

describe("a move drag of a child that the parent lays out", () => {
	it("leaves the place of the child, because the row places it", () => {
		const { target, child } = rowScene();

		dragOver(behaviorFor("select"), target, {
			press: { x: 450, y: 290 },
			release: { x: 470, y: 310 },
		});

		expect(target.doc.layer(child)).toMatchObject({ x: 20, y: 20 });
		expect(target.doc.layer(child)?.layout.position).toBe("default");
	});

	it("gives the child the order under the pointer", () => {
		const { target, ids } = rowOfThree();
		const parent = firstId(target.doc);

		dragOver(behaviorFor("select"), target, {
			press: { x: 450, y: 290 },
			release: { x: 545, y: 290 },
		});

		expect(target.doc.childIds(parent)).toEqual([ids[1], ids[0], ids[2]]);
	});

	it("moves the child one time for each change of the order", () => {
		const { target } = rowOfThree();
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const press = pointAt(camera, { x: 450, y: 290 });
		const moved = vi.spyOn(target.doc, "move");

		behavior.dragStart?.(target, press, press, NO_MODIFIERS);
		for (const step of [540, 545, 550]) {
			behavior.drag?.(target, pointAt(camera, { x: step, y: 290 }), NO_MODIFIERS);
		}
		behavior.dragEnd?.(target, pointAt(camera, { x: 550, y: 290 }), NO_MODIFIERS);

		expect(moved).toHaveBeenCalledTimes(1);
	});

	it("lifts the child under the pointer while the row holds its slot", () => {
		const { target } = rowOfThree();
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const press = pointAt(camera, { x: 450, y: 290 });

		behavior.dragStart?.(target, press, press, NO_MODIFIERS);
		behavior.drag?.(target, pointAt(camera, { x: 470, y: 300 }), NO_MODIFIERS);

		expect(target.user.lift.get()?.at).toEqual({ x: 20, y: 10 });

		behavior.dragEnd?.(target, pointAt(camera, { x: 470, y: 300 }), NO_MODIFIERS);
		expect(target.user.lift.get()).toBeNull();
	});

	it("leaves the child in the flow under a block parent", () => {
		const { target, child } = nestedTarget(0);

		dragOver(behaviorFor("select"), target, {
			press: { x: 450, y: 290 },
			release: { x: 470, y: 310 },
		});

		expect(target.doc.layer(child)?.layout.position).toBe("default");
	});

	it("gives the first order back when the gesture is cancelled", () => {
		const { target, ids } = rowOfThree();
		const parent = firstId(target.doc);
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const press = pointAt(camera, { x: 450, y: 290 });

		behavior.dragStart?.(target, press, press, NO_MODIFIERS);
		behavior.drag?.(target, pointAt(camera, { x: 545, y: 290 }), NO_MODIFIERS);
		expect(target.doc.childIds(parent)).toEqual([ids[1], ids[0], ids[2]]);

		cancelMove(target.doc, target.user);

		expect(target.doc.childIds(parent)).toEqual(ids);
		expect(target.user.lift.get()).toBeNull();
	});
});
