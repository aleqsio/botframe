import { describe, expect, it, vi } from "vitest";
import type { LayerFields, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { centerOf, fromParentPoint } from "./layerSpace";
import { NO_MODIFIERS } from "./modifiers";
import { cancelMove, changesParent } from "./moveDrag";
import { parentChainOf, parentPointOf } from "./targetSpace";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import {
	NO_HITS,
	ROW_CHILD,
	dragOver,
	dropScene,
	firstId,
	laidOutRow,
	nestedTarget,
	pointAt,
	rowOfThree,
	rowScene,
} from "./toolFixtures";
import type { DropScene } from "./toolFixtures";

const FRAME: LayerFields = {
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
	...FRAME,
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

const GRAB = { x: 440, y: 280 };
const OVER_THE_FRAME = { x: 200, y: 160 };
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
	it("puts the layer into the frame under the pointer and holds it on the screen", () => {
		const scene = dropScene(FRAME);

		dropOver(scene, {
			press: GRAB,
			release: OVER_THE_FRAME,
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
		const scene = dropScene(FRAME);
		const doc = scene.target.doc;
		const wider = doc.createLayer({ ...FRAME, x: 700, y: 100, width: 600 });
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
		const scene = dropScene(FRAME);
		const changes = scene.target.doc.changeCount();

		dropOver(scene, {
			press: GRAB,
			release: OVER_THE_FRAME,
			hits: [scene.layer, scene.into],
		});

		expect(scene.target.doc.changeCount()).toBe(changes + 1);
	});

	it("takes the layer out to the root when no frame is under the pointer", () => {
		const scene = dropScene(FRAME);
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
			release: OVER_THE_FRAME,
			hits: [scene.layer, scene.into],
		});

		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ parent: null, x: 180, y: 140 });
	});

	it("does nothing when the drop lands on the layer itself or on a layer inside it", () => {
		const scene = dropScene(FRAME);
		const doc = scene.target.doc;
		const inside = doc.createLayer(FRAME, scene.layer);
		const moved = vi.spyOn(doc, "move");

		dropOver(scene, {
			press: GRAB,
			release: OVER_THE_FRAME,
			hits: [scene.layer, inside],
		});

		expect(doc.layer(scene.layer)).toMatchObject({ parent: null });
		expect(doc.layer(inside)).toMatchObject({ parent: scene.layer });
		expect(moved).not.toHaveBeenCalled();
	});

	it("moves the layer when the target changes, not once for each animation frame", () => {
		const scene = dropScene(FRAME);
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

describe("a layer inside a frame", () => {
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
		const scene = dropScene(FRAME);
		const doc = scene.target.doc;
		const behavior = behaviorFor("select");
		const camera = scene.target.user.camera.get();
		const press = pointAt(camera, GRAB);
		const start = doc.layer(scene.layer);

		behavior.dragStart?.(scene.target, press, press, NO_MODIFIERS);
		scene.setHits([scene.layer, scene.into]);
		behavior.drag?.(scene.target, pointAt(camera, OVER_THE_FRAME), NO_MODIFIERS);
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
		const scene = dropScene(FRAME);
		const doc = scene.target.doc;
		const behavior = behaviorFor("select");
		const camera = scene.target.user.camera.get();
		const press = pointAt(camera, GRAB);

		behavior.dragStart?.(scene.target, press, press, NO_MODIFIERS);
		scene.setHits([scene.layer, scene.into]);
		cancelMove(doc, scene.target.user);
		const changes = doc.changeCount();

		behavior.drag?.(scene.target, pointAt(camera, OVER_THE_FRAME), NO_MODIFIERS);
		behavior.dragEnd?.(scene.target, pointAt(camera, OVER_THE_FRAME), NO_MODIFIERS);

		expect(doc.layer(scene.layer)).toMatchObject({ parent: null, x: 420, y: 260 });
		expect(doc.changeCount()).toBe(changes);
	});
});

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
		const { target } = laidOutRow();
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

	it("puts a layer that lands in a row into the flow at the order under the pointer", () => {
		const { target, ids } = rowOfThree();
		const parent = firstId(target.doc);
		const outside = target.doc.createLayer({ ...ROW_CHILD, x: 700, y: 700 });
		target.doc.update(outside, { layout: { position: "absolute" } });
		target.doc.commit("add a loose layer");
		const scene = {
			...target,
			layerIds: [outside],
			layerIdsAt: () => [outside, parent],
		};
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const press = pointAt(camera, { x: 1150, y: 990 });

		behavior.dragStart?.(scene, press, press, NO_MODIFIERS);
		behavior.drag?.(scene, pointAt(camera, { x: 545, y: 290 }), NO_MODIFIERS);
		behavior.dragEnd?.(scene, pointAt(camera, { x: 545, y: 290 }), NO_MODIFIERS);

		expect(target.doc.layer(outside)).toMatchObject({ parent, x: 0, y: 0 });
		expect(target.doc.layer(outside)?.layout.position).toBe("default");
		expect(target.doc.childIds(parent)).toEqual([ids[0], ids[1], outside, ids[2]]);
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

const SECOND_CELL = {
	mode: "place",
	column: { start: 2, end: 3 },
	row: { start: 2, end: 3 },
} as const;

function gridScene(): { target: PointerTarget; child: LayerId } {
	const { target, child } = nestedTarget(0);
	target.doc.update(firstId(target.doc), { layout: { display: "grid" } });
	target.doc.update(child, { layout: { cell: SECOND_CELL } });
	target.doc.commit("place the child in a cell");
	return { target, child };
}

describe("a layer that leaves a grid", () => {
	it("drops its cell placement when it lands at the root, and gets it back on Escape", () => {
		const { target, child } = gridScene();
		const behavior = behaviorFor("select");
		const leaving = { ...target, layerIdsAt: NO_HITS };
		const camera = target.user.camera.get();
		const press = pointAt(camera, { x: 450, y: 290 });

		behavior.dragStart?.(leaving, press, press, NO_MODIFIERS);
		behavior.drag?.(leaving, pointAt(camera, { x: 700, y: 600 }), NO_MODIFIERS);

		expect(target.doc.layer(child)).toMatchObject({ parent: null });
		expect(target.doc.layer(child)?.layout.cell).toEqual({ mode: "auto" });

		cancelMove(target.doc, target.user);

		expect(target.doc.layer(child)?.layout.cell).toEqual(SECOND_CELL);
	});

	it("drops its cell placement when it lands in a row", () => {
		const { target, child } = gridScene();
		const row = target.doc.createLayer({ ...FRAME, x: 700, y: 600 });
		target.doc.update(row, { layout: { display: "row" } });
		target.doc.commit("add a row");

		dragOver(
			behaviorFor("select"),
			{ ...target, layerIdsAt: () => [row] },
			{ press: { x: 450, y: 290 }, release: { x: 750, y: 650 } },
		);

		expect(target.doc.layer(child)).toMatchObject({ parent: row });
		expect(target.doc.layer(child)?.layout.cell).toEqual({ mode: "auto" });
	});
});
