import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { Layer, LayerId } from "../../document/layer";
import { TOOLS } from "../components/tools";
import { IDENTITY_CAMERA, toCanvasPoint } from "../state/camera";
import type { Camera, Point, StagePoint } from "../state/camera";
import { UserState } from "../state/userState";
import { cancelDraw } from "./drawBehavior";
import { NO_MODIFIERS } from "./modifiers";
import type { Modifiers } from "./modifiers";
import type { PointerTarget, ToolBehavior } from "./tool";
import { TOOL_BEHAVIORS } from "./toolBehavior";

const PRESS = { x: 440, y: 280 };
const RELEASE = { x: 540, y: 350 };
const CLIENT = { x: 120, y: 80 };
const CENTER = { x: 540, y: 340 };
const SE_CORNER = { x: 660, y: 420 };
const DRAW_PRESS = { x: 40, y: 40 };
const DRAW_RELEASE = { x: 240, y: 180 };
const SE_REACH = { x: 678, y: 438 };
const E_SIDE = { x: 660, y: 340 };
const SHIFT: Modifiers = { shift: true, alt: false };
const ALT: Modifiers = { shift: false, alt: true };

function firstId(doc: DesignDocument): LayerId {
	const [id] = doc.layerIds();
	if (id === undefined) {
		throw new Error("document has no layers");
	}
	return id;
}

function targetOf(withLayer: boolean): PointerTarget {
	const doc = DesignDocument.create();
	return { doc, user: new UserState(), layerIds: withLayer ? [firstId(doc)] : [] };
}

function drawnLayer(target: PointerTarget): Layer {
	const [id] = target.user.selection.get();
	const layer = id === undefined ? null : target.doc.layer(id);
	if (layer === null) {
		throw new Error("no layer is selected");
	}
	return layer;
}

function pointAt(camera: Camera, stage: Point): StagePoint {
	return { stage, canvas: toCanvasPoint(camera, stage) };
}

function tapAt(behavior: ToolBehavior, target: PointerTarget, stage: Point): void {
	behavior.tap?.(target, pointAt(target.user.camera.get(), stage));
}

interface DragSpec {
	press: Point;
	release: Point;
	modifiers?: Modifiers;
}

function dragOver(behavior: ToolBehavior, target: PointerTarget, spec: DragSpec): void {
	const camera = target.user.camera.get();
	const modifiers = spec.modifiers ?? NO_MODIFIERS;
	behavior.dragStart?.(target, pointAt(camera, spec.press), pointAt(camera, spec.press), modifiers);
	behavior.drag?.(target, pointAt(camera, spec.release), modifiers);
	behavior.dragEnd?.(target, pointAt(camera, spec.release), modifiers);
}

describe("TOOL_BEHAVIORS", () => {
	it("answers the pointer for each tool the bar shows", () => {
		expect(Object.keys(TOOL_BEHAVIORS).toSorted()).toEqual(TOOLS.map((tool) => tool.id).toSorted());
	});

	it("moves the layer under the pointer with one change for the drag", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const changes = target.doc.changeCount();

		dragOver(TOOL_BEHAVIORS.select(), target, { press: PRESS, release: RELEASE });

		expect(target.doc.layer(id)).toMatchObject({ x: 520, y: 330 });
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.selection.get()).toEqual([id]);
	});

	it("holds the grab of one gesture inside that gesture", () => {
		const first = targetOf(true);
		const second = targetOf(true);

		dragOver(TOOL_BEHAVIORS.select(), first, { press: PRESS, release: RELEASE });
		dragOver(TOOL_BEHAVIORS.select(), second, { press: { x: 500, y: 300 }, release: RELEASE });

		expect(first.doc.layer(firstId(first.doc))).toMatchObject({ x: 520, y: 330 });
		expect(second.doc.layer(firstId(second.doc))).toMatchObject({ x: 460, y: 310 });
	});

	it("selects the layer under the press and clears the selection on the empty canvas", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);

		tapAt(TOOL_BEHAVIORS.select(), target, CENTER);
		expect(target.user.selection.get()).toEqual([id]);

		tapAt(TOOL_BEHAVIORS.select(), { ...target, layerIds: [] }, CENTER);
		expect(target.user.selection.get()).toEqual([]);
	});

	it("clears the selection when the drag starts on the empty canvas", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(TOOL_BEHAVIORS.select(), target, CENTER);

		dragOver(
			TOOL_BEHAVIORS.select(),
			{ ...target, layerIds: [] },
			{
				press: PRESS,
				release: RELEASE,
			},
		);

		expect(target.user.selection.get()).toEqual([]);
		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260 });
	});

	it("takes the topmost layer under the pointer and leaves the layers below it", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const below = "9@9" as LayerId;

		tapAt(TOOL_BEHAVIORS.select(), { ...target, layerIds: [id, below] }, CENTER);

		expect(target.user.selection.get()).toEqual([id]);
	});

	it("opens the menu with each layer under the secondary press", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const below = "9@9" as LayerId;

		TOOL_BEHAVIORS.select().context?.({ ...target, layerIds: [id, below] }, CLIENT);

		expect(target.user.menu.get()).toEqual({ client: CLIENT, layerIds: [id, below] });
	});

	it("opens no menu on the empty canvas", () => {
		const target = targetOf(false);

		TOOL_BEHAVIORS.select().context?.(target, CLIENT);

		expect(target.user.menu.get()).toBeNull();
	});

	it("gives no answer to the secondary press for a tool that draws later", () => {
		const target = targetOf(true);

		expect(TOOL_BEHAVIORS.ellipse().context).toBeUndefined();
		expect(TOOL_BEHAVIORS.image().context).toBeUndefined();
		expect(target.user.menu.get()).toBeNull();
	});

	it("leaves the document and the selection alone for a tool that draws later", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const changes = target.doc.changeCount();

		dragOver(TOOL_BEHAVIORS.ellipse(), target, { press: PRESS, release: RELEASE });
		tapAt(TOOL_BEHAVIORS.ellipse(), target, CENTER);

		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260 });
		expect(target.doc.changeCount()).toBe(changes);
		expect(target.user.selection.get()).toEqual([]);
	});
});

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

	it("gives the stage back to the select tool when a cancel finds no draw", () => {
		const target = targetOf(false);
		target.user.tool.set("rectangle");
		const changes = target.doc.changeCount();

		cancelDraw(target.doc, target.user);

		expect(target.user.tool.get()).toBe("select");
		expect(target.doc.changeCount()).toBe(changes);
	});
});

