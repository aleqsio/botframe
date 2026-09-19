import { describe, expect, it } from "vitest";
import { TOOLS } from "../components/tools";
import type { ToolId } from "../components/tools";
import type { Modifiers } from "./modifiers";
import { NO_MODIFIERS } from "./modifiers";
import type { LayerId } from "../../document/layer";
import type { SizeMode } from "../../document/layout";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import type { Zone } from "./handles";
import { firstId } from "./toolFixtures";
import { dragOver, lastDrawn, nestedTarget, pointAt, tapAt, targetOf } from "./toolFixtures";

const PRESS = { x: 440, y: 280 };
const RELEASE = { x: 540, y: 350 };
const CLIENT = { x: 120, y: 80 };
const CENTER = { x: 540, y: 340 };
const SE_CORNER = { x: 660, y: 420 };
const GROWN_SE = { x: 700, y: 460 };
const SE_REACH = { x: 678, y: 438 };
const E_SIDE = { x: 660, y: 340 };
const CHILD_EAST = { x: 500, y: 300 };
const PULLED_EAST = { x: 460, y: 300 };
const DRAW_PRESS = { x: 40, y: 40 };
const DRAW_RELEASE = { x: 240, y: 180 };
const SE_ZONE = { mode: "resize", handle: "se" };
const DRAW_TOOLS: readonly ToolId[] = ["rectangle", "artboard"];
const SHIFT: Modifiers = { shift: true, alt: false, control: false };
const ALT: Modifiers = { shift: false, alt: true, control: false };

function selectedTarget(): PointerTarget {
	const target = targetOf(true);
	target.user.selection.set([firstId(target.doc)]);
	return target;
}

function zoneUnderTool(tool: ToolId): Zone | null {
	const target = selectedTarget();
	return behaviorFor(tool).hover?.(target, pointAt(target.user.camera.get(), SE_CORNER)) ?? null;
}

describe("the behavior of each tool", () => {
	it("gives the handles of the selected layer to each tool the bar shows but the hand", () => {
		const zones = Object.fromEntries(TOOLS.map((tool) => [tool.id, zoneUnderTool(tool.id)]));

		expect(zones).toEqual({
			select: SE_ZONE,
			artboard: SE_ZONE,
			rectangle: SE_ZONE,
			ellipse: SE_ZONE,
			hand: null,
			text: SE_ZONE,
			image: SE_ZONE,
		});
	});

	it("gives no answer to the secondary press for a tool that draws later", () => {
		const target = targetOf(true);

		expect(behaviorFor("text").context?.(target, CLIENT)).toBe(false);
		expect(behaviorFor("image").context?.(target, CLIENT)).toBe(false);
		expect(target.user.menu.get()).toBeNull();
	});

	it("leaves the document and the selection alone for a tool that draws later", () => {
		const target = selectedTarget();
		const id = firstId(target.doc);
		const changes = target.doc.changeCount();

		dragOver(behaviorFor("text"), target, { press: PRESS, release: RELEASE });
		tapAt(behaviorFor("image"), target, CENTER);

		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260 });
		expect(target.doc.changeCount()).toBe(changes);
		expect(target.user.selection.get()).toEqual([id]);
	});
});

describe("the resize and turn handles", () => {
	it("resizes the selected layer from the corner handle, and keeps the corner across it", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(behaviorFor("select"), target, CENTER);
		const changes = target.doc.changeCount();

		dragOver(behaviorFor("select"), target, { press: SE_CORNER, release: { x: 700, y: 460 } });

		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260, width: 280, height: 200 });
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.selection.get()).toEqual([id]);
	});

	it("resizes both axes from a side handle with shift, and from the center with alt", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(behaviorFor("select"), target, CENTER);

		dragOver(behaviorFor("select"), target, {
			press: E_SIDE,
			release: { x: 720, y: 340 },
			modifiers: SHIFT,
		});
		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 240, width: 300, height: 200 });

		dragOver(behaviorFor("select"), target, {
			press: { x: 720, y: 340 },
			release: { x: 740, y: 340 },
			modifiers: ALT,
		});
		expect(target.doc.layer(id)).toMatchObject({ x: 400, y: 240, width: 340, height: 200 });
	});

	it("keeps the selection when the press lands on a handle outside the layer", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(behaviorFor("select"), target, CENTER);

		dragOver(
			behaviorFor("select"),
			{ ...target, layerIds: [] },
			{ press: { x: 665, y: 425 }, release: { x: 700, y: 460 } },
		);

		expect(target.user.selection.get()).toEqual([id]);
		expect(target.doc.layer(id)).toMatchObject({ width: 280, height: 200 });
	});

	it("keeps the selection when the tap lands on a handle instead of the layer", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(behaviorFor("select"), target, CENTER);

		tapAt(behaviorFor("select"), { ...target, layerIds: [] }, SE_REACH);
		expect(target.user.selection.get()).toEqual([id]);

		tapAt(behaviorFor("select"), { ...target, layerIds: [] }, { x: 665, y: 425 });
		expect(target.user.selection.get()).toEqual([id]);
	});

	it("turns the selected layer when the drag starts outside a corner", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(behaviorFor("select"), target, CENTER);
		const changes = target.doc.changeCount();

		dragOver(behaviorFor("select"), target, {
			press: SE_REACH,
			release: { x: 2 * CENTER.x - SE_REACH.x, y: 2 * CENTER.y - SE_REACH.y },
		});

		expect(target.doc.layer(id)).toMatchObject({ rotation: 180, x: 420, y: 260 });
		expect(target.doc.changeCount()).toBe(changes + 1);
	});

	it("answers the hover with the zone under the pointer of the selected layer", () => {
		const target = targetOf(true);
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		expect(behavior.hover?.(target, pointAt(camera, SE_CORNER))).toBeNull();

		tapAt(behavior, target, CENTER);

		expect(behavior.hover?.(target, pointAt(camera, SE_CORNER))).toEqual({
			mode: "resize",
			handle: "se",
		});
		expect(behavior.hover?.(target, pointAt(camera, E_SIDE))).toEqual({
			mode: "resize",
			handle: "e",
		});
		expect(behavior.hover?.(target, pointAt(camera, SE_REACH))).toEqual({
			mode: "rotate",
			handle: "se",
		});
		expect(behavior.hover?.(target, pointAt(camera, CENTER))).toBeNull();
	});
});

