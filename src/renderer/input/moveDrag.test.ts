import { describe, expect, it, vi } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { UserState } from "../state/userState";
import { NO_MODIFIERS } from "./modifiers";
import type { Modifiers } from "./modifiers";
import type { PointerTarget } from "./tool";
import { parentPointOf } from "./targetSpace";
import { behaviorFor } from "./toolBehavior";
import { NO_HITS, dragOver, firstId, nestedTarget, pointAt } from "./toolFixtures";

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

interface Scene {
	target: PointerTarget;
	layer: LayerId;
	artboard: LayerId;
}

interface DropSpec {
	press: Point;
	release: Point;
	hits: readonly LayerId[];
	modifiers?: Modifiers;
}

function sceneOf(fields: LayerFields = ARTBOARD): {
	scene: Scene;
	setHits: (ids: readonly LayerId[]) => void;
} {
	const doc = DesignDocument.create();
	const layer = firstId(doc);
	let hits: readonly LayerId[] = [];
	return {
		scene: {
			target: { doc, user: new UserState(), layerIds: [layer], layerIdsAt: () => hits },
			layer,
			artboard: doc.createLayer(fields),
		},
		setHits: (ids) => {
			hits = ids;
		},
	};
}

function dropOver(scene: Scene, setHits: (ids: readonly LayerId[]) => void, spec: DropSpec): void {
	const behavior = behaviorFor("select");
	const camera = scene.target.user.camera.get();
	const modifiers = spec.modifiers ?? NO_MODIFIERS;
	const press = pointAt(camera, spec.press);
	behavior.dragStart?.(scene.target, press, press, modifiers);
	setHits(spec.hits);
	behavior.drag?.(scene.target, pointAt(camera, spec.release), modifiers);
	behavior.dragEnd?.(scene.target, pointAt(camera, spec.release), modifiers);
}

describe("a drop into a new parent", () => {
	it("puts the layer into the artboard under the pointer and holds it on the screen", () => {
		const { scene, setHits } = sceneOf();

		dropOver(scene, setHits, {
			press: GRAB,
			release: OVER_THE_ARTBOARD,
			hits: [scene.layer, scene.artboard],
		});

		expect(scene.target.doc.layer(scene.layer)).toMatchObject({
			parent: scene.artboard,
			x: 80,
			y: 40,
		});
		expect(scene.target.doc.childIds(scene.artboard)).toEqual([scene.layer]);
	});

	it("commits the whole gesture one time", () => {
		const { scene, setHits } = sceneOf();
		const changes = scene.target.doc.changeCount();

		dropOver(scene, setHits, {
			press: GRAB,
			release: OVER_THE_ARTBOARD,
			hits: [scene.layer, scene.artboard],
		});

		expect(scene.target.doc.changeCount()).toBe(changes + 1);
	});

	it("takes the layer out to the root when no artboard is under the pointer", () => {
		const { scene, setHits } = sceneOf();
		const doc = scene.target.doc;
		doc.move(scene.layer, scene.artboard);
		doc.update(scene.layer, { x: 320, y: 160 });

		dropOver(scene, setHits, { press: GRAB, release: EMPTY, hits: [scene.layer] });

		expect(doc.layer(scene.layer)).toMatchObject({ parent: null, x: 680, y: 580 });
		expect(doc.rootIds()).toContain(scene.layer);
	});

	it("takes a plain rectangle as the parent with alt", () => {
		const { scene, setHits } = sceneOf(RECTANGLE);

		dropOver(scene, setHits, {
			press: GRAB,
			release: OVER_THE_ARTBOARD,
			hits: [scene.layer, scene.artboard],
			modifiers: ALT,
		});

		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ parent: scene.artboard });
	});

	it("leaves the layer at the root over a plain rectangle with no alt", () => {
		const { scene, setHits } = sceneOf(RECTANGLE);

		dropOver(scene, setHits, {
			press: GRAB,
			release: OVER_THE_ARTBOARD,
			hits: [scene.layer, scene.artboard],
		});

		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ parent: null, x: 180, y: 140 });
	});

	it("does nothing when the drop lands on the layer itself or on a layer inside it", () => {
		const { scene, setHits } = sceneOf();
		const doc = scene.target.doc;
		const inside = doc.createLayer(ARTBOARD, scene.layer);
		const moved = vi.spyOn(doc, "move");

		dropOver(scene, setHits, {
			press: GRAB,
			release: OVER_THE_ARTBOARD,
			hits: [scene.layer, inside],
		});

		expect(doc.layer(scene.layer)).toMatchObject({ parent: null });
		expect(doc.layer(inside)).toMatchObject({ parent: scene.layer });
		expect(moved).not.toHaveBeenCalled();
	});

	it("moves the layer when the target changes, not once for each frame", () => {
		const { scene, setHits } = sceneOf();
		const behavior = behaviorFor("select");
		const camera = scene.target.user.camera.get();
		const press = pointAt(camera, GRAB);
		const moved = vi.spyOn(scene.target.doc, "move");

		behavior.dragStart?.(scene.target, press, press, NO_MODIFIERS);
		setHits([scene.layer, scene.artboard]);
		for (const step of [
			{ x: 200, y: 160 },
			{ x: 210, y: 170 },
			{ x: 220, y: 180 },
		]) {
			behavior.drag?.(scene.target, pointAt(camera, step), NO_MODIFIERS);
		}
		behavior.dragEnd?.(scene.target, pointAt(camera, { x: 220, y: 180 }), NO_MODIFIERS);

		expect(moved).toHaveBeenCalledTimes(1);
		expect(moved).toHaveBeenCalledWith(scene.layer, scene.artboard);
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
