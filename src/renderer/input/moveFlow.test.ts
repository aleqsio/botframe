import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { UserState } from "../state/userState";
import { NO_MODIFIERS } from "./modifiers";
import { cancelMove } from "./moveDrag";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import {
	ROW_CHILD,
	drawnCenterOf,
	drawnOf,
	firstId,
	idAt,
	laidOutRow,
	pointAt,
	rowSlots,
} from "./toolFixtures";
import type { Slot } from "./toolFixtures";

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

describe("a drag out of a row", () => {
	it("keeps the grabbed point under the pointer when the child leaves the row", () => {
		const { target, ids } = laidOutRow();
		const parent = firstId(target.doc);
		const middle = idAt(ids, 1);
		let hits: readonly LayerId[] = [middle, parent];
		const scene = { ...target, layerIds: hits, layerIdsAt: () => hits };
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const before = drawnCenterOf(scene, middle);
		const press = { x: before.x + 10, y: before.y + 5 };

		behavior.dragStart?.(scene, pointAt(camera, press), pointAt(camera, press), NO_MODIFIERS);
		behavior.drag?.(scene, pointAt(camera, { x: press.x + 5, y: press.y + 5 }), NO_MODIFIERS);
		hits = [];
		const release = { x: press.x + 400, y: press.y + 300 };
		behavior.drag?.(scene, pointAt(camera, release), NO_MODIFIERS);
		behavior.dragEnd?.(scene, pointAt(camera, release), NO_MODIFIERS);

		expect(target.doc.layer(middle)?.parent).toBeNull();
		expect(drawnCenterOf(scene, middle).x).toBeCloseTo(before.x + 400);
		expect(drawnCenterOf(scene, middle).y).toBeCloseTo(before.y + 300);
	});

	it("keeps the grabbed point under the pointer while the child is still in the row", () => {
		const { target, ids } = laidOutRow();
		const parent = firstId(target.doc);
		const middle = idAt(ids, 1);
		const scene = { ...target, layerIds: [middle, parent], layerIdsAt: () => [middle, parent] };
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const press = { x: 420 + 90, y: 260 + 20 };

		behavior.dragStart?.(scene, pointAt(camera, press), pointAt(camera, press), NO_MODIFIERS);
		behavior.drag?.(scene, pointAt(camera, { x: press.x + 7, y: press.y + 3 }), NO_MODIFIERS);

		expect(target.user.lift.get()?.at).toEqual({ x: 7, y: 3 });
	});
});

describe("a child of a turned parent that fills a row", () => {
	function turnedFillScene(): { target: PointerTarget; child: LayerId; artboard: LayerId } {
		const doc = DesignDocument.create();
		const row = firstId(doc);
		doc.update(row, { x: 100, y: 100, width: 600, height: 200, layout: { display: "row" } });
		const artboard = doc.createLayer({ ...ARTBOARD, x: 0, y: 0, width: 60, height: 200 }, row);
		doc.update(artboard, { rotation: 30, layout: { width: "fill" } });
		const child = doc.createLayer({ ...RECTANGLE, x: 50, y: 50, width: 40, height: 40 }, artboard);
		doc.commit("scene");
		const boxes = new Map<LayerId, Slot>([
			[artboard, { parent: row, x: 0, y: 0, width: 600, height: 200 }],
		]);
		const hits = [child, artboard, row];
		const target = {
			doc,
			user: new UserState(),
			layerIds: hits,
			layerIdsAt: () => hits,
			drawn: drawnOf(boxes),
		};
		return { target, child, artboard };
	}

	it("moves the child by the pointer delta on the screen, with the drawn size as the pivot", () => {
		const { target, child } = turnedFillScene();
		const before = drawnCenterOf(target, child);
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();

		behavior.dragStart?.(target, pointAt(camera, before), pointAt(camera, before), NO_MODIFIERS);
		const release = { x: before.x + 100, y: before.y + 50 };
		behavior.drag?.(target, pointAt(camera, release), NO_MODIFIERS);
		behavior.dragEnd?.(target, pointAt(camera, release), NO_MODIFIERS);

		expect(drawnCenterOf(target, child).x).toBeCloseTo(before.x + 100);
		expect(drawnCenterOf(target, child).y).toBeCloseTo(before.y + 50);
	});
});

describe("a child with an offset position in a row", () => {
	it("writes the cross axis into the document and lifts on the main axis only", () => {
		const { target, ids } = laidOutRow();
		const parent = firstId(target.doc);
		const first = idAt(ids, 0);
		target.doc.update(first, { layout: { position: "offset" } });
		target.doc.commit("offset");
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const press = { x: 420 + 30, y: 260 + 20 };

		behavior.dragStart?.(target, pointAt(camera, press), pointAt(camera, press), NO_MODIFIERS);
		behavior.drag?.(target, pointAt(camera, { x: press.x + 7, y: press.y + 10 }), NO_MODIFIERS);

		expect(target.doc.layer(first)).toMatchObject({ parent, x: 10, y: 30 });
		expect(target.user.lift.get()?.at).toEqual({ x: 7, y: 0 });
	});
});

