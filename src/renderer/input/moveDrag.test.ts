import { describe, expect, it, vi } from "vitest";
import type { LayerFields, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { NO_MODIFIERS } from "./modifiers";
import type { Modifiers } from "./modifiers";
import { cancelMove, changesParent } from "./moveDrag";
import { parentPointOf } from "./targetSpace";
import { behaviorFor } from "./toolBehavior";
import { NO_HITS, dragOver, dropScene, nestedTarget, pointAt } from "./toolFixtures";
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
const ALT: Modifiers = { shift: false, alt: true };
const TURNED_GRAB = { x: 580, y: 270 };
const ON_SCREEN = { x: 600, y: 240 };

interface DropSpec {
	press: Point;
	release: Point;
	hits: readonly LayerId[];
	modifiers?: Modifiers;
}

function dropOver(scene: DropScene, spec: DropSpec): void {
	const behavior = behaviorFor("select");
	const camera = scene.target.user.camera.get();
	const modifiers = spec.modifiers ?? NO_MODIFIERS;
	const press = pointAt(camera, spec.press);
	behavior.dragStart?.(scene.target, press, press, modifiers);
	scene.setHits(spec.hits);
	behavior.drag?.(scene.target, pointAt(camera, spec.release), modifiers);
	behavior.dragEnd?.(scene.target, pointAt(camera, spec.release), modifiers);
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

	it("takes a plain rectangle as the parent with alt", () => {
		const scene = dropScene(RECTANGLE);

		dropOver(scene, {
			press: GRAB,
			release: OVER_THE_ARTBOARD,
			hits: [scene.layer, scene.into],
			modifiers: ALT,
		});

		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ parent: scene.into });
	});

	it("leaves the layer at the root over a plain rectangle with no alt", () => {
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
		expect(moved).toMatchObject({ parent: null });
		expect(moved?.x).toBeCloseTo(ON_SCREEN.x);
		expect(moved?.y).toBeCloseTo(ON_SCREEN.y);
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
