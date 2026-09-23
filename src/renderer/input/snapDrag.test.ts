import { describe, expect, it } from "vitest";
import type { Layer, LayerFields, LayerId } from "../../document/layer";
import type { Point } from "../state/camera";
import { NO_DRAWN } from "./drawn";
import type { DrawnReader } from "./drawn";
import { handlePointOf } from "./handles";
import { NO_MODIFIERS } from "./modifiers";
import type { Modifiers } from "./modifiers";
import type { SnapSegment } from "./snap";
import type { PointerTarget, ToolBehavior } from "./tool";
import { behaviorFor } from "./toolBehavior";
import {
	anchorOnScreen,
	dragOver,
	dropScene,
	firstId,
	nestedTarget,
	pointAt,
	tapAt,
} from "./toolFixtures";

const CONTROL: Modifiers = { ...NO_MODIFIERS, control: true };
const SIBLING: LayerFields = {
	x: 700,
	y: 100,
	width: 100,
	height: 100,
	fill: "#d9d9d9",
	name: "",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, frame: false },
};
const GRAB = { x: 440, y: 280 };
const NEAR_THE_SIBLING = { x: 483, y: 280 };
const GRAB_THE_CHILD = { x: 450, y: 290 };
const NEAR_THE_EDGE = { x: 433, y: 290 };
const NEAR_THE_GUIDE = { x: 503, y: 290 };
const WEST_HANDLE = { x: 440, y: 300 };
const NEAR_THE_LEFT_EDGE = { x: 423, y: 300 };
const NEAR_THE_PADDING = { x: 433, y: 300 };
const NORTH_HANDLE = { x: 470, y: 280 };
const NEAR_THE_TOP_EDGE = { x: 470, y: 263 };
const WEST_MIDDLE = { x: 0, y: 0.5 };
const NW_CORNER = { x: 440, y: 280 };
const BACK_FROM_THE_CORNER = { x: 423, y: 263 };
const SHIFT: Modifiers = { ...NO_MODIFIERS, shift: true };
const PADDED: DrawnReader = {
	...NO_DRAWN,
	inset: () => ({ top: 0, right: 0, bottom: 0, left: 10 }),
};
const NO_SIDE = { value: 0, unit: "px" } as const;
const LEFT_MARGIN = {
	top: NO_SIDE,
	right: NO_SIDE,
	bottom: NO_SIDE,
	left: { value: 10, unit: "px" },
} as const;

function dragChild(target: PointerTarget, release: Point, modifiers = NO_MODIFIERS): void {
	dragOver(behaviorFor("select"), target, { press: GRAB_THE_CHILD, release, modifiers });
}

