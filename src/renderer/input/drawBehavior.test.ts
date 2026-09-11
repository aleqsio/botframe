import { describe, expect, it } from "vitest";
import { cancelDraw } from "./drawBehavior";
import { NO_MODIFIERS } from "./modifiers";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { firstId } from "./toolFixtures";
import { dragOver, drawnLayer, nestedTarget, pointAt, tapAt, targetOf } from "./toolFixtures";

const PRESS = { x: 440, y: 280 };
const CENTER = { x: 540, y: 340 };
const DRAW_PRESS = { x: 40, y: 40 };
const DRAW_RELEASE = { x: 240, y: 180 };
const ARTBOARD_GEOMETRY = {
	kind: "rectangle",
	cornerRadius: 0,
	cornerSmoothing: 0,
	artboard: true,
} as const;

function artboardTarget(): PointerTarget {
	const target = targetOf(true);
	target.doc.update(firstId(target.doc), { geometry: ARTBOARD_GEOMETRY });
	return target;
}

describe("the draw tools", () => {
	it("draws an artboard, selects it, and gives the stage back to the select tool", () => {
		const target = targetOf(false);
		const changes = target.doc.changeCount();

		dragOver(behaviorFor("artboard"), target, { press: DRAW_PRESS, release: DRAW_RELEASE });

		expect(drawnLayer(target)).toMatchObject({
			x: 40,
			y: 40,
			width: 200,
			height: 140,
			parent: null,
			fill: "#ffffff",
			clip: true,
			name: "Artboard 1",
			geometry: { kind: "rectangle", artboard: true },
		});
		expect(target.doc.layerIds()).toHaveLength(2);
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.tool.get()).toBe("select");
		expect(target.user.draw.get()).toBeNull();
	});

	it("draws a rectangle with the grey fill, no clip, and the next free name", () => {
		const target = targetOf(false);

		dragOver(behaviorFor("rectangle"), target, { press: DRAW_PRESS, release: DRAW_RELEASE });

		expect(drawnLayer(target)).toMatchObject({
			fill: "#d9d9d9",
			clip: false,
			name: "Rectangle 2",
			geometry: { kind: "rectangle", artboard: false },
		});
	});

	it("draws an ellipse with the grey fill, no clip, and the next free name", () => {
		const target = targetOf(false);

		dragOver(behaviorFor("ellipse"), target, { press: DRAW_PRESS, release: DRAW_RELEASE });

		expect(drawnLayer(target)).toMatchObject({
			x: 40,
			y: 40,
			width: 200,
			height: 140,
			rotation: 0,
			parent: null,
			fill: "#d9d9d9",
			clip: false,
			name: "Ellipse 1",
			geometry: { kind: "ellipse" },
		});
		expect(target.user.tool.get()).toBe("select");
	});

	it("places a box of the default size where the tap lands", () => {
		const target = targetOf(false);
		const changes = target.doc.changeCount();

		tapAt(behaviorFor("artboard"), target, CENTER);

		expect(drawnLayer(target)).toMatchObject({ x: 540, y: 340, width: 100, height: 100 });
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.tool.get()).toBe("select");
	});

	it("deletes the layer in progress on a cancel and writes no change on the release", () => {
		const target = targetOf(false);
		const behavior = behaviorFor("artboard");
		const camera = target.user.camera.get();
		const changes = target.doc.changeCount();
		const press = pointAt(camera, DRAW_PRESS);

		behavior.dragStart?.(target, press, press, NO_MODIFIERS);
		behavior.drag?.(target, pointAt(camera, DRAW_RELEASE), NO_MODIFIERS);
		cancelDraw(target.doc, target.user);
		behavior.drag?.(target, pointAt(camera, CENTER), NO_MODIFIERS);
		behavior.dragEnd?.(target, pointAt(camera, DRAW_RELEASE), NO_MODIFIERS);

		expect(target.doc.layerIds()).toHaveLength(1);
		expect(target.user.selection.get()).toEqual([]);
		expect(target.user.draw.get()).toBeNull();
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.tool.get()).toBe("select");
	});

	it("draws the new layer inside the artboard under the press, in the space of that artboard", () => {
		const target = artboardTarget();
		const parent = firstId(target.doc);

		dragOver(behaviorFor("rectangle"), target, { press: PRESS, release: { x: 500, y: 330 } });

		const drawn = drawnLayer(target);
		expect(drawn).toMatchObject({ parent, x: 20, y: 20, width: 60, height: 50 });
		expect(target.doc.childIds(parent)).toEqual([drawn.id]);
		expect(target.doc.rootIds()).toEqual([parent]);
	});

	it("places the box of a tap inside the artboard under the tap", () => {
		const target = artboardTarget();
		const parent = firstId(target.doc);

		tapAt(behaviorFor("rectangle"), target, PRESS);

		expect(drawnLayer(target)).toMatchObject({ parent, x: 20, y: 20, width: 100, height: 100 });
	});

	it("holds the box in the space of the parent when the parent moves during the draw", () => {
		const target = artboardTarget();
		const parent = firstId(target.doc);
		const behavior = behaviorFor("rectangle");
		const camera = target.user.camera.get();
		const press = pointAt(camera, PRESS);

		behavior.dragStart?.(target, press, press, NO_MODIFIERS);
		target.doc.update(parent, { x: 400, y: 240 });
		behavior.drag?.(target, pointAt(camera, { x: 500, y: 330 }), NO_MODIFIERS);
		behavior.dragEnd?.(target, pointAt(camera, { x: 500, y: 330 }), NO_MODIFIERS);

		expect(drawnLayer(target)).toMatchObject({ x: 20, y: 20, width: 80, height: 70 });
	});

	it("draws inside a turned parent in the space of that parent", () => {
		const target = artboardTarget();
		const parent = firstId(target.doc);
		target.doc.update(parent, { rotation: 90 });

		dragOver(behaviorFor("rectangle"), target, {
			press: { x: 600, y: 240 },
			release: { x: 550, y: 300 },
		});

		const drawn = drawnLayer(target);
		expect(drawn.parent).toBe(parent);
		expect(drawn.x).toBeCloseTo(20);
		expect(drawn.y).toBeCloseTo(20);
		expect(drawn.width).toBeCloseTo(60);
		expect(drawn.height).toBeCloseTo(50);
	});

	it("draws at the root when a shape, and no artboard, is under the press", () => {
		const target = targetOf(true);
		const under = firstId(target.doc);

		dragOver(behaviorFor("rectangle"), target, { press: PRESS, release: { x: 500, y: 330 } });

		expect(drawnLayer(target)).toMatchObject({
			parent: null,
			x: 440,
			y: 280,
			width: 60,
			height: 50,
		});
		expect(target.doc.childIds(under)).toEqual([]);
	});

	it("draws inside the artboard when a shape in that artboard is under the press", () => {
		const { target, child } = nestedTarget(0);
		const parent = firstId(target.doc);

		dragOver(behaviorFor("rectangle"), target, {
			press: { x: 450, y: 290 },
			release: { x: 480, y: 320 },
		});

		expect(drawnLayer(target)).toMatchObject({ parent, x: 30, y: 30, width: 30, height: 30 });
		expect(target.doc.childIds(child)).toEqual([]);
	});

	it("gives the stage back to the select tool when a cancel finds no draw", () => {
		const target = targetOf(false);
		target.user.tool.set("rectangle");
		const changes = target.doc.changeCount();

		cancelDraw(target.doc, target.user);

		expect(target.user.tool.get()).toBe("select");
		expect(target.doc.changeCount()).toBe(changes);
	});
});
