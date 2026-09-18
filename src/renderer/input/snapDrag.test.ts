import { describe, expect, it } from "vitest";
import type { LayerFields, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { NO_MODIFIERS } from "./modifiers";
import type { Modifiers } from "./modifiers";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { dragOver, dropScene, nestedTarget, pointAt } from "./toolFixtures";

const CONTROL: Modifiers = { ...NO_MODIFIERS, control: true };
const SIBLING: LayerFields = {
	x: 700,
	y: 100,
	width: 100,
	height: 100,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};
const GRAB = { x: 440, y: 280 };
const NEAR_THE_SIBLING = { x: 483, y: 280 };
const GRAB_THE_CHILD = { x: 450, y: 290 };
const NEAR_THE_EDGE = { x: 433, y: 290 };
const NEAR_THE_GUIDE = { x: 503, y: 290 };

function dragChild(target: PointerTarget, release: Point, modifiers = NO_MODIFIERS): void {
	dragOver(behaviorFor("select"), target, { press: GRAB_THE_CHILD, release, modifiers });
}

describe("a move drag near a sibling", () => {
	it("snaps the edge of the layer to the edge of the sibling", () => {
		const scene = dropScene(SIBLING);
		dragOver(behaviorFor("select"), scene.target, { press: GRAB, release: NEAR_THE_SIBLING });
		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ x: 460, y: 260 });
	});

	it("shows the snap line during the drag and takes it away at the end", () => {
		const scene = dropScene(SIBLING);
		const behavior = behaviorFor("select");
		const camera = scene.target.user.camera.get();
		const press = pointAt(camera, GRAB);
		behavior.dragStart?.(scene.target, press, press, NO_MODIFIERS);
		behavior.drag?.(scene.target, pointAt(camera, NEAR_THE_SIBLING), NO_MODIFIERS);

		expect(scene.target.user.snap.get()).toEqual({
			parent: null,
			segments: [{ axis: "x", at: 700, from: 200, to: 260 }],
		});

		behavior.dragEnd?.(scene.target, pointAt(camera, NEAR_THE_SIBLING), NO_MODIFIERS);
		expect(scene.target.user.snap.get()).toBeNull();
	});

	it("snaps to the outline of an ellipse, not to the extreme beyond it", () => {
		const scene = dropScene({ ...SIBLING, y: 300, geometry: { kind: "ellipse" } });
		dragOver(behaviorFor("select"), scene.target, { press: GRAB, release: NEAR_THE_SIBLING });
		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ x: 461.01, y: 252.94 });
	});

	it("does not snap while the control key is down", () => {
		const scene = dropScene(SIBLING);
		dragOver(behaviorFor("select"), scene.target, {
			press: GRAB,
			release: NEAR_THE_SIBLING,
			modifiers: CONTROL,
		});
		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ x: 463, y: 260 });
		expect(scene.target.user.snap.get()).toBeNull();
	});

	it("snaps with a reach that follows the zoom", () => {
		const scene = dropScene(SIBLING);
		scene.target.user.camera.set({ x: 0, y: 0, zoom: 4 });
		const camera = scene.target.user.camera.get();
		const press = { x: GRAB.x * 4, y: GRAB.y * 4 };
		const release = { x: NEAR_THE_SIBLING.x * 4, y: NEAR_THE_SIBLING.y * 4 };
		dragOver(behaviorFor("select"), scene.target, { press, release });
		expect(camera.zoom).toBe(4);
		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ x: 463, y: 260 });
	});
});

describe("a move drag inside an artboard", () => {
	it("snaps to the edge of the artboard and draws the line across it", () => {
		const { target, child } = nestedTarget(0);
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const press = pointAt(camera, GRAB_THE_CHILD);
		behavior.dragStart?.(target, press, press, NO_MODIFIERS);
		behavior.drag?.(target, pointAt(camera, NEAR_THE_EDGE), NO_MODIFIERS);

		expect(target.doc.layer(child)).toMatchObject({ x: 0, y: 20 });
		expect(target.user.snap.get()?.segments).toEqual([{ axis: "x", at: 0, from: 0, to: 160 }]);
		expect(target.user.snap.get()?.parent).toBe(target.doc.layer(child)?.parent);
	});

	it("snaps the center of the layer to a guide of the artboard", () => {
		const { target, child } = nestedTarget(0);
		const parent = target.doc.layer(child)?.parent;
		if (parent === null || parent === undefined) {
			throw new Error("the child has no parent");
		}
		target.doc.update(parent, { guides: [{ axis: "x", at: 100 }] });

		dragChild(target, NEAR_THE_GUIDE);

		expect(target.doc.layer(child)).toMatchObject({ x: 70, y: 20 });
	});

	it("leaves a layer that nothing pulls where the pointer puts it", () => {
		const { target, child } = nestedTarget(0);
		dragChild(target, { x: 470, y: 310 });
		expect(target.doc.layer(child)).toMatchObject({ x: 40, y: 40 });
		expect(target.user.snap.get()).toBeNull();
	});
});

describe("the snap field", () => {
	it("leaves out the layer itself and the layers inside it", () => {
		const scene = dropScene(SIBLING);
		const doc = scene.target.doc;
		const inside: LayerId = doc.createLayer({ ...SIBLING, x: 0, y: 0 }, scene.layer);
		expect(doc.layer(inside)?.parent).toBe(scene.layer);

		dragOver(behaviorFor("select"), scene.target, { press: GRAB, release: { x: 443, y: 280 } });

		expect(doc.layer(scene.layer)).toMatchObject({ x: 423, y: 260 });
	});
});
