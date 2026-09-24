import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { Layer, LayerId } from "../../document/layer";
import { UserState } from "../state/userState";
import { NO_DRAWN } from "./drawn";
import { outOfLayer, visualCenterOf } from "./layerSpace";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { NO_MODIFIERS } from "./modifiers";
import { NO_HITS, SQUARE, dragOver, pointAt } from "./toolFixtures";

function sceneOf(turn: number): { target: PointerTarget; one: LayerId; other: LayerId } {
	const doc = DesignDocument.create();
	const one = doc.createLayer({ ...SQUARE, x: 0, y: 0, width: 40, height: 20 });
	const other = doc.createLayer({ ...SQUARE, x: 100, y: 60, width: 20, height: 20 });
	doc.update(one, { rotation: turn });
	doc.commit("create the layers");
	const target = { doc, user: new UserState(), layerIds: [], layerIdsAt: NO_HITS, drawn: NO_DRAWN };
	return { target, one, other };
}

function layerOf(target: PointerTarget, id: LayerId): Layer {
	const layer = target.doc.layer(id);
	if (layer === null) {
		throw new Error("the document lost the layer");
	}
	return layer;
}

function hoverKey(target: PointerTarget, x: number, y: number): string | undefined {
	return behaviorFor("select").hover?.(target, pointAt(target.user.camera.get(), { x, y }))?.mode;
}

describe("the origin of one selected layer", () => {
	it("shows the move zone over the origin", () => {
		const { target, one } = sceneOf(0);
		target.user.selection.set([one]);

		expect(hoverKey(target, 20, 10)).toBe("origin");
	});

	it("moves the origin to the turned corner and keeps the layer in its place", () => {
		const { target, one } = sceneOf(30);
		target.user.selection.set([one]);
		const center = visualCenterOf(layerOf(target, one));
		const count = target.doc.changeCount();

		dragOver(behaviorFor("select"), target, {
			press: { x: 20, y: 10 },
			release: outOfLayer(layerOf(target, one), { x: 0, y: 0 }),
		});

		const layer = layerOf(target, one);
		expect(layer.origin.x).toBeCloseTo(0);
		expect(layer.origin.y).toBeCloseTo(0);
		expect(visualCenterOf(layer).x).toBeCloseTo(center.x);
		expect(visualCenterOf(layer).y).toBeCloseTo(center.y);
		expect(target.doc.changeCount()).toBe(count + 1);
	});

	it("puts the origin at the corner that the pointer reaches", () => {
		const { target, one } = sceneOf(0);
		target.user.selection.set([one]);

		dragOver(behaviorFor("select"), target, { press: { x: 20, y: 10 }, release: { x: 0, y: 0 } });

		const layer = layerOf(target, one);
		expect([layer.origin.x, layer.origin.y, layer.x, layer.y]).toEqual([0, 0, 0, 0]);
	});
});

const CONTROL = { shift: false, alt: false, control: true };

function originAfter(release: { x: number; y: number }, control = false): number[] {
	const { target, one } = sceneOf(0);
	target.user.selection.set([one]);
	dragOver(behaviorFor("select"), target, {
		press: { x: 20, y: 10 },
		release,
		...(control ? { modifiers: CONTROL } : {}),
	});
	const { origin } = layerOf(target, one);
	return [origin.x, origin.y];
}

describe("the snap of a dragged origin", () => {
	it("snaps to a corner, to the middle of an edge, and to the center", () => {
		expect(originAfter({ x: 3, y: 2 })).toEqual([0, 0]);
		expect(originAfter({ x: 38, y: 11 })).toEqual([1, 0.5]);
		expect(originAfter({ x: 21, y: 9 })).toEqual([0.5, 0.5]);
	});

	it("snaps each axis to an edge or to a center line", () => {
		expect(originAfter({ x: 30, y: 19 })).toEqual([0.75, 1]);
		expect(originAfter({ x: 19, y: 60 })).toEqual([0.5, 3]);
	});

	it("does not snap while the control key is down", () => {
		expect(originAfter({ x: 3, y: 2 }, true)).toEqual([0.075, 0.1]);
	});

	it("shows the snap lines in the space of the layer during the drag", () => {
		const { target, one } = sceneOf(30);
		target.user.selection.set([one]);
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();
		const corner = outOfLayer(layerOf(target, one), { x: 1, y: 1 });

		behavior.dragStart?.(
			target,
			pointAt(camera, { x: 20, y: 10 }),
			pointAt(camera, corner),
			NO_MODIFIERS,
		);

		expect(target.user.snap.get()?.parent).toBe(one);
		expect(target.user.snap.get()?.segments.map((segment) => segment.at)).toEqual([0, 0]);
		behavior.dragEnd?.(target, pointAt(camera, corner), NO_MODIFIERS);
		expect(target.user.snap.get()).toBeNull();
	});
});

describe("the pivot of more than one selected layer", () => {
	it("snaps to the center of a selected layer", () => {
		const { target, one, other } = sceneOf(0);
		target.user.selection.set([one, other]);

		dragOver(behaviorFor("select"), target, {
			press: { x: 60, y: 40 },
			release: { x: 113, y: 68 },
		});

		expect(target.user.groupPivot.get()?.at).toEqual({ x: 110 / 120, y: 70 / 80 });
	});

	it("starts at the center of the selection box and moves only in the user state", () => {
		const { target, one, other } = sceneOf(0);
		target.user.selection.set([one, other]);
		const count = target.doc.changeCount();

		expect(hoverKey(target, 60, 40)).toBe("origin");
		dragOver(behaviorFor("select"), target, { press: { x: 60, y: 40 }, release: { x: 0, y: 0 } });

		expect(target.user.groupPivot.get()?.at).toEqual({ x: 0, y: 0 });
		expect(hoverKey(target, 0, 0)).toBe("origin");
		expect(target.doc.changeCount()).toBe(count);
	});

	it("keeps its place in the selection box when the layers move", () => {
		const { target, one, other } = sceneOf(0);
		target.user.selection.set([one, other]);
		dragOver(behaviorFor("select"), target, { press: { x: 60, y: 40 }, release: { x: 0, y: 0 } });

		target.doc.update(one, { x: 500 });
		target.doc.update(other, { x: 600 });

		expect(hoverKey(target, 500, 0)).toBe("origin");
		expect(hoverKey(target, 0, 0)).toBeUndefined();
	});

	it("goes back to the center when the selection changes", () => {
		const { target, one, other } = sceneOf(0);
		target.user.selection.set([one, other]);
		dragOver(behaviorFor("select"), target, { press: { x: 60, y: 40 }, release: { x: 0, y: 0 } });

		target.user.selection.set([other, one]);

		expect(hoverKey(target, 60, 40)).toBe("origin");
	});

	it("turns each layer about the pivot from a corner of the selection box", () => {
		const { target, one, other } = sceneOf(0);
		target.user.selection.set([one, other]);
		dragOver(behaviorFor("select"), target, { press: { x: 60, y: 40 }, release: { x: 0, y: 0 } });

		dragOver(behaviorFor("select"), target, {
			press: { x: 130, y: 90 },
			release: { x: -90, y: 130 },
		});

		const first = layerOf(target, one);
		const second = layerOf(target, other);
		expect(first.rotation).toBeCloseTo(90);
		expect(second.rotation).toBeCloseTo(90);
		expect(visualCenterOf(first).x).toBeCloseTo(-10);
		expect(visualCenterOf(first).y).toBeCloseTo(20);
		expect(visualCenterOf(second).x).toBeCloseTo(-70);
		expect(visualCenterOf(second).y).toBeCloseTo(110);
	});
});