describe("the handles under a draw tool", () => {
	it("resizes the selected layer from a corner handle, and commits once", () => {
		const target = selectedTarget();
		const id = firstId(target.doc);
		const changes = target.doc.changeCount();

		dragOver(behaviorFor("rectangle"), target, { press: SE_CORNER, release: GROWN_SE });

		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260, width: 280, height: 200 });
		expect(target.doc.changeCount()).toBe(changes + 1);
	});

	it("turns the selected layer when the drag starts outside a corner", () => {
		const target = selectedTarget();
		const id = firstId(target.doc);

		dragOver(behaviorFor("rectangle"), target, {
			press: SE_REACH,
			release: { x: 2 * CENTER.x - SE_REACH.x, y: 2 * CENTER.y - SE_REACH.y },
		});

		expect(target.doc.layer(id)).toMatchObject({ rotation: 180, x: 420, y: 260 });
	});

	it("answers the hover with the zone of the selected layer", () => {
		const target = selectedTarget();
		const behavior = behaviorFor("rectangle");
		const camera = target.user.camera.get();

		expect(behavior.hover?.(target, pointAt(camera, E_SIDE))).toEqual({
			mode: "resize",
			handle: "e",
		});
		expect(behavior.hover?.(target, pointAt(camera, SE_REACH))).toEqual({
			mode: "rotate",
			handle: "se",
		});
		expect(behavior.hover?.(target, pointAt(camera, CENTER))).toBeNull();
	});

	it("draws no new layer when the press of a draw tool lands on a handle", () => {
		for (const tool of DRAW_TOOLS) {
			const target = selectedTarget();
			const id = firstId(target.doc);
			const count = target.doc.layerIds().length;

			dragOver(behaviorFor(tool), target, { press: SE_CORNER, release: GROWN_SE });

			expect([tool, target.doc.layerIds().length]).toEqual([tool, count]);
			expect(target.doc.layer(id)).toMatchObject({ width: 280, height: 200 });
			expect(target.user.selection.get()).toEqual([id]);
		}
	});

	it("draws no new layer when the tap of a draw tool lands on a handle", () => {
		for (const tool of DRAW_TOOLS) {
			const target = selectedTarget();
			const id = firstId(target.doc);
			const count = target.doc.layerIds().length;

			tapAt(behaviorFor(tool), target, SE_CORNER);

			expect([tool, target.doc.layerIds().length]).toEqual([tool, count]);
			expect(target.user.selection.get()).toEqual([id]);
		}
	});

	it("still draws a new layer when the drag starts on the empty canvas", () => {
		const target = targetOf(false);
		const count = target.doc.layerIds().length;

		dragOver(behaviorFor("rectangle"), target, { press: DRAW_PRESS, release: DRAW_RELEASE });

		expect(target.doc.layerIds()).toHaveLength(count + 1);
		expect(lastDrawn(target)).toMatchObject({ x: 40, y: 40, width: 200, height: 140 });
	});

	it("still draws a new layer away from the handles of the selected layer", () => {
		const target = selectedTarget();
		const count = target.doc.layerIds().length;

		dragOver(
			behaviorFor("rectangle"),
			{ ...target, layerIds: [] },
			{ press: DRAW_PRESS, release: DRAW_RELEASE },
		);

		expect(target.doc.layerIds()).toHaveLength(count + 1);
		expect(lastDrawn(target)).toMatchObject({ x: 40, y: 40, width: 200, height: 140 });
	});
});

