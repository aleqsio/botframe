import { describe, expect, it } from "vitest";
import { trackIndexOf } from "./gridDrag";

const THREE = [100, 100, 100];

describe("trackIndexOf", () => {
	it("reads the track that holds the point", () => {
		expect(trackIndexOf(THREE, 0, 0, 50)).toBe(0);
		expect(trackIndexOf(THREE, 0, 0, 150)).toBe(1);
		expect(trackIndexOf(THREE, 0, 0, 250)).toBe(2);
	});

	it("starts the first track after the padding", () => {
		expect(trackIndexOf(THREE, 0, 20, 50)).toBe(0);
		expect(trackIndexOf(THREE, 0, 20, 130)).toBe(1);
	});

	it("gives each half of a gap to the track beside it", () => {
		expect(trackIndexOf(THREE, 20, 0, 105)).toBe(0);
		expect(trackIndexOf(THREE, 20, 0, 115)).toBe(1);
	});

	it("holds the point inside the grid", () => {
		expect(trackIndexOf(THREE, 0, 0, -50)).toBe(0);
		expect(trackIndexOf(THREE, 0, 0, 5000)).toBe(2);
		expect(trackIndexOf([], 0, 0, 10)).toBe(0);
	});
});
