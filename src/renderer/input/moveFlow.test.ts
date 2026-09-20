import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerFields, LayerId } from "../../document/layer";
import { UserState } from "../state/userState";
import { NO_MODIFIERS } from "./modifiers";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { drawnCenterOf, drawnOf, firstId, idAt, laidOutRow, pointAt } from "./toolFixtures";
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
