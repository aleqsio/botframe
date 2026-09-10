import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import { firstId } from "../../document/documentFixtures";
import type { Layer } from "../../document/layer";
import { LAYER_FIELDS, fieldsOf, formatNumber, swappedBox } from "./layerFields";
import type { LayerField } from "./layerFields";

function layerOf(doc: DesignDocument): Layer {
	const layer = doc.layer(firstId(doc));
	if (layer === null) {
		throw new Error("the document has no layer");
	}
	return layer;
}

function fieldNamed(layer: Layer, label: string): LayerField {
	const field = fieldsOf(layer).find((entry) => entry.label === label);
	if (field === undefined) {
		throw new Error(`no field is named ${label}`);
	}
	return field;
}

function applied(label: string, value: number): Layer {
	const doc = DesignDocument.create();
	const layer = layerOf(doc);
	fieldNamed(layer, label).apply(doc, layer, value);
	return layerOf(doc);
}

describe("LAYER_FIELDS", () => {
	it("reads the box and the angle of a layer", () => {
		const layer = layerOf(DesignDocument.create());
		expect(LAYER_FIELDS.map((field) => [field.label, field.read(layer)])).toEqual([
			["X", 420],
			["Y", 260],
			["W", 240],
			["H", 160],
			["Rotation", 0],
		]);
	});

	it("writes one field and keeps the other fields", () => {
		expect(applied("X", 10)).toMatchObject({ x: 10, y: 260, width: 240, height: 160 });
		expect(applied("Y", 10)).toMatchObject({ x: 420, y: 10, width: 240, height: 160 });
		expect(applied("W", 10)).toMatchObject({ x: 420, y: 260, width: 10, height: 160 });
		expect(applied("H", 10)).toMatchObject({ x: 420, y: 260, width: 240, height: 10 });
	});

	it("holds the width and the height at the smallest size a layer can take", () => {
		expect(applied("W", -50)).toMatchObject({ width: 1 });
		expect(applied("H", 0)).toMatchObject({ height: 1 });
	});

	it("turns an angle outside one turn into an angle inside one turn", () => {
		expect(applied("Rotation", 370)).toMatchObject({ rotation: 10 });
	});

	it("commits the write of a field as one change", () => {
		const doc = DesignDocument.create();
		const before = doc.changeCount();
		const layer = layerOf(doc);

		fieldNamed(layer, "X").apply(doc, layer, 10);

		expect(doc.changeCount()).toBe(before + 1);
	});
});

describe("fieldsOf", () => {
	it("lists the corner fields of a rectangle after the box fields", () => {
		const labels = fieldsOf(layerOf(DesignDocument.create())).map((field) => field.label);
		expect(labels).toEqual(["X", "Y", "W", "H", "Rotation", "Radius", "Smoothing"]);
	});

	it("lists no corner field for a geometry that has no corner", () => {
		const doc = DesignDocument.create();
		const id = firstId(doc);
		doc.setGeometry(id, { kind: "ellipse" });

		const labels = fieldsOf(layerOf(doc)).map((field) => field.label);

		expect(labels).toEqual(LAYER_FIELDS.map((field) => field.label));
	});

	it("reads and writes the corner radius and the corner smoothing", () => {
		expect(applied("Radius", 12)).toMatchObject({
			geometry: { cornerRadius: 12, cornerSmoothing: 0 },
		});
		expect(applied("Smoothing", 0.5)).toMatchObject({
			geometry: { cornerRadius: 0, cornerSmoothing: 0.5 },
		});
	});

	it("holds a corner at zero", () => {
		expect(applied("Radius", -4)).toMatchObject({ geometry: { cornerRadius: 0 } });
		expect(applied("Smoothing", -4)).toMatchObject({ geometry: { cornerSmoothing: 0 } });
	});
});

describe("swappedBox", () => {
	it("exchanges the width and the height and keeps the corner", () => {
		expect(swappedBox(layerOf(DesignDocument.create()))).toEqual({
			x: 420,
			y: 260,
			width: 160,
			height: 240,
		});
	});
});

describe("formatNumber", () => {
	it("writes a whole number with no decimal point", () => {
		expect(formatNumber(240)).toBe("240");
	});

	it("cuts an angle from a drag to two decimals", () => {
		expect(formatNumber(37.423_42)).toBe("37.42");
		expect(formatNumber(-0.004)).toBe("0");
	});
});
