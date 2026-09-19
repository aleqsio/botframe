import { describe, expect, it } from "vitest";
import { NO_MODIFIERS } from "../../input/modifiers";
import { LENGTH_STEP } from "../../input/step";
import { steppedByKey } from "./ChipGrip";
import type { ChipGripProps } from "./ChipGrip";

function grip(disabled: boolean): ChipGripProps {
	return {
		disabled,
		label: "W",
		value: 30,
		bound: { kind: "clamp", min: 1, max: 100 },
		step: LENGTH_STEP,
		onValue: () => {},
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

	it("keeps the stepped value in the bound", () => {
		expect(steppedByKey({ ...grip(false), value: 1 }, "ArrowLeft", NO_MODIFIERS)).toBe(1);
		expect(steppedByKey({ ...grip(false), value: 100 }, "ArrowUp", NO_MODIFIERS)).toBe(100);
	});
});
