import { describe, expect, it } from "vitest";
import type { Track } from "../../../document/layout";
import {
	MAX_TRACKS,
	addTrack,
	factorTemplate,
	removeTrack,
	setTrack,
	trackFactor,
	trackMeasure,
	trackOf,
} from "./tracks";

const ONE_FR: Track = { value: 1, unit: "fr" };

describe("trackFactor", () => {
	it("gives a fixed factor to auto", () => {
		expect(trackFactor({ unit: "auto" })).toBe(0.7);
	});

	it("reads a fraction as the factor", () => {
		expect(trackFactor({ value: 2, unit: "fr" })).toBe(2);
	});

	it("scales a length to the factor range", () => {
		expect(trackFactor({ value: 120, unit: "px" })).toBe(1.5);
		expect(trackFactor({ value: 5, unit: "rem" })).toBe(1);
		expect(trackFactor({ value: 50, unit: "%" })).toBe(1);
	});

	it("clamps the factor to 0.3 and 3", () => {
		expect(trackFactor({ value: 0.1, unit: "fr" })).toBe(0.3);
		expect(trackFactor({ value: 900, unit: "px" })).toBe(3);
		expect(trackFactor({ value: 1, unit: "%" })).toBe(0.3);
	});
});

describe("factorTemplate", () => {
	it("prints one fraction for each track", () => {
		expect(factorTemplate([ONE_FR, { unit: "auto" }, { value: 120, unit: "px" }])).toBe(
			"1fr 0.7fr 1.5fr",
		);
	});
});

describe("addTrack", () => {
	it("appends one fraction", () => {
		expect(addTrack([ONE_FR])).toEqual([ONE_FR, ONE_FR]);
	});

	it("stops at the maximum", () => {
		const full = Array.from({ length: MAX_TRACKS }, () => ONE_FR);
		expect(addTrack(full)).toHaveLength(MAX_TRACKS);
	});
});

describe("removeTrack", () => {
	it("takes the track out of a list of two or more", () => {
		const list = [ONE_FR, { unit: "auto" } as const, { value: 2, unit: "fr" } as const];
		expect(removeTrack(list, 1)).toEqual([ONE_FR, { value: 2, unit: "fr" }]);
	});

	it("resets the last track to one fraction", () => {
		expect(removeTrack([{ value: 120, unit: "px" }], 0)).toEqual([ONE_FR]);
	});
});

describe("setTrack", () => {
	it("replaces one track", () => {
		expect(setTrack([ONE_FR, ONE_FR], 1, { unit: "auto" })).toEqual([ONE_FR, { unit: "auto" }]);
	});
});

describe("the track measure", () => {
	it("shows auto with the value that a unit pick gives back", () => {
		expect(trackMeasure({ unit: "auto" })).toEqual({ value: 1, unit: "auto" });
		expect(trackOf({ value: 1, unit: "px" })).toEqual({ value: 1, unit: "px" });
	});

	it("drops the value when the unit is auto", () => {
		expect(trackOf({ value: 4, unit: "auto" })).toEqual({ unit: "auto" });
	});
});
