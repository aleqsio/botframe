import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import { PLAIN_RECTANGLE } from "../../document/subtree";
import { applyCommand, commandFor } from "./layerCommand";
import type { KeyStroke } from "./layerCommand";
import { ANGLE_STEP, FACTOR_STEP, LENGTH_STEP } from "./step";
import { firstId } from "./toolFixtures";

const PLAIN = { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };

function stroke(key: string, held: Partial<KeyStroke> = {}): KeyStroke {
	return { key, ...PLAIN, ...held };
}

function layerOf(doc: DesignDocument): Layer {
	const layer = doc.layer(firstId(doc));
	if (layer === null) {
		throw new Error("layer is missing");
	}
	return layer;
}

describe("commandFor", () => {
	it("nudges by one pixel with an arrow, and by ten with shift", () => {
		expect(commandFor(stroke("ArrowRight"))).toEqual({
			kind: "move",
			by: { x: LENGTH_STEP.normal, y: 0 },
		});
		expect(commandFor(stroke("ArrowUp"))).toEqual({
			kind: "move",
			by: { x: 0, y: -LENGTH_STEP.normal },
		});
		expect(commandFor(stroke("ArrowDown", { shiftKey: true }))).toEqual({
			kind: "move",
			by: { x: 0, y: LENGTH_STEP.large },
		});
		expect(commandFor(stroke("ArrowLeft", { shiftKey: true }))).toEqual({
			kind: "move",
			by: { x: -LENGTH_STEP.large, y: 0 },
		});
	});

	it("turns by one degree with a bracket, and by fifteen with shift", () => {
		expect(commandFor(stroke("]"))).toEqual({ kind: "rotate", degrees: ANGLE_STEP.normal });
		expect(commandFor(stroke("["))).toEqual({ kind: "rotate", degrees: -ANGLE_STEP.normal });
		expect(commandFor(stroke("}", { shiftKey: true }))).toEqual({
			kind: "rotate",
			degrees: ANGLE_STEP.large,
		});
		expect(commandFor(stroke("{", { shiftKey: true }))).toEqual({
			kind: "rotate",
			degrees: -ANGLE_STEP.large,
		});
	});

	it("takes the shifted character of a bracket key as the same turn", () => {
		expect(commandFor(stroke("]", { shiftKey: true }))).toEqual({
			kind: "rotate",
			degrees: ANGLE_STEP.large,
		});
	});

	it("scales by five percent, and by twenty with shift", () => {
		expect(commandFor(stroke("="))).toEqual({ kind: "resize", factor: 1 + FACTOR_STEP.normal });
		expect(commandFor(stroke("-"))).toEqual({ kind: "resize", factor: 1 - FACTOR_STEP.normal });
		expect(commandFor(stroke("+", { shiftKey: true }))).toEqual({
			kind: "resize",
			factor: 1 + FACTOR_STEP.large,
		});
		expect(commandFor(stroke("_", { shiftKey: true }))).toEqual({
			kind: "resize",
			factor: 1 - FACTOR_STEP.large,
		});
	});

	it("makes a small step with alt", () => {
		expect(commandFor(stroke("ArrowRight", { altKey: true }))).toEqual({
			kind: "move",
			by: { x: LENGTH_STEP.small, y: 0 },
		});
		expect(commandFor(stroke("=", { altKey: true }))).toEqual({
			kind: "resize",
			factor: 1 + FACTOR_STEP.small,
		});
	});

	it("leaves a key with an accelerator to the application that holds it", () => {
		expect(commandFor(stroke("ArrowRight", { metaKey: true }))).toBeNull();
		expect(commandFor(stroke("ArrowRight", { ctrlKey: true }))).toBeNull();
		expect(commandFor(stroke("]", { metaKey: true }))).toBeNull();
	});

	it("takes a key that a keyboard layout writes with alt or with alt gr", () => {
		expect(commandFor(stroke("[", { altKey: true }))).toEqual({
			kind: "rotate",
			degrees: -ANGLE_STEP.normal,
		});
		expect(commandFor(stroke("[", { ctrlKey: true, altKey: true }))).toEqual({
			kind: "rotate",
			degrees: -ANGLE_STEP.normal,
		});
	});

	it("gives no command for a key that the canvas does not hold", () => {
		expect(commandFor(stroke("a"))).toBeNull();
		expect(commandFor(stroke("Enter"))).toBeNull();
		expect(commandFor(stroke(" "))).toBeNull();
	});
});

describe("applyCommand", () => {
	it("moves the layer by the step of the command", () => {
		const doc = DesignDocument.create();
		applyCommand(doc, layerOf(doc), { kind: "move", by: { x: 10, y: -4 } });
		expect(doc.layer(firstId(doc))).toMatchObject({ x: 430, y: 256 });
	});

	it("scales the layer about its own center", () => {
		const doc = DesignDocument.create();
		applyCommand(doc, layerOf(doc), { kind: "resize", factor: 1.5 });
		expect(doc.layer(firstId(doc))).toMatchObject({
			x: 360,
			y: 220,
			width: 360,
			height: 240,
		});
	});

	it("adds the angle of the command and holds it inside one turn", () => {
		const doc = DesignDocument.create();
		applyCommand(doc, layerOf(doc), { kind: "rotate", degrees: -15 });
		expect(doc.layer(firstId(doc))).toMatchObject({ rotation: 345 });

		applyCommand(doc, layerOf(doc), { kind: "rotate", degrees: 30 });
		expect(doc.layer(firstId(doc))).toMatchObject({ rotation: 15 });
	});

	it("turns a layer the same way on the screen inside a mirrored parent", () => {
		const doc = DesignDocument.create();
		const parent = firstId(doc);
		doc.update(parent, { mirrored: true });
		const box = { x: 10, y: 10, width: 20, height: 20 };
		const fields = { ...box, fill: "#000000", name: "", clip: false, geometry: PLAIN_RECTANGLE };
		const child = doc.createLayer(fields, parent);
		const layer = doc.layer(child);
		if (layer === null) {
			throw new Error("layer is missing");
		}

		applyCommand(doc, layer, { kind: "rotate", degrees: 15 });

		expect(doc.layer(child)).toMatchObject({ rotation: 345 });
	});
});
