import { describe, expect, it } from "vitest";
import { gradientText, paintOf } from "./paint";
import type { Gradient } from "./paint";

function gradientIn(text: string): Gradient {
	const paint = paintOf(text);
	if (paint.kind === "solid") {
		throw new Error("the text is not a gradient");
	}
	return paint.gradient;
}

describe("paintOf", () => {
	it("reads a color as a solid paint", () => {
		expect(paintOf("#0d99ff")).toEqual({ kind: "solid", color: "#0d99ff" });
	});

	it("reads a linear gradient with its angle and its stops", () => {
		expect(paintOf("linear-gradient(135deg, #0d99ff 0%, #8b5cf6 55%, #f24822 100%)")).toEqual({
			kind: "gradient",
			gradient: {
				shape: "linear",
				angle: 135,
				stops: [
					{ color: "#0d99ff", position: 0 },
					{ color: "#8b5cf6", position: 0.55 },
					{ color: "#f24822", position: 1 },
				],
			},
		});
	});

	it("reads a side as an angle", () => {
		expect(gradientIn("linear-gradient(to right, #000000, #ffffff)").angle).toBe(90);
	});

	it("reads the start angle of a conic gradient", () => {
		expect(gradientIn("conic-gradient(from 30deg at 50% 50%, #000000, #ffffff)").angle).toBe(30);
	});

	it("spreads the stops that have no position", () => {
		expect(gradientIn("linear-gradient(#000000, #808080, #ffffff)").stops).toEqual([
			{ color: "#000000", position: 0 },
			{ color: "#808080", position: 0.5 },
			{ color: "#ffffff", position: 1 },
		]);
	});

	it("keeps a color function that has commas", () => {
		expect(
			gradientIn("radial-gradient(circle, rgb(0, 0, 0) 0%, rgba(255, 0, 0, 0.5) 100%)").stops,
		).toEqual([
			{ color: "rgb(0, 0, 0)", position: 0 },
			{ color: "rgba(255, 0, 0, 0.5)", position: 1 },
		]);
	});

	it("sorts the stops and holds each position between 0 and 1", () => {
		expect(gradientIn("linear-gradient(90deg, #ffffff 150%, #000000 -20%)").stops).toEqual([
			{ color: "#000000", position: 0 },
			{ color: "#ffffff", position: 1 },
		]);
	});

	it.each([
		"linear-gradient(90deg, #ff0000 0%)",
		"repeating-linear-gradient(90deg, #000000 0%, #ffffff 10%)",
		"url(a.png)",
		"rebeccapurple",
	])("keeps %s as a solid paint", (text) => {
		expect(paintOf(text)).toEqual({ kind: "solid", color: text });
	});
});

describe("gradientText", () => {
	it.each([
		"linear-gradient(135deg, #0d99ff 0%, #8b5cf6 55%, #f24822 100%)",
		"radial-gradient(#ffc21a 0%, #f24822 100%)",
		"conic-gradient(from 45deg, #000000 0%, #ffffff 12.5%, #000000 100%)",
	])("writes %s back as it was read", (text) => {
		expect(gradientText(gradientIn(text))).toBe(text);
	});
});
