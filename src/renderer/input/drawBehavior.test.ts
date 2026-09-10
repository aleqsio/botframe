import { describe, expect, it } from "vitest";
import { cancelDraw } from "./drawBehavior";
import { NO_MODIFIERS } from "./modifiers";
import { TOOL_BEHAVIORS } from "./toolBehavior";
import { dragOver, drawnLayer, firstId, pointAt, tapAt, targetOf } from "./toolSupport";

const PRESS = { x: 440, y: 280 };
const CENTER = { x: 540, y: 340 };
const DRAW_PRESS = { x: 40, y: 40 };
const DRAW_RELEASE = { x: 240, y: 180 };

describe("the draw tools", () => {
	it("draws an artboard, selects it, and gives the stage back to the select tool", () => {
		const target = targetOf(false);
		const changes = target.doc.changeCount();

		dragOver(TOOL_BEHAVIORS.artboard(), target, { press: DRAW_PRESS, release: DRAW_RELEASE });

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

		dragOver(TOOL_BEHAVIORS.rectangle(), target, { press: DRAW_PRESS, release: DRAW_RELEASE });

		expect(drawnLayer(target)).toMatchObject({
			fill: "#d9d9d9",
			clip: false,
			name: "Rectangle 2",
			geometry: { kind: "rectangle", artboard: false },
		});
	});

	it("places a box of the default size where the tap lands", () => {
		const target = targetOf(false);
		const changes = target.doc.changeCount();

		tapAt(TOOL_BEHAVIORS.artboard(), target, CENTER);

		expect(drawnLayer(target)).toMatchObject({ x: 540, y: 340, width: 100, height: 100 });
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.tool.get()).toBe("select");
	});

	it("deletes the layer in progress on a cancel and writes no change on the release", () => {
		const target = targetOf(false);
		const behavior = TOOL_BEHAVIORS.artboard();
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

	it("draws the new layer inside the layer under the press, in the space of that layer", () => {
		const target = targetOf(true);
		const parent = firstId(target.doc);

		dragOver(TOOL_BEHAVIORS.rectangle(), target, { press: PRESS, release: { x: 500, y: 330 } });

		const drawn = drawnLayer(target);
		expect(drawn).toMatchObject({ parent, x: 20, y: 20, width: 60, height: 50 });
		expect(target.doc.childIds(parent)).toEqual([drawn.id]);
		expect(target.doc.rootIds()).toEqual([parent]);
	});

	it("places the box of a tap inside the layer under the tap", () => {
		const target = targetOf(true);
		const parent = firstId(target.doc);

		tapAt(TOOL_BEHAVIORS.rectangle(), target, PRESS);

		expect(drawnLayer(target)).toMatchObject({ parent, x: 20, y: 20, width: 100, height: 100 });
	});

	it("holds the box in the space of the parent when the parent moves during the draw", () => {
		const target = targetOf(true);
		const parent = firstId(target.doc);
		const behavior = TOOL_BEHAVIORS.rectangle();
		const camera = target.user.camera.get();
		const press = pointAt(camera, PRESS);

		behavior.dragStart?.(target, press, press, NO_MODIFIERS);
		target.doc.move(parent, 400, 240);
		behavior.drag?.(target, pointAt(camera, { x: 500, y: 330 }), NO_MODIFIERS);
		behavior.dragEnd?.(target, pointAt(camera, { x: 500, y: 330 }), NO_MODIFIERS);

		expect(drawnLayer(target)).toMatchObject({ x: 20, y: 20, width: 80, height: 70 });
	});

	it("draws inside a turned parent in the space of that parent", () => {
		const target = targetOf(true);
		const parent = firstId(target.doc);
		target.doc.rotate(parent, 90);

		dragOver(TOOL_BEHAVIORS.rectangle(), target, {
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

	it("gives the stage back to the select tool when a cancel finds no draw", () => {
		const target = targetOf(false);
		target.user.tool.set("rectangle");
		const changes = target.doc.changeCount();

		cancelDraw(target.doc, target.user);

		expect(target.user.tool.get()).toBe("select");
		expect(target.doc.changeCount()).toBe(changes);
	});
});