describe("a child that fills a row", () => {
	it("keeps its painted width on the frame it leaves the row, so the grab does not jump", () => {
		const { target, ids } = laidOutRow();
		const parent = firstId(target.doc);
		const first = idAt(ids, 0);
		target.doc.update(first, { layout: { width: "fill" } });
		target.doc.commit("fill");
		const wide = new Map<LayerId, Slot>([[first, { parent, x: 0, y: 0, width: 180, height: 40 }]]);
		let hits: readonly LayerId[] = [first, parent];
		const scene = { ...target, drawn: drawnOf(wide), layerIds: hits, layerIdsAt: () => hits };
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const press = { x: 420 + 170, y: 260 + 20 };

		behavior.dragStart?.(scene, pointAt(camera, press), pointAt(camera, press), NO_MODIFIERS);
		hits = [];
		behavior.drag?.(scene, pointAt(camera, { x: press.x + 300, y: press.y + 300 }), NO_MODIFIERS);

		expect(target.doc.layer(first)).toMatchObject({ parent: null, x: 420 + 300, y: 260 + 300 });
	});
});

function fillScene(): { target: PointerTarget; first: LayerId; press: Point } {
	const { target, ids } = laidOutRow();
	const parent = firstId(target.doc);
	const first = idAt(ids, 0);
	target.doc.update(first, { layout: { width: "fill" } });
	target.doc.commit("fill");
	const wide = new Map<LayerId, Slot>([[first, { parent, x: 0, y: 0, width: 180, height: 40 }]]);
	let hits: readonly LayerId[] = [first, parent];
	const scene = { ...target, drawn: drawnOf(wide), layerIds: hits, layerIdsAt: () => hits };
	const behavior = behaviorFor("select");
	const camera = target.user.camera.get();
	const press = { x: 420 + 170, y: 260 + 20 };
	behavior.dragStart?.(scene, pointAt(camera, press), pointAt(camera, press), NO_MODIFIERS);
	hits = [];
	behavior.drag?.(scene, pointAt(camera, { x: press.x + 300, y: press.y + 300 }), NO_MODIFIERS);
	return { target: scene, first, press };
}

describe("a fill child that leaves a row for the root", () => {
	it("keeps its painted width as a fixed width, so it does not fill the root", () => {
		const { target, first } = fillScene();

		expect(target.doc.layer(first)).toMatchObject({ parent: null, width: 180 });
		expect(target.doc.layer(first)?.layout.width).toBe("fixed");
	});

	it("gets its fill width back when the gesture is cancelled", () => {
		const { target, first } = fillScene();

		cancelMove(target.doc, target.user);

		expect(target.doc.layer(first)).toMatchObject({ width: 60 });
		expect(target.doc.layer(first)?.layout.width).toBe("fill");
	});
});

describe("the frame after a reorder inside a row", () => {
	it("asks for one more solve, which measures the lift against the new slot", () => {
		const { target, ids } = laidOutRow();
		const parent = firstId(target.doc);
		const first = idAt(ids, 0);
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const press = pointAt(camera, { x: 420 + 30, y: 260 + 20 });
		const moved = pointAt(camera, { x: press.stage.x + 70, y: press.stage.y });
		behavior.dragStart?.(target, press, press, NO_MODIFIERS);

		expect(behavior.drag?.(target, moved, NO_MODIFIERS)).toBe(true);

		expect(target.doc.childIds(parent)).toEqual([idAt(ids, 1), first, idAt(ids, 2)]);
		expect(target.user.lift.get()?.at).toEqual({ x: 70, y: 0 });
		const placed = { ...target, drawn: drawnOf(rowSlots(parent, target.doc.childIds(parent))) };

		expect(behavior.drag?.(placed, moved, NO_MODIFIERS)).toBe(false);

		expect(target.user.lift.get()?.at).toEqual({ x: 10, y: 0 });
	});
});

describe("the frame after a layer lands in a row", () => {
	it("asks for one more solve, which measures the lift once the row places the layer", () => {
		const { target, ids } = laidOutRow();
		const parent = firstId(target.doc);
		const outside = target.doc.createLayer({ ...ROW_CHILD, x: 700, y: 700 });
		target.doc.update(outside, { layout: { position: "absolute" } });
		target.doc.commit("add a loose layer");
		let hits: readonly LayerId[] = [outside];
		const scene = { ...target, layerIds: hits, layerIdsAt: () => hits };
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const press = pointAt(camera, { x: 730, y: 720 });
		const moved = pointAt(camera, { x: 420 + 100, y: 260 + 20 });
		behavior.dragStart?.(scene, press, press, NO_MODIFIERS);
		hits = [outside, parent];

		expect(behavior.drag?.(scene, moved, NO_MODIFIERS)).toBe(true);

		expect(target.doc.childIds(parent)).toEqual([
			idAt(ids, 0),
			idAt(ids, 1),
			outside,
			idAt(ids, 2),
		]);
		expect(target.user.lift.get()?.at).toEqual({ x: 0, y: 0 });
		const placed = { ...scene, drawn: drawnOf(rowSlots(parent, target.doc.childIds(parent))) };

		expect(behavior.drag?.(placed, moved, NO_MODIFIERS)).toBe(false);

		expect(target.user.lift.get()?.at).toEqual({ x: -50, y: 0 });
	});
});
