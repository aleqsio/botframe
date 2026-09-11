import { describe, expect, it } from "vitest";
import { NO_MODIFIERS } from "./modifiers";
import { ANGLE_SNAP, ANGLE_STEP, FACTOR_STEP, LENGTH_STEP, stepOf } from "./step";

const ALT = { shift: false, alt: true };
const SHIFT = { shift: true, alt: false };
const BOTH = { shift: true, alt: true };

describe("stepOf", () => {
	it("gives the normal step when no modifier is held", () => {
		expect(stepOf(LENGTH_STEP, NO_MODIFIERS)).toBe(LENGTH_STEP.normal);
		expect(stepOf(ANGLE_STEP, NO_MODIFIERS)).toBe(ANGLE_STEP.normal);
		expect(stepOf(FACTOR_STEP, NO_MODIFIERS)).toBe(FACTOR_STEP.normal);
	});

	it("gives the large step with shift", () => {
		expect(stepOf(LENGTH_STEP, SHIFT)).toBe(LENGTH_STEP.large);
		expect(stepOf(ANGLE_STEP, SHIFT)).toBe(ANGLE_STEP.large);
		expect(stepOf(FACTOR_STEP, SHIFT)).toBe(FACTOR_STEP.large);
	});

	it("gives the small step with alt", () => {
		expect(stepOf(LENGTH_STEP, ALT)).toBe(LENGTH_STEP.small);
		expect(stepOf(ANGLE_STEP, ALT)).toBe(ANGLE_STEP.small);
		expect(stepOf(FACTOR_STEP, ALT)).toBe(FACTOR_STEP.small);
	});

	it("lets shift win over alt", () => {
		expect(stepOf(LENGTH_STEP, BOTH)).toBe(LENGTH_STEP.large);
	});

	it("keeps the small step below the normal step, and the large step above it", () => {
		for (const rule of [LENGTH_STEP, ANGLE_STEP, FACTOR_STEP]) {
			expect(rule.small).toBeLessThan(rule.normal);
			expect(rule.large).toBeGreaterThan(rule.normal);
		}
	});
});

describe("ANGLE_SNAP", () => {
	it("turns the snap off when no modifier is held", () => {
		expect(stepOf(ANGLE_SNAP, NO_MODIFIERS)).toBe(0);
	});

	it("gives a fine snap with alt and a coarse snap with shift", () => {
		expect(stepOf(ANGLE_SNAP, ALT)).toBe(5);
		expect(stepOf(ANGLE_SNAP, SHIFT)).toBe(ANGLE_STEP.large);
	});
});