describe("the hand tool", () => {
	it("pans past the handles of the selected layer", () => {
		const target = selectedTarget();
		const id = firstId(target.doc);
		const changes = target.doc.changeCount();

		dragOver(behaviorFor("hand"), target, { press: SE_CORNER, release: GROWN_SE });

		expect(target.user.camera.get()).toEqual({ x: 40, y: 40, zoom: 1 });
		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260, width: 240, height: 160 });
		expect(target.doc.changeCount()).toBe(changes);
	});

	it("moves the camera by the stage delta of the hand drag", () => {
		const target = targetOf(true);

		dragOver(behaviorFor("hand"), target, { press: PRESS, release: RELEASE });

		expect(target.user.camera.get()).toEqual({ x: 100, y: 70, zoom: 1 });
	});

	it("adds each step of the hand drag to the camera", () => {
		const target = targetOf(true);
		const behavior = behaviorFor("hand");
		const press = pointAt(target.user.camera.get(), PRESS);

		behavior.dragStart?.(target, press, press, NO_MODIFIERS);
		behavior.drag?.(target, pointAt(target.user.camera.get(), { x: 480, y: 300 }), NO_MODIFIERS);
		behavior.drag?.(target, pointAt(target.user.camera.get(), { x: 520, y: 330 }), NO_MODIFIERS);
		behavior.dragEnd?.(target, pointAt(target.user.camera.get(), RELEASE), NO_MODIFIERS);

		expect(target.user.camera.get()).toEqual({ x: 100, y: 70, zoom: 1 });
	});

	it("writes no change into the document while the hand moves the canvas", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const changes = target.doc.changeCount();

		dragOver(behaviorFor("hand"), target, { press: PRESS, release: RELEASE });
		tapAt(behaviorFor("hand"), target, CENTER);

		expect(behaviorFor("hand").context?.(target, CLIENT)).toBe(false);
		expect(target.user.menu.get()).toBeNull();
		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260 });
		expect(target.doc.changeCount()).toBe(changes);
		expect(target.user.selection.get()).toEqual([]);
	});

	it("holds the pan of one hand gesture inside that gesture", () => {
		const target = targetOf(false);
		dragOver(behaviorFor("hand"), target, { press: PRESS, release: RELEASE });

		const late = behaviorFor("hand");
		late.drag?.(target, pointAt(target.user.camera.get(), { x: 900, y: 900 }), NO_MODIFIERS);

		expect(target.user.camera.get()).toEqual({ x: 100, y: 70, zoom: 1 });
	});

	it("moves the canvas under the pointer with the pointer at a zoom", () => {
		const target = targetOf(false);
		target.user.camera.set({ x: 0, y: 0, zoom: 2 });

		dragOver(behaviorFor("hand"), target, { press: PRESS, release: RELEASE });

		expect(target.user.camera.get()).toEqual({ x: 100, y: 70, zoom: 2 });
	});
});

describe("the handles of a layer inside an artboard", () => {
	it("takes the resize handle of the layer at the canvas point of that handle", () => {
		const { target, child } = nestedTarget(0);
		const behavior = behaviorFor("select");
		tapAt(behavior, target, { x: 450, y: 290 });

		expect(behavior.hover?.(target, pointAt(target.user.camera.get(), { x: 500, y: 320 }))).toEqual(
			{
				mode: "resize",
				handle: "se",
			},
		);

		dragOver(behaviorFor("select"), target, {
			press: { x: 500, y: 320 },
			release: { x: 520, y: 340 },
		});

		expect(target.doc.layer(child)).toMatchObject({ x: 20, y: 20, width: 80, height: 60 });
	});
});

function rowChild(mode: SizeMode): { target: PointerTarget; child: LayerId } {
	const scene = nestedTarget(0);
	scene.target.doc.update(firstId(scene.target.doc), { layout: { display: "row" } });
	scene.target.doc.update(scene.child, { layout: { width: mode } });
	scene.target.doc.commit("set up the row");
	scene.target.user.selection.set([scene.child]);
	return scene;
}

describe("a resize handle of a child in a flex row", () => {
	it("moves the right margin of a fill child and keeps its width", () => {
		const { target, child } = rowChild("fill");

		dragOver(behaviorFor("select"), target, { press: CHILD_EAST, release: PULLED_EAST });

		expect(target.doc.layer(child)?.layout.margin.right).toEqual({ value: 40, unit: "px" });
		expect(target.doc.layer(child)).toMatchObject({ width: 60 });
	});

	it("keeps writing the width of a fixed child and never its place", () => {
		const { target, child } = rowChild("fixed");

		dragOver(behaviorFor("select"), target, { press: CHILD_EAST, release: PULLED_EAST });

		expect(target.doc.layer(child)).toMatchObject({ x: 20, width: 20 });
		expect(target.doc.layer(child)?.layout.margin.right).toEqual({ value: 0, unit: "px" });
	});
});