describe("the resize and turn handles", () => {
	it("resizes the selected layer from the corner handle, and keeps the corner across it", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(TOOL_BEHAVIORS.select(), target, CENTER);
		const changes = target.doc.changeCount();

		dragOver(TOOL_BEHAVIORS.select(), target, { press: SE_CORNER, release: { x: 700, y: 460 } });

		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260, width: 280, height: 200 });
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.selection.get()).toEqual([id]);
	});

	it("resizes both axes from a side handle with shift, and from the center with alt", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(TOOL_BEHAVIORS.select(), target, CENTER);

		dragOver(TOOL_BEHAVIORS.select(), target, {
			press: E_SIDE,
			release: { x: 720, y: 340 },
			modifiers: SHIFT,
		});
		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 240, width: 300, height: 200 });

		dragOver(TOOL_BEHAVIORS.select(), target, {
			press: { x: 720, y: 340 },
			release: { x: 740, y: 340 },
			modifiers: ALT,
		});
		expect(target.doc.layer(id)).toMatchObject({ x: 400, y: 240, width: 340, height: 200 });
	});

	it("keeps the selection when the press lands on a handle outside the layer", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(TOOL_BEHAVIORS.select(), target, CENTER);

		dragOver(
			TOOL_BEHAVIORS.select(),
			{ ...target, layerIds: [] },
			{ press: { x: 665, y: 425 }, release: { x: 700, y: 460 } },
		);

		expect(target.user.selection.get()).toEqual([id]);
		expect(target.doc.layer(id)).toMatchObject({ width: 280, height: 200 });
	});

	it("keeps the selection when the tap lands on a handle instead of the layer", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(TOOL_BEHAVIORS.select(), target, CENTER);

		tapAt(TOOL_BEHAVIORS.select(), { ...target, layerIds: [] }, SE_REACH);
		expect(target.user.selection.get()).toEqual([id]);

		tapAt(TOOL_BEHAVIORS.select(), { ...target, layerIds: [] }, { x: 665, y: 425 });
		expect(target.user.selection.get()).toEqual([id]);
	});

	it("turns the selected layer when the drag starts outside a corner", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		tapAt(TOOL_BEHAVIORS.select(), target, CENTER);
		const changes = target.doc.changeCount();

		dragOver(TOOL_BEHAVIORS.select(), target, {
			press: SE_REACH,
			release: { x: 2 * CENTER.x - SE_REACH.x, y: 2 * CENTER.y - SE_REACH.y },
		});

		expect(target.doc.layer(id)).toMatchObject({ rotation: 180, x: 420, y: 260 });
		expect(target.doc.changeCount()).toBe(changes + 1);
	});

	it("answers the hover with the zone under the pointer of the selected layer", () => {
		const target = targetOf(true);
		const behavior = TOOL_BEHAVIORS.select();
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

describe("the hand tool", () => {
	it("moves the camera by the stage delta of the hand drag", () => {
		const target = targetOf(true);

		dragOver(TOOL_BEHAVIORS.hand(), target, { press: PRESS, release: RELEASE });

		expect(target.user.camera.get()).toEqual({ x: 100, y: 70, zoom: 1 });
	});

	it("adds each step of the hand drag to the camera", () => {
		const target = targetOf(true);
		const behavior = TOOL_BEHAVIORS.hand();
		const press = pointAt(IDENTITY_CAMERA, PRESS);

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

		dragOver(TOOL_BEHAVIORS.hand(), target, { press: PRESS, release: RELEASE });
		tapAt(TOOL_BEHAVIORS.hand(), target, CENTER);

		expect(TOOL_BEHAVIORS.hand().context).toBeUndefined();
		expect(target.user.menu.get()).toBeNull();
		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260 });
		expect(target.doc.changeCount()).toBe(changes);
		expect(target.user.selection.get()).toEqual([]);
	});

	it("holds the pan of one hand gesture inside that gesture", () => {
		const target = targetOf(false);
		dragOver(TOOL_BEHAVIORS.hand(), target, { press: PRESS, release: RELEASE });

		const late = TOOL_BEHAVIORS.hand();
		late.drag?.(target, pointAt(target.user.camera.get(), { x: 900, y: 900 }), NO_MODIFIERS);

		expect(target.user.camera.get()).toEqual({ x: 100, y: 70, zoom: 1 });
	});

	it("moves the canvas under the pointer with the pointer at a zoom", () => {
		const target = targetOf(false);
		target.user.camera.set({ x: 0, y: 0, zoom: 2 });

		dragOver(TOOL_BEHAVIORS.hand(), target, { press: PRESS, release: RELEASE });

		expect(target.user.camera.get()).toEqual({ x: 100, y: 70, zoom: 2 });
	});
});
