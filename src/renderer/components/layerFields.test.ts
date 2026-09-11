import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { NO_MODIFIERS } from "../input/modifiers";
import { stepOf } from "../input/step";
import { firstId } from "../input/toolFixtures";
import { fieldGroupsOf, fieldPatch, fieldsOf, swappedBox } from "./layerFields";
import type { LayerField } from "./layerFields";

const ALT = { shift: false, alt: true };
const SHIFT = { shift: true, alt: false };
const BOX_LABELS = ["X", "Y", "W", "H", "Rotation"];

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
	const field = fieldNamed(layer, label);
	doc.update(layer.id, fieldPatch(field, value));
	doc.commit(field.message);
	return layerOf(doc);
}

describe("the layer fields", () => {
	it("reads the box and the angle of a layer", () => {
		const layer = layerOf(DesignDocument.create());
		const box = fieldsOf(layer).filter((field) => BOX_LABELS.includes(field.label));
		expect(box.map((field) => [field.label, field.read(layer)])).toEqual([
			["X", 420],
			["Y", 260],
			["W", 240],
			["H", 160],
			["Rotation", 0],
		]);
	});

	it("gives each field a unit", () => {
		const layer = layerOf(DesignDocument.create());
		expect(fieldsOf(layer).map((field) => [field.label, field.unit])).toEqual([
			["X", "px"],
			["Y", "px"],
			["W", "px"],
			["H", "px"],
			["Rotation", "deg"],
			["Radius", "px"],
			["Smoothing", ""],
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

	it("holds the position inside the limit of the canvas", () => {
		expect(applied("X", 1e9)).toMatchObject({ x: 100_000 });
		expect(applied("Y", -1e9)).toMatchObject({ y: -100_000 });
	});

	it("turns an angle outside one turn into an angle inside one turn", () => {
		expect(applied("Rotation", 370)).toMatchObject({ rotation: 10 });
	});

	it("wraps the angle at zero and at one full turn", () => {
		expect(applied("Rotation", 0)).toMatchObject({ rotation: 0 });
		expect(applied("Rotation", 360)).toMatchObject({ rotation: 0 });
		expect(applied("Rotation", 359.5)).toMatchObject({ rotation: 359.5 });
		expect(applied("Rotation", -1)).toMatchObject({ rotation: 359 });
		expect(applied("Rotation", 720)).toMatchObject({ rotation: 0 });
	});

	it("gives each field a step that shift makes large and alt makes small", () => {
		const layer = layerOf(DesignDocument.create());
		for (const field of fieldsOf(layer)) {
			expect(stepOf(field.step, ALT)).toBeLessThan(stepOf(field.step, NO_MODIFIERS));
			expect(stepOf(field.step, SHIFT)).toBeGreaterThan(stepOf(field.step, NO_MODIFIERS));
		}
	});

	it("commits the write of a field as one change", () => {
		const doc = DesignDocument.create();
		const before = doc.changeCount();
		const layer = layerOf(doc);

		doc.update(layer.id, fieldPatch(fieldNamed(layer, "X"), 10));
		doc.commit("move layer");

		expect(doc.changeCount()).toBe(before + 1);
	});
});

describe("fieldGroupsOf", () => {
	it("groups the fields of a rectangle", () => {
		const groups = fieldGroupsOf(layerOf(DesignDocument.create()));
		expect(groups.map((group) => [group.name, group.fields.map((field) => field.label)])).toEqual([
			["Position", ["X", "Y"]],
			["Size", ["W", "H"]],
			["Rotation", ["Rotation"]],
			["Corners", ["Radius", "Smoothing"]],
		]);
	});

	it("lists no corner group for a geometry that has no corner", () => {
		const doc = DesignDocument.create();
		doc.update(firstId(doc), { geometry: { kind: "ellipse" } });

		const groups = fieldGroupsOf(layerOf(doc));

		expect(groups.map((group) => group.name)).toEqual(["Position", "Size", "Rotation"]);
		expect(fieldsOf(layerOf(doc)).map((field) => field.label)).toEqual(BOX_LABELS);
	});

	it("reads and writes the corner radius and the corner smoothing", () => {
		expect(applied("Radius", 12)).toMatchObject({
			geometry: { cornerRadius: 12, cornerSmoothing: 0 },
		});
		expect(applied("Smoothing", 0.5)).toMatchObject({
			geometry: { cornerRadius: 0, cornerSmoothing: 0.5 },
		});
	});

	it("holds a corner at zero, and the smoothing at one", () => {
		expect(applied("Radius", -4)).toMatchObject({ geometry: { cornerRadius: 0 } });
		expect(applied("Smoothing", -4)).toMatchObject({ geometry: { cornerSmoothing: 0 } });
		expect(applied("Smoothing", 4)).toMatchObject({ geometry: { cornerSmoothing: 1 } });
	});
});

describe("swappedBox", () => {
	it("exchanges the width and the height", () => {
		expect(swappedBox(layerOf(DesignDocument.create()))).toEqual({ width: 160, height: 240 });
	});

	it("exchanges the width and the height of a preset", () => {
		expect(swappedBox({ width: 393, height: 852 })).toEqual({ width: 852, height: 393 });
	});
});
