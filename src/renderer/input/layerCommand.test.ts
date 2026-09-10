import { describe, expect, it } from "vitest";
import { DesignDocument } from "../../document/document";
import type { Layer } from "../../document/layer";
import {
	NUDGE_STEP,
	NUDGE_STEP_SHIFT,
	SCALE_STEP,
	SCALE_STEP_SHIFT,
	TURN_STEP,
	applyCommand,
	commandFor,
} from "./layerCommand";
import type { KeyStroke } from "./layerCommand";
import { firstId } from "./toolFixtures";
import { ROTATE_STEP_SHIFT } from "./transform";

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
			by: { x: NUDGE_STEP, y: 0 },
		});
		expect(commandFor(stroke("ArrowUp"))).toEqual({ kind: "move", by: { x: 0, y: -NUDGE_STEP } });
		expect(commandFor(stroke("ArrowDown", { shiftKey: true }))).toEqual({
			kind: "move",
			by: { x: 0, y: NUDGE_STEP_SHIFT },
		});
		expect(commandFor(stroke("ArrowLeft", { shiftKey: true }))).toEqual({
			kind: "move",
			by: { x: -NUDGE_STEP_SHIFT, y: 0 },
		});
	});

	it("turns by one degree with a bracket, and by fifteen with shift", () => {
		expect(commandFor(stroke("]"))).toEqual({ kind: "rotate", degrees: TURN_STEP });
		expect(commandFor(stroke("["))).toEqual({ kind: "rotate", degrees: -TURN_STEP });
		expect(commandFor(stroke("}", { shiftKey: true }))).toEqual({
			kind: "rotate",
			degrees: ROTATE_STEP_SHIFT,
		});
		expect(commandFor(stroke("{", { shiftKey: true }))).toEqual({
			kind: "rotate",
			degrees: -ROTATE_STEP_SHIFT,
		});
	});

	it("takes the shifted character of a bracket key as the same turn", () => {
		expect(commandFor(stroke("]", { shiftKey: true }))).toEqual({
			kind: "rotate",
			degrees: ROTATE_STEP_SHIFT,
		});
	});

	it("scales by five percent, and by twenty with shift", () => {
		expect(commandFor(stroke("="))).toEqual({ kind: "resize", factor: 1 + SCALE_STEP });
		expect(commandFor(stroke("-"))).toEqual({ kind: "resize", factor: 1 - SCALE_STEP });
		expect(commandFor(stroke("+", { shiftKey: true }))).toEqual({
			kind: "resize",
			factor: 1 + SCALE_STEP_SHIFT,
		});
		expect(commandFor(stroke("_", { shiftKey: true }))).toEqual({
			kind: "resize",
			factor: 1 - SCALE_STEP_SHIFT,
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
			degrees: -TURN_STEP,
		});
		expect(commandFor(stroke("[", { ctrlKey: true, altKey: true }))).toEqual({
			kind: "rotate",
			degrees: -TURN_STEP,
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
});
