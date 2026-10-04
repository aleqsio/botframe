import { describe, expect, it } from "vitest";
import type { Gradient } from "../../../document/paint";
import { paintTextAs, seededGradient, stopAdded, stopMoved, stopRemoved } from "./stops";

const BLACK_TO_WHITE: Gradient = {
	shape: "linear",
	angle: 90,
	stops: [
		{ color: "#000000", position: 0 },
		{ color: "#ffffff", position: 1 },
	],
};

describe("seededGradient", () => {
	it("fades the color to its clear form", () => {
		expect(seededGradient("#0d99ff")).toEqual({
			shape: "linear",
			angle: 180,
			stops: [
				{ color: "#0d99ff", position: 0 },
				{ color: "#0d99ff00", position: 1 },
			],
		});
	});

	it("starts from black when it cannot read the color", () => {
		expect(seededGradient("rebeccapurple").stops[0]).toEqual({ color: "#000000", position: 0 });
	});
});

describe("stopAdded", () => {
	it("adds a stop with the mixed color at the position, in order", () => {
		expect(stopAdded(BLACK_TO_WHITE, 0.5)).toEqual({
			gradient: {
				...BLACK_TO_WHITE,
				stops: [
					{ color: "#000000", position: 0 },
					{ color: "#808080", position: 0.5 },
					{ color: "#ffffff", position: 1 },
				],
			},
			index: 1,
		});
	});
});

describe("stopMoved", () => {
	it("moves a stop past an other stop and gives its new index", () => {
		const moved = stopMoved(BLACK_TO_WHITE, 0, 1.4);

		expect(moved.index).toBe(1);
		expect(moved.gradient.stops).toEqual([
			{ color: "#ffffff", position: 1 },
			{ color: "#000000", position: 1 },
		]);
	});
});

describe("stopRemoved", () => {
	it("removes a stop when more than two stay", () => {
		const three = stopAdded(BLACK_TO_WHITE, 0.25).gradient;

		expect(stopRemoved(three, 1)).toEqual(BLACK_TO_WHITE);
	});

	it("keeps the two stops of a gradient", () => {
		expect(stopRemoved(BLACK_TO_WHITE, 0)).toBe(BLACK_TO_WHITE);
	});
});

describe("paintTextAs", () => {
	it("seeds a gradient from a solid color", () => {
		expect(paintTextAs({ kind: "solid", color: "#ff0000" }, "gradient")).toBe(
			"linear-gradient(180deg, #ff0000 0%, #ff000000 100%)",
		);
	});

	it("keeps the first stop when a gradient becomes solid", () => {
		expect(paintTextAs({ kind: "gradient", gradient: BLACK_TO_WHITE }, "solid")).toBe("#000000");
	});

	it("keeps a paint that already has the kind", () => {
		expect(paintTextAs({ kind: "solid", color: "#ff0000" }, "solid")).toBe("#ff0000");
	});
});
