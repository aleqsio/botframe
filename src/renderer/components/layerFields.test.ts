import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import { firstId } from "../../document/documentFixtures";
import type { Layer, RectangleGeometry } from "../../document/layer";
import { CORNER_FIELDS, LAYER_FIELDS, formatNumber, swappedBox } from "./layerFields";
import type { LayerField } from "./layerFields";

function layerOf(doc: DesignDocument): Layer {
	const layer = doc.layer(firstId(doc));
	if (layer === null) {
		throw new Error("the document has no layer");
	}
	return layer;
}

function fieldNamed(label: string): LayerField {
	const field = LAYER_FIELDS.find((entry) => entry.label === label);
	if (field === undefined) {
		throw new Error(`no field is named ${label}`);
	}
	return field;
}

function applied(label: string, value: number): Layer {
	const doc = DesignDocument.create();
	fieldNamed(label).apply(doc, layerOf(doc), value);
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

	it("turns an angle outside one turn into an angle inside one turn", () => {
		expect(applied("Rotation", 370)).toMatchObject({ rotation: 10 });
	});

	it("commits the write of a field as one change", () => {
		const doc = DesignDocument.create();
		const before = doc.changeCount();

		fieldNamed("X").apply(doc, layerOf(doc), 10);

		expect(doc.changeCount()).toBe(before + 1);
	});
});

describe("CORNER_FIELDS", () => {
	const geometry: RectangleGeometry = {
		kind: "rectangle",
		cornerRadius: 8,
		cornerSmoothing: 0.5,
		artboard: false,
	};

	it("reads the corner radius and the corner smoothing", () => {
		expect(CORNER_FIELDS.map((field) => [field.label, field.read(geometry)])).toEqual([
			["Radius", 8],
			["Smoothing", 0.5],
		]);
	});

	it("writes one corner field and keeps the other fields", () => {
		expect(CORNER_FIELDS.map((field) => field.next(geometry, 2))).toEqual([
			{ kind: "rectangle", cornerRadius: 2, cornerSmoothing: 0.5, artboard: false },
			{ kind: "rectangle", cornerRadius: 8, cornerSmoothing: 2, artboard: false },
		]);
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
