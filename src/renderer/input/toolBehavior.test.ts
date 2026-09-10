import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { LayerId } from "../../document/layer";
import { TOOLS } from "../components/tools";
import { IDENTITY_CAMERA, toCanvasPoint } from "../state/camera";
import type { Camera, Point, StagePoint } from "../state/camera";
import { UserState } from "../state/userState";
import { TOOL_BEHAVIORS } from "./toolBehavior";
import type { PointerTarget, ToolBehavior } from "./toolBehavior";

const PRESS = { x: 440, y: 280 };
const RELEASE = { x: 540, y: 350 };
const CLIENT = { x: 120, y: 80 };

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

function pointAt(camera: Camera, stage: Point): StagePoint {
	return { stage, canvas: toCanvasPoint(camera, stage) };
}

function dragOver(
	behavior: ToolBehavior,
	target: PointerTarget,
	press: Point,
	release: Point,
): void {
	const camera = target.user.camera.get();
	behavior.dragStart?.(target, pointAt(camera, press), pointAt(camera, press));
	behavior.drag?.(target, pointAt(camera, release));
	behavior.dragEnd?.(target, pointAt(camera, release));
}

describe("TOOL_BEHAVIORS", () => {
	it("answers the pointer for each tool the bar shows", () => {
		expect(Object.keys(TOOL_BEHAVIORS).toSorted()).toEqual(TOOLS.map((tool) => tool.id).toSorted());
	});

	it("moves the layer under the pointer with one change for the drag", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const changes = target.doc.changeCount();

		dragOver(TOOL_BEHAVIORS.select(), target, PRESS, RELEASE);

		expect(target.doc.layer(id)).toMatchObject({ x: 520, y: 330 });
		expect(target.doc.changeCount()).toBe(changes + 1);
		expect(target.user.selection.get()).toEqual([id]);
	});

	it("holds the grab of one gesture inside that gesture", () => {
		const first = targetOf(true);
		const second = targetOf(true);

		dragOver(TOOL_BEHAVIORS.select(), first, PRESS, RELEASE);
		dragOver(TOOL_BEHAVIORS.select(), second, { x: 500, y: 300 }, RELEASE);

		expect(first.doc.layer(firstId(first.doc))).toMatchObject({ x: 520, y: 330 });
		expect(second.doc.layer(firstId(second.doc))).toMatchObject({ x: 460, y: 310 });
	});

	it("selects the layer under the press and clears the selection on the empty canvas", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);

		TOOL_BEHAVIORS.select().tap?.(target);
		expect(target.user.selection.get()).toEqual([id]);

		TOOL_BEHAVIORS.select().tap?.({ ...target, layerIds: [] });
		expect(target.user.selection.get()).toEqual([]);
	});

	it("clears the selection when the drag starts on the empty canvas", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		TOOL_BEHAVIORS.select().tap?.(target);

		dragOver(TOOL_BEHAVIORS.select(), { ...target, layerIds: [] }, PRESS, RELEASE);

		expect(target.user.selection.get()).toEqual([]);
		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260 });
	});

	it("takes the topmost layer under the pointer and leaves the layers below it", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const below = "9@9" as LayerId;

		TOOL_BEHAVIORS.select().tap?.({ ...target, layerIds: [id, below] });

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

		expect(TOOL_BEHAVIORS.rectangle().context).toBeUndefined();
		expect(TOOL_BEHAVIORS.image().context).toBeUndefined();
		expect(target.user.menu.get()).toBeNull();
	});

	it("leaves the document and the selection alone for a tool that draws later", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const changes = target.doc.changeCount();

		dragOver(TOOL_BEHAVIORS.rectangle(), target, PRESS, RELEASE);
		TOOL_BEHAVIORS.rectangle().tap?.(target);

		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260 });
		expect(target.doc.changeCount()).toBe(changes);
		expect(target.user.selection.get()).toEqual([]);
	});
});

describe("the hand tool", () => {
	it("moves the camera by the stage delta of the hand drag", () => {
		const target = targetOf(true);

		dragOver(TOOL_BEHAVIORS.hand(), target, PRESS, RELEASE);

		expect(target.user.camera.get()).toEqual({ x: 100, y: 70, zoom: 1 });
	});

	it("adds each step of the hand drag to the camera", () => {
		const target = targetOf(true);
		const behavior = TOOL_BEHAVIORS.hand();
		const press = pointAt(IDENTITY_CAMERA, PRESS);

		behavior.dragStart?.(target, press, press);
		behavior.drag?.(target, pointAt(target.user.camera.get(), { x: 480, y: 300 }));
		behavior.drag?.(target, pointAt(target.user.camera.get(), { x: 520, y: 330 }));
		behavior.dragEnd?.(target, pointAt(target.user.camera.get(), RELEASE));

		expect(target.user.camera.get()).toEqual({ x: 100, y: 70, zoom: 1 });
	});

	it("writes no change into the document while the hand moves the canvas", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const changes = target.doc.changeCount();

		dragOver(TOOL_BEHAVIORS.hand(), target, PRESS, RELEASE);
		TOOL_BEHAVIORS.hand().tap?.(target);

		expect(TOOL_BEHAVIORS.hand().context).toBeUndefined();
		expect(target.user.menu.get()).toBeNull();
		expect(target.doc.layer(id)).toMatchObject({ x: 420, y: 260 });
		expect(target.doc.changeCount()).toBe(changes);
		expect(target.user.selection.get()).toEqual([]);
	});

	it("holds the pan of one hand gesture inside that gesture", () => {
		const target = targetOf(false);
		dragOver(TOOL_BEHAVIORS.hand(), target, PRESS, RELEASE);

		const late = TOOL_BEHAVIORS.hand();
		late.drag?.(target, pointAt(target.user.camera.get(), { x: 900, y: 900 }));

		expect(target.user.camera.get()).toEqual({ x: 100, y: 70, zoom: 1 });
	});

	it("moves the canvas under the pointer with the pointer at a zoom", () => {
		const target = targetOf(false);
		target.user.camera.set({ x: 0, y: 0, zoom: 2 });

		dragOver(TOOL_BEHAVIORS.hand(), target, PRESS, RELEASE);

		expect(target.user.camera.get()).toEqual({ x: 100, y: 70, zoom: 2 });
	});
});
