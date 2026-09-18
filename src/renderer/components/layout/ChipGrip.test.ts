import { describe, expect, it } from "vitest";
import { NO_MODIFIERS } from "../../input/modifiers";
import { LENGTH_STEP } from "../../input/step";
import type { LayerField } from "../layerFields";
import { steppedByKey } from "./ChipGrip";
import type { ChipGripProps } from "./ChipGrip";

const FIELD: LayerField = {
	label: "W",
	unit: "px",
	choice: null,
	bound: { kind: "clamp", min: 1, max: 100 },
	step: LENGTH_STEP,
	message: "resize",
	read: () => 30,
	patch: (value) => ({ lengths: { width: { value, unit: "px" } } }),
};

function grip(disabled: boolean): ChipGripProps {
	return {
		disabled,
		field: FIELD,
		value: 30,
		onPatch: () => {},
		onCommit: () => {},
	};
}

describe("steppedByKey", () => {
	it("steps a live grip up and down by one", () => {
		expect(steppedByKey(grip(false), "ArrowRight", NO_MODIFIERS)).toBe(31);
		expect(steppedByKey(grip(false), "ArrowDown", NO_MODIFIERS)).toBe(29);
	});

	it("gives no step for a key that is not an arrow", () => {
		expect(steppedByKey(grip(false), "a", NO_MODIFIERS)).toBeNull();
	});

	it("gives no step for a grip that the size mode disabled", () => {
		expect(steppedByKey(grip(true), "ArrowRight", NO_MODIFIERS)).toBeNull();
		expect(steppedByKey(grip(true), "ArrowDown", NO_MODIFIERS)).toBeNull();
	});
});
