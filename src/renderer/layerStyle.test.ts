import { describe, expect, it } from "vitest";
import type { Geometry, Layer } from "../document/layer";
import { layerStyle } from "./layerStyle";

function layerWith(geometry: Geometry): Layer {
	return {
		id: "1@1",
		x: 10,
		y: 20,
		width: 30,
		height: 40,
		rotation: 0,
		fill: "#123456",
		geometry,
		name: "",
		clip: false,
		parent: null,
	};
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

	it("turns the layer around its own center only when it holds an angle", () => {
		const flat = layerWith({ kind: "ellipse" });
		expect(layerStyle(flat).transform).toBe("translate3d(10px, 20px, 0)");
		expect(layerStyle({ ...flat, rotation: 30 }).transform).toBe(
			"translate3d(10px, 20px, 0) translate(15px, 20px) rotate(30deg) translate(-15px, -20px)",
		);
	});

	it("draws a rectangle with its corner radius and leaves the corner shape unset when smoothing is zero", () => {
		const square = layerStyle(
			layerWith({ kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false }),
		);
		expect(square.borderRadius).toBe("0px");
		expect(square.cornerShape).toBeUndefined();

		const rounded = layerStyle(
			layerWith({ kind: "rectangle", cornerRadius: 12, cornerSmoothing: 0, artboard: false }),
		);
		expect(rounded.borderRadius).toBe("12px");
		expect(rounded.cornerShape).toBeUndefined();
	});

	it("draws a squircle with a superellipse corner shape when smoothing is above zero", () => {
		const style = layerStyle(
			layerWith({ kind: "rectangle", cornerRadius: 16, cornerSmoothing: 0.5, artboard: false }),
		);
		expect(style).toMatchObject({ borderRadius: "16px", cornerShape: "superellipse(3.5)" });
	});

	it("hides what a layer with a clip holds outside its box", () => {
		const layer = layerWith({ kind: "ellipse" });
		expect(layerStyle(layer).overflow).toBeUndefined();
		expect(layerStyle({ ...layer, clip: true }).overflow).toBe("hidden");
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
