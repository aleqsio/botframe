import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { Layer, LayerFields } from "../../document/layer";
import { NO_MODIFIERS } from "../input/modifiers";
import { stepOf } from "../input/step";
import { firstId } from "../input/toolFixtures";
import { fieldGroupsOf, fieldPatch, fieldsOf, swappedBox, typedPatch } from "./layerFields";
import type { LayerField, UnitChoice } from "./layerFields";

const ALT = { shift: false, alt: true };
const SHIFT = { shift: true, alt: false };
const BOX_LABELS = ["X", "Y", "W", "H", "Rotation"];
const CHILD_FIELDS: LayerFields = {
	x: 0,
	y: 0,
	width: 120,
	height: 80,
	fill: "#d9d9d9",
	name: "Child",
	clip: false,
	geometry: { kind: "rectangle", cornerRadius: 0, cornerSmoothing: 0, artboard: false },
};

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

function childOf(doc: DesignDocument): Layer {
	const parent = layerOf(doc);
	const child = doc.createLayer({ ...CHILD_FIELDS }, parent.id);
	const layer = doc.layer(child);
	if (layer === null) {
		throw new Error("the document lost the child");
	}
	return layer;
}

function choiceOf(layer: Layer, label: string): UnitChoice {
	const { choice } = fieldNamed(layer, label);
	if (choice === null) {
		throw new Error(`the field ${label} takes one unit only`);
	}
	return choice;
}

describe("the unit of a box field", () => {
	it("offers pixels only to a layer that stands at the root", () => {
		const layer = layerOf(DesignDocument.create());
		expect(choiceOf(layer, "W").units).toEqual(["px"]);
	});

	it("offers each unit to a layer inside a container", () => {
		const child = childOf(DesignDocument.create());
		expect(choiceOf(child, "X").units).toEqual(["px", "%", "vw", "vh"]);
	});

	it("takes no unit for the angle and for the smoothing", () => {
		const layer = layerOf(DesignDocument.create());
		expect(fieldNamed(layer, "Rotation").choice).toBeNull();
		expect(fieldNamed(layer, "Smoothing").choice).toBeNull();
	});

	it("holds the size of the layer when the unit changes", () => {
		const doc = DesignDocument.create();
		const child = childOf(doc);

		doc.update(child.id, choiceOf(child, "W").convert("%"));

		expect(doc.layer(child.id)?.lengths.width).toEqual({ value: 50, unit: "%" });
		expect(doc.layer(child.id)).toMatchObject({ width: 120 });
	});

	it("reads the unit a person types in the value", () => {
		const doc = DesignDocument.create();
		const child = childOf(doc);

		doc.update(child.id, typedPatch(fieldNamed(child, "W"), "25%") ?? {});

		expect(doc.layer(child.id)?.lengths.width).toEqual({ value: 25, unit: "%" });
		expect(doc.layer(child.id)).toMatchObject({ width: 60 });
	});

	it("keeps the unit of the field when the text names no unit", () => {
		const doc = DesignDocument.create();
		const child = childOf(doc);
		doc.update(child.id, choiceOf(child, "W").convert("%"));
		const relative = doc.layer(child.id);

		doc.update(child.id, typedPatch(fieldNamed(relative ?? child, "W"), "25") ?? {});

		expect(doc.layer(child.id)?.lengths.width).toEqual({ value: 25, unit: "%" });
	});

	it("refuses a unit that the layer cannot take, and text that is not a length", () => {
		const layer = layerOf(DesignDocument.create());
		expect(typedPatch(fieldNamed(layer, "W"), "50%")).toBeNull();
		expect(typedPatch(fieldNamed(layer, "W"), "wide")).toBeNull();
		expect(typedPatch(fieldNamed(layer, "Rotation"), "half")).toBeNull();
	});

	it("steps a percentage by one, and by five with shift", () => {
		const doc = DesignDocument.create();
		const child = childOf(doc);
		doc.update(child.id, choiceOf(child, "W").convert("%"));
		const field = fieldNamed(doc.layer(child.id) ?? child, "W");

		expect(stepOf(field.step, NO_MODIFIERS)).toBe(1);
		expect(stepOf(field.step, SHIFT)).toBe(5);
		expect(stepOf(field.step, ALT)).toBe(0.1);
	});

	it("holds a relative size above zero and a relative position inside the limit", () => {
		const doc = DesignDocument.create();
		const child = childOf(doc);
		doc.update(child.id, choiceOf(child, "W").convert("%"));
		const relative = doc.layer(child.id) ?? child;

		doc.update(child.id, typedPatch(fieldNamed(relative, "W"), "-5%") ?? {});

		expect(doc.layer(child.id)?.lengths.width).toEqual({ value: 0.1, unit: "%" });
	});
});
