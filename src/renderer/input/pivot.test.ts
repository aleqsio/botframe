import { describe, expect, it } from "vitest";
import { CENTER_ORIGIN } from "../../document/layer";
import { visualCenterOf } from "./layerSpace";
import { movedOrigin } from "./pivot";

const FLAT = { x: 0, y: 0, width: 40, height: 20, rotation: 0, origin: CENTER_ORIGIN };

describe("movedOrigin", () => {
	it("keeps the middle on an axis that has no extent", () => {
		expect(movedOrigin({ ...FLAT, width: 0 }, { x: 5, y: 5 }).origin).toEqual({ x: 0.5, y: 0.25 });
	});

	it("holds the origin inside the limit of the origin field", () => {
		expect(movedOrigin(FLAT, { x: 1e9, y: -1e9 }).origin).toEqual({ x: 100, y: -100 });
	});

	it("takes a point in the space of a turned layer that is away from zero", () => {
		const layer = { ...FLAT, x: 70, y: -30, rotation: 40 };

		const moved = movedOrigin(layer, { x: 10, y: 15 });

		expect(moved.origin).toEqual({ x: 0.25, y: 0.75 });
		const kept = visualCenterOf({ ...layer, ...moved.place, origin: moved.origin });
		expect(kept.x).toBeCloseTo(visualCenterOf(layer).x);
		expect(kept.y).toBeCloseTo(visualCenterOf(layer).y);
	});
});
