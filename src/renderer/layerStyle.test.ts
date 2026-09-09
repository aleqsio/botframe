import { describe, expect, it } from "vitest";
import type { Geometry, Layer } from "../document/layer";
import { layerStyle } from "./layerStyle";

function layerWith(geometry: Geometry): Layer {
	return { id: "1@1", x: 10, y: 20, width: 30, height: 40, fill: "#123456", geometry };
}

describe("layerStyle", () => {
	it("places the layer with a 3D transform and its own size and fill", () => {
		expect(layerStyle(layerWith({ kind: "ellipse" }))).toMatchObject({
			transform: "translate3d(10px, 20px, 0)",
			width: "30px",
			height: "40px",
			background: "#123456",
		});
	});

	it("draws a rectangle with its corner radius and leaves the corner shape unset when smoothing is zero", () => {
		const square = layerStyle(
			layerWith({ kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0 }),
		);
		expect(square.borderRadius).toBe("0px");
		expect(square.cornerShape).toBeUndefined();

		const rounded = layerStyle(
			layerWith({ kind: "rectangle", cornerRadius: 12, cornerSmoothing: 0 }),
		);
		expect(rounded.borderRadius).toBe("12px");
		expect(rounded.cornerShape).toBeUndefined();
	});

	it("draws a squircle with a superellipse corner shape when smoothing is above zero", () => {
		const style = layerStyle(
			layerWith({ kind: "rectangle", cornerRadius: 16, cornerSmoothing: 0.5 }),
		);
		expect(style).toMatchObject({ borderRadius: "16px", cornerShape: "superellipse(3.5)" });
	});

	it("draws an ellipse as a full border radius", () => {
		expect(layerStyle(layerWith({ kind: "ellipse" }))).toMatchObject({ borderRadius: "50%" });
	});

	it("clips a path geometry with clipPath", () => {
		expect(layerStyle(layerWith({ kind: "path", d: "M0 0 L10 10 Z" }))).toMatchObject({
			clipPath: 'path("M0 0 L10 10 Z")',
		});
	});

	it("draws a geometry it does not know without a radius or a clip", () => {
		const style = layerStyle(layerWith({ kind: "unsupported" }));
		expect(style.borderRadius).toBeUndefined();
		expect(style.clipPath).toBeUndefined();
		expect(style.cornerShape).toBeUndefined();
	});
});
