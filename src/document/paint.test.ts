import { describe, expect, it } from "vitest";
import { gradientText, paintOf, withShape } from "./paint";
import type { Gradient } from "./paint";

function gradientIn(text: string): Gradient {
	const paint = paintOf(text);
	if (paint.kind !== "gradient") {
		throw new Error("the text is not a gradient");
	}
	return paint.gradient;
}

const SUNRISE: Gradient = {
	shape: "linear",
	angle: 135,
	stops: [
		{ color: "#0d99ff", position: 0 },
		{ color: "#8b5cf6", position: 0.55 },
		{ color: "#f24822", position: 1 },
	],
};

describe("paintOf", () => {
	it("reads a color as a solid paint", () => {
		expect(paintOf("#0d99ff")).toEqual({ kind: "solid", color: "#0d99ff" });
		expect(paintOf("rebeccapurple")).toEqual({ kind: "solid", color: "rebeccapurple" });
	});

	it("reads a linear gradient with its angle and its stops", () => {
		expect(paintOf("linear-gradient(135deg, #0d99ff 0%, #8b5cf6 55%, #f24822 100%)")).toEqual({
			kind: "gradient",
			gradient: SUNRISE,
		});
	});

	it("reads a radial gradient, which has no angle", () => {
		expect(paintOf("radial-gradient(#ffc21a 0%, #f24822 100%)")).toEqual({
			kind: "gradient",
			gradient: {
				shape: "radial",
				stops: [
					{ color: "#ffc21a", position: 0 },
					{ color: "#f24822", position: 1 },
				],
			},
		});
	});

	it.each([
		"radial-gradient(circle at 30% 30%, #8b5cf6 0%, #14131b 100%)",
		"conic-gradient(from 30deg at 50% 50%, #000000 0%, #ffffff 100%)",
		"linear-gradient(to right, #000000 0%, #ffffff 100%)",
		"linear-gradient(90deg, #000000, #ffffff)",
		"linear-gradient(90deg, red 20px, #ffffff 100%)",
		"linear-gradient(90deg, red 10% 20%, #ffffff 100%)",
		"linear-gradient(90deg, rgb(0, 0, 0) 0%, #ffffff 100%)",
		"linear-gradient(90deg, #ffffff 80%, #000000 20%)",
		"linear-gradient(90deg, #ff0000 0%)",
		"repeating-linear-gradient(90deg, #000000 0%, #ffffff 10%)",
	])("keeps %s as custom text that the picker does not edit", (text) => {
		expect(paintOf(text)).toEqual({ kind: "custom", text });
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

describe("withShape", () => {
	it("drops the angle for a radial gradient and gives it back for a linear one", () => {
		const radial = withShape(SUNRISE, "radial");

		expect(radial).toEqual({ shape: "radial", stops: SUNRISE.stops });
		expect(withShape(radial, "conic")).toEqual({
			shape: "conic",
			angle: 180,
			stops: SUNRISE.stops,
		});
		expect(withShape(SUNRISE, "conic")).toEqual({ ...SUNRISE, shape: "conic" });
	});
});