function storedLayer(target: PointerTarget, id: LayerId): Layer {
	const layer = target.doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

function onlySegment(target: PointerTarget): SnapSegment {
	const [segment] = target.user.snap.get()?.segments ?? [];
	if (segment === undefined) {
		throw new Error("the drag published no snap line");
	}
	return segment;
}

function gripChild(
	target: PointerTarget,
	press: Point,
	release: Point,
	modifiers = NO_MODIFIERS,
): ToolBehavior {
	const behavior = behaviorFor("select");
	const camera = target.user.camera.get();
	tapAt(behavior, target, GRAB_THE_CHILD);
	const at = pointAt(camera, press);
	behavior.dragStart?.(target, at, at, modifiers);
	behavior.drag?.(target, pointAt(camera, release), modifiers);
	return behavior;
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
		expect(scene.target.doc.layer(scene.layer)).toMatchObject({ x: 461.01, y: 260 });
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

describe("a move drag inside a frame", () => {
	it("snaps to the edge of the frame and draws the line across it", () => {
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

	it("snaps the center of the layer to a guide of the frame", () => {
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

describe("a resize drag inside a frame", () => {
	it("attaches the dragged edge to the edge of the frame and draws the line", () => {
		const { target, child } = nestedTarget(0);

		const behavior = gripChild(target, WEST_HANDLE, NEAR_THE_LEFT_EDGE);

		expect(target.doc.layer(child)).toMatchObject({ x: 0, width: 80 });
		expect(target.user.snap.get()?.segments).toEqual([{ axis: "x", at: 0, from: 0, to: 160 }]);

		behavior.dragEnd?.(target, pointAt(target.user.camera.get(), NEAR_THE_LEFT_EDGE), NO_MODIFIERS);
		expect(target.user.snap.get()).toBeNull();
	});

	it("leaves the edge under the pointer while the control key is down", () => {
		const { target, child } = nestedTarget(0);

		gripChild(target, WEST_HANDLE, NEAR_THE_LEFT_EDGE, CONTROL);

		expect(target.doc.layer(child)).toMatchObject({ x: 3, width: 77 });
		expect(target.user.snap.get()).toBeNull();
	});

	it("pulls a north handle along y alone and leaves x where the pointer puts it", () => {
		const { target, child } = nestedTarget(0);
		target.doc.update(firstId(target.doc), { guides: [{ axis: "x", at: 50 }] });

		gripChild(target, NORTH_HANDLE, NEAR_THE_TOP_EDGE);

		expect(target.doc.layer(child)).toMatchObject({ x: 20, y: 0, width: 60, height: 60 });
		expect(target.user.snap.get()?.segments).toEqual([{ axis: "y", at: 0, from: 0, to: 240 }]);
	});

	it("takes the margin of a fill child to zero at the padding edge of a row", () => {
		const { target, child } = nestedTarget(0);
		const doc = target.doc;
		doc.update(firstId(doc), { layout: { display: "row" } });
		doc.update(child, { layout: { width: "fill", margin: LEFT_MARGIN } });
		doc.commit("set up the row");

		gripChild({ ...target, drawn: PADDED }, WEST_HANDLE, NEAR_THE_PADDING);

		expect(doc.layer(child)?.layout.margin.left).toEqual({ value: 0, unit: "px" });
		expect(doc.layer(child)).toMatchObject({ x: 20, width: 60 });
	});
});

describe("a resize drag of a turned layer", () => {
	it("puts the west edge of a turned child on the edge the snap line draws", () => {
		const { target, child } = nestedTarget(0);
		target.doc.update(child, { rotation: 30 });
		const west = anchorOnScreen(target, child, WEST_MIDDLE);

		gripChild(target, west, { x: west.x - 26, y: west.y });

		const landed = storedLayer(target, child);
		expect(landed).toMatchObject({ x: -5.88, y: 13.07, width: 87.74, height: 40 });
		expect(target.user.snap.get()?.segments).toEqual([{ axis: "x", at: 0, from: 0, to: 160 }]);
		expect(handlePointOf(landed, landed, "w").x).toBeCloseTo(0, 2);
	});

	it("keeps the published line and the landed edge together", () => {
		const { target, child } = nestedTarget(0);
		target.doc.update(child, { rotation: 30 });
		const west = anchorOnScreen(target, child, WEST_MIDDLE);

		gripChild(target, west, { x: west.x - 26, y: west.y });

		const landed = storedLayer(target, child);
		const segment = onlySegment(target);
		expect(segment.axis).toBe("x");
		expect(handlePointOf(landed, landed, "w").x).toBeCloseTo(segment.at, 2);
	});

	it("drops a snap the aspect modifier keeps a corner from reaching", () => {
		const { target, child } = nestedTarget(0);

		gripChild(target, NW_CORNER, BACK_FROM_THE_CORNER, SHIFT);

		const landed = storedLayer(target, child);
		expect(landed).toMatchObject({ x: -5.5, y: 3, width: 85.5, height: 57 });
		expect(handlePointOf(landed, landed, "nw")).toEqual({ x: -5.5, y: 3 });
		expect(target.user.snap.get()).toBeNull();
	});

	it("drops a snap the turned edge runs parallel to", () => {
		const { target, child } = nestedTarget(0);
		target.doc.update(firstId(target.doc), { guides: [{ axis: "x", at: 52 }] });
		target.doc.update(child, { rotation: 90 });
		const west = anchorOnScreen(target, child, WEST_MIDDLE);

		gripChild(target, west, { x: west.x, y: west.y - 4 });

		expect(target.doc.layer(child)).toMatchObject({ x: 18, y: 18, width: 64, height: 40 });
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
