import { describe, expect, it } from "vitest";
import { fittedScale, planExport } from "./plan";

const SCREEN = { width: 800, height: 600, ratio: 2 };

describe("planExport", () => {
	it("captures a layer that fits the screen in one tile at the scale", () => {
		const plan = planExport({ x: 100, y: 50, width: 320, height: 160 }, 2, SCREEN);
		expect(plan).toEqual({
			width: 640,
			height: 320,
			tiles: [
				{
					camera: { x: -100, y: -50, zoom: 1 },
					source: { x: 0, y: 0, width: 320, height: 160 },
					at: { x: 0, y: 0 },
				},
			],
		});
	});

	it("divides a layer that is larger than the screen into tiles", () => {
		const plan = planExport({ x: 0, y: 10, width: 1000, height: 500 }, 3, SCREEN);
		expect(plan.width).toBe(3000);
		expect(plan.height).toBe(1500);
		expect(plan.tiles.map((tile) => [tile.at, tile.source.width, tile.source.height])).toEqual([
			[{ x: 0, y: 0 }, 800, 600],
			[{ x: 1600, y: 0 }, 700, 600],
			[{ x: 0, y: 1200 }, 800, 150],
			[{ x: 1600, y: 1200 }, 700, 150],
		]);
		expect(plan.tiles[1]?.camera).toEqual({ x: -800, y: -15, zoom: 1.5 });
	});

	it("starts each tile on a whole device pixel at a fractional pixel ratio", () => {
		const plan = planExport({ x: 0, y: 0, width: 2000, height: 100 }, 1, {
			width: 801,
			height: 600,
			ratio: 1.5,
		});
		expect(plan.tiles.map((tile) => tile.at.x)).toEqual([0, 1201]);
		expect(plan.tiles.every((tile) => Number.isInteger(tile.at.x))).toBe(true);
	});

	it("limits the long side of the picture", () => {
		const bounds = { x: 0, y: 0, width: 4096, height: 100 };
		expect(fittedScale(bounds, 2, 2048)).toBe(0.5);
		expect(fittedScale({ ...bounds, width: 100 }, 2, 2048)).toBe(2);
	});
});
