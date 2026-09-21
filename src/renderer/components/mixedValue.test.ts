import { describe, expect, it } from "vitest";
import { MIXED_TEXT, mixedText, sharedOf } from "./mixedValue";

function show(value: number): string {
	return `${value}`;
}

describe("sharedOf", () => {
	it("gives nothing for no value", () => {
		expect(sharedOf([])).toBeNull();
	});

	it("gives the one value when each value is the same", () => {
		expect(sharedOf([4, 4, 4])).toEqual({ kind: "same", value: 4 });
	});

	it("gives the mixed state when one value is different", () => {
		expect(sharedOf([4, 4, 5])).toEqual({ kind: "mixed" });
	});

	it("reads a shared false as a value, not as nothing", () => {
		expect(sharedOf([false, false])).toEqual({ kind: "same", value: false });
	});
});

describe("mixedText", () => {
	it("writes the shared value", () => {
		expect(mixedText(sharedOf([12, 12]), show)).toBe("12");
	});

	it("writes the mixed word in place of a value", () => {
		expect(mixedText(sharedOf([12, 13]), show)).toBe(MIXED_TEXT);
	});

	it("writes nothing when no layer is selected", () => {
		expect(mixedText(sharedOf<number>([]), show)).toBe("");
	});
});
