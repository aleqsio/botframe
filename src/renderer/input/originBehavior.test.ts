import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { Layer, LayerId } from "../../document/layer";
import { UserState } from "../state/userState";
import { NO_DRAWN } from "./drawn";
import { outOfLayer, visualCenterOf } from "./layerSpace";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
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

describe("the pivot of more than one selected layer", () => {
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
