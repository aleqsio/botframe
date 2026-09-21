import { describe, expect, it } from "vitest";
import type { LayerId } from "../../document/layer";
import type { PointerTarget } from "./tool";
import { behaviorFor } from "./toolBehavior";
import { firstId, nestedTarget, pointAt, targetOf } from "./toolFixtures";

const CENTER = { x: 540, y: 340 };
const EMPTY = { x: 300, y: 200 };
const SE_CORNER = { x: 660, y: 420 };
const SE_REACH = { x: 678, y: 438 };

function hitsOf(target: PointerTarget, ids: readonly LayerId[]): PointerTarget {
	return { ...target, layerIdsAt: () => ids };
}

function selectedTarget(): PointerTarget {
	const target = targetOf(true);
	target.user.selection.set([firstId(target.doc)]);
	return target;
}

describe("the highlight of the pointer", () => {
	it("names the layer under the pointer that the press selects", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const behavior = behaviorFor("select");
		const camera = target.user.camera.get();

		expect(behavior.highlight?.(hitsOf(target, [id]), pointAt(camera, CENTER))).toBe(id);
		expect(behavior.highlight?.(target, pointAt(camera, EMPTY))).toBeNull();
	});

	it("names the topmost layer under the pointer", () => {
		const target = targetOf(true);
		const id = firstId(target.doc);
		const below = "9@9" as LayerId;
		const camera = target.user.camera.get();

		expect(
			behaviorFor("select").highlight?.(hitsOf(target, [id, below]), pointAt(camera, CENTER)),
		).toBe(id);
	});

	it("names the selected layer when the pointer holds a handle of it", () => {
		const target = selectedTarget();
		const id = firstId(target.doc);
		const camera = target.user.camera.get();

		expect(behaviorFor("select").highlight?.(target, pointAt(camera, SE_CORNER))).toBe(id);
		expect(behaviorFor("select").highlight?.(target, pointAt(camera, SE_REACH))).toBe(id);
	});

	it("names no layer for a tool that draws or moves the canvas", () => {
		const target = targetOf(true);
		const hits = hitsOf(target, [firstId(target.doc)]);
		const point = pointAt(target.user.camera.get(), CENTER);

		expect(behaviorFor("rectangle").highlight?.(hits, point)).toBeNull();
		expect(behaviorFor("hand").highlight?.(hits, point)).toBeNull();
	});

	it("names the layer inside the frame, not the frame under it", () => {
		const { target, child } = nestedTarget(0);

		expect(
			behaviorFor("select").highlight?.(target, pointAt(target.user.camera.get(), CENTER)),
		).toBe(child);
	});
});
